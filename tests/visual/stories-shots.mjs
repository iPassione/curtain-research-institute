// 历史长卷与人物星座图截图：node tests/visual/stories-shots.mjs <站点地址> <输出目录>
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const [base = 'http://127.0.0.1:4180', out = 'tests/visual/stories'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [label, w, h] of [['桌面', 1440, 900], ['手机', 390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 300)); });
  await page.goto(`${base}/?page=history`);
  await page.locator('.history-scroll').waitFor();
  for (const [name, at] of [['历史-1', 0.0], ['历史-2', 0.25], ['历史-3', 0.5], ['历史-4', 0.75], ['历史-5', 1.0]]) {
    await page.evaluate(at => { const s = document.querySelector('.history-scroll'); const top = s.getBoundingClientRect().top + scrollY; scrollTo({ top: top + (s.offsetHeight - innerHeight) * at, behavior: 'instant' }); }, at);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(out, `${label}-${name}.png`) });
  }
  await page.goto(`${base}/?page=people`);
  const stage = page.locator('.people-stage');
  await stage.waitFor();
  await page.evaluate(() => document.querySelector('.people-stage').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(2200);
  await stage.screenshot({ path: path.join(out, `${label}-人物-1默认.png`) });
  if (w > 800) { await page.locator('[data-person="3"]').hover(); await page.waitForTimeout(900); await stage.screenshot({ path: path.join(out, `${label}-人物-2悬停.png`) }); }
  await page.locator('[data-person="5"]').click(); await page.mouse.move(2, 2); await page.waitForTimeout(1200);
  await stage.screenshot({ path: path.join(out, `${label}-人物-3选中.png`) });
  await page.close();
}
await browser.close();
console.log('saved to', out);
