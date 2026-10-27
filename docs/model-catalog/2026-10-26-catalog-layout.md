# 模型目录卡片布局与已停用型号过滤

核查时间：2026-10-26T19:34:15+08:00。本轮是用户要求的 Web 展示修正及 Kimi 新版本核对，不是第二次全渠道周更。

## 起点与保留范围

- 工作树：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`；分支 `codex/tuyan-v400-workflow-20261009`；origin `https://github.com/yrjmdqmmx/Tuyan.git`。开工读取当前 AGENTS.md、SYNC.md 和目录维护资料。
- 起点 Git 状态与 4887 个文件 SHA-256 保存在 `/Users/a1-6/.codex/artifacts/tuyan-catalog-layout-20261026`；每次写入前校验相关文件预期哈希。继承脏改动保留。
- 本轮不改目录源数据、API、默认选择、请求适配器、共享契约或生成物，因此按 AGENTS 的纯 Web UI 例外不新增 SYNC 条目。未运行生成器或小程序相关命令；224 个小程序文件哈希与起点一致。

## 本地改动

1. `modelRegistry.js` 新增目录展示用的退休判定：有效到期时间已过，或现有记录已禁选且带生命周期来源与明确停用原因。明确未来到期时间优先，不提前隐藏；临时读取失败和未适配不能据此判成停服。
2. `WorkspaceModelCatalog.jsx` 在搜索、渠道列表和计数使用同一过滤结果；从浏览目录移除已停用卡片，保留底层历史 ID、保存的配置和旧任务。删除“规格与来源”展开栏，直接展示输入、输出、上下文窗口。
3. `workspaceModels.css` 统一标题、API ID、角色、三项规格/来源、操作栏五个位置，卡片高 380 CSS px。长标题与 ID 保留完整 title；来源链接排成一行，额外链接用编号保留访问入口。
4. `ModelSpecifications.jsx` 增加仅目录使用的紧凑来源展示；其他调用位置保持完整来源名称。三项数据仍来自现有官方规格记录，未知仍为待确认，不把输出限额冒充上下文。
5. `workspace-model-catalog.test.mjs` 覆盖到期/未来到期/旧别名/渠道移除/暂时失败/适配缺口/无效日期边界、历史注册表不变、规格直接呈现及全部来源可访问。

## 浏览器实际核验

- 本地只读预览 `http://127.0.0.1:5190/?workspacePreview=1` 使用当前工作树；生成与账户操作关闭，外部动态目录读取关闭。预览总数不可与联网生产目录总数直接比较。
- 深度求索原厂：目录仅显示 `deepseek-flash` 与 `deepseek-v4-pro`，两个已停用旧 ID 不再展示。
- 腾讯 TokenHub：`glm-5`、`glm-5.1`、`glm-5-turbo` 不再展示；`glm-5v-turbo` 的 2026-10-30 下线日期尚未到，继续显示。
- 桌面 Kimi 六张卡片均为 336 × 380 CSS px；390 px 窄屏均为 358 × 380 CSS px。每张均有三项规格、零 details/summary；窄屏无页面或卡片横向溢出。
- 腾讯五张 GLM 搜索结果，包括较长下线日期标题和五种输入模态的卡片，同样为 336 × 380 CSS px。
- `desktop.png`、`mobile.png`、`desktop-layout.json` 保存在上述工件目录。Chrome 预览保留在 Kimi K3.1 Pro/Highspeed 搜索结果。

## Kimi K3.1 Pro 核对

2026-10-26 再次读取官方公开资料：
- [Kimi 官方发布说明](https://www.kimi.com/en/blog/kimi-k3-1-pro)
- [Kimi 开放平台](https://platform.kimi.com/)

官方已发布 Kimi K3.1 Pro，并提供 Highspeed；K3 仍在官方平台，不因发布新版自动视为下架。工作树在本轮开始前已包含 `kimi-k3.1-pro`、`kimi-k3.1-pro-highspeed`，本轮未重复添加。当前预览已显示两张卡片。截图中的生产目录未包含此次本地周更，不能把本地存在报告成已上线。

输入/输出图标描述官方规格；可选角色和适配合同描述图研实际能力。Kimi 原厂 K3.1 Pro 两个 ID 当前是 main 角色，本轮没有新增其视觉适配或验证真实调用。

## 验证与未验收边界

- 64/64 相关 Web 离线测试通过：目录、规格、百炼多模态、模型选择器、模型管理、注册表；使用外部网络阻断器，未调用真实模型。
- Vite Web 构建通过，输出在工件目录；仍有既有大 chunk 警告。没有写入仓库 dist 或小程序目录。
- 未修改目录事实、默认或适配合同，未重新运行全渠道官方资料普查；不能宣称所有卡片信息已完整核实。此前周更要求仍为逐渠道/API ID 采集三项与来源、日期和缺口。
- 目录展示已更新；离线行为和桌面/窄屏浏览器已验证；真实调用、账户可用性、模型质量和生产发布均未验收。本轮零付费推理，未提交、推送、建 PR、部署或修改生产数据。
