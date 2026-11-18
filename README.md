# 帷幕研究所 · The Curtain Institute

《帷幕》世界的公共阅览室：通过历史、地理、魔法、人物与诸界观测文章，探索五大陆的文明与日常。仓库包含网站源码、文章修订稿、图像素材、生成工具及编辑记录。

**[访问帷幕研究所](https://curtain-research-institute.ipassione03.chatgpt.site)** · **[帷幕 Obsidian 知识库](https://github.com/iPassione/curtain-obsidian-vault)**

## 本地阅览

网站由 Vite + TypeScript 构建，构建结果在 `dist/`（也是线上发布的目录）。安装 Node.js 22 或更新版本后，在仓库根目录运行：

```sh
npm install
npm run build
npm run preview
```

浏览器打开 `http://127.0.0.1:8765/`；按 `Ctrl+C` 停止服务。改代码时可用 `npm run dev` 打开带热更新的开发服务器（`http://127.0.0.1:5173/`）。

`dist/` 是纯静态文件，只想看看、不改代码时，也可以不装 Node.js，直接用 Python 预览：

```sh
python -m http.server 8765 --bind 127.0.0.1 --directory dist
```

字体已自托管，断网也能正常显示。首页、地理与文明馆、魔法研究室和诸界观测有三维场景，需要支持 WebGL2 并有显卡加速的浏览器；不满足条件或开启「减弱动态效果」时，页面自动使用静态版本。

## 目录

```text
.
├── README.md
├── index.html / src/        页面入口与源码（路由、页面、交互功能、三维场景、样式）
├── content/                 馆藏、展室、术语表等内容数据，以及生成脚本的产物
├── assets-src/              原始图片、SVG 图版与数据图
├── public/                  原样发布的文件：自托管字体、第三方许可
├── scripts/                 内容与图片构建、本地服务、高度图派生
├── tests/                   Playwright 测试与截图工具
├── dist/                    构建产物，也是 Sites 发布的静态目录（提交，但不要手工修改）
├── humanizer/               逐篇修订稿、全文基线与审校记录
├── docs/
│   ├── 设计/                产品、视觉、插画说明与前端 V3 施工方案
│   ├── 编辑/                编辑规范
│   ├── 专题/                馆藏和展室说明
│   └── 历史/                原始换机交接记录
├── tools/drawing/           器物图版生成与开发工具恢复
├── build-*.cjs / *.mjs      正文与馆藏生成脚本
├── editorial-*.json         编辑源数据及核对记录
├── collection-*.json        馆藏源数据
├── .impeccable/design.json  共享设计规范
└── .openai/hosting.json     现有 Sites 项目与静态目录配置
```

**`dist/` 必须提交**：Sites 从这里发布。V3 起它由 `npm run build` 生成，改源码或内容后重新构建，再把 `dist/` 一并提交；直接修改 `dist/` 会在下次构建时被覆盖。

## 修改网站与文章

| 修改内容 | 入口 |
| --- | --- |
| 页面、路由与交互 | `src/`（`routes/` 页面、`features/` 交互功能、`gl/` 三维场景、`styles/` 样式） |
| 文章正文 | `humanizer/revised/<文章ID>.json` |
| 器物陈列、旅行案头、城市切片 | `content/fieldrooms/exhibit-data.js`、`travel-data.js`、`street-data.js` |
| 术语批注 | `content/glossary.json` |
| 插画与网站素材 | `assets-src/` |

修改文章后，在根目录执行 `node build-humanized.cjs`，再 `npm run build`，把修订稿、`content/generated/` 下的生成文件、`humanizer/revision-report.json` 和 `dist/` 一同提交。具体流程见 [开发与内容维护](docs/开发与内容维护.md)。

## 阅读项目文档

- [产品定位](docs/设计/PRODUCT.md) · [视觉规范](docs/设计/DESIGN.md) · [前端 V3 施工方案](docs/设计/FRONTEND-V3.md) · [V3 接续说明](docs/V3-接续说明.md)
- [编辑说明](docs/编辑/EDITORIAL.md) · [文章修订记录](humanizer/README.md)
- [馆藏说明](docs/专题/COLLECTIONS.md) · [展室说明](docs/专题/FIELDROOMS.md)
- [开发与内容维护](docs/开发与内容维护.md) · [器物绘图工具](tools/drawing/README.md)
- [跨设备同步与发布](docs/同步与发布.md) · [仓库维护](docs/仓库维护.md)

世界事实以知识库的具体设定笔记与作者确认内容为准；公开网站是面向读者的选编，不自动替代完整知识库。新增未定设定应先确认，并遵守项目现有剧透边界。

## 同步、发布与内容归属

Git 提交与推送保存本仓库，不会自动更新线上网站。线上站点继续通过 Sites 的现有项目发布；项目配置保留在 `.openai/hosting.json`，发布凭据不进入仓库。

仓库公开供阅读与交流，尚未指定覆盖原创文字、美术及代码的统一开源许可证。公开访问不代表授予转载、改编或商业使用许可。第三方代码的声明与许可证继续适用，见 [第三方组件](docs/第三方组件.md)。
