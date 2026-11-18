// 历史研究室「长卷」：把「沿时间，回到历史现场」的五个事件铺成一幅横向长卷，纵向滚动带动画卷向左移动。
// 时间长河作为底纹，从左向右流淌（只随真实时间流动，不随滚动方向倒流）；
// 事件所在处的光点散成一圈，事件移到画面中央时收束成一点并亮起。
// 只用时间轴里已有的五个事件，不补事件。事件文字是正常的页面内容（读屏可读）。
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { esc } from '../lib/html';
import type { RouteContext } from '../router';
import type { TimelineEvent } from '../data/types';

export function mountHistoryScroll(ctx: RouteContext, events: TimelineEvent[]) {
  const trail = ctx.main.querySelector<HTMLElement>('.history-trail');
  const grid = trail?.querySelector<HTMLElement>('.timeline');
  if (!trail || !grid || !events.length) return;
  gsap.registerPlugin(ScrollTrigger);
  const { signal } = ctx;

  const heading = trail.querySelector('.catalog-heading');
  const scroll = document.createElement('div');
  scroll.className = 'history-scroll';
  scroll.innerHTML = `<div class="history-sticky"><canvas class="history-river" aria-hidden="true"></canvas>
<ol class="history-track">${events.map((e, i) => `<li class="history-stop ${i % 2 ? 'is-low' : 'is-high'}"><time>${esc(e.year)}</time><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p></li>`).join('')}</ol>
<div class="history-progress" aria-hidden="true"><span></span></div></div>`;
  const sticky = scroll.querySelector<HTMLElement>('.history-sticky')!;
  if (heading) sticky.prepend(heading); // 标题随画卷一起停在画面上
  grid.replaceWith(scroll);
  trail.classList.add('is-scroll');
  ctx.onCleanup(() => { scroll.replaceWith(grid); if (heading) trail.prepend(heading); trail.classList.remove('is-scroll'); });

  const track = scroll.querySelector<HTMLElement>('.history-track')!;
  const stops = [...track.querySelectorAll<HTMLElement>('.history-stop')];
  const canvas = scroll.querySelector<HTMLCanvasElement>('.history-river')!;
  const g = canvas.getContext('2d')!;
  let width = 1, height = 1, dpr = 1, distance = 0;

  // 滚动长度 = 画卷超出画面的宽度：纵向滚动一像素，画卷横移一像素
  const layout = () => {
    width = sticky.clientWidth; height = sticky.clientHeight;
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    distance = Math.max(0, track.scrollWidth - width);
    scroll.style.height = `${height + distance}px`;
  };
  layout();

  const g2 = gsap.context(() => {
    gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: scroll, start: 'top top', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true } })
      .to(track, { x: () => -distance, duration: 1 }, 0)
      .fromTo(scroll.querySelector('.history-progress > span'), { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0);
  }, scroll);
  ctx.onCleanup(() => g2.revert());
  const ro = new ResizeObserver(() => { layout(); ScrollTrigger.refresh(); });
  ro.observe(sticky);
  ctx.onCleanup(() => ro.disconnect());

  // 时间长河：河道在画卷坐标里，随画卷移动；水流的纹路随时间从左向右走
  const riverY = (x: number) => height * 0.56 + Math.sin(x * 0.0042) * 22 + Math.sin(x * 0.011 + 1.7) * 8;
  let raf = 0, last = 0, time = 0, visible = false;
  const seeds = Array.from({ length: 30 }, (_, i) => ({ a: (i * 2.399) % 6.2832, r: 0.4 + ((i * 0.618) % 1) * 0.6, s: 0.5 + ((i * 0.37) % 1) }));
  const draw = (now: number) => {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now; time += dt;
    const tx = Number(gsap.getProperty(track, 'x')) || 0;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, width, height);
    const total = track.scrollWidth;
    // 河身：一条淡墨绿的宽带与一条铜金细线
    g.beginPath();
    for (let x = -20; x <= width + 20; x += 8) { const y = riverY(x - tx); x === -20 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.strokeStyle = 'rgba(32,60,53,0.07)'; g.lineWidth = 26; g.stroke();
    g.strokeStyle = 'rgba(173,141,82,0.55)'; g.lineWidth = 1.2; g.stroke();
    // 水流：一段段短笔触沿河从左向右移动
    for (let k = 0; k < Math.ceil(total / 70); k++) {
      const base = ((k * 70 + time * 48) % total);
      const sx = base + tx;
      if (sx < -60 || sx > width + 60) continue;
      const len = 26 + (k % 5) * 6, off = ((k * 7) % 5 - 2) * 3;
      g.beginPath();
      for (let s = 0; s <= len; s += 4) { const x = sx + s; const y = riverY(x - tx) + off; s ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.strokeStyle = `rgba(173,141,82,${0.18 + 0.22 * ((k * 0.37) % 1)})`; g.lineWidth = 1; g.stroke();
    }
    // 事件光点：离画面中央越远越散，到中央时收束成一点并亮起；事件文字随之变清楚
    stops.forEach((stop, i) => {
      const cx = stop.offsetLeft + stop.offsetWidth / 2 + tx;
      const d = Math.min(1, Math.abs(cx - width / 2) / (width * 0.45));
      stop.style.setProperty('--focus', (1 - d).toFixed(3));
      if (cx < -120 || cx > width + 120) return;
      const cy = riverY(cx - tx);
      for (const s of seeds) {
        const a = s.a + time * 0.4 * s.s + i;
        const r = 4 + 64 * d * s.r;
        g.fillStyle = `rgba(173,141,82,${0.25 + 0.45 * (1 - d)})`;
        g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.55, 1.4, 0, 6.2832); g.fill();
      }
      const halo = g.createRadialGradient(cx, cy, 0, cx, cy, 30);
      halo.addColorStop(0, `rgba(212,179,110,${0.25 + 0.6 * (1 - d)})`); halo.addColorStop(1, 'rgba(212,179,110,0)');
      g.fillStyle = halo; g.beginPath(); g.arc(cx, cy, 30, 0, 6.2832); g.fill();
      g.fillStyle = '#8a6a32'; g.beginPath(); g.arc(cx, cy, 3.2 + 2 * (1 - d), 0, 6.2832); g.fill();
    });
    if (visible && !document.hidden) raf = requestAnimationFrame(draw);
  };
  const run = () => { if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(draw); } };
  const io = new IntersectionObserver(entries => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); });
  io.observe(sticky);
  document.addEventListener('visibilitychange', run, { signal });
  ctx.onCleanup(() => { io.disconnect(); cancelAnimationFrame(raf); });
}
