// 迁移断言：构建产物中的 53 篇文章与改造前基线逐篇一致。
// node scripts/verify-content.mjs
// 比对项：篇数、顺序、标题、章节数、段落数（题目要求），以及全文指纹、馆藏/时间线/大陆/别名/展室数据指纹（附加）。
// 有意修改正文后指纹会变化；那时用 scripts/export-content-baseline.mjs 重新导出基线，并在提交里说明。
import fs from 'node:fs';
import crypto from 'node:crypto';

const baseline = JSON.parse(fs.readFileSync('tests/baseline/content-baseline.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('public/data/manifest.json', 'utf8'));
const hash = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

check(manifest.articles.length === baseline.count, `篇数：基线 ${baseline.count}，现为 ${manifest.articles.length}`);
let identical = 0;
baseline.articles.forEach((b, i) => {
  const m = manifest.articles[i];
  if (!m || m.id !== b.id) { failures.push(`第 ${i + 1} 篇：基线 ${b.id}，现为 ${m?.id}`); return; }
  const a = JSON.parse(fs.readFileSync(`public/data/articles/${b.id}.json`, 'utf8'));
  const chapters = a.chapters.length, paragraphs = a.chapters.reduce((n, c) => n + c.paragraphs.length, 0);
  const before = failures.length;
  check(a.title === b.title && m.title === b.title, `${b.id} 标题：「${b.title}」→「${a.title}」`);
  check(chapters === b.chapters, `${b.id} 章节数：${b.chapters} → ${chapters}`);
  check(paragraphs === b.paragraphs, `${b.id} 段落数：${b.paragraphs} → ${paragraphs}`);
  check(hash({ section: a.section, eyebrow: a.eyebrow, title: a.title, subtitle: a.subtitle, lead: a.lead, source: a.source, chapters: a.chapters }) === b.fingerprint, `${b.id} 全文指纹不一致`);
  if (failures.length === before) identical++;
});
for (const key of ['sections', 'timeline', 'regions', 'institute']) check(hash(manifest[key]) === baseline[key], `${key} 数据指纹不一致`);
check(JSON.stringify(manifest.aliases) === JSON.stringify(baseline.aliases), '别名表不一致');
for (const room of ['exhibits', 'travel', 'street'])
  check(hash(JSON.parse(fs.readFileSync(`public/data/${room}.json`, 'utf8'))) === baseline.fieldrooms[room], `${room} 展室数据指纹不一致`);

console.log(`内容断言：${identical}/${baseline.count} 篇标题、章节数、段落数与全文指纹一致；别名 ${Object.keys(manifest.aliases).length} 条。`);
if (failures.length) { console.error('不一致：\n- ' + failures.join('\n- ')); process.exit(1); }
console.log('全部通过。');
