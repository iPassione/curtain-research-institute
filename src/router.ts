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

export function startRouter(main: HTMLElement, prepare: Prepare, onNavigate: (url: URL) => void) {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  currentKey = history.state?.key || newKey();
  history.replaceState({ ...(history.state || {}), key: currentKey }, '');

  async function go(url: URL, mode: 'initial' | 'push' | 'replace' | 'pop') {
    const id = ++navId;
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
  }

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
    if (url.search === renderedSearch) return; // 仅锚点变化
    go(url, 'pop');
  });
  addEventListener('pagehide', saveScroll);

  return go(new URL(location.href), 'initial');
}
