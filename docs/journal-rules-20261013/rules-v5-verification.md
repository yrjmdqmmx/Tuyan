# 2026-10-13 · Cell Reports 续查与人文社科期刊 v5

核验日期：2026-10-13。开发默认规则：`2026-10-13.v5`。本轮新增 4 本中文期刊，目录共 11 本；“已列入”不等于完整适配。没有上线、生产迁移或真实模型质量验证。

## 先纠正名称与范围

- 用户所写“财经论从”的正式刊名是 **财经论丛**，主办单位浙江财经大学。
- **经济学家**指西南财经大学官网承载的中文经济学期刊，不是英国 The Economist。
- 新增 **中国社会科学（中文刊）**，补充经济金融之外的人文社科；内部 ID `social-sciences-in-china` 不表示采用英文版的作者规范。
- 投稿要求里的 Word/PDF、正文匿名、稿件字数是稿件整体要求，不能直接变成 PNG/SVG/TIFF 图件格式门槛。
- “没有在所读指南找到独立 AI 操作条款”既不是“官方没有政策”，也不是禁止或许可。新增中文期刊的生成、生成式精修、非生成式调整分别保留 `unspecified`；当前开发流程不据未知条款阻断，也不授予合规状态。

## Cell Reports：本轮新增证据与未解决的部分

