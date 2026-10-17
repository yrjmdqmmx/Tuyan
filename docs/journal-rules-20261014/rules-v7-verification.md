# 2026-10-14 · Cell Reports 附件续查与 HSSC 范围复核

默认目录 `2026-10-14.v7`，仍为 13 刊；v1–v6 原文件不改。核验日期不是来源修订日期。本轮不包含真实模型、生产或投稿验证。

## HSSC：将能够判定的部分从冲突中拆出

完整读取并保存本刊[投稿指南](https://www.nature.com/palcomms/author-instructions/submission-instructions)、[投稿清单](https://www.nature.com/palcomms/author-instructions/checklists)、[期刊介绍](https://www.nature.com/palcomms/journal-information)和[编辑政策](https://www.nature.com/palcomms/journal-policies/editorial-and-publishing-policies)。没有找到这些页面的可靠修订日期；HTTP Date 和抓取时间不填入 `updatedOn`。

| 问题 | 核对出的章节关系 | v7 的处理 |
| --- | --- | --- |
| 87/88 mm | 最终制作一般段为 87 mm，照片/位图小节为 88 mm；两处均列 180 mm 双栏。一般段没有明确排除位图，不能将差异直接解释为已证实的矢量/位图分流 | 180 mm 按共同建议值检查；87/88 mm 仅保留单栏适用疑点。其他宽度报告不满足已列建议，不冒充硬性禁令。不再把 180 mm 一并判待确认 |
| 初投、修改 PDF | Making a submission 明确要求遵循初投及修改清单；清单的 Figures and Tables 均排除 PDF。修改范围包括 accepted in principle | 按指南自己引用的特定阶段清单排除 PDF。依据是章节适用关系，不是抓取先后或“较新页面优先”。保留通用格式列表以解释差异 |
| 最终制作 PDF | 通用技术列表包含支持矢量的 PDF，独立最终制作与仍需提交的修改稿分开 | 保留技术格式条目和人工矢量检查。原则录用后的修改仍用 revision，不能改 stage 绕过清单。工作台没有新增 PDF 导出，也不认证可编辑 PDF |

宽度规则增加可选 `value.pendingOneOf`：确定值与待确认值分别表达。预检和文件检查共用 `journalWidthStatus`，使 87/88 mm 不被误报为不满足，180 mm 不被误报为待确认。检查仍针对实际 PNG、SVG 或本次编码的 TIFF；排版宽度是声明的放置尺寸，像素数、有效密度、SVG 内嵌图像能力限制另行报告。

## HSSC AI：适用关系已补证，不能伪造撤销声明

本轮将以下证据加入 HSSC 的快照（其中更新公告此前已被 Scientific Reports 溯源使用，本轮是重新核对并补入 HSSC，不称首次发现）：

- [HSSC 期刊介绍](https://www.nature.com/palcomms/journal-information)明确声明采用 Springer Nature 家族期刊的伦理与编辑政策。不能继续把集团规则当作适用关系完全未知的无关对照。
- [集团政策范围](https://www.springernature.com/gp/policies/about-our-policies)区分自有期刊与代学会出版期刊；本轮结合本刊自己的声明判断，不只根据出版社名称外推。
- [2026-09-10 官方公告](https://group.springernature.com/us/group/media/press-releases/sn-policy-responsible-ai-use/53209516)证实框架更新，链接正式政策和说明页。公告日期不等于每个页面的修订日期，也未逐条宣布 HSSC 本刊图像段落撤销。
- [Nature Portfolio 当前 AI 页面](https://www.nature.com/nature-portfolio/editorial-policies/ai)已采用风险评估框架。
- [正式视觉细则](https://www.springernature.com/gp/policies/editorial-policies/ai-manuscript-preparation)明确涉及生成和修改，并要求材料可核验。
- 但公告所链的[现行 FAQ](https://group.springernature.com/gp/group/ai/ai-guidance-for-researchers-editors-reviewers)仍保留一般不许可及有限例外，并将例外引向正式政策；本刊两页也仍列较窄例外。**这是反对“新公告自动废除本刊段落”的直接证据。** FAQ 另列不含图像的文字/数值展示项边界，不等于所有名为数据图、流程图的输出都自动豁免。

因此，已解决的是集团政策的相关适用关系及更新公告日期，未解决的是较宽视觉条件与本刊有限例外的具体优先关系。v7 分别保存生成、生成式精修和非生成式调整条件；生成/精修仍是人工判断，不自动认可例外。精修已有原图、披露工具或转换 TIFF 都不是许可证明。未知不构造禁令；原始科研图像能力限制不变。未直接复制 Scientific Reports 的解释结论。

## Cell Reports：换附件与模板渠道，未取得现行正文

本轮没有重新消耗在 Authors 主入口的安全验证上。

| 官方目标 | 发现与访问结果 | 不能据此声称的结论 |
| --- | --- | --- |
| [历史作者清单 PDF 下载主机](http://download.cell.com/images/EdImages/cellreports/author_checklist.pdf) | 从旧作者指南的大学镜像定位真实官方地址；HTTP、HTTPS 两次均在 25 秒超时，无正文 | 不把第三方镜像当现行官方规则，也不假定与 2018 GA 规格一致 |
| [带版本号的 GA PDF](https://www.cell.com/pb/assets/raw/shared/figureguidelines/GA_guide-1780933691430.pdf) | 新发现的完整附件地址，直接 HTTP 请求 403，网页读取工具未取得正文 | 文件名中的数字不是经证实的发布日期；不声称 1200×1200 等旧规格已经续证 |
| [Cell Press 作者模板](https://www.cell.com/information-for-authors/article-templates) | 作为获取模板内最终材料清单链接的另一渠道，403 | 未取得模板，不采用第三方或相邻刊模板替代 |
| [Cell Press 图件规范](https://www.cell.com/information-for-authors/figure-guidelines) | 直接请求 403 | 不把 Elsevier 通用图件数值静默复制给本刊 |

复读 [Elsevier 期刊 AI 政策](https://www.elsevier.com/about/policies-and-standards/generative-ai-policies-for-journals)，其仍注明 2026 年 6 月更新，并提示期刊适用范围可能不同。已知出版社分类条件不能补齐尚未读到的 Cell Reports 本刊专项条款。当前能诚实交付的是新渠道、访问结果、规则边界和回归；**本刊现行最终清单、历史规格继续有效及 AI 专项优先关系仍未查实**，不将状态升级为部分/完整适配。

本轮同时修正 v6 遗留的 `cellSubmission` 来源 ID 重复，仅在 v7 去重；v6 历史原字节保持。移除 HSSC `pendingFormats` 时使用删除字段，避免 `undefined` 造成内存与历史 JSON 快照不一致。

## 原始证据与后续缺口

本机证据目录：`/Users/a1-6/.codex/visualizations/2026/10/14/tuyan-journal-rules-v7`。包含 HSSC / Springer 正文 HTML、提取文本、HTTP 头、Cell 失败响应、开发前文件哈希、验证日志及保留核查。抓取失败保存的是错误响应，不标成已读取的 PDF。

仍需能读到的 Cell Reports 现行最终文件清单或期刊正式专项政策；HSSC 需明确单栏段落优先关系与本刊图像政策同步/取代声明。没有联系出版社或启动自动监控。验证结果见 [v7 本地回归](rules-v7-validation.md)。
