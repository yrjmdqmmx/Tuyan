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

### [2026-08-20] OpenRouter 34 模型付费验证与 PNG 统一输出 — by Codex
变更：Core 注册表升级为 `2026-08-20.v8`。在用户授权的 9 美元上限内，对此前因输出格式元数据不兼容而禁用的 34 个 OpenRouter 图片模型逐项执行付费生成，34/34 均返回真实图片；实际默认响应为 14 个 PNG、10 个 JPEG、10 个 WebP。运行时按这份精确 ID 白名单开放模型，并在存储前统一为真实 PNG；本次验证总成本约 2.42 美元。
契约（影响其他端 / 共享）：
- **最终格式**：所有兼容 OpenRouter 图片路线对客户端统一暴露 `capabilities.outputFormats:['png']`；34 项付费白名单覆盖 14 个原生 PNG、10 个 JPEG、10 个 WebP，既有 SVG 兼容路线继续经有界 Resvg 栅格化。原生 PNG 必须通过完整 chunk/CRC、IHDR/IEND 与 8192 边长/20MP 上限校验；JPEG 沿用有界解码器转 PNG；WebP 仅允许静态、可解析尺寸且不超过同一上限，由精确 `sharp@0.35.3` 转 PNG。未知 ID、动画 WebP、损坏数据和其他格式继续失败关闭。
- **目录纠错**：`bytedance-seed/seedream-4.5` 的付费 1K 调用被供应商拒绝，运行时与注册表移除 1K，仅允许 2K/4K；不会从名称或错误目录值推断兼容性。
- **验证语义**：逐项付费结果只建立服务器内维护的精确转换白名单；公开动态项仍保持 `verificationState:'catalog'`、`verified:false`，不把一次测试冒充为所有用户账号权益。漂移检查会监控 34 个精确 ID 及 Seedream 4.5 的 canonical 2K/4K 能力，缺失或能力退化即 warning，永不自动接纳新项。
- **运行依赖**：香港 Node 镜像保留 `sharp@0.35.3` 为原生外部依赖，并在 Docker 构建中执行真实 WebP→PNG smoke；Core 的新加坡出口依赖同步固定到已修复已知安全公告的 `undici@7.29.0`。暂停的 Laf 回滚只有在控制台确认 `jpeg-js@0.4.4`、`sharp@0.35.3`、兼容 Node/OS/CPU 且真实 WebP smoke 通过后，才可人工发布；verification-only workflow 不安装、不登录、不 push。
各端待办：
- [x] paperbanana-api / Laf Core（v8 注册表、PNG/JPEG/WebP 归一、尺寸/结构边界、Seedream 4.5 纠错、漂移监控与 TDD）
- [x] Web（继续只消费服务端角色与 `outputFormats`；34 项会在 PNG 模式自动可选，无需名称推断）
- [ ] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（若展示动态 OpenRouter 图片目录，消费 v8 权威能力；旧请求格式不变）
- [x] 部署 / 运维（PR/CI/香港 Core/Pages 已发布；用户于 2026-08-21 手工确认原生 PNG、JPEG→PNG、WebP→PNG 三条生产代表性 smoke 均通过）

