# PaperBanana — App Store 商店文案

> 本文件供填写 App Store Connect 的「App 信息」与「本地化」字段。
> 中文（zh-Hans，简体中文，主语言）+ 英文（en-US）两版并列。
> 字符上限按 App Store Connect 现行规则：App 名称 ≤30、副标题 ≤30、关键词 ≤100、描述 ≤4000。

---

## 1. App 名称 / App Name（≤30 字符）

| 语言 | 已选定 | 字符数 |
|------|--------|--------|
| 中文 zh-Hans（主名称） | `图研 Tuyan` | 8 |
| 英文 en-US | `Tuyan: AI Paper Figures` | 23 |

> 用户已确定主名称「图研 Tuyan」。英文本地化名可按需调整（也可直接用「图研 Tuyan」或「Tuyan」）。产品品牌 PaperBanana 仍在描述中作产品名引用。

---

## 2. 副标题 / Subtitle（≤30 字符）

| 语言 | 建议值 | 字符数 |
|------|--------|--------|
| 中文 | `多智能体生成出版级论文插图` | 13 |
| 英文 | `Multi-agent academic diagrams` | 30 |

备选：
- 中文：`AI 一键生成方法框架图/流程图` （16）
- 英文：`AI figures for papers & theses` （30）

---

## 3. 描述 / Description

### 中文（zh-Hans）

```
PaperBanana 把你的论文方法描述和图题，变成出版级的学术配图。

不再为了画一张方法框架图在绘图软件里耗一下午——输入方法内容、写好图注、选好图类，PaperBanana 的多智能体流水线就会替你完成「规划 → 渲染 → 评审 → 精修」的全过程，产出可直接放进论文的方法框架图、流程图、系统架构图与数据统计图。

【多智能体协作，像审稿一样打磨】
后端由多个 AI 角色分工协作：规划器先把方法拆成模块与连接关系，图像模型渲染初版，评审模型像审稿人一样检查排版、文字与逻辑并提出修改意见，再迭代重渲染。生成阶段的额外渲染与独立「精修」Tab 不混同：精修可对本人结果图按当前路线能力单独执行。整个流水线在 App 内可视化呈现。

【自带 API Key，模型自由选】
BYOK（Bring Your Own Key）模式：接入百炼、OpenRouter、Gemini、OpenAI、火山方舟（中国区）五个渠道；模型与比例/分辨率能力以动态 registry 为准。iOS 将 Key 保存在本机 Keychain；发起请求时作为短生命周期字段经服务转发，服务端不持久化、记录或回显。

【为科研而生】
· 内置方法框架图、流程图、系统架构、数据统计等学术图类
· 支持上传参考图，贴合你的论文风格
· 五个 Tab：生成、精修、任务记录、教程、设置；生成工作台内含精选模板与参考图库；普通 / 专业双模式，可调候选数量、评审轮数、长宽比、导出格式
· 导出 PNG 或可无损缩放的 SVG，方便后续排版精修
· 原生 iOS 26 液态玻璃设计，iPhone 与 iPad 通用

适合论文作者、研究生、科研人员，以及任何需要把复杂方法讲清楚的人。

PaperBanana —— 让做图不再是论文里最慢的那一步。

官网：https://www.paperbanana.asia/
```

### 英文（en-US）

```
PaperBanana turns your paper's method description and figure caption into publication-ready academic figures.

Stop spending an afternoon in drawing software just to make one method diagram. Describe your method, write the caption, pick a figure type — and PaperBanana's multi-agent pipeline runs the full "plan → render → critique → refine" process for you, producing method-framework diagrams, flowcharts, system architectures, and data charts you can drop straight into your paper.

MULTI-AGENT COLLABORATION, POLISHED LIKE PEER REVIEW
The backend coordinates several AI roles: a planner breaks your method into modules and connections, an image model renders the first draft, and a critic model inspects layout, text, and logic before re-rendering. Extra generation stages are distinct from the separate Refine tab, where you can refine your own result according to the current route's declared capability.

BRING YOUR OWN KEY, CHOOSE ANY MODEL
BYOK mode: connect Bailian, OpenRouter, Gemini, OpenAI, or Volcano Engine Ark (China region). The dynamic registry is authoritative for model, aspect-ratio, and resolution support. iOS persists the key in Keychain; a request uses it as an ephemeral forwarded field that the service does not persist, log, or echo.

BUILT FOR RESEARCH
· Built-in academic figure types: method framework, flowchart, system architecture, data charts
· Upload reference images to match your paper's style
· Five tabs: Generate, Refine, Records, Guide, and Settings; the Generate workspace includes featured templates and the reference library; Simple and Pro modes tune candidate count, critic rounds, aspect ratio, and export format
· Export PNG, or lossless-scalable SVG for later typesetting
· Native iOS 26 Liquid Glass design, universal for iPhone and iPad

For paper authors, graduate students, researchers, and anyone who needs to explain a complex method clearly.

PaperBanana — so figures are no longer the slowest part of writing your paper.

Website: https://www.paperbanana.asia/
```

