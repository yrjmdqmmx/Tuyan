# 2026-10-15 ICP 新域名接入

用户授权范围：图研与 OpenAcad 的新域名、网页入口接入杭州；后端与数据暂留香港；保留 paperbanana.asia。没有提交、推送、同步上游、部署 4.0 脏工作树、调用付费模型或改动小程序。公安备案未代为提交。

> 本目录是 2026-10-15 的部署取证快照，包含当日基于旧版镜像的增量配置，不能直接作为 4.0 发布配置执行。2026-10-16 新站已启用独立观猹客户端并完成原账号登录验证；专用密钥覆盖文件、启用状态及旧站保留方式见 [观猹配置记录](../../docs/operations/2026-10-16-tuyan-watcha-client.md)。下文“待开通”和 Compose 的 false 均为 10 月 15 日历史状态。

## 当日入口

| 网站 | 主入口 | www | 备案号 |
| --- | --- | --- | --- |
| 图研 | https://tuyansci.cn | 301 至主入口 | 浙ICP备2026071869号-3 |
| OpenAcad | https://openacad.xyz | 301 至主入口 | 浙ICP备2026071869号-4 |

四条 A 记录均为 116.62.146.226，TTL 600，启用。HTTP 跳转对应 HTTPS 主域名。旧 paperbanana.asia 仍 301 到 www.paperbanana.asia，旧 www 返回 200，GitHub Pages CNAME 与 API DNS 未改。

杭州只提供静态 Web 与 HTTPS 反向代理；账号、业务数据库、任务执行、OSS、OpenAcad API/队列/两台 worker 均留香港。新图研与旧图研共用账号和业务数据，但不同域名的登录 Cookie、浏览器本地草稿及访客身份不会自动共享。

## 可追溯基线

- 图研独立工作树：`/Users/a1-6/.codex/worktrees/icp-domains-20261015/paperbanana（tuyan）`，HEAD `5e6989f59416e44d9f22fd26703d3830ed861ea7`，与既有 Pages 正式 Web 相同；仅域名路由、邮件回调、备案页脚与观猹备用提示有本地增量。
- OpenAcad 独立工作树：`/Users/a1-6/.codex/worktrees/openacad-icp-20261015/OpenAcad`，HEAD `3d772df87508db902c95ac859705a5227bdc7049`；产品源码仅 HomePage 增加备案链接。测试重新生成了 `tests/artifacts/control-audit.json` 与 `template-cases.json`，均保留在该隔离目录，未作为生产 Web 发布。
- 旧图研 Gateway 镜像 `sha256:97803f67dca036490f4571c485c8fe5714839710feddfd024bf5fdc98a29f0fb`，revision `24ed37b45c25d35581d92dfb412f412ebd5a3db0`，未替换、未重启。
- 旧 Core 镜像 `sha256:1974972db375807304fdc96872053d9487726137f6a3a9c9e46d1435135b6a20`；revision `f3bc73ed9a039e1cabf467c3cb12d338b5729377`，未替换、未重启。
- 新 Gateway 基于旧 Gateway 固定镜像，仅覆盖 `config.js` 的精确官方邮箱回调域名校验；新镜像 `sha256:366aeb0e26eb08da1622e101a8edcf86db5b6be516538b2260946aa210b127f7`。

## 部署位置

杭州 `116.62.146.226`：

- `/opt/tuyan-entry/current` → `/opt/tuyan-entry/releases/20261015-5e6989f-icp-r3`。
- `/opt/openacad/current` → `/opt/openacad/releases/20261015-3d772df-icp`；Web 根为其 `web`。
- 独立 nginx：`/etc/nginx/sites-available/tuyan-cn`、`/etc/nginx/sites-available/openacad`，分别链接至 sites-enabled。对应本目录 `*-hangzhou.conf`。
- 证书 `/etc/letsencrypt/live/tuyansci.cn` 与 `/etc/letsencrypt/live/openacad.xyz` 均覆盖 apex/www，到期 2027-01-13。既有续期 timer 和 `reload-nginx-after-renewal.sh` 已核对；未新购证书。
- 原站点启用列表备份：`/opt/tuyan-entry/operations/20261015/sites-enabled-before`，只用于核对，不整体覆盖恢复。

香港 `47.243.4.247`：