### [2026-08-20] Ark 中国区完整相关目录与 Seed 2.1 / Seedream 5.0 路由 — by Codex
变更：Core 注册表升级为 `2026-08-20.v7`，依据火山方舟中国区当前模型列表、发布/下线公告、深度思考和图片生成文档，将 Ark 与 PaperBanana 文本、视觉、图像角色相关的现役目录从 3 项扩为 21 项。默认升级为 `doubao-seed-2-1-pro-260628`（main/vision）与 `doubao-seedream-5-0-pro-260628`（image）；不使用 ID 尾部日期猜测 `releasedAt`，所有 Ark 日期仍为 `null`。
契约（影响其他端 / 共享）：
- **目录与生命周期**：新增 Seed 2.1 Pro/Turbo、Seed Evolving、Seed 2.0 现役往期版、GLM 5.2、DeepSeek V4 现役版与 Seedream 5.0 Pro/5.0/4.5；Evolving 是滚动 alias，固定 `lifecycle:'unknown'`且不得设为默认。Code Preview 固定 `preview`；角色/翻译专用模型仅为目录完整性展示，`selectable:false`。已 EOM/EOS 的 Kimi 2.5、GLM 4.7、Seed 1.x、DeepSeek V3.2、Seedream/SeedEdit 3.0 不登记。
- **执行与能力**：Seed 2.x/Evolving/GLM 5.2/DeepSeek V4 的 Chat 请求显式 `thinking:{type:'disabled'}`，避免最小验证被默认深度思考误判超时。Seedream 5.0 Pro 仅允许 1K/2K 且不发其不支持的 `sequential_image_generation/stream`；5.0 映射 2K/4K，4.5 映射 2K/4K，4.0 映射 1K/2K/4K。`doubao-seedream-5-0-lite-260128` 仅作公开 alias，归一到 `doubao-seedream-5-0-260128`，不重复展示。
- **验证边界**：公开目录仍不等于用户已开通。`providerAccountCatalog` 继续固定 `accountCatalogAvailable:false`，仅用 inference API Key 对当前选中的最多 3 条路线做临时推理 smoke；绝不将 Bearer Key 发往需 AK/SK 签名的 `ListModelActivations`。未知 ID、错 role、未适配专用模型和不支持的分辨率仍在付费调用前失败关闭。
- **Web 展示**：OpenRouter、百炼、Ark 等所有 aggregator 均展示“暂不兼容”分区；只有禁用条目的模型厂商也会出现在二层厂商抽屉。搜索同时索引 role、能力和 protocol，不再只匹配名称。
各端待办：
- [x] paperbanana-api / Laf Core（v7 目录、默认、能力、alias、模型级请求契约与 TDD）
- [x] Web（最新 fallback、所有聚合渠道的禁用分区、禁用-only 厂商与能力搜索）
- [ ] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（若展示 Ark 目录，同步 v7 现役项和不可选边界；旧请求继续兼容）
- [ ] 部署 / 运维（本条尚未发布；发布后用授权 Ark Key 分别验证默认 main、vision 和付费 image，不把公开目录当作账号开通证据）

### [2026-08-20] OpenRouter 目录生命周期与验证状态如实化 — by Codex
变更：Core 注册表升级为 `2026-08-20.v6`，不再把 OpenRouter 全局匿名目录中的“存在且协议兼容”冒充为稳定版或真实调用已验证。动态目录项新增 `verificationState`，OpenRouter 全局项固定为 `catalog` 且保留兼容字段 `verified:false`；没有权威生命周期的项使用新增的 `lifecycle:'unknown'`，仅三项服务端静态正式推荐默认保留 `stable`。`releasedAt` 仍只接受厂商权威日期，未知保持 `null` 并排在已知日期之后。
契约（影响其他端 / 共享）：
- **模型条目**：新增向后兼容字段 `verificationState:'registry'|'catalog'|'account-visible'|'inference-verified'|'unverified'`；`lifecycle` 新增 `unknown`。旧客户端可继续忽略新字段，但不得把缺失/未知 lifecycle 默认显示为“稳定版”，也不得把 `verified` 或目录存在解释为付费调用成功。
- **OpenRouter 语义**：全局 `/models` 与 `/images/models` 只证明“目录兼容”，不证明用户账号可见、权益已开通或真实调用成功；逐模型付费 smoke 的结果必须以后续账号级/推理级状态单独记录，不得回写为全局目录事实。
- **Web 展示**：模型卡区分“目录兼容（未实测）”“账号可见（未实测）”“真实调用已验证”，未知 lifecycle 显示“状态未知”；推荐列表只接纳显式 `stable` 项。
各端待办：
- [x] paperbanana-api / Laf Core（v6 契约、OpenRouter 文本/视觉/图像动态项真值与回归测试）
- [x] Web / packages-api（Web 已消费并如实展示；packages-api 原样透传新增字段，无请求变更）
- [ ] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（后续展示模型目录时识别 `unknown` 与 `verificationState`；旧请求继续兼容）
- [ ] 部署 / 运维（本条未发布；付费逐模型验证不得使用全局目录状态代替）

