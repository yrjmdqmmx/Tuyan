# 国内渠道思考参数审计（2026-09-22）

覆盖完整静态目录的 514 个 provider + model ID 组合，逐角色匹配现有 roleProtocols；未调用推理、未计费验证、未部署，也未修改生成目录。

“服务商默认”必须省略字段；旧任务无 thinkingConfig 时保留旧逻辑。supported 只表示公开 API 参数得到核实，不表示账户权限或实调通过。unconfirmed 绝不按同名模型推断。JSON 中 modelIds 全为精确 ID。

|渠道|型号数|可设置|固定思考|接口未开放|未确认|
|---|---:|---:|---:|---:|---:|
|deepseek|4|2|0|0|2|
|kimi|4|2|2|0|0|
|zhipu|28|12|0|0|16|
|bailian|178|76|25|6|71|
|ark|32|16|0|0|16|
|minimax|10|1|7|0|2|
|tokenhub|41|23|3|0|15|
|xiaomi|4|4|0|0|0|
|sensenova|7|5|0|2|0|
|stepfun|7|3|0|0|4|
|qianfan|36|7|0|0|29|
|iflytek|32|0|0|0|32|
|longcat|1|1|0|0|0|
|tokendance|64|0|0|0|64|
|siliconflow|66|2|0|0|64|

## 接入时必须保留的差异

- Ark 的新 Seed 系列及部分 DeepSeek/GLM 路径已有固定 thinking.type=disabled。新显式默认需要删除它；无配置历史任务继续保留。2.0 默认 effort=medium，2.1/evolving 为 high，不能把默认写死成同一档。
- 小米官方默认 enabled；现有 cn-contracts 四个型号固定 disabled，显式默认切回官方行为会增加可能的思考时延和 Token 消耗。
- TokenHub cn-contracts：Kimi K3/K2.8 preview 固定 effort=low，K2.6/MiniMax M3 固定 disabled，GLM5.3 系列和 K2.7 Code 系列固定 enabled。这些参数已逐型号写入 legacyFixedParameters；K2.8 preview 尚无公开档位证据，只清除既有 low，不开放新档位。
- 万相 wan2.7-image/pro 现有 parameters.thinking_mode=true 是真实思考控制。官方只允许无输入图、非连续生成时生效；参考图编辑不能静默接受设置。
- MiniMax reasoning_split、Kimi preserve_thinking、GLM clear_thinking 是输出/历史内容策略，不作为本次思考强度删除项。
- 百炼多数模型与硅基的思考预算与输出预算分开（百炼 GLM5.2 未设置 budget 时，max_tokens 包含思考；设置 budget 时再分开）；小米、Ark 的 max_completion_tokens 含两者。产品可限制思考预算，但不应把产品上限描述成供应商协议约束，不得为思考自动提高已有输出额度。
- 百炼 Qwen3.8 已从 Chat API 核实 effort low/medium/xhigh 和预算互斥、预算上限262144，省略全部时预算默认131072。其他百炼 budget 字段有证据，但逐型号上限需模型卡；文档调试台 1–32768/default 4000 不是全部 API 型号通用上限。未知范围仅记录 documentedControls，未变成可编辑整数控件。
- 同名服务差异：百炼 GLM 5/5.1 不支持 max、GLM 5.2 档位默认未明确；Ark GLM 5.2 默认 high；智谱直连默认 max。SenseNova Kimi K3 表列 medium，直连和 TokenHub 仅 low/high/max。

## 已识别资料冲突

TokenHub DeepSeek 专页与思考总表对 V4 Pro 的 low 说明不一致，控件只保留 high/max。SenseNova thinking 字段的 string/object 描述冲突，当前只开放确定的顶层 reasoning_effort；Kimi K3 默认值表也冲突，因此不预填默认。所有冲突在 JSON profiles.conflicts 保留。

## 全型号结果

下表中的协议是当前代码实际注册协议；固定/未确认原因及精确字段值、兼容映射、删除范围见 [domestic.json](../../../config/thinking-audit/domestic.json)。

