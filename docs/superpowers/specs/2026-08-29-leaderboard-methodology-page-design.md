# PaperBanana 排行榜独立方法说明页设计

## 目标

将排行榜首页的“读榜前需要知道”完整移除，新增 `/leaderboard/methodology`，以可复现方式公开当前 `pb-image-light-v1` 的真实评测流程和四题原文。

## 权威数据

- 现有公开 action `benchmarkMethodology` 从 `PB_IMAGE_LIGHT_V1` 派生公开 suite，不在 Web 复制提示词。
- 仅对 `evaluationMode=codex_single`、`profileStatus=published` 的 Standard release 返回完整方法数据；历史 Quick/Full 保持原响应。
- 公开 suite 包含 `id/title/version/language/license/manifestHash`，以及四题的 `id/category/title/caption/aspectRatio/renderPrompt/negativePrompt/requiredEntities/requiredRelations/requiredText/forbidden/rubric/manifestHash`。
- 方法响应同时公开当前 release hash、evaluation epoch、review protocol、reviewer kind/pass 数、零自动 Judge、3/4 入榜门槛、七维 0–10 分、红线封顶语义、七维等权 Overall 与 competition ranking。
- 不公开盲标签、模型身份映射、审核证据、签名材料、密钥或内部 operator 记录。

## 页面结构

- 排行榜首页删除 Methodology 区域，页面顺序变为 Hero → 七维 Top10 → 综合矩阵。
- 排行榜与维度页顶栏“方法说明”统一链接 `/leaderboard/methodology`。
- 方法页包含：概览与版本标识、评测流水线、四题完整提示词卡、七维评分与总榜公式、审核与红线规则、局限与许可。
- 每题卡完整展示正向/负向提示词、必需实体/关系/文字、禁止项、七维 rubric 和 case hash；正向与负向提示词提供复制按钮及可访问成功状态。
- 方法页提供返回综合总榜；窄屏下题卡与 rubric 表单列排列，不产生页面横向溢出。

## 路由与失败状态

- 新增 Vite 静态入口 `/leaderboard/methodology/index.html`，支持尾斜杠、非根 `BASE_URL` 和 GitHub Pages 直达。
- 路由 resolver 将 `methodology` 识别为正式页面，不当成非法维度；受限 404 fallback 继续只接管 leaderboard/bench。
- 方法数据加载失败时显示明确错误和重试按钮；不回退到可能漂移的 Web 内置提示词。

## 验收

- API 测试校验 suite 精确来自 `PB_IMAGE_LIGHT_V1`、hash 与四题字段完整、历史 release 不增量暴露。
- Web 测试校验首页不再出现旧区域，方法页完整显示四题和评分规则，复制交互、路由、静态入口、非根 base、错误/重试和 390/430px 均正确。
- 不触发生图、Judge、发布或生产调用；更新 `SYNC.md` 记录新增公开方法契约。
