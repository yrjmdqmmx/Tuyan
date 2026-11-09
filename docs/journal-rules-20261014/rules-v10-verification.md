# v10 期刊规则补证与适用解释

核验日期：2026-10-14。有效工作树为 `tuyan-v400-workflow-20261009`，默认规则版本 `2026-10-14.v10`。v1–v9 原目录保留。目录仍为 17 刊；本轮补全已新增的国内期刊，没有把更多空选项作为适配成果。

## 本轮结论与此前判断的修正

| 问题 | 本轮结论 | 实现与边界 |
| --- | --- | --- |
| HSSC 位图单栏 87/88 mm | 本刊一般制作段列 87/180 mm，但“Photographic and bitmapped images”专节明确列 88/180 mm。此前把所有位图单栏继续列待确认过于保守。 | 对实际 PNG / 导出的 TIFF 采用专节 88/180；简单矢量采用一般段 87/180。是按章节适用范围解释，不是官方勘误、替代声明或 1 mm 容差。仍为建议，不是硬性禁令。 |
| HSSC AI 条款优先级 | 本刊图件要求直接引用自身 AI 专节；较宽的集团框架及实施材料未声明本刊有限例外已经废止。 | 对本刊明确涉及的情况先核对专项条件，再核对集团责任、权利和披露。此顺序是工作台的适用解释；不能宣称官方优先级争议已全部消除，也不能将集团条件单独满足认作本刊许可。 |
| Cell Reports 说明图精修 | Elsevier 正式政策正文和类别表明确支持说明图辅助创作；不必要求官方逐字使用产品术语“精修”才允许同类别创作。 | 将作者概念、流程、关系的忠实改绘解释为同类辅助创作，改为 conditional + 人工判断。明确这是适用解释；不是从“需要披露修改”反推所有修改获准。研究数据、原始影像、GA、TOC、封面和艺术插图各自判断。 |
| 国内新增期刊 | 两本心理学期刊的当前下载附件包含 AI 使用自检问题；数据政策另有来源、访问及共享要求。人口研究、图书情报工作还有需要纠正的条件范围。 | 补入可追溯规则和上下文，科学真实性、字体和投稿材料保持人工核对；没有编造统一 DPI、栏宽、图件格式或 AI 许可。 |

## HSSC：本刊专节与集团框架

