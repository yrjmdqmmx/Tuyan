# PaperBanana Web 多渠道模型路由设计 QA

## 验收对象

- 参考稿：`/Users/a1-6/.codex/visualizations/2026/08/19/01a01a00-e1f0-7a93-93d1-dd67f05203c2/.superpowers/brainstorm/63916-1787144579/content/model-access-hierarchy-v2.html`
- 参考稿截图：`/Users/a1-6/.codex/visualizations/2026/08/19/01a01a00-e1f0-7a93-93d1-dd67f05203c2/source-model-hierarchy-viewport.jpg`
- 实现截图：`/Users/a1-6/.codex/visualizations/2026/08/19/01a01a00-e1f0-7a93-93d1-dd67f05203c2/paperbanana-web-desktop-model-drawer.jpg`
- 同视口组合对比：`/Users/a1-6/.codex/visualizations/2026/08/19/01a01a00-e1f0-7a93-93d1-dd67f05203c2/paperbanana-design-comparison.jpg`
- 移动端最终截图：`/Users/a1-6/.codex/visualizations/2026/08/19/01a01a00-e1f0-7a93-93d1-dd67f05203c2/paperbanana-web-mobile-initial-fixed.jpg`

## 视口与密度

- 桌面：1280 × 720，DPR 2。
- 移动端：390 × 680 iframe。
- 中等宽度：900 × 680 iframe。

## 已验证状态

- 普通模式只显示一个 API 渠道及该渠道默认的三角色模型，凭据区只出现实际需要的渠道。
- 专业模式的主模型、图像模型、视觉模型可独立选择 API 渠道。
- OpenRouter、阿里百炼、火山方舟按“API 渠道 → 模型开发厂商 → 模型”展示；Google 与 OpenAI 直连跳过厂商层。
- 桌面端模型抽屉与生成设置相邻；移动端逐层替换，并提供返回 API 渠道或模型厂商的操作。
- OpenRouter 不兼容模型折叠时不渲染卡片；展开后分批显示并提供具体禁用原因。
- Ark 未输入 Key 时不探测；免费验证先覆盖主模型和视觉模型，明确确认付费后才验证图像模型。
- 顶栏“意见反馈”可打开反馈对话框，旧右下角悬浮入口不存在。
- 精修页保持独立可用，可查看当前路由并打开共享生成设置；SVG 生成配置不会污染精修的 PNG 模型选择。
- 1280px 桌面、900px 中宽和 390px 移动端均无横向裁切；390px 顶部页签保持单行并允许横向滚动。
- 新开桌面会话和最终移动端会话均无 console warning/error，仅有 Vite 开发连接日志。

## 对比结论

实现保留参考稿的浅米色与墨绿色视觉语言，以及 API 渠道、模型厂商、具体模型三层信息架构；并把概念稿整合进现有工作台的生成设置和精修流程。参考稿中的 Seedream 5.0、Gemini 3.6 示例没有被机械复制；实现按权威注册表显示可用正式模型，并采用 Gemini 3.7 Flash，这是有意的正确性差异。

## 迭代记录

1. 捕获参考稿与 1280px 实现的同视口状态。
2. 合成并检查左右对比图，确认层级、间距、遮罩和模型卡信息密度。
3. 响应式 QA 发现 390px 顶部页签换行；在 `092c89d` 中改为单行、固定宽度及横向滚动。
4. 重新捕获移动端截图，并复查 900px 与 1280px 状态、交互和控制台。

Final result: passed
