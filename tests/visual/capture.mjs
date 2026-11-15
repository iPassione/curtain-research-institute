// 截图与页面文本采集：node tests/visual/capture.mjs <站点地址> <输出目录>
// 改造前后用同一套步骤采集，供 compare.mjs 逐张比对。
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { urls, widths } from './urls.mjs';

const [base = 'http://127.0.0.1:8765', out = 'tests/visual/current'] = process.argv.slice(2);
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const texts = {};

async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  // 逐屏滚动，触发懒加载图片；然后回到顶部。
  await page.evaluate(async () => {
    const step = innerHeight * 0.8;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
    scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');
  // 仍未加载完的懒加载图片：逐个滚到可见处，最多各等 8 秒。
  await page.evaluate(async () => {
    for (const img of document.images) {
      if (img.complete) continue;
      img.scrollIntoView({ block: 'center' });
      await new Promise(r => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); setTimeout(r, 8000); });
    }
    scrollTo(0, 0);
  });
  await page.evaluate(() => document.fonts.ready);
  // 等待穹顶弧线绘制（3.4 秒）与首页标题入场结束。
  await page.waitForTimeout(4200);
  // 航海图默认缓慢自转；统一复位朝北，消除时间差。
  const reset = page.locator('.chart-reset');
  if (await reset.count()) { await reset.click(); await page.evaluate(() => scrollTo(0, 0)); }
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
}

for (const [label, width, height] of widths) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'zh-CN', timezoneId: 'Asia/Shanghai' });
  for (const [name, url] of urls) {
    if (only && !only.test(name)) continue;
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(base + url);
    await settle(page);
    const file = path.join(out, `${name}.${label}.png`);
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled', caret: 'hide' });
    texts[`${name}.${label}`] = await page.evaluate(() => ({
      title: document.title,
      url: location.search,
      surface: document.body.dataset.surface,
      collection: document.body.dataset.collection,
      current: [...document.querySelectorAll('#nav a[aria-current]')].map(a => a.textContent),
      main: document.querySelector('#main').innerText,
      links: [...document.querySelectorAll('#main a[href]')].map(a => a.getAttribute('href')),
      height: document.documentElement.scrollHeight,
    }));
    texts[`${name}.${label}`].errors = errors;
    console.log(label, name, errors.length ? 'ERR ' + errors.join(' | ') : 'ok');
    await page.close();
  }
  await context.close();
}
await browser.close();
const textFile = path.join(out, 'texts.json');
const previous = fs.existsSync(textFile) && only ? JSON.parse(fs.readFileSync(textFile, 'utf8')) : {};
fs.writeFileSync(textFile, JSON.stringify({ ...previous, ...texts }, null, 1));
