// 地理馆航海图室的三维版本：画布铺在原转盘的位置，原有的五个大陆按钮移到画布之上的叠层，
// 每帧放到浮雕上对应大陆的位置。按钮、键盘、读屏与下方文字联动全部沿用原实现；
// 画布未就绪、降为静态档或出错时，原转盘照常可用。
import type { RouteContext } from '../router';
import { getStage } from './stage';
import { createChartScene, ROUTE_MS, type ChartState } from './scenes/chart';

/** 旅行案头使用的大陆编号，顺序与大陆数据一致。 */
const TRAVEL_IDS = ['camorria', 'eisenrod', 'tsvergno', 'esperanza', 'enchanteves'];

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
  // 立体模式新增的三样：昼夜、缩放、界门往来。只在立体模式下出现，卸载时移除。
  const names = buttons.map(b => (b.getAttribute('aria-label') || '').split('：')[1] || '');
  const extra = document.createElement('div');
  extra.className = 'chart-extra';
  extra.hidden = true;
  extra.innerHTML = `<div class="chart-extra-row"><label class="chart-hour-label" for="chart-hour">昼夜 <output for="chart-hour">15:00</output></label><input id="chart-hour" type="range" min="0" max="24" step="0.25" value="15" aria-label="一天中的时刻"><button type="button" class="chart-day" aria-pressed="false">日升日落</button><span class="chart-zoom" role="group" aria-label="缩放"><button type="button" data-zoom="out" aria-label="缩小">－</button><button type="button" data-zoom="in" aria-label="放大">＋</button></span></div>
<fieldset class="chart-route"><legend>界门往来</legend><label>从 <select id="route-from">${names.map((n, i) => `<option value="${i}" ${i === 1 ? 'selected' : ''}>${n}</option>`).join('')}</select></label><span aria-hidden="true">→</span><label>到 <select id="route-to">${names.map((n, i) => `<option value="${i}" ${i === 4 ? 'selected' : ''}>${n}</option>`).join('')}</select></label><button type="button" class="route-go">走一趟界门</button><a class="route-travel" hidden>去旅行案头整理行装 ↗</a><p class="route-status" role="status" aria-live="polite"></p></fieldset>`;
  const tools = stage.closest('.nautical-left')?.querySelector<HTMLElement>('.chart-tools');
  tools?.append(extra);
  let hour = 15, dayCycle = false, zoom = 1, route: { from: number; to: number; start: number } | null = null, cycleRaf = 0, last = 0;
  const hourInput = extra.querySelector<HTMLInputElement>('#chart-hour')!, hourOut = extra.querySelector('output')!;
  const dayButton = extra.querySelector<HTMLButtonElement>('.chart-day')!;
  const fmt = (h: number) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;
  const setHour = (h: number) => { hour = ((h % 24) + 24) % 24; hourInput.value = String(hour); hourOut.value = fmt(hour); };
  const cycle = (now: number) => {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    setHour(hour + dt * 1.6); // 约 15 秒走完一天
    cycleRaf = dayCycle ? requestAnimationFrame(cycle) : 0;
  };
  const setCycle = (on: boolean) => {
    dayCycle = on && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    dayButton.setAttribute('aria-pressed', String(dayCycle));
    dayButton.textContent = dayCycle ? '停在此刻' : '日升日落';
    cancelAnimationFrame(cycleRaf); last = 0;
    if (dayCycle) cycleRaf = requestAnimationFrame(cycle);
  };
  hourInput.addEventListener('input', () => { setCycle(false); setHour(Number(hourInput.value)); }, { signal: ctx.signal });
  dayButton.addEventListener('click', () => setCycle(!dayCycle), { signal: ctx.signal });
  const setZoom = (z: number) => { zoom = Math.min(2.4, Math.max(0.75, z)); };
  extra.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(b => b.addEventListener('click', () => setZoom(zoom * (b.dataset.zoom === 'in' ? 1.25 : 0.8)), { signal: ctx.signal }));
  // 双击放大；按住 Ctrl（或 ⌘）滚动滚轮缩放（不按时滚轮照常滚动页面）
  frame.addEventListener('dblclick', e => { if (stage.dataset.gl === 'on' && !(e.target as HTMLElement).closest('button')) setZoom(zoom >= 2.3 ? 1 : zoom * 1.4); }, { signal: ctx.signal });
  frame.addEventListener('wheel', e => { if (stage.dataset.gl !== 'on' || !(e.ctrlKey || e.metaKey)) return; e.preventDefault(); setZoom(zoom * Math.exp(-e.deltaY * 0.0015)); }, { passive: false, signal: ctx.signal });
  tools?.querySelector('.chart-reset')?.addEventListener('click', () => setZoom(1), { signal: ctx.signal });
  // 界门往来：示意从一块大陆经界门到另一块，抵达后可带着这趟行程去旅行案头整理行装
  const from = extra.querySelector<HTMLSelectElement>('#route-from')!, to = extra.querySelector<HTMLSelectElement>('#route-to')!;
  const travelLink = extra.querySelector<HTMLAnchorElement>('.route-travel')!, routeStatus = extra.querySelector<HTMLElement>('.route-status')!;
  extra.querySelector('.route-go')!.addEventListener('click', () => {
    const a = Number(from.value), b = Number(to.value);
    if (a === b) { routeStatus.textContent = '出发与目的是同一块大陆，换一个目的地试试。'; travelLink.hidden = true; return; }
    route = { from: a, to: b, start: performance.now() };
    routeStatus.textContent = `经界门从${names[a]}前往${names[b]}（示意）。`;
    travelLink.href = `?page=travel&from=${TRAVEL_IDS[a]}&to=${TRAVEL_IDS[b]}&mode=gate`;
    travelLink.hidden = true;
    window.setTimeout(() => { if (route && route.from === a && route.to === b) travelLink.hidden = false; }, ROUTE_MS * 0.75);
  }, { signal: ctx.signal });
  const extras: Pick<ChartState, 'hour' | 'zoom' | 'route'> = { hour: () => hour, zoom: () => zoom, route: () => route };

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
    host.remove(); overlay.remove(); extra.remove(); cancelAnimationFrame(cycleRaf);
    stage.closest('.nautical-left')?.querySelector<HTMLElement>('.chart-gl-note')?.setAttribute('hidden', '');
  };

  try {
    const scene = createChartScene(gl.renderer, gl.tier, hooks.positions, { ...hooks, ...extras, angle: hooks.angle, selected: hooks.selected, hot: hooks.hot, pitch: hooks.pitch }, points => {
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
      extra.hidden = false;
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
