# 观猹身份登录核对（2026-09-09 更新）

结论：用户补充的官方认证文档解决了主要协议缺口，可以据此设计和开发图研登录适配。正式开放仍需要图研独立的身份登录应用获批及凭据，并确认回调登记规则、申请表客户端类型的矛盾选项。TokenDance 产品方后台和用户 API Key 授权不能代替这项身份应用申请。

本次仅研究并更新记录，没有修改认证运行代码、展示登录按钮、提交申请或操作用户观猹身份。之前“未获得完整接入协议”的结论已由本记录替代。

## 阅读证据

- [观猹认证接入文档](https://agentuniverse.feishu.cn/wiki/EMYHwT3sIiUYaDkL1ZvcPntGnpb)：通过浏览器读取；全文阅读内附 `watcha_oauth2接入文档.md`（12.19 KB）的预览，覆盖流程、申请、授权参数、scope、回调、交换、userinfo、刷新、introspect、开发客户端与 FAQ。另核对在线正文的关键章节及下列差异。
- [观猹 OAuth2.0 服务开通信息收集表](https://agentuniverse.feishu.cn/share/base/form/shrcnHJ3ATlNg6ofNHssT2zK7Dh)：只读查看全部字段和选项，没有填写或提交。
- 当前图研源码：`apps/auth-gateway/src/auth.js`、`account-indexes.js`、`account-write-guard.js`、`config.js`，以及 `scripts/lib/tokendance-production-auth.mjs`。
- 当前安装的 Better Auth **1.6.11** 实现：`plugins/generic-oauth/routes.mjs`、`oauth2/link-account.mjs`；并参考 [1.6 Generic OAuth 官方文档](https://better-auth.com/docs/1.6/plugins/generic-oauth)。实施应对照已安装版本，不能直接套最新网站新增 API。
- 上轮未能访问的公众号文章仍未读取；新提供的正式接入文档已有主要协议，无需绕过原页面的站点安全限制。

## 已确认的协议

所有以下地址来自观猹文档，不是从他山世界前端推测：

| 操作 | 官方地址 | 适配要点 |
| --- | --- | --- |
| 授权 | `GET https://watcha.cn/oauth/authorize` | Authorization Code；`state`、S256 PKCE 均由图研强制使用 |
| 交换/刷新 | `POST https://watcha.cn/oauth/api/token` | `application/x-www-form-urlencoded`；授权码交换需一致的 redirect_uri，机密客户端携带 client_secret，PKCE 携带 verifier |
| 用户身份 | `GET https://watcha.cn/oauth/api/userinfo` | 使用 Bearer 请求头；解析 `statusCode / data` 包装及业务错误 |
| 令牌检查 | `POST https://watcha.cn/oauth/api/introspect` | 表单编码；解析 `data.active` 及返回的 client_id、scope、expired_at |

`read` 返回 user_id、nickname 和可能存在的 avatar_url；`email`、`phone` 是另行获批并由用户同意的权限。即使授予对应权限，未绑定的邮箱或手机仍可能缺失。响应没有 email_verified / phone_verified，不能将“字段返回”直接当作图研已核验身份。

用户唯一标识为数字 user_id，图研应验证其类型和安全整数范围后转换为字符串用于绑定。邮箱和手机号不充当绑定主键。实际授予 scope 以令牌响应为准；expires_in 示例为 1800 秒，运行时按返回值计算，不写死示例值。

授权拒绝通过 error/state 回调。client_id 可能含 `+ / =`，URL 和表单参数必须正确编码；采用 URLSearchParams 等标准编码，不能字符串拼接。userinfo 文档允许 query token 且其优先级更高，图研只从服务端发送 Bearer Header，避免 token 出现在 URL、历史或日志。

文档提供了公开开发测试客户端；这意味着开发测试有入口，但不是图研正式凭据。本文不复制示例 client_secret，也不把共享测试客户端配置到生产。它们的回调范围、可授予 scope、限流与可用性需在正式联调前确认。

## 文档与表单差异

1. **客户端类型选项矛盾**：题目“是否为公开客户端”下，表单选项为“是，有后端能安全存储 client_secret”与“否，必须使用 PKCE 进行认证”；这与文档中 `is_public=false` 为机密、`true` 为公开相反。图研应按实际含义申请 **机密客户端 is_public=false**，并请官方确认表单选项映射，不能只凭“是/否”提交。
2. 在线“接入准备”的字段名为 **allowed_scopes**，Markdown 附件写 **scope**。前者描述应用获批范围，运行时授权请求仍为 scope；没有公开客户端管理 API，应用开通通过表单及运营处理。
3. Domain 被称为“URI Schema”，示例却是带 scheme、host 和 port 的 origin。文档只说明 redirect_uri 与 domain 匹配，没有精确定义路径、末尾斜杠、子域、多回调或匹配算法。正式注册前应与官方核对，不套用 TokenDance 的 app_url 精确匹配规则。
4. 在线 token 请求例子在 form Content-Type 下用 JSON 外形展示字段；附件给出实际表单编码。图研按声明的 Content-Type 与附件采用 form，不发送 JSON。
5. 尚未给出授权码有效期/重放细则、RefreshToken 轮换与寿命、refresh/introspect 是否另需客户端认证、撤销接口、取消绑定/封禁通知和跨环境支持。没有公开 OIDC discovery、ID Token 或 JWKS 契约；按已公开 OAuth2+userinfo 接入，不凭空要求或假定 OIDC 能力。

## 与图研现有认证架构的差距

图研 Auth Gateway 已使用 Better Auth + Mongo，图研账户拥有不可变 ID，Core 的 TokenDance Key 绑定该 ID。身份登录和消费授权继续分别处理，保留邮箱登录。注册来源不是渠道 Key，也不能把观猹 access_token 当成 TokenDance API Key。

需要补齐三部分：

1. **后端认证适配**：Gateway 负责创建 state/verifier、绑定浏览器和登录/绑定意图、一次性交换及读取可信 userinfo，签发既有图研会话。回调只返回允许的工作台路径，原任务上下文保留。令牌不交给 Web 或小程序，不沿用 TokenDance 的 code 交换 action。
2. **无邮箱用户的首次接入**：本仓库 `ensureAccountIndexes` 要求非空且唯一的规范化邮箱；已安装的 Generic OAuth 插件在 email 缺失时直接返回 `email_is_missing`。因此不是加几项 provider 配置即可完成。建议首次无绑定的观猹身份进入短期服务端待完成状态，提示登录已有图研账号，或补充并验证邮箱创建图研账号。已有绑定的回访用户按绑定查找图研身份，不要求每次重新补邮箱；也不生成假邮箱来绕过索引和验证。
3. **显式绑定与生命周期**：以 `(watcha, String(user_id))` 唯一绑定图研 user ID；现有邮箱相同时先登录原账号并确认绑定，不自动合并。Better Auth 1.6.11 的确存在按邮箱自动关联的分支，接入时必须显式禁用隐式关联，并单独处理已登录用户绑定。冲突、并发绑定、注销期间写入、最后一种可用登录方式的解绑均复用现有生命周期边界并补测试。邮箱验证状态不能由观猹未声明的字段推导。

本地预览当前通过固定桥接调用正式邮箱认证服务；允许转发的操作不包含观猹登录、绑定或 OAuth 回调。后续需要正式 Gateway 的对应能力及受约束的本地接入方式。只加本地按钮无法获得正式图研会话，不能通过任意重定向或客户端身份注入解决。

## 申请建议与待确认

| 字段 | 图研建议 |
| --- | --- |
| 称呼/联系方式 | 由产品负责人提供用于接收申请结果的资料 |
| 应用名称 | 图研 Tuyan |
| 客户端类型 | 机密客户端，实际配置 `is_public=false`；同时使用 S256 PKCE |
| 额外权限 | 申请 email；保留默认 read。当前功能无需 phone |
| Domain | 建议由 Gateway 承接回调，候选 `https://api.paperbanana.asia`；需官方确认匹配与多环境规则 |
| 邀请人 | 已对接官方人员的实际名称；不猜测填写 |

若使用 Better Auth 通用插件，默认路径候选为 `https://api.paperbanana.asia/api/auth/oauth2/callback/watcha`；若为首次邮箱确认使用定制 Gateway 回调，路径需随最终实现固定后登记。以上均为申请/实现候选，当前服务器尚未开放这些路由。图研产品首页仍为 `https://www.paperbanana.asia/`，TokenDance 的 app_url 与 X-App-URL 不变。

后续所需材料已缩小为：图研身份应用的申请结果、正式 client_id/client_secret 的私有配置位置、获批的 domain/allowed_scopes，以及客户端类型选项和回调规则确认。无需在聊天或仓库提供明文密钥。

实施顺序建议：固定申请配置 → Gateway 协议适配与待完成注册/显式绑定 → Web 入口、账户绑定/解绑及任务返回 → 小程序可用授权方式 → 桩测试/真实身份联调 → 单独走生产部署与小程序发布。文档研究、运行代码完成、真实联调和发布是分别验收的阶段。
