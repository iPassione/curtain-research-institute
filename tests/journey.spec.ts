// 阶段 2：首页「穿过帷幕」。测试环境的 Chromium 用软件 WebGL2，帧率很低，所以一律用 ?gl= 强制档位（强制时不自动降档）。
import { expect, test } from '@playwright/test';

// 测试环境没有显卡加速（软件模拟 WebGL），三维页面就绪较慢，放宽单项时限。
test.setTimeout(90_000);

let errors: string[] = [];
test.beforeEach(({ page }) => {
  errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
});
test.afterEach(() => expect(errors, errors.join('\n')).toEqual([]));

const scrollJourney = (page: import('@playwright/test').Page, at: number) =>
  page.evaluate(at => { const j = document.querySelector('[data-journey]') as HTMLElement; scrollTo({ top: (j.offsetHeight - innerHeight) * at, behavior: 'instant' }); }, at);

test('支持 WebGL2 时启用场景：画布就绪、对读屏隐藏，文字都在 DOM 中', async ({ page }) => {
  await page.goto('/?gl=lite');
  const journey = page.locator('[data-journey]');
  await expect(journey).toHaveAttribute('data-gl', 'on', { timeout: 45000 });
  await expect(page.locator('.journey-gl canvas.gl-canvas')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('h1')).toContainText('世界藏在');
  await expect(page.locator('.journey-act-2')).toContainText('公元 1077 年');
  await expect(page.locator('.hero-actions .action')).toBeVisible();
});

test('减弱动态与 ?gl=static：保留原首页主视觉，不载入三维代码', async ({ browser }) => {
  for (const [opts, url] of [[{ reducedMotion: 'reduce' as const }, '/'], [{}, '/?gl=static']] as const) {
    const context = await browser.newContext(opts);
    const page = await context.newPage();
    const scripts: string[] = [];
    page.on('request', r => { if (r.resourceType() === 'script') scripts.push(r.url()); });
    await page.goto('http://127.0.0.1:4173' + url);
    await expect(page.locator('section.hero .hero-description')).toContainText('公元 1077 年');
    await expect(page.locator('[data-journey]')).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    expect(scripts.filter(u => /journey-/.test(u)), url).toEqual([]);
    await context.close();
  }
});

test('任意滚动位置刷新，文字状态与位置一致', async ({ page }) => {
  await page.goto('/?gl=lite');
  await expect(page.locator('[data-journey]')).toHaveAttribute('data-gl', 'on', { timeout: 45000 });
  await expect(page.locator('.journey-stage > .hero-copy')).toBeVisible();
  await scrollJourney(page, 0.33);
  await page.reload();
  await expect(page.locator('[data-journey]')).toHaveCount(1);
  await scrollJourney(page, 0.33);
  await expect.poll(() => page.locator('.journey-line').first().evaluate(el => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.95);
  await expect(page.locator('.journey-stage > .hero-copy')).toBeHidden();
  await scrollJourney(page, 0);
  await expect(page.locator('.journey-stage > .hero-copy')).toBeVisible();
  await expect.poll(() => page.locator('.journey-line').first().evaluate(el => Number(getComputedStyle(el).opacity))).toBeLessThan(0.05);
});

test('离开首页时画布停用并移出页面，回来后复用', async ({ page }) => {
  await page.goto('/?gl=lite');
  await expect(page.locator('[data-journey]')).toHaveAttribute('data-gl', 'on', { timeout: 45000 });
  await page.locator('.header nav a', { hasText: '阅览室' }).click();
  await expect(page).toHaveURL(/page=library/);
  await expect(page.locator('main canvas')).toHaveCount(0);
  expect(await page.locator('canvas.gl-canvas').count()).toBe(1);
  expect(await page.locator('canvas.gl-canvas').evaluate(c => !!c.closest('[hidden]'))).toBe(true);
  await page.goBack();
  await expect(page.locator('[data-journey]')).toHaveAttribute('data-gl', 'on', { timeout: 45000 });
  expect(await page.locator('canvas.gl-canvas').count()).toBe(1);
});

test('「走进研究所」越过场景，直达馆藏入口', async ({ page }) => {
  await page.goto('/?gl=lite');
  await page.locator('.hero-actions .action').click();
  // 落点与原首页一致：原站点击后馆藏入口停在距页顶约 100px 处（全站的滚动留白）。
  await expect.poll(() => page.locator('#explore').evaluate(el => el.getBoundingClientRect().top), { timeout: 8000 }).toBeLessThan(110);
  expect(await page.locator('#explore').evaluate(el => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
});

test('文章页不载入三维代码；?debug=gl 显示帧率与档位', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', r => { if (r.resourceType() === 'script') scripts.push(r.url()); });
  await page.goto('/?article=origin');
  await page.waitForLoadState('networkidle');
  expect(scripts.filter(u => /journey-/.test(u))).toEqual([]);
  await page.goto('/?gl=lite&debug=gl');
  await expect(page.locator('.gl-debug')).toContainText('档位 lite', { timeout: 20000 });
});

test('第四幕：标题与五大陆地名出现在航海图上，结尾画面暗下交给馆藏入口', async ({ page }) => {
  await page.goto('/?gl=lite');
  await expect(page.locator('[data-journey]')).toHaveAttribute('data-gl', 'on', { timeout: 45000 });
  await expect(page.locator('.journey-place')).toHaveCount(5);
  await expect(page.locator('.journey-places')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.journey-act-4')).toHaveAttribute('aria-hidden', 'true');
  await scrollJourney(page, 0.88);
  await expect.poll(() => page.locator('.journey-title').evaluate(el => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.95);
  // 地名的位置由场景逐帧投影：五个都落在视口里，且彼此分开。
  await expect.poll(() => page.locator('.journey-place').first().evaluate(el => Number(el.style.opacity || 0)), { timeout: 15000 }).toBeGreaterThan(0.5);
  // 镜头跟随滚动带滑行，等它停稳：五个地名都落在视口里
  const vp = page.viewportSize()!;
  const read = () => page.locator('.journey-place').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
  await expect.poll(async () => (await read()).every(b => b.x > 0 && b.x < vp.width && b.y > 0 && b.y < vp.height), { timeout: 15000 }).toBe(true);
  const boxes = await read();
  const [center, nw, ne, sw, se] = boxes;
  expect(nw.x).toBeLessThan(center.x); expect(nw.y).toBeLessThan(center.y);
  expect(ne.x).toBeGreaterThan(center.x); expect(ne.y).toBeLessThan(center.y);
  expect(sw.x).toBeLessThan(center.x); expect(sw.y).toBeGreaterThan(center.y);
  expect(se.x).toBeGreaterThan(center.x); expect(se.y).toBeGreaterThan(center.y);
  await scrollJourney(page, 1);
  await expect.poll(() => page.locator('.journey-gl').evaluate(el => Number(getComputedStyle(el).opacity))).toBeLessThan(0.05);
});
