# PaperBanana 法律文档（隐私政策 / 服务条款）使用说明

本目录包含 PaperBanana iOS 上架所需的中英双语隐私政策、服务条款、App 隐私申报和审核材料，以及可直接发布的 HTML 版本。

## 内部发布闸门（不代表 App Review 状态）

代码和 TestFlight 构建完成后，产品负责人必须亲自检查真实 UI 与实际使用流程。验收覆盖生成、精选/图库、精修、任务记录、设置、法律链接和账号删除；在该人工验收完成前，不提交 App Review。本文档及 `review-notes.md` 只是提交材料，不代表已提交或已进入审核。

> ⚠️ **重要：发布前仍应由具备资质的法律专业人士审阅。** 本仓库内容不构成法律意见；实际法律、运营和审核要求以适用法律及 App Store Connect 当时页面为准。

---

## 一、文件清单

| 文件 | 用途 |
| --- | --- |
| `privacy-policy.md` | 隐私政策（中英双语，Markdown，便于团队评审/改稿） |
| `terms-of-service.md` | 服务条款（中英双语，Markdown） |
| `privacy-policy.html` | 隐私政策，**可直接发布的独立 HTML**（含内联样式、移动端适配、`<meta viewport>`） |
| `terms-of-service.html` | 服务条款，可直接发布的独立 HTML |
| `README.md` | 本说明 |

HTML 文件自带样式、无外部依赖，托管到任意静态站点（或你们现有官网）即可得到一个公开可访问的 URL。

---

## 二、占位符清单（发布前必须替换）

用编辑器全局搜索以下占位符，逐个替换为真实信息。`.md` 与 `.html` **两套文件都要改**（HTML 里占位符包在 `<span class="ph">...</span>` 中，方括号文本一致）。

| 占位符 | 含义 | 出现位置 |
| --- | --- | --- |
| `[运营方名称]` / `[Operator Name]` | 实际运营主体的法律名称（公司或个人） | 两份文档头部 + 联系方式 + 条款正文 |
| `[联系邮箱]` / `[contact@example.com]` | 用户联系/隐私事务邮箱 | 两份文档头部 + 联系方式 |
| `[填写日期 / YYYY-MM-DD]` | 生效日期、最近更新日期 | 两份文档头部各 2 处 |
| `[填写服务器所在地区 / 例如：中国大陆]` | 后端数据库（Sealos / MongoDB）服务器所在地区 | 隐私政策第 5 节 |
| `[如适用，请补充跨境传输的合规依据与说明]` | 若涉及跨境数据传输（第三方平台在境外）的合规说明 | 隐私政策第 5 节 |
| `[填写适用法律 / ...]` | 服务条款适用法律 | 服务条款第 13 节 |
| `[填写管辖法院或仲裁机构]` | 争议解决的管辖法院 / 仲裁机构 | 服务条款第 13 节 |

> 官网 `https://www.paperbanana.asia/` 已按代码中真实值写死，无需替换；如官网域名变更需同步更新。

替换完成后，建议全局再搜索一次 `[` 和 `占位` / `fill in` / `.ph`，确认没有遗漏。

---

## 三、发布 URL

1. 请法务/律师审阅当前政策与条款。
2. 把 `privacy-policy.html` 和 `terms-of-service.html` 托管到一个公开可访问的地址，任选其一：
   - 现有官网 `paperbanana.asia` 下的子路径，例如 `https://www.paperbanana.asia/privacy` 和 `https://www.paperbanana.asia/terms`；
   - GitHub Pages / Cloudflare Pages / Vercel / Netlify 等静态托管；
   - 任意对象存储 + CDN。
3. 在浏览器和手机上各打开一次，确认：可正常访问（HTTP 200）、移动端排版正常、链接可点。
4. 记下两个最终 URL，进入下一步配置。

要求（App Store 会校验）：URL 必须是**公开、稳定、长期可访问**的（不能要登录、不能是临时链接）。

---

## 四、URL 填到哪里

### 1) App Store Connect

- **隐私政策 URL（必填）**：App Store Connect → 你的 App → 「App 信息（App Information）」→ **隐私政策 URL（Privacy Policy URL）**。这是苹果强制要求的字段，不填无法提交审核。
- **服务条款 / EULA（可选但推荐）**：
  - 若不单独提供，App 默认适用 Apple 标准 EULA；
  - 若要用自定义服务条款，在「App 信息」→ **许可协议（License Agreement）** 中设置自定义 EULA，或在 App 描述/隐私政策中附上条款链接。
