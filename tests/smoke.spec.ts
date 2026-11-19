// 冒烟测试：地址兼容、单页切换、关键交互。运行 npm test（会先用 scripts/serve.mjs 起 dist）。
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const baseline = JSON.parse(fs.readFileSync('tests/baseline/content-baseline.json', 'utf8')) as {
  articles: { id: string; title: string; chapters: number; paragraphs: number }[];
  aliases: Record<string, string>;
};
const byId = Object.fromEntries(baseline.articles.map(a => [a.id, a]));

// 每个测试都收集页面脚本错误，结束时断言为空。
let errors: string[] = [];
test.beforeEach(({ page }) => {
  errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/status=2152398850|WebGL: context lost/.test(m.text())) errors.push(m.text()); /* Firefox 跳转时中止未下完的字体、WebKit 并行时丢失 WebGL 上下文（网站会退回静态版），都不算错误 */ });
});
test.afterEach(() => expect(errors, errors.join('\n')).toEqual([]));

const collections: [string, string, number][] = [
  ['history', '历史研究室', 0], ['geography', '地理与文明馆', 0], ['magic', '魔法研究室', 0], ['people', '人物档案馆', 0],
  ['worlds', '诸界观测', 6], ['daily', '巫师日常', 6], ['library', '公共阅览室', 53],
];

test.describe('馆藏页', () => {
  for (const [id, , expected] of collections) {
    test(`?page=${id}`, async ({ page }) => {
      await page.goto(`/?page=${id}`);
      const h1 = page.locator('.page-hero h1');
      await expect(h1).toBeVisible();
      await expect(page).toHaveTitle(`${await h1.textContent()} | 帷幕研究所`);
      await expect(page.locator('body')).toHaveAttribute('data-surface', 'collection');
      const cards = page.locator('#collection-catalog ~ .articles .article-link');
      if (expected) await expect(cards).toHaveCount(expected);
      else expect(await cards.count()).toBeGreaterThan(0);
      await expect(page.locator(`#nav a[href="?page=${id}"]`)).toHaveAttribute('aria-current', 'page');
    });
  }
});

test.describe('文章与别名', () => {
  for (const id of ['origin', 'history-discrete-full', 'camoria', 'casting-reference', 'worlds-structure', 'daily-market', 'worlds-stars']) {
    test(`?article=${id} 章节与段落数与基线一致`, async ({ page }) => {
      const b = byId[id];
      await page.goto(`/?article=${id}`);
      await expect(page.locator('.article-heading h1')).toHaveText(b.title);
      await expect(page).toHaveTitle(`${b.title} | 帷幕研究所`);
      await expect(page.locator('.article-chapter')).toHaveCount(b.chapters);
      await expect(page.locator('.article-chapter p')).toHaveCount(b.paragraphs);
      await expect(page.locator('.reading-aside nav a')).toHaveCount(b.chapters);
    });
  }

  test('全部旧别名都打开对应文章', async ({ page }) => {
    for (const [alias, target] of Object.entries(baseline.aliases)) {
      await page.goto(`/?article=${alias}`);
      await expect(page.locator('.article-heading h1')).toHaveText(byId[target].title);
    }
  });

  test('from 参数：文章不属于该馆时退回文章所属馆（与旧站一致，阅览室也不例外）', async ({ page }) => {
    await page.goto('/?article=daily-market&from=daily');
    await expect(page.locator('.article-masthead .back')).toHaveAttribute('href', '?page=daily');
    await page.goto('/?article=tyndale-early&from=library');
    await expect(page.locator('.article-masthead .back')).toHaveAttribute('href', '?page=people');
    await page.goto('/?article=tyndale-early&from=worlds');
    await expect(page.locator('.article-masthead .back')).toHaveAttribute('href', '?page=people');
  });

  test('章节锚点：诸界面板链接直达第 3 章', async ({ page }) => {
    await page.goto('/?article=worlds-structure&from=worlds#chapter-3');
    await expect(page.locator('#chapter-3')).toBeInViewport();
  });

  test('字号调节在 16–24 之间并被记住', async ({ page }) => {
    await page.goto('/?article=origin');
    const article = page.locator('.article');
    for (let i = 0; i < 10; i++) await page.getByRole('button', { name: '放大正文字号' }).click();
    await expect(article).toHaveCSS('--reading-size', '24px');
    await page.reload();
    await expect(page.locator('.article')).toHaveCSS('--reading-size', '24px');
    for (let i = 0; i < 10; i++) await page.getByRole('button', { name: '缩小正文字号' }).click();
    await expect(page.locator('.article')).toHaveCSS('--reading-size', '16px');
  });

  test('文章页不加载 GSAP 与首页分块', async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', r => { if (r.resourceType() === 'script') scripts.push(r.url()); });
    await page.goto('/?article=origin');
    await expect(page.locator('.article-chapter').first()).toBeVisible();
    expect(scripts.filter(u => /gsap|home-/.test(u))).toEqual([]);
  });
});

