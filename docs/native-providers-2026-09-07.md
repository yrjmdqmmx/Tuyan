# 第一批原生 API 渠道接入（2026-09-07）

目录版本 `2026-09-07.v11`，在当天 v10 模型更新基础上增加七个渠道、23 个原生模型 ID。模型支持依据各厂商公开 API 文档；验证只使用本地模拟请求、构建与契约回归，没有使用付费推理或账户 Key。产品不新增“未实测”标签。

## 接入清单

| API 渠道 | 原生模型 ID | 图研角色 |
| --- | --- | --- |
| DeepSeek | `deepseek-v4-pro` | 主模型 |
| DeepSeek | `deepseek-v4-flash` | 主模型 |
| DeepSeek | `deepseek-v4-flash-vision-exp` | 主模型 / 识别 |
| Kimi（月之暗面） | `kimi-k3` | 主模型 / 识别 |
| Kimi（月之暗面） | `kimi-k2.7-code` | 主模型 / 识别 |
| Kimi（月之暗面） | `kimi-k2.7-code-highspeed` | 主模型 / 识别 |
| Kimi（月之暗面） | `kimi-k2.6` | 主模型 / 识别 |
| 智谱 GLM | `glm-5.2` | 主模型 |
| 智谱 GLM | `glm-5v-turbo` | 主模型 / 识别 |
| 智谱 GLM | `glm-image` | 生图 |
| 硅基流动 SiliconFlow | `Pro/moonshotai/Kimi-K2.6` | 主模型 / 识别 |
| 硅基流动 SiliconFlow | `Qwen/Qwen-Image` | 生图 |
| 硅基流动 SiliconFlow | `Kwai-Kolors/Kolors` | 生图 |
| Anthropic Claude | `claude-fable-5-1` | 主模型 / 识别 |
| Anthropic Claude | `claude-opus-5` | 主模型 / 识别 |
| Anthropic Claude | `claude-sonnet-5` | 主模型 / 识别 |
| Anthropic Claude | `claude-haiku-4-5-20251001` | 主模型 / 识别 |
| Recraft | `recraftv4_1` | 生图 |
| Recraft | `recraftv4_1_pro` | 生图 |
| Recraft | `recraftv4_1_vector` | 生图 |
| Recraft | `recraftv4_1_pro_vector` | 生图 |
| xAI | `grok-4.6` | 主模型 / 识别 |
| xAI | `grok-imagine-image-2.0` | 生图 |

## 接口依据与差异

- [DeepSeek Vision](https://api-docs.deepseek.com/guides/vision/)：Chat Completions；只有 `deepseek-v4-flash-vision-exp` 提供视觉输入。使用 `https://api.deepseek.com/v1`。
- [Kimi 中国区快速开始](https://platform.kimi.com/docs/get-api-key)：`https://api.moonshot.cn/v1/chat/completions`；K3 / K2.7 Code / K2.6 的图文输入，保留模型默认采样参数。需要中国区开放平台 Key。
- [智谱 GLM 5.2](https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2)、[GLM 5V Turbo](https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5v-turbo)、[图像生成 API](https://docs.bigmodel.cn/api-reference/模型-api/图像生成)：`open.bigmodel.cn/api/paas/v4`。GLM Image 自定义尺寸按 32 像素对齐，支持文生图，精修使用分析后重绘。
- [SiliconFlow 视觉输入](https://docs.siliconflow.cn/docs/userguide/capabilities/vision)、[图片 API](https://docs.siliconflow.cn/docs/api/images-generations-post)：`api.siliconflow.cn/v1`；模型 ID 保留平台前缀。Qwen Image 使用官方推荐尺寸与 CFG；Kolors 可带 `image` 直接编辑。返回 `images[].url`，无 Key 下载并检查图片格式。
- [Claude 模型](https://platform.claude.com/docs/en/models/overview)、[Vision](https://platform.claude.com/docs/en/build-with-claude/vision)：原生 `api.anthropic.com/v1/messages`，`x-api-key`、`anthropic-version`、顶层 system 与图像 source；只提取 text，不使用思考块。达到输出长度限制时报错，不把截断代码当完整结果。
- [Recraft API](https://www.recraft.ai/docs/api-reference/endpoints)、[尺寸附录](https://www.recraft.ai/docs/api-reference/appendix)：`external.api.recraft.ai/v1/images/generations`；改图使用 JSON `imageToImage` + `image_url` + `strength`，改图不发送 size、不声明可指定精修比例。普通模型为 1K 档，Pro 为 2K 档；Vector 选择 PNG 时按对应宽度渲染，选择 SVG 时保留经过清理的原生 SVG。
- [Grok 4.6](https://docs.x.ai/developers/models/grok-4.6)、[图片生成](https://docs.x.ai/developers/model-capabilities/images/generation)、[图片编辑](https://docs.x.ai/developers/model-capabilities/images/editing)：文本/看图走 `api.x.ai/v1/responses`；生图/改图走 JSON `images/generations` / `images/edits`，改图输入为 `image: {type: 'image_url', url}`，resolution 使用小写 `1k` / `2k`。

## 路由与发布

DeepSeek、Kimi、Claude 无生图默认值；Recraft 无主模型/识别默认值。专业模式按角色组合，缺失角色不会借用其他渠道的模型或 Key。旧服务端未返回新增渠道时，小程序仍可使用原有五个渠道，新渠道不会凭本地常量绕过服务端授权。

Recraft Vector + SVG 的示意图默认规划流程要求 main + image，vanilla 直出只要求 image；其他 SVG 沿用主模型输出，统计图仍由主模型生成绘图代码。密钥只保留在请求/任务执行内存，不进入任务记录或文档。

运行时与 SG Squid 同时增加精确主机 `api.anthropic.com`、`api.x.ai`、`external.api.recraft.ai`。国内四个新渠道沿用直接出口。上线须先确保 SG 白名单配置已经应用；本次仅修改配置模板，没有部署、重启生产服务或执行真实推理。

## 本地验证结果

- API 全量测试：408 通过，包括原生请求、空缺角色、密钥范围、SVG 完整任务与旧路径回归。
- Web 全量测试：330 通过，包括普通模式渠道过滤、专业模式 Vector 选择与按实际角色收集 Key。
- 小程序及跨端目录：22 个测试文件/用例通过；`tsc` 通过并同步生成 JS。
- SG/HK 出口配置契约：23 通过；新增域名的代理分流在 API 模拟传输测试中验证。
- API 类型检查、API 生产构建、Web 生产构建、`git diff --check` 通过。

工作分支：`codex/model-catalog-20260907`；本次结果仍在本地工作区，未提交、推送或部署。测试使用模拟厂商响应，不表示账户开通、地区可用性或真实生成质量已经验证。
