# 商汤 SenseNova 官方目录与协议审计

核对时间：2026-09-22。普通公开官方资料审计；真实 API Key、鉴权目录请求、推理、充值、账单与部署均为 0。逐型号机器记录见 [sensenova.json](../../../config/channel-audit/v24/sensenova.json)。

## 当前平台与完整覆盖

用户给定的 [当前文档入口](https://platform.sensenova.cn/docs) 已换成新 Token Plan 平台。浏览器实际页面逐节列出 **7 个相关型号**：5 个主模型、2 个视觉理解模型、2 个图片生成/编辑模型（角色可重叠）。搜索引擎仍大量返回旧 `product/APIService` / SenseCore V6.5 文档；这些不能替代当前页面，也不能因为旧页面 404 或新目录缺席就判为退役。

| 精确 API ID | 研发方 | 主模型 | 视觉 | 生图/编辑 | 版本依据 |
| --- | --- | --- | --- | --- | --- |
| sensenova-6.8-flash-lite | SenseTime | 是 | 是 | — | 官方精确 ID；是否不可变未知 |
| deepseek-v4-pro | DeepSeek | 是 | 未声明 | — | 本平台写明 V4 Pro0813 正式版；保持调用别名 |
| deepseek-v4-flash | DeepSeek | 是 | 未声明 | — | 本平台写明 V4 Flash0731 正式版；保持调用别名 |
| glm-5.2 | Z.ai | 是 | 未声明 | — | 官方精确 ID；是否不可变未知 |
| kimi-k3 | Moonshot AI | 是 | 是 | — | 官方精确 ID；是否不可变未知 |
| sensenova-u1.5-lite | SenseTime | — | — | 两者 | 官方精确 ID；是否不可变未知 |
| sensenova-u1.5-fast | SenseTime | — | — | 两者 | 官方精确 ID；是否不可变未知 |

渠道按商汤官方平台直连分类，托管的第三方型号独立保留研发方，不冒充商汤研发。文档的 `GET /v1/models` 结构包括 `id/name/input_modalities/output_modalities/context_length/max_output_length/pricing/supported_features/datacenters`；本轮没有拿真实 Key 请求目录。

## 鉴权、地区与价格

当前 API 根地址为 `https://token.sensenova.cn/v1`，使用 [控制台 API Key](https://platform.sensenova.cn/console/keys) 的 `Authorization: Bearer <sk-...>`，不要求客户端生成 JWT。国际地区、跨地区 Key 复用均未知。

通用 curl / Python / JavaScript 调用已有官方示例；[商汤 FAQ](https://sensetime.com/cn/faq/) 明确 Token Plan 面向数据分析、深度调研、报告和信息图工作流，没有发现仅限 Coding CLI 的规定。不过可见页面未逐字确认多用户商业应用后端或转售服务的合同许可，商业权益保持 unknown；技术接入不等于该许可已获核准。

[Token Plan 页面](https://www.sensenova.cn/token-plan) 为 ¥0 公测、最多 20 个 API Key；付费 Lite/Pro 尚待开放。当前文档的积分段给出通用池与 Flash Lite 专属池分别 60,000 / 滚动 5 小时及 600,000 / 滚动周。**积分不是 tokens，单型号积分消耗率未给出；目录示例的 pricing=0 不证明该型号永久免费。** 公测免水印去除费也不等同生图免费。逐型号金额全部 null。

[旧 SenseCore 鉴权](https://www.sensecore.cn/help/docs/model-as-a-service/nova/overview/Authorization) 则支持 API Key（自 2024-10-30）以及 AK/SK 签署的 HS256 JWT：`iss=AK`、`exp`、可选 `nbf`，SK 签名；文档示例寿命 30 分钟。旧 `api.sensenova.cn/v1/llm/chat-completions` 与新入口、Key、模型 ID 不混用。

## 文字和视觉适配

普通模型走 `POST /chat/completions`，`model/messages`、非流式 `choices[0].message.content`。Flash Lite 使用 `reasoning`；DeepSeek、GLM、Kimi 使用 `reasoning_content`。工具循环需按对应模型保留思考历史。

- Flash Lite 图片为 OpenAI 对象式 `image_url:{url}`，支持公开 URL / 完整 Data URL 与 JPEG/PNG/WebP；数量、字节和尺寸上限未公布，不能套用旧 Vision 的 6 张/45 MB。max_tokens 1–65536，默认 65535。文档目录示例上下文为 262144，而 OpenCode 示例为 256000，记录来源差异。
- 本平台 DeepSeek Pro/Flash 只声明文字；不继承研发方另一渠道的视觉能力。上下文 1M，思考参数和 top_p 有专有限制，详见 JSON。
- GLM-5.2 上下文 1M、最大输出 128K。关闭思考用 `reasoning_effort:none`；官方明确 `thinking.type=disabled` 会失败。
- Kimi K3 图片只支持完整 Data URL，不支持远程 URL；最大图片数/字节数未知。专节字段是 `max_completion_tokens`（部分示例仍写 max_tokens），上下文 1M，最大输出按剩余上下文计算。temperature=1、top_p=0.95；勿传 presence/frequency penalty。
- Anthropic 兼容路径 `/messages` 存在，但思考字段示例和枚举有冲突；首版选择核验更明确的 OpenAI 路径。

## U1.5 两型号的真实同步图片合同

生图 `POST /images/generations` JSON；编辑 `POST /images/edits` **也为 JSON，不是 multipart**：

```json
{
  "model": "sensenova-u1.5-lite",
  "prompt": "科研图编辑说明",
  "images": [{"image_url": "data:image/png;base64,..."}],
  "n": 1,
  "size": "1024x1024",
  "output_format": "png",
  "response_format": "url",
  "watermark": true,
  "prompt_extend": false
}
```

生图省略 images。编辑第一张为主图；原文“至多支持 5 张参考图”对是否含主图不够明确，因此本地保守限制**总图数 5**，不承诺 6 张。单图字节/像素及提示词上限未知；无 mask 合同。输出尺寸为 WxH，每边 512–4096、32 的倍数、比例 1:3 至 3:1；auto 是官方默认。官方建议包括 2048²、2720×1536、1536×2720、1664×2496、2496×1664、4096²。不从“2K/4K”文案臆造不明字符串。

响应 `data[].url` 或 `data[].b64_json`，二者由 response_format 选择，默认 b64_json。URL 有效 24 小时；顶层 size/output_format，usage 含输入文字/图像 tokens、输出 tokens、images_count。watermark=true 为官方默认；示例中的 prompt_extend=false 是产品保持用户提示词的明确选择，官方默认 true。

没有异步任务轮询或幂等重放合同。提交前持久化 submitting，最多一次 POST；有 URL 只恢复下载，下载不带 API Key；未知提交结果不重新生成。usage 不能当已核对账单。

## 排除与边界

JSON 逐条保留旧 V6.5/V6、SenseChat VisionV5.5、Character/Character Pro/Turbo、SenseChat 5/1202/Turbo 等历史 ID；新入口未声明其可用，所以不作为新平台可选项，生命周期仍为 unknown。旧页中的 6 图/45 MB、字符串 image_url、image_base64/file_id、max_new_tokens 不适用于新平台。旧秒画/人脸/分割/擦除/超分/扩图等专用流程，没有当前七型号目录的精确 ID 和通用请求证据则单列排除，绝不编造型号。

本次“可适配”不等于已开通、已真实调用或已发布。没有找到当前七型号的正式退役公告。