|渠道 / 精确型号|角色 → 协议|状态|可设置字段 / 原因|
|---|---|---|---|
|deepseek / `deepseek-flash`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|reasoning_effort: none/low/high/max|
|deepseek / `deepseek-v4-flash-vision-exp`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|当前静态目录已标记不可选；保留历史记录，未为其开放新控件。|
|deepseek / `deepseek-v4-pro`|main → openai-chat-completions|supported|reasoning_effort: none/low/high/max|
|deepseek / `deepseek-v4-flash`|main → openai-chat-completions|unconfirmed|当前静态目录已标记不可选；保留历史记录，未为其开放新控件。|
|kimi / `kimi-k3`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|reasoning_effort: low/high/max|
|kimi / `kimi-k2.7-code`|main → openai-chat-completions<br>vision → openai-chat-completions|fixed|固定开启思考，不能把 enabled-only 声明变成可关开关；未确认 effort/budget。|
|kimi / `kimi-k2.7-code-highspeed`|main → openai-chat-completions<br>vision → openai-chat-completions|fixed|固定开启思考，不能把 enabled-only 声明变成可关开关；未确认 effort/budget。|
|kimi / `kimi-k2.6`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|thinking.type: enabled/disabled|
|zhipu / `glm-5.3`|main → openai-chat-completions|supported|reasoning_effort: low/high/max|
|zhipu / `glm-5.3-flash`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|reasoning_effort: low/high/max|
|zhipu / `glm-5.3-flashx`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|reasoning_effort: low/high/max|
|zhipu / `glm-5.2`|main → openai-chat-completions|supported|reasoning_effort: none/minimal/low/medium/high/xhigh/max|
|zhipu / `glm-5.1`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|zhipu / `glm-5`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|zhipu / `glm-5-turbo`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|zhipu / `glm-5v-turbo`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|thinking.type: enabled/disabled|
|zhipu / `glm-4.7`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|zhipu / `glm-4.7-flash`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|zhipu / `glm-4.7-flashx`|main → openai-chat-completions|unconfirmed|当前思考文档未按精确 Flash/Air/历史版本 ID 确认可用控制；不按同系列名称外推。|
|zhipu / `glm-4.6`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|zhipu / `glm-4.6v`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|thinking.type: enabled/disabled|
|zhipu / `glm-4.6v-flash`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|当前思考文档未按精确 Flash/Air/历史版本 ID 确认可用控制；不按同系列名称外推。|
|zhipu / `glm-4.6v-flashx`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|当前思考文档未按精确 Flash/Air/历史版本 ID 确认可用控制；不按同系列名称外推。|
|zhipu / `glm-4.5-air`|main → openai-chat-completions|unconfirmed|当前思考文档未按精确 Flash/Air/历史版本 ID 确认可用控制；不按同系列名称外推。|
|zhipu / `glm-4.5-airx`|main → openai-chat-completions|unconfirmed|当前思考文档未按精确 Flash/Air/历史版本 ID 确认可用控制；不按同系列名称外推。|
|zhipu / `glm-4.5-flash`|main → openai-chat-completions|unconfirmed|当前思考文档未按精确 Flash/Air/历史版本 ID 确认可用控制；不按同系列名称外推。|
|zhipu / `glm-4.1v-thinking-flash`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|当前思考文档未按精确 Flash/Air/历史版本 ID 确认可用控制；不按同系列名称外推。|
|zhipu / `glm-4.1v-thinking-flashx`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|当前思考文档未按精确 Flash/Air/历史版本 ID 确认可用控制；不按同系列名称外推。|
|zhipu / `glm-4-flash-250414`|main → openai-chat-completions|unconfirmed|当前思考文档未按精确 Flash/Air/历史版本 ID 确认可用控制；不按同系列名称外推。|
|zhipu / `glm-4-flashx-250414`|main → openai-chat-completions|unconfirmed|当前思考文档未按精确 Flash/Air/历史版本 ID 确认可用控制；不按同系列名称外推。|
|zhipu / `glm-4-long`|main → openai-chat-completions|unconfirmed|当前思考文档未按精确 Flash/Air/历史版本 ID 确认可用控制；不按同系列名称外推。|
|zhipu / `glm-4v-flash`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|当前思考文档未按精确 Flash/Air/历史版本 ID 确认可用控制；不按同系列名称外推。|
|zhipu / `cogview-3-flash`|image → provider-images|unconfirmed|当前思考文档未按精确 Flash/Air/历史版本 ID 确认可用控制；不按同系列名称外推。|
|zhipu / `cogview-4`|image → provider-images|unconfirmed|当前思考文档未按精确 Flash/Air/历史版本 ID 确认可用控制；不按同系列名称外推。|
|zhipu / `cogview-4-250304`|image → provider-images|unconfirmed|当前思考文档未按精确 Flash/Air/历史版本 ID 确认可用控制；不按同系列名称外推。|
|zhipu / `glm-image`|image → provider-images|unconfirmed|当前思考文档未按精确 Flash/Air/历史版本 ID 确认可用控制；不按同系列名称外推。|
|bailian / `deepseek-v4.1-flash`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false; reasoning_effort: low/high/max|
|bailian / `qwen3.8-max-0902`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false; reasoning_effort: low/medium/xhigh; thinking_budget: 1..262144|
|bailian / `ZHIPU/GLM-5.3-Flash`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|reasoning_effort: low/high/max|
|bailian / `qwen3.8-flash`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false; reasoning_effort: low/medium/xhigh; thinking_budget: 1..262144|
|bailian / `kimi-k3`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|reasoning_effort: low/high/max|
|bailian / `qwen3.8-27b`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false; reasoning_effort: low/medium/xhigh; thinking_budget: 1..262144|
|bailian / `ZHIPU/GLM-5.3`|main → bailian-openai-chat|supported|reasoning_effort: low/high/max|
|bailian / `deepseek-v4-pro-0813`|main → bailian-openai-chat|supported|enable_thinking: true/false; reasoning_effort: low/high/max|
|bailian / `qwen3.8-2.4t-a95b`|main → bailian-openai-chat|supported|reasoning_effort: low/medium/xhigh; thinking_budget: 1..262144|
|bailian / `vanchin/deepseek-v4-pro-0813`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-image-3.0`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-image-3.0-pro`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3.8-max`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false; reasoning_effort: low/medium/xhigh; thinking_budget: 1..262144|
|bailian / `deepseek-v4-flash-0731`|main → bailian-openai-chat|supported|enable_thinking: true/false; reasoning_effort: low/high/max|
|bailian / `qwen3.7-flash`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.7-flash-2026-07-15`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen-image-2.0-pro-2026-06-22`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `MiniMax/MiniMax-M3`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|thinking.type: adaptive/disabled|
|bailian / `MiniMax/MiniMax-M2.7`|main → bailian-openai-chat|fixed|渠道列表明确仅思考，reasoning_split 输出分离参数不删除。|
|bailian / `MiniMax-M2.5`|main → bailian-openai-chat|fixed|渠道列表明确仅思考，reasoning_split 输出分离参数不删除。|
|bailian / `MiniMax/MiniMax-M2.5`|main → bailian-openai-chat|fixed|渠道列表明确仅思考，reasoning_split 输出分离参数不删除。|
|bailian / `MiniMax/MiniMax-M2.1`|main → bailian-openai-chat|fixed|渠道列表明确仅思考，reasoning_split 输出分离参数不删除。|
|bailian / `ZHIPU/GLM-5.3-FlashX`|main → bailian-openai-chat|supported|reasoning_effort: low/high/max|
|bailian / `ZHIPU/GLM-5.2`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `deepseek-v4-flash`|main → bailian-openai-chat|supported|enable_thinking: true/false; reasoning_effort: high/max|
|bailian / `deepseek-v4-pro`|main → bailian-openai-chat|supported|enable_thinking: true/false; reasoning_effort: high/max|
|bailian / `glm-5.2`|main → bailian-openai-chat|supported|enable_thinking: true/false; reasoning_effort: none/minimal/low/medium/high/xhigh/max|
|bailian / `glm-5.2-fast-preview`|main → bailian-openai-chat|supported|enable_thinking: true/false; reasoning_effort: none/minimal/low/medium/high/xhigh/max|
|bailian / `ZHIPU/GLM-5.1`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `glm-5.1`|main → bailian-openai-chat|supported|enable_thinking: true/false; reasoning_effort: none/minimal/low/medium/high/xhigh|
|bailian / `ZHIPU/GLM-5`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `glm-5`|main → bailian-openai-chat|supported|enable_thinking: true/false; reasoning_effort: none/minimal/low/medium/high/xhigh|
|bailian / `kimi/kimi-k3`|main → bailian-openai-chat<br>vision → bailian-openai-chat|fixed|仅思考；reasoning_effort 只接受 max，既无真实档位选择，也不可继承原厂 low/high。|
|bailian / `kimi-k2.7-code`|main → bailian-openai-chat<br>vision → bailian-openai-chat|fixed|本渠道仅思考且不可关闭；Kimi 页面未声明 K3 reasoning_effort，不继承直连。kimi-k3 不支持 thinking_budget。|
|bailian / `kimi/kimi-k2.7-code`|main → bailian-openai-chat<br>vision → bailian-openai-chat|fixed|思考固定开启，未核实可调参数|
|bailian / `kimi/kimi-k2.7-code-highspeed`|main → bailian-openai-chat<br>vision → bailian-openai-chat|fixed|思考固定开启，未核实可调参数|
|bailian / `kimi-k2.6`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `kimi/kimi-k2.6`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `kimi-k2.5`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `kimi/kimi-k2.5`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen-image-2.0`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-image-2.0-2026-03-03`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-image-2.0-pro`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-image-2.0-pro-2026-03-03`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-image-2.0-pro-2026-04-22`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-image`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-image-edit`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-image-edit-max`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-image-edit-max-2026-01-16`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-image-edit-plus`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-image-edit-plus-2025-10-30`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-image-edit-plus-2025-12-15`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-image-max`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-image-max-2025-12-30`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-image-plus`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-image-plus-2026-01-09`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3.7-max`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.7-max-2026-05-17`|main → bailian-openai-chat|fixed|思考常开；预算范围需模型卡补证。|
|bailian / `qwen3.7-max-2026-05-20`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.7-max-2026-06-08`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.7-max-preview`|main → bailian-openai-chat|fixed|思考常开；预算范围需模型卡补证。|
|bailian / `qwen3.7-plus`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.7-plus-2026-05-26`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.6-27b`|main → bailian-openai-chat<br>vision → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3.6-35b-a3b`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.6-flash`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.6-flash-2026-04-16`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.6-max-preview`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.6-plus`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.6-plus-2026-04-02`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.5-122b-a10b`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.5-27b`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.5-35b-a3b`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.5-397b-a17b`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.5-flash`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.5-flash-2026-02-23`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.5-omni-flash`|main → bailian-openai-chat<br>vision → bailian-openai-chat|unsupported|官方 Qwen Omni 功能对比表明确 Qwen3.5 Omni 不支持深度思考；旧 Omni Turbo 不支持 enable_thinking。更高版本号不能自动继承 Qwen3 Omni 开关。|
|bailian / `qwen3.5-omni-flash-2026-03-15`|main → bailian-openai-chat<br>vision → bailian-openai-chat|unsupported|官方 Qwen Omni 功能对比表明确 Qwen3.5 Omni 不支持深度思考；旧 Omni Turbo 不支持 enable_thinking。更高版本号不能自动继承 Qwen3 Omni 开关。|
|bailian / `qwen3.5-omni-plus`|main → bailian-openai-chat<br>vision → bailian-openai-chat|unsupported|官方 Qwen Omni 功能对比表明确 Qwen3.5 Omni 不支持深度思考；旧 Omni Turbo 不支持 enable_thinking。更高版本号不能自动继承 Qwen3 Omni 开关。|
|bailian / `qwen3.5-omni-plus-2026-03-15`|main → bailian-openai-chat<br>vision → bailian-openai-chat|unsupported|官方 Qwen Omni 功能对比表明确 Qwen3.5 Omni 不支持深度思考；旧 Omni Turbo 不支持 enable_thinking。更高版本号不能自动继承 Qwen3 Omni 开关。|
|bailian / `qwen3.5-plus`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.5-plus-2026-02-15`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3.5-plus-2026-04-20`|main → bailian-openai-chat<br>vision → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3-14b`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3-235b-a22b`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3-235b-a22b-instruct-2507`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3-235b-a22b-thinking-2507`|main → bailian-openai-chat|fixed|思考常开；预算范围需模型卡补证。|
|bailian / `qwen3-30b-a3b`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3-30b-a3b-instruct-2507`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3-30b-a3b-thinking-2507`|main → bailian-openai-chat|fixed|思考常开；预算范围需模型卡补证。|
|bailian / `qwen3-32b`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3-8b`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3-max`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3-max-2025-09-23`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3-max-2026-01-23`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3-max-preview`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `stepfun/step-3.7-flash`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false; reasoning_effort: low/medium/high|
|bailian / `vanchin/deepseek-v4-pro`|main → bailian-openai-chat|supported|enable_thinking: true/false; reasoning_effort: high/max|
|bailian / `vanchin/deepseek-v3.2-think`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `vanchin/deepseek-v3.1-terminus`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `vanchin/deepseek-v3`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `wan2.7-image`|image → bailian-multimodal-generation|supported|parameters.thinking_mode: true/false|
|bailian / `wan2.7-image-pro`|image → bailian-multimodal-generation|supported|parameters.thinking_mode: true/false|
|bailian / `wan2.6-image`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `wan2.6-t2i`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `wan2.5-i2i-preview`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `wan2.5-t2i-preview`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `wan2.2-t2i-flash`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `wan2.2-t2i-plus`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `MiniMax-M2.1`|main → bailian-openai-chat|fixed|渠道列表明确仅思考，reasoning_split 输出分离参数不删除。|
|bailian / `Moonshot-Kimi-K2-Instruct`|main → bailian-openai-chat|unsupported|专项参数表 enable_thinking 为不支持；不能由 K2 Thinking 外推。|
|bailian / `deepseek-r1`|main → bailian-openai-chat|fixed|思考固定开启，未核实可调参数|
|bailian / `deepseek-r1-0528`|main → bailian-openai-chat|fixed|思考固定开启，未核实可调参数|
|bailian / `deepseek-r1-distill-llama-70b`|main → bailian-openai-chat|fixed|思考固定开启，未核实可调参数|
|bailian / `deepseek-r1-distill-llama-8b`|main → bailian-openai-chat|fixed|思考固定开启，未核实可调参数|
|bailian / `deepseek-r1-distill-qwen-1.5b`|main → bailian-openai-chat|fixed|思考固定开启，未核实可调参数|
|bailian / `deepseek-r1-distill-qwen-14b`|main → bailian-openai-chat|fixed|思考固定开启，未核实可调参数|
|bailian / `deepseek-r1-distill-qwen-32b`|main → bailian-openai-chat|fixed|思考固定开启，未核实可调参数|
|bailian / `deepseek-r1-distill-qwen-7b`|main → bailian-openai-chat|fixed|思考固定开启，未核实可调参数|
|bailian / `deepseek-v3`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `deepseek-v3.1`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `deepseek-v3.2`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `deepseek-v3.2-exp`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `glm-4.5`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `glm-4.5-air`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `glm-4.7`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `kimi-k2-thinking`|main → bailian-openai-chat|fixed|思考固定开启，未核实可调参数|
|bailian / `kling/kling-v3-image-generation`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `kling/kling-v3-omni-image-generation`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qvq-max`|main → bailian-openai-chat<br>vision → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qvq-plus`|main → bailian-openai-chat<br>vision → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-flash`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen-flash-2025-07-28`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen-long`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-long-2025-01-25`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-long-latest`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-max`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-omni-turbo`|main → bailian-openai-chat<br>vision → bailian-openai-chat|unsupported|官方 Qwen Omni 功能对比表明确 Qwen3.5 Omni 不支持深度思考；旧 Omni Turbo 不支持 enable_thinking。更高版本号不能自动继承 Qwen3 Omni 开关。|
|bailian / `qwen-plus`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen-plus-2025-01-25`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-plus-2025-04-28`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen-plus-2025-07-14`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen-plus-2025-12-01`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen-plus-latest`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen-turbo`|main → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen-vl-max`|main → bailian-openai-chat<br>vision → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen-vl-plus`|main → bailian-openai-chat<br>vision → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen2.5-omni-7b`|main → bailian-openai-chat<br>vision → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3-coder-30b-a3b-instruct`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3-coder-480b-a35b-instruct`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3-coder-flash`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3-coder-flash-2025-07-28`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3-coder-next`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3-coder-plus`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3-coder-plus-2025-07-22`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3-coder-plus-2025-09-23`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3-next-80b-a3b-instruct`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3-next-80b-a3b-thinking`|main → bailian-openai-chat|fixed|思考常开；预算范围需模型卡补证。|
|bailian / `qwen3-omni-flash`|main → bailian-openai-chat<br>vision → bailian-openai-chat|supported|enable_thinking: true/false|
|bailian / `qwen3-omni-flash-2025-09-15`|main → bailian-openai-chat<br>vision → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3-omni-flash-2025-12-01`|main → bailian-openai-chat<br>vision → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwen3-vl-flash`|main → bailian-openai-chat<br>vision → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `qwq-plus`|main → bailian-openai-chat|fixed|思考常开；预算范围需模型卡补证。|
|bailian / `unisound/unisound-u2`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `vanchin/deepseek-r1`|main → bailian-openai-chat|fixed|思考固定开启，未核实可调参数|
|bailian / `vidu/vidu-image-lite_reference2image`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `vidu/vidu-image-pro_reference2image`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `vidu/vidu-image_reference2image`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `vidu/viduq2-fast_reference2image`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `vidu/viduq2-pro_reference2image`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `vidu/viduq3-fast_reference2image`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `wanx-v1`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `wanx2.0-t2i-turbo`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `wanx2.1-imageedit`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `wanx2.1-t2i-plus`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `wanx2.1-t2i-turbo`|image → bailian-async-images|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `xiaomi/mimo-v2.5-pro`|main → bailian-openai-chat|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|bailian / `z-image-turbo`|image → bailian-multimodal-generation|unconfirmed|最新专题与专项 API 未对本精确 ID 及当前协议完整确定思考控制；不继承同名原厂/其他前缀或相邻日期版本。|
|ark / `deepseek-v4-1-flash-260910`|main → ark-openai-chat<br>vision → ark-openai-chat|supported|reasoning_effort: none/low/high/max|
|ark / `deepseek-v4-flash-260425`|main → ark-openai-chat|unconfirmed|最新深度思考支持表未完整列出本精确旧版本的允许值；不继承后续版本。|
|ark / `deepseek-v4-flash-ga-260731`|main → ark-openai-chat|supported|reasoning_effort: none/low/high/max|
|ark / `deepseek-v4-pro-260425`|main → ark-openai-chat|supported|thinking.type: enabled/disabled|
|ark / `deepseek-v4-pro-ga-260813`|main → ark-openai-chat|supported|reasoning_effort: none/low/high/max|
|ark / `doubao-seed-2-1-pro-260628`|main → ark-openai-chat<br>vision → ark-openai-chat|supported|reasoning_effort: none/minimal/low/medium/high/xhigh/max|
|ark / `doubao-seed-2-1-pro-260915`|main → ark-openai-chat<br>vision → ark-openai-chat|supported|reasoning_effort: none/minimal/low/medium/high/xhigh/max|
|ark / `doubao-seed-2-1-turbo-260628`|main → ark-openai-chat<br>vision → ark-openai-chat|supported|reasoning_effort: none/minimal/low/medium/high/xhigh/max|
|ark / `doubao-seed-2-0-code-preview-260215`|main → ark-openai-chat<br>vision → ark-openai-chat|supported|reasoning_effort: none/minimal/low/medium/high/xhigh/max|
|ark / `doubao-seed-2-0-lite-260215`|main → ark-openai-chat<br>vision → ark-openai-chat|supported|reasoning_effort: none/minimal/low/medium/high/xhigh/max|
|ark / `doubao-seed-2-0-lite-260428`|main → ark-openai-chat<br>vision → ark-openai-chat|supported|reasoning_effort: none/minimal/low/medium/high/xhigh/max|
|ark / `doubao-seed-2-0-mini-260215`|main → ark-openai-chat<br>vision → ark-openai-chat|supported|reasoning_effort: none/minimal/low/medium/high/xhigh/max|
|ark / `doubao-seed-2-0-mini-260428`|main → ark-openai-chat<br>vision → ark-openai-chat|supported|reasoning_effort: none/minimal/low/medium/high/xhigh/max|
|ark / `doubao-seed-2-0-pro-260215`|main → ark-openai-chat<br>vision → ark-openai-chat|supported|reasoning_effort: none/minimal/low/medium/high/xhigh/max|
|ark / `doubao-seed-1-8-251228`|main → ark-openai-chat<br>vision → ark-openai-chat|unconfirmed|最新深度思考支持表未完整列出本精确旧版本的允许值；不继承后续版本。|
|ark / `doubao-seed-1-6-250615`|main → ark-openai-chat<br>vision → ark-openai-chat|unconfirmed|最新深度思考支持表未完整列出本精确旧版本的允许值；不继承后续版本。|
|ark / `doubao-seed-1-6-251015`|main → ark-openai-chat<br>vision → ark-openai-chat|unconfirmed|最新深度思考支持表未完整列出本精确旧版本的允许值；不继承后续版本。|
|ark / `doubao-seed-1-6-flash-250615`|main → ark-openai-chat<br>vision → ark-openai-chat|unconfirmed|最新深度思考支持表未完整列出本精确旧版本的允许值；不继承后续版本。|
|ark / `doubao-seed-1-6-flash-250828`|main → ark-openai-chat<br>vision → ark-openai-chat|unconfirmed|最新深度思考支持表未完整列出本精确旧版本的允许值；不继承后续版本。|
|ark / `doubao-seed-1-6-vision-250815`|main → ark-openai-chat<br>vision → ark-openai-chat|unconfirmed|最新深度思考支持表未完整列出本精确旧版本的允许值；不继承后续版本。|
|ark / `doubao-1-5-lite-32k-250115`|main → ark-openai-chat|unconfirmed|最新深度思考支持表未完整列出本精确旧版本的允许值；不继承后续版本。|
|ark / `doubao-1-5-pro-32k-250115`|main → ark-openai-chat|unconfirmed|最新深度思考支持表未完整列出本精确旧版本的允许值；不继承后续版本。|
|ark / `doubao-1-5-vision-pro-32k-250115`|vision → ark-openai-chat|unconfirmed|最新深度思考支持表未完整列出本精确旧版本的允许值；不继承后续版本。|
|ark / `doubao-seedream-5-0-260128`|image → ark-images|unconfirmed|最新深度思考支持表未完整列出本精确旧版本的允许值；不继承后续版本。|
|ark / `doubao-seedream-5-0-pro-260628`|image → ark-images|unconfirmed|最新深度思考支持表未完整列出本精确旧版本的允许值；不继承后续版本。|
|ark / `doubao-seedream-4-5-251128`|image → ark-images|unconfirmed|最新深度思考支持表未完整列出本精确旧版本的允许值；不继承后续版本。|
|ark / `doubao-seedream-4-0-250828`|image → ark-images|unconfirmed|最新深度思考支持表未完整列出本精确旧版本的允许值；不继承后续版本。|
|ark / `glm-5-3-flash-260828`|main → ark-openai-chat<br>vision → ark-openai-chat|supported|reasoning_effort: low/high/max|
|ark / `glm-5-2-260617`|main → ark-openai-chat|supported|reasoning_effort: none/minimal/low/medium/high/xhigh/max|
|ark / `doubao-seed-code-preview-251028`|main → ark-openai-chat<br>vision → ark-openai-chat|unconfirmed|最新深度思考支持表未完整列出本精确旧版本的允许值；不继承后续版本。|
|ark / `doubao-seed-evolving`|main → ark-openai-chat<br>vision → ark-openai-chat|supported|reasoning_effort: none/minimal/low/medium/high/xhigh/max|
|ark / `glm-4-7-251222`|main → ark-openai-chat|unconfirmed|最新深度思考支持表未完整列出本精确旧版本的允许值；不继承后续版本。|
|minimax / `MiniMax-M3`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|thinking.type: adaptive/disabled|
|minimax / `MiniMax-M2.7`|main → openai-chat-completions|fixed|M2 系列即使传 disabled 仍开启，不能给出可关控件；保留 reasoning_split。|
|minimax / `MiniMax-M2.7-highspeed`|main → openai-chat-completions|fixed|M2 系列即使传 disabled 仍开启，不能给出可关控件；保留 reasoning_split。|
|minimax / `MiniMax-M2.5`|main → openai-chat-completions|fixed|M2 系列即使传 disabled 仍开启，不能给出可关控件；保留 reasoning_split。|
|minimax / `MiniMax-M2.5-highspeed`|main → openai-chat-completions|fixed|M2 系列即使传 disabled 仍开启，不能给出可关控件；保留 reasoning_split。|
|minimax / `MiniMax-M2.1`|main → openai-chat-completions|fixed|M2 系列即使传 disabled 仍开启，不能给出可关控件；保留 reasoning_split。|
|minimax / `MiniMax-M2.1-highspeed`|main → openai-chat-completions|fixed|M2 系列即使传 disabled 仍开启，不能给出可关控件；保留 reasoning_split。|
|minimax / `MiniMax-M2`|main → openai-chat-completions|fixed|M2 系列即使传 disabled 仍开启，不能给出可关控件；保留 reasoning_split。|
|minimax / `image-01`|image → provider-images|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|minimax / `image-01-live`|image → provider-images|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|tokenhub / `deepseek/deepseek-v4-flash-vision-exp`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|TokenHub 思考专题和专项指南未对该精确 ID 给出完整参数范围；不继承其他渠道同名模型。|
|tokenhub / `deepseek-v4-pro-0813`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|tokenhub / `deepseek/deepseek-v4-pro-0813`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|tokenhub / `deepseek-v4-flash-0731`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|tokenhub / `deepseek/deepseek-v4-flash-0731`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|tokenhub / `deepseek-v4-flash`|main → openai-chat-completions|supported|thinking.type: enabled/disabled; reasoning_effort: low/high/max|
|tokenhub / `deepseek-v4-flash-202605`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|tokenhub / `deepseek-v4-pro`|main → openai-chat-completions|supported|thinking.type: enabled/disabled; reasoning_effort: high/max|
|tokenhub / `deepseek-v4-pro-202606`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|tokenhub / `deepseek/deepseek-v4-flash`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|tokenhub / `deepseek/deepseek-v4-pro`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|tokenhub / `glm-5.3`|main → openai-chat-completions|supported|reasoning_effort: low/high/max|
|tokenhub / `glm-5.3-flash`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|reasoning_effort: low/high/max|
|tokenhub / `glm-5.3-flashx`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|reasoning_effort: low/high/max|
|tokenhub / `glm-5.2`|main → openai-chat-completions|supported|reasoning_effort: none/minimal/low/medium/high/xhigh/max|
|tokenhub / `glm-5.1`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|tokenhub / `glm-5`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|tokenhub / `glm-5-turbo`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|tokenhub / `glm-5v-turbo`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|thinking.type: enabled/disabled|
|tokenhub / `hy4-preview`|main → openai-chat-completions|supported|reasoning_effort: none/high|
|tokenhub / `hy3`|main → openai-chat-completions|supported|reasoning_effort: none/low/high|
|tokenhub / `kimi-k3`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|reasoning_effort: low/high/max|
|tokenhub / `kimi-k2.7-code`|main → openai-chat-completions<br>vision → openai-chat-completions|fixed|思考固定开启，未核实可调参数|
|tokenhub / `kimi-k2.7-code-highspeed`|main → openai-chat-completions<br>vision → openai-chat-completions|fixed|思考固定开启，未核实可调参数|
|tokenhub / `kimi-k2.6`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|thinking.type: enabled/disabled|
|tokenhub / `minimax-m3`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|thinking.type: adaptive/disabled|
|tokenhub / `minimax-m2.7`|main → openai-chat-completions|fixed|思考固定开启，未核实可调参数|
|tokenhub / `deepseek/deepseek-flash`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|TokenHub 思考专题和专项指南未对该精确 ID 给出完整参数范围；不继承其他渠道同名模型。|
|tokenhub / `hunyuan-t1-vision-20250916`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|TokenHub 思考专题和专项指南未对该精确 ID 给出完整参数范围；不继承其他渠道同名模型。|
|tokenhub / `hy-image-v3`|image → provider-images|unconfirmed|TokenHub 思考专题和专项指南未对该精确 ID 给出完整参数范围；不继承其他渠道同名模型。|
|tokenhub / `hy-image-v3.5-preview`|image → provider-images|unconfirmed|TokenHub 思考专题和专项指南未对该精确 ID 给出完整参数范围；不继承其他渠道同名模型。|
|tokenhub / `hy-vision-2.0-instruct`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|TokenHub 思考专题和专项指南未对该精确 ID 给出完整参数范围；不继承其他渠道同名模型。|
|tokenhub / `kimi-k2.8-preview`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|TokenHub 思考专题和专项指南未对该精确 ID 给出完整参数范围；不继承其他渠道同名模型。|
|tokenhub / `mimo-v2.5-pro`|main → openai-chat-completions|unconfirmed|TokenHub 思考专题和专项指南未对该精确 ID 给出完整参数范围；不继承其他渠道同名模型。|
|tokenhub / `seedream-image-v5.0-lite`|image → provider-images|unconfirmed|TokenHub 思考专题和专项指南未对该精确 ID 给出完整参数范围；不继承其他渠道同名模型。|
|tokenhub / `seedream-image-v5.0-pro`|image → provider-images|unconfirmed|TokenHub 思考专题和专项指南未对该精确 ID 给出完整参数范围；不继承其他渠道同名模型。|
|tokenhub / `vidu-image-q2`|image → provider-images|unconfirmed|TokenHub 思考专题和专项指南未对该精确 ID 给出完整参数范围；不继承其他渠道同名模型。|
|tokenhub / `wand-vega-image-flash`|image → provider-images|unconfirmed|TokenHub 思考专题和专项指南未对该精确 ID 给出完整参数范围；不继承其他渠道同名模型。|
|tokenhub / `wand-vega-image-lite`|image → provider-images|unconfirmed|TokenHub 思考专题和专项指南未对该精确 ID 给出完整参数范围；不继承其他渠道同名模型。|
|tokenhub / `wand-vega-image-pro`|image → provider-images|unconfirmed|TokenHub 思考专题和专项指南未对该精确 ID 给出完整参数范围；不继承其他渠道同名模型。|
|tokenhub / `youtu-vita`|vision → openai-chat-completions|unconfirmed|TokenHub 思考专题和专项指南未对该精确 ID 给出完整参数范围；不继承其他渠道同名模型。|
|xiaomi / `mimo-v2.6-flash`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|thinking.type: enabled/disabled|
|xiaomi / `mimo-v2.6-pro`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|thinking.type: enabled/disabled|
|xiaomi / `mimo-v2.5`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|thinking.type: enabled/disabled|
|xiaomi / `mimo-v2.5-pro`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|sensenova / `deepseek-v4-flash`|main → openai-chat-completions|supported|reasoning_effort: none/low/medium/high/max|
|sensenova / `deepseek-v4-pro`|main → openai-chat-completions|supported|reasoning_effort: none/low/medium/high/max|
|sensenova / `glm-5.2`|main → openai-chat-completions|supported|reasoning_effort: none/minimal/low/medium/high/xhigh/max|
|sensenova / `kimi-k3`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|reasoning_effort: low/medium/high/max|
|sensenova / `sensenova-6.8-flash-lite`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|reasoning_effort: none/low/medium/high/max|
|sensenova / `sensenova-u1.5-fast`|image → sensenova-images-json|unsupported|专用图像接口完整请求参数表没有思考控制字段；只表示本接口未开放可设置思考，不推断模型内部是否思考。|
|sensenova / `sensenova-u1.5-lite`|image → sensenova-images-json|unsupported|专用图像接口完整请求参数表没有思考控制字段；只表示本接口未开放可设置思考，不推断模型内部是否思考。|
|stepfun / `step-3.7-flash`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|reasoning_effort: low/medium/high|
|stepfun / `step-3.5-flash`|main → openai-chat-completions|unconfirmed|当前模型/API 文档未确认该精确型号可配置思考字段；相邻版本参数不外推。|
|stepfun / `step-3.5-flash-2603`|main → openai-chat-completions|supported|reasoning_effort: low/high|
|stepfun / `step-1o-turbo-vision`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|当前模型/API 文档未确认该精确型号可配置思考字段；相邻版本参数不外推。|
|stepfun / `step-2x-large`|image → stepfun-images-json|unconfirmed|当前模型/API 文档未确认该精确型号可配置思考字段；相邻版本参数不外推。|
|stepfun / `step-5-preview`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|reasoning_effort: low/medium/high|
|stepfun / `step-image-edit-2`|image → stepfun-images-multipart|unconfirmed|当前模型/API 文档未确认该精确型号可配置思考字段；相邻版本参数不外推。|
|qianfan / `deepseek-v4.1-flash`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `deepseek-v4-pro-0813`|main → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `deepseek-v4-flash-0731`|main → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `deepseek-v4-flash`|main → openai-chat-completions|supported|thinking.type: enabled/disabled; reasoning_effort: high/max|
|qianfan / `deepseek-v4-pro`|main → openai-chat-completions|supported|thinking.type: enabled/disabled; reasoning_effort: high/max|
|qianfan / `deepseek-v3.2`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|qianfan / `deepseek-v3.2-think`|main → openai-chat-completions|supported|thinking_strategy: short_think/chain_of_draft|
|qianfan / `glm-5.3`|main → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `glm-5.3-flash`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `glm-5.2`|main → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `glm-5.1`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|qianfan / `glm-5`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|qianfan / `kimi-k2.6`|main → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `qwen-image`|image → qianfan-images|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `qwen-image-edit`|image → qianfan-images|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `qwen3.5-122b-a10b`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `qwen3.5-27b`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `qwen3.5-35b-a3b`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `qwen3.5-397b-a17b`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `deepseek-flash`|main → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `deepseek-ocr`|vision → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `ernie-4.5-turbo-128k`|main → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `ernie-4.5-turbo-20260402`|main → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `ernie-4.5-turbo-32k`|main → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `ernie-4.5-turbo-vl`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `ernie-4.5-turbo-vl-32k`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `ernie-5.0`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `ernie-5.0-thinking-exp`|main → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `ernie-5.0-thinking-latest`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `ernie-5.0-thinking-preview`|main → openai-chat-completions<br>vision → openai-chat-completions|supported|enable_thinking: true/false|
|qianfan / `ernie-5.1`|main → openai-chat-completions|unconfirmed|预算字段 thinking_budget 确认，min100；逐型号上限未核实，因此不开放无上限整数输入。|
|qianfan / `ernie-x1.1`|main → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `ernie-x1.1-preview`|main → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `internvl3-38b`|vision → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `musesteamer-air-image`|image → qianfan-images|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|qianfan / `qianfan-ocr`|vision → openai-chat-completions|unconfirmed|官方已核查资料未确认当前精确型号/角色/协议可设置思考控制。|
|iflytek / `xop3qwen30b`|main → anthropic-messages|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xop3qwen32b`|main → anthropic-messages|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xop3qwen32bvl`|vision → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xopqwen35397b`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xopqwen36v35b`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xop35qwen2b`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `spark-x2.5`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `spark-x2.5-1.7b`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `spark-x2.5-4b`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xdeepseekr1qwen32b`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xminimaxm25`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xop3qwen0b6`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xop3qwen14b`|main → anthropic-messages|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xop3qwen4b`|main → anthropic-messages|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xop3qwen80bnext`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xop3qwen8b`|main → anthropic-messages|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xopdeepseekv4flash`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xopdeepseekv4flash0731`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xopdeepseekv4pro`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xopdeepseekv4pro0813`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xopglm51`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xopglm52`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xopglm53`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xopglmv47flash`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xopkimik25`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xopkimik26`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xopkimik27code`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xqwen14bchat`|main → anthropic-messages|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xspark13b6k`|main → anthropic-messages|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xsparkprox`|main → anthropic-messages|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xsparkx2`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|iflytek / `xsparkx2flash`|main → openai-chat-completions|unconfirmed|讯飞推理服务 HTTP 文档未按该服务码列出思考开关/强度/预算；不能由服务码中的原厂型号继承。|
|longcat / `LongCat-2.0`|main → openai-chat-completions|supported|thinking.type: enabled/disabled|
|tokendance / `deepseek-v4.1-flash`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `deepseek-v4-flash-vision-exp`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `deepseek-v4-pro-0813`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `deepseek-v4-flash-0731`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `deepseek-v4-flash`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `deepseek-v4-pro`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `deepseek-v3.2`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `deepseek-chat-v3-0324`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `glm-5.3`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `glm-5.3-flash`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `glm-5.3-flashx`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `glm-5.2`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `glm-5.1`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `glm-5`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `glm-5v-turbo`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `glm-4.7`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `glm-4.6v`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `glm-4.5-air`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `hy4-preview`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `hy3`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `hy3-preview`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `kimi-k3`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `kimi-k2.7-code`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `kimi-k2.6`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `kimi-k2.5`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `minimax-m3`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `minimax-m2.7`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `minimax-m2.5`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `qwen3.8-flash`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `qwen3.8-max`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `qwen3.8-max-0902`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `qwen3.7-max`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `qwen3.7-plus`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `qwen3.6-max-preview`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `qwen3.6-plus`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `qwen3.5-35b-a3b`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `qwen3.5-flash`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `qwen3.5-plus`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `qwen3-30b-a3b-instruct-2507`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `qwen3-max`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `seed-2.1-pro`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `seed-2.1-turbo`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `seed-2.0-code`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `seed-2.0-lite`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `seed-2.0-mini`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `seed-2.0-pro`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `seedream-5.0-lite`|image → ark-images|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `seedream-5.0-pro`|image → ark-images|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `step-3.7-flash`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `step-3.5-flash`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `dots-3-note-preview`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `ling-3.0-flash`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `longcat-2.0`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `mimo-v2.5`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `mimo-v2.5-pro`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `qwen3-vl-plus`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `seed-evolving`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `spark-x2.5-1.7b`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `spark-x2.5-4b`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `step-5-preview`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `unifuncs-s3`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `unifuncs-s3-pro`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `unifuncs-u3`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|tokendance / `unifuncs-u3-pro`|main → openai-chat-completions|unconfirmed|公开 gateway/v1/models 目录证明模型登记，不构成该渠道思考字段及档位契约；文档入口读取受限，不继承原厂参数。|
|siliconflow / `XingChenAGI/Xing4.0-29B`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `tencent/Hy4-preview`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3.8-27B`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `MiniMaxAI/MiniMax-M2.5`|main → openai-chat-completions|unconfirmed|当前静态目录已标记不可选；保留历史记录，未为其开放新控件。|
|siliconflow / `Pro/MiniMaxAI/MiniMax-M2.5`|main → openai-chat-completions|unconfirmed|当前静态目录已标记不可选；保留历史记录，未为其开放新控件。|
|siliconflow / `Qwen/Qwen-Image-Edit-2509`|image → provider-images|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen-Image`|image → provider-images|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen-Image-Edit`|image → provider-images|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3.6-27B`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3.6-35B-A3B`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3.5-122B-A10B`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3.5-27B`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3.5-35B-A3B`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3.5-397B-A17B`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|当前静态目录已标记不可选；保留历史记录，未为其开放新控件。|
|siliconflow / `Qwen/Qwen3.5-4B`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3.5-9B`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3-14B`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3-30B-A3B-Instruct-2507`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3-32B`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3-8B`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Pro/Qwen/Qwen2.5-7B-Instruct`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen2.5-32B-Instruct`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen2.5-72B-Instruct`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen2.5-72B-Instruct-128K`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen2.5-7B-Instruct`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `deepseek-ai/DeepSeek-V4-Flash`|main → openai-chat-completions|supported|reasoning_effort: high/max|
|siliconflow / `deepseek-ai/DeepSeek-V4-Pro`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Pro/deepseek-ai/DeepSeek-V3.2`|main → openai-chat-completions|supported|enable_thinking: true/false; thinking_budget: 128..32768|
|siliconflow / `deepseek-ai/DeepSeek-V3.2`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Pro/deepseek-ai/DeepSeek-V3.1-Terminus`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `deepseek-ai/DeepSeek-V3.1-Terminus`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `deepseek-ai/DeepSeek-R1-0528-Qwen3-8B`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `moonshotai/Kimi-K2.7-Code`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Pro/moonshotai/Kimi-K2.6`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `stepfun-ai/Step-3.5-Flash`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `zai-org/GLM-5.3`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `zai-org/GLM-5.2`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Pro/zai-org/GLM-5.1`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `zai-org/GLM-4.5-Air`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `zai-org/GLM-4.5V`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `THUDM/GLM-4-32B-0414`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `THUDM/GLM-4-9B-0414`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `THUDM/GLM-Z1-9B-0414`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Pro/deepseek-ai/DeepSeek-V3`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `deepseek-ai/DeepSeek-V3`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `ByteDance-Seed/Seed-OSS-36B-Instruct`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Kwai-Kolors/Kolors`|image → provider-images|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Pro/deepseek-ai/DeepSeek-R1`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3-Coder-30B-A3B-Instruct`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3-Omni-30B-A3B-Instruct`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3-Omni-30B-A3B-Thinking`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3-VL-30B-A3B-Instruct`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3-VL-30B-A3B-Thinking`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3-VL-32B-Instruct`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3-VL-32B-Thinking`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3-VL-8B-Instruct`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Qwen/Qwen3-VL-8B-Thinking`|main → openai-chat-completions<br>vision → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Tongyi-MAI/Z-Image`|image → provider-images|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `Tongyi-MAI/Z-Image-Turbo`|image → provider-images|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `baidu/ERNIE-Image-Turbo`|image → provider-images|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `deepseek-ai/DeepSeek-R1`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `inclusionAI/Ling-flash-2.0`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `inclusionAI/Ling-mini-2.0`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `meituan-longcat/LongCat-2.0`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|
|siliconflow / `nex-agi/Nex-N2-Pro`|main → openai-chat-completions|unconfirmed|当前静态目录已标记不可选；保留历史记录，未为其开放新控件。|
|siliconflow / `tencent/Hunyuan-A13B-Instruct`|main → openai-chat-completions|unconfirmed|通用 API 对开关/预算只写大多数推理模型，且 effort 白名单未包含此精确 ID；不能按 family/Pro 前缀外推。|

