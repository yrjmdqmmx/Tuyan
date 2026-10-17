# 期刊规则：研究对照、官方核验与首版范围

核验日期：2026-10-13（Asia/Shanghai）。有效工作树：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`，起点 HEAD `5e6989f59416e44d9f22fd26703d3830ed861ea7`。现有脏改动保留。本功能属于现有完整设置/生成/精修工作台，不新建论文画布编辑器。

## 两份导出版本

完整读取的输入：

- `/Users/a1-6/Downloads/“Tuyan — 论文画布”首批期刊适配研究：期刊选择、绘图规则、AI 政策与工程优先级.docx`
- `/Users/a1-6/Downloads/deep-research-report (2).md`

Word XML 提取覆盖 735 个段落、11 张表格；两张内嵌流程图均已打开检查。表格行数依次为 8、1、6、16、14、9、10、7、1、8、30。正文脚注式 [1]…[48] 实际在正文末列出，不是 Word 原生脚注；footnotes.xml 中无实质脚注文本。Word 包内有 50 个外链关系、25 个去重 URL，包含正文和脚注关系的重复。

两版正文、表格数字、建议与结论语义相同。标准化文本相似度 99.928%；剩余 32 字符差异是 Markdown 的 7 个代码围栏语言标记 `text` 和 4 个列表符号，不构成规则冲突。Markdown 保存完整 Mermaid 源码；Word 是同样的两幅流程图图片。Word 提供可点击来源，Markdown 约 90 个内部引用块（`turn...`）不能直接还原为公开链接。Word 若干多来源引用合并为单链接，不能从中恢复每一个原始共同引用。二者互补保留，未用任一版本覆盖另一版。

证据提取在本次本地工件目录 `.../journal-adaptation/`：`docx-extracted.json`、`docx-text.txt`、`report-comparison.json`、两幅提取 PNG。原文件未修改。

## 不能沿用的前提

1. 候选七刊不是已支持七刊。菜单存在、提示词加入规则、单元测试通过均不证明实际投稿合规。
2. 报告时间为 2026-09-23 America/Los_Angeles。AI 政策与 ACS 页面已有更新；必须复核时间、适用期刊和操作。
3. PLOS ONE 在暂定 Editorial Accept 前豁免格式规范。初投不能使用录用后格式标准作为硬性阻断。
4. Word/Markdown 本身没有实质规则矛盾，但引用不可完全恢复；正文有多处概括需要官方细分。
5. 像素、DPI 标签、放大和包装格式不能证明原生细节。SVG 文件名不能证明可编辑矢量。
6. 栅格文字字体、线宽、科研真实性、材料授权、AI 披露不能可靠自动认证。当前生图模型不能承担原始科研照片修复，也不保证数值图精确。
7. 报告中的市场规模/热度判断、推荐优先级与“必须实现”清单未视作本轮开发指令。新画布、政策监控系统、字体编辑器、原始科研图像处理器和自动提交均不在本轮。

## 官方核验及冲突处理

完整逐规则来源、条件、版本与核验日期位于 `packages/api/src/journal-catalog.js`，浏览器可展开。这里记录改变范围的核验结论；文字为摘要，非官方原文全文。

|候选|本次官方证据|关键纠正及边界|首版状态|
|---|---|---|---|
|PLOS ONE|[Figures](https://journals.plos.org/plosone/s/figures)、[Ethical publishing practice](https://journals.plos.org/plosone/s/ethical-publishing-practice)|正文图制作规范于 Editorial Accept 后适用；TIFF/EPS，300–600 dpi。10 MB 的 `<` 与 `≤` 表述冲突，不能取最后抓取值。当前已有明确示意图 AI 条件，报告“未找到”已过时。|部分支持；PNG→TIFF，EPS 不支持；字体人工|
|Frontiers in Artificial Intelligence|[专刊作者指南](https://www.frontiersin.org/journals/artificial-intelligence/for-authors/author-guidelines)|85/180 mm，300 dpi，RGB，文字至少 8 pt、线至少 2 pt；EPS 录用阶段。括号大写标号与图注粗体要求不能混为全部图中文字必须粗体。AI 需准确性、权利与披露。|部分支持；TIFF、像素/尺寸检查，文字/线宽人工|
|Advanced Materials Interfaces|[专刊指南](https://advanced.onlinelibrary.wiley.com/hub/journal/21967350/author-guidelines)、[Wiley 期刊作者 AI 指南](https://www.wiley.com/en-kr/publish/article/ai-guidelines/)|Free Format 不能抹去图件条件；同页 300 dpi 分别出现 must/preferably，保留冲突。矢量转位图另有 1200 dpi 要求；不借 300 dpi 准许该转换。AI 指南区分示意/数据图与照片证据；不是 Wiley 图书指南。AI 直连 403，官方索引读取到完整相关内容，记录检索方式。|部分支持；PNG/TIFF；TOC 单列；未知保持待确认|
|ACS Omega|[专刊指南](https://researcher-resources.acs.org/publish/author_guidelines?coden=acsodf)、[ACS AI policy](https://researcher-resources.acs.org/publish/aipolicy)|页面 2026-10-05 更新；线稿/灰度/彩色 1200/600/300 dpi；660 pt 深度含图注。Fast Format 不等于分辨率豁免。AI TOC/Abstract Graphic 不应使用；封面另有授权及编辑条件。接收文件格式需进一步核验。|部分支持；格式待确认；TOC AI 执行阻断|
|IEEE Access|[Access 指南](https://ieeeaccess.ieee.org/authors/submission-guidelines/)、[IEEE 分辨率/尺寸](https://journals.ieeeauthorcenter.ieee.org/create-your-ieee-journal-article/create-graphics-for-your-article/resolution-and-size/)、[IEEE AI 披露](https://journals.ieeeauthorcenter.ieee.org/become-an-ieee-journal-author/publishing-ethics/guidelines-and-policies/submission-and-peer-review-policies/)|出版社 `>300`/`>600` 不写成 `≥`；常见栏宽不写成专刊硬要求。Access 技术映射及具体图像操作许可不完整，披露条款不能替代许可。|部分支持规则参考；本选择下 AI 执行暂不可用|
|Cell Reports|[专刊页面](https://www.cell.com/cell-reports/information-for-authors)、[Elsevier 通用 AI 政策](https://www.elsevier.com/about/policies-and-standards/generative-ai-policies-for-journals)|专刊 403；通用政策区分示意图、可复现数据图、原始科研图、图形摘要和封面，但专刊继承关系未确认。|待核实；不据通用政策开放执行|
|Scientific Reports|[专刊投稿指南](https://www.nature.com/srep/author-instructions/submission-guidelines)、[Nature AI 页面](https://www.nature.com/nature/editorial-policies/ai)|专刊技术部分通过官方索引核验；300 dpi 为 if possible，不强制化。未发现可确认的固定栏宽。专刊 AI 页面不可读；Nature 新风险框架与旧禁令适用范围不能擅自决定。|待核实 AI；技术部分可查看|

来源失联、官方未明确规定、人工判断、来源冲突是不同状态。未查到某字段时显示“此阶段/用途未核实”，不冒充“官方未规定”。Publisher 继承记录有 verified/pending；pending 不升级为专刊硬规则。版本 `2026-10-13.v1` 发布后不可原地改写；将来新建版本并保留旧目录，历史任务含完整快照。

## 实施顺序与现有能力缺口

先实现共享规则数据、选择事务和端到端快照；再将规则加入规划/风格/生图/精修/评审；最后使用实际文件字节进行格式检查与导出，配合离线真实网关/Core 集成与浏览器验收。首批可执行范围以 PLOS、Frontiers、AMI、ACS 的已核实普通正文/补充图用途为主；特殊用途缺许可时阻断而不猜测。原始科研图像生成/精修因产品缺少安全科研图像工作流而阻断，明确这是能力边界而非所有期刊统一禁令。

当前完整输出链为 PNG 与 SVG，新增 PNG→白底 TIFF（不 resize，LZW、单页、8 bit RGB）。不提供 EPS/PDF，也不将 SVG 栅格化来绕过矢量转换条件。尺寸检查以用户指定最终排版宽度与实际文件比例计算；不能保证排版软件最后采用该宽度。文件原生细节/上采样历史/嵌入素材最低分辨率、完整字体/线宽/面板语义、SCI 科学真实性留待人工。

规则可能增加提示词长度，但没有新增付费模型调用步骤；现有受限模型的 prompt 预算继续校验，不截掉规则。没有自动换模型。实际导出读取自己任务的结果，不接受任意 URL、客户端规则快照或字节。逐文件报告与 ZIP 绑定实际导出 SHA-256；失败时不回退到无检查下载。
