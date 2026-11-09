# 旧链接统一进入新工作台（2026-10-21）

## 变更范围

生产入口只挂载 WorkspaceRoot；不再根据 `/changelog`、`/leaderboard` 或 `?view=legacy` 挂载旧 App／独立站点外壳。

| 原入口 | 新工作台内的目标 |
| --- | --- |
| `/changelog`、尾斜杠、`index.html` | 更新日志；保留版本、旧版本别名、分类和事件锚点 |
| 根地址的日志版本／分类锚点 | 更新日志，刷新仍能恢复目标 |
| `/leaderboard/**`、`/bench/**` | 综合排名、维度、方法、模型证据、题目证据与提交页 |
| 排行榜 `?__route=` | 兼容 Pages 404 恢复，保留查询和片段 |
| `?view=guide/account/records` | 使用教程／账户设置／保留任务列表 |
| `?tokendance_wallet=…` | 账户设置中的账户分区 |
| `?admin=…&a_…`、社区审核旧路径 | 既有后台权限校验及筛选／详情状态 |
| `?view=legacy/generate` | 新工作台 |
| `?view=refine` | 新工作台上传控件（仅定位，不点击、不改草稿、不执行） |

侧栏与排行榜内部导航进入浏览器历史；前进后退恢复页面。切换公共页面不卸载已登录账号的工作区，不因页面导航生成新任务或提交模型请求。

匿名访问日志、排行榜、教程等公共页面使用临时导航外壳，不初始化任务、模型或执行存储。业务工作区仍遵循原 AUTH_REQUIRED 配置；后台继续要求登录及服务端站长权限。账户回调、邮箱验证、密码重置、法律文档均为独立的非旧工作台流程，保留原有校验与链接。

## 核验

- 全量 Web 测试 1,176 项通过；生产构建通过。
- 新增路由覆盖旧路径、index 文档、根与子目录部署、全部版本／事件锚点、恶意或未知查询、前进后退、草稿保持、匿名和后台边界。
- 本地 Chrome 验证 `/changelog#v4-0-0`、`/changelog/index.html#v3-8-1`，只有一个新工作台外壳；历史锚点位于可视范围。
- 390px 手机布局无横向溢出。此项为浏览器布局验收，不等同于物理 iPhone 验收。
- 本次未调用真实模型，未更改后端／共享 API、账户数据、模型配置和并行开发工作树。

## 发布与线上验收

- 代码版本：`f3e23d84fa9c7655c531cac19fccc8e4a9f31666`。
- [CI 39607806735](https://github.com/yrjmdqmmx/Tuyan/actions/runs/39607806735) 的 verify、四个镜像、杭州 deploy 和 Pages 共 7 个任务全部成功。Web 1,176 项通过；Core 1,547 项通过、1 项跳过；网关 198 项通过、1 项跳过；Benchmark 200 项通过，无失败。
- 杭州发布回执：2026-10-21 13:52:03 UTC 完成，状态 `healthy`，`modelCalls: 0`。未改动既有渠道路由。
- `https://tuyansci.cn/version.json` 与 `https://www.paperbanana.asia/version.json` 均返回上述代码版本；`https://tuyansci.cn/ready` 与 `https://api.paperbanana.asia/ready` 均为 `ok: true`、`authReady: true`。
- 新域名 `/changelog#v4-0-0` 显示新工作台外壳、2026-10-21 日期及补全后的内容；第二域名 `/changelog#v4-0-0` 与 `/changelog/index.html#v3-8-1` 同样保留版本定位。
- 新域名排行榜进入实际模型证据详情后，刷新仍恢复对应详情；第二域名 `/bench/methodology` 经过 Pages 深链接回退后显示新工作台内的评测方法页。
- 新域名 `/?view=legacy` 显示新输入区；页面中不再提供“原工作台”链接。手机宽度 390px 下，根地址 `/#v4-0-0` 仍进入新日志，版本标题可见且无横向溢出。
- 本机验收记录与截图：`/Users/a1-6/.codex/artifacts/tuyan-workspace-routes-20261021/`，包含 CI 结果、发布回执、两站版本与健康结果、浏览器路由记录和桌面／手机截图。

本记录为发布后文档补充；文档提交不触发重复部署，线上运行版本仍为上列代码版本。
