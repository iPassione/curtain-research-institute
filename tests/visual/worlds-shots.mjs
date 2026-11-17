// 诸界观测「层积的六界」截图：node tests/visual/worlds-shots.mjs <站点地址> <输出目录>
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const [base = 'http://127.0.0.1:4180', out = 'tests/visual/worlds'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const shots = [['1-星之世界', 0.07], ['2-地层', 0.19], ['3-物质', 0.35], ['4-灵', 0.47], ['5-镜', 0.58], ['6-地层', 0.67], ['7-亡者', 0.78], ['8-时间长河', 0.93]];
for (const [label, w, h, tier] of [['桌面', 1440, 900, 'full'], ['手机', 390, 844, 'lite']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.text().slice(0, 300)); });
  await page.goto(`${base}/?page=worlds&gl=${tier}`);
  await page.locator('.worlds-dive').waitFor();
  await page.evaluate(() => document.querySelector('.worlds-dive').scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForFunction(() => document.querySelector('.worlds-dive')?.getAttribute('data-gl') === 'on', null, { timeout: 20000 });
  for (const [name, at] of shots) {
    await page.evaluate(at => { const s = document.querySelector('.worlds-dive'); const top = s.getBoundingClientRect().top + scrollY; scrollTo({ top: top + (s.offsetHeight - innerHeight) * at, behavior: 'instant' }); }, at);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(out, `${label}-${name}.png`) });
  }
  await page.close();
}
await browser.close();
console.log('saved to', out);
