# 图研 API 接口与完整模型目录修正 · 2026-09-07

本轮完成代码与本地验证，目录版本 `2026-09-07.v12`。静态目录由 101 项扩为 306 项，新增 205 个渠道内精确 ID；OpenRouter 继续读取自身的动态目录。没有部署、推送、真实模型推理或付费调用，没有新增验证状态类型或“未实测”界面标签。

工作目录：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/model-catalog-20260907`；分支 `codex/model-catalog-20260907`，基线 `ebc9f4a5ab1664a7c2c18c6e1262ffa7ee73035e`。保留开工前 43 个脏文件/未跟踪文件，相关修改在其基础上继续完成；没有重置或清理其他工作。当前保留客户端为 Web 与微信小程序，其他端已依项目先前决策退出本仓库。

## 已修复的问题

1. **OpenAI 尺寸与参数**：GPT Image 2 生成 JSON 和编辑 multipart 均传实际像素 `size`；按 16 像素对齐、宽高比、总像素和边长上限计算。16:9 的 2K 为 `2048x1152`，4K 为 `3840x2160`；方图 4K 为 `2880x2880`，避免超过总像素上限。旧 GPT Image 仅开放原生固定尺寸，已有 2K 配置在非严格生成路径兼容映射到原生尺寸，不再承诺不存在的 4K。GPT-5.1/5.2 在 `reasoning_effort:none` 下才附采样参数；旧 GPT-5 Mini 和 Responses 模型省略不受支持的采样字段。Responses 的失败/不完整输出不能当成成功正文。

2. **Omni SSE**：百炼请求走流式，HTTP Omni 显式 `modalities:["text"]`；共用文本、视觉响应解析器，只拼接可见 `delta.content`，处理跨 UTF-8 分块、CRLF、终止标记、错误事件、截断和空输出。硅基流动 Omni 使用该渠道的 Chat SSE，不发送百炼专属字段。Realtime 型号需要独立实时会话接口，已明确排除。

3. **OpenRouter 角色与生命周期**：同一 ID 的主/视觉/图片角色合并，增加逐角色 `roleProtocols`；图片格式不兼容不能覆盖其有效文本角色。保存官方 `expiration_date` 为 `expirationDate`，到期后禁用并在图片派发前再次检查；2098 占位日期原样保留，不当成长期服务承诺。原始审计为 430 条通用记录、50 条图片记录，含重复 ID，不把 480 当唯一模型数。

4. **旧配置兼容**：仍有效的 GPT、Qwen、GLM、Kimi 旧版本保持原 ID。Gemini 已退役图像 preview、Ark Seedream Lite 拼写和百炼旧别名按本渠道迁移；Qwen3.8 Max Preview 结束后转正式版，不编造具体下线日期。已公布的 OpenAI、百炼到期日独立记录，到期后迁移至明确替代型号；Gemini 的“最早退役日”仅提示，不提前禁用。直连迁移规则不套用 OpenRouter 托管 ID。

5. **图片适配先于选择**：实现百炼 Kling、Vidu、旧 Wan 异步提交、轮询、失败/取消/超时和下载；POST 仅一次，失败时不会自动重复创建任务。按具体型号区分 `resolution`、`size`、messages、images、base_image_url 等字段。Vidu 使用官方逐代像素表；Wan2.6 生成/编辑分开处理交错输出。硅基流动 Qwen Edit 不发送 `image_size`，编辑专用模型在普通生图入队前拦截。Recraft V2 不开放直接编辑，V2/V3 提示词限制为 1000 字符，图生图继承源图尺寸；各代 Vector 可保留 SVG。CogView 与 GLM Image 使用各自的像素对齐和总像素限制。

6. **目录与客户端一致**：审定增量在 `config/model-catalog-updates.json`；`node scripts/sync-model-catalog.mjs` 同时生成共享后端内联目录、Web 和小程序完整回退目录，`--check` 校验漂移。后端 Node 服务复用 Laf 源文件，不另维护第二套目录。增加 512/原生尺寸、各型号比例、地区、到期/替代信息，以及产品源图上限和已知厂商上限字段；保持现有共享 API 透传兼容。

官方依据：[OpenAI 图片指南](https://developers.openai.com/api/docs/guides/image-generation)、[图片编辑参数](https://developers.openai.com/api/reference/resources/images/methods/edit)、[GPT-5.2 参数规则](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.2)、[百炼 Omni](https://help.aliyun.com/zh/model-studio/omni/)、[Kling API](https://help.aliyun.com/zh/model-studio/kling-image-generation-api-reference)、[Vidu API](https://help.aliyun.com/zh/model-studio/vidu-image-generation-api-reference)、[Wan2.6 API](https://help.aliyun.com/zh/model-studio/wan-image-generation-api-reference)、[硅基流动图片 API](https://docs.siliconflow.cn/docs/api/images-generations-post)、[Recraft API](https://www.recraft.ai/docs/api-reference/endpoints)、[OpenRouter 图片目录](https://openrouter.ai/api/v1/images/models)。

## 分渠道新增量

| 渠道 | 修正前静态项 | 修正后静态项 | 新增 ID |
|---|---:|---:|---:|
| DeepSeek | 3 | 3 | 0 |
| Kimi | 4 | 4 | 0 |
| 智谱 BigModel | 3 | 27 | 24 |
| 硅基流动中国站 | 3 | 59 | 56 |
| Anthropic Claude | 4 | 11 | 7 |
| Recraft | 4 | 16 | 12 |
| xAI | 2 | 7 | 5 |
| Google Gemini API | 15 | 15 | 0 |
| 阿里云百炼（北京） | 26 | 118 | 92 |
| OpenAI | 16 | 25 | 9 |
| 火山方舟（北京） | 21 | 21 | 0 |

新增数量按“渠道 + 精确模型 ID”统计；同模型由不同渠道托管不合并，旧快照和正式型号不混计成同一个 ID。完整 1,014 条审计证据逐项决定、角色、协议、尺寸、地区和来源见 [逐型号实现清单](model-catalog-decisions.csv)，机器校验清单见 `config/model-catalog-audit.json`。

## 新增 ID 明细

### 智谱 BigModel

`glm-5.3`, `glm-5.1`, `glm-5-turbo`, `glm-5`, `glm-4.7`, `glm-4.7-flashx`, `glm-4.7-flash`, `glm-4.6`, `glm-4.5-air`, `glm-4.5-airx`, `glm-4.5-flash`, `glm-4-flash-250414`, `glm-4-flashx-250414`, `glm-4-long`, `glm-5.3-flash`, `glm-4.6v`, `glm-4.6v-flash`, `glm-4.1v-thinking-flashx`, `glm-4.1v-thinking-flash`, `glm-4v-flash`, `glm-4.6v-flashx`, `cogview-4-250304`, `cogview-4`, `cogview-3-flash`

### 硅基流动中国站

`zai-org/GLM-5.3`, `deepseek-ai/DeepSeek-V4-Flash`, `Pro/zai-org/GLM-5.1`, `baidu/ERNIE-Image-Turbo`, `meituan-longcat/LongCat-2.0`, `Qwen/Qwen3.6-35B-A3B`, `Qwen/Qwen3.6-27B`, `deepseek-ai/DeepSeek-V4-Pro`, `moonshotai/Kimi-K2.7-Code`, `zai-org/GLM-5.2`, `Tongyi-MAI/Z-Image`, `Tongyi-MAI/Z-Image-Turbo`, `stepfun-ai/Step-3.5-Flash`, `Qwen/Qwen3.5-35B-A3B`, `Qwen/Qwen3.5-4B`, `Qwen/Qwen3.5-9B`, `Qwen/Qwen3.5-27B`, `Qwen/Qwen3.5-122B-A10B`, `deepseek-ai/DeepSeek-V3.2`, `Qwen/Qwen-Image-Edit`, `Qwen/Qwen-Image-Edit-2509`, `inclusionAI/Ling-mini-2.0`, `inclusionAI/Ling-flash-2.0`, `Pro/deepseek-ai/DeepSeek-V3`, `Pro/deepseek-ai/DeepSeek-R1`, `Pro/deepseek-ai/DeepSeek-V3.1-Terminus`, `Pro/deepseek-ai/DeepSeek-V3.2`, `Qwen/Qwen3-8B`, `Qwen/Qwen3-VL-32B-Thinking`, `Qwen/Qwen3-VL-32B-Instruct`, `deepseek-ai/DeepSeek-V3.1-Terminus`, `Qwen/Qwen3-VL-8B-Instruct`, `Qwen/Qwen3-VL-8B-Thinking`, `Qwen/Qwen3-VL-30B-A3B-Instruct`, `Qwen/Qwen3-VL-30B-A3B-Thinking`, `Qwen/Qwen3-Omni-30B-A3B-Instruct`, `Qwen/Qwen3-Omni-30B-A3B-Thinking`, `deepseek-ai/DeepSeek-V3`, `deepseek-ai/DeepSeek-R1`, `ByteDance-Seed/Seed-OSS-36B-Instruct`, `zai-org/GLM-4.5V`, `Qwen/Qwen3-Coder-30B-A3B-Instruct`, `zai-org/GLM-4.5-Air`, `Qwen/Qwen3-30B-A3B-Instruct-2507`, `tencent/Hunyuan-A13B-Instruct`, `Qwen/Qwen3-32B`, `Qwen/Qwen3-14B`, `deepseek-ai/DeepSeek-R1-0528-Qwen3-8B`, `THUDM/GLM-Z1-9B-0414`, `Qwen/Qwen2.5-7B-Instruct`, `Qwen/Qwen2.5-32B-Instruct`, `Qwen/Qwen2.5-72B-Instruct`, `THUDM/GLM-4-9B-0414`, `THUDM/GLM-4-32B-0414`, `Qwen/Qwen2.5-72B-Instruct-128K`, `Pro/Qwen/Qwen2.5-7B-Instruct`

### Anthropic Claude

`claude-fable-5`, `claude-opus-4-8`, `claude-opus-4-7`, `claude-opus-4-6`, `claude-opus-4-5-20251101`, `claude-sonnet-4-6`, `claude-sonnet-4-5-20250929`

### Recraft

`recraftv4_1_utility`, `recraftv4_1_utility_vector`, `recraftv4_1_utility_pro`, `recraftv4_1_utility_pro_vector`, `recraftv4`, `recraftv4_vector`, `recraftv4_pro`, `recraftv4_pro_vector`, `recraftv3`, `recraftv3_vector`, `recraftv2`, `recraftv2_vector`

### xAI

`grok-4.5`, `grok-4.3`, `grok-4.20-0309-reasoning`, `grok-4.20-0309-non-reasoning`, `grok-imagine-image`

### 阿里云百炼（北京）

`qwen3.7-max`, `qwen3.7-max-2026-06-08`, `qwen3.7-max-2026-05-20`, `qwen3.7-max-preview`, `qwen3.7-max-2026-05-17`, `qwen-max`, `qwen3.7-plus-2026-05-26`, `qwen3.6-plus`, `qwen3.6-plus-2026-04-02`, `qwen3.5-plus`, `qwen3.5-plus-2026-04-20`, `qwen3.5-plus-2026-02-15`, `qwen-plus`, `qwen-plus-latest`, `qwen-plus-2025-12-01`, `qwen-plus-2025-07-14`, `qwen-plus-2025-04-28`, `qwen-plus-2025-01-25`, `qwen3.7-flash-2026-07-15`, `qwen3.6-flash`, `qwen3.6-flash-2026-04-16`, `qwen3.5-flash`, `qwen3.5-flash-2026-02-23`, `qwen-flash`, `qwen-flash-2025-07-28`, `qwen-long`, `qwen3.5-omni-plus-2026-03-15`, `qwen3.5-omni-flash`, `qwen3.5-omni-flash-2026-03-15`, `qwen3-omni-flash`, `qwen3-omni-flash-2025-12-01`, `qwen3-omni-flash-2025-09-15`, `qwen3-coder-flash`, `qwen3-coder-flash-2025-07-28`, `qwen3.6-35b-a3b`, `qwen3.6-27b`, `qwen3.5-397b-a17b`, `qwen3.5-122b-a10b`, `qwen3.5-27b`, `qwen3.5-35b-a3b`, `deepseek-r1-distill-qwen-1.5b`, `deepseek-r1-distill-llama-8b`, `deepseek-r1-distill-llama-70b`, `vanchin/deepseek-v3.2-think`, `vanchin/deepseek-v3.1-terminus`, `vanchin/deepseek-r1`, `vanchin/deepseek-v3`, `vanchin/deepseek-v4-pro`, `vanchin/deepseek-v4-pro-0813`, `kimi-k2.7-code`, `kimi-k2.6`, `kimi-k2.5`, `kimi/kimi-k2.7-code-highspeed`, `kimi/kimi-k2.7-code`, `kimi/kimi-k2.6`, `kimi/kimi-k2.5`, `glm-5.2-fast-preview`, `glm-5.1`, `glm-5`, `ZHIPU/GLM-5.2`, `ZHIPU/GLM-5.1`, `ZHIPU/GLM-5`, `MiniMax-M2.5`, `MiniMax/MiniMax-M2.7`, `MiniMax/MiniMax-M2.5`, `MiniMax/MiniMax-M2.1`, `xiaomi/mimo-v2.5-pro`, `stepfun/step-3.7-flash`, `unisound/unisound-u2`, `qwen-image-2.0-pro-2026-06-22`, `qwen-image-2.0-pro-2026-04-22`, `qwen-image-2.0-pro-2026-03-03`, `qwen-image-2.0-2026-03-03`, `wan2.6-t2i`, `wan2.5-t2i-preview`, `wan2.2-t2i-plus`, `wan2.2-t2i-flash`, `wanx2.1-t2i-plus`, `wanx2.1-t2i-turbo`, `wanx2.0-t2i-turbo`, `wanx-v1`, `wan2.6-image`, `wan2.5-i2i-preview`, `wanx2.1-imageedit`, `kling/kling-v3-image-generation`, `kling/kling-v3-omni-image-generation`, `vidu/vidu-image_reference2image`, `vidu/vidu-image-pro_reference2image`, `vidu/vidu-image-lite_reference2image`, `vidu/viduq3-fast_reference2image`, `vidu/viduq2-pro_reference2image`, `vidu/viduq2-fast_reference2image`

### OpenAI

`gpt-5.1`, `gpt-5.2`, `gpt-4o`, `gpt-4o-mini`, `gpt-5.2-pro`, `gpt-5.3-codex`, `chat-latest`, `gpt-image-1.5`, `chatgpt-image-latest`

## 暂不接入及原因

- **即将退役的旧型号**：按原报告保留排除决定，不重新引入生命周期只剩数日/数周的入口；例如硅基流动四个 9 月 11 日退役型号、百炼公告 10 月 10 日退役快照，以及尚未接入的旧 OpenAI GPT/o 系列。已在图研使用或需兼容的 OpenAI 图片旧版保留，并显示到期与迁移目标。具体 ID/公告在 CSV 中逐项记录。
- **专用工作流**：Bailian Omni Realtime 要求 WebSocket/WebRTC；OCR、Captioner、翻译、音频、视频、embedding、rerank 不作为通用科研主模型。Recraft Styles 需要风格创建/引用流程和对应计费契约；Wan 蒙版、草图、虚拟模特等专用任务未作为普通图片模型开放。
- **地区或账号入口不同**：百炼美国 `-us` 型号、专属部署名称、Coding Plan/Token Plan 专用入口与当前北京按量付费通道不同，不能复制 ID 后启用。现有百炼共享 DashScope 域名官方仍支持；本轮没有增加新业务空间域名或地区路由。[百炼 Base URL 说明](https://help.aliyun.com/zh/model-studio/base-url)
- **权限或文档不充分**：xAI Build、Multi-agent Beta、受限邀请型号，以及未明确普通 API ID/后续指向的条目保留排除原因；OpenRouter `meta/muse-image` 缺少足以建立输出转换配置的官方格式证据，保持图片角色关闭。

## 验证结果

| 范围 | 结果 |
|---|---|
| Core 后端全套测试 | 418/418 通过 |
| Web 全套测试 | 331/331 通过 |
| 小程序测试文件 | 21/21 通过 |
| 共享 API + 全目录契约测试 | 31/31 通过 |
| Core TypeScript 与生产构建 | 通过 |
| 小程序 TypeScript 与 TS→JS 构建 | 通过 |
| Web Vite 生产构建 | 通过，有主包体积提示 |
| 同源目录漂移检查 | v12 / 306 项，无漂移 |

新增模拟测试覆盖所有可选静态主/视觉型号和所有相关图片适配器的实际派发；针对 GPT Image 2 生成/编辑尺寸、Omni 流分块/错误、OpenRouter 同 ID 多角色/到期、Vidu 像素表、编辑专用模型、异步失败不重复提交及下载不携带 API Key 单独断言。共享 API 验证 512/auto 原样透传。测试只使用拦截响应与本地存储桩。

## 剩余边界

- 没有 API Key，因此没有确认任何账号的模型开通、区域权限、余额、限流或真实生成质量；文档支持不等于某个账号必然可调用。
- 图研精修当前一次传 1 张源图；`maxReferenceImages` 表示当前实现上限，`providerMaxReferenceImages` 表示已确认的上游图像 API 上限，缺省表示该上限未在本次对应文档中落实。两者不会跨渠道互相复制。Omni 本轮开放文字/图片输入与纯文本输出，不开放实时音视频会话。
- 部分比例属于厂商近似像素档位，CSV 记录可选比例，适配器发送官方对应尺寸；不裁剪伪装比例。Ark Seedream 5.0/4.5 目前只开放自动比例，避免承诺接口未传入的 16:9。OpenAI 超过 2560×1440 的尺寸仍受官方实验性能力边界约束。
- Web 构建主包约 758 KB（gzip 162 KB），产生 Vite 大包提示；构建成功。
- 本轮没有部署。当前目录版本和行为只有在后续部署 API/Web、发布小程序后才会影响生产。
