// 开放展室截图：node tests/visual/fieldrooms-shots.mjs <站点地址> <输出目录>
// 城市切片在时间轴的几个位置各拍一张（直接设定滑块值，不等过渡）；旅行案头拍几种路线。
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// 也拍行装清单勾选后的样子（第一张旅行图之后勾两件）
const [base = 'http://127.0.0.1:4180', out = 'tests/visual/fieldrooms'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const [label, w, h] of [['桌面', 1440, 900], ['手机', 390, 844]].filter(([l]) => !process.env.ONLY || process.env.ONLY.split(',').includes(l))) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 300)); });
  page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 300)));
  await page.goto(`${base}/?page=street`);
  const dial = page.locator('.street-dial input');
  await dial.hover();
  await page.locator('.street-blend.is-on').waitFor({ state: 'attached', timeout: 15000 });
  await page.locator('.street-times').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  for (const v of [0, 50, 100, 140, 170, 200]) {
    await dial.evaluate((el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, `${label}-街景-${String(v).padStart(3, '0')}.png`) });
  }
  for (const q of ['from=eisenrod&to=enchanteves&mode=surface', 'from=eisenrod&to=enchanteves&mode=gate', 'from=eisenrod&to=eisenrod&mode=surface']) {
    await page.goto(`${base}/?page=travel&${q}`);
    await page.locator('.travel-notebook').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(2200);
    if (q.includes('gate')) { await page.locator('[data-pack]').nth(0).check(); await page.locator('[data-pack]').nth(3).check(); await page.waitForTimeout(400); }
    await page.screenshot({ path: path.join(out, `${label}-旅行-${q.replace(/[&=]/g, '_')}.png`) });
  }
  await page.close();
}
await browser.close();
