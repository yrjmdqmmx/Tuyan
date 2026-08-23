# PaperBanana App Store 法律与发布材料说明

本目录是 PaperBanana iOS 1.0 的中英双语法律、App Privacy、商店文案和审核说明的规范来源。它描述当前实现，不表示已经向 App Review 提交。

## 内部发布闸门（不代表 App Review 状态）

代码和 TestFlight 构建完成后，产品负责人必须亲自检查真实 UI 与实际使用流程：生成、精选模板与图库、独立精修、任务记录、指南、设置、法律链接和账号删除。在该人工验收完成前，**不提交 App Review**。`review-notes.md` 是待填的审核材料，绝不意味着已提交、正在审核或已获批准。

> 发布前仍应由具备资质的法律专业人士审阅。本仓库内容不构成法律意见；实际法律、运营和 App Store Connect 要求以当时的适用要求为准。

## 文件清单

| 文件 | 用途 |
| --- | --- |
| `privacy-policy.md` / `.html` | 中英双语隐私政策及可发布 HTML |
| `terms-of-service.md` / `.html` | 中英双语服务条款及可发布 HTML |
| `app-privacy-declaration.md` | App Store Connect「App 隐私」问卷的逐项来源，与 `PrivacyInfo.xcprivacy` 对齐 |
| `app-store-listing.md` | 中英商店文案、分类和截图说明 |
| `review-notes.md` | 审核备注模板；真实 demo 账号和 BYOK Key 只能由提交者在提交时填写 |
| `screenshots/` | Build 5 使用 iPhone 6.9-inch 素材；目录内 iPad 图片仅保留为历史 QA 证据，不上传 ASC |

公开链接的规范来源是 `apps/web/public/privacy-policy.html` 和 `apps/web/public/terms-of-service.html`；发布时必须使用稳定、无需登录的 HTTPS URL。当前 App 使用：

- `https://www.paperbanana.asia/privacy-policy.html`
- `https://www.paperbanana.asia/terms-of-service.html`

## App 内法律入口

用户无需等待 App Store 页面即可查看法律资料：

- **指南页**已有「隐私政策」和「服务条款」资源入口，会在 Safari 打开公开链接。
- **设置页**的「法律与数据」面板已有「隐私政策」和「服务条款」，并提供数据处理说明、网站、GitHub 和联系作者二维码。

App Store Connect 的 Privacy Policy URL 必须指向上面的公开隐私政策。若使用自定义服务条款，也应在相应 App Store Connect 页面配置同一份公开条款。

## 当前数据处理与 BYOK 事实

- API、认证、数据库和对象存储主服务位于**香港**。
- 按 provider 与路由策略，OpenAI、Gemini、OpenRouter 等 provider 流量可能经固定的**新加坡**出口；火山引擎 **Ark/方舟** 为中国区服务。
- Provider、模型、角色和能力来自运行时的**动态 registry**；当前五个 provider 为 Alibaba Cloud Bailian、OpenRouter、Google Gemini、OpenAI 和 Volcano Engine Ark。registry 是唯一权威，未知能力如实呈现并安全禁用。
- iOS BYOK 会持久化在设备 **Keychain**。用户发起生成时，Key 仅作为**短生命周期**请求字段，经香港网关/核心服务临时转发到所选 provider/platform；服务端**不持久化、不记录、不回显**该 Key。按 provider 和路由策略，相关流量可能使用新加坡固定出口。
- 生成输入、上传的参考图、任务记录和账户功能按隐私政策处理；支持删除账户。应用没有广告 SDK、分析 SDK 或跨 App tracking，`PrivacyInfo.xcprivacy` 声明 `NSPrivacyTracking=false`。

不要把「Keychain 持久化」表述为 Key 从不经过我们的服务器，也不要把动态 registry 写成固定模型或固定数量的 provider。

## App 隐私与账号删除

`PrivacyInfo.xcprivacy` 与 `app-privacy-declaration.md` 必须保持一致：不跟踪；收集内容只用于 App 功能、账户和客户支持，不用于广告或跨 App tracking。账号删除入口在 Settings：用户需重输密码确认，删除服务端账户相关数据，并清除本机会话和 BYOK Key。提交者应在提交前再次核对 App Privacy 问卷、线上政策 URL 和实际构建。

## 五个 Tab 与生成/精修边界

App 有**五个 Tab**：Generate、Refine、Records、Guide、Settings。

- 精选模板和图库是 Generate 工作区里的入口，不是额外 Tab。
- 生成流水线是 `plan → render → critique → rerender/finalize`（中文：规划 → 渲染 → 评审 → 重渲染/定稿）。最后一步是重新生成或完成定稿，不能称为 pipeline 的 refine/精修。
- **独立 Refine** 是单独的 Refine Tab：用户选取已有图片后再执行精修，与生成流水线是不同功能。

截图、商店文案和审核备注应使用这套术语，避免将 pipeline 的末阶段误写成「精修」。

## 截图与 TestFlight 验收

可上传的截图应体现真实构建中的 Generate（含精选模板/图库）、Refine、Records、Guide、Settings，以及可选的账号删除 sheet。流水线截图应标为 `plan → render → critique → rerender/finalize` / 「规划 → 渲染 → 评审 → 重渲染/定稿」；独立 Refine 应另列。

DEBUG 截图辅助仅用于造样例状态，不能替代真实 TestFlight 验收，也不能进入发布构建。产品负责人完成 TestFlight 的真实 UI 与实际使用检查并明确验收前，保持「不提交 App Review」状态。

## 提交前清单

1. 法律专业人士复核公开政策与条款，且线上 URL 可访问。
2. 逐项核对 `PrivacyInfo.xcprivacy`、`app-privacy-declaration.md`、线上法律页和实际数据流。
3. 由提交者在 `review-notes.md` 填入有效、最小权限的 Bailian demo 占位信息；不要把真实凭据提交到仓库。
4. 重新截取真实构建截图并核对五个 Tab、精选模板/图库和独立 Refine 的描述。
5. 完成 TestFlight 真实 UI/使用验收后，再由用户决定是否提交 App Review；本仓库和本次变更不执行 App Store Connect 操作。
