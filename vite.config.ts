import { defineConfig } from 'vite';

// 产物仍输出到 dist/（Sites 读取的静态目录）。base 用相对路径，站点放在任何子路径下都能打开。
export default defineConfig({
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'build',
    target: 'es2020',
    modulePreload: { polyfill: false },
  },
  server: { port: 5173, host: '127.0.0.1' },
});
