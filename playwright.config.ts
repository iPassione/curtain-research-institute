import { defineConfig, devices } from '@playwright/test';

// 冒烟测试针对构建产物 dist/：先 npm run build，再 npm test。
export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.ts$/,
  timeout: 30_000,
  workers: 4,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173', locale: 'zh-CN', acceptDownloads: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: { command: 'node scripts/serve.mjs dist 4173', url: 'http://127.0.0.1:4173/', reuseExistingServer: false },
});
