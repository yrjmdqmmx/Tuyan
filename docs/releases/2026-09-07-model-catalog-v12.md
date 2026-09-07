# 模型目录 v12 生产发布记录

2026-09-07，按用户“进入上线流程”授权完成 Core、Web 与 SG 出口更新；用户随后明确小程序上传暂不处理。未发起模型推理或付费调用。实现与逐型号排除依据见 [实现报告](../model-catalog-repair-2026-09-07.md) 和 [逐型号清单](../model-catalog-decisions.csv)。

## 固定版本与发布门

- 实现 PR：[ #166](https://github.com/yrjmdqmmx/Tuyan/pull/166)，合并 / 实际部署 SHA `8cbd41520906502f9348b8b48b2cd2613bb5369d`。
- 合并前两轮 CI 全通过；[合并 SHA CI](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34088468463) 三个任务（Node 全栈检查、Docker 镜像、Mongo 8 迁移集成）通过。
- [Core 镜像](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34088519611)：`ghcr.io/yrjmdqmmx/paperbanana-core-api@sha256:520521ca92731370496103f38c88a252f2996af76b8a13ffa3020e365d8a811e`。
- [Benchmark Worker 镜像](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34088522146)：`ghcr.io/yrjmdqmmx/paperbanana-benchmark-worker@sha256:13e617b9aa1280e7e8662597a3d1b24e503a9416e4b46fd88d7f62c56558dd79`。仅为保持共享图像实现及代码来源与 Core 一致，常驻 Worker `PAPERBANANA_BENCH_ENABLED=false`。
- [香港生产部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34088898267)：成功。使用项目现有主机锁、暂存不可变镜像锁、维护与排空流程；运行 `configured-disabled` 验证、Mongo 事务与最小权限、隔离和健康检查后退出维护。Core 与 Worker 实际容器镜像和 `PAPERBANANA_CODE_SHA` 与上述值逐项一致，Core 保持 `sg-required`。
- [Web Pages](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34089104732)：成功，构建输入为同一固定 SHA，保留 `bench_enabled=true`。生产加载 `assets/main-DP-rFB51.js`。
- 小程序：同源目录、TS/JS 与本地检查已完成，上传和平台发布按用户要求暂缓。

首次 HK 发布尝试使用固定发布分支，被现有“仅 main 可部署”环境规则拒绝，未执行主机步骤。随后从已核对为相同 SHA 的 main 完成现有环境审查与发布；没有放宽分支或环境保护。

## 生产验收（不调用模型）

- 公网 `/health`、`/ready` 和 `modelRegistry` 均 HTTP 200；Mongo、OSS、Provider Egress、Benchmark 依赖 ready。生产目录为 `2026-09-07.v12`。
- 306 个静态模型逐项与生成的 Web 目录比对：ID、协议、角色、输入输出模态、能力、地区、到期 / 最早退役日期及替代 ID 全部一致。
- 12 个渠道的实际条目数量：DeepSeek 3，Kimi 4，智谱 27，硅基流动 59，Anthropic 11，Recraft 16，xAI 7，Gemini 15，百炼 118，OpenAI 25，方舟 21；另有 OpenRouter 动态条目 471。
- OpenRouter 471 个 ID 无重复；9 个主 / 视觉 / 图片多角色条目同时保留分角色协议，9 个生命周期日期条目保留官方日期。动态数量是本次观察快照，后续以聚合目录更新为准。
- Web 浏览器使用隔离会话访问生产首页与设置，普通 / 专业路由可打开；xAI 显示 5 个文本 / 视觉型号，Recraft 显示全部 16 个图片型号及编辑能力；页面未增加“未实测”状态。该检查不填写密钥、不提交任务。
- 公开排行榜仍为 41 个模型，releaseId `bench-scientific-v2-release-1f652f6370203d1ecf6a`，releaseHash `1f652f6370203d1ecf6a8f8ce679097b968b412cd4ab0bdf0362e3a5dce9d482`；没有启动评测或改动发布数据。

## SG 精确白名单更新

通过现有 HK→SG WireGuard 管理连接，用现有 SSH 身份执行。核对线上 Squid 与合并版本模板仅差三个主机后，先验证候选配置，再原子替换配置并热重载 Squid；同时同步同一合并版本的安装脚本，留有本次更新前配置用于回滚。没有重建 WireGuard、修改 SSH / 防火墙或更换密钥。

- 新增精确域名：`api.anthropic.com`、`api.x.ai`、`external.api.recraft.ai`。
- 无密钥 GET 验证：Anthropic `/v1/models` 为 CONNECT 200 + HTTP 401；xAI `/v1/models` 为 200 + 401；Recraft `/v1/images/generations` 为 200 + 405（GET 不支持，已证明 TLS 到达接口；未发送生成 POST）。
- 原有 OpenAI / Gemini / OpenRouter / Ark 探针通过；非白名单域名、IP 字面量和非 443 端口仍由代理返回 403。
- Squid 与项目 WireGuard 服务均 active。
- Squid 配置 SHA256：`16a837a753932ab2c5fc38a0237f8481729bff586fa9b78b1f3e3cd04a8e59b3`。
- 安装脚本 SHA256：`80a3ef630b69bbe4dd15f73e878747bfd034616d12bc637bd68edf42e09dbf40`，与合并版本逐字节一致。

## 验证边界与回退

本地 Core 418、Web 331、共享 API / 目录 31 项测试以及小程序 21 个测试文件通过；构建、生成目录无漂移和 Linux CI 通过。生产验收覆盖部署身份、健康、目录、界面与无凭据传输，账户模型权益、真实生成 / 编辑返回仍需用户自己的 Key 才能确认，本轮未执行。

回退可沿用相同受锁部署入口：前一部署 SHA `d224bcd7c83386226f1a96a5ed76f13cd556afda`，Core digest `2f9dd2d4bdcbd9b905f6875f572a907448cbe559aaf16179bd617511db06bda3`，Worker digest `d7adab35d60209ad22df740ddca4249d3b1c358e7ae087474e3c19a1c47d1544`；其余镜像未更换。SG 保留项目范围内的前版本配置。此次未触发回退。
