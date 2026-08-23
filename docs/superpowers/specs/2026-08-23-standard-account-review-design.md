# 图研标准账号系统与 Build 5 复审设计

## 目标

在不迁移现有 Better Auth 用户、会话和删除账号链路的前提下，补齐邮箱验证、重发验证、忘记与重置密码、修改密码和账号安全中心。Build 5 仅声明 iPhone 支持，并复用现有 App Store 1.0 版本、审核详情与 rejected submission。

## 认证边界

- Better Auth 保持 1.6.11，MongoDB 继续作为账号与限流存储。
- 密码长度为 8–128 位；验证和重置令牌有效期均为 1 小时。
- 新注册和未验证登录发送验证邮件。现有会话保持有效，但存量账号下次新登录必须完成验证。
- 重置密码撤销全部旧会话，并在成功后尽力把邮箱标记为已验证；标记失败时密码仍已重置，下次登录仍要求验证。
- 登录后修改密码必须验证当前密码并撤销其他会话。
- 身份接口保持防枚举语义；请求未知邮箱时响应与已知邮箱一致。
- Better Auth 数据库限流负责 IP/路由限制；邮件层额外以 HMAC 邮箱指纹限制 15 分钟和每日发送次数。
- 日志不得包含密码、令牌、完整邮件链接、完整邮箱或密钥，只记录模板、Provider request ID、结果和不可逆指纹。

## 邮件与回调

- 阿里云杭州 DirectMail 使用 `Dm/2015-11-23 SingleSendMail`（`cn-hangzhou / dm.aliyuncs.com`），发件人 `图研 Tuyan <account@mail.paperbanana.asia>`。
- 只发送账号安全邮件，不启用营销、打开或点击追踪。
- 验证与重置邮件均提供中英双语 HTML 和纯文本正文。
- 回调只允许 `https://paperbanana.asia` 或其子域；生产固定页面为：
  - `https://www.paperbanana.asia/account/email-verified.html`
  - `https://www.paperbanana.asia/account/reset-password.html`
- 灰度变量分别控制邮件发送和强制验证。邮件异常时关闭强制验证即可恢复登录，不删除账号或验证记录。

## 客户端状态

Web 和 iOS 共享以下显式状态：未登录、登录中、注册中、等待验证、重发冷却、请求重置、已登录、修改密码、退出和删除。`CurrentUser` 增加 `emailVerified`，错误以稳定错误码和 HTTP 429 的冷却信息映射为中文，不依赖英文字符串。

iOS 设置页只显示账号摘要，所有入口进入唯一的“账号与安全”中心。Web 保留现有登录入口并增加忘记密码、等待验证和重发验证；静态落地页覆盖缺失、无效、过期、已使用、成功等状态。

## 发布与审核边界

- 版本保持 1.0，Build number 升至 5，`TARGETED_DEVICE_FAMILY=1`。
- 真机证据来自 iPhone 17 Pro Max / iOS 27 Developer Beta；iOS 26.5 仅作为模拟器证据明确标注。
- 复审录屏使用一次性账号与独立低额度审核 Key；现有 Notes 中的旧 Key 必须先撤销且不得再次输出。
- 不创建第二个 submission；Build 5 就绪后更新现有 version、review detail 和 submission。
- PaperBananaBench 授权仍在询问中，保持如实披露，不宣称未取得的授权。
