# TokenDance 接口与运维说明

实现基于 [官方核对记录](integration-audit.md) 和 [93 型号覆盖表](model-coverage.md)。验证与发布状态见 [validation.md](validation.md)。本轮新增独立渠道，不改变其他渠道的 ID 或默认推荐。

## 客户端与 Core 的边界

Web、小程序请求现有 Gateway 的 POST /paperbanana-api，携带图研登录态。TokenDance 操作不接受客户端 Key 或用户 ID 覆盖。Gateway 校验会话并用受保护的 x-paperbanana-auth-user-id 传递不可变用户 ID；Core 的内部 transport token 仍为必需。管理价目另外要求既有站长权限与管理员 transport，普通用户不可访问。

所有 TokenDance 出站请求携带 X-App-URL: https://www.paperbanana.asia/；OAuth app_url 为同一固定值，包含结尾斜线。callback_url 是回调目的地，与应用归因值分开，客户端不能覆盖。浏览器在渲染和发起普通请求前清除一次性回调查询参数，使用 no-referrer。

|action|客户端输入（除 action）|主要返回|
|---|---|---|
|tokenDanceStatus|无|available、connected、connectedAt、appUrl；connected 表示本地有加密连接，并非实时保证远端 Key 有效|
|tokenDanceAuthorize|platform: web 或 miniprogram|state、authorizationUrl、expiresAt、mode|
|tokenDanceExchange|state、code|connected；永不返回 Key|
|tokenDanceCancel|state|cancelled|
|tokenDanceDisconnect|无|connected:false、remoteRevoked:false|
|tokenDanceBalance|无|wallet.balance/credits/credits_used：整数微元；microyuanPerYuan:1000000，keyLimit:null，keyLimitStatus:not_available|
|tokenDancePaymentCreate|amount：1–100000 整数元；attemptId：客户端生成的独立请求 ID|attemptId、state、session|
|tokenDancePaymentStatus|attemptId|经官方状态接口验证的 session|
|tokenDancePayments|无|当前用户最近十个本地充值记录，保留约 24 小时|
|tokenDanceResume|jobId|相同 jobId；不创建新任务|
|adminTokenDancePricing|无，另有站长鉴权|available、markdown、kind:estimated-unit-share、settledIncome:null|

充值 session 的 amount 为整数元；created_at、expired_at、paid_at 为 Unix 秒。钱包 1234567 微元显示 ¥1.234567，与充值 10 表示 ¥10 分开。只有经验证的 paid 状态和 paid_at 才显示到账，不以页面返回、焦点恢复或余额变化替代。

## 授权与存储

Core 使用 S256 PKCE，state 和 verifier 随机生成，flow 绑定图研用户并保留 10 分钟。pending → exchanging → saving → complete 使用原子条件更新；重复、取消、过期、异账号、被新流程取代的回调被拒绝。交换响应丢失要求重新授权，不重复消费 code。无 client secret、refresh token 或公开撤销接口。

TOKENDANCE_ENCRYPTION_KEY 是独立的 32 字节随机值的标准 base64 编码。AES-256-GCM 加密用户 Key、短期 verifier、支付查询 Key、任务执行快照和步骤结果；AAD 绑定用户或不可变任务/步骤身份。密钥不进入普通任务 DTO、日志或客户端 Storage。解除连接删除图研保存的授权及流程/支付查询凭据；远端 Key 需用户在 TokenDance 管理。注销会完整删除该用户的连接、流程、支付和恢复数据，并用账号删除屏障阻止迟到结果重新落库。

以下集合在 Core 启动时创建所需索引，使用当前业务 Mongo readWrite 身份，不扩大 Benchmark 权限：

- paperbanana_tokendance_connections：用户 ID 唯一连接。
- paperbanana_tokendance_flows：expiresAt TTL，用户/时间索引。
- paperbanana_tokendance_payments：expiresAt TTL、用户/时间索引、active:true 的用户唯一索引。
- paperbanana_provider_executions、paperbanana_provider_steps、paperbanana_provider_step_chunks：7 天 TTL；steps 另有 jobId/state 索引。

TTL 删除由 Mongo 后台异步执行；授权、任务恢复同时显式检查有效期。稳定加密主密钥必须在重启和部署间保留。直接替换会使已有密文不可读；轮换需受控迁移或明确使旧连接重新授权，不能每次启动随机生成。

## 模型与任务执行

60 个文本型号均使用各自确认支持的 Chat Completions。27 个视觉型号允许图像内容，其余主模型只接收参考库文本说明，上传图片由视觉角色处理。默认只发 model/messages/stream；不猜测思考、采样、结构化输出参数。结构化任务使用现有提示词和解析器，小模型遵循提示词的质量仍需真实推理评估。

Seedream Pro 和 Lite 单独使用 Ark /gateway/ark/v3/images/generations。Pro 1K/1.5K/2K，Lite 2K/3K/4K；每档按像素面积和宽高比计算合法尺寸。图研固定单张 PNG，优先 base64 返回，兼容受控 URL 结果。Pro 不发送其未支持的组图/流式字段；Lite 显式禁用组图。直接精修按现有单张原图能力开放；官方最多 10/14 张的能力有记录，但本轮没有新增多图合成产品。TokenDance 原生目标清晰度生成不会再自动做一次“高清精修”而额外扣费。

