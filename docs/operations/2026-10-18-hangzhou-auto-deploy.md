# 杭州自动发布验收 · 2026-10-18

用户选择独立杭州发布分支，保持当前国内生产版本并保留香港、新加坡模型出口；不调用模型，不新增付费计划。

两个仓库均使用 `codex/hangzhou-production` 的代码推送作为自动发布触发。其他开发分支和旧默认分支不部署生产；纯文档修改跳过发布。Tuyan 的基线整合当前 Core 存储/线路修复及已上线 Web 4205139 模型目录取消/刷新修复，避免首次自动发布回退现网功能。

## 流程与凭据边界

- Tuyan：网关、Core、Benchmark 和 Web 测试/类型检查/构建；四类固定 Linux amd64 镜像；Benchmark 离线运行检查、Plot 无网络 PNG/SVG 渲染；通过后发布 Core、两套 Gateway、Plot、关闭执行器的 Benchmark 与国内 Web。
- OpenAcad：镜像内 Python/R/Inkscape 测试、前端单元测试与 Chromium/Firefox/WebKit/手机视口用例；测试通过后发布 API、两个 Worker 和静态 Web，保留 Redis。
- GitHub environment 限定唯一发布分支，只有专用受限 SSH Key 与固定 known_hosts。SSH 强制命令只接受 status/deploy，禁止 shell/转发；宿主接收器不允许 CI 网页包覆盖。
- 接收器验证仓库、运行、事件、分支最新 SHA、包摘要、固定镜像 digest、杭州主机和现网快照；维护检查/排空任务，原子切换网页，健康检查失败恢复原镜像与目录。恢复失败保留维护状态。
- 服务器既有密钥、OSS 与渠道路由保留；CI 只有短期 GitHub 拉取凭据，在 `/run` 临时保存并清理。模型 Key 未复制到 CI。
- OpenAcad 原流程曾因 Actions artifact 存储额度耗尽而失败，镜像和测试本身通过。已改为 job output 传递 digest、同执行任务完成网页测试和发送发布包，不依赖 artifact 存储；未删除其他项目文件或购买额度。
- Tuyan 发布分支已禁止删除/非快进推送。OpenAcad 私有仓库的同类规则 API 被套餐限制拒绝，没有为此升级或公开仓库；环境分支限制与接收器最新 SHA 校验已实际配置。

## 真实自动发布与验收

