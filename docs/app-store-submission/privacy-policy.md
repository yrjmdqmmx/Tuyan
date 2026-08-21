# 隐私政策 / Privacy Policy

**生效日期 / Effective Date:** `2026-08-21`
**最近更新 / Last Updated:** `2026-08-21`
**运营方 / Operator:** `赵鼎熠 / Zhao Dingyi`
**联系邮箱 / Contact Email:** `yrjmdqmmx@gmail.com`
**官方网站 / Website:** https://www.paperbanana.asia/

---

## 中文版

### 1. 引言

PaperBanana（以下简称"本应用"或"我们"）是一款面向科研人员的 AI 学术论文配图与图表生成工具。您输入论文方法描述与图题，本应用通过后端多智能体流水线为您生成配图。本隐私政策说明我们在您使用本应用时如何收集、使用、存储、共享和保护您的个人信息，以及您对自己信息所享有的权利。

请在使用本应用前仔细阅读本政策。使用本应用即表示您理解并同意本政策所述的信息处理方式。

### 2. 我们收集的信息

我们仅收集为提供和改进本应用功能所必需的信息：

**2.1 账号信息**
- 当您注册或登录时，我们收集您的**电子邮箱地址**、**密码**（以加密/哈希形式存储，我们无法读取明文）以及您可选填写的**显示名称**。
- 我们通过会话 Cookie（session cookie）维持您的登录状态。

**2.2 生成内容与任务记录**
- 当您发起生成任务时，您输入的**方法描述文本**、**图题**、**任务类型与生成参数**，以及您**可选上传的参考图**，会被发送到我们的服务网关进行处理。
- 生成的**任务记录与结果图**会存储在我们的后端，并与您的账号关联，便于您在"任务记录"中查看历史。

**2.3 反馈信息**
- 当您提交反馈时，我们收集您填写的**反馈内容文本**、**反馈类型**，以及您**可选填写的联系方式**。若您在提交反馈时存在进行中的任务，反馈会一并附上该**任务 ID**，以便我们排查问题。

**2.4 设备本地缓存（不额外上传）**
- 为提升体验，本应用会在您的设备本机缓存**最近的任务记录（JSON）**和**结果图（通过系统 URLCache）**。这些是本地缓存，除生成与展示流程本身已涉及的传输外，不会被额外上传。

**2.5 关于您的第三方平台 API Key（重要）**
- 本应用采用 **BYOK（自带密钥，Bring Your Own Key）** 模式。iOS 客户端将 API Key 持久保存在设备 Keychain（不随 iCloud 同步）。
- 当您发起生成任务时，API Key 会作为短生命周期请求字段经我们的香港网关与核心服务转发给您选择的模型平台，仅用于完成该次调用；我们**不持久化、不记录、不回显** API Key，也不将其写入任务数据库或应用日志。
- 请妥善保管您的 API Key，并对其安全及在第三方平台产生的用量与费用负责。

### 3. 我们如何使用信息

我们将所收集的信息用于以下目的：
- 创建与管理您的账号、维持登录状态；
- 接收您的生成请求并将其转发处理，向您返回生成结果；
- 保存您的任务记录，供您查看历史；
- 处理并响应您的反馈，排查与修复问题；
- 保障服务安全、防范滥用、履行法律义务。

我们**不会**将您的个人信息用于广告投放，**不会**出售您的个人信息，**不会**进行跨应用或跨网站的用户追踪。本应用未集成任何第三方广告或分析 SDK。

### 4. 第三方大模型平台的数据传输与责任边界（重要）

为完成图像生成，您的生成输入（方法描述、图题、参考图等）以及您提供的 API Key，会经我们的网关转发给**您所选择**的第三方大模型平台进行处理。这些平台可能包括：

- **阿里云百炼（Bailian / 通义千问、通义万相）** —— 阿里云提供，受其隐私政策约束。
- **OpenRouter** —— 受其隐私政策约束（OpenRouter 会进一步将请求路由给其聚合的上游模型提供方）。
- **Google Gemini** —— Google 提供，受 Google 隐私政策约束。
- **OpenAI** —— OpenAI 提供，受其隐私政策约束。
- **火山方舟（Ark，中国区）** —— 火山引擎提供，受其隐私政策约束；可用模型以动态服务端 registry 与您的账号权益为准。

请注意：
- **您选择哪个平台，您的生成输入就会被传输给哪个平台并由其处理。** 这些第三方对您数据的收集、使用、留存与跨境传输，受其各自的隐私政策与服务条款约束，超出本应用的控制范围。
- 我们建议您在使用前阅读所选平台的隐私政策，并避免在生成输入中提交敏感、保密或受合规约束的内容。
- API/Auth/数据库/OSS 主服务位于香港。按所选渠道和路由策略，OpenAI、Gemini、OpenRouter 以及策略指定的 provider 流量可能经固定新加坡出口；百炼、方舟与 OSS 不因这一说明而被宣称走该出口。

### 5. 数据存储位置与留存期限

