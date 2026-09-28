# v3.8.1 后续补充：Responses 图像工具、云接口与异步恢复

状态：**仅本地待发布**。核查日期：**2026-09-28（Asia/Shanghai）**。没有推送、生产部署、付费调用、充值、云资源/权限修改或微信发布。

## 基线和前提纠正

- 复用隔离工作树 `tuyan-v381-20260927` / `codex/universal-api-ux-phase1`，开始时干净，HEAD `6ff4018`。此前 `1f2d41a`、`67f1cd6`、`4b47c70`、`b2a949e` 与排队持久化成果均在本分支，未覆盖 Desktop 或独立小程序工作树。
- 开始时远端主分支 `6b99a6f58e09b8e843c7442a9db177fc28f1f9ad`；v3.8.1 已发布（功能 `24ed37b`），不能再把它整体称为未发布。本轮按用户最新要求列为“v3.8.1 后续补充，待发布”，不提前写公开已发布日志。
- Responses 原文字/视觉 adapter 存在；此前主动拒绝所有工具输出，故图像工具缺口真实存在。独立 Images adapter 保留。fal、Replicate、BFL、Runware、TokenHub 已接入，并非新增五种通用协议。
- 生成任务原本支持 `auto` 尺寸，未改写为新默认。新增任务链回归证明 `auto` 真实传到底层并省略工具尺寸字段。
- 当前运行架构以本工作树 `AGENTS.md`、`README.md` 和 `docs/operations/current-architecture.md` 为准：香港 Node/Compose/Mongo/OSS，加新加坡受控出口。用户消息中旧 Sealos 部署描述已过期，本轮没有恢复旧平台代码。
- Azure 的 `model` 是资源部署名；Foundry 不是一个统一 OpenAI 协议。Bedrock 支持官方 Bearer API Key，无需为完成本轮而收集 AK/SK、下发服务器云凭据或新建权限。

## 实际支持矩阵

| 路径 | 型号/角色与操作 | 配置与代码状态 | 目录、账号状态 |
| --- | --- | --- | --- |
| OpenAI Responses 图像工具 | 调用模型与工具图像模型分开；推荐 `gpt-4.1` + `gpt-image-1.5`；图像角色生成/精修，原图+辅助图，最多 8 张（实际还受用户原有限额约束） | 现有 Responses 协议可选 `imageTool`，模板、请求/响应、工作流、参数/思考与恢复已适配、模拟通过 | 工具型号白名单已收录；原 OpenAI `/models` 继续只读，不以可见性证明权益；真实账号未验证 |
| xAI Responses 图像工具 | 顶层 `grok-4.7`；实际图像型号由服务选择；生成、单图重新输入编辑 | 模板、`action`、工具结果解析与现有精修流程已适配、模拟通过；未发送 OpenAI 的尺寸/质量/格式/model/tool_choice 字段 | 已收录明确调用 ID；多图工具输入上限缺少独立证据，本轮保守支持 1 张；真实账号未验证 |
| Azure OpenAI v1 | 文字/视觉 Chat 或 Responses；独立 Images；Responses 图像工具。资源部署名与原厂型号映射分开 | API Key 或手动提供 Entra Bearer+到期时间；GPT Image 1/1-mini/1.5；生成和图片重新输入编辑，多参考图；模拟通过 | 内置部署型号选项是格式审计范围，不是资源的部署目录；部署名手填，需实际区域、部署与账号权限；真实账号未验证 |
| Bedrock Converse | `us.anthropic.claude-sonnet-4-5-20250929-v1:0`；主/视觉角色；US 跨区域推理配置 | us-east-1、us-east-2、us-west-2；原生文字、图片与 extended thinking；模拟通过 | 已收录这一精确配置 ID；不猜测 deployment/ARN 或将 in-region ID 当已开放；真实账号未验证 |
| Bedrock InvokeModel | us-west-2 的 `stability.stable-image-core-v1:1` 文生图；`stability.sd3-5-large-v1:0` 文生图/单图重绘 | 每型号独立原生 schema；SD3.5 图生图显式 `strength` 0..1、`mode=image-to-image`；模拟通过 | 型号来自官方 API 文档，账户当前权益待核实；不称为已验证可调用，不假定现代模型卡目录未列出就已退役 |
| 已有异步渠道 | fal / Replicate / BFL / Runware / TokenHub | 加强既有提交、查询、下载、检查点和恢复；维持不同鉴权/状态/URL/请求体；模拟通过 | 原目录和历史 ID 保持，没有新增平行“通用异步 JSON 协议” |

所有新能力都在现有角色弹框内配置；通用 API 第一项、首次 TokenDance 默认、历史恢复和主/视觉/图像独立选择保持。没有全局更换任何默认型号。

## 请求、产物和连续编辑

