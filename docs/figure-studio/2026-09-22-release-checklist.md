# 论文画布发布核对 · 2026-09-22

**当前不可合并发布。** PDF 编辑兼容性验收失败；真实预览 `5290` 等待用户正常登录，通用 API 缺少验收连接和凭据。以下仅为源码与 GitHub GET 核对结果，未启动构建、部署或供应商调用。

## 源码与审批

- [x] GitHub 当前 `main`：`0d8b0b4500eb9ca6d8b1b5180450276c7f78b2fb`（PR #224）；本工作树 HEAD：`29b310168d84a93a4374de00e6067ecaede4bf63`，本轮后端/运行时改动尚未提交，HEAD **不是**完整待发布产物。[main 来源](https://api.github.com/repos/yrjmdqmmx/Tuyan/commits/main)
- [x] `paperbanana-production` 环境只允许 `main`，要求审核人 `yrjmdqmmx`；`prevent_self_review=false` 不等于免审。必须通过原 GitHub 环境审核，不能更改保护规则或绕过 reviewer。[环境规则](https://api.github.com/repos/yrjmdqmmx/Tuyan/environments/paperbanana-production) · [分支限制](https://api.github.com/repos/yrjmdqmmx/Tuyan/environments/paperbanana-production/deployment-branch-policies)
- [ ] 修复当前验收阻塞并确认最终范围；提交、PR 审查、最终 SHA 的 `CI` 全通过后，记录合并后的完整 `RELEASE_SHA`。CI 含 `node`、`mongo-index-migration`、`images`，新增受限 Linux 容器的真实转换 smoke 不得跳过。[CI](../../.github/workflows/ci.yml)

## 发布顺序与参数

| 顺序 | 工作流名称 / 文件 | 必要输入 |
| --- | --- | --- |
| 可并行构建 ① | **Publish Core API Image** / `publish-core-api.yml` | `ref=RELEASE_SHA`，`confirm=publish-hk` |
| 可并行构建 ② | **Publish Auth Gateway Image** / `build-auth-gateway.yml` | `ref=RELEASE_SHA`，`confirm=publish-hk` |
| 可并行构建 ③ | **Publish Benchmark Worker Image** / `build-benchmark-worker.yml` | `ref=RELEASE_SHA`，`confirm=publish-benchmark-worker` |
| 三镜像成功并完成环境审批后 | **Deploy Hong Kong Production** / `deploy-hk.yml` | workflow 运行分支 `main` 必须对应同一 `RELEASE_SHA`；`gateway_image`、`core_image`、`benchmark_image` 填上述新产物的完整 `@sha256`；`worker_image`、`mongodb_image` 填核对后的现网基线；`benchmark_secret_mode=configured-disabled`；`confirm=deploy-hk` |
| 后端核验通过后 | **Deploy GitHub Pages** / `deploy-pages.yml` | `ref=RELEASE_SHA`，`confirm=deploy-pages`，`bench_enabled=true`（保持现网值） |

工作流源码：[Core](../../.github/workflows/publish-core-api.yml) · [Gateway](../../.github/workflows/build-auth-gateway.yml) · [Benchmark](../../.github/workflows/build-benchmark-worker.yml) · [HK](../../.github/workflows/deploy-hk.yml) · [Pages](../../.github/workflows/deploy-pages.yml)。镜像构建只推送 GHCR，不切生产；部署只用不可变 digest，不能用 `latest` 或 SHA tag 代替 digest。

Benchmark companion 必须与新 Core 一起构建：既有 `bootstrap-benchmark.sh` 会同时更新 Core/Benchmark 的 `PAPERBANANA_CODE_SHA`，Benchmark 运行器核对编译、配置与任务 SHA；保留 `PAPERBANANA_BENCH_ENABLED=false`、并发 `1` 和既有配置凭据模式。Plot/Mongo 本轮没有改动，不要求重建或升级。[配置更新](../../deploy/hk-single-host/scripts/bootstrap-benchmark.sh) · [SHA 保护](../../apps/benchmark-worker/src/process-run.ts)

## 最近成功部署基线

来源为 HK 成功运行 [35601906465](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35601906465)（2026-09-21，SHA 同当前 main）的实际输入；Pages 成功运行 [35603884753](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35603884753) 同 SHA，构建日志确认 `VITE_BENCH_ENABLED=true`。**这是已执行工作流证据，本次未重新读取主机运行容器；正式切换前须核对主机 image lock / RepoDigests，不能假设此后没有变更。**

| 镜像 | 最近成功的完整不可变引用 |
| --- | --- |
| Gateway（本轮替换） | `ghcr.io/yrjmdqmmx/paperbanana-auth-gateway@sha256:1ad307c929e4663ce8011c6cb371d0ca33aeedde80e87fe78c8edd5035ef0cce` |
| Core（本轮替换） | `ghcr.io/yrjmdqmmx/paperbanana-core-api@sha256:828cabefbf9af059601abd29f406741f94e04a8ce184a38b5e9fe223dc9907ed` |
| Benchmark（同 SHA 替换） | `ghcr.io/yrjmdqmmx/paperbanana-benchmark-worker@sha256:1461a4b542923f34e3f177717844787d04910cac05fe652d6ff9aa70b58aecca` |
| Plot（核对后保留） | `ghcr.io/yrjmdqmmx/paperbanana-plot-worker@sha256:23894f4844c4145046f882a8eff7665c907d1e433d1afaa8edc8fcdab337d2e3` |
| Mongo（核对后保留） | `mongo:8.0.16-noble@sha256:5dda65a823a0d73d9caae4f449ab01973cf9884cea4ef56f9cb84dbe5e00acbd` |

## 数据副作用与切换后证据

- [x] 相对 `origin/main`，`deploy/hk-single-host`、Mongo adapter、Core runtime 和参考图元数据文件无差异；本轮没有新增旧业务数据迁移、旧图片任务回填或支付/基准测试调度。画布复用的 `provider-workflow.ts` 未修改。
- [x] **数据库并非零副作用**：`figureOperations.ensureIndexes()` 为 `paperbanana_figure_operations`、`paperbanana_figure_admissions`、`paperbanana_figure_provider_executions`、`paperbanana_figure_provider_steps`、`paperbanana_figure_provider_step_chunks` 创建索引和 7 天 TTL；注册账号注销清理。仅真实请求产生画布操作/加密结果。[实现](../../apps/paperbanana-api/src/figure-operations.ts) · [启动挂接](../../apps/paperbanana-api/src/main.ts)
- [x] 原发布流程仍会停 Gateway、让旧 Core drain，然后重建容器，并执行既有 `sync-reference-metadata.sh`；Core 启动仍有 `reconcileInterruptedJobs` 与注销 sweep。它们没有因本轮新增，但确有写入，不能把第二个共享生产 DB 的 `main.ts` 实例当只读预检。[部署脚本](../../deploy/hk-single-host/scripts/deploy.sh) · [元数据同步](../../deploy/hk-single-host/scripts/sync-reference-metadata.sh) · [原启动恢复](../../apps/paperbanana-api/src/runtime.ts)
- [ ] 获准切换后保存五个运行镜像 digest、Core/Benchmark provenance SHA、健康状态、受认证画布 capabilities / 操作恢复、实际 PDF/EPS 文件的独立兼容性结果，以及 Pages 产物哈希与浏览器页面证据。只读查询不重发旧操作；真实文本预算仍为本轮累计最多 6 次 / ¥1。

`deploy-laf-functions.yml` 现名为 **Verify Laf Rollback Prerequisites**，只核验旧 Laf 回滚前提，不发布代码；本次正常发布不用它，也不改生产 reviewer 或重建 Mongo 数据卷。
