# 七个模型按已核对测试费用加入帕累托视图（2026-09-20）

按用户后续授权，仅对下列七个模型使用既有正式测试费用。官方价格目录与核验结论独立保留，不将历史实扣改称当前官方标准价。

默认视图为 28 个官方标准报价 + 7 个测试账单报价，共 35 个模型；可以切换为“仅官方定价”，恢复 28 个模型。两类来源共同参与默认前沿，页面、图点、详情和费用表均明确标注“测试费用”，轴标题改为“单张折算成本（USD/张）”。这不是全部采用厂商直营标准价的比较。

计算为当前正式九题逐题已核对账单之和 ÷ 9（6 道生成、3 道编辑，每题等权）。七个模型均有完整 9/9 题 invoice_reconciled 记录，逐题金额与模型 billedAmount / amount 合计一致；包含当前题位内的调用尝试，不含审评费用。未知金额不补零；失败沿用记录中的核对金额，不推断免费。本次没有任何新生图、付费推理或模型测试。

| 模型 | 准确 ID | 原渠道 | 九题合计 USD | USD/张 | 账单完整性 | 读取日期 | 公开来源 |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| Nano Banana 2 Lite | google/nano-banana-2-lite | Replicate · 原正式测试渠道 | 0.306 | 0.034 | 9/9 invoice_reconciled | 2026-09-20 | [模型费用与逐题证据](https://www.paperbanana.asia/leaderboard?__route=%2Fleaderboard%2Fmodels%2Fgoogle%252Fnano-banana-2-lite%253Acodex_scientific_v2%253Acodex-scientific-2026-09-v1) |
| Nano Banana 2 | google/nano-banana-2 | Replicate · 原正式测试渠道 | 0.909 | 0.101 | 9/9 invoice_reconciled | 2026-09-20 | [模型费用与逐题证据](https://www.paperbanana.asia/leaderboard?__route=%2Fleaderboard%2Fmodels%2Fgoogle%252Fnano-banana-2%253Acodex_scientific_v2%253Acodex-scientific-2026-09-v1) |
| Nano Banana Pro | google/nano-banana-pro | Replicate · 原正式测试渠道 | 1.35 | 0.15 | 9/9 invoice_reconciled | 2026-09-20 | [模型费用与逐题证据](https://www.paperbanana.asia/leaderboard?__route=%2Fleaderboard%2Fmodels%2Fgoogle%252Fnano-banana-pro%253Acodex_scientific_v2%253Acodex-scientific-2026-09-v1) |
| Nano Banana | google/nano-banana | Replicate · 原正式测试渠道 | 0.351 | 0.039 | 9/9 invoice_reconciled | 2026-09-20 | [模型费用与逐题证据](https://www.paperbanana.asia/leaderboard?__route=%2Fleaderboard%2Fmodels%2Fgoogle%252Fnano-banana%253Acodex_scientific_v2%253Acodex-scientific-2026-09-v1) |
| GPT Image 2 | openai/gpt-image-2 | Replicate · 原正式测试渠道 | 1.152 | 0.128 | 9/9 invoice_reconciled | 2026-09-20 | [模型费用与逐题证据](https://www.paperbanana.asia/leaderboard?__route=%2Fleaderboard%2Fmodels%2Fopenai%252Fgpt-image-2%253Acodex_scientific_v2%253Acodex-scientific-2026-09-v1) |
| GPT Image 2.5 Sunburst | openai/gpt-image-2.5-sunburst | Replicate · 原正式测试渠道 | 2.25 | 0.25 | 9/9 invoice_reconciled | 2026-09-20 | [模型费用与逐题证据](https://www.paperbanana.asia/leaderboard?__route=%2Fleaderboard%2Fmodels%2Fopenai%252Fgpt-image-2.5-sunburst%253Acodex_scientific_v2%253Acodex-scientific-2026-09-v1) |
| GPT Image 2.5 Flare | openai/gpt-image-2.5-flare | Replicate · 原正式测试渠道 | 2.25 | 0.25 | 9/9 invoice_reconciled | 2026-09-20 | [模型费用与逐题证据](https://www.paperbanana.asia/leaderboard?__route=%2Fleaderboard%2Fmodels%2Fopenai%252Fgpt-image-2.5-flare%253Acodex_scientific_v2%253Acodex-scientific-2026-09-v1) |

## 可追溯性与数据保护

- 只读取得七个公开 benchmarkModelProfile 响应，核对准确模型 ID、profileId、releaseHash、九个题位、图像 hash、源图 hash、状态、像素和请求分辨率。
- 测试费用快照独立保存于 `apps/web/src/data/benchmarkTestCosts.json`，保留每题金额、账单证据 hash 和 verifiedAt；官方目录未修改。
- 加载时检查产物绑定、USD 币种、invoice_reconciled 状态、九题金额及合计。缺失、未对账、原图变化或合计不符时不入图；更改评语或评分不改变费用。
- 原 Nano Banana 已发布重测后的当前九题合计为 $0.351。旧失败题和旧版本保持原样，不把旧成功题与当前题位重复累计。
- 正式公开榜单仍为 46 个模型；已撤榜 Riverflow V2 Pro 和已替换 codex:gpt-image-2 不得重新出现。

## 验证

Web 全量测试 434/434 通过，新增七模型接入、账单完整性、产物绑定、已核对失败费用、两种来源切换测试。生产构建通过。浏览器 40 项验收通过，包括两种成本来源下全部 11 个评分选项与独立前沿计算器的对照、七模型金额、来源标签、缺价处理、筛选和响应式布局；无脚本异常、控制台错误或失败请求。

本地预览：<http://localhost:5196/leaderboard/?view=pareto>。尚未进行生产部署；公开分数、评语、生成证据及历史费用未改写。
