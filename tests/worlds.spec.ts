// 阶段 5：诸界观测「层积的六界」。测试环境用 ?gl= 强制档位。
import { expect, test, type Page } from '@playwright/test';

test.setTimeout(90_000);
let errors: string[] = [];
test.beforeEach(({ page }) => {
  errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/status=2152398850/.test(m.text())) errors.push(m.text()); /* Firefox：跳转时中止未下完的字体，不算错误 */ });
});
test.afterEach(() => expect(errors, errors.join('\n')).toEqual([]));

async function openDive(page: Page) {
  await page.goto('/?page=worlds&gl=lite');
  await page.locator('.worlds-dive').waitFor();
  await page.evaluate(() => document.querySelector('.worlds-dive')!.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await expect(page.locator('.worlds-dive')).toHaveAttribute('data-gl', 'on', { timeout: 45000 });
}
const scrollDive = (page: Page, at: number) => page.evaluate(at => {
  const s = document.querySelector('.worlds-dive') as HTMLElement;
  scrollTo({ top: s.getBoundingClientRect().top + scrollY + (s.offsetHeight - innerHeight) * at, behavior: 'instant' });
}, at);
const opacity = (page: Page, id: string) => page.locator(`.worlds-card[data-card="${id}"]`).evaluate(el => Number(getComputedStyle(el).opacity));

test('下潜就绪：插在页头与正文之间，说明卡对读屏隐藏，观测台面板照常可用', async ({ page }) => {
  await openDive(page);
  expect(await page.evaluate(() => document.querySelector('.page-hero')!.nextElementSibling!.className)).toBe('worlds-dive');
  await expect(page.locator('.worlds-dive-cards')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.worlds-card')).toHaveCount(6);
  await page.locator('[data-world="mirror"]').click();
  await expect(page.locator('#world-observation h3')).toHaveText('反射面后的无序之境');
});

test('滚到各层出现对应说明；往回滚说明也跟着回来', async ({ page }) => {
  await openDive(page);
  await scrollDive(page, 0.35);
  await expect.poll(() => opacity(page, 'matter')).toBeGreaterThan(0.9);
  await scrollDive(page, 0.47);
  await expect.poll(() => opacity(page, 'spirit')).toBeGreaterThan(0.9);
  await expect.poll(() => opacity(page, 'matter')).toBeLessThan(0.1);
  await scrollDive(page, 0.845);
  await expect.poll(() => opacity(page, 'dead')).toBeGreaterThan(0.9);
  await scrollDive(page, 0.07);
  await expect.poll(() => opacity(page, 'stars')).toBeGreaterThan(0.9);
});

test('「跳到观测台」越过下潜', async ({ page }) => {
  await openDive(page);
  await page.locator('.worlds-dive-skip').click();
  await expect.poll(() => page.locator('#world-observation').evaluate(el => el.getBoundingClientRect().top), { timeout: 8000 }).toBeLessThan(400);
});

test('离开诸界观测时下潜与画布一起移除', async ({ page }) => {
  await openDive(page);
  await page.locator('.header nav a', { hasText: '巫师日常' }).click();
  await expect(page).toHaveURL(/page=daily/);
  await expect(page.locator('.worlds-dive')).toHaveCount(0);
  await expect(page.locator('main canvas')).toHaveCount(0);
});

test('减弱动态时不插入下潜', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/?page=worlds');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#world-observation')).toBeVisible();
  await expect(page.locator('.worlds-dive')).toHaveCount(0);
  await context.close();
});

test('时间长河：衔接段不出现任何文字；直到亡者世界之后才揭晓名字', async ({ page }) => {
  await openDive(page);
  const visibleCards = () => page.locator('.worlds-card').evaluateAll(els => els.filter(e => Number(getComputedStyle(e).opacity) > 0.05).map(e => (e as HTMLElement).dataset.card));
  for (const at of [0.205, 0.705]) {
    await scrollDive(page, at);
    await expect.poll(visibleCards).toEqual([]);
  }
  for (const at of [0.07, 0.36, 0.57, 0.845]) {
    await scrollDive(page, at);
    await page.waitForTimeout(700);
    expect(await opacity(page, 'time'), `进度 ${at}`).toBeLessThan(0.05);
  }
  await scrollDive(page, 0.99);
  await expect.poll(() => opacity(page, 'time')).toBeGreaterThan(0.9);
  await expect(page.locator('.worlds-card[data-card="time"] .worlds-card-name')).toHaveText('时间长河');
});