### [2026-08-20] 精修分辨率真实能力与入队前失败关闭 — by Codex
变更：Core 注册表升级为 `2026-08-20.v5`，每个 image 条目新增必定数组 `capabilities.refineResolutions`，仅可包含 `1K|2K|4K`，并与生成能力 `resolutions` 分离。`refineImage.imageSize` 现在精确接受 `1K|2K|4K`；解析所选权威 image route 后，不支持的尺寸在账号检查、admission、Mongo insert 和计费/推理 provider 调用前以 `400` + `REFINE_RESOLUTION_UNSUPPORTED` 拒绝，不再静默夹到其他尺寸。OpenRouter 权威解析可先发生无鉴权目录查询；入队后若目录漂移，执行仍会再次要求精确尺寸并失败关闭。
契约（影响其他端 / 共享）：
- **注册表**：Gemini 按各 image adapter 实际尺寸；百炼 direct-edit 最高 2K（`wan2.7-image-pro` 的生成 4K 不等于精修 4K），analyze-redraw 沿用其生成尺寸；OpenAI Images direct edit 固定为 2K；Ark Seedream 为 1K/2K/4K；OpenRouter 仅映射官方目录 `resolution.values` 中已声明的规范值，未声明时为空数组。
- **请求语义**：缺省 `imageSize` 仍为历史兼容的 `2K`；显式 `modelRoutes` 与 legacy model 字段路由都保持。客户端必须以 `refineResolutions` 提供可选项，不得从 `resolutions` 或模型名推断。
各端待办：
- [x] paperbanana-api / Laf Core（registry v5、精修准入、direct/analyze/1K/4K/OpenRouter 回归）
- [x] Web / packages-api（消费 `refineResolutions`、仅展示所选 image route 可执行的精修尺寸；旧目录保守回退 2K）
- [ ] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（后续消费新字段，未改造前不得宣称 4K 精修可用）
- [ ] 部署 / 运维（本条未部署、未改环境变量）

### [2026-08-20] 显式路由目录校验、plot 可达能力与 Laf 手动回滚边界 — by Codex
变更：Core 将“显式 `modelRoutes` 的三路注册表合法性”与“本任务真实可达阶段”分开：显式三路均必须存在、role 正确且可选，但只有真实可达路线需要 key/调用成本。`prevalidatedManualReferences` 改为仅服务端手选查询后附加，客户端同名字段永不进入后台 DTO。2K/4K plot 仅当注册表解析为 `direct-edit` 时可达 image；显式 `maxCriticRounds=0` 不再被默认值覆盖。Laf 回滚 workflow 改为只读验证指引，暂停任何自动源码发布。
契约（影响其他端 / 共享）：
- **路由准入**：显式三路完整性与注册表合法性必须全部通过；key、Ark 账号 probe 和执行输出协议只对任务可达 role 生效。legacy 请求仍只校验实际可达路线。
- **createJob 语义**：`prevalidatedManualReferences` 是服务端内部字段，客户端不得传入或依赖；`maxCriticRounds=0` 精确表示无 critic。plot 的 2K/4K 只在 image route 为 `direct-edit` 时产生图像路线调用。
- **Laf 回滚**：`.github/workflows/deploy-laf-functions.yml` 仅验证仓库先决条件，不含任何 source push。获批回滚仅能在 Laf 控制台手动执行，且须先从控制台权威 custom dependency 元数据确认精确版本 `jpeg-js@0.4.4`；本条未部署、未改环境绑定。
各端待办：
- [x] paperbanana-api / Laf Core（服务端手选字段、双层路由校验、plot 能力与 zero-critic 回归）
- [x] CI / 回滚文档（verification-only，Laf README 标明 rollback-only）
- [x] Web（保留显式三路 role/selectable 预校验，并仅对实际可达 role 要求凭据与 Ark probe）
- [ ] 部署 / 运维（仅在获批回滚时按上述控制台流程处理；本条未发布）

