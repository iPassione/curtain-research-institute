// 入口：样式按旧站的加载顺序引入（各自收编在 @layer 中），全站外壳交互只挂一次，其余交给路由。
import './styles/index.css';
import { startRouter } from './router';
import { prepare } from './routes';

const main = document.querySelector('#main') as HTMLElement;

// 页头目录按钮（旧 institute.js 末尾）。
const toggle = document.querySelector('.menu-toggle') as HTMLButtonElement, nav = document.querySelector('#nav') as HTMLElement;
const close = () => { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); };
toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { close(); toggle.focus(); } });
document.addEventListener('click', e => { if (!(e.target as Element).closest('.header')) close(); });

// 全站检索：页头按钮、Ctrl/⌘ K、在非输入状态下按 /。面板代码与索引都在第一次打开时才载入。
const openSearch = () => import('./features/search').then(m => m.openSearch());
// 面板代码很小（约 2 KB 压缩后），空闲时预取，按下快捷键后立刻就能输入；检索索引仍等到第一次打开才取。
const idle = (window as any).requestIdleCallback || ((fn: () => void) => setTimeout(fn, 1500));
idle(() => { import('./features/search'); });
const trigger = document.querySelector('.search-trigger') as HTMLButtonElement | null;
if (trigger) {
  if (/Mac|iPhone|iPad/.test(navigator.platform)) trigger.querySelector('kbd')!.textContent = '⌘ K';
  trigger.addEventListener('click', () => { close(); openSearch(); });
}
document.addEventListener('keydown', e => {
  const typing = (e.target as Element | null)?.closest?.('input, textarea, select, [contenteditable="true"]');
  if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey) && !e.altKey) { e.preventDefault(); openSearch(); }
  else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); openSearch(); }
});

startRouter(main, prepare, () => close());
