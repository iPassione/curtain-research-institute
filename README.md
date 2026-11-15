# 帷幕研究所

网站：https://curtain-research-institute.ipassione03.chatgpt.site

GitHub：`iPassione/curtain-research-institute`（私有仓库）。

## 在另一台电脑继续

先使用拥有该私有仓库权限的 GitHub 账号登录，再克隆：

```sh
git clone https://github.com/iPassione/curtain-research-institute.git
cd curtain-research-institute
```

远端 `main` 是供换机接续的最新版，包含全部 53 篇修订文章、页面、图片和编辑记录。2026-11-03 的修订进一步调整星界与灵界的介绍，突出星界秩序及灵界的抽象概念集合体。最新发布源以 Sites 版本记录为准；第 14 版为本轮调整前的全文修订版本。

准备继续修改时，从最新版开自己的工作分支，例如：

```sh
git switch -c edit/article-review
```

## 准备环境

2026-11-15 起（V3 地基，分支 `feat/v3-foundation`），网站由 Vite + TypeScript 构建。装好 Node.js 22 或更新版本后，在仓库目录安装一次依赖：

```sh
npm install
```

依赖版本在 `package.json` 中锁定。运行冒烟测试前还需安装一次测试浏览器：`npx playwright install chromium`。

## 修改文章

- 当前生效的修订稿：`humanizer/revised/<文章ID>.json`，一篇一个文件。
- 可编辑字段：`subtitle`、`lead`、`chapters`；每章包含 `heading` 和 `paragraphs`。
- 保留 `id`，文章链接、篇名、馆藏归属和引用笔记名由原始文章数据提供。
- `humanizer/baseline-articles.json` 是本轮修订前的全文快照，供对照，不要覆盖。
- 原始 Obsidian 知识库没有打包进仓库；现有文章、来源笔记名和编辑背景已包含在内。如需查阅未公开的完整设定，需在另一台电脑单独同步原库。

改完 JSON 后，和以前一样运行对应的生成脚本，再构建网站：

```sh
node build-humanized.cjs
npm run build
```

三个生成脚本与各自的源稿：

| 脚本 | 源稿 | 生成 |
| --- | --- | --- |
| `node build-humanized.cjs` | `humanizer/revised/*.json` | `content/generated/humanized-articles.js`、`humanizer/revision-report.json` |
| `node build-collections.mjs` | `collection-longform.json`、`collection-expansions.json` | `content/generated/collection-longform.js` |
| `node build-editorial.mjs` | `editorial-*.json`、`content/legacy/*.js` | `content/generated/catalogue.js`、`editorial-audit.json`、`editorial-additions.json` |

不确定改了哪类源稿时，`npm run content` 会依次运行这三个脚本并整理馆藏数据。`npm run build` 再把馆藏拆成目录清单与每篇一个 JSON（`scripts/build-content.mjs`，修订稿在这一步合并）、生成图片、编译页面，结果写入 `dist/`。提交文章修改时，把改过的 JSON、`content/generated/` 下对应的生成文件和 `dist/` 一起提交。直接修改 `content/generated/` 或 `dist/` 的内容会在下次生成时被覆盖。

`prepare-humanizer.cjs` 是首次导出旧版快照的工具；`humanizer/owner-polish.cjs`、`humanizer/final-review.cjs`、`connect-fieldrooms.cjs`、`revise-worlds-focus.cjs` 是已经执行的一次性编辑记录，后两个仍指向 V3 之前的 `dist/` 路径。继续审稿时无需运行这些文件。

### 展室与栏目数据

- 三间展室：`content/fieldrooms/exhibit-data.js`、`travel-data.js`、`street-data.js`，直接编辑，然后 `npm run build`。
- 诸界观测、巫师日常两个栏目与四篇正文：`content/collection-content.js`。
- 两个栏目里交互面板的文字（六大世界、生活专题、货币换算）写在 `src/features/collections.ts`；方位图、施法阶段与人物关系写在 `src/features/atlas.ts`。

### 迁移断言

