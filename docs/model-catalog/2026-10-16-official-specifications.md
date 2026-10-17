# 2026-10-16 Web 模型卡片官方规格

## 范围

本地展示层补核上一轮 AA 未精确覆盖的 206 项理解推理型号，另补 3 个 Seedream 图片型号。数据位于 `apps/web/src/data/model-card-specifications.json`，逐项含核查日期、精确调用 ID、来源、状态和版本/渠道例外。

首轮 206 项中：115 项完整确认（106 原厂、9 特定渠道服务）；63 项部分确认；26 项版本映射未确认；2 项一手规格未取得。首轮结合现有渠道资料为 187 项至少一个渠道三字段齐全、176 项全部渠道齐全、19 项尚有缺口。下方续核记录给出当前结果；这不代表真实调用通过。

## 展示行为

`modelCardSpecifications` 只输出型号对应的输入、输出、上下文和官方链接。字段保留原厂/渠道来源范围，续核后将范围移入悬停说明；没有对应证据时保留待确认。移除卡片详情、日期/状态徽标、ID 复制、适配参数和到期信息，保留选择、搜索、桌面三栏、手机分步导航与焦点行为。

窗口只采用明确的上下文字段，不把最大输入/输出相加。精确日期或特定服务的数值不跨 ID 或渠道继承。DeepSeek 官方旧别名的展示名可归并 V4.1 Flash，但传输 ID 保留；其他渠道不自动跟随。

这是 Web 展示资料，未修改共享模型目录、API 字段或后端限制，因此没有新增跨端待办。小程序保持暂停。官方模态不代表图研适配器已接入。

## 证据与验证

完整报告：`/Users/a1-6/.codex/artifacts/tuyan-official-model-specs-20261016/REPORT.md`；CSV、原始抓取、哈希、逐渠道显示值与 QA 均在同一目录。

模型卡片与交互定向测试 33/33；Web 构建通过；Chrome 1440×1000 / 390×844 搜索、选择、文档新窗口、Escape 焦点恢复通过。全量测试一次为 725/763 通过、38 失败；37 项在修改前隔离对照中同样失败，另 1 项当前和对照单独复跑均通过。不是全量验收通过。

未调用付费模型，未同步上游、提交、推送、部署。

## 续核：剩余 19 项、版本映射、图标和 Logo

本轮更新 10 个型号条目的证据或范围。当前 206 项状态为：120 项完整确认、61 项部分确认、25 项仍存在版本或服务映射问题，未取得任何一手规格的条目降为 0。结合精确渠道资料，193 项至少一个渠道三字段齐全，181 项全部渠道齐全；原 19 项中补齐 6 项，剩余 13 项仍有缺口。字段完整性与版本映射状态分别统计，不能互相替代。

