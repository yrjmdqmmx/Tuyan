# 官方 API 目录扩展 v24 · 2026-09-22

本轮仅实现、官方公开资料核查、模拟测试和 Web 本地交互验收。没有充值、真实推理、历史任务重跑、部署或微信上传/发布。工作树为 `model-catalog-channels-20260921`，分支 `codex/official-channels-v24-20260922`；Desktop 旧 checkout 保留。目录 943→1029 个身份（新增五渠道83 + xAI3），包含历史停用项，不代表1029个账号均有权限。

## 核对结论与实现覆盖

| 官方 API 渠道 | 独立型号 | 主模型 | 视觉 | 生图 | 图片编辑 |
|---|---:|---:|---:|---:|---:|
| 商汤 SenseNova | 7 | 5 | 2 | 2 | 2 |
| 阶跃星辰 | 7 | 5 | 3 | 2 | 2 |
| 百度千帆 | 36 | 30 | 14 | 2 | 1 |
| 讯飞星辰 MaaS | 32 | 31 | 6 | 0 | 0 |
| 美团 LongCat | 1 | 1 | 0 | 0 | 0 |

角色计数重叠：83型号、72主模型、25视觉、7图片，其中5支持编辑。图像角色中 `qwen-image-edit` 只能编辑；其余6支持生成。表格表示本地实现，不表示付费调用成功。

逐型号 API ID、研发方、版本、地区、角色、输入输出、限额、价格、请求/响应及生命周期：见 [决定表](model-decisions.csv) 和 [机器审计](../../../config/channel-audit/v24)。五个 `*-integration.json` 精确列出本轮入选与未接入候选，不把研究建议当实现完成。

- [商汤审计](sensenova.md)：新平台 `token.sensenova.cn`，Bearer Key；不是旧 SenseCore AK/SK/JWT。7项全部适配，Kimi K3使用Data URL和max_completion_tokens。U1.5原文对主图是否计入5张表述有歧义，本产品总共保守限制5张，官方精确总上限仍未知。公开通用API不证明多用户商业后端权益已获准；积分单价未知，不能将/models示例0当免费。
- [阶跃审计](stepfun.md)：7项全部适配中国普通 API，国际站、Step Plan 分开记录，未自动混用。2x是 JSON图生图；edit2是multipart，精修继承原尺寸。两款图片 API 2026-10-10停服，按北京时间当日零点作为产品保守停止提交时刻（官方没有公布时区/时分）。旧结果可继续下载。Step Plan Router 后端引擎不是可指定型号。
- [千帆审计](qianfan.md)：普通49个唯一ID全部逐项核对，36项实现；13项专用任务排除，国际/内部beta图片/历史退役另表。`DeepSeek-OCR`只user单图；MuseSteamer/Qwen生成与Qwen编辑分别适配。Token/Coding Plan禁止应用后端；不混用其Key。9月29日到期型号按同一北京时间产品策略隐藏并拒绝新提交，不提前删除或自动替换。
- [讯飞审计](iflytek.md)：正式入口名为“讯飞星辰 MaaS”，TokenPlan文档标题为“Astron Token Plan”。本轮32款普通MaaS HTTP服务（24 Chat+8 Anthropic），31主/6视觉。星火独立API Password、同名spark-x不同端点、WebSocket签名、星火图像签名接口尚未纳入MaaS凭据槽，逐项暂缓；不是宣称讯飞没有图像能力。HiDream异步结果/图数契约仍不足；体验页型号不伪装API。Coding Plan明令禁止后端，Token Plan用途未确认，分别记录。
- [LongCat审计](longcat.md)：当前普通API只有LongCat-2.0文本。6个旧Flash/Thinking/Omni服务明确退役，Preview身份未确认；不从品牌宣传推断视觉或生图开放。

## Grok 4.7

