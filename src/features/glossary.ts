// 术语批注：正文里每个术语在全文首次出现处变成虚线词条，指向它的馆藏文章。
// 词条本身是普通链接（无脚本、读屏、触屏都能用）；鼠标悬停或键盘聚焦时弹出摘要卡，
// 卡片文字全部来自所指文章已公开的类别与提要。
import { esc } from '../lib/html';
import type { GlossaryTerm } from '../data/types';
import type { RouteContext } from '../router';

/** 返回逐段批注函数：输入已转义的段落 HTML，输出带词条链接的 HTML。全文每个术语只标一次。 */
export function createAnnotator(terms: GlossaryTerm[], currentArticle: string) {
  const usable = terms.filter(t => t.article !== currentArticle);
  const byForm = new Map<string, number>();
  usable.forEach((t, i) => t.forms.forEach(f => byForm.set(esc(f), i)));
  if (!byForm.size) return (html: string) => html;
  // 长词在前，避免「诺伐圣廷骑士团」被「骑士团」截断。
  const pattern = new RegExp([...byForm.keys()].sort((a, b) => b.length - a.length).map(f => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  const used = new Set<number>();
  return (html: string) => html.replace(pattern, match => {
    const i = byForm.get(match)!;
    if (used.has(i)) return match;
    used.add(i);
    const t = usable[i];
    return `<a class="term" href="?article=${encodeURIComponent(t.article)}" data-term="${i}" aria-describedby="term-card">${match}</a>`;
  });
}

/** 挂载摘要卡。terms 与 createAnnotator 收到的顺序一致（同一篇文章内过滤后的列表）。 */
export function mountGlossary(ctx: RouteContext, terms: GlossaryTerm[], currentArticle: string) {
  const usable = terms.filter(t => t.article !== currentArticle);
  const root = ctx.main.querySelector('.article');
  if (!root || !root.querySelector('.term')) return;
  const { signal } = ctx;

  const card = document.createElement('div');
  card.id = 'term-card';
  card.className = 'term-card';
  card.setAttribute('role', 'tooltip');
  card.hidden = true;
  document.body.append(card);
  ctx.onCleanup(() => card.remove());

  let active: HTMLAnchorElement | null = null, showTimer = 0, hideTimer = 0;
  const clear = () => { clearTimeout(showTimer); clearTimeout(hideTimer); };

  const place = (anchor: HTMLElement) => {
    const r = anchor.getBoundingClientRect(), gap = 10, margin = 16;
    const width = card.offsetWidth, height = card.offsetHeight;
    const left = Math.max(margin, Math.min(innerWidth - width - margin, r.left + r.width / 2 - width / 2));
    const below = r.bottom + gap + height < innerHeight - margin || r.top - gap - height < margin;
    card.style.left = left + 'px';
    card.style.top = (below ? r.bottom + gap : r.top - gap - height) + 'px';
    card.dataset.side = below ? 'below' : 'above';
  };

  const show = (anchor: HTMLAnchorElement) => {
    clear();
    const t = usable[Number(anchor.dataset.term)];
    if (!t) return;
    if (active !== anchor) {
      card.innerHTML = `<p class="term-card-eyebrow">${esc(t.eyebrow)}</p><p class="term-card-term">${esc(t.term)}</p><p class="term-card-lead">${esc(t.lead)}</p><a class="term-card-link" href="?article=${encodeURIComponent(t.article)}">阅读《${esc(t.title)}》 <span aria-hidden="true">↗</span></a>`;
      active = anchor;
    }
    card.hidden = false;
    place(anchor);
  };
  const hide = (delay = 160) => {
    clear();
    hideTimer = window.setTimeout(() => { card.hidden = true; active = null; }, delay);
  };

  root.addEventListener('pointerover', e => {
    const a = (e.target as Element).closest?.('.term') as HTMLAnchorElement | null;
    if (!a || (e as PointerEvent).pointerType === 'touch') return;
    clear();
    showTimer = window.setTimeout(() => show(a), active ? 0 : 260);
  }, { signal });
  root.addEventListener('pointerout', e => {
    const a = (e.target as Element).closest?.('.term');
    if (a && !card.contains((e as PointerEvent).relatedTarget as Node)) hide();
  }, { signal });
  card.addEventListener('pointerenter', clear, { signal });
  card.addEventListener('pointerleave', () => hide(), { signal });

  root.addEventListener('focusin', e => {
    const a = (e.target as Element).closest?.('.term') as HTMLAnchorElement | null;
    if (a) show(a);
  }, { signal });
  root.addEventListener('focusout', e => {
    if ((e.target as Element).closest?.('.term') && !card.contains((e as FocusEvent).relatedTarget as Node)) hide(0);
  }, { signal });
  card.addEventListener('focusout', e => { if (!card.contains((e as FocusEvent).relatedTarget as Node)) hide(0); }, { signal });

  // 触屏：第一次轻触展开摘要卡，卡片里的链接再进入文章；再次轻触同一词条也直接进入。
  root.addEventListener('click', e => {
    const a = (e.target as Element).closest?.('.term') as HTMLAnchorElement | null;
    if (!a || !matchMedia('(hover: none)').matches) return;
    if (active === a && !card.hidden) return;
    e.preventDefault();
    show(a);
  }, { signal });
  document.addEventListener('pointerdown', e => {
    if (!card.hidden && !card.contains(e.target as Node) && !(e.target as Element).closest?.('.term')) hide(0);
  }, { signal });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !card.hidden) { const back = active; hide(0); back?.focus(); }
  }, { signal });
  addEventListener('scroll', () => { if (!card.hidden && active) place(active); }, { passive: true, signal });
  addEventListener('resize', () => { if (!card.hidden) hide(0); }, { signal });
}
