# 移动端输入框修复双站发布 · 2026-10-21

用户反馈手机键盘遮挡输入框，输入后的文字位置偏移，长文本不能正常显示。本次先在发布工作树完成修复与本地验证，随后按用户授权发布至两个站点。

## 发布范围与版本

- 工作树：`/Users/a1-6/.codex/worktrees/session-ui-release-20261021/paperbanana（tuyan）`。
- 父提交 `364fbde341628b4b2dff162a50d93db0ed905ef9` 为文档提交；此前两站实际运行 `c99c2b5fe5237ddbd30bf5b72ccf012d594ae746`。
- 本次修复及双站运行版本：`860206c6f68e6651d6b53e604a31410d47b23c23`。
- 只修改 Web 输入框、视口处理、样式及对应测试夹具，没有 API、模型、共享契约或数据迁移变更。按 SYNC 协议无需新增跨端待办。
- 旧开发工作树 `tuyan-multitab-release-20261019` 的并行改动保留；复核仍为 53 项已跟踪改动、24 项未跟踪内容。

## 修复内容

- 保留键盘弹出前的页面高度，兼容布局视口与可见视口同时缩小的浏览器，按可见区域放置输入框。
- 键盘展开时收起欢迎展示区域，并限制输入区高度，为文字和工具按钮保留空间。
- 有文字的草稿在失焦后仍保持多行显示，长文本可在框内滚动，长连续字符自动换行。
- 移除影响文字高度、行高与内边距的过渡，避免光标及文字偏移；输入元素保持挂载。

## 验证

- 本地针对性测试 62 / 62 通过，生产构建通过。
- Chromium、WebKit 各覆盖 320、390、440、1440 宽度，共 8 组配置通过。手机尺寸覆盖键盘覆盖、仅 innerHeight 缩小、两种视口同时缩小，检查长文本滚动、继续输入、中文组合输入、失焦与键盘恢复、设置往返、清空后收起、SVG 输入区及横向溢出。
- 浏览器验证使用本地合成数据，外部请求与真实模型调用均为 0。手机键盘由视口事件模拟，这些结果不代表真实 iPhone 键盘验收；真机复测由用户继续进行。
- CI Web 1,168 / 1,168 通过，0 失败、0 跳过；Core 1,547 通过、1 跳过、0 失败；Benchmark 200 / 200；Gateway 197 通过、1 跳过、0 失败；真实 MongoDB 事务测试 39 / 39。类型检查、离线并发与混合绘图流程检查、生产构建及四个镜像检查均通过。
- 保留既有构建大包体积提示，本次未调整打包策略。

## 正式发布与线上核验

- CI [39553559959](https://github.com/yrjmdqmmx/Tuyan/actions/runs/39553559959) 的 7 个作业全部成功，包括杭州部署及 GitHub Pages 发布。
- 杭州发布回执：`ci-39553559959-1`，`2026-10-21T06:39:37Z` 确认 healthy；Core、国内网关、国际网关、Plot、Benchmark 五项服务健康，`modelCalls: 0`。
- 回滚备份：`/var/backups/hangzhou-ci-39553559959-1`；Web 目录：`/opt/tuyan-entry/releases/ci-39553559959-1-860206c6f68e/web`。
- 北京时间 `2026-10-21 14:40:57` 核验 `https://tuyansci.cn/version.json` 与 `https://www.paperbanana.asia/version.json`，均返回本次修复完整 SHA。
- 两站实际应用入口加载的 WorkspaceRoot JS/CSS 均包含本次多行输入修复。两站 CSS 的 SHA-256 均为 `37045f40b0c803c6984b33c0d8a8ab75a975b350d26c1b183815ee998dd5ff50`，与本地已验证构建逐字节一致。
- `https://tuyansci.cn/ready` 与 `https://api.paperbanana.asia/ready` 均返回 `code: 0`、`ok: true`、`authReady: true`，MongoDB、OSS、providerEgress、Benchmark 依赖均 ready。

证据目录：`/Users/a1-6/.codex/artifacts/tuyan-mobile-composer-20261021`。浏览器截图及脚本位于目录根部；发布回执、CI 状态、测试统计及线上资源核验位于 `release/`。

本记录为发布后的文档提交，符合部署工作流的文档路径排除规则，不触发重复部署。真实模型调用为 0，未删除数据或清理旧工作树。
