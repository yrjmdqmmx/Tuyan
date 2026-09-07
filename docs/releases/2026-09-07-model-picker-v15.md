# 模型选择与比例设置 v15 发布记录

2026-09-07（UTC），按用户“走上线流程，微信小程序先不用管”授权完成 Web 与香港 Core 生产发布。新版模型选择器统一三级目录、公司名称和版本顺序，并按当前型号、操作与分辨率隐藏不支持的比例。

## 版本与发布门

- 实现 PR：[#172](https://github.com/yrjmdqmmx/Tuyan/pull/172)，实际部署 SHA `b96d507c4bcb2424c1814d6cdf4e81aae2b4cfb6`。
- 实现提交 `bd039f1711f958a7b77596ada87ab91fae710d4a` 的[分支 CI](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34139086433)、[PR CI](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34139172623)及[合并提交 CI](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34139952455)全部通过；各含 Node 全栈回归、生产镜像构建与真实 Mongo 8 集成任务。合并前自动审阅完成，无待处理代码评论或变更请求。
- [Core 构建](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34139992780)：`ghcr.io/yrjmdqmmx/paperbanana-core-api@sha256:f631bcc118a64510f8b26faac3d1bce4422600cde2612cb962e25ce7d4e86bd5`。
- [配套 Benchmark Worker 构建](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34139994411)：`ghcr.io/yrjmdqmmx/paperbanana-benchmark-worker@sha256:5a55e529d88491d5c77b274aa740dfd232899aaefa18585649f0f2c9a94145a9`；与 Core 同一代码来源，执行仍 disabled。
- [香港部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34140472043)：成功。经过既有 `paperbanana-production` 环境审批、主机锁、镜像锁、维护和排空流程，采用 `configured-disabled`。
- [Web Pages](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34140656406)：成功；测试、构建、发布使用同一固定 SHA，保留 `bench_enabled=true`。生产浏览器加载 `assets/main-DR8e5daZ.js`。
- [x] 实现、本地验证、合并前及合并后 CI
- [x] Core / Web 实际发布和下述生产验收
- [ ] 微信原生模拟器 / 真机、上传及平台发布（按用户要求暂缓）
- [ ] 真实模型推理 / 账号权益验收（本次未执行）

本文件与机器可读证据在部署验收后补记；后续纯文档提交不改变上述实际部署 SHA。逐项问题、官方依据、名称映射及本地验证见[实现核对记录](../model-picker-2026-09-07.md)。

## 实现与本地验证

669 个静态调用 ID 与既有渠道能力保持一致；499 条厂商展示名规范化。公开条目新增可选厂商身份、服务档位和版本顺序来源字段，Web、共享目录与后端采用同一生成源。`Pro` 作为服务档位，调用仍保留完整官方 ID；所有渠道均保留“API 接入渠道 → 模型厂商 → 服务端模型目录”。优先依据官方日期、其次明确版本关系排序，未知条目稳定置后，推荐标签不参与。

比例设置使用共享生成/编辑与分辨率过滤函数，失效选择自动回到合法默认值，提交前再次验证。此前本地 Core 451 项、Web 342 项、仓库契约 10 项、共享 API 28 项通过；15,502 组静态渠道/型号/操作/分辨率/比例组合都能求得合法请求尺寸。共享源和已完成的小程序同源代码已合并；本次没有进行微信工具登录、原生验收、上传或平台发布。

## 生产验收

- Core、配套 Worker 镜像及 `/app/build-provenance.json` 的 SHA 均为本次合并版本；五个项目服务 healthy。Gateway、Plot Worker、Mongo 沿用发布前镜像；Core 保持 `sg-required`，Worker 保持 `PAPERBANANA_BENCH_ENABLED=false`。
- 部署工作流的本地健康、隔离、未授权 Core 访问和 Benchmark smoke，以及 Auth MongoDB 副本集事务 smoke 均通过；公网 `/health`、`/ready` HTTP 200，所有依赖 ready。
- 公网注册表为 `2026-09-07.v15`，区域契约版本为 1。669 个静态型号逐一比对 21 个字段，共 14,049 项通过；每个静态渠道的服务端 ID 顺序也与发布代码一致。
- OpenRouter 此次观察为 466 个唯一可选型号，其中 45 个图片型号；v14 移除的 `meta/muse-image` 及四个 Recraft Styles 型号仍不在运行目录。动态数量仅代表本次快照。
- 真实 Chrome 访问生产地址，没有模拟后端响应。1440×1000 下三栏实际宽度为 195 / 193 / 788 px，均无横向溢出；390×844 下三级逐步选择和返回可用，模型名及完整 ID 可阅读。
- 硅基流动的 `Pro/zai-org/GLM-5.1` 归入智谱，GLM-5.3 / 5.2 / 5.1 顺序正确；深度求索独立归类，无 Pro 厂商。Google 直连也保留厂商层，Gemini 3.8 Flash 排在前面。
- 复制按钮得到完整 `Pro/zai-org/GLM-5.1`，不关闭弹窗；键盘焦点能在模型弹窗内循环。OpenAcad 导航仍指向 `https://openacad.xyz/`。
- Ideogram 4 从 2K 的 9:22 切换到 1K 后，9:22 隐藏并选择自动；全部可见项与 1K 能力列表逐项一致。再从 5:8 切换到 GPT Image 1.5，5:8 隐藏并自动回退。未出现页面脚本错误。
- 公开排行榜 release JSON 与发布前完全一致：41 个模型，releaseId `bench-scientific-v2-release-1f652f6370203d1ecf6a`，releaseHash `1f652f6370203d1ecf6a8f8ce679097b968b412cd4ab0bdf0362e3a5dce9d482`。

验收脚本首次因只读接口允许列表漏写 `referenceLibrary` 自行中断；核对它的实际读接口实现后修正脚本，完整生产浏览器检查通过，未改动生产代码。最终运行记录、服务镜像、目录比对和浏览器测量见[机器可读证据](2026-09-07-model-picker-v15-evidence.json)。未输入用户 Key、提交生成/编辑任务或运行付费评测；以上证据不代表账号模型权益或真实推理成功。

## 回退与暂缓项

本次未触发回退，未变更 SG 出口、凭据或生产环境配置。回退仍应经过项目受锁发布入口并保留账号生命周期 v3 边界：前一生产 SHA `b4bbc0f1473479044509ed25416ad927a1546739`；Core 摘要 `d6e4b5c787daa531e0f87a93449c08e17a2f1568125a65c15eb2244d9cfa196e`，配套 Worker 摘要 `0a9aa868e2c653e73248f408a597878ce6aa1b96c7440b92108347bc892e40c5`，其余镜像保持原值。前版 Web 对应固定 SHA 也已保留。

小程序后续独立安排原生验收与平台发布。社区衍生模型中尚无可靠公司归属的条目继续展示“开发方待确认”；可兼容接口保留，未知公司不冒认成托管平台或基础模型公司，具体清单见实现核对记录。