| 官方渠道 | 本轮结果 | 可采用的结论 |
| --- | --- | --- |
| [本刊 Authors 入口](https://www.cell.com/cell-reports/authors)与[本刊 Journal Policies](https://www.cell.com/cell-reports/information-for-authors/journal-policies) | 请求返回 403 / 浏览器安全验证，正文未取得；未绕过验证 | 不能声称已读现行作者指南或最终文件清单 |
| [ScienceDirect 本刊入口示例](https://www.sciencedirect.com/journal/cell-reports/vol/34/issue/8) | 同样无法取得指南正文 | 官网属于本刊不等于页面包含了所需条款 |
| [Cell Press Symposia 2026 投稿页](https://www.cell-symposia.com/mitochondria-2026/submit-abstract.html) | 可访问，明确链接 Elsevier AI 政策，适用会议摘要、海报、演示文稿 | **只证明会议适用**；没有证明 Cell Reports 的本刊覆盖关系 |
| [Patterns 社论](https://doi.org/10.1016/j.patter.2026.101663) | 2026-09-11，官方索引可读；指出相邻刊物解释性图件的有限使用条件 | 不能把 Patterns 作者指引替换成 Cell Reports 的作者指南 |
| [Elsevier 正式期刊 AI 政策](https://www.elsevier.com/about/policies-and-standards/generative-ai-policies-for-journals) | 完整读到正文与页末“2026 年 6 月更新”；本轮填入 `updatedOn=2026-06` | 已确认出版社层面的分类条件；仍缺 Cell Reports 专项条款及其是否存在不同范围的证据 |

出版社政策区分解释图、由数据可复现生成的数据图、原始科研图像、GA 和封面。解释图有人工审查及披露条件；数据图必须忠实来自数据和可复现方法；不能用生成式工具伪造或改变原始科研证据；通用生成式图像工具不用于 GA；封面需事先许可。这些内容不是单凭“需要披露”推导出来的。也不能仅因图研用于科研，就把其通用模型调用称为该政策所说的专用插图工具。

历史资料保持原状态：

- [2018 年 Cell Mentor GA 说明](https://crosstalk.cell.com/blog/attract-readers-at-a-glance-with-your-graphical-abstract)的原发布时间 2018-04-04、更新 2018-09-10 保留。1200×1200、300 dpi、字体与格式仅是录用后 GA 的**历史参考**，未证实在 2026 年仍有效；`value=null / pending`，不用于达标判定，也不套给正文图。
- 该文章链接的 [GA_guide.pdf](https://www.cell.com/pb/assets/raw/shared/figureguidelines/GA_guide.pdf)仍未取得正文；不能写“现行 PDF 已验证”。
- [2019 年图像筛查指导](https://crosstalk.cell.com/blog/what-to-do-if-your-paper-is-flagged-in-image-screening?hs_amp=true)讨论本刊图像真实性及一致处理。亮度、对比度的非生成式调整不等于模型重绘或局部生成许可。

**本轮没有消除这两个缺口：现行本刊清单是否保留历史 GA 规格；当前本刊的生成/生成式精修政策与出版社条件之间的确切适用关系。** Cell 继续 `pending / unverified`，仅更新证据、访问状态、日期和范围，不虚构允许或禁止。出版社现行规则已知与本刊专项范围未确认，是两个不同结论。上一轮其他官方渠道及 Scientific Reports 解释依据见 [v4 核验](rules-v4-verification.md)。

## 新增并接入的中文期刊

| 期刊与支持状态 | 官方材料及来源日期 | 当前实现 | 尚不能确认或自动检查 |
| --- | --- | --- | --- |
| 经济学家 · 待核实 | [官网](https://jjxj.swufe.edu.cn/CN/home)、[投稿指南](https://jjxj.swufe.edu.cn/CN/column/column6.shtml)，2026-07-01 | 初投正文匿名、作者资料独立首页作为人工准备提示 | 独立图片格式、DPI、物理尺寸、AI 生成与精修条件；没有制造 300 dpi 等默认规则 |
| 财经论丛 · 部分支持 | [2026-01-21 投稿须知](https://cjlc.zufe.edu.cn/CN/column/item18.shtml)、[格式入口](https://cjlc.zufe.edu.cn/CN/column/item8.shtml)、[2026-07-08 官方 PDF](https://cjlc.zufe.edu.cn/attached/file/20260708/20260708100514_761.pdf) | 已完整读取 4 页并检查第 2 页版面；坐标标题、图例建议、图内宋体六号、图题黑体六号、数学变量斜体进入任务上下文 | 字体、图题与变量含义不能由当前图片检查可靠认证；未找到完整独立图像技术表及逐项 AI 许可 |
| 山西财经大学学报 · 部分支持 | [2022-12-14 投稿须知](https://xb.sxufe.edu.cn/info/1011/1731.htm)、[2018-08-24 写作格式](https://xb.sxufe.edu.cn/info/1011/1108.htm)、[当前写作规范索引](https://xb.sxufe.edu.cn/xzgf.htm) | 正文图表黑白、中文说明与变量斜体；PNG 的实际可见像素检查；实证数据人工核对 | 2018 原日期不改成 2026；字体不从正文字体推定，其他图像参数与 AI 边界未查实 |
| 中国社会科学 · 部分支持 | [本刊入口](https://sscp.cssn.cn/kbw/zgshkx/)、[2025-05-15 AI 启事](https://sscp.cssn.cn/tzgg/202505/t20250515_5874135.shtml) | 启事第 1 条明确覆盖本社期刊：非核心研究环节限制、工具/版本/时间/生成页面记录、投稿文章材料保护 | “绘图需披露”没有单独授予生成或重绘许可；图的核心学术贡献与服务数据处理条件须人工判断；技术参数缺失 |

实施时的限制解释：

- 《山西财经大学学报》现行官网仍列出 2018 写作格式，足以作为当前作者入口采用其中图表要求，并保留原发布日期；不宣称其在 2026 年重新修订。“黑白”检查是可见像素无彩色，不擅自要求 1-bit 二值图，也不自动去掉颜色来过关。中文说明不排斥规范同时要求保留的英文变量符号。
- 该刊 2022 指南正文与附录对字数区间有差异；2018 格式也有旧字数值。本轮不接入篇幅验证，保留差异，不按最新抓到的文本覆盖。其不接受 PDF 指整篇投稿稿件，不推导成禁止独立 PDF 图片。
- 《经济学家》页面旧说明与新文献规范对 GB/T 7714 版本的引用不同。文献格式不属于当前图件适配，没有顺带扩展成参考文献处理功能。
- 《财经论丛》模板正文、图内、图题字体分开读取；示例小数位、图中示例数据不成为修改研究数值的指令。坐标标题为要求，图例尽量在坐标轴内部为建议。
- 《中国社会科学》AI 启事正文完整读取；本刊概况及山西财经作者页面主要依据官方搜索索引，数据中标 `official-search-index`。没有将第三方投稿代理站当官方依据。
- 四刊初始宽度 85 mm 是工作台默认排版值，**不是四刊规定**；规则明确标注。正文图要求不外推至 GA、TOC、封面、补充图。

## 另行搜集的人文社科候选（本轮未放进已适配菜单）

| 候选 | 官方范围与适配价值 | 下一步证据缺口 |
| --- | --- | --- |
| [Sage Open](https://journals.sagepub.com/page/sgo/help/authorguide) | 官方指南索引覆盖社会科学、行为科学、人文学科；包括定量、定性与混合研究，适合数据图和概念图场景 | 正文访问受限；须继续取得完整图件技术表及本刊 AI 适用关系，不能仅从 Sage 通用政策授予许可 |
| [Humanities and Social Sciences Communications](https://www.nature.com/palcomms/author-instructions/submission-instructions) | 人文社科综合刊，官方指南含单独 AI 图像章节 | 本刊指南的一般限制及例外与集团新政策需单独核对；不能复制 Scientific Reports 的解释结论。当前不列已支持 |

选择依据是学科覆盖、图型关联和官方材料可得性，没有按未经核验的影响因子、排名、接收率或费用推荐投稿。未证实归属的相似域名与第三方摘要只作线索，不进入规则来源。

## 版本与执行

默认目录升至 v5，v1–v4 文件保留原字节；旧选择和任务继续使用原规则。新增可选 `subjects` 只用于搜索。已核实的要求沿原有规划、生成、精修、历史和检查路径传递；未核实的格式与 AI 操作在报告中保持待确认。所有新期刊均未标“已支持”。

真实文件与模拟链路验证见 [v5 验证](rules-v5-validation.md)。
