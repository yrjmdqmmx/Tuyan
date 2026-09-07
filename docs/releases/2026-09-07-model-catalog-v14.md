# 模型目录 v14 与 OpenAcad 导航发布记录

2026-09-07，按用户“走上线流程”授权完成 Core、Web 与 SG 出口更新；工作台和排行榜导航均加入 [OpenAcad](https://openacad.xyz/)。小程序同源代码已合并，上传与平台发布按此前单独约定继续暂停。本次没有真实模型推理、付费调用或评测发布。

## 固定版本与发布门

- 实现 PR：[#170](https://github.com/yrjmdqmmx/Tuyan/pull/170)，实际部署 SHA `b4bbc0f1473479044509ed25416ad927a1546739`。
- 修复版提交 `681e0795406db6adddcb590b26fe1f540be085bd` 的[分支 CI](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34126661308)与 [PR CI](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34126665327)全通过；[合并 SHA CI](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34127102588)三个任务也全部通过，包含 Node 全栈回归、生产镜像构建与真实 Mongo 8 集成。
- [Core 镜像](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34127135593)：`ghcr.io/yrjmdqmmx/paperbanana-core-api@sha256:d6e4b5c787daa531e0f87a93449c08e17a2f1568125a65c15eb2244d9cfa196e`。
- [配套 Benchmark Worker 镜像](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34127150733)：`ghcr.io/yrjmdqmmx/paperbanana-benchmark-worker@sha256:0a9aa868e2c653e73248f408a597878ce6aa1b96c7440b92108347bc892e40c5`。共享图片实现与 Core 同一代码来源，常驻执行仍 disabled。
- [香港生产部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34127504017)：成功。使用既有 main 环境审查、主机锁、不可变镜像锁、维护与排空流程，保留 `configured-disabled`。
- [Web Pages](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34127736455)：成功，构建同一固定 SHA，保留 `bench_enabled=true`。生产加载 `assets/main-DgEjLtIr.js`。
- [x] 实现与本地回归、合并前和合并后完整 CI
- [x] Core / Web / SG 实际发布与下述线上验收
- [ ] 小程序上传 / 平台发布（按用户约定暂停）
- [ ] 真实模型推理 / 账号权益验收（本次不执行）

本文件与机器可读证据是在部署验收后补记；后续纯文档提交不改变上述实际部署 SHA。详细逐型号差异、官方来源及移除理由见 [目录审计](../model-capabilities/2026-09-07-catalog-v14.md)、[现行型号表](../model-capabilities/2026-09-07-catalog-v14.csv)和[差异决定表](../model-catalog-decisions.csv)。

## 实现与审阅回归

静态目录从 306 增至 669：新增 367、修正 73、移除 4。OpenRouter 本次核对 471 个唯一型号，移除 5 个不兼容条目后保留 466（其中 45 个图片型号）。21 个渠道的能力按具体型号、地区、生成/编辑和平台协议维护。

合并前审阅发现的三处问题已修复：Web 精修透传 `providerRegions`；BFL/fal/Replicate 的状态和结果 GET 对临时 HTTP 408/429/5xx 在同一截止时间内退避重试；fal 仅有任务 ID 时按官方 SDK 的应用根路径构造查询 URL。任务 POST 仍只提交一次。Laf 内联适配与共享源同步。

修复后本地 Core 448、Web 342、共享/Laf/小程序/根契约 70 项通过；覆盖两区实际精修提交与独立 Key、查询恢复和永久错误、Retry-After 超时、fal 嵌套生成/编辑路径及非法任务 ID。尺寸 15,502 组、新渠道后端派发 7,345 组、独立 schema 4,877 组、OpenRouter 图片派发 1,446 组通过；Core 类型/构建、Web 构建、目录 669 项无漂移。此前本地部署测试的旧主机列表断言已修正，最终完整 Linux CI 通过。

## 生产验收

- Core 与配套 Worker 容器镜像、`/app/build-provenance.json` 的代码 SHA 与本次合并值一致；五个项目服务均 healthy。Core 保持 `sg-required`，Worker 保持 `PAPERBANANA_BENCH_ENABLED=false`；Gateway、Plot Worker、Mongo 镜像沿用发布前版本。
- 公网 `/health` 与 `/ready` HTTP 200；Auth、Mongo、OSS、Provider Egress、Benchmark 依赖 ready。
- 公网 `modelRegistry` 为 `2026-09-07.v14`，`providerRegionContractVersion=1`。669 个静态型号的 ID、角色、协议、能力、地区、生命周期、日期及输入输出模态共 9,366 项逐字段比对通过。
- OpenRouter 466 个 ID 无重复、均可选择；`meta/muse-image` 与 Recraft 四个 Styles 型号不在运行目录。其余静态移除项与当前代码目录一致。动态数量为本次观察快照。
- 生产浏览器确认工作台与排行榜的 OpenAcad 链接均为 `https://openacad.xyz/`，在新标签打开。397 px 窄屏下两个导航均无横向溢出、未出现页面错误。
- MiniMax 单一产品入口可选择国际/中国大陆；地址与 Key 申请链接跟随区域变化。国内 Image-01 Live 显示自动加 7 种固定比例；切回国际区后移除 Live 并选择 Image-01。浏览器未输入真实 Key、未提交任务。
- 公开排行榜 release JSON 与发布前逐项相同：41 个模型，releaseId `bench-scientific-v2-release-1f652f6370203d1ecf6a`，releaseHash `1f652f6370203d1ecf6a8f8ce679097b968b412cd4ab0bdf0362e3a5dce9d482`。

全部结果、实际服务镜像与无密钥出口探针见[机器可读验收证据](2026-09-07-model-catalog-v14-evidence.json)。这些证据确认部署、目录、界面与传输，不代表用户账号模型权益或真实生成/编辑成功。

## SG 允许名单与传输边界

通过已验证的 HK→SG WireGuard 管理连接，核对线上 Squid 与本次模板只差 approved ACL 后，先验证配置，再原子替换并热重载；同步合并版本安装脚本，保留更新前配置用于回退。没有重建 WireGuard、修改 SSH/防火墙或更换密钥。

- 新增 BFL 官方域、Stability、Ideogram、MiniMax 国际、Mistral、Together、Fireworks、fal、Replicate 的实际接口主机。代码中 BFL 的任务 URL 仍限制为 `api.bfl.ai` 或 `api.*.bfl.ai`，不会向图片下载地址附带 Key。
- 九个新增渠道主地址全部 CONNECT 200，随后得到预期无密钥/方法/元数据 HTTP 响应。BFL 全局及当前官方 `api.us.bfl.ai` 的 OpenAPI 均 HTTP 200。
- 原 OpenAI/Gemini/OpenRouter/Ark 探针通过；未允许域名、IP 字面量、非 443 端口均由代理拒绝。MiniMax 中国域也被 SG 拒绝，按代码走直接出站。
- 另一次补充探针访问旧 `api.us1.bfl.ai` 出现 CONNECT 超时，保留为外部观察，未计入通过；[官方当前区域入口](https://docs.bfl.ai/api_integration/integration_guidelines)为 `api.us.bfl.ai`。实际付费任务返回的动态轮询地址仍需账号调用验收，本次未做。
- Squid 与项目 WireGuard 服务 active；配置 SHA256 `404f6dbbfef09305aec93680126450c13502e9dff5b11282e22c6b65233c9e56`；安装脚本 SHA256 `c977b016456eec22f2fecdb406a44e8f00c51316e344b00063d4134fe5d2d975`，与合并版本一致。

## 回退基础

本次未触发回退。若需要回退，仍使用项目受锁发布入口并保留账号生命周期 v3 边界：前一生产 SHA `590419b24e222b23d4f6adafc2474e0106153dc1`，Core `b7167668bc94fe7ad4512a63ab7b97b3ff2b840da047ff37ca738fb4e3555503`，配套 Worker `781b51951e0fad600ab7f0ed1126346a5fc8e7d11348d85c0f0532a9db85d641`；其余镜像保持原值。SG 已保留原配置，原 SHA256 为 `16a837a753932ab2c5fc38a0237f8481729bff586fa9b78b1f3e3cd04a8e59b3`。不处理其他账号或缺失对象。
