// 阶段 7：历史研究室「长卷」与人物档案馆「星座图」（2D 画布，不需要 WebGL）。
import { expect, test } from '@playwright/test';

let errors: string[] = [];
test.beforeEach(({ page }) => {
  errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
});
test.afterEach(() => expect(errors, errors.join('\n')).toEqual([]));

test('历史长卷：五个事件都是正常文字，纵向滚动带动画卷横移', async ({ page }) => {
  await page.goto('/?page=history');
  const scroll = page.locator('.history-scroll');
  await expect(scroll).toBeVisible();
  await expect(page.locator('.history-stop')).toHaveCount(5);
  await expect(page.locator('.history-stop').first()).toContainText('古老的盟约');
  await expect(page.locator('.history-stop').last()).toContainText('新的政治秩序');
  await expect(page.locator('.history-river')).toHaveAttribute('aria-hidden', 'true');
  const x = () => page.locator('.history-track').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m41);
  await scroll.evaluate(el => scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
  const start = await x();
  await scroll.evaluate(el => scrollTo({ top: el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight), behavior: 'instant' }));
  await expect.poll(x).toBeLessThan(start - 400);
  // 滚到末尾时，最后一个事件在画面中央附近
  await expect.poll(() => page.locator('.history-stop').last().evaluate(el => { const r = el.getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - innerWidth / 2); })).toBeLessThan(430);
});

test('人物星座图：画布对读屏隐藏，原按钮与说明照常', async ({ page }) => {
  await page.goto('/?page=people');
  await page.locator('.people-stage').scrollIntoViewIfNeeded();
  await expect(page.locator('.people-stage canvas.constellation')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.people-stage')).toHaveClass(/is-constellation/);
  await page.locator('[data-person="5"]').click();
  await expect(page.locator('[data-person="5"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.atlas-people .atlas-note h3')).toHaveText('塞浦路斯');
});

test('减弱动态时保留原时间轴与原关系图', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/?page=history');
  await expect(page.locator('.history-trail .timeline .event')).toHaveCount(5);
  await expect(page.locator('.history-scroll')).toHaveCount(0);
  await page.goto('http://127.0.0.1:4173/?page=people');
  await expect(page.locator('.people-stage > svg')).toBeVisible();
  await expect(page.locator('canvas.constellation')).toHaveCount(0);
  await context.close();
});

test('离开历史研究室时长卷还原', async ({ page }) => {
  await page.goto('/?page=history');
  await expect(page.locator('.history-scroll')).toBeVisible();
  await page.locator('.header nav a', { hasText: '魔法' }).click();
  await expect(page).toHaveURL(/page=magic/);
  await page.goBack();
  await expect(page.locator('.history-scroll')).toHaveCount(1);
  await expect(page.locator('.history-stop')).toHaveCount(5);
});
