# Cell Reports 现行指南核实与 HSSC 剩余边界 · 2026-10-14

默认目录 `2026-10-14.v8`，13 刊；Cell Reports 从待核实改为部分支持。v1–v7 目录原字节保持。核验日期与官方修订日期分别记录；PDF 文件名中的数字不作为发布日期。

## Cell Reports：已取得本刊现行证据

本轮改用 Chrome，成功读取本刊作者入口、期刊政策、最终提交页和出版社图件指南，并下载本刊当前页面直接链接的两份 PDF。ScienceDirect 的 `/journal/cell-reports/publish/guide-for-authors` 实际显示 404，已排除，没有继续把它当成待过验证的指南。

| 来源 | 直接核实的适用关系 | 日期处理 |
| --- | --- | --- |
| [本刊作者指南](https://www.cell.com/cell-reports/information-for-authors) | 区分初投、修改、最终提交；初投不必满足其他章节的制作格式 | 页面未列可靠修订日期 |
| [本刊 Journal policies](https://www.cell.com/cell-reports/information-for-authors/journal-policies#generative) | 直接要求遵循 Elsevier，另列各类图像和封面限制 | 未据页脚年份推定修订日期 |
| [本刊 Final submission](https://www.cell.com/cell-reports/information-for-authors/final-submission) | 明确要求正文图符合 Cell Press 图件指南；直接链接以下两份 PDF | 当前链接关系是现行适用的依据，不靠附件数字猜时间 |
| [本刊最终文件清单](https://www.cell.com/pb-assets/journals/EM/MasterFFCs/CELREPFFC-1790092533613.pdf) | 第 3 页正文终稿 TIFF/PDF，第 4 页 GA 及补充图件要求 | 全文提取，关键页渲染核读，无可靠印刷修订日期 |
| [Cell Press Figure guidelines](https://www.cell.com/information-for-authors/figure-guidelines) | 经本刊终稿页直接引用的制作规范 | 未列可靠修订日期 |
| [本刊当前链接的 GA PDF](https://www.cell.com/pb/assets/raw/shared/figureguidelines/GA_guide-1780933691430.pdf) | 8 页全文读取，第 2 页含现行技术与 AI 规定 | 没有把旧 PDF 或本次下载时间当发布日期 |
| [Elsevier AI 政策](https://www.elsevier.com/about/policies-and-standards/generative-ai-policies-for-journals) | 经本刊政策直接引用；按图像类别与研究方法区分 | 页面明示更新于 2026-06 |

## 当前规格及历史差异

- **正文终稿**：本刊专项清单列 TIFF/PDF，各图独立高分辨率文件，全部面板同页，图注在正文稿件末尾。通用 EM 系统可收 EPS/JPEG/PSD/PNG/CDX 并不覆盖本刊终稿清单。图研能导出实际 TIFF；仍未提供 PDF 导出。
- **宽度**：研究/综述双栏版式的最大宽度 85/114/174 mm，三栏短文为 55/114/174 mm。这些是最大值，不是所有图只能取的离散尺寸。程序检查共同最大 174 mm，栏型仍须人工核对；6.5×8 英寸与指南括号中 16.5×20 cm 的取整建议不变成精确硬性高度。
- **像素密度**：彩色/灰度 300 ppi、黑白 500 ppi、线稿 1000 ppi。当前选项没有独立二值黑白类别，因此不把灰度阈值误写成 500；黑白/混合图的实际类别保留人工核对。文件检查只计算实际像素与指定排版宽度的比值，不证明细节、清晰度或未被放大。
- **其他制作项**：单文件 20 MB，RGB，Arial 6–8 pt，线宽 0.5–1.5 pt，大写面板标号。分别保留指南的要求/建议强度；实际字体、嵌入、线宽、科学真实性无法自动认证。
- **GA 历史规格**：1200×1200 像素与 300 dpi 经现行 PDF 和最终清单交叉续证。**历史 Arial 12–16 pt 已不适合作为当前依据，现行 PDF 为 8–12 pt**。优选 TIFF/PDF/JPG。GA 范围不外推正文/补充图。
- **补充材料**：终稿图/表及图注打包为完整可发表 PDF；单图格式检查不能替代整套材料检查。文章类型允许的图表总量、补充图建议总量均是人工整稿检查。

## AI：官方内容和图研执行解释分开

| 类别 | 本刊证据 | v8 执行 |
| --- | --- | --- |
| 正文/补充说明性示意图生成 | 有条件允许创作；核实准确性、权利，并在图注和全稿声明记录工具、版本、用途 | `conditional`，人工审查；不声称当前任务已合规 |
| 说明图生成式精修 | 本刊写创作许可，未单列已有图模型重绘；集团披露生成/修改的 FAQ 不是独立授权 | `unspecified`、不构造禁令，也不宣布精修已获许可 |
| 数据可视化生成 | 仅允许从底层数据经可复现方法直接生成并在 Methods/STAR Methods 及 AI 声明记录 | `conditional`；模型绘图无法认证该方法，明确能力缺口 |
| 数据图生成式精修 | 本刊另明令不准用 AI 改动呈现实验/观测数据的图像 | 当前精修是对已有图重绘，不能证明由原数据重算，阻断这一操作；不把该限制误用于可复现数据可视化生成 |
| 原始科研图像 | 不允许 AI 创建/改动，包括亮度、对比度和色彩平衡；研究方法中的正式 AI 使用另有可复现记录条件 | 官方限制及工具能力限制分别保留，不以选择模型声明满足研究例外 |
| GA | 通用生成式图像工具不得制作；现行 PDF 允许专用科学插图工具中的 AI | 图研当前调用的通用模型生成/重绘不属于已核实例外，不能因平台科研定位自称 BioRender 类专用工具 |
| 封面 | 本刊禁止 AI 制作，只有 AI 是稿件研究组成部分时可获编辑例外 | 当前流程不处理编辑特批；不套用集团较宽的一般事先许可 |

普通非生成式图像调整保留本刊原始材料、全图一致处理、拼接说明、比例尺等条件，不能用它批准生成式重绘。数据图“生成许可”与“图像修改禁令”通过操作区分；没有把矛盾文本简单取最后抓到的一句。

## HSSC：本轮新增证据及尚未消除的两点

重新在 Chrome 读取[本刊投稿指南](https://www.nature.com/palcomms/author-instructions/submission-instructions)和[本刊编辑政策](https://www.nature.com/palcomms/journal-policies/editorial-and-publishing-policies)，与 v7 所得内容一致。

1. 最终制作一般段仍为单栏 87 mm，照片/位图小节仍为 88 mm，两处双栏都是 180 mm。一般段没有明确排除位图，也没有容差、勘误或优先说明。特定小节可能是更具体的适用规则，但这属于解释，不能写成期刊已确认的矢量/位图分流。因此保留已确定的 180 mm 与单栏局部疑点，不扩大成所有尺寸都待确认。
2. 新读的[集团编辑 AI 指导](https://www.springernature.com/gp/policies/editorial-policies/ai-editor-guidance)提到推广采用期，但未明示 HSSC 条款废止。已补入来源和范围说明。该页面不能单独确定本刊较窄例外与集团较宽视觉细则的优先级。

集团适用声明与 2026-09-10 更新公告已经核实，但本刊/FAQ 的较窄表述仍存在；不能仅凭公告更新就宣布其失效，也不把未解决的范围问题转成新的全面禁令。v7 已解决的初投/修改 PDF 排除、最终制作矢量 PDF 范围保持。**HSSC 两点未完全消除，本轮不谎称已查清。** 未联系编辑部或发送任何询问。

## 本地证据

`/Users/a1-6/.codex/visualizations/2026/10/14/tuyan-journal-rules-v8` 保存本刊清单及 GA PDF、提取文本、渲染页、来源哈希、测试日志与脏改动保留核查。网页政策通过 Chrome 渲染正文读取；两份 PDF 通过本刊实际链接取得。核验不包含真实模型质量或生产通过，见 [验证记录](rules-v8-validation.md)。
