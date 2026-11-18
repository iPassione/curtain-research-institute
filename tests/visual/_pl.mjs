import { chromium } from '@playwright/test';
import fs from 'node:fs';
const S='C:/Users/ADMINI~1.DES/AppData/Local/Temp/claude/9fab65225557b01a/bf66c318-2801-42df-82f8-112c77d5079b/scratchpad/';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 900, height: 1125 } });
for (const k of (process.env.K || 'wand,stone,spent,gate').split(',')) {
  const dir = process.env.DIR || 'assets-src/plates';
  await p.setContent(`<body style="margin:0;background:#eeead9">${fs.readFileSync(`${dir}/${k}.svg`, 'utf8')}</body>`);
  await p.locator('svg').first().evaluate(s => { s.style.width = '900px'; s.style.height = 'auto'; s.style.display = 'block'; });
  await p.locator('svg').first().screenshot({ path: S + `plate-${process.env.TAG || 'old'}-${k}.png` });
}
await b.close();
