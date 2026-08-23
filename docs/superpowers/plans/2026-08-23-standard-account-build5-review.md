# 图研标准账号系统与 Build 5 实施计划

## 1. Auth Gateway

1. 先增加配置、邮件模板/发送器、限流与日志脱敏测试，确认测试因缺少实现而失败。
2. 增加 DirectMail 最小依赖与可注入发送器；配置强校验 HTTPS 回调、专用 RAM 凭据和灰度开关。
3. 配置 Better Auth 邮箱验证、密码恢复、会话撤销和数据库自定义限流。
4. 覆盖新注册、重复邮箱、令牌生命周期、防枚举、重置/改密、冷却、Provider 故障与脱敏。

## 2. Web

1. 先增加账号恢复 UI 合约测试和落地页状态测试。
2. 扩展现有 `AuthPanel`，加入忘记密码、等待验证和重发冷却。
3. 增加 `/account/email-verified.html` 与 `/account/reset-password.html`，覆盖令牌和表单状态。
4. 更新隐私政策并跑全部 Web 测试与生产构建。

## 3. iOS

1. 先增加 API payload、`emailVerified` 解码、状态机、错误码、冷却和发布配置测试。
2. 扩展 APIClient 与 AuthStore，以枚举驱动认证状态。
3. 把设置页内联表单替换为账号摘要，并新增唯一的账号与安全中心。
4. 增加 VoiceOver 标签与注册、等待验证、忘记密码、改密、退出、删除回归。
5. 将 Build number 改为 5、仅 iPhone，跑模拟器全量测试和 Release archive。

## 4. 共享资料与上线

1. 在 `SYNC.md` 顶部登记共享认证契约，标记 Web/iOS 完成，其他客户端留待办。
2. 准备无密钥的复审 Notes、七项答复、录屏清单与附件清单。
3. 配置 DirectMail/DNS 后依次部署 Web、Gateway 邮件灰度，用 Gmail/iCloud/Outlook 做真实收信验证。
4. 开启强制验证，上传 Build 5，完成 TestFlight 和 iPhone 17 Pro Max 真机验收。
5. 撤销旧审核 Key、创建独立低额度审核 Key，录屏并更新现有 submission 后复审。

## 安全停止条件

- 没有 DirectMail 专用凭据、DNS 权限或真实邮箱时，不宣称邮件上线完成。
- 没有 Build 5 校验、真机录屏、独立审核 Key 时，不修改 App Store 审核状态。
- 删除 iPad 截图、替换审核 Key、发送审核回复与 Resubmit 前再次核对目标对象和现有状态。
