# Agent 知识 1.2.1：Skill / MCP 同步与双站发布 · 2026-10-21

按 Skill / MCP 审计结果，同步现有期刊规则、完整图型契约和 Agent 工作流，并修复知识来源记录及国内 Skill 下载入口。发布工作树为 `session-ui-release-20261021`；未合入旧开发工作树的并行改动。

## 发布版本

| 位置 | 版本或提交 | 核验 |
| --- | --- | --- |
| 主仓库发布代码 | `10b292b34b093c965bac8f7a5af679144d78f926` | [CI 39573205626](https://github.com/yrjmdqmmx/Tuyan/actions/runs/39573205626)，7 个作业全部成功 |
| 国内站 / 备用站 | 同一代码提交，知识 `1.2.1` | 两站 version.json 及下载文件已读取比对 |
| [Tuyan-Skill](https://github.com/yrjmdqmmx/Tuyan-Skill) | `f693c1402187622b508ed1447e84aea29df38ea9` | [CI 39573313789](https://github.com/yrjmdqmmx/Tuyan-Skill/actions/runs/39573313789) 成功 |
| [Tuyan-MCP](https://github.com/yrjmdqmmx/Tuyan-MCP) | `77b645438889d1d2a38795fccb510a0b8d2f07e7` | [CI 39573316276](https://github.com/yrjmdqmmx/Tuyan-MCP/actions/runs/39573316276) 成功 |
| 本机 Skill / 离线 ZIP | `1.2.1` | 全部 11 个发布文件的 SHA-256 与 canonical 文件一致 |

统一知识 SHA-256：`69dcae01db1e67a637a715c5c110535f352cf7a15559f3cc5c06bdf66259cea1`。

独立仓库的 `distribution.json` 均绑定发布代码 `10b292b3`，文件清单由主仓库导出，包含逐文件摘要和验证脚本。该提交是生产代码版本；后续本记录及 SYNC 的文档提交不代表重新部署。

## 审计问题与实现

- 期刊：复用现有 `2026-10-19.v11` 目录，18 本、268 条规则、95 条来源记录；保留全部 11 个历史规则版本。来源、核验日期、阶段、用途、图像性质、要求等级、冲突和待确认状态均保留，选择与筛选在调用方本地执行。
- 图型：完整同步 `2026-10-10.v1` 的 13 组、92 个图型及其必要输入、元素、语义、变体、支持边界和分析方法；保留旧 `data_stat` 别名，因此工具枚举仍为 93 项。统一图型路由，数值图用代码、SVG 用矢量路径、组合图按面板处理；能力缺失可明确停在 spec-only。
- 工作流：新产物采用 FigureSpec / CritiqueRecord / OutputBundle v2；旧 v1 Schema 资源保留。输入材料作为证据，PNG 评审当前图片，SVG 检查源码和渲染图；评审绑定产物摘要和版本，数值检查独立于视觉评审，多面板保留各自图型语义。
- 来源记录：新增 `prepare-knowledge.mjs`，保存实际取得的 MCP manifest / workflow 或明确的离线知识。finalizer 校验对应关系，避免把线上知识错误标记为安装包版本；历史评审不能认证已改变的产物。
- 分发：主仓库统一生成完整离线快照、自包含 Node 24 运行时及依赖许可证。两站清单列出知识版本和 11 个文件摘要；杭州构建归档启用隐藏文件，传输后、正式发布前再次验证 `.well-known`。CI 检查生成文件与源码一致性。
- 本地化：补齐英文图型描述、检查项和流程说明，完整原始中文契约和期刊来源内容保留并标注来源语言；没有宣称全部原始内容已人工翻译。
- 发布前补修：大写 `.SVG` 同样执行源码 / 渲染图及真实矢量检查；finalizer 拒绝 `manifest.json` 符号链接并禁止跟随链接写入。新增回归覆盖后发布为 1.2.1。1.2.0 对应运行 `39570971027` 在部署前取消，没有切换生产。

## 测试

- 最终专项测试：60 / 60；独立 Skill：27 / 27；独立 MCP：30 / 30，均无失败或跳过。
- 最终发布 CI：知识 / Skill 47 / 47；Gateway 198 通过、1 项既有跳过；真实隔离 MongoDB 事务 39 / 39；Core 1,547 通过、1 项既有跳过；Benchmark 200 / 200；Web 1,168 / 1,168。
- 类型检查、离线并发、离线混合绘图、生产构建、四个镜像检查和传输后的下载包校验均通过。Linux CI 重建的离线运行时与已提交文件一致。
- 所有模型相关集成测试使用离线替身，没有调用真实模型。保留原有大包构建提示，未修改打包策略。

## 正式发布和线上核验

- 杭州回执 `ci-39573205626-1`，`2026-10-21T09:20:01Z` 确认 healthy；Core、国内网关、国际网关、Plot、Benchmark 五项服务健康，`modelCalls: 0`。
- 回滚备份：`/var/backups/hangzhou-ci-39573205626-1`；Web：`/opt/tuyan-entry/releases/ci-39573205626-1-10b292b34b09/web`。
- [国内清单](https://tuyansci.cn/.well-known/skills/index.json) 返回 `application/json`；[备用清单](https://www.paperbanana.asia/.well-known/skills/index.json) 返回 `application/json; charset=utf-8`。每站 11 个文件逐字节 SHA-256 均与发布源一致；国内入口不再返回 SPA HTML。
- 两站 `version.json` 均为完整提交 `10b292b34b093c965bac8f7a5af679144d78f926`。国内及国际 `/ready` 均为 `code: 0`、`ok: true`、`authReady: true`。
- 匿名 MCP 使用统一公开地址 `https://api.paperbanana.asia/mcp`，保持单工具、五枚举参数，公开 21 个资源。本轮实际读取 manifest、完整图型、期刊索引、v11、历史 v1、CritiqueRecord v2 六项资源，及英文 heatmap / SVG 工作流，内容摘要与本地 canonical 输出相同。
- 当前会话原生 `tuyan.get_workflow_bundle` 已实际返回知识 1.2.1 和相同知识摘要，bar / SVG 路由为 code。没有向 MCP 发送论文、图片、提示词或用户研究内容。
- 浏览器分别打开两站，均正常显示匿名登录入口；未登录账号或创建任务。初次国内浏览器请求超时后，新的正常 HTTPS 页已加载成功；备用站命令行直连握手中断后，经本机现有代理完成全部读取，未关闭 TLS 校验。

## 本机、离线包和保留边界

- 本机：`/Users/a1-6/.agents/skills/tuyan-scientific-figure`。升级前完整备份，更新 11 个发布文件，保留额外文件；安装后已实际执行离线准备命令，确认 1.2.1、英文流程及 bar / SVG 的代码路由。
- 最新安装前备份：`/Users/a1-6/.codex/artifacts/tuyan-agent-sync-release-20261021/installed-skill-before-20261021-165856`；最早原安装备份 `installed-skill-before-20261021-164114` 同样保留在证据目录。
- ZIP：`/Users/a1-6/.codex/artifacts/tuyan-agent-sync-release-20261021/tuyan-scientific-figure-1.2.1.zip`，540,629 字节；SHA-256 `02972aaa0a8817f8ffbd3990dcf4bc6b477468d7558e5c50a72c05a6cb63c107`。包含 11 个 Skill 文件和清单，解包摘要核验通过。
- 旧工作树 `tuyan-multitab-release-20261019` 未写入，仍为 53 项已跟踪改动、24 项未跟踪内容；状态摘要与开工时相同。没有删除用户数据、修改生产模型路由或部署中间版本。
- 本轮同步的是现有已维护的期刊规则库，没有重新逐条核验出版社现行政策；格式及评审记录不等于科学正确或投稿许可。原始详细规则的完整英文翻译、真实模型生成质量、已登录账号全流程和真实 iPhone 验收均未在本轮执行。
- 已打开的 Agent 会话可能缓存旧 Skill 说明，新会话应重新读取已安装 Skill；本机文件更新与当前原生 MCP 返回已分别验证。

证据目录：`/Users/a1-6/.codex/artifacts/tuyan-agent-sync-release-20261021`。主要文件为 `live-verification.json`、`native-mcp-verification.json`、`browser-verification.json`、`ci-final-run.json`、`ci-final-jobs.json`、`ci-test-summary.json`、`production-final/deployment-receipt.json`、`installed-skill-receipt.json`、`offline-package.json` 和 `protected-worktree-final.json`。
