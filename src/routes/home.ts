// 首页（旧 institute.js 的首页分支与末尾的 GSAP 段）。GSAP 只随首页分块加载。
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { esc, reducedMotion } from '../lib/html';
import { glCapable } from '../gl/tier';
import { picture, webpImg } from '../lib/images';
import type { Manifest } from '../data/types';
import type { RouteContext } from '../router';
import { card, covers, dome } from './shared';

export function renderHome(ctx: RouteContext, data: Manifest) {
  const { main } = ctx;
  const picks = ['history-discrete-full', 'camoria', 'casting-reference'].map(id => data.articles.find(a => a.id === id)!).filter(Boolean);
  const heroHtml = glCapable()
    ? `<section class="journey" data-journey data-gl="loading"><div class="hero journey-stage"><div class="hero-image"></div><div class="journey-gl" aria-hidden="true"></div>${dome('dome')}<div class="hero-topline"><span>THE CURTAIN INSTITUTE</span><span>Anno 1077 · 穹顶之下</span></div><div class="hero-copy"><p class="hero-invitation">致每一位好奇的来访者</p><h1>世界藏在<br>帷幕<span>之下。</span></h1><div class="hero-actions"><a class="action" href="#explore">走进研究所 <span>↘</span></a><a class="text-link" href="?page=library">查阅全部馆藏 ↗</a></div></div><a class="hero-caption" href="?article=origin"><span>观测手记 / 帷幕</span><p>一道穹顶之内，<br>五大陆与四片海域。</p><span>阅读帷幕的起源 ↗</span></a><div class="journey-places" aria-hidden="true">${data.regions.map(r => `<span class="journey-place"><small>${esc(r.direction)}</small>${esc(r.name)}</span>`).join('')}</div><div class="journey-act journey-act-4" aria-hidden="true"><p class="journey-kicker">开放馆藏</p><p class="journey-title">选择你的研究方向。</p></div><div class="journey-act journey-act-2"><p class="journey-line">公元 1077 年，一道穹顶落下，笼罩五大陆与四片海域。</p><p class="journey-line">此后的每一段历史、每一座城市、每一则咒语，都在穹顶之下展开。</p></div><div class="hero-bottom"><span>探索共同的世界</span><a href="#explore">向下翻阅 ↓</a><span class="journey-progress" aria-hidden="true"><span></span></span></div></div></section>`
    : `<section class="hero"><div class="hero-image"></div>${dome('dome')}<div class="hero-topline"><span>THE CURTAIN INSTITUTE</span><span>Anno 1077 · 穹顶之下</span></div><div class="hero-copy"><p class="hero-invitation">致每一位好奇的来访者</p><h1>世界藏在<br>帷幕<span>之下。</span></h1><p class="hero-description">公元 1077 年，一道穹顶落下，笼罩五大陆与四片海域。<br>此后的每一段历史、每一座城市、每一则咒语，都在穹顶之下展开。</p><div class="hero-actions"><a class="action" href="#explore">走进研究所 <span>↘</span></a><a class="text-link" href="?page=library">查阅全部馆藏 ↗</a></div></div><a class="hero-caption" href="?article=origin"><span>观测手记 / 帷幕</span><p>一道穹顶之内，<br>五大陆与四片海域。</p><span>阅读帷幕的起源 ↗</span></a><div class="hero-bottom"><span>探索共同的世界</span><a href="#explore">向下翻阅 ↓</a></div></section>`;
  main.innerHTML = `${heroHtml}<div class="veil-rule" aria-hidden="true"><svg viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="M0 120C240 10 1200 10 1440 120" vector-effect="non-scaling-stroke"/></svg><span></span></div><section class="institute-opening"><p>研究所导览</p><h2>世界的厚度，<br>藏在具体的生活里。</h2><div><p>迁徙留下地名，贸易连起港口。咒语在课堂与工坊里传承，人们在漫长的历史中建立自己的秩序。</p><p>这里保存有关帷幕的研究与记录。你可以循着兴趣进入一间研究室，也可以从一篇文章，慢慢读到更远的地方。</p></div></section><section id="explore" class="departments"><div class="departments-inner"><div class="section-heading"><div><p>开放馆藏</p><h2>选择你的研究方向。</h2></div><a class="text-link" href="?page=library">全部馆藏 ↗</a></div><div class="gallery-grid">${data.sections.filter(s => s.id !== 'library').map(s => `<a class="gallery-room room-${esc(s.id)}" href="?page=${esc(s.id)}"><span class="room-category">${esc(s.en)}</span><div class="room-illustration" aria-hidden="true">${picture('assets/' + covers[s.id], 'alt="" loading="lazy" width="1536" height="1024"', '(max-width:550px) 100vw, (max-width:850px) 50vw, 60vw')}</div><div class="room-copy"><h3>${esc(s.title)}<b aria-hidden="true">↗</b></h3><p>${esc(s.description)}</p></div></a>`).join('')}</div></div></section><section class="desk-feature">${webpImg('assets/research-desk.png', 'alt="铺开航海图、手稿与观测仪器的研究桌" loading="lazy" width="1536" height="1024"', '(max-width:850px) 100vw, 60vw')}<div><p>公共阅览 · 本次选读</p><h2>让一条线索，<br>带你走得更远。</h2><p>从离散的历史，到中央大陆的城市与工坊，再到一次施法的形成。不同的记录，指向同一个世界。</p><a class="text-link" href="?page=library">进入公共阅览室 ↗</a></div></section><section class="selected-reading"><div class="section-heading"><div><p>打开一份馆藏</p><h2>值得停下来读的篇章。</h2></div></div><div class="articles">${picks.map(a => card(a)).join('')}</div></section>`;
}

/** 首页标题组入场与主视觉视差；在展室入口插入之后执行。 */
export function animateHome(ctx: RouteContext) {
  if (reducedMotion()) return;
  gsap.registerPlugin(ScrollTrigger);
  // 「穿过帷幕」：支持 WebGL2 且未要求减弱动态时，首页主视觉换成滚动驱动的四幕场景（three.js 只在这里按需载入）。
  if (ctx.main.querySelector('[data-journey]')) import('../gl/journey').then(m => { if (!ctx.signal.aborted) m.mountJourney(ctx); }).catch(() => { /* 增强效果没载入（离开页面、网络中断）时保留原版式 */ });
  const g = gsap.context(() => {
    gsap.from('.hero-copy > *', { y: 18, duration: 1.2, stagger: .1, ease: 'expo.out' });
    if (!ctx.main.querySelector('[data-journey]')) gsap.to('.hero-image', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }, ctx.main);
  ctx.onCleanup(() => g.revert());
}