- 注意：App Store Connect 的「App 隐私（App Privacy）」问卷需与本隐私政策**口径一致**。本 app 的 `PrivacyInfo.xcprivacy` 已声明：不追踪（NSPrivacyTracking=false），收集邮箱、姓名、用户 ID、其他用户内容、照片/视频、客服信息，且均仅用于 App 功能/客服。问卷里请按此勾选，并务必勾选「不用于追踪」。

### 2) App 内（指南页 / 设置页）—— 建议补一个入口

目前 app 内指南页的资源列表里**还没有**隐私政策/服务条款的入口。建议把两个最终 URL 加进去，方便用户随时查看（也利于过审）。位置：

- 文件：`/Users/a1-6/Desktop/paperbanana/apps/ios/PaperBanana/Catalog/GuideContent.swift`
- 数组：`static let resources: [GuideResource]`（约第 126 行），仿照现有 `website` 条目追加两条，例如：

```swift
GuideResource(
  id: "privacy",
  title: "隐私政策",
  subtitle: "查看数据如何被处理",
  systemImage: "hand.raised",
  url: URL(string: "https://www.paperbanana.asia/privacy")!   // 替换为最终 URL
),
GuideResource(
  id: "terms",
  title: "服务条款",
  subtitle: "使用本应用的条款",
  systemImage: "doc.plaintext",
  url: URL(string: "https://www.paperbanana.asia/terms")!     // 替换为最终 URL
),
```

这些资源会渲染在指南页的资源行（`GuideResourceRow`）。设置页（`Features/Settings/SettingsView.swift`）若也想放联系/法律入口，可同样引用这两个 URL。

---

## 五、与代码实际数据流的对照（已据源码核对）

本初稿严格依据 iOS 源码撰写，关键事实点：

- **API Key 仅本机存储不上传**：`Core/Storage/KeychainService.swift` 用 `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`（仅本设备、不随 iCloud 同步）。生成时 Key 经 `JobCreatePayload.apiKeys` 随请求转发给所选第三方平台，运营方不持久化。
- **网关地址**：`Core/AppDefaults.swift` → `https://api.paperbanana.asia`；官网 `https://www.paperbanana.asia`。
- **生成输入**：方法描述、图题、参考图、任务参数发往网关（`GenerationStore.submitJob`）。
- **四家第三方平台**：阿里百炼 / OpenRouter / Gemini / OpenAI（`Catalog/ProviderCatalog.swift`）。
- **账号**：邮箱+密码（Better Auth），session cookie（`httpShouldHandleCookies = true`）。
- **删除账号**：`Features/Settings/DeleteAccountSheet.swift` + `AuthStore.deleteAccount`，重输密码确认，清账号/记录/模板/反馈/参考图 + 本机 Key。
- **无追踪**：`PrivacyInfo.xcprivacy` 中 `NSPrivacyTracking=false`，无广告/分析 SDK。

---

## 六、合规提示（非穷尽）

- 本文为模板，**务必经律师审阅**后再发布，并补全所有占位符。
- App Store「App 隐私」问卷需与隐私政策保持一致，否则可能被拒。
- 若面向欧盟/英国用户，需评估 GDPR 下的法律依据、DPO/代表、数据主体请求流程等。
- 若涉及中国大陆用户与数据出境（第三方平台在境外处理生成输入），需评估《个人信息保护法》下的告知-同意、个人信息出境合规路径。
- 若面向加州用户，关注 CCPA/CPRA 的「不出售/不分享」声明与请求渠道。
- 生效日期、最近更新日期请填真实日期；每次实质性修订都应更新。

---
---

# 附：上架素材使用说明（截图 / 商店文案 / 隐私申报 / 审核备注）

> 本节由「上架素材」环节追加，与上面的法律文档说明并列。
> 涉及文件：`screenshots/`、`app-store-listing.md`、`app-privacy-declaration.md`、`review-notes.md`。

## 七、文件清单（本环节新增）

| 文件 | 用途 |
| --- | --- |
| `screenshots/iphone69-*.png` | **6.9″ iPhone** 截图（1320×2868），iPhone 17 Pro Max / iOS 26.5 模拟器框架缓冲直出，无 Mac 边框 |
| `screenshots/ipad13-*.png` | **13″ iPad** 截图（2064×2752），iPad Pro 13-inch (M5) / iOS 26.5 |
| `app-store-listing.md` | App 名称/副标题/描述/关键词（中英）、分类建议、年龄分级问卷答案、URL |
| `app-privacy-declaration.md` | App Store Connect「App 隐私」问卷逐项照填清单（与 `PrivacyInfo.xcprivacy` 一致） |
| `review-notes.md` | 给 App Review 的备注（含 BYOK demo 账号/key、删除账号路径、后端在线说明） |

