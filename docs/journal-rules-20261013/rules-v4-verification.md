# 2026-10-13 · Cell Reports 续查与 Scientific Reports 适用关系复核

核验日期为 2026-10-13；开发默认规则为 `2026-10-13.v4`。本轮结论在 v3 上增量补充，旧任务继续使用原快照。没有真实模型调用、上游同步或发布。

## Scientific Reports：从笼统冲突改为有范围的附条件判断

### 时间证据

| 来源 | 可确认的时间 | 时间不能证明的事 |
| --- | --- | --- |
| [Springer Nature 更新公告](https://group.springernature.com/de/group/media/press-releases/sn-policy-responsible-ai-use/53209516) | 2026-09-10 发布 | 公告不是每个网页/段落的修订记录，也没有宣布 FAQ 作废 |
| [AI 指引与 FAQ](https://group.springernature.com/gp/group/ai/ai-guidance-for-researchers-editors-reviewers) | 页面正文未标修订日期；本轮读取 2026-10-13 | 不用页脚版权年份或抓取时间充当更新时间 |
| [稿件准备与视觉内容细则](https://www.springernature.com/gp/policies/editorial-policies/ai-manuscript-preparation) | 页面正文未标修订日期；本轮读取 2026-10-13 | 不能声称细则比 FAQ 更新，或反过来 |

补充 HTTP 元数据读取遇到本机 Python 证书链错误，未关闭证书校验。已读网页的正文及链接关系不依赖这次失败的请求；最终不填两份页面的 `updatedOn`。公告只填 `publishedOn`。

### 适用范围与解释依据

1. [Scientific Reports 本刊编辑政策](https://www.nature.com/srep/journal-policies/editorial-policies)说明采用 Nature Portfolio 政策，专刊另有说明时以专刊为准。[本刊 AI 页面](https://www.nature.com/srep/journal-policies/ai)和 [Nature Portfolio AI 页面](https://www.nature.com/nature-portfolio/editorial-policies/ai)均引导至出版社 AI Hub。
2. FAQ 在图像问题中写的是一般不允许，并明确把例外指向[正式期刊政策索引](https://www.springernature.com/gp/policies/editorial-policies)。同页也区分了书籍和期刊政策链接；本轮沿期刊链接进入视觉细则，没有套用书籍政策。
3. 9 月公告同时链接正式政策与研究者 FAQ，支持二者共同构成当前政策说明，不能用公告将其中一份删除。
4. 据此，以具体视觉条件解释 FAQ 的一般表述，有充分的链接与范围依据。**这是本项目对官方材料的适用解读，不是发现了官方优先级条文或替代声明。** 不再把所有生成/精修统一标成 `conflict`；两个来源都保留。

本轮执行范围是正文及补充图。生成和生成式精修分别记 `conditional`，涉及来源核验、人工审查、忠实性、权利及披露；文件检查不能认证这些条件。现有原图和文字输入不会自动成为“已核实来源”。仅有提示词、无法核验的合成画面不能被解释为符合条件。

本刊不接受图形摘要的专属规则仍独立生效；TOC/封面没有由上述判断自动升级为获准。原始科研图像仍受本工具生成式流程的能力限制。非生成式调整与当前模型精修继续分开。FAQ 其他文字编辑表述不属于本轮图件适配范围，没有顺带宣称整页所有政策矛盾均已解决。

## Cell Reports：已取得的官方材料与剩余缺口

| 官方材料 | 本轮取得的事实 | 落地边界 |
| --- | --- | --- |
| [Cell Mentor 图形摘要说明](https://crosstalk.cell.com/blog/attract-readers-at-a-glance-with-your-graphical-abstract) | 2018-04-04 发布，明确注明 2018-09-10 更新；含本刊编辑/出版人员说明；单面板正方形、1200×1200 px、300 dpi、Arial 12–16 pt、TIFF/PDF/JPG | 仅录用后 GA 历史参考；未证实 2026 年现行性，不套用正文/补充图，不触发“达标” |
| [Cell Mentor 图像筛查说明](https://crosstalk.cell.com/blog/what-to-do-if-your-paper-is-flagged-in-image-screening?hs_amp=true) | 2019-05-30；直接讨论本刊原始数据与面板对应、亮度/对比度处理一致及结论不变 | 补入科研图件人工检查；不能据此允许模型重绘 |
| [Patterns 官方社论](https://doi.org/10.1016/j.patter.2026.101663) | 2026-09-11；官方索引全文明确提及解释性图件有限使用 AI，并指向 Cell Press / Elsevier 政策 | 纠正“Cell Press 一律禁止”的概括；Patterns 的专项范围不能替代 Cell Reports |
| [Elsevier 正式期刊 AI 政策](https://www.elsevier.com/about/policies-and-standards/generative-ai-policies-for-journals) | 页末明确标注 2026 年 6 月更新；8 月 18 日为另一个公告日期 | 出版社条件已知；仍不能单凭同一出版社认定所有本刊例外均已核实 |

继续核对的替代渠道与结果：

- [Cell Reports 本刊政策](https://www.cell.com/cell-reports/information-for-authors/journal-policies)：浏览器自动安全检查，正文仍未取得，未绕过。
- 图形摘要文章真实链接为 [GA_guide.pdf](https://www.cell.com/pb/assets/raw/shared/figureguidelines/GA_guide.pdf)，路径是 `figureguidelines`。纠正 v3 记录中的旧路径；该真实链接本轮仍返回 403，不能称已读 PDF。
- [Cell Press 中文官网资料下载](https://cellpress.elsevier.cn/download)：实际只有 4 项 2023/2024 年系列期刊手册，没有找到现行图件检查表。
- Elsevier Researcher Academy 的[本刊编辑投稿课程](https://researcheracademy.elsevier.com/publishing-premium-journals/cell-press/publish-high-quality-journals-manuscript-preparation)及[伦理课程](https://researcheracademy.elsevier.com/publishing-premium-journals/cell-press/ethics-copyright-insights-research-publishing-cell-press)：公开页介绍可读，未找到公开的现行图件/AI 条款附件；没有把课程标题当政策内容。

剩余缺口已缩小为：Cell Reports 现行正文图技术表、现行最终材料清单对历史 GA 规格的确认，以及本刊 AI 专项条款/继承关系。菜单仍为待核实，但不再是空泛占位；每项新增事实都有日期、用途和出处。没有以“未查明”创造禁令，也没有把历史参考转为当前硬性要求。

## 工程处理

- 新默认版本 v4，v1/v2/v3 目录原字节保留；规则、来源、日期随任务快照进入生成、精修、历史和导出。
- 来源可选增加 `publishedOn/updatedOn`，与 `verifiedOn` 分开展示。无证据时不填日期。
- Scientific Reports 条件报告为人工判断/无法自动检查；Cell 历史 GA 参考报告为待确认。转换 TIFF、DPI 元数据及 SVG 文件都不能将其变成通过。
- 未改变模型选择、研究数据、图像分类复用或换图后的来源绑定。

验证结果见 [rules-v4-validation.md](rules-v4-validation.md)。
