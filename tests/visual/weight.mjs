// 传输体积：node tests/visual/weight.mjs <改造前地址> <改造后地址>
// 用 Chrome DevTools 协议的 encodedDataLength 统计全部请求（含跨域的字体与 CDN）的实际传输字节，
// 分“首屏”（打开后不滚动）与“整页”（滚到底，触发全部懒加载）。缓存关闭，每次新上下文。
import { chromium } from '@playwright/test';
import { urls as all } from './urls.mjs';

const bases = process.argv.slice(2);
const pick = ['home', 'article-origin', 'article-discrete', 'page-library', 'page-geography', 'room-street'];
const urls = all.filter(([n]) => pick.includes(n));
const browser = await chromium.launch();
const kb = n => `${Math.round(n / 1024)}`;

async function measure(base, path, width, height, full) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const types = new Map();
  const bytes = { total: 0, script: 0, font: 0, image: 0, other: 0 };
  let count = 0;
  cdp.on('Network.responseReceived', e => types.set(e.requestId, e.type));
  cdp.on('Network.loadingFinished', e => {
    count++;
    bytes.total += e.encodedDataLength;
    const t = types.get(e.requestId);
    const k = t === 'Script' ? 'script' : t === 'Font' ? 'font' : t === 'Image' ? 'image' : 'other';
    bytes[k] += e.encodedDataLength;
  });
  await page.goto(base + path);
  await page.waitForLoadState('networkidle');
  if (full) {
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); } });
    await page.waitForLoadState('networkidle');
  }
  await page.waitForTimeout(600);
  await context.close();
  return { ...bytes, count };
}

console.log('KB, 压缩后传输：总计 = 脚本 + 字体 + 图片 + 其他（HTML/CSS/JSON）');
for (const [label, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  for (const [name, path] of urls) {
    for (const full of [false, true]) {
      const [a, b] = await Promise.all(bases.map(base => measure(base, path, width, height, full)));
      const fmt = r => `${kb(r.total).padStart(6)} (js ${kb(r.script)}, font ${kb(r.font)}, img ${kb(r.image)}, other ${kb(r.other)}; ${r.count} req)`;
      console.log(`${(name + '.' + label + (full ? ' 整页' : ' 首屏')).padEnd(34)} 前 ${fmt(a)}  →  后 ${fmt(b)}  ${(b.total / a.total * 100).toFixed(0)}%`);
    }
  }
}
await browser.close();
