// 魔法研究室「施法台」截图：node tests/visual/casting-shots.mjs <站点地址> <输出目录>
// 用真实的按住／松手操作拍下各阶段。
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const [base = 'http://127.0.0.1:4180', out = 'tests/visual/casting'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [label, w, h, tier] of [['桌面', 1440, 900, 'full'], ['手机', 390, 844, 'lite']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.text().slice(0, 300)); });
  await page.goto(`${base}/?page=magic&gl=${tier}`);
  const stage = page.locator('.casting-stage');
  await stage.waitFor();
  await page.evaluate(() => document.querySelector('.casting-stage').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForFunction(() => document.querySelector('.casting-stage')?.getAttribute('data-gl') === 'on', null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  const box = await stage.boundingBox();
  const shot = name => stage.screenshot({ path: path.join(out, `${label}-${name}.png`) });
  const cx = box.x + box.width * 0.5, cy = box.y + box.height * 0.45;
  await shot('0-静候');
  const hold = async (element, ms, shots) => {
    await page.locator(`[data-element="${element}"]`).click();
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    let t = 0;
    for (const [at, name] of shots) { await page.waitForTimeout(at - t); t = at; await shot(name); }
    await page.waitForTimeout(Math.max(0, ms - t));
  };
  await hold(0, 5600, [[900, '1-起势'], [2200, '2-塑形·火焰'], [5400, '3-稳定·火焰']]);
  await page.mouse.move(box.x + box.width * 0.92, box.y + box.height * 0.18, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(260); await shot('4a-导出');
  await page.waitForTimeout(700); await shot('4b-撞上弧线');
  await page.waitForTimeout(2400);
  await hold(1, 5600, [[5400, '5-稳定·冰霜']]);
  await page.mouse.up(); await page.waitForTimeout(3000);
  await hold(2, 5600, [[5400, '6-稳定·防御']]);
  await page.mouse.up(); await page.waitForTimeout(3000);
  await hold(0, 1500, []);
  await page.mouse.up(); await page.waitForTimeout(250); await shot('7-提前松手');
  await page.close();
}
await browser.close();
console.log('saved to', out);