### [2026-08-20] 多路由精确准入、Ark 探针截止时间与 Laf 回滚依赖门禁 — by Codex
变更：Core 在入队/持久化前按实际可达执行阶段校验 `main/image/vision`，精修任务保留归一后的 `configurationMode=simple|advanced`（旧请求默认 `simple`）；后台 DTO 改为字段白名单。Gateway 的 `providerAccountCatalog` 仅转发 `apiKeys.ark` 与探针契约字段。Ark 账号 probe 增加可中止端到端截止时间。Laf 原始源码回滚要求 custom dependency 精确版本 `jpeg-js@0.4.4`；其自动发布边界由上方新条目取代。注册表 v4 仅为有厂商官方精确证据的模型写入 ISO 发布日并按已知日期倒序、未知日期置后。
契约（影响其他端 / 共享）：
- **路由与任务 DTO**：`requiredCreateRouteRoles` / `requiredRefineRouteRoles` 的完整实际角色必须在 admission 前通过注册表校验；不会触达 vision 的旧 main-only 请求仍兼容。公开精修任务的 `configurationMode` 不再强制为 `advanced`，`routingMode` 仍完全由服务端路由推导。
- **密钥与探针**：后台 create/refine DTO 只含执行字段；账号目录网关丢弃 Ark 以外 provider key 和任意凭证别名。`PAPERBANANA_PROVIDER_ACCOUNT_PROBE_TIMEOUT_MS` 可选，默认 `12000`，限制 `100..30000` 毫秒，超时会 abort 并释放全局/owner/IP 槽位。
- **回滚发布**：此条当时的输入自证设计已被上方新条目取代；当前 workflow 仅做仓库验证，Laf 回滚仅能经控制台权威元数据核对后手动完成。
- **注册表日期**：`registryVersion=2026-08-20.v4`；`releasedAt` 只采信精确官方发布日期，已知日期倒序、`null` 置后，`officialSourceUrl` 继续保留。
各端待办：
- [x] paperbanana-api / Laf Core（精确准入、模式持久化、DTO 白名单、探针 deadline、注册表日期与测试）
- [x] auth-gateway（Ark key 透明转发收窄、全形态 `apiKeys/api_keys` 日志清洗）
- [x] CI / 回滚文档（已由上方新条目收紧为 verification-only；未部署）
- [x] Web（展示继续按 `releasedAt`，并接受精修历史默认 `simple`）
- [ ] 原生端（无需请求改造；展示时继续按 `releasedAt`，并接受精修历史默认 `simple`）
- [ ] 部署 / 运维（获批回滚时仅能在 Laf 控制台核对 custom dependency 后手动发布；本条未改环境绑定、未发布）

### [2026-08-19] Ark CN 数据面出站白名单与香港健康探针 — by Codex
变更：Core `providerEgress` 与新加坡 Squid 仅新增精确数据面主机 `ark.cn-beijing.volces.com`；`sg-required` 走固定新加坡代理，`disabled` 对该主机及其单个根点等价形式继续失败关闭。香港定时 smoke 增加无鉴权、只读、非计费的 `GET /api/v3/models`，预期 401；未登记任何 Ark 控制面、CDN、通配符或后缀域名。
契约（影响其他端 / 共享）：
- **出站策略**：仅香港 WireGuard 源可通过 Squid CONNECT 到上述精确主机的 443；私网/混合 DNS、PTR、字面量、非 443、额外点及 lookalike 继续拒绝。TLS 不解密、不缓存。
- **发布边界**：本条只提交 Core/SG/HK 运维契约和测试；生产部署仍须由人工工作流完成，客户端不得因本条自动将 Ark 标记为已上线。
各端待办：
- [x] provider egress（Core 精确 origin、SG ACL、HK smoke/monitor、负路径与密钥扫描测试）
- [ ] 部署 / 运维（未发布；须先完成 Laf `jpeg-js@0.4.4` 回滚依赖、Web 联调和真实账号最小 smoke）
- [x] Web（仅将当前任务可达 Ark 角色在显式推理 probe 成功后视为可提交；不把静态目录冒充账号已开通）
- [ ] 原生端（未验证条目不得显示为账号可用）

