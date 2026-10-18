## 2026-10-18 · 杭州专用分支自动发布

- [x] 流程实现：`codex/hangzhou-production` 以已上线 4.0 为基线；代码推送后测试、构建 Linux amd64 镜像和国内前端，全部成功才自动发布杭州。
- [x] 运维边界：独立 GitHub environment / 受限 SSH Key，不接入模型密钥；只接受当前分支最新 SHA、固定镜像 digest 和网页包。保留现有数据库、OSS、两套网关身份及香港 / 新加坡线路，Benchmark 执行器保持 false。Plot 镜像更新仍保留 gVisor / 网络配置。
- [x] 实际验收：GitHub push 运行 39107373154 自动发布 `6f69297b`，宿主回执与公开版本一致；10 容器健康、Mongo/Redis 未重建，真实 PNG/SVG、双入口既有评测图片、三地路由配置与 6 次无模型请求核验通过。见[自动发布验收](docs/operations/2026-10-18-hangzhou-auto-deploy.md)。
- [x] Web / 小程序契约：国内前端随杭州发布，API 字段不变；小程序继续暂停，未修改或发布。

## 2026-10-18 · 素材、评测证据与备份迁移杭州

- [x] Core：历史任务的检索参考图按原对象键重新签名，保留原选图与元数据；签名失败不回用过期地址。结果图和阶段图沿用已有重新签名行为，不改用户历史记录。
- [x] 运维实现：新增杭州专用 SSH 发布入口，校验不可变镜像和构建 SHA、四服务当前版本、活动任务及上传、维护锁，失败恢复原配置；不覆盖现有密钥或渠道线路。备份改为杭州内网。
- [x] 生产验收：2,775 个有效对象全量 SHA-256 / 元数据一致，Core、两套 Gateway、禁用执行器的 Benchmark 和备份已切杭州内网。10 容器健康，历史任务图片、浏览器图片、真实签名上传及新备份读回通过；见[迁移验收](docs/operations/2026-10-18-hangzhou-storage.md)。
- [x] Web 契约：字段和对象键不变，新 URL 地域改为杭州；12 张浏览器评测图片成功加载。没有模型调用。
- [ ] 小程序：继续暂停，恢复前核实杭州 OSS 的 request / upload / download 合法域名；未修改、同步或发布。

## 2026-10-18 · 按三地实测启用香港 / 新加坡分渠道出口

- [x] Core：增加成对 HK 私网代理 / 精确主机配置；Fireworks 获准杭州直连，国内已有直连保持。其他已列海外目标仍 SG，未知 Azure 资源不扩授权。模型 ID、角色、参数、认证头和正文不变；不增加超时自动换线重发。
- [x] 本地：合入现网 f15510ce 排行榜证据读取修复后，59 项配置 / 出口 / OSS / 科研证据回归、111 项 SG 出口测试、类型检查和构建通过；香港请求保留参数、重定向跨来源移除认证、代理故障不回退重放。
- [x] 基础设施：新增杭州↔香港独立 WireGuard 与仅隧道监听的精确白名单 CONNECT 代理；修正 SG DNS 远端选路；200 次候选线路 GET 对照完成，无模型调用。
- [x] 生产：5f15e5e0bb2e2c67f23ebe09000a9a7ec76e70ad 已在杭州生效；维护前活动任务 0，仅更新 Core，保留现网排行榜修复和两套新网关。实际容器 42 个无密钥 GET 的选路全部匹配，零传输失败；香港 16 个精确主机启用，Fireworks 直连。见[发布记录](docs/operations/provider-routing-rollout-20261018/report.md)。
- [x] Web / 小程序：无客户端字段变化，小程序继续暂停。账户权益与模型质量仍待有免费保障的真实验证。

## 2026-10-18 · 公开评测证据读取的独立等待预算

- [x] Gateway：仅 benchmarkModelProfile / benchmarkCaseEvidence 使用 60 秒 Core 请求时限；普通公开列表、账号与写入维持原预算。无请求重放，无权限或字段变更。
- [x] Web 本地验收桥：上述两类只读接口使用 65 秒外层时限；账号仍为 15 秒，客户端不能传入时限覆盖值。
- [x] 验证：Gateway 路由和真实超时映射测试 57 项、本地账号桥测试 17 项通过。Core f15510ce 已部署，实际完整 9 题读取 13.25 秒；跨地域 OSS 长尾仍可能超过原 15 秒，因此并行优化需要配合独立读取预算。
- [x] 生产 Gateway：追加授权后以 f6a38986 / 固定镜像发布杭州两套网关；保留目录压缩，其余 8 容器不变，双入口健康检查与完整 9 题证据均 HTTP 200。见[发布与验收记录](docs/verification/2026-10-18-benchmark-evidence-read.md)。
- [x] 其他端：无客户端迁移；小程序继续暂停。

## 2026-10-18 · 科研排行榜模型详情证据读取超时（已部署）

- [x] Core：公开科学榜证据校验改为每请求最多 12 个对象并发；同请求相同对象键与预期哈希复用校验，跨请求重新验证。保留字节完整性、哈希、元数据及权限校验，输出顺序不变，失败停止排队中的新读取。
- [x] Web / 其他端契约：无 API 字段或权限变化，无需客户端迁移。小程序继续暂停。
- [x] 验证：53 项服务测试、Core 类型检查和构建通过；线上真实 Mongo / OSS 独立只读诊断返回完整 9 题，30 个唯一对象，10.16 秒；零模型调用、零生产数据写入。
- [x] 生产：Core f15510ce 已按用户授权发布杭州；首次版本标记不匹配触发自动回退，修正后健康检查与部署 smoke 通过。Gateway 补充独立读取预算后，两个公开入口和真实浏览器均返回完整 9 题。见[证据读取记录](docs/verification/2026-10-18-benchmark-evidence-read.md)。

## 2026-10-18 · 按实测区分国内渠道与海外出口

- [x] Core：新增可选 `PAPERBANANA_PROVIDER_DIRECT_HOSTS`，仅接受不重复的 `tokendance.space`、`ark.cn-beijing.volces.com`；缺省沿用原新加坡策略。直连例外仅适用于精确 HTTPS / 443 主机；OpenRouter 和其他海外域名继续走既有受控新加坡代理，代理故障不直出。
- [x] 模型契约：同一渠道内模型沿用同一 API 主机线路；不替换模型、厂商、角色、参数、密钥或请求正文；不增加超时换线重放。国内到海外重定向重新应用代理规则并清除跨来源认证头。
- [x] 免费网络核验：杭州、香港、新加坡及杭州经两地中转共 156 次无密钥 HTTP 探测，零传输失败；这不代表鉴权成功或模型质量。TokenDance / 方舟杭州直连明显更快；百炼保持直连。OpenRouter 香港候选更快，但具体模型地区和授权未验证，生产仍沿用新加坡。
- [x] 本地验证：配置 / 出口 / OSS 44 项测试、Core 类型检查与构建通过。
- [x] 生产：源码 `e3c2a9d8e0ee207ac1ad313142007eaf964433e3` 已应用杭州，TokenDance / 方舟显式直连；OpenRouter 仍走 SG。10 容器健康、维护标记清除、无推理运行核验与部署 smoke 通过；首次镜像变量错误自动回退后修正，完整证据及恢复边界见[线路实测记录](docs/operations/provider-route-audit-20261018/report.md)。
- [x] Web / 小程序：无客户端字段或操作变更；小程序继续暂停。未调用模型、未创建 Key、未购买资源。

## 2026-10-18 · 杭州业务迁移完成（实际生产变更）

- [x] 运维 / Core：图研两套网关、Core、Mongo、Plot、禁用执行器的 Benchmark 与 OpenAcad API / Redis / 两个 Worker 已迁杭州；10 个容器健康。香港对应业务停机，兼容入口 HTTPS 转发杭州，新加坡受控出口增加杭州来源。数据库冷文件哈希与集合计数一致，实际 PNG 渲染、导出和备份通过。
- [x] Core 配置：独立线上基线补丁 `95589896186bc077c6e142040464905ddfcac338` 新增 `PAPERBANANA_OSS_SERVER_ENDPOINT_MODE=internal|public`，默认 internal；杭州使用 public 访问原香港私有 OSS。补丁已同步开发工作区，不包含本工作区其他未发布改动。29 项配置 / OSS 测试通过。
- [x] Web / 小程序契约：API 字段和公开域名不变，无客户端迁移要求；小程序继续暂停。
- [x] 退役：按用户授权移除杭州 OpenVac 正式 / 预发布 / 测试、OpenTrad、Age of Mechs，保留 root-only 恢复归档；其他项目保持。
- [x] 后续发布：杭州业务、OSS、分渠道出口及独立发布分支的自动流程已完成后续验收，详见本文件顶部 2026-10-18 记录。旧香港部署和 SG 出口工作流继续停用，不能恢复冻结香港业务直接写入；无模型调用。
- 生产位置、镜像、恢复边界与证据见[杭州迁移记录](docs/operations/2026-10-18-hangzhou-migration.md)。香港冻结副本切换后已经可能落后，回退须先同步杭州最新数据。

## 2026-10-18 · 杭州迁移的业务 OSS 服务端出口配置

- 在线上 Core 基线 a68bb2684db01ee1e593260bd01eac86444b3831 上独立补充 `PAPERBANANA_OSS_SERVER_ENDPOINT_MODE=internal|public`，默认 internal。杭州显式使用 public；内网/公网域名白名单、HTTPS、签名、桶和权限保持原契约，Benchmark 的独立开关不变。
- [x] Core：配置解析与既有 OSS 适配器衔接，拒绝未知值及非法域名；不混入原 4.0 开发工作区未发布功能。
- [x] Web / 小程序：没有客户端字段或行为变化；小程序仍暂停。
- [x] 运维：迁移、校验与切换完成，结果见顶部杭州迁移记录；后续发布流程仍待新拓扑验收。

# 平台同步日志 (Platform Sync Log)

> 本文件为时间线。2026-09-27 之前的 Sealos / Sealaf / Laf 部署与回滚叙述均为历史状态，不得执行；以[当前架构](docs/operations/current-architecture.md)为准。

## 2026-10-17 · 4.0 发布运行参数对齐

- 发布预检发现历史生产环境仍设置单份 20 MiB，与 4.0 共享参考上传规则冲突；新 Core 拒绝启动后已自动回滚，未切换静态页面。
- Core 启动校验直接使用 `REFERENCE_UPLOAD_PLATFORM`，部署模板统一为 10 份、每份 10,000,000 字节、合计 100,000,000 字节；保留运行环境设置更低上限的能力。未扩大模型自身的参考输入限制。
- [x] Core / 部署模板：补充模板与共享规则、启动解析器一致性回归；旧 20 MiB 配置在启动解析阶段明确拒绝。
- [ ] 生产：在固定镜像发布前备份并迁移上述三项参数；候选数与评审轮数沿用本次 4.0 已实现的 6 / 5 上限。上线结果另记。
- [ ] 小程序：仍暂停，不修改或同步；本次不调用真实模型。

## 2026-10-17 · 4.0 发布快照准备

- 用户已明确授权当前整合版本上线，解除此前本轮代码“不提交、不推送、不部署”的限制；发布来源为独立 `codex/tuyan-v400-release-20261017` 快照，原开发工作区、索引和所有未提交改动保持。
- 范围：Web、Core、旧站与新站独立 Gateway，包含双域名 TokenDance 自动回跳、目录 v34、期刊 v10、材料与绘图工作流及最新期刊书架。公开模型目录读取不代表真实模型调用验收。
- [x] 本地快照：保留现有源码和必要运行资产；排除暂停的小程序变更、临时浏览器输出；历史响应证据中的过期签名 URL 仅在发布副本脱敏。
- [ ] 生产：以固定提交和不可变镜像发布；保留 Mongo、OSS、既有密钥、两套观猹客户端及旧归因。生产结果与回滚版本另记于发布记录。
- [ ] 小程序：仍暂停，未修改、同步、构建或发布；现有未提交改动留在原工作区。
- 不调用真实或付费模型；Benchmark Worker 保持关闭。

## 2026-10-17 · TokenDance 新域名真实授权回跳验收

- 用户明确允许创建密钥。从新站已登录账户发起真实 PKCE S256 流程，仅将本次授权请求的回调主机指定为 `tuyansci.cn`；原 `app_url=https://www.paperbanana.asia/`、state 与 challenge 保持。现网按钮仍生成旧回调，本次未改服务器配置或部署本地 4.0。
- [x] 浏览器 / 现网接口：创建“图研 Tuyan · 新域名 2026-10-17”后成功回跳新站并交换授权码；刷新后 `tokenDanceStatus` 为 `code=0`、`connected=true`，连接时间为北京时间 09:26:41，原归因地址不变。TokenDance 原有两把密钥仍在，新钥由既有后端加密保存，未读取或输出明文。
- [ ] 线上发布：自动按来源选择回调的 4.0 代码仍仅本地，后续部署需另行授权。此实机结果不代表飞书申请、项目方后台或分红审批已处理。
- 无模型调用、无充值付款、无提交/推送/部署；小程序未修改。验收材料位于工作区外 `2026/10/17/tokendance-callback/verification.md`，更新下方此前“未创建密钥/未交换授权码”的历史状态。

## 2026-10-17 · 4.0 双域名整合与跨会话回归（仅本地）

- 将独立 ICP 工作树的新站接入合入 `tuyan-v400-workflow-20261009` 的现有工作区：新域名 API 同源、观猹登录入口、验证邮件/重置密码地址、严格账号 URL 白名单和备案页脚；保留旧域名及其他会话的目录 v34、期刊 v10/封面、材料工作流、评审规则与 SVG 编辑变更。`deploy/icp-domains-20261015` 仅作为历史配置归档，其旧镜像与 Watcha 关闭状态不能用于发布 4.0；10 月 16 日新站观猹凭据以独立运维记录为准。
- **可选请求字段**：`tokenDanceAuthorize` 新增 `callbackOrigin`，仅接受精确 `https://tuyansci.cn`、`https://www.paperbanana.asia`、`https://paperbanana.asia`。新站回调根路径为 `https://tuyansci.cn/`，旧站仍回调 `https://www.paperbanana.asia/`；无字段时沿用服务端原配置，未知来源在写入/替换授权流程前拒绝。`app_url` / `X-App-URL` 继续保持原归因 `https://www.paperbanana.asia/`，PKCE、state、账号所有权及一次性交换不变。小程序仍为手工授权码模式，无回调跳转。
- 补齐目录会话生成副本遗漏：10 个新型号的图片输入限制进入 Web `referenceUploadPolicy.js` 和参考矩阵；Runware 停用型号在版本 CSV 中与现有目录状态一致。没有新增模型、替换调用 ID 或扩张权限。
- 补齐智能体安装包的离线知识快照，使其与现有 4.0 图型目录和知识版本 1.1.0 一致；未改变知识源或公开 API。修复文件保存期间可提交任务的竞态：浏览器原件保存/恢复完成前禁用提交，并在上传准备入口再次拦截，避免旧材料列表被提交。
- 离线测试夹具改为可回收的独立 CommonJS 实例，避免大型运行时的独立 data URL 模块被永久缓存；公开目录读取独立记账，不再被当作推理提交。旧测试同步既有的材料规划格式、参考许可索引、目录版本以及“每轮评审一次、必要时修改一次，末轮不追加复审”的契约。
- [x] Web / Gateway / Core：254 个 Node 测试文件共 2,642 项通过，另有 Plot Worker 鉴权 2 项通过；类型检查、Web/Core 构建及 5 类生成副本检查通过。浏览器验证两模式首次自动检索＋完整生成，手动改选切换/刷新保留；本地桩验证 1 轮只评审一次、必要时修改一次，画布不显示末轮未复审文案；SVG 编辑保存后刷新恢复。详细范围与记录见本次工作区外验收报告，不代表真实模型图像质量或生产验收。
- [ ] 小程序及其他客户端：小程序继续暂停；Web 之外可不传该可选字段，沿用旧行为。若以后支持新站浏览器回跳，须使用上述精确 origin，不接受任意返回 URL。
- [ ] 线上与平台：本轮不提交、不推送、不部署、不调用真实模型。TokenDance 授权页已接受新域名回调并显示新站返回地址，但未创建新密钥/交换授权码；飞书提交记录需登录，不能据此认定归因或分红审批完成。用户已于 10 月 16 日亲自提交，不重复提交表单。

## 2026-10-16 · 目录 v34：单型号续核与渠道停用同步（本地）

- 按精确渠道＋调用 ID 补证：完整输入输出模态增加 457 条、数值上下文增加 239 条、生图/编辑提示词上限增加 123 条。共享规格新增可选 `sourceScope`、`resolvedModel`，用于区分渠道规格和原厂参考值、显示官方明确的实际服务版本；原请求 ID、模型角色、调用适配和额度不因补证扩大。来源优先指向对应型号或明确列出该 ID 的 API 文档。
- Runware `deepseek:v4@flash` 按完整托管索引及原专页/schema 核查暂停；OpenAI 8 个精确型号补录未来停用日期，到期自动禁用。账户目录 `shutdown_date` 进入该账户展示，不写公开缓存。已有停用及未适配边界保持。
- 动态停用仅用于已确认范围的完整公开目录；fal 缺项先逐 ID 查询，Runware 限托管目录，Novita 限 LLM。分页未完、临时错误、账户/地区/私有目录缺项不判全渠道下架。刷新失败保留上次完整可用性；已暂停型号在服务端发送推理前拦截。新增目录内部可选字段 `availabilityScope`、`confirmedAbsentIds`，供完整性判定，不作为调用权限。
- [x] Core / shared：单型号证据、动态停用、生命周期及调用隔离定向测试、类型检查通过；生成器无漂移。未调用真实模型、未提交、推送或部署。
- [x] Web / 本地服务：来源、模态图标、提示词单位及实际服务版本展示；29 项定向回归、构建通过，桌面/手机共 20 项实页检查通过，停用型号不能选择。
- [ ] 小程序及其他客户端：小程序继续暂停。恢复后兼容可选字段，按精确渠道身份展示生命周期及规格，不从原厂参考值推断渠道额度，不自动替换旧选择。
- [ ] 账户与未决规格：仍有 171 条当前可选记录存在规格缺项；版本映射未取得证据的继续保留待确认。真实账户目录需各渠道合法凭据核验；本轮仅公开文档、元数据与本地桩测试。
- [续核结果及具体来源](docs/model-catalog/2026-10-16-model-page-followup.md) · [生命周期清单](docs/model-catalog/2026-10-16-lifecycle-followup.csv)。

## 2026-10-16 · 目录 v33：全渠道动态读取、单模型规格与提示词上限（本地）

- `modelRegistry` 新增 `catalogContractVersion=1`、32 渠道的 `catalogProviders` 访问方式及 `catalogHealth` / `catalogWarnings`；公开目录覆盖 OpenRouter 文本/图像、TokenDance、fal 全分页、Runware schema 索引、Novita LLM。账户目录统一使用 `providerAccountCatalog` 的 `mode=catalog`，只读元数据，拒绝混入 inference probes；填选中渠道的凭据后可读取 18 个 API Key 目录、百炼业务空间、Ark AK/SK 管理目录及 SenseCore JWT 目录。Runware 私有/社区、Novita 图像/私有有补充入口；Fireworks 可选账户 ID。
- 共享展示字段新增 `specificModelSpecifications` 及 `promptLimits[{kind,max,unit,field?,sourceUrls}]`、`contextWindowStatus`、`modalitiesComplete`。先核查精确型号与版本；生图模型未有数值上下文时可展示生图/编辑提示词上限，字符、字节与 token 不互换。所有字段仅用于展示，不扩大调用能力、请求额度或已验证状态。
- 新发现型号保留在目录，未适配条目禁用选择；故障渠道继续可见。完整目录更新中途失败/限流时保留上次完整目录；尊重 Retry-After，支持分页续读。账户结果仅存当前页面，密钥/账户/工作区变化清空；不写入公开缓存。
- [x] Core / shared：32 渠道描述、固定官方目的地、分页/管理签名/字段解析、单型号来源与完整目录保留；定向目录/脱敏测试及类型检查通过。海外出口 ACL 新增目录所需主机，仓库配置完成，**未部署**。
- [x] Gateway / API client：仅传选中渠道凭据，管理字段脱敏，元数据读取与调用探测隔离；对应定向测试通过。
- [x] Web / 本地服务：动态渠道、账户入口、完整目录翻页、图标/来源/提示词替代展示；桌面 1440px 与手机 390px 实页检查、定向测试、构建通过。
- [ ] 小程序及其他客户端：小程序继续暂停。恢复后按 v33 兼容未知字段，独立适配只读目录入口、分页状态和提示词单位，不把目录条目当作调用已通过。
- [ ] 真实账户目录：需要各渠道合法凭据后再核验实际权限与完整目录；本轮只验证公开读取、官方文档与离线契约，未调用付费模型，未提交、推送或部署。
- [核查清单](docs/model-catalog/2026-10-16-dynamic-directories.md) · [逐路由规格 CSV](docs/model-catalog/2026-10-16-dynamic-coverage.csv)。

## 2026-10-16 · 本地实时渠道目录与动态渠道故障展示

- 本地 `5196` 页面此前使用仅含静态模型的目录服务，遗漏 OpenRouter。现在本地服务复用当前 Core `modelRegistry`，读取 OpenRouter 文本/图像目录及 TokenDance 官方公开目录；不再用静态副本代替动态渠道。Core 仅新增命名导出，既有 API 字段、缓存、模型角色/格式校验与请求 ID 均保持。
- [x] Core / 本地服务：实时返回 v32、32 渠道，OpenRouter 426 条。仅允许三个官方目录 URL 的无凭据 GET；不开放生成、账户或存储操作。公开目录测试 2/2 与 Core 类型检查通过。
- [x] Web：`unavailableProviders` 中的渠道继续展示故障原因，恢复后可选，不改原选择；桌面/手机主模型、图像、视觉路由选择与目录故障状态通过，相关回归 41/41。OpenRouter logo 改用官网适合浅色背景的 Ink SVG。
- [ ] 小程序及其他端：小程序继续暂停；恢复后可复用现有 `unavailableProviders` 字段，避免将目录故障误显示为渠道不存在。
- 本次为本地实现与实时目录读取；无付费模型调用、提交、推送或部署。旧线上接口仍为 v27，未使用它覆盖本地 v32 目录。

## 2026-10-16 · 新域名观猹登录独立凭据（运行配置）

- 用户提供观猹为 `https://tuyansci.cn/api/auth/oauth2/callback/watcha` 新增的客户端，并授权配置。仅在新站独立 `tuyan-cn-gateway` 中启用该凭据；旧站 `api.paperbanana.asia` 继续使用原客户端、回调与共享凭据文件。
- 新站 Compose 在原 `gateway.env` 后追加权限为 0600 的专用 `tuyan-cn-watcha.env`，只覆盖已有 `WATCHA_CLIENT_ID` / `WATCHA_CLIENT_SECRET`；`WATCHA_OAUTH_ENABLED=true`。密钥未写入仓库、前端或表单。没有新增 API 字段或修改数据库契约。
- [x] Gateway / 运维：新站沿用原镜像，只重新创建新站网关；healthy、ready 和观猹可用状态通过。旧网关与 Core 的容器 ID、启动时间、镜像和旧凭据文件指纹保持不变。
- [x] Web：用户明确授权后已完成新客户端首次观猹授权，浏览器成功回跳 `tuyansci.cn` 并登录原图研账号；账户页显示“已绑定观猹”，原 TokenDance 连接保留。
- [ ] TokenDance：用户已明确告知于 10 月 16 日亲自提交表单，随后又按新域名重新填写；原“仅草稿、未提交”记录不再成立。平台开通结果须另行核实。现网 Core 仍回跳旧站；登记通过后另行实施新站回调，不用观猹登录凭据替代 TokenDance 配置。
- [ ] 小程序及其他端：本次无客户端改动，原入口保持；小程序继续暂停。
- [操作记录](docs/operations/2026-10-16-tuyan-watcha-client.md)。未发布 4.0 代码、更新镜像、提交或推送，未调用模型。

## 2026-10-16 · 4.0 生成评审轮数按上游执行（本地）

- 按用户新指令，`generationPath=model-v1` 的 PNG / SVG 快速生成、完整生成统一按 `maxCriticRounds=N` 最多评审 N 次，每轮必要时修改一次，通过即提前结束；移除原先额外的第 N+1 次最终复审。字段名、默认值及 1–5 范围不变，普通/专业模式采用相同执行语义。
- 结果 `review.limit=N`、`roundsUsed<=N`。最后一轮若修改成功，交付新版标为 `modified_unreviewed`；`reviewedVersion` 和对应哈希仍指向实际评审过的上一版，`deliveredVersion` 和哈希指向新版，不继承通过结论。修改失败保留上一张成功图片及其评审记录。历史结果不重写；独立图片精修的改后评审不变。
- 共享 `workflowCallEstimate` 移除额外最终复审预算；Gateway/Web 生成副本已同步。Web 名称保留“评审轮数”，帮助、指南及英文说明同步解释一次评审和一次必要修改的关系。
- [x] shared / Core / Gateway：26 项离线主测试通过，包含 78 组流程场景及完整生成/材料矩阵；覆盖 PNG/SVG、快速/完整、1/2/5 轮、提前通过、末轮修改、失败保留和实际调用预算。类型检查通过，生成副本检查无漂移。
- [x] Web：17 项定向回归通过，覆盖流程帮助、历史结果、设置提交恢复与停用视觉草稿。
- [ ] 小程序：继续暂停，不修改或同步；恢复后核对轮数说明、预算估算和新版未复审状态。
- [ ] Android / Windows / macOS 等客户端：采用此语义时，轮数与评审上限一致；最后一轮修改后展示未复审状态，不把任务完成视为质量通过。
- 本轮使用本地桩响应，不调用真实/付费模型，不提交、推送或部署；保留其他会话已有改动。

## 2026-10-16 · 模型目录 v32 与新增渠道契约（本地）

- 静态目录 1,079 → 1,099，10 个渠道新增 20 个身份：Gemini 4 Argon、FLUX.3 Klein / Base、Qwen Image 2.1、Krea 3，以及 Muse / Nemotron / DeepSeek / GLM / MiMo / Step 的新渠道身份。原默认选择保留，新增项仅为 catalog，未标真实调用通过。
- 共享契约补各型号精确端点、独立尺寸/参考图限制、PNG、思考审计与来源。Gemini 4 省略采样参数且不混用旧 thinkingBudget；Krea 3 固定 berry/low、每边 ≤3200、仅 1K/2K；BFL Klein 不发送 grounding/version；Qwen 2.1 沿用同步单图请求。
- TokenHub 托管 `deepseek-v4-flash-0731` 记录 10 月 31 日北京时间零点到期，不迁移 ID 或影响原厂直供身份。TokenDance 两项新缺失具名记录但仍运行时拦截；OpenRouter 新图像格式未确认，继续暂缓。
- [x] shared / Core：317 项本地回归、类型检查及构建通过；目录/思考生成器无漂移。新条目并不代表付费实测或生产质量通过。
- [x] Web：目录、规格、思考及隔离回归 38 项、构建通过；原默认值保留。
- [ ] 小程序：继续暂停；不修改、同步、构建或测试。以后恢复时需显式同步 v32 并验收，不推断本轮已完成。
- [ ] Android / Windows / macOS 等客户端：采用 v32 时遵守精确渠道身份、思考/尺寸限制、未验证状态及生命周期，不按名称继承能力。
- [新增清单、官方来源和限制](docs/model-catalog/2026-10-16-update.md)；[验证清单](docs/model-catalog/2026-10-16-validation.json)。保留已有脏改动；没有真实/付费调用、上游同步、提交、推送或部署。

## 2026-10-14 · HSSC 位图范围、Cell 说明图精修与国内期刊补证 v10（开发环境）

- 默认 `journalRuleVersion=2026-10-14.v10`，v1–v9 数据文件保留；仍为 17 刊。本轮补心理学报、心理科学进展当前自检附件与各刊数据政策，人口研究图线辨识、图书情报工作表格例外及数据来源要求；无新 HTTP 必填字段。
- 可选宽度约束新增 `value.rasterOneOf:number[]`，`journalWidthStatus` 的可选 `content` 增加 `'raster'`。Core 仅在实际解码 PNG / 核对导出 TIFF 后使用；HSSC 位图按专节 88/180 mm、简单矢量按一般段 87/180 mm 建议检查，未知/混合单栏仍提示；不改像素、不凭扩展名或元数据认证质量。
- Cell 说明图精修改为有来源的 conditional + 人工判断，将忠实改绘按说明图辅助创作类别解释，明确不等于官方逐项批准任意精修；数据图模型重绘及特殊用途边界保持。HSSC 先核本刊专项条件是适用解释，集团撤销本刊条款的官方声明仍未找到，未假称优先级冲突已被官方解决。
- [x] shared / Core / Gateway：28 组集成及 56 项规则/文件检查通过，560 次本地桩响应、真实调用 0；类型检查通过。旧快照、生成精修上下文、身份绑定、历史和实际导出均覆盖；本地 fixture 注册表 v10。
- [x] Web：54 项选择、取消、保存、请求、原图设置复用、换图隔离及历史回归通过；构建通过，Chrome 已核验规则展示和取消。并行 SVG 临时热更新错误另行记录，未回退其他会话改动。
- [ ] 小程序：继续暂停，不改动、同步、构建或验收。
- [ ] 其他客户端：兼容可选 `rasterOneOf` 与实际内容类型，保留旧任务版本；区分范围解释、人工条件、未规定与官方禁令。
- [核验依据及未决边界](docs/journal-rules-20261014/rules-v10-verification.md)；[本地验证](docs/journal-rules-20261014/rules-v10-validation.md)。不调用付费/真实模型，不同步上游、提交、推送或部署。

## 2026-10-14 · HSSC 宽度适用范围与国内人文社科增刊 v9（开发环境）

- 默认 `journalRuleVersion=2026-10-14.v9`，v1–v8 数据文件原字节保留。新增 `population-research`（人口研究）、`acta-psychologica-sinica`（心理学报）、`advances-psychological-science`（心理科学进展）、`library-information-service`（图书情报工作），共 17 刊，均按已核实能力标部分支持；没有新 HTTP 必填字段。
- 新增可选宽度数据 `value.vectorOneOf:number[]`；`journalWidthStatus(value,widthMm,content?:'unknown'|'simple-vector')` 仅在实际文件范围可判明时使用。Core SVG 事实可含 `simpleVector:boolean`，仅用于排除 HSSC 位图专节；不等于可编辑/字体/内容质量认证。预检不会凭 SVG 扩展名启用，未知内容继续沿用 `oneOf/pendingOneOf`。
- HSSC 一般制作建议 87/180 mm 与位图专节 88/180 mm 已按范围拆开，位图单栏重叠仍待确认。AI 续查取得本刊投稿指南直接引用自身有限例外的证据，未伪造其被集团条款替代。Cell 增加官方培训、速查表和 2026-08-18 说明文章，精修许可仍未被逐项确认；没有把披露或类别表改成任意重绘许可。
- [x] shared / Core / Gateway：26 组全链路通过，520 次本地桩响应、真实调用 0；历史测试修正后规则/实际文件 50/50，类型检查通过。缺少单位/适用条件不补成数值阈值；本地 fixture 注册表已载入 v9。
- [x] Web：54 项定向回归、构建通过；桌面/390 px 搜索查看、原图型复用、取消保留原选择已核验。复用既有请求、快照、历史与导出报告，不另造重复配置。
- [ ] 小程序：继续暂停，不改动、同步、构建或验收。
- [ ] 其他客户端：兼容新增期刊 ID、可选宽度范围和事实字段，保留原任务版本；不从扩展名断言矢量，不将未知 AI 操作当作许可或官方禁止。
- [官方依据及剩余问题](docs/journal-rules-20261014/rules-v9-verification.md)；[回归与保留核查](docs/journal-rules-20261014/rules-v9-validation.md)。未同步上游、提交、推送、部署或调用真实/付费模型。

## 2026-10-14 · Cell Reports 现行规则与按操作判断 AI 政策 v8（开发环境）

- 默认 `journalRuleVersion=2026-10-14.v8`，v1–v7 目录原字节保持；Cell Reports 为部分支持。已通过 Chrome 读取本刊现行政策、最终提交页、图件指南及其直接链接 PDF。正文终稿 TIFF/PDF；GA 1200×1200 px、300 dpi，现行 Arial 8–12 pt，旧 12–16 pt 不作为当前依据。PDF 导出能力未新增。
- 本刊与出版社的继承关系已有直接来源；说明图生成有条件、说明图生成式精修未单独规定、数据图须由原数据可复现产生、数据图模型重绘受限、通用 AI 制作 GA 和封面受本刊限制。研究方法/专用工具/编辑特批的例外不能由现有通用模型冒充。
- 共享函数新增可选操作参数：`journalPolicyIssues(snapshot, operation?)`、`journalPreflight(snapshot, format?, operation?)`、`admitJournal(selection, format?, path?, figureTypeId?, operation='generate')`。完整证据仍保留，两类操作只按当前动作决定阻断；Core/Web 精修显式传 `generative-refine`，不能让精修限制误伤生成。无新 HTTP 必填字段，不接受客户端自定义操作绕过路由判断。
- HSSC 补集团编辑指导的实施期来源，仍未确认本刊旧 AI 条款的撤销/优先关系；87/88 mm 单栏疑点、180 mm 共同值及各阶段 PDF 规则保持，不伪造冲突已消除。
- [x] shared / Core / Gateway：64 项通过，含 20 组生成、精修、上传身份绑定、历史恢复与实际文件导出链路；400 次本地桩响应，真实调用 0。类型检查通过；旧快照和实际 PNG/SVG/TIFF 检查回归。
- [x] Web：53 项定向回归、构建通过；Chrome 桌面及 390 px 操作核验。重复 AI 提示合并；修复窄屏期刊列表行高挤压导致名称/状态溢出，取消保留原选择。
- [ ] 小程序：继续暂停，不改动、同步、构建或验收。
- [ ] 其他客户端：采用 v8 时按实际操作传递可选参数，保留原任务规则版本；不能将当前部分支持、格式通过或披露解释为投稿许可。
- [官方核验和剩余缺口](docs/journal-rules-20261014/rules-v8-verification.md)；[本地验证与保留核查](docs/journal-rules-20261014/rules-v8-validation.md)。无真实/付费模型调用、同步上游、提交、推送或部署。

## 2026-10-14 · HSSC 阶段与局部宽度判定、Cell 附件续查 v7（开发环境）

- 默认 `journalRuleVersion=2026-10-14.v7`；v1–v6 文件原字节保留。没有新必填请求字段。HSSC 根据本刊指南明确引用的投稿清单排除初投/修改 PDF；最终制作的矢量 PDF 条目不扩大实际导出能力，也不覆盖原则录用后修改清单。
- 宽度规则新增可选 `value.pendingOneOf:number[]`。共享 `journalWidthStatus` 供预检/实际文件检查使用：HSSC 180 mm 双栏可判定，87/88 mm 仅单栏待确认，其他值不满足已列建议；不能把一部分疑点扩大到整条要求。
- HSSC 加入本刊的集团政策声明、2026-09-10 公告及现行视觉/FAQ 证据；适用关系已补证，较宽条件取代本刊有限例外仍未证实。Cell 转查旧官方 PDF 主机、带版本号 GA PDF、作者模板；正文未取得，保持待核实。v7 去重旧版重复来源，不改历史。
- [x] shared / Core / Gateway：56 项回归通过，含 18 组完整链路、360 次本地桩响应、真实调用 0；类型检查通过。旧任务原版本精修/历史/导出均回归。
- [x] Web：52 项选择、取消、保存、请求、换图隔离、历史与交互回归；构建通过。浏览器确认 v7、87 mm 局部提示、180 mm 取消该提示及取消保留原选择。本地模拟服务注册表同步 v7。
- [ ] 小程序：继续暂停，不改动、同步、构建或验收。
- [ ] 其他客户端：兼容 `pendingOneOf` 并保留建议强度、逐值待确认与历史版本；未知条件不得当作许可或自行生成禁令。
- [证据和未决范围](docs/journal-rules-20261014/rules-v7-verification.md)；[验证与保留核查](docs/journal-rules-20261014/rules-v7-validation.md)。未调用真实/付费模型，未同步上游、提交、推送或部署。

## 2026-10-14 · Sage Open / HSSC 规则接入与 Cell 续查 v6（开发环境）

- 默认 `journalRuleVersion=2026-10-14.v6`，目录增至 13 刊；Sage Open 与 Humanities and Social Sciences Communications（`hssc`）已进入生成、精修、历史和实际文件检查，均为部分支持。v1–v5 文件原字节保留；旧来源/规则未因版本更新而重写核验日期。没有新增必填请求字段。
- Sage 的本刊直接链接通用图件和 AI 政策；300/800 dpi 按图像构成检查，代表性生成有条件，生成式精修仍未逐项规定。HSSC 用本刊有限例外，保留集团政策范围、87/88 mm 和审稿 PDF 接收差异；不将人工判断或非阻断状态当作许可证明。
- Cell 新增官方中文导航、作者支持及投稿系统入口证据；现行指南仍未取得，历史 GA 与专项 AI 覆盖关系未确证，不生成虚假的技术通过阈值。
- [x] shared / Core / Gateway：49 项回归，含 15 组完整合成链路（300 次本地桩响应、真实调用 0）；末次来源补充后数据/文件相关 14 项再验通过，集合重叠不相加；类型检查通过。
- [x] Web：51 项设置、请求、原图绑定、历史与交互回归通过；线稿选择依据当前有效规则显示；桌面/390px 与构建通过。本地注册表 v6。
- [ ] 小程序：继续暂停，不改动、同步、构建或验收。
- [ ] 其他客户端：兼容新增期刊 ID 与规则版本；沿用既有可选快照契约和 `pendingFormats`；按阶段/用途检查，不外推正文阈值或将 PDF、矢量例外自动认证。
- [官方核验与未决项](docs/journal-rules-20261014/rules-v6-verification.md)；[本地回归及保留核查](docs/journal-rules-20261014/rules-v6-validation.md)。未调用付费/真实模型，未提交、推送、同步上游或部署。

## 2026-10-13 · 中文人文社科期刊与 Cell 续查 v5（开发环境）

- 默认 `journalRuleVersion=2026-10-13.v5`，v1–v4 目录原字节保留；新增经济学家、财经论丛、山西财经大学学报、中国社会科学（中文刊），共 11 刊，均不因列入菜单视为完整适配。未知 AI 操作非阻断、非许可；Cell 现行本刊清单及专项政策覆盖仍未证实，保留历史参考和新渠道范围证据。
- 期刊快照新增可选 `subjects:string[]`，用于 Web 学科搜索；来源可保留月精度 `updatedOn=2026-06`。新增色彩规则 `value.achromatic=true` 表示实际可见内容黑白，不等于文件头灰度或 1-bit。当前 Core 的 PNG 检查实际像素；TIFF 解码受限时报告 `uncheckable` 并正常导出，不降低解码限制或从源图推定结果。
- [x] shared / Core / Gateway：v5 数据与旧版本、规划生成精修上下文、历史和实际文件检查；42 项通过，含 12 组本地合成链路；类型检查通过。
- [x] Web：学科搜索、关键规范与来源、选择取消及历史；47 项通过，展示调整后相关 21 项再验通过；桌面/390px 与构建通过。两组测试有重叠，不合计。
- [ ] 小程序：继续暂停，不改动、同步、构建或验收。
- [ ] 其他客户端：兼容可选学科/色彩规则字段和 v5；保留未知政策、不可检查字体及 TIFF 黑白检查的能力边界；不得把 Word 稿件要求当作独立图片格式要求。
- [官方依据与候选清单](docs/journal-rules-20261013/rules-v5-verification.md)；[回归及保留核查](docs/journal-rules-20261013/rules-v5-validation.md)。未调用真实/付费模型，未提交、推送或部署。

## 2026-10-13 · Scientific Reports 政策适用关系与 Cell 官方资料 v4（开发环境）

- 默认 `journalRuleVersion` 为 `2026-10-13.v4`，v1/v2/v3 原目录与旧任务含义保留。来源新增可选 `publishedOn/updatedOn`，必须区别于核验日期 `verifiedOn`；未标明的页面修订日期不推测。
- Scientific Reports FAQ 将例外指向正式期刊政策，正文/补充图的生成和生成式精修改为有来源依据的 `conditional`，保留两份出处及解释依据；这不是官方替代声明，也不是任务合规证明。报告列人工条件为 uncheckable，图形摘要限制不变，TOC/封面不自动获得许可。
- Cell Reports 补入 2018 年 GA 规格和 2019 年图像筛查官方指导及 2026 年相邻刊物社论来源。历史 GA 仅限 production/graphical_abstract，仍为 pending 参考，不用作现行通过阈值或正文图规则。
- [x] shared / Core / Gateway：v4 快照、生成/精修上下文、历史及实际 PNG/SVG/TIFF 检查；33 项回归含 7 组模拟链路通过。
- [x] Web：日期分开展示，条件/历史范围及原设置恢复；46 项回归通过。
- [ ] 小程序：继续暂停，不改动、同步、构建或验收。
- [ ] 其他客户端：显示可选日期与 conditional 人工条件，不把非阻断、格式通过或历史资料当成已获许可。
- [复核依据与剩余缺口](docs/journal-rules-20261013/rules-v4-verification.md)；[验证边界](docs/journal-rules-20261013/rules-v4-validation.md)。无真实/付费模型调用、提交、推送或部署。

## 2026-10-13 · 期刊 AI 操作政策续查 v3（开发环境）

- 默认 `journalRuleVersion` 为 `2026-10-13.v3`，v1/v2 目录逐字节保留。可选规则字段 `aiPolicy:{operation,status}` 区分生成、生成式精修、非生成式调整；状态为 conditional / prohibited / unspecified / conflict / unverified。快照与模型上下文保存此证据，不从披露条款生成许可。
- IEEE Access 已核读 PSPB 正式手册，图像操作边界标未逐项规定；Scientific Reports 保留正式细则与 AI Hub FAQ 冲突；Cell Reports 已换官方渠道，仍缺本刊正文与适用关系。v3 的未知/冲突只提示，不冒充官方禁令；明确用途限制和原始科研图像能力限制不变。旧任务继续保留原版本含义。
- `journalCheck.policy` 可选增加 `operation/policyStatus/sourceIds`。PNG/SVG/TIFF 转换不消除待确认或冲突状态；结果不能因此宣称投稿合规。
- [x] shared / Core / Gateway：规则、上下文、准入、历史及实际文件报告；28 项含 6 组模拟链路通过。
- [x] Web：选择器显示冲突继承关系；45 项回归及构建通过。
- [ ] 小程序：继续暂停，不改动、同步、构建或验收。
- [ ] 其他客户端：接入可选政策证据字段与 v3 语义；不得把非阻断当已获官方许可。
- 本轮无真实/付费模型调用、提交、推送或部署；[续查结论与未决项](docs/journal-rules-20261013/rules-v3-verification.md)、[本地验证](docs/journal-rules-20261013/rules-v3-validation.md)。

## 2026-10-13 · 期刊规则 v2 官方复核（开发环境）

- 默认 `journalRuleVersion` 更新为 `2026-10-13.v2`；任务仍记录完整选择与快照。v1 原目录逐字节保留，仅追溯已有开发任务；没有线上迁移。旧版任务的生成、精修、历史和导出继续使用原版本。
- 规则新增可选适用条件 `formats/rasterKinds/contentTypes`、`openFormatList` 与来源 `note`；条件允许 AI 与待确认/禁止分别表达。正文、补充图、TOC/GA、封面不共用未经核实的规则；ACS EPS / IEEE PNG 接收争议保留，Scientific Reports 明确不支持 GA，Cell Reports 继续待核实。
- 实际文件检查增加按格式的 DPI、GA 像素尺寸、KB 上限和按图像构成的色彩规则；不放大像素、不把格式转换当 AI 许可。技术支持状态与生成/精修准入分开。
- [x] shared / Core：v2 数据、来源/适用域、准入、版本追溯、实际文件检查；本地模拟两版任务全链路回归。
- [x] Web：默认新选 v2，显示来源访问备注；已有设置、图型复用、精修来源与取消操作保持；本地回归及构建通过。
- [ ] 小程序：继续暂停，不改动/同步/构建；恢复后按以上可选规则字段与版本边界适配。
- [ ] 其他客户端：采用 v2 时保留来源、适用域与待确认状态；字体、科学真实性及完整投稿材料仍需人工判断。
- 本轮没有付费模型调用、提交、推送或部署。证据与未确认项：[官方复核](docs/journal-rules-20261013/rules-v2-verification.md)；[本地验证](docs/journal-rules-20261013/rules-v2-validation.md)。

## 2026-10-13 · SVG 结果画布与浏览器手工稿（本地，未发布）

- Web 的 SVG 生成结果直接使用原生 SVG 编辑画布；沿用现有 `svg_source` 阶段及最终结果，展示真实完整版本，未新增逐 token 传输协议。生成/评审/修订期间只读，任务结束后自动编辑；原始评审仅属于原件。
- Core 仅补充 SVG 文档生成提示：独立 Unicode 文字、语义分组、稳定唯一元素 ID、marker 箭头；不改变期刊规则、模型路由、任务字段或数值数据，不保证模型一定遵从。手工稿仅在浏览器保存，按 API/账号/任务/候选图隔离，未增加账号草稿接口。
- [x] Web：原生文档编辑、历史、候选稿隔离、恢复与同源 SVG 导出接入；验证范围见 `docs/svg-workbench/validation.md`。
- [x] Core：提示词局部补充，其他客户端仍兼容原接口；未改变生成任务的费用或评审调用机制。
- [ ] 小程序：继续暂停，不改动、同步、构建或验收。
- [ ] 其他客户端 / 真实模型质量 / 生产：未验收；无付费模型调用、提交、推送或部署。

## 2026-10-13 · 精修原图与原任务设置绑定（本地，未发布）

- 精修请求和任务记录新增可选 `sourceContentType`（schematic/data/primary/illustration）与 `sourceTaskId`。`sourceTaskId` 仅用于重新上传历史任务的浏览器原图，必须同时提供 `sourceImageUpload.materialId`；Core 核对任务归属、账号生命周期及原记录 `taskSourceMaterial.sha256` 与当前材料哈希后才继承上下文。普通新上传不因夹带旧结果 objectKey 而继承原任务。
- 已有任务结果沿用其图型、期刊与规则版本；期刊选择省略时继承、显式 null 保持通用流程。保存解析后的原图性质并沿精修、历史及实际文件检查传递；明确声明 primary 即使未选期刊也不能进入生成式精修。字段可选，旧客户端仍沿原协议运行，不将缺失记录补成已核实性质。
- [x] Web：原图身份、任务上下文和期刊设置绑定保存，与生成区设置独立；已有记录免重复确认，新上传或旧记录缺失才确认。有效换图立即清除旧判断，过期读取/弹窗回调失效；浏览器草稿按原件哈希恢复，取消选择不修改设置。
- [x] Core / shared / Gateway：字段传递、所有权/哈希负例、显式 null、历史记录和实际 TIFF 哈希通过本地模拟验证。新增字段未改变官方规则版本、模型选择或研究数据。
- [ ] 小程序：继续暂停，不改动、同步、构建或验收；恢复时遵循上述可选字段与来源绑定条件。
- [ ] 其他客户端 / 真实模型质量 / 生产：未验收；没有付费调用、同步上游、提交、推送或部署。本地与模拟检查不代表这些环节通过。

## 2026-10-13 · 期刊设置复用信息图类别（本地，未发布）

- `journalSelection` 新增可选 `contentSource:'figure-type'` 与 `figureTypeId`，同时保留解析后的 `contentType`。Web 新选期刊默认沿用现有信息图类别；数据图及组合图保留数值人工核对提示，示意/领域图按示意图处理。这是任务分类，不证明素材不是原始科研证据。
- Core 生成入口按请求的实际 `figureTypeId` 重算已绑定的选择，再冻结任务快照；精修继承与历史/导出保留当时的判断。不带新字段的旧任务及人工选择保持原含义，未知规则版本仍拒绝自动升级。原始科研图像的显式声明优先，不会因换图型或期刊解除限制。
- [x] Web：固定弹窗高度、列表与正文独立滚动、固定底部操作区；弹窗移出设置容器避免样式污染。常规生成取消重复的内容类型表单，特殊声明折叠展示；精修原图独立确认，不从生成页图型推断。桌面与 390px 实测、取消/键盘/设置保存/历史恢复等 38 项回归通过。
- [x] Core / shared / Gateway：可选字段透传、规范化、任务/规划/精修/历史/真实文件检查，13 项本地及模拟链路回归通过。没有修改官方规则或来源版本。
- [ ] 小程序：继续暂停，不同步、改动、构建或验收。
- [ ] Android / Windows / macOS：可继续提交旧选择；采用自动关联时需使用上述可选字段并保留显式原始图像声明。
- [ ] 真实模型质量 / 生产：未验收；无付费调用、上游同步、提交、推送或部署。

## 2026-10-13 · 七项既有回归失败分类与精修前置校验修复（本地，未发布）

- 两项真实失败同源于精修先读取原任务/账号/材料、后验证比例与尺寸。现在先验证请求和模型能力，再读取归属上下文、重建期刊快照、绑定账号生命周期；账号注销检查通过后才绑定材料。原图归属、期刊 AI 限制、SVG 源码恢复要求及任务入队门槛保留，无新增字段或版本。
- 五项过时测试更新：未使用的 SVG 图像/视觉角色保留选择但不计入混合路由或凭据；SVG 文案/能力桩使用当前流程；Web 材料上传与 auto/random/manual 检索独立。没有为旧断言改变产品行为。
- [x] Core：191 项回归；期刊/原材料完整与精修链路、实际 PNG/SVG/TIFF、历史、权限及文件哈希通过模拟验证；补充合法请求仍受账号注销屏障约束的反例。
- [x] Web / Gateway：36 / 51 项回归；历史恢复核对期刊版本、阶段、宽度及浏览器保存，原文件上传保持检索选择。
- [ ] 小程序：继续暂停，不改动/同步/构建/验收。
- [ ] 真实模型质量 / 生产：未验收；无付费调用、上游同步、提交、推送或部署。分类与证据见 [七项失败修复记录](docs/journal-rules-20261013/seven-failures.md)。

## 2026-10-13 · 期刊规则选择、版本快照及实际文件检查（本地，未发布）

- 新可选共享请求字段 `journalSelection`（journalId/version/stage/purpose/contentType/widthMm/rasterKind）；省略或 null 的普通生成保持通用流程。精修省略时继承源任务，显式 null 为用户改选通用流程。Core 从受维护目录重建 `journalProfile`，拒绝未知版本和不支持的 AI 用途，不信任客户端规则内容。
- `modelRegistry.journalRuleVersion = 2026-10-13.v1`、`journalExportVersion = 1`；Web 在所需版本未支持时阻断期刊任务，不静默降级。新任务/执行载荷/历史保留选择、规则来源快照；结果新增可选 `journalCheck`。
- 规则贯穿规划、风格、生图、精修及评审。新 `journalFigureExport` action 只读取调用者自己任务候选，参数 `jobId/candidateId/format(original|tiff)/flattenWhite/download`；返回实际文件报告及可选文件字节。Gateway 与 Core 均校验归属。PNG→TIFF 不放大像素；原始 PNG/SVG 均保留。
- [x] shared / Core / Gateway：维护规则、准入、快照、上下文、实际文件检查与归属鉴权。
- [x] Web：完整设置中期刊入口位于信息图类别上方；两栏选择、草稿取消/确认、浏览器保存、历史恢复、结果检查及带报告的逐图/ZIP 导出。
- [ ] 小程序：继续暂停，不同步、不构建、不验收；恢复时适配上述可选字段与状态，不能把菜单存在视为已适配。
- [ ] 真实模型质量 / 生产 / 全部投稿要求：未验收；本地/模拟验证不替代这些结论，无付费模型调用、提交、推送或部署。
- 来源与范围见 [研究对照](docs/journal-rules-20261013/research-and-scope.md)，验证见 [开发验收](docs/journal-rules-20261013/validation.md)。

## 2026-10-13 · 完整流程与精修证据链修复（本地，未发布）

- 新路径精修将当前遮罩、辅助图用途、结构化对象/属性/关系/保留约束贯穿规划与评审；增加服务端派生 `editRequirements`、绑定送审 hash/顺序的 `refineInputEvidence`、可选 `separateInputObservations`。有编辑约束时评审必须返回逐项 `editChecks`（id/status/evidence）；缺项、重复/过期 ID、无证据或未解决的不确定项不能通过。普通无额外约束的旧评审格式保持兼容，结果仍保存现有 review/history/stages。
- 精修输入和辅助视觉材料页按实际图片数量/总字节预算分批，保留每页来源及送模 hash；`materialReads` 增加可选 `vision_batch_received`。原 12 幅材料页/阶段、16 次工具决策和文字预算不变，不截去页面。分批观察可能增加模型调用数，不增加绘制/修改轮数。任何批次失败不冒充材料理解或评审通过。
- 页图观察同时收到原任务和当前 `editInstruction`、阶段目标/计划；当前修改要求优先于旧说明，文件内容仍只作证据。
- `model-v1` 完整流程的风格结果采用 ready/needs_input + missingInputs + 完整 plan 协议，保存原始回复再校验；格式无效、缺材料、空方案及“无需修改”占位在绘图前阻断。不会因该校验失败自动补调用或回退；旧纯文本风格路径保持兼容。
- [x] Core / shared：输入证据、逐项核对、分批和上下文、风格校验及离线反例；修正原材料数值评审测试桩，数值免检负例继续保留。
- [x] Web：既有处理过程/评审 JSON 展示兼容；帮助与英文文案补充分批调用成本及停止条件，无新字段需客户端填写。
- [ ] 小程序：继续暂停，不同步/构建/验收；恢复时兼容新增可选审计记录，不自行剔除评审证据。
- [ ] 真实模型 / 生产 / 跨版本未完成任务恢复：未验收；本轮无付费调用、提交、推送或部署。
- 验证与保留核查见 [修复报告](docs/material-reader-20261012/full-refine-flow-fixes.md)。


## 2026-10-12 · 生成流程审计四项修复（本地，未发布）

- 新 model-v1 PNG/SVG 与对应 PNG 精修评审，从任务图型、数据字段和数据面板派生 `numericReviewContract.applicableRequired`；定量任务不能以 `applicable:false` / 空核对列表通过。纯步骤编号不自动认定为定量编码。仍不独立验证模型填报的来源、几何和科学结论。
- Web 请求仅提交当前必需的 `modelRoutes` 及旧型号字段；未使用的角色草稿继续保存在浏览器。Core 先计算执行角色，再校验路由、冲突、区域、混合模式和思考配置；兼容旧请求中未使用的坏草稿/缺省型号。网关复用生成的共享角色策略，Core 仍以真实角色与可信登录头验证自定义/TokenDance 权限，客户端不能凭 `referenceImageMode` 跳过鉴权。
- PNG/SVG（含旧生成分支）和新路径精修的辅助问题及不确定项，增加服务端绑定版本/摘要的 `auxiliaryVisualIssues`；主模型必须返回逐项 `visualAdjudications`（accept/reject/unresolved、reason、evidence）。漏项、重复/未知/过期 ID 或缺证据阻断通过；允许有证据的驳回。旧记录无需改写；没有问题的观察报告兼容空裁决。沿用既有修改/评审预算，没有新增模型调用步骤。
- [x] Core / Gateway / shared：上述校验、可选评审证据、请求角色裁剪；`sync-workflow.mjs` 同时生成网关策略。
- [x] Web：只发送必需角色、本地草稿保留、帮助及英文说明、实际 App 挂载回归。
- [ ] 小程序：继续暂停，不同步/构建/验收；恢复后支持只提交必需角色及读取可选裁决字段。
- [ ] 其他客户端 / 真实模型 / 生产：未验证。无提交、推送或部署。
- 证据、成本与边界见 [本轮修复报告](docs/material-reader-20261012/workflow-flow-fixes.md)。

## 2026-10-12 · 上游审计最小修复与 SVG 离线误判拦截（本地，未发布）

- `model-v1` SVG 渲染/评审证据新增可选 `localQuality`：同尺寸像素对照检测声明的 marker-start/end 可见贡献，绑定原 SVG/PNG 哈希；问题或覆盖不足不能被模型 passed 覆盖。保留原始模型判断和原图；模型已通过但本地否决时停止，不编造修订方案或自动追加调用。检查有界，不能证明箭头语义、渐变、文字或科研正确性。
- 数值评审可选 `checks[].linearScale` 校验坐标、原值与单位尺度的算术一致性；并不独立确认模型填入的来源和坐标。原有未提供此字段的合同兼容。
- Web 恢复 `planner_critic` / `full` 两种新任务流程；普通与专业模式均可选择，专业模式保留候选/修改次数设置。当前浏览器持久化与历史恢复保留流程，`demo_full` 归一化为 `full`；共享 createJob 请求适配器同时接受两种 full 名称。新任务不恢复 vanilla / 零次检查。
- 管理诊断 `evaluateJob`：无效回复返回 `status:unevaluable`、无效维度 `null` 和 `errors`，不默认高分、不聚合不完整结果。上传参考图不再隐含 GT；仅显式提交同任务 `groundTruthObjectKey` 且 `groundTruthConfirmed:true` 时使用对照。`model-v1` / 原材料任务在调用前返回 422 / `EVALUATION_CONTEXT_UNSUPPORTED`；这是旧接口限用，未实现新的材料评估器。
- [x] Core / shared：上述有界本地检查、真实分支模拟集成、评估异常和请求字段转发；无新付费模型调用。
- [x] Web：实际提交/保存/恢复完整流程；失败记录展示已完成结果、下载与原失败状态；帮助及英文说明更新。
- [ ] 小程序：继续暂停，不同步、不构建、不验收；后续兼容评估 null / unevaluable 及可选本地评审证据，核对完整流程入口。
- [ ] Android / Windows / macOS：后续按实际启用端核对上述可选证据、旧诊断返回和完整流程入口。
- 本地验证：Core 65、Web 39、共享请求 30 项通过；最终 SVG 定向复核 23 项通过。Core 类型检查、Core/Web 构建及真实 8MP 渲染冒烟通过。没有付费调用、提交、推送、部署或生产验收。详见 [实现、证据及限制](docs/material-reader-20261012/upstream-minimal-repairs.md)。

## 2026-10-12 · 材料与 SVG 同版本联调修复（本地，未发布）

- 材料工具仍为 `application-json-v1`。新完成记录 `sourceBinding:tool-locations-v1`、`claims:[{text,sources:[sourceId/recordId/materialId/filename/page/sheet/lines/kind]}]`：来源位置由实际成功读取结果生成，模型只选择短来源 ID；虚构来源进入一次有界纠正，失败不得当作已理解。文字结论仍属模型解释，不等同于事实准确性证明。
- 新 model-v1 PNG/SVG 成图评审要求 `numericReview`：区分数值几何是否适用，记录原值来源、实际画面/源码几何、方法与不确定性；缺失记录或未解决的数值问题不能通过。旧任务保留原解析及轮次语义。
- 精修在任何付费材料理解前校验原图及万相透明限制；同账号成图白底副本仍要求原哈希吻合。精修评审新增 `submittedImageHash` 及实际送审图片阶段文件，与候选图证据一致。
- 持久执行步骤新增内部 `taskMaterialCache` 标记，终态清理完整材料结果及精修原图/辅助资产缓存；清理异常进入 `materialCleanup.pending`。保留付费子调用记录用于防重复收费，恢复时需浏览器原件重新上传；这不是生产持久化验收。
- 材料读取补充 `coverage`（pageCount/readPages/renderedPages/unreadPages），工具部分页/行读取明确 `partial`；PPTX 渲染仍保留 nativeText/表格/图表缓存/备注。主模型结构化 `plan` 无损序列化，非法已返回规划使用 `MODEL_PLAN_INVALID`，明确此前调用与绘图未开始，不报请求状态未知；`SVG_RENDER_FAILED` 本地渲染错误同样按已知调用结果处理，保留此前调用费用，不再误报 unknown。
- 精修生图请求保留原始 `editInstruction`，最终评审直接接收修改前后图；PNG/SVG/精修终审新增 `originalMaterialComparison:{sourcePages:[inputIndex/materialId/filename/page/sourceHash/recordId/originalImageHash/submittedImageHash],omittedPages,delivery,instruction}`。原材料页图与成图共同送审，按渠道容量明确未同屏页，来源/哈希入审计；不延长原件或页图服务器保存期。
- Web 图片思考“服务商默认”不再转换成显式 mode=true；真正显式且仅支持纯文生图的参数仍保留，自动迭代通过已有记录说明文字重画兼容路径，不伪称带图编辑。
- [x] Core / shared：来源校验、数值评审协议、原图前置校验、精修送审绑定及缓存清理。
- [x] Web：现有通用评审/任务材料记录兼容；辅助 10 份及原图独立额度不变。
- [ ] 小程序：继续暂停；恢复后兼容可选 claims/numericReview/送审 hash 字段。
- [ ] Android / Windows / macOS：后续兼容上述可选证据字段；无跨端验收。
- 隔壁“恢复 Tuyan v4.0 交接”成果已在同一脏工作树，未覆盖旧渲染/评审实现。同版本 r7（运行源指纹 `c0a3b0f79a7bbc4dcdd1debd80971c3a195fa9985cb678a7114b5fe76119a510`）完成 5 条真实流程、54 次百炼请求（49 Qwen / 5 Wan），100 项自动化/模拟测试及类型/构建通过。原件复用、临时清理、精修三类输入及当前版本送审已核对；PNG 数值/布局仍有问题，SVG 数值正确但箭头遮挡/渐变漏检，独立质量验收未全通过。完整清单与证据见 `docs/material-reader-20261012/integration-20261012/REPORT.md`；生产及其他端未验收，无提交/推送/部署。

## 2026-10-12 · 真实材料验收发现的读取协议纠正（本地，未发布）

- 主模型一次返回多个 JSON 对象时，原先直接解析失败。现在每阶段最多允许一次格式纠正，计入既有 16 次决策预算；异常响应中的工具请求均不执行，重返同一任务限定的单条请求验证。主模型使用当前阶段短 `readId` / `usedReadIds`，后端映射为原有权威 `usedRecordIds`；不用模型复制 64 位哈希。读取阶段明确只核查原材料，实际成图和 SVG 源码交给下一评审阶段。
- `materialReads` 新增 `type:protocol_error`（`response` 最多 12,000 字符、`responseTruncated`、`correctionAllowed`），保留真实格式失败证据。失败公开代码为 `MATERIAL_READ_FAILED`，展示具体材料原因；已收到主模型响应的失败不再误报“未调用”或要求裁剪图片。
- [x] Core / shared：读取代理、一次纠正审计与材料错误/费用说明；精修读取接收实际 `editInstruction`。
- 图研自有结果进入万相精修时，仅服务器同账号/生命周期、结果声明 `review.displayBackground:#ffffff` 且原 PNG 哈希相符，使用白底显示副本送模；保留原始 PNG。新增 reference 阶段记录原图/送模哈希和白底原因；精修结果沿用已有白底标记。用户上传透明图、任意客户端背景声明不触发此转换。
- [x] Web：沿用通用读取审计/错误展示，无额外设置或用户操作。
- [ ] 小程序：继续暂停；后续需容忍新增读取记录类型与失败代码。
- [ ] Android / Windows / macOS：后续兼容新增可选记录类型与失败代码。
- 真实百炼 89 次请求（85 Qwen / 4 Wan）：材料文字/页图、浏览器原件复用和修复后的 PNG 精修链路验证；最终精修 `issues_found`，SVG 终审未通过，数值几何及评审漏检未解决。17 项定向回归、类型检查与 Core 构建通过；[完整证据与限制](docs/material-reader-20261012/live-acceptance-20261012.md)。真实登录/Mongo/OSS/Linux 未验收；未提交、推送或部署。

## 2026-10-12 · 精修原图独立于辅助文件额度（本地，未发布）

- 修正下方 v2 的精修 1+9 规则：`materialMaxCount:10` 只计算辅助文件，`sourceImageUpload` / `taskSourceMaterial` 原图单独计算；精修可提交 1 张原图加 10 份辅助文件。辅助文件每份仍最大 10,000,000 字节，无新增字段或版本。
- [x] Core / Gateway / shared：精修入口按 `materialFiles + refineInputs.references` 合计最多 10 份辅助文件校验；原图归属、像素校验与任务清理维持原协议。
- [x] Web：精修辅助文件与生成页同为 10 份；两页统一简短说明，移除“已保存的文件”折叠库和空状态、文件卡片的“文件与读取详情”折叠区；保留简洁文件卡片、浏览器原件与读取记录、刷新恢复及任务复用。
- [ ] 小程序：继续暂停，不同步/构建/验收；后续恢复时按原图与辅助文件分别计算。
- [ ] Android / Windows / macOS：接入时采用辅助 10 份、原图单列的额度；其余 v2 生命周期契约不变。
- 验证记录见 [v2 实现与证据](docs/material-reader-20261012/browser-task-storage-v2.md)。无真实模型调用、提交、推送或部署。

## 2026-10-12 · 浏览器原件优先、任务临时副本与统一文件额度 v2（本地，未发布）

- 覆盖下方 v1 的“8 文档 / 3 图片 / 30 天服务器保存”：每任务最多 10 份、每份 **10,000,000 字节**；生成页图片/文档合并计数。精修原图占 1 份，辅助文件最多 9 份，格式/按需读取与生成页一致。
- `modelRegistry.materialFileVersion:2`、`materialMaxCount:10`、`materialMaxBytes:10000000`、`materialStorage:browser-original-task-temporary`；`materialRetentionDays:1` 仅表示未提交临时上传的兜底期限，**不是任务结束后的保存期**。原件先写 IndexedDB，事务提交后回读 SHA-256；失败不上传。提交任务才上传，且每次任务使用新副本。
- `prepareMaterialUpload.files[].clientFileId`（当前浏览器 ID）由服务端返回并保存到权威 `materialFiles`。恢复已失败任务可提交 `restoreId/jobId`，必须匹配该用户/账号生命周期/原任务及原 SHA-256；原文件 ID 与读取记录 ID 保持稳定。新建任务不能共享临时文件 ID。
- 精修新增 `sourceImageUpload:{materialId}`，Gateway 仅转发引用，Core 查所有权/原件再校验像素；`taskSourceMaterial` 保存来源，精修原图及其规范化临时快照随任务清理。旧 `sourceImageUpload.objectKey` 仅兼容旧客户端。用户提交的 `taskSourceMaterial` 不可信并被丢弃。
- 成功/失败/取消清理原件、完整读取缓存及新协议精修输入快照；`materialCleanup.status=cleared|pending`，存储失败保留重试状态、5 分钟清理器补偿。未启动上传最长 24 小时；签名 PUT 有效窗口中的晚到字节会再次清理。成图与任务来源/读取审计保留。
- 浏览器按 API 地址及账号隔离原件、草稿、任务读取记录。历史复用从浏览器原件重新上传；清除站点数据、浏览器自动回收、换设备或手动删除后无法自动恢复。服务器不会用摘要替代缺失的原件。
- [x] Core / Gateway / shared：图片整页材料读取、任务绑定与清理、同哈希恢复、精修源材料接口；单次图片容量较小时由同一主模型分批观察，记录真实分批回传，非独立视觉模型强制配置。
- [x] Web：生成/精修同组件、浏览器保存失败阻断、恢复/删除/复用、10 份总额、10 MB 限制及检索独立；真实 IndexedDB/桌面/390px 和模拟供应商链路验证。见 [v2 实现与证据](docs/material-reader-20261012/browser-task-storage-v2.md)。
- [ ] 小程序：继续暂停，不同步/构建/验收；脚本新增 `--skip-miniprogram`，保留该端所有已有文件。
- [ ] Android / Windows / macOS：按新字段/版本和本地存储能力接入；不得复用已清理的服务器文件引用。
- [ ] 真实模型/真实 Mongo-OSS-登录/Linux/生产：本轮未验收，无提交/推送/部署，用户在真实测试时提供 Key。


## 2026-10-12 · 原文件保存与按需材料工具（本地验证，未发布）

- 新增可选 `materialFiles:[{id}]`；服务端将引用替换为当前用户/账号生命周期的权威原件元数据。旧 `sourceMaterials` 保留历史兼容。`modelRegistry.materialFileVersion:1`、`materialToolProtocol:application-json-v1`、`materialRetentionDays:30` 为独立能力协商，不改变 model-v1 PNG/SVG 路由。
- 新 action：`prepareMaterialUpload`、`finalizeMaterialUpload`、`getMaterial`、`listMaterialFiles`、`readMaterial`、`deleteMaterial`。网关注入身份，Core 检查文件/任务归属；模型仅有当前任务文件 ID，不接受文件路径或任意 URL。原件 30 天、未完成上传 24 小时；显式删除使历史引用不可再读；纳入账号注销及清理。
- 主模型通过应用层 JSON 循环请求概况、搜索、原文范围、整页图片，记录为兼容协议，**不声称原生工具调用**。规划及每次成图评审可回查原件。任务新增 `materialReads` 来源与送模证据；恢复继续使用原件 ID，读取失败不使用旧摘要冒充成功。
- PDF.js 5.4.624 / PDFium 2.1.13 与独立有界子进程；PPTX OOXML 加 LibreOffice 整页转换，固定自带字体并提示替换/内容覆盖差异。PPT 暂不支持，要求另存 PPTX。可选服务端 `TUYAN_SOFFICE_PATH` 指定运维控制的转换器路径，客户端/模型不可设置。Linux 包须含 LibreOffice、fontconfig、自带字体及新 assets。
- [x] Core / Gateway / shared：原件、工具、生命周期、读取证据与主模型 JSON 循环已接入；真实解析/整页渲染和模拟供应商链路通过。范围与证据见 [验收说明](docs/material-reader-20261012/README.md)。
- [x] Web：上传保存、已存文件复用、详情/原件恢复、删除说明、四种检索独立性；本地自动化与桌面/390px 浏览器检查通过。
- [ ] 小程序：继续暂停，不同步/构建/验收/发布；后续消费新能力与可选字段。
- [ ] 真实模型/真实 Mongo-OSS-登录/Linux/生产：未验收；用户将在真实测试时提供凭据，无部署。

## 2026-10-12 · 文件理解与模型绘图统一（model-v1，本地未发布）

- 用户最新方向覆盖先前“按图型自动程序绘图”的新任务设计；[审计、格式限制与验证](docs/infographic-v400/model-material-workflow-20261012/README.md)。保留旧执行代码和已付费恢复协议，不改写历史任务。
- [x] Core / shared：新增可选 `generationPath:model-v1`、`sourceMaterials`；modelRegistry 提供 `materialWorkflowVersion:1`。新任务按输出格式路由：PNG=主模型规划+生图模型，SVG=主模型源码+程序检查/渲染；数据/组合/状态类不进入固定程序绘图。所有修改后版本单独评审，`maxCriticRounds` 在新路径表示最大修改次数，review.limit 最多加一次最终检查。新增 `MATERIAL_INPUT_REQUIRED` 与 `SVG_SOURCE_EDIT_REQUIRED`；getJob 的安全 generationContext 保留原材料和图片恢复地址，手选 ID 不丢失。无新环境变量。
- [x] Web：统一文件上传与有界解析，去除专属数据/算法表单；上传和 none/auto/random/manual 独立，偏好只在 auto；SVG 隐藏图片模型/无用凭据。结果“修改 SVG”恢复源码和材料到 SVG 生成区；PNG 精修后评审；恢复旧数据转 JSON 文件。服务能力门禁防止退回旧路径；浏览器存量 8793 仍为只读 UI fixture，不能据此宣称真实生成。
- [x] 本地验证：25 个模拟 provider 生成组合、92×2 角色断言、Web 39、Core 26、旧生成回归 36、共享 API 29 项通过；类型/构建及桌面/390px UI 检查通过。模拟模型测试与真实模型效果严格区分；本轮未调用付费模型、未部署。
- [ ] 小程序：按用户要求继续暂停；本轮不改动/同步/验收。恢复后消费 model-v1、文件材料与检索独立、版本门禁、评审修改次数、任务上下文及错误字段。共享生成脚本使用 `--skip-miniprogram`。
- [ ] Android / Windows / macOS：后续接入上述新请求/恢复/UI/文件限制；旧客户端无 marker 继续旧合同。真实模型、Linux 运行、线上及跨端未验证。


## 2026-10-10 · 状态／流程 SVG 关系与组合排版修复（本地代表验收通过，未发布）

- [执行计划](docs/superpowers/plans/2026-10-10-svg-topology-repair.md)、[修复与证据](docs/infographic-v400/svg-repair-20261010/README.md)。仅普通 `workflow/state_transition` SVG 分支改为原始语义提取 → ELK 矢量编译 → 当前图像/源码/关系审查；原有严格 SVG 渲染器、其他图型及原生 Recraft 分支保留。并行合并请保留具体分支，不整文件覆盖 handler。
- [x] Core / shared：无新增 createJob 输入；新增可选 `CandidateReview.topology/rendererAudit/composition.layout`，绑定实际版本与 SVG/PNG/关系 hash。固定渲染器的能力及原始需求优先级在规划、绘制和评审共用；明确用户要求仍强制满足，不能拿能力限制抵消。错误 `DIAGRAM_TOPOLOGY_INVALID` 禁止自由绘图回退。`elkjs` 固定 0.12.0，构建须包含依赖，无新 env。 新增 `topology_extraction` / `protocol_correction` 阶段记录：已收到的结构错误最多 1 次明确额外主模型纠正；评审协议错误仅使用剩余原评审轮次，同版重新审查。保存原始失败证据后才可继续；实质冲突、未知请求或存储失败不进入纠正。恢复复用已完成调用，无新 createJob 开关。
- [x] 组合：先按最终面板像素分配尺寸，再绘制独立流程/数据子图；数值始终程序绘制，组装不改数据图元。完整总评记录即使协议失败也保留；超过 256 KiB 的 JSON 证据以带 SHA-256/字节数的对象引用保存，阶段图片仍是成图，不能把 JSON 当图库图片。修改版本不继承旧审查结果，未应用建议保持非通过。
- [x] 原文追溯协议：新固定渲染任务内部保存 `sourceProtocol` v2 快照（含 `promptRevision:1`），并由 `getJob` 返回可选字段；不增加客户端提交参数。目录绑定任务、面板与原始输入 hash，提取／评审使用 `sourceRef`，程序解析为准确原文并同时保留原始响应与解析记录。节点按原始名称键控，重复名称不自动拆成多个实体。旧版本、缺当前提示版本或原文已改变的该类未完成任务在 resume/run/reconcile 解密凭据及付费调用前明确阻断，须重新提交；不能把旧调用记录当作新协议完成记录。原有原生矢量路线按实际型号排除，保留旧行为。
- [x] 真实验收：原始状态 SVG 与流程＋2/5/3 柱形混合 SVG 均流程 passed，交付同一 hash 的独立真实终审也 passed；每图 7 条关系、唯一命名节点及数据完整，SVG 真矢量／可编辑文字，无手工改图。最终轮 11 次工作流＋2 次终审；全部排障累计 53 次 Qwen、0 次生图，失败轮次保留，金额未核账。Core 1258/1258、定向109/109、检查与构建通过；30 冻结文件及238保护文件复核。新证据在 `docs/infographic-v400/svg-repair-20261010`。旧完成报告的 9 个模拟组合证据被定向测试误覆盖、历史原字节未恢复，已标注失效；旧真实模型证据未受影响，后续测试默认使用临时目录。
- [ ] 小程序及其他端：继续暂停同步；旧可选字段可忽略，后续需兼容新增审查证据/错误与程序矢量文件。本条不代表跨端、Linux 容器或生产通过。无提交、部署和生产设置变更。

## 2026-10-10 · 信息图实际执行补齐：63 数据双格式、混合组合与代表实测（本地未发布）

- [交付报告](docs/infographic-v400/completion/README.md)、[92 类逐项支持](docs/infographic-v400/completion/support-catalog.md)、[184 路径矩阵](docs/infographic-v400/completion/support-matrix.csv)、[真实百炼记录](docs/infographic-v400/completion/live-validation.json)。下方旧条目“40 数据 PNG、23 候选、组合仅示意”是历史状态；当前为 63 数据基础形态 PNG/SVG、27 示意双格式流程、2 独立子图组合。142 变体及 8 分析方法仍单独标记，不算全部实现。
- [x] Core / shared：`modelRegistry.figureExecutionVersion:1` 新增执行能力门禁，分类版本及稳定 ID 保留；`figureData.options` 增加 23 专属参数合同；`figurePanels` 可含真实数据和可选 `methodContent/caption`。子图只继承白名单字段，独立按图型检索和评审；不允许嵌套组合、未实现组合变体或未验证共享尺度。新增可选 `CandidateReview.dataValidation/composition`，绑定数据/代码/PNG/SVG hash 及子图证据；原 SVG 评审算法保留。
- [x] Plot worker：`/render` 兼容新增 `vector_output`，返回可选 `svg_base64/render_validation`，同一 Matplotlib 场景双导出、真实向量与可编辑文字，禁止图片嵌入。63 类实际数值/图元验证，360 个输入边界拒绝，31 个独立已知答案、16 个科学边界成图；63 SVG 经另一渲染器重开。新增独立 `programmatic-worker.cjs`，部署须与 Core 携带原有 WASM/字体等资产；未新增 env。
- [x] 检索 / 绘制：具体类别/完整约束与真实许可参考像素传入规划，绘制收到执行规则与结构经验，评审收到实际画面/数据检查。手选参考新增 `manualUnmatchedCount` 与 `match.level=manual_unmatched`，保留用户选择但不冒充结构匹配。万相完整提示仍受 5000 字符限制，去重和阶段性元数据整理不截断任务约束，超限继续明确阻断。
- [x] Web：专属中文表单、参数/CSV/JSON、显式模拟示例、PNG/SVG、独立子图草稿及任务恢复；不支持执行版本的旧 Core 在提交前阻断。数据图及混合数值组合禁用生图精修（服务端同样拒绝），转为恢复输入重新绘制。修复示例残留参数与退出账号后迟到恢复响应写回私有草稿。650 测试、构建及桌面/390px 表单检查通过。
- [x] 本地验收：Core 1206、taxonomy 73 项通过，类型检查与构建通过。16 次真实百炼推理请求（Qwen 15、Wan 1），代表流程 PNG 通过；状态 SVG `modified_unreviewed` 且人工仍见错误；混合 SVG `issues_found`。其余逐类真实效果待测。不得把模拟模型矩阵或 HTTP 成功当作质量通过。
- [ ] 小程序：用户要求继续暂停；224 个文件与本轮前 hash 一致。恢复后消费执行版本、上述字段/状态/错误与程序 SVG 输出；当前未同步、构建、验收或发布。
- [ ] Android / Windows / macOS：需同步专属输入、执行能力门禁、数据保护和输出/恢复；本轮未验收。Linux 生产 worker、线上配置/部署、跨渠道及账单金额未验收。所有改动本地保留，未提交部署。


## 2026-10-10 · 论文图库补充 v2 与图型预览（本地未发布）

- [扩充与验证报告](docs/infographic-v400/expansion-20261010.md)、[38 张逐图审核](docs/infographic-v400/evidence/expansion-20261010-audit.json)、[92 类覆盖表](docs/infographic-v400/evidence/expansion-coverage.csv)。正式语料 `journal-2026-10-10.v2`：69→107 张、35→67 篇论文、覆盖 63→89/92 图型；保留 7 张隔离，研究候选不进入可用池。
- [x] Core / shared：稳定案例和类型 ID 保留；新增主图型/子图进入同一过滤、检索和规范引用。纠正旧配对点图误标哑铃、未证明大小编码的散点误标气泡；任务历史 ID 不删除。新增可选 `license.reviewEvidence` 指向逐图审核记录；本轮 38 张记录绑定 XML、原图、PNG、图注哈希及四种用途条件。已有许可和候选门禁保持，无新任务字段或环境变量。
- [x] Web：31 个教学预览中的 28 个换为合格真实论文图，最终 89 个论文预览＋3 个结构示例（研究路线图、流图、极坐标面积图）；独立放大、原文出处、裁剪说明与能力状态保留。补图不提高生成能力状态。定向 30 项通过，构建、桌面与 390px 窄屏验证通过。
- [x] 资源与工具：支持经过人工核验的 Implementation Science JATS/PNG 来源，PLOS 继续保留原始 TIFF/PNG；刷新脚本不自动批准素材。分类/图库 10 项通过；发布时携带新的 references 和正式图片资源。
- [ ] 小程序：按用户要求继续暂停；现有改动保留，未同步或测试。恢复时按新语料版本和稳定 ID 更新，不将教学预览加入检索池。
- [ ] Android / Windows / macOS：后续同步语料及可选审核字段；生产部署、模型逐类型成图及跨端验收本轮未执行。


## 2026-10-10 · 统一信息图分类、论文图库与数据绘制（本地未发布）

- [目录及专属规范](docs/infographic-v400/catalog.md)、[旧新映射](docs/infographic-v400/mapping.md)、[实际运行说明](docs/infographic-v400/runtime.md)、[逐图许可记录](docs/infographic-v400/references.md)。唯一注册表 `packages/figure-taxonomy`：13 大类、92 基础类型、142 变体定义；40 种基础数据渲染、27 种示意/领域图合同、2 种仅示意子图组合，23 种数据图候选禁止调用。变体数量不等于实现数量。
- [x] Core / shared / Gateway：兼容新增 `figureTypeId/figureSpecVersion/figureVariantIds/figureAnalysis/figureData/figurePanels`；modelRegistry 返回 `figureTaxonomyVersion:2026-10-10.v1`。旧字段保留；新字段贯穿任务/getJob/恢复/精修上下文、检索/规划/绘制/评审。缺数据、规范版本不符、未实现类型/变体或含数据子图组合先阻断。数据精修错误 `FIGURE_DATA_REFINE_UNSUPPORTED`；新数值图不调用生图/生图升清。
- [x] Core / Web 图库：正式池切换为逐图许可与质量核验的 69 张真实论文原图，35 篇论文，覆盖 63 类型；7 张隔离。旧 306 案例保留历史，但未核验 ID 新调用返回 `REFERENCE_LICENSE_UNVERIFIED`。图类/图库同 ID；图像服务端 hash 校验；`referenceSelection` 新增目标 ID、精确/兼容数量及无匹配状态，允许零参考。
- [x] Web：类别移入生成设置，分层卡片、别名搜索/详情、完整路径与保存；图库筛选/预览/来源许可联动。新数据图实际 PNG，4K 不受未使用的图片路线限制。旧后端不支持分类版本时明确阻断。27 类示意合同并非逐类真实模型效果通过。
- [x] Plot worker：固定数值渲染、真实数据 hash 与程序核查、中文字体、按目标像素输出；40 类型合成数据实跑，中文 4096×2304 核验。本地结果不替代 Linux 生产容器验证。
- [x] 并行 SVG 边界：沿用现有 SVG/PNG 实际画面、版本/hash 与新版未复审语义；邻会话实付结果不计入本次分类验证。未重写其评审算法。
- [ ] 小程序：按用户要求继续暂停；已有改动保留。恢复后消费六字段/版本、图类和图库协议、许可错误及数据输入/输出限制；未同步、测试或发布。
- [ ] Android / Windows / macOS：需消费上述可选字段与版本；不把旧 diagram/plot 当完整新协议，不宣称全端完成。
- [ ] 真实模型逐图型效果 / 专业分析与变体 / Linux 容器 / 生产：本轮未验证或未实现。没有新增环境变量；依赖构建须携带 `packages/figure-taxonomy` 与正式参考 assets。未部署。


## 2026-10-10 · SVG/PNG 继续真实验证与PNG版本证据（本地未发布）

- [真实验证报告](docs/workflow-v400/2026-10-10-svg-png-live-followup.md)：本次追加38次百炼真实请求（34文本/视觉、4生图）。PNG重画为明确故障注入；严格一致的已付规划前缀复用，后续检查/传图/修订真实。SVG与PNG均保留模型质量问题，未把HTTP200当作图像质量验收。
- [x] Core/shared：PNG评审加入完整画面结构化协议、交付/已审PNG hash与版本历史；`CandidateReview.history.svgHash`改可选，PNG用`pngHash`，新增`deliveredPngHash`、`reviewedPngHash`、可选`displayBackground:'#ffffff'`。原SVG字段保留。迭代记录原图/送审/传图副本；失败保留匹配的图与方案，已检查问题不被重画失败覆盖。
- [x] Core：PNG完整生图上下文、准确5000字符预算；Wan2.7实际Data URL与尺寸/像素验证，自动PNG迭代以明确白底副本适配其RGBA输出，原图保留；用户透明精修图不自动改背景。新增公开错误代码`WORKFLOW_INTERNAL_ERROR`（内部ReferenceError），费用unknown优先规则保持。
- [x] Web：PNG/SVG版次文字准确；仅声明白底的生成结果使用白底显示，已有状态/错误展示兼容新增字段。本次未部署。
- [ ] 小程序：继续暂停；恢复时同步PNG类型/状态、白底声明与错误码消费，不能宣称已验收新流程。未同步、构建、测试或发布。
- [ ] 其他客户端 / Recraft实付 / Linux生产 / 账单 / 部署：未执行；新分类图库字段由并行会话独立接入与验收。

## 2026-10-10 · 百炼 SVG 真实请求验证与本地修正（未发布）

- 用户授权百炼真实测试，共18次请求，输入35,011 / 输出15,251 tokens；本地基础设施和合成案例。直接识图、辅助视觉、基础图库直读/协作证据见[真实验证报告](docs/workflow-v400/2026-10-10-bailian-live-svg.md)。辅助最终流程复用了已实测且请求一致的前置响应，单独真实生成v2，不冒充全新连续调用。
- [x] Core/shared：百炼识图按官方接口直接发送实际图片Data URL；加入SVG渲染限制上下文和完整观察JSON格式；结构化不确定项保留并阻止通过。新增公开错误代码`SVG_RENDER_FAILED`，渲染失败与此前已发生的生成调用明确区分。任务字段结构不变。
- [x] Web：现有通用失败信息和评审状态可消费以上结果，本轮未修改Web界面；真实画面仍发现零轮公式重叠、模型漏检箭头间距等质量问题，未宣称全面质量通过。
- [ ] 小程序：继续暂停，未同步、构建、测试或发布；恢复时纳入上述错误文案和结构化评审记录兼容核查。
- [ ] Recraft真实调用 / Linux容器 / 生产：未执行；百炼验证不能替代其他渠道。密钥未写入仓库或报告。

## 2026-10-09 · 4.0 SVG 先生成后检查，轮次包含必要修订（本地未发布）

- 新共享工作流契约 `workflowContractVersion:2`：SVG 从生成前方案文字评审改为实际生成 → 当前源码真实渲染 → 画面与完整代码评审。用户澄清每轮包括检查、完整优化方案和必要生成；最后新版 `modified_unreviewed`，不继承旧结论、不追加隐藏终审。
- `CandidateReview` 增加 `visual_code`、`issues_found`、交付/已检查版本与 SVG hash、每轮 SVG/渲染PNG/送审图片hash历史。旧 `text_reviewed` 历史含义保留。Core 保存每版文件，网络结果不明也先保留最近可交付文件，再遵循原停止/恢复屏障。
- 所有图库参考（包括vanilla）读取标题、介绍和真实图片；基础可识图主模型优先直读，否则要求可用辅助视觉。Web/Core/网关协同忽略未使用的视觉草稿，真实辅助角色仍需认证；不允许客户端模式字段绕过识图或身份检查。
- 原生 Recraft 明确型号/接口：首版实际style references，修订传上一版；完整上下文和数量/字节/尺寸/长度限额校验，不静默丢图、截断或改路线。非原生未知矢量渠道拒绝。提示词自有名称统一图研。渲染依赖增加固定字体、XML校验、受限WASM工作线程；生产打包必须携带assets，Dockerfile有本地中文字体smoke。
- [x] Core / shared / Gateway：本地实现与模拟请求验证；具体矩阵、界限及最终结果见[SVG验证报告](docs/workflow-v400/2026-10-09-svg-render-review.md)。未做真实模型调用。
- [x] Web：前置识图门禁、工作流v2协商、轮次说明、逐版本状态、图库实际图片说明与Recraft限制提示。保持旧历史可读。
- [ ] 小程序：按用户暂停要求未改动、同步、构建、测试或发布。恢复后同步workflow v2策略及类型、状态文案、真实图片门禁、基础直读角色与认证；旧客户端未同步前不能宣称完成本轮SVG体验。交接快照中50个相关小程序文件hash保持一致。
- [ ] 真实模型效果 / 真实接口与权益 / 费用 / Linux容器 / 生产部署：本轮未验证；真实调用和发布另定范围。公开版本仍3.8.1。


## 2026-10-09 · 4.0 工作树整合模型目录 v31（本地，未发布）

- 来源 `codex/model-catalog-20261009` / `4869c2a57adf74282ef14a892517299c61b1db28`，包含该分支自 `5e6989f` 起六个提交。合并位置 `codex/tuyan-v400-workflow-20261009`；逐文件三方合并，保留当前未提交的 4.0 工作，未整份覆盖 handler 或设置组件。[整合与验证](docs/workflow-v400/2026-10-09-catalog-integration.md)。
- 静态目录 `2026-10-09.v31`：1,040→1,079 个渠道身份，新增 39，历史 ID 和原始渠道 defaults 全部保留；普通模式继续按本端 4.0 规则优先使用具备视觉能力的主模型。包含新型号/生命周期纠正、Replicate 文本与持久恢复、fal/Ideogram 图片适配及原厂/渠道分离的参数卡片。
- `ModelSpecifications` v1 为可选信息，含 `manufacturer`、输入格式、准确输入/输出上限、来源与核查日期；仅展示，不据此扩大请求限额或视觉权限。Route v1、工作流 v1 与现有任务字段保持，没有新增 env/凭据。
- [x] Core / shared：目录和思考生成物同步；全量 1,150 项通过，新增 3 项跨目录/4.0 工作流验证覆盖主模型直读、观察报告交主模型、fal 参考上一张图重新生成和调用前视觉拦截。类型检查与构建通过；均为本地模拟。
- [x] Web：新模型/参数卡片整合；视觉无面板、普通模式、候选/评审、简化思考开关与仅必填预算规则保留；桌面1440、390/320px卡片、键盘及思考控件验收。完整625项测试与构建通过，详见报告。
- [ ] 小程序：按用户在目录会话中的暂停范围，本轮未同步、构建、测试或发布；现有 4.0 小程序改动保留。后续需合并源配置后重新生成目录，核查规格可选字段、禁选型号、思考参数与 1.5MiB 包体限制，再独立验收。未覆盖独立微信工程。
- [ ] 真实账户调用 / 地区权益 / 费用 / 生产部署：未执行；来源分支的官方文档核查与本地模拟不等于真实模型或线上验证。公开版本仍为 3.8.1。

## 2026-10-09 · 厂商官方规格补全（v31，本地待合并）

- 独立 `codex/model-catalog-20261009` 接续 `26424cb`；[41项核查与验收](docs/model-catalog/2026-10-09-manufacturer-specifications.md)。更新41项规格、Google16个精确型号逐页补证；1079个身份、默认、角色、能力和请求参数保持。
- [x] Core / 共享：specifications v1兼容增加可选manufacturer（独立来源/日期/匹配状态/参数）和inputFormats；不参与请求构造。生成器新增原厂来源/数值校验；198项受影响测试、类型检查与目录一致性通过。
- [x] Web：渠道与原厂规格分列，输入上限不冒充合计上下文；598测试、构建、桌面1440与390/320px卡片通过。原厂能力不新增调用控件、音视频角色或输出额度。
- [ ] 小程序全部暂停：未同步、构建、测试、优化、验收或发布；生成器显式`--skip-miniprogram`，219文件哈希不变。恢复后再处理可选共享字段与生成物，不认为小程序UI已完成。
- [ ] Android / Windows / macOS：后续按需消费可选原厂字段，不把参考参数认作已适配能力。
- [x] 4.0合并（已由本页顶部整合记录完成）：人工合并规格组件/i18n/共享类型/生成器局部改动，先合并config再生成Web/Core；不整份覆盖runtime handler、设置或流程。未部署、未付费探测、未做密钥或账户操作；真实调用未验证。


## 2026-10-09 · 模型目录证据落地与补适配（v30，本地待合并）

- 独立 `codex/model-catalog-20261009`，接续调查 `b8e25cc`；[实现与验收](docs/model-catalog/2026-10-09-adaptation.md)、[21项交付表](docs/model-catalog/2026-10-09-adaptation.csv)。1066→1079：TokenDance 3、fal 3、Replicate 7；旧ID/默认保留，无生产部署。
- [x] Core / 共享：Wan3 视频误接入已关闭新图像调用；Kimi准确思考字段、fal 6个生成/编辑端点、Replicate固定版本文本结果与持久查询恢复已实现。Route/specifications v1不变，无新env/凭据/任务字段。Core1121测试与类型/构建通过；真实账号调用未验证。
- [x] Web：复用现有目录、参数卡片和思考控件；592测试/构建通过；桌面1440px、390/320px本地卡片验收。未改4.0设置/流程架构。
- [ ] 小程序全部暂停：不做UI、同步、构建、测试套件、优化、真机或发布。生成器本轮显式`--skip-miniprogram`，219文件哈希未变；共享源数据已改变，小程序生成物仍旧，不能宣称已同步。恢复该端后再补生成与独立验收，未覆盖微信工程。
- [ ] Android / Windows / macOS：按需同步新增身份、禁选Wan3与思考参数；不得把目录接入当真实账户验证。
- [x] 4.0合并（已由本页顶部整合记录完成）：人工合并config、三个adapter/编译器局部逻辑和handler分发，再生成；不可整份覆盖其他会话文件。下条调查记录中的P1与可适配项已由本条落实，缺证据候选继续保持未接入。


## 2026-10-09 · 模型目录补证复核（仅调查，不改共享契约）

- 基于独立 `codex/model-catalog-20261009` / `66d98b8`；[163行逐项核查与证据](docs/model-catalog/2026-10-09-research.md)。目录仍1066个身份，未运行生成器、未改变默认/角色/调用参数；没有修改其他4.0工作树、服务或配置。
- [x] 调查记录：百灵3.1原生精确ID缺口细化；TokenDance Cogevol/Kimi结论纠正；硅基公共90项目录补齐；fal6个操作端点、Replicate25份schema核对。公开证据不等于账号开通或真实调用。
- [ ] Core / Web 后续P1纠错：Replicate `alibaba/wan-3` 实为视频，当前误登记可选生图/direct-edit；后续禁止新图像选择/调用并保留历史ID。此次只记录，尚未实施。
- [ ] 后续可补适配：TokenDance三款Cogevol文本、Kimi精确思考映射、fal三组生成/编辑端点；Replicate文本模型需独立结果处理；缺证据项见报告，不自动开放。
- [x] 4.0合并（已由本页顶部整合记录完成）：此次只有文档影响；后续契约修改应人工合并配置/adapter局部改动，不整份覆盖生成handler。
- [ ] 小程序全部暂缓：不执行UI、共享数据同步、构建、测试、包体优化、真机或发布；其他端只记录后续待办。本轮无推理、付费探测、密钥操作、充值或生产部署。

## 2026-10-09 · 模型目录继续补查与精确适配（v29，本地待合并）

- 接续本分支`74bbf10`；独立`codex/model-catalog-20261009`。1056→1066个静态身份：Ideogram原生1、Replicate4、商汤1、TokenDance4；相对发布基线累计新增26，原1040个ID和全部默认值保持。来源/完整清单见[补查报告](docs/model-catalog/2026-10-09-followup.md)。
- 生命周期补3项：硅基ERNIE-Image-Turbo已停用并拒绝新调用；TokenDance MiMoV2.5/Pro按本渠道公告10月21日10:00停用。保留保存的ID，不自动迁移。Together FLUX-3实为视频条目，不假接为生图。
- [x] Core / 共享：复用现有角色、尺寸、思考编译器和校验；Ideogram可选内部`requestEncoding:'json'`与提交前持久检查点，未知结果不重发。Replicate固定四个精确审核版本，按独立schema验证；原图约束兼容增加area运算。Route v1、specifications v1不变，无新env或凭据字段。
- [x] Web：复用首轮卡片，按渠道显示可用能力、来源、待确认项；本地桌面与390/320px交互核验。没有改4.0设置或生成流程。
- [x] monorepo小程序共享目录 / TS / JS：同步、构建、121项测试通过。未覆盖独立微信工程。
- [ ] 小程序原生卡片UI / 真机 / 微信发行：未在本任务实施，共享数据同步不作为原生UI完成证据。
- [x] 4.0合并（已由本页顶部整合记录完成）：先人工合并config与adapter局部修改，随后运行`sync-model-catalog`、`sync-thinking`；不可整文件覆盖生成handler或4.0分支。首轮UI人工合并待办仍有效。
- [ ] 原生百灵新ID、TokenDance新型号视觉/思考控制、其他资料不完整候选：按报告逐项补证，不继承其他渠道声明。真实账号/地区/额度/推理/账单未验证，本轮无push、部署、付费探测或微信发布。



## 2026-10-09 · 模型目录与参数卡片（隔离分支，本地待合并）

- 基线 `5e6989f`；独立 `codex/model-catalog-20261009`，不改 4.0 工作树。静态目录 `2026-10-09.v28` 新增16个渠道身份（1040→1056），原ID与默认值保留；生命周期与公开来源详见 [核查记录](docs/model-catalog/2026-10-09.md)。
- 兼容扩展：`modelRegistry` 条目可选 `specifications.version=1`（模态、token、来源/日期/备注）；双端点型号可选 `specificationsByRole`，避免 chat token 上限显示在 image 端点。旧响应缺字段仍显示待确认。字段只用于信息展示，原角色、能力、账户、尺寸、提交门禁不放宽；Route v1不变。
- [x] Core / 共享配置：逐精确渠道ID维护能力/尺寸/思考规则；新Claude、Gemini、BFL和图像渠道的模拟请求检查；OpenRouter仍使用实时双目录和原有Batch/格式门禁。新增型号真实调用未验证。
- [x] Web：摘要行+原有详情，支持/未接入/待确认区分；键盘、桌面1440px、手机390px/320px已本地验收。
- [x] monorepo小程序数据：身份/调用能力/限制同步，TS/JS构建；完整可选元数据同步，展示字典复用既有无损压缩器以保持1.5MiB预算。未覆盖独立微信工程。
- [ ] 小程序原生卡片 UI / 原生工具验收：本任务未实现，不等于共享目录已同步就完成。
- [ ] Android / Windows / macOS：按需消费可选信息字段；核对新目录和本端选择器，不得由官方音视频声明推断本端已适配。
- [x] 4.0 合并（已由本页顶部整合记录完成）：人工合并 `ModelPicker.jsx` 插入、`ModelRoutingSettings.jsx`区域参数透传、CSS入口、i18n和类型导出；先合并 config 再运行两个生成器，不覆盖4.0生成流程/设置架构。
- [ ] 真实账户 / 地区权益 / 生产发布：本轮不包含付费探测、充值、部署或微信发布。公开资料不完整渠道仍列待确认。



## 2026-10-09 · 4.0.0 工作流与教程（本地开发，尚未上线）

- 新共享工作流契约 `workflowContractVersion:1` / `workflowLimits:{maxCandidates:6,maxCriticRounds:5}`；候选整数 1–6、评审整数 0–5，默认 1/1。更低服务端容量限制明确拒绝，不截断；候选并发配置保持原值。部署时需核对现有 `PAPERBANANA_MAX_CANDIDATES` / `PAPERBANANA_MAX_CRITIC_ROUNDS`，模板默认分别改为 6/5，未修改生产 env。
- createJob / refineImage 新增 `visionMode:'assist'|'none'`，旧请求缺省 assist。none 是工作流设置，停用视觉请求、Key、思考及登录依赖；不伪造模型ID。所有基础生成/精修先由主模型制定方案；assist 的观察报告交主模型决策。上传参考、图库图片观察、PNG/plot评审和精修按实际路径前后端预检，未知不当支持。SVG 保持生成前文字方案评审。
- 主模型评审后完整修订方案与上一张候选图经精确渠道的参考输入传输；需要蒙版/多输入或未确认的渠道明确按文字重新生成，不换模型。移除隐藏评审重试以及 PNG 原生目标尺寸生成后的冗余升清。最后修改没有再次检查使用 `modified_unreviewed`，无效/失败评审不能显示通过。
- job 新增 `candidateProgress`，每张结果新增 `review:{limit,roundsUsed,mode,status,note}`；逐张保存，不清空部分成功结果。refine 内部保存 `generationContext` 以恢复原始需求/方案；Gateway/Core 均忽略停用视觉草稿的鉴权依赖，保留本人任务归属。
- [x] Core / shared / Gateway：本地实现与模拟验证完成；新工作流矩阵 14/14、费用与恢复专项 86/86、独立复核通过。任务共享停止屏障覆盖并发后续付费调用、检查点异常，保留安全的原异步任务查询恢复。最终证据见 `docs/workflow-v400/2026-10-09-validation.md`。共享策略源 `packages/api/src/workflow.ts`，使用 `node scripts/sync-workflow.mjs --check` 检查 Web/小程序副本。未做真实付费推理。
- [x] Web：参数保存恢复、视觉“无”、入场拦截、动态调用估算、可访问流程问号和逐候选状态；只重做教程页，其余布局保持。旧后端未声明契约时禁止新工作流提交并保留草稿。
- [x] 小程序 monorepo TS/JS：范围/视觉选项/入场预检/角色凭据/保存恢复/逐候选与评审状态同步，流程问号使用可关闭说明。仅源码测试；没有覆盖 `/Users/a1-6/WeChatProjects/miniprogram-9` 独立工作副本。
- [ ] 小程序负责端合并、微信开发者工具与实体设备验收；原生上传/审核/发布未执行。
- [ ] 真实模型效果、渠道权益与账单验证；生产部署/环境上限迁移/客户端发布均未执行。公开已发布版本仍为 3.8.1；不把本地 4.0.0 实现称为上线。


## 2026-09-28 · v3.8.1 附加更新统一归版并上线

- 用户明确授权将已发布 3.8.1 后的本会话六个附加提交统一纳入 3.8.1，并更新日志、上线。下方“下一版本 / 本地待发布 / 未授权”保留开发时点含义；本条和[发布记录](docs/releases/2026-09-28-tuyan-v3.8.1-supplement.md)为当前状态。功能 PR #237 / `f3bc73ed9a039e1cabf467c3cb12d338b5729377`。
- [x] Core / Web / 共享：通用配置、来源/分层限额、思考、命名连接/无密钥导入导出、保存可靠性、Responses/Azure/Bedrock 适配及排队/异步恢复已上线；Route v1 可选扩展协商通过生产只读检查。密钥规则和 unknown 不重发不变。
- [x] SG 出口：追加三个精确 Bedrock runtime 主机并验证 CONNECT allow/deny；没有 Azure 泛域名授权、WireGuard/全局防火墙修改或账号权限创建。
- [x] 版本日志：中英文内容追加到唯一的 Tuyan v3.8.1，保留首次日期 2026-09-27，notes 标注 2026-09-28 追加；不修改 Benchmark 独立版本和评测数据。
- [ ] Azure 实际资源主机出口与真实账号权限/付费调用：缺实际资源域名及用户账户证据，本轮没有推理/充值，不承诺账号可调用。
- [ ] 小程序原生 UI / 真机 / 微信发行：共享类型已同步，独立小程序工作树和微信副本未覆盖，未上传、审核或发布。

## 2026-09-28 · v3.8.1 后续补充：Responses 图像工具 / Azure / Bedrock / 异步恢复（仅本地待发布）

- 基线 `6ff4018`，v3.8.1 已发布状态不变；本轮内容按最新要求归入该版本后续补充，不提前回填公开日志。详见 [实现与迁移](docs/universal-api/2026-09-28/implementation.md)、[官方来源/差异](docs/universal-api/2026-09-28/sources.md)、[验收](docs/universal-api/2026-09-28/acceptance.md)。
- Route v1 增加可选 `custom.imageTool`、`azure.deploymentModel`、`bedrock.strength`；协议新增 `bedrock-converse` / `bedrock-invoke`，鉴权新增 `api-key` / `bearer-expiring`。registry 增加 `universalExtensionsVersion:1`，旧后端收到新配置前由 Web 阻止发送，保留旧路由与草稿。
- `ThinkingSelection.connection.extensions` 精确绑定工具/部署身份；复用原编译器、型号规则、任务快照与恢复。凭据 envelope 增加可选 `expiresAt`，仅与 Key 一起存在页面内存及服务端加密恢复资料，浏览器设置/文件导入导出不含它。
- fal/Replicate/BFL 与已有 Runware/TokenHub 要求持久检查点，提交前保存 submitting、获得原任务 ID 后保存；单次读超时不终止原任务，下载恢复只查询原 ID；无查询凭据的未知提交不重发。
- [x] Core / 共享：精确地址/型号/操作契约、Azure 版本和部署 header、原生 Converse/Invoke schema、图像输出校验、多参考图精修、思考及重启恢复、模拟回归。没有真实账号调用证据。
- [x] Web：现有角色弹框模板/渐进字段/到期时间，独立密钥及配置副本、导入导出/保存恢复；桌面、390/320px 实际浏览器验证。通用 API 首位、TokenDance 默认保持。
- [x] 小程序共享历史类型 / TS / JS / registry 协商字段：同步、编译和源码测试；不覆盖独立原生工作树或微信副本。
- [ ] 小程序原生配置 UI、真机与软键盘验收：需负责端合并其现有工作后接入；本轮响应式 Web 不作为完成证据，未微信发布。
- [x] 出口配置源码：SG ACL 加三处 Bedrock 精确 runtime 域名、allow/deny 测试；Core 对 Azure 资源仍强制受控出口。未新增生产环境变量。
- [ ] 生产出口/真实账号：Bedrock ACL 尚未安装；Azure 需实际资源的精确主机名，未添加泛域名授权。账号/部署/地区权益、token audience、真实推理和账单均未验证。没有 push、部署、云权限/资源修改、付费调用或充值。

## 2026-09-28 · 排队任务准入持久化与原任务恢复（仅本地待发布）

- [修复记录](docs/operations/2026-09-28-durable-job-admission.md)：已登录 createJob/refineImage 在加密快照以 majority+journal 写入成功后才提交队列并确认接收；精修记录冻结后的输入。内部新增 `admissionVersion: 1`，原 Route/执行版本/步骤指纹保持，无新增 env。
- 启动中断使用 `RUNTIME_INTERRUPTED_REVIEW` / `retryable=false`；新建排队任务在实例丢失后可明确恢复同一 ID，`recovery` 复用现有字段标明 `not_sent/not_called`。新增 `JOB_ADMISSION_NOT_STARTED` 仅表示准入前失败；快照失败不会发起模型请求。已有 unknown 调用永不因该修复自动重发。
- [x] Core：生成/精修、账号检查、失败释放、实例归属、并发恢复一次、原参数/思考与凭据恢复；全量模拟回归与检查/构建通过。没有自动重启收费任务。
- [x] Web：现有恢复入口适配“尚未开始”，只在主动点击时调用原任务恢复；非敏感设置及三角色契约未变。
- [x] 小程序源码错误指引：TS/JS 同步新旧重启错误码，构建及 121 项测试通过；既有 `recovery` 字段无需扩展共享类型。未覆盖独立小程序工作树和微信副本。
- [ ] 小程序原生恢复界面/真机验收与微信发布：沿用独立工作流，本轮未执行；Web 检查不代表原生已验收。
- [ ] 生产上线与实机故障演练：没有推送、部署、生产重启或付费调用。v3.8.1 保持已发布状态，此修复列入下一版本待发布内容。

## 2026-09-27 · 下一版本通用 API 完整配置与思考适配（仅本地待发布）

- 基于已发布 v3.8.1 + 本地 `1f2d41a` / `67f1cd6`，没有改写公开已发布日志。详见[契约、迁移与官方核查](docs/universal-api/2026-09-27/implementation.md)。
- Route v1 新增可选 `custom.limitPolicy.version=1`（service/user 分层，平台硬上限仍由共享代码控制）；提交保留物化 `inputLimits/outputLimits`，旧后端忽略扩展仍执行相同限制。旧 v1 值迁移为用户限制，不变成官方证据。
- 目录行新增可选 `metadata.version=1`：仅精确 Anthropic / Gemini / OpenRouter 地址+协议+auth 的白名单事实，带来源/身份/日期；异常 metadata 隔离、不删除有效 ID；未知兼容地址仍只保留 ID。旧响应与手动配置路径保留。
- ThinkingConfiguration v1 的 selection 新增可选 `connection={baseUrl,auth,compatibility}`。非默认通用思考须精确绑定，继续使用既有 profile、校验、服务器编译快照、adapter 和恢复链。旧客户端空 options 可用；客户端不得提交 wire/snapshot。
- Registry 新增能力协商 `universalThinkingVersion` / `universalMetadataVersion` / `universalLimitsVersion`（当前均 1）；旧后端不支持时仅非默认通用思考阻止提交，其余手动路径和物化限制仍可用。
- [x] Core / 共享：归一化、平台约束、目录元数据、真实请求体思考映射、旧空配置兼容、任务快照/恢复；本地模拟回归，不代表真实调用。
- [x] Web：保留第一阶段；增加独立连接副本/显式管理、128 KiB 无密钥文件 v2（兼容旧 v1）、导入预览及复核、分层限额、目录来源和精确思考控件。视觉模型命名保持。
- [x] 小程序共享类型 / 生成物：同步可选限额与目录类型及 registry 协商字段，保持读取历史任务；源码 TypeScript 与 121 项测试通过。未覆盖独立小程序工作树和微信副本。
- [ ] 小程序原生 UI：合并其独立工作后再补命名连接、导入/导出、分层限额、来源及新思考控件；响应式 Web 验收不代替原生/实体手机验收。
- [ ] 上线、生产后端能力协商与真实账户验证：本轮禁止推送/部署/付费探测/充值/微信发布，均未执行。v3.8.1 保持已发布状态。

## 2026-09-27 · Tuyan v3.8.1 Web / Core 正式上线

- 用户追加授权“上线”；下方待发布/未授权描述保留为开发阶段时间线，以本条和[发布记录](docs/releases/2026-09-27-tuyan-v3.8.1.md)为当前状态。功能 PR #235 / `24ed37b`，Core/Gateway/Benchmark 运行来源及固定 digest 已核验。
- [x] Core / Gateway：目录 v27 的 1,040 个静态身份、角色/协议/思考契约和历史默认逐项对照；Mongo/OSS/出口/readiness 正常，旧 `laf` 健康别名与无效环境项清理。Core admin 凭据保留，其他密钥未改变。
- [x] Web：通用 API 在三个角色列表首位，TokenDance 首次默认保持；通用配置移入模型弹框，各角色混用/草稿/非敏感保存与移动布局已上线。公开 v3.8.1 版本日志在验收后回填，Benchmark 保持独立 v2.5。
- [x] 运维：SG 精确添加 Novita 域名并验证 allow/deny；每日备份脚本与定时器保留修复、状态成功；完整 amd64 Benchmark 发布镜像在香港无网络/非 root smoke 通过。评测执行器保持 false，排行榜发布哈希、46 模型/406 样本不变。
- [x] 小程序共享目录 / 类型：已随 PR #235 合入源码；不代表小程序原生 UI 或微信平台上线。
- [ ] 小程序原生专业模式同步、真机验收及微信上传/审核/发布：沿用此前欠项；本次未操作微信项目副本。
- [ ] 新渠道真实账户权限、地区/限流、推理质量及实际账单：未验证。本次没有付费模型/Judge 调用、充值或历史评测重跑。

## 2026-09-27 · 每日备份现网修复与完整 Benchmark 运行镜像

- 用户追加授权修复现网每日备份；业务发布仍未授权。根因已实机复现：Tailscale CGNAT 防护丢弃 OSS 内网新 DNS 地址的宿主回包，旧固定网段豁免失效。
- [x] 运维：按每次上传解析的准确 IP 临时放行 eth0 上已建立的 TCP/443 回包，正常/异常/退出清理；不改全局防火墙或 Tailscale 自有链。备份运行脚本安装到 checkout 外 `/opt/paperbanana/operations/backup`，systemd 增加受锁保护的退出清理与 AF_NETLINK。归档和 checksum 上传成功后才公开本地完成文件，避免备份期间误报。
- [x] 生产备份：修复已安装，服务重跑成功；OSS 归档/校验文件完整回读 hash 一致，AES256 对象加密已核验。健康监控移除已退役域名探针。没有重启业务容器、改动数据库业务数据或恢复数据到生产库。
- [x] Benchmark：完整 linux/amd64 运行镜像本地构建通过；HTTPS + Node 内置 CA 引导系统证书、Debian 签名验证、固定 CJK 字体保留，允许通过构建参数指定 HTTPS Debian 镜像。CI 加入完整镜像的无网络非 root 验证。
- [x] Web / 小程序 / 共享契约：无需同步请求字段、模型目录或用户配置；仅部署资产与构建参数变化。无新增生产 secret / 环境变量。
- [ ] v3.8.1 仍待发布；Benchmark 镜像未推送/替换生产容器，执行器仍关闭，没有模型/Judge 付费调用。安装清单和最终镜像来源见 [修复记录](docs/operations/2026-09-27-backup-benchmark-repair.md)。

## 2026-09-27 · 彻底退役旧云平台，迁移 Node 业务核心（本地待发布）

- 以只读实机核查为准：香港 Debian 12 / 4 vCPU / 16 GB / Compose、Node 24 网关与 Core、自建 MongoDB、私有 OSS；新加坡 Ubuntu 24.04 / 2 vCPU / 4 GB / WireGuard + Squid。Sealos / Sealaf 不是运行、发布或回滚目标。见[架构](docs/operations/current-architecture.md)与[清理记录](docs/operations/2026-09-27-platform-retirement.md)。
- [x] Core / 共享：原旧目录中的现役业务迁入 `apps/paperbanana-api/runtime/handler.ts`；直接绑定 Node Mongo/OSS 并导入共享协议模块，删除云函数 SDK 替身、动态依赖面板分支、无界准入和未配置网关放行。图片必须落 OSS、校验 HEAD、走内网有界读取；Plot 使用真正中止请求的超时。历史任务、data URL、模型 ID、恢复记录和客户端平台字段仍可读。
- [x] 网关：仅接受 `PAPERBANANA_API_URL`；删除旧 URL/模式回退、旧 `laf` 健康别名、网关侧业务 admin token 和外部精修 URL 开关。健康明细使用 `backend` / `dependencies`；身份与任务 action 契约保持。
- [x] Web / 共享 API：固定认证网关，取消旧云函数/FastAPI 自动探测与备用请求；保留普通/专业模式、通用 API 作为模型渠道的独立角色设置。
- [x] 小程序源码：健康读取改为 `backend`；TS/JS 一致并本地构建/测试。未覆盖独立原生工作树和微信开发者工具副本，未微信发布。
- [x] CI / 运维源码：移除旧发布 workflow、Kubernetes NetworkPolicy 和旧域名监控；Core/Benchmark Docker COPY、守卫测试、目录生成路径同步。源平台对象导出器删除；校验既有对象包的 OSS 恢复器移至 `deploy/hk-single-host/object-restore`。
- [x] 文档：AGENTS/README/部署/监控/环境示例按现役架构重写；旧审计/迁移材料加历史标识及归档索引，不改写当时的发布哈希。
- [x] 完整 Benchmark runtime 镜像：此前 HTTP 502 阻塞已由本日后续修复解除，见上方修复条目；运行镜像本地验证通过，未生产发布。
- [ ] 生产同步：本轮未部署、未修改环境/监控/网络或删除资源。现网旧健康别名及过时环境项需另行批准同步；Novita 尚需安装 SG ACL。后续追加授权已修复每日备份、移除旧域名监控探针，见上方修复条目；其余清理尚未部署。
- [ ] v3.8.1 继续待发布；真实模型调用、支付/充值、生产部署、微信发布均未执行。旧云账户资源与账单未查询，不能据此断言云资源已清空或费用已停止。

## 2026-09-27 · v3.8.1 视觉契约复核 / Novita Ming（v27，待发布）

- 发现官网索引中未在侧栏显示的 [LongCat 视觉教程](https://longcat.ai/platform/docs/zh/image-video-understanding)，撤回“2.5 缺少识图契约”。目录/契约新增其 vision 角色，复用已有 `modelRoutes.vision` 与识图/评审/分析后重绘；LongCat 2.0 主默认保持，原来空的识图默认填入2.5。图研沿用3张/4MiB/8MP/20MB等更低额度，官方50张标明暂定。
- 用户授权新增独立 `novita` 聚合渠道，准确生图 ID `ming-image-0.1-design`，独立 Key；两种已确认方图尺寸、PNG、单次提交、已完成结果恢复、unknown 不重发。分层 API 已确认但不伪装成单图编辑。目录 v27 共1,040个静态身份；无新 env/任务协议版本。
- [x] Core / Laf 源码 / types：LongCat图文schema、思考角色、图片输入政策；百灵Flash的官方`max_tokens`补证；Novita传输/记录/恢复；独立凭据及混用模拟验证。
- [x] Web：现有识图选择器可选LongCat2.5；图片选择器可选Novita Ming；共享生成物、桌面与窄屏本地交互验证，不新增独立视觉功能。
- [x] 小程序共享目录 / TS / JS / 角色输入政策：同步两项能力、新渠道ID与排序，源码构建和测试；不覆盖独立原生3.8.0工作树或微信项目副本。
- [ ] 小程序原生专业模式通用API UI及思考设置：沿用下条未合并原生工作依赖；未进行真机验收或微信发布。本仓库当前AGENTS只保留Web/小程序客户端，已纠正初核误列Android/Windows/macOS待办。
- [x] 出口配置源码：Core精确目标与SG Squid白名单增加`api.novita.ai`，本地allow/deny回归。**生产安装未执行**，实际发布时需同步ACL。
- [ ] 发布前：账号权益/地区/限流/真实推理/实际账单，及生图分层等明确未接入项见[复核矩阵](docs/channel-audit/2026-09-27-v381/REAUDIT.md)。仍unreleased；没有push、充值、生产部署、付费调用或微信上传/审核/发布。



## 2026-09-27 · Tuyan v3.8.1 专业模式通用渠道 / 百灵 / LongCat 2.5（待发布）

- 目录 v26 新增 `antling` 官方直连渠道六个准确 API ID（6 主模型 / 1 视觉），`longcat/LongCat-2.5-Preview` 新增文本/思考适配；旧 LongCat 2.0 默认与历史配置保持。无新 env；复用 route/custom/thinking v1 和加密恢复契约。见 [来源与能力审计](docs/channel-audit/2026-09-27-v381/README.md)。
- [x] Core / Laf 共享源码 / API types：准入白名单、精确协议、角色能力、PNG/JPEG Base64、整包限制、思考字段、公开价/usage 与账单区分；三角色混合路由、加密任务恢复和收费 POST 防重模拟验证。
- [x] Web：只保留普通/专业模式，通用 API 进入每个角色的渠道；旧 `tuyan.universal-api.v1` 草稿迁移，新增非敏感角色选择保存，密钥仍按接入绑定且只随所需角色发送。首次专业模式承接普通预设，之后切换保留各自组合。
- [x] 小程序共享 TS / JS / 目录：生成 v26、渠道类型/排序、图片规则；不改小程序默认、不改微信项目工作副本。
- [ ] 小程序原生通用 API 编辑器/专业模式入口整合、新 thinking 控件及真机验收：`miniprogram-v380-parity-20260923` 存在大量尚未合并的原生 3.8.0 改动（含通用 API 编辑器/思考运行时），本工作树未覆盖或混入。负责该端的会话应先合并既有原生工作，再应用本条角色路由与新目录，并重生成该分支的思考 runtime；不能把本条共享 JS 同步当作原生交互验收。
- [x] 初核结论已复核纠正：LongCat 2.5 视觉教程和 Ming 托管链接此前漏查；最新状态以上方复核条目为准。百灵/LongCat 原厂生图编辑、真实账号验收仍有明确欠项，见复核记录。
- [ ] 发布：v3.8.1 为待发布状态；无付费调用/充值、无生产部署、无微信上传/审核/发布。公开已发布版本日志保持不变。

## 2026-09-23 · 公开排行榜恢复与 Benchmark v2.5 日志补齐

- 回归原因：前次 Pages 发布传入 `bench_enabled=false`，实际关闭了公开排行榜、方法说明和证据页；它不等于后台评测执行器开关。线上只读 API 的 46 模型 / 9 题及 releaseHash 正常，未改评测数据。
- [x] Web：公开页面改用 `VITE_PUBLIC_LEADERBOARD_ENABLED`，默认开启；Pages 输入改为 `public_leaderboard_enabled` 并明确仅控制公开内容。旧 `VITE_BENCH_ENABLED` 不再控制页面，显式新开关 false 仍可用于页面维护。
- [x] 后端 / 小程序：无接口、模型、数据或任务变更；`PAPERBANANA_BENCH_ENABLED=false` 继续只控制后台执行器，本次不部署后端、不启动评测。
- [x] 更新日志：负责人明确帕累托属于 Tuyan Benchmark v2.5，已将有部署证据的帕累托、成本说明、移动图表和双语内容从待归属草稿并回 v2.5；保留 09-17 首发日期及 09-20–21 的追加上线来源，不归入 Tuyan v3.8.0。
- [x] 公开页面恢复：既有固定版本通过 [恢复发布](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35811528627) 重新开启，只读线上桌面/390/320px 的九题方法、46 模型与帕累托验收通过；执行器和服务器配置不变。防回归与日志修改随本次代码发布，详见 [恢复与修复记录](docs/releases/2026-09-23-benchmark-public-pages.md)。不充值、不调用付费推理、不重跑任务、不发布微信版本。


## 2026-09-23 · GPT-6 Sol / Luna 与 Opus 5.5（v25，已并入 Tuyan v3.8.0 上线）

- 官方 API 已核实：`gpt-6-sol`、`gpt-6-luna`、`claude-opus-5-5`，均只开放主模型/参考图识别；既有默认、Key 绑定和历史型号不迁移。目录 v25 共 1,032 个静态型号，OpenRouter 仍走动态目录。
- OpenRouter 分别核实 5 个同步 ID（含 Sol/Luna Pro）与 5 个 `:batch`，Batch 继续隐藏。思考字段与默认值按渠道独立；“默认”仍省略字段，原契约 v1 不变。详情与逐渠道来源见 [本轮审计](docs/channel-audit/2026-09-23-openai-anthropic/README.md)。
- [x] Core / Laf 共享源码 / 共享目录：逐型号配置、请求映射、用量/公开价记录；本次新增身份无思考配置也进入既有加密恢复、防重链路。旧型号无配置行为不变，原快照与已完成结果复用。
- [x] Web：生成的精确目录、角色能力、搜索、原生思考选项和内联帮助；型号切换不携带上一型号参数，新增 OpenAI standard/pro 的显示文案。
- [x] 小程序共享 TS / JS / 目录：同步生成；保留旧请求和任务思考快照透传，不改变小程序默认模型。
- [ ] 小程序原生思考设置 UI、真机验收及微信发布：仍未完成，本轮未上传/审核/发布。
- [ ] 各渠道真实 Key、地区权限、模型调用质量、配额及账单：均未进行真实服务验收。公开目录可见不代表账号可调用。
- [x] Web / Core 上线：用户明确授权，PR #230 / `9a52aa7` 已部署；CI、固定镜像与运行来源、5 个容器健康、1,032 个静态身份及 5 个 OpenRouter 路由、桌面与 390/320px 只读设置验收通过。此次更新并入 Tuyan v3.8.0，保留 2026-09-22 原发布日期，记录 2026-09-23 追加日期和本次实际部署来源；公开日志随发布记录 PR 回填。Benchmark 执行器仍关闭，无付费推理/历史重跑/遗留 Laf 发布。见 [本次发布记录](docs/releases/2026-09-23-tuyan-v3.8.0-model-update.md)。

## 2026-09-22 · Tuyan v3.8.0 Web / Core 正式发布

- 后续用户明确授权“上线”；下方相关条目中的“本地未发布／未授权部署”保留为实施阶段记录，最新 Web / Core 状态以本条为准。版本归属与上线证据已分开核对，Tuyan v3.8.0 功能于北京时间 23:49 发布，公开版本条目在验收后回填。
- [x] Core / 共享契约：目录 v24、五家官方渠道、精确型号与角色适配、三角色思考契约 v1、任务记录与恢复；固定提交 `d40f1a8` 已部署，线上 1,029 个静态型号核对、健康与配置指纹检查通过。
- [x] Web：上述功能、统一导航/语言、模型下方思考控件、默认省略行为、分类“更多”及独立版本更新日志已上线；桌面与 390/320px 只读验收通过。3.8.0 版本记录随发布记录 PR 回填到共享日志数据，无额外后端变更。
- [x] 小程序共享 TS / JS / 目录：源码检查与 121 项测试通过，本次不代表微信平台发布。
- [ ] 小程序原生思考控件、辅助参考图/遮罩/结构化精修 UI、真机验收：仍为欠项。
- [ ] 模型真实权限、地区/限流、推理质量与实际账单：未验证。未充值、未调用付费推理、未重跑历史任务。
- [ ] 微信上传 / 审核 / 发布：未执行。独立论文画布未合并，Benchmark 执行器保持关闭。
- [发布记录](docs/releases/2026-09-22-tuyan-v3.8.0.md) · [非敏感证据](docs/releases/2026-09-22-tuyan-v3.8.0.evidence.json)。

## 2026-09-22 · 三角色思考契约 v1 与更新日志（本地未发布）

- 新增可选 `thinkingConfig={version:1,roles:{main?,vision?,image?}}`，身份绑定 provider/modelId/protocol/region；服务端校验、编译并保存 `thinkingSnapshot`，不信任客户端 wire。新“服务商默认”不发思考字段，无配置旧请求保持原样。完整 1,029 静态型号和 OpenRouter 分协议审计见 [交付与明细](docs/thinking/2026-09-22/README.md)。
- 复用现有加密任务恢复及 7 天 TTL；配置冻结、显式调用 role、并发恢复防重、成功步骤复用、unknown 不重发。最终协议/预算/图片限制失败保留 `not_sent`。原恢复描述符兼容；无新 env，缺恢复加密能力时 `thinkingContractVersion=0`。
- [x] Core / Laf 共享源码 / types / API：字段映射、默认清理、旧固定字段兼容、角色隔离、任务记录和恢复、Mistral/Gemini 可见文本解析；全模拟验证。旧独立 Laf 没有持久工作流时不开放思考控制。
- [x] Web：独立角色与精确身份偏好、设置/生成/精修、无效组合反馈、默认与未知说明；桌面与 320/390px Chrome 本地验收。新增结构化 `/changelog`，公开列表仅收录已发布 Web 历史，导航顺序与移动“更多”一致。
- [x] 小程序 TS / JS：能力版本类型、Web 任务思考配置/快照在归一化/摘要/本地记录中保留；旧请求和按任务 ID 恢复兼容，包体预算不提高。
- [ ] 小程序原生三角色思考编辑 UI 与更新日志页：本轮未移植，不因共享契约存在就宣称已完成。沿用已有辅助图/遮罩/结构化表单欠项。
- [ ] 真实账号、付费推理、成本/质量/配额及 Safari/微信真机：未验证。未重跑历史任务、未部署、未 push、未上传/审核/发布微信。


## 2026-09-22 · 官方五渠道 / Grok 4.7 / 稀宇科技展示名（v24，本地未发布）

- 新增商汤 SenseNova、阶跃星辰、百度千帆、讯飞星辰 MaaS、美团 LongCat 五个官方服务渠道，共83个准确调用ID、72主模型/25视觉/7图片角色（角色重叠，6可生图/5可编辑）。逐项区分研发方/品牌/运营方/API渠道及公开、适配、真实调用状态；不从品牌或订阅推断接口能力。
- xAI官方公告/API日志日期是2026-09-21；新增 `grok-4.7` 和 Multi-Agent 0309/滚动别名。Fast公共API ID未确认，不上架；Imagine JSON多图、费用ticks记录和生命周期补齐。原厂退役不传播到OpenRouter/fal/Replicate/Runware，聚合渠道按自身证据核对。
- `minimax`渠道主要名称统一为“稀宇科技”，MiniMax保留模型品牌/搜索别名。内部ID、API地址、区域凭据槽、默认项、历史配置与任务不迁移。渠道四类排序保持同类稳定。
- 新增逐SKU普通/订阅/地域端点、Chat/Anthropic/JSON/multipart协议与明确拒绝；提交前加密checkpoint，同步未知结果不重发计费POST，已知结果只恢复下载；价格/估算/响应费用/账单分离，无新env。商汤通用API可实现，但多用户商业后端权益尚未核准；千帆Token/Coding Plan禁止本后端；讯飞星火/WS/HiDream等独立协议逐项暂缓。
- [x] Core / Laf / 共享类型：目录、请求契约、图数/尺寸、到期与确认退役ID拒绝、费用和恢复模拟实现。阶跃10月10日/千帆9月29日按北京时间零点产品保守策略；官方未给精确时分，未伪称官方时间戳。
- [x] Web：目录/教程/选择器/凭据名称同步；桌面和390px窄屏17次型号选择、区域Key隔离、商汤多图/千帆编辑模拟成功、切换保留与不兼容拦截。
- [x] 小程序 TS / JS：同步共享目录、角色、生命周期、展示名、渠道顺序及恢复字段；原格式目录无损压缩，保持原1.5MiB包体预算及全部字段。
- [ ] 小程序原生辅助图/遮罩/结构化UI：沿用v23欠项，本轮未移植；微信真实设备及平台包扫描未执行。
- [ ] 真实账号准入、模型推理、地区/限流、商用权益和实际账单：未验证，不因Key缺失阻塞本地模拟实现。
- [ ] Web/Core部署、充值、付费推理、历史任务重跑、微信上传/审核/发布：用户本轮明确不授权，全部未执行；本轮没有push。
- [完整审计与全部已接入ID](docs/channel-audit/2026-09-22-official-expansion/README.md) · [逐型号决定](docs/channel-audit/2026-09-22-official-expansion/model-decisions.csv) · [验证记录](docs/channel-audit/2026-09-22-official-expansion/validation.md)。

## 2026-09-22 · v23 Web / Core 已发布与 Runware 出口补齐

- 用户在本地验收后明确授权“上线”；此前禁止自动部署的记录保留为阶段记录，Web / Core 固定版本已发布。继续禁止充值、付费推理与历史重跑，微信平台发布不在本轮范围。
- 新加坡 Squid 精确主机白名单补入 `api.runware.ai`，与 Core 出口目标一致；保留仅 HK 来源、CONNECT 443、私网/伪造后缀拒绝等边界。无密钥、环境变量或任务契约变更。
- [x] Core / 出口配置：补齐精确路由与 allow/deny 回归。
- [x] Web / 小程序：接口和客户端行为不变，无额外迁移。
- [x] 生产出口配置、Core 与 Web：PR #226 / `f547344`，固定镜像、正常环境审批、Pages 发布、183 个目录项及 7 个 Web 产物逐项核对、Chrome 只读精修与选择器验收通过。Benchmark 执行器仍关闭，付费推理 0；见 [发布记录](docs/releases/2026-09-22-refine-v23.md)。

## 2026-09-22 · TokenHub / MiMo / Runware 全目录 v23 与不可用型号隐藏（Web / Core 已发布）

- 核对官方目录与详情 491 项（127 / 9 / 355）；三渠道适配共 183 个 SKU，较 v22 新增 175（TokenHub 38、小米 2、Runware 135），包含主模型、视觉、生图和精修。完整逐项来源、版本/地区、未接入理由、价格及实际约束见 [全量审计](docs/channel-audit/2026-09-22/README.md)。真实调用、权益与账单均未验证。
- 按型号共享 JSON Schema/专用协议：Runware 原生 textInference/caption/imageInference；腾讯 Kimi/GLM/MiniMax 等文本差异、HY3.5 SSE、Seedream 同步、Vidu/WAND 异步。精修契约 v1 可选 `minImages` / `maskRequired`，原图占名额，多图与 mask 组合分别校验；不新增 env 或迁移历史任务。未知结果不重发计费 POST，已知任务仅查询/下载。
- 公开价、估算、响应费用与账单分离。腾讯广州与新加坡不混用账号/目录；本轮只开放已核对广州入口。TokenHub 按跨厂商聚合渠道分类，保留各研发方。未来到期按准确时间戳拒绝；不可用项从可选列表/搜索/厂商分组隐藏，旧配置、输入及记录保留，不替换渠道或型号。
- [x] Core / Laf / 共享类型：逐型号字段、尺寸、图片限制、生命周期、响应及恢复模拟验证；目录 v23 生成，无真实推理。
- [x] Web：全目录选择、停用隐藏、辅助图/遮罩/尺寸不兼容拦截、模型切换保留；浏览器本地模拟失败恢复及 WAND 多图异步精修通过。
- [x] 小程序 TS / JS：目录/角色/输入政策/生命周期/渠道排序同步；新增无损字典压缩格式，解包字段与身份一致，包体预算不放宽。
- [ ] 小程序原生辅助图、遮罩与结构化表单仍未移植；沿用上一条待办，本轮只同步共享能力/目录，不能标为原生 UI 已完成。
- [ ] 真实权限、地区/限流、实际账单、科研质量及专用多资产/风格/擦除工具工作流：本轮未验证/未开放，逐项理由见审计。
- [x] Web / Core：实施阶段禁止自动部署，后经用户“上线”授权发布，见顶部发布记录。未充值或付费推理。
- [ ] 微信上传 / 审核 / 发布：本轮未执行。

## 2026-09-22 · 科研精修控制与 Runware / TokenHub / MiMo V2.6（Web / Core 已发布）

- 共享新增可选 `refineInputs={version:1,references:[{objectKey,purpose,note}],mask:{objectKey},structured:{object,attributes,relationship,preserve}}`，严格按具体型号校验；公开任务新增 `refineInputMetadata`，所有图片和遮罩冻结为私有任务快照。`modelRegistry.refineControlsContractVersion=1` 与型号 `capabilities.refineControls` 控制 UI 开放。旧单图请求兼容；BRIA 单图不兼容尺寸明确拒绝。
- 目录 v22 新增 8 个 SKU / 3 个渠道：Runware 原生文本+视觉、Qwen 2512 生图/2511 编辑；腾讯 TokenHub HY3、HY Vision 2.0、HY Image v3；小米 MiMo **V2.6 Pro/Flash** 主模型+视觉（9 月 22 日官方发布）。新增 `runware-text` 协议标签；不改用户原路线，不宣称账号调用已验证。
- Core 工作流对 Runware/TokenHub/MiMo/fal/Replicate 加密保存恢复状态和凭据（7 天 TTL，沿用 `TOKENDANCE_ENCRYPTION_KEY`，无新环境变量）；扩展 `recovery.channel`，沿用 `providerResume`。Runware 超时只查原 UUID；同步结果未知不重新 POST。`providerCalls` 分开公开参考价、估算、渠道费用和已核对账单。Runware 加入已有海外出口主机清单；旧观猹恢复兼容。
- [x] Core / 共享类型 / 请求封装：图片所有权、总量、无损快照、遮罩黑白语义、原生 BRIA 字段、型号适配、费用与恢复字段；模拟链路覆盖，真实推理 0。
- [x] Web：辅助图上传/预览/用途、遮罩画擦撤销清除、结构化表单、按型号限制、切换保留输入、同任务恢复后继续轮询；桌面/窄屏浏览器模拟验收。
- [x] 小程序 TS / JS：同步渠道、目录、使用指南、视觉上传政策及共享字段；通用任务恢复、加密保存提示与调用记录兼容，原有单图生成/精修兼容检查。
- [ ] 小程序新增原生辅助图、遮罩与结构化表单 UI：本轮 Web 功能未移植，按 v1 控制契约后续接入；不得仅因目录存在就显示为已支持。
- [ ] 真实服务权限/地区/账单与科研质量验收：需要所选 SKU 的有效账号，未充值、未调用付费推理。
- [x] Web / Core：后续 v23 已由用户授权发布，见顶部记录。
- [ ] 微信上传 / 审核 / 发布：本轮未执行。
- [实现与边界](docs/refinement/2026-09-22-controls-and-channels.md) · [国内渠道建议](docs/refinement/2026-09-22-domestic-channel-research.md) · [本地验收](/Users/a1-6/.codex/artifacts/tuyan-refine-channels-20260922/qa/README.md)。

## 2026-09-21 · 排行榜中英文、研发厂商与共享筛选（本地未发布）

- 排行榜首次默认简体中文，语言偏好保存在 `tuyan.benchmark.language.v1`；所有公开排行榜视图使用统一词典。保留原始提示词、评语、模型 ID、评分、名次和历史证据，原始材料标明保持原文。
- 排名、维度榜与帕累托共用搜索和研发厂商条件；正式名次不随筛选重新编号。排名不使用预算或成本可用性条件；帕累托继续按当前有效集合及既有精确费用规则计算。语言 / 排名视图切换保留已挂载图表状态，模型交互使用 profile 身份。
- 工作台共享研发厂商字典新增可选 `labelEn` / `labelZh` / `nameSource` 与 `modelDeveloperName` / `modelDeveloperAliases`，中文 Google / Microsoft 显示谷歌 / 微软。规范厂商 ID 和 API 渠道分类不变；供应商渠道不作为研发厂商兜底，冲突 / 未知显示待确认，无历史存储迁移。
- [x] Web：排名、维度、帕累托、模型详情、方法说明、相关导航与搜索使用统一语言及厂商映射；中英文桌面 / 触屏模拟检查完成。
- [x] 共享类型 / Core / Laf：同步可选展示元数据及生成目录；API ID、默认配置、调用适配与历史记录字段兼容。
- [x] 小程序 TS / JS：共享字典及静态目录再生成，研发厂商中文名同步；原生排行榜未新增双语界面，本条仅同步共同映射。
- [ ] Web / Core 部署、微信上传 / 审核 / 发布：本轮按用户要求不执行；无 push，付费推理调用 0。


## 2026-09-21 · 具体模型版本、别名与调用 ID 对照（v21，本地未发布）

- 新增可选共享字段 `model.version={kind:fixed|rolling|unconfirmed,id,checkedAt,sourceUrl}`，以及仅在端点 / version 参数与配置 ID 不同时使用的 `apiIdentifier`。展示名、具体版本、调用 ID 分离；旧客户端可忽略字段，无存储迁移。
- 760 个静态条目逐 ID 记录证据，校准 95 个展示名称；调用 ID、默认项、角色、协议、能力、历史身份全部保留。DeepSeek 直连 `deepseek-flash` / `deepseek-v4-pro` 显示 V4.1 Flash / V4 Pro 0813，仍按原 ID 调用；聚合渠道不套用原厂别名映射。
- DeepSeek 通用别名的原厂版本发布日期限于直连渠道；百炼 / OpenRouter 对应关系未确认时清除该日期（含旧缓存值），保留明确日期型号和 TokenDance 独立 Preview 证据。
- OpenRouter 根据当次公开目录携带 canonical_slug；路由别名目标、字段缺失、文本 / 图片目录版本关系不能确认时保持未知，不缓存猜测目标。固定身份与滚动别名性质逐渠道审定，不从日期或系列名猜测。
- 四类渠道优先级仅用于排序；Web、小程序名称及辅助标签恢复原有风格，不增加地域前缀。同类稳定排序，保留各入口原相对顺序；百炼 / 方舟旧技术字段 `accessKind` 保持兼容。
- 小程序静态目录复用对象键列表以维持包体预算；解包后所有字段完整且对象不共享可变引用。
- [x] Core / Laf / 共享类型：版本元数据、动态目录、精确 API ID 与默认配置兼容检查。
- [x] Web：选择器及共享目录消费者展示具体版本、滚动 / 待确认标记、API ID 与来源；桌面 / 窄屏模拟目录交互通过。
- [x] 小程序 TS / JS：相同元数据、名称与版本详情，选择事件仍返回原 ID，包体与交互回归通过。
- [ ] Web / Core 部署、微信上传 / 审核 / 发布：用户要求本轮不执行；无 push，付费推理调用 0。
- [完整对照表](docs/model-version-mapping.csv) · [待确认清单](docs/model-version-unconfirmed.csv) · [展示名称变更](docs/model-version-label-changes.csv) · [核对说明](docs/model-version-audit-20260921.md) · [验证记录](docs/model-version-validation-20260921.md)。

## 2026-09-21 · 模型目录核对与 API 渠道分类排序（本地完成，未发布）

- 目录 v20 新增 20 个静态型号；6 个渠道明确停用的型号保留原 ID、默认配置与历史身份，但 `selectable=false` 并返回原因。`replacementModelId` 仅提示，不再自动改写过期或停用的实际型号。无任务记录迁移。
- OpenRouter 新审核 21 个同步型号，Batch 专用 ID 不进入同步选择与调用；TokenDance 目录缺失称为 missing，不将目录失败、缺失或权限限制自动认定为退役。
- API 渠道按服务运营方分为国内聚合 → 国内官方直连 → 国外官方直连 → 国外聚合；同类稳定排序，保留已有选择和默认值。百炼、方舟归国内官方直连；旧 `accessKind` 技术字段保持兼容。
- Replicate 新增五个精确图片型号的 schema、尺寸与输入映射；DeepSeek Flash 同步视觉输入策略。无新环境变量、密钥或数据库迁移。
- [x] Core / Laf / 共享类型与 API：目录、生命周期拒绝、图片适配与模拟测试完成。
- [x] Web：模型选择、普通/专业设置、精修和教程使用统一排序；停用当前选项显示原因，选择不自动替换。桌面/窄屏本地交互通过。
- [x] 小程序 TS / JS：同步目录、排序与默认项保留；展示字典单份打包，包体预算与回归通过。
- [ ] Web / Core 生产部署及微信上传 / 审核 / 发布：用户要求本轮不自动上线，均未执行。付费推理调用为 0。
- 逐项新增、停用、待确认与来源 SHA-256 见 [核对记录](config/model-catalog-review-20260921.json)；人类可读决策表见 [CSV](docs/model-catalog-decisions.csv)。

## 2026-09-20 · 通用 API 目录选择与生成设置优化

- `universalApiCheck(check=catalog)` 新增连接级 `connection` 和可选 `selectedModelId`；获取目录不再依赖模型 ID、能力或图片限额。旧 `route` 请求继续兼容，生成和恢复仍使用严格路线校验。
- 目录规则 `catalogFormat=auto|openai|anthropic|gemini|none`：auto 只使用已核对地址；其他服务须按文档明确选择规则或手动填写。新增部分目录、完整性、读取时间和独立 `catalogError`，不将目录可见当作推理可用，不使用任务费用错误文案。
- [x] Core / 共享 API：分页上限、逐条和跨页重复隔离、连接密钥绑定及安全传输；无新增环境变量或数据库迁移。
- [x] Web：三行等宽使用模式、统一控件、中性空表单、失焦/主动校验、搜索目录并明确选择、手动 ID 和模式输入保留；连接/密钥变化使旧结果失效。
- [x] 小程序 TS / JS：同步可选共享连接类型；不新增原生通用 API 配置入口，既有任务与恢复字段兼容。无需其他保留客户端迁移。
- [x] Web / Core 生产发布：PR #219、`837b9c2` 固定镜像与 Pages 已上线；健康、运行 revision、入口产物哈希、Chrome 空表单与只读配置检查通过。见 [发布记录](docs/releases/2026-09-20-settings-catalog.md)。
- 官方接口、状态及尚未实测服务见 [目录适配说明](docs/universal-api/catalog-selection.md)。本轮不触发付费生成或重跑历史任务。

## 2026-09-20 · 通用 API 自有服务接入 v1

- `modelRoutes.{main,vision,image}` 新增 `accessProvider=custom` 和可选 `custom` 描述符：协议、Base URL、认证方式、连接 ID、显式能力、图片输入/输出限额与尺寸映射；型号原样传递。不同地址的同名型号不共享能力。
- `modelRegistry.universalApiContractVersion=1` 仅在 Core 安全适配器可用时返回；新增认证只读 `universalApiCheck`，区分配置/目录/真实调用状态。新增 `providerResume`，兼容原 `tokenDanceResume`；`recovery.channel` 可为 custom。
- `apiKeys.custom` 是按连接 ID 组织的地址/协议/认证绑定密钥信封，仅通过受认证请求发送，不进入公开任务字段或日志。恢复快照沿用现有加密与 7 天过期机制，成功步骤复用；可只替换原连接的部分密钥。未知结果不重放。
- 七协议族同步适配器、OpenRouter/Ark 显式变体；目录逐行隔离、调用前能力与实际图片预算校验。自定义地址只接受公网 HTTPS，固定已校验 DNS 地址，禁止重定向及下载转发凭据。未新增环境变量或迁移。
- [x] Core / Gateway / 共享 API：实际生成链路、精修、错误和恢复桥接；本地模拟与类型/构建检查通过。
- [x] Web：生成设置新增「通用 API」使用模式，按角色配置，保存非敏感草稿，旧渠道/型号/输入保留。密钥仅留当前页，地址改变后重新填写。
- [x] 小程序 TS / JS：同步可选历史路线字段、通用任务恢复 action 与中文提示；自定义接入配置和新任务提交请使用 Web，本版不提供原生配置入口。
- [x] Web / Core / Gateway 生产发布：PR #216、55cb505 固定镜像和 Pages 已上线；健康、运行 provenance、契约 v1、Chrome 只读配置检查及入口产物哈希通过。见 [发布记录](docs/releases/2026-09-20-universal-api.md)。
- [ ] 微信平台上传 / 审核 / 发布：本次未操作。
- 范围、官方文档与真实调用未验证事项见 [协议矩阵](docs/universal-api/protocol-matrix.md)。本轮不进行付费推理或历史重跑。

## 2026-09-19 · 观猹 TokenDance 实时目录异常隔离

- `modelRegistry` 新增可选 `catalogHealth` / `catalogWarnings`；保留 `unavailableProviders`。TokenDance 已接入的异常型号继续返回原 ID、`selectable=false`、中文 `disabledReason`，默认 ID 不重写；其他正常模型不受单条异常影响。客户端不得把不可用型号替换成另一渠道或型号。
- 逐条区分字段缺失 / null / 类型错误 / 重复 ID，重复 ID 的所有条目隔离；未知或变化的协议不猜测、不补造。静态审核目录与实际适配器协议共同约束调用。
- 目录展示缓存 60 秒，失败退避 10 秒；最长 15 分钟的旧快照仅供诊断且全部禁止调用。实际模型调用前强制只读刷新；本地目录校验失败为 `not_sent`，支持复用原任务成功步骤，未知付费结果仍停止重放。
- [x] Core / Laf / 共享 API：中文分层错误、受限脱敏诊断、连续异常告警与恢复事件；无新增环境变量、密钥、数据库迁移。
- [x] Web：普通 / 专业模式保留选中渠道、型号和输入；异常型号显示原因并禁止使用，60 秒刷新目录；目录恢复不替换选择。
- [x] 小程序 TS / JS：保留隔离型号、提示中文原因；有原因的 TokenDance 禁用默认项仅供显示，提交继续拒绝；目录缓存不无限期有效。
- [x] Web / Core 生产发布：PR #214、`d75b5d7` 固定镜像与 Pages 发布成功；线上目录 62 个已接入型号中 60 个核验通过、2 个按原因禁用；连续异常升级 critical 已观察。见 [发布记录](docs/releases/2026-09-19-tokendance-catalog-isolation.md)。
- [ ] 微信平台上传 / 审核 / 发布：本次未操作。
- 验证及告警处理见 [目录故障修复说明](docs/tokendance/catalog-isolation-20260919.md)。


## 2026-09-17 · Riverflow V2 Pro 撤榜

- 按用户要求将准确 ID `sourceful/riverflow-v2-pro` 从公开 Scientific V2 总榜、维度榜、模型详情与逐题比较撤下；按原并列规则重排其他模型，不改分数、评语、图片或费用。
- 原始 47 模型发布版本、生成批次和审计证据保留；公开可见模型为 46 个。撤榜作为统一读取策略应用，不改写签名 release 或触发生图 / 审评。
- [x] Core：统一过滤与剩余模型综合 / 维度 / 逐题排名；不影响相近命名的 V2 Fast、V2.5 Pro、V2.5 Fast。
- [x] Web / 小程序：沿用现有公开 API，无新增端侧字段或迁移。
- [x] PR #212 全部 CI、固定镜像部署及线上核验通过：46 模型 / 414 条内嵌题位证据，三模型完整详情与九题比较页抽查一致，8 组历史集合哈希不变。见 [撤榜发布记录](docs/releases/2026-09-17-riverflow-v2-pro-withdrawal.md)。

## 2026-09-17 · Scientific V2 重评后的生成来源兼容

- 当前公开 release 的评分与原生成 batch 分开验证：只读解析 `reviewOnly.source`，逐层核验原签名会话、双审及仲裁、不可变生成证据和发布生命周期；后续增量与重测继承当前评分，仍绑定原始生成记录。
- [x] Core / 运维：复用同一来源验证器完成 freeze 与只读 preflight；不改既有签名会话、原批次或 Provider 调度。
- [x] Web / 小程序：公共接口与费用回溯保持兼容，无新增端侧接入。
- 本变更仅实现兼容性与本地验证，不包含新增模型测试、付费调用或生产发布。

## 2026-09-17 · Scientific V2 既有产物独立重评

- 新增受保护 `adminBenchmarkControl / reviewOnly` 流程：冻结当前正式 release 与准确的 40 个目标、7 个保留模型；`codex:gpt-image-2` 禁止进入新榜单。仅使用已有原图，重评记录独立于生成批次与 Provider 调度，新增生图调用为零。
- 双独立 Astra xhigh 盲审与必要的第三人仲裁按原评分轴和争议规则处理；发布克隆既有生成证据，仅更新目标评分、具体评语与派生排名，并保留费用来源和历史 release。
- [x] Core / 运维：新匿名导出、分片评审导入、完整性验证及原子发布入口；专用 localhost 管理传输，Worker 保持关闭。
- [x] Web / 小程序：沿用已有评分、评语、图片与费用 API，无新增端侧接入。
- [x] 本轮 40 模型重评、686 份独立双审与 206 题第三方仲裁完成；正式发布 `8e6619b57c6979d9c568`，47 模型 / 423 题公开评分、评语、费用及 407 张完整图片哈希核验通过，7 个保留模型与历史数据不变。见 [逐模型对照与发布核验](docs/releases/2026-09-17-scientific-v2-rereview.md)。

## 2026-09-17 · Nano Banana 单题重测账单注释

- [x] Core：追加数学公式与双语标注题新批次的精确账单证据，新增实扣 0.039 USD，模型累计 0.351 USD；旧失败题 0 USD 和原有 63 条账单证据保留。
- [x] Web / 小程序：沿用模型总费用与逐题费用字段，无新增端侧接入。
- 该注释绑定新批次、实际图片哈希和一次尝试；评分发布独立完成，账单注释不修改评分与历史 release。


## 2026-09-17 · Scientific V2 Replicate 单题重测

- 新增哈希绑定的 `slotRetest` 批次及发布来源字段：只允许显式重测一个已确认失败、账单为零的 Replicate 非 canary 题位，每次新批次仍最多调用一次。
- 只给目标题生成新盲审和公开图片；同模型其他八题及其他模型评分、依据、图片原样继承，旧失败批次不可变；费用沿来源链继承。
- [x] Core / Worker：校验目标集合、失败暂停、继承记录及发布原子性；保留历史调用费用。
- [x] Web：继续使用原模型详情与逐题费用字段，无新增交互或必填请求字段。
- [x] 其他端：无客户端请求变更，既有榜单 API 兼容，无迁移待办。


## 2026-09-17 Scientific V2 逐题账单证据

- [x] Core：补充五模型 45 个精确账单注释，保留 Sunburst / Flare 原有 18 条；总计 63 题。五模型实扣 4.029 USD，含原版 Nano Banana 数学公式失败题 0 USD。注释仅影响费用读取，不修改评分 release。
- [x] 费用校验：未产图题位的 null / 缺省图片哈希规范为同一种无图状态，并继续校验持久化输出哈希、题位状态与尝试次数；不将其他失败或未知结果自动标为免费。
- [x] Web / 小程序：沿用已发布的模型总费用、逐题费用与来源字段，无新增端侧字段或页面待办。
- [x] 本地核验：63 条注释精确绑定账单证据且原有 18 条不变；Core 513 项回归（含费用 5 项）、类型检查与构建通过。
- [x] PR #205 全部 CI、Core / Worker 固定镜像部署与线上 47 模型 / 423 题金额验收通过；运行版本 `f5e6e672fce66c2137c129546f6b5907dbc35da1`，执行器关闭。见 [发布核验](docs/releases/2026-09-17-replicate-five-models.md)。

## 2026-09-17 Scientific V2 Replicate 失败核对恢复

- [x] Benchmark / 运维：核对无产物失败后按渠道最大尝试数终结题位，Replicate 首次失败不重试；仅继续未执行题目。保留原 unknown 尝试、对账审计和预算占用，实际账单费用另行核对。恢复命令从冻结清单读取模型数，支持单模型增量。
- [x] 后端契约：沿用现有签名、状态哈希、审计、租约和事务校验；修复恢复重放读取审计内 evidence.workflowRunId 的位置。
- [x] Web / 小程序：沿用现有失败题位与费用展示，无新增字段或端侧接入。
- 本次针对原版 Nano Banana 数学公式题：Replicate 返回 failed、output=null；不重试该题，已通过只读产物与凭据核对并完成剩余四题；原失败尝试与核对审计逐字段一致，未重试。

## 2026-09-16 Scientific V2 替换描述符：生产 Shell 校验补齐

- [x] 后端 / 运维：与已合并的 TypeScript 和输入 staging 契约一致，仅允许 `openai/gpt-image-2` 替换 `codex:gpt-image-2`；Shell 与运行包 Python 校验继续拒绝其他替换对象及额外字段。
- [x] Web / 小程序：无新增字段或接入待办，沿用现有费用与榜单接口。
- 实测价格刷新在付费调用之前拒绝旧 Shell 规则；本修复不重发任何模型调用。


### [2026-09-16] 科研评测逐题费用、Replicate 五模型与 GPT Image 2 替换 — by Codex（实测与评分完成）

公开 `benchmarkModelProfile` 新增 `costSummary`，题位证据新增 `cost`（币种、精确十进制金额、账单核对 / 官方单价核算 / 预算估算 / 未调用 / 未知）；费用作为读取时注释，不改变历史 release 的评分与哈希。新增受限 `replacesModelId=codex:gpt-image-2` 描述符，仅允许 Replicate `openai/gpt-image-2` 完成九题、双审后原子替换；历史 release 保留。其余四型号为 Nano Banana 2 Lite、2、Pro、原版。追加模型仅对签名的目标题位启用，旧签名清单维持原始语义。目录 v19 增加 Lite；Replicate Pro 禁止回退，Nano 2 关闭搜索。每题最多一次生成调用，常驻 Worker 关闭。
- [x] Web：模型费用合计、逐题金额与费用依据展示，未知金额不计为零；兼容单次调用失败题位
- [x] Core / Benchmark：模型与尺寸绑定的官方价格验证、历史费用来源回溯、精确输出绑定的账单注释、单模型替换 CAS
- [x] 小程序 / 共享目录：生成目录与 API 路由同步；排行榜费用详情当前为 Web 页面，无新增小程序原生页面
- [x] 真实五模型 45 次唯一提交、44 张成功图与 1 次失败（未重试、未扣费）；Astra xhigh 双独立盲审及必要仲裁完成，账单实扣 4.029 USD。正式榜单 47 模型 / 423 固定题位，GPT Image 2 已替换旧 Codex 型号；分数、评语与公开图片哈希校验通过，见 [实测记录](docs/scientific-v2-replicate-five-models.md)。
- [x] 最新账单注释版本 CI / 固定镜像生产发布通过；全量模型 API 与五个新模型费用页面验收完成（基础费用 UI 由 PR #202 上线，账单证据由 PR #205 部署）。


### [2026-09-16] 参考图按需选择、模型预算与中文失败恢复 — by Codex（Web/Core 已上线）
修复自动检索固定 10 张与规划模型 8 张平台额度冲突。检索按图示类型、相关性和互补性返回 0–预算上限张；服务端统一校验上传与检索图片的实际数量、字节、尺寸和请求编码大小，规划文字只引用实际采用的参考图。新增可选 `failure`、`referenceSelection` 字段；旧 `error` 保留为中文兼容文本。无新增环境变量或密钥。
- [x] Core / Laf / 共享 API：按实际主模型能力与阶段预算处理；结构化错误区分本地未发送、渠道拒绝与请求结果未知；参考图数据及成功阶段保留；不自动重发结果未知的付费 POST。
- [x] Web / 站长后台：显示步骤、具体原因、处理建议、费用状态；当前任务显示实际参考图数量；手动选择数量标注为候选上限。
- [x] 小程序 TS / JS：接收中文错误、费用和选择结果；详情页呈现，保留旧任务兼容性。当前上传与检索互斥产品规则不变，服务端仍防御合并输入超限。
- [x] 本地验收：Core 507、Web 393、小程序 119、共享与源契约 51 项通过；类型检查、构建、生成漂移、隔离 Mongo 和浏览器组件验收通过。详见 [修复及验证记录](docs/reference-selection-repair-2026-09-16.md)。
- [x] PR #200 / `2295cc15d9937c0cb0b3c9adebd911aca06b42c0` 已完成主线 CI、固定镜像、正常 production 审批、HK 和 Pages 发布；5 容器健康，线上 HTML/JS/CSS 与产物一致，原失败任务中文原因/费用未知/停止重放提示可见。详见 [发布记录](docs/releases/2026-09-16-reference-budget.md)。恢复格式升级为 `tokendance-workflow-v2-reference-budget`：旧版执行记录保留，不能自动重放；必须核对旧调用及费用后处置。未核对原失败任务账单，未进行付费模型调用或微信上传发布。


### [2026-09-16] Replicate GPT Image 2.5 Scientific V2 增量评测 — by Codex

已完成：正式评测新增 Replicate 的 `openai/gpt-image-2.5-sunburst`、`openai/gpt-image-2.5-flare`，沿用单模型增量冻结及双独立审评，每模型固定 6 生成 + 3 编辑。旧三渠道签名批次保持原样校验；新 Replicate 题位每题仅一次提交、未知结果停跑。原生默认 `quality=auto`、单张 PNG、16:9，价格须从官方当前 auto 档重新抓取并签名。用户两模型合计预算 10 USD，按预测 ID 留存美元费用与账单核对状态。新增可选 Worker 凭据 `PAPERBANANA_BENCH_REPLICATE_API_TOKEN`，常驻 Worker 保持关闭。

- [x] Benchmark Core / Worker / API 与部署脚本回归（67 / 193 / 492 项及运维 92 项通过）
- [x] 真实 18 题全部成功、双独立盲审及必要仲裁；账单实扣各 2.25 USD，总计 4.50 USD
- [x] 正式扩榜 41 → 42 → 43；旧模型非排名字段一致性与 Chrome 验收通过，见 [发布记录](docs/releases/2026-09-16-replicate-image25-benchmark.md)
- [x] Web：方法页兼容三 / 四渠道签名方法数据，展示 Replicate 单次提交限制与预算；原三渠道批次继续可读
- [x] 小程序：无新增客户端字段；已有两型号目录及 Replicate 图片适配沿用

### [2026-09-15] 小程序观猹身份接续生产补发 — by Codex
PR #196 已合并，生产 Web / Gateway / Core / Benchmark 发布 `4077ddc60a0d7814a0c6a2ff0484fbae46c3413c`，补齐小程序身份接续接口。`mini-status` 从 404 恢复为 200，能力标志可用；没有新增环境变量或 Key，原回调地址和 TokenDance 消费授权保持。详见 [发布与验收](docs/releases/2026-09-15-miniprogram-watcha.md)。
- [x] Gateway / 运维：CI、固定镜像、正常 production 审批、香港健康与 Web Pages 发布通过
- [x] 微信小程序：开发者工具“已绑定观猹”，真实 wx.request → Chrome 官方观猹 → 一次性接续兑换成功；原账号、消费授权和原会话保持
- [x] Web / Core / 共享契约：既有身份、邮箱、模型与消费接口兼容；隔离 Mongo 和生产无付费 smoke 通过
- [ ] 物理手机跨应用验收，以及新版微信体验版 / 审核 / 正式发布（平台状态单独核实）

### [2026-09-10] 小程序 3.3.0 观猹身份与浏览器接续 — by Codex
在已验收小程序 3.2.0 上合并 Web/Gateway #193–#195，新增独立身份入口、首次邮箱验证、显式绑定、验证码解绑与无密码账号注销。Gateway 新增 `/api/auth/watcha/mini-status`、`mini-start`、`mini-launch`、`mini-exchange`、`mini-cancel`；发起 Cookie 与浏览器独立一次性接续码共同兑换，回调仍为已登记路径。`mini-status` 增加 `miniProgramSupported`，旧网关回退邮箱登录。复用现有邮箱管理接口和生命周期，身份与 TokenDance 消费授权保持独立；无新增环境变量、模型或供应商凭据。详见 [设计、接口与交付](docs/miniprogram-watcha-2026-09-10.md)。
- [x] 小程序源码 / JS：身份登录和账号管理，保留原工作台输入/模型选择/任务，晚到响应写 Cookie 前校验 owner/epoch
- [x] Auth Gateway：短期双凭据接续、一次兑换、原会话绑定、精确原生来源、取消/过期、限流、维护模式与生命周期；Web 原接口兼容
- [x] Web / Core / Laf / 共享模型：沿用既有身份和消费契约，无本轮额外适配；官方图标复用
- [x] 本地原生 5 场景；源码与上传副本各 91/91、Gateway 148/148、隔离 Mongo 14+7 组、48 组 TS/JS 一致；201 个受控文件 checksum 一致（新增 9 / 更新 22 / 删除 0），9 个本机文件保持，实际开发工具为 3.3.0。见 [验证证据](docs/evidence/miniprogram-3.3.0/validation.json)
- [x] Gateway 补充部署及开发者工具与 Chrome 真实身份接续验收（2026-09-15，4077ddc，见顶部发布记录）
- [ ] 物理手机跨浏览器身份验收；微信新版上传/审核/正式发布单独安排



### [2026-09-10] 小程序 3.2.0 对齐观猹账户与上传 v2 — by Codex
在已本地验收的 3.1.0（8344611）上合并主线 8c23a38，保留既有账号安全、四字段优化、原图精修、结果导出与账号隔离；吸收 #188/#189/#191 的观猹授权、v18 目录与上传 v2。图研登录与观猹渠道连接分开；新增账户 tab，保留工作区输入与原任务往返。新增账户/订单晚到响应、待核对重复创建、直接编辑尺寸、签名期限、原生返回栈等回归。
- [x] 小程序源码 / TypeScript 与 JavaScript：账户授权/余额/记录，62 个 TD 模型，四处优化使用服务端授权，生成/精修上传 v2，原 jobId 恢复与具体错误指引
- [x] 继承 3.1.0 与 3.0.1 修复：邮箱验证/找回/修改密码/删除与生命周期，refine 上传取消/结果、owner 隔离、图库和导出
- [x] 全部小程序测试 84/84、共享源契约 3/3、类型检查/构建、46 组 TS/JS 与生成漂移检查；原生账户、四字段优化、参数与原任务恢复场景验收通过（模拟消费响应）
- [x] 本地上传副本：192 个受控文件 checksum 相同（新增 11 / 更新 58 / 删除 0），9 个本机额外文件保持；副本 84/84，实际开发者工具显示 3.2.0 / v18 / 上传 v2；未微信上传。见 [完整证据](docs/miniprogram-parity-2026-09-10.md)
- [ ] 微信真机跨浏览器授权/支付、真实付费模型调用；微信上传、审核、正式发布另行安排
- [ ] 观猹身份登录与管理价格凭据：不是渠道授权，本轮不新增接口；生产后端未变更

### [2026-09-10] 观猹 OAuth 登录已发布并完成真实联调 — by Codex
Web、Auth Gateway、Core 与 Benchmark companion 发布 `3405f8ccbc2fe72f555831f96853c1fb99dfb747`（PR #193 / #194）。独立身份登录已启用，正式回调 `/api/auth/oauth2/callback/watcha`；配置仅在服务端保存。详见 [发布与联调记录](docs/releases/2026-09-10-watcha-oauth.md) 和 [结构化证据](docs/releases/2026-09-10-watcha-oauth-evidence.json)。
- [x] Gateway / HK：专用客户端、邮件服务、观猹 TCP 443 出口、正常审批、固定镜像、健康和隔离检查；原有稳定密钥及其他配置保留
- [x] Web / 身份：真实官方授权和回调、原账号显式绑定、退出后观猹登录返回相同用户 ID；真实邮件验证码解绑成功后恢复绑定；原输入和 TokenDance 连接保持
- [x] 发布产物：15 个正式站文件与 artifact 一致；桌面和 390px 手机登录入口视觉验收
- [x] Core / Laf：用户 ID 和消费 action 兼容，无新增端侧迁移
- [ ] 新用户注册、无密码注销使用独立真实测试身份的操作（本地回归已覆盖）；小程序新增登录入口和平台发布仍暂缓，未进行付费模型或支付调用

### [2026-09-10] 观猹生产网关出口补齐 — by Codex
真实发布预检发现网关原仅放行 DirectMail，导致观猹 token/userinfo 请求被拒绝。出口规则加入 `watcha.cn` 解析得到的公共 IPv4 的 TCP 443；任一目标 DNS 异常时保留上一套规则，五分钟刷新同时覆盖邮件和观猹。
- [x] HK / Gateway：双目标白名单、原子替换、目标解析失败与第二目标私网地址回归；发布 smoke 实测两处 TLS，并验证通用公网仍被拒绝
- [x] Web / 小程序 / Core / Laf：无 API 字段和客户端契约变更，无端侧待办；小程序平台发布仍暂缓
- [x] 生产部署和真实观猹授权验收（见顶部发布记录）

### [2026-09-10] 观猹 OAuth 身份登录接入（已发布，见顶部记录）— by Codex
新增独立观猹身份登录，与 TokenDance 模型消费授权分开；保留原图研用户 ID、邮箱登录与数据归属。官方已签发图研专用客户端，凭据仅保存于仓库外私有配置。代码默认关闭，生产已显式启用；正式回调及真实授权已验证，详见顶部记录。
- [x] Gateway：`/api/auth/watcha/{status,start,email-code,complete,link,unlink,delete-confirmation}`，固定回调 `/api/auth/oauth2/callback/watcha`。状态包含 `available/linked/hasPassword/emailVerified/pending`；原注销接口新增可选 `confirmationToken`（一次性、绑定会话），密码确认继续兼容
- [x] Web：弹窗授权保留工作台，首次邮箱验证码注册、已有账号明确绑定、邮箱验证码解绑与无密码账号注销。Web 仅接收完成通知，再读取服务端状态；密钥和上游令牌不进入浏览器
- [x] 配置与生命周期：新增 `WATCHA_OAUTH_ENABLED`（默认 false）、`WATCHA_CLIENT_ID`、`WATCHA_CLIENT_SECRET`、`WATCHA_OAUTH_SCOPES`（默认 `read email`）；开启需邮件服务。唯一身份绑定、一次性 state/S256 PKCE、验证码限次/过期、注销冻结与恢复边界保护
- [x] 独立规范与质量审阅；Gateway 148、Web 391、Watcha 隔离 Mongo 14 组及原生命周期回归通过；桌面/390px 浏览器首次注册、回访登录、原 ID 显式绑定、解绑、无密码注销与输入保留通过。见 [本地验收](docs/tokendance/watcha-login-validation-20260910.md)
- [x] 生产配置、部署、正式观猹授权和邮件验收；未创建支付、未调用付费模型（见顶部发布记录）
- [ ] 小程序 / Android / Windows / macOS：保留原邮箱登录；新增身份入口需各端单独适配安全回调与会话接续，小程序平台发布继续暂缓。Core / Laf 无新增模型消费 action；既有用户 ID 契约兼容

### [2026-09-10] 默认模型、主导航与参考图上传 v2 生产发布完成 — by Codex
Web、Node Core、Auth Gateway、Benchmark companion 已发布 `487e3e07bbe368ebd4ec1cfaf66373b83bae8c56`（PR #191）。Web 初始实际选中观猹 TokenDance / `seedream-5.0-pro`，账户位于生成候选图 → 任务记录 → 精修图片 → 账户 → 使用教程第四项，往返保留工作区输入和选择。原图平台额度已启用 8 张 / 20MiB / 80MiB，单边 16384px 且单张 32MP；SVG 5MiB、精修单来源。实际模型提交仍按所选消费者策略。详见 [发布记录](docs/releases/2026-09-10-reference-upload.md) 和 [结构化证据](docs/releases/2026-09-10-reference-upload-evidence.json)。
- [x] 发布门禁：最终 CI、三轮自动评审的 12 项修正及最后差异复核、固定镜像、正常 production 审批、HK 和 Pages 部署成功；不宣称第四轮自动评审通过
- [x] 生产配置 / 契约：三个额度显式更新；发布 SHA 元数据同步；稳定 TokenDance 主密钥及其他配置保留；五服务健康、无新增重启/OOM，Bench 执行仍关闭
- [x] Web / OSS 验收：桌面、手机默认选中/顺序/账户往返/超限保留；真实 8 张、20MiB、80MiB、+1 边界及并发繁忙重试通过，25 个验收对象全部清理，零付费模型调用
- [x] 发布产物与数据：HTML + 11 JS/CSS 与 artifact 相同；静态 739 型号及 690 策略核对，图库 306/排行榜保持；OpenRouter 新增 `deepseek/deepseek-v4.1-flash` 单列为上游动态变化
- [x] Core 492 / Web 380 / Gateway 140 / 小程序 29 及共享合约、类型检查、构建和生成漂移检查通过；小程序源码/JS 同步
- [ ] 真实模型消费和科研细字质量、未公布的精确输入能力；小程序开发者工具/真机与平台发布继续暂缓，观猹身份登录继续暂缓

### [2026-09-10] 参考图发布边界复核：签名期限与 Seedream 短边 — by Codex
Seedream 直接编辑的最小短边统一为 15px，与下游严格大于 14px 的实际检查一致；最后一道校验也使用确定的输入错误，避免误报未知消费。Web 生成/精修 PUT 使用既有 expiresAt 的剩余签名窗口（默认约 15 分钟，预留 5 秒完成确认），过期队列在发请求前停止并保留选图。小程序同一 deadline 计算，客户端单次最多 10 分钟；源码与 JS 同步。无新增服务端字段、签名时长或外部权限。
- [x] 共享策略 / Core / Web / 小程序：15px、剩余期限、过期检查和对应回归
- [x] Gateway：透传既有 expiresAt，JSON 与 finalize 超时不变
- [x] 最终 CI / 合并前差异复核 / 固定镜像 / 正式站验收（487e3e0，见顶部发布记录）


### [2026-09-10] 参考图复评修正：输入错误与付费恢复分离 — by Codex
后台参考图内容、解码、模型尺寸/字节预算等校验使用明确的输入错误类型；没有未确认调用时任务以具体输入错误结束，不再显示付费结果不确定，不允许原参数恢复。存在 running/unknown 调用时仍维持核对记录保护。错误内容继续按任务 Key 脱敏。Core 环境模板补齐 8 张、20MiB、80MiB；小程序尺寸检查期间禁用提交和重复选图，成功/失败均解除状态。无新增 API action 或恢复枚举。
- [x] Core / Laf / 任务恢复：校验分类、错误展示、未知调用保护及回归
- [x] 小程序源码 / JS：检查状态、提交处理器保护、异步成功/失败行为回归；平台发布继续暂缓
- [x] Web / Gateway / 共享类型：沿用具体任务 error 和现有 recovery 字段，无需新增分支
- [x] 最终 CI / 三轮自动评审问题修正及末轮差异复核 / 固定镜像 / 生产与浏览器验收（487e3e0）


### [2026-09-10] 参考图上线评审修正：后台等待与精修来源边界 — by Codex
Core 已接收的后台任务等待单个图片处理空位，HTTP 上传确认仍在繁忙时返回可重试 429；等待期间不读取图片字节。无需旋转/缩放且符合所选模型格式的 JPEG/WebP 保留原字节。百炼提交额度同时覆盖旧 VL 兼容回退（8MB/32MB、4096px/8MP），模型请求预算使用实际请求型号。新增数量/合计环境变量启动校验。精修仅接受已完成上传或账号内任务图片；Gateway 的旧 `PAPERBANANA_ALLOW_LEGACY_EXTERNAL_REFINE_URL` 不再允许任意外链，Core 也在入队前拒绝，以免回滚到 Laf 时产生服务器任意地址抓取。合法账号内 OSS 签名链接仍归一到 objectKey，实际图片格式按字节识别。
- [x] Core / Laf / Gateway：并发、格式、回退与来源校验修正及回归
- [x] Web：选择文件后立即进入检查状态，期间禁止提交和重复选图；账户/工作区保留不变
- [x] 小程序 / 共享策略：生成策略和提示同步；现有精修均使用已归属任务 objectKey，调用字段不变
- [x] 修正后完整 CI、三轮自动评审问题修正、生产发布和验收（487e3e0）

### [2026-09-10] 参考图上传 v2：原文件与模型提交额度分离 — by Codex
共享契约新增 `referenceUpload={version:2,checkedAt,platform}`、模型 `capabilities.referenceSubmission`，并将 `refineUpload` 升级为 v2。平台默认原图 8 张、单张 20MiB、合计 80MiB、单边 16384px/32MP；SVG 原文件仍 5MiB 且文字需转曲，精修仍单来源。实际提交数量、字节、尺寸按读取图片的 main/vision/image 路由决定；不把生图模型多图能力误用于提示词规划。旧客户端字段保留，新客户端连接旧后端按旧额度。新增 `PAPERBANANA_MAX_REFERENCE_TOTAL_BYTES`；已有生产 3/5MiB 环境值需要发布时显式调整。Gateway finalize 超时 40s，OSS 直传不扩大 JSON body。详见 [核查、方案与验证](docs/reference-upload/2026-09-10-audit.md)。
- [x] Core / Laf：数量、单图、总量、尺寸、实际解码及模型请求预算；每次一个图片处理，忙时可重试；保持生命周期/归属校验，修复 vanilla 主模型读图链路
- [x] Web：最多两个并行 PUT，动态额度/处理提示，模型切换保留文件，账户往返保留输入和模型；桌面/手机浏览器验收
- [x] 微信小程序源码 / 编译 JS：原图选择、尺寸/合计校验、注册表字段和模型提示，精修按真实消费者显示；类型检查及契约测试
- [x] 共享策略 / 生成器 / CI 漂移检查 / 部署默认配置；静态 21 渠道 385 个型号/工作流策略映射（不等于供应商全量实测）
- [x] Core / Gateway / Web 生产发布、环境值更新及真实 OSS 大文件验收（487e3e0，8 张 / 20MiB / 80MiB 已启用）
- [ ] 真实供应商调用、未公布额度确认及科研文字质量验收；微信开发者工具/真机和小程序发布（沿用暂缓）


### [2026-09-09] 观猹 TokenDance 生产发布完成 — by Codex
Web、Node Core、Auth Gateway、Benchmark companion 已发布 `2c518f97c06c3fc0149c299244c3489db232b531`（PR #188/#189）；SG 仅增加 tokendance.space 精确出口规则。账户工作区、62 个接入型号、渠道置顶与目录 v18 同步上线。修复目录预检恢复、retryAt 入队保护、重新授权后订单查询及小程序优化结果契约。用户授权 Key 使用服务器稳定加密主密钥，未迁移本地 Key；管理价目仍缺独立凭据，观猹身份登录继续暂缓。
- [x] 生产发布：主线 CI、自动评审、固定镜像、production 审批、香港后端和 Pages 成功；5 个服务健康，Core/companion provenance 一致，Bench 执行关闭
- [x] 生产契约：739 个静态型号、22,000 个字段及排序与源码一致；TokenDance 62（主模型/优化各 60、视觉 27、生成/精修各 2）；授权/支付/恢复索引及加密配置核验通过
- [x] Web 验收：桌面/窄屏真实页面、各角色渠道置顶、DeepSeek 新版排序、账户往返输入/路由保留、Pro/Lite 精修参数；现有正式图研登录和空充值记录读取正常
- [x] 既有数据与产物：图库 306、排行榜内容未变；HTML 及 11 个 JS/CSS 与 Pages artifact 摘要一致；详见 [发布记录](docs/releases/2026-09-09-tokendance.md)
- [x] 小程序源码/JS 与共享契约同步；Core 481、小程序 28、隔离 Mongo 等回归及完整 CI 通过
- [ ] 生产用户 TokenDance 授权、真实生成/精修消费、充值到账与到账后恢复（本轮零付费模型调用、零支付创建）
- [ ] 产品方管理价目凭据与未公开额度/撤销/结算接口；观猹身份登录暂缓
- [ ] 小程序开发者工具/真机跨应用、上传、平台审核与发布（继续暂缓）

### [2026-09-09] TokenDance 上线前恢复流程修正 — by Codex
共享契约：任务恢复新增 `retry_request`，仅用于付费请求发出前的实时目录预检失败；已发出请求但结果不确定时继续禁止自动重试。`tokenDanceResume` 在入队前校验 `recovery.retryAt` 并用原子条件保护，过早恢复返回 429 和剩余等待秒数。支付状态只在旧 Key 明确失效时使用当前用户的新 Key 重试一次 GET，不重发创建订单请求。没有新增 env、权限、型号或 OAuth 身份接口。
- [x] Node Core / Laf / 共享 API 与类型：预检错误分类、恢复等待、重新授权后的订单查询；复用已完成调用与用户隔离保持
- [x] Web / Auth Gateway：沿用现有恢复按钮、倒计时与错误 DTO，兼容新增 action，无需修改
- [x] 小程序源码及 JS：原任务恢复倒计时与页面往返、错误反馈；优化输入采用既有 `optimizedText` 字段，保留取消和编辑冲突保护
- [x] 验证：Core 全量 481 项、小程序 28 项、隔离真实 Mongo 回归通过；Core 类型检查/构建与目录一致性通过。包括目录 503/超时/损坏、付费响应丢失、旧 Key 401/403 与网络/5xx、原任务等待及优化稿采用/取消
- [x] CI、最终镜像、生产部署与验收（原部署取消后，已修正并发布 2c518f9；见顶部发布记录）
- [ ] 小程序真机验证和平台发布（继续暂缓）；观猹身份登录继续暂缓

### [2026-09-09] 账户工作区、观猹 TokenDance 展示与目录排序 v18 — by Codex
共享变更：用户可见渠道名称改为“观猹 TokenDance”，新增集中维护的稳定置顶规则，仅调整展示顺序，不替换默认/已选路由。目录 v18 保持 739 个静态型号、TokenDance 62 个接入型号；补齐已审阅版本序、预览/稳定/日期快照元数据，未知日期仍为 null，同代同日平局使用稳定 ID，API 数组顺序和选中状态不参与年代推断。`releaseKind / lifecycleSourceUrl` 为可选目录字段；`tokenDancePayments` 增加可选 ISO `createdAt / checkedAt`。内部 `tokendance`、金额单位、用户身份绑定、`app_url` 和 `X-App-URL=https://www.paperbanana.asia/` 不变，无新增 env 或认证 action。
- [x] canonical catalog / 共享类型 / API：版本、审计、展示来源同步；目录生成无漂移，名称变化纳入实时差异审阅
- [x] Node Core / Laf / Auth Gateway：新元数据及订单时间返回，用户可见错误名称同步；权限与加密凭据边界沿用原契约
- [x] Web：独立账户页、紧凑状态入口、充值记录逐笔查询、任务组件保留、普通/专业/各角色置顶与排序、桌面和窄屏验收
- [x] 小程序源码及 JS：共享排序、渠道名称、账户入口/账号隐私/返回、充值记录与逐笔查询；编译及回归通过
- [x] 验证：Web 372、Core 479、Gateway 140、共享/Laf/仓库 51、小程序 26；隔离 Mongo 集成及真实账号本地余额只读核验通过，详见 [体验与验证记录](docs/tokendance/account-experience-2026-09-09.md)
- [ ] 观猹身份登录：按用户指示暂缓，不纳入 TokenDance 发布；主要协议缺口已解决，仍待图研身份应用资格/凭据、表单类型映射和回调匹配确认；运行代码未更改，见 [研究与具体缺口](docs/tokendance/watcha-login-research.md)
- [x] Web/Core/Gateway 生产部署与桌面/窄屏验收（2c518f9，见顶部发布记录）
- [ ] 真实模型生成/精修/充值到账验收（未执行付费调用）
- [ ] 小程序开发者工具/真机跨应用验收、上传及平台发布（未执行）

### [2026-09-09] TokenDance 本地预览改接正式账号服务 — by Codex
根据用户要求，本地真实消费预览从独立账号库改为使用正式图研账号。固定 loopback 账号代理校验本地 Host/Origin，只转发允许的账号操作到固定正式 HTTPS 接口；上游 Cookie 加密保存在本机，浏览器仅保存 HttpOnly 随机会话标识，受保护请求重新确认正式身份及账号生命周期。注册/找回密码保留正式站点回调，解决独立本地认证拒绝该地址产生的 Invalid redirectURL。正式账号管理引导回正式站点；本次预览任务、图片和 TokenDance 授权仍在本机，绑定正式账号不可变 ID。未修改线上部署、正式 CORS 配置或公开 API 契约。
- [x] 本地运行器 / 账号代理 / Web 提示与账号入口，见 [本地消费预览](docs/tokendance/local-preview.md)
- [x] 代理 9 项回归、Web 367 项及构建；正式服务匿名查询与随机不存在账号的负向登录通过，未自动创建正式账号或发送邮件
- [x] Core / 共享类型 / 小程序兼容性核对：沿用既有可信身份和 TokenDance 契约，无本轮修改或小程序发布
- [x] 用户已自行完成正式图研登录和 TokenDance 授权；本轮读取现有登录态、连接和真实余额成功
- [ ] 用户模型消费与充值到账验收（本机暂无任务和充值记录，待用户自行发起）

### [2026-09-09] TokenDance 本地真实消费预览 — by Codex
新增本机运行器：真实 Better Auth、本地持久 Mongo 与签名文件存储，正式 Gateway/Core 和真实 TokenDance OAuth/余额/模型/支付适配器。稳定加密配置保存在仓库外的私有目录。仅开发环境使用 VITE_LOCAL_CONSUMPTION_TEST 展示消费提示，并初始选择 TokenDance、单候选、零评审；没有新增生产 API 契约。用户自行授权和点击发起消费，未部署生产。
- [x] Web 本地入口、运行器及说明，见 [本地消费预览](docs/tokendance/local-preview.md)
- [x] 本地真实注册/登录、S256 入口和取消、匿名/Origin/Host/文件签名边界
- [x] 用户自行完成真实 TokenDance 授权，已复核连接与真实余额
- [ ] 模型消费和支付验证（待用户在页面操作；不将本地登录或余额查询当出图/到账证据）

### [2026-09-09] TokenDance 独立渠道、授权钱包与可恢复任务 — by Codex
目录 v17：在原 677 个静态型号上新增 TokenDance 62 个独立型号（60 主模型及输入优化、27 参考图识别、2 生图及直接精修；角色有重叠），逐一审核当前实时 93 个型号，31 个不映射现有能力的型号在覆盖清单逐项说明。主源为 `config/tokendance/catalog.json`，由 `sync-model-catalog.mjs` 生成 Core/Web/小程序目录；新增公开 API 差异检查脚本，运行时 15 分钟刷新已审核型号的存活和协议状态。分润不参与目录或推荐筛选。
共享契约：新增 `tokenDanceStatus/Authorize/Exchange/Cancel/Disconnect/Balance/PaymentCreate/PaymentStatus/Payments/Resume` 和仅站长使用的 `adminTokenDancePricing` action；Gateway 要求图研登录，给 Core 传受保护的不可变用户 ID。用户 Key 经 S256 PKCE 交换后只在 Core 加密保存，禁止客户端自带 TokenDance Key；`app_url`、`X-App-URL` 固定为 `https://www.paperbanana.asia/`。钱包为整数微元，充值 amount 为整数人民币元；支付状态接口确认到账。增加 job.recovery/providerCalls，按原 jobId 复用已完成的模型调用；结果不确定时禁止自动重试。扩展 1.5K/3K 以及 Seedream Pro/Lite 各自尺寸契约。新可选 env 见 Core `.env.example`，用户 Key 与管理凭据完全分开。
- [x] canonical catalog / Node Core / Laf 共享处理器（文本/视觉/Ark 独立适配、归因、加密授权、支付、步骤恢复与注销清理）
- [x] Auth Gateway / 共享 API 与类型（登录/内部身份/站长边界、金额单位、错误/恢复 DTO、历史记录识别中断执行与旧进程队列）
- [x] Web（连接、钱包、桌面二维码/移动支付宝、完整选择器、生成/精修/优化、任务恢复、站长价目）
- [x] 小程序源码与编译产物（系统浏览器授权链接/一次性 code、钱包、系统浏览器充值引导、错误与原任务恢复、模型角色和尺寸同步）
- [x] 本地契约及浏览器验收，范围及测试环境见 [验证记录](docs/tokendance/validation.md)
- [x] 隔离真实 MongoDB 8.0.16 联调（一次性交换、加密落库、TTL/订单唯一索引、新连接/执行器恢复、并发 CAS、注销清理）；上游模型与支付仍为测试桩
- [x] CI 加入隔离 Mongo 回归、现有每日目录差异工作流加入 TokenDance；Core 与新加坡 Squid 的 tokendance.space 精确域名规则同步；生产代理已更新并验证，见顶部发布记录
- [x] 本地预览的用户自行 OAuth 授权及真实余额读取（见后续账户体验记录）
- [ ] 供应商出图/精修、支付到账与产品方管理价目联调（消费需用户在本地预览提交；管理价目仍缺独立管理凭据）
- [x] Web / Core / Gateway 与出口代理生产部署（2c518f9，稳定主密钥已配置；独立管理凭据只影响站长价目）
- [ ] 微信开发者工具、真机授权/支付宝跨应用验证、上传与平台发布（未执行）


### [2026-09-09] 微信小程序 3.1.0：补齐 v16 Web / 后端契约并保留 3.0.1 安全能力 — by Codex

基线：权威仓库 `yrjmdqmmx/Tuyan`，主线 `27aa954d168e7e0ed05d6b2251965161f8d66e30`。在隔离分支 `codex/miniprogram-parity-20260909` 合并旧 3.0.1 的 16 个提交（保留合并 `947b0bd`）；不能用主线旧版本号覆盖此前账号修复。逐项缺口与代码/PR 依据见 [审计及验收记录](docs/miniprogram-parity-2026-09-09.md)。

本轮是已有线上契约的小程序消费方补齐，没有新增生产后端契约、部署、数据库或平台发布操作。
- [x] 账号：保留验证重发、找回/修改密码、冷却提示；新增仅内存验证状态观察（不消费邮件 token、不自动登录）与生命周期 v3 状态门禁，202 受理不等于注销完成。
- [x] 模型：复用 21 渠道 / 677 静态型号及动态 OpenRouter；校验角色、区域、输出、尺寸/比例与仅编辑型号。修复微信 Object 属性传 null、统计图放大所需密钥、设置草稿变化后的比例及角色重算。
- [x] 输入优化：方法、图注、负向提示词、精修指令四入口；主模型与区域 Key、预览/采用/取消/重试/单步恢复、过期结果和换号隔离。
- [x] 原图精修：格式/字节/像素/型号限制、选择/上传/校验/重试/替换/取消、`purpose=refine`、独占 `sourceImageUpload` 与对象清理；精修设置独立读取编辑能力，补齐轮询、详情、保存/分享入口。
- [x] 任务与图库：不可变账号 ID 隔离、旧响应作废、旧无归属缓存保留但不跨账号展示；精修类别/模式/指令/区域回显，图库分面索引与分页复验。
- [x] 小程序回归、类型检查、构建与 TS/JS 一致性；目录生成无漂移。原生界面及模拟网络链路、真实公开目录/图库分别记录。
- [x] 本地上传副本受控同步：源码提交 `b9e2ab9`；181/181 个受控文件 checksum 一致，更新 105 个（含新增 28 个），未删除文件。3 个指定私有文件和其余本机文件保留；副本 70 项测试通过，重新编译后读取到 3.1.0 / v16，见 [同步清单](docs/evidence/miniprogram-3.1.0/local-sync.json)。
- [ ] 微信上传 / 审核 / 正式发布：本轮明确不执行。
- [ ] 真机相册/文件分享、真实供应商计费生成/精修、邮件实际投递：本轮未执行，不以模拟响应替代这些证据。

Web 专用站长后台与公开评测发布/MCP、第一方邮件网页确认不复制到小程序。原生测试响应与真实线上响应的边界、私有配置保留结果见验收记录。

下方历史条目保留当时状态；本条补齐其中的小程序源码、原生验收和本地同步门槛，微信上传、审核与正式发布继续单独待办。

### [2026-09-09] Image 2.5 上线复验：OpenRouter 原生尺寸与精修契约 — by Codex
公网复验发现，OpenRouter 两个 GPT Image 2.5 型号虽然声明支持直接编辑，未声明 resolution 时却返回空的 `refineResolutions`，导致两端无法选择精修参数；实际精修严格校验也会拒绝 `auto`。现仅为这两个已核对型号声明平台原生尺寸：当实时目录完全未提供 resolution 字段时，生成/编辑能力均返回 `['auto']`，严格精修允许 auto，出站仍省略 resolution。目录日后若声明 resolution，继续按实际枚举处理；不覆盖空、未知或改变类型的显式声明，不放开 4K。
- [x] Core / Laf（精确型号 profile、能力目录与严格请求校验）
- [x] Web / 微信小程序 / 共享契约兼容（既有原生尺寸选项直接消费服务端元数据，无客户端代码或请求字段变化）
- [x] 回归（实际注册表 → 生成/精修严格调用，省略未声明字段；拒绝 4K 和目录变化时不回退）
- [x] 修正版本的 Core / Web 发布与生产复验（PR #186，实际发布 SHA `83bb83b120ca9dfc3cd88b5d6504b12cb77f8925`；固定镜像、生产目录与生成/精修原生尺寸、桌面/手机页面通过；见 [发布记录](docs/releases/2026-09-09-image25.md)。小程序发布继续暂缓）

### [2026-09-09] GPT Image 2.5 四渠道目录 v16 — by Codex
变更：按现有 21 个接入渠道的官方文档/公开目录核对 GPT Image 2.5，确认 OpenAI、OpenRouter、fal、Replicate 的 Sunburst / Flare。新增 8 个静态条目（OpenAI 两个别名及两个日期快照，fal / Replicate 各两个），静态目录 669 → 677；OpenRouter 新增两个动态图片条目的已审阅契约，继续以运行时目录为准。其他渠道本轮没有已确认新增项；火山方舟和 Stability 的文档访问不完整，不能据此断言未支持。
共享契约：目录版本 `2026-09-09.v16`；生成/直接编辑使用各渠道精确 ID、入口和官方参数。OpenAI / fal 开放受像素约束的 1K/2K/4K；Replicate 保留七种固定比例及平台自动尺寸；OpenRouter 只发送实时目录声明的参数。补充六份独立官方 schema 和两个 OpenRouter PNG 默认格式 profile。新条目按版本排序，保持 `verified:false`；默认推荐型号不变。无新增 action、env、网关规则或数据库迁移。
- [x] Core / Laf（目录、渠道路由、尺寸约束、OpenRouter 动态目录与格式校验）
- [x] Web（共享源生成的静态目录、型号顺序与合法比例选项）
- [x] 微信小程序源码（同一目录及排序；TS/JS 同步，类型检查和构建通过）
- [x] 共享 API / 契约 / 证据（官方 schema、来源摘要、生成一致性及实际请求参数回归；见 [核对记录](docs/model-capabilities/2026-09-09-image25.md)）
- [x] 本地验证（Core 461、Web 361、仓库/共享 41、小程序 22 个测试文件；Core/Web 构建、Core/小程序类型检查、目录无漂移）
- [x] Web / Core 生产发布及线上目录验收（PR #185/#186，实际发布 SHA `83bb83b120ca9dfc3cd88b5d6504b12cb77f8925`；677 个静态型号、18,786 个字段及排序匹配，4 渠道浏览器验收通过；见 [发布记录](docs/releases/2026-09-09-image25.md)）
- [ ] 真实账号权限与供应商出图/精修验收（本轮零付费模型调用）
- [ ] 小程序原生验收 / 上传 / 平台发布（沿用暂缓要求）

### [2026-09-08] 站长运营工作区：真实统计、服务端列表与可追溯审核 — by Codex
变更：合并账号、任务、反馈和社区评估题入口；新增按时间的真实总览、服务端分页/筛选/排序、用户与任务/提交详情互跳及列表上下文保留。账号以 Better Auth 不可变用户 ID 关联登录方式与会话；联系方式搜索只使用已存在的反馈 `contact`，不将其视为已验证身份。
共享契约：新增 Gateway `adminOverview / adminUserList / adminUserDetail`；新增 Core `adminOperationsOverview / adminTaskList / adminTaskDetail / adminTaskFollowup / adminCommunityList / adminCommunityDetail / adminCommunityEdit / adminContactMatches / adminFeedbackList`。分页统一 `page / pageSize(10|20|50)` 和 `pagination{page,pageSize,total,totalPages}`；时间为 UTC ISO `[from,to)`，排序白名单。所有入口校验站长不可变身份，Core 另验内部管理员传输凭证；DTO 白名单、列表邮箱/联系方式脱敏，按用户显式查看完整联系方式，不返回凭证、原始会话、IP 或密钥。
操作契约：任务新增独立 `adminOperations` 跟进状态/历史，保持执行状态不变；社区保留原始题目，通过 `adminEditedPrompt / adminEditedCapability` 保存编辑。新页面的编辑/审核/跟进提交 `expectedRevision`，原子更新与追加历史，冲突返回 409；既有 `adminBenchmarkPromptDecision` 路由继续可用且补充处理记录。审核终态不可重复修改，通过仅进入下期候选；没有提交到正式题集/发布的可靠关联时明确显示未关联，不伪造“已发布”。
- [x] Core Node / Auth Gateway（新查询、真实统计、白名单、索引、版本冲突与操作记录）
- [x] Web（统一后台及原社区审核入口复用；搜索/筛选/分页/详情/管理操作与异常反馈）
- [x] 微信小程序兼容性（不调用新站长接口；原登录/注册/任务/社区提交契约不变，本轮无客户端修改或发布）
- [x] 本地验证（真实 Auth/Gateway/Core/Mongo 集成和桌面/窄屏浏览器验收；结果见下方交付记录）
- [x] Web / Node Core / Gateway 生产发布（PR #181，实际发布 SHA `fc962212bfa497aab91c770a4edfa7050c027e93`；先后端后 Web，合并 CI、镜像、索引权限与真实生产只读浏览器验收通过；见 [发布记录](docs/releases/2026-09-08-admin-operations.md)。Laf 回退运行时不提供新查询，小程序未发布）
运行依赖：无新增环境变量。沿用业务、认证、评测数据库；启动时创建列表索引，需要对应库的 createIndex 权限。新增审计嵌入原文档，不要求评测账号获得新集合写权限；不触发模型调用、正式评测或发布。详见 [交付与验收记录](docs/admin-operations-2026-09-08.md)。

### [2026-09-08] 恢复身份后的参考图路径校验修正 — by Codex
生产精修上传验收发现：`prepareReferenceUpload` 为恢复身份生成 `references/<owner>/lifecycles/<generation>/<file>`，旧 finalize 校验器只接受无 lifecycle 的路径，导致真实上传校验返回 500。现按既有生成规则接受可选 lifecycle 子目录，继续校验签名、实际对象、账号归属及当前生命周期；拒绝路径穿越和任意附加目录。没有新增字段、action、env 或权限。
- [x] Core（普通参考图与精修上传共享的路径校验修正）
- [x] Web / Gateway / 共享 API（沿用已有描述符，无需改动客户端）
- [x] 回归用例（普通身份与恢复身份均覆盖上传 → finalize → 源图快照 → 编辑；旧生命周期 finalize/refine 仍拒绝）
- [x] Core 固定镜像发布及真实生产上传复验（PR #179，后端 SHA `cca7061fa27c536431445ef3899344aeebe57f7d`；恢复身份 PNG/JPEG 上传、finalize、预览、替换和移除通过，5 个服务健康。首次版本 `28000e0` 的失败与修复过程见 [发布记录](docs/releases/2026-09-08-refine-upload.md)）
- [ ] 小程序原生验收及发布（继续暂缓）

### [2026-09-08] Web 精修上传、指令优化与比例示意 — by Codex
变更：精修页按原图、指令、参数、提交组织；桌面双栏、手机单栏，独立精修状态和结果。新增点击/拖拽上传、真实进度、失败重试、替换/移除；源图校验通过后复制到任务目录，避免后续替换或删除影响正在执行的精修。比例示意保持真实宽高比，自动项独立显示，默认折叠并保持选中项可见。
共享契约（兼容性新增）：公开注册表新增 `refineUpload={version:1,mimeTypes,maxBytes,maxDimension,maxPixels,modelMaxBytes}` 和 `inputOptimizationTargets`；Web 仅在明确声明后启用入口。现有 `finalizeReferenceUpload` 可带 `purpose:'refine'`，成功返回 `source:{width,height}`；现有 `refineImage` 可带 `sourceImageUpload:{objectKey}`。Gateway 清除互斥源字段，Core 以不可变账号 ID、当前 lifecycle、已 finalized 记录及实际对象字节校验来源，任务只使用独立源图快照。既有任务结果入口和请求字段继续支持。
输入优化新增 `target:'editInstruction'` 与 `inputs.editInstruction`（最多 2000 字）；沿用主模型路由、区域密钥、预览/采用/取消/恢复，不发送生成页内容作为精修上下文。Gateway 补齐已有 MiniMax 区域字段的优化请求透传。无新增 action、env 或数据库迁移。
- [x] Core / Laf（上传归属与解码、任务快照、能力声明、精修优化目标）
- [x] Auth Gateway / 共享 API（上传描述符、精修 finalize、优化目标及区域透传）
- [x] Web（布局、上传、优化、比例示意、提交校验、独立轮询）
- [x] 本地验收（Web 358、Core 455（含恢复身份回归）、Gateway 140、共享 API 29；新增真实 Gateway/Core 集成测试与模型请求像素核对，模型服务为测试桩；构建、类型检查、目录无漂移；详见 [验收记录](docs/refine-upload-2026-09-08.md)）
- [x] Web / Core / Gateway 生产部署与线上验收（PR #178/#179；Web SHA `28000e0be7479cc6a5bc84e323443d86bbdc6bf1`，后端 SHA `cca7061fa27c536431445ef3899344aeebe57f7d`。真实 PNG/JPEG 上传及清理、45 种固定比例几何、1440/390/320 px 无溢出、缺 Key 优化引导和原文保留通过；见 [发布记录](docs/releases/2026-09-08-refine-upload.md)）
- [ ] 真实供应商精修与优化输出验收（需要当前账号的模型 Key；本地已覆盖真实处理器与适配器，供应商为测试桩）
- [ ] 微信小程序原生验证、上传与平台发布（沿用用户暂缓要求；新增可选字段不影响旧请求）

### [2026-09-08] 邮箱验证增加手动确认，避免链接预览提前验证 — by Codex
变更：邮件链接改为 Web `account/email-verify.html#token=…`，页面读取后立即移除片段，仅在用户点击“确认验证邮箱”时发送请求。旧邮件的 `GET/HEAD /api/auth/verify-email` 只跳转至第一方确认页，不查询或修改账号；Better Auth 原验证路由同时禁用。页面加载、预览、焦点事件均不自动提交。
共享契约：验证动作改为 `POST /api/auth/verify-email`，必须使用受信任 Origin 与 JSON `{token}`，只接受 body 中的令牌。HTTP 200 `{ok:true,code:'EMAIL_VERIFIED'|'TOKEN_USED'}`；无效/过期为 HTTP 400、暂时失败为 503。保留不可变用户 ID、邮箱摘要、注销屏障、原 1 小时 TTL 与幂等回执；不创建登录态。注册观察接口仍只读，无新增 env、迁移或批量账号状态变更。
- [x] Auth Gateway（安全 GET/HEAD、显式 POST、禁用原路由、邮件链接及双语说明）
- [x] Web（手动确认、令牌只在内存、失败手动重试、结果与登录入口）
- [x] 微信小程序兼容性（邮件链接在浏览器完成确认，原注册/登录/重发接口不变；本轮不发布小程序）
- [x] 本地验收（Gateway 140、Web 353 项测试及 Web 构建通过；真实 Better Auth / Mongo 与 Chrome 桌面/手机：预取及执行页面脚本后仍未验证，点击后原注册页自动更新；重复链接、无自动登录、注销后重注册隔离）
- [x] Web / Gateway 生产发布与验收（PR #176，实际发布 SHA `2c82f49d962247353551540b8198dbb7034f69cd`；先部署确认页，再切换 Gateway。合并 CI、镜像来源、服务健康、线上桌面/手机安全预览与显式 POST 检查通过；见 [发布记录](docs/releases/2026-09-08-email-confirmation.md)）

### [2026-09-08] 邮箱验证结果与注册等待状态修复 — by Codex
变更：Gateway 验证成功后在原 1 小时 TTL 内保留哈希回执；重复访问仅在同一不可变用户 ID、发信邮箱、当前已验证且无注销操作时返回 `TOKEN_USED`，不再次修改账号、不创建登录态。区分 `TOKEN_EXPIRED`、`INVALID_TOKEN` 和暂时故障 `VERIFICATION_UNAVAILABLE`，响应禁止缓存；已删除的旧回执无法重建，网页对此提供先登录再决定是否重发的指引。
共享契约：注册受理响应新增可选 `verificationStatusToken`；新增只读 `POST /api/auth/verification-status`，body 为 `{token}`，返回 `{status:'pending'|'verified'}`，暂时失败为 HTTP 503。凭证与验证令牌用途分离，仅授权观察本次实际新注册的用户与原邮箱，1 小时失效；合成/重复注册返回等形随机凭证，不能观察既有账号。凭证仅存 Web 页面内存；不支持凭邮箱查询，不发送邮件、不授予登录。沿用 `accountVerificationTokens` 的 TTL 和按用户注销清理，无新 env 或数据库迁移。
- [x] Auth Gateway（重复结果、错误分类、注册观察凭证；账号身份与反枚举回归）
- [x] Web（等待页自动检查、回到页面即时刷新、成功隐藏重发、清空注册密码、返回登录入口、普通登录不再跳到邮箱验证结果页；旧 Gateway 无凭证时保留手动登录）
- [x] 微信小程序兼容性（新增响应字段可忽略；原注册/登录/重发请求保持兼容，不要求本轮发布）
- [x] 本地验证（Gateway 138、Web 349 项；真实 Better Auth / Mongo 副本集并发验证、重复注册反枚举、注销与同邮箱重注册回归；Web 构建；Chrome 1440×1000 / 390×844 首次及重复链接、跨浏览器原页面自动更新、普通登录留在应用内、零脚本错误及无横向溢出）
- [x] Web / Gateway 生产发布（PR #174，实际部署 SHA `f84659eb4cafc9f1330a65f0aa0d6cf89695abd0`；合并 CI、固定镜像、主机健康、状态接口、结果页及桌面/手机登录入口验收通过；见 [发布记录](docs/releases/2026-09-08-email-verification.md)。小程序原生验收与平台发布继续暂缓）

### [2026-09-07] 模型选择与比例呈现 v15 — by Codex
变更：新增共享公司/平台名称、别名、渠道路径、官方日期与版本顺序配置 `config/model-presentation.json`；公开模型条目新增可选 `vendorId / serviceTier / releaseFamily / releaseOrder / releaseSourceUrl / releaseOrderSourceUrl`。后端及两端用同一生成源规范化公司名称和新到旧顺序，推荐标签不参与排序。所有渠道保持“API 接入渠道 → 模型厂商 → 服务端模型目录”；完整调用 ID 与显示名分离。静态目录仍为 669 项，既有协议、能力、地区和请求 ID 不变。
比例：Web、小程序共享 `packages/types/src/aspect-ratios.ts`，按渠道内型号、生成/编辑及分辨率只展示合法项；旧选择失效自动收敛，缺失能力时不伪造选项，提交前验证当前比例，包含 Recraft 原生 SVG。原生客户端版本兼容新增可选字段，无新增 action、env 或网关规则。
- [x] Core / Laf（静态与 OpenRouter 动态目录；名称、版本顺序、可选字段）
- [x] Web（三栏/窄屏三步、名称和 ID、复制、比例过滤与提交校验）
- [x] 微信小程序（同一分类/排序/比例规则，分页视图与 TS/JS 同步）
- [x] 共享目录 / API 契约（生成源一致性、原请求字段不变；见 [核对记录](docs/model-picker-2026-09-07.md)）
- [x] 本地验证（Core 451、Web 342、仓库契约 10、共享 API 28、小程序 22 个测试文件；15,502 种静态比例组合；Chrome 和微信官方组件模拟渲染）
- [ ] 微信原生模拟器 / 真机验证（按用户“小程序先不用管”暂缓；组件模拟验证已完成）
- [x] v15 Core / Web 生产发布及线上验收（PR #172，部署 SHA `b96d507c4bcb2424c1814d6cdf4e81aae2b4cfb6`；完整 CI、固定镜像、服务健康、669 型号 14049 字段及顺序、桌面/窄屏选择器与比例回退验收通过；见 [发布记录](docs/releases/2026-09-07-model-picker-v15.md)）
- [ ] 小程序上传 / 平台发布（继续遵循既有暂缓要求）

### [2026-09-07] 模型目录 v14、MiniMax 区域入口与不兼容条目移除 — by Codex
变更：承接 v13 的图片尺寸扩展，全面核对现有 21 渠道。MiniMax 统一产品入口，新增可选 `providerRegions.minimax=global|cn`，区域匹配官方 API 与当前页面内存中的独立 Key；创建/精修/输入优化/任务快照透传区域。注册表新增 `providerRegionContractVersion:1`，旧后端不接受中国区提交。共享 `expirationAt` 可记录公告明确的时区与时刻，到期前不提前排除。生成/编辑分别维护尺寸、像素、边长、对齐与字段；45 种候选比例按具体型号合法性开放。
目录：相对仓库基线 306 项，新增 367、修正 73、移除 4，最终 669 个静态型号；OpenRouter 核对 471 个唯一 ID，移除 5 个不兼容型号，实际目录 466 项。不兼容型号直接从后端目录及 Web/小程序选择器移除，原因仅保留审计记录。新增/修正 native、multipart、SSE 和异步队列适配；审阅回归补齐 Web 精修区域透传、异步查询 HTTP 错误重试及 fal 仅任务 ID 的应答；Together 使用 api.together.ai，MiniMax 中国直接出站、国际经 SG。没有新增 action 或生产 env。
- [x] Core / Laf（区域、生命周期、模型/尺寸/格式/异步接口；实际 Node 后端复用同一源文件）
- [x] Web（MiniMax 区域与独立 Key；逐分辨率比例；移除不兼容型号/厂商列表）
- [x] 微信小程序（区域、路由、生成/精修 payload、目录与选择器；完整目录留在逻辑层，避免 1 MiB setData 溢出，当前最大视图更新约 16.3 KB；TS/JS 同步）
- [x] 共享 API / 目录（配置、生成脚本、140 份独立 schema、完整差异与官方来源）
- [x] 本地验证（Core 448、Web 342、共享/Laf/小程序/根契约 70；尺寸 15502、新渠道派发 7345、官方 schema 4877、OpenRouter 派发 1446 组合；小程序视图 1472 组分辨率选项、2.83 MB 增长目录；类型检查和构建通过）
- [x] 本地浏览器（MiniMax 单入口、两区地址/Key 说明、Live 中国区专属与七种固定比例、不兼容列表消失）
- [x] SG 出口允许名单与运维说明代码同步（本地验证；中国 MiniMax 不走 SG）
- [x] Core / Web / SG 实际发布（PR #170，部署 SHA `b4bbc0f1473479044509ed25416ad927a1546739`；完整 CI、镜像、健康、669 型号 9366 字段、OpenAcad 导航与 MiniMax 区域验收通过；见 [发布记录](docs/releases/2026-09-07-model-catalog-v14.md)）
- [ ] 真实账号权限与推理验收（本次未执行）；小程序上传 / 平台发布继续暂停
证据：[v14 核对与验证](docs/model-capabilities/2026-09-07-catalog-v14.md)、[逐型号现行目录](docs/model-capabilities/2026-09-07-catalog-v14.csv)、[差异与移除理由](docs/model-catalog-decisions.csv)。当前保留客户端为 Web 与微信小程序。

### [2026-09-07] 图片尺寸契约与渠道扩展 v13 — by Codex
变更：按型号 + 接入渠道 + 生成/编辑维护尺寸规则；新增 `aspectRatiosByResolution` / `refineAspectRatiosByResolution`、尺寸核对日期与官方来源。共享解析器校验宽高、总像素、边长、比例和对齐，固定型号使用官方枚举。修复 Qwen 最小像素、Seedream 4.5/5.0 lite 最小面积、Wan 生成/编辑不同上限；补齐 Gemini、Kolors 比例；Recraft 直接编辑只提供原生尺寸。输出解码仍限制 20 MP，边长扩到 16384 以容纳 Gemini/Vidu 官方超宽输出。请求字段不变；新增尺寸组合错误码 `IMAGE_SIZE_UNSUPPORTED` / `REFINE_IMAGE_SIZE_UNSUPPORTED`，在入队前校验。精修保留 512/auto，自动增强禁止静默降档。新增渠道 apiKeys/modelRoutes ID 同步三端；Gateway 沿用透传，无新增 action/env。SG 出口主机清单已更新代码，尚未应用线上。
- [x] Core / Laf（共享尺寸解析、合法请求校验、自动模式）
- [x] Web（按所选分辨率生成比例选项）
- [x] 微信小程序（生成/精修随分辨率更新；TS/JS 同步）
- [x] 共享目录（配置、生成脚本、官方来源与穷举边界测试）
- [x] 厂商与聚合平台扩展（BFL、Stability、Ideogram、MiniMax 国际、Mistral、Together、Fireworks、fal、Replicate；21 渠道 / 323 静态型号 / 82 图片路线）
- [x] 本地回归与构建（Core 436、Web 337、Laf/共享 API 34；小程序 21 文件；尺寸 6222 组合、后端新增图片派发 1104 组合）
- [x] Core / Web / SG 发布（随 v14、PR #170 完成，见上条发布记录）
- [ ] 账号权限与真实推理验收；小程序上传 / 平台发布（本次未执行）
证据：[尺寸与渠道核对记录](docs/model-capabilities/2026-09-07-audit.md)。

### [2026-09-07] 原身份恢复与生命周期隔离 — by Codex
变更：用户明确选择保留原账号身份并授权上线。旧注销范围和已暂停的 Auth 操作在跨库事务中归档，当前生命周期 head 保留并设为 active，生成新的 `accountGeneration`。用户、凭证、会话、任务和反馈原样保留；不重建缺失图片。新增仅运维可运行的指纹 + 快照摘要恢复 CLI，要求维护并停止 Core/Gateway。新任务持久化周期编号，参考图使用独立子目录，旧写回及旧注销请求不能影响新周期。发布明确先停旧 Gateway 再停旧 Core，新旧清理器不重叠。
契约：`GET /api/account/status` 可选新增 `accountGeneration/restoredAt`；编号由 Core 绑定，客户端无需提交。内部注销绑定该编号。新增归档集合 `paperbanana_account_deletion_history` / `accountDeletionOperationHistory`，不新增公开 action、密钥或模型调用。
- [x] Core / Gateway / 共享实现（恢复事务、周期校验、旧操作关闭、新注销继续支持）
- [x] Web / 微信小程序（沿用 active/deleting/review_required 契约，无需额外请求字段）
- [x] 本地验证（生产函数回归、真实 Mongo 跨库事务、身份和历史不变、摘要漂移及幂等重试）
- [x] 生产发布和原身份恢复验收（PR #168，部署 SHA `590419b24e222b23d4f6adafc2474e0106153dc1`；原身份、凭证、会话、44 条任务及 4 条反馈摘要不变，账号 active，旧清扫停止；见 [发布记录](docs/releases/2026-09-07-account-lifecycle-v3.md)）
- [ ] 另一条历史中断注销（继续暂停，未获该账号处置决定）
- [ ] 小程序上传 / 平台发布（用户要求暂缓）

### [2026-09-07] 账号生命周期 v3 与同邮箱重新注册隔离 — by Codex
变更：历史 v2/无版本注销记录停止自动清扫、保留冻结并要求核对；新注销先在 Auth DB 持久化授权操作，再按不可变用户 ID 等待在途写入、冻结对象清单、清理业务数据、事务删除 Auth 并确认完成。Gateway 定时续跑、跨进程租约、失败阶段与游标持久化；不再无限扫描邮箱目录。任务权限及注销范围取消邮箱回退，历史仅邮箱记录需显式迁移。原始个人投稿纳入删除并补齐前后写入检查；Mongo 初始化脚本只为 Benchmark API 的个人投稿集合增加 remove 权限，公开评测与 Worker 删除权限仍禁止。
契约：内部 `accountDeletionCapability.deletionContractVersion=3`；`deleteAccount` 必须有 `userId + operationId`，新增内部 `completeAccountDeletion` / `accountDeletionStatus`，均要求可信 Gateway。公开新增登录态 `GET /api/account/status`；`POST /api/account/delete` 完成返回原 `200 {code:0,ok:true}`，已持久化待续跑返回 `202 {code:202,accepted:true,phase,error,retryAfterSeconds}`，历史/范围不明返回 `409 ACCOUNT_DELETION_REVIEW_REQUIRED`。202 不代表删除成功，不清除客户端任务和草稿。
认证：新增 Auth DB `accountDeletionOperations` / `accountVerificationTokens`；邮箱规范化及唯一索引预检失败时拒绝启动，禁止隐式修改历史邮箱；新验证链接为一次性令牌、按用户 ID 与发起邮箱摘要验证，旧邮箱 JWT 链接需重发。注销事务清理旧验证/重置记录；凭证、会话写入增加生命周期检查。注册重复与并发唯一索引竞争保持中性响应，Web/小程序不再宣称创建新号或必定发信。无模型付费调用。
- [x] Core / Laf 共享处理（v3、固定 ID 范围、历史暂停、持久化阶段与本地回归）
- [x] Auth Gateway（持久化续跑、事务确认、ID 权限、邮箱索引、绑定 ID 的验证与会话/凭证防竞态）
- [x] Web（真实账号状态、待核对/处理中说明、202 与完成分离、注册反馈）
- [x] 微信小程序（同一生命周期契约与注册反馈，TS/JS 同步）
- [x] 共享契约 / 运维文档（见 [修复与发布说明](docs/account-lifecycle-v3-2026-09-07.md)；真实本地 Mongo 副本集回归已接 CI）
- [x] Core / Gateway / Web 发布与生产验收（PR #168；三份固定镜像、合并 CI、Auth 唯一邮箱索引、最小权限、健康和页面检查通过，见 [发布记录](docs/releases/2026-09-07-account-lifecycle-v3.md)）
- [ ] 两条历史中断注销的逐账号处置（用户授权的原身份已恢复并归档旧操作；另一账号继续暂停，待独立决定。缺失图片未恢复）
- [ ] 小程序上传 / 平台发布（按用户指示暂不处理）

### [2026-09-07] 全渠道 API 修正与逐型号目录 v12 — by Codex
变更：静态目录 101→306 项（新增 205 个渠道内 ID），OpenRouter 动态目录合并主/视觉/图片角色并保留官方到期日期。修正 OpenAI 生成/编辑像素尺寸及逐型号采样参数、百炼 Omni SSE；新增 Kling/Vidu/旧 Wan 异步适配、CogView 与硅基流动图片型号、Recraft 各代非 Styles 及仍支持的历史文本/视觉型号。已结束服务的 ID 按本渠道迁移，仍有效版本保留；直连与聚合、北京与其他地区不共用生命周期规则。
共享契约：目录版本 `2026-09-07.v12`；新增 `expirationDate / earliestRetirementDate / replacementModelId / regions / roleProtocols` 与 `requiresSourceImage / maxReferenceImages / providerMaxReferenceImages`，分辨率枚举允许 `512 / auto`，增加型号需要的比例；既有 API 字段继续兼容透传。编辑专用模型在普通生图入队前返回 `IMAGE_MODEL_EDIT_ONLY`。`config/model-catalog-updates.json` 和 `scripts/sync-model-catalog.mjs` 统一后端/Web/小程序静态目录。无新增外部 API 主机、环境变量或 action，无新增验证状态类型。
- [x] Core / Laf 共享实现（接口、目录、生命周期、地区与本地模拟回归）
- [x] Web（全量回退目录、尺寸/比例、到期和编辑专用说明）
- [x] 微信小程序（同源目录、元数据、尺寸/比例、TS/JS 同步）
- [x] 共享 API / Gateway（沿用透传；512/auto 契约验证，无新增网关规则）
- [x] 审计与排除决定（1,014 条证据逐项落实，见 [实现报告](docs/model-catalog-repair-2026-09-07.md) 与 [型号清单](docs/model-catalog-decisions.csv)）
- [x] Core / Web / SG 发布（PR #166；固定部署 SHA `8cbd41520906502f9348b8b48b2cd2613bb5369d`；生产目录 v12、306 静态型号及 471 OpenRouter 条目、逐字段对照与无密钥出口验收通过，见 [发布记录](docs/releases/2026-09-07-model-catalog-v12.md)）
- [ ] 微信小程序上传 / 平台发布（用户于本轮明确暂不处理；代码与本地验证已完成）
验证：Core 418、Web 331、共享 API/目录 31 项测试通过，小程序 21 个测试文件通过；Core/Web/小程序构建与目录无漂移检查通过。没有真实推理或付费调用。

### [2026-09-07] 第一批七个原生 API 渠道与 Recraft SVG — by Codex
变更：目录版本 `2026-09-07.v11`；新增 `deepseek / kimi / zhipu / siliconflow / anthropic / recraft / xai`，各角色的 `modelRoutes.accessProvider` 与 `apiKeys` 接受这些 ID。主模型/识别专用渠道与 Recraft 图像专用渠道允许缺省角色为空，只在专业模式混合使用；普通模式只展示具备三个默认角色的渠道。Recraft Vector + SVG 会实际调用 image 路线，因此前后端按同一规则收集 main + image Key（vanilla 直出只需 image）。Claude 使用原生 Messages、xAI 使用 Responses 与 JSON 图片 API；图片输出统一 PNG，Recraft Vector 可保留 SVG。用户界面不增加“未实测”标签。SG 精确出口白名单新增三个域名，详见接入文档。
- [x] paperbanana-api / Laf（注册表、原生适配器、角色/密钥范围、SVG 与本地回归）
- [x] Web（渠道与官方目录、普通/专业选择、Key、SVG 角色与使用说明）
- [x] 小程序（相同目录/路由、旧服务端兼容、内存 Key 与 TS/JS 同步）
- [x] Gateway（沿用现有透传契约，无新增 action）
- [x] Core / Web / SG（随 v12 上线；Anthropic、xAI、Recraft 精确主机 CONNECT 与既有允许/拒绝探针通过）
- [ ] 小程序上传 / 发布（用户明确暂缓）

### [2026-09-07] 官方模型目录更新与视觉角色同步 — by Codex
变更：目录版本升至 `2026-09-07.v10`，补入 Gemini 3.8 Flash、GPT-6 Astra、百炼九个文本/视觉入口及 Qwen Image 3.0；修正 Qwen3.8 Max 视觉角色。OpenRouter 动态目录继续生效，客户端补齐八个近期文本/视觉型号、MAI Image 2.6 与 Flash；Flash 使用官方 PNG/Azure 适配，要求风格参考图的型号不进入当前生成流程。Astra 原生走 Responses，OpenRouter Astra/Fable 不发送目录未声明的 temperature。默认模型不变。
契约：沿用现有 `catalog` 来源字段，不新增状态类型；模型列表不显示“未实测”标签。官方依据、账号验证边界与未纳入项见 [核对记录](docs/model-catalog-2026-09-07.md)。本次没有付费模型调用或排行榜更新。
- [x] Core / Sealaf 共享实现（目录、角色、协议与参数适配）
- [x] Web（回退目录、读图判定、目录展示文案）
- [x] 微信小程序（TS/JS 回退目录、读图判定、目录展示文案）
- [x] Core / Web 发布（随 v12 合并部署，生产目录版本已确认）
- [ ] 小程序上传 / 发布（用户明确暂缓）

### [2026-09-06] MAI-Image-2.6 接入与 Scientific V2 单模型增量扩榜 — by Codex
变更：按用户要求仅评测非 Flash `microsoft/mai-image-2.6`。OpenRouter 精确型号根据 Microsoft 官方 PNG 输出契约接入，运行时继续校验真实图片字节；请求固定 Azure、单图、关闭 web grounding 和 provider fallback。目录仍标记 `verificationState:catalog` / `verified:false`，文档支持不冒充账号调用已验证，Flash 不在新增名单中。
契约：新增 `freezeExpansionBatch` 与 `expansion` 描述，精确绑定当前 active release/batch/manifest 和唯一新增模型。保留完整签名 registry/canonical authority，但执行、价格、调用记录和审评仅覆盖新增模型的固定 6 生成 + 3 编辑；不产生新 Codex 出图调用。发布在同一事务内复验 active predecessor，原样继承旧模型的图片、评分、逐题审核说明和来源，只重算全榜排名。确认失败/不支持保持固定九题零分规则，未知结果停跑；旧 Seedream correction 白名单不变。
价格：新型号的 Azure 文本/图片输入和图片输出费率、输出 token 上限均需由当前官方 endpoint 捕获校验；采用明确标注的 operator 保守上界，费用漂移拒绝运行。受保护 price/prepare 工作流新增可选 `expansion_sha256`，常驻 Worker 继续 disabled、单并发。
- [x] Core 模型适配（精确 PNG profile、生成/编辑、无未声明尺寸参数、正常与负向回归）
- [x] Benchmark Core / Worker / API（单模型冻结、执行、审评、继承与事务扩榜；40→41 集成验证、失败计零、旧 head/证据漂移与回滚测试通过）
- [x] 运维（受保护 descriptor / price / prepare / run / publish 接线与合同测试）
- [x] Web / 微信小程序（消费现有动态目录与排行榜字段，无新请求要求）
- [x] 发布 / 真实验收（真实九题、A/B 审评及必要仲裁、41 模型扩榜、旧 40 模型非排名字段逐项不变）
发布证据：冻结、执行与发布数据面 SHA 均为 `d224bcd7c83386226f1a96a5ed76f13cd556afda`；审核文本校验修复后的工作流 control SHA 为 `0b0b876bdc87ef96a07ba9c3b6220ba27d7b7245`。真实完整九题 run `34027402729`；A/B 审评导入 runs `34028531187` / `34028634359`；五项 xhigh 仲裁导入 run `34028820757`；原子发布 run `34028848702`。新 releaseId 为 `bench-scientific-v2-release-1f652f6370203d1ecf6a`，releaseHash 为 `1f652f6370203d1ecf6a8f8ce679097b968b412cd4ab0bdf0362e3a5dce9d482`。
真实验收：MAI 的 6 个生成题和 3 个编辑题均成功（9/9，九次调用）；公开九题图片 hash、分数和逐题审核说明与四项 A/B 均值及五项最终仲裁逐项一致。请求尺寸均为冻结的 `provider-default`，生成实际为 1360×768、编辑为 1365×768；公开图片 hash、尺寸和调用记录与 completed Worker 报告一致。新榜共 41 个合格模型、352 个成功样本；旧 40 个模型的全部公开模型行仅允许 `overallRank` / `dimensionRanks` 变化，其余字段逐项相等。十轴固定分母和 competition 排名重算通过，MAI 总分 `7.3575396825396835`（页面 `7.36`），排名第 `15/41`，编辑目标准确性 `9.50`、该维度第 1。公开 profile 的 9 个 cases / 9 项 evidence 与榜单 release、分数和排名一致；浏览器榜单与详情显示一致，高清图可打开。

### [2026-09-04] 匿名只读科研图示 MCP 与跨 Agent Skill v1 — by Codex
变更：新增 `@paperbanana/tuyan-knowledge` 共享知识包与 `tuyan-scientific-figure` Agent Skill；Gateway 新增匿名、无状态 Streamable HTTP `/mcp`，只公开一个只读工具 `tuyan.get_workflow_bundle` 及版本化 Resources。MCP 只接受 `operation / visualCategory / outputFormat / locale / knowledgeMajor` 五个枚举字段，不接受论文、图片、提示词、API Key 或自由文本，不创建会话、Cookie、数据库记录或后台任务。PaperBananaBench 只由 Agent 经用户同意后从固定上游 revision 下载到本机，图研不重新托管；既有 Web、微信小程序和云端生成/精修 API 行为不变。
契约：knowledge major 固定为 `1`；8 类视觉 ID 为 `method_framework / workflow / system_architecture / mechanism / comparison / timeline / data_stat / concept_map`；版本化 Schema URI 为 `tuyan://schemas/*/v1`；本地产物默认写入 `./tuyan-output/<timestamp>-<slug>/`。Gateway MCP 路由独立限制 64 KiB、每 IP 每分钟 60 次，日志不记录调用参数。
- [x] 共享知识包 / Schema / 离线快照（中英内容、固定数据集 manifest 与 306 条选择校验）
- [x] auth-gateway（匿名 MCP、闭合输入、Tools/Resources、限流与回归测试）
- [x] Agent Skill / Web 发布包（Codex、OpenClaw、Hermes 标准安装说明；well-known 构建产物）
- [x] Web / 微信小程序 / paperbanana-api（既有生成管线和公开 action 不变，无需改造）
- [x] 发布 / 生产 smoke（合并部署后仅执行一次 `initialize → tools/list → get_workflow_bundle → resources/read`）
发布证据：功能合并 PR `#158` / SHA `7ccdfcd3bea848a74dde81517889b36cd4774346`；移除已迁移 OpenVac 部署耦合 PR `#159` / 最终部署 SHA `2abc66c6ff50baa5f793135294682e847547e822`；Pages run `33855670006`；Gateway/Core/Benchmark 镜像 runs `33859200958` / `33859200731` / `33859201062`；香港部署 run `33859351493`。生产 MCP `2025-06-18` 协议 smoke 已按计划执行一次并通过：只声明 `tools/resources`，唯一工具为 `tuyan.get_workflow_bundle`，Workflow 与 Manifest Resource 可读，未创建 Session 或 Cookie。

### [2026-09-03] 产品线收缩为 Web 与微信小程序 — by Codex
变更：用户客户端只保留 `apps/web` 与 `apps/miniprogram`；删除 Android、Electron Desktop、HarmonyOS、iOS、macOS 和 Windows 客户端源码、专属 CI/发布工作流、App Store 元数据与专属测试。后端、共享包、Benchmark、历史 Git 记录和 GitHub Releases 不删除。
契约：现有 API 字段和数据库记录不迁移；服务端及保留客户端继续识别历史 `clientPlatform` 值，确保旧任务来源可读，但不再新增或发布退役客户端。
- [x] Web / 微信小程序（保留并继续开发）
- [x] CI / 文档 / 仓库元数据（移除退役客户端入口）
- [x] 后端 / 共享包（公开契约不变，保留历史兼容）

### [2026-09-02] Scientific V2 修正发布收窄为两个 Seedream、Recraft 保持基线 — by Codex
变更：按最新生产口径停止三个 Recraft 的补跑和审核；修正发布只把 `seedream-4.5`、`seedream-5.0` 的 18 个已成功题位从当前 active predecessor 引入，其余 38 个模型（含三个 Recraft）的图片、评分、维度、证据与审核内容从 `f1f31caf…` 基线原样移植，只允许全榜 `overallRank` / `dimensionRanks` 和证据行 release/rank/时间派生字段变化。该固定 correction 使用 `targetSlotIds=[]` / `sha256("[]")` 的显式零 Provider 模式，completed state 由不可变 Worker 镜像在 `--network none` 下重建签名报告后进入双盲审核；控制面精确白名单禁止 Recraft 出现在目标模型列表。公开 API 字段不变。
- [x] paperbanana-api / Benchmark Worker / 控制面（Seedream-only 固定计划、零调用继承、双重原子发布门与回归）
- [ ] 生产执行（部署固定 SHA；零 Provider 导入 completed state；仅 18 个 Seedream 题位 A/B + 仲裁；原子发布并验证 38 个非目标模型非排名字段与基线一致）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与字段不变，无需改造）

### [2026-09-02] Web 三输入栏 main 路由单次 AI 优化 — by Codex
变更：新增同步 `optimizeInputs` action，分别优化论文方法内容、目标图注或负向提示词。请求只携带当前生效的 `mainRoute {accessProvider,modelId}`、该 Provider 的单个 `apiKey` 和三栏只读快照；Core 校验主模型注册表角色后最多发起一次文本 Provider HTTP 请求，不重试、不回退、不落库。`modelRegistry` 顶层新增 `inputOptimizationContractVersion:1`，旧后端下 Web 隐藏入口。
契约（影响共享 / Web）：
- **请求/响应**：`optimizeInputs` 接受 `target=methodContent|caption|negativePrompt`、`inputs`、`mainRoute`、`apiKey`，成功仅返回 `{code:0,target,optimizedText}`；方法/图注需非空，负向提示词可由其他两栏从空白生成。
- **安全/失败**：Key 只进入单次执行闭包；Gateway 严格白名单、维护门禁与 50 秒专属超时，Core Provider 超时 45 秒。空白、无变化、超长、科研 token 漂移、Provider 超时/失败均保留原文并返回稳定错误，不暴露原始 Provider 响应。
- **Web 交互**：三个字段独立入口，候选经原文/优化稿差异弹窗确认后才采用；支持重新优化、取消和一次恢复优化前内容。页面不展示模型名或费用，缺主模型/对应 Key 时打开设置引导且不发起调用。
各端待办：
- [x] packages-api / auth-gateway / paperbanana-api（共享 DTO、真实转发、单次 Provider 调用与 TDD）
- [x] Web（三入口、可访问差异弹窗、采用与单步恢复）
- [x] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（新增 action 为可选能力，现有请求不变）
- [x] 部署 / 运维（PR #152、10/10 CI、Core/Gateway/HK/Pages 和生产非计费 smoke）
发布证据：merge SHA `2f0166901c5f939091cbe92281b4b5712689153a`；Core 镜像发布 run `33631832942`（`sha256:79ce2d53ebf7af78f6d5881ffb2795f52341567c1b8dcf2e244fcd7aa01e0c13`）；Gateway 镜像发布 run `33631832269`（`sha256:af9126414b17500060a1c8f1445b7162a60ebba8bbbd7189b3a652ea6a0fda21`）；香港部署 run `33632618871`；Pages 部署 run `33633364781`（Bench 保持开启）。现网 `/health`、`/ready`、Registry contract version 1 和空 Key `INPUT_OPTIMIZATION_KEY_REQUIRED` 均通过；未执行真实 Provider 成功链。

### [2026-09-02] Scientific V2 五模型修正发布恢复正确基线与真实审核理由 — by Codex
变更：针对误将全量 343 张图片重审并重算 40 模型的已发布 V2，修正批次现同时签名绑定正确数据基线 release 与当前错误 active predecessor。发布端只重新审核、渲染并重算精确的 5 个目标模型；其他 35 个模型的分数、维度、图片、证据与审核内容从基线原样移植，只允许 `overallRank` / `dimensionRanks` 和证据行的 release/rank/时间派生字段变化。目标模型每个 9 题位必须全部成功才能生成修正审核包和公开证据，因此三个 Recraft 未补跑完成时不可伪装成已更新。A/B 与 xhigh 仲裁每个题位必填真实具体审核理由，禁止通用占位文案；最终按 competition ranking 重算受影响排名后在单一 Mongo 事务内原子 supersede。公开 API 字段不变。
- [x] paperbanana-api / Benchmark Worker / 控制面（基线移植、目标范围审核与渲染、真实 rationale、竞争排名与原子发布回归）
- [ ] 生产执行（部署固定 SHA；三个 Recraft 单并发补跑；仅五模型 A/B + 仲裁；原子发布并验证 35 模型非排名字段与基线一致）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与字段不变，无需改造）

### [2026-09-02] Scientific V2 remediation Worker 报告继承 Codex provenance — by Codex
变更：当补跑批次只执行普通 Provider、最终签名状态报告为 `worker` 时，发布端不再要求该报告伪装成 `codex`，也不信任 Worker 自报 Codex provenance。发布端会沿 `remediationOf` 精确读取已发布源 batch/release、复验源 release 内容 hash、源 Codex 状态报告的 schema/HMAC/disclosure/9 题/36 次上限/artifact canary，再把源 Codex 题位按新 manifest 确定性重绑并与当前 9 个 Codex 题位逐字节 canonical 对比；Codex 被列为补跑目标、源链不完整或任一继承字段漂移均拒绝发布。题目、图片、评分、审核和 Provider 调用规则不变。
- [x] paperbanana-api（源发布 lineage、Codex provenance 与重绑定题位校验及正反回归）
- [ ] 部署 / 运维（部署后重放当前 Seedream remediation 原子发布）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开契约不变，无需改造）

### [2026-09-02] Scientific V2 管理员发布失败的安全诊断码 — by Codex
变更：受保护的管理员内网传输在 Scientific V2 操作被拒绝时，可额外返回一个严格白名单 `diagnosticCode`：业务错误仅允许 `SCIENTIFIC_V2_*`，Mongo 错误仅允许数值 code 与规范化 codeName；公开/未授权请求继续只返回统一错误，不暴露数据库消息、键值、对象路径、凭据或响应正文。root-only 管理桥只把该白名单码附在失败标识后，便于定位原子发布回滚原因。成功响应、公开 API、排行榜字段、图片、评分、审核和 Provider 调用规则不变。
- [x] paperbanana-api / 运维桥（白名单诊断码、非管理员不泄漏及回归测试）
- [ ] 部署 / 运维（部署后重放同一原子发布并按诊断码完成修复）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开契约不变，无需改造）

### [2026-09-02] Scientific V2 release head / lifecycle 最小 Mongo 权限 — by Codex
变更：生产原子替代发布需要 paperbanana-api 在独立 `paperbanana_benchmark_release_heads` 与 `paperbanana_benchmark_release_lifecycle` 集合上读取当前 active head、插入新 lifecycle 并以 CAS 更新旧 lifecycle/head。Mongo root migration 会在角色和服务启动前显式、幂等创建这两个集合，避免 MongoDB 多文档事务因禁止隐式建集合而在提交前整体回滚；同时只给 API 账号增加这两个集合的 `find/insert/update`，不授予 delete、drop、索引管理或宽泛数据库权限，常驻 Benchmark Worker 仍无这两个集合的读写权限。旧的 `scientific_v2_release_identity` 唯一索引与“release 文档不可变、允许 remediation 插入新 release、由 head 保证唯一 active”的契约冲突，迁移会先建立包含 `profileStatus/publishedAt` 的非唯一查询索引，再精确删除该旧索引，不修改任何 release 文档或证据。公开 API、排行榜字段、题集、图片、评分、审核和 Provider 调用规则不变。
- [x] paperbanana-api / Mongo 迁移（release 状态集合预创建、最小权限、旧唯一索引替换与 Mongo 8 集成回归）
- [ ] 部署 / 运维（运行 root Mongo migration，确认旧唯一索引不存在、API 可原子 supersede、Worker 仍拒绝写入后重试当前 remediation 发布）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开契约不变，无需改造）

### [2026-09-02] Scientific V2 公开证据渲染绑定真实 batchId — by Codex
变更：公开证据 render bundle 暂存与执行工作流新增必填 `batch_id`，并分别与签名 operator attestation、受保护 render bundle 和最终 publish input 做精确相等校验；不再从 `manifestHash` 推导普通批次名，因此 remediation 批次可进入相同的零 Provider 证据渲染与原子发布链。暂存另以必填 `manifest_code_sha` 绑定原始冻结/生成 lineage，和当前 control/deployed SHA 分开校验，避免为执行后续安全修复而伪造原批次代码 provenance。普通批次传入自己的真实 batchId 与 manifest code SHA 即可，公开 API、排行榜字段、图片、评分和审核结果均不变。
- [x] Benchmark Worker / 运维（两条受保护渲染工作流、真实 batchId 绑定与失败关闭）
- [ ] 部署 / 运维（部署后渲染当前 Seedream remediation 公开证据并原子发布）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开契约不变，无需改造）

### [2026-09-02] Scientific V2 已存盲审分配可安全刷新短时链接 — by Codex
变更：`adminBenchmarkReviewExport` 在批次进入 `review_dispute`、`review_finalized` 或 `published` 后，可重放与数据库中已存记录完全相同的 A/B 盲审分配，用于刷新过期的私有 OSS 签名链接；后续状态仍禁止新建分配、换包或改变 mapping/assignment attestation，所有对象仍按 hash、私有 key、metadata 和 ACL 复验。公开 action、字段、评分与盲审结果不变。
- [x] paperbanana-api（同一已存分配重放、后续状态新分配拒绝及 TDD）
- [ ] 部署 / 运维（部署后复验过期链接可刷新，继续当前 xhigh 仲裁与原子发布）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开契约不变，无需改造）

### [2026-09-02] Scientific V2 审核与发布运维绑定真实 batchId — by Codex
变更：审核结果导入、仲裁结果导入、公开证据发布输入暂存及发布输入只读检查不再从 `manifestHash` 推导普通批次名，统一新增必填 `batch_id` 并校验后原样绑定到受保护 payload。这样 remediation 批次可以复用同一套签名审核、仲裁和原子发布链，普通批次行为不变；公开 API action、请求/响应字段、排行榜字段及客户端均不变。
- [x] Benchmark Worker / 运维（四条受保护工作流、真实 batchId 绑定与契约测试）
- [ ] 部署 / 运维（部署后继续当前 Seedream remediation 的 A/B 导入、仲裁与原子 supersede）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开契约不变，无需改造）

### [2026-09-02] Scientific V2 已持久化 Worker 状态可零 Provider 重建签名导入 — by Codex
变更：当 360 题位的完整 Worker 状态报告超过 GitHub 单行日志上限时，新增受保护恢复入口。它只读取生产机上精确 SHA 绑定的 manifest、最终 completed state 与 post-run operator attestation，在共享锁内以不可变 Worker 镜像、`--network none` 和 root `0600` 输入重建同一状态的签名 Worker report，再通过 localhost admin transport 导入为 `review_ready`。流程固定校验 deployed SHA、镜像 digest、previous/final state hash、HMAC、代码 lineage 和常驻 Worker disabled/concurrency 1；不调用 Provider、不改变图片、题目、路由、评分或失败/unknown 规则。
- [x] Benchmark Worker / 控制面（离线签名 stager、root-only admin handoff 与契约测试）
- [ ] 部署 / 运维（完成当前 Seedream remediation 的签名导入、双盲复审与原子 supersede）

本仓库的用户客户端只保留 `web` 与 `miniprogram`；后端和 Benchmark 基础设施继续由独立 AI 会话 / 开发者维护
（`paperbanana-api` / `auth-gateway` / `laf-functions` / `plot-worker` / `benchmark-worker`）。
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

### [2026-09-02] 方舟 Seedream 5.0 / 4.5 分辨率档位契约修正 — by Codex
变更：`callArkImage` 对 `doubao-seedream-5-0-260128` 与 `doubao-seedream-4-5-251128` 不再把用户选择的 `2K/4K` 档位强制改写为固定 `2048x1152/4096x2304`，而是按火山方舟当前图片生成契约直接发送分辨率档位，由模型在既定档位与提示词比例约束下确定真实像素；生成后仍从原始图片读取实际宽高并保存 SHA-256，返回格式、重试、预算、并发、共享锁及 Scientific V2 评分规则不变。其他方舟模型沿用原请求格式。

各端待办：
- [x] paperbanana-api（模型特定档位映射与回归测试）
- [ ] Scientific V2 生产补跑（仅重新冻结并补跑 Seedream 4.5 / 5.0 的 18 个失败题位）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与字段不变，无需改造）

### [2026-09-02] Scientific V2 remediation 原子替代发布与独立 lifecycle head — by Codex
变更：Scientific V2 immutable release 文档继续保持原字节和原 `releaseHash`，发布生命周期移到独立 `paperbanana_benchmark_release_heads` / `paperbanana_benchmark_release_lifecycle` 文档。首次发布原子建立 active head；后续若同一评测身份已有 active release，普通 batch 仍以 `SCIENTIFIC_V2_RELEASE_IDENTITY_CONFLICT` 拒绝，只有 `remediationOf` 精确绑定当前 active release 的 id/hash、源 batch/manifest 和非空目标集合且集合 hash 一致时，才在同一 Mongo 事务中插入新 release/证据、把旧 lifecycle 标为 superseded、移动 head 并 CAS 标记新 batch published。任一步失败全部回滚；公开 leaderboard/model 查询在 head 存在时只返回 active release，历史 release 仍可按内容 hash 校验和审计。公开 action 与 response 字段不变。

各端待办：
- [x] paperbanana-api（原子 head/lifecycle、精确 remediation 绑定、公开查询过滤及 TDD）
- [ ] 生产发布（审核完成后部署 Core 并以 remediation batch 原子替代当前 V2）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与字段不变，无需改造）

### [2026-09-02] Scientific V2 修正批次可从签名 running 状态进入 full — by Codex
变更：Scientific V2 run-bundle stager 的 `full` 阶段除既有 `canary_complete` 外，新增严格的签名 running-resume 结构：同一 manifest/execution SHA、无 legacy rotation、至少一个非 canary 题位已经是成功/不支持/失败终态、至少一个题位仍为 pending/retrying，且所有题位只能处于这五种状态。这样 remediation 的 328 个携带终态 + 32 个待补跑题位可直接进入 full；仅完成 provider canary 的 running 状态仍被拒绝，避免跳过 canary 边界。最终是否可 claim 仍由 Mongo 的 `status=frozen + remediationOf + 无 claimToken` CAS 约束；unknown、预算阻塞、not_executed、artifact 等状态仍失败关闭。

各端待办：
- [x] Benchmark Worker / 运维（签名 running-resume 结构校验、防 canary 越级及 TDD）
- [ ] 生产执行（在最终代码 SHA 重新冻结同一 32 题集合并单并发补跑）
- [x] paperbanana-api / Web / Gateway / 原生端（公开 action 与字段不变，无需改造）

### [2026-09-02] Scientific V2 修正批次 manifest/state 同源签名导出 — by Codex
变更：`adminBenchmarkControl/operatorAttestation` 在既有签名报告之外新增仅限受保护管理员传输的 `manifestSnapshot`，与 `stateSnapshot` 一起由 Core 从实际冻结批次读取、复验并深冻结；root 运维桥分别以内容 SHA 写入 `0600` manifest/state 文件，公开 stdout 只返回 hash。通用 Scientific V2 管理输入 staging 新增精确 `attest` schema（仅 `batchId`、`manifestHash`），使 remediation 批次可从 Core 实际冻结数据构造 Worker run bundle，禁止在客户端重建 manifest 或绕过 hash/签名。公开 API、排行榜字段、题集、分辨率、评分、重试、预算及 provider 路由均不变。

各端待办：
- [x] paperbanana-api / Benchmark Worker / 运维（Core 同源 manifest/state 导出、内容寻址落盘、attest staging 与 TDD）
- [ ] 生产执行（为五模型 32 个精确失败题位生成 attestation/run bundle 后单并发补跑）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与字段不变，无需改造）

### [2026-09-01] Scientific V2 五模型失败题位修正批次 — by Codex
变更：为已发布 V2 的五个指定模型增加受保护的 `adminBenchmarkControl/freezeRemediationBatch` 运维命令。命令只接受精确绑定的源 batch/manifest/release、排序后的模型与失败题位集合及集合 hash；服务端从已发布 completed 批次重建新 manifest，保留题目、路由、价格、分辨率、成功/unsupported 题位和原始图片，只把指定且已四次确认失败的题位重置为待执行，并把非目标 dispatch 审计账本原子继承到新批次。Worker 仍为 configured-disabled、并发 1、共享生产锁；新失败 marker 额外保存只含稳定 `SCIENTIFIC_V2_*` 代码的私有诊断，不进入公开 API。旧发布不原位改写，修正完成后必须重新双盲、仲裁并原子发布替代版本。

各端待办：
- [x] paperbanana-api / Benchmark Worker / 运维（修正冻结、精确继承、单并发补跑、私有失败代码及 TDD）
- [ ] 生产执行 / 审核 / 原子替代发布（仅 32 个指定失败题位；其余 328 个题位不得重跑）
- [x] Web / Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与字段暂不变，无需改造）

### [2026-09-01] V1 Benchmark 精确退役与 release tombstone — by Codex
变更：按站长明确删除要求，只针对已发布 V1 release `2688db534f05256b6ce25bbd29dc7d445052d347e576898962022e172900cdb2` 新增一次性退役链。退役前必须存在本机完整审计归档及逐文件 SHA-256 清单，并由只读 inspect 从 Mongo 与 OSS 重新枚举目标 run / sample / judgment / dispatch / public evidence、逐对象读回验 SHA、跨 release/记录计算引用数；apply 必须绑定 exact deployed SHA、当前 V2 release hash、归档 manifest hash 和 inspect inventory hash，只删除 V1 独占 `bench/objects/<hash>.png` 与 `bench/public/evidence/<sourceHash>/{thumbnail,detail,full}.webp`，共享对象保留。Mongo 删除仅使用 inspect 返回的精确 run IDs 与 release hash，保留 models/suite 和当前 V2，并在新集合 `paperbanana_benchmark_release_tombstones` 留下不含对象键的 hash/count/bytes tombstone。全程 Worker `configured-disabled`、`enabled=false`、并发 1、生产共享锁、Provider/Judge 调用 0。

各端待办：
- [x] Benchmark Worker / 运维代码（只读清单、共享引用保护、对象删除、Mongo tombstone、归档绑定及 TDD）
- [x] Web（移除总榜批次成功率条；动态详情链接经 200 静态入口恢复漂亮 URL；Top10 模型名可进入详情；动态深链回退不再显示假 404）
- [ ] 部署 / 生产退役（先发布 exact SHA 并运行 inspect；核对本地归档 `b91dcd6966c25f6b46ff0e759ed5f0de75d9caf3a5564171b8a1bdf910ba4e4c`、对象清单/字节/共享引用后再 apply；复验 V2、tombstone、旧 release/对象确已消失）
- [x] Gateway / 小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 不变，无需改造）

### [2026-09-01] Scientific V2 原子发布验证接纳已审计的 unknown 对账链 — by Codex
变更：生产最终发布前检查发现 10 个曾暂停的 `UNKNOWN_PROVIDER_OUTCOME` 均已按既定规则完成零 Provider 调用、无候选产物的人工对账，并在签名最终 state 中转换为 `confirmed_technical_failure`，但不可变 dispatch marker 正确保留原始 `unknown_provider_outcome`，旧发布校验却要求 marker 与最终 attempt hash 完全相同，因而误拒绝合法批次。发布端现只在存在唯一、逐字段绑定 manifest/slot/attempt 的 `unknown_no_artifact_reconciliation` 审计时接受该差异，并复验原始 unknown、确认后失败、零候选/零 spool、凭据状态、时间、audit hash 与最终签名 state；缺失、额外或篡改审计仍拒绝。为准确区分冻结生成/评审数据面的 `executionCodeSha` 与修复后执行原子发布的代码，V2 release/methodology 新增 `publicationCodeSha`；manifest/execution SHA 保持原值。不修改题目、分辨率、四次上限、unknown 零自动重试、预算、评分或盲审。

各端待办：
- [x] paperbanana-api / Benchmark Worker（原子发布 ledger 对账、篡改回归测试）
- [x] Web / Gateway / 原生端（新增只读 provenance 字段 `publicationCodeSha`；现有 UI 无需改造）

### [2026-09-01] Scientific V2 公开证据结果改为容器直接保护落盘 — by Codex
变更：公开 WebP 全量重算与逐对象 SHA 已成功，但旧 workflow 依赖把完整 `{publishInput}` JSON 先装入远端 shell command-substitution、再复制到 root-only 文件；同时 `docker compose run -T` 仍继承 SSH heredoc 的 stdin，会把容器命令之后的落盘/验 hash/安装命令消费掉并以 0 退出，表现为图片已全部复验、GitHub 显示成功而发布输入不存在。容器命令现固定 `</dev/null`，并与既有 review 输出采用同一保护写入协议：容器以服务 UID 在独占 `0700` bind mount 内 `O_EXCL` 创建完整 `0600` publish input，stdout 只返回 hash 和计数；主机再验证所有字段、canonical hash、owner/mode/link 与字节稳定性后安装为 root `0600` 文件。Provider key 仍置空，Provider 调用固定为 0；不改图片、九题、十维、分辨率、评分、失败/unknown、盲审或原子发布规则。

各端待办：
- [x] Benchmark Worker / 部署运维（保护输出 sink、workflow 交接、174 项 Worker 与 37 项控制面测试）
- [x] paperbanana-api / Web / Gateway / 原生端（公开字段和访问方式不变；无需改造）

### [2026-09-01] Scientific V2 公开 WebP 幂等复验兼容 OSS 泛化重复响应 — by Codex
变更：生产只读复验发现阿里 OSS 对已经存在的确定性公开 WebP 有时仅返回无 status/code 的 `ResponseError`，旧 Worker 只把 `409/FileAlreadyExists` 识别为重复对象，因而在图片已存在且未丢失时误报 runtime failure；同一 SDK 的 buffered `get()`、开放式 Range 或无 Range `getStream()` 还可能在 HEAD/单字节 Range 均成功时中断或不结束完整对象流。公开 rendition 写入失败后现按刚生成的确定字节数使用 512 KiB 精确闭区间 Range 分块读取同一内容寻址对象，每块校验响应长度、最多尝试 3 次并丢弃不完整字节（仅重试零费用的 OSS 只读传输；不会重试 Provider），总字节仍硬限制 25 MiB（测试 store 无流接口时才回退 `get()`）；随后逐字节、SHA-256、`image/webp`、immutable cache-control、metadata hash 与 private ACL 复验。只有完全一致（或最小权限凭据精确返回 `403 AccessDenied`）才作为幂等成功，缺失、漂移或公开 ACL 仍失败。不重新生成模型图片、不改对象字节、题目、分辨率、评分、失败/unknown、盲审或发布规则。

各端待办：
- [x] Benchmark Worker / 部署运维（泛化重复响应复验、回归测试与零 Provider 重放）
- [x] paperbanana-api / Web / Gateway / 原生端（公开字段和访问方式不变；无需改造）

### [2026-09-01] Scientific V2 首次成功的 publish input 可零调用复验 — by Codex
变更：当前冻结批次的首次公开证据渲染已经把完整 `{batchId,objectBindings,evidence}` 结果持久化为生产机 root `0600` 文件；后续为了取回 hash 而重复运行图像转换，在已存在私有 WebP 的路径上返回了泛化 runtime error。新增只读复验入口，精确绑定 control/deployed SHA、immutable Worker digest、render bundle 与 manifest，在生产共享锁内使用 `O_NOFOLLOW` 读取原文件，重新计算 canonical `publishInputHash` 并仅输出 hash、evidence 数与 object binding 数；不打印对象键或证据内容，不改写 OSS/DB，不调用任何 Provider。最终 publish 仍由既有 staging 与管理员 action 对完整输入重新验签并原子发布。

各端待办：
- [x] 部署 / 运维（root-only publish input 只读复验与 37 项控制面测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（公开字段、证据与评分规则不变；无需改造）

### [2026-09-01] Scientific V2 公开证据复验兼容审核后的批次状态 — by Codex
变更：生产复验发现同一冻结批次首次公开证据渲染已成功写入 325 个题位证据，但 A/B 双审把 API 控制状态推进到 `review_dispute` 后，Worker 的只读 completed-batch 查询仍只接受 `completed/review_ready`，导致幂等复验误报 `SCIENTIFIC_V2_PUBLIC_RENDER_BATCH_BINDING_INVALID`。查询现接受 `review_dispute/review_finalized/published` 等所有生成完成后的控制状态，同时继续精确绑定 batchId、manifestHash、stateHash，并强制内层签名 state.status 仍为 `completed`。不重新生成、不调用 Provider、不改图片、题目、十维评分、分辨率、失败/unknown、盲审或原子发布规则。

各端待办：
- [x] Benchmark Worker / 部署运维（后审核阶段只读证据复验与回归测试）
- [x] paperbanana-api / Web / Gateway / 原生端（公开字段和行为不变；无需改造）

### [2026-09-01] Scientific V2 争议导出复用 immutable Worker 正式入口并兼容 root UID — by Codex
变更：双审结果已形成 179 个既定争议项，但公开仲裁包被两个控制面假设拦截：生产 SSH 账号拥有临时回传目录时 UID 为 `0`，旧检查错误要求 UID 必须非零；同时 Worker 镜像只发布 esbuild 封装的 `dist/scientific-v2-operator.mjs`，并不存在旧脚本尝试直接 import 的 `dist/scientific-v2-review.js`。争议导出现与已验证的盲审分配导出一致接受任意纯数字的实际 owner UID/GID，并通过正式 `review_finalize` operator bundle 让 immutable Worker 在无网络、Provider key 置空的容器内验签 A/B 与重新计算争议，再将结果同已验签公开 assignment 做盲化绑定。目录非符号链接、模式 `0700`、文件逐字节 SHA 和 root-only 私有输入约束继续保留；争议集合、阈值、题目、分辨率、评分、签名与发布规则均不变。

各端待办：
- [x] 部署 / 运维（争议导出正式 Worker 入口、回传目录 owner 兼容与回归测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（公开与共享契约不变；无需改造）

### [2026-09-01] Scientific V2 控制面 canonical JSON 与 Core 哈希排序一致 — by Codex
变更：盲审导出复核发现部分生产机 Python 交接脚本使用 Unicode code-point 键排序，而共享 `benchmark-core` 的冻结 hash 契约使用 JavaScript `localeCompare`；含 camelCase 邻接键（如 `sources/sourceSetHash`）时会把同一 JSON 误判为 hash 漂移。所有 Scientific V2 生成续跑、Codex 导入、公开渲染、review pack、A/B validation、review import、争议导出、仲裁导入和 publish input 的 Python canonical bridge 现对受限 ASCII schema 使用 case-fold 键序，并以跨 Node/Python fixture 证明输出与 Core 一致。既有 manifest/state/review hash、题目、分数和签名域不变，不重新生成或重签任何已冻结输入。

各端待办：
- [x] Benchmark Worker / paperbanana-api / 部署运维（全链路 canonical bridge 与跨运行时回归测试）
- [x] Web / Gateway / 原生端（公开数据和请求字段不变；无需改造）

### [2026-09-01] Scientific V2 证据统一保持私有并由 API 签名读取 — by Codex
变更：生产验证确认 benchmark OSS 桶级 ACL 已由 readiness 强制为 private，Worker 写入的原图和公开 WebP rendition 也都显式保持 private，但最小权限凭据无 `GetObjectACL`；旧 API 因逐对象 ACL 查询 `403 AccessDenied` 会在盲审分配导出阶段拒绝已经完成字节/hash/HEAD 元数据校验的对象，同时仍错误要求公开 rendition 为 `public-read`。`paperbanana-api` 现仅在精确 `AccessDenied + HTTP 403` 时把对象 ACL 标记为 `unavailable`，其他 ACL 错误继续失败；Scientific V2 原图与 rendition 都只接受 `private|unavailable`，明确拒绝 `public-read`，并继续逐对象验证字节 SHA、对象键、mime 与 cache-control。所有公开访问仍只通过 15 分钟签名 URL；九题、十维、盲审、失败记 0、预算与原子发布规则不变。

各端待办：
- [x] paperbanana-api / Benchmark Worker / 部署运维（私有证据策略、最小权限 ACL fallback、测试与生产部署）
- [x] Web / Gateway / 原生端（公开 URL 与 API 字段不变；无需改造）

### [2026-09-01] Benchmark Worker 的 SVG→PNG 路径显式绑定镜像内 Resvg WASM — by Codex
变更：生产冻结批次证明 OpenRouter `recraft/recraft-v4-pro-vector` 正常声明并返回 SVG 路线，但 Benchmark Worker 复用 API image runtime 时没有经过 API `main` 的启动初始化，`loadResvgWasm()` 因而错误回退到 Laf 专属 `/tmp/custom_dependency/.../index_bg.wasm`，导致已返回 SVG 在 PNG 导出前丢失并被记为 unknown。Worker authoritative runtime 与两类 Compose 服务现统一显式使用镜像内 `/app/node_modules/@resvg/resvg-wasm/index_bg.wasm`；一次性生产配置 workflow 先以 immutable Worker digest、`--network none` 验证该 WASM 文件，再在共享锁下原子更新 root `0600` `bench.env`，Provider 调用固定为 0。九题、十维、分辨率、路由、预算、重试/unknown、盲审和发布规则不变。

各端待办：
- [x] Benchmark Worker / 部署运维（Worker 默认路径、Compose 环境、生产现批次配置）
- [x] paperbanana-api / Web / Gateway / 原生端（API 已有自身 Resvg 初始化；公开契约不变）

### [2026-09-01] Scientific V2 UNKNOWN 经零产物人工对账后可从下一次尝试续跑 — by Codex
变更：当前冻结批次在 OpenRouter Recraft V4 Pro Vector 的首题返回 `UNKNOWN_PROVIDER_OUTCOME` 后按既定规则停机。只读对账 workflow `33453726938` 证明该请求时间窗内私有 OSS 新对象为 0、主机 artifact spool 文件为 0、未遗留 started dispatch，且三家凭据出口均为 HTTP 200。新增一次性、精确绑定 control/deployed SHA、Worker/Core digest、manifest/state/hash 与该对账 run ID 的人工恢复入口：它在生产共享锁下把原 unknown attempt 完整写入独立 immutable reconciliation audit，再将同一 attempt 归类为已人工确认的 technical failure，保留保守费用并从 attempt 2 续跑；绝不自动重试 unknown、绝不从 attempt 1 重发、Provider 并发仍为 1。九题、十维、分辨率、路由、预算、失败四次记 0、双盲审和原子发布规则不变。

各端待办：
- [x] 部署 / 运维（零产物人工对账、不可变审计、精确 CAS 与冻结批次续跑）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（公开与共享契约不变；无需改造）

### [2026-09-01] Scientific V2 私有 draft asset 下载适配 GitHub installation token — by Codex
变更：正式 provider full 成功后，GPT Image 2 私有转运在 GitHub draft release binary 下载处收到 `403 Resource not accessible by integration`；release/asset ID、目标 SHA、大小与 SHA-256 均由本地授权态复核无漂移，未进入 SSH 或状态写入。GitHub 对 draft binary 的 installation token 要求 release-write scope，因此只有四个实际 GET 私有 draft asset 的封闭 workflow 将 `contents` 从 read 调整为 write；命令仍只允许精确 release/asset GET，静态测试禁止 release mutation 与 POST/PATCH/DELETE。旧部署还未预建首次使用的 `codex-artifacts` 子目录，staging 现只对该精确路径做 root `0700` 安全创建，并允许 9 PNG + metadata 全字节/hash/权限一致时幂等重放；任何部分或漂移内容仍拒绝。其他 workflow 权限不变，不重生成图片、不调用 Provider。

各端待办：
- [x] 部署 / 运维（Codex/admin/reviewer/arbitration 私有 draft 下载权限与只读命令门禁）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（数据与公开契约不变；无需改造）

### [2026-09-01] Scientific V2 公开渲染修正 batchId 层级并为冻结批次提供专用 runner — by Codex
变更：发现旧 host operator 在 `render_public_evidence` 已完成 WebP 写入后错误读取不存在的顶层 `batchId`；Worker 的真实封闭 schema 为 `{operation,providerCalls,publishInput,publishInputHash}`，batch ID 位于 `publishInput.batchId`。未来 operator 已按该 schema 修正。为不改变当前冻结 manifest 的 `codeSha=5d9f42e…` 与 immutable Core/Worker digest，新增独立控制面 runner：绑定 current control SHA 与 frozen deployed SHA/镜像/manifest/bundle，使用生产共享锁、Provider key 强制置空、单次 1800 秒窗口运行同一冻结 Worker，重新计算 `publishInputHash` 后把完整结果持久化为 root `0600`。不重跑生成、不改 state、评分或证据字节。

各端待办：
- [x] 部署 / 运维（未来 operator 层级修复、当前冻结批次专用零 Provider render runner 与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（Worker/API 数据契约未变；无需改造）

### [2026-09-01] Scientific V2 公开证据 publish input 在生产机内封闭交接 — by Codex
变更：新增零 Provider 的 publish input staging。它只读取精确 `render_public_evidence` bundle 对应的 root `0600` `publish-input.json`，绑定 deployed SHA、immutable Worker digest、manifest 与 `publishInputHash`，重新计算 canonical hash 后仅把 `{batchId,objectBindings,evidence}` 写入生产机 root `0600` 管理员输入。公开 WebP 的对象/hash 清单在最终 `publish` 管理员 action 中与 DB、双审/仲裁重新计算并原子插入 release；CI、日志和外部草稿资产都不承载该完整输入。

各端待办：
- [x] 部署 / 运维（公开证据 publish input root-only handoff 与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有原子发布与公开接口契约不变；无需改造）

### [2026-09-01] Scientific V2 Worker 仲裁证明在生产机内重签为 API 导入证明 — by Codex
变更：新增零 Provider 的仲裁结果导入 staging。它绑定精确 `review_arbitrate` bundle、对应 root `0600` `review-arbitrated.json`、Worker arbitration/attestation hash、manifest 与 immutable Worker digest，先以 review signing secret 复验 Worker 的完整性证明；随后把已验证的 xhigh 结果加上 batch/sourceSet 上下文，按 API 既有 schema 重新计算 `arbitrationHash` 和专用 HMAC，并只写入生产机 root `0600` 管理员输入。两种 hash 域不混用，密钥和争议详情不进入日志。

各端待办：
- [x] 部署 / 运维（Worker 仲裁证明到 API 导入证明的域分离验签与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有仲裁导入、评分与公开接口契约不变；无需改造）

### [2026-09-01] Scientific V2 xhigh 仲裁回传绑定双份已验签结果 — by Codex
变更：新增零 Provider 的 `review_arbitrate` bundle staging。仅接受精确 draft asset 中封闭 schema 的 `reasoningEffort=xhigh` 仲裁结果，绑定 deployed SHA、manifest、两份独立 `review-validated` 文件、A/B result hash 与 sourceSetHash，并在生产机内加入 review signing secret 形成 root `0600` bundle。immutable Worker 后续会重新计算既定争议集合并拒绝缺失、额外或重复 item；automatic Judges 固定为空，Reviewer 身份、模型映射与签名密钥不进入 artifact 或日志。

各端待办：
- [x] 部署 / 运维（xhigh 仲裁回传闭合 schema、双审绑定与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有仲裁、评分与公开接口契约不变；无需改造）

### [2026-09-01] Scientific V2 争议包由 immutable Worker 离线派生并保持盲化 — by Codex
变更：新增零 Provider 的 A/B 争议导出控制面。它绑定精确 `review_pack`、两份 `review-validated` 结果、manifest、Worker digest 与各自 result hash，在 `--network none` immutable Worker 内重新验签双审、固定 automatic Judge 为 0，并按既定 `>2 分 / 红线冲突 / 低置信度` 规则派生争议。CI 仅获得保留 1 天的去模型身份 `public-arbitration.json`；`modelKey/runHash/privateMappings/privateEnvelope/attestationSecret` 均禁止出现在 artifact。无争议时明确返回 `canFinalize=true`，有争议时只供 `gpt-5.6-sol xhigh` 仲裁，不改变评分或发布公式。

各端待办：
- [x] 部署 / 运维（盲化争议 artifact、immutable Worker 双审验签与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有争议阈值、仲裁与公开接口契约不变；无需改造）

### [2026-09-01] Scientific V2 已验签 A/B 结果在生产机内转管理员导入 — by Codex
变更：新增零 Provider 的 Reviewer 结果导入 staging。它只读取精确 `review_validate` bundle 对应的 root `0600` `review-validated.json`，绑定 deployed SHA、Worker digest、manifest、role、result hash 和 result attestation hash，并使用生产 review signing secret 重新验签；随后在生产机内生成 `{batchId,result}` 管理员输入，全程不经 CI artifact、SCP 或外部草稿资产。automatic Judge 固定为 0，双审、争议阈值、九题、十维、分辨率、路由、预算、失败/unknown 与发布规则不变。

各端待办：
- [x] 部署 / 运维（A/B 验签结果 root-only 管理员导入与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有审核导入与公开接口契约不变；无需改造）

### [2026-09-01] Scientific V2 Reviewer A/B 回传增加私有映射复合验签 — by Codex
变更：新增零 Provider 的 `review_validate` bundle staging。每个 Reviewer 只回传一份封闭 schema 的去身份化公共 assignment 与逐包评分；受保护 workflow 绑定精确 draft asset、deployed SHA、manifest、原 `review_pack` bundle 和 `privateBundleHash`，仅在生产机内恢复对应 A/B 的 `privateMappings/privateEnvelope`，复验 assignment HMAC、包集合与 object mapping 后生成 root `0600` 验证 bundle。Reviewer 永远看不到模型映射或签名密钥；automatic Judge 固定为 0，九题、十维、分辨率、路由、预算、失败/unknown 与争议阈值不变。

各端待办：
- [x] 部署 / 运维（A/B 回传闭合 schema、生产机复合验签与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有审核导入与公开接口契约不变；无需改造）

### [2026-09-01] Scientific V2 A/B 盲包导出保持私有映射留在生产机 — by Codex
变更：新增零 Provider 的 A/B assignment 导出控制面。它使用已完成批次的精确 `review_pack` bundle 在 immutable Worker 中离线重放并核对 `privateBundleHash`，把带 `privateMappings/privateEnvelope` 的两份完整 assignment 与原图 object binding 分别写入生产机 root `0600` 管理员输入；CI 仅上传不含模型映射的 A/B 公共盲包，保留期 1 天。该步骤固定 automatic Judge 为 0，不调用 Provider，不发布 release，也不改变九题、十维、评分、分辨率、路由、预算、失败或 unknown 规则。

各端待办：
- [x] 部署 / 运维（生产机私有 assignment、短期公共盲包 artifact 与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有审核与公开接口契约不变；无需改造）

### [2026-09-01] Scientific V2 盲审前公开证据渲染增加受保护 staging — by Codex
变更：新增零 Provider 的 `render_public_evidence` bundle staging。仅在最终 `state=completed`、operator attestation HMAC、manifest/state/code lineage 与 immutable Worker digest 全部精确绑定时，生成 root `0600` 的离线渲染 bundle；后续只把已验 hash 的私有原图派生为内容寻址 WebP variants，供 A/B 盲审读取。该入口不能发布 release、不能写入评分、不能调用 Provider，也不暴露模型映射、Reviewer 身份或内部对象键；九题、十维、分辨率、路由、预算、失败/unknown 与双独立盲审规则均不变。

各端待办：
- [x] 部署 / 运维（公开 WebP rendition bundle staging 与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有证据与排行榜契约不变；无需改造）

### [2026-09-01] Scientific V2 结果导入与盲审 pack 增加受保护 staging — by Codex
变更：新增两个零 Provider 控制面入口。其一只从精确 GitHub draft asset 接受 `import-worker/import-codex/export-review/import-review/import-arbitration/publish` 六类封闭 JSON schema，绑定 deployed/control SHA、asset ID/名称/大小/SHA 后落入 root `0600` 管理员输入；拒绝 attestation secret 与 Provider/访问密钥字段。其二只在最终 `state=completed`、operator attestation HMAC 与 manifest/state/code lineage 全部通过时，通过已部署的 immutable Worker、`--network none` 和现有 `createScientificReviewPacket/createScientificReviewSourceBindings` 派生 `review_pack` bundle；A/B seed 固定、automatic Judge 调用固定 0。两者均使用生产共享锁，不改题集、路由、预算、分辨率、失败/unknown 或评分规则。

各端待办：
- [x] 部署 / 运维（私有管理员 JSON staging、离线 review pack staging 与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（现有导入/审核/公开契约不变；无需改造）

### [2026-09-01] Scientific V2 Codex 九图导入绑定补齐只读 metadata — by Codex
变更：GPT Image 2 私有交接目录除 9 个内容寻址 PNG 外，固定保存已验签 `metadata.json`（root:service-group `0440`），用于绑定每题 task/thread provenance、调用时序、实际像素、格式、字节和 SHA。新增零 Provider 的导入 bundle staging workflow：只在生产共享锁内读取精确 manifest/state/operator-attestation/metadata 文件 hash，验证 batch 已进入 `awaiting_artifacts`、Worker disabled/并发 1、代码和镜像 digest、operator attestation HMAC 与 9 个 Codex 槽位顺序，再生成 root `0600` 的 `import_codex` bundle。不得读取或传入三家 Provider 密钥；不修改九题、十维、分辨率、预算、重试或 unknown 规则。

各端待办：
- [x] 部署 / 运维（metadata 私有持久化、Codex import bundle staging 与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（导入与公开契约不变；无需改造）

### [2026-09-01] Scientific V2 GPT Image 2 原图使用私有草稿资产交接 — by Codex
变更：Codex 内置 `gpt-image-2` 的 9 张已审计原始 PNG 不进入 Git、不进入公开 release，也不经公网匿名 URL。新增受保护 workflow 只接受一个精确 GitHub draft release asset ID，绑定 deployed/control SHA、manifest、Worker digest、资产名称/大小/SHA 与 metadata SHA；下载后在生产共享锁内再次验证 Worker disabled/并发 1、归档固定 11 个成员、9 个内容寻址 PNG 的逐文件 SHA/字节和只读 metadata，再原子放入该 manifest 专属的 root:service-group `0550` 目录，文件为 `0440`。交接全程零 Provider 调用，批次未进入 `awaiting_artifacts` 前不会导入或改写 state；草稿资产在成功导入后删除。

各端待办：
- [x] 部署 / 运维（draft-only 私有交接 workflow 与静态安全测试）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（执行与公开契约不变；无需改造）

### [2026-09-01] Scientific V2 正式 Provider 等待窗冻结为 300 秒 — by Codex
变更：生产 full 批次在 `qwen-image-3.0-pro` 编辑题精确运行到旧默认 120 秒后进入 `UNKNOWN_PROVIDER_OUTCOME`；只读人工对账已证明该 attempt 时间窗内私有 OSS 与受保护 spool 均无候选原图，三家凭据/出口均为 200。正式评测现在把每次 Provider 请求等待窗显式冻结为 300 秒，并限制可配置范围为 120–600 秒；运维 operator 固定传入 300000ms。30 秒 claim 心跳、并发 1、最高 2K/默认尺寸实测、九题十维、确认失败最多四次、unknown 零自动重试、预算与 canonical 路由全部不变。旧暂停批次仅保留审计；新代码 SHA 重新冻结整批执行。

各端待办：
- [x] paperbanana-api authoritative image runtime（300 秒默认值与 120–600 秒 fail-closed 边界 TDD）
- [x] Benchmark Worker / 部署运维（正式 operator 显式注入 300000ms；30 秒心跳不变）
- [x] Web / Gateway / 原生端（公开接口与 UI 无变化；无需改造）

### [2026-09-01] Scientific V2 unknown 对账改用已持久化 attempt 时间窗 — by Codex
变更：`UNKNOWN_PROVIDER_OUTCOME` 按规则原子写入 batch state 后，其 `started` dispatch marker 会随事务正常清理；旧只读失败检查却仍强制要求 marker 存在，因此无法检查已经暂停的 unknown 是否在私有 OSS 或受保护 spool 留下可恢复原始图片。检查 workflow 现在要求恰好一个 `status=unknown` 槽位和 `responseClass=unknown_provider_outcome` attempt，使用该 attempt 已签名状态中的 `startedAt/completedAt` 作为有界候选时间窗；若旧 marker 偶然仍存在则必须与 slot/attemptIndex 精确一致。整个操作只读、零 Provider 调用，不改变 unknown 零重试、题集、预算、路由或记分规则。

各端待办：
- [x] 部署 / 运维（只读 workflow 与 TDD；用于当前暂停批次人工对账）
- [x] Benchmark Worker / paperbanana-api / Web / Gateway / 原生端（数据与公开契约不变；无需改造）

### [2026-09-01] Scientific V2 百炼应用层失败保留可确认状态 — by Codex
变更：生产 full 批次已成功持久化 20 张原始图片，但 `qwen-image-3.0-pro` 首题遇到百炼 HTTP 200 包内的 `status_code/code` 错误时，legacy authoritative image runtime 只抛出无状态的普通 Error，Worker 因此按安全规则记录为 `unknown_provider_outcome` 并暂停。现在百炼明确声明的非 200 `status_code` 保留其 4xx/5xx 状态，只有 `code` 的应用层拒绝映射为 422；Worker 既有可信 own-property status 门禁会将其作为 confirmed failure，仍按最多 4 次总尝试处理。网络断开、超时、无响应等真正不确定结果仍不携带 status，继续零重试并暂停。同期 GPT Image 2 内置审计 9/9 一次成功，但内置渠道不提供尺寸参数；Codex importer 因而移除旧的 2048×1024 最低门槛，只对该固定默认尺寸渠道完整解码并记录真实像素、格式、字节和 SHA。三家可配置 provider 仍按冻结 route 请求最高 2K，并同样记录实际像素。九题、十维、canonical 路由、预算和评分规则均不变；旧 unknown 批次保留审计，不改写状态，修复后使用新代码 SHA 冻结新批次。

各端待办：
- [x] paperbanana-api / Laf authoritative image runtime（HTTP 200 应用层错误 403/422 RED/GREEN；API 357 tests）
- [x] Benchmark Worker（own-property status 与 unknown 防伪门禁不变；Codex 默认尺寸实测像素导入 RED/GREEN）
- [ ] 部署 / 运维（Core/Worker 以同一新 immutable SHA 部署后重新刷新价格、冻结并执行 V2）
- [x] Web / Gateway / 原生端（公开 API 与 UI 契约不变；无需改造）

### [2026-09-01] Scientific V2 私有证据在无 GetObjectACL 权限时做同字节 ACL 重申 — by Codex
变更：生产 Benchmark OSS RAM 用户可正常 Get/Put 私有内容寻址对象，但缺少独立 `oss:GetObjectAcl`，导致固定编辑源图已存在时被误判为本地产物对账失败；已生成的方舟编辑 PNG 因此只进入受保护 spool，没有丢失或重复调用 Provider。Worker 现在仅在 GetObject/GetStream 得到的字节、SHA-256、MIME、`private, no-store` 和内容寻址键全部精确匹配，且 GetObjectACL 明确返回 403 `AccessDenied` 时，使用同一字节、同一元数据幂等覆盖并重申 `private` ACL。任何内容/元数据差异、未知 ACL 错误或重申写入失败仍 fail closed；不降低私有证据规则，不改变九题、十维、路由、分辨率、重试、预算或公开 API。

各端待办：
- [x] Benchmark Worker（生成持久化与盲审读取两条路径 RED/GREEN；165 tests、check、build）
- [ ] 部署 / 运维（部署新 immutable Worker/Core provenance 后冻结新批次；旧暂停批次仅保留审计，不跨 SHA 续跑）
- [x] paperbanana-api / Web / Gateway / 原生端（公开契约不变；无需改造）

### [2026-09-01] Scientific V2 百炼 direct-edit 固定源图改用私有 OSS 公网签名 URL — by Codex
变更：生成题已恢复并取得百炼/方舟 2048×1152 与 OpenRouter 默认 1824×1024 的原始 PNG；首个百炼编辑题仍在 authoritative runtime 的 source-image 交接阶段失败。Worker 现在把 hash 固定的 2K PNG 编辑源图写入原有私有内容寻址对象，仅在百炼 direct-edit 调用前通过独立 `PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT` 生成最长 900 秒的 V4 GET 签名 URL；legacy source normalizer 会先下载并校验该 URL 的像素字节，但为百炼保留原始 HTTPS，不再转回 data URL 后二次调用被禁用的 Laf storage。签名 URL 不落状态、不写审计、不进入公开证据。方舟/OpenRouter 编辑输入、题集、十维评分、路由优先级、失败/unknown 策略和分辨率规则均不变。签名或源图落盘在 provider 调用前失败时记为零费用 confirmed technical failure，确保不会把本地交接错误误报成 provider unknown。

各端待办：
- [x] Benchmark Worker（私有源图持久化、独立公网 signer、900 秒边界、零调用本地失败 TDD）
- [x] paperbanana-api authoritative runtime（已校验的远端 source URL 原样交给百炼，data URL 路径仍保持原有私有落盘行为）
- [ ] 部署 / 运维（Worker `run` secret 必须提供和 internal endpoint 不同的 HTTPS `PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT`；部署同 SHA 后冻结新批次）
- [x] Web / Gateway / 原生端（公开 API 与 UI 契约不变；无需改造）

### [2026-09-01] Scientific V2 full 暂停态保留已完成 canary 终态 — by Codex
变更：canary-only 会先在执行序列后部留下其他 Provider 的成功 canary；full 从前部普通题位恢复后若遇到 unknown、价格/产物对账或预算门，状态机必须把后续未执行槽位置为 `not_executed`，但保留此前已经成功的 provider canary（以及由已确认失败 canary 派生的精确 route 失败终态）。此前 Worker/Core 镜像 verifier 错误要求中断槽位后的所有槽位一律为 `not_executed`，导致合法暂停态被拒绝并留下 started dispatch。现在两端只为经过既有 canary 证明的终态开放该例外；其他乱序终态仍 fail closed，unknown 零重试和九题/十维规则不变。

各端待办：
- [x] Benchmark Worker（canary → full → unknown RED/GREEN；本地 state verifier）
- [x] paperbanana-api / Laf Core（镜像 imported-state verifier 同步并由同一测试覆盖）
- [ ] 部署 / 运维（先对账当前 started dispatch；部署同 SHA Core/Worker 后冻结新批次重跑）
- [x] Web / Gateway / 原生端（公开契约不变；无需改造）

### [2026-09-01] Scientific V2 authoritative image runtime 恢复受限 PNG/JPEG 解码 — by Codex
变更：Benchmark Worker 动态加载由 `paperbanana-api` 构建的 authoritative image runtime 时，legacy Laf 模块会在进程级阻断 `VipsForeignLoad`，此前只重新放行 WebP，导致三家 Provider 已返回的 PNG/JPEG 在 Worker 原始字节检查阶段统一被误判为技术失败并触发重试。专用 image-runtime 入口现在只重新放行受 Worker 25 MiB / 4000 万像素 / 完整容器校验保护的 PNG、JPEG、WebP buffer loader；SVG 等其他 Sharp foreign loader 继续保持阻断。题集、路由、预算、失败/unknown 策略、API 与公开字段均不改变。

各端待办：
- [x] paperbanana-api image runtime / Benchmark Worker（隔离 RED 测试、PNG/JPEG/WebP 通过且 SVG 仍阻断；API/Worker test/check/build）
- [x] 部署 / 运维（已部署含新 `dist/image-runtime.mjs` 的 immutable Worker；旧 `0 succeeded / 33 failed` 批次保留失败审计；新批次三家正式 canary 均通过 full 门禁）
- [x] Web / Gateway / 原生端（公开契约不变；无需改造）

### [2026-08-31] Scientific V2 legacy recovery 允许一次 pre-execution SHA 迁移 — by Codex
变更：旧 `blocked/provider_canary_failed` 批次可能已被一次只读 attestation 过早写入 recovery `executionCodeSha`，但尚无任何导入的 Worker state report。Core 现在仅在原 blocked state/hash 完全未变、`revision=0`、`latestStateReportHash=null`、不存在 `started` dispatch、原 `legacyRecoveryStateHash` 精确匹配、目标 SHA 不回退到 manifest SHA 且从未迁移过时，允许以 CAS 将 `executionCodeSha` 迁移一次，并写入内部 `lineageRecoveryRotationUsed=true`。`beginDispatch` 在事务内以同一 batch CAS 设置内部 `activeDispatchId`，并绑定当时的 `executionCodeSha`；commit/unknown 在同一事务清除 reservation，rotation 则要求 reservation 不存在。因此 dispatch 与 SHA 迁移只能有一个先成功，stale claim 或跨集合检查竞态不能继续调用 Provider。后续 SHA 再漂移、任何 state/dispatch 进展或普通批次仍 fail closed。

兼容边界：operator attestation、Worker report、公开 release/API 字段均不变；内部布尔位不进入 state、HMAC payload 或公开投影。迁移本身零 Provider 调用，只修复 attestation 与实际执行之间的不可变代码绑定时点。

各端待办：
- [x] paperbanana-api / Laf Core（受约束 CAS 迁移、竞态处理、TDD）
- [ ] 部署 / 运维（部署同一 immutable Core/Worker 后重新 attest；成功导入 revision 1 后不可再迁移）
- [x] Benchmark Worker / Web / 原生端（契约不变；无需改造）

### [2026-08-31] Scientific V2 attestation 导出内容寻址 state snapshot — by Codex
变更：内部 `operatorAttestation` 在完整验证 DB 中 frozen manifest/state 与 `stateHash` 后，额外返回深拷贝冻结的 `stateSnapshot`。香港 admin operator 的 `attest` 仅在 root 私有通道接收该快照，独立写入 `0600` 内容寻址 `*.state.json`，stdout 只新增 `stateBundleSha256`，不输出 state 内容。run-bundle stager 继续以 state 文件 SHA、canonical state hash 与 attestation 中已签名的 `stateHash` 三重校验后组装执行包。

兼容边界：公开 leaderboard/methodology/model profile 不投影 `stateSnapshot`；普通用户请求与现有 attestation HMAC payload 不变。此能力只补齐旧失败运行已写 DB、但 host 未留下 state 文件时的零 Provider 调用恢复路径。

各端待办：
- [x] paperbanana-api / Laf Core（state 完整 verifier、冻结快照、公开投影隔离与 TDD）
- [x] 部署 / 运维（root `0600` 内容寻址落盘、安全摘要与合同测试）
- [x] Benchmark Worker / Web / 原生端（执行与公开请求契约不变）

### [2026-08-31] Scientific V2 canary 失败仅按精确 route identity 审计归零 — by Codex
纠正：单个 provider canary 槽位四次 confirmed failure 只证明精确 `{provider, canonicalModelId}` route identity 本次不可用。仅同时匹配该 provider 与 canonical model 的其他 supported 槽位可派生为 `failed + attempts=[] + costCny=0`；同 provider 的其他 canonical models，以及不同 provider 上的同一 canonical model，都必须继续真实执行，不能被归零或跳过。`providerCanaryAttestation.passed=false` 仍如实绑定 canary 事实，不代表 provider 内所有模型或该 canonical model 的其他路由失败。

兼容边界：旧 `blocked/provider_canary_failed` 状态继续仅用于恢复；unknown provider outcome 仍整批暂停且零重试；双 SHA 与 legacy recovery lineage 不变。公开失败原因仍为 `provider_canary_confirmed_failed`，但其归属严格由已验证 state 中相同 `{provider, canonicalModelId}` 的失败 canary 决定，预算/unknown/reconciliation 绝不折算为零。

各端待办：
- [x] paperbanana-api / Laf Core（镜像 verifier、report import、review/publish 与跨 provider/canonical TDD）
- [x] Benchmark Worker（runner/state verifier 以精确 `{provider, canonicalModelId}` 传播，并覆盖跨 provider 同 canonical 路由继续执行）
- [ ] 部署 / 运维（仅在 Worker/Core 同一 immutable SHA 且全量验证后恢复）
- [x] Web / 原生端（公开字段不变；无需请求改造）

### [2026-08-31] Scientific V2 manifest / execution 双 SHA 与一次性 legacy recovery lineage — by Codex
变更：Scientific V2 不再使用含义模糊的单一公开 `codeSha`。内部 operator attestation、state operation report、Core import/publish 绑定 `manifestCodeSha`、`executionCodeSha`、`legacyRecoveryStateHash`：普通执行必须两 SHA 相等且 recovery hash 为 null；仅 verifier 精确确认的旧 `blocked/provider_canary_failed` 状态可在首次恢复时绑定当时 state hash，并在同一 batch 后续阶段保持不可变 lineage。

公开契约：Scientific release 与 methodology 仅公开 `manifestCodeSha`、`executionCodeSha`、`legacyRecovery` 布尔值；不公开内部 state hash，也不再输出模糊单 `codeSha`。重新签 hash 但夹带 `codeSha/stateHash` 的 Scientific release 仍 fail closed。

各端待办：
- [x] paperbanana-api / Laf Core（lineage 原子固定、report/import/publish 精确校验、公开投影与 TDD）
- [x] Benchmark Worker（run bundle、state report 三字段与恢复续跑一致性）
- [x] 部署 / 运维（attest/stager/operator exact schema 与 immutable execution SHA）
- [x] Web / 原生端（字段为公开只读元数据；现有榜单无需请求参数变更）

### [2026-08-31] Scientific V2 provider canary 失败的分 provider 归零执行语义 — by Codex
变更：Benchmark Worker 不再因某 provider canary 的四次已确认失败而阻断整个批次。失败 canary 保留四次完整 attempts；同一 provider 的其余 supported slot 写入 `failed`、零 attempts、`costCny=0`，作为固定九槽的可审核零分结论，并不再调用该 provider。Ark/OpenRouter 可继续执行；unknown provider outcome 继续保持整批 `paused/reconciliation_required` 与零重试。旧的 `blocked/provider_canary_failed` 状态仍通过 verifier，以支持生产恢复。该语义已被上方“精确 route identity 审计归零”条目纠正。

契约（影响 Worker / Core API / 运维）：
- **state/report**：`providerCanaryAttestation.passed` 现在可为 `false`，但仍由完整 canonical state/report HMAC 绑定；新状态中 failed canary 必须恰为四次 confirmed failure，派生的同 provider 零 attempt failed 仅在非旧 blocked 状态合法。`canary_complete` 可包含一个此类失败 canary，后续 full 不得重派该 provider。该传播范围已被上方纠正条目收窄为精确 `{provider, canonicalModelId}`。
- **兼容边界**：Core API 的导入、review-ready、发布与公开 failure reason 必须同步接受并如实展示该可审核零分状态；在同步前不得把 Worker partial state 导入生产。

各端待办：
- [x] Benchmark Worker（runner、state verifier、state report、原子仓储 TDD）
- [x] paperbanana-api / Laf Core（镜像 verifier、state report/import/publish 与公开 failure reason）
- [ ] 部署 / 运维（仅在同一 immutable SHA 的 Worker+Core 都发布后恢复；旧 blocked state 仍可诊断/attest/stage）
- [x] Web / 原生端（公开客户端字段暂不变）

### [2026-08-31] Scientific V2 生产 canary 只读诊断契约 — by Codex
变更：内部 `adminBenchmarkControl` 新增 `operatorDiagnostic`（部署算子操作名 `diagnose`）。它严格只接受 `{batchId,manifestHash}`，以两者精确读取单一已冻结批次；零 provider 调用、零持久化写入。响应仅含批次/manifest/state hash、state 状态与 pause/block 原因、三家 provider 已花费/未核销金额、revision，以及每家 provider canary 的公开路由标识、case/slot、状态、次数、response class 与安全金额汇总。整个摘要以 canonical `diagnosticHash` 和独立域 HMAC `attestationHash` 绑定；不返回 payload hash、对象键、凭证、时间、评审身份或产物。

契约（影响其他端 / 共享）：
- **内部运维调用**：香港 `run-scientific-v2-admin-operator.sh --operation diagnose` 与受保护 workflow 使用既有 disabled-worker、单并发、同一生产锁及 root `0600` 输入边界；输入固定为上述两个字段，标准输出仅透传校验后的安全摘要，不创建私有结果文件。
- **兼容边界**：既有 `operatorAttestation` 与 stager 的请求/响应 schema 均未改变；此为内部管理命令，公开客户端与普通 benchmark action 无需接入。

各端待办：
- [x] paperbanana-api / Laf Core（精确读取、受限摘要、域隔离 HMAC、TDD）
- [x] 部署 / 运维（`diagnose` 选择项、两字段输入与安全响应校验、TDD）
- [x] Web / 原生端（不适用；无公开契约变更）

### [2026-08-31] 科研评测 v2 staging 使用完整私有 attestation — by Codex
变更：Scientific v2 admin operator 的 `attest` stdout 继续只暴露固定安全摘要，但 root `0600` admin-result 现在保存 Core 返回的完整 HMAC attestation（identity、daemon、并发、共享锁、provider budgets、Codex limit、revision/hash）；此前误把 allowlist 摘要保存为私有文件，导致 run-bundle stager 在任何 Provider 调用前因 attestation schema 缺字段失败。import-review/import-arbitration 的私有保存行为不变。

契约（影响科研 v2 运维）：
- stdout/public log 形状不变；仅受保护的 attest 私有 artifact 内容修正。stager 继续独立重算 HMAC 和全部 manifest/state/hash 门。

各端待办：
- [x] 香港 Scientific v2 admin operator / staging 合同测试
- [x] Core / Worker / Web / Gateway / 原生客户端（公开 API 与运行时字段不变，无需改造）
- [ ] 生产执行（部署同一不可变 SHA 后重新 attest/stage；失败 staging 未产生 Provider 调用）

### [2026-08-31] 科研评测 v2 受保护冻结请求体通道 — by Codex
变更：40 模型 Scientific v2 冻结信封约 1.70 MiB，超过 Core 普通 JSON 的 1 MiB 上限。Core 现仅对同时持有内部 gateway token、admin transport token 且声明 `x-paperbanana-scientific-v2-admin-operation: freeze` 的 localhost 冻结请求开放 8 MiB 上限；解析后再次要求 action/evaluationMode/command 精确为 `adminBenchmarkControl/codex_scientific_v2/freezeBatch`。其他请求继续使用 1 MiB，声明头不得复用于其他管理命令。补齐受生产 Environment、同一共享锁和精确 SHA/hash/phase 约束的 `stage-scientific-v2-run-bundle.yml` 手工入口，调用既有 root-only stager 将 frozen manifest/state 与 Core HMAC attestation 组装为内容寻址 canary/full bundle，阶段本身 Provider 调用为 0。

契约（影响 Core API / 科研 v2 运维）：
- `run-scientific-v2-admin-operator.sh` 的 freeze 调用新增内部声明头；非 freeze 阶段不发送。公开 API action、客户端字段和 CORS 不变。

各端待办：
- [x] paperbanana-api / 香港科研 v2 admin operator（受保护大请求解析、命令绑定、run-bundle staging workflow 与 TDD）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开契约不变，无需改造）
- [ ] 生产执行（合并并部署同一不可变 SHA 后，重新 prepare/freeze；当前三家 Provider 调用仍为 0）

### [2026-08-31] 科研评测 v2 固定保守价格授权入口与 OpenRouter ¥360 硬上限 — by Codex
变更：新增 root-only `authorize-scientific-v2-price-snapshot` 生产入口。Worker 内置 77 条 exact `(provider, modelId, operation)` 保守 CNY 上界，根据已验签 registry authority、完整 official refresh report 与逐字节复验 captures 自动构造 extractor 实际仍 unresolved 的精确 requirement 集；拒绝未知 route/operation、缺失或额外 requirement、refresh/capturedAt/hash 漂移以及低于固定 map 的重签授权。授权与 signed snapshot 都以内容寻址 `0600` 落盘；宿主 wrapper 在同一生产共享锁内验证 HEAD、Core/Worker digest、running image/RepoDigest/build provenance、Worker disabled/concurrency 1 后先运行 authorization CLI，再调用既有 signer。GitHub workflow 只接收 SHA/digest/hash/固定确认词，signing secret 仅通过宿主受保护 env file 注入容器且不进入 argv/stdout；输出只含 authorization/snapshot hash、unresolved 数、三家 baseline/worst-case/cap 安全摘要。

契约（影响 Benchmark Core / Worker / Core API / 运维）：
- Scientific v2 provider budget 固定为 `bailian=180 / ark=180 / openrouter=360 CNY`；price preflight、batch manifest、API import、operator/stager 与公开 methodology 使用同一 provider-specific 值。baseline 必须不超过对应 cap；四次 attempt worst-case 继续只披露、不构成授权，runtime 每次 dispatch 前仍按对应硬上限停止。
- 保守 map 固定北京/官方 OpenRouter 路径与 USD×8 上界；FLUX provider-default 固定 output 4MP，仅 Flex edit 额外计入 2.359296MP source。UNKNOWN_PROVIDER_OUTCOME 仍零重试，并发 1、共享锁、常驻 Worker disabled 不变。
- price preflight schema 内预算从单值 `providerBudgetCnyAtoms` 改为 `providerBudgetsCnyAtoms`，每个 provider total 同时绑定自己的 `providerBudgetCnyAtoms`。

各端待办：
- [x] benchmark-core / Benchmark Worker / paperbanana-api（provider-specific cap、固定 map、严格 report/capture/authorization 验证与 TDD）
- [x] 香港部署代码（root CLI、共享锁 wrapper、固定 digest/provenance 门、手工 workflow 与合同测试）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与客户端字段不变，无需改造）
- [ ] 生产执行（本条只提交代码；未部署、未读取真实 secret、未调用 Provider，必须以合并后的 immutable SHA/digests 和新鲜 authority/report 另行手工触发）

### [2026-08-31] 科研评测 v2 授权保守价格、三家 canary-only 与受保护宿主组装 — by Codex
变更：价格快照在 Ark/Krea 精确 raw-byte extractor 之外，允许 root-only signer 为仍未闭合的 requirement 使用显式 `operator_authorized_conservative_upper_bound`；授权文件绑定部署 SHA、canonical manifest、requirements、capture time、完整 unresolved requirementHash→unitCny 集合和固定确认词，并以 `operatorAuthorizationHash` 进入 price envelope 与 batch manifest，禁止 runtime/caller 临时选价。provider-default 固定以 2048×1152 预估，provider 成功后即使 artifact/spool/OSS 失败也按原始图片 width/height/hash 重算 actual CNY。新增固定官方源 refresh entry/workflow、root signer 镜像入口和 root run-bundle stager；secret 只从宿主受保护 env 读取，不进 argv/stdout。

契约（影响 Benchmark Core / Worker / Core API / 运维）：
- `ScientificV2BatchManifest` 新增必填 `priceOperatorAuthorizationHash`；价格 snapshot/envelope 新增 `operatorAuthorizationHash`。未使用上界时固定为 null，使用时必须与授权文件及所有 fallback observations 精确一致。
- `run` bundle 可带 `executionPhase=canary-only|full`。canary-only 仅按 Bailian→Ark→OpenRouter 执行每家首个 formal supported slot，成功即停该 provider 并形成 `canary_complete`；full 必须从该状态恢复且不重复 canary。每 provider ¥180、并发 1、共享锁及 UNKNOWN_PROVIDER_OUTCOME 零重试不变。
- admin attestation 安全响应新增 `revision/issuedAt`，以 `paperbanana/scientific-v2/operator-attestation/v1` 专用派生 key 签名并内容寻址落盘；`stage-scientific-v2-run-bundle.sh` 重算 canonical report/manifest/state/registry/price hash、验证 domain HMAC 与 disabled/concurrency/lock/budget 门后，才从 root-owned manifest/state/attestation 与本机 signing master 组装 run bundle，仅输出 `runBundleHash` 等安全摘要。
- registry authority 与 official refresh report 必须共享同一 `capturedAt`，Signer 与 Core freeze 的 freshness 门统一为 24 小时（恰好 24h 可接受，超过即拒绝），避免 refresh/人工 upper-bound staging 后出现 signer 可签但 freeze 因旧 5 分钟门失败。

各端待办：
- [x] benchmark-core / Benchmark Worker / paperbanana-api（授权上界、actual pixel reconciliation、canary state/resume、attestation 元数据与 TDD）
- [x] 香港部署代码（固定 URL 有界 refresh、root signer/stager、内容寻址 0600、workflow/合同测试）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与客户端字段不变，无需改造）
- [ ] 生产执行（本条未提交/部署/读真实 secret/调用 Provider；合并后须先人工核验授权上界不低估，再以 immutable SHA/digests 执行 canary-only）
- [ ] 精确价格完善（完整百炼与非 Krea OpenRouter/MAI 仍须补 deterministic extractor；在完成前必须保留授权上界标记，不得宣称 exact）

### [2026-08-31] 科研评测 v2 固定官方价格 extractor、root signer 与实际像素费用对账 — by Codex
变更：Scientific V2 price snapshot 继续使用 schema v2，但新增 `canonicalManifestHash / capturesHash`，OpenRouter evidence 新增可空 `pricingPage`；签名 envelope 额外绑定 server-attested registry authority hash、captures hash 与 requirements hash。官方 refresh 固定使用火山方舟价格文档精确 URL，并为 Krea 2 Large / Medium / Medium Turbo 抓取精确详情页；raw bytes 经调用方保护 sink 持久化后，extractor 会重读并复验 byte size/hash，Ark exact production ID 与 Krea generation/style-reference 价格才可生成 observation。新增 official-only signer/落盘入口：复验 registry authority HMAC、code/manifest/capture/requirements、24h freshness，root-only 写入内容寻址 `0600` JSON，secret 不进入 argv/stdout。provider-default 预估固定 2048×1152；成功图片对 MP 计价或 Seedream 5 Pro 261 万像素阈值按原始 width/height/hash 重算 actual CNY，原有每 provider ¥180、UNKNOWN_PROVIDER_OUTCOME 零重试与 price-reconciliation 门不变。

契约（影响 Benchmark Core / Worker / 运维）：
- `ScientificV2PriceSnapshotV2` 顶层新增必填 `canonicalManifestHash / capturesHash`；`ScientificV2OpenRouterPriceEvidence` 新增必填但可为 null 的 `pricingPage`。所有消费者必须 exact schema 校验并重算 snapshot/envelope hash。
- 当前确定性 extractor 只闭合用户已授权的 Ark 四个 exact IDs 与 Krea 三个 exact IDs；百炼价格表、其他 OpenRouter endpoints、MAI token 上界及其余 provider-default MP 规则仍返回 `deterministic_official_price_extractor_unavailable`，official signer 对任一 unresolved 整体拒绝，因此尚未生成 production resolved snapshot。

各端待办：
- [x] benchmark-core / Benchmark Worker（固定来源 extractor、captures/manifest 绑定、root signer、实际像素对账与 TDD）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与客户端字段不变，无需改造）
- [ ] 生产价格闭合 / 运维（补齐百炼、通用 OpenRouter/MAI 的 deterministic raw extractor 后重抓全部 77 requirements；在此之前不得签名完整 snapshot、prepare 或调用 Provider）

### [2026-08-31] 科研评测 v2 server-attested 生产桥、hash artifact 导入与受保护审核阶段 — by Codex
变更：科研 v2 新增 root-only prepare/admin host bridge。prepare 通过 localhost gateway/admin transport 读取当前 `modelRegistry`，只规范化 `registryVersion / routeContractVersion / providers.{bailian,ark,openrouter}` scientific subset，并由 Core 以现有 Bench review-signing master 的 registry 专用派生 key 绑定部署 SHA、当前 capturedAt 和 subset JSON bytes hash；缺任一三家或任一三家在 array/object `unavailableProviders` 中均拒绝。签名价格快照使用独立 domain key 验证，Actions 不接触 master secret。prepare 产出 root-owned `0600` 内容寻址 manifest/state/inspect/freeze/attest；inspect 可直接交 phase wrapper，freeze/attest 可直接交 admin wrapper。

契约（影响 Benchmark Worker / Core API / 运维）：
- 生产 Core 的 V2 `freezeBatch` 必须验证新鲜 registry authority、immutable code SHA 和 exact normalized registry bytes；caller 自证或重放旧 registry 不再可用。旧 V2 测试/非生产 repository 默认保持兼容，只有生产构造显式强制。
- 新增受保护内部 admin command `prepareScientificV2Registry`，继续复用既有 `adminBenchmarkControl` action 和 localhost admin transport，不新增公网 action。V2 admin wrapper 固定支持 `freeze / attest / import-worker / import-codex / export-review / import-review / import-arbitration / publish`，共享生产锁、root `0600` 输入、operation-specific stdout allowlist；发布只能走 Core API 原子事务。
- Codex 九图 JSON 不再搬运 base64；`import_codex` 只接受受保护 per-manifest 目录下的 `<sha256>.<png|jpeg|webp>` 引用。目录 root:service `0550`，文件 root:service `0440` 或 service `0600`；Worker 验 root/path inode 与时间戳、`O_NOFOLLOW`、单 hardlink、owner/mode、每图 25 MiB、总计 192 MiB、byte size/hash，并保留首题 canary/provenance。
- phase operator 新增 `review_validate / review_arbitrate`，内部组装 public/private assignment、验证 reviewer result HMAC 和 xhigh arbitration HMAC；private mapping、reviewer identity 与完整 validated/arbitrated/finalized body 只写受保护 `0600` 文件，stdout 仅 hash/count。admin import-review/import-arbitration 同样只持久化 root `0600` 完整结果，且逐 command 校验 Core 成功响应的必需字段，空 `data:{}` 不可成功。scientific workflow 新增必填 `expected_core_digest / expected_worker_digest` 64hex；prepare/admin/phase wrapper 同时核对 `.env`、running `.Config.Image`、RepoDigest、镜像内 build provenance，且实测 resident Worker disabled、concurrency 1。

各端待办：
- [x] Benchmark Worker / paperbanana-api（authority、prepare、artifactRef、review validate/arbitrate、atomic publish边界与TDD）
- [x] 香港部署代码（protected workflows、root wrappers、bootstrap/compose、共享锁、digest/secret/stdout/文件权限门）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与客户端字段不变，无需改造）
- [ ] 生产执行（本条未提交、未部署、未调用 Provider、未读取真实 secret；须等权威价格 snapshot 全部 resolved 后，以合并后的 immutable SHA/digests 分阶段人工执行和浏览器验收）

### [2026-08-31] 科研评测 v2 权威价格证据、逐 route 输出档位与签名快照 — by Codex
变更：科研 v2 不再接受 caller 以 `sourceVerified:true` 自证的 CNY 单价。价格快照 v2 从 server-attested canonical manifest 唯一推导实际 `(provider, modelId, operation)`，为每条 physical route 固定输出请求档位（声明 2K 则 2K、仅 1K 则 1K、无 resolution 参数则 provider-default），生成和 direct-edit 必须分别有证据；编辑固定绑定 2048×1152 source hash。每条价格绑定原币、计价项/unit/variant、地区、官方 HTTPS URL、响应 bytes SHA-256/capturedAt；OpenRouter 额外绑定 models/endpoint 原始 pricing 与 ECB EUR 交叉 USD/CNY 汇率证据。CNY 以 1e-8 定点向上保守舍入，requirement/entry/preflight/snapshot 全部内容寻址。OpenRouter 多 variant 取请求档位下适用最高价，edit 累计适用 input image/reference/request；固定 1K/2K 像素不可由 caller 改小，provider-default 的 MP 或缺 token 上界均 unresolved 并整批停止。

契约（影响 Benchmark Worker / Core API / 运维）：
- `ScientificV2PriceSnapshot` 升级为 schema v2：顶层含 `imageSize=per-route / requirements / requirementsHash / entries / preflight / snapshotHash`；entry 含 `imageSize / billingRegion / outputWidth/Height / charges / source / openRouterEvidence / fxEvidence / originalCurrency / scenario / unitCnyAtoms / unitCny / rounding / entryHash`。
- execution slot 新增 `imageSize: 1K|2K|provider-default|null`，并进入 provider payload hash；Worker 与 Core API 必须 exact parity。旧 v1 benchmark 价格/授权契约保持不变。
- provider 预算仍为三家各 ¥180：prepare 只在全部固定 slots 的 baseline 超限时阻塞；同时披露每槽最多 4 次的 worst-case，实际 retry 每次仍在运行前计入同一硬上限。价格/汇率/像素/token 上界无法精确解析或 capture 漂移时 fail-close。
- price envelope 固定为 `scientific-v2-authoritative-price-v2`，绑定 code SHA、canonical manifest hash、snapshot hash/capturedAt；复用现有 review signing master，但先以 `paperbanana/scientific-v2/price-attestation/v2` 派生独立 domain key，禁止与 review/report/registry 签名互换。prepare 的 `createdAt` 必须直接使用该签名 snapshot 的 `capturedAt` 并再次精确校验，禁止依赖两个时钟的毫秒偶合。受保护 prepare 输入可含签名，公开/日志输出只能含 secret-free content-addressed snapshot/hash。
- OpenRouter `rawPricing` 的未知 billable/unit/variant 一律 fail-close，不再 filter 后忽略；官方 refresh 在读取前校验 `Content-Length`，并以 4 MiB streaming hard cap 读取和主动 abort。当前模块仅导出签名 verifier，不导出 caller observation 的生产 signer；refresh report 递归入口冻结且固定 `resolved:false`。未来 root signer 必须重读持久化 raw bytes、确定性解析全部官方来源并验证 `capturesHash` 后才能开放。

各端待办：
- [x] benchmark-core / Benchmark Worker（权威 schema、保守换算、baseline/worst-case preflight、逐 route lane、签名/过期验证、TDD）
- [x] paperbanana-api（freeze/import 对同一 snapshot、slot lane、payload hash exact parity）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与客户端字段不变，无需改造）
- [ ] 生产价格 refresh / signer（必须以执行前 server-attested manifest 重抓并持久化 Alibaba Model Studio、Volcengine Ark、OpenRouter models/endpoints 与 ECB 原始 bytes，再由尚未实现的 deterministic extractor/root signer 重读、解析并绑定 capturesHash；当前 Ark exact endpoint/model 价、Krea 空 pricing、MAI token/部分 provider-default 上界等仍 unresolved，不得生成或签名完整 snapshot、不得调用 Provider）

### [2026-08-31] 科研评测 v2 七阶段受保护生产 operator 与持久 artifact spool — by Codex
变更：科研 v2 一次性 operator 从 `inspect/run` 扩展为 `inspect / run / reconcile_artifact / import_codex / render_public_evidence / review_pack / review_finalize` 七个固定阶段。每阶段均绑定精确部署 SHA、受保护 bundle SHA-256、registry/suite/price/manifest hash、模型数、常驻 Worker disabled、并发 1、香港生产共享锁和逐阶段确认短语；除 `run` 外均输出 `providerCalls=0` 证明。除 `inspect` 外六阶段缺少 `--apply` 会在任何主机/容器/DB/OSS/private handoff 前拒绝。`inspect` 与 review 两阶段使用不可变 Worker 镜像、只读根文件系统、`network none` 且不加载 Bench env；有网络但零 Provider 的导入/对账/渲染阶段会显式清空三家 Provider key。`render_public_evidence` 只产出 API publish input，禁止 operator 直写 release，最终发布仍由 Core API 事务原子完成。

契约（影响 Worker / 运维）：
- 新增运行时 env `PAPERBANANA_SCIENTIFIC_V2_ARTIFACT_SPOOL_DIR`，仅 `run/reconcile_artifact` 由 host wrapper 固定为容器内 `/var/lib/paperbanana/scientific-v2-artifact-spool`，精确映射宿主机 `/opt/paperbanana/data/scientific-v2-artifact-spool`。目录固定服务 UID/GID `1000:1000`、`0700`，bootstrap 与每次执行均要求至少 1 GiB 可用；其他五阶段不挂载该目录。
- bundle snapshot 使用 root-owned `0550` 输入目录和 `root:service 0440` 文件，容器只收到该文件的只读 bind；Worker 必须通过 `PAPERBANANA_SCIENTIFIC_V2_EXPECTED_BUNDLE_SHA256` 对同一打开文件的字节再次验 hash。review 私有输出另用 service-owned `0700` RW 目录及 `PAPERBANANA_SCIENTIFIC_V2_PRIVATE_OUTPUT_DIR`，禁止与输入 bundle 共用可写目录。
- review private mappings 只写 `/opt/paperbanana/operator-private/scientific-v2/<bundleHash>.review-private.json`，目录 `0700`、文件 `0600`，同 bundle 仅允许字节完全相同的幂等重放；stdout 只含公共审核包和安全 hash，不含映射、reviewer identity、attestation secret 或 provider 凭据。

各端待办：
- [x] 部署 / 运维代码（workflow、host wrapper、bootstrap/compose、七阶段/跨 manifest-state 负例、spool 权限/容量与脱敏测试）
- [x] Benchmark Worker / Core API（沿用现有七 operation 与 signed state import、review、publish input/atomic publish 契约；无新增直写发布路径）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 与客户端字段不变，无需改造）
- [ ] 生产执行（本条未部署、未调用 Provider、未导入真实审核、未发布 release；仍需合并后按固定 SHA 分阶段人工执行与浏览器验收）

### [2026-08-30] 科研插图评测 v2、批次原子发布与统一排行榜会话 — by Codex
变更：新增与历史 `pb-image-light-v1 / codex_single` 完全隔离的九题十维科研插图评测。正式身份固定为 `suiteId=pb-scientific-figure-v2`、`evaluationMode=codex_scientific_v2`、`evaluationEpoch=codex-scientific-2026-09-v1`、`reviewProtocol=codex-independent-double-review-v2`、`presentationVersion=scientific-leaderboard-v2`。六道生成题与三道确定性局部编辑题覆盖科研忠实度、结构拓扑、文字符号、数值图表、指令遵从、信息层级/可读性、信息密度、发表级美观、编辑目标命中和非目标保持；十维等权 raw mean，competition ranking 使用 `1,1,3`。v2 整批生成、编辑、A/B 独立盲审、争议仲裁、对象/hash 与费用对账全部完成后才原子发布；此前 v1 继续作为正式榜。

契约（影响 Web / Core / Worker / Gateway / 运维）：
- 生产 registry 中 selectable image route 按规范 identity 做 canonical 去重，访问优先级固定 `bailian → ark → openrouter`；OpenRouter 的 OpenAI/Google route 按规范化 provider/vendor/model identity 排除，另加入 `codex:gpt-image-2`。生成使用最高优先级 route；编辑只允许同 canonical 模型的最高优先级 `direct-edit`，不得使用 `analyze-redraw` 或失败后静默换渠道。
- 新 batch manifest/state 绑定代码 SHA、registry/suite/price hash、完整模型与九题清单、生成/编辑 route、三家各 ¥180 硬上限、Codex 最多 36 次工具调用、并发 1、生产共享锁、attempt/payload/响应分类/费用/原始文件 hash/像素/格式与执行次序。确认失败最多总计 4 次；`UNKNOWN_PROVIDER_OUTCOME` 零自动重试并暂停对账；预算/价格/unknown 未解决时禁止半批发布，也不得把未执行模型记 0。
- 审核包绑定题目、适用维度、图片、rubric 和 attempt；编辑项额外绑定 source/edited hash、编号区域和指令。A/B 使用不同盲标签排列；分差大于 2、红线冲突或低置信度才仲裁；automatic Judge 固定 0。公开接口在 v2 返回十维、生成/编辑成功率、尝试摘要、失败原因、九题 evidence 与编辑 before/after WebP，但继续隐藏 blind map、签名、内部对象键和 reviewer 身份。
- Web 新增统一 `LeaderboardRoot / LeaderboardSessionProvider / BenchmarkSiteHeader`。原五个导航文字、href、外链和 active 行为不变；新增意见反馈及登录/注册、邮箱、账号、退出。排行榜根只获取一次 session；投稿、管理员页和 header 共享状态；退出或删号立即清空管理员数据并阻止迟到响应回填。首页及其按钮保持不变。
- v2 最终生产验收后才可精确归档并退役 v1 evidence；只删除引用计数确认后的 v1 独占对象，保留 release hash tombstone，并经 D+7 健康/hash/清单复核后永久删除命名的临时归档与本地审计目录。

各端待办：
- [x] benchmark-core（独立 v2 contracts/suite/十维评分、canonical route、确定性编辑源图与审核绑定）
- [x] Benchmark Worker（batch 冻结、预算/锁/attempt、生成/编辑执行、Codex artifact 导入与双审分包）
- [x] paperbanana-api（batch/审核/仲裁存储、完整性重算、单 release 原子发布与 v2 公共投影）
- [x] Web（十维总榜/方法/九题 evidence/before-after、统一 header/session、登录反馈与管理员竞态保护）
- [x] packages-api / auth-gateway（沿用既有 action 与管理员身份边界；v2 新字段向后兼容，无新客户端 secret，无需改造）
- [x] Codex 周任务运行基座（detached clean worktree 固定 `3e63a5f59f206e4a37418a1a3d4dc529073fcae4`，三个投稿管理员 action 已核对；现有 `paperbanana` 自动化保留 ID/ACTIVE/周一 10:00/模型/通知策略并新增绝对路径、HEAD、clean、action 与只读 dry-run 零写入门）
- [ ] 部署 / 运维（固定 SHA/registry-suite-price hashes/模型数/三家预算/Codex 36 次/Worker disabled/并发 1/共享锁；只重建变更服务并复用其他 digest）
- [ ] GPT Image 2 生成审计（独立 Codex 任务、首题 artifact canary、九题原始文件与 provenance；未通过执行门前不得调用）
- [ ] 生产评测、双盲审核、原子发布、浏览器验收、v1 精确退役与 D+7 删除 heartbeat

### [2026-08-30] Bench 生成证据与社区候选题参与 — by Codex
变更：在已校验 `releaseHash` 的正式 `codex_single` / `published` 排行榜投影上新增公开生成证据，不迁移、不覆盖历史 Quick/Full、失败模型、盲审包或私有 PNG。`benchmarkModelProfile` 仅对公开合格 profile 懒加载 `evidence` / `cases`；新增匿名只读 `benchmarkCaseEvidence`，按题目每批最多 12 个模型返回。公开 evidence allowlist 固定为 `sampleId / caseId / profileId / modelId / imageHash / actualOutputPixels / variants / scores / reviewNotes`，WebP variant 只允许内容寻址的 `bench/public/evidence/<sourceHash>/*.webp`，每次签名之前复验对象 hash；盲标签、对象原路径、packet/review 签名、内部记录、投稿身份和管理员身份均不公开。Benchmark Worker 的 Standard 成功样本会生成不放大的 640 / 1600 / full 三档真实 WebP，原 PNG 不覆盖；新增受 disabled-worker、并发 1、固定 release hash、共享锁和显式确认保护的一次性幂等回填 entry，不产生生图或 Judge 调用。

契约（影响 Web / Core / Gateway / Worker / 运维）：
- 新增 `benchmarkPromptSubmission`：必须由 Gateway 注入已登录 `userId` 与可信 `clientIp`；只收五个文字字段，拒绝 HTML、URL、附件语义；账号每天 5 条、IP 每天 20 条，重复内容幂等。
- 新增管理员 action：`adminBenchmarkPromptQueue / adminBenchmarkPromptDigest / adminBenchmarkPromptDecision`。状态为 `pending → grouped → candidate → approved_for_next_suite / merged / rejected`；digest 使用共享租约锁、稳定 digest ID 与来源投稿 ID；批准只表示下期候选，不能修改正式 suite、启动生成或改变榜单。
- 新增 Mongo collection：`paperbanana_benchmark_public_evidence / paperbanana_benchmark_prompt_submissions / paperbanana_benchmark_prompt_digests` 及查询/限频索引。原始投稿身份只在管理员队列可见。
- 新增手工 `Backfill Public Benchmark Evidence` workflow：`inspect` 只读核对，`apply` 才写 WebP/evidence；两者均绑定 exact deployed SHA、source release hash、`configured-disabled`、Worker disabled/并发 1 与香港生产共享锁，输出固定证明 `generatedOrJudgeCalls=0`。
- 香港 Mongo 最小权限角色同步覆盖新集合：Core API 对三项新集合具备 `find/insert/update/createIndex/listIndexes`；disabled Benchmark Worker 对 public evidence 仅增加回填所需 `find/insert/update`，并对不可变 releases 增加回填校验所需的单一 `find` 权限，不扩大 release 写入、Provider 或正式测评权限。
- Web 新增 `/leaderboard/models/:profileId`、`/leaderboard/cases/:caseId`、`/leaderboard/submit-prompt`、`/leaderboard/admin/prompt-submissions`；排行榜首屏不请求样本图，证据图使用 `srcset + loading=lazy + decoding=async`，详情图只在主动放大时请求。

各端待办：
- [x] paperbanana-api / Core（公开 evidence 投影、投稿存储/限频、digest 锁、管理员审核、hash fail-closed 与 TDD）
- [x] auth-gateway / packages-api（匿名 evidence 读取、登录身份/IP 注入、三项管理员 action 转发）
- [x] Benchmark Worker（新样本三档 WebP、内容 hash、不可覆盖写、幂等回填 entry；生产 124 张已审核样本已完成回填）
- [x] Web（模型证据、同题对比、投稿与管理员页，静态入口/404 深链、懒加载与移动端布局）
- [x] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（新 action 与页面只由 Web 使用；现有契约不变，无需改造）
- [x] Codex 定时任务（已创建 ACTIVE 项目级任务 `paperbanana`，每周一 10:00 按本机 Asia/Shanghai 时区；只整理 pending 并提交 digest，不得修改 suite 或运行测评；失败时通知）
- [x] 部署 / 运维（功能 PR #74 与生产修复 PR #76–#83 已合并。香港 Core / Benchmark Worker 固定代码 SHA `2151ce8390104cafa9ad7f239e8f02da1b0382cf`，最终镜像分别为 `paperbanana-core-api@sha256:10247c40…` / `paperbanana-benchmark-worker@sha256:c855935b…`；Gateway `sha256:2af6894e…`、Plot Worker `sha256:23894f48…`、Mongo `sha256:5dda65a8…` 均复用且 Plot Worker 未重建。生产部署 run `33307212688` 成功，Worker 保持 configured-disabled / disabled / 并发 1。只读 inspect run `33307277050` 验证 release `2688db53…`、31 模型、124 源样本、0 已发布；幂等 apply run `33307319063` 发布 124/124 evidence，固定证明 `generatedOrJudgeCalls=0`。Web/Pages SHA `b383262693aa5fecc9c77c18d360c537865901a4`、run `33308241316` 已发布；生产 API 验证模型证据 4 张、题目页 12→24→31 分页、三档 WebP、MIME `image/webp`、immutable 一年缓存与内容 hash 一致，匿名投稿返回 401；真实浏览器深链刷新、非法路由、390/430 无页面级横向溢出和懒加载契约通过。全过程未触发生图或 Judge）

### [2026-08-29] Bench 完整公开方法题集与独立方法页 — by Codex
变更：公开 `benchmarkMethodology` 在 `evaluationMode=codex_single` 且 `profileStatus=published` 的 Arena release 上，先做 `releaseHash` 校验，再新增顶层 `suite` / `scoring`；历史 Quick/Full、`provisional` / `verified` 与无 release 结果继续保持旧形状，不回填、不改名。`suite` 的权威来源是 `PB_IMAGE_LIGHT_V1` allowlist 的深拷贝：完整公开四题正/负向提示词、约束、七维 rubric、许可、case / suite hash；不公开盲标签、模型映射、审核记录、签名/密钥/operator 材料。`scoring` 公共化 0-10 评分，要求至少 3/4、最多 4，七维等权，competition 采用 `1,1,3`，并明确 confirmed axis cap。Web 总榜移除内嵌“读榜前需要知道”，新增 `/leaderboard/methodology` 以及静态 root / non-root / 尾斜杠入口；所有方法链接改为正式路由。方法页只请求 `benchmarkMethodology`，严格 normalize，复制状态防竞态，旧或畸形响应 fail closed，且不带内置 prompt 副本。公开 action 名称不变，新字段向后兼容，不触发任何生成 / Judge / 付费。
各端待办：
- [x] paperbanana-api（`benchmarkMethodology` 新增 `suite` / `scoring` 顶层字段，Arena release 仅在 `releaseHash` 校验后公开；历史形状保持不变）
- [x] Web（`/leaderboard/methodology`、静态 root / non-root / 尾斜杠入口、正式方法路由、严格 normalize / fail closed、移除内嵌方法提示）
- [x] packages-api / auth-gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 名称不变；新增字段向后兼容；无需改造）
- [x] 部署 / 运维（PR #71 合并为 `58c0f3f8cac89ffc9c47798f0e474c331cc56c66`；香港 Core/Benchmark 以不可变镜像部署，Gateway/Plot/Mongo 复用现网摘要，Worker 保持 configured-disabled / 并发 1；Pages 以 `bench_enabled=true` 发布。生产只读 smoke：`/health`、`/ready` 正常，方法接口返回 4 题 / 0 automatic Judge，方法页与总榜均为 200；未触发生成或 Judge 调用）

### [2026-08-29] Bench Arena 式公开排行榜投影与 Web 路由 — by Codex
变更：仅对 `evaluationMode=codex_single` 且 `profileStatus=published` 的新 Standard release，在源 `releaseHash` 校验后派生公开 presentation；历史 Quick/Full、`provisional` / `verified` 不迁移、不覆盖。公开资格只认 `ranked===true`、`sampleCount>=3`、七轴 `mean` 全 finite；公开 leaderboard/profile 隐藏失败、暂停、样本不足条目，但原不可变 release / 账本不物理删除。`overall` 为七维 raw mean 等权平均；`overall` / 七维都用 raw 降序 competition ranking `1,1,3`。新增公开字段 `overallScore`、`overallRank`、`dimensionRanks`、`sourceReleaseHash`、`presentationVersion`、`eligibleModelCount`、`rankingMethod`；方法学对新榜 `noOverallScore=false`。Web 正式路由改为 `/leaderboard` + 七个子路由并替换旧 `/bench`；GitHub Pages 生成静态入口和仅限 `leaderboard` / `bench` 的 404 fallback；顶栏改“排行榜”并移除 Windows / Mac，其他客户端 UI 不改。不展示置信区间；小榜仅 Top10、总矩阵显示 `rank + score`；不新增任何生成 / Judge 调用。
各端待办：
- [x] paperbanana-api（Standard release 公共 presentation 投影、公开字段/排序/方法学字段与后端兼容）
- [x] Web（`/leaderboard` + 七子路由、`/bench` 替换、GitHub Pages 静态入口与 404 fallback、顶栏文案调整）
- [x] auth-gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开 action 名称不变，新增字段向后兼容，无需改造）
- [x] 部署 / 运维（随 PR #71 的不可变 SHA `58c0f3f8cac89ffc9c47798f0e474c331cc56c66` 完成 Core + Pages 发布；生产排行榜接口返回 `presentationVersion=arena-leaderboard-v1`、31 个合格模型，`/leaderboard/` 与 `/leaderboard/methodology/` 均为 200；未触发生成或 Judge 调用）

### [2026-08-28] Bench OSS 服务端公共端点模式与三容器显式 DNS — by Codex
变更：香港生产宿主机已可解析并访问公共 OSS，但 Docker embedded DNS 仍沿用不可达的旧解析器，且 Bench Core 的 OSS 服务端读写固定使用 internal endpoint，导致发布证据复验失败。Core 新增严格枚举 `PAPERBANANA_BENCH_OSS_SERVER_ENDPOINT_MODE=internal|public`，未设置时保持 `internal`；仅显式为 `public` 时，Bench OSS `serverClient` 才使用经过严格主机校验的公共 endpoint。签名客户端继续固定公共 endpoint，主业务 OSS 配置与行为不变，空串、大小写变体、前后空格和其他值均启动失败。香港 Compose 仅为 `paperbanana-api`、`benchmark-worker`、`benchmark-operator` 设置显式 DNS，`PAPERBANANA_BENCH_DNS_PRIMARY` / `PAPERBANANA_BENCH_DNS_SECONDARY` 默认分别为 `223.5.5.5` / `1.1.1.1`；其他服务保留原 Docker DNS。正式发布的不可变证据批次复验仍保持并发 8、单对象一次有界重试和失败关闭，但总 deadline 从 30 秒提高到 120 秒，以覆盖公共 OSS 大 PNG 的受限带宽。
各端待办：
- [x] paperbanana-api / Bench Core（严格配置、仅 Bench server I/O 切换、签名与主业务 OSS 隔离、TDD）
- [x] 香港部署代码（仅三个 Bench 相关运行时的可配置 DNS 与 Compose 契约测试）
- [x] 部署 / 运维（生产已部署不可变 Core/Worker `e46b2d75b0abdd18ae7f31626e92eb0399e4a778`；Core endpoint mode 显式为 `public`，三容器 DNS、`/ready`、私有 OSS 读回 SHA-256、Worker disabled/concurrency 1、完整 smoke 与 superseding release 均已验证）

### [2026-08-28] Bench 全量生图模型 Standard / Codex single 公开榜 — by Codex
变更：新增不可变 `pb-image-light-v1` 四题 Standard 阶段，三家生产 image registry route 先按运行时别名和跨渠道同模型归一为 canonical 实际模型，再由主接入渠道每题生成一次。当前 v9 fixture 锁定 55 route → 48 canonical 模型；单模型固定 4 generation / 0 automatic judgment / 0 Judge dispatch，全批次最多 48 模型 / 192 generation。全部成功图片进入 `codex-single-two-pass-v1` 两遍结构化盲审；至少完成并审核 3/4 才进入七维排名，不足者仍公开显示但不排名。实际宽高/像素/文件大小、主接入渠道、替代渠道和 generation-only 成本进入公共契约。新 release 状态为 `published`，比较身份为 `suiteId + evaluationMode + evaluationEpoch`；历史 Quick/Full、provisional/verified 和双 Judge release 保留只读且不混排。常驻 Worker 继续 disabled/并发 1；Standard batch operator 持有生产共享锁顺序执行，单模型未知 Provider 结果不重试但不阻止后续模型。
契约（影响 Web / Core / Worker / 运维）：
- 公共模型新增 `canonicalModelId / primaryAccessProvider / alternateAccessProviders / actualOutputPixels / ranked / unrankedReason`；release/methodology 新增 `evaluationMode=codex_single / evaluationEpoch / reviewProtocol / reviewerKind=codex / reviewerPasses=2 / automaticJudges=[]`。
- 新状态为 `approved → standard_running → codex_review → published`；站长审批必须显式传 `evaluationMode=codex_single` 与精确 4/0/0 caps，发布使用 `profileStatus=published`。
- 新模式发现、执行、审核包、导入和发布任一位置出现 automatic judgment 或 Judge dispatch 均失败关闭；公开费用三类 Judge 计数固定为 0。
各端待办：
- [x] benchmark-core / benchmark-worker / paperbanana-api（canonical manifest、Standard runner、签名审核与发布完整性门、旧 release 兼容、TDD）
- [x] Web（单阶段文案、canonical 模型行、实际像素/渠道/成本、样本不足不排名、390/430 响应式基础）
- [x] 部署 / 运维代码（单模型 Standard operator、批次 manifest 验证、48/192 总上限、共享锁、dry-run 零调用）
- [x] Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（action 名称不变；非 Web 客户端无需改造）
- [ ] 生产付费运行（必须先重新读取生产 registry、冻结并签名 canonical manifest、取得全部模型价格/权限并确定精确总美元上限；本条实现与测试没有调用 Provider）

### [2026-08-28] Bench 确认未转发 Judge dispatch 的连续索引恢复 — by Codex
变更：新增仅用于有独立网络证据证明请求未到达 Provider 的一次性 dispatch 恢复器。它要求 run 精确为 `paused/UNKNOWN_PROVIDER_OUTCOME`、无租约、24 个 quick 样本完整、目标 automatic judgment 不存在、旧 marker 仅有 index 0，且代理证据固定为目标 `openrouter.ai:443`、HTTP CONNECT 503、响应字节 0、日志 SHA-256。恢复永不删除或改写旧 marker，先把证据和 operator SHA-256 追加到 run 的内部 `dispatchReconciliations`，再从连续 index 1 开始占用既有 Judge-call/USD 预算；最多允许现有 manifest 已定义的 index 0–3。成功只补该 logical judgment、清除租约并保留 `quick_running` 给原 phase operator，任何新未知结果重新暂停。公开 action、release、客户端响应不变。
各端待办：
- [x] benchmark-worker / 运维代码（TDD、严格 proof/state 门、连续 marker、预算与租约、一次性 bundle）
- [x] paperbanana-api / Web / Gateway / 原生客户端（内部 run 审计字段；公开与客户端契约不变）
- [ ] 部署 / 运维（后续发布含正式 entrypoint 的不可变 Worker 镜像；当前生产仅按 bundle SHA `4f67497f…` 对已证明 503/0-byte 的 OpenRouter dispatch 执行一次，常驻 Worker 保持 disabled）
- [x] 百炼未知结果（用户于 2026-08-28 明确接受可能重复计费并授权只重试该条；一次性 bundle SHA-256 `a063251a…` 在严格账本形状 24 generation / 33 logical judgment / 34 dispatch、无租约、Worker disabled 下，仅将目标 `bailian` marker 从 index 0 连续到 index 1，结果成功落库；随后原 quick operator 完成 24/24 双 Judge，Codex 盲审导入 14/14，并创建 provisional release `d45d7415…`）

### [2026-08-27] Bench run 比例数组规范化与零调用恢复 — by Codex
变更：新建 Bench run 时，顶层 `aspectRatios` 现在与已签名 `runFacts.aspectRatios` 使用同一字符串化排序顺序，避免候选注册表顺序不同导致一次性 phase operator 在首个预算预留/Provider 调用前失败。生产中唯一受影响且保持 0 generation / 0 judgment / 0 dispatch 的 run 只允许通过精确 CAS 将冗余顶层数组归一到已签名数组，不重签或改写审批、价格、runHash、candidateSnapshot。
契约（影响后端 / Worker）：
- Core 新 run 的顶层 `aspectRatios`、`runFacts.aspectRatios` 与 `candidateSnapshot.aspectRatios` 必须规范等价；Worker 继续失败关闭并验证顶层数组哈希，不放宽不可变事实校验。
- 旧 run 仅当状态为 `failed`、错误发生在 phase operator、所有付费/样本/dispatch 计数为 0、无租约，且顶层数组排序后精确等于已签名数组时，才允许一次性归一化；修复后必须重新通过完整 attestation 才能运行。
各端待办：
- [x] paperbanana-api / Benchmark Worker（TDD、规范化写入与严格校验保留）
- [ ] 部署 / 运维（后续发布新镜像；当前生产只对精确零调用 run 做一次性 CAS 修复，常驻 Worker 保持 disabled）
- [x] Web / Gateway / 原生客户端（内部 run 字段修复，不改变公开 action 或客户端请求）

### [2026-08-26] Bench OpenRouter Judge 固定新加坡出口 — by Codex
变更：Bench 的 OpenRouter 自动评审、只读 access diagnostic 与单请求探针新增独立、失败关闭的出口契约：`PAPERBANANA_BENCH_OPENROUTER_EGRESS_MODE=sg-required` 且 `PAPERBANANA_BENCH_SG_PROXY_URL=http://10.77.0.2:3128`。仅 `https://openrouter.ai` 可使用该代理；百炼/方舟与被测模型生成路径保持原有直连。`discovery-only` 明确为 `disabled`，`configured-disabled` 才配置固定代理；常驻 Worker 仍为 `PAPERBANANA_BENCH_ENABLED=false`、并发 1。该变更用于规避香港直连 OpenRouter runtime POST 的 opaque 403，不改变公共 action、公开响应或客户端契约。
各端待办：
- [x] benchmark-worker / 香港运维代码（固定 host/proxy allowlist、TDD、凭据激活与 smoke 契约）
- [x] Web / Core / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开与客户端契约不变，无需改造）
- [ ] 部署 / 运维（合并后发布同一不可变 SHA，重新执行 configured-disabled 凭据配置与零调用诊断；Worker 保持 disabled）
- [ ] 付费执行（固定代理探针验证后，才按已授权预算恢复校准、canary、quick/full 与 Codex 审核）

### [2026-08-25] Bench quick/full 精确 run 单 phase 预算 operator — by Codex
变更：新增仅由 `workflow_dispatch` 手工触发的 quick/full 一次性 operator；常驻 Worker 始终保持 `PAPERBANANA_BENCH_ENABLED=false`、并发 1，不启动 discovery 或 daemon timer。管理员必须先用既有 `adminBenchmarkApprove` 明确批准 entitlement、公开 HTTPS 价格来源/快照、生成、逻辑 Judgment、Judge dispatch 与 USD caps，再用 `adminBenchmarkControl` 将同一 run 推进到精确 `quick_running|full_running`；进入 running 后可用同一 action 的只读 `command=phaseOperatorAttestation` 取得 Core 已验签、无密钥的 workflow 输入。operator 不会 approve/reapprove、推进 running 或扩大预算。审批 `priceSnapshot` 新增并签署 `source`，因此 price hash、phase authorization hash 与 run integrity attestation 均覆盖价格来源。一次性授权另绑定 exact deployed SHA、phase/runId/provider/model/lane/suite/hash/Judge epoch+stack、Core-signed authorization hash、price hash、完整价格字段、固定确认，以及 Core 验证的完整不可变运行事实信封（`runHash`、canonical `runFacts`、首次审批 candidate snapshot、`aspectRatios`、`registryHash`、run integrity HMAC 与各 canonical hash）；旧记录、缺失或任一变异均失败关闭。Worker 仅以 exact runId+state CAS 租约并在任何 Provider/Judge dispatch 前重算并逐项比较 Mongo signed approval 和不可变运行事实。quick 上限为 24 generation / 48 logical judgment / 192 Judge dispatch，full 为 144 / 288 / 1152；每个 logical judgment 最多覆盖首次、一次 JSON repair，以及两者各一次既有 429 有界重发，所有 dispatch 均先占用显式签署的调用与美元预算，最坏情况估算不得超过总 cap；能力缺口只允许实际更少。执行复用正式 image runtime、双 Judge、私有 OSS、Mongo idempotency/lease、未知结果暂停及既有 429 有界规则；成功进入 `quick_review|codex_audit`。host wrapper 使用香港生产共享锁，在任何 one-off Worker 启动前用 protected Gateway/Admin transport token 与 immutable admin identity 调用本机 Core attestation，并对完整 identity/hash/cap/price/immutable-facts 对象做深度精确比较；mismatch 零 one-off。随后才允许 `--no-deps` one-off，并在结束后执行 daemon health 与 lease/state 后置检查；dry-run 零容器/零 Core 调用，test-root 禁止 apply。公开 actions/客户端响应不变。
补充发布契约：durable Judge dispatch marker 移入内部 `paperbanana_benchmark_dispatches`，仅含 canonical `_id/runId/sampleId/phase/logicalProvider/dispatchIndex/judgeEpoch`；Worker 先占预算、再 insert、再允许网络，角色仅 `find/insert`，Core 角色仅 `find`，无 update/remove/cancel-delete 路径。quick/full source manifest 均签署当前 phase 的完整 samples、automatic judgments、marker 集和 `generationCalls/logicalJudgments/judgeDispatchCalls`，import 会重建验签；provisional/verified publish 及 transaction snapshot 分别从 suite/run/samples/judgments/dispatch collection 独立重建，按实际 dispatch 计价并检查全部 signed caps，绝不信任 `run.usage` 或 `usageByPhase`。quick 形状固定为 12 个 quick case 各 2 次，仅允许 signed ratio capability plan 的合法缺口；其他 phase/历史 marker 不污染当前 phase，旧 judgment marker、尾部删除/phase 降级、缺口/额外/篡改均失败关闭。公开费用保留 `automaticJudgeCalls` 兼容别名并新增 `logicalJudgments`、`judgeDispatchCalls`。
各端待办：
- [x] benchmark-core / benchmark-worker / paperbanana-api / 香港运维代码（signed price source、exact operator、复用执行路径、TDD、workflow 与文档）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开及客户端 API 不变；站长批准请求后续必须提供 price source）
- [ ] 部署 / 运维（合并后发布同一不可变 SHA 的 Core/Worker，并继续 configured-disabled；本条未运行任何 Provider/Judge）
- [ ] 付费执行（仍须用户对 exact run/phase/model/Judge/价格/caps/总美元预算逐项明确审批；本条不构成费用授权）

### [2026-08-25] Bench quick/full 阶段纯净身份与 verified 发布 DB 形状门 — by Codex
变更：Bench sample 身份、automatic judgment 与预算用量均新增显式 `phase=quick|full`（预算持久化为 `usageByPhase.quick/full`）；同一 run 的 full 不再复用或消耗 quick 的 sample、Judge 结果与调用 caps。sample/judgment 旧索引迁移由 root `mongo-init` 在应用角色建立前按“创建并验证新索引，再幂等删除旧索引”的固定顺序完成；Worker 运行期只创建/验证当前索引，Mongo 角色没有 `dropIndex`。仓库新增 CI 强制执行的临时 MongoDB 8 replica-set 集成测试，连续运行两次真实迁移，验证完整 key/unique/partial-filter、legacy 删除及 Worker `dropIndex` Unauthorized。审核导出、导入后的评分重算按当前 phase 隔离；Core 使用仅自身持有的 `PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET` 对 canonical immutable run facts、首次审批时的 candidate 展示/商业身份快照、以及 versioned quick/full 审批（authorizationHash、完整价格快照、caps、审批人和时间）生成 HMAC，reapprove/export/import/publish 均重构验旧 attestation，绝不重新签署未验证的 DB hash。full review export 还冻结全部 full samples、automatic judgments 与由其导出的 phase-pure 调用计数 canonical manifest，将其 HMAC 绑定进签名 packet 与 Codex review attestation；import 与 verified publish 的事务快照均重构验签，双 Judge 对未审样本等值篡改也会失败关闭。`verified` 发布不再信任 run 汇总字段、可写 usage/price/approval、live candidate 或 `releaseDraft`，而是独立验证当前 DB：不可变 suite 的 42 个 `auto` 题始终执行，6 个固定比例题仅在 `run.aspectRatios` 支持时执行；可执行题必须每题 3 个 completed 内容寻址样本和每样本 OpenRouter+Bailian 两个当前 `judgeEpoch` completed judgment，不支持题必须为零 full sample，并以稳定的 `case=<caseId>;aspectRatio=<ratio>` 逐题记录 capability gap。全比例模型仍严格为 48×3=144 样本、288 automatic judgments。发布端从 full automatic judgments 重建 disagreement、red-line conflict、异常、public evidence 与确定性 10% 的完整审核集合，要求 auditRequired、packet、当前 packet/review attestation 的 accepted Codex 四集合完全相等；旧 quick 或已被 full re-export 取代的 accepted 记录被精确忽略。发布同时验证 packet signature、review attestation、严格评分/证据/置信度/红线与正整数 latency；随后以 `applyCodexAdjudication + aggregateAxisScores` 重算 dimensions、coverage、capabilityCoverage、successRate、latency、auditRatio 与 signed price 下的正式集估算费用，从 attested candidate snapshot 派生展示身份，并构造固定 methodology。全部 OSS 内容寻址对象在事务外以有界并发、总 deadline 和一次重试验证；remaining timeout 传入 ali-oss，batch 使用共享 AbortController/stop flag，终局失败取消全部 active stream、停止领取新对象并等待 `allSettled` 清理，随后形成 manifest hash 与时间戳。短 Mongo 快照事务仅重读并重算 DB/manifest 后 CAS 比对并发布，不在事务中下载 OSS；事务测试强制同一 session、staged commit/rollback，并覆盖 release insert 后 run CAS 失败零落库。该边界依赖 Worker OSS 身份没有删除/覆盖权限，写入继续携带 `x-oss-forbid-overwrite:true`。公开 action/客户端请求响应不变。
各端待办：
- [x] benchmark-core / benchmark-worker / paperbanana-api（phase 身份、索引迁移、审核隔离、发布完整性门与 TDD）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开及客户端 API 契约不变，无需改造）
- [ ] 部署 / 运维（合并后发布同一 SHA 的 Core 与 Worker；任何正式集仍需既有明确模型、Judge、价格与美元预算授权，本条未运行 Provider/Judge）

### [2026-08-25] Bench Judge 金标校准与两图付费 canary operator — by Codex
变更：新增六类原创 CC-BY-4.0 缺陷金标（漏节点、反向箭头、乱码、遮挡、低对比、比例违约）、固定双 Judge 校准报告和独立两图 canary。两者都只通过手工 `Run Benchmark Paid Operator` workflow 在一次性 Worker 容器中运行；常驻 `benchmark-worker` 必须保持 `PAPERBANANA_BENCH_ENABLED=false`、并发 1。operator 与正常部署共享香港生产主机锁，同时校验 Core/Worker 镜像内固化 SHA 与运行时 SHA，绑定 Judge stack、无密钥授权信封、价格来源/快照、调用次数与最高 3 美元估算费用派发上限（实际账单以 Provider 为准）。完整报告以内容 hash 写入私有 `bench/operator-reports/`；Core 有界回读私有 OSS 原件并重算报告/授权/价格 hash 后，才不可变记录派生的结果和用量，浏览器提交伪造 hash 不能放行。日志只显示 hash/计数/估算费用。校准低于 85% 红线准确率或 80% 双 Judge 一致率即失败且不记录；两图 canary 固定复杂拓扑与数学符号两题，精确 2 次生成、最多 6 次 Judge dispatch，不进入公开 release。
各端待办：
- [x] Worker / Core / 运维代码（TDD、一次性 operator、私有报告、Core 不可变校准记录、共享锁与手工 workflow）
- [x] Web / Gateway / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（公开及客户端 API 契约不变，无需改造）
- [ ] 生产发布（合并后发布新的不可变 Worker 镜像并以 configured-disabled 重新部署；尚未运行校准、生成或 Judge）
- [ ] 付费执行（仍须用户明确指定模型、Judge 价格快照及美元预算后，依次运行校准与两图 canary；本条不构成费用授权）

### [2026-08-25] 香港部署与 Bench 凭据激活共享主机锁 — by Codex
变更：正常香港部署与 Bench `configured-disabled` 凭据激活现在必须共享 `/run/lock/paperbanana-hk-production.lock`。正常部署由 root-only `apply-staged-deployment.sh` 在同一把锁内连续完成随机 0600 `/tmp` image-lock 安装、Bench mode bootstrap、`deploy.sh --apply`、smoke 与临时文件清理；凭据 operator 使用同一锁。Wrapper 通过继承的数字 FD 传递锁，`deploy.sh --apply` 在读取 `.env`、Compose preflight 或 maintenance mutation 前校验 FD 的真实路径与 `flock -n` 锁状态；无 FD、错误路径或伪造 sentinel 均失败关闭，dry-run 不再宣传直接 apply。两个 production workflow 也共享 non-canceling concurrency group 作为第二层保护。固定 `GITHUB_RUN_ID` staging path 已移除；本条不改变 `discovery-only|configured-disabled`、Worker disabled 或付费授权边界。
各端待办：
- [x] 部署 / 运维代码（共享主机锁、host wrapper、随机 staging、成功/失败双重清理、workflow concurrency 与回归测试）
- [x] Web / Core / Gateway / Worker / 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（运行时 API/客户端契约不变，无需改造）
- [x] 生产执行（PR #34 已合并为 `da5ac5f`；香港生产部署与 `configured-disabled` 凭据激活均经共享主机锁完成，独立 smoke 通过；Worker 仍为 disabled，未产生付费请求）

### [2026-08-25] Bench 专用凭据 configured-disabled 激活门 — by Codex
变更：香港单机部署新增显式 `PAPERBANANA_BENCH_SECRET_MODE=discovery-only|configured-disabled`。默认 `discovery-only` 继续拒绝全部 Provider/Bench OSS 凭据；新的 root-only 原子操作脚本仅通过 0600 临时 bundle 接收三项 Provider 与六项 Bench OSS 配置，要求 Core/Worker 的 `PAPERBANANA_CODE_SHA` 与人工输入的已部署 40 位 commit 完全一致，并在失败时恢复 `core.env`、`bench.env`、部署模式及原服务。`configured-disabled` 只打开 Core Bench API 的独立 OSS 读取/签名配置，Worker 始终保持 `PAPERBANANA_BENCH_ENABLED=false`、并发 1；本条不授权任何生成、Judge、canary 或付费请求。
各端待办：
- [x] 部署 / 运维代码（root-only operator、flock、原子回滚、显式 deploy mode、双模式 smoke、手工 GitHub Environment workflow、TDD 与凭据脱敏契约）
- [x] 生产 Bench OSS（已创建香港私有 LRS Bucket `paperbanana-bench-hk-d5cd3f4e8f68`、专用 RAM 用户 `paperbanana-benchmark-runtime`、最小权限策略 `PaperBananaBenchmarkOssRuntime` 与唯一 AccessKey；六项 `PAPERBANANA_BENCH_OSS_*` 已保存为 GitHub Environment Secrets，值未进入仓库或日志）
- [x] 生产 configured-disabled（GitHub Actions run `32821366044` 已按精确部署 SHA `da5ac5fc39f56ea4bb4e76d56167ab6088ce2f92` 完成；Core/Bench OSS/Mongo/隔离 smoke 通过，Worker disabled/并发 1、费用为零）
- [ ] Judge calibration / 两题 canary（执行器已实现但尚未发布或付费运行）；24 图临时集、144 图正式集仍需用户另行明确模型、Judge 与美元预算授权

### [2026-08-25] 出图模型 Bench v1 共享契约与独立 Worker — by Codex
变更：新增公开只读 `/bench` 模型观测台、不可变 `pb-image-diagnostic-v1` 48 题原创诊断集、七维评分/题内聚合/bootstrap 区间、双 Judge + Codex 盲审协议，以及默认关闭的独立 `benchmark-worker`。首版仅文生图，不使用 PaperBananaBench 官方题集，不产生综合总分，不自动扣费。
契约（影响 Web / Core / Gateway / Worker / 运维）：
- **公共 actions**：`benchmarkLeaderboard`、`benchmarkModelProfile`、`benchmarkMethodology` 仅返回已发布不可变 release；公开证据必须在 release allowlist 内且对象键位于私有 `bench/` 前缀，响应只签发短期 URL。
- **站长 actions**：`adminBenchmarkCandidates`、`adminBenchmarkApprove`、`adminBenchmarkControl`、`adminBenchmarkReviewExport`、`adminBenchmarkReviewImport`、`adminBenchmarkPublish`；继续由 Gateway 的不可变 `ADMIN_USER_IDS` 鉴权，Web 不接收 `ADMIN_TOKEN`。
- **公共类型 / 集合**：七个 `BenchmarkAxis`；`1K-standard|2K-standard|4K-standard`；`provisional|verified|superseded`；新增 `paperbanana_benchmark_{suites,models,runs,samples,judgments,releases}` 六个业务集合，以及仅供内部 append-only Judge dispatch 审计的 `paperbanana_benchmark_dispatches`。状态机与 suite/judge/reviewer/registry/price/code/release hash 均固定在共享包。
- **Worker 安全默认**：`PAPERBANANA_BENCH_ENABLED=false`、并发 1、每 6 小时只发现；只读取 `PAPERBANANA_BENCH_*` 专用 Provider/OSS 凭据，使用独立 `paperbanana_benchmark` Mongo 用户，无公网端口，仅 backend+egress 网络。候选必须先确认权益、价格、生成/Judge/USD 上限；未知 Provider 结果暂停且不自动重发。
- **内部信任与数据隔离**：Worker 只持有 discovery-only `PAPERBANANA_BENCH_DISCOVERY_TOKEN`，Core 仅允许它调用 `modelRegistry`；站长调用另用仅 Gateway/Core 持有的 `PAPERBANANA_ADMIN_TRANSPORT_TOKEN` 并覆盖真实不可变管理员 ID。Core 使用独立 `paperbanana_benchmark_api` Mongo 用户与 Bench-only OSS signer，不得从 `paperbanana_business` 或产品桶读取/签名 Bench 证据。
- **审核交换**：Codex packet 不含模型身份或自动分数；导入同时校验 packet/image/rubric hash。公开证据强制进入审计。临时画像不生成“维度领先”标签；不同 lane 禁止比较。
各端待办：
- [x] Web（feature-flag `/bench`、模型深链、七个单维榜、证据/方法学、390px/430px、独立站长控制面）
- [x] paperbanana-api / Core（共享 image runtime bundle、六集合 repository、公开 release 隔离、审核/发布 hash、短期证据签名）
- [x] auth-gateway / packages-api（匿名只读转发、六个站长 action 的不可变管理员鉴权、客户端请求契约）
- [x] benchmark-worker（发现、审批预算、租约/心跳/幂等、24/144 执行、双盲评、Codex audit、独立镜像与健康文件）
- [x] 微信小程序 / Android / iOS / Windows / macOS / HarmonyOS（首版无需改造，不得自行消费运行队列或未发布结果）
- [ ] 部署 / 运维（不可变 Worker 镜像、`enabled=false` discovery-only、独立 Mongo/OSS/Bench 凭据及 `configured-disabled` 已完成且费用为零；仍缺 Judge calibration。任何两题 canary、24 图临时集或 144 图正式集仍需用户新的明确模型、Judge 与美元预算授权）

### [2026-08-23] 账号删除 OSS V4 分页签名修复 — by Codex
变更：香港 Node Core 的 OSS 适配器不再把值为 `undefined` 的首次分页 `marker` 传给 `ali-oss`。此前该无效查询项会使 ListObjects V4 签名与实际查询串不一致，导致账号删除在清理 `references/<owner>/` 时返回 500；后续真实分页 marker 及严格清理语义保持不变。
各端待办：
- [x] paperbanana-api / Laf Core（失败回归测试、最小修复、全量测试、类型检查与生产构建）
- [x] Web / iOS / 微信小程序 / Android / Windows / macOS / HarmonyOS（删除请求与响应契约未变化，无需客户端改动）
- [x] 部署 / 运维（PR #28 已合并为 `e4502ab`；香港 Core 不可变镜像 `sha256:3a4dec8f…` 已部署。生产一次性账号验证通过：删除返回成功、旧会话失效、旧密码再次登录返回 401）

### [2026-08-23] 标准账号安全与邮件恢复契约 — by Codex
变更：auth-gateway 保持 Better Auth 1.6.11 与现有用户/会话/删除链路，新增邮箱验证、重发验证、忘记/重置密码、登录后修改密码以及 DirectMail 账号安全邮件。新注册和未验证登录需要邮箱验证；存量会话不失效，存量账号下次新登录时完成验证。验证和重置令牌均为 1 小时，密码 8–128 位，重置撤销全部旧会话，修改密码撤销其他会话。
契约（影响其他端 / 共享）：
- **Better Auth 路由**：`POST /api/auth/sign-up/email` 与 `sign-in/email` 支持固定 `callbackURL`；注册无论新邮箱还是重复邮箱均返回 `{status:true,emailVerificationRequired:true}` 且不创建/下发会话，避免暴露账号是否存在；新增客户端调用 `send-verification-email {email,callbackURL}`、`request-password-reset {email,redirectTo}`、`reset-password {token,newPassword}`、`change-password {currentPassword,newPassword,revokeOtherSessions:true}`。回调只允许 `paperbanana.asia` HTTPS 页面。
- **用户与错误**：session user 增加 `emailVerified:boolean`；客户端识别 `EMAIL_NOT_VERIFIED`、`INVALID_TOKEN`、`TOKEN_EXPIRED`、`TOKEN_USED` 和 HTTP 429 `X-Retry-After`，不得用英文文案猜状态。忘记密码响应不得泄漏邮箱是否存在。
- **邮件/限流 env**：新增 `AUTH_EMAIL_DELIVERY_ENABLED`、`AUTH_REQUIRE_EMAIL_VERIFICATION`、`AUTH_VERIFICATION_CALLBACK_URL`、`AUTH_PASSWORD_RESET_URL`、`AUTH_EMAIL_WINDOW_SECONDS/MAX/DAILY_MAX` 与 `ALIBABA_DIRECTMAIL_*`。DirectMail 固定使用杭州 `cn-hangzhou / dm.aliyuncs.com`；先开邮件、真实收信验证，再开强制验证；必须使用独立最小权限 RAM 凭据。
各端待办：
- [x] auth-gateway（Better Auth 配置、DirectMail 双语邮件、邮箱/IP HMAC 限流、数据库路由限流、日志脱敏与 TDD）
- [x] Web（验证/重置落地页、登录面板忘记密码/待验证/重发冷却）
- [x] iOS（`emailVerified`、明确状态枚举、安全中心、改密/恢复 API 与错误映射）
- [x] 微信小程序（已消费共享路由、状态字段和错误码；3.0.1 实现与测试完成；3.0.1 开发者工具上传已完成；体验版/审核/发布仍待完成）
- [ ] Android / Windows / macOS / HarmonyOS（消费共享路由、状态字段和错误码仍待完成；改造前不得开启其强制验证发布）
- [ ] 部署 / 运维（杭州 DirectMail 域名、SPF/MX/DKIM/DMARC、触发邮件地址和 `dm:SingleSendMail` 专用 RAM 已完成；生产环境密钥已安全暂存。仍需合并/部署 Web 与 Gateway、保持强制验证关闭完成三家真实邮箱 smoke，再开启强制验证）

### [2026-08-22] 评审取图失败保留已生成结果 — by Codex
变更：结构图或统计图 PNG 任务首次渲染已经成功后，视觉评审模型若因图片下载超时而失败，Core 会重试评审一次；仍失败或出现其他评审异常时，保留最后一张成功图片并完成任务，不再把已经出图的任务整体标记为失败。
契约（影响任务状态语义，不新增字段）：
- 已知图片下载超时的重试动作本身只重试评审，不重新规划或重复首次渲染。
- 评审最终失败时写入带 `error` 的 `critic` stage，标题标明“已跳过”，日志记录回退原因；最终 `status='succeeded'` 且 `resultImages` 正常可用。
- 规划、首次渲染、结果持久化等发生在可用图片产生前后的关键失败仍保持原有失败关闭语义；本条不会把真正未出图的任务误报为成功。
各端待办：
- [x] paperbanana-api / Laf Core（结构图与统计图的超时单次重试、最后成功图片回退与回归测试）
- [x] Web / 微信小程序 / packages-api（现有 `status/resultImages/stages/error` 契约可直接消费，无需客户端字段变更）
- [ ] 部署 / 运维（合并后部署香港 Core，并用非计费故障注入或真实偶发场景确认成功结果与评审警告同时可见）

### [2026-08-21] 图研Tuyan 微信小程序 1.0.0 全量升级 — by Codex
变更：仅微信小程序对外升级为“图研Tuyan 1.0.0”，技术标识继续使用 PaperBanana；客户端默认 API/Auth 已迁移到香港 `https://api.paperbanana.asia`。小程序完整消费当前 v9 registry、显式模型路由、负向提示词、生成/精修比例与清晰度、306 条参考库分页、结果 `objectKey`、独立精修和账户删除契约。
微信端验收：
- [x] 注册表驱动的五渠道模型选择与失败关闭；普通模式单渠道默认三角色，专业模式完整 `modelRoutes`，实际可达角色密钥作用域与 Ark 免费优先/图片付费二次确认。
- [x] 方案 A 分层工作台、六套精确模板、独立 `negativePrompt`、十种规范比例、生成设置原子保存、上传 finalize/abort 与参考来源互斥。
- [x] `scope=bench` 每页 12 条、搜索/双分面/diagram-plot、latest-wins、跨页最多 10 项与详情回退。
- [x] 任务来源/路由/负向提示词/比例/阶段/错误/资产归一；独立精修优先 `sourceImageObjectKey` 并分别消费 `refineResolutions/refineAspectRatios`。
- [x] 退出、隐私说明、密码重验与二次确认删除；成功清理 Cookie、草稿、任务缓存和内存密钥；原生折叠教程显示实时 registry 版本与默认路线。
- [x] TypeScript check/build 与小程序纯逻辑/契约测试；AppID、本地任务键、Cookie 键和数据库无需迁移。
- [ ] 微信后台精确 request/downloadFile 域名保存、开发者工具真机 QA、1.0.0 体验版上传、用户 BYOK 付费生成+精修冒烟、审核与正式发布。
- [ ] Android / iOS / Windows / macOS / HarmonyOS（本条不改造、不改名，继续按各自待办推进）。

### [2026-08-21] 精选模板、负向提示词与权威比例能力 v9 — by Codex
变更：Core 注册表升级为 `2026-08-21.v9`，Web 新增 6 套精选参考模板、醒目的生成设置卡、十种固定比例与新版教程；共享 API / Core 新增精确参考 ID 查询和独立负向提示词。新增字段均向后兼容，其他端可暂时忽略，但不得自行推断模型比例能力或把不支持比例降级为 `16:9`。
契约（影响其他端 / 共享）：
- **精确参考图库**：`referenceLibrary` 新增可选 `referenceIds`，只接受 1–6 个去重后的 ID，保持请求顺序并只签名所选图片；不得与 `scope/limit/page/pageSize/query/visualCategory/researchDomain/taskName` 混用。请求冲突返回 `400 + REFERENCE_LIBRARY_REQUEST_INVALID`；缺失、无图或无法签名返回 `422 + REFERENCE_LIBRARY_SELECTION_INVALID`。
- **负向提示词**：`createJob.negativePrompt` 可选、独立于 `methodContent`，trim 后最多 1,000 字符；Laf 使用 camelCase，FastAPI 兼容路径映射为 `negative_prompt`。Core 独立校验、持久化、计入输入字符数，并按方法内容既有可见范围返回；规划、首次渲染、评审后重渲染、SVG 与 Plot 的创建路径均使用独立 `<avoidance_constraints>` 区块，精修 action 语义不变。
- **比例能力**：固定目录为 `1:1/3:2/2:3/4:3/3:4/16:9/9:16/21:9/1:4/4:1`，另保留 `auto`。image 能力新增必定数组 `aspectRatios` 与 `refineAspectRatios`；OpenRouter 仅取官方目录 `supported_parameters.aspect_ratio` 的规范交集，缺失即空数组；其他 Provider 使用逐模型权威数组及精确比例/尺寸映射，未知或不支持项不得静默回落。
- **失败关闭**：非法比例返回 `400 + INVALID_ASPECT_RATIO`；生成不支持返回 `400 + ASPECT_RATIO_UNSUPPORTED`；精修不支持返回 `400 + REFINE_ASPECT_RATIO_UNSUPPORTED`。三类校验均须发生在账号检查、admission、任务写入和付费 Provider 调用前。旧客户端省略比例仍按历史 `16:9`；当所选模型不支持时会明确失败，客户端应从注册表选择支持项或 `auto`。
各端待办：
- [x] paperbanana-api / Laf Core / packages-api（精确参考、负向提示词、v9 比例目录、准入与 Provider 映射、TDD）
- [x] Web（6 套模板与轮播/预览/安全套用、设置卡、十比例禁用原因、负向提示词、新教程与桌面/390px 验收）
- [x] iOS（消费 `negativePrompt`、`aspectRatios/refineAspectRatios` 与新失败码，未登记能力失败关闭）
- [x] 微信小程序（已消费 `negativePrompt`、`aspectRatios/refineAspectRatios` 与新失败码；缺失能力只开放自动）
- [ ] Android / Windows / macOS / HarmonyOS（按需消费；未改造前不得宣称未登记比例可用）
- [x] 部署 / 运维（PR #10 已合并为 `6e03969`；香港 Core 镜像与生产部署、Pages 均已成功。生产已验证注册表 v9、六个固定参考 ID 顺序/签名、非法比例 `INVALID_ASPECT_RATIO` 失败关闭、模板套用、十比例设置和教程；未执行付费图片生成，真实比例与负向提示词生成仍需单独授权）

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
- [x] iOS（动态 OpenRouter 图片目录仅消费 v8+ 权威能力）
- [x] 微信小程序（动态展示 OpenRouter 权威目录与 PNG 能力，不按模型名推断）
- [ ] Android / Windows / macOS / HarmonyOS（若展示动态 OpenRouter 图片目录，消费 v8 权威能力）
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
- [x] iOS（Ark 目录、现役项、不可选边界与付费图片探测确认由 live registry 驱动）
- [x] 微信小程序（消费 Ark v7 现役目录、不可选边界和账号 inference probe）
- [ ] Android / Windows / macOS / HarmonyOS（若展示 Ark 目录，同步 v7 边界）
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
- [x] iOS（识别未知 lifecycle 与 `verificationState`，不把目录兼容冒充调用成功）
- [x] 微信小程序（区分 `unknown`、`catalog`、`registry` 与 `inference-verified`）
- [ ] Android / Windows / macOS / HarmonyOS（展示目录时识别生命周期与验证状态）
- [ ] 部署 / 运维（本条未发布；付费逐模型验证不得使用全局目录状态代替）

### [2026-08-20] 精修分辨率真实能力与入队前失败关闭 — by Codex
变更：Core 注册表升级为 `2026-08-20.v5`，每个 image 条目新增必定数组 `capabilities.refineResolutions`，仅可包含 `1K|2K|4K`，并与生成能力 `resolutions` 分离。`refineImage.imageSize` 现在精确接受 `1K|2K|4K`；解析所选权威 image route 后，不支持的尺寸在账号检查、admission、Mongo insert 和计费/推理 provider 调用前以 `400` + `REFINE_RESOLUTION_UNSUPPORTED` 拒绝，不再静默夹到其他尺寸。OpenRouter 权威解析可先发生无鉴权目录查询；入队后若目录漂移，执行仍会再次要求精确尺寸并失败关闭。
契约（影响其他端 / 共享）：
- **注册表**：Gemini 按各 image adapter 实际尺寸；百炼 direct-edit 最高 2K（`wan2.7-image-pro` 的生成 4K 不等于精修 4K），analyze-redraw 沿用其生成尺寸；OpenAI Images direct edit 固定为 2K；Ark Seedream 为 1K/2K/4K；OpenRouter 仅映射官方目录 `resolution.values` 中已声明的规范值，未声明时为空数组。
- **请求语义**：缺省 `imageSize` 仍为历史兼容的 `2K`；显式 `modelRoutes` 与 legacy model 字段路由都保持。客户端必须以 `refineResolutions` 提供可选项，不得从 `resolutions` 或模型名推断。
各端待办：
- [x] paperbanana-api / Laf Core（registry v5、精修准入、direct/analyze/1K/4K/OpenRouter 回归）
- [x] Web / packages-api（消费 `refineResolutions`、仅展示所选 image route 可执行的精修尺寸；旧目录保守回退 2K）
- [x] iOS（消费 `refineResolutions`，缺失保守兼容 2K、明确空集合禁用精修）
- [x] 微信小程序（独立消费 `refineResolutions`，空数组时禁止精修提交）
- [ ] Android / Windows / macOS / HarmonyOS（后续消费新字段，未改造前不得宣称 4K 精修可用）
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
- [x] iOS（展示按权威 `releasedAt`，接受精修历史默认 `simple`）
- [x] 微信小程序（按 `releasedAt` 展示并接受精修历史默认 `simple`）
- [ ] Android / Windows / macOS / HarmonyOS（展示时继续按 `releasedAt`，并接受精修历史默认 `simple`）
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
- [x] iOS（未验证 Ark 条目不显示为账号已可用，按实际路线执行临时探测）
- [x] 微信小程序（未通过当前页面 inference probe 的 Ark 路线不显示为账号已验证且禁止提交）
- [ ] Android / Windows / macOS / HarmonyOS（未验证条目不得显示为账号可用）

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
- [x] iOS（消费 Ark v3+ 注册表与最多三条路线探测，图片探测需明确付费确认）
- [x] 微信小程序（消费 v3+ 元数据、Ark probe 与账户验证边界）
- [ ] Android / Windows / macOS / HarmonyOS（按需消费新注册表）
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
- [x] iOS（普通模式单 Provider 三路默认；专业模式完整 `modelRoutes`，仅发送实际可达角色所需密钥）
- [x] 微信小程序（专业模式完整 `modelRoutes`，普通模式单渠道默认三角色）
- [ ] Android / Windows / macOS / HarmonyOS（后续按需接入）
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
- [x] iOS（独立精修优先使用 `sourceImageObjectKey`，签名 URL 仅作预览与旧记录兼容）
- [x] 微信小程序（独立精修优先 `sourceImageObjectKey`，历史任务保留受控 URL 兼容）
- [ ] Android / Windows / macOS / HarmonyOS（后续精修入口改用对象键）
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
- [x] iOS（接入 v2 分页、搜索、facets、跨页选择缓存与 10 张上限）
- [x] 微信小程序（`scope=bench`、每页 12 条、搜索/分面/详情/跨页选择）
- [ ] Android / Windows / macOS / HarmonyOS（按需接入新分页响应）

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
- [x] iOS（以 live 注册表展示推荐、生命周期、验证状态、权益与精修方式，不再按名称猜测）
- [x] 微信小程序（展示推荐、生命周期、权益、禁用原因与精修方式，不按名称猜测）
- [ ] Android / Windows / macOS / HarmonyOS（后续消费新注册表字段）
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
- [x] 微信小程序（默认 API/Auth 已迁移香港域名；Auth 微信 Origin 生产验证通过）
- [ ] HarmonyOS / Android / Windows / macOS（后续逐端迁移）

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
