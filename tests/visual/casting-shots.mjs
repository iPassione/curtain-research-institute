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
  const release = async (element, name, times) => {
    await hold(element, 5600, []);
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.25, { steps: 3 });
    await page.mouse.up();
    let t = 0;
    for (const [at, n] of times) { await page.waitForTimeout(at - t); t = at; await shot(`${name}-${n}`); }
    await page.waitForTimeout(Math.max(0, 3600 - t));
  };
  await hold(0, 900, [[900, '1-起势']]); await page.mouse.up(); await page.waitForTimeout(2000);
  await release(0, '火焰', [[150, 'a飞出'], [450, 'b爆燃'], [900, 'c余烬'], [3300, 'd重新铺开']]);
  await release(1, '冰霜', [[350, 'a迸开'], [900, 'b冻住画面'], [2000, 'c碎裂']]);
  await release(2, '防御', [[450, 'a放大'], [850, 'b高光滚过'], [1250, 'c高光到顶']]);
  await page.close();
}
await browser.close();
console.log('saved to', out);
