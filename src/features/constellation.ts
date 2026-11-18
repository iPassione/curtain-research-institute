// 人物档案馆「星座图」：在原关系图上叠一层 2D 画布，把庭代尔与骑士团六席画成一幅星座。
// 只画面板里已有的关系——庭代尔与六席之间「导师与追随者」；六席彼此之间没有写关系，所以不画连线，
// 也不暗示任何身份或亲疏。七个按钮（可点、可聚焦、读屏可读）与下方说明保持原样，画布只读它们的状态。
// 选中庭代尔时六条线全亮（与原图一致）；选中或悬停某一席时，只有它与庭代尔之间的线亮起，一点光从中心流向它。
import type { RouteContext } from '../router';

interface Star { x: number; y: number; r: number; phase: number; speed: number }

export function mountConstellation(ctx: RouteContext, panel: HTMLElement) {
  const stage = panel.querySelector<HTMLElement>('.people-stage');
  if (!stage) return;
  const buttons = [...stage.querySelectorAll<HTMLButtonElement>('[data-person]')];
  if (buttons.length < 2) return;
  const { signal } = ctx;

  const canvas = document.createElement('canvas');
  canvas.className = 'constellation';
  canvas.setAttribute('aria-hidden', 'true');
  stage.querySelector('svg')?.after(canvas);
  stage.classList.add('is-constellation');
  ctx.onCleanup(() => { canvas.remove(); stage.classList.remove('is-constellation'); });
  const g = canvas.getContext('2d')!;

  // 节点位置取自按钮原有的百分比位置（与原关系图一致）
  const nodes = buttons.map(b => ({ fx: parseFloat(b.style.left) / 100, fy: parseFloat(b.style.top) / 100 }));
  let width = 1, height = 1, dpr = 1, stars: Star[] = [];
  let seed = 1077;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const resize = () => {
    const r = stage.getBoundingClientRect();
    width = Math.max(1, r.width); height = Math.max(1, r.height);
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    seed = 1077;
    stars = Array.from({ length: Math.round(width * height / 2600) }, () => ({ x: rand() * width, y: rand() * height, r: 0.4 + Math.pow(rand(), 3) * 1.4, phase: rand() * 6.28, speed: 0.6 + rand() * 1.6 }));
  };
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  let hovered = -1;
  buttons.forEach((b, i) => {
    const on = () => { hovered = i; }, off = () => { if (hovered === i) hovered = -1; };
    b.addEventListener('pointerenter', on, { signal }); b.addEventListener('pointerleave', off, { signal });
    b.addEventListener('focus', on, { signal }); b.addEventListener('blur', off, { signal });
  });

  // 线的亮度平滑过渡；首次进入视口时六条线依次描出
  const glow = nodes.map(() => 0);
  let drawStart = -1, raf = 0, visible = false, last = 0, time = 0;
  const point = (i: number) => ({ x: nodes[i].fx * width, y: nodes[i].fy * height });
  const control = (i: number) => {
    // 与原图相同的弧度：上三席的线向上弯，下三席向下弯
    const c = point(0), k = point(i);
    return { x: (c.x + k.x) / 2, y: (i <= 3 ? 85 / 520 : 440 / 520) * height };
  };
  const quad = (a: { x: number; y: number }, c: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({
    x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
    y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
  });

  const draw = (now: number) => {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now; time += dt;
    if (drawStart < 0) drawStart = time;
    const selected = buttons.findIndex(b => b.getAttribute('aria-pressed') === 'true');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 夜空：中心略亮的深绿，远星微微闪烁
    const bg = g.createRadialGradient(width * 0.5, height * 0.46, 0, width * 0.5, height * 0.46, Math.max(width, height) * 0.7);
    bg.addColorStop(0, '#173a36'); bg.addColorStop(1, '#07110f');
    g.fillStyle = bg; g.fillRect(0, 0, width, height);
    for (const s of stars) {
      g.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase));
      g.fillStyle = '#e8eedd';
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.2832); g.fill();
    }
    g.globalAlpha = 1;

    // 两道淡淡的轨道环（沿用原图）
    const c0 = point(0), unit = Math.min(width, height);
    g.strokeStyle = 'rgba(157,169,135,0.16)'; g.lineWidth = 0.8; g.setLineDash([2, 6]);
    for (const k of [0.36, 0.41]) { g.beginPath(); g.ellipse(c0.x, c0.y, unit * k * (width / unit) * 0.62, unit * k, 0, 0, 6.2832); g.stroke(); }
    g.setLineDash([]);

    // 连线：庭代尔 → 六席
    for (let i = 1; i < nodes.length; i++) {
      const active = selected === 0 || selected === i || hovered === i || hovered === 0;
      glow[i] += ((active ? 1 : 0) - glow[i]) * (1 - Math.exp(-dt * 6));
      const reveal = Math.min(1, Math.max(0, (time - drawStart - (i - 1) * 0.18) / 1.1));
      if (reveal <= 0) continue;
      const a = c0, c = control(i), b = point(i);
      const steps = 48, n = Math.ceil(steps * reveal);
      g.beginPath();
      for (let s = 0; s <= n; s++) { const p = quad(a, c, b, Math.min(reveal, s / steps)); s ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }
      g.strokeStyle = `rgba(224,200,141,${0.22 + 0.6 * glow[i]})`;
      g.lineWidth = 1 + 0.8 * glow[i];
      g.shadowColor = 'rgba(224,200,141,0.8)'; g.shadowBlur = 10 * glow[i];
      g.stroke();
      g.shadowBlur = 0;
      // 亮起的线上，一点光从中心流向这一席
      if (glow[i] > 0.05 && reveal >= 1) {
        const t = ((time * 0.42 + i * 0.13) % 1);
        const p = quad(a, c, b, t);
        const halo = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9);
        halo.addColorStop(0, `rgba(255,242,194,${0.9 * glow[i]})`); halo.addColorStop(1, 'rgba(255,242,194,0)');
        g.fillStyle = halo; g.beginPath(); g.arc(p.x, p.y, 9, 0, 6.2832); g.fill();
      }
      // 悬停某一席时，在弧线中点标出关系（原图说明里的措辞）
      if (hovered === i) {
        const m = quad(a, c, b, 0.5);
        g.font = '12px "Noto Serif SC", serif'; g.textAlign = 'center';
        g.fillStyle = 'rgba(241,226,180,0.92)';
        g.fillText('导师与追随者', m.x, m.y + (i <= 3 ? -10 : 18));
      }
    }

    // 星：每个人物按钮下方一颗，选中或悬停时更亮
    nodes.forEach((_, i) => {
      const p = point(i), on = i === selected || i === hovered;
      const r = (i === 0 ? 46 : 34) * (on ? 1.15 : 1);
      const tw = 0.85 + 0.15 * Math.sin(time * 1.3 + i);
      const halo = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      halo.addColorStop(0, `rgba(241,226,180,${(on ? 0.5 : 0.28) * tw})`);
      halo.addColorStop(0.4, `rgba(212,179,110,${(on ? 0.22 : 0.1) * tw})`);
      halo.addColorStop(1, 'rgba(212,179,110,0)');
      g.fillStyle = halo; g.beginPath(); g.arc(p.x, p.y, r, 0, 6.2832); g.fill();
    });

    if (visible && !document.hidden) raf = requestAnimationFrame(draw);
  };
  const run = () => { if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(draw); } };
  const io = new IntersectionObserver(entries => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); });
  io.observe(stage);
  document.addEventListener('visibilitychange', run, { signal });
  ctx.onCleanup(() => { io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf); });
}
