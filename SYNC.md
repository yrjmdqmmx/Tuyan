# 平台同步日志 (Platform Sync Log)

本仓库是多端 monorepo，由多个独立的 AI 会话 / 开发者分别开发各端
（`web` / `miniprogram` / `android` / `windows` / `macos` / `laf-functions` 后端 / `auth-gateway`）。
各会话互不可见——**本文件是唯一的跨端协调真相。**

## 协议（所有会话 / agent 必须遵守）
1. **开工前**：读下方「条目」里未完成的项，补齐你负责那一端欠的待办。
2. **当你改了"会影响其他端"的东西时**（见下「要记什么」），必须在「条目」最上方**新增一条**，
   写清 变更 / 契约 / 各端待办 checkbox；完成本端后把自己那一格打勾 `[x]`。
3. 只记**跨端契约级**变更；**纯单端 UI / 样式 / 文案 / 本地 bugfix 不用记**（git log 已经有）。

### 要记什么（= 会影响其他端，必须记）
- `createJob` 等请求/响应的字段增减或语义变化
- 新增 / 修改 action（如 `prepareReferenceUpload`、`modelCapability`）
- 共享 model 列表、provider、环境变量要求
- 任务记录（`paperbanana_jobs` / `publicJob`）字段变化
- `auth-gateway` 转发 / 鉴权规则变化

### 不用记
- 单端的 UI、样式、文案、纯本地 bugfix

---

## 条目（最新在上）

### [2026-08-19] PaperBananaBench 306 条 zh-CN.v2 语料与服务端分页— by Codex
变更：参考库固定为当前 PaperBananaBench 306 条有图案例（66 diagram + 240 plot），4 条无图内部 fallback 与 bench 计数彻底分离；本条未部署。
契约（影响其他端 / 共享）：
- **语料字段**：`RetrievedReference`/`referenceLibrary` 在旧字段上新增 `shortIntroZh/detailZh/visualCategory/researchDomain/keywords/corpusVersion`；当前版本为 `zh-CN.v2`，英文 `title/summary` 继续用于检索。
- **分页请求**：`referenceLibrary` 支持 `scope/page/pageSize/query/visualCategory/researchDomain/taskName`，`pageSize` 默认 12；响应返回 `totalItems/totalPages/page/pageSize/facets/corpusVersion`。默认 `scope=bench` 且跨 taskName 暴露 306 条；仅发 `taskName/limit` 的旧端保持兼容。查询/分面在服务端分页前完成，只给当页图片签名。
- **手选参考**：`manualReferenceIds` 最多 10 个唯一 ID，服务端用 `$in` 直查且保留请求顺序，不再只扫前 200 条；缺失/无图返回 `422 + REFERENCE_SELECTION_INVALID`，超限返回 `400 + REFERENCE_SELECTION_LIMIT`，不再静默丢弃。
- **迁移/回滚**：香港同步脚本按业务 `id` 幂等更新且必须验收 306 条有图 v2 记录；`--rollback` 仅回滚元数据版本，不删图片、任务或选择记录。
各端待办：
- [x] paperbanana-api / Laf / packages-api（分页、分面、搜索、当页签名、手选严格错误）
- [x] 语料与迁移工具（306 条固定快照、质量门禁、幂等同步/元数据回滚）
- [x] Web（消费服务端分页/分面/详情字段，不再一次拉取 295 条本地过滤）
- [ ] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（按需接入新分页响应；旧 `taskName/limit` 请求仍可用）

### [2026-08-19] 模型注册表 v2 与模型级精修能力 — by Codex
变更：服务端 `modelRegistry` 成为模型可用性与精修语义的唯一权威，修正 Gemini/OpenAI/百炼直连目录与适配器，OpenRouter 继续以官方动态目录 fail-closed；本条未部署。
契约（影响其他端 / 共享）：
- **注册表字段**：每个 model 在旧有 `id/label/roles/capabilities/protocol/availabilityNotes` 上新增 `vendor`、`lifecycle`、`recommended`、`requiresEntitlement`、可选 `entitlement`、`inputModalities`、`outputModalities`、`verified`、`selectable`、可选 `disabledReason`、`roleReasons`；`capabilities` 新增 `imageEditMode: direct-edit|analyze-redraw|none` 和 `outputFormats`，保留旧字段向后兼容。OpenRouter 不兼容图像模型仍在目录可见，但 `selectable=false`、无 `image` role，且有精确禁用原因；客户可展示但不得提交。
- **精修契约**：`modelCapability` 新增 `supportsDirectEdit/refineMode/refineReason`；`refineImage` 成功响应新增 `refineCapability {mode,directEdit,reason}`，任务 DTO 新增 `refineMode/refineReason`。`direct-edit` 必须将源图传入图像模型；`analyze-redraw` 明确先视觉分析再重绘。`sourceImageObjectKey` 仍是受支持的权威源图输入。
- **适配器**：Gemini 3 图像模型使用 Interactions API，2.5 图像模型保留 `generateContent`；OpenAI Pro 模型使用 Responses API；OpenRouter 图像仍只使用 `GET/POST /api/v1/images*`，无 `input_references` 时禁止直编。
- **漂移检查**：新增只读定时/手动 workflow，用与运行时一致的“必须显式声明 PNG/SVG”规则报告 OpenRouter 目录与推荐项漂移；任一推荐项不可运行时输出 warning，永不自动把新模型提升为推荐。
各端待办：
- [x] paperbanana-api / Laf 回滚（注册表 v2、适配器、模型级精修执行）
- [x] packages-api / Web 共享传输（保留 refine capability 与任务字段）
- [ ] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（后续以新注册表字段展示推荐、生命周期、权益与精修方式；不得再由 provider 或模型名猜测）
- [x] CI / 运维代码（只报告漂移，不自动改推荐；未触发生产部署）

### [2026-08-19] 模型目录下线项与注销迟到写保护 — by Codex
变更：按 OpenRouter 实时官方目录从全部客户端静态回退表移除已下线的 `openrouter/openai/gpt-5.3-chat`；账号注销增加 OSS 写入后的持久 tombstone 复核，并把所属 job id 保留在删除墓碑中供 Core 后台持续清扫迟到结果对象。公开 action、字段和成功 envelope 不变。
各端待办：
- [x] Web / 微信小程序 / Android / iOS / Windows / macOS（移除下线模型；HarmonyOS 原目录不含该值）
- [x] paperbanana-api / Laf 回滚（结果与阶段图写后复核、迟到 job prefix 后台清扫、轮转 tombstone 扫描）
- [x] 隐私披露（说明预签名链接失效前开始、失效后完成的上传由持久墓碑与后台重扫继续清理）

