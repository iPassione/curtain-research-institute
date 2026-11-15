// 比较两份计算样式快照：node tests/visual/style-diff.mjs <改造前.json> <改造后.json>
import fs from 'node:fs';
const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const props = a.props;
let total = 0;
for (const page of Object.keys(b.result)) {
  const A = a.result[page], B = b.result[page];
  if (!A) continue;
  const lines = [];
  const keys = new Set([...Object.keys(A), ...Object.keys(B)]);
  for (const k of keys) {
    if (!(k in A)) { lines.push(`  + ${k}`); continue; }
    if (!(k in B)) { lines.push(`  - ${k}`); continue; }
    if (A[k] === B[k]) continue;
    const x = A[k].split('|'), y = B[k].split('|');
    const d = props.map((p, i) => x[i] !== y[i] ? `${p}: ${x[i]} → ${y[i]}` : null).filter(Boolean);
    lines.push(`  ~ ${k}\n      ${d.join('\n      ')}`);
  }
  total += lines.length;
  if (lines.length) console.log(`${page}: ${lines.length} element(s)\n${lines.slice(0, Number(process.env.LIMIT || 12)).join('\n')}`);
}
console.log(`total differing elements: ${total}`);
