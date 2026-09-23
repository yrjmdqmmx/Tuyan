# 思考设置与更新日志本地验收

日期：2026-09-22。实施基线 `dc038f4`；隔离工作树 `model-catalog-channels-20260921`。以下均为本地代码、模拟请求及浏览器证据；本轮没有生产部署、付费推理、历史任务重跑或微信上传发布。Desktop 旧 checkout 保留。

## 自动检查

| 范围 | 结果 | 验证内容 |
| --- | --- | --- |
| Core 完整测试 | 1,009 / 1,009 通过 | 包含三份新增思考测试，共 22 项；其余为目录、请求、恢复、任务与已有能力回归 |
| Web 完整测试 | 490 / 490 通过 | 独立角色、身份切换与偏好缓存、旧后端、可选提交字段、更新日志数据和组件、导航回归 |
| 小程序完整测试 | 121 / 121 通过 | 新字段归一化保留、旧任务兼容、目录与包体预算 |
| 共享 API 测试 | 29 / 29 通过 | 共享请求、任务、公开字段和既有客户调用行为 |
| 登录网关测试 | 148 / 148 通过 | 既有鉴权、转发与任务接入回归 |
| Core TypeScript / 小程序 TypeScript 构建 | 通过 | 类型检查和小程序 TS → JS 产物 |
| Web / Core 生产构建 | 通过 | 静态多页面入口和服务端打包；只构建，未发布 |
| 两套生成同步检查 / Git diff 检查 | 通过 | `sync-thinking.mjs --check`、`sync-model-catalog.mjs --check`、`git diff --check` |

思考契约测试覆盖 1,029 个静态型号、1,327 个角色/协议身份、2,981 个合法字段组合映射；同时检查官方来源、默认省略、非法值/字段/身份、开关/强度/预算冲突和图像限制。它验证审计数据与实现的一致性，不能自行证明服务商文档事实或账号权益。

实际适配器测试经过 **395 个文本/视觉身份**的真实请求构造器，分别检查所选参数与服务商默认；图片经过 **21 个生成身份及 11 个符合编辑条件的身份**，核对最终协议字段、Fal 路径、Replicate 固定版本、Gemini 原生结构、Runware 请求结构和失败不自动重试。所有上游响应都是本地 fixture。

本地 Gateway/Core 模拟联通测试创建新的内存任务，验证生成、精修的服务端编译快照、公开任务元数据、伪造快照丢弃、身份非法拦截与缺少恢复加密能力的功能门控。恢复测试验证原快照冻结、加密保存、不以明文保存 Key、成功步骤复用、未知提交不重发、并发恢复只入队一次、角色隔离、旧描述符一致。它没有读取或重跑真实历史任务。

## 桌面与移动浏览器

Chrome / Playwright；桌面 1440px、移动视口 390px 与 320px。最终联合验收八项通过，页面错误、外部请求尝试和生成/精修/恢复提交均为 0。交互验收只改变本地设置并浏览页面；真正请求结构由上述模拟集成测试验证。

- 三个角色分别选择，默认项保持为空；切换型号使用默认，同一身份切回及刷新后恢复自己的偏好。
- Claude 开启思考缺预算、自适应与预算冲突均显示错误；恢复服务商默认后错误消失。
- 两种窄屏下三个角色可操作、无横向溢出；更多菜单顺序为工作台、排行榜、更新日志，当前项选中且可切换。
- 更新日志能搜索、清除搜索并恢复列表。独立页面验收还覆盖直接打开/刷新、来源展开、锚点及空结果恢复。

联合验收目录：[/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-thinking-and-changelog](/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-thinking-and-changelog)。包含可复跑 `qa.mjs`、机器可读 `checks.json` 和成功测试日志 `validation/`。

| 截图 | 证据 |
| --- | --- |
| [桌面三角色设置](/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-thinking-and-changelog/desktop-three-roles.png) | 独立参数与型号提示 |
| [非法组合提示](/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-thinking-and-changelog/desktop-invalid-budget.png) | 自适应与固定预算冲突 |
| [390px 设置](/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-thinking-and-changelog/mobile-390-roles.png) / [320px 设置](/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-thinking-and-changelog/mobile-320-roles.png) | 窄屏表单与滚动 |
| [390px 更多](/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-thinking-and-changelog/mobile-390-more.png) / [320px 更多](/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-thinking-and-changelog/mobile-320-more.png) | 导航顺序与选中状态 |
| [390px 更新日志](/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-thinking-and-changelog/mobile-390-changelog.png) / [320px 更新日志](/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-thinking-and-changelog/mobile-320-changelog.png) | 已发布历史列表 |

更新日志独立验收目录：[tuyan-changelog](/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-changelog)。历史来源与时间边界见 [维护说明](../../changelog-maintenance.md)，没有把当前未发布代码放进正式历史列表。

## 限制与剩余工作

- 真正服务账号的准入、地区权限、配额、限流、实际推理表现、耗时及费用尚未验证。官方可调参数不等于当前账号可调用；模拟通过不等于真实服务通过。
- 小程序只同步能力版本和任务配置/快照兼容，原生思考编辑界面及更新日志页尚未移植。源包 1,557,505 bytes，距原有 1.5 MiB 测试上限剩 15,359 bytes；未提高预算、未做微信平台包扫描。
- 本机缺少 Playwright WebKit 浏览器，未安装；Safari、微信浏览器及真实移动设备尚未验收。
- Web 构建保留大 chunk 提示，主包约 3,735 KB（gzip 429 KB）；Core bundle 约 5.7 MB。审计原始来源与大型目录不进入小程序。此次未把性能构建提示当作测试失败，也未据此声称真实设备性能达标。
- 新版默认会省略已核实的旧固定思考字段，可能改变新 Web 任务的服务商默认耗时和用量；无配置的历史任务保留原行为。逐项影响见 [交付说明](README.md#修正原有固定字段的范围)。
