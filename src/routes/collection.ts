// 馆藏页（旧 institute.js 的 section 分支）。阅览室的全文检索文本按需获取。
import { esc } from '../lib/html';
import type { Manifest, Section } from '../data/types';
import { loadLibraryText } from '../data/store';
import type { RouteContext } from '../router';
import { belongs, card, dome, featuredIds, href } from './shared';

export function renderCollection(ctx: RouteContext, data: Manifest, section: Section, page: string) {
  const { main, signal } = ctx;
  document.title = `${section.title} | 帷幕研究所`;
  const entries = page === 'library' ? data.articles : section.articleIds ? section.articleIds.map(id => data.articles.find(a => a.id === id)!).filter(Boolean) : data.articles.filter(a => belongs(data, a, page));
  const f = data.articles.find(a => a.id === featuredIds[page]);
  main.innerHTML = `<header class="page-hero" data-section="${esc(page)}"><div class="collection-spine"><span>帷幕研究所</span><span>公共馆藏</span></div><div class="collection-title"><p class="kicker">${esc(section.en)}</p><h1>${esc(section.title)}</h1><p>${esc(section.description)}</p><a href="#collection-catalog" class="text-link">浏览 ${entries.length} 篇馆藏 ↓</a></div><div class="collection-art art-${esc(page)}" aria-hidden="true"></div>${dome('page-dome', false)}</header><div class="page-content"><div class="page-inner"><a href="./" class="back">研究所首页 / ${esc(section.title)}</a>${f ? `<section class="curator-feature"><div class="curator-intro"><span class="curator-label">从这里开始</span><h2>${esc(f.title)}</h2><p>研究所选读</p></div><a class="curator-article" href="${href(f, page)}"><p>${esc(f.lead)}</p><span class="feature-meta"><span>约 ${f.minutes} 分钟</span><b>展开阅读 ↗</b></span></a></section>` : ''}${page === 'history' ? `<section class="history-trail"><div class="catalog-heading"><h2>沿时间，回到历史现场</h2></div><div class="timeline">${data.timeline.map(t => `<div class="event"><time>${esc(t.year)}</time><h3>${esc(t.title)}</h3><p>${esc(t.description)}</p></div>`).join('')}</div></section>` : ''}<div class="catalog-heading" id="collection-catalog"><div><p class="catalog-label">馆藏目录</p><h2>${page === 'library' ? '找到下一条线索。' : '继续深入研究'}</h2></div><span id="result-count">${entries.length} 篇文章</span></div>${page === 'library' ? `<div class="catalog-tools"><label>检索馆藏<input id="catalog-search" type="search" placeholder="搜索标题、主题或正文…" autocomplete="off"></label><label>研究领域<select id="catalog-filter"><option value="">全部研究领域</option>${data.sections.filter(s => s.id !== 'library').map(s => `<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('')}</select></label></div><p class="search-empty" hidden>没有找到相关馆藏。试试其他关键词，或选择全部研究领域。</p>` : ''}<div class="articles">${entries.map(a => card(a, page === 'library' ? null : page)).join('')}</div></div></div>`;

  if (page === 'library') {
    const input = main.querySelector('#catalog-search') as HTMLInputElement, filter = main.querySelector('#catalog-filter') as HTMLSelectElement, cards = [...main.querySelectorAll<HTMLElement>('.articles .article-link')];
    let texts: string[] | null = null;
    const update = () => {
      if (!texts) return; // 全文尚未取回；取回后会补一次筛选
      let count = 0;
      cards.forEach((c, i) => { const show = (!filter.value || belongs(data, entries[i], filter.value)) && texts![i].includes(input.value.trim().toLowerCase()); c.hidden = !show; if (show) count++; });
      (main.querySelector('.search-empty') as HTMLElement).hidden = count > 0;
      main.querySelector('#result-count')!.textContent = count + ' 篇文章';
    };
    input.addEventListener('input', update, { signal });
    filter.addEventListener('change', update, { signal });
    loadLibraryText().then(map => {
      if (signal.aborted) return;
      texts = entries.map(a => map[a.id]);
      if (input.value || filter.value) update();
    });
  }
}
