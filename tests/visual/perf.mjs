// 性能复测：node tests/visual/perf.mjs <站点地址>
// 用 Chromium 的网络模拟（约 10 Mbps 下行、40 ms 往返，「普通宽带」）冷启动打开各页，
// 记录最大内容绘制（LCP）、累计布局偏移（CLS）、脚本传输量（压缩后）与是否载入三维代码。
import { chromium } from '@playwright/test';
const [base = 'http://127.0.0.1:4180'] = process.argv.slice(2);
const pages = ['/?article=worlds-dead', '/?article=history-discrete-full', '/', '/?page=library', '/?page=geography', '/?page=worlds', '/?page=street', '/?page=exhibits'];
const b = await chromium.launch();
const rows = [];
for (const url of pages) for (const [label, w, h, mobile] of [['桌面', 1440, 900, false], ['手机', 390, 844, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 10e6 / 8, uploadThroughput: 5e6 / 8 });
  const js = new Map();
  cdp.on('Network.responseReceived', e => { if (e.type === 'Script') js.set(e.requestId, e.response.url); });
  let jsBytes = 0; const jsFiles = [];
  cdp.on('Network.loadingFinished', e => { if (js.has(e.requestId)) { jsBytes += e.encodedDataLength; jsFiles.push(js.get(e.requestId).split('/').pop()); } });
  await p.addInitScript(() => {
    window.__lcp = 0; window.__cls = 0;
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  await p.goto(base + url, { waitUntil: 'load' });
  await p.waitForTimeout(4000);
  const [lcp, cls] = await p.evaluate(() => [window.__lcp, window.__cls]);
  rows.push({ 页面: url, 设备: label, LCP: Math.round(lcp) + ' ms', CLS: cls.toFixed(3), 脚本: (jsBytes / 1024).toFixed(0) + ' KB', 三维: jsFiles.some(f => /^(stage|OutputPass|UnrealBloomPass|journey|chart-room|casting-room|worlds-room)-/.test(f)) ? '是' : '否' });
  await ctx.close();
}
console.table(rows);
await b.close();
