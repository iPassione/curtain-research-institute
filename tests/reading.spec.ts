// 阶段 1：阅读体验与全站外壳（检索面板、术语批注、阅读位置、转场、无脚本提示）。
import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const glossary = JSON.parse(fs.readFileSync('dist/data/glossary.json', 'utf8')) as { term: string; forms: string[]; article: string; lead: string }[];

let errors: string[] = [];
test.beforeEach(({ page }) => {
  errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
});
test.afterEach(() => expect(errors, errors.join('\n')).toEqual([]));

test.describe('全站检索', () => {
  for (const q of ['蕴法石', '界门', '普诺伊瓦']) {
    test(`「${q}」直达包含该词的章节`, async ({ page }) => {
      await page.goto('/?page=history');
      await page.keyboard.press('Control+k');
      const input = page.locator('.search-dialog input');
      await expect(input).toBeFocused();
      await input.fill(q);
      const chapter = page.locator('.search-results li', { has: page.locator('.search-type', { hasText: '章节' }) }).first();
      await expect(chapter).toBeVisible();
      await expect(chapter.locator('mark').first()).toHaveText(q);
      // 键盘选中这一条再回车。
      const index = await chapter.evaluate(li => [...li.parentElement!.children].indexOf(li));
      for (let i = 0; i < index; i++) await input.press('ArrowDown');
      await expect(chapter).toHaveAttribute('aria-selected', 'true');
      await input.press('Enter');
      await expect(page.locator('.search-dialog')).not.toBeVisible();
      await expect(page).toHaveURL(/\?article=[a-z0-9-]+#chapter-\d+$/);
      const hash = new URL(page.url()).hash;
      const section = page.locator(hash);
      await expect(section).toContainText(q);
      const top = await section.evaluate(el => el.getBoundingClientRect().top);
      expect(top).toBeGreaterThanOrEqual(-5);
      expect(top).toBeLessThan(200);
    });
  }

  test('页头按钮与 / 键打开，Esc 关闭并归还焦点；无结果有提示', async ({ page }) => {
    await page.goto('/');
    const trigger = page.locator('.search-trigger');
    await trigger.focus();
    await trigger.press('Enter');
    const dialog = page.locator('.search-dialog');
    await expect(dialog).toBeVisible();
    await expect(page.locator('.search-status')).toContainText('53 篇文章');
    await page.keyboard.type('不存在的词条甲乙丙');
    await expect(page.locator('.search-status')).toContainText('没有找到');
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await page.locator('body').click({ position: { x: 5, y: 300 } });
    await page.keyboard.press('/');
    await expect(dialog).toBeVisible();
  });

  test('多个词同时满足，展室结果带状态参数', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    await page.locator('.search-dialog input').fill('面包铺');
    const room = page.locator('.search-results li', { has: page.locator('.search-type', { hasText: '展室' }) }).first();
    await room.click();
    await expect(page).toHaveURL(/page=street&place=bakery/);
    await expect(page.locator('main')).toContainText('街角面包铺');
  });
});