- OpenAI/Azure：`tools:[{type:image_generation,action:generate|edit,...}]`；OpenAI 显式工具图像型号，Azure 用 `x-ms-oai-image-generation-deployment` 指向图像部署；顶层 `model` 属于图像连接自己的调用模型/部署，不借主模型 Key。
- OpenAI/Azure 输出映射仅 `auto`、`1024x1024`、`1536x1024`、`1024x1536`，默认尺寸省略；质量/格式显式填写才发送，2.5 的 xhigh/max 不传给旧图像型号。xAI 和本轮 Bedrock 仅服务默认尺寸，不把提示词或“1K”标签当精确宽高保证。
- Responses `store=false`、`stream=false`；不保存/依赖 `previous_response_id`，不承诺服务端上下文保留期限。每次精修从图研拥有的冻结图片重新输入；辅助图复用现有 `refineInputs.references`、所有权校验和 OSS 路径。
- Azure 文档关于 multi-turn/streaming 有矛盾性描述；本轮明确使用独立、非流式的图片输入请求，不启用服务端连续对话编辑。原厂历史存储、组织与账户绑定不作为恢复依赖。
- 响应允许混合普通文字和已适配图像调用；有界解析全部输出，最多 64 个 item、4 个完整图像调用，逐张校验数据。全部成功后选**最后一个图像调用**为当前候选，文字不当图片；工作流继续保存 PNG。其他工具、拒绝、无图、未完成/部分失败、格式异常一律明确失败，未知结果不自动重发。用户无法启用任意工具执行。
- 4 次是接收/安全上限，不是上游收费次数的保证；不会凭最终图片数量宣称只产生一次上游费用。HTTP 响应及解码后字节/尺寸、SSRF/DNS 检查继续约束。

## 凭据、能力和迁移

Route v1 兼容可选扩展：`custom.imageTool`、`custom.azure.deploymentModel`、`custom.bedrock.strength`；鉴权增加 `api-key`、`bearer-expiring`；真正不同的 Bedrock `converse/invoke` 协议分别处理。服务端 registry 新增 `universalExtensionsVersion:1`。

- 旧配置不要求新字段，旧未知型号仍可沿原路径手填；新扩展遇旧后端时 Web 阻止发送并保留草稿，不静默丢工具后执行文字请求。已有输入限制不自动放宽。
- 新模板明确预填推荐调用型号/已适配工具；能力仍按精确地址、协议、型号和操作复核。Azure 部署映射是用户声明，不伪造账号认证。独立 Azure 型号白名单不随 OpenAI 列表未来扩展自动增加。
- 模板、保存/导入导出、任务快照包含非敏感扩展。角色配置文件仍 schema v2（可选字段），旧 v1 导入保持；导入声明不得升级为官方证据。命名连接只复制连接事实；型号/工具/强度和思考属于角色，不自动覆盖其他角色。
- Entra/Bedrock API Key 及 `expiresAt` 仅页面凭据内存；保存浏览器/无密钥文件不包含它们、认证头或验证结果。地址/协议/鉴权变化仍清 Key 并提示原因；主动复制 Key 的既有操作可复制同一连接的到期时间。
- Bedrock 不实现 SigV4、服务器 IAM 凭据发现或自动令牌获取。采用官方支持的 Bearer API Key；需要用户已有权限和准确到期时间，短期 key 受会话期限约束。准入/取角色凭据和最终调用前均检查有效期，防止规划耗时跨越到期；到期或剩余不足 30 秒在发送前拒绝；由用户更新当前角色凭据后走原任务安全恢复，不自动刷新/创建资源。
- 服务端沿既有加密凭据/任务保存规则（完成删除、最长 7 天），到期时间随密钥的加密 envelope 保留；恢复时经验证的新 Key 与新到期时间一起更新，不能只换 Key 而保留旧期限。重新打开网页不会从浏览器存储取回密钥。
- 平台硬上限保持；Bedrock 输入额外限制为单图 3,750,000 字节/8,000 单边（既有用户更小值仍生效）、请求 25,000,000 字节；Converse 图片只是理解，不推导图片输出。未知能力不因目录同名自动授权。

## 思考参数复用

| 场景 | 控件/映射 | 边界 |
| --- | --- | --- |
| OpenAI Responses 文字/视觉 | 原有精确 profile；补 `gpt-5` 的 `reasoning.effort` | 服务默认省略；不增加 temperature/top_p |
| OpenAI Responses 图像角色 | 以**顶层调用模型**匹配原有 profile，含 gpt-5 effort | 不把工具 GPT Image 型号当推理模型；更改任一工具身份后旧偏好不误用 |
| xAI 图像工具 | 服务商默认 | 未从独立 Images/其他 Grok 版本推导新思考开关 |
| Azure Chat/Responses 主、视觉及 Responses 图像调用模型 | 精确资源+部署名+用户声明原厂 family+协议映射，复用已有支持范围 | GPT-5 Chat `reasoning_effort`，Responses `reasoning.effort`；没有 profile 时默认省略 |
| Bedrock Converse 主/视觉 | Sonnet 4.5 的 enabled/disabled 与 budget，经共享编译器映射 `additionalModelRequestFields.thinking` | 预算 1024..4095，低于现有默认输出预算 4096；传入其他 maxTokens 时再次检查互斥与大小；输出 maxTokens 不可超 64,000 |
| Bedrock 图像 / 独立 Images | 不显示通用思考开关 | 不发送无支持的参数 |

