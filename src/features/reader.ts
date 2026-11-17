// 阅读位置记忆：记住每篇读到的段落（与字号无关），下次打开同一篇时在页面底部提示「从上次读到的地方继续」。
// 读到文末即清除。只存在本机浏览器里；存储不可用时静默跳过。
import { esc } from '../lib/html';
import type { Article } from '../data/types';
import type { RouteContext } from '../router';

const KEY = 'curtain-reading';
const LIMIT = 40;
type Store = Record<string, { p: number; t: number }>;

const load = (): Store => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
const save = (s: Store) => {
  try {
    const entries = Object.entries(s).sort((a, b) => b[1].t - a[1].t).slice(0, LIMIT);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch { /* 隐私模式或配额已满 */ }
};

export function mountReader(ctx: RouteContext, article: Article) {
  const { main, signal } = ctx;
  const paragraphs = [...main.querySelectorAll<HTMLElement>('.article-chapter > p')];
  const end = main.querySelector<HTMLElement>('.article-end');
  if (!paragraphs.length || !end) return;

  // 段落序号 → 所在章节，用于提示文字。
  const chapterOf: number[] = [];
  article.chapters.forEach((c, i) => c.paragraphs.forEach(() => chapterOf.push(i)));

  const saved = load()[article.id];
  if (saved && saved.p >= 2 && saved.p < paragraphs.length && !ctx.url.hash) offerResume(saved.p);

  let timer = 0;
  const record = () => {
    const line = innerHeight * 0.3;
    const store = load();
    if (end.getBoundingClientRect().top < innerHeight) { // 读到文末：清除记录
      if (store[article.id]) { delete store[article.id]; save(store); }
      return;
    }
    const index = paragraphs.findIndex(p => p.getBoundingClientRect().bottom > line);
    if (index < 1) return; // 还在开头，不必记
    store[article.id] = { p: index, t: Date.now() };
    save(store);
  };
  addEventListener('scroll', () => { clearTimeout(timer); timer = window.setTimeout(record, 400); }, { passive: true, signal });
  ctx.onCleanup(() => clearTimeout(timer));

  function offerResume(p: number) {
    const ci = chapterOf[p] ?? 0, heading = article.chapters[ci]?.heading || '';
    const bar = document.createElement('div');
    bar.className = 'resume';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', '继续阅读');
    bar.innerHTML = `<p>上次读到 <b>第 ${ci + 1} 章 · ${esc(heading)}</b></p><button type="button" class="resume-go">从上次读到的地方继续 <span aria-hidden="true">↓</span></button><button type="button" class="resume-close" aria-label="关闭提示">×</button>`;
    main.append(bar);
    requestAnimationFrame(() => bar.classList.add('is-in'));
    const close = () => { bar.classList.remove('is-in'); window.setTimeout(() => bar.remove(), 300); removeEventListener('scroll', onScroll); };
    const start = scrollY;
    const onScroll = () => { if (Math.abs(scrollY - start) > 600) close(); };
    addEventListener('scroll', onScroll, { passive: true, signal });
    bar.querySelector('.resume-go')!.addEventListener('click', () => {
      const target = paragraphs[p];
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      scrollTo({ top: target.getBoundingClientRect().top + scrollY - innerHeight * 0.28, behavior: reduced ? 'auto' : 'smooth' });
      target.classList.add('resume-mark');
      window.setTimeout(() => target.classList.remove('resume-mark'), 2400);
      close();
    }, { signal });
    bar.querySelector('.resume-close')!.addEventListener('click', close, { signal });
    ctx.onCleanup(() => bar.remove());
  }
}