### [2026-08-19] Core Ark 适配器、账号推理验证与模型注册表 v3 — by Codex
变更：Core 新增火山方舟（Ark）静态注册表、CN 数据面适配器和不冒充账号全量目录的 `providerAccountCatalog` 推理 smoke；同时更新 Gemini/OpenRouter/百炼当前默认项，并为所有 provider/model 补充访问类型、账号目录要求和官方来源元数据。本条不包含 Web、生产出口策略、原生端或部署。
契约（影响其他端 / 共享）：
- **注册表 v3**：provider 新增 `accessKind: direct|aggregator`、`routeContractVersion:1`、`accountCatalogRequired`；model 新增 nullable `releasedAt` 与 `officialSourceUrl`，未知发布时间固定为 `null`，OpenRouter `created` 不作为厂商发布时间。默认值更新为 Gemini `gemini-3.7-flash`、OpenRouter `openai/gpt-5.6-sol` / `sourceful/riverflow-v2.5-pro` / `google/gemini-3.7-flash`、百炼 `qwen3.8-max` / `wan2.7-image-pro` / `qwen3.7-plus`。
- **Ark 注册表/执行**：仅登记官方 ID `doubao-seed-2-0-lite-260428`、`doubao-seed-2-0-mini-260428`、`doubao-seedream-4-0-250828`；条目均 `verified:false`、需 entitlement。文本/视觉固定走 `https://ark.cn-beijing.volces.com/api/v3/chat/completions`；Seedream 4.0 生成/同模型直编走 `/images/generations`，强制 `response_format=b64_json`，URL-only 结果失败关闭且不下载；返回的 JPEG 经有界解码后转为真实 PNG 再进入既有存储/视觉链。未知 ID、错 role 和隐式替换均禁止。
- **账号验证 action**：`providerAccountCatalog` 只接受内存中的 `apiKeys.ark` 与最多 3 个去重显式 probe，固定返回 `accountCatalogAvailable:false`、`catalogAuth:access-key-required`、`verificationMode:inference-smoke`；main/vision 做最小推理，image 必须 `confirmPaidImageProbe:true`。绝不把 inference key 发往需 AK/SK 签名的 `ListModelActivations`，不持久化/缓存/回显密钥或原始失败。
- **发布边界**：当前 Core 已能通过注入 transport 保留标准出口失败信号，但生产 egress 尚未登记 Ark origin；Node 构建会内联 `jpeg-js`，原始 Laf 回滚源码则必须先在 Laf custom dependency 中确认 `jpeg-js@0.4.4`（现有源码推送 workflow 不负责安装）。出口策略与 Laf 依赖门禁完成前客户端不得把 Ark 标成生产可用，亦不得把静态条目当作账号已开通目录。
各端待办：
- [x] paperbanana-api / Laf Core（注册表、适配器、账号推理验证、混合路由、TDD 与文档）
- [x] packages-api / auth-gateway（账号目录 action 的安全转发与共享类型已在前序并行任务完成）
- [x] Web（消费 v3 元数据、显式触发账号 probe 与付费图片确认；未验证条目不得显示为账号可用）
- [x] provider egress（登记 Ark CN origin，disabled 与负路径必须失败关闭；不得扩展到控制面/CDN）
- [ ] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（按需消费新注册表；旧请求继续兼容）
- [ ] 部署 / 运维（未发布；须先完成出口策略、确认 Laf `jpeg-js@0.4.4` 回滚依赖、Web 联调和真实账号最小 smoke）