[公告](https://x.ai/news/grok-4-7)与[API日志](https://docs.x.ai/developers/release-notes)均标注2026-09-21，用户所述“9月22日发布”需作此修正。API确已开放，精确ID `grok-4.7`，文本/图片输入、文本输出、500k上下文；本轮走已有Responses接口。没有推造dated snapshot或`-latest`别名。Fast仅见Cursor/Grok Build开放说明，公共API ID未确认，不上架。

[型号页](https://docs.x.ai/developers/models/grok-4.7)：标准端点美元/百万tokens，输入<200k为2输入/0.5缓存/6输出，>=200k为4/1/12；low/medium/high/xhigh思考档位，默认high。美国地域端点额外10%，保留原标准端点。文档额度不是当前账户准入证明；未读Key或余额、未调用推理。

现有直连12个条目逐页复核模态、别名、价格和版本。补入4.7及4.20 Multi-Agent固定0309/滚动别名两项；Beta清楚标注。Grok Imagine 2.0至多5图、旧款3图，本轮补齐真实JSON多图编辑；不发mask或伪造结构化能力。`grok-imagine-image-quality`公告11月2日退役，保留到期提示和原配置，按既有UTC日期规则到期拒绝（非官方时分承诺）。May15退役型号即便仍可重定向也不作为原型号上架。全部alias保存在[xAI逐项审计](../../../config/channel-audit/v24/xai.json)，避免冗余别名淹没选择器。

[OpenRouter自身公开目录](https://openrouter.ai/api/v1/models)的4.7调用ID是`x-ai/grok-4.7`，canonical_slug是`x-ai/grok-4.7-20260916`；不当作直连快照。fal3项、Replicate2项、Runware4项按各平台自己的API页/schema再核对，不套用原厂退役时间。公开目录/schema存在仍不证明账号调用与收费。详见`openrouter-grok.json`及`hosted-grok.json`。

## 稀宇科技名称与身份

渠道主要名称统一为“稀宇科技”，模型品牌与搜索别名仍保留MiniMax。[官方协议](https://design.minimax.cn/protocol/user-agreement)列运营主体上海稀宇科技有限公司。内部`minimax`、两区域API地址/密钥槽、原模型ID、历史配置/任务不迁移。Web、小程序共享选择器、设置、教程及区域提示同步；模拟验证区域Key隔离。

## 实现与证据边界

复用目录生成、上传/冻结PNG、路由、费用记录和7天加密恢复。同步提交在持久化后只发一次POST；不确定结果停止，已保存URL仅下载。费用分公开价/估算/响应报告/核对账单；xAI ticks按10^10每美元记录，invoice仍null。所有新平台权益、真实质量、地区/配额及结算均未验证。

Web 1440×1000与390×844交互通过：17次型号选择、区域Key隔离、商汤多图和千帆编辑模拟成功、切换保留输入/不兼容阻止、无控制台错误/无横向溢出。完整模拟记录及截图位于 `/Users/a1-6/.codex/artifacts/tuyan-official-v24-20260922/`。本轮未验收微信真实平台；小程序共享配置/TS/JS可用，上一轮原生辅助图/遮罩UI待办继续保留。

小程序同格式无损打包优化节省约57KB；不删字段/型号、不放宽原1.5MiB源码预算。通过现有解码器核对JSON/SHA、对象独立与确定性。最终测试数字见[验证记录](validation.md)。

## 本轮已实现的准确 ID

### 商汤 SenseNova

`sensenova-6.8-flash-lite`, `deepseek-v4-pro`, `deepseek-v4-flash`, `glm-5.2`, `kimi-k3`, `sensenova-u1.5-lite`, `sensenova-u1.5-fast`。

### 阶跃星辰

`step-5-preview`, `step-3.7-flash`, `step-3.5-flash`, `step-3.5-flash-2603`, `step-1o-turbo-vision`, `step-2x-large`, `step-image-edit-2`。

### 百度千帆

`ernie-5.1`, `ernie-5.0`, `ernie-5.0-thinking-preview`, `ernie-5.0-thinking-latest`, `ernie-5.0-thinking-exp`, `ernie-4.5-turbo-32k`, `ernie-4.5-turbo-128k`, `ernie-4.5-turbo-20260402`, `ernie-4.5-turbo-vl`, `ernie-4.5-turbo-vl-32k`, `deepseek-v4.1-flash`, `deepseek-v4-pro-0813`, `deepseek-v4-pro`, `deepseek-v4-flash-0731`, `deepseek-v4-flash`, `deepseek-v3.2`, `internvl3-38b`, `ernie-x1.1-preview`, `ernie-x1.1`, `deepseek-flash`, `deepseek-v3.2-think`, `qwen3.5-397b-a17b`, `qwen3.5-122b-a10b`, `qwen3.5-27b`, `qwen3.5-35b-a3b`, `glm-5.3-flash`, `glm-5.3`, `glm-5.2`, `glm-5.1`, `glm-5`, `kimi-k2.6`, `deepseek-ocr`, `qianfan-ocr`, `musesteamer-air-image`, `qwen-image`, `qwen-image-edit`。

### 讯飞星辰 MaaS

`spark-x2.5`, `spark-x2.5-4b`, `spark-x2.5-1.7b`, `xopglm53`, `xopdeepseekv4pro0813`, `xopdeepseekv4flash0731`, `xopkimik27code`, `xopglm52`, `xopdeepseekv4flash`, `xopkimik26`, `xopdeepseekv4pro`, `xopqwen36v35b`, `xsparkx2flash`, `xopglm51`, `xsparkx2`, `xop35qwen2b`, `xopqwen35397b`, `xminimaxm25`, `xopkimik25`, `xopglmv47flash`, `xop3qwen32bvl`, `xop3qwen80bnext`, `xop3qwen30b`, `xop3qwen32b`, `xdeepseekr1qwen32b`, `xop3qwen0b6`, `xop3qwen4b`, `xop3qwen14b`, `xop3qwen8b`, `xsparkprox`, `xspark13b6k`, `xqwen14bchat`。

### 美团 LongCat

`LongCat-2.0`。
