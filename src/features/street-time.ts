// 城市切片：一根可拖动的时间轴，街景从清晨连续过渡到入夜（阶段 6，FRONTEND-V3 第 3.7 节）。
// 三张街景构图对齐。相邻两张之间，后一张随一道柔和的斜向光带从左向右铺过来，像日光在街上移动；
// 过了午后，入夜图里的窗户、街灯与被照亮的石板路（灯光遮罩由 scripts/derive-lights.mjs 从原图派生）逐渐亮起，带一层微微摇曳的光晕。
// 原有三个时段按钮保留为时间轴下方的刻度；文字、地址参数仍按最近的时段切换。
// 叠加层只在读者第一次接近时间轴时载入，三张图解码完成之前，仍按原来的方式直接换图。
import { fallback, webpImg } from '../lib/images';

type Opts = {
  wrap: HTMLElement;          // .street-scene-wrap
  group: HTMLElement;         // .street-times（三个时段按钮）
  names: string[];            // 清晨 / 午后 / 入夜
  initial: number;
  onSettle: (index: number) => void; // 最近的时段变化时调用：更新文字、地址与底图
  signal: AbortSignal;
};

const SRC = ['morning', 'noon', 'evening'].map(t => `assets/street/prunoiva-${t}.png`);
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function mountStreetTime({ wrap, group, names, initial, onSettle, signal }: Opts) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let v = initial, settled = initial, ready = false, loading = false, raf = 0;

  // 时间轴：放在三个按钮上方，按钮成为刻度
  const dial = document.createElement('div');
  dial.className = 'street-dial';
  dial.innerHTML = `<input type="range" min="0" max="200" step="1" value="${initial * 100}" aria-label="街上的时刻"><span class="street-dial-track" aria-hidden="true"><span class="street-dial-fill"></span><span class="street-dial-sun"></span></span>`;
  group.prepend(dial);
  group.classList.add('has-dial');
  const input = dial.querySelector('input')!;

  // 叠加层：三张街景与灯光
  const blend = document.createElement('div');
  blend.className = 'street-blend';
  blend.setAttribute('aria-hidden', 'true');
  const lights = document.createElement('div');
  lights.className = 'street-lights';
  lights.setAttribute('aria-hidden', 'true');
  lights.innerHTML = '<span class="street-lights-halo"><i></i></span><i class="street-lights-core"></i>';
  const scene = wrap.querySelector('picture') ?? wrap.querySelector('.street-scene');
  scene?.after(blend, lights);
  let layers: HTMLImageElement[] = [];
  let lightsLoaded = false;

  const apply = () => {
    const i = Math.min(1, Math.floor(v)), f = v - i;
    if (ready) {
      blend.classList.add('is-on');
      layers.forEach((img, k) => {
        const upper = k === i + 1;
        img.style.opacity = k === i || (upper && f > 0) ? '1' : '0';
        img.style.zIndex = upper ? '2' : '1';
        if (upper) {
          const p = (-0.3 + 1.6 * f) * 100;
          img.style.maskImage = img.style.webkitMaskImage = `linear-gradient(100deg, #000 ${p - 30}%, transparent ${p + 30}%)`;
        } else img.style.maskImage = img.style.webkitMaskImage = 'none';
      });
    }
    const on = smooth(1.35, 1.95, v);
    if (on > 0 && !lightsLoaded) {
      lightsLoaded = true;
      const url = `url("${fallback(SRC[2])}")`;
      // 遮罩地址写在行内：相对页面解析（写进样式表会相对构建后的 CSS 文件解析）
      lights.querySelectorAll('i').forEach(el => { el.style.backgroundImage = url; el.style.maskImage = el.style.webkitMaskImage = 'url("assets/data/street-lights.png")'; });
    }
    wrap.style.setProperty('--lights', on.toFixed(3));
    dial.style.setProperty('--t', (v / 2).toFixed(4));
    input.value = String(Math.round(v * 100));
    const near = Math.round(v);
    input.setAttribute('aria-valuetext', names[near]);
    if (near !== settled) { settled = near; onSettle(near); }
  };

  const load = () => {
    if (loading) return;
    loading = true;
    blend.innerHTML = SRC.map(s => webpImg(s, 'alt="" decoding="async"', getComputedStyle(wrap).width)).join('');
    layers = [...blend.querySelectorAll('img')];
    Promise.all(layers.map(img => img.decode().catch(() => undefined))).then(() => { if (!signal.aborted) { ready = true; apply(); } });
  };

  const tween = (to: number) => {
    cancelAnimationFrame(raf);
    if (!ready || reduced.matches) { v = to; apply(); return; }
    const from = v, dur = 900 + 500 * Math.abs(to - from), t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      v = from + (to - from) * e; apply();
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  // 读者接近时间轴或街景时才载入叠加层；也在空闲时预先载入
  for (const el of [group, wrap]) for (const type of ['pointerenter', 'focusin', 'touchstart']) el.addEventListener(type, load, { signal, passive: true });
  const idle = (window as any).requestIdleCallback ? (window as any).requestIdleCallback(load, { timeout: 4000 }) : setTimeout(load, 2500);
  signal.addEventListener('abort', () => { cancelAnimationFrame(raf); (window as any).cancelIdleCallback ? (window as any).cancelIdleCallback(idle) : clearTimeout(idle); });

  input.addEventListener('input', () => { cancelAnimationFrame(raf); v = Number(input.value) / 100; apply(); }, { signal });
  input.addEventListener('change', () => tween(Math.round(v)), { signal });
  // 键盘：左右键直接走到相邻时段（带过渡），不是一格一格挪
  input.addEventListener('keydown', e => {
    const k = e.key, cur = Math.round(v);
    const to = k === 'ArrowLeft' || k === 'ArrowDown' ? cur - 1 : k === 'ArrowRight' || k === 'ArrowUp' ? cur + 1 : k === 'Home' ? 0 : k === 'End' ? 2 : null;
    if (to === null) return;
    e.preventDefault();
    tween(Math.max(0, Math.min(2, to)));
  }, { signal });

  apply();
  return { goTo: (index: number) => tween(index) };
}
