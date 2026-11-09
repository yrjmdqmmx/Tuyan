# 实时模型目录与 OpenRouter 入口修复

2026-10-16，本地开发工作树。用户页面 `http://127.0.0.1:5196/` 的 API 为 `http://127.0.0.1:8793`。

原本该 API 的 `modelRegistry` 仅返回 `STATIC_MODEL_REGISTRY`，而 OpenRouter 由 Core 动态加载，因此被遗漏。现改为调用当前 Core 的同一 `modelRegistry`，以实时公开 GET 读取 OpenRouter 文本/图像目录及 TokenDance 目录。其他渠道保留当前 Core 的已审核目录；账户专属目录仍须按原连接流程提供凭据，本服务不会伪造账户可用性。

启动：在仓库根执行 `node scripts/figures/ui-fixture.mjs`。为兼容已有启动命令保留文件名，目录数据已经使用真实上游；通过 `TUYAN_CATALOG_PORT` 可更改仅绑定回环地址的端口。复用 Core 的缓存、渠道精确 ID、角色及图像格式判定，不新增自动推荐，不对新目录条目宣称调用通过。服务拒绝生成、账户和存储操作，网络传输仅放行三个固定公开目录 URL，不携带调用者凭据、不跟随重定向。

Web 会保留服务端 `unavailableProviders` 标记的渠道，显示原因。移动端无厂商时直接进入状态页，并可返回渠道；目录恢复后可继续选择。当前选择不会因为访问失败渠道而被替换。

OpenRouter 图标改为官网为浅色背景提供的 Ink glyph SVG：https://openrouter.ai/brand 。直接使用官方文件，无改色或重绘；更新来源、SHA-256 和文件名以刷新旧资源缓存。

验证结果：

- 当前 Core 实际读取返回 v32、32 渠道、OpenRouter 426 条；按角色统计主模型 388、图像 47、视觉 234，角色互有重叠。这是本次目录读取结果，不保证未来数量或账户可调用性。
- 目录逻辑与故障 2/2、Web 路由/目录相关 41/41、规格与品牌资源 16/16 通过；Core 类型检查、Web 构建通过。构建保留已有大 chunk 提示。
- 桌面 1440×1000、移动 390×844：真实目录下 OpenRouter 主模型、图像、视觉选择通过；模拟目录失败入口可见；logo 24px 正常加载，无页面错误或横向溢出。
- 证据：`/Users/a1-6/.codex/artifacts/tuyan-live-catalog-20261016/`。`live-registry.json` 为实际读取记录；`qa-results.json`、`logo-qa.json` 和截图为浏览器结果。

本地服务已替换并持续运行。无模型推理、提交、推送或部署；没有把旧线上 v27 目录覆盖进当前本地 v32。
