// 单页路由：拦截站内链接，用 history.pushState 切换；地址格式与旧站完全相同
// （?page=、?article=、from=、展室状态参数、#锚点）。每次切换只重绘 #main。
export interface RouteContext {
  url: URL;
  params: URLSearchParams;
  main: HTMLElement;
  /** 路由卸载时中止：所有 addEventListener 都应带上 { signal }。 */
  signal: AbortSignal;
  /** 注册卸载时执行的清理函数（观察器、计时器、GSAP 等）。 */
  onCleanup(fn: () => void): void;
  /** 改写当前地址的查询参数而不新增历史记录（展室状态）。 */
  replaceParams(url: URL): void;
}

/** prepare 负责取数与加载模块（可异步），返回同步执行的 render。 */
export type Prepare = (url: URL) => Promise<(ctx: RouteContext) => void>;

const SCROLL_KEY = 'curtain-scroll';
let navId = 0;
let pending = false; // 有一次切换已开始、尚未画到页面上
let renderedSearch: string | null = null;
let teardown: (() => void) | null = null;
let currentKey = '';

const newKey = () => Math.random().toString(36).slice(2, 10);
const positions = (): Record<string, number> => { try { return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}'); } catch { return {}; } };
function saveScroll() {
  if (!currentKey) return;
  try { const p = positions(); p[currentKey] = scrollY; sessionStorage.setItem(SCROLL_KEY, JSON.stringify(p)); } catch { /* 隐私模式下忽略 */ }
}

/** 站内应用地址：同源、同一路径（/ 与 /index.html 视为同一页）。 */
function isAppUrl(url: URL) {
  if (url.origin !== location.origin) return false;
  const norm = (p: string) => p.replace(/index\.html$/, '');
  return norm(url.pathname) === norm(location.pathname);
}

function scrollToHash(hash: string) {
  const id = decodeURIComponent(hash.slice(1));
  const el = id ? document.getElementById(id) : null;
  if (el) el.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
  else scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

// 页面切换转场（View Transitions）：馆藏条目的标题与文章大标题互相变形，其余内容短暂交叉淡化。
// 只给一对元素命名：进入文章时取新文章的 id，离开文章时取旧文章的 id；两侧都找不到可见的对应元素时只做淡化。
// 不支持该接口或用户要求减弱动态时直接切换。
const TITLE = 'curtain-title';
function sharedTitle(from: string, to: string) {
  return new URLSearchParams(to).get('article') || new URLSearchParams(from).get('article') || '';
}
function nameVisible(id: string) {
  if (!id) return null;
  const el = [...document.querySelectorAll<HTMLElement>('[data-vt]')].find(e => {
    if (e.dataset.vt !== id) return false;
    const r = e.getBoundingClientRect();
    return r.height > 0 && r.bottom > 0 && r.top < innerHeight;
  });
  if (el) el.style.viewTransitionName = TITLE;
  return el || null;
}
function unname(el: HTMLElement | null) {
  if (!el) return;
  el.style.viewTransitionName = '';
  if (!el.getAttribute('style')) el.removeAttribute('style');
}
function transition(commit: () => void, id: string) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void>; ready: Promise<void>; updateCallbackDone: Promise<void> } };
  if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) { commit(); return; }
  const before = nameVisible(id);
  let after: HTMLElement | null = null;
  const vt = doc.startViewTransition(() => {
    unname(before);
    commit();
    after = nameVisible(id);
    // 只有一侧有标题时不做变形，避免标题从画面中央飞入飞出。
    if (!before) unname(after);
  });
  // 连续快速切换时，新的转场会中止上一个（AbortError）；页面更新照常执行，这里只需接住拒绝，避免未处理的报错。
  const ignore = () => {};
  vt.ready.catch(ignore);
  vt.updateCallbackDone.catch(ignore);
  vt.finished.catch(ignore).finally(() => unname(after));
}

export function startRouter(main: HTMLElement, prepare: Prepare, onNavigate: (url: URL) => void) {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  currentKey = history.state?.key || newKey();
  history.replaceState({ ...(history.state || {}), key: currentKey }, '');

  async function go(url: URL, mode: 'initial' | 'push' | 'replace' | 'pop') {
    const id = ++navId;
    pending = true;
    if (mode !== 'initial') saveScroll();
    if (mode === 'push' || mode === 'replace') {
      currentKey = newKey();
      history[mode === 'push' ? 'pushState' : 'replaceState']({ key: currentKey }, '', url);
    } else if (mode === 'pop') {
      currentKey = history.state?.key || newKey();
    }
    onNavigate(url);
    let render: (ctx: RouteContext) => void;
    try {
      render = await prepare(url);
    } catch (error) {
      // 取数失败（离线、文件缺失）时退回整页加载，让浏览器给出真实结果。
      if (id === navId && mode !== 'initial') location.reload();
      throw error;
    }
    if (id !== navId) return;
    pending = false;
    const commit = () => {
      teardown?.();
      const controller = new AbortController();
      const cleanups: Array<() => void> = [];
      teardown = () => { controller.abort(); cleanups.splice(0).reverse().forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); };
      renderedSearch = url.search;
      render({
        url, params: new URLSearchParams(url.search), main, signal: controller.signal,
        onCleanup: fn => cleanups.push(fn),
        replaceParams: next => { history.replaceState(history.state, '', next); renderedSearch = next.search; },
      });
      if (mode === 'pop') {
        const y = positions()[currentKey];
        if (y != null) scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
        else scrollToHash(url.hash);
      } else if (mode !== 'initial' || url.hash) {
        scrollToHash(url.hash);
      }
    };
    if (mode === 'initial') commit();
    else transition(commit, sharedTitle(previousSearch, url.search));
    previousSearch = url.search;
  }
  let previousSearch = location.search;

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const a = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || a.target || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (!isAppUrl(url)) return;
    // 只改锚点：交给浏览器原生处理（目录、跳至正文、向下翻阅）。
    if (url.search === location.search && url.hash && renderedSearch === url.search) return;
    event.preventDefault();
    const same = url.search === location.search && url.hash === location.hash;
    go(url, same ? 'replace' : 'push');
  });

  addEventListener('popstate', () => {
    const url = new URL(location.href);
    if (url.search === renderedSearch) {
      // 仅锚点变化；或在上一次切换画到页面之前就按了返回——此时页面仍是这一页，取消那次切换，并把导航高亮等还原到这一页。
      if (pending) { navId++; pending = false; currentKey = history.state?.key || currentKey; previousSearch = url.search; onNavigate(url); }
      return;
    }
    go(url, 'pop');
  });
  addEventListener('pagehide', saveScroll);

  return go(new URL(location.href), 'initial');
}