### [2026-08-19] 权威模型目录、中文参考库与任务来源端 — by Codex
变更：新增服务端权威 `modelRegistry`，OpenRouter 图片生成按官方当前 Dedicated Image API 分流；参考库增加 295 条版本化中文元数据；任务创建/精修与任务记录增加规范化 `clientPlatform`；Web 账号删除同步删除任务关联对象。
契约（影响其他端 / 共享）：
- **模型目录**：新增公开只读 action `modelRegistry`，返回静态厂商目录、默认模型、角色/图像能力与协议；OpenRouter 动态目录不可用时只标记该厂商不可用，静态厂商仍可返回。OpenRouter 图片模型以官方 `GET /api/v1/images/models` 为权威并统一调用 `POST /api/v1/images`；未知模型、错角色或目录故障均 fail-closed。`modelCapability` 与注册表保持同一能力来源。
- **参考库中文字段**：`referenceLibrary`/检索结果新增 `titleZh`、`introZh`，单次上限提高到 295；英文 `title`/`summary` 继续作为原始检索字段。版本 `2026-08-19.v1` 的 295 条元数据由香港部署脚本按既有 reference id 幂等同步，缺项或数量不符时部署失败关闭。
- **任务来源端**：`createJob`/`refineImage` 新增可选 `clientPlatform`，只允许 `web|miniprogram|android|ios|windows|macos|harmony`；缺失保持历史兼容，公开任务 DTO 同时归一 `clientPlatform`/`client_platform`，展示为“未记录”，不得按 User-Agent 猜测或回填。`submitFeedback.platform` 使用同一七端枚举，包含 `harmony`。
- **输入/上传/删除语义**：方法正文最多 12000 字、图注最多 1000 字；参考图上传新增 `finalizeReferenceUpload` / `abortReferenceUpload` 生命周期 action，现有客户端均在 PUT 后确认、失败时中止，旧客户端在创建任务时仍由服务端校验并兼容确认。账号注销先持久化不可变 user-id owner tombstone，拒绝新建/精修/上传/反馈并排空跨进程运行任务；仍有效的预签名上传返回可重试 409，删除请求执行多轮静默清扫，Core 后台继续清除迟到 PUT。网关必须先调用无副作用 `accountDeletionCapability` 确认 `deletionContractVersion=2`，随后才允许业务清理与 Auth 硬删；旧 Laf 回滚不得先执行破坏性删除。
各端待办：
- [x] paperbanana-api / Laf 回滚（注册表、OpenRouter 协议、中文字段、平台校验/持久化/公开 DTO、删除与输入限制）
- [x] auth-gateway / packages-api（公开只读 action 转发、共享请求/响应归一）
- [x] Web（动态模型目录、295 条中文宽屏图库/大图预览、任务来源、性能/错误恢复/账号删除/隐私一致性）
- [x] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（创建参数与任务列表/详情来源展示；不支持精修入口的端无需发送 refine）
- [x] 部署/运维（已发布香港 Core/Gateway/Web，295 条 Mongo 元数据同步为 `2026-08-19.v1`；生产模型目录、中文图库、大图预览、健康/就绪与 SG 出口已只读验收）

### [2026-08-18] 新加坡模型出口交付契约 — by Codex
变更：香港 Core 新增显式 `disabled|sg-required` 出口模式、固定 `http://10.77.0.2:3128` 代理配置、可复现 `pbhk0` peer、独立手动 GitHub Environment 工作流与 fail-closed 回滚顺序；公开 API/action/envelope 不变。
契约（影响其他端 / 共享）：
- **Core env**：`PAPERBANANA_PROVIDER_EGRESS_MODE=disabled` 为安全上新/回滚值；OpenAI/Gemini/OpenRouter 在此模式下失败关闭，绝不恢复香港直连。`sg-required` 只允许在 SG/HK tunnel smoke 成功后启用。`PAPERBANANA_SG_PROXY_URL` 固定为 `http://10.77.0.2:3128`。
- **健康/就绪**：`providerEgress=degraded` 是可观察状态，但不改变 MongoDB/OSS 权威 `/ready`；隧道/代理路径由香港专用 monitor 独立告警。
- **运维顺序**：新 Core 先以 disabled 运行 → 安装 SG 与 HK `pbhk0` → monitor/smoke → 显式切 `sg-required` 且只重建 `paperbanana-api`。失败回滚到 disabled；不走香港直连。工作流不含卸载或 provider key。
各端待办：
- [x] paperbanana-api / 后端（Core 路由与健康契约、测试、README）
- [x] 部署/运维（HK env 原子切换、pbhk0、手动工作流、smoke/monitor、回滚文档）
- [x] Web/iOS/微信小程序/Android/Windows/macOS（公开 API 不变，客户端无需改动）

### [2026-08-15] 生产后端切换到阿里云香港单机栈 — by Codex
变更：`api.paperbanana.asia` 已切到现有香港轻量应用服务器；Nginx 后仅运行 Auth Gateway、Node 24 核心、单成员副本集 MongoDB 与 gVisor Plot Worker。旧 Laf 已暂停，旧 Auth Gateway 镜像已替换成无凭据 Caddy 兼容代理，源 Mongo 仅作回滚保留且关闭外网。
契约（影响其他端 / 共享）：
- **公开入口**：Web 与 iOS 的默认 API/Auth base 为 `https://api.paperbanana.asia`；公开 `/paperbanana-api`、`/api/auth/*`、`POST /api/account/delete` 和业务 envelope 不变。旧 Sealos 域名仅以固定 Caddy 镜像无状态转发到新网关，保留至 2026-09-14，不再连接旧 Mongo/Laf。
- **发布范围**：本次只切 Web 与 iOS。HarmonyOS、微信小程序、Android、Windows、macOS 仍含旧默认地址，必须在各自完成 Cookie/上传/CORS/备案验收后再切，不得把旧地址当成仍在线的生产后端。
- **数据与对象**：Better Auth 与业务 Mongo 全量迁移；生产 OSS 保持原 object key、content type 与字节内容。新环境开始写入后禁止仅靠 DNS 回滚到旧数据库。
- **运维**：每日 Mongo 逻辑备份到独立加密 OSS，并有恢复演练；云监控覆盖 CPU/内存/磁盘，主机健康定时器覆盖 API、Mongo、卡住任务、备份、TLS、Nginx 5xx 与 OpenVac。
各端待办：
- [x] Web（生产构建已使用新域名并发布）
- [x] iOS（默认地址、冒烟脚本与上架说明已更新；新构建需由 App Store 发布流程上传）
- [x] 后端/部署（香港单机栈、数据/OSS、DNS/TLS、备份/告警、旧环境停写）
- [ ] HarmonyOS/微信小程序/Android/Windows/macOS（本次发布范围外，后续逐端迁移）

