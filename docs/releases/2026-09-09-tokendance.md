# 观猹 TokenDance 生产发布记录

2026-09-09，观猹 TokenDance 渠道、账户页、钱包与充值、模型排序已发布到 [图研正式站](https://www.paperbanana.asia/)。Web、Node Core 和 Benchmark companion 实际发布 SHA 为 `2c518f97c06c3fc0149c299244c3489db232b531`；Gateway 镜像也从该 SHA 构建。实现 PR [#188](https://github.com/yrjmdqmmx/Tuyan/pull/188)，上线前修复 PR [#189](https://github.com/yrjmdqmmx/Tuyan/pull/189)。本记录是发布后的文档提交，不代表再次部署。

观猹身份登录按用户指示暂缓，线上保留既有登录方式，没有加入不可用的第三方登录按钮。小程序已同步源码和 JS，平台发布继续暂缓。

## 范围与接入覆盖

目录 v18 包含 739 个静态型号，其中观猹 TokenDance 接入 62 个：主模型 60、提示词/输入优化 60、参考识别/视觉评审 27、生成 2、直接精修 2，角色有重叠。两个图片型号为 `seedream-5.0-lite` 与 `seedream-5.0-pro`。免费、零分润、旧版本和日期快照按能力接入；分润不参与型号筛选或默认推荐。

官方实时 93 个型号逐项审核，31 个未接入：18 视频、6 音频、2 向量、3 搜索/阅读、2 专用 OCR，缺少与现有图研功能相符的输出或协议能力。精确 ID、模态、协议、证据冲突和逐项原因见 [完整覆盖清单](../tokendance/model-coverage.md)。文档阅读范围及歧义见 [接入审计](../tokendance/integration-audit.md)。2026-09-09 12:19:48 UTC 重读公开 API，新增、下架、协议、名称及描述/上下文变化均为零。

账户页面 `?view=account` 集中管理身份、连接、钱包与 Key 额度说明、充值、最近 10 笔订单；生成和精修页面只保留紧凑状态入口。普通模式、专业模式、各角色及精修选择器统一展示“观猹 TokenDance”并置顶，其他渠道相对顺序及原百炼默认路由保持。DeepSeek V4.1 Flash 采用经审核的版本顺序排在 V3.2 之前；缺少日期时显示“按官方版本排序”，不编造发布日期。

## 发布门禁

| 门槛 | 证据 |
| --- | --- |
| 修复分支 / PR CI | [34350234562](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34350234562) / [34350276960](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34350276960) 通过 |
| 修复自动评审 | [评审记录](https://github.com/yrjmdqmmx/Tuyan/pull/189#issuecomment-5601707389) 完成，无新增意见；机器人于 12:24:09 UTC 返回通过反应 |
| 最终主线 CI | [34350761496](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34350761496) 全部通过 |
| Core 镜像 | [34350837670](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34350837670) 成功 |
| Gateway 镜像 | [34350843248](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34350843248) 成功 |
| Benchmark companion 镜像 | [34350849439](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34350849439) 成功；评测执行继续关闭 |
| 香港部署 | [34351104624](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34351104624) 成功；main、现有 production 审批、固定镜像及主机锁 |
| Web Pages | [34351477913](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34351477913) 成功；保留公开排行榜入口 |
| 主机 | 5 个服务健康，维护解除；Core/companion 内置 provenance 与发布 SHA 一致，稳定加密 Key 与受保护备份一致 |
| Mongo | 5 个授权/支付/执行恢复集合的 TTL 索引与活跃订单唯一索引已在生产只读核验 |
| 公网接口 | health/ready 200，匿名 TokenDance 操作 401；739 个静态型号的 22,000 个字段及排序完全匹配源码，TokenDance 62 个 |
| Web 产物 | 线上首页 HTML 和全部 11 个 JS/CSS 文件的 SHA-256 与此次 Pages artifact 一致 |
| 既有公开数据 | 图库 306 条、`zh-CN.v2`；已发布排行榜与部署前完整深度比较一致 |

固定镜像：

- Core：`ghcr.io/yrjmdqmmx/paperbanana-core-api@sha256:04970c609b68e2f4c2b93b3fe646f310d88bb95f9126b7610037ea74d3fa2f24`
- Gateway：`ghcr.io/yrjmdqmmx/paperbanana-auth-gateway@sha256:c1e5ef4be571a8fb0ccd71ddeefdd0dc3a7deac06446b1a3ec2781fc129bb44f`
- Companion：`ghcr.io/yrjmdqmmx/paperbanana-benchmark-worker@sha256:e9f6694a5e2fd22c4bb80d6b5c59d2a6ad4efab6e86b8eb4130f8034e2704b6f`

Plot 与 Mongo 沿用此前固定镜像，详见结构化证据。没有重置数据库、执行正式评测或部署无关 PR。

## 上线前修正与新加坡出口

PR #188 的 Docker CI 首次发现构建上下文缺少共享 TokenDance 源文件；Core/companion Dockerfile 补齐后通过。首个 HK 部署 [34349049621](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34349049621) 在环境批准前取消，应用没有发布该版本。

自动评审返回四项恢复问题，均在 PR #189 修正并新增行为回归：

- 只读目录预检 503、网络异常或损坏响应，标为可等待恢复的 `retry_request`。付费请求的未知结果继续禁止自动重试。
- 原任务恢复在入队前检查 `retryAt`，并在原子更新条件中再次保护；小程序显示倒计时，提前点击不入队。
- 待支付订单的旧 Key 明确失效时，用同一图研用户当前 Key 重试一次状态 GET；不重发创建 POST，不对网络/5xx 自动切换凭据重试。
- 小程序优化输入读取真实契约 `optimizedText`，保留采用、取消和等待期间编辑原文的保护。

新加坡工作流 [34347878272](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34347878272) 在初次 scp 超时，未修改服务。随后沿用已有香港 WireGuard 管理通道，核对候选配置只新增 `tokendance.space` 精确域名，在锁、受保护备份及 Squid 解析检查后 reload。没有改动 SSH、WireGuard 或防火墙；香港经代理读取 93 个实时型号成功，伪装后缀域名 CONNECT 403，既有出口完整 smoke 通过。配置 SHA-256 为 `69c9d33001917bed3e79ea183fbc5f25eece3e53e1a4743f57ec169f2d1ad8a3`。

## 验证与实际行为

修复后的本地 Core 全量 481 项、小程序 28 项通过，Core 类型检查/构建、小程序编译及目录一致性通过。最终 CI 还覆盖 Gateway 140、Web 372、共享/Laf/仓库与保留端契约，以及各服务构建和部署契约。隔离真实 Mongo 覆盖一次性交换、加密、唯一索引、进程恢复、等待时间、并发 CAS 和注销清理；模型和支付上游仍为测试桩。

生产浏览器验收使用实际线上 Web/API，没有用测试 API 替代生产行为：

- 桌面 1440×1000、窄屏 390×844：普通模式及主模型/生成/参考识别/精修选择器渠道置顶正确。DeepSeek 列表首位为 V4.1 Flash；预览、稳定和日期快照标签与目录一致。手机渠道→厂商→型号以及返回路径正常，长 ID 换行。
- 从生成进入账户再返回，方法草稿、DeepSeek V4.1 Flash / Seedream 5.0 Pro / Qwen3.8 Flash 三个路由、2K 与 16:9 保留。精修指令、2K 和 16:9 经账户往返保留，返回按钮明确标为“返回精修图片”。
- Pro 精修显示 1K/1.5K/2K；Lite 精修显示 2K/3K/4K，均为直接编辑。未上传原图时提交受保护，没有发起模型消费。
- 生成/精修沿用现有共享模型配置。普通整页重载仍恢复默认未提交草稿，本次未新增通用草稿持久化；不将它与账户内部往返、授权回调保存或服务端已提交任务恢复混淆。
- 桌面及手机工作区、账户页无横向溢出，浏览器应用错误日志为空。视口覆盖已恢复。截图用于现场目视检查，未在仓库保存含账号信息的图像。
- 现有 Chrome 正式图研登录态有效，生产账户页显示 TokenDance 未连接；连接按钮可用，真实充值记录查询成功且为空。带登录态的窄屏页实测 CSS 宽度为 354 像素（保留用户原缩放），同样无横向溢出。已保留正式账户页供用户连接。

## 真实联调与剩余事项

生产 `app_url` 和 `X-App-URL` 固定为 `https://www.paperbanana.asia/`，包含末尾斜杠。稳定加密主密钥已安全配置，仅保存在服务器受保护文件；未复制本地用户 Key 到生产。用户钱包以整数微元表示，充值请求为整数人民币元；支付状态 API 确认到账，不能用浏览器跳转代替到账状态。

此前用户已在本地预览自行授权，真实余额只读查询成功。该结果不能代表生产已授权；本次生产只核验已登录身份、未连接状态及空订单记录，没有交换真实 Key、发起付费模型调用、创建支付订单或付款。因此完整生产 OAuth 回调、真实生成/精修质量和费用、真实充值到账与到账后任务恢复仍待用户完成连接后的消费验证。

独立产品方管理 Key 尚未配置，仅影响站长分润价目；用户消费 Key 不替代它。单 Key 额度查询、远端撤销、已结算分润接口及文档模态冲突继续按审计记录列为待确认项，不调用未公开接口、不将单位预估收益显示为已结算收入。观猹身份登录、小程序真机授权/支付宝跨应用验收、上传/审核/发布继续暂缓。

## 回滚

此前稳定应用 SHA 为 `83bb83b120ca9dfc3cd88b5d6504b12cb77f8925`。香港受保护备份 `/opt/paperbanana/backups/tokendance-20260909T114451Z` 保存原镜像锁与运行配置；目录 0700、文件 0600。上线后若已有加密连接，应保留 `core-with-tokendance.env` 中的新稳定主密钥，不能用旧空配置覆盖，不回退或清理数据库。Web 回滚到同一旧 SHA，保留排行榜入口。新加坡精确域名增补有独立受保护备份，可按原配置回滚。本次未触发应用回滚。

结构化证据：[2026-09-09-tokendance-evidence.json](2026-09-09-tokendance-evidence.json)，只保存公开版本、摘要、工作流和验收结论，不包含密钥、授权文件内容、回调 code、Cookie 或账号联系方式。
