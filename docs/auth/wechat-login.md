# 网页微信扫码登录（本地接入，默认关闭）

更新：2026-10-31。用户尚未申请微信开放平台账号或网站应用。本轮仅本地实现和模拟验证，不代表平台审核通过、真实扫码通过或已发布。保留短信、邮箱密码及观猹登录；短信可用时仍是默认方式。

## 待申请事项

1. 在 https://open.weixin.qq.com 注册企业账号，主体沿用已核实的营业执照。现有项目主体为“宁波义星互联网零售有限公司”，正式填写前须与最新企业资料核对。
2. 按当期平台要求办理开发者资质认证；准备企业证照、管理员身份/联系方式、平台要求的认证公函等。敏感材料只在官方申请页填写，不发到聊天或代码库。
3. 在管理中心创建 **网站应用**“图研”，使用正常运营并备案的 https://tuyansci.cn ，应用说明可用“面向科研工作者的科研图示创作与任务管理工具”。品牌名称及证明材料以平台当前审核要求为准，不声称“图研”已注册商标。
4. 网站应用授权回调域必须与待启用网关的 `AUTH_BASE_URL` 主机一致。启用前复核生产配置，拟使用 `tuyansci.cn`；不要直接照抄旧 API 域名，也不要把完整路径填写进只接受域名的表单。程序回调为 `https://<已审核回调域>/api/auth/oauth2/callback/wechat`。
5. 审核通过后，AppID、AppSecret 仅放服务端环境变量/密钥管理。AppSecret 不进前端、仓库、工单或聊天。

浏览器当前对微信开放平台和其开发文档触发站点安全阻止，未绕过策略、未代提交注册/认证、未付款。申请表单的当前字段、费用和审核时间仍需在用户能够打开的官方页面核实。

费用：腾讯云旧版官方操作资料展示中国大陆开发者认证审核费 300 元，可暂按此预留预算；不能将旧资料作为当前报价，收费周期、年审及可能的重审费用以实际微信申请页为准。未购买第三方登录服务；本轮没有产生短信或模型调用费用。

参考：
- [Auth.js 官方 WeChat Provider](https://authjs.dev/reference/core/providers/wechat) 及其 [源代码](https://github.com/nextauthjs/next-auth/blob/main/packages/core/src/providers/wechat.ts)：WebsiteApp 的 `qrconnect` / `snsapi_login` 与 token、userinfo 协议。
- [腾讯云旧版微搭操作文档](https://main.qcloudimg.com/raw/document/product/pdf/1301_57323_cn.pdf)：旧申请界面的 300 元审核费，非当前价格保证。

## 账号行为

- 已关联微信：扫码后登录原账号，不另建任务空间。
- 未关联微信：确认“创建新账号”才注册；也可选择使用原账号登录，然后在账户设置“绑定微信”。
- 绑定使用当前不可变 user ID，保留任务、草稿、模型配置。微信已属于其他账号则拒绝，不合并/迁移/覆盖。
- 映射键为 `providerId=wechat` 与 `<网站AppID>:<OpenID>`。UnionID 仅保留为元数据，不自动串联小程序、手机号、邮箱或观猹身份。
- 微信专属账号不需要虚构可投递邮箱。内部保留不可投递的 `@wechat.tuyan.invalid` 唯一标识，界面隐藏，不发送验证/重置邮件；拒绝用户注册该保留后缀。此类账号的换邮箱流程暂不开放，用户可先绑定手机号作为其他登录方式。
- 微信专属账号删除：重新扫码验证当前微信，再确认原有注销操作；凭证 5 分钟、单次使用、绑定当前会话。已有邮箱账号沿用邮箱确认。
- 此期仅网页扫码。微信内嵌浏览器 H5 静默/网页授权、移动 App SDK、小程序登录是独立范围，不能直接复用网站应用凭据。

## 网关配置与端点

```dotenv
WECHAT_OAUTH_ENABLED=false
WECHAT_WEB_APP_ID=
WECHAT_WEB_APP_SECRET=
```

未配置时按钮隐藏，其他登录方式可用。启用缺失/无效凭据直接配置失败。`AUTH_BASE_URL` 固定官方回调 origin，`FRONTEND_ORIGINS` 显式允许原始站点。

- `POST /api/auth/wechat/start`：`intent=login|link|delete`、与请求 Origin 相同的 `returnOrigin`；登录态操作必须提供 `X-Workspace-Account`，与实际会话匹配。
- `GET /api/auth/wechat/launch?ticket=...`：固定回调域的一次性 60 秒桥接票据；建立弹窗浏览器 HttpOnly cookie，再去微信。
- `GET /api/auth/oauth2/callback/wechat`：一次性 state + 弹窗 cookie、10 分钟有效；服务端换取身份，返回原站点静态通知页。此处不签发原站点会话。
- `GET /api/auth/wechat/status`：仅原始浏览器可读取其 pending；返回 available、linked、pending，不返回 OpenID、UnionID、access token 或 AppSecret。
- `POST /api/auth/wechat/complete`：原始浏览器 cookie 赎回；新身份须显式 `createAccount=true`。绑定/注销还绑定原 user、session 和账号生命周期。
- `POST /api/auth/wechat/cancel`：取消当前浏览器的临时流程，不删除账号或数据。

静态 `/account/wechat-callback.html` 只发同源完成通知，原页面仍须请求后端验证。双站共享单一回调域时，原始 cookie 与弹窗 cookie 分离，回到发起站点签发会话；不得把会话 token 放 URL。生产 cookie 为 Secure、HttpOnly、SameSite=Lax、`__Host-` 前缀。

服务端固定微信 API 地址，禁止重定向，10 秒超时、64 KiB 响应上限、不重试授权码兑换、不存 provider access/refresh token 或头像；日志脱敏 code/state/ticket/OpenID/UnionID。用户、绑定及临时授权变更采用 Mongo 事务和唯一索引，含注销生命周期保护；临时集合 TTL 到期清理。启用时必须使用 Mongo replica set，不改写已有任务或草稿集合。

## 验证和上线界限

- Node 单元测试覆盖配置默认关闭、官方地址/权限固定、响应边界及敏感信息脱敏。
- `bash apps/auth-gateway/tests/integration/run-wechat.sh` 启动专属临时 Mongo replica set；全部微信响应为注入模拟，退出仅清理本脚本容器。覆盖首次确认注册、并发赎回单次性、原账号绑定数据保留、冲突、UnionID 不合并、错浏览器、独立弹窗/发起端 cookie、会话撤销、过期、失败、注销确认和生命周期保护。
- Web 测试覆盖短信默认/邮箱观猹保留、首次注册确认、绑定入口、弹窗来源与地址校验、服务端确认后才刷新账号。
- 上述 cookie 分离验证不等同于两个真实域名、真实微信账号及浏览器扫码验收。申请通过并配置后，仍需单独授权生产发布和真实扫码验收；当前不发布、不收费短信、不调用真实模型。

本轮验证结果：网关 210 项通过、1 项既有跳过；Web 账号及存储/注销相关 38 项通过，生产构建通过。微信专用 Mongo 集成 5 组通过，另完成短信和观猹模拟回归。桌面及 390×844 浏览器模拟视口已检查表单、两个外部登录入口和首次注册确认，不能视为真实手机/微信扫码验收。
