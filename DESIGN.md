---
name: 帷幕研究所
description: 墨绿书封、暖白书页与铜金索引构成的公共研究图志
colors:
  ink: "#203c35"
  green: "#123c32"
  deep: "#0c2824"
  paper: "#f4f1e7"
  muted: "#52645a"
  brass: "#ad8d52"
  rule: "#c8cbbd"
  action: "#e7d5a7"
  action-ink: "#173d32"
  action-hover: "#f6e9c7"
  focus: "#b0853e"
typography:
  display:
    fontFamily: "Noto Serif SC, Songti SC, serif"
    fontSize: "clamp(54px, 6.5vw, 94px)"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.03em"
  heading:
    fontFamily: "Noto Serif SC, Songti SC, serif"
    fontSize: "29px"
    fontWeight: 500
    lineHeight: 1.7
  reading:
    fontFamily: "Noto Serif SC, Songti SC, serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 2.15
    letterSpacing: "0.025em"
  ui:
    fontFamily: "Noto Sans SC, Microsoft YaHei, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.9
rounded:
  square: "0px"
spacing:
  small: "12px"
  medium: "24px"
  large: "40px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.square}"
    padding: "17px 24px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  input-search:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "15px 0"
---

# Design System: 帷幕研究所

## Overview

**Creative North Star: "夜间开放的研究图志"**

研究所的前端以深绿书封和浅色书页组织不同阅读场景。穹顶观测图、航海图和研究桌是实际使用的图像资产；器物感来自图像、细边线与方正版面，而不是在正文后叠加纹理。

首页属于 Experience：主视觉先建立世界感，研究方向和选读把访客带入馆藏。正文属于 Read：暖白背景、衬线长文和独立索引让阅读成为主任务。历史、地理、魔法、人物、诸界、日常、阅览室七个馆藏共用同一图志体系，已有地图与专题工具保持各自完整的交互。

**Key Characteristics:**

- 深色导览与浅色正文形成清楚的场景切换。
- 中文衬线字体承载标题和正文，无衬线字体承载导航与控制。
- 文章条目采用开放式分隔线，主方向入口采用书封式色块。
- 铜金色用于索引、选中和行动提示。

## Colors

YAML frontmatter 是规范值；七个全局 CSS 变量与同名颜色一一对应。

- 书封绿 `green`：馆藏页头、方向入口和交互说明面板。
- 夜间深绿 `deep`：全局页头、页脚、首页背景与研究桌区域。
- 暖白书页 `paper`：正文、文章列表和通用内容区域。
- 墨绿 `ink`：浅底上的标题、正文与表单值。
- 草灰绿 `muted`：摘要和辅助说明。
- 铜金 `brass`：设计系统的索引角色；实际组件存在局部铜金色阶，新增内容优先复用已有角色。
- 纸页分隔色 `rule`：文章条目、提要和目录分隔。
- 主行动和键盘焦点使用 frontmatter 的专用角色。

方向入口已有土棕、蓝灰和橄榄绿色面，分别服务人物、诸界与日常。专题图中的羊皮纸和金属色由专项 CSS 管理，不强制替换为普通页面色值。

## Typography

标题与长文使用 Noto Serif SC，回退至 Songti SC 和 serif；界面使用 Noto Sans SC，回退至 Microsoft YaHei 和 sans-serif。少量篇章编号使用 Georgia。

首页显示标题采用 display token。文章标题在桌面采用 `clamp(36px, 4.5vw, 64px)`，手机缩至 34px；馆藏标题采用 `clamp(37px, 4.5vw, 64px)`。正文小节标题采用 heading token，手机为 25px。

正文默认 reading token，用户可在 16–24px 间调节并保存偏好；手机行高改为 2.05，字距归零，左对齐。桌面正文两端对齐。内容提要 20px，手机 18px。导航、阅读时长和条目标签使用界面字体，通常为 10–13px；英文标签只承担辅助索引。

## Layout

全站先采用正常文档流页头，不固定遮挡内容。桌面页头高 88px，窄屏为 76px。通用馆藏容器最大 1200px；首页导览区域最大 1440px，首页方向入口和选读区域最大 1240px。

