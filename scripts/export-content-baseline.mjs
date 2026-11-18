// 导出内容基线，供 verify-content.mjs 断言：
//   node scripts/export-content-baseline.mjs          按当前 content/ 布局导出（有意修改正文后用这个）
//   node scripts/export-content-baseline.mjs <目录>   按改造前的扁平布局，从旧站 dist 目录导出
// 加载顺序与 build-content.mjs 相同：catalogue → collection-content → collection-longform → humanized-articles → 三间展室。
// 记录每篇文章的标题、章节数、段落数，以及全文指纹。
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const legacyDir = process.argv[2];
const files = legacyDir
  ? ['catalogue.js', 'collection-content.js', 'collection-longform.js', 'humanized-articles.js', 'exhibit-data.js', 'travel-data.js', 'street-data.js'].map(f => `${legacyDir}/${f}`)
  : ['content/generated/catalogue.js', 'content/collection-content.js', 'content/generated/collection-longform.js', 'content/generated/humanized-articles.js',
     'content/fieldrooms/exhibit-data.js', 'content/fieldrooms/travel-data.js', 'content/fieldrooms/street-data.js'];
const context = { window: {} };
vm.createContext(context);
for (const file of files) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
let commit = 'unknown';
try { commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(); } catch {}
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
  note: `从${legacyDir ? `旧站 ${legacyDir}` : ` content/（HEAD ${commit}）`}导出的内容基线。由 scripts/export-content-baseline.mjs 生成，不要手改。`,
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
