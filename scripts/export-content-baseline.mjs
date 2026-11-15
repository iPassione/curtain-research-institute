// 从改造前的运行时数据导出内容基线（一次性）：
// node scripts/export-content-baseline.mjs <旧 dist 目录>
// 按旧站的加载顺序执行 catalogue → collection-content → collection-longform → humanized-articles，
// 记录每篇文章的标题、章节数、段落数，以及全文指纹，供 build-content 断言。
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const dir = process.argv[2] || 'dist';
const context = { window: {} };
vm.createContext(context);
for (const file of ['catalogue.js', 'collection-content.js', 'collection-longform.js', 'humanized-articles.js', 'exhibit-data.js', 'travel-data.js', 'street-data.js'])
  vm.runInContext(fs.readFileSync(`${dir}/${file}`, 'utf8'), context);
const data = context.window.CURTAIN_CONTENT;
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
const articles = data.articles.map(a => ({
  id: a.id,
  title: a.title,
  chapters: a.chapters.length,
  paragraphs: a.chapters.reduce((n, c) => n + c.paragraphs.length, 0),
  fingerprint: hash({ section: a.section, eyebrow: a.eyebrow, title: a.title, subtitle: a.subtitle, lead: a.lead, source: a.source, chapters: a.chapters })
}));
const baseline = {
  note: '改造前（359d11a）运行时合并后的内容基线。由 scripts/export-content-baseline.mjs 生成，不要手改。',
  count: articles.length,
  articles,
  sections: hash(data.sections),
  timeline: hash(data.timeline),
  regions: hash(data.regions),
  institute: hash(data.institute),
  aliases: data.aliases,
  fieldrooms: { exhibits: hash(context.window.CURTAIN_EXHIBITS), travel: hash(context.window.CURTAIN_TRAVEL), street: hash(context.window.CURTAIN_STREET) }
};
fs.writeFileSync('tests/baseline/content-baseline.json', JSON.stringify(baseline, null, 2) + '\n');
console.log(`Exported ${articles.length} articles.`);
