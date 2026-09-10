# 观猹身份登录设计

用户已继续推进此前讨论的登录方案，并完成图研专属客户端申请。应用名称与 Domain 已确认；凭据只存仓库外私有配置，不写入本文。正式获批 scopes 与完整回调可用性需要真实联调验证。

## 用户行为

保留邮箱登录，登录面板增加观猹入口。已绑定身份直接登录原图研账号。首次授权未绑定时选择登录已有图研账号再明确绑定，或验证邮箱创建新账号；新账号无需预设密码。不会按上游邮箱自动合并，也不伪造邮箱。账户页支持显式绑定、解绑；本地邮箱验证码用于无密码用户的解绑和注销确认。解绑前必须已有密码登录方式，避免锁死账号；可使用既有密码重置流程设置密码。

授权从用户点击同步打开独立窗口/标签，原工作台始终保留。被阻止时明确提示允许弹窗重试，不进行会丢失当前输入的整页外跳。回调只通知原页面刷新服务器状态，不通过 URL 或 postMessage 传递 code、token、用户身份。

## 后端与数据

Gateway 使用固定 watcha.cn 授权、交换、userinfo 地址；state、S256 verifier 与浏览器 HttpOnly cookie 绑定，登录/绑定意图绑定发起时账号。事务有 TTL、原子一次性消费和生命周期检查。user_id 校验为安全正整数再转换字符串；email/phone 不作为身份主键。交换按 form 编码，userinfo 使用 Bearer Header，并校验业务状态。不保存长期身份 token，不调用消费接口。

以现有 account 集合保存 watcha providerId/accountId/userId 映射，增加 watcha 范围唯一约束；现有 user 不可变 ID、任务归属、TokenDance 连接保留。新用户在验证码通过之后以事务创建规范化唯一邮箱和绑定。并发冲突明确失败，不留下孤立用户。删除/恢复期间禁止凭据或 session 写入。新会话使用 Better Auth 现有 session 与 cookie 实现，禁用隐式绑定。

验证码为短期单用途、与会话或待注册事务绑定的六位码；仅服务端存 HMAC，有发送频率限制和最多五次尝试。邮箱验证从输入码的 POST 才发生，无链接预取副作用。验证码发送调用现有 DirectMail transport，开发测试使用本地捕获 transport。已有邮箱不自动获得关联账号；验证后仍要求先登录原账号。

## 固定接口契约

相对 `/api/auth`：

- `GET /watcha/status` -> `{available,linked,hasPassword,emailVerified,pending:null|{nickname}}`；禁用时返回 available false，不泄漏凭据。
- `POST /watcha/start`，`{intent:'login'|'link',returnOrigin}` -> `{url}`，只允许可信 Web origin；不接受任意 redirect_uri。
- `GET /oauth2/callback/watcha`；固定注册回调为 `https://api.paperbanana.asia/api/auth/oauth2/callback/watcha`。完成后重定向到可信 origin 的 `/account/watcha-callback.html?watcha=complete|pending|error`。
- `POST /watcha/email-code`，`{purpose:'signup'|'unlink'|'delete',email?}` -> `{ok:true}`。signup 必须有有效待注册身份；其余必须有当前已验证本地邮箱会话，忽略客户端指定目标邮箱。
- `POST /watcha/complete`，`{email,code}` -> `{ok:true}` 并建立新图研会话。
- `POST /watcha/link`，`{}` -> `{ok:true}`；有效待绑定身份和当前已验证图研会话均必需；不能更换发起绑定时的用户。
- `POST /watcha/unlink`，`{code}` -> `{ok:true}`；验证邮箱码后，要求仍有密码方式，原子删除本人的 watcha 绑定。
- `POST /watcha/delete-confirmation`，`{code}` -> `{confirmationToken}`；短期一次性、绑定当前用户与 session。
- 既有 `POST /api/account/delete` 增加可选 `confirmationToken`；保留原 email/password 契约，token 只替代密码再认证，不替代明确删除意图或生命周期检查。

配置为 `WATCHA_OAUTH_ENABLED`（默认 false）、`WATCHA_CLIENT_ID`、`WATCHA_CLIENT_SECRET`、`WATCHA_OAUTH_SCOPES`（read email）。启用必须完整配置及可用邮件投递；secret 不暴露给 Web。客户端不支持时继续邮箱登录。小程序平台发布继续暂缓；新增接口/环境配置在 SYNC 明示。

## 验收

Gateway 协议、state 伪造/过期/重放、无邮箱和业务错误、scope、验证码限流/猜测、并发同身份/同邮箱、换用户、注销竞态、现有邮箱登录回归；真实隔离 Mongo 验证 Better Auth session/cookie 和唯一事务。Web 验证登录入口、首次注册/绑定、拒绝/关闭/弹窗阻止、账户解绑、无密码注销确认及桌面/手机输入保留。测试中禁止真实发邮件或访问生产身份/消费数据。

正式身份授权、生产发布为后续独立门禁；客户端开通不等于实际登录成功。当前既有 5174 服务保留，测试另选空闲端口与一次性 Mongo。
