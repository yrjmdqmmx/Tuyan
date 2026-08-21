# App Review 审核备注（App Review Notes）

> 复制到 App Store Connect →「App 审核信息」→「备注（Notes）」字段。
> 中英双语，建议英文为主（审核员多为英文），中文附后。
> ⚠️ 提交前请把所有 `[方括号占位]` 替换为真实可用的值——尤其是 **demo API key**，缺它审核员无法跑通生成，是 BYOK App 最常见被拒原因。

## 内部发布闸门（不代表已提交 App Review）

完成代码与 TestFlight 构建后，必须由产品负责人亲自检查真实 UI 和实际使用流程（含生成、精选/图库、精修、记录、设置、法律链接和删除账号）。该人工验收完成前，不提交 App Review；本文件中的审核说明和占位符仅供未来提交时使用，并不表示当前已提交或已进入审核。

---

## English (primary)

**What PaperBanana does**
PaperBanana generates publication-ready academic figures (method-framework diagrams, flowcharts, system architectures, data charts) for research papers. The user describes their method and figure caption; a multi-agent backend pipeline (plan → render → critique → rerender/finalize) produces the figure. Independent Refine is a separate tab for refining the user's own result. Native iOS 26 design, universal for iPhone and iPad.

**IMPORTANT — This is a BYOK (Bring Your Own Key) app. A working API key is required to test generation.**
The app does NOT ship with a built-in model key. To run an actual generation, enter a key from a supported provider (Bailian / OpenRouter / Gemini / OpenAI / Volcano Engine Ark China). The dynamic registry is authoritative for selectable models. The submitter must replace the explicit placeholders below with a review account and Bailian demo key before submission.

**Demo account**
- Email: `[demo 邮箱 — 请填真实可登录的测试账号]`
- Password: `[demo 密码]`

**Demo API key (REQUIRED to test generation)**
- Provider: Bailian (阿里云百炼) — recommended, lowest-friction
- API Key: `[demo bailian key — 必须是当前真实有效、有余额/额度的 key，否则生成会失败]`
- How to use: Open the **Generate** tab → select provider **阿里云百炼 (Bailian)** → paste this key into the **API 密钥** field → fill the method content and caption (or tap a Quick-Start example) → submit. The pipeline visualization (plan/render/critique/rerender or finalize) appears inline, and result images appear when finished. Use the separate **Refine** tab only to refine your own result.

> If the demo key has expired by review time, generation will return an error through no fault of the app. Please contact us (below) for a fresh key rather than rejecting on that basis.

**Login is optional**
Generation works without an account; signing in only saves task history to the user's account. The demo account is provided so you can also review the signed-in experience (records, account deletion).

**Account deletion (App Store Guideline 5.1.1(v))**
In-app account deletion is implemented. Path: **Settings tab → Account section (while signed in) → "删除账号" (Delete Account) → re-enter password → "永久删除" (Permanently Delete)**. This permanently removes the account, all task records, saved templates, and locally stored API keys. (See screenshot `iphone69-07-delete-account.png`.)

**Privacy / data**
- The iOS key is persisted in device Keychain. At request time it is an ephemeral field forwarded through our Hong Kong gateway/core service to the selected provider; it is not persisted, logged, or echoed. Selected-provider traffic may use fixed Singapore egress under routing policy.
- No third-party ads or analytics SDKs. No tracking. See the App Privacy section and bundled `PrivacyInfo.xcprivacy`.

**Backend availability**
The app requires our online gateway (`https://api.paperbanana.asia`) for auth and job orchestration. The backend will remain online throughout the review period.

**Contact**
`[联系邮箱 / 联系方式占位]`

---

## 中文（附）

**这是什么**
PaperBanana 为科研论文生成出版级学术配图（方法框架图/流程图/系统架构/数据统计图）。用户描述方法与图注，后端多智能体流水线（规划→渲染→评审→重渲染/定稿）产出配图。独立「精修」是针对本人结果图的单独 Tab。原生 iOS 26 设计，iPhone/iPad 通用。

**重要——BYOK 模式，测试生成需要可用的 API Key**
App 不内置模型密钥。要跑通真实生成，必须填入受支持平台（百炼/OpenRouter/Gemini/OpenAI/火山方舟中国区）的 API Key；可选模型以动态 registry 为准。请提交者将上方 placeholder 替换为真实审核账号与百炼 demo key。审核员：生成页 → 选「阿里云百炼」→ 在生成设置输入 key → 填方法内容与图注（或套用精选模板）→ 提交，即可看到流水线与结果图。

**登录可选**：不登录也能生成；登录仅用于把任务记录存到账号。demo 账号可用于走查登录态（记录页、删除账号）。

**账号删除路径（满足 5.1.1(v)）**：设置页 →（登录态下）账号区 →「删除账号」→ 重新输入密码 →「永久删除」。会永久删除账号、所有任务记录、保存的模板与本机 API Key。

**隐私**：API Key 持久保存在本机 Keychain；调用时作为短生命周期字段经香港网关/核心转发至所选平台，服务端不持久化、记录或回显。无第三方广告/分析 SDK，无追踪。

**后端**：依赖在线网关 `https://api.paperbanana.asia`，审核期间保持在线。

---

## ⚠️ 提交前必须替换的占位符

- [ ] **`[demo 邮箱]` / `[demo 密码]`** —— 创建一个真实可登录的测试账号并填入。
- [ ] **`[demo bailian key]`** —— 必须是当前有效、有额度的真实 key。**这是 BYOK App 过审的关键**：审核员用它跑生成，过期/无额度会直接导致被拒（审核员会认为功能不可用）。提交前当天再验证一次该 key 能成功生成。
- [ ] **`[联系邮箱 / 联系方式]`** —— 填一个审核期间能及时回复的邮箱，便于审核员在 key 失效时联系换新。
- [ ] 确认审核期间后端网关 `api.paperbanana.asia` 在线。
- [ ] （建议）在 ASC 的「附件」里上传 1-2 张生成结果示例图，降低审核员对"生成是否真能用"的疑虑。
