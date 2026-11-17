// 魔法研究室「施法台」：在原「一次咒语的形成」图解上叠加可以亲手完成一次施法的粒子装置。
// 按住台面（或「按住施法」按钮，键盘按住空格／回车）：起势 → 塑形 → 稳定，稳定度随按住的时间上升，
// 稳定阶段的说明随之逐字写出；稳定后松手，力量朝指针方向导出，撞上台面边缘的弧线散成光尘。
// 提前松手，结构溃散，回到起势（《施法原理详论》：结构不稳时，力量可能在释放之前反噬）。
// 原有的四个阶段按钮与下方说明保持不变，施法过程中自动跟着走；直接点阶段按钮或「演示一次」时，粒子展示对应阶段。
import { Vector2 } from 'three';
import type { RouteContext } from '../router';
import { getStage } from './stage';
import { createCastingScene, floatType, FX_DURATION, type Element as CastElement } from './scenes/casting';

const ELEMENTS: { id: CastElement; name: string }[] = [{ id: 0, name: '火焰' }, { id: 1, name: '冰霜' }, { id: 2, name: '防御' }];
const STABLE_TEXT = '咒文稳定并进一步雕琢已经成形的魔力，使其更接近施法者的意图。';
const T_GATHER = 1.1, T_SHAPE = 1.3, T_STABLE = 2.6;
const DEFAULT_DIR = new Vector2(0.94, 0.34).normalize();

