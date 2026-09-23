# 公开排行榜恢复与 Tuyan Benchmark v2.5 日志补齐

## 原因与即时恢复

前次 Web 发布传入了 `bench_enabled=false`。该输入实际编译为 `VITE_BENCH_ENABLED=false`，使公开排行榜、方法说明及证据页进入“尚未开放”分支；它与后台 `PAPERBANANA_BENCH_ENABLED` 是两个不同开关，发布操作将两者误解为同一个边界。

2026-09-23 用户报告后，先只读核对公开 API：46 个模型、九题完整方法，releaseHash 一致为 `8e6619b57c6979d9c5687893afa64fa40a81b5976f49d1466506d3b4a9ddd2fc`。数据没有丢失，也没有重新生成评测结果。

[恢复发布](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35811528627) 使用已经通过 CI 的 `e304b7d92d463a6344fe8e3cc307aef99da23c60`，仅将旧前端开关设为 true。正式站点已验证方法说明直接打开、刷新、中英文、46 模型排名与帕累托切换、缩放、390/320px 手机展开/关闭；无页面错误，仅 `benchmarkMethodology` / `benchmarkLeaderboard` 只读请求。服务器镜像与环境指纹均未变化，后台执行器仍为 false。

## 防止再次误关

- Web 改为独立、明确的 `VITE_PUBLIC_LEADERBOARD_ENABLED`，默认显示已发布公开内容；只有显式 false 才进入公开页面维护状态。
- Pages 输入改为 `public_leaderboard_enabled`，默认 true，描述明确“不启用付费评测执行器”。旧 `bench_enabled` 输入不再接受，旧 `VITE_BENCH_ENABLED` 不再控制公开页面。
- 保留后端全部权限、评测执行、发布快照和计费边界；未修改后台开关，未部署后端。新环境参数只属于 Web；共享协议与小程序无需修改。
- 追加回归：旧前端/后台执行开关 false 时公开页面仍可读，只有新显式维护开关可以隐藏；实际九题页面只发出方法说明读取请求。

## Benchmark v2.5 归属

用户明确指出 v2.5 包含帕累托更新，故将已有上线证据的帕累托、费用展示、手机图表和双语内容从待归属草稿并回 **Tuyan Benchmark v2.5**。保留 2026-09-17 原发布日期，在同一条目注明后续 09-20–21 追加上线；不归入 Tuyan v3.8.0，不制造 v2.6。

- PR [#222](https://github.com/yrjmdqmmx/Tuyan/pull/222)：帕累托与移动交互；[09-20 Web 发布](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35519902396)。
- PR [#223](https://github.com/yrjmdqmmx/Tuyan/pull/223)：扩大图表、统一导航；[09-21 Web 发布](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35561997844)。
- PR [#224](https://github.com/yrjmdqmmx/Tuyan/pull/224)：双语与筛选；[09-21 Web 发布](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35603884753)。上述 GitHub 发布均重新核对为 success。

公开文案区分官方定价和已核对测试费用，缺少可比较成本的型号仍在排名视图保留。版本归属、首发日期与后续功能实际上线日期分别记录，结构化数据自动供汇总和分类视图使用；中英文文案、维护稿和待办同步。

## 验证

- Web 524 项测试通过，包含开关语义、公开方法页请求以及 v2.5 唯一归属/来源回归。
- 生产构建通过，刻意保留旧 `VITE_BENCH_ENABLED=false` 验证它不再误关公开页面。
- 本地构建预览使用本轮只读获取的公开 API 快照和匿名会话夹具；生产 API 不允许本地预览来源，测试未放宽 CORS。正式站点恢复验收使用浏览器直接请求，无响应替换。
- 本地构建预览已核对九题、46 模型、桌面与 390/320px 帕累托、日志汇总与分类中的 v2.5、中英文新增内容、原发布日期和独立版本身份。最终生产交付另按实际 PR / Pages 结果及正式站点核对，不用本地结果代替部署。未充值、未调用付费推理、未重跑历史任务、未上传或发布微信版本。