- 您的账号信息、任务记录与结果对象存储于香港主服务的数据库与 OSS。
- 我们仅在为实现本政策所述目的所必需的期间内保留您的信息。当您删除账号后，相关数据将按第 7 条所述被永久删除。
- 本地缓存随您卸载本应用或在应用内清理而被清除。
- 当您选择的第三方模型平台或路由使用新加坡出口时，生成输入和短生命周期请求字段可能发生相应的跨境或跨地区传输；第三方对其接收数据的处理受其自身政策约束。

### 6. 您的权利

根据适用的法律（包括但不限于中国《个人信息保护法》、欧盟《通用数据保护条例》GDPR、美国加州《消费者隐私法》CCPA 等），您可能享有以下权利：
- **访问与查阅**：查看我们持有的您的个人信息（如账号信息、任务记录）。
- **更正**：更正不准确的信息。
- **删除**：删除您的账号及关联数据（见第 7 条）。
- **导出/可携带**：本应用支持将生成的结果图导出/保存到您的设备。
- **撤回同意 / 反对处理**：您可随时停止使用本应用。
- **投诉**：向有管辖权的数据保护监管机构投诉。

如需行使上述权利，请通过第 12 条的联系方式与我们联系。我们会在适用法律规定的期限内响应。

### 7. 账号与数据删除

您可随时在本应用内永久删除您的账号：**「设置 → 账号 → 删除账号」**，并按提示**重新输入登录密码进行二次确认**。

删除账号将永久清除：
- 您的账号本身；
- 您的所有任务记录与生成结果；
- 您提交的反馈；
- 您上传的参考图；
- 您已保存的模板；
- 本设备本机保存的 API Key 等本地数据。

**此操作不可恢复。** 删除完成后，服务端将清除您的会话并真删账号，本应用将自动退回未登录状态。该入口呼应 Apple App Store 审核指南 5.1.1(v) 对应用内账号删除的要求。

### 8. 数据安全

我们采取合理的技术与管理措施保护您的信息，包括 HTTPS 加密传输、密码哈希存储、设备 Keychain 持久化、API Key 的短生命周期转发与服务端不持久化/不记录/不回显，以及安全 Cookie 管理等。但没有任何传输或存储方式能保证绝对安全。

### 9. 儿童隐私

本应用面向科研与学术用户，**不面向 13 周岁以下（或您所在司法辖区规定的相应年龄以下）的儿童**。我们不会在知情的情况下收集儿童的个人信息。若我们发现误收了儿童信息，将尽快删除。如您认为我们可能持有儿童信息，请通过第 12 条联系我们。

### 10. Cookie 与会话

本应用使用**会话 Cookie（session cookie）仅用于维持您的登录状态**，不用于广告、画像或跨站追踪。退出登录或删除账号会清除相应会话。

### 11. 政策变更

我们可能不时更新本隐私政策。重大变更时，我们将通过应用内通知或更新本页"生效日期"等合理方式告知您。变更后继续使用本应用即视为您接受更新后的政策。

### 12. 联系我们

如对本隐私政策或您的个人信息处理有任何疑问、请求或投诉，请联系：

- 运营方：`赵鼎熠`
- 邮箱：`yrjmdqmmx@gmail.com`
- 网站：https://www.paperbanana.asia/

---

## English Version

### 1. Introduction

PaperBanana ("the App", "we", "us", or "our") is an AI-powered tool that generates academic figures and diagrams for research papers. You provide a description of your paper's method and a figure caption, and the App generates figures through a backend multi-agent pipeline. This Privacy Policy explains how we collect, use, store, share, and protect your personal information when you use the App, and the rights you have over your information.

Please read this policy carefully before using the App. By using the App, you acknowledge and agree to the information practices described here.

### 2. Information We Collect

We collect only the information necessary to provide and improve the App:

**2.1 Account Information**
- When you register or sign in, we collect your **email address**, **password** (stored in encrypted/hashed form; we cannot read the plaintext), and an optional **display name**.
- We maintain your sign-in state using a session cookie.

**2.2 Generation Content and Job Records**
- When you start a generation job, your **method description text**, **figure caption**, **task type and generation parameters**, and any **reference images you choose to upload** are sent to our service gateway for processing.
- The resulting **job records and output images** are stored on our backend and associated with your account so you can view your history in "Records".

**2.3 Feedback**
- When you submit feedback, we collect your **feedback text**, **feedback category**, and an optional **contact detail**. If a job is in progress when you submit feedback, the relevant **job ID** is included to help us diagnose issues.

**2.4 On-Device Local Cache (not separately uploaded)**
- To improve your experience, the App caches your **recent job records (JSON)** and **output images (via the system URLCache)** locally on your device. These are local caches and are not uploaded beyond the transfers already involved in the generation and display flows.

**2.5 About Your Third-Party Platform API Key (Important)**
- The App uses a **BYOK (Bring Your Own Key)** model. On iOS, API Keys are persisted in the device Keychain (not synced through iCloud).
- When you start a job, the API Key is an **ephemeral** request field forwarded through our Hong Kong gateway and core service to the platform you selected, solely to complete that call. We do **not persist, log, or echo** API Keys, and do not place them in the job database or application logs.
- Please keep your API Key secure. You are responsible for its safety and for any usage and charges it incurs on the third-party platform.