1. [本刊投稿指南](https://www.nature.com/palcomms/author-instructions/submission-instructions)：Chrome 可完整读取。最终制作的一般宽度段与位图专节在同一页面；仅对已识别文件类型分配其具体适用范围。线图、图表、示意图的矢量偏好不等于 SVG 已被接收，也不等于输出 XML 就可认证编辑性。
2. 指南的图件要求直接指向本页 AI 图像条款；其条件涉及合同供图、研究本身讨论 AI、或依可归属且可核验科学数据开发的工具，并保留标识与核验要求。普通提示词、已有原图或一般生成式模型不自动满足例外。
3. [本刊政策](https://www.nature.com/palcomms/journal-policies/editorial-and-publishing-policies)、[集团正式视觉政策](https://www.springernature.com/gp/policies/editorial-policies/ai-manuscript-preparation)、[集团 FAQ](https://group.springernature.com/gp/group/ai/ai-guidance-for-researchers-editors-reviewers)与[集团编辑实施指导](https://www.springernature.com/gp/policies/editorial-policies/ai-editor-guidance)继续作为范围证据。它们说明集团适用与推广过程，但未提供本刊专节的废止日期或明确替代说明。完整 URL 保存在版本化来源 `hsscPolicy / snVisualAi / snPolicyScope / snAiGuidance / snAiEditorGuidance / snAiUpdate` 中。
4. 本轮官方渠道续查未发现可证实撤销关系的新文件。集团公告发布日期、官网版权年份和本次访问日都不当作 HSSC 条款修订日。其他 Nature 期刊的相似 88 mm 文案只作交叉观察，没有继承为本刊规则。

宽度检查只针对录用后制作的适用用途：实际位图 88 或 180 mm 可检查；简单无外部/图片/未知节点的 SVG 87 或 180 mm 可检查；含位图、外链、样式或其他无法判断结构的 SVG 单栏仍需要人工确定。预检尚无实际文件，87/88 mm 的范围不能凭所选扩展名判定。没有调整像素、画面比例或模型，也没有伪造原生分辨率。

## Cell Reports：用类别与具体操作判断

本轮换用可直接读取的 [Elsevier 澳大利亚官方政策入口](https://www.elsevier.com/en-au/about/policies-and-standards/generative-ai-policies-for-journals)，读取正式正文、图像类别表和图件 FAQ，而非重复请求返回 403/挑战页的 Cell 入口。

正文明确支持传达作者概念、过程及关系的说明图创作；[Researcher Academy 官方速查表](https://researcheracademy.elsevier.com/download/media/2905)的说明图类别也明确允许 AI。速查表及[政策解释文章](https://www.elsevier.com/connect/updated-generative-ai-policies-for-journals-supporting-responsible-use-while-protecting-trust)已在 v9 完整核对，正式政策本轮从地区入口补证。[Cell Reports 本刊政策](https://www.cell.com/cell-reports/information-for-authors/journal-policies#generative)对 Elsevier 的直接引用和本刊更窄用途条件来自同日 v8 成功读取的证据；本轮没有声称重新读到挑战页后的正文。

`cell-refine` 的条件：原图确为作者自有概念性说明图，改绘忠实于科学关系；逐项核验准确性、完整性和权利，图注与全稿 AI 声明记录工具、版本和用途。存在研究数据或原始影像的面板不能整体归为普通示意图。没有认证模型能可靠保持科学内容，也没有放宽数据图模型重绘、原始科研图像或特殊用途的既有边界。v9 的“未逐项规定”仍留在 v9 任务中。

## 国内期刊新增依据

### 心理学报、心理科学进展

从[心理学报下载中心](https://journal.psych.ac.cn/xlxb/CN/column/column7.shtml)和[心理科学进展下载中心](https://journal.psych.ac.cn/xlkxjz/CN/column/column7.shtml)取得并完整提取以下正式附件：

| 本刊附件 | 官方文件 | 核实范围 |
| --- | --- | --- |
| 心理学报一般研究自检 | [DOC](https://journal.psych.ac.cn/xlxb/CN/item/downloadFile.jsp?filedisplay=20260903180114.doc) | 是否使用 AI、程度及具体部分；效应量和 95% CI 自检。缺统计结果时由作者补充，模型不得编造。 |
| 心理学报元分析自检 | [DOCX](https://journal.psych.ac.cn/xlxb/CN/item/downloadFile.jsp?filedisplay=20260903181116.docx) | 该文章类型的 AI 使用自检与数据问题。 |
| 心理学报理论与史自检 | [DOC](https://journal.psych.ac.cn/xlxb/CN/item/downloadFile.jsp?filedisplay=20260903181136.doc) | 该文章类型的 AI 使用自检。 |
| 心理科学进展综述评论自检 | [DOC](https://journal.psych.ac.cn/xlkxjz/fileup/1671-3710/ITEM/20260903181331.doc) | AI 使用范围；自检报告放在稿件首页。 |
| 心理科学进展元分析自检 | [DOCX](https://journal.psych.ac.cn/xlkxjz/CN/item/downloadFile.jsp?filedisplay=20260903181346.docx) | 同类 AI 使用自检；不外推至未取得附件的研究构想等栏目。 |

文件名含日期不等于文件正文修订日，下载索引的旧发布日期也不代表附件从未更新。没有填写推测的 updatedOn。

[心理学报数据政策](https://journal.psych.ac.cn/xlxb/CN/column/column15.shtml)与[心理科学进展数据政策](https://journal.psych.ac.cn/xlkxjz/CN/column/column15.shtml)分别核实，页面发布日均为 2023-06-20。直接支撑结论的数据、数据可用性声明和受限访问条件进入数据图上下文；隐私、保密及第三方权益例外不被删除。数据存储库推荐的 PNG/TIFF/SVG 清单不是正文图片接收格式表。

原来的具体字体、字号和阶段条件继续按各刊指南分别保留。正文指南及本轮附件未提供可靠的统一 DPI/栏宽；公开文章的审稿意见中出现的 600/1000 DPI 不当作全刊规范。“AI 或 PS”软件名称也不当作生成式 AI 许可。

### 人口研究

[2026 投稿须知](https://rkyj.ruc.edu.cn/CN/column/column3.shtml)页面发布于 2025-12-24。补入不同系列线条应清楚可区分的要求，纠正先前把绘图线条要求混入表格线宽的表述。三线表与双语标题位置保留；未提供数值线宽，不虚构阈值。官方作者中心的模板链接未取得文件，没有把空链接或页面标题当作模板已核验。

### 图书情报工作

[现行论文模板](https://www.lis.ac.cn/CN/column/column41.shtml)明确在内容复杂、不易区分时允许全表格线，因此一般三线表规则补上例外。

新核实[数据共享政策](https://www.lis.ac.cn/CN/column/column38.shtml)：正文落款 2022-08-24、页面发布日期 2022-11-04。该政策明确覆盖本刊。整体鼓励共享与声明，直接支撑结论的数据另有“应当共享”措辞；按类别及隐私、保密、伦理和权益例外人工核对。数据图保留原始数据、处理依据及持久引用；程序不自动公开数据。

模板中“≥300 像素”没有密度单位、“双栏排图最大宽度 8 CM”没有明确物理版心解释，这两项仍不能转换为精确自动通过阈值。2023 年 AI 声明与新数据政策都没有逐项许可所有图像生成/修改。保留这两个真实缺口，不能用经验补齐。

## 本地证据与实现

下载文件及完整文本位于 `/Users/a1-6/.codex/visualizations/2026/10/14/tuyan-journal-rules-v10`，包括 `acta-check.doc`、`acta-meta.docx`、`acta-theory.doc`、`advances-review.doc`、`20260903181346.docx` 及各自 `.txt`。

实现文件：`packages/api/src/journal-catalog-v10.js`、共享目录入口/规则判定与声明、Core 实际导出检查。新增可选 `rasterOneOf` 与实际内容类型 `raster`；无新 HTTP 必填字段，不新增冗长确认表单。目录和测试中的旧版本保持可追溯。

验证见 [v10 本地回归](rules-v10-validation.md)。来源解释、格式检查、科学真实性、真实模型效果、生产/投稿验收分别处理。
