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
    { name: 'chromium', testIgnore: /(chart|journey)\.spec\.ts$/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // 三维场景的测试：测试环境没有显卡加速，WebGL 由 CPU 模拟，会拖慢同时运行的其他测试。
    // 所以放在其余测试之后单独运行，并用较小的视口降低模拟渲染的开销。
    { name: 'gl', testMatch: /(chart|journey)\.spec\.ts$/, dependencies: ['chromium'], use: { ...devices['Desktop Chrome'], viewport: { width: 1100, height: 720 } } },
  ],
  webServer: { command: 'node scripts/serve.mjs dist 4173', url: 'http://127.0.0.1:4173/', reuseExistingServer: false },
});