### [2026-08-15] Auth Gateway 复审加固：Auth 限流、不可变管理员 ID、事务注销与权威就绪 — by Codex
变更：修复迁移复审发现的认证请求体绕过、邮箱管理员竞态、非事务注销、健康字段兼容与 readiness 污染问题；公开业务 action/请求/响应字段不变。
契约（影响其他端 / 共享）：
- **全路由 1 MiB**：`/api/auth/*` 现在与 `/paperbanana-api` 一样按实际流字节计数，包含 chunked 请求且不信任 Content-Length；超限统一返回 HTTP 413 `{code:413,error:'Request body too large'}`，限内 body 原样交给 Better Auth。
- **管理员只认不可变 ID**：新增必需 env `ADMIN_USER_IDS`（逗号分隔 Better Auth `user.id`）；废弃 `ADMIN_EMAILS`。邮箱、body `adminToken`、`X-Admin-Token` 一律不能授权；服务端 `ADMIN_TOKEN` 仅在已通过 ID 会话鉴权的 Laf 回滚管理员请求中内部注入。即使攻击者注册/改成相同邮箱也没有管理员权限。
- **账号注销原子性**：改用当前 session 的 `auth.api.verifyPassword`，不再通过 sign-in 产生新 session。业务数据先清理且仍须 HTTP 2xx + `{code:0,ok:true}`；随后在 Mongo transaction 内一次提交 session/account/user 删除，任一步失败全部回滚。提交后才尽力清 Cookie，清理 Cookie 失败不改变注销成功。Auth Mongo 必须运行单成员副本集以支持事务。
- **健康兼容/就绪权威**：`/health` 与兼容 health 响应恢复顶层 `auth:'better-auth'`，细节放入 `authReady`/`dependencies`，只增加 `backend` 状态并保留一版 `laf` 别名。Node readiness 固定调用核心 `GET /ready` 且要求 HTTP 2xx + `ready:true`；Laf 回滚才调用 health action。业务成功或 `{code:429}` 等业务 envelope 不再治愈/污染 readiness 缓存。
- **错误卫生**：未预期的 Mongo/内部异常仅返回稳定 `{code:500,error:'Internal server error'}`，详细错误只写入脱敏日志；明确的后端 502/504 类型仍保持公开。
各端待办：
- [x] auth-gateway / paperbanana-api 传输（实现、测试、文档）
- [x] 部署/运维（配置 `ADMIN_USER_IDS`，删除 `ADMIN_EMAILS`；Auth Mongo 以 replica set 启动并完成 transaction smoke）
- [x] Web/iOS（公开 API action/envelope 不变，无代码改动）

### [2026-08-14] Auth Gateway 切换香港 Node 核心、访客归属与精修授权 — by Codex (auth-gateway + shared transport)
变更：网关重构为 Node 24 可测试常驻服务，优先固定转发香港内部 Node 核心；新增匿名访客的稳定任务归属、精修源任务授权、动态维护模式和依赖就绪检查。公开 `/paperbanana-api` action/字段/业务 envelope 不变。
契约（影响其他端 / 共享）：
- **固定后端选择**：新增首选 env `PAPERBANANA_API_URL`；仅当它缺失时才使用 `LAF_API_URL` 回滚。两者同时存在时只选 Node，运行时故障绝不自动落回 Laf。`PAPERBANANA_GATEWAY_TOKEN` 必填；Node 通过内部 header 收 token，Laf 回滚才使用覆盖后的 body token。
- **HTTP 语义**：网关逐字转发后端 HTTP 状态和 JSON envelope；既有业务错误仍保持其上游语义，特别是任务准入满载的 HTTP 200 `{code:429,...}` 不改成公开 HTTP 429。网关 JSON 上限固定 1 MiB，超限返回稳定 413 envelope。
- **可信来源 IP**：网关只信一跳 Nginx，并从 `req.ip` 生成内部 `x-paperbanana-client-ip`，不转发客户端原始 X-Forwarded-For/X-Real-IP。Node 核心只把这个已认证值和安全 User-Agent 暴露给共享处理器；Laf 处理器优先读取新 header，同时保留旧 Laf forwarding fallback。
- **匿名任务归属**：`createJob`/`refineImage`/`prepareReferenceUpload` 未登录时由网关设置 30 天 `__Host-paperbanana_guest`（Secure、HttpOnly、Path=/、SameSite=Lax、无 Domain），Mongo 仅保存不可逆 `guest:<SHA-256>` owner。新增必需 env `PAPERBANANA_GUEST_COOKIE_SECRET`（至少 32 bytes），可选 `PAPERBANANA_GUEST_COOKIE_SECRET_PREVIOUS` 用于无 owner 变化的轮换。`getJob` 允许匹配 account id、历史 email、有效 guest owner 或登录管理员；owner 缺失/不匹配一律 403。guest 不获得 myJobs、删除账号或任何 admin/list 权限。
- **精修授权/SSRF**：`refineImage.sourceImageObjectKey`（或属于配置香港 OSS Bucket 的 V4 签名 URL）先从首段解析源 job id，再用 `getJob` 校验归属；有 object key 时丢弃 URL 并走内部 OSS 读取。Node 生产拒绝任意外部 URL。`PAPERBANANA_ALLOW_LEGACY_EXTERNAL_REFINE_URL=true` 只允许在明确 Laf 回滚模式临时兼容。
- **维护/健康**：`PAPERBANANA_MAINTENANCE_MODE` 或 `PAPERBANANA_MAINTENANCE_FILE` 动态阻断 create/refine/upload/submitFeedback/account delete 及 importReferences/evaluateJob/initDatabase，返回 503+Retry-After；auth、health、ready、getJob、myJobs 与只读/admin read 保持可用。`/health` 顶层仍为 `runtime:'gateway'` 且只读缓存；`/ready` 实探 Auth Mongo+所选后端；`laf` 作为 `backend` 的一版兼容别名。
- **账号删除**：只有业务清理同时满足 HTTP 2xx 与 `{code:0,ok:true}` 才清 Cookie/硬删 Auth；业务 code、`ok:false`/缺失、HTTP 错误或超时均原样返还且 Auth 不变。
各端待办：
- [x] auth-gateway（Node 24、固定后端、guest/owner/refine/maintenance/health/delete、测试与非 root 镜像）
- [x] paperbanana-api / laf-functions（可信 client-IP 传输与 Laf 兼容 fallback）
- [x] 部署/运维（补齐新 env；Compose 仅发布 `127.0.0.1:13005:3005`；Nginx 必须覆盖 forwarding headers；切流前维护/排空）
- [x] web/iOS（公开 action/envelope 不变；既有 credentials/cookie transport 与 objectKey 字段兼容，无代码改动）
- [ ] 其他客户端（本次发布范围外；后续仍须确认 cookie 持久化及 API base）

