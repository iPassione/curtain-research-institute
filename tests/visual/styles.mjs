// 计算样式快照：node tests/visual/styles.mjs <站点地址> <输出 json>
// 对比地址表里每个页面所有元素的主要计算样式，用于确认 @layer 收编没有改变层叠结果。
// <picture>/<source> 包装层不计入元素路径，使改造前后的 <img> 能一一对应。
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import { urls, widths } from './urls.mjs';

const [base, out] = process.argv.slice(2);
const props = ['display','position','top','left','right','bottom','width','height','margin-top','margin-right','margin-bottom','margin-left','padding-top','padding-right','padding-bottom','padding-left','color','background-color','background-image','background-size','background-position','border-top','border-right','border-bottom','border-left','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-transform','text-decoration-line','opacity','transform','z-index','grid-template-columns','gap','flex-direction','justify-content','align-items','box-shadow','filter','object-fit','object-position','overflow','visibility','white-space','aspect-ratio','max-width','min-height','clip-path','mix-blend-mode','stroke','fill','stroke-dasharray','stroke-dashoffset'];
const browser = await chromium.launch();
const result = {};
for (const [label, width, height] of widths) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'zh-CN', reducedMotion: 'reduce' });
  for (const [name, url] of urls) {
    const page = await context.newPage();
    await page.goto(base + url);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    result[`${name}.${label}`] = await page.evaluate(props => {
      const skip = el => el.tagName === 'PICTURE' || el.tagName === 'SOURCE';
      const kids = el => [...el.children].flatMap(c => c.tagName === 'PICTURE' ? [...c.children].filter(x => !skip(x)) : skip(c) ? [] : [c]);
      const map = {};
      const walk = (el, p) => {
        const cs = getComputedStyle(el);
        // background-image 只比对是否存在、以及图片的基本名，忽略格式与尺寸版本的差异。
        map[p] = props.map(k => k === 'background-image' ? cs[k].replace(/url\("?[^")]*\/([a-z0-9-]+?)(-\d+)?\.(png|webp|avif)"?\)( type\([^)]*\))?/g, 'url($1)').replace(/image-set\((url\([a-z0-9-]+\))(, url\([a-z0-9-]+\))*\)/g, '$1') : cs.getPropertyValue(k)).join('|');
        kids(el).forEach((c, i) => walk(c, `${p}>${c.tagName.toLowerCase()}${c.className && typeof c.className === 'string' ? '.' + c.className.trim().split(/\s+/).join('.') : ''}[${i}]`));
      };
      walk(document.body, 'body');
      return map;
    }, props);
    await page.close();
  }
  await context.close();
  console.log(label, 'done');
}
await browser.close();
fs.writeFileSync(out, JSON.stringify({ props, result }));
