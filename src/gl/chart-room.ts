// 地理馆航海图室的三维版本：画布铺在原转盘的位置，原有的五个大陆按钮移到画布之上的叠层，
// 每帧放到浮雕上对应大陆的位置。按钮、键盘、读屏与下方文字联动全部沿用原实现；
// 画布未就绪、降为静态档或出错时，原转盘照常可用。
import type { RouteContext } from '../router';
import { getStage } from './stage';
import { createChartScene, type ChartState } from './scenes/chart';

export interface ChartRoomHooks extends ChartState {
  stage: HTMLElement;
  frame: HTMLElement;
  buttons: HTMLButtonElement[];
  positions: number[][];
}

export function mountChartRoom(ctx: RouteContext, hooks: ChartRoomHooks) {
  const { stage, frame, buttons } = hooks;
  const gl = getStage();
  if (gl.tier === 'static') return;

  stage.dataset.gl = 'loading';
  const host = document.createElement('div');
  host.className = 'chart-gl';
  host.setAttribute('aria-hidden', 'true');
  frame.prepend(host);
  const overlay = document.createElement('div');
  overlay.className = 'chart-overlay';
  frame.append(overlay);
  // 按钮移到叠层（保留原有的事件与属性）；卸载时放回原处，原转盘恢复如初。
  const parent = buttons[0]?.parentElement ?? null;
  let anchor = buttons[buttons.length - 1]?.nextSibling ?? null;
  while (anchor && buttons.includes(anchor as HTMLButtonElement)) anchor = anchor.nextSibling;
  const original = buttons.map(b => ({ left: b.style.left, top: b.style.top }));
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    // 按原顺序放回原转盘（定位点是最后一个按钮之后的非按钮节点），并还原百分比位置。
    buttons.forEach((b, i) => {
      if (parent) parent.insertBefore(b, anchor && anchor.parentNode === parent ? anchor : null);
      b.style.left = original[i].left; b.style.top = original[i].top;
      b.classList.remove('is-offscreen');
    });
    host.remove(); overlay.remove();
    stage.closest('.nautical-left')?.querySelector<HTMLElement>('.chart-gl-note')?.setAttribute('hidden', '');
  };

  try {
    const scene = createChartScene(gl.renderer, gl.tier, hooks.positions, hooks, points => {
      if (stage.dataset.gl !== 'on') return;
      // 跑出画面的大陆按钮只在视觉上淡出，仍可用键盘聚焦；聚焦时贴着画面边缘显示。
      const w = frame.clientWidth, h = frame.clientHeight, pad = 28;
      points.forEach((p, i) => {
        const b = buttons[i];
        b.style.left = Math.min(w - pad, Math.max(pad, p.x)).toFixed(1) + 'px';
        b.style.top = Math.min(h - pad, Math.max(pad, p.y)).toFixed(1) + 'px';
        b.classList.toggle('is-offscreen', !p.visible);
      });
    });
    gl.mount(host, scene, () => {
      buttons.forEach(b => overlay.append(b));
      stage.dataset.gl = 'on';
      stage.closest('.nautical-left')?.querySelector<HTMLElement>('.chart-gl-note')?.removeAttribute('hidden');
    });
    // 运行中降到静态档：舞台把 data-gl 置为 off，此时把按钮放回原转盘。
    const watch = new MutationObserver(() => { if (stage.dataset.gl === 'off') { watch.disconnect(); restore(); } });
    watch.observe(stage, { attributes: true, attributeFilter: ['data-gl'] });
    ctx.onCleanup(() => { watch.disconnect(); gl.unmount(); restore(); });
  } catch (error) {
    console.warn('立体航海图未能启动，保留原转盘。', error);
    stage.dataset.gl = 'off';
    restore();
  }
}