### [2026-08-14] Node API 有界任务准入、OSS 直传校验与无阻塞健康检查 — by Codex (paperbanana-api + laf compatibility)
变更：Node 单副本运行时新增进程级任务准入/排队、可追踪优雅退出、OSS 内外双端点与上传后权威校验；旧 Laf 只增加向后兼容的共享调度/校验能力，公开 action、字段和响应 envelope 不变。
契约（影响其他端 / 共享）：
- **任务准入**：`createJob`/`refineImage` 在任何异步预检和 Mongo insert 前预留容量；默认全服务 active=1、pending=2、每 owner=1、每 client IP=1。满载时仍走既有 HTTP 200 业务响应，返回稳定 `{code:429,error:...}`，且不插入孤儿任务。新增可选 env：`PAPERBANANA_MAX_ACTIVE_JOBS`、`PAPERBANANA_MAX_PENDING_JOBS`、`PAPERBANANA_MAX_JOBS_PER_OWNER`、`PAPERBANANA_MAX_JOBS_PER_IP`。
- **退出契约**：首次 SIGTERM/SIGINT 先停止准入和 HTTP 接入，再保持 Mongo 打开直至 reserved/queued/running 全部 drain；第二次信号才强制退出。仍必须 `PAPERBANANA_SINGLE_REPLICA=true` 且 Recreate/先停后启，禁止新旧实例重叠。
- **OSS 双端点**：Node 新增必需 env `OSS_INTERNAL_ENDPOINT=https://<region>-internal.aliyuncs.com`（服务端 put/list/stat/get/delete/probe）与 `OSS_PUBLIC_ENDPOINT=https://<region>.aliyuncs.com`（预签名）；二者必须分离，V4 virtual-hosted，禁止 path-style，桶启动时仍校验 private ACL。
- **直传签名与消费校验**：`prepareReferenceUpload` 的公开响应形状不变，但 PUT V4 签名现在同时绑定声明的精确 `Content-Type` 和 `Content-Length`。Web 继续上传已知大小 `File`/`Blob`、iOS 继续上传已知大小 `Data`：客户端设置精确 Content-Type，由 HTTP transport 自动产生匹配长度，**不得由客户端代码手写禁用的 Content-Length**。切流前必须各做一次真实 Chrome/iOS→OSS smoke；若 transport 不满足签名，后续由网关增加流式上传 fallback，不得静默削弱签名。服务端消费前会 stat 实际 size/type，错配/超 5 MiB 即拒绝并尽力删除。
- **下载上限**：参考图/精修图流式读取硬上限 5 MiB；provider 出图上限由 `PAPERBANANA_MAX_PROVIDER_IMAGE_BYTES` 控制（默认 20 MiB），即使响应缺失或伪造 Content-Length 也按实际字节截断拒绝。
- **健康检查**：`/health` 只读进程内缓存、绝不发 Mongo/OSS 网络请求；`/ready` 使用 `PAPERBANANA_READINESS_PROBE_TIMEOUT_MS`（默认 2000ms）的单飞有期限探测并更新缓存，依赖卡死时仍会有限时间返回 503。
各端待办：
- [x] paperbanana-api / laf-functions（准入、生命周期、OSS 双端点/校验/上限、健康检查与测试）
- [ ] 部署/运维（OSS 两端点、Recreate、`stop_grace_period` 与真实 Web/通用签名 PUT 已完成；新 iOS 构建发布前仍需在真机/模拟器做一次 OSS PUT smoke）
- [x] auth-gateway / clients（本次未改公开 route/action/envelope；现有已知大小直传逻辑无代码变更）

### [2026-08-14] Node API 收紧 BYOK、对象存储与请求体契约 — by Codex (paperbanana-api + laf compatibility)
变更：Node 运行时新增三项安全约束；旧 Laf 处理器仅增加向后兼容开关与无密钥后台 DTO，默认 Laf 行为仍可用于回滚。
契约（影响其他端 / 共享）：
- **BYOK 生命周期**：`createJob`/`refineImage` 选出当前 provider key 后，后台执行 DTO 会删除完整 `apiKeys` map，只把选中的单个 key 作为独立内存参数传递；不新增 Redis、队列或密钥持久化。
- **Node 严格对象存储**：新增必需 env `PAPERBANANA_STRICT_OBJECT_STORAGE=true`。Node 中结果图/阶段图写 OSS 失败会让任务失败，禁止写入 Mongo `database-data-url`/`data:` URL。Laf 未设置或设为 false 时保留历史回退，便于回滚。
- **请求体上限**：Node `POST /paperbanana-api` JSON 上限为 1 MiB，超限返回 HTTP `413 {code:413,error:'Request body too large'}`；参考图继续走既有预签名直传，不应放进 JSON/base64。
各端待办：
- [x] paperbanana-api / laf-functions（无密钥后台 DTO、严格存储开关、1 MiB 限制、组合测试）
- [x] 部署/运维（Node env 增加 `PAPERBANANA_STRICT_OBJECT_STORAGE=true`）
- [x] auth-gateway / clients（公开 action/envelope 与预签名上传流程不变，无代码改动）

### [2026-08-14] 新增阿里云香港 Node 24 内部业务 API — by Codex (paperbanana-api)
变更：新增 `apps/paperbanana-api`，构建时直接复用原 `apps/laf-functions/paperbanana-api.ts`，通过 Node 版 `@lafjs/cloud` 兼容层接入 MongoDB 与私有阿里云 OSS；旧 Laf 文件保持不变，可继续用于回滚。
契约（影响其他端 / 共享）：
- **内部路由**：Node 服务提供 `GET/POST/OPTIONS /paperbanana-api`、`GET /health`、`GET /ready`。业务 action、请求/响应 envelope 及 POST 业务错误 HTTP-200 语义不变，客户端公开路由形状不变。
- **网关 → Node 内部鉴权**：所有 `GET/POST /paperbanana-api` 必须带 header `x-paperbanana-gateway-token`，值与 Node env `PAPERBANANA_GATEWAY_TOKEN` 相同。Node 会丢弃 body 中任何客户端提供的 `gatewayToken`/`adminToken`，再把服务 token 注入旧处理器；旧 Laf 的 `health`/`modelCapability`/`referenceLibrary` 在 Node 服务内也没有直连豁免。
- **管理员动作**：若启用既有管理员 action，`ADMIN_TOKEN` 只配置在 Node 服务端；通过内部传输鉴权后，Node 仅为已知管理员 action 注入该 token，不信任调用 body 中的值。
- **Node 必需 env**：`PAPERBANANA_GATEWAY_TOKEN`、`PAPERBANANA_SINGLE_REPLICA=true`、`MONGODB_URI`、`PAPERBANANA_BUCKET`、`OSS_REGION`、`OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET`；`MONGODB_BUSINESS_DB` 默认 `paperbanana_business`。OSS 桶必须私有，禁止 path-style。
- **单副本恢复**：Node 在 readiness 前把遗留 `queued/running` 任务幂等标记为 `failed`，并写入 `errorCode='RUNTIME_RESTARTED_RETRY'`、`retryable=true`；既有终态任务不变。多副本在实现任务 lease 前不受支持。
- **健康检查**：`/health` 标识 `service='paperbanana-api'`、`runtime='node'` 并报告依赖 readiness；`/ready` 在 Mongo/OSS 任一不可用时返回 503。
各端待办：
- [x] paperbanana-api（Node 24 服务、Mongo/OSS 适配、恢复、鉴权、健康检查、测试与镜像）
- [x] auth-gateway（内部目标切到 Node，并用 header `x-paperbanana-gateway-token` 传服务 token；不得继续把 token 当客户端字段透传）
- [x] 部署/运维（配置上述必需 env；仅运行 1 副本且使用 Recreate/先停后启，禁止滚动更新时新旧实例重叠；把健康/就绪探针分别指向 `/health`、`/ready`）
- [x] web/miniprogram/android/ios/windows/macos（公开路由与业务 envelope 无变化，无需改客户端）

