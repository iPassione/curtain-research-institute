# 2026-11-02 全馆 Humanizer 修订

## 恢复点

原版提交：`105fe4b551cec76acce98f673b1c50ce78764bb7`。
本地标签：`before-humanizer-20261102`。
修订分支：`edit/humanizer-terra-20261102`。
本地 `main` 留在修订前版本。发布工具将修订分支的最终提交以快进方式推送到网站源仓库的 `main`，不会改动本地恢复标签。

## 编辑范围

全馆 53 篇文章，由 GPT-6.1 Terra 分三批按 Humanizer 技能逐篇精修。保留篇名、文章 ID、所属馆藏、引用笔记名及原有链接；修改副标题、导语、章节正文。重点去掉防御性写作、重复解释、空泛总结及机械对照句。真实的魔法条件、研究争议、历史未知仍属于正文内容。

原始 Obsidian 知识库不作修改。原始网站文章文件也不覆盖；`baseline-articles.json` 是本轮原版全文快照，`revised/` 为逐篇修订稿，`audit-*.md` 为编辑自审记录。

## 重建

在网站目录运行 `node build-humanized.cjs`，由 53 份修订稿生成 `dist/humanized-articles.js` 和篇幅清单。网页先加载原始文章，再应用修订正文；文章元数据及馆藏关系继续由原始文件提供。

`prepare-humanizer.cjs` 只用于本轮首次导出原版快照，后续编辑无需重复运行。

## 撤回

完整旧版可通过上述 Git 标签查看和恢复。保留本轮稿件但临时停用正文修订时，可从 `dist/index.html` 移除 `humanized-articles.js` 的脚本引用，然后按 Sites 流程保存并重新发布。线上版本也保留修订前的第 13 版，可选其重新部署。不要使用强制推送或清理工作区来恢复。
