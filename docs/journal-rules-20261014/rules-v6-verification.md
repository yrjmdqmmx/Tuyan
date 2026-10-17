# 2026-10-14 · Sage Open、HSSC 接入与 Cell Reports 续查

核验日为 2026-10-14，开发默认规则为 `2026-10-14.v6`。目录从 11 刊增至 13 刊，两本新刊均标“部分支持”。本轮没有上线或调用真实模型。来源页面的发布日期、修订日期与本次核验日期分开；没有可核实的修订日期时不填写。旧刊旧规则没有因为发布 v6 而重写核验日期，v1–v5 文件原字节保留。

## Sage Open：本刊已给出直接继承关系

官方依据：

- [本刊 Submission Guidelines](https://journals.sagepub.com/author-instructions/SGO)，完整读取；Artwork 章节直接链接通用图件规范，作者政策章节直接链接期刊 AI 政策。原候选记录中的访问缺口已补足。
- [Sage 图件规范](https://www.sagepub.com/journals/information-for-authors/preparing-your-manuscript)，由本刊的 Artwork 链接跳转；图片格式、像素密度、字体及图像完整性要求分开读取。
- [Sage 期刊 AI 政策](https://www.sagepub.com/journals/publication-ethics-policies/artificial-intelligence-policy)，由本刊直接链接；不使用 Sage 图书/教材或其他专刊的政策替代。

| 项目 | 接入结论 | 强度和能力边界 |
| --- | --- | --- |
| 像素密度 | 本刊写 300 dpi；链接的图件规范进一步规定栅格至少 300 dpi、线稿至少 800 dpi | 正文图硬要求；按实际像素、排版宽度及作者选择的图像构成检查。不是修改 DPI 元数据即可通过 |
| 格式 | TIFF/JPEG 为图片常用格式，EPS 是图表/线稿优选 | 建议、非穷尽列表；PNG/SVG 接收不能直接判通过或拒绝。当前支持保持像素的 TIFF 导出，EPS 未实现 |
| 宽度与字体 | 未找到本刊统一单/双栏数值；字体字号一致、通常无衬线 | 85 mm 是工作台初始值，不是期刊规定；不补造字号，字体仍人工检查 |
| 包装 | 图按引用顺序编号；外部图件单独上传，Word 内创建的图表留正文 | Word/LaTeX 是稿件格式，不变成图片格式限制。整稿包装仍人工检查 |
| 色彩 | 本刊彩色图可在线彩色显示 | 不把通用印刷黑白说明变成本刊黑白强制要求 |

AI 操作分开处理：

- **生成**：官方列出的适当用途包含代表性插图/信息图，以及研究数据可视化辅助；这是独立于披露要求的许可依据。仍需核对原始依据、披露及编辑评估，禁止虚构数据或将生成图当作新研究证据。正文/补充示意图记为有条件、人工判断，不自动证明当前任务符合。
- **生成式精修**：新增内容仍受上述真实性和披露边界约束，但所读政策没有逐项授予局部重绘、替换等操作许可，记为未逐项规定。不能把文字润色或非生成式调整豁免扩展到改图。
- **非生成式调整**：图件规范对一致调整、保留原始数据和披露给出要求；这不许可生成式重绘。特殊用途 GA/TOC/封面单独保留未核实状态。

## HSSC：本刊技术规范与有限 AI 例外

官方依据：

- [本刊 Submission guidelines](https://www.nature.com/palcomms/author-instructions/submission-instructions)：公开 HTTP 请求取得完整正文；网页工具自身的身份跳转失败不冒充正文。证据保留 HTML 与可读文本。
- [本刊 Editorial and publishing policies](https://www.nature.com/palcomms/journal-policies/editorial-and-publishing-policies)：完整读取生成图像和图像完整性章节。
- [本刊 Submission checklists](https://www.nature.com/palcomms/author-instructions/checklists)：公开请求取得正文，分别读取初投和修改稿清单。
- [Springer Nature 集团视觉 AI 政策](https://www.springernature.com/gp/policies/editorial-policies/ai-manuscript-preparation)：作为范围对照，不能据集团页面直接放宽本刊条件。

| 项目 | 已接入 | 保留的差异或限制 |
| --- | --- | --- |
| 审稿像素密度和大小 | 初投/修改图件至少 300 dpi；优选小于 1 MB | 300 为要求，大小为建议；MB 边界未定义，不伪造统一二进制单位 |
| 格式 | 指南列 PNG、SVG、TIFF 等格式；最终制作可使用列表中的格式 | 初投/修改清单明确排除 PDF，而指南列矢量 PDF。仅 PDF 接收保留冲突，其他格式继续正常检查；当前不提供 PDF 生成/矢量认证 |
| 最终宽度 | 一般段单栏 87 mm，照片/位图段 88 mm；双栏都为 180 mm | 两段是否有不同适用优先级不能证实，保留来源差异。180 mm 为共同值和本刊初始排版选项；单栏差异不静默统一 |
| 最终矢量/位图 | 线稿、图表和示意图优先原生矢量，EPS 优选；位图仅必要时采用。照片/位图 TIFF 优选、JPEG 可用；300 dpi 带“如可行”条件 | SVG 接收不证明可编辑矢量；位图必要性和矢量内容人工判断，最终推荐不冒充初投硬要求 |
| 最终色彩与线宽 | 位图 RGB/CMYK；线条至少 1 pt | 文件色彩信息可查，所有字体/线条无法可靠自动认证 |
| 文字、面板与整稿 | 清晰一致的无衬线字、粗体小写面板号、一图一文件，图注在正文末尾 | 无统一数字字号；最多 12 个展示项及匿名信息按整稿人工核对 |
| 补充材料 | 独立编号、图注靠近补充图，按规定合并补充材料 | 50 MB 是合并文件上限，不套为单图阈值；正文规则不外推到补充用途 |

两份**本刊**页面均列有限的生成图像例外：出版方合同机构的合法供图；直接涉及 AI 的研究逐案审查；基于特定可归属、可核验科学数据开发的工具并满足伦理、权利和条款。例外图还须在图内标明 AI 生成。非生成式机器学习处理、组合或增强已有图像则要求图注披露并逐案审查。

这不是“披露即可生成”。本刊生成与生成式精修均按这些具体例外人工判断；普通通用模型加提示词不自动满足例外，工作台不认证例外成立。精修不能借非生成式调整段落取得重绘许可。原始科研图像继续受工作台能力限制。

集团页面与本刊页面的表述范围不同。未找到可靠页面修订日期、替代声明或可证明集团较宽条件已覆盖本刊的依据，故保留冲突证据，使用本刊具体条件而不复制 Scientific Reports 的结论。这部分不能宣称冲突已经消除。

## Cell Reports：新增可访问渠道与具体阻碍

| 官方渠道 | 本轮结果 | 能说明什么 |
| --- | --- | --- |
| [Cell Press 中文期刊导航](https://cellpress.elsevier.cn/journals) | 浏览器读取期刊列表，Cell Reports 仍链接本刊 cell.com 主页 | 证明入口归属；没有指南镜像 |
| [Cell Press 官方作者支持](https://www.elsevier.support/cell-press/answer/where-can-i-find-information-on-journal-article-publishing) | 可读，页面注明更新 2026-03-02；引导作者支持与 HealthAdvance | 没有图件阈值或本刊 AI 专项条款；HealthAdvance 请求 403 |
| [Editorial Manager 本刊公开入口](https://www.editorialmanager.com/cell-reports/default.aspx) | 可读；Instructions For Authors 仍链接本刊 information-for-authors，后者 403 | 不是另一份作者指南。公开页有开发状态提示，不据此判断真实投稿状态；未登录、未提交 |
| [ScienceDirect 本刊作者指南入口](https://www.sciencedirect.com/journal/cell-reports/publish/guide-for-authors) | 403 | 未取得正文 |
| [Cell Reports Authors](https://www.cell.com/cell-reports/authors) | 浏览器等待后仍停留安全验证 | 未绕过验证；不能称已阅读现行指南 |
| [Elsevier 期刊 AI 政策](https://www.elsevier.com/about/policies-and-standards/generative-ai-policies-for-journals) | 再读到 2026 年 6 月更新及分类型条件；页面提示具体期刊适用范围可不同 | 出版社规则已知，本刊专项范围仍缺证据 |

**仍未解决**：现行最终文件清单；2018 年 GA 历史尺寸/格式是否继续有效；本刊目前的生成、生成式精修条款与出版社规则的确切适用关系。本轮补入新渠道的来源和日期，没有把邻刊、会议、第三方“2026 指南”、旧 PDF 或未取得的正文提升为现行标准。Cell 继续待核实；历史参考值不参与达标判定。前轮历史资料详见 [v5 记录](../journal-rules-20261013/rules-v5-verification.md)。

## 执行与检查边界

新期刊复用原有设置与信息图类别，规则快照经请求、规划、生成、精修、历史和实际文件检查传递。线稿选择由当前规则是否按图像构成区分像素密度决定，不再写死期刊名单；因此 Sage 可选线稿，切换到没有相应阈值的用途则隐藏此控件。已有任务精修继承原图设置，换原图的隔离逻辑保留。

未知/冲突不作为自行创造的官方禁令，有条件规则不变成已获许可。确定性检查针对实际文件；AI 条件、科学真实性、字体和原生矢量能力等报告为无法自动检查，不能因转换 TIFF 或修改元数据而通过。回归与证据见 [验证记录](rules-v6-validation.md)。