首页方向入口桌面三列、850px 以下两列、550px 以下单列。手机入口自身变成插图在左、文字在右的横向书封。研究桌区域桌面图文两列，850px 以下变为上下排列。

文章采用 210px 篇章索引、70px 间隔和最大 750px 正文。1150px 以下索引收窄；850px 以下目录回到正文前并自动换行。手机表单与文章列表改成单列。馆藏页头的装饰图在 550px 以下隐藏，标题、介绍和浏览入口保留。

## Elevation & Depth

页面主要靠色面、细边线、图像和空白形成层次。普通文章条目没有浮起阴影。手机展开菜单使用向下的柔和阴影（`0 15px 25px #0c282430`）。地图转盘的边缘、金属环和阴影来自保留的 `nautical-map.css`，属于仪器本身。

## Shapes

主要控制与版面使用直角，1px 细边线是常见分隔方式。圆形用于观测、魔法与转动地图等特定主题。大陆点位是菱形，悬停或键盘聚焦才显示标签；方位标签不作为常驻贴纸铺在图上。

## Components

### Navigation

页头使用深色底与浅色文字；当前馆藏用金色文字及下划线识别。850px 以下显示“目录”按钮，展开后为两列链接，支持 Escape 关闭及点击页头外关闭。跳至正文链接仅在键盘聚焦时显示。

### Actions and Fields

主行动采用浅金底、深绿字和直角；次级动作采用文字下划线。全局键盘焦点为 2px 铜金描边，向外偏移 5px。搜索与筛选使用透明底和底部边线；输入值为 16px。

### Collection Entries

首页六个方向均使用独立横幅封面：地理沿用航海图，历史、魔法、人物、诸界、日常采用 ImageGen 生成的历史题材淡彩插画。新封面去除噪点、密集排线和脏旧纸纹，保留干净的轮廓与色块。各馆页头复用对应图像。人物图为匿名示意群像，不对应已命名角色的外貌。桌面封面高 210px 并裁切至中心；550px 以下改为完整宽度的 16:9 横幅，与标题说明上下排列。

文章条目用细线分隔，包含主题、阅读时长、标题、摘要和阅读动作。标题悬停变为铜棕色；条目底部动作保留充分间隔。公共阅览室同时按全文关键词与研究领域筛选，显示结果数量和空结果提示。

### Reading Folio

文章顶部依次为返回链接、类别、标题、副标题和阅读元信息。桌面左侧目录随滚动停留，当前章节以铜金底边强调。提要与正文分隔；每章有编号、标题与完整段落。字号按钮始终限制在支持范围，页面顶部细进度条反映正文阅读进度。文末以菱形、资料来源和关联文章收束。

### Working Exhibits

`visual-atlas.css`、`nautical-map.css`、`collections.css` 先载入，`institute.css` 最后载入并协调颜色、字体与间距。保留地图转动与点选、施法分阶段演示、人物关系、诸界观测、生活专题和货币换算，避免重写系统样式时覆盖其定位与状态逻辑。

首页 GSAP 仅编排一次标题组进入与主视觉滚动位移；CSS 悬停过渡通常为 0.2–0.25 秒。减弱动态偏好下取消 CSS 动画、过渡和平滑滚动，并跳过首页 GSAP。内容默认可见，第三方动画加载失败不会隐藏内容。

## Do's and Don'ts

- **Do** 根据已实现的颜色变量和两个字体角色扩展页面。
- **Do** 为长文保留完整内容、清楚目录和有节奏的章节分隔。
- **Do** 同时检查桌面与窄屏，保留搜索、地图与专题工具的状态反馈。
- **Do** 为键盘焦点提供可见样式，并尊重减弱动态偏好。
- **Don't** 在正文背景增加妨碍阅读的装饰纹理。
- **Don't** 把馆藏摘要当作正文的替代物。
- **Don't** 用全局排版调整破坏专项地图和图解的定位。
- **Don't** 依赖动画完成内容显示或基本导航。
