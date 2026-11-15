// 改造前后比对：node tests/visual/compare.mjs <基线目录> <当前目录> [差异图目录]
// 1. 页面文本：标题、地址、导航高亮、#main 的可见文本与全部链接逐项相等。
// 2. 截图：尺寸相同；像素差异按 pixelmatch（阈值 0.1，忽略抗锯齿）统计，并输出差异图。
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const [before = 'tests/visual/baseline-shots', after = 'tests/visual/current', diffDir = 'tests/visual/diff'] = process.argv.slice(2);
fs.mkdirSync(diffDir, { recursive: true });
const textsBefore = JSON.parse(fs.readFileSync(fs.existsSync(path.join(before, 'texts.json')) ? path.join(before, 'texts.json') : 'tests/baseline/page-texts.json', 'utf8'));
const textsAfter = JSON.parse(fs.readFileSync(path.join(after, 'texts.json'), 'utf8'));
const rows = [];
let textFailures = 0;

for (const key of Object.keys(textsAfter)) {
  const a = textsBefore[key], b = textsAfter[key];
  if (!a) { rows.push({ key, text: 'no baseline' }); continue; }
  const diffs = [];
  for (const field of ['title', 'url', 'surface', 'collection', 'main']) if (a[field] !== b[field]) diffs.push(field);
  if (JSON.stringify(a.current) !== JSON.stringify(b.current)) diffs.push('nav-current');
  if (JSON.stringify(a.links) !== JSON.stringify(b.links)) diffs.push('links');
  if (b.errors?.length) diffs.push('errors: ' + b.errors.join(' | '));
  if (diffs.length) textFailures++;

  const pa = path.join(before, key + '.png'), pb = path.join(after, key + '.png');
  let pixel = 'missing';
  if (fs.existsSync(pa) && fs.existsSync(pb)) {
    const A = PNG.sync.read(fs.readFileSync(pa)), B = PNG.sync.read(fs.readFileSync(pb));
    if (A.width !== B.width || A.height !== B.height) pixel = `size ${A.width}x${A.height} → ${B.width}x${B.height}`;
    else {
      const out = new PNG({ width: A.width, height: A.height });
      const n = pixelmatch(A.data, B.data, out.data, A.width, A.height, { threshold: 0.1 });
      pixel = n ? `${n} px (${(n / (A.width * A.height) * 100).toFixed(3)}%)` : 'identical';
      if (n) fs.writeFileSync(path.join(diffDir, key + '.diff.png'), PNG.sync.write(out));
    }
  }
  rows.push({ key, text: diffs.length ? diffs.join(', ') : 'same', pixel });
}
console.table(rows);
fs.writeFileSync(path.join(diffDir, 'report.json'), JSON.stringify(rows, null, 1));
console.log(`text/DOM mismatches: ${textFailures} of ${rows.length}`);
process.exitCode = textFailures ? 1 : 0;