---

## 4. 关键词 / Keywords（≤100 字符，逗号分隔，无空格更省字符）

### 中文（zh-Hans）

```
论文配图,学术插图,方法框架图,流程图,科研绘图,论文图表,AI绘图,figure,diagram,科研,毕业论文,期刊配图
```
字符数：约 62（中文按字符计；逗号占位）。

### 英文（en-US）

```
academic figure,paper diagram,research,thesis,flowchart,architecture,scientific,AI figure,chart,methodology,plot
```
字符数：约 96。

> 提示：不要在关键词里重复 App 名称里已有的词（如「PaperBanana」），浪费字符。副标题里的词也已被搜索索引，关键词字段补充未覆盖的长尾词即可。

---

## 5. 分类建议 / Categories

| 项 | 建议 | 理由 |
|----|------|------|
| 主分类 Primary | **效率（Productivity）** | App 核心价值是「把做论文配图这件耗时的事自动化、提速」，本质是科研生产力工具；效率类竞争中等、与产品定位契合，且科研/论文写作工具普遍归此类。 |
| 次分类 Secondary | **图形与设计（Graphics & Design）** | 产物是图形（学术配图/图表），用户也会以「绘图/作图工具」心智搜索；次类覆盖图形设计相关搜索流量。 |

备选：若 App Store 审核更看重产物属性，可将主/次对调（主 = 图形与设计，次 = 效率）。推荐先用「效率」为主——科研工具受众在效率类更易触达。

---

## 6. 年龄分级问卷建议答案（目标分级：4+）

App Store Connect「年龄分级」问卷逐项建议（全部选「无 / None」即可得 4+）：

| 问卷项 | 建议答案 |
|--------|----------|
| 卡通或幻想暴力 | 无 |
| 现实暴力 | 无 |
| 性暗示或裸露内容 | 无 |
| 亵渎或低俗幽默 | 无 |
| 恐怖/惊悚主题 | 无 |
| 医疗/治疗信息 | 无 |
| 酒精、烟草或毒品的使用或相关内容 | 无 |
| 模拟赌博 / 真实赌博 | 无 |
| 用户生成内容 | **见说明** ↓ |
| 不限制的网页访问 | 无（App 不含内置浏览器/任意网页加载） |
| 色情或裸露 | 无 |

说明（用户生成内容相关）：
- PaperBanana 让用户输入文本（论文方法描述、图注）并由 AI 生成图像。生成图像主题局限于「学术配图」，且后端图像模型自带内容过滤（见 fixtures 中 `content filter triggered` 错误态）。
- App 内**无社交/UGC 公开分享、无评论区、无用户间内容浏览**，用户只能看到自己生成的内容。因此通常不触发「用户生成内容」导致的分级上调。
- 若 App Store Connect 仍要求就「AI 生成内容」声明：如实勾选「App 包含 AI 生成内容」相关项（Apple 2025 起的新问卷可能含此项），并说明生成内容仅限学术图示、有模型侧过滤、无公开分享。最终目标分级保持 **4+**。

> 不确定点：Apple 问卷条目会随版本调整；提交时以 App Store Connect 实际显示的条目为准，遇到上表未列出的新条目按「无暴力/无成人/无博彩」原则选「无」。

---

## 7. URL

| 字段 | 值 | 说明 |
|------|-----|------|
| 营销 URL（Marketing URL，可选） | `https://www.paperbanana.asia/` | 官网首页 |
| 支持 URL（Support URL，**必填**） | `https://www.paperbanana.asia/` | 用官网首页（用户确定）。App 内设置页另有作者微信二维码作为联系渠道。 |
| 隐私政策 URL（Privacy Policy URL，**必填**） | `https://www.paperbanana.asia/privacy-policy.html` | 已随 web 端部署（`apps/web/public/privacy-policy.html`），网站上线后即可访问。服务条款：`https://www.paperbanana.asia/terms-of-service.html`。 |

---

## ⚠️ 占位符 / 用户必须确认或替换

- [x] **支持 URL** — 用官网首页 `https://www.paperbanana.asia/`。
- [x] **隐私政策 URL** — `https://www.paperbanana.asia/privacy-policy.html`（随 web 部署，待网站上线生效）。
- [x] **App 名称** — 已定「图研 Tuyan」。
- [ ] **分类主/次** — 确认用「效率 + 图形与设计」还是对调。
- [ ] 关键词字符数请在 App Store Connect 里以其计数器为准微调（中文按字符、含逗号）。
