# 全局搜索与他山科研生态联合发布

## 范围与来源

正式发布树 `tuyan-multitab-release-20261019`，已发布基线 `d8bc9a90732069233ed81ac9209de62fbfa9a9d1`。本会话的手机交互、全局搜索与任务彻底删除以 `f4e3d4a7` 保存，隔壁科研生态 `b8f228e5` 通过 `8ce532c8` 合并。源工作树保持不变。用户授权在联合验证正常后一起上线；不调用真实模型、不改原任务数据。

科研生态卡片与搜索共用 catalog。新增生态总入口和 Semiotic / VizNoir / DataViz 三个工具，支持中文名称、英文别名及桑基图、VTK、仪表盘等关键词；选择结果只导航。连续搜索同一工具可重新进入该工具。原任务、功能、工具分组以及关闭搜索后返回侧栏并保留位置的行为保留。

## 发布前验证

- Web 全量 1,117 项通过，2 项 Vite 构建测试触及 512 MB 进程上限；单独用 1 GB 上限串行重测 2 / 2 通过。包括新增生态名称/别名/关键词与重复跳转、零执行及草稿保全测试。
- Gateway 194 项通过、1 项隔离 Mongo 用例常规跳过；随后独立 512 MB / 1 CPU Mongo 副本集的 24 / 24 测试通过，无跳过，含永久删除与旧客户端/执行领取竞争。新删除集成测试已加入发布必经脚本。
- 390 / 1440 浏览器验证实际 WorkspacePages 懒加载跳转、三类关键词、重复进入、侧栏位置、取消、任务草稿保全。外部 / 工具 / 模型请求均为 0，浏览器错误为 0；等待侧栏 260 ms 动画结束后检查边界、截图，避免把过渡帧当成最终布局。
- 固定 Linux amd64 Worker 镜像 `sha256:10efc8dc911c00bf4019179ae948bfac8222ec41212843079c52ca9c0f347018`，841,061,470 字节；镜像中的六个核心源码/锁文件 SHA256 与当前树逐一相符。隔壁会话的受限 Linux 容器 45 项通过见原生态记录。
- 之前任务彻底删除的 Core 类型检查、专项与构建证据保留，联合发布 CI 再做全量门禁。

本机证据：`/Users/a1-6/.codex/artifacts/tuyan-joint-release-20261020/`。本地浏览器与 Vite 临时进程已关闭，验证保持串行和有界内存。

## 生产状态

独立 Worker 已安装到杭州并健康运行：只读 root、非 root、2 GiB / 1.5 CPU / 96 PID、无宿主端口、internal 私有网络。两套 Gateway 持久接入该网络并通过内部 health 校验；三个 Nginx 位置仅新增 ecosystem 精确路由，`nginx -t` 和 reload 通过。原业务镜像与页面在此阶段仍为 `d8bc9a90`。

目标宿主实际三引擎 smoke 通过：两份输入变化、Semiotic 四种图型、VizNoir 上传网格与标量变化；临时合成输出已清理。配置和原镜像映射备份位于杭州 `/var/backups/ecosystem-joint-20261020-hz` 与香港 `/var/backups/ecosystem-joint-20261020-hk`，仅 root 可读；令牌未进入 Git 或本机证据。

发布前数据库只读指纹：1 个工作区、72 个任务、108 条 job、9 份 workspace result、0 条永久删除操作；任务哈希 `7cd4bbb0edf694d8ff04887d998bc06514f002db82e600c813a8d54b2248d8ba`。

首轮 CI `39367946765` 在 Core 门禁被阻止，未切换业务：1,522 通过、9 失败，原因是两个旧 VM 测试夹具没有注入新增查询依赖 `db`。已修复并增加跨账号删除标记保留 / 分页过滤断言，相关 17 项本地通过，未放宽业务判断或删除测试。

## 最终发布与生产验收

代码提交 `a5cba1d5c2afbf8e59c54d377efe84489d216eaa` 经 [CI 39370164968](https://github.com/yrjmdqmmx/Tuyan/actions/runs/39370164968) 全部通过并发布：

- Core 1,532 / 1,532、Web 1,119 / 1,119、Benchmark 200 / 200；Gateway 194 通过、1 项隔离集成常规跳过，随后的真实 MongoDB 集成 24 / 24 无跳过。类型检查、构建及四个固定业务镜像检查通过。
- 杭州回执 `ci-39370164968-1` 于 `2026-10-20T05:03:49Z` 报告 healthy，业务回滚备份 `/var/backups/hangzhou-ci-39370164968-1`，模型调用 0。Pages 随后成功发布相同代码。
- `tuyansci.cn/version.json` 与 `www.paperbanana.asia/version.json` 均为上述完整 SHA；中国站及旧域名 API `/ready` 均返回 `ok: true`。
- Chrome 真实登录账号：搜索 `桑基图` → Semiotic、`VTK` → VizNoir、`仪表盘` → DataViz；`他山` 显示 1 个功能、3 个工具。选中结果进入指定工作台且保持未执行状态，关闭搜索返回原页面。
- 中国站显式载入合成示例并分别执行三引擎：Semiotic 3.12.1 SVG、VizNoir 0.10.1 PNG、DataViz 0.3.1 HTML 均实际生成。DataViz 页面内输入 `A`，结果从 10 / 10 行变为 5 / 10 行，交互正常。
- 旧域名真实登录账号以英文 `Semiotic` 搜索并完成 SVG 渲染。SVG / PNG / HTML 均通过下载按钮下载，文件签名 / 格式正确；两页浏览器错误日志为空。没有上传用户文件。
- 全部 UI 验收结束后重新读取数据库：1 个工作区、72 个任务、108 条 job、9 份 workspace result、0 条永久删除操作，与发布前逐项相同；任务内容哈希仍为 `7cd4bbb0edf694d8ff04887d998bc06514f002db82e600c813a8d54b2248d8ba`。没有实际删除任何原任务或调用真实模型。
- 隔壁来源工作树仍干净且 HEAD 为 `b8f228e5439182a91c39bfac4e85437fb4cede28`。关闭本次两个临时验收标签页，用户原标签和其他目录未改。

证据包括 `ci-success.log`、`deployment/deployment-receipt.json`、`data-before.log` / `data-final.log`、`production-search-ecosystem.png`、`production-viznoir.png`、`production-dataviz.png`、`production-legacy-semiotic.png`。本轮上线后用桌面 Chrome 验收；没有把这次结果表述为新增 iPhone 真机验收或线上真实任务删除验收。