## 八、截图清单与上传

按文件名顺序（编号即建议展示顺序）：

| 文件 | 页面 | 尺寸 | 明暗 |
| --- | --- | --- | --- |
| `iphone69-01-generate.png` | 生成页（表单 + 液态玻璃 + 模型配置 + BYOK 密钥框） | 1320×2868 | 浅色 |
| `iphone69-02-pipeline.png` | **生成流水线可视化**（规划→渲染→评审[第2轮]→精修 + 生成演化阶段卡）——产品核心 | 1320×2868 | 浅色 |
| `iphone69-03-records.png` | 任务记录列表（已登录，含已完成/生成中卡片） | 1320×2868 | 浅色 |
| `iphone69-04-templates.png` | 模板库（保存配置 + 两张内置模板） | 1320×2868 | 浅色 |
| `iphone69-05-settings.png` | 设置页（已登录，含「删除账号」入口，体现合规） | 1320×2868 | 浅色 |
| `iphone69-06-guide.png` | 指南页（三步上手 + 多智能体流程讲解） | 1320×2868 | 浅色 |
| `iphone69-07-delete-account.png` | 删除账号 sheet（合规佐证，可作审核附件，不一定上架展示） | 1320×2868 | 浅色 |
| `ipad13-01-generate.png` | iPad 生成页 | 2064×2752 | 浅色 |
| `ipad13-02-pipeline.png` | iPad 生成流水线（横向流程 + 阶段卡 + 任务参数网格） | 2064×2752 | 浅色 |
| `ipad13-03-records.png` | iPad 任务记录列表 | 2064×2752 | 浅色 |
| `ipad13-04-templates.png` | iPad 模板库 | 2064×2752 | 浅色 |
| `ipad13-05-settings.png` | iPad 设置页（含删除账号 + 关于） | 2064×2752 | 浅色 |
| `ipad13-06-guide.png` | iPad 指南页 | 2064×2752 | 浅色 |

上传：App Store Connect →（对应语言本地化）→「App 预览与屏幕快照」→ 选 6.9″ iPhone 与 13″ iPad 两个尺寸分别上传。建议每尺寸传 4–6 张，**第 02 张（流水线）放首位或次位**，它最能体现产品差异化。`iphone69-07-delete-account` 更适合作为审核备注附件。

> 说明：截图用 `xcrun simctl io <udid> screenshot` 直出框架缓冲（非 Mac 窗口截图），尺寸恰好命中 App Store 6.9″/13″ 规格，可直接上传无需裁剪。

## 九、截图状态说明（哪些状态如何造出）

App 含 **DEBUG-only 启动参数**（`#if DEBUG`，发布构建不含）用于造截图状态：
- `-pb-initial-tab <generate|records|guide|templates|settings>`：直达指定 tab。
- `-pb-preview-signed-in 1`：注入假登录态（founder@paperbanana.app），并填充样例任务列表（让记录页有内容、设置页显示删除账号入口）。
- `-pb-open-delete-account 1`：自动弹出删除账号 sheet。
- `-pb-preview-job <running|refining|succeeded|failed>`：把样例任务设为当前任务，让生成页内联渲染流水线可视化（并在 DEBUG 下置顶，便于直接截「生成流水线」核心页）。

> ⚠️ 这些参数与 `-pb-preview-job` 置顶逻辑、样例任务列表注入是为截图新增的 **DEBUG-only** 代码（`State/AppModel.swift`、`Features/Generate/GenerateView.swift`），**已 `#if DEBUG` 包裹，发布构建不含、不影响线上行为**，但本环节修改了源码，请主控在提交时一并纳入 review。

样例数据来源：`Features/JobDetail/JobPreviewFixtures.swift`（既有 mock 任务，走真实 JSON 解码）。流水线/阶段卡里的小棋盘格图是内嵌的占位 PNG（fixture 自带，非真实生成结果）——若希望商店图更"真实"，可在审核附件里另附真实生成结果图。

## 十、占位符汇总（这几个文件里用户必须替换）

- `app-store-listing.md`：支持 URL、隐私政策 URL（部署后）、App 名称二选一、分类主/次确认。
- `app-privacy-declaration.md`：确认问卷无误勾「追踪/广告/分析」；隐私政策线上 URL。
- `review-notes.md`：**`[demo 邮箱]`/`[demo 密码]`、`[demo bailian key]`（必须真实有效有额度）、`[联系邮箱]`** —— demo key 缺失/失效是 BYOK App 最常见被拒原因，提交当天务必复验。