test.describe('未找到', () => {
  for (const url of ['/?page=nowhere', '/?article=missing-record']) {
    test(url, async ({ page }) => {
      await page.goto(url);
      await expect(page.locator('.not-found h1')).toHaveText('这条线索暂时中断了。');
      await expect(page).toHaveTitle('帷幕研究所 | The Curtain Institute');
    });
  }
});

test.describe('开放展室', () => {
  test('造物陈列室：切换展品写入 object 参数，地址可直接打开', async ({ page }) => {
    await page.goto('/?page=exhibits');
    await expect(page.locator('.field-masthead h1')).toHaveText('造物陈列室');
    await expect(page.locator('#nav a[href="?page=exhibits"]')).toHaveAttribute('aria-current', 'page');
    await page.locator('.specimen-list [data-object="lamp"]').click();
    await expect(page).toHaveURL(/\?page=exhibits&object=lamp$/);
    await expect(page.locator('#specimen-detail h2')).toHaveText('一盏日用造物灯');
    await page.getByRole('button', { name: '结构图版' }).click();
    await expect(page.locator('.painted-portrait')).toHaveAttribute('src', /plates\/lamp\.svg$/);
    await page.getByRole('button', { name: '藏品插画' }).click();
    await expect(page.locator('.painted-portrait')).toHaveAttribute('src', /painted-specimens\/lamp-\d+\.webp$/);
    await page.goto('/?page=exhibits&object=gate');
    await expect(page.locator('#specimen-detail h2')).toHaveText('界门结构样本');
  });

  test('旅行案头：选择写入参数，清单可勾选与下载', async ({ page }) => {
    await page.goto('/?page=travel&from=eisenrod&to=enchanteves&purpose=trade&mode=gate');
    await expect(page.locator('#travel-from')).toHaveValue('eisenrod');
    await expect(page.locator('#travel-to')).toHaveValue('enchanteves');
    await expect(page.locator('input[name="transport"][value="gate"]')).toBeChecked();
    await page.locator('#travel-purpose').selectOption('study');
    await expect(page).toHaveURL(/purpose=study/);
    const boxes = page.locator('[data-pack]');
    const total = await boxes.count();
    await boxes.first().check();
    await expect(page.locator('.packing-progress')).toHaveText(`已收好 1 / ${total} 件`);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: '抄下行装单 ↓' }).click();
    expect((await download).suggestedFilename()).toBe('帷幕行装单.txt');
  });

  test('城市切片：时段与地点写入参数并换图', async ({ page }) => {
    await page.goto('/?page=street&place=bookshop&time=evening');
    await expect(page.locator('.street-map')).toHaveAttribute('data-time', 'evening');
    await expect(page.locator('.street-scene')).toHaveAttribute('src', /prunoiva-evening-\d+\.webp$/);
    await page.locator('.street-times [data-time="morning"]').click();
    await expect(page).toHaveURL(/time=morning/);
    await expect(page.locator('.street-scene')).toHaveAttribute('src', /prunoiva-morning-\d+\.webp$/);
    await page.getByRole('button', { name: '沿街再走一家 →' }).click();
    await expect(page).toHaveURL(/place=bakery/);
  });
});

