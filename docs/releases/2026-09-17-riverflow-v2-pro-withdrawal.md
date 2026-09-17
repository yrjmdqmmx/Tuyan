# Riverflow V2 Pro 撤榜

按用户要求撤下准确 ID `sourceful/riverflow-v2-pro`。统一公开读取策略覆盖 Scientific V2 总榜、全部维度榜、模型详情及逐题比较；其他 46 个模型保留原分数和评语，仅按原 competition 规则重新计算综合、维度及题位展示名次。

该操作不改写不可变评测 release，也不删除图片、生成批次、审评记录或费用。公开 API 的 `releaseHash` 继续标识原始评测证据版本 `8e6619b57c6979d9c5687893afa64fa40a81b5976f49d1466506d3b4a9ddd2fc`，`eligibleModelCount` 与模型列表反映撤榜后的 46 个可见模型；撤榜策略随运行代码版本追踪。原版本的生成数量与方法元数据作为历史事实保留。

`sourceful/riverflow-v2-fast`、`sourceful/riverflow-v2.5-pro`、`sourceful/riverflow-v2.5-fast` 不受撤榜规则影响。旧 `codex:gpt-image-2` 不重新入榜。没有重新生图、审评或新增模型测试。

本地验证：554 项 Core 测试通过；专项检查覆盖准确 ID、近似型号保留、总榜/详情/逐题入口、并列排名、原始 release 与题位不可变。线上部署与完整验收另附运行记录。
