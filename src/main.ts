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

startRouter(main, prepare, () => close());
