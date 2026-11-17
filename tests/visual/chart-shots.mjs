// 地理馆立体航海图截图：node tests/visual/chart-shots.mjs <站点地址> <输出目录>
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const [base = 'http://127.0.0.1:4180', out = 'tests/visual/chart'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [label, w, h, tier] of [['桌面', 1440, 900, 'full'], ['手机', 390, 844, 'lite']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto(`${base}/?page=geography&gl=${tier}`);
  // 画布只在进入视口后渲染，先滚到航海图再等它就绪。
  const frame = page.locator('.nautical-left');
  await frame.waitFor();
  await page.evaluate(() => document.querySelector('.nautical-left').scrollIntoView({ block: 'start', behavior: 'instant' }));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.text()); });
  await page.waitForFunction(() => document.querySelector('.nautical-stage')?.getAttribute('data-gl') === 'on', null, { timeout: 20000 });
  await page.getByRole('button', { name: '暂停转动' }).click().catch(() => {});
  await page.getByRole('button', { name: '复位朝北' }).click();
  await page.waitForTimeout(1800);
  const shot = async name => { await page.waitForTimeout(1800); await frame.screenshot({ path: path.join(out, `${label}-${name}.png`) }); };
  await shot('1-总览');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '顺时针旋转15度' }).click();
  await shot('2-旋转45度');
  await page.getByRole('button', { name: '复位朝北' }).click();
  if (w > 800) { await page.waitForTimeout(1200); await page.locator('[data-chart-place="4"]').hover(); await shot('3-悬停东南大陆'); }
  await page.locator('[data-chart-place="2"]').click();
  await page.mouse.move(5, 5);
  await shot('4-点选东北大陆');
  await page.getByRole('button', { name: '复位朝北' }).click();
  await page.mouse.move(5, 5);
  await shot('5-复位');
  await page.close();
}
await browser.close();
console.log('saved to', out);
