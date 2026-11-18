// 从城市切片的入夜图派生「灯光遮罩」（离线一次性运行，产物提交进仓库）：
//   node scripts/derive-lights.mjs
// 三张街景构图对齐。入夜图里亮着灯的地方（窗户、街灯、被灯照亮的石板路）同时满足：
//   亮、偏暖，且比午后图同一处还亮（午后图整体更亮，所以乘 0.75 再比）。
// 三个条件相乘、轻微模糊，写进 PNG 的透明度通道（颜色为黑），供 CSS mask-image 直接使用。
// 输出 561×701（原图一半），遮罩本身是柔和的，不需要原尺寸。
import sharp from 'sharp';

const W = 1122, H = 1402;
const read = async f => (await sharp(f).resize(W, H).removeAlpha().raw().toBuffer());
const ev = await read('assets-src/street/prunoiva-evening.png');
const no = await read('assets-src/street/prunoiva-noon.png');
const clamp = v => Math.max(0, Math.min(1, v));
const alpha = Buffer.alloc(W * H);
for (let i = 0; i < W * H; i++) {
  const r = ev[i * 3] / 255, g = ev[i * 3 + 1] / 255, b = ev[i * 3 + 2] / 255;
  const le = 0.3 * r + 0.59 * g + 0.11 * b;
  const ln = (0.3 * no[i * 3] + 0.59 * no[i * 3 + 1] + 0.11 * no[i * 3 + 2]) / 255;
  alpha[i] = Math.round(255 * clamp((le - 0.45) * 4) * clamp((r - b) * 4) * clamp((le - ln * 0.75) * 5));
}
const blurred = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } }).blur(1.5).resize(W / 2, H / 2).raw().toBuffer();
const rgba = Buffer.alloc((W / 2) * (H / 2) * 4);
for (let i = 0; i < blurred.length; i++) rgba[i * 4 + 3] = blurred[i];
await sharp(rgba, { raw: { width: W / 2, height: H / 2, channels: 4 } }).png({ compressionLevel: 9 }).toFile('assets-src/data/street-lights.png');
console.log('assets-src/data/street-lights.png');
