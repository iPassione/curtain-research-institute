# 帷幕研究所 · The Curtain Institute

《帷幕》世界的公共阅览室：通过历史、地理、魔法、人物与诸界观测文章，探索五大陆的文明与日常。仓库包含静态网站、文章修订稿、图像素材、生成工具及编辑记录。

**[访问帷幕研究所](https://curtain-research-institute.ipassione03.chatgpt.site)** · **[帷幕 Obsidian 知识库](https://github.com/iPassione/curtain-obsidian-vault)**

## 本地阅览

网站使用 HTML、CSS 与 JavaScript，无需安装项目依赖即可预览。安装 Python 后，在仓库根目录运行：

```sh
python -m http.server 8765 --bind 127.0.0.1 --directory dist
```

浏览器打开 `http://127.0.0.1:8765/`；按 `Ctrl+C` 停止服务。页面使用 Google Fonts 与 CDN 提供的 GSAP，断网时字体和动画效果可能与线上不同。

## 目录

```text
.
├── README.md
├── dist/                    可编辑网页、文章加载文件、图片与浏览器依赖
├── humanizer/               逐篇修订稿、全文基线与审校记录
├── docs/
│   ├── 设计/                产品、视觉与插画说明
│   ├── 编辑/                编辑规范
│   ├── 专题/                馆藏和展室说明
│   └── 历史/                原始换机交接记录
├── tools/drawing/           器物图版生成与开发工具恢复
├── build-*.cjs / *.mjs      正文与馆藏生成脚本
├── editorial-*.json         编辑源数据及核对记录
├── collection-*.json        馆藏源数据
├── content.js               基础内容源文件
├── .impeccable/design.json  共享设计规范
└── .openai/hosting.json     现有 Sites 项目与静态目录配置
```

**本项目的 `dist/` 包含实际维护的源文件和部署文件，必须提交。** 它不是可以整体删除、忽略或由一条构建命令完整恢复的目录。根目录脚本与数据保留原路径，现有生成流程继续从仓库根目录运行。

## 修改网站与文章

| 修改内容 | 入口 |
| --- | --- |
| 页面入口、主体布局与样式 | `dist/index.html`、`dist/institute.js`、`dist/institute.css` |
| 文章正文 | `humanizer/revised/<文章ID>.json` |
| 器物陈列、旅行案头、城市切片 | `dist/exhibit-data.js`、`dist/travel-data.js`、`dist/street-data.js` |
| 插画与网站素材 | `dist/assets/` |
| 专项交互 | `dist/visual-atlas.*`、`dist/nautical-map.*`、`dist/collections.*`、`dist/fieldrooms.*` |

修改文章后，在根目录执行 `node build-humanized.cjs`，将修订稿及更新的 `dist/humanized-articles.js`、`humanizer/revision-report.json` 一同提交。具体流程见 [开发与内容维护](docs/开发与内容维护.md)。

## 阅读项目文档

- [产品定位](docs/设计/PRODUCT.md) · [视觉规范](docs/设计/DESIGN.md)
- [编辑说明](docs/编辑/EDITORIAL.md) · [文章修订记录](humanizer/README.md)
- [馆藏说明](docs/专题/COLLECTIONS.md) · [展室说明](docs/专题/FIELDROOMS.md)
- [器物绘图工具](tools/drawing/README.md)
- [跨设备同步与发布](docs/同步与发布.md) · [仓库维护](docs/仓库维护.md)

世界事实以知识库的具体设定笔记与作者确认内容为准；公开网站是面向读者的选编，不自动替代完整知识库。新增未定设定应先确认，并遵守项目现有剧透边界。

## 同步、发布与内容归属

Git 提交与推送保存本仓库，不会自动更新线上网站。线上站点继续通过 Sites 的现有项目发布；项目配置保留在 `.openai/hosting.json`，发布凭据不进入仓库。

仓库公开供阅读与交流，尚未指定覆盖原创文字、美术及代码的统一开源许可证。公开访问不代表授予转载、改编或商业使用许可。第三方代码的声明与许可证继续适用，见 [第三方组件](docs/第三方组件.md)。