test.describe('专项交互', () => {
  test('航海图：复位、旋转与点选大陆联动下方文字', async ({ page }) => {
    await page.goto('/?page=geography');
    await page.getByRole('button', { name: '复位朝北' }).click();
    await expect(page.locator('.nautical-frame')).toHaveAttribute('data-angle', '0');
    await page.getByRole('button', { name: '顺时针旋转15度' }).click();
    await expect(page.locator('.nautical-frame')).toHaveAttribute('data-angle', '15');
    const place = page.locator('[data-chart-place="2"]');
    await place.click();
    await expect(place).toHaveAttribute('aria-pressed', 'true');
    const name = (await place.getAttribute('aria-label'))!.split('：')[1];
    await expect(page.locator('#continent-detail h3')).toHaveText(name);
  });

  test('施法四阶段与人物关系', async ({ page }) => {
    await page.goto('/?page=magic');
    await page.locator('[data-step="2"]').click();
    await expect(page.locator('.atlas-magic .atlas-note h3')).toHaveText('稳定');
    await page.goto('/?page=people');
    await page.locator('[data-person="3"]').click();
    await expect(page.locator('.atlas-people .atlas-note h3')).toHaveText('普里多尼');
  });

  test('诸界观测与货币换算', async ({ page }) => {
    await page.goto('/?page=worlds');
    await page.locator('[data-world="mirror"]').click();
    await expect(page.locator('#world-observation h3')).toHaveText('反射面后的无序之境');
    await page.goto('/?page=daily');
    await page.locator('#currency-amount').fill('2');
    await page.locator('#currency-unit').selectOption('1200');
    await expect(page.locator('#currency-result strong')).toHaveText('2,400 索比恩');
  });

  test('阅览室全文检索与领域筛选', async ({ page }) => {
    await page.goto('/?page=library');
    await page.locator('#catalog-search').fill('蕴法石');
    await expect(page.locator('#result-count')).not.toHaveText('53 篇文章');
    const n = Number((await page.locator('#result-count').textContent())!.split(' ')[0]);
    expect(n).toBeGreaterThan(0);
    await page.locator('#catalog-filter').selectOption('worlds');
    await page.locator('#catalog-search').fill('');
    await expect(page.locator('#result-count')).toHaveText('6 篇文章');
    await page.locator('#catalog-search').fill('没有这个词的检索');
    await expect(page.locator('.search-empty')).toBeVisible();
  });
});

test.describe('单页切换', () => {
  const marker = (page: Page) => page.evaluate(() => (window as any).__spaMarker);

  test('站内链接不整页重载，返回键回到上一页并恢复滚动', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { (window as any).__spaMarker = 'kept'; });
    await page.locator('#nav a[href="?page=history"]').click();
    await expect(page).toHaveURL(/\?page=history$/);
    await expect(page.locator('.page-hero h1')).toHaveText('历史研究室');
    expect(await marker(page)).toBe('kept');
    await page.evaluate(() => scrollTo({ top: 900, behavior: 'instant' })); // 站点开了平滑滚动，Firefox 与 WebKit 会把普通 scrollTo 做成动画
    await page.waitForTimeout(100);
    // 用脚本点击，避免测试工具先把链接滚进视口而改变记录的位置。
    await page.evaluate(() => (document.querySelector('.articles .article-link') as HTMLElement).click());
    await expect(page).toHaveURL(/\?article=.+&from=history$/);
    await expect(page.locator('.article-heading h1')).toBeVisible();
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await page.goBack();
    await expect(page.locator('.page-hero h1')).toHaveText('历史研究室');
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(900);
    await page.goBack();
    await expect(page.locator('.hero h1')).toBeVisible();
    expect(await marker(page)).toBe('kept');
  });

  test('从展室回首页定位到展室入口', async ({ page }) => {
    await page.goto('/?page=travel');
    await page.locator('.field-masthead .back').click();
    await expect(page).toHaveURL(/\/#fieldrooms$/);
    await expect(page.locator('#fieldrooms')).toBeInViewport();
  });

  test('目录内锚点与修饰键点击交给浏览器', async ({ page }) => {
    await page.goto('/?article=origin');
    await page.locator('.reading-aside nav a').nth(2).click();
    await expect(page).toHaveURL(/#chapter-3$/);
    await expect(page.locator('#chapter-3')).toBeInViewport();
  });

  test('切换后页面标题、导航高亮与 body 状态同步更新', async ({ page }) => {
    await page.goto('/?page=exhibits');
    await page.locator('.field-nav a[href="?page=street"]').click();
    await expect(page).toHaveTitle('城市切片 | 帷幕研究所');
    await expect(page.locator('body')).toHaveAttribute('data-surface', 'fieldroom');
    await page.locator('.header .brand').click();
    await expect(page).toHaveTitle('帷幕研究所 | The Curtain Institute');
    await expect(page.locator('body')).toHaveAttribute('data-surface', 'home');
    await expect(page.locator('#nav a[aria-current]')).toHaveCount(0);
  });

  test('手机目录：展开后点链接会关闭', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('.menu-toggle').click();
    await expect(page.locator('#nav')).toHaveClass(/open/);
    await page.locator('#nav a[href="?page=magic"]').click();
    // 测试用的 Chromium 是软件渲染，首页三维降为静态；Firefox 隐藏渲染器名称，三维照常启用，切换较慢，放宽等待
    await expect(page.locator('.page-hero h1')).toHaveText('魔法研究室', { timeout: 15000 });
    await expect(page.locator('#nav')).not.toHaveClass(/open/);
  });
});

