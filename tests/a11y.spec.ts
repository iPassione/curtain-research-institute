// 阶段 8：无障碍扫描（axe-core，WCAG 2.1 A/AA 与常用最佳实践）。
// 文章章节前的大号序号是装饰（aria-hidden），对比度不计，扫描时排除。
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = ['/?gl=static', '/?page=history', '/?page=geography', '/?page=magic', '/?page=people', '/?page=worlds&gl=static', '/?page=daily', '/?page=library',
  '/?article=worlds-dead', '/?page=exhibits', '/?page=travel', '/?page=street', '/?page=nowhere'];

for (const url of pages) {
  test(`无障碍扫描 ${url}`, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .exclude('.chapter-index')
      .analyze();
    const found = r.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 4).join(' | ')}`);
    expect(found, found.join('\n')).toEqual([]);
  });
}

test('检索面板打开时也通过扫描', async ({ page }) => {
  await page.goto('/?page=library');
  await page.keyboard.press('Control+k');
  await page.locator('.search-dialog input').fill('界门');
  await expect(page.locator('.search-results li').first()).toBeVisible();
  const r = await new AxeBuilder({ page }).include('.search-dialog').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
  const found = r.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 4).join(' | ')}`);
  expect(found, found.join('\n')).toEqual([]);
});