## 官方来源

- [deepseek](https://api-docs.deepseek.com/api/create-chat-completion/)（2026-09-22，web-read-and-public-document-get）
- [deepseekGuide](https://api-docs.deepseek.com/guides/thinking_mode/)（2026-09-22，web-read-and-public-document-get）
- [deepseekModels](https://api-docs.deepseek.com/quick_start/pricing)（2026-09-22，web-read-and-public-document-get）
- [kimi](https://platform.kimi.com/docs/api/models-overview)（2026-09-22，web-read-and-public-document-get）
- [kimiEffort](https://platform.kimi.com/docs/guide/use-reasoning-effort)（2026-09-22，web-read-and-public-document-get）
- [zhipu](https://docs.bigmodel.cn/cn/guide/capabilities/thinking)（2026-09-22，web-read-and-public-document-get）
- [zhipuFlash](https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash.md)（2026-09-22，web-read-and-public-document-get）
- [bailian](https://help.aliyun.com/zh/model-studio/deep-thinking)（2026-09-22，web-read-and-public-document-get）
- [bailianDS](https://help.aliyun.com/zh/model-studio/deepseek-api)（2026-09-22，web-read-and-public-document-get）
- [bailianGLM](https://help.aliyun.com/zh/model-studio/glm)（2026-09-22，web-read-and-public-document-get）
- [bailianKimi](https://help.aliyun.com/zh/model-studio/kimi-api)（2026-09-22，web-read-and-public-document-get）
- [bailianOmni](https://help.aliyun.com/zh/model-studio/qwen-omni)（2026-09-22，web-read-and-public-document-get）
- [bailianWan](https://help.aliyun.com/zh/model-studio/wan-image-generation-and-editing-api-reference)（2026-09-22，web-read-and-public-document-get）
- [bailianError](https://help.aliyun.com/zh/model-studio/error-code)（2026-09-22，web-read-and-public-document-get）
- [ark](https://docs.volcengine.com/docs/ark/deep-thinking?lang=zh)（2026-09-22，browser-rendered-dom）
- [arkChat](https://docs.volcengine.com/docs/ark/chat-api?lang=zh&redirect=1)（2026-09-22，web-read-and-public-document-get）
- [minimax](https://platform.minimax.io/docs/api-reference/text-openai-api)（2026-09-22，web-read-and-public-document-get）
- [tokenhub](https://cloud.tencent.com/document/product/1823/131208)（2026-09-22，web-read-and-public-document-get）
- [tokenhubDS](https://cloud.tencent.com/document/product/1823/132248)（2026-09-22，web-read-and-public-document-get）
- [tokenhubGLM](https://cloud.tencent.com/document/product/1823/132061)（2026-09-22，web-read-and-public-document-get）
- [tokenhubKimi](https://cloud.tencent.com/document/product/1823/132232)（2026-09-22，web-read-and-public-document-get）
- [tokenhubMini](https://cloud.tencent.com/document/product/1823/132246)（2026-09-22，web-read-and-public-document-get）
- [xiaomi](https://mimo.mi.com/docs/en-US/api/chat/openai-api)（2026-09-22，web-read-and-public-document-get）
- [sensenova](https://platform.sensenova.cn/docs)（2026-09-22，browser-rendered-dom）
- [stepfun](https://platform.stepfun.com/docs/zh/api-reference/chat/chat-completion-create)（2026-09-22，web-read-and-public-document-get）
- [step37](https://platform.stepfun.com/docs/zh/guides/models/step-3.7-flash)（2026-09-22，web-read-and-public-document-get）
- [step35](https://platform.stepfun.com/docs/zh/guides/models/step-3.5-flash)（2026-09-22，web-read-and-public-document-get）
- [step5](https://platform.stepfun.com/docs/zh/guides/models/step-5-preview)（2026-09-22，web-read-and-public-document-get）
- [qianfan](https://cloud.baidu.com/doc/qianfan-docs/s/Wm95lyynv)（2026-09-22，web-read-and-public-document-get）
- [qianfanChat](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)（2026-09-22，web-read-and-public-document-get）
- [iflytek](https://www.xfyun.cn/doc/spark/推理服务-http.html)（2026-09-22，web-read-and-public-document-get）
- [longcat](https://longcat.chat/platform/docs/api/chat.html)（2026-09-22，web-read-and-public-document-get）
- [longcatDefault](https://longcat.chat/platform/docs/zh/OpenCode.html)（2026-09-22，web-read-and-public-document-get）
- [tokendance](https://tokendance.space/gateway/v1/models)（2026-09-22，web-read-and-public-document-get）
- [siliconflow](https://docs.siliconflow.cn/docs/api/chat-completions-post)（2026-09-22，web-read-and-public-document-get）
- [siliconflowReason](https://docs.siliconflow.cn/docs/userguide/capabilities/reasoning)（2026-09-22，web-read-and-public-document-get）
- [bailianChat](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions)（2026-09-22，web-read-and-public-document-get）
- [bailianVendorGLM](https://help.aliyun.com/zh/model-studio/glm-zhipu)（2026-09-22，web-read-and-public-document-get）
- [bailianVendorKimi](https://help.aliyun.com/zh/model-studio/kimi-api-by-moonshot-ai)（2026-09-22，web-read-and-public-document-get）
- [bailianVendorMini](https://help.aliyun.com/zh/model-studio/minimax-api-by-minimax)（2026-09-22，web-read-and-public-document-get）
- [bailianStep](https://help.aliyun.com/zh/model-studio/stepfun)（2026-09-22，web-read-and-public-document-get）
- [bailianVanchin](https://help.aliyun.com/zh/model-studio/deepseek-api-by-vanchin)（2026-09-22，web-read-and-public-document-get）
- [zhipu47Flash](https://docs.bigmodel.cn/cn/guide/models/free/glm-4.7-flash)（2026-09-22，web-read-and-public-document-get）
- [zhipuModes](https://docs.bigmodel.cn/cn/guide/capabilities/thinking-mode.md)（2026-09-22，web-read-and-public-document-get）

## 本地验证

审计脚本校验每个精确 provider/model/role/protocol 均有且仅有一个 profile；不对名称做模糊匹配。核查总数 514 个型号、686 个角色记录。生产接口、静态目录和历史任务数据未修改。
