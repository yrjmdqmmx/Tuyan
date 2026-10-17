# 新域名观猹登录配置记录

2026-10-16，用户提供观猹新增客户端并要求配置，同时要求填写 TokenDance 双网站申请。范围仅为现网新站登录配置；不发布开发中的 4.0，不改 TokenDance 现网归因、分红或连接记录，不调用模型。

## 实机配置

新旧站共享香港业务服务，但已有两套独立登录网关。杭州继续作为新域名网页入口。

| 项目 | 新站 | 旧站 |
| --- | --- | --- |
| 网关 | `tuyan-cn-gateway-auth-gateway-1` | `paperbanana-hk-auth-gateway-1` |
| AUTH_BASE_URL | `https://tuyansci.cn` | `https://api.paperbanana.asia` |
| Watcha Client ID（公开标识） | `wbDJ9ja4ZkcX3r3a` | `1JdXlOujI2PPJKjM` |
| OAuth 回调 | `https://tuyansci.cn/api/auth/oauth2/callback/watcha` | `https://api.paperbanana.asia/api/auth/oauth2/callback/watcha` |
| scopes | `read email` | 原值 `read email` |

新站 Compose：`/opt/paperbanana/ops-releases/icp-domains-20261015/compose.yaml`。
原凭据文件 `/opt/paperbanana/secrets/gateway.env` 原样保留，在新站 `env_file` 顺序中追加 `/opt/paperbanana/secrets/tuyan-cn-watcha.env`，文件权限 0600、root 所有，仅含新站 Watcha ID 与 Secret。新站 `WATCHA_OAUTH_ENABLED` 从 false 改为 true。密钥通过 SSH 标准输入传入，未写入仓库或前端。

使用 `docker compose -p tuyan-cn-gateway ... up -d --no-deps --no-build --pull never --force-recreate auth-gateway` 仅重新创建新网关，原镜像 `sha256:366aeb0e26eb08da1622e101a8edcf86db5b6be516538b2260946aa210b127f7` 保持不变。

## 验证与边界

- 新站容器 healthy；公网 `/ready` 为 200，认证及后端依赖 ready。
- 新旧站 `/api/auth/watcha/status` 均为 200、`available=true`。
- 旧网关及 Core 的容器 ID、启动时间、镜像保持不变；原 `gateway.env` SHA-256 前后一致。
- Chrome 新站“使用观猹登录”打开观猹授权页，展示应用“图研 Tuyan”和当前账号；新 Client ID、新回调及 PKCE S256 均进入请求。未出现之前的回调拒绝。
- 后续用户明确授权点击“继续”；旧授权状态超过有效期，先从新站重新发起流程，再确认同一应用与范围。浏览器成功回跳 `tuyansci.cn` 并登录原图研账号，账户页显示“已绑定观猹”，原有 TokenDance 显示“已连接”。未创建新的图研账号或重新授权 TokenDance。
- 只记录配置及浏览器证据；未调用付费或免费模型。

## TokenDance 表单

现有归因 App URL 保持 `https://www.paperbanana.asia/`，现网 Core 的回调基址仍为同地址。用户指出简介过长后，简介已改为“图研 Tuyan 是帮助科研用户将论文内容转化为学术图示的 AI 绘图工作台。”双域名与回调追加要求另存本地对接说明，不再放入简介；没有代发。实际回调携带 `tokendance_callback=1`、动态 state 和授权结果参数。观猹身份登录 OAuth 凭据不写入此表。

用户最初选择“先保留草稿”，随后明确告知已于 10 月 16 日亲自提交一份表单；不能继续记为“尚未提交”。之后按新域名重新填写了一份，选填的 Icon URL 留空。平台是否已经处理新域名及回调，仍须以当前平台状态核实。由于表单没有独立备注/回调栏，后续提交前需通过适合的对接渠道另行附上追加要求，避免被当作重复申请。现网 TokenDance 尚未实现按新旧网站选择回调，不能将填表或运营口头支持视为该功能已接通。

## 备份与恢复

服务器备份目录：`/opt/paperbanana/ops-releases/icp-domains-20261015/watcha-config-backup-20261016T045318Z`，含旧 Compose、变更前容器元数据与旧 env 指纹、变更后脱敏验证。回退仅恢复该 Compose 并用原镜像重新创建新站网关；不改旧网关或 Core，不删除新凭据文件。实际恢复操作需明确授权。

本地浏览器证据：`/Users/a1-6/.codex/visualizations/2026/10/16/tuyan-dual-domain-auth/`。截图不含 Client Secret。
