// 阶段 4：魔法研究室「施法台」。测试环境用 ?gl= 强制档位；画布只在进入视口后渲染。
import { expect, test, type Page } from '@playwright/test';

test.setTimeout(90_000);
let errors: string[] = [];
test.beforeEach(({ page }) => {
  errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
});
test.afterEach(() => expect(errors, errors.join('\n')).toEqual([]));

async function openTable(page: Page) {
  await page.goto('/?page=magic&gl=lite');
  await page.locator('.casting-stage').waitFor();
  await page.evaluate(() => document.querySelector('.casting-stage')!.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect(page.locator('.casting-stage')).toHaveAttribute('data-gl', 'on', { timeout: 45000 });
}
const pressed = (page: Page) => page.locator('.phase-controls [data-step][aria-pressed="true"]');

test('施法台就绪：原图解隐藏，结构选择与「按住施法」可用', async ({ page }) => {
  await openTable(page);
  await expect(page.locator('.casting-gl canvas')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.casting-stage > svg')).toBeHidden();
  await expect(page.locator('.casting-elements [data-element]')).toHaveCount(3);
  await page.locator('[data-element="1"]').click();
  await expect(page.locator('[data-element="1"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-element="0"]')).toHaveAttribute('aria-pressed', 'false');
});

test('键盘按住空格：阶段按钮与说明依次走过起势、塑形、稳定；松手导出', async ({ page }) => {
  await openTable(page);
  const hold = page.locator('.casting-hold');
  await hold.focus();
  await page.keyboard.down('Space');
  await expect(pressed(page)).toHaveAttribute('data-step', '0');
  await expect(pressed(page)).toHaveAttribute('data-step', '1', { timeout: 10000 });
  await expect(pressed(page)).toHaveAttribute('data-step', '2', { timeout: 10000 });
  await expect(page.locator('.casting-status')).toHaveText('结构已稳定，松手导出。', { timeout: 15000 });
  await expect(hold).toHaveText('松手导出 ↗');
  await expect(page.locator('.casting-spell span.on')).toHaveCount(await page.locator('.casting-spell span').count());
  await page.keyboard.up('Space');
  await expect(pressed(page)).toHaveAttribute('data-step', '3');
  await expect(page.locator('#main .atlas-note h3')).toHaveText('导出');
  await expect(page.locator('.casting-status')).toHaveText('火焰已导出。');
});

test('提前松手：结构散去，回到起势', async ({ page }) => {
  await openTable(page);
  const hold = page.locator('.casting-hold');
  await hold.focus();
  await page.keyboard.down('Enter');
  await expect(pressed(page)).toHaveAttribute('data-step', '1', { timeout: 10000 });
  await page.keyboard.up('Enter');
  await expect(page.locator('.casting-status')).toHaveText('结构未稳，力量散去。');
  await expect(pressed(page)).toHaveAttribute('data-step', '0');
  await expect(hold).toHaveText('按住施法');
});

test('阶段按钮与「演示一次」仍按原样工作', async ({ page }) => {
  await openTable(page);
  await page.locator('[data-step="2"]').click();
  await expect(page.locator('#main .atlas-note h3')).toHaveText('稳定');
  await page.locator('.cast-replay').click();
  await expect(page.locator('.cast-replay')).toHaveText('重新演示 ↻');
  await expect(pressed(page)).toHaveAttribute('data-step', '1', { timeout: 5000 });
});

test('减弱动态时保留原图解，不载入施法台代码', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const scripts: string[] = [];
  page.on('request', r => { if (r.resourceType() === 'script') scripts.push(r.url()); });
  await page.goto('http://127.0.0.1:4173/?page=magic');
  await page.locator('.casting-stage').scrollIntoViewIfNeeded();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.casting-gl')).toHaveCount(0);
  await expect(page.locator('.casting-stage > svg')).toBeVisible();
  expect(scripts.filter(u => /casting-room-/.test(u))).toEqual([]);
  await context.close();
});

test('导出后不倒放：效果演完即回到「按住施法」，可以直接开始下一次', async ({ page }) => {
  await openTable(page);
  await page.locator('[data-element="1"]').click();
  const hold = page.locator('.casting-hold');
  await hold.focus();
  await page.keyboard.down('Space');
  await expect(page.locator('.casting-status')).toHaveText('结构已稳定，松手导出。', { timeout: 15000 });
  await page.keyboard.up('Space');
  await expect(page.locator('.casting-status')).toHaveText('冰霜已导出。');
  // 冰霜效果约 3.3 秒，演完后状态清空、按钮复原
  await expect(page.locator('.casting-status')).toHaveText('', { timeout: 8000 });
  await expect(hold).toHaveText('按住施法');
  await page.keyboard.down('Space');
  await expect(pressed(page)).toHaveAttribute('data-step', '0');
  await expect(hold).toHaveText('继续按住…');
  await page.keyboard.up('Space');
});
