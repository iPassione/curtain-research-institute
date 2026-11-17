// 首页「穿过帷幕」各幕截图：node tests/visual/journey-shots.mjs <站点地址> <输出目录>
// 用真实 GPU（--use-angle=d3d11 等由系统决定），按固定滚动位置截图，供人工确认画面方向。
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const [base = 'http://127.0.0.1:4180', out = 'tests/visual/journey'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=default'] });
const shots = [['1-外海', 0.02], ['2a-显形之初', 0.6], ['2b-显形', 0.85], ['2c-第二幕末', 0.995]];
for (const [label, w, h, tier] of [['桌面', 1440, 900, 'full'], ['桌面精简档', 1440, 900, 'lite'], ['手机', 390, 844, 'lite']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto(`${base}/?gl=${tier}`);
  await page.waitForFunction(() => document.querySelector('[data-journey]')?.getAttribute('data-gl') === 'on', null, { timeout: 20000 });
  await page.waitForTimeout(1600);
  for (const [name, at] of shots) {
    await page.evaluate(at => { const j = document.querySelector('[data-journey]'); scrollTo({ top: (j.offsetHeight - innerHeight) * at, behavior: 'instant' }); }, at);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(out, `${label}-${name}.png`) });
  }
  await page.close();
}
await browser.close();
console.log('saved to', out);
