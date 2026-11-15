// 内容构建：把馆藏拆成「目录清单 + 每篇一个 JSON」，修订稿在构建期合并。
// 输入（按旧站的运行时加载顺序执行，结果与改造前逐字一致）：
//   content/generated/catalogue.js           ← build-editorial.mjs 生成的基础馆藏
//   content/collection-content.js            ← 诸界观测、巫师日常两个栏目与四篇正文（手写）
//   content/generated/collection-longform.js ← build-collections.mjs 生成的八篇长文
//   content/generated/humanized-articles.js  ← build-humanized.cjs 生成的修订稿，覆盖正文
//   content/fieldrooms/*.js                  ← 三间展室的数据（直接编辑）
// 输出（public/data/，随 Vite 构建复制进 dist/data/）：
//   manifest.json            馆藏、时间线、大陆、别名，以及每篇的目录信息（不含正文）
//   articles/<id>.json       单篇全文
//   library-text.json        阅览室全文检索使用的小写文本
//   exhibits.json travel.json street.json
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const out = path.join(root, 'public/data');

export function loadContent() {
  const context = { window: {} };
  vm.createContext(context);
  for (const file of ['content/generated/catalogue.js', 'content/collection-content.js', 'content/generated/collection-longform.js', 'content/generated/humanized-articles.js',
    'content/fieldrooms/exhibit-data.js', 'content/fieldrooms/travel-data.js', 'content/fieldrooms/street-data.js'])
    vm.runInContext(read(file), context, { filename: file });
  const w = context.window;
  // 经由 JSON 往返，去掉 vm 上下文的原型，保证与浏览器端取到的数据一致。
  const plain = v => JSON.parse(JSON.stringify(v));
  return { data: plain(w.CURTAIN_CONTENT), exhibits: plain(w.CURTAIN_EXHIBITS), travel: plain(w.CURTAIN_TRAVEL), street: plain(w.CURTAIN_STREET) };
}

// 与旧版 institute.js 的 chapters()/minutes() 完全相同。
const chapters = a => a.chapters?.length ? a.chapters : [{ heading: '正文', paragraphs: a.paragraphs || [] }];
const minutes = a => Math.max(1, Math.ceil(chapters(a).flatMap(c => c.paragraphs).join('').length / 450));

export function buildContent() {
  const { data, exhibits, travel, street } = loadContent();
  const ids = new Set();
  for (const a of data.articles) {
    if (!/^[a-z0-9-]+$/.test(a.id)) throw new Error(`文章 ID 不适合作为文件名：${a.id}`);
    if (ids.has(a.id)) throw new Error(`重复的文章 ID：${a.id}`);
    ids.add(a.id);
  }
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'articles'), { recursive: true });
  const manifest = {
    institute: data.institute,
    sections: data.sections,
    timeline: data.timeline,
    regions: data.regions,
    aliases: data.aliases,
    articles: data.articles.map(a => ({ id: a.id, section: a.section, eyebrow: a.eyebrow, title: a.title, subtitle: a.subtitle, lead: a.lead, minutes: minutes(a) }))
  };
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest));
  for (const a of data.articles) {
    const { paragraphs, ...article } = a; // paragraphs 是 chapters 的拼接冗余，运行时不使用
    if (!a.chapters?.length) article.chapters = chapters(a);
    fs.writeFileSync(path.join(out, 'articles', `${a.id}.json`), JSON.stringify(article));
  }
  // 与旧版阅览室检索拼接的文本完全一致：标题、副标题、提要、类别、章节标题与段落。
  const text = Object.fromEntries(data.articles.map(a => [a.id, [a.title, a.subtitle, a.lead, a.eyebrow, ...chapters(a).flatMap(c => [c.heading, ...c.paragraphs])].join(' ').toLowerCase()]));
  fs.writeFileSync(path.join(out, 'library-text.json'), JSON.stringify(text));
  fs.writeFileSync(path.join(out, 'exhibits.json'), JSON.stringify(exhibits));
  fs.writeFileSync(path.join(out, 'travel.json'), JSON.stringify(travel));
  fs.writeFileSync(path.join(out, 'street.json'), JSON.stringify(street));
  return { articles: data.articles.length, sections: data.sections.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = buildContent();
  console.log(`Prepared ${r.articles} articles in ${r.sections} sections → public/data/`);
}
