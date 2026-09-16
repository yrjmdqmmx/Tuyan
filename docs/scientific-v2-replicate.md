# Replicate GPT Image 2.5 正式评测

本次范围是两个官方型号 `openai/gpt-image-2.5-sunburst`、`openai/gpt-image-2.5-flare`。各自沿用单模型增量工作流；先发布第一个，再以新的 active release 冻结第二个。每批固定 6 道生成、3 道编辑，继承已有模型所有非排名字段。完整运行、双独立盲审、必要的 xhigh 仲裁及原子发布均使用现有受保护入口。

## 执行与历史兼容

签名 registry authority 在 Replicate 存在时包含该渠道；历史三渠道 authority 和批次仍重建为原始字节语义。新增正式评测白名单仅含上述两个型号。旧 OpenRouter OpenAI/Google 排除规则不变，Replicate 的真实 provider 标识贯穿冻结、调用、导入与发布。

Replicate 使用现有官方模型创建预测接口及只读轮询。输出单张 PNG，画幅 16:9，平台自动尺寸；`quality` 沿用原生默认 `auto`。目录里的 `resolutions:["auto"]` 明确映射为 `provider-default`，不能标记为强制 2K。共享题目、负向约束、编辑源图和十维权重不变。

每个 Replicate 题位最多提交一次。已失败的题位不重试；未知结果停跑并按原预测 ID 核对，不能重新提交来探测是否成功。其他渠道的既有重试策略不变。发布 methodology 标明 Replicate 的一次提交限制。单模型 canary 全部失败的终态仍允许完成受保护的 canary 状态导入，以便按原协议记录失败。

`PAPERBANANA_BENCH_REPLICATE_API_TOKEN` 是可选 Worker 专用凭据，由现有 `configure-benchmark-credentials` workflow 从加密 secret 配置，原值不进入日志、代码或 Core 环境。常驻 Worker 继续 `enabled=false`、并发 1；只有签名的一次性操作可以执行付费请求。后续旧格式凭据 bundle 不会意外删除该可选 Worker token。

现行 registry 的四渠道子集约 58,561 个数据节点、深度 9；有界校验上限调整为 100,000 节点、深度 10，仍保留每数组 512 项和每字符串 4,096 字符限制。

## 费用证据

2026-09-16 官方页面的 `billingConfig.current_tiers` 显示两型号 `auto` 均为每输出图 0.25 USD：

- https://replicate.com/openai/gpt-image-2.5-sunburst
- https://replicate.com/openai/gpt-image-2.5-flare

准备阶段重新抓取确切官方页面和 ECB 汇率，保存原始字节哈希。提取器只接受唯一的 auto 价档、单一 `image_output_count` 计费项及 0.25 USD；同页面重复配置必须完全一致。单价变化或证据缺失会拒绝签名。美元计价和人民币预算分别保留；明确价格不伪装成人工上限，签名快照 `operatorAuthorizationHash=null`，受保护价格授权封套无上限条目。

两模型合计授权预算 10 USD；成功九题的单模型计划费用为 2.25 USD，总计划费用 4.50 USD。记录每题预测 ID、返回模型版本、质量档、状态、输出数、对应题位和原始响应证据。费用报告按模型区分官方单价核算、账单实扣以及尚未结算的失败/未知请求。不能把预算上限、人民币保护值或计时 metrics 当作美元实扣。任何需要追加付费调用的情况均先核对已有预测，不能自动重跑整批。

生产步骤和严格的 SHA、digest、baseline、batch 绑定见 [单模型增量流程](scientific-v2-single-model-expansion.md)。部署、实际调用、审评与发布证据在执行后单独补齐。

## 接入验证

本地 Benchmark Core 67/67、Worker 193/193、API 492/492、运维契约 92/92 通过，各包类型检查通过。新增测试覆盖两模型九题冻结、旧签名兼容、auto 价格与签名、价格变更拒绝、单次提交和可选密钥隔离；以当前线上 v18 registry 重建验证也通过。这些是执行器验证，实际模型调用和评分另记。
