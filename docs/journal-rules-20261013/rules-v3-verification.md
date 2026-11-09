# 2026-10-13 · Cell Reports / IEEE Access / Scientific Reports 续查

> 本文记录 v3 当时结论。后续已补查 Scientific Reports FAQ 的例外链接及 Cell 官方历史说明，见 [v4 复核](rules-v4-verification.md)；旧任务仍保留 v3 证据。

核验日期：2026-10-13（Asia/Shanghai）。这是开发阶段规则补充，未上线。默认目录为 `2026-10-13.v3`，v1/v2 原文件保留。没有把报告、第三方博客、搜索结果中的数字直接导入正式规则。

## 结论与仍未解决的事实

| 期刊 | 生成新图 | 生成式精修 | 非生成式调整 | 尚缺什么 |
| --- | --- | --- | --- | --- |
| IEEE Access | 未逐项规定具体许可边界；披露义务已确认 | 未找到专门授权重绘、局部替换、增删图像的条款 | 所查 AI 条款未单列图像调整许可 | 精确图像操作边界；不能从文字润色例外推定 |
| Scientific Reports | 官方来源冲突 | 官方来源冲突，不能套用文字润色例外 | AI Hub FAQ 要求披露并由编辑逐案评估 | 详细视觉政策与 FAQ 的明确优先关系或取代说明 |
| Cell Reports | 本刊适用关系待核实 | 本刊具体条款待核实 | 本刊当前完整性条款未取得 | 本刊图件规格、Cell Press 专项 AI 条款及例外 |

“未逐项规定”表示已经读取所列官方文件，但其中没有给出本工具操作的明确许可边界；不表示期刊无政策。“未取得”表示访问证据不足。两者都不能写成官方禁止或官方允许。表中的生成式精修包括模型重绘、局部生成替换和增删内容；当前图研精修不能归为非生成式调整。

## IEEE：已读取正式出版手册

- [IEEE Access 准备稿件页面](https://ieeeaccess.ieee.org/authors/preparing-your-article/)：本刊披露条款与真实性要求。
- [IEEE Author Center 投稿政策](https://journals.ieeeauthorcenter.ieee.org/become-an-ieee-journal-author/publishing-ethics/guidelines-and-policies/submission-and-peer-review-policies/)：直接链接下列手册。
- [PSPB Operations Manual](https://pspb.ieee.org/images/files/files/opsmanual.pdf)：封面标记 Amended 25 June 2026。核读印刷页 5–6 的 AI 出版伦理原则、106–107 页 §8.2.1.B.10–11，并检索全文 AI / fabrication 相关位置。

手册明确要求作者核对 AI 产物的准确性与抄袭风险，说明 AI 生成内容及其涉及部分、系统和使用程度，并禁止伪造。文字润色例外限于不改变含义、不增加新思想的文字处理。这些条款证明了义务和限制，不能单独充当所有图像生成、修改的许可。

结论不升级成“全面允许”，也不继续使用“尚未证明允许，所以禁止”。生成与精修分别记 `unspecified`，保留披露及真实性要求。

手册证据 SHA-256：`7e455b3ecaacd937937c8c866ee6a4c3957e3d0a15af7e96847fc89b36f2327d`。原 PDF 和文字提取保存在本轮本地证据目录。

## Scientific Reports：发现并保留官方冲突

已通过浏览器完整读取 [本刊 AI 政策](https://www.nature.com/srep/journal-policies/ai) 和 [Nature Portfolio AI 政策](https://www.nature.com/nature-portfolio/editorial-policies/ai)。两处均采用风险框架：可核验、人工负责、保护完整性；禁止伪造及替代学术判断。不是给当前模型输出自动发放许可。

核对到的链接链为：本刊/Nature Portfolio AI 页面 → [AI Hub](https://group.springernature.com/gp/group/ai) → [研究者指引与 FAQ](https://group.springernature.com/gp/group/ai/ai-guidance-for-researchers-editors-reviewers) → [正式期刊政策索引](https://www.springernature.com/gp/policies/editorial-policies) → [稿件准备细则](https://www.springernature.com/gp/policies/editorial-policies/ai-manuscript-preparation)。

详细视觉条款与 FAQ 对生成式图像的表述存在冲突。FAQ 仍表示通常不接受此类图像，并排除纯文字、数值显示项；非生成式调整须在图注说明以供逐案评估。不能由信息图图型或 SVG 文件格式推断成图已满足这些例外。

本轮未找到明确的修订生效时间或取代声明，不能用页面抓取先后消除矛盾。两份来源共同挂在生成、精修规则上，状态为 `conflict`；详细条款不是继续标为“没有查到”，也不据其单独放行成“官方已允许”。现有“不接受图形摘要”专刊要求仍独立保留。

## Cell Reports：替代官方渠道及实际结果

| 官方渠道 | 实际结果 | 可据此确认什么 |
| --- | --- | --- |
| [本刊作者页](https://www.cell.com/cell-reports/information-for-authors)、旧 authors 入口 | 正文访问受限 | 不能确认现行技术数值 |
| [ScienceDirect Guide for Authors](https://www.sciencedirect.com/journal/cell-reports/publish/guide-for-authors) | 403 | 未取得替代正文 |
| [Editorial Manager 本刊公开入口](https://www.editorialmanager.com/cell-reports/) | 已读取；公开说明指向 cell.com | 确认本刊投稿入口；不证明技术或 AI 要求；未登录、未提交 |
| [Cell Press 中央政策](https://www.cell.com/cell/information-for-authors/journal-policies) | 浏览器停留自动安全检查 | 未取得本刊可能继承的专项条款；没有绕过验证 |
| [官方检查表旧下载](https://download.cell.com/images/EdImages/cellreports/author_checklist.pdf) | 下载连接超时 | 未取得文件；不能使用旧转载代替 |
| [官方 GA PDF](https://www.cell.com/pb/assets/raw/shared/figure-guidelines/GA_guide.pdf)、[模板页](https://www.cell.com/information-for-authors/article-templates)、[图件页](https://www.cell.com/information-for-authors/figure-guidelines) | 未取得可读取正文/文件 | 不导入第三方表格的毫米数、DPI、大小或字体 |
| [Elsevier 2026-08-18 更新公告](https://www.elsevier.com/connect/updated-generative-ai-policies-for-journals-supporting-responsible-use-while-protecting-trust) | 浏览器完整读取 | 出版社已按示意图、数据图、原始图像、GA、封面分类；仍缺 Cell Reports 专项映射 |

出版社公告可证实政策已更新，不能据此自动套用到 Cell Reports。第三方内容仅用于寻找官方链接，没有作为规则证据。Cell Reports 因本刊技术规则与适用关系均不足，继续标记“待核实”；未改成“已支持”或“禁止 AI”。没有发送邮件、登录投稿账号或提交询问。

## 实现决定

- `aiPolicy` 分别记录 `generate`、`generative-refine`、`non-generative-edit`；状态区分 `conditional / prohibited / unspecified / conflict / unverified`。
- v3 未明确或冲突的政策产生提示，并进入任务上下文、快照、历史与导出报告；不生成 `allowAI:true`，也不凭信息不足阻断执行。能执行工作流不代表期刊已许可。
- 已核实的 ACS TOC、AMI 封面、Scientific Reports GA 限制，以及原始科研图像能力限制保持。改文件格式不能消除限制或待确认状态。
- 所有期刊仍为部分支持或待核实。v1/v2 任务继续按原版本追溯；没有线上迁移。

本地验证与证据见 [rules-v3-validation.md](rules-v3-validation.md)。