### [2026-06-20] 新增「删除账号」链路（App Store 5.1.1(v)）— by Claude (backend + ios)
变更：后端新增账号注销能力。`auth-gateway` 新增路由 `POST /api/account/delete`，`laf-functions` 新增 `deleteAccount` action（已登记进 `identityScopedActions`，受网关 token / IDOR 守卫）。iOS 已接入，其余端待办。
契约（影响其他端 / 共享）：
- **客户端 → 网关**：`POST /api/account/delete`，需带 session cookie，body `{ "email": <当前登录邮箱>, "password": <重新输入的密码> }`。
- **网关逻辑**：① 必须有有效 session 且 `session.user.email`（小写 trim 后）== `body.email`，否则 `403 {code:403,error:"EMAIL_MISMATCH"}`；未登录 `401`。② 用 Better Auth `signInEmail` 重新验证密码，密码错 → `401 {code:401,error:"INVALID_PASSWORD"}`。③ 调 Laf `deleteAccount` 清业务数据（先清，失败则不删账号、整体返错让客户端重试）。④ 清 cookie（Better Auth signOut）。⑤ 删 Better Auth `user`+`session`(+`account`)（Mongo 直删，真删，无法再登录）。成功返回 `200 {code:0,ok:true}`。
- **响应码（客户端照此处理）**：`200 {ok:true}` 成功；`400` email/password 缺失；`401 INVALID_PASSWORD` 密码错；`403 EMAIL_MISMATCH` 邮箱与当前 session 不符；`401` 未登录；`5xx` 服务端/Laf 故障（可重试，账号未删）。
- **Laf `deleteAccount`**：入参 `{action:'deleteAccount', userId, userEmail, gatewayToken}`。硬删 `paperbanana_jobs`（`userId`/`user_id`/`userEmail`/`user_email` 匹配）、`paperbanana_feedback`（同），尽力删对象存储 `references/<owner>/` 下该用户参考图（失败仅 `console.warn`，不阻断）；**结果图保留**。返回 `{code:0,ok:true,deletedJobCount,deletedFeedbackCount,deletedReferenceObjectCount}`。幂等。
- **环境变量**：复用既有 `PAPERBANANA_GATEWAY_TOKEN`（网关↔Laf 信任边界），无新增。
各端待办：
- [x] laf-functions（`deleteAccount` action + best-effort 删参考图 + policy test）
- [x] auth-gateway（`POST /api/account/delete`：session/邮箱校验 + signInEmail 验密 + 调 Laf + 删 user/session/account + 清 cookie）
- [x] iOS（设置页「删除账号」入口：二次确认重输密码 → 调本接口 → 成功后登出清本地态）
- [x] web（设置/账户页已增加删除入口并在退出/注销时清理本地 BYOK 与稿件状态）
- [ ] miniprogram（同步删除入口）
- [ ] android/macos/windows（同步删除入口）

### [2026-06-20] 上传参考图与检索设置改为前置互斥 — by Codex (ios)
变更：此前规则是“上传参考图后自动关闭检索”。产品侧改为更清晰的前置互斥：**只有检索设置为 `none` / “不使用检索”时，客户端才允许用户上传本地参考图**；若选择 `auto` / `random` / `manual` 检索，本地参考图上传入口应禁用并提示先切回“不使用检索”。
契约（影响其他端 / 共享）：
- 后端/`createJob` 的兜底语义仍应保留：`referenceImages` 非空时最终以上传图为唯一视觉来源，`retrievalSetting='none'`、`manualReferenceIds=[]`。
- 客户端 UI 应前置阻止冲突组合，而不是上传后替用户改检索；这能避免用户以为“检索库参考”和“自己上传参考图”会同时生效。
- 手动参考库仍只在 `retrievalSetting='manual'` 且没有上传参考图时展示。
各端待办：
- [x] ios（上传入口禁用/导入管线兜底/指南文案/契约测试）
- [ ] web/miniprogram/android/windows/macos（同步 UI：检索非 none 时禁用本地参考图上传，并提示先选择“不使用检索”）

### [2026-06-10] 更正：getJob"非法 JSON"系误报，后端无需修改 — by Claude (miniprogram)
变更：此前怀疑 `getJob` 响应含未转义控制字符——**已排除，系测试脚本误报**。复现验证：响应本身是合法 JSON（含 229 个正确的 `\n`/`\t` 转义序列）；测试脚本用 zsh 的 `echo "$RESP"` 中转响应，zsh echo 默认解释反斜杠转义，把合法的 `\n` 二字符序列变成裸换行字节，才导致严格解析失败。`printf '%s'` 对照实验解析通过，失败位置（char 936）与原报错完全一致。
契约（影响其他端 / 共享）：
- **laf-functions 无需任何修改**；各端无需为此排查。
- 经验：shell 脚本中转 JSON 一律用 `printf '%s'`，勿用 zsh/sh 的 `echo`。
- miniprogram 顺手加的防御解析 `coerceJsonResponse`（解析失败时清洗控制字符重试）保留——对网关/代理异常返回（HTML 错误页等）仍是合理兜底，非必须项。
各端待办：
- [x] laf-functions（无需修改）
- [x] miniprogram（防御解析保留，注释已更正为通用兜底说明）
- [x] web/android/windows/macos（无需行动）

### [2026-06-09] 上传参考图时自动关闭检索（二选一）— by Claude
变更：`createJob` 当请求带了有效 `referenceImages` 时，后端**强制** `retrievalSetting='none'`、`manualReferenceIds=[]`（以上传图为唯一视觉风格锚点，避免检索到的多张图与上传图风格相互打架）。检索一律不跑、不附检索图，任务记录里 `retrievalSetting` 即存为 `none`、徽标显示"不检索"。
契约（影响其他端 / 共享）：
- `createJob` 语义变化：**`referenceImages` 非空 ⇒ `retrievalSetting`/`manualReferenceIds` 被服务端忽略并归零**。后端权威，任何客户端无需改造即自动一致；但各端 UI 最好同步反映（上传参考图后把"检索设置"锁为不检索并提示），以免用户以为检索仍在生效。
- 不是字段增减，是既有字段组合的语义约定；后端单点 `paperbanana-api.ts` 归一化处生效。
各端待办：
- [x] laf-functions（归一化处：有上传图则 retrievalSetting→none、manualReferenceIds→[]）
- [x] web（检索设置 Select 在有参考图时锁为"不使用检索"+disabled+提示；payload 同步发 none；隐藏手动参考面板）
- [x] miniprogram（已同步：上传参考图后"检索设置"锁为"不使用检索"+提示文案；payload 双保险发 none/[]）
- [ ] android/windows/macos（UI 可选同步：上传参考图后提示"检索已自动关闭"；不改也不会出错，后端已强制）