`ThinkingSelection.connection.extensions` 精确绑定图像工具/部署/强度配置；原身份历史偏好保留，切回恢复，默认不发送字段。编译后的既有快照与请求描述器纳入新字段，重启恢复不重新规划已完成步骤。

## 异步与服务重启

- 基线 `6ff4018` 已解决已登录生成/精修任务“已确认排队但仅在内存”窗口：冻结输入/加密快照成功后才确认接收。此轮保留并增加云工具/到期时间重启恢复回归。
- fal、Replicate、BFL 和既有 Runware/TokenHub 都要求持久检查点；提交前保存 submitting，收到原任务 ID/查询地址立即持久化。未收到可查 ID 的提交未知保持人工核对，不重新 POST；Runware 已有调用方 taskUUID 可查询原 ID。
- fal/BFL/Replicate 查询每次最多 30 秒、总时窗默认 10 分钟，超时/408/429/5xx 有界退避；Runware/TokenHub 查询也限制单次 30 秒并保留各自轮询结构。单次查询失败不标记上游任务终止；总时窗结束显示仅可恢复原查询。
- 已知排队/运行/成功/失败/取消、查询错误和未知提交分开。fal `COMPLETED` 仍可能有 `error/error_type`，新增终止检查，不能当成功或无限恢复查询。
- 先复用已保存工作流产物；下载失败先重试已有结果，失败后只重新查询原任务结果，不重新提交。**不承诺链接一定刷新或过期文件一定存在**：BFL 签名 URL 10 分钟；Replicate API 结果默认一小时清理；Runware 无 ZDR 通常 7 天，ZDR 的 TTL 到后 `getResponse` 仍可返回已经删除的 URL。
- 本轮不新增“取消任务”按钮，也不会代用户发取消调用；已返回 cancelled/canceled 的状态按终止处理，不承诺取消成功或免计费。
- 任务查询地址经 provider 精确域名校验；下载剥离认证信息、检查公网/DNS/大小，不新增任意 JSON 转发。

## 出口与跨端

- Core 将三个 Bedrock runtime 域名和真实 Azure 资源域名归入受控出口。Azure preview 查询参数只允许 exact v1 Images generations/edits 的 `api-version=preview`，其他查询参数规则未放宽。
- SG installer 源码加入三个 Bedrock 精确域名；**未安装到生产**。Azure 客户资源域名尚未知，未加泛域名 ACL；待实际资源确定和单独发布授权后添加精确域名。当前生产 proxy 不允许它时失败关闭，无香港直连回退。
- Web/shared/Core 已适配。小程序仅共享历史类型、协议生成物与能力协商字段同步；源码构建和测试通过。独立小程序工作树、微信副本、原生 UI 和发布均未操作。

## 未采纳和剩余条件

- 不新增 Responses Images 并列协议、通用异步 JSON 协议、任意工具/自由 JSON、cURL 或无关采样参数。
- xAI 工具未证实多输入数量，以及独立可传 size/quality/output_format/model；这些控件不开放。
- Azure 本轮工具仅 GPT Image 1 系列：支持模型总表已列 2.5，但图像工具专节仍说 1 系列、REST 工具 enum 仍列 1/mini/1.5；没有把发布名单当成完整工具参数契约。其他 Foundry FLUX/MAI/Agent 服务不自动继承，后续须逐型号建立原生 schema、部署与额度证据；这不是认定整个 Foundry 不支持图像。
- Bedrock 本轮只做表中模型/区域；不自动接入所有 InvokeModel schema、推理 ARN 或 EU/APAC profiles。Nova Canvas 官方已标 Legacy/EOL 2026-09-30，不作为新增默认。Stability 新式 Inpaint 是单独模型/遮罩 schema，本轮 SD3.5 为整图重绘，未冒充局部遮罩精修。
- 缺真实 Azure resource/deployment、地区权益/准确 token audience，Bedrock account/model access/API Key、厂商组织工具权限，以及生产出口 ACL 安装证据；因此真实调用与账单状态全部“未验证”。
- 没有实体手机软键盘验收；响应式 Web 截图不代表微信原生验收。

## 验证与预览

详见 [验收记录](acceptance.md)；官方证据和文档冲突见 [sources.md](sources.md)。本地预览 `http://127.0.0.1:5182/` 使用 `127.0.0.1:8797` 模拟后端，只开放配置/目录 fixture；拒绝生成、账号和发布操作。正常开发修改可见，勿把此 mock 作为生产健康或真实 DNS 检查证据。
