# 他山科研生态服务适配

独立 CPU 渲染服务，复用图研 Gateway 登录校验；不接入绘图执行链，不读取任务历史或模型密钥。项目来源与许可见 `apps/ecosystem-worker/README.md`。该目录是待发布配置，不能据文件存在宣称线上已启用。

## 镜像与运行条件

从仓库根目录构建 `docker build --platform linux/amd64 -t tuyan-ecosystem-worker:<source-sha> apps/ecosystem-worker`。发布只采用已核验的不可变 image ID / registry digest，保存源码 SHA、镜像 ID、包锁文件与真实渲染回执。镜像须在目标 Linux CPU 上完成三引擎 smoke；health 仅确认依赖和配置存在。

`compose.yaml` 无宿主公开端口，使用专属 internal bridge；只将两套 Gateway 接入，Worker 不加入数据库、Core、模型出口或 OpenAcad 的网络。每次一条渲染、75 秒超时、2 GiB 容器内存、1.5 CPU、96 PID、256 MiB 临时文件。新实例会增加磁盘与峰值资源占用，先核对主机容量和并发业务。标准非特权容器运行固定模板；不把它宣称为可运行任意用户代码的沙箱，不默认修改既有 gVisor 配置。

## 授权后安装顺序

1. 获取生产修改授权。重新核实实时双域名 SHA、两套 Gateway 镜像和配置摘要，持有 `/run/lock/paperbanana-hk-production.lock`；若其他发布或活动任务正在进行，等待安全窗口。将待改 Compose、Nginx、env 与现网镜像映射备份到本次发布目录，保留 root-only 权限。
2. 创建仅供此服务使用的随机 32 字节以上 token，写入 `/opt/paperbanana/secrets/ecosystem-worker.env` 的 `ECOSYSTEM_WORKER_TOKEN`（0600）。不得把生产 token 放进 Git、终端输出、Web 构建或回执。部署 env 只包含这一个 token。在新服务目录用 `ECOSYSTEM_WORKER_IMAGE` 指定审过的 digest 后启动本项目；禁止全局 compose down/prune。
3. 按 `gateway-network.patch.yaml` 的增量将专用网络持久合并到两个已安装的 Gateway Compose 文件，保留各自原有 backend/edge 静态地址和全部其他项。不能仅临时 `docker network connect`，否则下次自动发布重建会断连。当前发布器读取宿主已安装文件，不会自动安装此补丁。
4. 向共享 Gateway env 增加 `ECOSYSTEM_WORKER_URL=http://ecosystem-worker:8092` 与同一个 `ECOSYSTEM_WORKER_TOKEN`。国内 override env 若已有同名键必须同步。URL 仅内部服务 origin，不带路径、用户信息、query 或 hash。两个变量均省略时原业务正常，新接口返回明确 503；只配置一个时启动校验失败。
5. 按杭州既有不可变镜像发布机制更新两套 Gateway 和 Web。生产分支会触发自动发布，须先在集成树保留期间其他会话的新提交。当前自动流水线不构建/滚动本 Worker，它作为独立已审服务发布；后续依赖升级同样走此流程，不使用浮动 tag。
6. 安装本仓库 `deploy/hangzhou/nginx/` 中 **ecosystem 精确路由差异**，国内、杭州旧域名 relay 与香港 edge 均允许该路径 9m 请求、110 秒读取、关闭落盘请求/响应缓冲；Gateway 严格执行 8 MiB。不要用整份历史配置覆盖现网。各主机 `nginx -t` 后 reload。
7. 用合成数据从两域名实际操作三个工具，验证登录/账号边界、字段切换、上传、HTML iframe 交互、下载、旧任务草稿保留。确认没有调用付费模型、没有业务数据库变更；只检查响应状态/大小和合成结果，日志不记录研究数据。授权发布后才记录“线上可用”。

## 回滚

先撤回新 Web/Gateway 镜像到本次发布保存的版本及 env / Compose / Nginx 差异；按既有发布器维护锁与健康检查流程操作。若只是渲染不可用，可同时移除两套 Gateway 的两个 ECOSYSTEM 变量并重建，原绘图继续工作，新工具明确不可用。确认 Gateway 已不连接后，只停 `tuyan-ecosystem` 的 worker 并移除专属网络。无需迁移或恢复业务数据库；不删除其他项目镜像/网络，不删除待分析用户材料。

## 本地浏览器验收

安装 Web/Gateway 依赖和 Worker 锁定依赖后，在仓库根运行：

```sh
node apps/auth-gateway/scripts/ecosystem-local-qa.mjs
```

打开 `http://127.0.0.1:5178/tests/fixtures/ecosystem.html`。它使用真实 TaskWorkspace / WorkspacePages、真实 Gateway router 和三个真实引擎；账号为明确标记的本地合成账号，仅监听 loopback。此 fixture 不进入生产构建，不证明生产登录验收。退出进程会终止本地 Worker；数据和 token 不保存。
