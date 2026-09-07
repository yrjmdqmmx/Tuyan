# 模型目录 v14 与 OpenAcad 导航发布记录

2026-09-07，用户授权“走上线流程”，随后补充导航栏加入 https://openacad.xyz/。本次范围为模型目录与接口适配、Core/Web、新加坡 Provider 出口以及工作台/排行榜的 OpenAcad 外链。小程序同源代码纳入提交，上传和平台发布仍按此前单独约定暂停。真实模型推理与账号权益验证不属于本次发布验收。

## 合并前记录

- 开发分支 `codex/model-capabilities-20260907`，基线 `800c91fc7e1d23588771bfb2703ad25a006c6e21`，已核对当前 `origin/main` 相同。
- [逐型号实现与官方依据](../model-capabilities/2026-09-07-catalog-v14.md)、[本地验证记录](../model-capabilities/2026-09-07-v14-validation.json)。静态目录 669 个型号，OpenRouter 当前快照 466 个型号；不兼容型号从运行目录与选择器移除。
- OpenAcad 外链加入工作台与排行榜导航，沿用新标签打开；目标地址本次只读 GET 返回 HTTP 200、标题 OpenAcad 开放学术。Web 340 项全量测试及构建通过。
- 已核对现有 GitHub 登录、仓库合并权限、生产 SSH、服务健康与不可变镜像。生产代码仍为 `590419b24e222b23d4f6adafc2474e0106153dc1`，Core 保持 sg-required，常驻 Benchmark Worker 保持 disabled。
- 发布使用项目现有手动工作流、环境保护和主机锁；新建 Core 与配套 Worker 镜像，沿用现有 Gateway、Plot Worker、Mongo 镜像。SG 仅更新已核对的 Provider 允许名单和对应安装脚本。

## 发布门

- [x] 本地实现、回归、目录一致性和发布前只读检查
- [ ] PR 与合并前完整 Linux CI
- [ ] 合并及固定 SHA 镜像发布
- [ ] 香港生产部署与线上版本/健康/目录验收
- [ ] SG 允许名单应用及无密钥允许/拒绝边界验收
- [ ] Web Pages 发布与导航、MiniMax 区域界面验收
- [ ] 小程序上传 / 平台发布（继续暂停）
- [ ] 真实模型推理 / 账号权益验收（本次不执行）

## 已核对的回退基础

- 当前 Core：`ghcr.io/yrjmdqmmx/paperbanana-core-api@sha256:b7167668bc94fe7ad4512a63ab7b97b3ff2b840da047ff37ca738fb4e3555503`。
- 当前配套 Worker：`ghcr.io/yrjmdqmmx/paperbanana-benchmark-worker@sha256:781b51951e0fad600ab7f0ed1126346a5fc8e7d11348d85c0f0532a9db85d641`。
- 回退仍须保留已发布的账号生命周期 v3 边界；不使用此前无限历史清扫版本，不处理其他账号或缺失对象。

尚未完成的发布门将在实际验收后更新，不以 CI 或镜像构建成功代替线上发布。