export function mountCastingRoom(ctx: RouteContext, panel: HTMLElement) {
  const stage = panel.querySelector<HTMLElement>('.casting-stage');
  if (!stage) return;
  const gl = getStage();
  if (gl.tier === 'static') return;
  const type = floatType(gl.renderer);
  if (!type) return; // 不支持浮点纹理计算：保留原图解

  const steps = [...panel.querySelectorAll<HTMLButtonElement>('[data-step]')];
  stage.dataset.gl = 'loading';
  const host = document.createElement('div');
  host.className = 'casting-gl';
  host.setAttribute('aria-hidden', 'true');
  stage.prepend(host);
  const ui = document.createElement('div');
  ui.className = 'casting-ui';
  ui.innerHTML = `<p class="casting-spell" aria-hidden="true">${[...STABLE_TEXT].map(ch => `<span>${ch}</span>`).join('')}</p>
<div class="casting-nodes" aria-hidden="true">${['起势', '塑形', '稳定', '导出'].map(n => `<span>${n}</span>`).join('')}</div>
<div class="casting-bar"><div class="casting-elements" role="group" aria-label="选择要塑成的结构">${ELEMENTS.map(e => `<button type="button" data-element="${e.id}" aria-pressed="${e.id === 0}">${e.name}</button>`).join('')}</div>
<button type="button" class="casting-hold" aria-describedby="casting-help">按住施法</button>
<p id="casting-help" class="casting-help">按住台面或按钮：起势、塑形、稳定；稳定后松手导出，方向朝向指针。提前松手，结构散去。</p>
<p class="casting-status" role="status" aria-live="polite"></p></div>`;
  stage.append(ui);
  const holdButton = ui.querySelector<HTMLButtonElement>('.casting-hold')!;
  const status = ui.querySelector<HTMLElement>('.casting-status')!;
  const spell = [...ui.querySelectorAll<HTMLElement>('.casting-spell span')];
  const nodeLabels = [...ui.querySelectorAll<HTMLElement>('.casting-nodes span')];

  let scene: ReturnType<typeof createCastingScene>;
  try {
    scene = createCastingScene(gl.renderer, gl.tier, type);
  } catch (error) {
    console.warn('施法台未能启动，保留原图解。', error);
    host.remove(); ui.remove(); stage.dataset.gl = 'off';
    return;
  }
  const w = scene.weights;
  const { signal } = ctx;

  // 状态机
  type Mode = 'idle' | 'casting' | 'release' | 'collapse' | 'showcase';
  let mode: Mode = 'idle', held = 0, timer = 0, raf = 0, last = 0, driving = false, phaseShown = -1;
  const aim = DEFAULT_DIR.clone();

  const showPhase = (i: number) => {
    if (phaseShown === i) return;
    phaseShown = i;
    driving = true;
    steps[i]?.click(); // 沿用原图解的按钮：更新按下状态与下方说明（说明区本身是 aria-live）
    driving = false;
  };
  const setSpell = (k: number) => {
    const n = Math.round(k * spell.length);
    spell.forEach((s, i) => s.classList.toggle('on', i < n));
  };
  const idle = () => {
    mode = 'idle'; held = 0;
    Object.assign(w, { gather: 0, shape: 0, stable: 0 });
    setSpell(0);
    holdButton.textContent = '按住施法';
    holdButton.classList.remove('is-ready');
  };

  const loop = (now: number) => {
    raf = 0;
    // 按住多久是用户直接感受到的时间，按真实经过的时间计（只防标签页切回时的大跳变）。
    const dt = last ? Math.min(0.5, (now - last) / 1000) : 0;
    last = now;
    if (mode === 'casting') {
      held += dt;
      w.gather = 1;
      const s1 = Math.min(1, held / T_GATHER);
      const s2 = Math.min(1, Math.max(0, (held - T_GATHER) / T_SHAPE));
      const s3 = Math.min(1, Math.max(0, (held - T_GATHER - T_SHAPE) / T_STABLE));
      w.shape = s2; w.stable = s3;
      w.phase = s3 > 0 ? 2 + s3 * 0.99 : s2 > 0 ? 1 + s2 : s1;
      setSpell(s3);
      showPhase(s3 > 0 ? 2 : s2 > 0 ? 1 : 0);
      if (s3 >= 1 && !holdButton.classList.contains('is-ready')) {
        holdButton.classList.add('is-ready');
        holdButton.textContent = '松手导出 ↗';
        status.textContent = '结构已稳定，松手导出。';
      }
    } else if (mode === 'release' || mode === 'collapse') {
      timer -= dt;
      if (timer <= 0) { idle(); w.phase = 0; status.textContent = ''; }
    }
    if (mode !== 'idle' && mode !== 'showcase') raf = requestAnimationFrame(loop);
  };
  const run = () => { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } };

  const begin = () => {
    if (mode === 'casting' || mode === 'release') return;
    mode = 'casting'; held = 0; phaseShown = -1;
    status.textContent = '';
    holdButton.textContent = '继续按住…';
    run();
  };
  const end = () => {
    if (mode !== 'casting') return;
    if (w.stable >= 0.99) {
      // 导出
      // 导出：三种结构各有专属效果，演完后粒子就地熄灭、重新铺开，直接进入下一次施法
      mode = 'release'; timer = FX_DURATION[w.element];
      scene.release(w.element, aim);
      Object.assign(w, { gather: 0, shape: 0, stable: 0, phase: 3.99 });
      setSpell(0);
      showPhase(3);
      status.textContent = `${ELEMENTS[w.element].name}已导出。`;
    } else {
      // 反噬：结构溃散，回到起势
      mode = 'collapse'; timer = FX_DURATION[3];
      scene.collapse();
      Object.assign(w, { gather: 0, shape: 0, stable: 0, phase: 0 });
      setSpell(0);
      showPhase(0);
      status.textContent = '结构未稳，力量散去。';
    }
    holdButton.textContent = '按住施法';
    holdButton.classList.remove('is-ready');
    run();
  };

  // 指针：按住台面施法；松手时朝指针方向导出
  const rect = () => host.getBoundingClientRect();
  const updateAim = (e: PointerEvent) => {
    const p = scene.toTable(e.clientX, e.clientY, rect()).sub(new Vector2(0, 0.15));
    if (p.length() > 0.45) aim.copy(p.normalize());
  };
  stage.addEventListener('pointerdown', e => {
    if (stage.dataset.gl !== 'on' || e.button !== 0 || (e.target as Element).closest('button, a')) return;
    updateAim(e);
    stage.setPointerCapture(e.pointerId);
    begin();
  }, { signal });
  stage.addEventListener('pointermove', e => { if (mode === 'casting') updateAim(e); }, { signal });
  const up = (e: PointerEvent) => { if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId); end(); };
  stage.addEventListener('pointerup', up, { signal });
  stage.addEventListener('pointercancel', () => end(), { signal });

  // 按钮与键盘：按住空格或回车
  holdButton.addEventListener('pointerdown', e => { if (e.button !== 0) return; aim.copy(DEFAULT_DIR); holdButton.setPointerCapture(e.pointerId); begin(); }, { signal });
  holdButton.addEventListener('pointerup', () => end(), { signal });
  holdButton.addEventListener('pointercancel', () => end(), { signal });
  holdButton.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); aim.copy(DEFAULT_DIR); begin(); } }, { signal });
  holdButton.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); end(); } }, { signal });
  holdButton.addEventListener('blur', () => end(), { signal });
  holdButton.addEventListener('click', e => e.preventDefault(), { signal });

  ui.querySelectorAll<HTMLButtonElement>('[data-element]').forEach(b => b.addEventListener('click', () => {
    w.element = Number(b.dataset.element) as CastElement;
    ui.querySelectorAll('[data-element]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  }, { signal }));

  // 用户直接点阶段按钮或「演示一次」：粒子展示对应阶段（不改变原按钮的行为）
  const showcase = new MutationObserver(() => {
    if (driving || mode === 'casting') return;
    const i = steps.findIndex(b => b.getAttribute('aria-pressed') === 'true');
    if (i < 0 || i === phaseShown) return;
    phaseShown = i;
    if (i === 3) {
      Object.assign(w, { gather: 0, shape: 0, stable: 0, phase: 3.99 });
      mode = 'release'; timer = FX_DURATION[w.element];
      scene.release(w.element, DEFAULT_DIR);
      setSpell(0);
      run();
      return;
    }
    if (mode === 'release' || mode === 'collapse') return; // 效果演完前不打断
    mode = 'showcase';
    Object.assign(w, { gather: 1, shape: i >= 1 ? 1 : 0, stable: i >= 2 ? 1 : 0, phase: i + 0.99 });
    setSpell(i >= 2 ? 1 : 0);
  });
  steps.forEach(b => showcase.observe(b, { attributes: true, attributeFilter: ['aria-pressed'] }));

  // 阶段标签放在台面节点下方（随画面适配位置）
  const placeLabels = () => {
    const r = rect();
    const corner = scene.toTable(r.right, r.top, r); // 右上角 = (可见宽/2, 可见高/2)
    nodeLabels.forEach((label, i) => {
      label.style.left = `${50 + ((-2.4 + 1.6 * i) / (corner.x * 2)) * 100}%`;
      label.style.top = `${50 - ((0.15 - 0.62) / (corner.y * 2)) * 100}%`;
    });
  };
  const ro = new ResizeObserver(placeLabels);
  ro.observe(stage);

  gl.mount(host, scene, () => { stage.dataset.gl = 'on'; placeLabels(); });
  ctx.onCleanup(() => {
    cancelAnimationFrame(raf); showcase.disconnect(); ro.disconnect();
    gl.unmount(); host.remove(); ui.remove();
  });
  idle();
}
