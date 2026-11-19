// 航海图室（旧 nautical-map.js）：把地理方位图换成可转动的航海图。
// 转盘的选中状态仍交给方位图原按钮处理，二者共用一份状态。
import { picture } from '../lib/images';
import type { Manifest } from '../data/types';
import type { RouteContext } from '../router';
import { glCapable } from '../gl/tier';
import { startContinent } from './atlas';

export function mountNautical(ctx: RouteContext, data: Manifest) {
  const { signal } = ctx;
  const panel = ctx.main.querySelector('.atlas-geography');
  if (!panel) return;
  const stage = panel.querySelector('.geo-stage') as HTMLElement;
  const regions = data.regions;
  const positions = [[50, 50], [29, 29], [71, 29], [29, 71], [71, 71]];
  // Keep the atlas's existing selection and article renderer as the single source of truth.
  const originalButtons = [...stage.querySelectorAll<HTMLButtonElement>('[data-place]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  stage.classList.add('nautical-stage');
  stage.innerHTML = `<div class="nautical-frame"><div class="nautical-wheel"><div class="nautical-rotor">${picture('assets/nautical-chart.png', 'class="nautical-chart" alt="羊皮卷风格五大陆航海示意图，中央与四周各一块大陆" width="1254" height="1254" draggable="false"', '(max-width:850px) 100vw, 900px')}${regions.map((r, i) => `<button class="chart-place" data-chart-place="${i}" style="left:${positions[i][0]}%;top:${positions[i][1]}%" aria-label="${r.direction}：${r.name}" aria-controls="continent-detail" aria-pressed="${i === (startContinent(ctx, regions.length) ?? 0)}"><span class="chart-upright"><span class="chart-marker"></span><span class="chart-label" aria-hidden="true"><small>${r.direction}</small><strong>${r.name}</strong></span></span></button>`).join('')}</div></div><span class="chart-north" aria-hidden="true">N</span><p class="chart-hint" id="chart-instructions">拖动旋转 · 悬停识别 · 点选后在下方阅读</p></div>`;
  const frame = stage.querySelector('.nautical-frame') as HTMLElement;
  frame.tabIndex = 0; frame.setAttribute('role', 'group'); frame.setAttribute('aria-label', '可旋转的五大陆航海图'); frame.setAttribute('aria-describedby', 'chart-instructions');
  const tools = document.createElement('div'); tools.className = 'chart-tools';
  tools.innerHTML = '<div class="chart-buttons"><button type="button" data-turn="-15" aria-label="逆时针旋转15度">↶</button><button type="button" class="chart-reset">复位朝北</button><button type="button" data-turn="15" aria-label="顺时针旋转15度">↷</button><button type="button" class="chart-auto" aria-pressed="false">缓慢转动</button></div><label class="chart-angle-label" for="chart-angle">转向 <output for="chart-angle" aria-live="off">0°</output></label><input id="chart-angle" type="range" min="-180" max="180" step="1" value="0" aria-label="旋转海图角度"><p>风格化航海图，海岸线与比例为艺术示意。<span class="chart-gl-note" hidden>金色弧线示意中央大陆与各大陆之间经界门的往来，不表示航线与距离。</span></p>';
  stage.after(tools);
  // The selected continent's details follow the map and its controls.
  const left = document.createElement('div'); left.className = 'nautical-left'; stage.before(left); left.append(stage, tools);
  panel.querySelector('.atlas-eyebrow')!.textContent = '地理观测 · 航海图室';
  panel.querySelector('.atlas-heading > p')!.textContent = '转动海图，在五大陆之间寻找下一段旅途。';
  const rotor = stage.querySelector('.nautical-rotor') as HTMLElement;
  rotor.append(stage.querySelector('.chart-north')!);
  const labels = [...stage.querySelectorAll<HTMLElement>('.chart-upright')];
  const details = panel.querySelector('.atlas-note') as HTMLElement; details.id = 'continent-detail'; details.setAttribute('role', 'region'); details.setAttribute('aria-label', '当前大陆介绍');
  const slider = tools.querySelector('input') as HTMLInputElement;
  const output = tools.querySelector('output') as HTMLOutputElement;
  const autoButton = tools.querySelector('.chart-auto') as HTMLButtonElement;
  let angle = 0, automatic = !reduced.matches, visible = false, raf = 0, previous = 0, drag: { id: number; x: number; y: number; angle: number; pitch: number; t: number } | null = null;
  // 立体航海图用到的状态：选中的大陆、是否已点选（镜头飞近）、悬停/聚焦的大陆、纵向拖动给出的俯仰、松手后的惯性。
  const start = startContinent(ctx, regions.length);
  let selectedIndex = start ?? 0, focused = start != null, hotIndex = -1, pitchOffset = 0, velocity = 0, spin = 0;
  const gl3d = () => stage.dataset.gl === 'on';
  const normalise = (n: number) => ((n + 180) % 360 + 360) % 360 - 180;
  function paint() { const n = normalise(angle); rotor.style.transform = `rotate(${n}deg)`; labels.forEach(l => l.style.transform = `rotate(${-n}deg)`); slider.value = String(Math.round(n)); output.value = `${Math.round(n)}°`; frame.dataset.angle = String(n); }
  function cancel() { if (raf) cancelAnimationFrame(raf); raf = 0; previous = 0; }
  function tick(time: number) { raf = 0; if (!automatic || !visible || document.hidden || reduced.matches) return; const dt = previous ? Math.min((time - previous) / 1000, .05) : 0; previous = time; angle += dt * 2; paint(); raf = requestAnimationFrame(tick); }
  function sync() { autoButton.disabled = reduced.matches; autoButton.setAttribute('aria-pressed', String(automatic)); autoButton.textContent = reduced.matches ? '静态模式' : automatic ? '暂停转动' : '缓慢转动'; cancel(); if (automatic && visible && !document.hidden && !reduced.matches) raf = requestAnimationFrame(tick); }
  function stop() { automatic = false; sync(); }
  tools.querySelectorAll<HTMLElement>('[data-turn]').forEach(b => b.addEventListener('click', () => { stop(); angle += Number(b.dataset.turn); paint(); }, { signal }));
  tools.querySelector('.chart-reset')!.addEventListener('click', () => { stop(); angle = 0; focused = false; pitchOffset = 0; paint(); }, { signal });
  autoButton.addEventListener('click', () => { automatic = !automatic; sync(); }, { signal });
  slider.addEventListener('input', () => { stop(); angle = Number(slider.value); paint(); }, { signal });
  slider.addEventListener('focus', stop, { signal });
  stage.querySelectorAll('[data-chart-place]').forEach((button, i) => button.addEventListener('click', () => { stop(); selectedIndex = i; focused = true; stage.querySelectorAll('[data-chart-place]').forEach((b, j) => b.setAttribute('aria-pressed', String(i === j))); originalButtons[i].click(); }, { signal }));
  stage.querySelectorAll('[data-chart-place]').forEach(button => button.addEventListener('pointerenter', () => { if (matchMedia('(hover: hover)').matches) stop(); }, { signal }));
  stage.querySelectorAll<HTMLElement>('[data-chart-place]').forEach((button, i) => {
    const on = () => { hotIndex = i; }, off = () => { if (hotIndex === i) hotIndex = -1; };
    button.addEventListener('pointerenter', on, { signal }); button.addEventListener('pointerleave', off, { signal });
    button.addEventListener('focus', on, { signal }); button.addEventListener('blur', off, { signal });
  });
  frame.addEventListener('keydown', e => { if (e.target !== frame) return; if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); stop(); angle += e.key === 'ArrowLeft' ? -5 : 5; paint(); } if (e.key === 'Home') { e.preventDefault(); stop(); angle = 0; paint(); } }, { signal });
  frame.addEventListener('pointerdown', e => { if ((e.target as Element).closest('button') || e.button !== 0) return; stop(); cancelAnimationFrame(spin); velocity = 0; drag = { id: e.pointerId, x: e.clientX, y: e.clientY, angle, pitch: pitchOffset, t: performance.now() }; frame.setPointerCapture(e.pointerId); frame.classList.add('is-dragging'); }, { signal });
  frame.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const before = angle, now = performance.now();
    angle = drag.angle + (e.clientX - drag.x) / frame.clientWidth * 220;
    // 立体模式：记录角速度供松手后的惯性；鼠标纵向拖动调节俯仰（触屏纵向仍用于滚动页面）。
    if (gl3d()) {
      const dt = Math.max(1, now - drag.t) / 1000;
      velocity = velocity * 0.6 + ((angle - before) / dt) * 0.4;
      drag.t = now;
      if (e.pointerType === 'mouse') pitchOffset = Math.max(-18, Math.min(22, drag.pitch + (e.clientY - drag.y) * 0.15));
    }
    paint();
  }, { signal });
  function coast() {
    // 惯性：每秒约衰减到原来的 8%，低于 2°/秒 时停下。
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      velocity *= Math.pow(0.08, dt);
      if (Math.abs(velocity) < 2 || reduced.matches) { velocity = 0; return; }
      angle += velocity * dt; paint();
      spin = requestAnimationFrame(step);
    };
    spin = requestAnimationFrame(step);
  }
  function release(e: PointerEvent) { if (drag && e.pointerId === drag.id) { if (gl3d() && performance.now() - drag.t < 80) coast(); drag = null; frame.classList.remove('is-dragging'); if (frame.hasPointerCapture(e.pointerId)) frame.releasePointerCapture(e.pointerId); } }
  frame.addEventListener('pointerup', release, { signal }); frame.addEventListener('pointercancel', release, { signal }); frame.addEventListener('lostpointercapture', () => { drag = null; frame.classList.remove('is-dragging'); }, { signal });
  stage.addEventListener('focusin', () => stop(), { signal });
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: .1 });
  observer.observe(stage);
  document.addEventListener('visibilitychange', sync, { signal });
  reduced.addEventListener('change', () => { if (reduced.matches) automatic = false; sync(); }, { signal });
  ctx.onCleanup(() => { observer.disconnect(); cancel(); cancelAnimationFrame(spin); });
  paint(); sync();
  // 立体航海图：支持 WebGL2 且未要求减弱动态时，在原转盘上叠加三维浮雕（three.js 按需载入）。
  if (glCapable()) import('../gl/chart-room').then(m => {
    if (signal.aborted) return;
    m.mountChartRoom(ctx, {
      stage, frame, positions,
      buttons: [...stage.querySelectorAll<HTMLButtonElement>('[data-chart-place]')],
      angle: () => angle,
      selected: () => ({ index: selectedIndex, focused }),
      hot: () => hotIndex,
      pitch: () => pitchOffset,
    });
  }).catch(() => { /* 增强效果没载入（离开页面、网络中断）时保留原版式 */ });
}
