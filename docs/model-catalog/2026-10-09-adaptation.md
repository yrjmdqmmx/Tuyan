# 2026-10-09 模型目录补齐与适配验收

执行基线：独立工作树 `model-catalog-20261009`、分支 `codex/model-catalog-20261009`，接续调查提交 `b8e25cc`。依据同日[逐项调查](2026-10-09-research.md)、[公开 schema 快照](2026-10-09-research-evidence.json)实施；未修改其他 4.0 工作树、服务和配置。

目录 `2026-10-09.v30`：**1066 → 1079 个渠道身份，新增 13 个，删除 0 个**。此前全部 ID 和默认选择保持。21 个新增/纠正身份的字段、版本与来源见[交付表 CSV](2026-10-09-adaptation.csv)。本报告中的“已适配”仅指本地代码和模拟验证；没有真实账户推理验证。

## 本轮交付

| 渠道 | 准确 API ID | 实现结果与关键边界 | 接口证据 |
|---|---|---|---|
| TokenDance | `cogevol-base` | 新增主模型；文本输入/输出，65,536 token 上下文；最大输出、思考可调字段仍待确认 | [渠道模型详情](https://tokendance.space/models/cogevol-base) |
| TokenDance | `cogevol-interactive-0828` | 新增主模型；文本输入/输出，32,768 token 上下文；HTML/SVG 不标为原生图像 | [渠道模型详情](https://tokendance.space/models/cogevol-interactive-0828) |
| TokenDance | `cogevol-slide-0828` | 新增主模型；文本输入/输出，32,768 token 上下文；幻灯片代码不标为图像输出 | [渠道模型详情](https://tokendance.space/models/cogevol-slide-0828) |
| fal | `blackforestlabs/flux-3/text-to-image`；编辑 `blackforestlabs/flux-3/edit-image` | 新增一组生成/直接编辑；1K/2K/4K，单原图。原图宽高均至少 256px；超过 4MP 是渠道自动缩小，不作硬拒绝上限 | [生成](https://fal.ai/models/blackforestlabs/flux-3/text-to-image/api)、[编辑](https://fal.ai/models/blackforestlabs/flux-3/edit-image/api) |
| fal | `ideogram/v4.5`；编辑 `ideogram/v4.5/edit` | 新增一组生成/直接编辑；按生成尺寸表选择，编辑继承原图、自动尺寸。没有开放 mask/多辅助图 | [生成](https://fal.ai/models/ideogram/v4.5/api)、[编辑](https://fal.ai/models/ideogram/v4.5/edit/api) |
| fal | `bytedance/seedream/v5/flash/text-to-image`；编辑 `bytedance/seedream/v5/flash/edit` | 新增一组生成/直接编辑；当前图研 1K/2K，面积 1,048,576–4,194,304px、比例 1:16–16:1；单原图 | [生成](https://fal.ai/models/bytedance/seedream/v5/flash/text-to-image/api)、[编辑](https://fal.ai/models/bytedance/seedream/v5/flash/edit/api) |
| Replicate | `google/gemini-3.5-flash` | 新增主模型/视觉；文本与图片输入→文本输出。固定审核版本；`thinking_level=none/low/high`；渠道最大输出 65,535 token，上下文待确认 | [schema](https://replicate.com/google/gemini-3.5-flash/api/schema) |
| Replicate | `google/gemini-3-flash` | 新增主模型/视觉；同渠道独立 schema，固定版本；`thinking_level=none/low/high`，最大输出 65,535，上下文待确认 | [schema](https://replicate.com/google/gemini-3-flash/api/schema) |
| Replicate | `google/gemini-2.5-flash` | 新增主模型/视觉；固定版本；`thinking_budget=0..24576`，`dynamic_thinking=false`；最大输出 65,535，上下文待确认 | [schema](https://replicate.com/google/gemini-2.5-flash/api/schema) |
| Replicate | `qwen/qwen3-7-plus` | 新增主模型，暂不开放视觉；固定版本，最大输出 65,536；图片数量/限制、上下文等未证实字段仍待确认 | [schema](https://replicate.com/qwen/qwen3-7-plus/api/schema) |
| Replicate | `deepseek-ai/deepseek-v3.1` | 新增主模型；固定版本，渠道 `thinking=medium/None`，注意 `None` 大小写；不把默认输出值当成上限 | [schema](https://replicate.com/deepseek-ai/deepseek-v3.1/api/schema) |
| Replicate | `moonshotai/kimi-k2-thinking` | 新增主模型；固定版本，固定思考能力，无伪造关闭开关；最大输出和上下文待确认 | [schema](https://replicate.com/moonshotai/kimi-k2-thinking/api/schema) |
| Replicate | `qwen/qwen3-235b-a22b-instruct-2507` | 新增主模型；固定版本，最大输出 16,384；不推断内部思考或图片输入 | [schema](https://replicate.com/qwen/qwen3-235b-a22b-instruct-2507/api/schema) |

Replicate 三个 Gemini 的图研视觉额度最多 3 张；适配器拒绝超过 7,000,000 bytes 的单张，接受经 Core 校验的 PNG/JPEG/WebP data URL。用户上传还受图研现有更低的 5MiB/张等平台门禁限制；SVG 经既有图像处理后输入，并不宣称渠道原生接受 SVG。官方 schema 的音视频字段没有接入图研。所有新 Replicate 文本请求继续使用图研 8192 token 输出预算，公开上限不直接成为请求额度。完整固定版本 hash 在 CSV/模型详情/版本表中。

## 纠正的旧结论

- **Replicate `alibaba/wan-3`**：[接口](https://replicate.com/alibaba/wan-3/api/schema)是视频输出。保留历史 ID、版本信息和配置，但清空可选角色，禁用新图像生成/编辑提交；输入在调用前本地拒绝。没有将它标记为厂商停用，也没有替换用户模型。
- **TokenDance Kimi**：`kimi-k3` 开放 `reasoning_effort=low/high/max`；`kimi-k2.5`、`kimi-k2.6` 复用既有思考开关；`kimi-k2.7-code` 标注固定开启，不提供关闭。切换时清除冲突的 `thinking`/`reasoning_effort` 及渠道不接收的采样字段。未开放 `keep`：当前独立调用流程没有多轮思考历史保留契约。渠道资料明确引用的原厂字段依据、冲突处理见[调查 Kimi 行](2026-10-09-research.md)。
- **TokenDance `ling-3.1-flash`**：详情中的渠道端点明确 256,000 token，移除“近似值”标识；仍明确记录顶层 1M 与端点值冲突，不套用到百灵官方直连。
- **小米官方 MiMo 2.6 Pro/Flash**：补充官方 1M 上下文、131,072 最大输出（包含思考）与图片限制说明；没有扩大图研请求预算，保留历史 8192 输出预算和原有默认思考行为。
- 补充 CogEvol 的渠道品牌映射，防止已核实品牌落入“开发方待确认”；不据此宣称其法人身份已核实。

## 接口与兼容性

新增 `replicate-text-channel.ts`，使用固定版本 Predictions 接口和独立文本数组解码。提交前写检查点；提交响应丢失且没有任务 ID 时阻止重发；已有任务只继续查询。轮询地址从校验后的 ID 构造，不直接信任返回 URL；核对任务 ID/版本，不把文本结果作为图片下载。空、错误类型或超限结果不算成功。Gateway/Core 的主模型和视觉分发都已接通这条路径。

fal 复用现有队列、尺寸和直接编辑实现，新增精确端点及 schema，提交前校验输入约束。没有添加独立设置架构或更改 4.0 工作流。Kimi 和 Replicate 的思考设置复用共享编译器与已有控件。

来源数据集中在 `config/`，由原生成器产出 Web/Core 目录、上传策略和思考规则；前端未另建参数表。路由契约 v1、specifications v1、任务字段和环境变量均不变。

**小程序暂停**：本轮只用 `sync-model-catalog.mjs --skip-miniprogram`。219 个既有小程序文件 SHA-256 全部未变，独立微信项目未写入。初轮 Core 测试发现其历史断言还会导入小程序目录；已将本轮目录回归限定为 Web/Core。未运行小程序测试套件、构建、UI 验收或发布。恢复该端后须先同步生成物再单独验收；当前不能宣称小程序与 v30 同步。

## 本地验证

| 检查 | 结果 |
|---|---|
| Core 全量测试 | 1121/1121 通过；初轮旧版本号/数量/模拟响应断言已纠正并复测 |
| 新适配专项 | 9/9：287 组 fal 参数对独立公开 OpenAPI；7 个 Replicate schema；失联提交/轮询恢复/取消/持久化失败/空结果；真实 Gateway/Core 代码配模拟供应商完成主模型+视觉+图像任务 |
| 共享映射覆盖 | 1389 个角色/协议身份；3176 个思考字段取值案例；426 个文本/视觉实际适配器分发；39041 组目录尺寸选项 |
| Web 全量测试 | 592/592 通过 |
| 类型与构建 | Core TypeScript、Core 三份 bundle、Web Vite build 通过；保留已有 bundle 体积告警，没有扩展为架构拆包任务 |
| 生成物 | 目录 v30 / 1079 身份、1200 条思考 profile、1490 行版本映射无漂移（明确跳过小程序） |
| 历史兼容 | 原 1066 个身份全部保留，默认值变化 0；Wan 历史 ID 可读，调用门禁拒绝新图像任务 |
| 真实账户推理 | **未执行、未验证**；没有付费探测、密钥操作、充值、生产部署或微信发布 |

浏览器验收使用隔离端口 `127.0.0.1:5186` 和本地目录响应；桌面 1440px、手机 390px/320px。检查长 ID 换行、未知参数、输入/输出分离、图片模型省略不适用的上下文、键盘展开和点击详情。截图与可重跑验收片段在本工作树 `output/playwright/`；命令日志在 `/Users/a1-6/.codex/artifacts/tuyan-model-catalog-20261009/implementation/`。这些均为本地验收，不是线上或真实账户结果。

## 剩余缺口与合并注意事项

- 百灵原生 Ling 3.1 的准确 wire ID 仍缺官方接口证据；TokenDance MiMo 新型号视觉/思考参数、原生 UltraSpeed 的定制服务 ID 仍缺可用于通用接入的契约。没有猜测添加。
- 硅基此前补查的 90 个公开目录项、fal/Replicate 其他候选继续以[163 行调查表](2026-10-09-research-matrix.csv)为准。缺逐模型 schema 或需新的视频/音频/工具接口的项目维持未接入；没有将公开宣传当作接口开通。
- 账户权限、地区可达性、额度、真实质量与账单均待后续独立验证。本轮不触碰这些门槛。
- 与 4.0 的潜在交叉点：`config/` 目录/思考/尺寸源数据，`packages/api/src/thinking.ts`，`text-channel-adapters.ts`，`image-channel-adapters.ts`，以及 Core handler 的两处分发和输入规范化。应先人工合并源配置和局部逻辑，再生成 Web/Core；不可整份覆盖 handler 或其他会话设置/生成流程。新增 Replicate 文本适配器可独立合并。
- `SYNC.md` 已记录 Web/Core 完成范围、小程序及其他端待办。合并后如目标 CI 要求全端生成一致，需待小程序恢复授权再处理，不能为了通过 CI 擅自运行小程序同步。