### [2026-06-09] 输出清晰度 + 精修内联化 + 精修模型 bug 修复 — by Claude
变更：① 生成新增"输出清晰度"`imageSize`('2K'/'4K');② 精修分析步骤的模型选择修 bug;③ web 移除独立"精修图片"页签,改结果图"精修"按钮弹内联模态(纯前端)。
契约（影响其他端 / 共享）：
- `createJob` 新增可选字段 **`imageSize`('2K'|'4K',默认 2K)** —— 出图分辨率。`packages/api` 的 `createJobRequest` 已白名单;后端 `callImageModel(...,imageSize)` 按 provider 映射安全尺寸(bailian `bailianImageSize(aspectRatio,imageSize)`、gemini `geminiImageSize`:4K→2K 因 imageConfig 仅收 1K/2K)。各端可在生成参数里加该选项。
- `refineImage` 动作:**修复**——之前 `refineImageRequest` 漏传 `mainModelName`/`referenceVisionModelName`,后端退化用出图模型(如 wan2.7-image-pro)做"读源图"分析 → DashScope 报 `messages.0.role` 错。现在两字段都转发;后端 `runRefineJob` 非图生图分支的源图分析用 `referenceVisionModelName || mainModelName`(绝不用 imageModelName)。各端精修请求需带这两个模型名。
- 精修 UI 改为内联模态(web 单端),非契约;其他端可自行决定精修入口,但请求字段同上。
各端待办：
- [x] laf-functions（imageSize 接 callImageModel;refine 分析改视觉/主模型）
- [x] packages/api（createJobRequest 加 imageSize;refineImageRequest 转发 mainModelName/referenceVisionModelName）
- [x] web（输出清晰度 Select;精修内联模态;移除页签）
- [x] miniprogram（生成已加"输出清晰度"1K/2K/4K，按 provider/图像模型过滤并自动收敛；与 web 一致无手动精修 UI（精修由清晰度自动驱动），故无精修请求需补字段）
- [ ] android/windows/macos（生成加 imageSize 可选;精修请求补 mainModelName/referenceVisionModelName）

### [2026-06-08] 阿里百炼模型列表更正 + 参考图模式按固定能力 — by Claude
变更：之前 bailian 模型常量含**不存在/未激活**的名字;改为官方模型广场的真实模型,并把"参考图识别能力"按**模型**固定。
契约（影响其他端 / 共享 model 列表）：
- **bailian 真实模型**(各端 provider/model 常量需同步):文本主模型 `qwen3.7-max`(默认)/`qwen3.7-plus`/`qwen3.6-flash`/`deepseek-v4-pro`/`deepseek-v4-flash`/`kimi-k2.6`/`glm-5.1`/`MiniMax/MiniMax-M2.7`;出图 `wan2.7-image-pro`(默认)/`qwen-image-2.0-pro`;**图像理解(=参考图识别模型)** `qwen3.7-plus`(默认)/`qwen3.5-omni-plus`/`kimi-k2.6`。剔除 `mimo-v2.5-pro`(账号未激活)。MiniMax 需带前缀 `MiniMax/`。
- **能力固定**:Laf `modelCapability`/`referenceModelCapability` 对 bailian 按正则判定——含 `qwen3.7-plus|qwen3.5-omni|omni|kimi-k2.6|qwen-?vl|qvq` 才 supported(可直读图);其余文本模型 unsupported,会**静默改走独立识别模型**(不再报错)。前端有同名同义 helper `mainModelCanReadImages`(constants.js)。
- **参考图处理方式去掉"自动选择"**:前端按 `mainModelCanReadImages(provider, mainModel)` 固定缺省(能读→主模型直读,否则→独立识别模型);仍可手动切两种。`createJob.referenceImageMode` 不再发 `'auto'`(后端仍兼容 auto=按能力判定)。
- bailian 带图调用仍:data:URL→桶公网 URL、所选识别模型读不了图时兜底 VL(见上一条 bailian 视觉修复)。
各端待办：
- [x] laf-functions（能力正则、静默兜底、stage 标题中文）
- [x] web（真实模型常量、删自动选择、修图过大 CSS）
- [x] miniprogram（已同步 bailian 真实模型常量 + mainModelCanReadImages 固定能力;参考图模式按能力派生缺省，已去掉 auto 入口，展示层保留旧记录 auto 兼容）
- [ ] android/windows/macos（同步 bailian provider/model 常量到真实模型 + 识别模型能力;去掉 auto 入口）

### [2026-06-08] 修复越权(IDOR)：Laf 校验网关共享 token — by Claude
变更：公开的 Laf 端点(`https://sdswgya641.sealoshzh.site/paperbanana-api`)此前完全信任调用方传入的 `userId`/`userEmail`,任何人直连即可用受害者 `userId` 读其任务历史(`method_content`/`caption`/结果图 URL),绕过网关会话鉴权。现在 Laf 对「依赖调用方身份」的非管理员动作校验网关注入的共享 token。
契约（影响其他端 / 共享）：
- **网关信任边界**：Laf 对 `createJob` / `refineImage` / `submitFeedback` / `userJobs` / `getJob` / `prepareReferenceUpload` 这些读写用户数据的动作,要求请求携带 `gatewayToken`(由 auth-gateway 的 `withGatewayToken` 注入到 **body**,值=env `PAPERBANANA_GATEWAY_TOKEN`),或携带有效 `adminToken`(=`ADMIN_TOKEN`);否则返回 `401`。
- **复用既有 env**:网关侧无需改代码(`withGatewayToken` 已就绪)。新增的是 **Laf env `PAPERBANANA_GATEWAY_TOKEN`**,必须与 auth-gateway 的同名 env 取**同一值**。
- **豁免**:`health` / `modelCapability` / `referenceLibrary` 为无害只读,不强制 token。
- **admin 动作不变**:`adminJobs` / `adminFeedback` / `importReferences` / `evaluateJob` / `pingPlotWorker` 仍用 `ADMIN_TOKEN` 直连 Laf,不受影响。
- **向后兼容/灰度**:Laf 未设 `PAPERBANANA_GATEWAY_TOKEN` 时**不强制**(fail-open,仅打 warn 日志),避免部署时序造成中断;两端都配置后才真正生效。
- **各端要求**:所有客户端必须把后端地址指向**网关域名**(`https://yifbnnzrwmxn.sealoshzh.site`,各端默认值已如此),**禁止把 base 改成 Laf 域名 `sdswgya641` 直连**——直连模式下身份动作会被拒。任何端若有绕过网关直连 Laf 的身份动作路径,需改走网关或在受信服务端注入该 token(切勿把 token 下发到客户端)。
部署：①生成强随机串 S;②auth-gateway(Sealos App Launchpad)env `PAPERBANANA_GATEWAY_TOKEN=S` 并重启;③Laf(Sealaf 控制台 paperbanana-api 函数)env `PAPERBANANA_GATEWAY_TOKEN=S` 并应用级重启;④push 改动 → CI `laf func push` 自动部署;⑤验证:网关→Laf 正常、直连伪造 userId 的 `userJobs` 返回 401。
各端待办：
- [x] laf-functions（校验 `gatewayToken`/`adminToken`,fail-open 兜底）
- [x] auth-gateway（无需改：`withGatewayToken` 已注入;仅需在 Sealos 配置 `PAPERBANANA_GATEWAY_TOKEN` env）
- [x] web（默认 `VITE_API_BASE` 指向网关,经网关转发,无需改）
- [x] miniprogram（已确认：`miniprogram/utils/config.ts` 的 `API_BASE` 指向网关域名 `https://yifbnnzrwmxn.sealoshzh.site`，未直连 Laf）
- [ ] android（确认 `API_BASE_DEFAULT` 指向网关域名,勿直连 Laf）
- [ ] windows（确认 `DefaultApiBase` 指向网关域名,勿直连 Laf）
- [ ] macos（默认 `sealosAPIBase` 指向网关;若用户把"网关地址"改成 Laf 域名,身份动作将被拒——属预期）

