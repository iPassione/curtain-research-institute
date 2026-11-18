import { defineConfig, devices } from '@playwright/test';

// 冒烟测试针对构建产物 dist/：先 npm run build，再 npm test。
export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.ts$/,
  timeout: 30_000,
  workers: 4,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173', locale: 'zh-CN', acceptDownloads: true },
  projects: [
    { name: 'chromium', testIgnore: /(chart|journey|casting|worlds|depth)\.spec\.ts$/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // 三维场景的测试（首页、航海图、施法台、诸界）：测试环境没有显卡加速，WebGL 由 CPU 模拟，
    // 会拖慢同时运行的其他测试。所以放在其余测试之后，三组依次单独运行，并用较小的视口降低模拟渲染的开销。
    { name: 'gl-journey', testMatch: /journey\.spec\.ts$/, dependencies: ['chromium'], use: { ...devices['Desktop Chrome'], viewport: { width: 1100, height: 720 } } },
    { name: 'gl-chart', testMatch: /chart\.spec\.ts$/, dependencies: ['gl-journey'], use: { ...devices['Desktop Chrome'], viewport: { width: 1100, height: 720 } } },
    { name: 'gl-casting', testMatch: /casting\.spec\.ts$/, dependencies: ['gl-chart'], use: { ...devices['Desktop Chrome'], viewport: { width: 1100, height: 720 } } },
    { name: 'gl-worlds', testMatch: /worlds\.spec\.ts$/, dependencies: ['gl-casting'], use: { ...devices['Desktop Chrome'], viewport: { width: 1100, height: 720 } } },
    { name: 'gl-depth', testMatch: /depth\.spec\.ts$/, dependencies: ['gl-worlds'], use: { ...devices['Desktop Chrome'], viewport: { width: 1100, height: 720 } } },
    // 跨浏览器（阶段 8）：只在 CROSS=1 时加入，普通页面的测试在 Firefox 与 WebKit（Safari 内核）上各跑一遍。
    // 这两个浏览器在测试环境里没有硬件加速，三维场景按设计降到静态版本，所以三维测试不在这里跑。
    ...(process.env.CROSS ? [
      { name: 'firefox', testIgnore: /(chart|journey|casting|worlds|depth)\.spec\.ts$/, use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
      { name: 'webkit', testIgnore: /(chart|journey|casting|worlds|depth)\.spec\.ts$/, use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
    ] : []),
  ],
  webServer: { command: 'node scripts/serve.mjs dist 4173', url: 'http://127.0.0.1:4173/', reuseExistingServer: false },
});
