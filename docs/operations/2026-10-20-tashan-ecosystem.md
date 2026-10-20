# 他山科研生态：本地实现与验收

用户确认三个工具都在图研内实际使用，包含服务器适配。入口名「他山科研生态」，位于「排行榜」下方；统一工具列表，不区分插件/在线工具。生产基线 `d8bc9a90732069233ed81ac9209de62fbfa9a9d1`，实现位于隔离分支 `codex/tashan-research-ecosystem`，未覆盖其他会话的移动端工作。

## 实际能力

| 工具 | 固定版本 / 许可 | 本版输入与输出 |
| --- | --- | --- |
| Semiotic | 3.12.1 / Apache-2.0 | CSV/JSON → 散点、折线、柱状、桑基图；SVG 预览缩放及下载 |
| VizNoir | 0.10.1 / MIT，VTK 9.7.1 | 单文件 ASCII VTK/VTU/VTP、文本/二进制 STL → 字段、视角、色标控制的 PNG；首次渲染后识别字段供选择 |
| DataViz MCP | 0.3.1 / BSD-3-Clause，Panel 1.9.4 / Bokeh 3.9.2 | 表格 → 离线 HTML；真实上游验证器与执行器执行固定模板，支持字段、筛选、图型、直方图区间控制 |

项目为原作者开源项目，他山收录、图研适配。依赖保留安装包中的许可文本；Python 哈希锁与 npm 锁固定依赖。Semiotic GitHub 文档可能描述更新版本，本版以已安装 npm 3.12.1 为准。上游完整任意代码/编辑/发布能力不对外开放。

## 数据和服务契约

`POST /api/ecosystem/render` 由现有 Gateway 校验登录会话、可信 Origin、`X-Workspace-Account`、维护状态，单账号同时一条请求，每个网关实例每分钟最多六次。正文 8 MiB，输入文件 5 MiB，表格 5,000 行/40 列；返回 `{tool,format,base64,filename,engineVersion,summary}`。公开 health 同样需要登录和账号头。内部 Worker 只接收专用 bearer，不接收用户 cookie 或模型密钥。

结果只在当前页面保留，切换工具/账号或离开页面即清除并取消未完成请求。服务端临时目录在结束/失败/取消后清理。HTML 使用 opaque-origin `sandbox="allow-scripts"` iframe 和禁止网络的 CSP；固定交互脚本需要 inline/eval，只存在该隔离框架内。导出的 HTML 包含上传的数据，方便用户自行留存/分享。VizNoir 无标量时生成的 Elevation 在界面明确标为几何高度，不是实测物理量。

服务器适配见 [部署说明](../../deploy/hangzhou/ecosystem/README.md)：独立无公网端口的 internal 网络、非 root/只读容器、2 GiB/1.5 CPU/96 PID、75 秒子进程期限与完整进程组清理。两套 Gateway 持久加入专属网络；香港 edge 和杭州 relay 的精确上传路由需要同步。此记录不代表已部署。

## 已完成验证

- Web 首轮全量 1,063 / 1,063；最终字段选择和账号清理改动后，相关 7 / 7 通过。Gateway 最终全量 190 通过、1 项既有隔离 Mongo 集成跳过。新增 Web 7 项、Gateway 7 项和环境变量校验涵盖表格、导航/草稿、切换取消、身份/来源、并发、频率、维护、超时和错误脱敏。
- Worker 最终原生及 Linux amd64 容器均 45 / 45，Ruff 与 Python 编译通过。真实依赖覆盖全部三引擎、每个引擎改变输入后输出变化、四种 Semiotic 图型、上传 VTK 改变标量后 PNG 改变；没有用假渲染器替代。
- Web 生产构建通过。保留既有大 bundle 警告；三种重引擎没有加入浏览器 bundle。
- 本地合成账号浏览器经真实 Gateway→Worker 完成 SVG/PNG/HTML；上传双字段 VTK 后识别 pressure / temperature，选择 temperature 得到相应色标和完整网格。DataViz 在 iframe 内筛选得到 5/10 行并切换直方图，分组折线分别绘制，HTML 下载成功，返回任务后原草稿完整。390px 移动侧栏顺序和列表通过，页面无横向溢出。
- DataViz 730px / 300px 布局经 CUA 核验无横向溢出，实际 390px 图研 iframe 筛选成功且浏览器错误日志为空。三份 Nginx 配置经隔离 Nginx 容器语法检查通过，Compose 配置检查通过。
- 最终 Linux amd64 镜像的测试层仅增加固定测试依赖，在 2 GiB / 1.5 CPU / 96 PID / 非 root / 只读 root / 256 MiB tmpfs / 无网络下 45 项全部通过（32.92 秒）。先前真实 HTTP smoke 也完成三引擎、四种图型、上传 VTK、变化对照与鉴权检查。生产运行层镜像 ID 为 `sha256:10efc8dc911c00bf4019179ae948bfac8222ec41212843079c52ca9c0f347018`，大小 841,061,470 字节。此为本机 Linux 容器验证，目标生产宿主验收仍待发布时执行。

本机证据位于 `/Users/a1-6/.codex/visualizations/2026/10/20/tuyan-tashan-ecosystem/`：`overview-desktop.png`、`overview-mobile.png`、`viznoir-upload-temperature.png`、`dataviz-final.png`、`linux-tests-final.log`、`gateway-tests-final.log` 与 `web-build-final.log`。预览保持在 loopback 验收页，使用合成账号和合成数据。

## 边界

本轮零付费模型调用，未改生产服务器、业务数据库、正式账号或小程序。macOS 初次加载 VTK 动态库曾超过 75 秒，热缓存真实请求通过；这不等同于 Linux 验证。生产部署和真实账号双域名验收待单独授权后进行，不能把本地 fixture 账号当成正式登录证据。

## 独立审查修复

规范审查无核心范围偏差，要求的 SYNC 与本记录已补齐。质量审查提出的问题全部修复并以真实输入复验，最终 APPROVED，无剩余 P0–P2：网关拒绝非有限数并保留原始 JSON 字节供 Worker 拒绝重复键；legacy VTK 读取全部标量，并在私有归一化文件仅保留实际选中的字段，避免跨 association 的同名数组错选；DataViz 的极大常量/窄范围直方图采用可表示的分箱边界，分组用固定 ID 匹配，折线按组分开而不制造跨组连线。VizNoir 显式使用 zoom=1.0，上传网格经浏览器确认完整显示。

镜像构建时本机到默认 Debian CDN 的 TLS 连接失败，使用构建参数 `DEBIAN_MIRROR=https://mirrors.tuna.tsinghua.edu.cn` 完成；TLS 校验和 Debian 包签名验证均保留，Dockerfile 默认仍为官方 Debian HTTPS。运行不需要外网。

最终生产只读复核：两个域名仍为基线 d8bc9a9，本分支没有推送生产分支或修改服务器配置。
