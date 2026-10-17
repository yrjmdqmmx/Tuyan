# 4.0 模型目录整合记录

执行日期：2026-10-09。当前代码为本地工作树，未提交发布、未部署、未进行真实付费模型调用。

## 来源与范围

- 目标：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`，分支 `codex/tuyan-v400-workflow-20261009`，共同基线 `5e6989f59416e44d9f22fd26703d3830ed861ea7`。
- 来源：`codex/model-catalog-20261009`，固定到 `4869c2a57adf74282ef14a892517299c61b1db28`；包含 `74bbf10`、`66d98b8`、`b8e25cc`、`26424cb`、`889c9bf`、`4869c2a` 六个提交。
- 从该分支整合 79 个 Web/Core/共享/文档文件，跳过 4 个小程序生成文件。另修正整合兼容、补充工作流测试和本记录。没有修改来源分支、旧 Desktop 工作副本、独立微信工程或生产环境。
- 合并前保存 110 个现有修改/新建源码文件、Git binary patch 与 SHA-256；位于 `output/workflow-v400/catalog-integration-20261009/`。10 个重叠文件三方合并，4 处文本冲突分别处理测试时点、i18n 字典与共享类型导出。4.0 主流程/设置文件没有被来源文件整份覆盖。

## 已整合行为

- 目录版本 `2026-10-09.v31`，静态渠道身份 1,040→1,079，新增 39；重新执行集合比较，移除 ID 数为 0，原始渠道默认值变化数为 0。同一个底层模型在不同渠道分别计数；此统计不含 OpenRouter 实时目录。
- 增加新型号、生命周期资料和禁选纠正，包括停止把 Replicate Wan 3 当作图片接口。旧 ID 保留，不自动替用户迁移。
- 新增 Replicate 文本/视觉预测结果处理、固定审核版本和持久任务恢复；合入 fal、Ideogram 等渠道的精确图片参数、尺寸与参考输入适配。
- 模型列表显示输入/输出、思考与上下文或输入上限；详情分列原厂规格和当前渠道限制，保留未知、版本映射状态、来源与核查日期。官方音视频能力不自动变成图研已适配能力。
- 原有 4.0 视觉模式、前置视觉门禁、观察报告交主模型、逐候选保存、评审轮数以及未复审状态保留。普通模式仍优先视觉主模型；专业模式视觉默认为“无”，打开时仍显示停用面板，不误开通用 API。
- 思考模式沿用简化开关，强度显示具体默认值，只有接口必填时保留预算输入。新 Sonnet 5.5 的 `between_tools` 不当作“关闭”；简化开启使用该精确配置支持的 `adaptive`，不提供接口不支持的 Off。新 Haiku 5.5 保留开启/关闭。卡片说明与该规则同步。

详细型号、厂商证据和仍待核实项沿用 [首轮目录](../model-catalog/2026-10-09.md)、[后续适配](../model-catalog/2026-10-09-adaptation.md)、[原厂规格补全](../model-catalog/2026-10-09-manufacturer-specifications.md)。本次主要核查整合与实际代码路径，没有将历史来源记录包装成新做的一轮全渠道研究。

## 验证证据

| 检查 | 结果与证据 |
|---|---|
| 目录身份与默认值 | [集合比较](../../output/workflow-v400/catalog-integration-inventory.json)：新增39、无删除、原始渠道 defaults 不变 |
| Core 全量 | 1,150/1,150；[最终日志](../../output/workflow-v400/catalog-integration-core-final.log) |
| Web 全量 | 625/625；[最终日志](../../output/workflow-v400/catalog-integration-web-final-full.log)；此前整合首轮624/624，参数卡片与思考/通用配置专项35/35 |
| 类型与构建 | Core `tsc --noEmit`、Core 与 Web 构建通过；日志 `output/workflow-v400/catalog-integration-{core-check,core-build,web-build}.log`。Web 仍有大 chunk 提示，主包约4.33MB，非构建错误 |
| 生成物 | `sync-model-catalog.mjs --check --skip-miniprogram`、`sync-thinking.mjs --check`、`sync-workflow.mjs --check` 通过 |
| 新模型与4.0交叉 | [3项测试](../../apps/paperbanana-api/tests/workflow-catalog-integration.test.ts)使用真实 Gateway/Core/恢复调度和模拟模型返回；[日志](../../output/workflow-v400/catalog-integration-workflow.log) |
| 桌面/移动端 | 1440×1050、390×844、320×844；模型详情键盘Enter打开、手机点击展开、型号选择及视觉无面板可用；320px弹框 scrollWidth=clientWidth=320，无横向溢出 |
| 小程序保护 | 合并前50个既有小程序修改/新增文件哈希保持；源分支4个小程序生成文件未应用，本轮未生成、构建、测试或发布该端 |

新增工作流测试核对的不是只有请求次数：Replicate 主模型直读时收到当前图片；协作时观察模型收到图片且报告进入主模型请求，最终修改方案来自主模型。fal 首张请求走 `text-to-image`，修订请求走支持参考输入的 `edit-image` 适配入口，实际 `image_urls[0]` 回读字节与上一张 PNG 完全相等；仅执行1轮决策，修订结果为 `modified_unreviewed`。这是“参考上一张图重新生成”的产品流程，未声称局部修改/遮罩。文本主模型且无视觉辅助在任何模型请求前返回 `WORKFLOW_VISION_REQUIRED`。

首轮 Core 1147项有3项失败，根因为现有4.0测试把 `z-image-turbo` 的 `analyze-redraw` 能力误断言为 `none`，失败后未排空测试任务使另两项收到429。已修正断言并将排空放进 finally；190项组合测试复验及最终1150项全量均通过。新增交叉测试初次使用不含持久任务调度的简易夹具而被接口正确拦截，改用同仓库完整 Gateway/Core/恢复夹具后通过。以上均为测试装配或断言纠正，没有放宽产品校验。

截图：

- [视觉“无”桌面面板](../../output/playwright/catalog-merge-none-1440.png)
- [Replicate渠道与原厂资料](../../output/playwright/catalog-merge-replicate-1440.png)
- [Google桌面详情](../../output/playwright/catalog-merge-google-1440.png)
- [390px模型卡片](../../output/playwright/catalog-merge-cards-390.png)
- [320px展开详情](../../output/playwright/catalog-merge-detail-320.png)
- [新Sonnet思考控件](../../output/playwright/catalog-merge-sonnet-thinking.png)

## 当前边界

本地预览 `http://127.0.0.1:5173/` 已加载新 Web；`8791` 为已重启的本地模拟 Gateway/Core。自动浏览器使用独立测试会话，未修改用户 Chrome 的密钥与草稿。账户、地区、真实图片质量、模型账单均未验证；没有部署或发布。小程序继续暂停，完整同步和包体验收列入 SYNC 后续待办。