### [2026-06-08] 向 dwzhu-pku/PaperBanana 深度对齐（prompt 质量 + plot + 参考数据 + eval）— by Claude
变更：在 Codex 的 10 项基础上做实质对齐——移植 root 完整 agent prompts + 104 行 NeurIPS 风格指南；critic 改 root 的 JSON 契约 + 空图守卫 + 失败回滚；refine 改真·图生图；检索候选 80→200、infographicCategory 真正注入 prompt；导入 PaperBananaBench 真实参考图；接入 plot 任务（经独立 plot-worker 渲染）；新增管理员评估。
契约（影响其他端 / 共享）：
- `createJob` 现接受 `taskName:'plot'`：走 matplotlib 代码生成 → 调外部 plot-worker 渲染 → 图像 critic 迭代。**diagram 路径不变**。`packages/api` 的 `createJobRequest` 已白名单 `taskName`，前端传 `'plot'` 即可。
- 新增 **admin 动作**：`importReferences`（从 hf-mirror 导入 PaperBananaBench → `paperbanana_references` + 对象存储）、`evaluateJob`（LLM-judge 4 维评分：有 GT 做 referenced，否则 reference-free）。两者 `ADMIN_TOKEN` 鉴权、**直连 Laf**（不经网关）。
- `paperbanana_references` 现含 **295 条真实 diagram 参考图**（`source=paperbanana-bench`）；reference URL 一律从 `imageObjectKey` 重签，不存死 URL。
- 新增 **env（Laf）**：`PLOT_WORKER_URL`、`PLOT_WORKER_TOKEN`（plot 任务调用渲染服务）。
- critic 输出改为 root 的 JSON 契约 `{critic_suggestions, revised_description}`（后端内部解析，兼容旧纯文本，不影响客户端）。
- 新增独立服务 `apps/plot-worker`（Python/FastAPI matplotlib 沙箱，已硬化）+ CI `build-plot-worker.yml`，部署在 Sealos「应用管理」。
各端待办：
- [x] laf-functions（prompt/robustness/plot 管线/importReferences/evaluateJob）
- [x] packages/api（`taskName` 已白名单，无需改）
- [x] web（plot 提交放开：data_stat 类别 → `taskName:'plot'`）
- [x] auth-gateway（无需改：plot 走 createJob 既有转发；admin 动作直连 Laf）
- [x] miniprogram（已接入：信息图类别选"数据统计图"时 `taskName:'plot'` + 提示"统计图由独立渲染服务生成"；参考库检索 taskName 同步切 plot）
- [ ] android/windows/macos（兼容 `taskName:'plot'`，后续补 plot UI）
- [x] plot-worker 已部署到 Sealos（Deployment+Service+NetworkPolicy，2Gi）+ Laf 已设 `PLOT_WORKER_URL`/`PLOT_WORKER_TOKEN`；`pingPlotWorker` 实测渲染通过

### [2026-06-08] PaperBanana 根项目 10 项功能对齐（diagram 主链路）— by Codex
变更：补齐 web 主链路的参考检索、手选参考、图像 Critic、Stylist 风格指南、pipeline stages、候选阶段记录、Refine Image、下载全部、管理员诊断摘要；`data_stat/plot` 明确标为二阶段能力，避免假入口。
契约：
- `createJob` 新增/启用 `taskName`、`retrievalSetting`(`none|auto|random|manual`)、`manualReferenceIds[]`；`manual` 必须带参考 id。
- 新增 action：`referenceLibrary`（列出 `paperbanana_references` + fallback 文本参考卡）、`refineImage`（源图 + 精修指令 → refine job）。
- `paperbanana_jobs/publicJob` 新增 `jobType`、`taskName`、`infographicCategory`、`retrievalSetting`、`manualReferenceIds`、`retrievedReferenceIds`、`retrievedReferences`、`stages`、`criticMode`、`imageSize`。
- `auth-gateway` 已放行 `referenceLibrary` / `refineImage`，精修会像 createJob 一样附登录用户身份；`ADMIN_TOKEN` 逻辑不变。
- 正式 PaperBananaBench 大图不进仓库；后续应把参考元数据导入 `paperbanana_references`，图片放对象存储。
各端待办：
- [x] laf-functions
- [x] auth-gateway
- [x] packages/api
- [x] web（manual 参考、timeline、zip、refine、plot 占位）
- [x] miniprogram（已兼容新增字段并补全 UI：检索设置 none/auto/random/manual、手动参考库选卡（≤10）、stages 生成演化时间线、检索参考展示、任务记录新徽标）
- [ ] android（兼容新增字段；后续补 UI）
- [ ] windows（兼容新增字段；后续补 UI）
- [ ] macos（兼容新增字段；后续补 UI）
- [ ] plot render worker（二阶段：Python/matplotlib 执行与图像 Critic）

### [2026-06-07] 管理员改为账号制(邮箱白名单) — by Codex
变更：admin 鉴权从手填 `ADMIN_TOKEN` 改为“登录邮箱 ∈ `ADMIN_EMAILS`”；新增 `adminStatus`；前端去掉 token 框、按 `adminStatus` 显示站长入口。
契约：网关新增 env `ADMIN_EMAILS` + `adminStatus` 动作；admin 动作不再接收用户 `adminToken`（网关内部注入）；`ADMIN_TOKEN` 仅网关内部保留。
各端待办：
- [x] auth-gateway
- [x] web
- [x] packages/api
- [x] miniprogram（无 admin 入口，无需改）
- [ ] 其它端无 admin UI 暂不涉及

