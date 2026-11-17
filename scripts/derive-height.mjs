// 从航海图派生立体浮雕用的高度图（离线一次性运行，产物提交进仓库）：
//   node scripts/derive-height.mjs
// 方法：陆地画满山、树、城镇，纹理密；海面只有细航线，纹理稀。
//   1. 亮度 → 局部方差（盒式模糊近似高斯），阈值得到陆地遮罩；圆环边框与罗盘区域排除。
//   2. 遮罩闭运算（模糊后再取阈值）去掉海上的细线与小船造成的碎点。
//   3. 遮罩模糊成柔和的海岸坡度，乘以原图细节（山地纹理处更高）。
//   4. 输出 512×512 的 8 位灰度 PNG：黑为海面，白为最高处。
// 幅度在着色器里压得很低，只求「羊皮纸上隆起的浮雕」，不追求真实地形。
import fs from 'node:fs';
import sharp from 'sharp';

const SRC = 'assets-src/nautical-chart.png';
const OUT = 'assets-src/data/nautical-height.png';
const N = 1254;

const { data, info } = await sharp(SRC).resize(N, N).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const lum = new Float32Array(N * N);
for (let i = 0; i < N * N; i++) lum[i] = (0.299 * data[i * 3] + 0.587 * data[i * 3 + 1] + 0.114 * data[i * 3 + 2]) / 255;

/** 盒式模糊（积分图），三次叠加近似高斯。 */
function box(src, r) {
  const w = N, out = new Float32Array(w * w), I = new Float64Array((w + 1) * (w + 1));
  for (let y = 0; y < w; y++) { let row = 0; for (let x = 0; x < w; x++) { row += src[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row; } }
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(w, y + r + 1);
    const s = I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0];
    out[y * w + x] = s / ((x1 - x0) * (y1 - y0));
  }
  return out;
}
const blur = (src, r) => box(box(box(src, r), r), r);

// 1. 局部方差
const sq = lum.map(v => v * v);
const m = blur(lum, 4), m2 = blur(sq, 4);
const variance = new Float32Array(N * N);
for (let i = 0; i < N * N; i++) variance[i] = Math.max(0, m2[i] - m[i] * m[i]);
const vs = blur(variance, 6);

// 阈值取方差分布的分位数（陆地纹理密，海面纹理稀）
const inside = (x, y) => Math.hypot(x / N - 0.5, y / N - 0.5) < 0.432;
const rose = (x, y) => Math.hypot(x / N - 0.5, y / N - 0.152) < 0.085; // 罗盘
const sample = [];
for (let y = 0; y < N; y += 3) for (let x = 0; x < N; x += 3) if (inside(x, y) && !rose(x, y)) sample.push(vs[y * N + x]);
sample.sort((a, b) => a - b);
const threshold = sample[Math.floor(sample.length * 0.44)];

let mask = new Float32Array(N * N);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const i = y * N + x;
  mask[i] = inside(x, y) && !rose(x, y) && vs[i] > threshold ? 1 : 0;
}
// 2. 闭运算：先膨胀（模糊后低阈值）再腐蚀（模糊后高阈值）
mask = blur(mask, 7).map(v => (v > 0.25 ? 1 : 0));
mask = blur(mask, 7).map(v => (v > 0.6 ? 1 : 0));
// 去掉面积很小的岛屿碎点：再模糊一次，弱信号压掉
mask = blur(mask, 10).map(v => (v > 0.35 ? 1 : 0));
// 补洞：只有与外海连通的区域才算海（从图内圆周向里泛洪），被陆地围住的空洞补成陆地。
// 通向外海的海湾不受影响。
{
  const sea = new Uint8Array(N * N), stack = [];
  for (let a = 0; a < 3600; a++) {
    const x = Math.round(N / 2 + Math.cos(a / 3600 * Math.PI * 2) * N * 0.43), y = Math.round(N / 2 + Math.sin(a / 3600 * Math.PI * 2) * N * 0.43);
    const i = y * N + x;
    if (!mask[i] && !sea[i]) { sea[i] = 1; stack.push(i); }
  }
  while (stack.length) {
    const i = stack.pop(), x = i % N, y = (i - x) / N;
    for (const j of [i - 1, i + 1, i - N, i + N]) {
      const jx = j % N, jy = (j - jx) / N;
      if (j < 0 || j >= N * N || Math.abs(jx - x) > 1 || sea[j] || mask[j] || !inside(jx, jy)) continue;
      sea[j] = 1; stack.push(j);
    }
  }
  for (let i = 0; i < N * N; i++) { const x = i % N, y = (i - x) / N; if (!mask[i] && !sea[i] && inside(x, y) && !rose(x, y)) mask[i] = 1; }
}

// 3. 海岸坡度 × 山地细节
const slope = blur(mask, 16);
const detail = blur(variance, 2);
let dmax = 0;
for (let i = 0; i < N * N; i++) if (mask[i]) dmax = Math.max(dmax, detail[i]);
const height = new Uint8Array(N * N);
for (let i = 0; i < N * N; i++) {
  const d = Math.min(1, detail[i] / (dmax * 0.35));
  const h = slope[i] * (0.55 + 0.45 * d * slope[i]);
  height[i] = Math.round(Math.min(1, Math.max(0, h)) * 255);
}

fs.mkdirSync('assets-src/data', { recursive: true });
await sharp(height, { raw: { width: N, height: N, channels: 1 } }).resize(512, 512).blur(1.2).png({ compressionLevel: 9 }).toFile(OUT);
const land = mask.reduce((a, b) => a + b, 0) / (Math.PI * (0.432 * N) ** 2);
console.log(`高度图已写入 ${OUT}（${info.width}×${info.height} → 512×512），陆地约占图内 ${(land * 100).toFixed(0)}%。`);