| 项目 | 自动运行 | 实际部署源码 | 生产入口 |
| --- | --- | --- | --- |
| 图研 | [39107373154](https://github.com/yrjmdqmmx/Tuyan/actions/runs/39107373154) | `6f69297ba9dc3bd79c32231466c6b76ee7f51442` | [tuyansci.cn](https://tuyansci.cn) |
| OpenAcad | [39105877141](https://github.com/yrjmdqmmx/OpenAcad/actions/runs/39105877141) | `64931c2dd40e90090892ab2264aec6a59b098af8` | [openacad.xyz](https://openacad.xyz) |

两次均由发布分支代码推送触发并完成实际生产切换。宿主回执、公开 version.json、当前容器不可变 image ID 相互一致；文档后续提交不改变已部署源码。

- 图研：部署脚本 18、Gateway 152、Core 1450、Benchmark 200、Web 815 项通过；另有真实混合图预检、类型检查、四镜像构建、无网络 Benchmark 与 Plot 渲染检查。Plot 线上仍使用 gVisor，并再次通过 PNG/SVG 真实绘图。
- OpenAcad：前端 467 项、浏览器 238 项通过 / 542 项跳过；原有浏览器限定及需要显式开启真实 API 的用例未冒充通过。镜像内后端 196 项测试通过后缓存复用。生产另执行 PCA、R LM、PNG、PDF、EPS 共 5 项真实任务并清理；数值独立复核，PDF/EPS 使用独立解析器打开，中文显示完整。EPS 半透明置信区间按格式限制栅格化，诊断已记录。
- 双图研 API 入口均健康且返回完整 9 题既有评测证据；响应中的图片主机均为杭州私有 OSS，实际图片读取成功；浏览器滚动检查 12 张杭州证据图片全部加载，无横向溢出。检查是读取既有评测，不启动新的模型评测。
- 发布后 Core 实际选路代码完成 6 个无密钥 GET：TokenDance / 方舟 / 百炼 / Fireworks 杭州直连，OpenRouter 经香港，Anthropic 经新加坡，零传输失败。401/403 只作为网络可达响应，不代表密钥权限、模型可用性或生成质量。
- 杭州全部 10 容器 healthy；Mongo、Redis 的容器 ID 与镜像均未改变；Plot 运行时、容器网络、OSS 配置、渠道路由逐项与发布前相同。三地主机 WireGuard / Squid 配置 SHA256 全部相同。维护标记清除，每日备份 timer active。
- 本轮模型调用 0，模型费用 0。没有新增云付费计划、没有购买 GitHub 套餐。

图研回执：`/opt/tuyan-entry/releases/ci-39107373154-1-6f69297ba9dc/receipt.json`，完成于 `2026-10-18T07:47:22Z`。
OpenAcad 回执：`/opt/openacad/releases/ci-39105877141-1-64931c2dd40e/receipt.json`，完成于 `2026-10-18T07:21:37Z`。

图研实际镜像：

| 服务 | 杭州 image ID |
| --- | --- |
| core | `sha256:dd8587c4caf2fade7c94c04c2abeb98be25373cf03d994f861c7bfaf233bcf1f` |
| gateway | `sha256:070c1b94e3479bed91f1bdacdd4fe4573b8a72fdc575e279f42c3f6b163d461f` |
| cn-gateway | `sha256:070c1b94e3479bed91f1bdacdd4fe4573b8a72fdc575e279f42c3f6b163d461f` |
| benchmark | `sha256:29d673fe691617d981249b4c806e398696e22e6d54339dabaafb266bc92ff44b` |
| plot | `sha256:80ce19697f833c37418b0cad66d77c1aa48893f537144db00b0026929f899544` |

宿主回执同时保留 GHCR 来源 digest；image ID 与 config digest 不混用。

CI 环境修复包括：补齐现网 4205139 的 Web 目录刷新/取消修复；Benchmark 镜像补入 figure-taxonomy 依赖；为完整材料读取测试安装 LibreOffice；Python 绘图改用系统虚拟环境，避免 GitHub hosted Python 依赖的 LD_LIBRARY_PATH 被隔离子进程清理后失效。CI 绘图子进程单独使用测试用户，避免与 runner/pnpm/Node 共用 Linux UID 的进程配额；只授予工作路径穿越权限，生产进程上限和秘密环境清理逻辑不变。实际混合图与 PNG/SVG 预检已在该环境通过。Web 测试的固定 10ms 等待改为实际等待 IndexedDB 初始化完成，避免 CI 较慢时误报材料上传失败。新增离线实际 PNG/SVG 预检，保留现有隔离边界，不添加模型密钥或跳过断言。

## 使用与恢复

日常开发仍在开发分支完成；经复核的代码合入 `codex/hangzhou-production` 才会自动发布。不能把陈旧 Desktop checkout 或旧 main 当作当前线上源。宿主接收器自身的改动需运维安装；业务发行包不能改写宿主执行逻辑。

Tuyan 的旧香港部署、旧 Pages 发布和 SG 出口工作流保持停用，现存 HK/SG 代理由运维单独管理。`tuyansci.cn` / `openacad.xyz` 是杭州正式入口；旧 `www.paperbanana.asia` 仍为原有 Pages 静态站，旧 API 域名仍经香港兼容转发。本次没有更改 DNS。

回退保留杭州数据与现有渠道配置，仅恢复前一杭州应用镜像/网页；不能直接启动冻结的香港旧业务写入。Mongo/Redis 不在本次重建范围。

零模型调用不等于 CI、镜像存储、OSS 和服务器流量永远免费；本轮没有新增收费计划或模型消费。小程序仍暂停，未发布。

## 本次发现并修复的发布问题

1. 杭州直接 GHCR 传输过慢，改为仅供发布使用的受限香港 SSH 通道。镜像在杭州存储，现有模型路由、WG 和 Squid 不变。
2. Docker containerd image ID 采用 manifest digest，不能与 OCI config digest 直接比较。现按配置和所有内容层核验，再使用实际不可变 ID。
3. 初始 OpenAcad 日志管道掩盖 SSH 失败，GitHub 显示成功但未上线；该轮不计成功。已启用 `pipefail`，本地注入上游退出码 7，管道也退出 7。
4. 浏览器套件含按浏览器限定、需显式真实 API 的跳过用例；必须分别报告通过与跳过数，并用独立生产数学/导出 smoke 验证真实 Worker。

## 源码与维护位置

- 图研发布工作树：`/Users/a1-6/.codex/worktrees/tuyan-hangzhou-oss-migration/paperbanana（tuyan）`。
- OpenAcad 发布工作树：`/Users/a1-6/.codex/worktrees/openacad-hangzhou-deploy`。
- 已把部署基础设施与测试诊断的限定补丁同步回图研正在使用的 `tuyan-v400-workflow-20261009` 工作树；保留其 TokenDance deadline clock 等其他会话改动，暂存区内容未动。
- 杭州 SSH 受限入口和镜像导入脚本为 root-only，逐个 SHA256 与发布工作树文件一致；验证输出为 `host-receiver-integrity.json`。
- 此次新增的 registry SSH 私钥只留杭州；CI 部署私钥保存于 GitHub environment。两份本机临时 CI 私钥副本已删除，验证记录为 `private-key-cleanup.json`；未打印或纳入仓库。

## 验证证据

机器可读结果保留在本机 `/Users/a1-6/.codex/visualizations/2026/10/18/hangzhou-auto-deploy`：`tuyan-receipt.json`、`openacad-receipt.json`、`final-health.json`、`runtime-route-probe.jsonl`、`public-after.json`、`live-plot-render.json`、`browser-after.json`、`openacad-live/report.json`。公开报告不包含密钥、用户研究资料或签名 URL。源码中的历史手工发布说明仅用于追溯；后续发布优先使用本次分支工作流。

本机 Python 3.14 的默认 CA 路径未配置；最终公网检查通过 `SSL_CERT_FILE=/etc/ssl/cert.pem` 指定现有系统根证书，未关闭 TLS 验证，未修改全局 Python 配置。
