# 2026-09-07 模型目录更新

基线：`ebc9f4a5ab1664a7c2c18c6e1262ffa7ee73035e`；目录版本：`2026-09-07.v10`。

仅使用官方文档和匿名公开 Models API 核对型号、输入输出模态与接口参数。本次没有使用 API Key、验证账号权限或执行付费推理。新增条目沿用内部 `catalog` 来源字段，不增加状态类型；按用户要求，Web 和小程序不展示“未实测”标签。现有默认模型保持不变。

## 直接接入渠道

| 渠道 | 新增 ID | 图研角色 |
| --- | --- | --- |
| Gemini | `gemini-3.8-flash` | 主模型、视觉理解 |
| OpenAI | `gpt-6-astra` | 主模型、视觉理解；使用 Responses API |
| 百炼 | `qwen3.8-max-0902`、`qwen3.8-flash`、`qwen3.8-27b` | 主模型、视觉理解 |
| 百炼 | `qwen3.8-2.4t-a95b`、`deepseek-v4-pro-0813`、`deepseek-v4-flash-0731`、`ZHIPU/GLM-5.3` | 主模型 |
| 百炼 | `ZHIPU/GLM-5.3-Flash`、`kimi-k3` | 主模型、视觉理解 |
| 百炼 | `qwen-image-3.0` | 生成、编辑，补齐已有客户端选项对应的服务端注册 |

另按官方视觉文档修正 `qwen3.8-max` 的服务端角色。`kimi-k3` 是百炼部署入口，与已有月之暗面直供 `kimi/kimi-k3` 分开保留。GLM 5.3 的普通版与 Flash 版不混用视觉能力。

依据：[Gemini 更新记录](https://ai.google.dev/gemini-api/docs/changelog)、[Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)、[GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra)、[百炼模型更新](https://help.aliyun.com/zh/model-studio/newly-released-models)、[百炼视觉目录](https://help.aliyun.com/zh/model-studio/vision-model)、[GLM 接口](https://help.aliyun.com/zh/model-studio/glm-zhipu)、[百炼 Chat API](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions)、[Qwen Image 3.0 API](https://help.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference)。

## OpenRouter

继续读取[文本公开目录](https://openrouter.ai/api/v1/models)及[图片公开目录](https://openrouter.ai/api/v1/images/models)。文本/视觉按目录模态动态纳入；无需把整个目录复制成静态数组。

Web 和小程序补齐八个近期型号作为回退选项：`openai/gpt-6-astra`、`openai/gpt-6-astra-pro`、`google/gemini-3.8-flash`、`qwen/qwen3.8-max-0902`、`qwen/qwen3.8-flash`、`anthropic/claude-fable-5.1`、`z-ai/glm-5.3-flash`、`deepseek/deepseek-v4-flash-vision-exp`。最后一个保持 Experimental 名称。Astra 与 Fable 的目录参数未声明 temperature，请求不附加该参数。

新增 `microsoft/mai-image-2.6-flash` 的生成/编辑适配，并补齐它与已有非 Flash 版本的客户端选项。按 [Microsoft 官方契约](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/use-foundry-models-mai-image#response-format)复用 PNG 输出校验和 Azure 路由；不发送未声明的清晰度、质量、种子或格式参数。未将 Flash 加入 Scientific V2 评测或排行榜。

## 保留边界

- [火山方舟模型公告](https://www.volcengine.com/docs/82379/1159178)截至 2026-08-27 的相关最新 ID 已在现有目录中，本次无需重复添加。
- `gpt-6-astra-pro` 仅确认了 OpenRouter 入口，不凭聚合目录推断 OpenAI 原生入口。
- Recraft V4 Styles 四个新变体要求至少一张风格参考图，当前生成流程未提供这种输入；目录显示具体不兼容原因，提交前拦截。Meta Muse Image 没有足够的输出格式契约，保持不可选。
- 百炼新 Vidu Image Pro/Lite 的请求/响应契约尚未由现有适配器覆盖，未据名称直接启用。音乐、视频、向量和重排序模型不属于图研当前三个模型角色。
- 百炼账号的区域、工作空间授权仍由实际账号决定；官方推荐迁移工作空间专属域名，本次没有修改现有接入地址或引入新密钥字段。
- 发布日期只使用官方明确日期；Astra 原生条目的日期留空，不从型号或聚合上架时间推断。

## 验证

覆盖目录角色、无推理的目录读取、Astra 文本/读图 Responses 请求、OpenRouter 采样参数、MAI 两型号生成/编辑、风格参考输入的拒绝路径，以及客户端目录同步。所有 Provider 响应均为本地 mock。

本地结果：API 402 项、Web 327 项、小程序与跨端目录 22 项全部通过；最后补齐的目录漂移检查 6 项复验通过。Core TypeScript 检查、Core/Web 构建、小程序 TypeScript 编译及 `git diff --check` 均通过。尚未合并或部署。