- 新独立 Compose 项目 `tuyan-cn-gateway`，目录 `/opt/paperbanana/ops-releases/icp-domains-20261015`；仅监听 `127.0.0.1:13006`，复用原 backend/edge 网络。
- 新 nginx `/etc/nginx/sites-available/tuyan-cn-origin` 仅允许杭州来源 IP；对应 `tuyan-hongkong.conf`。本机来源实测 403，杭州来源 200。
- 原 `/opt/paperbanana/secrets/gateway.env` 未写入或复制到本地；Compose 用明确的新域名覆盖项。新 Cookie 为 Secure、host-only、SameSite=Lax。
- 原 `/opt/openacad` 后端、旧 nginx 及旧 `/opt/paperbanana` Compose 不变。

杭州至香港使用 HTTPS，SNI 精确为 `api.paperbanana.asia`，Host 分别为新图研 / OpenAcad；启用证书校验、CA 信任链与深度 3。这样不依赖 DNS 已迁走的 OpenAcad 在香港继续续证。杭州覆盖客户端转发 IP，香港新网关只信任杭州来源。未更改原 API vhost。

OSS 原单条 CORS 规则仅新增 `https://tuyansci.cn`；保留两个旧 origin、GET/PUT/HEAD、content-type/content-length、既有 exposed headers 与 600 秒缓存。没有通配来源，没有改变桶私有权限。

## 验证与边界

- `evidence/live-entry.json`：2026-10-15 15:49 CST 的 DNS、16 条 HTTP 检查、四个 TLS 主机校验、旧/新 Watcha availability、OSS 新旧来源允许 / 无关来源 403。
- `evidence/static-integrity.json` 与对应 SHA-256 清单：新图研 78/78、OpenAcad 397/397 部署文件和本地构建逐项一致。打包排除 macOS AppleDouble 元数据；最终 release 为 r3。
- 图研本地 Web 588/588、Gateway 148/148、OpenAcad 467/467 测试通过；最终观猹备用提示修正后，20 条针对性 Web 测试及重新构建通过。以上不是模型效果或完整生产业务验收。
- 68 字节合成 PNG：新域名 prepare=0、OSS PUT=200 且 allow-origin 精确匹配、finalize=0、abort=0；Secure host-only 访客 Cookie 确认。只处理本次测试对象，无生成或模型调用。
- Chrome 验证图研首页、备案链接、邮箱表单、观猹待开通提示与旧站链接；OpenAcad 首页、热图模板详情、示例编辑器。截图在 evidence。
- 未进行真实账号邮箱登录、注册、邮件送达、找回密码实测；未运行真实模型生成、OpenAcad 全模板导出或完整统计验收。

## 观猹待办

Provider 实际拒绝新域名授权：`invalid redirect uri`。用户已确认自行向观猹对接方申请，不能把它记为通过。

新增回调：`https://tuyansci.cn/api/auth/oauth2/callback/watcha`。

保留旧回调：`https://api.paperbanana.asia/api/auth/oauth2/callback/watcha`。

当前新 Compose `WATCHA_OAUTH_ENABLED=false`，旧 Gateway 保持 true；新站显示邮箱登录及原站观猹链接。收到对接方开通确认后，先核对配置，再只重建新 Compose 网关，验证真实授权、回调、原账号归属及旧站登录。不要改旧回调或隐式绑定账号。TokenDance 渠道连接仍使用原 www.paperbanana.asia 回调，本轮未迁移。

## 回滚（仅记录，未执行）

1. 仅新图研 Web 异常时，可将 `/opt/tuyan-entry/current` 原子切回保留的上个 release；r2 与 r3 内容相同，r3 仅去除打包元数据。不要将 4.0 工作树打包覆盖生产。
2. 新域名整体需暂停时，使用本目录 bootstrap 配置保留 ACME、返回 503；先 `nginx -t` 再 reload。旧 paperbanana.asia 无需任何 DNS / nginx / 容器改动。
3. 只有新入口不再使用后，才可在上述新项目目录停止 `tuyan-cn-gateway`，禁用 `tuyan-cn-origin`。严禁停止原 `paperbanana-hk` 或执行全局 compose down / 网络清理。
4. OpenAcad 回退香港是另一次入口变更，需先确认备案接入方案与 DNS。变更前的 apex A 为 47.243.4.247 且处于暂停；不要盲目恢复并启用而绕过杭州。后端未迁移，无需数据库回滚。
5. 若撤销新 CORS，仅删除本次新增 origin，保留旧规则；当前两站访问有效时不需要撤销。

部署为本地受控增量，尚未提交或推送。后续正式发布必须显式纳入这些域名变更，不能用旧 CI 构建覆盖新入口配置。
