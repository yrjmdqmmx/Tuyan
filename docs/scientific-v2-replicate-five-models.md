# Replicate 五模型评测与公开费用

2026-09-16 用户授权新增 20 USD 预算：Replicate GPT Image 2、Nano Banana 2 Lite、Nano Banana 2、Nano Banana Pro、Nano Banana，每模型沿用 6 生成 + 3 编辑。审评 A、B 和必要仲裁均使用 GPT-6 Astra / xhigh，独立新上下文只接收盲包。45 题按当前官方单价预计 4.068 USD；执行与账单核对完成前不将计划费用记为实扣。

| Replicate 型号 | 固定请求档位 | 官方美元单价 / 输出图 | 9 图计划 |
| --- | --- | ---: | ---: |
| openai/gpt-image-2 | 原生 auto 质量 / 默认尺寸 | 0.128 | 1.152 |
| google/nano-banana-2-lite | 默认尺寸 | 0.034 | 0.306 |
| google/nano-banana-2 | 2K | 0.101 | 0.909 |
| google/nano-banana-pro | 2K，禁止模型回退 | 0.15 | 1.35 |
| google/nano-banana | 默认尺寸 | 0.039 | 0.351 |

价格来源为各型号 `https://replicate.com/<owner>/<model>` 官方页面的完整 `billingConfig.current_tiers`。保护执行器重新抓取并核对精确价档、计费项、金额、相同页面重复配置、原始字节哈希与汇率。价格或档位变化即停止签名。统一 16:9、PNG、单图；Nano Banana 2 显式关闭 web / image search，Pro 显式禁止 fallback。目录 v19 新增 Nano Banana 2 Lite，官方版本哈希仅代表目录快照，不等同于实际 prediction 返回版本。

新五模型只在签名 expansion 的目标型号被启用；不全局改变旧清单白名单。每题最多一次付费提交，结果未知必须核对原 prediction，不能重新提交。全部保护步骤沿用 [单模型增量流程](scientific-v2-single-model-expansion.md)。

## GPT Image 2 替换

单模型 expansion 可额外包含 `replacesModelId: "codex:gpt-image-2"`，且仅允许 `targetModelId: "openai/gpt-image-2"`。冻结时验证旧模型确实存在、新模型不存在，执行仍只有九个新题位；正常双独立审评、仲裁及证据生成完成后，在既有事务和 active release CAS 内替换。其他模型除排名外完全继承；旧 release、模型证据、评分和调用历史保持不变。没有描述符时仍严格使用原来的新增模型语义。

## 费用字段

`benchmarkModelProfile.profile.costSummary` 包含题目总数、有费用记录题数、已核对题数及各币种合计。模型 / 题目详情的 `evidence[].cost` 包含 `currency`、十进制字符串 `amount` 和 `basis`：

- `invoice_reconciled`：原始账单型号数量、档位单价与每题唯一 prediction / 输出哈希匹配；公共注释绑定 manifest、型号、题目、输出哈希及尝试数。私有原始凭据不公开。
- `official_rate_calculated`：一条成功调用、一个输出，按冻结时单一按图价格精确核算，尚未声称账单实扣。
- `budget_estimate`：原执行器的人民币预算记账额，可能含上限和失败尝试，必须标明估算。
- `not_called`：持久化题位证明没有调用，金额为零。
- `unavailable`：无法确认金额；包括 Codex 内置订阅渠道不可按题拆账的历史记录，金额为 null。

费用为读取时的附加注释，沿当前不可变 release 的 ancestry 查找对应已发布批次，校验状态哈希、题目状态、尝试摘要和输出哈希。不会重写历史 release 或评分来补金额；未知金额不按零计算，不混加 USD 和 CNY，也不将审评或账户充值计入图片费用。后续真实账单证据通过受审版本补充 `scientific-v2-billing-evidence.ts`，公开端不包含账号余额、密钥、prediction ID、私有账单链接。