test.describe('术语批注', () => {
  test('每个术语全文只标一次，且不指向本篇', async ({ page }) => {
    for (const id of ['worlds-stars', 'daily-market', 'camoria', 'history-discrete-full']) {
      await page.goto(`/?article=${id}`);
      const marks = await page.locator('.article .term').evaluateAll(els => els.map(e => ({ i: e.getAttribute('data-term'), href: e.getAttribute('href') })));
      expect(new Set(marks.map(m => m.i)).size, id).toBe(marks.length);
      for (const m of marks) expect(m.href, id).not.toBe(`?article=${id}`);
    }
  });

  test('悬停与键盘聚焦弹出摘要卡，Esc 收起', async ({ page }) => {
    await page.goto('/?article=worlds-stars');
    const term = page.locator('.article .term', { hasText: '权柄' }).first();
    const lead = glossary.find(g => g.term === '权柄')!.lead;
    await term.hover();
    const card = page.locator('#term-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText(lead.slice(0, 20));
    await expect(card.locator('a')).toHaveAttribute('href', '?article=authority-research');
    await page.mouse.move(5, 5);
    await expect(card).toBeHidden();
    await term.focus();
    await expect(card).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
    await expect(term).toBeFocused();
  });

  test('词条是普通链接，单击进入所指文章', async ({ page }) => {
    await page.goto('/?article=worlds-stars');
    await page.locator('.article .term', { hasText: '时间长河' }).first().click();
    await expect(page).toHaveURL(/\?article=worlds-time$/);
    await expect(page.locator('h1')).toHaveText(/时间长河/);
    // 旧文章的摘要卡随路由卸载；新文章自己的卡片尚未弹出。
    await expect(page.locator('#term-card')).toHaveCount(1);
    await expect(page.locator('#term-card')).toBeHidden();
  });
});

test.describe('阅读位置', () => {
  test('记住读到的段落，再次打开时提示继续，读完即清除', async ({ page }) => {
    await page.goto('/?article=history-discrete-full');
    await expect(page.locator('.resume')).toHaveCount(0);
    const target = page.locator('#chapter-3 p').nth(1);
    await target.evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight * 0.2));
    await page.waitForTimeout(700);
    await page.reload();
    const bar = page.locator('.resume');
    await expect(bar).toBeVisible();
    await expect(bar).toContainText('第 3 章');
    await bar.locator('.resume-go').click();
    await expect(bar).toHaveCount(0);
    await expect.poll(() => target.evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(400);
    // 滚到文末后记录清除。
    await page.locator('.article-end').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForTimeout(700);
    await page.reload();
    await page.waitForTimeout(300);
    await expect(page.locator('.resume')).toHaveCount(0);
  });

  test('带章节锚点打开时不打扰', async ({ page }) => {
    await page.goto('/?article=history-discrete-full');
    await page.locator('#chapter-2 p').nth(2).evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(700);
    await page.goto('/?article=history-discrete-full#chapter-4');
    await page.waitForTimeout(300);
    await expect(page.locator('.resume')).toHaveCount(0);
  });
});

test.describe('转场与外壳', () => {
  test('从目录进入文章再返回：标题共享元素，结束后不留内联样式', async ({ page }) => {
    await page.goto('/?page=worlds');
    await page.locator('.article-link', { hasText: '镜面之后' }).first().click();
    await expect(page.locator('h1')).toHaveText(/镜面之后/);
    await page.waitForTimeout(700);
    await expect(page.locator('h1')).not.toHaveAttribute('style');
    await page.goBack();
    await expect(page).toHaveURL(/page=worlds$/);
    await page.waitForTimeout(700);
    expect(await page.locator('[data-vt][style]').count()).toBe(0);
  });

  test('减弱动态时直接切换', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/?page=library');
    await page.locator('.article-link').first().click();
    await expect(page.locator('.article-heading h1')).toBeVisible();
    expect(await page.evaluate(() => document.getAnimations().filter(a => String((a as any).pseudoElement || '').includes('view-transition')).length)).toBe(0);
    await context.close();
  });

  test('手机宽度：页头检索入口可见，页面不横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const url of ['/', '/?article=history-discrete-full', '/?page=library']) {
      await page.goto(url);
      await expect(page.locator('.search-trigger')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), url).toBeLessThanOrEqual(390);
    }
  });

  // Playwright 关闭脚本后 Chromium 仍按「脚本开启」解析 <noscript>，无法在这里渲染出提示，
  // 所以只检查发布的 index.html 里提示文字在主内容区内，且页头导航是静态 HTML。
  test('无脚本提示写在静态 HTML 中', async () => {
    const html = fs.readFileSync('dist/index.html', 'utf8');
    expect(html).toMatch(/<main id="main"><noscript>[\s\S]*请启用 JavaScript[\s\S]*<\/noscript><\/main>/);
    expect(html).toMatch(/<nav id="nav"[^>]*>[\s\S]*阅览室[\s\S]*<\/nav>/);
  });
});
