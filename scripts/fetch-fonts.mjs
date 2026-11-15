// 一次性工具：把站点原先从 Google Fonts 加载的字体切片原样下载到 public/fonts/，
// 并生成指向本地文件的 fonts.css。切片（unicode-range）与字形文件与原站完全一致。
// 用法：node scripts/fetch-fonts.mjs   （需要联网；产物已提交，日常构建无需运行）
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const CSS_URL = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Noto+Serif+SC:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const out = 'public/fonts';
fs.mkdirSync(out, { recursive: true });
let css = await (await fetch(CSS_URL, { headers: { 'user-agent': UA } })).text();
const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2/g))];
const names = new Map();
let bytes = 0;
for (const [i, url] of urls.entries()) {
  const family = url.split('/s/')[1].split('/')[0];
  const name = `${family}-${crypto.createHash('sha1').update(url).digest('hex').slice(0, 10)}.woff2`;
  names.set(url, name);
  const file = path.join(out, family, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  bytes += fs.statSync(file).size;
  if (i % 40 === 0) console.log(`${i + 1}/${urls.length}`);
}
for (const [url, name] of names) css = css.split(url).join(`${url.split('/s/')[1].split('/')[0]}/${name}`);
fs.writeFileSync(path.join(out, 'fonts.css'), `/* 自托管字体：由 scripts/fetch-fonts.mjs 从 Google Fonts 原样镜像，SIL Open Font License 1.1。 */\n${css}`);
console.log(`Saved ${urls.length} font files, ${(bytes / 1048576).toFixed(1)} MB.`);
