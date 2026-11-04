# 器物绘图工具与跨电脑恢复

## 项目

四个项目都放在 `D:\CurtainDrawingTools`，各自保留独立 Git 仓库。项目源码不嵌入网站的 Git 仓库；这里提供原始链接、提交锁定文件和恢复脚本。

| 项目 | 原始仓库 | 当前用途 |
| --- | --- | --- |
| Three.js | https://github.com/mrdoob/three.js | 六件器物的原创三维模型、灯光、材质、拖动查看 |
| Maker.js | https://github.com/microsoft/maker.js | 六张正面形制 SVG 图版的几何线稿 |
| Rough.js | https://github.com/rough-stuff/rough | 图版上淡排线纹理 |
| Zdog | https://github.com/metafizzy/zdog | 已下载备用，目前未接入网站 |

`projects.lock.json` 锁定四个源码提交和 npm 版本。源码 HEAD 与 npm 发布版分别记录；实际网站使用 npm 锁定版 Three.js。Three.js 使用浅克隆与稀疏检出，保留 `src`、`build` 和根目录文件，省去大量示例模型。其他项目为浅克隆。

## 在另一台 Windows 电脑恢复

先拉取本网站仓库，准备 Git、Node.js 和 npm。从仓库目录执行：

```powershell
pwsh -File .\tools\drawing\restore-tools.ps1
```

如果 npm 没在 PATH，传入现有 npm.cmd 的绝对路径：

```powershell
pwsh -File .\tools\drawing\restore-tools.ps1 -NpmPath 'D:\你的Node目录\npm.cmd'
```

源码、`runtime/node_modules` 和 `npm-cache` 默认均在 D 盘。脚本遇到源码仓库中已有修改会停下，保留修改。

## 修改器物图

- `dist/specimen-renderer.js`：原创三维造型，使用 Three.js；按需渲染，不持续播放动画。切换器物时释放几何体、材质、纹理和 WebGL 上下文。
- `tools/drawing/build-plates.cjs`：Maker.js 正面图与 Rough.js 排线；图版是创作形制，未编造实际尺寸或法术内部工作机制。
- `dist/assets/plates/*.svg`：生成图版，也是无 WebGL 时的后备图。
- `dist/vendor/three`：已随网站提交的浏览器运行文件和 MIT 许可，浏览页面无需安装开发依赖，也不依赖公共 CDN。
- `dist/vendor/licenses`：下载项目的上游许可原文。

重建图版：

```powershell
node .\tools\drawing\build-plates.cjs
```

若改变根目录，设置 `CURTAIN_DRAWING_MODULES` 指向相应 `runtime/node_modules`。修改依赖版本后同步 npm 锁定文件，复制 Three.js 的 `build/three.module.js`、`build/three.core.js` 和 `LICENSE` 到 `dist/vendor/three`。

## 本次规模与查看方式

2026-11-04 下载后统计，四个源码项目、npm 依赖和缓存合计约 236 MiB（按文件逻辑大小，后续缓存变化会增长）。线上新增 Three.js 浏览器代码约 2.1 MB 未压缩；其他三个项目的开发依赖不随站点部署。

器物可拖动旋转、双击或按钮复位；聚焦图像后方向键调整视角，Home 复位。结构图版按钮切换纸面绘录。文字资料和原有文章保持原样。此次进行本地页面观察，没有新增或运行测试套件。

### 施法杖的形制约束

普通短杖与长杖均为纯木质外观，不镶宝石。镶嵌宝石的器物属于造物。本展室的两件施法工具采用连贯木纹、渐细杖身和一体木质握部；不使用金属箍、镶座或皮革包覆。展示底座与托架是展具。
