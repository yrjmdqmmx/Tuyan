# App 隐私申报清单（App Store Connect「App 隐私」问卷照填指南）

> 适用 App：PaperBanana（com.paperbanana.paperbanana）
> 本清单与工程内 `PaperBanana/PrivacyInfo.xcprivacy` 的声明严格一致，请逐项照填。
> 顶层结论先行：**不用于追踪（No Tracking）**，**无第三方广告/分析 SDK**；BYOK API Key 在 iOS 持久保存在 Keychain，并在用户发起请求时作为短生命周期字段经香港网关/核心转发，服务端不持久化、记录或回显。

---

## 0. 总览开关

| 问卷顶层项 | 答案 |
|------------|------|
| Do you or your third-party partners collect data from this app?（是否收集数据） | **是（Yes）** —— 见下方数据类型。 |
| Is the data used to track users?（是否用于追踪） | **否（No）** —— 与 `NSPrivacyTracking = false`、`NSPrivacyTrackingDomains` 为空一致。无跨 App / 跨网站追踪，无广告标识符（IDFA）。 |

> 说明「收集」：数据离开设备并传输到开发者或第三方服务时，按 ASC 实际问卷定义如实申报。生成请求中的短生命周期 BYOK Key 不持久化、记录或回显；其功能性请求处理与模型/流程参数一并由第 7 类 Other Data Types 覆盖，不用于追踪。

---

## 1. 逐类数据申报

下表对应 App Store Connect「数据类型」勾选页。每类需回答四问：是否收集、用途、是否关联身份（Linked）、是否用于追踪（Tracking）。

| # | 数据类型（ASC 名称） | 是否收集 | 用途（Purpose） | 关联用户身份 | 用于追踪 | 对应 xcprivacy 键 |
|---|----------------------|----------|------------------|--------------|----------|--------------------|
| 1 | **联系信息 → 电子邮件地址**（Email Address） | 是 | App 功能（账号注册/登录，邮箱即账号标识） | 是（Linked） | 否 | `…EmailAddress` |
| 2 | **联系信息 → 姓名**（Name） | 是 | App 功能（账号资料中的显示名/昵称） | 是（Linked） | 否 | `…Name` |
| 3 | **标识符 → 用户 ID**（User ID） | 是 | App 功能（后端账号唯一标识，关联任务记录） | 是（Linked） | 否 | `…UserID` |
| 4 | **用户内容 → 其他用户内容**（Other User Content） | 是 | App 功能（论文方法描述、目标图注、生成参数、任务记录、生成结果图——这些是生成图所必需的输入与产物） | 是（Linked） | 否 | `…OtherUserContent` |
| 5 | **用户内容 → 照片或视频**（Photos or Videos） | 是 | App 功能（用户可选上传的**参考图**，用于贴合论文风格生成） | 是（Linked） | 否 | `…PhotosorVideos` |
| 6 | **用户内容 → 客户支持**（Customer Support） | 是 | App 功能 + **客户支持**（应用内反馈：问题/建议正文、可选联系方式） | 是（Linked） | 否 | `…CustomerSupport` |
| 7 | **其他数据 → 其他数据类型**（Other Data Types） | 是 | App 功能（生成所需配置/诊断元数据，以及用户发起调用时短生命周期转发的 BYOK Key；Key 不持久化、记录或回显。**不含设备指纹/广告类**） | 是（Linked） | 否 | `…OtherDataTypes` |

> 所有类型：**Tracking = 否**；**用途仅 App Functionality**（第 6 类额外含 Customer Support）。无任一类型勾选「第三方广告」「开发者广告」「分析」「产品个性化」。

---

## 2. 明确不收集 / 不涉及的项（问卷里保持不勾选）

- **API Key**：iOS 将用户自带的 Bailian / OpenRouter / Gemini / OpenAI / Ark 密钥持久保存在本机 Keychain；发起请求时其作为短生命周期字段经香港网关/核心转发给所选平台。服务端不持久化、记录或回显；该请求处理在上表 Other Data Types 的 App 功能范围内申报。
- **位置（Location）**：不收集。
- **联系人（Contacts）**、**健康与健身**、**财务信息**、**浏览/搜索历史**、**敏感信息**：均不收集。
- **设备标识符 / 广告标识符（IDFA）**：不使用，无广告 SDK。
- **诊断数据（崩溃/性能日志，第三方分析）**：**无第三方分析或崩溃 SDK**。App 不集成 Firebase/Crashlytics/友盟/AppsFlyer 等。任务运行时的阶段日志属于第 7 类「其他数据」的功能性元数据，随任务记录存于用户账号，不作分析用途。

---

## 3. `PrivacyInfo.xcprivacy`（隐私清单文件）一致性

工程已内置 `PrivacyInfo.xcprivacy`，与上表一一对应：

- `NSPrivacyTracking` = **false**
- `NSPrivacyTrackingDomains` = **空**
- `NSPrivacyCollectedDataTypes` = 上表 7 类，全部 `Linked = true`、`Tracking = false`、用途 `AppFunctionality`（CustomerSupport 类额外含 `CustomerSupport`）
- `NSPrivacyAccessedAPITypes` = `UserDefaults`，理由码 `CA92.1`（仅本 App 内读写自身偏好，合规理由）

> 提交前请确认 ASC 问卷的勾选结果与该清单文件不冲突——两者不一致会触发审核问询。

---

## 4. 第三方大模型平台的数据传输如何在问卷里体现

这是 BYOK App 的关键点，建议在 ASC 不强制、但**审核备注里务必说明**（见 `review-notes.md`）：

- 用户输入的方法描述、图注、参考图及短生命周期 BYOK 字段，会经香港网关/核心转发到用户选择的平台（阿里云百炼 / OpenRouter / Google Gemini / OpenAI / 火山方舟中国区）以完成生成；按渠道与路由策略，部分流量可能经固定新加坡出口。
- 在隐私问卷层面，这些内容已计入第 4 类「其他用户内容」与第 5 类「照片或视频（参考图）」的"收集 + App 功能"。我们不把它们用于追踪或广告。
- 各大模型平台对其接收数据的处理，受**该平台自身的隐私政策**约束；这一点在隐私政策正文（同目录 `privacy-policy.md`）里向用户披露。问卷中无需为"第三方平台"单独再建数据类型——它们承接的是同一批"用户内容"。

---

## ⚠️ 占位符 / 需用户确认

- [ ] 确认 ASC 问卷里**没有**误勾「用于追踪」或任何「广告 / 分析」用途。
- [ ] 若后续接入了任何第三方分析/崩溃 SDK，必须回来更新本清单与 `PrivacyInfo.xcprivacy`（当前结论以"无"为前提）。
- [ ] 隐私政策线上 URL（部署 `privacy-policy.html` 后）填入 ASC「隐私政策」字段。
- [ ] 反馈中"可选联系方式"如允许用户填邮箱/微信，已涵盖在第 6 类，无需新增类型。
