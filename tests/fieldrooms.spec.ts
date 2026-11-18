// 阶段 6：开放展室（城市切片时间轴与灯光、展品溶解转场、旅行案头航线小图与行装卡片）。
import { expect, test } from '@playwright/test';

let errors: string[] = [];
test.beforeEach(({ page }) => {
  errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/status=2152398850/.test(m.text())) errors.push(m.text()); /* Firefox：跳转时中止未下完的字体，不算错误 */ });
});
test.afterEach(() => expect(errors, errors.join('\n')).toEqual([]));

const setDial = (page: import('@playwright/test').Page, v: number) =>
  page.locator('.street-dial input').evaluate((el: HTMLInputElement, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, v);

test('城市切片：拖动时间轴连续过渡，越过中点时文字与地址跟着切换，入夜亮灯', async ({ page }) => {
  await page.goto('/?page=street&place=bakery&time=morning');
  const dial = page.locator('.street-dial input');
  await expect(dial).toHaveAttribute('aria-valuetext', '清晨');
  await dial.hover();
  await expect(page.locator('.street-blend')).toHaveClass(/is-on/, { timeout: 15000 });
  await expect(page.locator('.street-blend img')).toHaveCount(3);
  // 清晨与午后之间：午后图沿光带铺开一半
  await setDial(page, 40);
  expect(await page.locator('.street-blend img').nth(1).evaluate(el => getComputedStyle(el).maskImage)).toContain('linear-gradient');
  await expect(page).toHaveURL(/time=morning/);
  await setDial(page, 60);
  await expect(page).toHaveURL(/time=noon/);
  await expect(page.locator('.street-times [data-time="noon"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#street-reading > .field-label')).toContainText('午后');
  // 午后没有灯；入夜灯光亮起
  expect(Number(await page.locator('.street-scene-wrap').evaluate(el => getComputedStyle(el).getPropertyValue('--lights')))).toBe(0);
  await setDial(page, 200);
  await expect(page).toHaveURL(/time=evening/);
  expect(Number(await page.locator('.street-scene-wrap').evaluate(el => getComputedStyle(el).getPropertyValue('--lights')))).toBe(1);
  await expect(page.locator('.street-lights i').first()).toHaveAttribute('style', /street-lights\.png/);
  await expect(page.locator('.street-scene')).toHaveAttribute('src', /prunoiva-evening-\d+\.webp$/);
});

test('城市切片：键盘左右键走到相邻时段；按钮点击带过渡', async ({ page }) => {
  await page.goto('/?page=street&time=noon');
  const dial = page.locator('.street-dial input');
  await dial.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/time=evening/);
  await expect(dial).toHaveAttribute('aria-valuetext', '入夜');
  await page.keyboard.press('Home');
  await expect(page).toHaveURL(/time=morning/);
  await page.locator('.street-times [data-time="evening"]').click();
  await expect(page).toHaveURL(/time=evening/, { timeout: 5000 });
  await expect(dial).toHaveValue('200', { timeout: 5000 });
});

test('城市切片：减弱动态时直接切换，不做过渡', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/?page=street&time=morning');
  await page.locator('.street-times [data-time="evening"]').click();
  await expect(page).toHaveURL(/time=evening/);
  expect(await page.locator('.street-dial input').inputValue()).toBe('200');
  expect(await page.locator('.street-lights-halo').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await context.close();
});

test('造物陈列室：切换视图时旧图溶解，结束后画布移除', async ({ page }) => {
  await page.goto('/?page=exhibits&object=lamp');
  const img = page.locator('.painted-portrait');
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  await page.getByRole('button', { name: '结构图版' }).click();
  await expect(page.locator('.dissolve-canvas')).toHaveCount(1);
  await expect(img).toHaveAttribute('src', /plates\/lamp\.svg$/);
  await expect(page.locator('.dissolve-canvas')).toHaveCount(0, { timeout: 4000 });
  await expect(page.getByRole('button', { name: '结构图版' })).toHaveAttribute('aria-pressed', 'true');
});

test('旅行案头：小航海图按路线画出海路、界门或原地出行', async ({ page }) => {
  await page.goto('/?page=travel&from=eisenrod&to=enchanteves&mode=surface');
  const chart = page.locator('.travel-chart');
  await expect(chart).toHaveAttribute('aria-hidden', 'true');
  await expect(chart.locator('.route-sea')).toHaveCount(1);
  await expect(chart.locator('.route-from')).toHaveAttribute('cx', '29');
  await expect(chart.locator('.route-to')).toHaveAttribute('cx', '71');
  await page.locator('input[name="transport"][value="gate"]').check();
  await expect(chart.locator('.route-gate')).toHaveCount(2);
  await expect(page.locator('.travel-chart .route-sea')).toHaveCount(0);
  await page.locator('#travel-to').selectOption('eisenrod');
  await expect(page.locator('.travel-chart .route-loop')).toHaveCount(1);
  await expect(page.locator('.travel-chart .route-to')).toHaveCount(0);
});
