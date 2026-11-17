// 全站检索面板（Ctrl/⌘ K、/ 或页头「检索」）：文章、章节、馆藏、展室一起搜。
// 中文以连续片段匹配为准：输入按空格拆成若干词，每个词都要出现；标题命中优先于正文。
// 索引（data/search.json，约 160 KB 压缩后）在第一次打开时载入，之后常驻。
import { esc } from '../lib/html';
import { loadSearch } from '../data/store';
import type { SearchDoc } from '../data/types';

interface Prepared extends SearchDoc { lTitle: string; lMeta: string; lText: string }
const LABEL: Record<SearchDoc['type'], string> = { section: '馆藏', article: '文章', chapter: '章节', room: '展室' };
const MAX = 24;

let dialog: HTMLDialogElement | null = null;
let index: Prepared[] | null = null;
let lastFocus: Element | null = null;

function build() {
  const d = document.createElement('dialog');
  d.className = 'search-dialog';
  d.setAttribute('aria-label', '检索全站馆藏');
  d.innerHTML = `<div class="search-panel"><div class="search-field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg><input type="search" role="combobox" aria-expanded="false" aria-controls="search-results" aria-autocomplete="list" placeholder="检索文章、章节、地名与器物…" autocomplete="off" spellcheck="false"><button type="button" class="search-close" aria-label="关闭检索">Esc</button></div><p class="search-status" aria-live="polite"></p><ul id="search-results" class="search-results" role="listbox" aria-label="检索结果"></ul><p class="search-hint"><span><kbd>↑</kbd><kbd>↓</kbd> 选择</span><span><kbd>Enter</kbd> 打开</span><span><kbd>Esc</kbd> 关闭</span></p></div>`;
  document.body.append(d);
  const input = d.querySelector('input')!, list = d.querySelector('ul')!, status = d.querySelector('.search-status')!;
  let active = -1;

  const setActive = (i: number) => {
    const items = [...list.children] as HTMLElement[];
    if (!items.length) { active = -1; input.removeAttribute('aria-activedescendant'); return; }
    active = (i + items.length) % items.length;
    items.forEach((el, n) => el.setAttribute('aria-selected', String(n === active)));
    input.setAttribute('aria-activedescendant', items[active].id);
    items[active].scrollIntoView({ block: 'nearest' });
  };

  const run = () => {
    const q = input.value.trim();
    if (!index) { status.textContent = '正在载入索引…'; return; }
    if (!q) { list.innerHTML = ''; status.textContent = `共 ${index.filter(d => d.type === 'article').length} 篇文章、${index.filter(d => d.type === 'chapter').length} 个章节可供检索。`; input.setAttribute('aria-expanded', 'false'); setActive(-1); return; }
    const results = search(index, q);
    list.innerHTML = results.map((r, i) => `<li id="search-result-${i}" role="option" aria-selected="false"><a href="${esc(r.doc.url)}" tabindex="-1"><span class="search-type">${LABEL[r.doc.type]}</span><span class="search-title">${mark(r.doc.title, r.terms)}</span><span class="search-meta">${esc(r.doc.meta)}</span>${r.snippet ? `<span class="search-snippet">${r.snippet}</span>` : ''}</a></li>`).join('');
    status.textContent = results.length ? `找到 ${results.length >= MAX ? MAX + ' 条以上' : results.length + ' 条'}结果` : '没有找到相关馆藏，换个词试试。';
    input.setAttribute('aria-expanded', String(results.length > 0));
    setActive(results.length ? 0 : -1);
  };

  input.addEventListener('input', run);
  input.addEventListener('keydown', e => {
    // 搜索框里按 Esc 默认只清空文字；这里统一为关闭面板。
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); (list.children[active]?.querySelector('a') as HTMLAnchorElement | null)?.click(); }
  });
  list.addEventListener('pointermove', e => {
    const li = (e.target as Element).closest('li');
    if (li) { const i = [...list.children].indexOf(li); if (i !== active) setActive(i); }
  });
  // 结果是普通站内链接：点击后由路由接管跳转，这里只负责关闭面板。
  list.addEventListener('click', e => { if ((e.target as Element).closest('a')) close(false); });
  d.querySelector('.search-close')!.addEventListener('click', () => close());
  d.addEventListener('click', e => { if (e.target === d) close(); });
  d.addEventListener('close', () => { document.documentElement.classList.remove('search-open'); });
  d.addEventListener('cancel', e => { e.preventDefault(); close(); });
  (d as any)._run = run;
  return d;
}

function close(restoreFocus = true) {
  if (!dialog?.open) return;
  dialog.close();
  if (restoreFocus && lastFocus instanceof HTMLElement) lastFocus.focus();
}

export function openSearch(initial = '') {
  dialog ||= build();
  if (dialog.open) return;
  lastFocus = document.activeElement;
  const input = dialog.querySelector('input')!;
  if (initial) input.value = initial;
  dialog.showModal();
  document.documentElement.classList.add('search-open');
  input.focus();
  input.select();
  const run = (dialog as any)._run as () => void;
  run();
  if (!index) loadSearch().then(docs => {
    index = docs.map(d => ({ ...d, lTitle: d.title.toLowerCase(), lMeta: d.meta.toLowerCase(), lText: d.text.toLowerCase() }));
    run();
  }).catch(() => { dialog!.querySelector('.search-status')!.textContent = '索引载入失败，请检查网络后重试。'; });
}

function count(hay: string, needle: string, cap = 6) {
  let n = 0, i = hay.indexOf(needle);
  while (i !== -1 && n < cap) { n++; i = hay.indexOf(needle, i + needle.length); }
  return n;
}

export function search(docs: Prepared[], query: string) {
  const terms = [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))];
  const scored: { doc: Prepared; score: number; terms: string[]; snippet: string }[] = [];
  for (const doc of docs) {
    let score = 0, ok = true, titleHit = false;
    for (const t of terms) {
      const inTitle = doc.lTitle.includes(t), inMeta = doc.lMeta.includes(t), hits = count(doc.lText, t);
      if (!inTitle && !inMeta && !hits) { ok = false; break; }
      titleHit ||= inTitle;
      score += (inTitle ? (doc.lTitle === t ? 40 : 18) : 0) + (inMeta ? 5 : 0) + hits * 1.5;
    }
    if (!ok) continue;
    // 标题命中时，馆藏、整篇文章、展室排在同名章节之前。
    score += { section: 6, article: 4, chapter: 0, room: 2 }[doc.type] * (titleHit ? 3 : 1);
    scored.push({ doc, score, terms, snippet: '' });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, MAX);
  for (const r of top) r.snippet = snippet(r.doc, terms);
  return top;
}

function snippet(doc: Prepared, terms: string[]) {
  const at = terms.map(t => doc.lText.indexOf(t)).filter(i => i >= 0).sort((a, b) => a - b)[0];
  if (at === undefined) return doc.type === 'chapter' ? '' : mark(doc.text.slice(0, 64) + (doc.text.length > 64 ? '…' : ''), terms);
  const start = Math.max(0, at - 24), end = Math.min(doc.text.length, at + 70);
  return mark((start > 0 ? '…' : '') + doc.text.slice(start, end) + (end < doc.text.length ? '…' : ''), terms);
}

function mark(text: string, terms: string[]) {
  let html = esc(text);
  const escaped = terms.map(esc).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!escaped.length) return html;
  const re = new RegExp(escaped.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
  return html.replace(re, m => `<mark>${m}</mark>`);
}