`tests/baseline/content-baseline.json` 记录了 V3 迁移前 53 篇文章的标题、章节数、段落数与全文指纹。`npm run verify:content` 检查当前构建与它逐篇一致，用来确认迁移没有改动内容。它只服务于这次迁移验收：之后有意修改正文，被改的文章会在这里报出差异，属于预期结果，日常改稿不必运行。

## 目录

| 位置 | 内容 |
| --- | --- |
| `index.html`、`src/` | 页面入口与源码：`router.ts`（单页路由）、`routes/`（首页、馆藏、文章、未找到）、`features/`（航海图、施法、人物、诸界、日常、展室）、`styles/` |
| `content/` | 馆藏与展室数据，以及三个生成脚本的产物 |
| `assets-src/` | 原始图片（PNG、WebP）与 SVG 图版；`npm run build` 生成 AVIF/WebP 多尺寸版本，原图不进入 `dist/` |
| `public/` | 原样复制进站点的文件：自托管字体 `fonts/`、第三方许可 `vendor/licenses/` |
| `scripts/` | 内容、图片构建，本地静态服务，基线导出与断言 |
| `tests/` | Playwright 冒烟测试与改造前后截图比对工具 |
| `dist/` | 构建产物，也是 Sites 发布的静态目录，提交进仓库 |

## 本地阅览

产品约束见 `PRODUCT.md`，视觉规则见 `DESIGN.md`，V3 施工方案见 `FRONTEND-V3.md`。

构建后在仓库目录运行：

```sh
npm run preview
```

浏览器打开 `http://127.0.0.1:8765/`，`Ctrl+C` 停止。改代码时也可以用 `npm run dev` 打开带热更新的开发服务器（`http://127.0.0.1:5173/`）。网站地址格式与以前相同：`?page=<馆藏或展室>`、`?article=<文章ID>&from=<馆藏>`，旧文章 ID 由别名表兼容。

`dist/` 是纯静态文件，没有 Node.js 时也可以用 Python 预览：`python -m http.server 8765 --bind 127.0.0.1 --directory dist`。

## 测试

```sh
npm run build
npm test
```

`npm test` 对 `dist/` 运行冒烟测试：七个馆藏、三间展室及其地址参数、文章与旧别名、未找到页、单页切换与返回、阅览室检索、货币换算、航海图与施法交互。`tests/visual/` 下是改造前后的截图与计算样式比对工具，用法见各文件开头的注释。

## 保存与同步

在自己的工作分支提交修改并推送，供另一台电脑接续。开始下一轮修改前，先确认本地工作已保存，再获取远端更新；用快进合并，遇到分歧先检查两边的修改。

```sh
git fetch origin
git pull --ff-only
```

GitHub 推送保存源代码，不会自动更新公开网站。网站仍由 Sites 发布，固定项目 ID 位于 `.openai/hosting.json`：`appgprj_6ae347f79ac081919d35de05c86e0a82`。在另一台电脑让 Codex 使用 Sites 更新此现有项目即可，保持项目 ID 和现有公众访问方式。发布凭证由 Sites 临时提供，仓库中不保存凭证，也不需要把另一台电脑的登录令牌写入文件。

## 版本与恢复

- `main`：GitHub 上可直接克隆的最新版。
- `edit/worlds-focus-20261103`：星界、灵界介绍及相关总览调整。
- `edit/humanizer-terra-20261102`：本次 Humanizer + GPT-6.1 Terra 修订及换机交接分支。
- 标签 `before-humanizer-20261102`：修订前完整旧版，提交 `105fe4b551cec76acce98f673b1c50ce78764bb7`。
- 网站 Sites 第 13 版同样保留修订前的在线版本。

若要查看旧版，先保存当前修改，再从恢复标签创建一个新分支，避免覆盖正在修改的内容。编辑过程、交叉复核和恢复方式见 `humanizer/README.md`、`humanizer/final-audit.md` 及三个批次审校记录。`integrity-report.json` 是第 14 版合稿时的核对记录，后续编辑不会自动重算该文件。

## 器物图绘制

六件器物的三维形制、结构图版，以及另一台电脑恢复绘图项目的方法见 [绘图工具说明](tools/drawing/README.md)。四个上游项目与依赖均放在 D 盘。