### 3. How We Use Information

We use the information we collect to:
- Create and manage your account and keep you signed in;
- Receive your generation requests, forward them for processing, and return results to you;
- Store your job records so you can view your history;
- Process and respond to your feedback and diagnose and fix issues;
- Maintain service security, prevent abuse, and comply with legal obligations.

We do **not** use your personal information for advertising, do **not** sell your personal information, and do **not** track you across other apps or websites. The App contains no third-party advertising or analytics SDKs.

### 4. Data Transfer to Third-Party Large-Model Platforms and Limits of Responsibility (Important)

To generate figures, your generation inputs (method description, caption, reference images, etc.) and the API Key you provide are forwarded through our gateway to the third-party large-model platform **you select** for processing. These platforms may include:

- **Alibaba Cloud Bailian (Qwen / Tongyi Wanxiang)** — provided by Alibaba Cloud, governed by its privacy policy.
- **OpenRouter** — governed by its privacy policy (OpenRouter further routes requests to its aggregated upstream model providers).
- **Google Gemini** — provided by Google, governed by Google's privacy policy.
- **OpenAI** — provided by OpenAI, governed by its privacy policy.
- **Volcano Engine Ark (China region)** — availability is governed by the dynamic server registry and your account entitlement.

Please note:
- **Whichever platform you select is the platform to which your generation inputs are transmitted and by which they are processed.** Those third parties' collection, use, retention, and cross-border transfer of your data are governed by their own privacy policies and terms, which are beyond the App's control.
- We recommend you read the privacy policy of the platform you select and avoid submitting sensitive, confidential, or regulated content in your generation inputs.
- The primary API, authentication, database, and object-storage service is in Hong Kong. Depending on the selected provider and routing policy, OpenAI, Gemini, OpenRouter, and policy-designated provider traffic may use a fixed Singapore egress.

### 5. Where Data Is Stored and Retention

- Your account information, job records, and output objects are stored by the Hong Kong primary service, database, and object storage.
- We retain your information only as long as necessary to fulfill the purposes described in this policy. When you delete your account, the relevant data is permanently deleted as described in Section 7.
- Local caches are removed when you uninstall the App or clear them in-app.
- Where a selected third-party platform or Singapore egress is used, generation inputs and ephemeral request fields may be transferred across the relevant regions; third-party handling is governed by that provider's policies.

### 6. Your Rights

Subject to applicable law (including but not limited to China's Personal Information Protection Law (PIPL), the EU General Data Protection Regulation (GDPR), and the California Consumer Privacy Act (CCPA)), you may have the right to:
- **Access**: view the personal information we hold about you (e.g., account info, job records).
- **Correct**: correct inaccurate information.
- **Delete**: delete your account and associated data (see Section 7).
- **Export/Portability**: the App lets you export/save generated output images to your device.
- **Withdraw consent / Object**: you may stop using the App at any time.
- **Complain**: lodge a complaint with a competent data protection authority.

To exercise these rights, contact us using the details in Section 12. We will respond within the timeframe required by applicable law.

### 7. Account and Data Deletion

You can permanently delete your account at any time in the App: **Settings → Account → Delete Account**, confirming by **re-entering your sign-in password**.

Deleting your account permanently removes:
- Your account itself;
- All your job records and generated results;
- Feedback you submitted;
- Reference images you uploaded;
- Templates you saved;
- Local data on this device, including stored API Keys.

**This action cannot be undone.** Once complete, the server clears your session and deletes your account, and the App returns to a signed-out state. This entry point corresponds to Apple App Store Review Guideline 5.1.1(v) on in-app account deletion.

### 8. Data Security

We use reasonable technical and organizational measures, including HTTPS, hashed passwords, device-Keychain persistence, ephemeral API-Key forwarding without server persistence/logging/echoing, and secure session cookies. No method of transmission or storage is completely secure.

### 9. Children's Privacy

The App is intended for research and academic users and is **not directed to children under 13 (or the applicable age in your jurisdiction)**. We do not knowingly collect personal information from children. If we learn we have collected such information, we will delete it promptly. If you believe we may hold a child's information, contact us using Section 12.

### 10. Cookies and Sessions

The App uses a **session cookie solely to maintain your sign-in state**. It is not used for advertising, profiling, or cross-site tracking. Signing out or deleting your account clears the relevant session.

### 11. Changes to This Policy

We may update this Privacy Policy from time to time. For material changes, we will notify you by reasonable means, such as an in-app notice or by updating the "Effective Date" on this page. Continued use of the App after changes constitutes acceptance of the updated policy.

### 12. Contact Us

For questions, requests, or complaints about this Privacy Policy or our handling of your personal information, contact:

- Operator: `Zhao Dingyi`
- Email: `yrjmdqmmx@gmail.com`
- Website: https://www.paperbanana.asia/
