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
  const glossary = buildGlossary(data);
  fs.writeFileSync(path.join(out, 'glossary.json'), JSON.stringify(glossary));
  const search = buildSearch(data, { exhibits, travel, street });
  fs.writeFileSync(path.join(out, 'search.json'), JSON.stringify(search));
  return { articles: data.articles.length, sections: data.sections.length, terms: glossary.length, docs: search.length };
}

// 术语批注：content/glossary.json 只写「词 → 文章」，卡片文字取自那篇文章自己的类别与提要。
// 指向不存在的文章时构建失败；在其他文章正文里一次都没出现的词条被略去并打印提示。
function buildGlossary(data) {
  const table = JSON.parse(read('content/glossary.json')).terms;
  const byId = new Map(data.articles.map(a => [a.id, a]));
  const bodies = data.articles.map(a => [a.id, chapters(a).flatMap(c => c.paragraphs).join('\n')]);
  const result = [];
  for (const t of table) {
    const a = byId.get(t.article);
    if (!a) throw new Error(`术语「${t.term}」指向不存在的文章：${t.article}`);
    const forms = [...new Set([...(t.match || []), t.term])].sort((x, y) => y.length - x.length);
    const used = bodies.some(([id, body]) => id !== a.id && forms.some(f => body.includes(f)));
    if (!used) { console.warn(`术语「${t.term}」未在其他文章正文中出现，已略去。`); continue; }
    result.push({ term: t.term, forms, article: a.id, title: a.title, eyebrow: a.eyebrow, lead: a.lead });
  }
  return result;
}

// 全站检索：每篇文章一条（标题、副标题、提要）+ 每章一条；馆藏、展品、旅行目的地、街巷地点各一条。
// 文档按 type 区分，url 是站内地址（文章章节带 #chapter-n 锚点，展室带状态参数）。
function buildSearch(data, rooms) {
  const docs = [];
  for (const s of data.sections) docs.push({ type: 'section', url: `?page=${s.id}`, title: s.title, meta: '馆藏', text: s.description });
  for (const a of data.articles) {
    const section = data.sections.find(s => s.id === a.section)?.title || '';
    docs.push({ type: 'article', url: `?article=${a.id}`, title: a.title, meta: a.eyebrow, text: [a.subtitle, a.lead].join(' ') });
    chapters(a).forEach((c, i) => docs.push({ type: 'chapter', url: `?article=${a.id}#chapter-${i + 1}`, title: c.heading, meta: `${a.title} · 第 ${i + 1} 章`, text: c.paragraphs.join(''), section }));
  }
  for (const x of rooms.exhibits) docs.push({ type: 'room', url: `?page=exhibits&object=${x.id}`, title: x.name, meta: `造物陈列室 · ${x.kind}`, text: [x.lead, ...x.chapters.flatMap(c => [c.title, ...c.paragraphs])].join(' ') });
  for (const c of rooms.travel.continents) docs.push({ type: 'room', url: `?page=travel&to=${c.id}`, title: `前往${c.name}`, meta: '五大陆旅行案头', text: [c.climate, ...c.arrival, ...c.manners].join(' ') });
  for (const p of rooms.street.places) docs.push({ type: 'room', url: `?page=street&place=${p.id}`, title: p.name, meta: `城市切片 · ${p.kind}`, text: [p.lead, ...Object.values(p.scenes).flatMap(s => [s.title, ...s.paragraphs])].join(' ') });
  return docs;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = buildContent();
  console.log(`Prepared ${r.articles} articles in ${r.sections} sections, ${r.terms} glossary terms, ${r.docs} search docs → public/data/`);
}
