// 极简静态服务：node scripts/serve.mjs [目录=dist] [端口=8765]
// 仅用于本地预览与测试，绑定 127.0.0.1。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(process.argv[2] || 'dist');
const port = Number(process.argv[3] || process.env.PORT || 8765);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.ico': 'image/x-icon'
};
const compressible = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.md']);

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found'); return; }
  const ext = path.extname(file).toLowerCase();
  const headers = { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': 'no-cache' };
  let body = fs.readFileSync(file);
  if (compressible.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    body = zlib.gzipSync(body, { level: 9 });
    headers['content-encoding'] = 'gzip';
  }
  headers['content-length'] = body.length;
  res.writeHead(200, headers).end(req.method === 'HEAD' ? undefined : body);
}).listen(port, '127.0.0.1', () => console.log(`Serving ${root} at http://127.0.0.1:${port}/`));