test('新页面还没画出来就按返回：留在原页，不被迟到的页面覆盖', async ({ page }) => {
  await page.goto('/?page=history');
  await expect(page.locator('.page-hero h1')).toHaveText('历史研究室');
  // 让魔法研究室的数据晚到 1.5 秒
  await page.route('**/data/articles/**', async route => { await new Promise(r => setTimeout(r, 1500)); await route.continue(); });
  await page.route('**/build/atlas-*.js', async route => { await new Promise(r => setTimeout(r, 1500)); await route.continue(); });
  await page.locator('.header nav a', { hasText: '魔法' }).click();
  await expect(page).toHaveURL(/page=magic/);
  await page.goBack();
  await expect(page).toHaveURL(/page=history$/);
  await page.waitForTimeout(2500);
  await expect(page.locator('.page-hero h1')).toHaveText('历史研究室');
  await expect(page.locator('#nav a[aria-current]')).toHaveAttribute('href', '?page=history');
});

test('单页切换到达的页面与直接打开逐字一致', async ({ page }) => {
  const urls = ['/?page=geography', '/?article=casting', '/?page=street&time=noon', '/?page=library', '/?article=worlds-stars&from=worlds', '/?page=nowhere', '/?page=worlds', '/'];
  const snapshot = () => page.evaluate(() => ({ html: document.querySelector('#main')!.innerHTML, title: document.title, surface: document.body.dataset.surface, collection: document.body.dataset.collection, current: [...document.querySelectorAll('#nav a[aria-current]')].map(a => a.getAttribute('href')) }));
  const direct: Record<string, unknown> = {};
  for (const url of urls) { await page.goto(url); await page.waitForLoadState('networkidle'); direct[url] = await snapshot(); }
  await page.goto('/?page=history');
  for (const url of urls) {
    await page.evaluate(u => { const a = document.createElement('a'); a.href = u; document.body.append(a); a.click(); a.remove(); }, url);
    await page.waitForLoadState('networkidle');
    await expect.poll(() => page.evaluate(() => location.pathname + location.search)).toBe(url);
    // 地址先变、页面随后渲染（模块加载在较慢的浏览器上更久）：等标题与页面类型到位再比较
    await expect.poll(() => page.evaluate(() => document.title + '|' + document.body.dataset.surface)).toBe((direct[url] as any).title + '|' + (direct[url] as any).surface);
    await page.waitForTimeout(150);
    // 航海图的自转角度、首页 GSAP 入场的中间位移随时间变化，比较前统一去掉；
    // 首页画布（三维场景）与其就绪状态取决于渲染时机，也一并去掉。
    const strip = (s: any) => ({ ...s, html: s.html.replace(/<canvas[^>]*><\/canvas>/g, '').replace(/ data-gl="[^"]*"/g, '').replace(/ style="left:[^"]*px[^"]*"/g, '').replace(/ class="chart-place is-offscreen"/g, ' class="chart-place"').replace(/ style="translate:[^"]*"/g, '').replace(/<div class="street-blend[^"]*" aria-hidden="true">.*?<\/div>/g, '<div class="street-blend"></div>').replace(/rotate\([^)]*\)/g, '').replace(/data-angle="[^"]*"/g, '').replace(/value="-?\d+°"|>-?\d+°</g, '') });
    expect(strip(await snapshot()), url).toEqual(strip(direct[url]));
  }
});

test('地理馆带 continent 参数：直接展开那块大陆；不合法的参数回到中央大陆', async ({ page }) => {
  await page.goto('/?page=geography&continent=4&gl=static#continents');
  await expect(page.locator('[data-chart-place="4"]')).toHaveAttribute('aria-pressed', 'true');
  const name = await page.locator('[data-chart-place="4"] strong').textContent();
  await expect(page.locator('#continents .atlas-note h3')).toHaveText(name!);
  expect(await page.locator('#continents').evaluate(el => Math.abs(el.getBoundingClientRect().top) < 200)).toBe(true);
  await page.goto('/?page=geography&continent=9&gl=static');
  await expect(page.locator('[data-chart-place="0"]')).toHaveAttribute('aria-pressed', 'true');
});
