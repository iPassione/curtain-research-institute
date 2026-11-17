// 图像管线：assets-src/ 的原始 PNG/WebP → public/assets/ 的 AVIF 与 WebP 多尺寸版本。
// SVG 图版原样复制。产物按「名称-宽度.格式」命名；源文件未变化时跳过，加 --force 全部重做。
// node scripts/build-images.mjs [--force]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const src = 'assets-src';
const out = 'public/assets';
const force = process.argv.includes('--force');
// 每张图输出的宽度（不超过原图宽度；原图宽度总会包含在内）。
const widths = [800];
const AVIF = { quality: 60, effort: 6, chromaSubsampling: '4:4:4' };
const WEBP = { quality: 82, effort: 6, smartSubsample: true };

const files = [];
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).forEach(d => {
  const p = path.join(dir, d.name);
  if (d.isDirectory()) walk(p); else files.push(p);
});
walk(src);

const manifest = {};
let made = 0, skipped = 0;
for (const file of files) {
  const rel = path.relative(src, file).split(path.sep).join('/');
  const ext = path.extname(rel).toLowerCase();
  // data/ 下是供着色器读取的数据图（如航海图高度图），原样复制，不做有损压缩。
  if (ext === '.svg' || rel.startsWith('data/')) {
    const target = path.join(out, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(file, target);
    continue;
  }
  if (!['.png', '.webp', '.jpg'].includes(ext)) continue; // 生成提示等说明文件不进入站点
  const base = rel.slice(0, -ext.length);
  const meta = await sharp(file).metadata();
  const sizes = [...new Set([...widths.filter(w => w < meta.width), meta.width])];
  manifest[base] = { width: meta.width, height: meta.height, sizes };
  const mtime = fs.statSync(file).mtimeMs;
  for (const w of sizes) for (const [format, options] of [['avif', AVIF], ['webp', WEBP]]) {
    const target = path.join(out, `${base}-${w}.${format}`);
    if (!force && fs.existsSync(target) && fs.statSync(target).mtimeMs >= mtime) { skipped++; continue; }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    // 原图本就是 WebP 时，原尺寸的 WebP 直接复制，避免二次有损压缩。
    if (format === 'webp' && ext === '.webp' && w === meta.width) fs.copyFileSync(file, target);
    else await sharp(file).resize({ width: w, withoutEnlargement: true })[format](options).toFile(target);
    made++;
  }
}
fs.writeFileSync(path.join(out, 'images.json'), JSON.stringify(manifest, null, 1));
console.log(`Images: ${made} generated, ${skipped} up to date, ${Object.keys(manifest).length} sources.`);
