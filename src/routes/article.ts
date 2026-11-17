// 文章页（旧 institute.js 的 article 分支）。不加载 GSAP 与任何图形代码。
import { esc } from '../lib/html';
import type { Article, GlossaryTerm, Manifest } from '../data/types';
import { createAnnotator, mountGlossary } from '../features/glossary';
import { mountReader } from '../features/reader';
import type { RouteContext } from '../router';
import { belongs, card, dome } from './shared';

export function renderArticle(ctx: RouteContext, data: Manifest, article: Article, collection: string | undefined, glossary: GlossaryTerm[] = []) {
  const { main, signal } = ctx;
  const minutes = data.articles.find(a => a.id === article.id)!.minutes;
  document.title = `${article.title} | 帷幕研究所`;
  const annotate = createAnnotator(glossary, article.id);
  const cs = article.chapters, s = data.sections.find(s => s.id === collection), related = data.articles.filter(a => belongs(data, a, collection) && a.id !== article.id).slice(0, 3);
  main.innerHTML = `<div class="reading-progress" aria-hidden="true"><span></span></div><header class="article-masthead"><a class="back" href="?page=${esc(collection || 'library')}">← ${esc(s?.title || '公共馆藏')}</a><div class="article-heading"><p class="article-category">${esc(article.eyebrow)}</p><h1 data-vt="${esc(article.id)}">${esc(article.title)}</h1><p class="article-subtitle">${esc(article.subtitle)}</p><div class="article-facts"><span>帷幕研究所 · 公共阅览</span><span>${cs.length} 个章节</span><span>约 ${minutes} 分钟阅读</span></div></div><div class="folio-emblem" aria-hidden="true">帷<br>幕</div>${dome('page-dome', false)}</header><div class="page-content"><div class="reading-layout"><aside class="reading-aside"><details class="toc-details" open><summary>篇章索引 <span aria-hidden="true">＋</span></summary><nav aria-label="文章目录">${cs.map((c, i) => `<a href="#chapter-${i + 1}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(c.heading)}</a>`).join('')}</nav></details><div class="reading-options"><span>阅读字号</span><button data-font="smaller" aria-label="缩小正文字号">A−</button><button data-font="larger" aria-label="放大正文字号">A＋</button></div><a class="back" href="?page=${esc(collection || 'library')}">← 返回馆藏</a></aside><article class="article"><div class="abstract"><span>内容提要</span><p class="lead">${esc(article.lead)}</p></div>${cs.map((c, i) => `<section id="chapter-${i + 1}" class="article-chapter"><div class="chapter-index" aria-hidden="true">${String(i + 1).padStart(2, '0')}</div><h2>${esc(c.heading)}</h2>${c.paragraphs.map(p => `<p>${annotate(esc(p))}</p>`).join('')}</section>`).join('')}<div class="article-end"><span>◇</span><p>本篇阅毕</p></div><div class="sources"><strong>资料与延伸阅读</strong><p>${(article.source || []).map(esc).join(' · ')}</p></div></article></div>${related.length ? `<section class="related"><div class="catalog-heading"><h2>循着线索，继续阅读</h2><a href="?page=${esc(collection || 'library')}">返回馆藏 ↗</a></div><div class="articles">${related.map(a => card(a, collection)).join('')}</div></section>` : ''}</div>`;

  const toc = main.querySelector('.toc-details') as HTMLDetailsElement, mobileToc = matchMedia('(max-width:850px)');
  const adaptToc = () => { toc.open = !mobileToc.matches; };
  adaptToc();
  mobileToc.addEventListener('change', adaptToc, { signal });

  const links = [...main.querySelectorAll<HTMLAnchorElement>('.reading-aside nav a')];
  const observer = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.toggleAttribute('data-current', a.hash === '#' + e.target.id)); }), { rootMargin: '-15% 0px -65% 0px' });
  main.querySelectorAll('.article-chapter').forEach(c => observer.observe(c));
  ctx.onCleanup(() => observer.disconnect());

  let size = 18;
  try { size = Math.max(16, Math.min(24, Number(localStorage.getItem('curtain-font')) || 18)); } catch { /* 无存储时用默认字号 */ }
  const apply = () => (main.querySelector('.article') as HTMLElement).style.setProperty('--reading-size', size + 'px');
  apply();
  main.querySelectorAll<HTMLButtonElement>('[data-font]').forEach(b => b.addEventListener('click', () => {
    size = Math.max(16, Math.min(24, size + (b.dataset.font === 'larger' ? 1 : -1)));
    apply();
    try { localStorage.setItem('curtain-font', String(size)); } catch { /* 忽略 */ }
  }, { signal }));

  let scheduled = false;
  const progress = () => {
    const a = main.querySelector('.article') as HTMLElement | null;
    if (!a) return;
    const start = a.getBoundingClientRect().top + scrollY;
    (main.querySelector('.reading-progress span') as HTMLElement).style.width = Math.max(0, Math.min(100, (scrollY - start + innerHeight * .3) / Math.max(1, a.offsetHeight - innerHeight * .6) * 100)) + '%';
    scheduled = false;
  };
  addEventListener('scroll', () => { if (!scheduled) { requestAnimationFrame(progress); scheduled = true; } }, { passive: true, signal });
  addEventListener('resize', progress, { signal });
  progress();

  mountGlossary(ctx, glossary, article.id);
  mountReader(ctx, article);
}