| 型号 | 续核结论 | 一手来源 |
| --- | --- | --- |
| Xing4.0 29B | 硅基流动精确 ID 对应 Xing4.0-29B-A4B；文本输入/输出、原生 256K，外推 512K 不作默认值 | [原作者模型卡](https://huggingface.co/XingChen-AGI/Xing4.0-29B-A4B)、[渠道映射](https://www.siliconflow.cn/models) |
| GLM-4.1V-Thinking-Flash | 补上下文 64K | [官方总览](https://docs.bigmodel.cn/cn/guide/start/model-overview) |
| GLM-4V-Flash | 补上下文 16K | [官方总览](https://docs.bigmodel.cn/cn/guide/start/model-overview) |
| Gemini 3 Flash / Gemini 3.1 Pro | 仅 Runware：文本、图像、音频、视频、文件输入，文本输出，1M；原厂 Preview 映射仍未确认 | [Flash](https://runware.ai/docs/models/google-gemini-3-flash)、[Pro](https://runware.ai/docs/models/google-gemini-3-1-pro)、[AIR ID 映射](https://runware.ai/docs/tools/compatible-apis) |
| Doubao Seed Code Preview 251028 | 文本与图像输入、文本输出、256K | [官方发布记录](https://docs.volcengine.com/docs/ark/model-release-announcement-2025?lang=en)、[官方发布文章](https://developer.volcengine.com/articles/7577301460712030258) |
| SenseNova 6.8 Flash Lite | 官方名称为 Preview，API 文档确认文本与图像输入、文本输出；上下文仍未取得 | [官方 API 文档](https://github.com/OpenSenseNova/SenseNova6.8/blob/main/API.md) |
| Weaver (alpha) | 已在 Mancer 官方目录找到 weaver-alpha；文本输入/输出、8,000 上下文，和 OpenRouter 名称、描述、窗口对应 | [Mancer](https://mancer.tech/models/weaver-alpha)、[OpenRouter](https://openrouter.ai/mancer/weaver) |
| DeepSeek V4 Pro Preview | 仅原厂直连：deepseek-v4-pro 当前对应 V4-Pro-0813，显示名去掉 Preview；其他渠道仍保留原范围 | [官方模型与价格](https://api-docs.deepseek.com/quick_start/pricing/) |
| Qwen3.8 Max Prime | 阿里云价格表确认名称；Prime 页型号表尚未列 Qwen，原厂数值不继承标准版。补 OpenRouter 精确服务规格，继续保留映射待核 | [官方价格](https://help.aliyun.com/zh/model-studio/model-pricing)、[Prime](https://help.aliyun.com/zh/model-studio/prime-mode)、[OpenRouter](https://openrouter.ai/qwen/qwen3.8-max-prime) |

### 仍有缺口的 13 项

- Doubao 1.5 Lite 32K / Pro 32K / Vision Pro 32K、Seed 1.6 Vision：已检查历史发布与现行文档，未取得旧快照的精确总窗口依据；型号中的 32K 不充作验证证据。
- Deep Research U3 / U3 Pro、Deep Search S3 / S3 Pro：官方文档说明研究或检索流程，未给出总上下文；累计研究预算不等于上下文窗口。
- LLaVA 1.6 Mistral 7B：官方模型卡/模型列表未明确部署总窗口，配置容量不等于服务上限。
- SenseNova 6.8 Flash Lite Preview：已补模态，未取得上下文。
- ERNIE 5.1：已有窗口与文本输出，输入模态仍缺精确型号依据。
- Spark Lite：只有分开的输入/输出限额，不相加推断总窗口。
- Spark Max：官方版本升级与该渠道旧名称的映射仍未明确，总窗口保留未知。

其余 25 项版本问题仍逐项留在 JSON 的 `status` / `note` / `providerOverrides` 中，包括 GPT Pro 后缀、Gemini Preview、CogEvol 三个变体、Seed 旧别名、MiniMax 01 组合服务、Switchyard 路由服务和 Pareto 旧版本。没有把相似名称、网页跳转或产品订阅档位作为合并依据。

### 卡片与素材

输入和输出使用文本、图像、音频、视频图标；文档能力另显示文件图标。深色为有支持依据，灰色为文档未列支持，问号与虚线表示待确认，星号表示有限或附条件支持；完整限定条件保留在悬停和无障碍标签。可见的“（原厂）”“（渠道）”已去掉，来源范围仍保存在数据和悬停说明。

渠道、厂商、型号和当前已选型号显示本地 Logo；型号沿用厂商标识。自定义渠道用连接图标，开发方未确认的条目用中性问号，不把聚合渠道 Logo 当成模型厂商。所有已识别渠道和厂商均有本地素材；来源、哈希、授权说明见 `apps/web/src/data/model-brand-logos.json`，资源和 LobeHub MIT 许可位于 `apps/web/public/brand/catalog/`。没有新增运行时图片域名或 npm 依赖。

本轮证据、逐条差异、剩余项与逐渠道显示值：`/Users/a1-6/.codex/artifacts/tuyan-model-card-icons-20261016/`。定向规格与交互测试 36/36 通过；桌面和手机 Chrome 搜索、选择、来源新窗口、Escape 焦点恢复与无横向溢出检查通过。构建通过，保留既有大包体积警告。没有重跑或宣称全量测试通过，也不代表真实模型质量或生产通过。