### [2026-08-19] Core 多 Provider 模型路由契约 v1 — by Codex
变更：`createJob` / `refineImage` 新增完整 `modelRoutes {main,image,vision}`，Core 按阶段路由主模型、图像模型和视觉模型；旧请求仍从 `provider/mainModelName/imageModelName/referenceVisionModelName` 派生单路由。本条仅交付 Laf/Core 契约与执行，未接入 Ark 适配器或任何客户端。
契约（影响其他端 / 共享）：
- **请求**：`modelRoutes.main/image/vision` 每项为 `{accessProvider,modelId}` 且必须完整；`configurationMode=simple` 禁止混合 provider，`advanced` 允许。显式 routes 与旧 `provider/*ModelName` 冲突时返回 `400 + businessCode=MODEL_ROUTE_CONFLICT`；顶层 `provider` 永远是 main route 的兼容影子，不会返回 `mixed`。
- **任务 DTO**：新建任务持久化并公开 `modelRoutes`、`routingMode=single|mixed`、`modelRoutingVersion=1`、`modelRoutingSource=explicit|legacy-derived`，同时保留旧模型字段。历史记录仅在 `provider + mainModelName + imageModelName` 完整时按旧语义补出 routes，不猜测不完整记录。
- **执行 / BYOK**：planner、stylist、文本 critic、SVG、plot 模型调用走 main；参考图分析和成图视觉 critic 走 vision；PNG 生成、重渲染、升清和 direct edit 走 image；plot-worker 不持有 key。后台 DTO 无密钥，准入闭包仅持有实际可达阶段所需 provider key；`direct-edit` 仅 image，`analyze-redraw` 仅 vision+image。
- **注册表**：`modelRegistry` 顶层新增 `routeContractVersion:1` 和 `supportsModelRoutes:true`。Core 类型已预留 `ark`，但未提供 Ark registry/adapter/egress，因此 Ark route 当前 fail-closed，不得在客户端标记为可用。
各端待办：
- [x] paperbanana-api / Laf Core（解析、校验、持久化/公开 DTO、阶段路由、最小密钥闭包与回归测试）
- [x] packages-api / auth-gateway（转发/归一 `modelRoutes`，保留旧字段与模型目录路由元数据；网关按写入主体安全转发 provider account catalog）
- [x] Web（专业模式支持分角色选 provider/model；普通模式仍单 provider）
- [ ] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（后续按需接入；旧请求保持兼容）
- [ ] Ark adapter / registry / egress（后续独立任务，本次未实现）
- [ ] 部署 / 运维（本次未发布，须等后续合并与联调）

### [2026-08-19] 结果图公开权威 objectKey — by Codex
变更：生产百炼 smoke 发现结果图已写入 OSS，但公开任务 DTO 只有 `filename/url`，导致独立精修页无法按约定优先使用对象键；现在新任务持久化并返回 `resultImages[].objectKey`，历史 bucket 结果从既有 `filename` 只读补出该字段；已部署并完成百炼生成→`direct-edit` 精修验收。
契约（影响其他端 / 共享）：
- **公开任务 DTO**：`getJob/userJobs/adminJobs` 的 bucket 结果图新增稳定 `objectKey`；签名 `url` 仍只用于预览，客户端发起精修时优先传 `sourceImageObjectKey`。
- **兼容边界**：历史 `storage=bucket` 且只有 `filename` 的记录映射为同值 `objectKey`；数据库 data URL 回退不会伪造对象键。
各端待办：
- [x] paperbanana-api / Laf 回滚（新记录持久化、历史 DTO 兼容与测试）
- [x] packages-api / Web（已优先消费 `objectKey`，保留签名 URL 预览）
- [ ] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（后续精修入口改用 `sourceImageObjectKey`；旧签名 URL 仍兼容）
- [x] 部署 / 运维（Core 不可变镜像已发布；真实百炼 1K 生成与 2K `direct-edit` 精修成功，两个结果 DTO 均返回 `objectKey`）

### [2026-08-19] zh-CN.v2 固定语料补齐历史空白英文 — by Codex
变更：生产前置校验发现 306 条有图 bench 记录中 `ref_260`、`ref_305` 的历史英文 `summary` 为空；同步器现在只对缺失或纯空白的 `title/summary` 使用固定 PaperBananaBench 快照补齐，已有非空英文保持原值；已部署并完成 306/306 验收。
契约（影响其他端 / 共享）：
- **数据来源**：英文补齐值与中文元数据来自同一固定提交 `a876264bcd1e826a0320f805f8fb1cd705cf510f`，同步前后仍强制 306 个唯一业务 ID、306 条有图记录和 306 份完整英文搜索字段。
- **保留边界**：只补缺失、非字符串或纯空白英文；任何已有非空 `title/summary`、图片字段、`taskName`、任务和用户选择均不覆盖。
各端待办：
- [x] 语料迁移与 304→306、幂等及保留现有英文测试
- [x] paperbanana-api / Web / 其他客户端（公开字段和请求响应不变，无需改造）
- [x] 部署 / 运维（首次补齐 2 条、同步 306 条；随后幂等重跑为 0 变更且仍 localized=306）

