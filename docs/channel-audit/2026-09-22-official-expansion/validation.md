# v24 本地验证记录

日期：2026-09-22。隔离工作树 `/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/model-catalog-channels-20260921`，分支 `codex/official-channels-v24-20260922`，基线 `61b8aabb9f2588fd3beb2684a86827d0a6ba66d0`。Desktop 旧 checkout 仍为 `68aacd8d976974209e98e92a0b09e18ab1dd61fc`，原有未跟踪 `.superpowers/` 保留。

## 自动检查

| 检查 | 结果 |
|---|---|
| Core：`pnpm --filter @paperbanana/paperbanana-api test` | 987/987，通过，无跳过 |
| Web：`pnpm --filter @paperbanana/web test` | 466/466，通过，无跳过 |
| 小程序：`pnpm --filter @paperbanana/miniprogram test` | 121/121，通过，无跳过 |
| 目录压缩：`node --test scripts/pack-model-catalog.test.mjs` | 2/2，通过；现有解码器还原字段、顺序、SHA、独立对象和确定性 |
| Core / 小程序 `check` | TypeScript 通过 |
| Core / Web / 小程序 `build` | 通过 |
| `node scripts/sync-model-catalog.mjs --check` | v24，1029 个静态身份，无漂移 |
| `node scripts/sync-reference-upload.mjs --check` | 无漂移 |
| `node scripts/sync-model-version-report.mjs --check` | 1445 行，无漂移；938 行是保留的历史待确认记录，不表示本轮新增型号缺失 |
| `git diff --check` | 通过 |

测试含逐型号请求 ID、端点、授权形式、主/视觉角色、输入图数、输出字段、Chat/Anthropic/SSE/JSON/multipart、图片尺寸、跨端身份与渠道排序。全目录 36,928 个可选尺寸组合符合合同，其中 27,754 个扩展渠道选择经过后端模拟分发；本轮商汤/阶跃图片 519 个组合使用真实 PNG 字节核验。上述数字是组合覆盖，不是额外的真实 API 调用次数。

新恢复回归覆盖商汤、阶跃、千帆的提交响应丢失和结果下载失败：同步结果未知时不重发 POST；结果 URL 已持久化时仅重试下载。精修恢复子集 18/18 已包含在 Core 987 项内。xAI 历史退役 ID 即便不在静态列表中也拒绝新调用，不自动跟随供应商替代型号。到期时间边界覆盖选择器、后台及旧结果恢复。

小程序源码总量 1,557,010 bytes，小于既有 1.5 MiB（1,572,864 bytes）预算，剩余 15,854 bytes。优化保持现有压缩格式和全部字段；没有提高阈值。余量较小，后续扩充目录仍需关注。Web 主产物约 2,994.48 kB / gzip 393.99 kB，构建保留大 chunk 警告；这是本地构建成功，不是部署包或微信平台审核结果。

## Web 交互验收

使用本地 Vite 和本地 Core 模拟网关，视口为 1440×1000、390×844。浏览器只放行 localhost/data/blob，网关各供应商调用由 fixture 拦截，未知外部地址直接拒绝。没有真实 Key 或推理流量。

- 17 次型号选择覆盖五个新渠道与 Grok 4.7 的主模型/视觉，以及商汤、千帆、阶跃图片型号。
- 稀宇科技主要展示名、MiniMax 搜索及中国/全球区域凭据隔离通过。
- 商汤多参考图、千帆图片编辑均在实际本地工作流完成；返回图片是合成 fixture，不代表供应商画质。
- 切换至不兼容阶跃编辑型号时保留原图、辅助图和指令，阻止无效提交。
- 无 Vite 错误覆盖、控制台异常或窄屏横向溢出。

本机原始日志、浏览器脚本、JSON 报告和截图目录：
`/Users/a1-6/.codex/artifacts/tuyan-official-v24-20260922/`。

- [浏览器报告](/Users/a1-6/.codex/artifacts/tuyan-official-v24-20260922/browser-report.json)
- [Grok 4.7 选择](/Users/a1-6/.codex/artifacts/tuyan-official-v24-20260922/desktop-grok-47.png)
- [稀宇科技区域配置](/Users/a1-6/.codex/artifacts/tuyan-official-v24-20260922/desktop-xiyu-region.png)
- [商汤模拟结果](/Users/a1-6/.codex/artifacts/tuyan-official-v24-20260922/desktop-sense-result.png)
- [千帆模拟结果](/Users/a1-6/.codex/artifacts/tuyan-official-v24-20260922/desktop-qianfan-result.png)
- [窄屏保留输入与拦截](/Users/a1-6/.codex/artifacts/tuyan-official-v24-20260922/mobile-block-preserves-input.png)

## 尚未验证与授权边界

官方公开目录和接口资料已核对；真实账号准入、模型开通、订阅是否允许多用户商业服务、地域/速率限制、真实质量及账单未验证。普通 API、Token/Coding Plan、地区密钥分开记录。未支持的独立签名/异步结果/专用工作流逐项保留原因，没有虚构可用能力。

本轮没有充值、付费推理、历史任务重跑、push、部署或微信上传/审核/发布。小程序完成共享目录、TS/JS、兼容及包体检查；未做微信真机/平台包扫描，既有原生辅助图/遮罩/结构化表单待办仍见 SYNC.md。