### [2026-06-07] 用户意见反馈 submitFeedback — by Codex
变更：新增意见反馈（匿名可提，登录后由网关自动附身份）。
契约：新 action `submitFeedback` + `adminFeedback`；新集合 `paperbanana_feedback`；网关放行这两个 action；任务无关；不读取/存储 `apiKeys`。
各端待办：
- [x] laf-functions
- [x] auth-gateway
- [x] web（含 admin 反馈页）
- [x] miniprogram

### [2026-06-07] Web 近期大版本同步基线 — by Codex
**变更**：Web 端已完成一轮大版本更新，其他端同步时应以这些 API/数据契约为基线，而不是只同步单个页面 UI。
**契约**：
- `createJob` 支持 `outputFormat: 'png' | 'svg'`；`png` 走图像模型，`svg` 走 SVG 文本生成链路并由后端做安全清洗。
- 任务记录需要展示并消费完整图片资产字段：`result_images` / `resultImages`、`reference_images` / `referenceImages`，每个资产按 `mimeType` / 文件名判断 PNG 或 SVG。
- 结果图和参考图下载都要支持 bucket 签名 URL、`data:` URL、`image/png`、`image/svg+xml`；失败任务也应该展示可用的 `reference_images`。
- 任务记录字段应同步展示：`output_format`、`main_model_name`、`image_gen_model_name`、`reference_vision_model_name`、`reference_image_mode`、`reference_image_mode_used`、`method_content`、`caption`、`error`。
- 账号任务记录通过 auth-gateway：登录用户走 `myJobs`，管理员任务走 `adminJobs`，账号列表走 `adminUsers`；客户端不要再靠手填 email 查询用户任务。
- 当前核心 action 基线：`health`、`createJob`、`getJob`、`userJobs`、`adminJobs`、`adminUsers`、`prepareReferenceUpload`、`modelCapability`。
- 模型列表已在 Web 端按最新表固化，其他端需要同步 provider/model 常量；阿里百炼主模型直读参考图仍不启用，继续走独立识别模型。
- 参考图上传、主模型直读、SVG 参考图服务端栅格化的细节见下方对应条目。
**用户反馈 / 回归重点**：
- 用户反馈过生成失败后信息不够明确；各端任务记录必须展示 `error`，必要时兜底展示 `logs_tail`。
- 用户反馈任务记录里的图片/文件不好下载；各端要区分 PNG 与 SVG：PNG 才走保存到相册/图片保存，SVG 走复制链接或文件下载。
- 用户反馈失败任务也需要保留输入上下文；各端不要只在 `status=succeeded` 时展示参考图和任务详情。
- 用户反馈模型输入不应自由填写；各端要使用固定 provider/model 列表，并跟 Web 常量保持一致。
**各端待办**：
- [x] laf-functions
- [x] auth-gateway
- [x] web
- [x] miniprogram
- [ ] android
- [ ] windows
- [ ] macos

### [2026-06-07] 参考图上传 + 主模型直读 — by Codex
**变更**：新增参考图上传，以及「主模型直读 / 独立识别模型」两种参考图理解模式。
**契约**：
- `createJob` 新增 `referenceImages[]`、`referenceImageMode`(`auto|main_model|vision_model`)、`referenceVisionModelName`。
- 新增只读 action：`prepareReferenceUpload`（预签名直传对象存储）、`modelCapability`（查模型是否支持读图）。**`auth-gateway` 需放行转发这两个 action。**
- 任务记录新增 `referenceImages`、`referenceImageMode`、`referenceImageModeUsed`，并在 `publicJob` / `packages/api` 透出。
- 新增 env：`PAPERBANANA_MAX_REFERENCE_IMAGES`、`PAPERBANANA_MAX_REFERENCE_BYTES`、`PAPERBANANA_REFERENCE_UPLOAD_TTL_SECONDS`、`OPENROUTER_MODEL_CACHE_TTL_MS`。
- 注意：`packages/api/src/jobs.js` 的 `createJobRequest` 是**字段白名单**逐个拼包，新字段必须显式加进去才会发出去。
**各端待办**：
- [x] laf-functions
- [x] auth-gateway（已放行 prepareReferenceUpload / modelCapability）
- [x] web
- [x] miniprogram
- [ ] android
- [ ] windows
- [ ] macos

### [2026-06-07] SVG 参考图改服务端栅格化 — by Codex
**变更**：SVG 参考图不再要求客户端随附栅格化 PNG；后端会在需要喂给视觉模型/主模型直读时，把原始 SVG 服务端渲染为 PNG。
**契约**：
- `createJob.referenceImages[]` 中 SVG 参考图可以只传原始 `objectKey` / `mimeType=image/svg+xml`，不再强制 `analysisObjectKey`。
- Laf 后端遇到 SVG 且缺少 `analysisObjectKey` 时，会下载原始 SVG、sanitize、用 `@resvg/resvg-wasm` 栅格化为 PNG，并写回 bucket 为 `*-server-analysis.png`。
- 任务记录里的 `referenceImages[]` 会补上服务端生成的 `analysisObjectKey`、`analysisMimeType=image/png`、`analysisSize`；`publicJob` 同步返回 `analysisUrl`。
- 新增 env：`PAPERBANANA_SVG_REFERENCE_RASTER_WIDTH`，默认 `1024`，运行时限制在 `320-1536`。
- Laf 运行环境要求保留 Sealaf custom dependency：`@resvg/resvg-wasm`；wasm 路径按 `${CUSTOM_DEPENDENCY_BASE_PATH}/node_modules/@resvg/resvg-wasm/index_bg.wasm` 读取，不能使用 `require.resolve`。
- 各客户端只需要上传原始 SVG；不要再强制做本地 canvas/原生栅格化。Web 端已移除 `rasterizeSvgFile`。
- `auth-gateway` 无新增 action，无需改转发规则。
**用户反馈 / 回归重点**：
- 用户反馈非 Web 端无法使用 SVG 参考图；各端只上传原始 SVG 后，`main_model` 和 `vision_model` 两种参考图模式都必须能生成成功。
- 用户反馈大文件/大 payload 会导致小程序性能问题；各端不要把参考图或结果图 base64 写入页面状态或任务记录，只保留 URL/objectKey 元数据。
- 记录页应能看到原始 SVG 参考图；服务端生成的 PNG analysis 只用于模型理解和排查，不替代用户上传的原文件展示。
**各端待办**：
- [x] laf-functions
- [x] auth-gateway（无需改）
- [x] web
- [x] miniprogram
- [ ] android
- [ ] windows
- [ ] macos