### [2026-08-19] v2 参考元数据同步保留历史 taskName — by Codex
变更：zh-CN.v2 元数据同步与回滚不再覆盖 `paperbanana_references.taskName`，避免旧数据或自定义分类在回滚后被永久改写；已随 zh-CN.v2 生产迁移部署。
契约（影响其他端 / 共享）：
- **迁移边界**：v2 脚本只写本地化与语料版本字段；`taskName` 继续由原始 bench/import 记录所有，前向同步和元数据回滚都不改它。
- **306 条联合语料**：Web/Core 的 `scope=bench` 分页仍按业务 `id` + `source=paperbanana-bench` + `corpusVersion` 联合 306 条，不依赖迁移重写 `taskName`。
各端待办：
- [x] 语料迁移 / 回滚脚本与 306 条验收测试
- [x] paperbanana-api / Web（公开分页请求与响应字段不变，无额外改造）
- [x] 部署 / 运维（生产前向同步使用更正后脚本，未触发回滚）

### [2026-08-19] PaperBananaBench 306 条 zh-CN.v2 语料与服务端分页— by Codex
变更：参考库固定为当前 PaperBananaBench 306 条有图案例（66 diagram + 240 plot），4 条无图内部 fallback 与 bench 计数彻底分离；已部署香港 Core、Mongo 元数据与 Web。
契约（影响其他端 / 共享）：
- **语料字段**：`RetrievedReference`/`referenceLibrary` 在旧字段上新增 `shortIntroZh/detailZh/visualCategory/researchDomain/keywords/corpusVersion`；当前版本为 `zh-CN.v2`，英文 `title/summary` 继续用于检索。
- **分页请求**：`referenceLibrary` 支持 `scope/page/pageSize/query/visualCategory/researchDomain/taskName`，`pageSize` 默认 12；响应返回 `totalItems/totalPages/page/pageSize/facets/corpusVersion`。默认 `scope=bench` 且跨 taskName 暴露 306 条；仅发 `taskName/limit` 的旧端保持兼容。查询/分面在服务端分页前完成，只给当页图片签名。
- **手选参考**：`manualReferenceIds` 最多 10 个唯一 ID，服务端用 `$in` 直查且保留请求顺序，不再只扫前 200 条；缺失/无图返回 `422 + REFERENCE_SELECTION_INVALID`，超限返回 `400 + REFERENCE_SELECTION_LIMIT`，不再静默丢弃。
- **迁移/回滚**：香港同步脚本按业务 `id` 幂等更新且必须验收 306 条有图 v2 记录；`--rollback` 仅回滚元数据版本，不删图片、任务或选择记录。
各端待办：
- [x] paperbanana-api / Laf / packages-api（分页、分面、搜索、当页签名、手选严格错误）
- [x] 语料与迁移工具（306 条固定快照、质量门禁、幂等同步/元数据回滚）
- [x] Web（消费服务端分页/分面/详情字段，不再一次拉取 295 条本地过滤）
- [x] 部署 / 运维（生产返回 totalItems=306、pageSize=12、totalPages=26、corpusVersion=zh-CN.v2；当页图片与中文字段完整）
- [ ] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（按需接入新分页响应；旧 `taskName/limit` 请求仍可用）

### [2026-08-19] 模型注册表 v2 与模型级精修能力 — by Codex
变更：服务端 `modelRegistry` 成为模型可用性与精修语义的唯一权威，修正 Gemini/OpenAI/百炼直连目录与适配器，OpenRouter 继续以官方动态目录 fail-closed；已部署香港 Core 与 Web。
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
- [x] 生产部署 / 实测（百炼注册表默认值与 15 条目录已验收；`qwen3.7-plus` + `wan2.7-image-pro` 真实生成和直接精修成功）

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
- [x] web（检索非 none 时禁用本地参考图上传，显示切换提示且不自动更改检索选择）
- [ ] miniprogram/android/windows/macos（同步 UI：检索非 none 时禁用本地参考图上传，并提示先选择“不使用检索”）

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
