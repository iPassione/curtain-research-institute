// 诸界观测「层积的六界」：在馆藏页头与正文之间插入一段纵向下潜（约六屏滚动）。
// 下潜里的文字取自下方观测台面板的同一份数据，只作视觉叙述，对读屏隐藏（避免与面板重复朗读）；
// 观测台面板本身保持不变，「跳到观测台」链接可让键盘用户直接越过下潜。
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { RouteContext } from '../router';
import { esc } from '../lib/html';
import { getStage } from './stage';
import { createWorldsScene } from './scenes/worlds';

export interface WorldEntry { id: string; name: string; position: string; title: string; text: string; authority: string }

/** 滚动进度 → 柱上深度（屏）的关键帧：每一层停留一段，层与层之间穿过地层。 */
const DEPTH_KEYS: [number, number][] = [[0, 0.1], [0.14, 0.45], [0.22, 1.32], [0.3, 2.0], [0.62, 3.0], [0.7, 3.88], [0.8, 4.55], [1, 4.75]];
/** 中层三界依次聚焦的进度区间。 */
const FOCUS_KEYS: [number, number][] = [[0.3, 0], [0.4, 0], [0.44, 1], [0.52, 1], [0.56, 2], [0.62, 2]];
const lerpKeys = (keys: [number, number][], p: number) => {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [p1, v1] = keys[i], [p0, v0] = keys[i - 1];
    if (p <= p1) { const t = (p - p0) / (p1 - p0); const e = t * t * (3 - 2 * t); return v0 + (v1 - v0) * e; }
  }
  return keys[keys.length - 1][1];
};
/** 各世界说明出现的进度区间：[开始, 结束]。 */
const CARDS: [string, number, number][] = [['stars', 0.02, 0.14], ['matter', 0.3, 0.4], ['spirit', 0.42, 0.52], ['mirror', 0.54, 0.62], ['dead', 0.72, 0.84], ['time', 0.88, 0.98]];

export function mountWorldsDive(ctx: RouteContext, hero: HTMLElement, worlds: WorldEntry[]) {
  const stage = getStage();
  if (stage.tier === 'static') return;
  gsap.registerPlugin(ScrollTrigger);

  const byId = Object.fromEntries(worlds.map(w => [w.id, w]));
  const section = document.createElement('section');
  section.className = 'worlds-dive';
  section.dataset.gl = 'loading';
  section.setAttribute('aria-label', '下潜观测：六大世界');
  section.innerHTML = `<div class="worlds-dive-stage"><div class="worlds-dive-gl" aria-hidden="true"></div>
<a class="worlds-dive-skip" href="#world-observation">跳到观测台 ↓</a>
<div class="worlds-dive-cards" aria-hidden="true">${CARDS.map(([id]) => { const w = byId[id]; return w ? `<div class="worlds-card" data-card="${id}"><p class="worlds-card-pos">${esc(w.position)}</p><p class="worlds-card-name">${esc(w.name)}</p><p class="worlds-card-title">${esc(w.title)}</p><p class="worlds-card-text">${esc(w.text)}</p><p class="worlds-card-auth"><span>代表权柄</span>${esc(w.authority)}</p></div>` : ''; }).join('')}</div>
<div class="worlds-dive-depth" aria-hidden="true"><span></span></div></div>`;
  hero.after(section);
  ctx.onCleanup(() => section.remove());

  const host = section.querySelector<HTMLElement>('.worlds-dive-gl')!;
  let scene: ReturnType<typeof createWorldsScene> | null = null;
  try {
    scene = createWorldsScene(stage.renderer, stage.tier);
    stage.mount(host, scene, () => { section.dataset.gl = 'on'; });
    ctx.onCleanup(() => stage.unmount());
  } catch (error) {
    console.warn('诸界下潜未能启动。', error);
    section.remove();
    return;
  }

  const g = gsap.context(() => {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.5,
        onUpdate: self => scene?.set(lerpKeys(DEPTH_KEYS, self.progress), lerpKeys(FOCUS_KEYS, self.progress)),
      },
    });
    tl.fromTo('.worlds-dive-depth > span', { scaleY: 0 }, { scaleY: 1, duration: 1 }, 0);
    for (const [id, a, b] of CARDS) {
      const card = `.worlds-card[data-card="${id}"]`;
      tl.fromTo(card, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.025, ease: 'power2.out' }, a);
      tl.to(card, { opacity: 0, y: -30, duration: 0.02, ease: 'power1.in' }, b - 0.02);
    }
    tl.set({}, {}, 1);
    const p = tl.scrollTrigger?.progress ?? 0;
    scene?.set(lerpKeys(DEPTH_KEYS, p), lerpKeys(FOCUS_KEYS, p), true);
  }, section);
  ctx.onCleanup(() => g.revert());
}
