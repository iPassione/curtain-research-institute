// 全站唯一的 WebGL 画布与渲染循环。路由挂载场景时把画布移进宿主元素；卸载时移回隐藏区并停止循环，
// WebGL 上下文与已编译的着色器保留，回到首页时不必重新初始化。
// 循环只在：画布在视口内、标签页可见、场景已挂载 时运行。连续 2 秒低于 45 帧自动降一档（强制档位时除外）。
import { WebGLRenderer } from 'three';
import { forcedTier, initialTier, lowerTier, pixelRatio, type Tier } from './tier';

export interface GLScene {
  /** 尺寸或像素比变化。width/height 为 CSS 像素。 */
  resize(width: number, height: number, dpr: number): void;
  /** 每帧调用；dt 为秒，已限制在 0.1 秒以内。 */
  frame(dt: number, time: number): void;
  /** 档位变化（只会下降）。返回 false 表示该场景无法在新档位运行，舞台会隐藏画布。 */
  setTier(tier: Tier): boolean;
  dispose(): void;
}

class Stage {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: WebGLRenderer;
  tier: Tier;
  private scene: GLScene | null = null;
  private host: HTMLElement | null = null;
  private parking: HTMLElement;
  private raf = 0;
  private last = 0;
  private time = 0;
  private visible = true;
  private inView = false;
  private observer: IntersectionObserver;
  private resizeObserver: ResizeObserver;
  private slowSince = 0;
  private frames: number[] = [];
  private debug: HTMLElement | null = null;
  private onReady: (() => void) | null = null;
  private warmup = 0;
  /** 自适应分辨率：掉帧时先把画布分辨率降到 0.8、0.65 倍，仍不够再降档。 */
  private scale = 1;

  constructor() {
    this.tier = initialTier();
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'gl-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: this.tier === 'full', alpha: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.setClearColor(0x07110f, 1);
    this.parking = document.createElement('div');
    this.parking.hidden = true;
    document.body.append(this.parking);
    this.parking.append(this.canvas);

    // 同一批通知里可能有同一元素的多条记录（例如挂上时还不可见、紧接着滚进视口），以最后一条为准；
    // 只取第一条会让舞台一直以为画布不在视口里，循环永远不启动。
    this.observer = new IntersectionObserver(entries => {
      const mine = entries.filter(e => e.target === this.host);
      if (!mine.length) return;
      this.inView = mine[mine.length - 1].isIntersecting;
      this.schedule();
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    document.addEventListener('visibilitychange', () => { this.visible = !document.hidden; this.last = 0; this.schedule(); });
    this.canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.fail(); });

    // 自动化测试环境下暴露舞台，便于诊断（普通访客不会触发）
    if (navigator.webdriver) (window as unknown as { __curtainStage?: Stage }).__curtainStage = this;
    if (new URLSearchParams(location.search).get('debug') === 'gl') {
      this.debug = document.createElement('div');
      this.debug.className = 'gl-debug';
      document.body.append(this.debug);
    }
  }

  /** 把场景挂到宿主元素。onReady 在第一帧画完后调用（用于淡入画布、撤下占位图）。 */
  mount(host: HTMLElement, scene: GLScene, onReady?: () => void) {
    this.unmount();
    this.host = host;
    this.scene = scene;
    this.onReady = onReady || null;
    this.warmup = 0;
    host.append(this.canvas);
    this.observer.observe(host);
    this.resizeObserver.observe(host);
    this.resize();
    this.frames = [];
    this.slowSince = 0;
    this.schedule();
  }

  unmount() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.host) { this.observer.unobserve(this.host); this.resizeObserver.unobserve(this.host); }
    this.scene?.dispose();
    this.scene = null;
    this.host = null;
    this.parking.append(this.canvas);
    this.canvas.classList.remove('is-ready');
  }

  private resize() {
    if (!this.host || !this.scene) return;
    const w = this.host.clientWidth, h = this.host.clientHeight, dpr = pixelRatio(this.tier) * this.scale;
    if (!w || !h) return;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.scene.resize(w, h, dpr);
  }

  private schedule() {
    const run = !!this.scene && this.inView && this.visible;
    if (run && !this.raf) { this.last = 0; this.raf = requestAnimationFrame(this.tick); }
    if (!run && this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
  }

  private tick = (now: number) => {
    this.raf = 0;
    if (!this.scene) return;
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    this.time += dt;
    // 单帧出错时不让循环静默中断（那样画面会永远停在「加载中」）：记录错误并退回静态图。
    try { this.scene.frame(dt, this.time); }
    catch (error) { console.error('三维场景渲染出错，已退回静态版本。', error); this.fail(); return; }
    this.warmup = Math.min(this.warmup + 1, 1000); // 每帧都计数：自动降档要在预热 30 帧之后才判断
    if (this.onReady && this.warmup >= 2) { this.canvas.classList.add('is-ready'); this.onReady(); this.onReady = null; }
    this.monitor(dt * 1000, now);
    this.schedule();
  };

  private monitor(ms: number, now: number) {
    this.frames.push(ms);
    if (this.frames.length > 60) this.frames.shift();
    const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    if (this.debug) this.debug.textContent = `档位 ${this.tier} · ${Math.round(1000 / avg)} fps · dpr ${(pixelRatio(this.tier) * this.scale).toFixed(2)}`;
    if (forcedTier() || this.warmup < 30 || this.frames.length < 60) return;
    if (avg > 1000 / 45) {
      if (!this.slowSince) this.slowSince = now;
      else if (now - this.slowSince > 2000) this.downgrade();
    } else this.slowSince = 0;
  }

  private downgrade() {
    this.slowSince = 0;
    this.frames = [];
    if (this.tier === 'static') return;
    // 先降分辨率（画面几乎不变），仍然掉帧再降档；降档后分辨率恢复
    if (this.scale > 0.66) { this.scale = this.scale > 0.9 ? 0.8 : 0.65; this.resize(); return; }
    this.scale = 1;
    this.tier = lowerTier(this.tier);
    if (this.tier === 'static' || !this.scene?.setTier(this.tier)) { this.fail(); return; }
    this.resize();
  }

  /** 无法继续渲染：停止循环并隐藏画布，页面退回占位图。 */
  private fail() {
    const host = this.host;
    this.unmount();
    host?.closest('[data-gl]')?.setAttribute('data-gl', 'off');
  }
}

let stage: Stage | null = null;
export const getStage = () => (stage ||= new Stage());
export const currentTier = (): Tier => stage?.tier ?? initialTier();
