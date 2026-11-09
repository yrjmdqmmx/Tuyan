# 期刊规则 v9：续查依据与适用范围

核验日期：2026-10-14。默认版本 `2026-10-14.v9`；v1–v8 数据文件原字节保留。增加 4 本国内刊物，目录共 17 本，其中国内人文社科 8 本。本次没有把“存在选项”标成完整适配；新增均为部分支持。

## HSSC 的 87/88 mm

来源：[本刊 Submission guidelines](https://www.nature.com/palcomms/author-instructions/submission-instructions)。本次 Chrome 直接读取全文和章节层级，没有继续重复失败的入口。

- 87 mm 位于录用后制作的一般准备段，双栏为 180 mm。
- 随后的线稿、图表、示意图专节要求优先保留矢量。
- 88 mm 只位于 **Photographic and bitmapped images** 专节，双栏仍为 180 mm。
- 页面没有可靠的修订日期、勘误或明确的总则/位图专节优先说明。不能把 1 mm 差异解释为官方容差，也不能把访问日期当作政策更新日期。

据范围可以收窄此前的结论：不含位图的矢量图不适用照片/位图专节的 88 mm。v9 将一般建议的 87/180 mm 用于实际文件检查中可排除位图/动态资源的简单 SVG。这是依章节范围作出的适用解释，**不是出版社发布了“87 取代 88”的声明**。

`value.vectorOneOf` 保存该范围。预检仍未取得实际文件，所以即使选择 SVG，87/88 mm 也保留内容待确认。Core 解析实际 XML，仅几何、文本等已识别节点且无样式/动态处理/资源引用时，才可应用此宽度范围；内嵌图片、外部引用、样式表、过滤器、未知节点等保留原不确定性。`simpleVector` 只用于宽度规则适用判断，既不认证所有对象可编辑，也不认证字体、科学内容或原生细节。

位图/不能判明内容：180 mm 可检查；87/88 mm 仍待确认；其他宽度不满足已列建议。没有强迫改宽度、像素数或模型。v8 及更早任务继续保留当时的宽度判断。

## HSSC 的 AI 条款优先级

重新交叉核对：

1. [本刊投稿指南](https://www.nature.com/palcomms/author-instructions/submission-instructions)：图件段直接引用本页 Generative AI images。有限例外仍在现行投稿说明中，不能仅将其视为孤立旧网页。
2. [本刊编辑与出版政策](https://www.nature.com/palcomms/journal-policies/editorial-and-publishing-policies)：保留本刊图像例外及非生成式处理条件。
3. [集团正式 AI 细则](https://www.springernature.com/gp/policies/editorial-policies/ai-manuscript-preparation)与[编辑实施指导](https://www.springernature.com/gp/policies/editorial-policies/ai-editor-guidance)：没有提供 HSSC 专项条款的撤销/优先声明。
4. [官方作者支持](https://support.nature.com/en/support/solutions/articles/6000214274-submitting-a-manuscript-to-a-journal)仍要求查本刊指南；[校样 FAQ](https://support.nature.com/en/support/solutions/articles/6000286574-proofing-common-questions-and-answers)的图片替换说明不构成生成式 AI 许可。[Alt text 指导](https://support.nature.com/en/support/solutions/articles/6000286635-alt-text-in-journal-articles)讨论替代文本，其推出日期也不能充当图像生成政策的更新日期。

已查清“本刊条款仍被投稿指南直接引用”这一适用证据，但尚不能从公开材料消除与集团较宽条件之间的优先级缺口。继续保留两个来源、有限例外与人工条件；没有从披露推断许可，也没有把未写明补成官方禁止。2026-09-10 公告日期仍不等于各页面修订日。初投/修改 PDF 与最终制作的阶段判断沿用 v7/v8，本次没有改导出能力。

## Cell Reports 说明图精修

除已读到的[本刊专项政策](https://www.cell.com/cell-reports/information-for-authors/journal-policies#generative)和[Elsevier 正式政策](https://www.elsevier.com/about/policies-and-standards/generative-ai-policies-for-journals)外，本次改用三个可读取的官方渠道：

- [Elsevier Connect 说明文章](https://www.elsevier.com/connect/updated-generative-ai-policies-for-journals-supporting-responsible-use-while-protecting-trust)，发布于 2026-08-18，指向正式政策和作者培训。
- [Researcher Academy 官方课程](https://researcheracademy.elsevier.com/writing-research/fundamentals-manuscript-preparation/using-generative-ai-manuscript-preparation)，讲者为 Elsevier 生成式 AI 政策负责人；已读课程介绍与[讲稿](https://researcheracademy.elsevier.com/download/media/2827)。
- [作者 AI 速查表 PDF](https://researcheracademy.elsevier.com/download/media/2905)，从课程下载，完整提取两页，渲染第 2 页核对表格。说明图类别的 AI 使用列为允许；第 1 页具体写创作。数据图、原始科研图像和 GA 分列，并要求查正式政策及具体期刊指南。附件未标可靠修订日期。

这些材料增强了说明图辅助创作的证据，但没有单独授予“任意已有说明图的模型重绘”许可。v9 给 `cell-refine` 加入新来源和准确说明，操作状态保持 `unspecified`、非阻断、非许可证明。不能用泛化的类别表或披露义务取消本刊数据图重绘、原始研究图像、GA 和封面的限制。现行指南已取得，不再声称因 403 而未读到本刊政策。

## 新增国内期刊

| 期刊 / 本刊官方来源 | 已接入 | 日期与边界 |
| --- | --- | --- |
| [人口研究 · 投稿须知（2026）](https://rkyj.ruc.edu.cn/CN/column/column3.shtml) | 中英文图/表题在上方居中，资料来源与注释在下方，图表清晰并置于正文相应位置 | 页面发布 2025-12-24；标题年份不是更新日期；未核实完整文件格式、尺寸、DPI 和 AI 操作许可 |
| [心理学报 · 投稿指南](https://journal.psych.ac.cn/xlxb/CN/column/column6.shtml) | 图中文字六号宋体、照片清晰；录用后英文/数字 Times New Roman，六号插图文字；统计符号人工核对 | 页面发布 2019-08-09，现行官方入口仍列此指南；没有推测其最近修订日 |
| [心理科学进展 · 投稿指南](https://journal.psych.ac.cn/xlkxjz/CN/column/column6.shtml) | 六号图中文字、清晰印刷；录用后英文/数字 Times New Roman | 页面发布 2019-12-19；本条未规定宋体，不能继承邻刊《心理学报》的字体 |
| [图书情报工作 · 论文写作模板](https://www.lis.ac.cn/CN/column/column41.shtml)、[本刊 AI 声明](https://www.lis.ac.cn/CN/column/column27.shtml) | 小六号（7 磅）图中文字、中英文图题、地图要求、本刊 AI 声明；限定条件的宽度与含糊密度分开记录 | 模板页发布 2023-07-26，正文较新示例不证明修订日期。AI 声明署期 2023-06-14，页面发布 2023-07-04 |

《图书情报工作》有两处不能擅自“修正”的官方表述：“需要双栏排图的最大宽度是 8CM”缺当前任务的具体排图条件；“分辨率大于等于 300 像素”没有 dpi/ppi 或宽高维度。前者保留人工条件，后者保留待确认，不能编码成统一 80 mm / 300 dpi 通过阈值。其 AI 声明对论文主要内容由 AI 生成有明确学术不端边界，另要求披露图片和图形元素的 AI 使用；披露本身不是每种生成/修改的许可。

四刊均接入可搜索学科、按阶段适用规则、模型上下文、规则快照、历史和导出报告。没有可核实阈值的检查明确为 pending，字体/科学真实性为 uncheckable；85 mm 默认值标为工作台初始值，Word 投稿要求没有被当作独立图片格式要求。没有找到完整 AI 操作许可的刊物仍为 unspecified，保留其他既有能力/明确禁令判断。

另查[浙江大学学报（人文社会科学版）官方信息服务](https://www.zjujournals.com/soc/CN/column/column292.shtml)，其直接链接的论文模板和编排规范 Word 文件返回 404，未取得可用图件正文；未为凑数量接入本轮目录。没有通过第三方转载代替本刊要求。

本轮证据目录：`/Users/a1-6/.codex/visualizations/2026/10/14/tuyan-journal-rules-v9`，含 HSSC 与图书情报工作浏览器正文、Elsevier 原 PDF、文本提取及表格渲染图。没有向期刊发送询问邮件或提交任何材料。
