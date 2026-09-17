# Scientific V2 既有产物重评范围冻结

基线：bench-scientific-v2-release-8b7dcbc5447676487a70
范围哈希：44d1b541a84a49b208025addc89295da99f419997f6fdc980a37d5d5aef4177e

47 个当前模型 = 40 个重评 + 7 个保留；360 + 63 = 423 固定题位。新增生图调用上限：0。

## 重评准确 ID（40）

- `black-forest-labs/flux.2-flex`
- `black-forest-labs/flux.2-klein-4b`
- `black-forest-labs/flux.2-max`
- `black-forest-labs/flux.2-pro`
- `doubao-seedream-4-0-250828`
- `krea/krea-2-large`
- `krea/krea-2-medium`
- `krea/krea-2-medium-turbo`
- `microsoft/mai-image-2.5`
- `microsoft/mai-image-2.5-pro`
- `microsoft/mai-image-2.6`
- `qwen-image-2.0`
- `qwen-image-2.0-pro`
- `qwen-image-3.0-pro`
- `qwen/qwen-image-3`
- `recraft/recraft-v3`
- `recraft/recraft-v4`
- `recraft/recraft-v4-pro`
- `recraft/recraft-v4-pro-vector`
- `recraft/recraft-v4-styles-pro-vector`
- `recraft/recraft-v4-styles-vector`
- `recraft/recraft-v4-vector`
- `recraft/recraft-v4.1`
- `recraft/recraft-v4.1-pro`
- `recraft/recraft-v4.1-pro-vector`
- `recraft/recraft-v4.1-utility`
- `recraft/recraft-v4.1-utility-pro`
- `recraft/recraft-v4.1-vector`
- `seedream-4.5`
- `seedream-5.0`
- `seedream-5.0-pro`
- `sourceful/riverflow-v2-fast`
- `sourceful/riverflow-v2-pro`
- `sourceful/riverflow-v2.5-fast`
- `sourceful/riverflow-v2.5-pro`
- `wan2.7-image`
- `wan2.7-image-pro`
- `x-ai/grok-imagine-image-2.0`
- `x-ai/grok-imagine-image-quality`
- `z-image-turbo`

## 保留准确 ID（7）

- `google/nano-banana-2-lite`
- `google/nano-banana-2`
- `google/nano-banana-pro`
- `google/nano-banana`
- `openai/gpt-image-2`
- `openai/gpt-image-2.5-sunburst`
- `openai/gpt-image-2.5-flare`

## 历史专用、禁止重新入榜

- `codex:gpt-image-2`：当前榜单不存在，继续保留历史审计。

## 执行约束

- 仅重新评审343张已有成功图；14失败题及3不支持题保留原状态、原尝试记录和零分分母。新增图片生成与Provider调度上限为0。
- 每题两名独立gpt-6-astra/xhigh审评者；匿名包只有题目、评分轴、rubric、图片哈希和编辑源图。旧分数、价格、模型身份及另一位结论不进入审评上下文。
- 分片agent metadata和逐图查看记录随提交归档。声明字段本身不能证明实际查看，执行方仍须保留工具调用证据。
- 原协议争议条件：任一评分轴差值大于2、redLines集合不同、任一lowConfidence=true。由第三名独立gpt-6-astra/xhigh裁决全部适用轴；主执行者不得代替裁决。
- 非争议题取双审均值，失败按固定题位计零，十轴等权原始均值和competition排名沿用既有函数。

## 正式管理流程

受保护的adminBenchmarkControl/reviewOnly接受freeze、export、import、arbitrate、inspect、publish；仅专用rereview localhost管理传输可达。staging及执行保持精确SHA、镜像digest、生产锁、root 0600输入和Worker disabled/concurrency=1校验。

重评会话存入独立集合，Worker既无读写权限也不会领取。会话签名绑定baseline、范围和匿名assignment；所有成功图必须完成A/B覆盖，争议未结禁止发布。公开图片和原始图片对象发布前再次校验；新的release在事务中克隆原数据，仅改变目标评审字段和派生排名，并CAS移动active指针。旧release与Codex历史审计保留。

费用沿reviewOnly.source继续解析原生成batch；review-only不会覆盖manifestCodeSha或executionCodeSha，也不会伪造生成状态。

## 当前状态

本文件随流程支持代码提交；真实重新评审、仲裁及最终发布验证尚待执行，不能将此提交视为评审完成证据。
