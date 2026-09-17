# Riverflow V2 Pro 撤榜

按用户要求撤下准确 ID `sourceful/riverflow-v2-pro`。统一公开读取策略覆盖 Scientific V2 总榜、全部维度榜、模型详情及逐题比较；其他 46 个模型保留原分数和评语，仅按原 competition 规则重新计算综合、维度及题位展示名次。

该操作不改写不可变评测 release，也不删除图片、生成批次、审评记录或费用。公开 API 的 `releaseHash` 继续标识原始评测证据版本 `8e6619b57c6979d9c5687893afa64fa40a81b5976f49d1466506d3b4a9ddd2fc`，`eligibleModelCount` 与模型列表反映撤榜后的 46 个可见模型；撤榜策略随运行代码版本追踪。原版本的生成数量与方法元数据作为历史事实保留。

`sourceful/riverflow-v2-fast`、`sourceful/riverflow-v2.5-pro`、`sourceful/riverflow-v2.5-fast` 不受撤榜规则影响。旧 `codex:gpt-image-2` 不重新入榜。没有重新生图、审评或新增模型测试。

本地验证：554 项 Core 测试通过；专项检查覆盖准确 ID、近似型号保留、总榜/详情/逐题入口、并列排名、原始 release 与题位不可变。线上部署及核验已完成，见下方记录。

## 正式部署与核验

- [PR #212](https://github.com/yrjmdqmmx/Tuyan/pull/212) 全部 CI 通过，合并及运行 SHA：`df2c0b33ad4c3f425eced4c68fbe98cc28c95e5e`。Core 和 Benchmark Worker 使用固定 digest，Worker 保持 disabled / concurrency=1。
- [部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35194175508) 与 [发布后只读核验](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35194742953) 均成功。没有发起生图或审评调用。
- 公开 API 的 46 个模型及其 414 条内嵌题位证据与基线逐项比对，仅允许撤榜和名次变化；总分、轴分、评语和图片元数据保持。
- 顺序抽查 GPT Image 2、Qwen Image 3.0 Pro、Riverflow V2.5 Pro 的完整详情，以及全部九题的比较列表首页，分数、评语、图片、费用和展示名次一致。目标按 modelId / profileId 查询均返回 404。
- 8 组数据库集合前后哈希完全一致：72 个 release、5085 条公开题位证据、27 个生成批次、2950 条派发记录、70 份原审评产物、1 个重评会话、1 个当前指针、13 条发布生命周期记录。
- 浏览器确认总榜与结构拓扑榜为 46 模型，目标型号不再出现；旧详情链接不再展示。官方 GPT Image 2 现为综合第 1，原分数 8.90813492063492 不变。
- 并发详情读取曾触发既有网关超时，改为顺序读取后核验通过；未将失败响应当作数据一致性证明。

[结构化核验摘要](2026-09-17-riverflow-v2-pro-withdrawal-verification.json)。
