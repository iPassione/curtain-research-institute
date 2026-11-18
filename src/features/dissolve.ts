// 造物陈列室「藏品插画 ↔ 结构图版」的噪声溶解转场（阶段 6，FRONTEND-V3 第 3.7 节）。
// 先把旧图（连同它的底色）画进一张盖在上面的画布，再换底下的图；新图解码后，旧图按一张低分辨率的分形噪声逐片溶掉，
// 溶解的边缘烧出一圈细细的铜金色，像纸页在灯下翻过去。约 0.9 秒。
// 画布只在转场期间存在，结束后移除；减弱动态效果时直接换图。
const N_W = 96, N_H = 120;
let field: Float32Array | null = null;

/** 一张固定的分形噪声（值域约 0–1），所有转场共用。 */
function noiseField() {
  if (field) return field;
  const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const smooth = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  field = new Float32Array(N_W * N_H);
  let lo = 1, hi = 0;
  for (let y = 0; y < N_H; y++) for (let x = 0; x < N_W; x++) {
    let s = 0, a = 0.5, f = 1 / 14;
    for (let o = 0; o < 4; o++) { s += a * smooth(x * f + o * 17, y * f + o * 31); a *= 0.5; f *= 2; }
    field[y * N_W + x] = s; lo = Math.min(lo, s); hi = Math.max(hi, s);
  }
  for (let i = 0; i < field.length; i++) field[i] = (field[i] - lo) / (hi - lo);
  return field;
}

/** 画出 object-fit: contain 的位置。 */
function containRect(img: HTMLImageElement, w: number, h: number) {
  const iw = img.naturalWidth || w, ih = img.naturalHeight || h, k = Math.min(w / iw, h / ih);
  return [(w - iw * k) / 2, (h - ih * k) / 2, iw * k, ih * k] as const;
}

export async function dissolveSwap(host: HTMLElement, img: HTMLImageElement, swap: () => void) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const w = img.clientWidth, h = img.clientHeight;
  if (reduced || !w || !h || !img.complete || !img.naturalWidth) { swap(); return; }
  const frame = img.closest('.painted-object') as HTMLElement | null;
  if (!frame) { swap(); return; }
  frame.querySelectorAll('.dissolve-canvas').forEach(c => c.remove()); // 连点时丢掉上一张

  const dpr = Math.min(2, devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.className = 'dissolve-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const old = document.createElement('canvas'); old.width = canvas.width; old.height = canvas.height;
  const og = old.getContext('2d')!;
  const bg = getComputedStyle(host).backgroundColor;
  if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) { og.fillStyle = bg; og.fillRect(0, 0, old.width, old.height); }
  try { const [x, y, cw, ch] = containRect(img, w, h); og.drawImage(img, x * dpr, y * dpr, cw * dpr, ch * dpr); } catch { swap(); return; }
  const g = canvas.getContext('2d')!;
  g.drawImage(old, 0, 0);
  frame.append(canvas);

  swap();
  await img.decode().catch(() => undefined);
  if (!canvas.isConnected) return;

  const n = noiseField();
  const mask = document.createElement('canvas'); mask.width = N_W; mask.height = N_H;
  const mg = mask.getContext('2d')!, md = mg.createImageData(N_W, N_H);
  const ember = document.createElement('canvas'); ember.width = N_W; ember.height = N_H;
  const eg = ember.getContext('2d')!, ed = eg.createImageData(N_W, N_H);
  const DUR = 900, t0 = performance.now();
  const step = (now: number) => {
    if (!canvas.isConnected) return;
    const k = Math.min(1, (now - t0) / DUR), t = -0.08 + 1.16 * (k * k * (3 - 2 * k)); // 溶解阈值
    for (let i = 0; i < n.length; i++) {
      const d = n[i] - t;                                   // >0：旧图还在
      md.data[i * 4 + 3] = Math.round(255 * Math.max(0, Math.min(1, d / 0.05)));
      const e = Math.max(0, 1 - Math.abs(d) / 0.045);       // 边缘的一圈
      ed.data[i * 4] = 214; ed.data[i * 4 + 1] = 168; ed.data[i * 4 + 2] = 92; ed.data[i * 4 + 3] = Math.round(220 * e * e);
    }
    mg.putImageData(md, 0, 0); eg.putImageData(ed, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(old, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.imageSmoothingEnabled = true;
    g.drawImage(mask, 0, 0, canvas.width, canvas.height);
    g.globalCompositeOperation = 'source-over';
    g.drawImage(ember, 0, 0, canvas.width, canvas.height);
    if (k < 1) requestAnimationFrame(step); else canvas.remove();
  };
  requestAnimationFrame(step);
}
