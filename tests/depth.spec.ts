// 阶段 6 补做：开放展室的深度视差（三维）。测试环境是软件渲染，用 ?gl=lite 强制启用。
import { expect, test } from '@playwright/test';

test.setTimeout(90_000);
let errors: string[] = [];
test.beforeEach(({ page }) => {
  errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/status=2152398850|WebGL: context lost/.test(m.text())) errors.push(m.text()); });
});
test.afterEach(() => expect(errors, errors.join('\n')).toEqual([]));

test('城市切片：三维接管街景，DOM 过渡层不载入；时间轴与地址照常', async ({ page }) => {
  await page.goto('/?page=street&time=morning&gl=lite');
  const wrap = page.locator('.street-scene-wrap');
  await wrap.scrollIntoViewIfNeeded();
  await expect(wrap).toHaveAttribute('data-gl', 'on', { timeout: 45000 });
  await expect(page.locator('.street-gl canvas.gl-canvas')).toHaveAttribute('aria-hidden', 'true');
  await page.locator('.street-dial input').hover();
  await page.waitForTimeout(500);
  await expect(page.locator('.street-blend img')).toHaveCount(0);
  await page.locator('.street-times [data-time="evening"]').click();
  await expect(page).toHaveURL(/time=evening/, { timeout: 8000 });
  // 编号按钮仍在画布之上，可以点
  await page.locator('.street-pin[data-place="bookshop"]').click();
  await expect(page).toHaveURL(/place=bookshop/);
});

test('造物陈列室：插画带视差，切到结构图版时三维隐藏，换展品后重新挂上', async ({ page }) => {
  await page.goto('/?page=exhibits&object=lamp&gl=lite');
  const frame = page.locator('.painted-object');
  await frame.scrollIntoViewIfNeeded();
  await expect(frame).toHaveAttribute('data-gl', 'on', { timeout: 45000 });
  await page.getByRole('button', { name: '结构图版' }).click();
  await expect(page.locator('.painted-portrait')).toHaveAttribute('src', /plates\/lamp\.svg$/);
  expect(await page.locator('.specimen-gl').evaluate(el => getComputedStyle(el).display)).toBe('none');
  await page.locator('.specimen-list [data-object="gate"]').click();
  await expect(page.locator('.painted-object')).toHaveAttribute('data-gl', 'on', { timeout: 45000 });
  expect(await page.locator('canvas.gl-canvas').count()).toBe(1);
});

test('减弱动态时不载入三维，保留 DOM 版', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const scripts: string[] = [];
  page.on('request', r => { if (r.resourceType() === 'script') scripts.push(r.url()); });
  await page.goto('http://127.0.0.1:4173/?page=street'); // ?gl= 强制档位时会忽略减弱动态（调试用），这里不带
  await page.waitForLoadState('networkidle');
  expect(scripts.filter(u => /depth-room|stage-/.test(u))).toEqual([]);
  await expect(page.locator('.street-scene-wrap')).not.toHaveAttribute('data-gl', /.*/);
  await context.close();
});
