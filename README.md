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

## 修改文章

- 当前生效的修订稿：`humanizer/revised/<文章ID>.json`，一篇一个文件。
- 可编辑字段：`subtitle`、`lead`、`chapters`；每章包含 `heading` 和 `paragraphs`。
- 保留 `id`，文章链接、篇名、馆藏归属和引用笔记名由原始文章数据提供。
- `humanizer/baseline-articles.json` 是本轮修订前的全文快照，供对照，不要覆盖。
- 原始 Obsidian 知识库没有打包进仓库；现有文章、来源笔记名和编辑背景已包含在内。如需查阅未公开的完整设定，需在另一台电脑单独同步原库。

装好 Node.js 后，在仓库目录生成网页使用的正文：

```sh
node build-humanized.cjs
```

该命令更新 `dist/humanized-articles.js` 和 `humanizer/revision-report.json`。提交文章修改时，将对应 JSON 和这两个生成文件一起提交。直接修改 `dist/humanized-articles.js` 的内容会在下次生成时被覆盖。

`prepare-humanizer.cjs` 是首次导出旧版快照的工具；`humanizer/owner-polish.cjs` 和 `humanizer/final-review.cjs` 是已经执行的一次性编辑记录。继续审稿时无需运行这三个文件。

## 本地阅览

这是静态网站，无需安装项目依赖。装有 Python 时，在仓库目录运行：

```sh
python -m http.server 8765 --bind 127.0.0.1 --directory dist
```

浏览器打开 `http://127.0.0.1:8765/`。`Ctrl+C` 停止预览。

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
