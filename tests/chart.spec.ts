// 阶段 3：地理馆立体航海图。测试环境用 ?gl= 强制档位；画布只在进入视口后渲染，先滚到航海图。
import { expect, test, type Page } from '@playwright/test';

// 测试环境没有显卡加速（软件模拟 WebGL），三维页面就绪较慢，放宽单项时限。
test.setTimeout(90_000);

let errors: string[] = [];
test.beforeEach(({ page }) => {
  errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/status=2152398850|WebGL: context lost/.test(m.text())) errors.push(m.text()); /* Firefox 跳转时中止未下完的字体、WebKit 并行时丢失 WebGL 上下文（网站会退回静态版），都不算错误 */ });
});
test.afterEach(() => expect(errors, errors.join('\n')).toEqual([]));

async function openChart(page: Page, tier = 'lite') {
  await page.goto(`/?page=geography&gl=${tier}`);
  await page.locator('.nautical-left').waitFor();
  await page.evaluate(() => document.querySelector('.nautical-left')!.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await expect(page.locator('.nautical-stage')).toHaveAttribute('data-gl', 'on', { timeout: 45000 });
}

test('立体模式：画布就绪，五个大陆按钮移到叠层并落在画面内', async ({ page }) => {
  await openChart(page);
  await expect(page.locator('.chart-gl canvas')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.chart-overlay [data-chart-place]')).toHaveCount(5);
  await expect(page.locator('.chart-gl-note')).toBeVisible();
  const frame = await page.locator('.nautical-frame').boundingBox();
  for (let i = 0; i < 5; i++) {
    const b = await page.locator(`[data-chart-place="${i}"]`).boundingBox();
    expect(b, `大陆 ${i}`).not.toBeNull();
    expect(b!.x + b!.width / 2).toBeGreaterThan(frame!.x);
    expect(b!.x + b!.width / 2).toBeLessThan(frame!.x + frame!.width);
  }
});

test('旋转后按钮随图移动；点选飞近、文字联动；复位回到总览', async ({ page }) => {
  await openChart(page);
  await page.getByRole('button', { name: '复位朝北' }).click();
  await page.waitForTimeout(1500);
  const before = await page.locator('[data-chart-place="1"]').boundingBox();
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: '顺时针旋转15度' }).click();
  await expect(page.locator('.nautical-frame')).toHaveAttribute('data-angle', '90');
  await page.waitForTimeout(1500);
  const after = await page.locator('[data-chart-place="1"]').boundingBox();
  // 西北大陆顺时针转 90° 后到了东北方：向右移动
  expect(after!.x).toBeGreaterThan(before!.x + 100);
  await page.getByRole('button', { name: '复位朝北' }).click();
  const ne = page.locator('[data-chart-place="2"]');
  await ne.click();
  await expect(ne).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#continent-detail h3')).toHaveText('茨威尔格诺');
  // 飞近后东北大陆在画面中央附近
  const frame = await page.locator('.nautical-frame').boundingBox();
  await expect.poll(async () => { const b = await ne.boundingBox(); return Math.abs(b!.x + b!.width / 2 - (frame!.x + frame!.width / 2)); }, { timeout: 8000 }).toBeLessThan(40);
});

test('键盘：飞近后跑出画面的大陆仍能聚焦，聚焦时显示在画面边缘', async ({ page }) => {
  await openChart(page);
  await page.getByRole('button', { name: '复位朝北' }).click(); // 停止缓慢转动，按钮才稳定可点
  await page.locator('[data-chart-place="2"]').click();
  await page.waitForTimeout(2500);
  const sw = page.locator('[data-chart-place="3"]');
  await sw.focus();
  await expect(sw).toBeFocused();
  await expect.poll(() => sw.evaluate(el => getComputedStyle(el).opacity)).toBe('1'); // 有 0.25 秒的淡入过渡
  await page.keyboard.press('Enter');
  await expect(page.locator('#continent-detail h3')).toHaveText('埃斯佩兰萨');
});

test('减弱动态时保留原转盘，不载入三维代码', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const scripts: string[] = [];
  page.on('request', r => { if (r.resourceType() === 'script') scripts.push(r.url()); });
  await page.goto('http://127.0.0.1:4173/?page=geography');
  await page.locator('.nautical-left').scrollIntoViewIfNeeded();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.chart-gl')).toHaveCount(0);
  await expect(page.locator('.nautical-rotor [data-chart-place]')).toHaveCount(5);
  expect(scripts.filter(u => /chart-room-/.test(u))).toEqual([]);
  await context.close();
});

test('离开地理馆后按钮放回原处，画布移出页面', async ({ page }) => {
  await openChart(page);
  await page.locator('.header nav a', { hasText: '魔法' }).click();
  await expect(page).toHaveURL(/page=magic/);
  await expect(page.locator('main canvas')).toHaveCount(0);
  await page.goBack();
  await page.locator('.nautical-left').waitFor();
  await page.evaluate(() => document.querySelector('.nautical-left')!.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await expect(page.locator('.nautical-stage')).toHaveAttribute('data-gl', 'on', { timeout: 45000 });
  await expect(page.locator('.chart-overlay [data-chart-place]')).toHaveCount(5);
});

test('昼夜、缩放与界门往来：只在立体模式出现，抵达后带着行程去旅行案头', async ({ page }) => {
  await openChart(page);
  await expect(page.locator('.chart-extra')).toBeVisible();
  const hour = page.locator('#chart-hour');
  await hour.fill('6.5');
  await expect(page.locator('.chart-hour-label output')).toHaveText('06:30');
  await page.getByRole('button', { name: '日升日落' }).click();
  await expect(page.getByRole('button', { name: '停在此刻' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '停在此刻' }).click();
  await page.getByRole('button', { name: '放大' }).click();
  await page.getByRole('button', { name: '缩小' }).click();
  await page.locator('#route-from').selectOption('3');
  await page.locator('#route-to').selectOption('2');
  await page.getByRole('button', { name: '走一趟界门' }).click();
  await expect(page.locator('.route-status')).toHaveText('经界门从埃斯佩兰萨前往茨威尔格诺（示意）。');
  const link = page.locator('.route-travel');
  await expect(link).toBeVisible({ timeout: 6000 });
  await expect(link).toHaveAttribute('href', '?page=travel&from=esperanza&to=tsvergno&mode=gate');
  await page.locator('#route-to').selectOption('3');
  await page.getByRole('button', { name: '走一趟界门' }).click();
  await expect(page.locator('.route-status')).toContainText('同一块大陆');
});
