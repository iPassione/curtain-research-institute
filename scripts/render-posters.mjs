// 首页静态画：从三维场景本身渲染两帧，给不能启用三维的访客（减弱动态、省流、无显卡加速）用，
// 也作为三维就绪前的占位图（与第一帧画面一致，交接时不跳）。
//   1. 先 npm run build 并起站点：node scripts/serve.mjs dist 4180
//   2. node scripts/render-posters.mjs [站点地址]
// 需要有显卡的机器（用真实 GPU 渲染）。输出：
//   assets-src/journey/sea.webp        第一幕「外海」：夜海、星空、远处船灯（首页主视觉背景）
//   assets-src/journey/continents.webp 第四幕「穹顶之下」：五大陆（静态首页的「穹顶之下」插图）
// 以 1.5 倍像素渲染再缩到 1920 宽，边缘更干净。
//   src/routes/poster-places.ts      五大陆地名在第四幕画面上的位置（百分比）
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import sharp from 'sharp';

const base = process.argv[2] || 'http://127.0.0.1:4180';
const W = 1920, H = 1080, SCALE = 1.5;
fs.mkdirSync('assets-src/journey', { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=default'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
await page.goto(`${base}/?gl=full`);
await page.waitForFunction(() => document.querySelector('[data-journey]')?.getAttribute('data-gl') === 'on', null, { timeout: 30000 });
// 只留画布：页头、文字、地名都藏起来（地名仍参与布局，用来读位置）
await page.addStyleTag({ content: '.header,.site-header,header{visibility:hidden!important} .journey-stage>*:not(.journey-gl){visibility:hidden!important} .journey-gl{opacity:1!important}' });
await page.waitForTimeout(2500);
const go = async at => {
  await page.evaluate(at => { const j = document.querySelector('[data-journey]'); scrollTo({ top: (j.offsetHeight - innerHeight) * at, behavior: 'instant' }); }, at);
  await page.waitForTimeout(5000);
};
await go(0.02);
const save = async name => sharp(await page.screenshot()).resize({ width: 1920 }).webp({ quality: 90, effort: 6 }).toFile(`assets-src/journey/${name}.webp`);
await save('sea');
await go(0.9);
await save('continents');
const places = await page.evaluate(() => [...document.querySelectorAll('.journey-place')].map(el => {
  const r = el.getBoundingClientRect();
  return [+(((r.left + r.width / 2) / innerWidth) * 100).toFixed(2), +(((r.top + r.height / 2) / innerHeight) * 100).toFixed(2)];
}));
fs.writeFileSync('src/routes/poster-places.ts',
  '// 由 scripts/render-posters.mjs 生成，勿手改：五大陆地名在「穹顶之下」静态画上的位置（左、上，百分比），顺序同 manifest.regions。\n' +
  `export const POSTER_PLACES: [number, number][] = ${JSON.stringify(places)};\n`);
await browser.close();
console.log('已渲染 assets-src/journey/sea.webp、continents.webp，地名位置', JSON.stringify(places));