模型目录、请求参数和调用协议按精确渠道/型号匹配。选择某个型号时仅允许平台在该型号供应商内自动路由，不设置跨型号 fallback。job.providerCalls 保存 requestedModel、actualModel、requestId、supplier；上游未给出的实际型号/供应商明确显示未返回。

只有实际执行角色包含 TokenDance 的任务启用可恢复执行。混合渠道任务的其他调用也做检查点；必要的其他渠道 Key 在快照中加密，任务完成立即删去执行凭据，未完成最多 7 天。完成的每次调用先保存结果，再标记完成；恢复复用结果。嵌套调用与候选图分别编号，候选图顺序执行，避免余额不足后继续开启其他候选调用。

执行器使用 45 秒租约和 10 秒心跳。历史任务读取时识别中断的执行器和旧进程遗留队列，当前进程的正常队列不被中断。恢复沿用原 jobId、模型选择和任务快照，以新授权 Key 替换 TokenDance Key；原先完成的规划、检索子调用、图像步骤不再执行。曾发往上游但未收到完整结果的调用禁止自动恢复，包括超时、5xx、缺少完整 SSE 终止标记和部分输出中断。相同输入也不会绕过这个限制。

明确被拒绝的余额不足、授权失效、Key 限额和限流分别展示相应操作，Retry-After 到期后才允许恢复。充值不调整 Key 限额。未知支付创建结果保留 active 占位，不自动重建；支付轮询服务端每用户订单最多每 3 秒一次，并固定到已验证的官方 status_url。

## 目录后续更新

主源为 config/tokendance/catalog.json；生成器与现有 model-catalog-updates.json、image-size-contracts.json、model-presentation.json 联动。ID 去重，按模型创建时间及 ID 稳定排序，厂商不混入渠道身份。

运行 node scripts/check-tokendance-catalog.mjs 获取公开目录并列出新增、下架、协议变化、描述/上下文变化；有变化以退出码 2 提醒。已接入现有每日 Model registry drift report 工作流的独立 job；无模型 Key、无付费调用。工作流尚未推送，因此 GitHub 上尚未运行本轮新检查。

公开 API 缺模态，新增型号必须复核详情与协议后更新 snapshot，不会自动把未知型号放入界面。随后运行 node scripts/sync-model-catalog.mjs 生成跨端目录，运行 --check 和全型号测试。运行时每 15 分钟刷新已审核型号的存在/协议状态，移除已下架或不再支持所选协议的型号，目录访问失败时停止选择和调用，不沿用未经确认能力。独立详情中的参数变化仍需人工审阅，不能仅靠 public models API 证明未变。

## 生产配置与发布顺序

当前只完成本地代码，没有执行生产发布。部署前刷新 origin/main、生产镜像 SHA、CI、健康和出口状态；保留原 worktree 和其他会话改动。

1. 核对香港部署现有 core.env（root:0600）及稳定加密主密钥存放方案。配置 TOKENDANCE_ENCRYPTION_KEY；TOKENDANCE_CALLBACK_URL 生产使用 https://www.paperbanana.asia/。主密钥应通过安全配置流程生成和安装，不要求用户把值发到聊天。
2. TOKENDANCE_MANAGEMENT_KEY 仅供站长读取价目，缺失不阻止用户调用。TOKENDANCE_APPLICATION_ID 默认图研后台登记 ID。用户授权 Key 由 PKCE 流程创建，不能用管理凭据替代。
3. 若 Core 使用 sg-required，先按既有出口发布流程安装已审核的 tokendance.space:443 精确 ACL，再从香港做无凭据公开目录连通性检查。代码和 Squid 规则已经同步，线上代理本轮未更新。不得临时绕过既定出口策略。
4. 按现有锁与部署工作流发布 Core/Gateway，再发布 Web；核对 readiness、Mongo 索引、app_url 与 X-App-URL、回调根路径及 no-store。Laf 文件只作为共享处理器和兼容源码，本功能需要 Node Core，不向暂停的旧 Laf 发布。
5. 在具备用户授权和测试消费额度后，分别验证真实 OAuth、Key 状态、60/27/2 的代表性与边界调用、真实图片结果、低额充值到账和站长价目。要声称所有型号真实可用，仍需逐型号真实调用并记录结果；契约测试不替代这一步。
6. 小程序源码与 JS 同步完成；在开发者工具和真机确认登录、系统浏览器手动 code、余额及支付宝跳转后再上传/发布。微信环境不能假装原生支持支付宝：当前实现复制官方支付链接并引导系统浏览器使用 Web 钱包，订单到账仍由状态接口确认。

远端撤销、单 Key 剩余额度、实际分润结算 API 尚无公开契约。当前不调用私有抓包端点实现这些能力，也不把预计单位分润展示为已结算收入。
