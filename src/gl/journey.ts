// 首页「穿过帷幕」的编排：滚动进度 → 场景进度 + 文案层。场景与文案读同一个 ScrollTrigger，
// 所以在任意滚动位置刷新页面，画面与文字状态一致。画布未就绪或降为静态档时，占位图与 SVG 弧线保持可见。
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { RouteContext } from '../router';
import { getStage } from './stage';
import { createVeilScene, type VeilScene } from './scenes/veil';

/** 目前完成到第二幕（显形）。后两幕完成后改为 1。 */
export const JOURNEY_END = 0.45;

export function mountJourney(ctx: RouteContext) {
  const root = ctx.main.querySelector<HTMLElement>('[data-journey]');
  const host = root?.querySelector<HTMLElement>('.journey-gl');
  if (!root || !host) return;
  gsap.registerPlugin(ScrollTrigger);

  const stage = getStage();
  let scene: VeilScene | null = null;
  if (stage.tier === 'static') root.dataset.gl = 'off';
  else {
    try {
      scene = createVeilScene(stage.renderer, stage.tier);
      stage.mount(host, scene, () => { root.dataset.gl = 'on'; });
      ctx.onCleanup(() => stage.unmount());
    } catch (error) {
      console.warn('帷幕场景未能启动，保留静态主视觉。', error);
      root.dataset.gl = 'off';
      scene = null;
    }
  }

  const g = gsap.context(() => {
    // 时间轴以场景进度为单位（0–JOURNEY_END），滚动全程映射到这一段。
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: root, start: 'top top', end: 'bottom bottom', scrub: true,
        onUpdate: self => scene?.setProgress(self.progress * JOURNEY_END),
      },
    });
    tl.fromTo('.journey-progress > span', { scaleX: 0 }, { scaleX: 1, duration: JOURNEY_END }, 0);
    // 一 外海：标题组在进入第二幕前上移淡出
    tl.to(['.journey-stage > .hero-copy', '.journey-stage > .hero-caption'], { autoAlpha: 0, y: -36, duration: 0.06, ease: 'power1.in' }, 0.13);
    // 二 显形：SVG 弧线把位置交给薄膜；说明文字浮现，在第二幕末尾退场
    tl.to('.journey-stage > .dome', { opacity: 0, duration: 0.14 }, 0.24);
    tl.fromTo('.journey-act-2 .journey-line', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.05, stagger: 0.025, ease: 'power2.out' }, 0.24);
    tl.to('.journey-act-2 .journey-line', { opacity: 0, y: -26, duration: 0.035, stagger: 0.01, ease: 'power1.in' }, 0.405);
    tl.set({}, {}, JOURNEY_END);
    scene?.setProgress((tl.scrollTrigger?.progress ?? 0) * JOURNEY_END, true);
  }, ctx.main);
  ctx.onCleanup(() => g.revert());
}
