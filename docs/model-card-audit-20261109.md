# 模型卡审计验收 · 2026-11-09 R14


## R14：TokenDance 空目录与结构化在列状态（当前验收）

按 `.audit-input/r14/CODEX_TASK_R14.md` 完成。仅工作树修改，无 Git 写入命令、真实/付费模型请求、生产或服务器配置变更；未读取密钥或私密目录，未访问 `../Tuyan-wt-baseline`。本节覆盖此前空目录夹具的显示计数；旧轮次保留作历史记录。

| 读取结果 | `catalogPresence.status` / cause | 卡片及调用行为 |
| --- | --- | --- |
| `data: []` | `unverified` / `empty` | 保留模型和渠道，置灰，提示“当前目录暂时无法确认该模型，已暂停调用”；不认定缺席 |
| 超时或网络失败 | `unverified` / `timeout`、`network` 等 | 同上；缓存和静态历史的 absent 不冒充本次核验，已保存选择保持 |
| 成功、非空、完整有效目录中缺少精确 ID | `absent` | 显示“当前目录未列出该模型”，从当前可选卡片中隐藏；wire 身份和用户配置保留，TokenDance 渠道仍可见 |

`all_invalid` 同样不是缺席证据，按 `unverified / all_invalid` 处理。部分坏行时只确认解析成功的在列记录；缺少的 ID 暂不认定 absent，不生成 `missing_live`。协议改变继续隔离，不能推断为下线。独立生命周期证据不变：TokenDance 的 `mimo-v2.5` / `mimo-v2.5-pro` 仍按 2026-10-21 到期处理，因此失败场景保留 **72 张**非到期卡，原始响应仍有 **74** 个身份。

Core 给每个 TokenDance 模型返回 `{status, cause?, checkedAt, sourceUrl}`；`checkedAt` 是当前保留快照的检查时间，无快照时为 null，失败不能因时间戳存在而视为已核实。Gateway 原样转发该结构。Web 缺席判定仅依赖结构化 absent、`missing_live` 或健康目录中的渠道/型号缺失，已删除对中文 `disabledReason` 的匹配；小程序保留该字段并据此过滤/暂停，所有选择和替代确认仍检查禁用状态。fal/Runware/Novita 原有已确认缺席也由 Core 补出结构字段，避免移除文案匹配后漏掉这些条目。

### R14 计数：同一公开快照、两侧各自完整对象与卡片代码

计数快照为操作方在 **2026-11-09 约 19:43 UTC+8** 无认证获取的 [TokenDance 公共目录](https://tokendance.space/gateway/v1/models)，共 **119** 条；本轮未联网重抓。仓库 fixture 只保留任务允许的五个字段，来源/时间随文件记录。`scripts/count-model-catalog.mjs` 与本地预览共用此 fixture，默认不再返回空数组。

沿用本次审计的固定历史 main **c7b6a2fc**，不是本地当前 main 分支。通过只读 `git show` 将该提交的跟踪源码导出到 `/tmp` 后执行计数；两侧使用各自 Core 和 Web 卡片代码、同一份 119 条目录。完整数值、逐渠道计数、fixture SHA-256 见 [R14 JSON](model-card-audit-20261109-r14-counts.json)。

| 范围 | main：原空夹具 → 新快照 | head：原空夹具 → 新快照 |
| --- | ---: | ---: |
| 静态模型 | 1125 → 1125 | 1064 → 1064 |
| 完整 mock registry | 1122 → 1122 | 1061 → 1061 |
| 可见卡片 | 923 → **988** | 919 → **984** |
| 可选模型 | 884 → **949** | 878 → **943** |
| TokenDance 可见 / 可选 | 0 / 0 → **65 / 65** | 0 / 0 → **65 / 65** |

两侧各增 65 张可见/可选卡；119 条中 67 条匹配已适配身份，另 52 条不自动提升为模型卡；74 个原身份中 7 个精确缺席，67 个在列中的 2 个已有到期证据，所以可见/可选 65。原始/静态模型列表与已保存数据没有删改。

完整对象四项“已知”计数（与 R11 相同；不适用纳入非未知，总窗口/最大输出分别列数值与不适用）：

| 口径 | main c7b6a2fc | head R14 |
| --- | ---: | ---: |
| 完整对象总数 | 1122 | 1061 |
| 已知输入 | 983 | 997 |
| 已知输出 | 968 | 967 |
| 已知上下文 | 534（数值 534 / 不适用 0） | 926（数值 519 / 不适用 407） |
| 已知最大输出 | 0（旧卡片未呈现此行） | 616（数值 209 / 不适用 407） |

### R14 可选修复、文件与验证

紧凑卡来源域名允许换行，不再省略截断，保留普通/紧凑 DOM 与 CSS 检查。`replicate/google/imagen-3` 首链接现为 `https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate#3.0-generate-002`，R12 链接检查 fixture 和两份表已同步；操作方确认同页 200 且有该章节 ID。002 是较晚的 GA generate 型号；Replicate 自身页面 404，**其实际对应版本仍未确认**，此锚点不证明渠道版本或可用性。最终链接范围仍为 **397 卡 / 374 URL / 全部记录为 200**。

主要文件：`packages/api/src/tokendance-catalog.ts`、Core `runtime/handler.ts`；Web `modelRegistry.js`、`ModelPicker.jsx`、`WorkspaceModelCatalog.jsx` / CSS；小程序 `model-registry.ts`、`model-picker.ts/wxml/wxss` 及编译 JS；计数脚本、两个 `test-support` 目录/预览助手和 runtime；日期快照、来源 supplement、各端生成物、四包回归测试及本验收文档。Gateway 运行时透传路径未改，新增实际 HTTP 中间件回归证明结构/提示完整保留。

- Core / shared API 受影响 **66/66**、Gateway **10/10**、Web 受影响 **170/170**、小程序全套 **147/147**、scripts 全套 **39/39**；均 0 失败 / 0 跳过。覆盖空、超时、非空缺席、all_invalid、旧 listed/absent 缓存失效、恢复、渠道保留、禁选、保存数据不变与来源域名 DOM/CSS。Core 两个旧目录测试使用无监听内存 runtime，原断言仍执行；Gateway 使用真实中间件内存 HTTP，不伪称 socket 验收。
- 审计/目录/参考上传生成器与对应检查通过，两个 `sync --check` 通过；R10/R11（`--frozen-main`）/R12 报告检查通过。Web build、小程序 build、Core/小程序类型检查通过。Web 使用仓库 Vite 配置并设置 `envFile:false`，随后运行原 agent-skills 发布脚本，避免读取 `.env`；既有大 chunk 提示仍在。
- 小程序最终源码 **1,569,427 bytes**、runtime **1,145,225 bytes**、媒体 **189,978 bytes**；相对 R13B 源码 **+2,085 bytes**，原上限 **1,572,864** 不变，余 **3,437 bytes**。没有删减预算测试或改阈值。
- Browser 插件缺失，Playwright 命令不存在；本轮实际启动前后端分别遇到 5173/8791 `listen EPERM`。DOM/编译组件验收通过，1280/390 浏览器截图、微信原生扫描仍未完成，小程序仍暂停发布。启动命令与三模式截图路径见 [预览说明](model-card-audit-20261109-preview.md#r14-启动与-tokendance-模式)。

复现命令（仓库根目录；Web glob 命令在 `apps/web` 下执行）：

```sh
pnpm --dir apps/paperbanana-api exec node --import tsx --test tests/tokendance-catalog.test.ts tests/tokendance-reconciliation.test.ts tests/tokendance-r14.test.ts tests/model-audit.test.ts tests/model-audit-r13.test.ts tests/model-audit-http.test.ts tests/provider-catalog.test.ts
node --test apps/auth-gateway/tests/model-audit.test.js apps/auth-gateway/tests/tokendance-catalog.test.js
pnpm --dir apps/miniprogram test
node --test scripts/*.test.mjs
node scripts/generate-model-audit.mjs --check
node scripts/sync-model-catalog.mjs --check
node scripts/sync-reference-upload.mjs --check
node scripts/report-model-card-r10.mjs --check
node scripts/report-model-card-r11.mjs --frozen-main --check
node scripts/report-model-card-r12.mjs --check
node scripts/count-model-catalog.mjs
pnpm --dir apps/paperbanana-api check
pnpm --dir apps/miniprogram build
pnpm --dir apps/miniprogram check
pnpm --dir apps/web exec node --input-type=module -e 'import {build} from "vite"; await build({envFile:false});'
pnpm --dir apps/web exec node scripts/publish-agent-skills.mjs
# 在 apps/web 下运行：
pnpm test tests/model-audit*.test.mjs tests/tokendance-catalog-r14.test.mjs tests/model-specifications.test.mjs tests/provider-catalogs.test.mjs tests/model-visibility-entrances.test.mjs tests/model-registry-ui-contract.test.mjs tests/workspace-model-catalog.test.mjs tests/workspace-model-picker.test.mjs tests/workspace-models.test.mjs src/lib/modelRegistry.test.js
```

## R13B：公告标签与 DeepSeek V3-0324 来源（当前验收）

按 `.audit-input/r13/CODEX_TASK_R13B.md` 完成两项补充，保留 R13 未提交修改。未运行 Git 写命令、未触碰只读基线、未发起真实或付费模型调用；TokenDance 空目录隐藏逻辑及其计数夹具未改。

1. 公告页面统一显示“下线公告”：百炼 6 张 `/notice/<id>` 卡、小米公告在百炼和 TokenHub 的 2 张卡、OpenAI **15** 张静态快照卡（实际目录多于任务列出的 11 张）及 xAI migration 退役公告。Runware xAI 原有公告标签保持；全目录规则还纠正硅基 `Qwen/Qwen-Image-Edit`、千帆 `qwen-image-edit` 两张静态卡的百炼退役公告标签。页面标签独立于渠道生命周期，既有退役来源优先级保留；完整对象中已有更优型号页的 OpenAI / xAI 卡继续显示该型号页，公告作为次级来源正确命名。Core 提供原审计来源，由消费端共用解析器命名；小程序在生成阶段使用同一解析器，编译 presenter 已验证。
2. `tokendance/deepseek-chat-v3-0324` 首链接改为 `https://api-docs.deepseek.com/news/news250325`，显示“原厂规格”。审计 supplement / 生成物记录 vendor、checkedAt=2026-11-09、操作方提供的 200 / text/html、标题 “V3-0324 Release | DeepSeek API Docs” 及尾斜杠重定向。R12 最终检查夹具与两份表已同步；完整 / 静态具体程度例外各移除该项，剩 **8** 个身份。最终仍是 **397 卡 / 374 个不同 URL / 全部 200 / 404 例外为空**；本轮仅沿用操作方 HTTP 证据。

首链接标签计数（相对本轮开始的 R13 工作树）：

| 投影 | 卡数 | 官方文档 | 原厂规格 | 下线公告 | 改标签卡数 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 完整 Core 对象 | 1061 | 1011 → 1005 | 42 → 40 | 8 → 16 | 8 |
| 静态 / 小程序 | 1064 | 1003 → 981 | 53 → 49 | 8 → 34 | 26 |

含次级链接时，两种投影各有 **45** 个来源标签改为“下线公告”。全部 **2,125** 个卡片对象与开始快照逐项比较，仅 DeepSeek 这一身份的来源集合 / 首链接变化；四项规格和生命周期完全一致。共享审计的 rows、facts、sources、notices、removed、additions 与开始快照一致；R10 / R11 计数及 27 卡 / 30 项待复核清单不变。

- 验证：Web 受影响 **118/118**、scripts 全套 **37/37**、小程序全套 **142/142**、Core/API 审计与 HTTP **11/11**、Gateway 审计 **6/6**；0 失败、0 跳过。新增覆盖所有指定完整 / 静态对象的普通 / 紧凑 DOM、全目录可见及次级公告标签、编译小程序 presenter、Core 审计来源消费和 DeepSeek 精确发布页 / 核验日期。
- 审计 / 目录 / 参考上传生成器完成；审计 `--check`、目录与参考上传双 `sync --check`、R12 清单 `--check`、R10 `--check`、R11 `--frozen-main --check` 均通过。Web / 小程序 build、小程序 / Core 类型检查通过；Web 仍有既有大 chunk 提示。复现命令沿用下方 R13 段落。
- 小程序源码 **1,567,342 bytes**，较本轮开始 **1,567,353** 少 **11 bytes**；runtime **1,144,058**、媒体 **189,978 bytes**。原上限 **1,572,864 bytes** 未改，余 **5,522 bytes**。仅缩短生成数据文件的注释抵消新标签 / URL 字节，未删字段或改预算测试。

## R13：仅修复七个可见死链（当前验收）

按 `.audit-input/r13/CODEX_TASK_R13.md`，仅为下列七张卡补入原厂官方来源；通过审计 supplement、生成器及共享来源选择实现，无 UI 型号硬编码。规格、角色、价格、权限、请求与渠道生命周期不变；七个身份均保留，未标记 delisted/removed。未运行 Git 写命令、未触碰 `../Tuyan-wt-baseline`、未发起付费调用或部署。

`config/channel-audit/dead-links-20261109.json` 固化 **14** 个旧可见/API URL，逐项含 url、404、checkedAt=2026-11-09、cards。Web 在所有候选和 API 派生链接之后过滤（包括查询参数/片段变体）；Core/API 生成来源指针也排除黑名单，字段来源仅作为历史证据保留。无可用来源时为空。小程序在生成阶段采用相同选择规则，运行时仅接收最终 URL 与标签，不打包黑名单。

六张卡显示“原厂规格”：Replicate Imagen 3、3 Fast、4、4 Fast、4 Ultra，以及 Runware GPT-Image-1。Runware Grok Imagine Image Quality 的精确原厂退役公告显示“下线公告”；该来源标签不改变 Runware 可用性。OpenAI 页面自身注明 shut down/retired，也不外推渠道状态。

### 下一 PR 核实清单

下列七项的 **Replicate / Runware 渠道可用性与有效渠道页面均未核实**；原厂页面可达性不构成渠道下线证据，本轮均未 delisted/removed。下一 PR 逐项核实渠道是否继续提供、精确 ID 与可用官方渠道页：

- [ ] `replicate/google/imagen-3`
- [ ] `replicate/google/imagen-3-fast`
- [ ] `replicate/google/imagen-4`
- [ ] `replicate/google/imagen-4-fast`
- [ ] `replicate/google/imagen-4-ultra`
- [ ] `runware/openai:1@1`
- [ ] `runware/xai:grok-imagine@image-quality`

### R13 验证与包体

- Web 受影响测试 **115/115**、scripts 全套 **36/36**、小程序全套 **141/141**、Core/API 审计与 HTTP **9/9**、Gateway 审计 **6/6** 通过；均为 0 失败 / 0 跳过。覆盖七张卡普通/紧凑 DOM、完整/静态对象、小程序编译 presenter、全目录黑名单、无来源回退、原 404 证据和全部 397 条最终链接表。
- 审计/目录/参考上传生成完成；`generate-model-audit --check`、目录与参考上传两个 `sync --check`、R12 清单 `--check`、R11 `--frozen-main --check` 均通过。Web build、小程序 build / check 通过；Web 仍有既有大 chunk 提示。
- 开始/结束快照逐项对照：**2,125** 个完整/静态卡片对象仅 **7** 个身份的来源集合变化；**1,106** 个审计身份的四字段 value/state/provenance/source、增加/移除身份与生命周期完全不变。R11 计数与 27 卡 / 30 项模态待复核清单不变。R10 报告依赖当前来源，重新生成后 sourceDiff **623 → 616**（Replicate −5、Runware −2），仅这七项完整对象与 ID-only 的来源差异消失，模态计数不变。
- 小程序源码 **1,567,353 bytes**，较起始 **1,567,582** 少 **229**；runtime **1,144,069**、媒体 **189,978 bytes**。原上限 **1,572,864 bytes** 未改，余 **5,511 bytes**。只对已有审计数据初始化代码使用现有 esbuild 压缩，保留全部字段/链接/标签与原解码格式，黑名单留在生成侧；编译 presenter 和全目录字段对照已通过。

复现命令：

```sh
# apps/web 下执行
pnpm test tests/model-audit*.test.mjs tests/model-specifications.test.mjs tests/provider-catalogs.test.mjs tests/workspace-model-catalog.test.mjs
# 仓库根目录下执行
node --test scripts/*.test.mjs
pnpm --dir apps/miniprogram test
node --test apps/auth-gateway/tests/model-audit.test.js
node scripts/generate-model-audit.mjs --check
node scripts/sync-model-catalog.mjs --check
node scripts/sync-reference-upload.mjs --check
node scripts/report-model-card-r12.mjs --check
node scripts/report-model-card-r11.mjs --frozen-main --check
pnpm --dir apps/web build
pnpm --dir apps/miniprogram build
pnpm --dir apps/miniprogram check
# apps/paperbanana-api 下执行
node --import tsx --test tests/model-audit.test.ts tests/model-audit-r13.test.ts tests/model-audit-http.test.ts
```

## R12D：最终链接 HTTP 检查（当前验收）

本节已按 R13 / R13B 更新最终链接与状态；旧 URL / 404 历史证据保留，404 例外列表现为空。以下检查均来自操作方提供的结果，本轮未重新发起网络检查。

### 方法、时间与状态计数

原批次：Mac mini 沙箱外 HTTP **GET**，浏览器 User-Agent，跟随重定向，**25 秒**超时；2026-11-09 **18:38 UTC+8**，`checkedAt=2026-11-09T10:38:46.634Z`，来自 `.audit-input/r12/final-link-check.json`。R13 七条新链接：操作方在 2026-11-09 **约 19:05 UTC+8** 使用 GET、浏览器 UA、跟随重定向核实为 200 / text/html；`checkedAt=2026-11-09`，证据来自 `.audit-input/r13/CODEX_TASK_R13.md`。R13B 的 `tokendance/deepseek-chat-v3-0324` 原厂发布页由操作方于 2026-11-09 核实：200 / text/html，标题 “V3-0324 Release | DeepSeek API Docs”，尾斜杠重定向；该行 `checkedAt=2026-11-09`，证据来自 `.audit-input/r13/CODEX_TASK_R13B.md`。

范围：完整 Core **1061** 卡加 **3** 个仅静态身份，共 **1064** 卡；与 R8/pre-R9 `785b99df` 相比，最终首链接变化 **397** 卡，重新计算得到 **374** 个不同 URL，**全部 200**。URL 按完整字符串去重（保留型号章节锚点）；重复 URL 不重复计数。

| 统计口径 | 总数 | 200 | 404 | 410 | 其他状态 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 不同最终 URL | 374 | 374 | 0 | 0 | 0 |
| 卡片记录 | 397 | 397 | 0 | 0 | 0 |

全部响应为 `text/html`，无 JSON content-type，无重定向错误记录。HTTP 200 仅表示所记录检查时可达，不据此推断模型能力或账户权益。

可提交夹具：[r12-final-link-check-20261109.json](../apps/web/tests/fixtures/r12-final-link-check-20261109.json)。每行保留 channel、modelId、oldUrl、finalUrl、status、contentType、checkedAt；七条修复记录另保留 originalStatus=404、previousUrl（R12 旧可见链接）、previousStatus=404。R11 的 46 条 ID-only 检查已被完整对象检查替代。[生成清单](model-card-audit-20261109-r12-links.md)与当前选择和本节一致。

### 7 个死链修复与旧 404 证据

最终 404/410 例外列表：**空（0 项）**。原渠道页与 API/schema 均 404；新首链接采用任务给定的精确原厂页，不回退到失效链接。xAI 泛型号列表重定向页未使用。

| channel | model id | new URL | status | old URL | old status | previous visible URL | previous status |
| --- | --- | --- | ---: | --- | ---: | --- | ---: |
| replicate | `google/imagen-3` | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate#3.0-generate-002 | 200 | https://replicate.com/google/imagen-3/api/schema | 404 | https://replicate.com/google/imagen-3 | 404 |
| replicate | `google/imagen-3-fast` | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate#3.0-fast-generate-001 | 200 | https://replicate.com/google/imagen-3-fast/api/schema | 404 | https://replicate.com/google/imagen-3-fast | 404 |
| replicate | `google/imagen-4` | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate#4.0-generate-001 | 200 | https://replicate.com/google/imagen-4/api/schema | 404 | https://replicate.com/google/imagen-4 | 404 |
| replicate | `google/imagen-4-fast` | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate#4.0-fast-generate-001 | 200 | https://replicate.com/google/imagen-4-fast/api/schema | 404 | https://replicate.com/google/imagen-4-fast | 404 |
| replicate | `google/imagen-4-ultra` | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate#4.0-ultra-generate-001 | 200 | https://replicate.com/google/imagen-4-ultra/api/schema | 404 | https://replicate.com/google/imagen-4-ultra | 404 |
| runware | `openai:1@1` | https://developers.openai.com/api/docs/models/gpt-image-1 | 200 | https://runware.ai/docs/models/openai-gpt-image-1/schema.json | 404 | https://runware.ai/docs/models/openai-gpt-image-1 | 404 |
| runware | `xai:grok-imagine@image-quality` | https://docs.x.ai/developers/migration/imagine-image-quality-nov-2 | 200 | https://runware.ai/docs/models/xai-grok-imagine-image-quality/schema.json | 404 | https://runware.ai/docs/models/xai-grok-imagine-image-quality | 404 |

### 全部 397 张卡的最终链接检查

new URL 为当前完整对象首链接，old URL 为相同对象在 R8 的首链接；状态和分批 checkedAt 来自上述夹具。

| channel | model id | new URL | status | old URL |
| --- | --- | --- | ---: | --- |
| antling | `Ling-3.0-flash` | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 200 | https://developer.ant-ling.com/zh-CN/docs/models/ling/ |
| antling | `Ling-3.0-flash-VL` | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 200 | https://developer.ant-ling.com/zh-CN/docs/models/ling/ |
| antling | `Ling-3.0-tiny` | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 200 | https://developer.ant-ling.com/zh-CN/docs/models/ling/ |
| antling | `Ling-3.1-flash` | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 200 | https://developer.ant-ling.com/zh-CN/docs/models/ling/ |
| antling | `Ling-3.2-flash` | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 200 | https://developer.ant-ling.com/zh-CN/docs/models/ling/ |
| bailian | `glm-5.1` | https://help.aliyun.com/zh/model-studio/glm-5-1 | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `glm-5.2` | https://help.aliyun.com/zh/model-studio/glm-5-2 | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `glm-5.2-fast-preview` | https://www.qianwenai.com/models/glm-5.2-fast-preview | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `kimi-k2.5` | https://help.aliyun.com/zh/model-studio/kimi-k2-5 | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `kimi-k2.6` | https://help.aliyun.com/zh/model-studio/kimi-k2-6 | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `kimi-k2.7-code` | https://help.aliyun.com/zh/model-studio/kimi-k2-7-code | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `kimi-k3` | https://help.aliyun.com/zh/model-studio/kimi-k3 | 200 | https://huggingface.co/moonshotai/Kimi-K3 |
| bailian | `qwen-image` | https://help.aliyun.com/zh/model-studio/qwen-image-api | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen-image-3.0` | https://help.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen-image-3.0-pro` | https://help.aliyun.com/zh/model-studio/qwen-image-3-0-pro | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen-max` | https://help.aliyun.com/zh/model-studio/text-generation-model | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen-plus-2025-01-25` | https://help.aliyun.com/zh/model-studio/qwen-plus | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen-plus-2025-04-28` | https://help.aliyun.com/zh/model-studio/qwen-plus | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen-plus-2025-07-14` | https://help.aliyun.com/zh/model-studio/qwen-plus | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen-turbo` | https://www.aliyun.com/notice/118177 | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3-coder-next` | https://www.aliyun.com/notice/118345 | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3-max` | https://www.aliyun.com/notice/118344 | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3-max-2025-09-23` | https://www.aliyun.com/notice/118345 | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3-max-2026-01-23` | https://www.aliyun.com/notice/118345 | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3-max-preview` | https://www.aliyun.com/notice/118344 | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3.5-omni-flash` | https://help.aliyun.com/zh/model-studio/qwen3-5-omni-flash | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3.5-omni-flash-2026-03-15` | https://help.aliyun.com/zh/model-studio/qwen3-5-omni-flash | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3.5-omni-plus` | https://help.aliyun.com/zh/model-studio/qwen3-5-omni-plus | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3.5-omni-plus-2026-03-15` | https://help.aliyun.com/zh/model-studio/qwen3-5-omni-plus | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3.6-plus` | https://help.aliyun.com/zh/model-studio/qwen3-6-plus | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3.6-plus-2026-04-02` | https://help.aliyun.com/zh/model-studio/qwen3-6-plus | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3.7-max` | https://help.aliyun.com/zh/model-studio/qwen3-7-max | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3.7-max-2026-05-17` | https://help.aliyun.com/zh/model-studio/qwen3-7-max | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3.7-max-2026-05-20` | https://help.aliyun.com/zh/model-studio/qwen3-7-max | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3.7-max-preview` | https://help.aliyun.com/zh/model-studio/qwen3-7-max | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3.7-plus` | https://help.aliyun.com/zh/model-studio/qwen3-7-plus | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3.7-plus-2026-05-26` | https://help.aliyun.com/zh/model-studio/qwen3-7-plus | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3.8-2.4t-a95b` | https://help.aliyun.com/zh/model-studio/qwen3-8-2-4t-a95b | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3.8-27b` | https://help.aliyun.com/zh/model-studio/qwen3-8-27b | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `qwen3.8-max-0902` | https://help.aliyun.com/zh/model-studio/qwen3-8-max | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `vanchin/deepseek-v3.2-think` | https://help.aliyun.com/zh/model-studio/deepseek-api-by-vanchin | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `wan2.2-t2i-flash` | https://help.aliyun.com/zh/model-studio/wan2-2-t2i-flash | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `wan2.2-t2i-plus` | https://help.aliyun.com/zh/model-studio/wan2-2-t2i-plus | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `wan2.6-t2i` | https://help.aliyun.com/zh/model-studio/wan2-6-t2i | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `wan2.7-image` | https://help.aliyun.com/zh/model-studio/wan2-7-image | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `wan2.7-image-pro` | https://help.aliyun.com/zh/model-studio/wan2-7-image-pro | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `wanx-v1` | https://help.aliyun.com/zh/model-studio/wanx-v1 | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `wanx2.0-t2i-turbo` | https://help.aliyun.com/zh/model-studio/wanx2-0-t2i-turbo | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `wanx2.1-t2i-plus` | https://help.aliyun.com/zh/model-studio/wanx2-1-t2i-plus | 200 | https://help.aliyun.com/zh/model-studio/models |
| bailian | `wanx2.1-t2i-turbo` | https://help.aliyun.com/zh/model-studio/wanx2-1-t2i-turbo | 200 | https://help.aliyun.com/zh/model-studio/models |
| fal | `alibaba/qwen-image-3/text-to-image` | https://fal.ai/models/alibaba/qwen-image-3/text-to-image/api | 200 | https://api.fal.ai/v1/models |
| fal | `bria/fibo-edit-1.5/edit` | https://fal.ai/models/bria/fibo-edit-1.5/edit/api | 200 | https://api.fal.ai/v1/models |
| fal | `bria/fibo-gen-1.5/text-to-image` | https://fal.ai/models/bria/fibo-gen-1.5/text-to-image/api | 200 | https://api.fal.ai/v1/models |
| fal | `bytedance/seedream/v5/pro/text-to-image` | https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/bytedance/seedream/v4.5/text-to-image` | https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/bytedance/seedream/v4/text-to-image` | https://fal.ai/models/fal-ai/bytedance/seedream/v4/text-to-image/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/fast-sdxl` | https://fal.ai/models/fal-ai/fast-sdxl/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/flux-1/schnell` | https://fal.ai/models/fal-ai/flux-1/schnell/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/flux-2` | https://fal.ai/models/fal-ai/flux-2/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/flux-2-flex` | https://fal.ai/models/fal-ai/flux-2-flex/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/flux-2-pro` | https://fal.ai/models/fal-ai/flux-2-pro/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/flux-2/flash` | https://fal.ai/models/fal-ai/flux-2/flash/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/flux-2/klein/9b` | https://fal.ai/models/fal-ai/flux-2/klein/9b/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/flux-2/turbo` | https://fal.ai/models/fal-ai/flux-2/turbo/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/flux-kontext-lora` | https://fal.ai/models/fal-ai/flux-kontext-lora/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/flux-lora` | https://fal.ai/models/fal-ai/flux-lora/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/flux-pro/kontext` | https://fal.ai/models/fal-ai/flux-pro/kontext/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/flux-pro/v1.1` | https://fal.ai/models/fal-ai/flux-pro/v1.1/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/flux-pro/v1.1-ultra` | https://fal.ai/models/fal-ai/flux-pro/v1.1-ultra/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/flux/dev` | https://fal.ai/models/fal-ai/flux/dev/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/flux/schnell` | https://fal.ai/models/fal-ai/flux/schnell/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/gpt-image-1.5` | https://fal.ai/models/fal-ai/gpt-image-1.5/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/ideogram/v3` | https://fal.ai/models/fal-ai/ideogram/v3/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/krea-2/turbo` | https://fal.ai/models/fal-ai/krea-2/turbo/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/qwen-image` | https://fal.ai/models/fal-ai/qwen-image/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/recraft/v3/text-to-image` | https://fal.ai/models/fal-ai/recraft/v3/text-to-image/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/recraft/v4/pro/text-to-image` | https://fal.ai/models/fal-ai/recraft/v4/pro/text-to-image/api | 200 | https://api.fal.ai/v1/models |
| fal | `fal-ai/z-image/turbo` | https://fal.ai/models/fal-ai/z-image/turbo/api | 200 | https://api.fal.ai/v1/models |
| fal | `imagineart/imagineart-2.0-preview/text-to-image` | https://fal.ai/models/imagineart/imagineart-2.0-preview/text-to-image/api | 200 | https://api.fal.ai/v1/models |
| fal | `krea/v2/large/text-to-image` | https://fal.ai/models/krea/v2/large/text-to-image/api | 200 | https://api.fal.ai/v1/models |
| fal | `meta/muse-image/text-to-image` | https://fal.ai/models/meta/muse-image/text-to-image/api | 200 | https://api.fal.ai/v1/models |
| fal | `openai/gpt-image-2` | https://fal.ai/models/openai/gpt-image-2/api | 200 | https://api.fal.ai/v1/models |
| fal | `openai/gpt-image-2.5/flare/text-to-image` | https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image/api | 200 | https://api.fal.ai/v1/models |
| fal | `openai/gpt-image-2.5/sunburst/text-to-image` | https://fal.ai/models/openai/gpt-image-2.5/sunburst/text-to-image/api | 200 | https://api.fal.ai/v1/models |
| fal | `xai/grok-imagine-image` | https://fal.ai/models/xai/grok-imagine-image/api | 200 | https://api.fal.ai/v1/models |
| fal | `xai/grok-imagine-image/quality/text-to-image` | https://fal.ai/models/xai/grok-imagine-image/quality/text-to-image/api | 200 | https://api.fal.ai/v1/models |
| fal | `xai/grok-imagine-image/v2.0/text-to-image` | https://fal.ai/models/xai/grok-imagine-image/v2.0/text-to-image/api | 200 | https://api.fal.ai/v1/models |
| iflytek | `spark-x2.5` | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 200 | https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 |
| iflytek | `spark-x2.5-1.7b` | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 200 | https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 |
| iflytek | `spark-x2.5-4b` | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 200 | https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 |
| iflytek | `spark-x2.6` | https://maas.xfyun.cn/doc/guide/3%E3%80%81API%20%E6%8E%A5%E5%8F%A3/3.1%20%E6%98%9F%E7%81%AB%E6%A8%A1%E5%9E%8B%20API/3.1.1%20Chat.html | 200 | https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 |
| iflytek | `spark-x2.6-4b` | https://maas.xfyun.cn/doc/guide/3%E3%80%81API%20%E6%8E%A5%E5%8F%A3/3.1%20%E6%98%9F%E7%81%AB%E6%A8%A1%E5%9E%8B%20API/3.1.1%20Chat.html | 200 | https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 |
| iflytek | `xsparkx2` | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 200 | https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 |
| iflytek | `xsparkx2flash` | https://www.xfyun.cn/doc/spark/HTTP调用文档.html | 200 | https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 |
| kimi | `kimi-k2.7-code-highspeed` | https://platform.kimi.com/docs/guide/kimi-k2-7-code-quickstart | 200 | https://www.kimi.com/code/docs/en/kimi-code/models |
| kimi | `kimi-k3.1-pro` | https://platform.kimi.com/docs/guide/kimi-k3-1-pro-quickstart | 200 | https://platform.kimi.com/docs/models |
| kimi | `kimi-k3.1-pro-highspeed` | https://platform.kimi.com/docs/guide/kimi-k3-1-pro-quickstart | 200 | https://platform.kimi.com/docs/models |
| replicate | `adirik/realvisxl-v3.0-turbo` | https://replicate.com/adirik/realvisxl-v3.0-turbo | 200 | https://replicate.com/adirik/realvisxl-v3.0-turbo/api/schema |
| replicate | `ai-forever/kandinsky-2` | https://replicate.com/ai-forever/kandinsky-2 | 200 | https://replicate.com/ai-forever/kandinsky-2/api/schema |
| replicate | `ai-forever/kandinsky-2.2` | https://replicate.com/ai-forever/kandinsky-2.2 | 200 | https://replicate.com/ai-forever/kandinsky-2.2/api/schema |
| replicate | `alibaba/qwen-image-3` | https://replicate.com/alibaba/qwen-image-3 | 200 | https://replicate.com/alibaba/qwen-image-3/api/schema |
| replicate | `alibaba/qwen-image-3-pro` | https://replicate.com/alibaba/qwen-image-3-pro | 200 | https://replicate.com/alibaba/qwen-image-3-pro/api/schema |
| replicate | `alibaba/wan-3` | https://replicate.com/alibaba/wan-3 | 200 | https://replicate.com/alibaba/wan-3/api/schema |
| replicate | `anthropic/claude-opus-5.5` | https://replicate.com/anthropic/claude-opus-5.5 | 200 | https://replicate.com/anthropic/claude-opus-5.5/api/schema |
| replicate | `black-forest-labs/flux-1.1-pro` | https://replicate.com/black-forest-labs/flux-1.1-pro | 200 | https://replicate.com/black-forest-labs/flux-1.1-pro/api/schema |
| replicate | `black-forest-labs/flux-1.1-pro-ultra` | https://replicate.com/black-forest-labs/flux-1.1-pro-ultra | 200 | https://replicate.com/black-forest-labs/flux-1.1-pro-ultra/api/schema |
| replicate | `black-forest-labs/flux-2-flex` | https://replicate.com/black-forest-labs/flux-2-flex | 200 | https://replicate.com/black-forest-labs/flux-2-flex/api/schema |
| replicate | `black-forest-labs/flux-2-klein-4b` | https://replicate.com/black-forest-labs/flux-2-klein-4b | 200 | https://replicate.com/black-forest-labs/flux-2-klein-4b/api/schema |
| replicate | `black-forest-labs/flux-2-max` | https://replicate.com/black-forest-labs/flux-2-max | 200 | https://replicate.com/black-forest-labs/flux-2-max/api/schema |
| replicate | `black-forest-labs/flux-2-pro` | https://replicate.com/black-forest-labs/flux-2-pro | 200 | https://replicate.com/black-forest-labs/flux-2-pro/api/schema |
| replicate | `black-forest-labs/flux-3-image` | https://replicate.com/black-forest-labs/flux-3-image | 200 | https://replicate.com/black-forest-labs/flux-3-image/api/schema |
| replicate | `black-forest-labs/flux-dev` | https://replicate.com/black-forest-labs/flux-dev | 200 | https://replicate.com/black-forest-labs/flux-dev/api/schema |
| replicate | `black-forest-labs/flux-dev-lora` | https://replicate.com/black-forest-labs/flux-dev-lora | 200 | https://replicate.com/black-forest-labs/flux-dev-lora/api/schema |
| replicate | `black-forest-labs/flux-kontext-dev` | https://replicate.com/black-forest-labs/flux-kontext-dev | 200 | https://replicate.com/black-forest-labs/flux-kontext-dev/api/schema |
| replicate | `black-forest-labs/flux-kontext-max` | https://replicate.com/black-forest-labs/flux-kontext-max | 200 | https://replicate.com/black-forest-labs/flux-kontext-max/api/schema |
| replicate | `black-forest-labs/flux-kontext-pro` | https://replicate.com/black-forest-labs/flux-kontext-pro | 200 | https://replicate.com/collections/official |
| replicate | `black-forest-labs/flux-pro` | https://replicate.com/black-forest-labs/flux-pro | 200 | https://replicate.com/black-forest-labs/flux-pro/api/schema |
| replicate | `black-forest-labs/flux-schnell` | https://replicate.com/black-forest-labs/flux-schnell | 200 | https://replicate.com/black-forest-labs/flux-schnell/api/schema |
| replicate | `bria/fibo` | https://replicate.com/bria/fibo | 200 | https://replicate.com/bria/fibo/api/schema |
| replicate | `bria/fibo-edit` | https://replicate.com/bria/fibo-edit | 200 | https://replicate.com/bria/fibo-edit/api/schema |
| replicate | `bria/image-3.2` | https://replicate.com/bria/image-3.2 | 200 | https://replicate.com/bria/image-3.2/api/schema |
| replicate | `bytedance/bagel` | https://replicate.com/bytedance/bagel | 200 | https://replicate.com/bytedance/bagel/api/schema |
| replicate | `bytedance/sdxl-lightning-4step` | https://replicate.com/bytedance/sdxl-lightning-4step | 200 | https://replicate.com/bytedance/sdxl-lightning-4step/api/schema |
| replicate | `bytedance/seedream-3` | https://replicate.com/bytedance/seedream-3 | 200 | https://replicate.com/bytedance/seedream-3/api/schema |
| replicate | `bytedance/seedream-4` | https://replicate.com/bytedance/seedream-4 | 200 | https://replicate.com/bytedance/seedream-4/api/schema |
| replicate | `bytedance/seedream-4.5` | https://replicate.com/bytedance/seedream-4.5 | 200 | https://replicate.com/bytedance/seedream-4.5/api/schema |
| replicate | `bytedance/seedream-5-lite` | https://replicate.com/bytedance/seedream-5-lite | 200 | https://replicate.com/bytedance/seedream-5-lite/api/schema |
| replicate | `datacte/proteus-v0.2` | https://replicate.com/datacte/proteus-v0.2 | 200 | https://replicate.com/datacte/proteus-v0.2/api/schema |
| replicate | `datacte/proteus-v0.3` | https://replicate.com/datacte/proteus-v0.3 | 200 | https://replicate.com/datacte/proteus-v0.3/api/schema |
| replicate | `fofr/latent-consistency-model` | https://replicate.com/fofr/latent-consistency-model | 200 | https://replicate.com/fofr/latent-consistency-model/api/schema |
| replicate | `fofr/sdxl-emoji` | https://replicate.com/fofr/sdxl-emoji | 200 | https://replicate.com/fofr/sdxl-emoji/api/schema |
| replicate | `fofr/sticker-maker` | https://replicate.com/fofr/sticker-maker | 200 | https://replicate.com/fofr/sticker-maker/api/schema |
| replicate | `google/gemini-3-flash` | https://replicate.com/google/gemini-3-flash | 200 | https://replicate.com/google/gemini-3-flash/api/schema |
| replicate | `google/imagen-3` | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate#3.0-generate-002 | 200 | https://replicate.com/google/imagen-3/api/schema |
| replicate | `google/imagen-3-fast` | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate#3.0-fast-generate-001 | 200 | https://replicate.com/google/imagen-3-fast/api/schema |
| replicate | `google/imagen-4` | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate#4.0-generate-001 | 200 | https://replicate.com/google/imagen-4/api/schema |
| replicate | `google/imagen-4-fast` | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate#4.0-fast-generate-001 | 200 | https://replicate.com/google/imagen-4-fast/api/schema |
| replicate | `google/imagen-4-ultra` | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate#4.0-ultra-generate-001 | 200 | https://replicate.com/google/imagen-4-ultra/api/schema |
| replicate | `ideogram-ai/ideogram-4-5` | https://replicate.com/ideogram-ai/ideogram-4-5 | 200 | https://replicate.com/ideogram-ai/ideogram-4-5/api/schema |
| replicate | `ideogram-ai/ideogram-4-5-precise-edit` | https://replicate.com/ideogram-ai/ideogram-4-5-precise-edit | 200 | https://replicate.com/ideogram-ai/ideogram-4-5-precise-edit/api/schema |
| replicate | `ideogram-ai/ideogram-v2` | https://replicate.com/ideogram-ai/ideogram-v2 | 200 | https://replicate.com/ideogram-ai/ideogram-v2/api/schema |
| replicate | `ideogram-ai/ideogram-v2-turbo` | https://replicate.com/ideogram-ai/ideogram-v2-turbo | 200 | https://replicate.com/ideogram-ai/ideogram-v2-turbo/api/schema |
| replicate | `ideogram-ai/ideogram-v2a` | https://replicate.com/ideogram-ai/ideogram-v2a | 200 | https://replicate.com/ideogram-ai/ideogram-v2a/api/schema |
| replicate | `ideogram-ai/ideogram-v2a-turbo` | https://replicate.com/ideogram-ai/ideogram-v2a-turbo | 200 | https://replicate.com/ideogram-ai/ideogram-v2a-turbo/api/schema |
| replicate | `ideogram-ai/ideogram-v3-balanced` | https://replicate.com/ideogram-ai/ideogram-v3-balanced | 200 | https://replicate.com/ideogram-ai/ideogram-v3-balanced/api/schema |
| replicate | `ideogram-ai/ideogram-v3-quality` | https://replicate.com/ideogram-ai/ideogram-v3-quality | 200 | https://replicate.com/ideogram-ai/ideogram-v3-quality/api/schema |
| replicate | `ideogram-ai/ideogram-v3-turbo` | https://replicate.com/ideogram-ai/ideogram-v3-turbo | 200 | https://replicate.com/ideogram-ai/ideogram-v3-turbo/api/schema |
| replicate | `krea/krea-2-medium` | https://replicate.com/krea/krea-2-medium | 200 | https://replicate.com/krea/krea-2-medium/api/schema |
| replicate | `leonardoai/lucid-origin` | https://replicate.com/leonardoai/lucid-origin | 200 | https://replicate.com/leonardoai/lucid-origin/api/schema |
| replicate | `lucataco/dreamshaper-xl-turbo` | https://replicate.com/lucataco/dreamshaper-xl-turbo | 200 | https://replicate.com/lucataco/dreamshaper-xl-turbo/api/schema |
| replicate | `lucataco/omnigen2` | https://replicate.com/lucataco/omnigen2 | 200 | https://replicate.com/collections/official |
| replicate | `lucataco/open-dalle-v1.1` | https://replicate.com/lucataco/open-dalle-v1.1 | 200 | https://replicate.com/lucataco/open-dalle-v1.1/api/schema |
| replicate | `lucataco/realistic-vision-v5.1` | https://replicate.com/lucataco/realistic-vision-v5.1 | 200 | https://replicate.com/collections/official |
| replicate | `lucataco/ssd-1b` | https://replicate.com/lucataco/ssd-1b | 200 | https://replicate.com/lucataco/ssd-1b/api/schema |
| replicate | `luma/photon` | https://replicate.com/luma/photon | 200 | https://replicate.com/luma/photon/api/schema |
| replicate | `luma/photon-flash` | https://replicate.com/luma/photon-flash | 200 | https://replicate.com/luma/photon-flash/api/schema |
| replicate | `minimax/image-01` | https://replicate.com/minimax/image-01 | 200 | https://replicate.com/minimax/image-01/api/schema |
| replicate | `nvidia/sana` | https://replicate.com/nvidia/sana | 200 | https://replicate.com/collections/official |
| replicate | `nvidia/sana-sprint-1.6b` | https://replicate.com/nvidia/sana-sprint-1.6b | 200 | https://replicate.com/nvidia/sana-sprint-1.6b/api/schema |
| replicate | `playgroundai/playground-v2.5-1024px-aesthetic` | https://replicate.com/playgroundai/playground-v2.5-1024px-aesthetic | 200 | https://replicate.com/playgroundai/playground-v2.5-1024px-aesthetic/api/schema |
| replicate | `prunaai/flux-fast` | https://replicate.com/prunaai/flux-fast | 200 | https://replicate.com/prunaai/flux-fast/api/schema |
| replicate | `prunaai/flux-kontext-fast` | https://replicate.com/prunaai/flux-kontext-fast | 200 | https://replicate.com/prunaai/flux-kontext-fast/api/schema |
| replicate | `prunaai/hidream-l1-dev` | https://replicate.com/prunaai/hidream-l1-dev | 200 | https://replicate.com/prunaai/hidream-l1-dev/api/schema |
| replicate | `prunaai/hidream-l1-fast` | https://replicate.com/prunaai/hidream-l1-fast | 200 | https://replicate.com/prunaai/hidream-l1-fast/api/schema |
| replicate | `prunaai/hidream-l1-full` | https://replicate.com/prunaai/hidream-l1-full | 200 | https://replicate.com/prunaai/hidream-l1-full/api/schema |
| replicate | `prunaai/p-image` | https://replicate.com/prunaai/p-image | 200 | https://replicate.com/prunaai/p-image/api/schema |
| replicate | `prunaai/p-image-edit` | https://replicate.com/prunaai/p-image-edit | 200 | https://replicate.com/prunaai/p-image-edit/api/schema |
| replicate | `prunaai/p-image-ideogram` | https://replicate.com/prunaai/p-image-ideogram | 200 | https://replicate.com/prunaai/p-image-ideogram/api/schema |
| replicate | `prunaai/p-image-lora` | https://replicate.com/prunaai/p-image-lora | 200 | https://replicate.com/prunaai/p-image-lora/api/schema |
| replicate | `prunaai/sdxl-lightning` | https://replicate.com/prunaai/sdxl-lightning | 200 | https://replicate.com/prunaai/sdxl-lightning/api/schema |
| replicate | `prunaai/wan-2.2-image` | https://replicate.com/prunaai/wan-2.2-image | 200 | https://replicate.com/prunaai/wan-2.2-image/api/schema |
| replicate | `prunaai/z-image-turbo` | https://replicate.com/prunaai/z-image-turbo | 200 | https://replicate.com/prunaai/z-image-turbo/api/schema |
| replicate | `qwen/qwen-image` | https://replicate.com/qwen/qwen-image | 200 | https://replicate.com/qwen/qwen-image/api/schema |
| replicate | `qwen/qwen-image-edit` | https://replicate.com/qwen/qwen-image-edit | 200 | https://replicate.com/qwen/qwen-image-edit/api/schema |
| replicate | `qwen/qwen-image-edit-plus` | https://replicate.com/qwen/qwen-image-edit-plus | 200 | https://replicate.com/qwen/qwen-image-edit-plus/api/schema |
| replicate | `recraft-ai/recraft-v3` | https://replicate.com/recraft-ai/recraft-v3 | 200 | https://replicate.com/recraft-ai/recraft-v3/api/schema |
| replicate | `recraft-ai/recraft-v4-pro` | https://replicate.com/recraft-ai/recraft-v4-pro | 200 | https://replicate.com/recraft-ai/recraft-v4-pro/api/schema |
| replicate | `recraft-ai/recraft-v4.1` | https://replicate.com/recraft-ai/recraft-v4.1 | 200 | https://replicate.com/recraft-ai/recraft-v4.1/api/schema |
| replicate | `sourceful/riverflow-2.0-pro` | https://replicate.com/sourceful/riverflow-2.0-pro | 200 | https://replicate.com/sourceful/riverflow-2.0-pro/api/schema |
| replicate | `stability-ai/sdxl` | https://replicate.com/stability-ai/sdxl | 200 | https://replicate.com/stability-ai/sdxl/api/schema |
| replicate | `stability-ai/stable-diffusion` | https://replicate.com/stability-ai/stable-diffusion | 200 | https://replicate.com/stability-ai/stable-diffusion/api/schema |
| replicate | `stability-ai/stable-diffusion-3.5-large` | https://replicate.com/stability-ai/stable-diffusion-3.5-large | 200 | https://replicate.com/stability-ai/stable-diffusion-3.5-large/api/schema |
| replicate | `stability-ai/stable-diffusion-3.5-large-turbo` | https://replicate.com/stability-ai/stable-diffusion-3.5-large-turbo | 200 | https://replicate.com/stability-ai/stable-diffusion-3.5-large-turbo/api/schema |
| replicate | `stability-ai/stable-diffusion-3.5-medium` | https://replicate.com/stability-ai/stable-diffusion-3.5-medium | 200 | https://replicate.com/stability-ai/stable-diffusion-3.5-medium/api/schema |
| replicate | `tencent/hunyuan-image-3` | https://replicate.com/tencent/hunyuan-image-3 | 200 | https://replicate.com/tencent/hunyuan-image-3/api/schema |
| replicate | `tstramer/material-diffusion` | https://replicate.com/tstramer/material-diffusion | 200 | https://replicate.com/tstramer/material-diffusion/api/schema |
| replicate | `wan-video/wan-2.7-image` | https://replicate.com/wan-video/wan-2.7-image | 200 | https://replicate.com/wan-video/wan-2.7-image/api/schema |
| replicate | `wan-video/wan-2.7-image-pro` | https://replicate.com/wan-video/wan-2.7-image-pro | 200 | https://replicate.com/wan-video/wan-2.7-image-pro/api/schema |
| replicate | `xai/grok-imagine-image` | https://replicate.com/xai/grok-imagine-image | 200 | https://replicate.com/xai/grok-imagine-image/api/schema |
| replicate | `xai/grok-imagine-image-2` | https://replicate.com/xai/grok-imagine-image-2 | 200 | https://replicate.com/xai/grok-imagine-image-2/api/schema |
| replicate | `zsxkib/step1x-edit` | https://replicate.com/zsxkib/step1x-edit | 200 | https://replicate.com/zsxkib/step1x-edit/api/schema |
| runware | `alibaba:qwen-image-edit@2511` | https://runware.ai/docs/models/alibaba-qwen-image-edit-2511 | 200 | https://runware.ai/docs/models/alibaba-qwen-image-edit-2511/schema.json |
| runware | `alibaba:qwen-image@2.0` | https://runware.ai/docs/models/alibaba-qwen-image-2-0 | 200 | https://runware.ai/docs/models/alibaba-qwen-image-2-0/schema.json |
| runware | `alibaba:qwen-image@2.0-pro` | https://runware.ai/docs/models/alibaba-qwen-image-2-0-pro | 200 | https://runware.ai/docs/models/alibaba-qwen-image-2-0-pro/schema.json |
| runware | `alibaba:qwen-image@2.1-pro` | https://runware.ai/docs/models/alibaba-qwen-image-2-1-pro | 200 | https://runware.ai/docs/models/alibaba-qwen-image-2-1-pro/schema.json |
| runware | `alibaba:qwen-image@2.1-turbo` | https://runware.ai/docs/models/alibaba-qwen-image-2-1-turbo | 200 | https://runware.ai/docs/models/alibaba-qwen-image-2-1-turbo/schema.json |
| runware | `alibaba:qwen-image@2512` | https://runware.ai/docs/models/alibaba-qwen-image-2512 | 200 | https://runware.ai/docs/models/alibaba-qwen-image-2512/schema.json |
| runware | `alibaba:qwen-image@3.0` | https://runware.ai/docs/models/alibaba-qwen-image-3-0 | 200 | https://runware.ai/docs/models/alibaba-qwen-image-3-0/schema.json |
| runware | `alibaba:qwen-image@3.0-pro` | https://runware.ai/docs/models/alibaba-qwen-image-3-0-pro | 200 | https://runware.ai/docs/models/alibaba-qwen-image-3-0-pro/schema.json |
| runware | `alibaba:wan@2.6-image` | https://runware.ai/docs/models/alibaba-wan2-6-image | 200 | https://runware.ai/docs/models/alibaba-wan2-6-image/schema.json |
| runware | `alibaba:wan@2.7-image` | https://runware.ai/docs/models/alibaba-wan2-7-image | 200 | https://runware.ai/docs/models/alibaba-wan2-7-image/schema.json |
| runware | `alibaba:wan@2.7-image-pro` | https://runware.ai/docs/models/alibaba-wan2-7-image-pro | 200 | https://runware.ai/docs/models/alibaba-wan2-7-image-pro/schema.json |
| runware | `anthropic:claude@fable-5` | https://runware.ai/docs/models/anthropic-claude-fable-5 | 200 | https://runware.ai/docs/models/anthropic-claude-fable-5/schema.json |
| runware | `anthropic:claude@haiku-4.5` | https://runware.ai/docs/models/anthropic-claude-haiku-4-5 | 200 | https://runware.ai/docs/models/anthropic-claude-haiku-4-5/schema.json |
| runware | `anthropic:claude@opus-4.7` | https://runware.ai/docs/models/anthropic-claude-opus-4-7 | 200 | https://runware.ai/docs/models/anthropic-claude-opus-4-7/schema.json |
| runware | `anthropic:claude@opus-4.8` | https://runware.ai/docs/models/anthropic-claude-opus-4-8 | 200 | https://runware.ai/docs/models/anthropic-claude-opus-4-8/schema.json |
| runware | `anthropic:claude@sonnet-4.6` | https://runware.ai/docs/models/anthropic-claude-sonnet-4-6 | 200 | https://runware.ai/docs/models/anthropic-claude-sonnet-4-6/schema.json |
| runware | `baidu:ernie-image@0` | https://runware.ai/docs/models/baidu-ernie-image | 200 | https://runware.ai/docs/models/baidu-ernie-image/schema.json |
| runware | `baidu:ernie-image@turbo` | https://runware.ai/docs/models/baidu-ernie-image-turbo | 200 | https://runware.ai/docs/models/baidu-ernie-image-turbo/schema.json |
| runware | `bfl:1@2` | https://runware.ai/docs/models/bfl-flux-1-fill-pro | 200 | https://runware.ai/docs/models/bfl-flux-1-fill-pro/schema.json |
| runware | `bfl:2@1` | https://runware.ai/docs/models/bfl-flux-1-1-pro | 200 | https://runware.ai/docs/models/bfl-flux-1-1-pro/schema.json |
| runware | `bfl:2@2` | https://runware.ai/docs/models/bfl-flux-1-1-pro-ultra | 200 | https://runware.ai/docs/models/bfl-flux-1-1-pro-ultra/schema.json |
| runware | `bfl:3@1` | https://runware.ai/docs/models/bfl-flux-1-kontext-pro | 200 | https://runware.ai/docs/models/bfl-flux-1-kontext-pro/schema.json |
| runware | `bfl:4@1` | https://runware.ai/docs/models/bfl-flux-1-kontext-max | 200 | https://runware.ai/docs/models/bfl-flux-1-kontext-max/schema.json |
| runware | `bfl:5@1` | https://runware.ai/docs/models/bfl-flux-2-pro | 200 | https://runware.ai/docs/models/bfl-flux-2-pro/schema.json |
| runware | `bfl:6@1` | https://runware.ai/docs/models/bfl-flux-2-flex | 200 | https://runware.ai/docs/models/bfl-flux-2-flex/schema.json |
| runware | `bfl:7@1` | https://runware.ai/docs/models/bfl-flux-2-max | 200 | https://runware.ai/docs/models/bfl-flux-2-max/schema.json |
| runware | `bfl:flux@3-image` | https://runware.ai/docs/models/bfl-flux-3-image | 200 | https://runware.ai/docs/models/bfl-flux-3-image/schema.json |
| runware | `bfl:flux@3-image-klein` | https://runware.ai/docs/models/bfl-flux-3-image-klein | 200 | https://runware.ai/docs/models/bfl-flux-3-image-klein/schema.json |
| runware | `bfl:flux@3-image-klein-base` | https://runware.ai/docs/models/bfl-flux-3-image-klein-base | 200 | https://runware.ai/docs/models/bfl-flux-3-image-klein-base/schema.json |
| runware | `bria:10@1` | https://runware.ai/docs/models/bria-3-2 | 200 | https://runware.ai/docs/models/bria-3-2/schema.json |
| runware | `bria:11@1` | https://runware.ai/docs/models/bria-image-replace-background | 200 | https://runware.ai/docs/models/bria-image-replace-background/schema.json |
| runware | `bria:20@1` | https://runware.ai/docs/models/bria-fibo-2-0 | 200 | https://runware.ai/docs/models/bria-fibo/schema.json |
| runware | `bria:20@3` | https://runware.ai/docs/models/bria-fibo-lite | 200 | https://runware.ai/docs/models/bria-fibo-lite/schema.json |
| runware | `bria:21@1` | https://runware.ai/docs/models/bria-fibo-2-0-edit | 200 | https://runware.ai/docs/models/bria-fibo-edit/schema.json |
| runware | `bytedance:5@0` | https://runware.ai/docs/models/bytedance-seedream-4-0 | 200 | https://runware.ai/docs/models/bytedance-seedream-4-0/schema.json |
| runware | `bytedance:seedream@4.5` | https://runware.ai/docs/models/bytedance-seedream-4-5 | 200 | https://runware.ai/docs/models/bytedance-seedream-4-5/schema.json |
| runware | `bytedance:seedream@5.0-flash` | https://runware.ai/docs/models/bytedance-seedream-5-0-flash | 200 | https://runware.ai/docs/models/bytedance-seedream-5-0-flash/schema.json |
| runware | `bytedance:seedream@5.0-lite` | https://runware.ai/docs/models/bytedance-seedream-5-0-lite | 200 | https://runware.ai/docs/models/bytedance-seedream-5-0-lite/schema.json |
| runware | `bytedance:seedream@5.0-pro` | https://runware.ai/docs/models/bytedance-seedream-5-0-pro | 200 | https://runware.ai/docs/models/bytedance-seedream-5-0-pro/schema.json |
| runware | `civitai:101055@128078` | https://runware.ai/docs/models/stabilityai-stable-diffusion-xl-v1-0-vae-fix | 200 | https://runware.ai/docs/models/stabilityai-stable-diffusion-xl-v1-0-vae-fix/schema.json |
| runware | `google:4@2` | https://runware.ai/docs/models/google-nano-banana-pro | 200 | https://runware.ai/docs/models/google-nano-banana-pro/schema.json |
| runware | `google:4@3` | https://runware.ai/docs/models/google-nano-banana-2 | 200 | https://runware.ai/docs/models/google-nano-banana-2/schema.json |
| runware | `google:gemini@3-flash` | https://runware.ai/docs/models/google-gemini-3-flash | 200 | https://runware.ai/docs/models/google-gemini-3-flash/schema.json |
| runware | `google:gemini@3.1-flash-lite` | https://runware.ai/docs/models/google-gemini-3-1-flash-lite | 200 | https://runware.ai/docs/models/google-gemini-3-1-flash-lite/schema.json |
| runware | `google:gemini@3.1-pro` | https://runware.ai/docs/models/google-gemini-3-1-pro | 200 | https://runware.ai/docs/models/google-gemini-3-1-pro/schema.json |
| runware | `google:gemini@3.5-flash` | https://runware.ai/docs/models/google-gemini-3-5-flash | 200 | https://runware.ai/docs/models/google-gemini-3-5-flash/schema.json |
| runware | `google:gemma@4-31b` | https://runware.ai/docs/models/google-gemma-4-31b | 200 | https://runware.ai/docs/models/google-gemma-4-31b/schema.json |
| runware | `google:nano-banana@2-lite` | https://runware.ai/docs/models/google-nano-banana-2-lite | 200 | https://runware.ai/docs/models/google-nano-banana-2-lite/schema.json |
| runware | `google:nano-banana@2.1` | https://runware.ai/docs/models/google-nano-banana-2-1 | 200 | https://runware.ai/docs/models/google-nano-banana-2-1/schema.json |
| runware | `ideogram:2@1` | https://runware.ai/docs/models/ideogram-2a | 200 | https://runware.ai/docs/models/ideogram-2a/schema.json |
| runware | `ideogram:2@2` | https://runware.ai/docs/models/ideogram-2a-remix | 200 | https://runware.ai/docs/models/ideogram-2a-remix/schema.json |
| runware | `ideogram:3@1` | https://runware.ai/docs/models/ideogram-2-0 | 200 | https://runware.ai/docs/models/ideogram-2-0/schema.json |
| runware | `ideogram:3@2` | https://runware.ai/docs/models/ideogram-2-0-remix | 200 | https://runware.ai/docs/models/ideogram-2-0-remix/schema.json |
| runware | `ideogram:4.5@0` | https://runware.ai/docs/models/ideogram-4-5 | 200 | https://runware.ai/docs/models/ideogram-4-5/schema.json |
| runware | `ideogram:4.5@precise-edit` | https://runware.ai/docs/models/ideogram-4-5-precise-edit | 200 | https://runware.ai/docs/models/ideogram-4-5-precise-edit/schema.json |
| runware | `ideogram:4@0` | https://runware.ai/docs/models/ideogram-4-0 | 200 | https://runware.ai/docs/models/ideogram-4-0/schema.json |
| runware | `ideogram:4@1` | https://runware.ai/docs/models/ideogram-3-0 | 200 | https://runware.ai/docs/models/ideogram-3-0/schema.json |
| runware | `ideogram:4@2` | https://runware.ai/docs/models/ideogram-3-0-remix | 200 | https://runware.ai/docs/models/ideogram-3-0-remix/schema.json |
| runware | `ideogram:4@3` | https://runware.ai/docs/models/ideogram-3-0-edit | 200 | https://runware.ai/docs/models/ideogram-3-0-edit/schema.json |
| runware | `ideogram:4@5` | https://runware.ai/docs/models/ideogram-3-0-replace-background | 200 | https://runware.ai/docs/models/ideogram-3-0-replace-background/schema.json |
| runware | `ideogram:4@q` | https://runware.ai/docs/models/ideogram-4-0q | 200 | https://runware.ai/docs/models/ideogram-4-0q/schema.json |
| runware | `ideogram:4@remix` | https://runware.ai/docs/models/ideogram-4-0-remix | 200 | https://runware.ai/docs/models/ideogram-4-0-remix/schema.json |
| runware | `imagineart:1.5-pro@0` | https://runware.ai/docs/models/imagineart-1-5-pro | 200 | https://runware.ai/docs/models/imagineart-1-5-pro/schema.json |
| runware | `imagineart:1@5` | https://runware.ai/docs/models/imagineart-1-5 | 200 | https://runware.ai/docs/models/imagineart-1-5/schema.json |
| runware | `imagineart:2.0@0` | https://runware.ai/docs/models/imagineart-2-0 | 200 | https://runware.ai/docs/models/imagineart-2-0/schema.json |
| runware | `klingai:kling-image@3` | https://runware.ai/docs/models/klingai-image-3-0 | 200 | https://runware.ai/docs/models/klingai-image-3-0/schema.json |
| runware | `klingai:kling-image@o1` | https://runware.ai/docs/models/klingai-image-o1 | 200 | https://runware.ai/docs/models/klingai-image-o1/schema.json |
| runware | `klingai:kling-image@o3` | https://runware.ai/docs/models/klingai-image-o3 | 200 | https://runware.ai/docs/models/klingai-image-o3/schema.json |
| runware | `krea:krea@2-large` | https://runware.ai/docs/models/krea-2-large | 200 | https://runware.ai/docs/models/krea-2-large/schema.json |
| runware | `krea:krea@2-medium` | https://runware.ai/docs/models/krea-2-medium | 200 | https://runware.ai/docs/models/krea-2-medium/schema.json |
| runware | `krea:krea@2-medium-turbo` | https://runware.ai/docs/models/krea-2-medium-turbo | 200 | https://runware.ai/docs/models/krea-2-medium-turbo/schema.json |
| runware | `krea:krea@2-raw` | https://runware.ai/docs/models/krea-2-raw | 200 | https://runware.ai/docs/models/krea-2-raw/schema.json |
| runware | `krea:krea@2-turbo` | https://runware.ai/docs/models/krea-2-turbo | 200 | https://runware.ai/docs/models/krea-2-turbo/schema.json |
| runware | `luma:uni@1` | https://runware.ai/docs/models/luma-uni-1 | 200 | https://runware.ai/docs/models/luma-uni-1/schema.json |
| runware | `luma:uni@1-max` | https://runware.ai/docs/models/luma-uni-1-max | 200 | https://runware.ai/docs/models/luma-uni-1-max/schema.json |
| runware | `meta:muse@image` | https://runware.ai/docs/models/meta-muse-image | 200 | https://runware.ai/docs/models/meta-muse-image/schema.json |
| runware | `minimax:m2.7@0` | https://runware.ai/docs/models/minimax-m2-7 | 200 | https://runware.ai/docs/models/minimax-m2-7/schema.json |
| runware | `minimax:m2.7@highspeed` | https://runware.ai/docs/models/minimax-m2-7-highspeed | 200 | https://runware.ai/docs/models/minimax-m2-7-highspeed/schema.json |
| runware | `minimax:m3@0` | https://runware.ai/docs/models/minimax-m3 | 200 | https://runware.ai/docs/models/minimax-m3/schema.json |
| runware | `openai:1@1` | https://developers.openai.com/api/docs/models/gpt-image-1 | 200 | https://runware.ai/docs/models/openai-gpt-image-1/schema.json |
| runware | `openai:1@2` | https://runware.ai/docs/models/openai-gpt-image-1-mini | 200 | https://runware.ai/docs/models/openai-gpt-image-1-mini/schema.json |
| runware | `openai:4@1` | https://runware.ai/docs/models/openai-gpt-image-1-5 | 200 | https://runware.ai/docs/models/openai-gpt-image-1-5/schema.json |
| runware | `openai:gpt-image@2` | https://runware.ai/docs/models/openai-gpt-image-2 | 200 | https://runware.ai/docs/models/openai-gpt-image-2/schema.json |
| runware | `openai:gpt-image@2.5-flare` | https://runware.ai/docs/models/openai-gpt-image-2-5-flare | 200 | https://runware.ai/docs/models/openai-gpt-image-2-5-flare/schema.json |
| runware | `openai:gpt-image@2.5-sunburst` | https://runware.ai/docs/models/openai-gpt-image-2-5-sunburst | 200 | https://runware.ai/docs/models/openai-gpt-image-2-5-sunburst/schema.json |
| runware | `openai:gpt@5-mini` | https://runware.ai/docs/models/openai-gpt-5-mini | 200 | https://runware.ai/docs/models/openai-gpt-5-mini/schema.json |
| runware | `openai:gpt@5-nano` | https://runware.ai/docs/models/openai-gpt-5-nano | 200 | https://runware.ai/docs/models/openai-gpt-5-nano/schema.json |
| runware | `openai:gpt@5.4` | https://runware.ai/docs/models/openai-gpt-5-4 | 200 | https://runware.ai/docs/models/openai-gpt-5-4/schema.json |
| runware | `openai:gpt@5.4-mini` | https://runware.ai/docs/models/openai-gpt-5-4-mini | 200 | https://runware.ai/docs/models/openai-gpt-5-4-mini/schema.json |
| runware | `openai:gpt@5.4-nano` | https://runware.ai/docs/models/openai-gpt-5-4-nano | 200 | https://runware.ai/docs/models/openai-gpt-5-4-nano/schema.json |
| runware | `openai:gpt@5.4-pro` | https://runware.ai/docs/models/openai-gpt-5-4-pro | 200 | https://runware.ai/docs/models/openai-gpt-5-4-pro/schema.json |
| runware | `openai:gpt@5.5` | https://runware.ai/docs/models/openai-gpt-5-5 | 200 | https://runware.ai/docs/models/openai-gpt-5-5/schema.json |
| runware | `prunaai:1@1` | https://runware.ai/docs/models/prunaai-p-image | 200 | https://runware.ai/docs/models/prunaai-p-image/schema.json |
| runware | `prunaai:2@1` | https://runware.ai/docs/models/prunaai-p-image-edit | 200 | https://runware.ai/docs/models/prunaai-p-image-edit/schema.json |
| runware | `prunaai:p-image@ideogram` | https://runware.ai/docs/models/prunaai-p-image-ideogram | 200 | https://runware.ai/docs/models/prunaai-p-image-ideogram/schema.json |
| runware | `recraft:v4-pro@0` | https://runware.ai/docs/models/recraft-v4-pro | 200 | https://runware.ai/docs/models/recraft-v4-pro/schema.json |
| runware | `recraft:v4.1-pro@0` | https://runware.ai/docs/models/recraft-v4-1-pro | 200 | https://runware.ai/docs/models/recraft-v4-1-pro/schema.json |
| runware | `recraft:v4.1-utility-pro@0` | https://runware.ai/docs/models/recraft-v4-1-utility-pro | 200 | https://runware.ai/docs/models/recraft-v4-1-utility-pro/schema.json |
| runware | `recraft:v4.1-utility@0` | https://runware.ai/docs/models/recraft-v4-1-utility | 200 | https://runware.ai/docs/models/recraft-v4-1-utility/schema.json |
| runware | `recraft:v4.1@0` | https://runware.ai/docs/models/recraft-v4-1 | 200 | https://runware.ai/docs/models/recraft-v4-1/schema.json |
| runware | `recraft:v4@0` | https://runware.ai/docs/models/recraft-v4 | 200 | https://runware.ai/docs/models/recraft-v4/schema.json |
| runware | `rundiffusion:110@101` | https://runware.ai/docs/models/rundiffusion-juggernaut-lightning-flux | 200 | https://runware.ai/docs/models/rundiffusion-juggernaut-lightning-flux/schema.json |
| runware | `rundiffusion:120@100` | https://runware.ai/docs/models/rundiffusion-juggernaut-base-flux | 200 | https://runware.ai/docs/models/rundiffusion-juggernaut-base-flux/schema.json |
| runware | `rundiffusion:130@100` | https://runware.ai/docs/models/rundiffusion-juggernaut-pro-flux | 200 | https://runware.ai/docs/models/rundiffusion-juggernaut-pro-flux/schema.json |
| runware | `rundiffusion:200@100` | https://runware.ai/docs/models/rundiffusion-juggernaut-z | 200 | https://runware.ai/docs/models/rundiffusion-juggernaut-z/schema.json |
| runware | `rundiffusion:300@100` | https://runware.ai/docs/models/rundiffusion-juggernaut-z-fast | 200 | https://runware.ai/docs/models/rundiffusion-juggernaut-z-fast/schema.json |
| runware | `runware:100@1` | https://runware.ai/docs/models/bfl-flux-1-schnell | 200 | https://runware.ai/docs/models/bfl-flux-1-schnell/schema.json |
| runware | `runware:101@1` | https://runware.ai/docs/models/bfl-flux-1-dev | 200 | https://runware.ai/docs/models/bfl-flux-1-dev/schema.json |
| runware | `runware:102@1` | https://runware.ai/docs/models/bfl-flux-1-fill-dev | 200 | https://runware.ai/docs/models/bfl-flux-1-fill-dev/schema.json |
| runware | `runware:106@1` | https://runware.ai/docs/models/bfl-flux-1-kontext-dev | 200 | https://runware.ai/docs/models/bfl-flux-1-kontext-dev/schema.json |
| runware | `runware:107@1` | https://runware.ai/docs/models/krea-flux-1-krea-dev | 200 | https://runware.ai/docs/models/krea-flux-1-krea-dev/schema.json |
| runware | `runware:108@1` | https://runware.ai/docs/models/alibaba-qwen-image | 200 | https://runware.ai/docs/models/alibaba-qwen-image/schema.json |
| runware | `runware:108@20` | https://runware.ai/docs/models/alibaba-qwen-image-edit | 200 | https://runware.ai/docs/models/alibaba-qwen-image-edit/schema.json |
| runware | `runware:108@22` | https://runware.ai/docs/models/alibaba-qwen-image-edit-plus | 200 | https://runware.ai/docs/models/alibaba-qwen-image-edit-plus/schema.json |
| runware | `runware:111@1` | https://runware.ai/docs/models/flux-1-dev-srpo | 200 | https://runware.ai/docs/models/flux-1-dev-srpo/schema.json |
| runware | `runware:150@2` | https://runware.ai/docs/models/meta-llava-1-6-mistral-7b | 200 | https://runware.ai/docs/models/meta-llava-1-6-mistral-7b/schema.json |
| runware | `runware:152@1` | https://runware.ai/docs/models/alibaba-qwen2-5-vl-3b-instruct | 200 | https://runware.ai/docs/models/alibaba-qwen2-5-vl-3b-instruct/schema.json |
| runware | `runware:152@2` | https://runware.ai/docs/models/alibaba-qwen2-5-vl-7b-instruct | 200 | https://runware.ai/docs/models/alibaba-qwen2-5-vl-7b-instruct/schema.json |
| runware | `runware:201@10` | https://runware.ai/docs/models/alibaba-wan2-5-preview-image | 200 | https://runware.ai/docs/models/alibaba-wan2-5-preview-image/schema.json |
| runware | `runware:400@1` | https://runware.ai/docs/models/bfl-flux-2-dev | 200 | https://runware.ai/docs/models/bfl-flux-2-dev/schema.json |
| runware | `runware:400@2` | https://runware.ai/docs/models/bfl-flux-2-klein-9b | 200 | https://runware.ai/docs/models/bfl-flux-2-klein-9b/schema.json |
| runware | `runware:400@3` | https://runware.ai/docs/models/bfl-flux-2-klein-9b-base | 200 | https://runware.ai/docs/models/bfl-flux-2-klein-9b-base/schema.json |
| runware | `runware:400@4` | https://runware.ai/docs/models/bfl-flux-2-klein-4b | 200 | https://runware.ai/docs/models/bfl-flux-2-klein-4b/schema.json |
| runware | `runware:400@5` | https://runware.ai/docs/models/bfl-flux-2-klein-4b-base | 200 | https://runware.ai/docs/models/bfl-flux-2-klein-4b-base/schema.json |
| runware | `runware:400@6` | https://runware.ai/docs/models/bfl-flux-2-klein-9b-kv | 200 | https://runware.ai/docs/models/bfl-flux-2-klein-9b-kv/schema.json |
| runware | `runware:5@1` | https://runware.ai/docs/models/stabilityai-stable-diffusion-3 | 200 | https://runware.ai/docs/models/stabilityai-stable-diffusion-3/schema.json |
| runware | `runware:97@1` | https://runware.ai/docs/models/hidream-i1-full | 200 | https://runware.ai/docs/models/hidream-i1-full/schema.json |
| runware | `runware:97@2` | https://runware.ai/docs/models/hidream-i1-dev | 200 | https://runware.ai/docs/models/hidream-i1-dev/schema.json |
| runware | `runware:97@3` | https://runware.ai/docs/models/hidream-i1-fast | 200 | https://runware.ai/docs/models/hidream-i1-fast/schema.json |
| runware | `runware:kandinsky-5.0-image-lite@1` | https://runware.ai/docs/models/kandinsky-5-0-image-lite | 200 | https://runware.ai/docs/models/kandinsky-5-0-image-lite/schema.json |
| runware | `runware:twinflow-z-image-turbo@0` | https://runware.ai/docs/models/twinflow-z-image-turbo | 200 | https://runware.ai/docs/models/twinflow-z-image-turbo/schema.json |
| runware | `runware:z-image@0` | https://runware.ai/docs/models/alibaba-z-image | 200 | https://runware.ai/docs/models/alibaba-z-image/schema.json |
| runware | `runware:z-image@turbo` | https://runware.ai/docs/models/alibaba-z-image-turbo | 200 | https://runware.ai/docs/models/alibaba-z-image-turbo/schema.json |
| runware | `runway:4@1` | https://runware.ai/docs/models/runway-gen-4-image | 200 | https://runware.ai/docs/models/runway-gen-4-image/schema.json |
| runware | `runway:4@2` | https://runware.ai/docs/models/runway-gen-4-image-turbo | 200 | https://runware.ai/docs/models/runway-gen-4-image-turbo/schema.json |
| runware | `sourceful:riverflow-2.0@fast` | https://runware.ai/docs/models/sourceful-riverflow-2-0-fast | 200 | https://runware.ai/docs/models/sourceful-riverflow-2-0-fast/schema.json |
| runware | `sourceful:riverflow-2.0@pro` | https://runware.ai/docs/models/sourceful-riverflow-2-0-pro | 200 | https://runware.ai/docs/models/sourceful-riverflow-2-0-pro/schema.json |
| runware | `sourceful:riverflow-2.5@fast` | https://runware.ai/docs/models/sourceful-riverflow-2-5-fast | 200 | https://runware.ai/docs/models/sourceful-riverflow-2-5-fast/schema.json |
| runware | `sourceful:riverflow-2.5@pro` | https://runware.ai/docs/models/sourceful-riverflow-2-5-pro | 200 | https://runware.ai/docs/models/sourceful-riverflow-2-5-pro/schema.json |
| runware | `vidu:q1@image` | https://runware.ai/docs/models/vidu-q1-image | 200 | https://runware.ai/docs/models/vidu-q1-image/schema.json |
| runware | `xai:grok-imagine@image` | https://runware.ai/docs/models/xai-grok-imagine-image | 200 | https://runware.ai/docs/models/xai-grok-imagine-image/schema.json |
| runware | `xai:grok-imagine@image-2.0` | https://runware.ai/docs/models/xai-grok-imagine-image-2-0 | 200 | https://runware.ai/docs/models/xai-grok-imagine-image-2-0/schema.json |
| runware | `xai:grok-imagine@image-quality` | https://docs.x.ai/developers/migration/imagine-image-quality-nov-2 | 200 | https://runware.ai/docs/models/xai-grok-imagine-image-quality/schema.json |
| runware | `xai:grok@4.3` | https://runware.ai/docs/models/xai-grok-4-3 | 200 | https://runware.ai/docs/models/xai-grok-4-3/schema.json |
| runware | `zai:glm@5.1` | https://runware.ai/docs/models/zai-glm-5-1 | 200 | https://runware.ai/docs/models/zai-glm-5-1/schema.json |
| stability | `sd3.5-flash` | https://docs.stability.ai/api-reference/generate/stable-diffusion-35 | 200 | https://platform.stability.ai/docs/getting-started/models |
| stepfun | `step-3.5-flash` | https://platform.stepfun.com/docs/zh/guides/models/step-3.5-flash | 200 | https://platform.stepfun.com/docs/zh/guides/models/list |
| stepfun | `step-3.5-flash-2603` | https://platform.stepfun.com/docs/zh/guides/models/step-3.5-flash | 200 | https://platform.stepfun.com/docs/zh/guides/models/list |
| stepfun | `step-3.7-flash` | https://platform.stepfun.com/docs/zh/guides/models/step-3.7-flash | 200 | https://platform.stepfun.com/docs/zh/guides/models/list |
| stepfun | `step-5-preview` | https://platform.stepfun.com/docs/zh/guides/models/step-5-preview | 200 | https://platform.stepfun.com/docs/zh/guides/models/list |
| tokendance | `deepseek-chat-v3-0324` | https://api-docs.deepseek.com/news/news250325 | 200 | https://tokendance.space/gateway/v1/models |
| tokendance | `deepseek-v4-pro` | https://tokendance.space/models/deepseek-v4-pro | 200 | https://api-docs.deepseek.com/quick_start/pricing/ |
| tokendance | `deepseek-v4-pro-0813` | https://tokendance.space/models/deepseek-v4-pro-0813 | 200 | https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813 |
| tokendance | `deepseek-v4.1-flash` | https://tokendance.space/models/deepseek-v4.1-flash | 200 | https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash |
| tokendance | `deepseek-v4.1-flash-1017` | https://tokendance.space/models/deepseek-v4.1-flash-1017 | 200 | https://tokendance.space/gateway/v1/models |
| tokendance | `dots-3-note-preview` | https://tokendance.space/models/dots-3-note-preview | 200 | https://github.com/studio-dots-ai/dots3-note-prev |
| tokendance | `glm-4.5-air` | https://tokendance.space/models/glm-4.5-air | 200 | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.5 |
| tokendance | `glm-4.6v` | https://tokendance.space/models/glm-4.6v | 200 | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.6v |
| tokendance | `glm-4.7` | https://tokendance.space/models/glm-4.7 | 200 | https://docs.bigmodel.cn/cn/guide/models/text/glm-4.7 |
| tokendance | `glm-5` | https://tokendance.space/models/glm-5 | 200 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5 |
| tokendance | `glm-5.1` | https://tokendance.space/models/glm-5.1 | 200 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1 |
| tokendance | `glm-5.2` | https://tokendance.space/models/glm-5.2 | 200 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2 |
| tokendance | `glm-5.3` | https://tokendance.space/models/glm-5.3 | 200 | https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3 |
| tokendance | `glm-5.3-flash` | https://tokendance.space/models/glm-5.3-flash | 200 | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash |
| tokendance | `glm-5.3-flashx` | https://tokendance.space/models/glm-5.3-flashx | 200 | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash |
| tokendance | `glm-5v-turbo` | https://tokendance.space/models/glm-5v-turbo | 200 | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5v-turbo |
| tokendance | `hy4-preview` | https://tokendance.space/models/hy4-preview | 200 | https://huggingface.co/tencent/Hy4-preview |
| tokendance | `kimi-k2.5` | https://tokendance.space/models/kimi-k2.5 | 200 | https://huggingface.co/moonshotai/Kimi-K2.5 |
| tokendance | `kimi-k2.6` | https://tokendance.space/models/kimi-k2.6 | 200 | https://huggingface.co/moonshotai/Kimi-K2.6 |
| tokendance | `kimi-k2.7-code` | https://tokendance.space/models/kimi-k2.7-code | 200 | https://huggingface.co/moonshotai/Kimi-K2.7-Code |
| tokendance | `kimi-k3` | https://tokendance.space/models/kimi-k3 | 200 | https://huggingface.co/moonshotai/Kimi-K3 |
| tokendance | `kimi-k3.1-pro` | https://tokendance.space/models/kimi-k3.1-pro | 200 | https://tokendance.space/gateway/v1/models |
| tokendance | `ling-3.0-flash` | https://tokendance.space/models/ling-3.0-flash | 200 | https://huggingface.co/inclusionAI/Ling-3.0-flash |
| tokendance | `longcat-2.0` | https://tokendance.space/models/longcat-2.0 | 200 | https://huggingface.co/meituan-longcat/LongCat-2.0 |
| tokendance | `mimo-v2.5` | https://tokendance.space/models/mimo-v2.5 | 200 | https://mimo.mi.com/docs/zh-CN/updates/deprecate |
| tokendance | `mimo-v2.5-pro` | https://tokendance.space/models/mimo-v2.5-pro | 200 | https://mimo.mi.com/docs/zh-CN/updates/deprecate |
| tokendance | `mimo-v2.6-flash` | https://tokendance.space/models/mimo-v2.6-flash | 200 | https://mimo.mi.com/models/en-US/mimo-v2.6-flash |
| tokendance | `mimo-v2.6-pro` | https://tokendance.space/models/mimo-v2.6-pro | 200 | https://mimo.mi.com/models/en-US/mimo-v2.6-pro |
| tokendance | `mimo-v2.6-ultraspeed` | https://tokendance.space/models/mimo-v2.6-ultraspeed | 200 | https://mimo.mi.com/models/zh-CN/mimo-v2.6-pro-ultraspeed |
| tokendance | `minimax-m2.5` | https://tokendance.space/models/minimax-m2.5 | 200 | https://huggingface.co/MiniMaxAI/MiniMax-M2.5 |
| tokendance | `minimax-m2.7` | https://tokendance.space/models/minimax-m2.7 | 200 | https://huggingface.co/MiniMaxAI/MiniMax-M2.7 |
| tokendance | `minimax-m3` | https://tokendance.space/models/minimax-m3 | 200 | https://huggingface.co/MiniMaxAI/MiniMax-M3 |
| tokendance | `minimax-m3.1-flash` | https://tokendance.space/models/minimax-m3.1-flash | 200 | https://tokendance.space/gateway/v1/models |
| tokendance | `qwen3-max` | https://help.aliyun.com/zh/model-studio/models | 200 | https://tokendance.space/gateway/v1/models |
| tokendance | `qwen3-vl-plus` | https://tokendance.space/models/qwen3-vl-plus | 200 | https://platform.qianwenai.com/docs/developer-guides/getting-started/vision-models |
| tokendance | `qwen3.5-35b-a3b` | https://tokendance.space/models/qwen3.5-35b-a3b | 200 | https://help.aliyun.com/zh/model-studio/models |
| tokendance | `qwen3.5-flash` | https://tokendance.space/models/qwen3.5-flash | 200 | https://help.aliyun.com/zh/model-studio/models |
| tokendance | `qwen3.5-plus` | https://tokendance.space/models/qwen3.5-plus | 200 | https://help.aliyun.com/zh/model-studio/model-depreciation |
| tokendance | `qwen3.6-plus` | https://tokendance.space/models/qwen3.6-plus | 200 | https://help.aliyun.com/zh/model-studio/models |
| tokendance | `qwen3.7-max` | https://tokendance.space/models/qwen3.7-max | 200 | https://help.aliyun.com/zh/model-studio/models |
| tokendance | `qwen3.7-plus` | https://tokendance.space/models/qwen3.7-plus | 200 | https://help.aliyun.com/zh/model-studio/models |
| tokendance | `qwen3.8-flash` | https://tokendance.space/models/qwen3.8-flash | 200 | https://help.aliyun.com/zh/model-studio/vision-model |
| tokendance | `qwen3.8-max` | https://tokendance.space/models/qwen3.8-max | 200 | https://help.aliyun.com/zh/model-studio/qwen3-8-max |
| tokendance | `qwen3.8-max-0902` | https://tokendance.space/models/qwen3.8-max-0902 | 200 | https://help.aliyun.com/zh/model-studio/models |
| tokendance | `seed-2.0-lite` | https://tokendance.space/models/seed-2.0-lite | 200 | https://www.volcengine.com/docs/82379/1330310 |
| tokendance | `seed-2.0-mini` | https://tokendance.space/models/seed-2.0-mini | 200 | https://www.volcengine.com/docs/82379/1330310 |
| tokendance | `seed-2.0-pro` | https://tokendance.space/models/seed-2.0-pro | 200 | https://www.volcengine.com/docs/82379/1330310 |
| tokendance | `seed-2.1-turbo` | https://tokendance.space/models/seed-2.1-turbo | 200 | https://www.volcengine.com/docs/82379/1330310 |
| tokendance | `seed-evolving` | https://tokendance.space/models/seed-evolving | 200 | https://www.volcengine.com/docs/82379/1330310 |
| tokendance | `spark-x2.5-1.7b` | https://tokendance.space/models/spark-x2.5-1.7b | 200 | https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 |
| tokendance | `spark-x2.5-4b` | https://tokendance.space/models/spark-x2.5-4b | 200 | https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 |
| tokendance | `step-3.5-flash` | https://tokendance.space/models/step-3.5-flash | 200 | https://platform.stepfun.com/docs/zh/guides/models/list |
| tokendance | `step-3.7-flash` | https://tokendance.space/models/step-3.7-flash | 200 | https://platform.stepfun.com/docs/zh/guides/models/list |
| tokendance | `step-5-preview` | https://tokendance.space/models/step-5-preview | 200 | https://platform.stepfun.com/docs/zh/guides/models/list |
| xiaomi | `mimo-v2.6-flash` | https://mimo.mi.com/models/en-US/mimo-v2.6-flash | 200 | https://mimo.mi.com/docs/zh-CN/quick-start/summary/model |
| xiaomi | `mimo-v2.6-pro` | https://mimo.mi.com/models/en-US/mimo-v2.6-pro | 200 | https://mimo.mi.com/docs/zh-CN/quick-start/summary/model |

### R12D 离线验证（历史记录，R13 结果见上）

- Web 受影响测试 **112/112** 通过，失败/跳过均为 0；当前链接与普通/紧凑 DOM 从 R11 的 46 条历史样本扩展到全部 **397** 条，精确核对完整对象差异、时间、HTML content-type、7 个例外、状态统计和两张文档表。
- scripts 全套 **35/35** 通过，失败/跳过均为 0；含 R10/R11 离线报告一致性及既有小程序包体预算验证。R12 清单 `--check` 通过，397 项链接和原因清单无漂移。
- 开始/结束文件 SHA-256 对比确认：本轮仅修改主审计文档、`SYNC.md`、R11/R12 Web 测试及新增最终 HTTP 夹具，共 **5** 个文件；已有其他工作区改动保留，产品源码、共享事实、卡片链接、UI 和生成产物未改。

复现命令（Web 命令在 `apps/web` 执行，其余在仓库根目录执行）：

```sh
node --import tsx --import ./tests/dom-setup.mjs --test tests/model-audit*.test.mjs tests/model-specifications.test.mjs tests/provider-catalogs.test.mjs tests/workspace-model-catalog.test.mjs
node --test scripts/*.test.mjs
node scripts/report-model-card-r12.mjs --check
```

## R12C：恢复模型专属链接与精确 API 识别（当前验收）

按 `.audit-input/r12/CODEX_TASK_R12C.md` 完成。本轮保留已有工作区改动，只运行 Git 只读命令；基线 `../Tuyan-wt-baseline` 只读，无付费/真实推理、部署或依赖安装。下面 R12/R12B 的 467 项清单与宽泛 `/api/` 规则是历史记录，当前以本节和重新生成的 [最终链接清单](model-card-audit-20261109-r12-links.md) 为准。

### 修复与证据

- 精确识别 API/JSON：`api.` 主机的 models 列表、`/gateway/`、`/v\d+/models` 边界、`/api/v\d+/`、`.json` / `schema.json`、已记录 JSON content-type 及其重定向；不再把普通 `/api/` 文档路径当 API。
- OpenAI **71** 卡与 Together **3** 卡恢复 R11 原模型文档，包括 `.md`，未臆造无后缀页面。Replicate 的 R12“94 API 项”实际是 **90** 个 schema 端点加 **4** 个被误判的 OpenAI 文档；90 个 schema 转同 owner/model 主页，4 个原厂文档保留，另有 4 个原 collection 首链接提升到已有同型号主页。
- fal 的 R12“44 API 项”实际是 **37** 个 API 模型列表加 **7** 个人可读型号 `/api` 页；37 个列表替换为同型号页面，7 个原页面保留。Runware 的 **145** 个 schema 首链接继续使用已有捕获的人可读型号文档，不按未核实的 schema 路径构造新文档。
- 不再把欢迎页、接口方法文档或 API reference 索引当作型号页。StepFun 保留模型总表，存在已捕获具体页的 4 卡优先具体页；硅基 `deepseek-ai/DeepSeek-V4.1-Flash` 恢复 models 页；Stability `sd3.5-flash` 使用已捕获的 Stable Diffusion 3.5 文档。百炼 **44** 项具体页提升保留，`qwen3.5-plus` 三卡仍在下线前后优先“下线公告”。
- TokenDance 夹具完整替换为操作方 **74** 条 Chrome 记录（`2026-11-09T10:28:01.453Z`）：**67** 个成功页全部使用 `https://tokendance.space/models/<id>`；**7** 个失败页全部使用已有原厂文档。失败名单：`deepseek-chat-v3-0324`、`deepseek-v3.2`、`deepseek-v4-flash`、`deepseek-v4-flash-vision-exp`、`qwen3-30b-a3b-instruct-2507`、`qwen3-max`、`qwen3.6-max-preview`。状态 200 不被当作渲染出指定模型的证明；失败页不进入可见来源。
- 完整 Core + 3 静态身份与纯静态目录分别 **1064** 卡对照 R11；无未解释的具体程度下降、无 API/JSON 可见首链接。仅 **9 个型号 / 18 条投影记录**允许 API/JSON → 通用文档：讯飞 7 个、TokenDance `deepseek-chat-v3-0324` / `qwen3-max`。每项旧/新 URL、理由和可用人可读来源列于 `apps/web/tests/fixtures/r12-specificity-exceptions.json`；测试验证旧链接必须为 API/JSON、无具体来源可选、且无多余例外。这里只表示捕获证据未含具体页，不声称全网不存在。

### 最终变化：按渠道与原因

使用完整 Core model 对象及 3 个静态独有对象，各侧读取自己的卡片代码/数据：相对 R8 `785b99df` 共 **397** 项，相对 R11 `6d88b28f` 共 **405** 项。交付 `.audit-input/r12/final-changed-links.json` 与仓库夹具逐字相同；每行保持 channel / modelId / oldUrl / finalUrl。分类交付 `.audit-input/r12/link-change-summary.json`；完整旧/新 URL 见 [R12C 链接清单](model-card-audit-20261109-r12-links.md)。

| 渠道 | R8 → 最终变化原因 | 卡数 |
| --- | --- | ---: |
| antling | 保留 R9–R11 渠道来源优先 | 5 |
| bailian | 保留 R9–R11 渠道来源优先 | 1 |
| bailian | 渠道具体型号页优先于总表 | 44 |
| fal | API/JSON 替换为同型号人可读页 | 37 |
| iflytek | API/JSON 无具体人可读页，按夹具回退 | 7 |
| kimi | 渠道具体型号页优先于总表 | 3 |
| replicate | API/JSON 替换为同型号人可读页 | 90 |
| replicate | 渠道具体型号页优先于总表 | 4 |
| runware | API/JSON 替换为同型号人可读页 | 145 |
| stability | 渠道具体型号页优先于总表 | 1 |
| stepfun | 渠道具体型号页优先于总表 | 4 |
| tokendance | API/JSON 无具体人可读页，按夹具回退 | 2 |
| tokendance | Chrome 核实的渠道型号页 | 52 |
| xiaomi | 渠道具体型号页优先于总表 | 2 |

OpenAI、Together、硅基对应首链接恢复后与 R8 相同，因此不出现在上表。百炼 3 个下线公告、3 个恢复 R8 具体页也不计入 R8 变化；上表 45 = 44 个具体页提升 + 1 个已有渠道来源优先。TokenDance 的 54 = 52 个相对 R8 变化的已核实页 + 2 个原厂回退，并非仅核实 52 页。精确规则下完整目录 API/JSON 替换 **341** 项，另有 **5** 个仅静态投影身份；来源清单和报告均已按新规则重算。

**R12D 已补齐最终 URL 的 HTTP 检查**，见[最终检查与完整 397 行表](#r12d最终链接-http-检查当前验收)。R11 的旧 46 项 200 与 TokenDance 渲染记录均未外推到其他 URL。

### R11 复算、包体与验证

- R11 计数、逐渠道统计、损失列表、misleading JSON/Markdown 均复算且与本轮开始时逐字一致。完整 Core main/head 1122/1061 卡，四项已知数（输入/输出/上下文/最大输出）仍为 **983/968/534/0 → 997/967/926/616**；未解释损失 **0**，模态待复核仍 **27 卡 / 30 项**。已捕获显示事实、来源事实数组、角色、生命周期、移除数据均未改。
- R10 来源差异报告随链接重新生成：sourceDiff **623**、modalityDiff **614**、eitherDiff **698/1061**、同表未知 **34**；来源变化不会增加模态证据。
- 小程序源码 **1,567,582 bytes**，比任务起点 **1,569,251** 减少 **1,669**；距未改动的 **1,572,864** 上限余 **5,282**。runtime **1,144,298**、媒体 **189,978**、`model-audit-data.js` **35,464 bytes**。生成前先计算预算，再用已解析的完整 URL 与现有模型 ID 做精确可逆模板压缩；没有推断链接。全 1064 卡对照 Web 的字段、限定词、备注、来源类别、标签和最终 URL，TokenDance 67/7 的展示同样通过。
- Web 受影响测试 **163/163**，小程序全套 **140/140**，scripts **35/35**，Core 审计/HTTP **8/8**，Gateway 审计 **6/6**。旧 `/api` 误判断言改为明确保留人可读页，同时补充真正 `/api/v1/models` / JSON 的排除断言；未删除测试、跳过断言或放宽预算。
- 审计、目录、参考上传、thinking 生成及 `--check`，R10/R12 报告 `--check`，R11 只读基线和 frozen-main 两种 `--check` 通过。Web build、小程序 build/check 通过；Web 只有既有大 chunk 提示。
- 本轮验证流：完整/紧凑模型卡 → 首链接与来源弹层 → 对应型号页/原厂回退/下线公告；DOM 回归通过。Browser 插件不可用；`pnpm --dir apps/web exec playwright --version` 返回 `Command "playwright" not found`，本轮没有真实浏览器截图、导航或控制台验收。操作方提供的 Chrome 渲染证据与本地 DOM 验证分别记录。小程序原生扫描及暂停发布状态沿用。

<a id="r12--r12b首链接规则与小程序包体当前验收"></a>

## R12 / R12B：首链接规则与小程序包体（历史验收，R12C 已修正）

保留已有 R12 修改，在本工作树完成；未运行 Git 写命令，未写入 `../Tuyan-wt-baseline`，无真实/付费模型调用或部署。四项显示事实、模态排除、角色、请求参数、权限及选择合同不变；389 项差异及百炼 20 卡仍未批量修正。逐项对比 R11 生成数据，facts / fields / rows / notices / removed 和已有详情完全相同；Web/API 保留完整来源证据。

### 首链接与最终检查清单

- 生命周期为 scheduled / retired 时，下线公告 URL 或 lifecycle / retirement-notice 标签优先，标签为“下线公告”。完整 R11 registry 的百炼 `qwen3.5-plus`、`qwen3.5-plus-2026-02-15`、`qwen3.5-plus-2026-04-20` 覆盖下线前后与普通/紧凑 DOM。
- 可见来源过滤路径 `/v\d+/models`、`/gateway/`、独立 `/api/` 段、`.json` 后缀，以及检查记录为 JSON content-type 的 URL；重定向到上述路径也排除。`api-reference` 不属于独立 `api` 段。来源证据原文不删除。
- 操作方 Chrome 渲染核实的 **38** 个 TokenDance 型号页通过 supplement / generator 登记为 channel model-page，`checkedAt=2026-11-09`；未硬编码在 UI。其余原 API 首链接回退到已有原厂文档。4 个已有 2026-10-09 规格证据的型号页保持原链接，不冒充本次 Chrome 核实，也不新增模板标记。
- 已有渠道首链接为总表时优先该渠道具体型号页；百炼 `qwen3.8-max`、`qwen3.7-max-2026-06-08`、`qwen3.8-flash` 恢复 R8 的 qwen3-8-max / qwen3-7-max / vision-model 页面。其余原有链接次序保留，不把原厂页批量换成渠道总表。

完整 Core 1061 卡 + 3 个仅静态身份，相对 R8/pre-R9 `785b99df` 共 **467** 张最终首链接变化。复现脚本为 `scripts/report-model-card-r12.mjs`，交付 `.audit-input/r12/final-changed-links.json`，每项仅含 channel / modelId / oldUrl / finalUrl；仓库离线夹具为 `apps/web/tests/fixtures/r12-final-changed-links.json`。R8、R11 和当前侧均使用自己的来源代码及数据、同一完整 model 对象；因此旧静态口径“46”不能直接当本轮分母。

原首链接命中 API/JSON 的 **427** 卡：TokenDance 62、Runware 145、Replicate 94、OpenAI 71、fal 44、讯飞 7、Together 3、LongCat 1。包括 `maas.xfyun.cn/api/v1/...` 等既有原链接。完整逐卡旧/新 URL 见 [R12 链接列表](model-card-audit-20261109-r12-links.md) 与 `.audit-input/r12/api-source-replacements.json`；最终 Web 完整/静态目录和小程序静态目录均无可见 API/JSON 来源。另有 7 个仅静态对象命中的身份（BFL 2、LongCat 1、TokenDance 4），与上述 427 合计 434 个身份；逐项见同一链接列表的“静态卡片补充”和 `.audit-input/r12/static-api-source-replacements.json`。

**本历史轮次的 HTTP 待办已由 R12D 最终检查替代。** 本轮未冒用 R11 的 46 项 200 结果；38 个 TokenDance 页的 Chrome 渲染证据按操作方提供的文件保留，不代替全部最终 URL 的 HTTP 复核。

### R11 复算（无变化）

读取原始完整 registry-main/head，main 代码只读导入；同时运行 frozen-main 离线重现。计数和逐渠道结果、损失表、misleading JSON/Markdown 与 R11 逐字一致，未解释损失仍为 0。四项依次为输入 / 输出 / 上下文 / 最大输出，“不适用”仍按非未知计入。

| 口径 | 模型数 main → head | main 四项 | head 四项 |
| --- | --- | --- | --- |
| 完整 Core 对象 | 1122 → 1061 | 983 / 968 / 534 / 0 | 997 / 967 / 926 / 616 |
| ID-only 对照 | 1122 → 1061 | 199 / 200 / 141 / 0 | 403 / 397 / 390 / 260 |

R10 的来源差异审计随本轮链接规则重新生成：sourceDiff **460**、modalityDiff **614**、eitherDiff **661 / 1061**、同表格仍未知 **34**；这只是报告重算，模态数据未修改。下方 R11 的 561 / 614 / 623 是历史轮次结果。

模态待复核仍 **27 卡 / 30 项**：fal 15（input/image 14、output/text 1），ideogram 1（input/image），qianfan 9（input/image 2、input/video 7），replicate 4（input/file、input/image、input/video、output/text 各 1），sensenova 1（input/video）。反向差异 0；无渠道模态证据 406 卡。完整清单和下方前 10 示例保持，未用本轮 HTML 链接新增或推断模态事实。

### R12B 逐字段增长与压缩

`model-audit-data.js`：R11 **36,275** → 停止时 **48,086** → 最终 **37,133 bytes**。增长定位如下，前三个数值列是解码后字段的 UTF-8 JSON bytes；packed 增量按表中字段顺序逐项替换并重跑原 codec，合计 **11,811 bytes**，避免把共享驻留字典误当独立可加字段。

| 字段 | R11 原值 | R12 停止值 | 原始增量 | 顺序替换 packed 增量 | 最终原始字段 |
| --- | ---: | ---: | ---: | ---: | ---: |
| verifiedAt | 12 | 12 | +0 | +0 | 12 |
| fields | 77 | 77 | +0 | +0 | 77 |
| facts | 9,495 | 11,401 | +1,906 | +1,483 | 4,729 |
| sources | 14,377 | 25,400 | +11,023 | +6,224 | 18,682 |
| rows | 16,262 | 17,012 | +750 | +4,104 | 15,916 |
| details | 1,066 | 1,066 | +0 | +0 | 1,066 |
| notices | 1,774 | 1,774 | +0 | +0 | 1,774 |
| removed | 5,988 | 5,988 | +0 | +0 | 5,988 |

来源 URL 的增加及其导致的事实/行去重失效是增长原因，备注、限定词、下线与移除信息没有增加。现在只对 38 个已核实 ID 存模板标记，在运行时派生 `https://tokendance.space/models/` + id；标签存索引；小程序不发送未显示的逐字段证据 URL、sourceLinks 详情或核查说明。与卡片唯一显示来源相同的字段仍保留精确引用，其他逐字段 URL 留在 Web/API。保留所有实际展示的四项值、状态、来源类别、限定词、未知/不支持模态、备注、下线信息、显示标签和链接目标。

源码 **1,569,251 bytes**（目标 ≤ **1,569,500**），runtime **1,145,967**，媒体 **189,978**；距原 **1,572,864** 上限 **3,613 bytes**。预算与预算测试未改。增长/压缩明细在 `.audit-input/r12/mini-payload-breakdown.json`。

### 验证

- Web 受影响模型/目录测试 **159/159**；小程序全套 **140/140**；scripts **35/35**。新增 38 页、百炼具体页、下线前后、API/JSON 一般规则、全目录过滤与最终清单精确匹配断言；小程序全 1064 卡的展示字段、备注、限定词、来源和标签与 Web 对照。
- 旧 46 项 HTTP 证据断言完整保留，当前 DOM 以 R12 最终清单精确断言。旧“API 可见”断言依新需求改为不可见，并核对底层证据未变；小程序未显示字段 URL 的断言改为精确投影与全部可见来源相等。无跳过测试，无放宽预算。
- 审计、目录、参考上传、thinking 生成及各自 `--check`，R10/R11/R12 报告检查均通过；Web build、小程序 build / check 通过。Web 仅既有大 chunk 提示。
- 主报告与 SYNC 更新；最终 HTTP 状态待操作方回填，不属于本地已通过检查。小程序继续暂停发布。

<a id="r11链接证据完整-core-对象计数与模态待复核清单当前验收"></a>

## R11：链接证据、完整 Core 对象计数与模态待复核清单（历史检查，计数经 R12 复算）

基线为 main `c7b6a2fc`，head 为 `1576ee00`。本轮只改审计脚本、测试、夹具与文档；4 个 DeepSeek-V4 显示名保留去括号状态，所有卡片事实与链接保持不变。未运行 Git 写命令，未写入 `../Tuyan-wt-baseline`，无真实/付费模型调用或部署。

### 46 个 R9 首链接检查（ID-only 历史结果；已由 R12D 替代）

**已由 R12D 替代：下面的 46 行是 ID-only 口径，仅保存 R11 当时的 HTTP 历史结果，不代表当前完整对象卡片首链接。R12D 已按完整 Core 对象及静态独有身份回填 397 行最终变化的 HTTP 证据（R12 历史值为 467），见[最终检查](#r12d最终链接-http-检查当前验收)。旧 200 未复制到新 URL。**

采用操作方提供的 `.audit-input/r11/linkcheck-result.json`，不是本沙箱重发网络请求。方法：HTTP **GET**、浏览器 User-Agent、跟随重定向、**25 秒**超时，操作方 Mac mini 沙箱外执行；原始时间 `2026-11-09T09:45:47.209Z`，表格按分钟记为 **2026-11-09 17:45 UTC+8**。

历史规则：**仅 404 / 410 回退**；403、超时及其他状态保留链接并标记。当时 46 项新 URL 最终均 **200**，均无重定向，**0 项符合回退条件**。冻结精简结果在 `apps/web/tests/fixtures/r11-link-check-20261109.json`，现仅测试其与历史表的身份、URL、状态和时间相符。当前完整对象首来源及普通/紧凑 DOM 改由 R12D 的 397 条最终证据验证；R12D 的七条 404 按操作方“原链接也 404/API”决定显式保留，不再套用历史的无例外断言。

**供 PM 复核：`https://tokendance.space/gateway/v1/models` 是返回 JSON 的 API 模型列表端点，不是文档页面。** R11 当时保留原链接；R12 已按人可读来源规则移出所有可见来源，完整事实证据仍保留该 URL。

| channel | model id | new URL | final status | checked | old URL |
| --- | --- | --- | --- | --- | --- |
| antling | `Ling-3.0-flash` | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 200 | 2026-11-09 17:45 UTC+8 | https://developer.ant-ling.com/zh-CN/docs/models/ling/ |
| antling | `Ling-3.0-flash-VL` | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 200 | 2026-11-09 17:45 UTC+8 | https://developer.ant-ling.com/zh-CN/docs/models/ling/ |
| antling | `Ling-3.0-tiny` | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 200 | 2026-11-09 17:45 UTC+8 | https://developer.ant-ling.com/zh-CN/docs/models/ling/ |
| antling | `Ling-3.1-flash` | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 200 | 2026-11-09 17:45 UTC+8 | https://developer.ant-ling.com/zh-CN/docs/models/ling/ |
| antling | `Ling-3.2-flash` | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ | 200 | 2026-11-09 17:45 UTC+8 | https://developer.ant-ling.com/zh-CN/docs/models/ling/ |
| bailian | `qwen3.7-max-2026-06-08` | https://help.aliyun.com/zh/model-studio/models | 200 | 2026-11-09 17:45 UTC+8 | https://help.aliyun.com/zh/model-studio/qwen3-7-max |
| bailian | `qwen3.8-flash` | https://help.aliyun.com/zh/model-studio/models | 200 | 2026-11-09 17:45 UTC+8 | https://help.aliyun.com/zh/model-studio/vision-model |
| bailian | `qwen3.8-max` | https://help.aliyun.com/zh/model-studio/models | 200 | 2026-11-09 17:45 UTC+8 | https://help.aliyun.com/zh/model-studio/qwen3-8-max |
| tokendance | `deepseek-v4-pro` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://api-docs.deepseek.com/quick_start/pricing/ |
| tokendance | `deepseek-v4.1-flash` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://api-docs.deepseek.com/quick_start/pricing/ |
| tokendance | `dots-3-note-preview` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://github.com/studio-dots-ai/dots3-note-prev |
| tokendance | `glm-5.3-flashx` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash |
| tokendance | `hy4-preview` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://huggingface.co/tencent/Hy4-preview |
| tokendance | `kimi-k2.5` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://tokendance.space/docs/kimi-thinking-models.md |
| tokendance | `kimi-k2.6` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://platform.kimi.com/docs/models |
| tokendance | `kimi-k2.7-code` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://platform.kimi.com/docs/models |
| tokendance | `kimi-k3` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://platform.kimi.com/docs/models |
| tokendance | `mimo-v2.5` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://mimo.mi.com/docs/zh-CN/updates/deprecate |
| tokendance | `mimo-v2.5-pro` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://mimo.mi.com/docs/zh-CN/updates/deprecate |
| tokendance | `qwen3-vl-plus` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://platform.qianwenai.com/docs/developer-guides/getting-started/vision-models |
| tokendance | `qwen3.5-35b-a3b` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://help.aliyun.com/zh/model-studio/models |
| tokendance | `qwen3.5-flash` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://help.aliyun.com/zh/model-studio/models |
| tokendance | `qwen3.5-plus` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://help.aliyun.com/zh/model-studio/model-depreciation |
| tokendance | `qwen3.6-plus` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://help.aliyun.com/zh/model-studio/models |
| tokendance | `qwen3.7-max` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://help.aliyun.com/zh/model-studio/models |
| tokendance | `qwen3.7-plus` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://help.aliyun.com/zh/model-studio/models |
| tokendance | `qwen3.8-flash` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://help.aliyun.com/zh/model-studio/vision-model |
| tokendance | `qwen3.8-max` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://help.aliyun.com/zh/model-studio/qwen3-8-max |
| tokendance | `qwen3.8-max-0902` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://help.aliyun.com/zh/model-studio/models |
| tokendance | `seed-2.0-lite` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://www.volcengine.com/docs/82379/1330310 |
| tokendance | `seed-2.0-mini` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://www.volcengine.com/docs/82379/1330310 |
| tokendance | `seed-2.0-pro` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://www.volcengine.com/docs/82379/1330310 |
| tokendance | `seed-2.1-pro` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://www.volcengine.com/docs/82379/1330310 |
| tokendance | `seed-2.1-turbo` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://www.volcengine.com/docs/82379/1330310 |
| tokendance | `seed-evolving` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://www.volcengine.com/docs/82379/1330310 |
| tokendance | `seedream-5.0-lite` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh |
| tokendance | `seedream-5.0-pro` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh |
| tokendance | `spark-x2.5-1.7b` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 |
| tokendance | `spark-x2.5-4b` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 |
| tokendance | `step-3.5-flash` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://platform.stepfun.com/docs/zh/guides/models/list |
| tokendance | `step-3.7-flash` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://platform.stepfun.com/docs/zh/guides/models/list |
| tokendance | `step-5-preview` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://platform.stepfun.com/docs/zh/guides/models/list |
| tokendance | `unifuncs-s3` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://unifuncs.com/api/deepsearch |
| tokendance | `unifuncs-s3-pro` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://unifuncs.com/api/deepsearch |
| tokendance | `unifuncs-u3` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://unifuncs.com/api/deepresearch |
| tokendance | `unifuncs-u3-pro` | https://tokendance.space/gateway/v1/models | 200 | 2026-11-09 17:45 UTC+8 | https://unifuncs.com/api/deepresearch |

### 完整对象计数与口径

使用提供的 Core `modelRegistry` 捕获：main **1122** 模型、head **1061** 模型。main 从只读基线导入自己的 `apps/web/src/lib/modelCardSpecifications.js`，head 使用当前工作树同名模块；不再把 head 的显示规则套在 main 上。计数涵盖捕获返回的全部模型，包含不可选/历史卡，不是可见目录或真实账号可用数量。

“已知”严格按显示值**不是未知**计数：旧 main 的 `待确认`、`官方未公布`、`未单列`及缺失的最大输出行统一视为未知；head 的 `不适用`属于非未知显示值，计入主表并在下面单列。main 的实际组件没有展示最大输出，隐藏的 `limitRows`、最大输入及提示词上限不充当最大输出或上下文。

| 对象 | 代码侧 | 模型总数 | 已知输入 | 已知输出 | 已知上下文 | 已知最大输出 |
| --- | --- | --- | --- | --- | --- | --- |
| 完整 Core 对象 | main | 1122 | 983 | 968 | 534 | 0 |
| 完整 Core 对象 | head | 1061 | 997 | 967 | 926 | 616 |
| ID-only（旧方法对照） | main | 1122 | 199 | 200 | 141 | 0 |
| ID-only（旧方法对照） | head | 1061 | 403 | 397 | 390 | 260 |

完整对象的数值补充（避免将不适用当作已公布 token 上限）：

| 代码侧 | 有数值上下文 | 上下文不适用 | 有数值最大输出 | 最大输出不适用 |
| --- | --- | --- | --- | --- |
| main | 534 | 0 | 0 | 0 |
| head | 519 | 407 | 209 | 407 |

逐渠道如下。每组数字依次为 **输入 / 输出 / 上下文 / 最大输出**；ID-only 只作旧方法对照，不参与完整对象验收。

| 渠道 | 总数 main → head | main 完整 | head 完整 | main ID-only | head ID-only |
| --- | --- | --- | --- | --- | --- |
| anthropic | 14 → 14 | 14 / 14 / 14 / 0 | 14 / 14 / 14 / 4 | 0 / 0 / 0 / 0 | 2 / 2 / 0 / 0 |
| antling | 6 → 8 | 6 / 6 / 4 / 0 | 8 / 8 / 6 / 0 | 0 / 0 / 0 / 0 | 5 / 5 / 4 / 0 |
| ark | 36 → 36 | 26 / 26 / 12 / 0 | 30 / 26 / 17 / 5 | 23 / 23 / 12 / 0 | 23 / 23 / 15 / 3 |
| bailian | 183 → 126 | 128 / 128 / 98 / 0 | 116 / 116 / 114 / 94 | 34 / 34 / 31 / 0 | 93 / 92 / 87 / 86 |
| bfl | 14 → 14 | 14 / 14 / 0 / 0 | 14 / 14 / 14 / 14 | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| deepseek | 4 → 4 | 4 / 4 / 4 / 0 | 4 / 4 / 4 / 4 | 3 / 3 / 3 / 0 | 4 / 4 / 4 / 4 |
| fal | 48 → 48 | 41 / 41 / 0 / 0 | 48 / 48 / 43 / 48 | 5 / 5 / 0 / 0 | 41 / 41 / 36 / 41 |
| fireworks | 26 → 20 | 24 / 8 / 20 / 0 | 19 / 8 / 17 / 1 | 3 / 3 / 2 / 0 | 16 / 5 / 15 / 1 |
| gemini | 17 → 17 | 17 / 17 / 1 / 0 | 17 / 17 / 1 / 17 | 5 / 5 / 0 / 0 | 5 / 5 / 0 / 5 |
| ideogram | 14 → 14 | 14 / 14 / 0 / 0 | 14 / 14 / 14 / 14 | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| iflytek | 34 → 34 | 10 / 10 / 8 / 0 | 16 / 10 / 8 / 0 | 8 / 8 / 6 / 0 | 8 / 8 / 6 / 0 |
| kimi | 6 → 6 | 6 / 6 / 6 / 0 | 6 / 6 / 6 / 2 | 1 / 1 / 1 / 0 | 1 / 1 / 1 / 0 |
| longcat | 2 → 3 | 2 / 2 / 2 / 0 | 2 / 3 / 3 / 0 | 1 / 1 / 1 / 0 | 1 / 2 / 2 / 0 |
| minimax | 11 → 11 | 11 / 11 / 9 / 0 | 11 / 11 / 11 / 3 | 3 / 3 / 3 / 0 | 3 / 3 / 3 / 0 |
| mistral | 18 → 18 | 18 / 18 / 18 / 0 | 18 / 18 / 18 / 0 | 3 / 3 / 3 / 0 | 3 / 3 / 3 / 0 |
| novita | 1 → 1 | 1 / 1 / 0 / 0 | 1 / 1 / 1 / 1 | 1 / 1 / 0 / 0 | 1 / 1 / 1 / 1 |
| openai | 69 → 71 | 69 / 69 / 60 / 0 | 71 / 71 / 69 / 45 | 4 / 4 / 4 / 0 | 46 / 46 / 44 / 42 |
| qianfan | 37 → 37 | 30 / 31 / 27 / 0 | 31 / 32 / 31 / 11 | 13 / 14 / 14 / 0 | 17 / 20 / 21 / 9 |
| recraft | 17 → 17 | 17 / 17 / 0 / 0 | 17 / 17 / 17 / 17 | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| replicate | 108 → 108 | 104 / 104 / 4 / 0 | 106 / 104 / 98 / 105 | 5 / 5 / 0 / 0 | 5 / 5 / 0 / 5 |
| runware | 148 → 148 | 148 / 148 / 20 / 0 | 148 / 148 / 137 / 122 | 14 / 14 / 5 / 0 | 14 / 14 / 8 / 8 |
| sensenova | 8 → 8 | 6 / 6 / 5 / 0 | 8 / 6 / 7 / 5 | 3 / 3 / 2 / 0 | 3 / 3 / 2 / 2 |
| siliconflow | 68 → 68 | 68 / 68 / 55 / 0 | 68 / 68 / 62 / 13 | 9 / 9 / 9 / 0 | 17 / 18 / 18 / 9 |
| stability | 5 → 5 | 5 / 5 / 0 / 0 | 5 / 5 / 5 / 5 | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| stepfun | 7 → 5 | 5 / 5 / 5 / 0 | 5 / 5 / 5 / 1 | 1 / 1 / 1 / 0 | 5 / 4 / 5 / 1 |
| together | 53 → 53 | 38 / 38 / 21 / 0 | 39 / 38 / 45 / 34 | 8 / 8 / 3 / 0 | 15 / 18 / 13 / 16 |
| tokendance | 74 → 74 | 72 / 72 / 68 / 0 | 72 / 72 / 71 / 18 | 25 / 25 / 17 / 0 | 37 / 35 / 61 / 16 |
| tokenhub | 49 → 50 | 40 / 40 / 35 / 0 | 46 / 40 / 45 / 19 | 12 / 12 / 9 / 0 | 14 / 15 / 17 / 8 |
| xai | 12 → 12 | 12 / 12 / 9 / 0 | 12 / 12 / 12 / 3 | 2 / 2 / 2 / 0 | 9 / 9 / 9 / 0 |
| xiaomi | 5 → 3 | 5 / 5 / 5 / 0 | 3 / 3 / 3 / 3 | 1 / 1 / 1 / 0 | 3 / 3 / 3 / 3 |
| zhipu | 28 → 28 | 28 / 28 / 24 / 0 | 28 / 28 / 28 / 8 | 12 / 12 / 12 / 0 | 12 / 12 / 12 / 0 |

损失按精确 channel/id/field 核对：输入 **31**、输出 **27**、上下文 **24**、最大输出 **0** 项 main 已知值不在 head 中，全部属于 `config/removed-models.json` 已登记移除型号；**存续型号损失 0，未解释损失 0**。逐项含原值、移除来源与日期见 [R11 counts JSON](model-card-audit-20261109-r11-counts.json)。这也解释输出净减少 1：移除 27 项，同时其余卡片增加 26 项。

`scripts/count-model-catalog.mjs <root> --registry <json>` 优先使用传入的完整 Core 对象；不传 JSON 时调用离线 mock Core，在完整 `STATIC_MODEL_REGISTRY` 上由 Core 补入 `specificModelSpecifications`（`exactModelDetails`）、审计、生命周期、参考图能力与离线目录状态。仅静态存在的身份保留整个静态 entry 并补 exactModelDetails；不会退化为 `{id}`。两边无 JSON 的离线 Core 路径也已运行，四项总数与提供的捕获一致。可见/可选数量仍为 main 923/884、head 919/878。

精简夹具 `r11-registry-{main,head}.json` 保留两侧卡片读取的所有 model 字段（roles、capabilities 所用字段、operations、完整 specifications / specificModelSpecifications、来源等），共享值仅在文件内去重，解码后不共享可变对象。`prepare-model-card-r11-fixtures.mjs` 对 **2183 个模型**逐一断言原始完整对象与精简对象的整个卡片结果相同，记录原始捕获及卡片代码 SHA-256；未纳入 6MB 原始响应。main 渲染快照支持没有兄弟工作树的 CI 离线复算。

R10 计数脚本也改用完整 Core 捕获：首来源差异 **561**、模态差异 **614**、任一差异 **623 / 1061**；同表格且仍未知卡为 **34**。旧 R10 的 **389 / 1064** 与 **20** 是完整静态对象口径，保留为历史记录；现有 `r10-counts.json` 已按新对象口径重生成。这里只修正审计输入，没有批量修复这些卡片。

### 模态待复核清单（只列出）

完整 head 对象中 **27 张卡 / 30 个字段图标**显示支持，但该渠道已捕获官方证据未列该模态；反向“显示不支持而官方列为支持” **0 项**。**406 / 1061 张卡没有渠道官方模态证据**，另有 28 张仅有单侧模态证据，137 张使用官方任务标签的正向证据；缺证不判为不支持。

只使用 `config/channel-audit/*`、`config/model-audit.generated.json` 中 channel scope 的事实与 R10 表格复核。精确身份和渠道域名均须匹配，原厂页不能证明第三方渠道支持；产品角色/输入要求不作为官方能力证据。R10 新表优先，旧输入快照已撤回的字段不重新使用；Qwen3.7 Max 同页多变体表取并集并记录歧义。明确写出 PDF 输入/pdf_url 的渠道捕获也计入 file 支持。Runware 的 text-to-image 等官方标签只证明所列正向能力，并非完整输入清单：137 张此类卡不因标签省略而列为多余模态，但仍核对“显示不支持、标签明确支持”的反向矛盾。未知图标不算不支持，官方未列不等于明确排除。结果受现有捕获覆盖和日期限制，不代表今日全网事实。

| 渠道 | 卡片 | 差异项 | 按字段 | 无渠道证据卡片 |
| --- | --- | --- | --- | --- |
| fal | 15 | 15 | input/image: 14；output/text: 1 | 5 |
| ideogram | 1 | 1 | input/image: 1 | 0 |
| qianfan | 8 | 9 | input/image: 2；input/video: 7 | 1 |
| replicate | 2 | 4 | input/file: 1；input/image: 1；input/video: 1；output/text: 1 | 19 |
| sensenova | 1 | 1 | input/video: 1 | 0 |
| 其余渠道 | 0 | 0 | 各字段均为 0 | 381 |

前 10 个复核示例（先覆盖不同渠道/字段，再补齐；不是按严重程度排序）：

| channel | model id | field | card value | official value | source URL |
| --- | --- | --- | --- | --- | --- |
| fal | `blackforestlabs/flux-3/klein/base/text-to-image` | input/image | 支持 | 未列支持（不等于明确不支持） | https://fal.ai/models/blackforestlabs/flux-3/klein/base/text-to-image/api |
| fal | `google/nano-banana-2.1` | output/text | 支持 | 未列支持（不等于明确不支持） | https://fal.ai/models/google/nano-banana-2.1/api |
| ideogram | `ideogram-v4` | input/image | 支持 | 未列支持（不等于明确不支持） | https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4 |
| qianfan | `ernie-5.0-thinking-exp` | input/image | 支持 | 未列支持（不等于明确不支持） | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j |
| qianfan | `glm-5.3-flash` | input/video | 支持 | 未列支持（不等于明确不支持） | https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j |
| replicate | `google/nano-banana-2.1` | input/file | 支持 | 未列支持（不等于明确不支持） | https://replicate.com/google/nano-banana-2.1/api/schema |
| replicate | `google/nano-banana-2.1` | input/video | 支持 | 未列支持（不等于明确不支持） | https://replicate.com/google/nano-banana-2.1/api/schema |
| replicate | `google/nano-banana-2.1` | output/text | 支持 | 未列支持（不等于明确不支持） | https://replicate.com/google/nano-banana-2.1/api/schema |
| replicate | `prunaai/flux-kontext-fast` | input/image | 支持 | 未列支持（不等于明确不支持） | https://replicate.com/prunaai/flux-kontext-fast/api/schema |
| sensenova | `kimi-k3` | input/video | 支持 | 未列支持（不等于明确不支持） | https://platform.sensenova.cn/docs |

完整逐项清单、全渠道计数和无证据身份见 [R11 misleading Markdown](model-card-audit-20261109-r11-misleading.md) / [JSON](model-card-audit-20261109-r11-misleading.json)。所有项目仅供 PM 下轮决策，未改显示事实、链接、排除规则或运行时契约。

### R11 验证与包体

- Web 受影响测试 **134/134**，含 R11 的完整对象总数/逐渠道断言、46 链接普通/紧凑 DOM 和全目录失效状态检查；未删改或跳过旧断言。
- scripts 全套 **35/35**；覆盖旧标签/不适用/隐藏最大输出计数、精简对象独立性、证据渠道隔离及双向差异、无需私有输入的报告重生成。
- 小程序全套 **138/138**，`build` / `check` 通过；Web `build` 通过，仅既有大 chunk 提示。
- 审计、目录、参考上传与 thinking 生成器已执行；`generate-model-audit --check`、`sync-model-catalog --check`、`sync-reference-upload --check`、`sync-thinking --check` 及 R10/R11 报告 `--check` 通过。派生产物无变化。
- 小程序精确源码 **1,568,676 bytes**，runtime **1,145,277 bytes**，媒体 **189,978 bytes**；原源码上限 **1,572,864** 未改，余 **4,188 bytes**。未超过停止线。
- Git 仅做只读状态/差异检查；`git diff --check` 通过。没有提交/推送、基线写入、真实模型调用或部署。

可复现命令（输出仅写当前工作树或 `/tmp`）：

```sh
node scripts/count-model-catalog.mjs ../Tuyan-wt-baseline --registry .audit-input/r11/registry-main.json
node scripts/count-model-catalog.mjs . --registry .audit-input/r11/registry-head.json
node scripts/report-model-card-r11.mjs --main-registry .audit-input/r11/registry-main.json --head-registry .audit-input/r11/registry-head.json --check
node scripts/report-model-card-r11.mjs --frozen-main --check
node scripts/report-model-card-r10.mjs --check
node --test scripts/*.test.mjs
```


<a id="r10渠道明确排除完整-registry-回归与改选正文当前验收"></a>

## R10：渠道明确排除、完整 registry 回归与改选正文（历史验收）

保留工作区现状继续完成任务；未运行 Git 写命令，无真实/付费模型调用、提交、推送或部署。小米原名仍为 `MiMo-v2.5` / `MiMo-v2.5-pro`，源码预算及既有测试断言均未放宽。

### A / D：百炼 kimi-k3

官方页最大输出与上下文均标注 1048576。

仅为 `bailian/kimi-k3` 登记输入 audio/video、输出 image/audio/video 的明确不支持，官方原文为 `| 输入模态 | Text Image | 输出模态 | Text |`，来源 [百炼 Kimi K3](https://help.aliyun.com/zh/model-studio/kimi-k3)，核实日期 `2026-11-09`。原文、URL、日期保存在 `config/channel-audit/model-audit-supplement-20261109.json`，生成时缺引文、来源或日期不符、支持与排除冲突均报错。

根因是完整 registry 对象携带旧 `specificModelSpecifications`，R6 的模态并集把 video 加回并使 catalog 事实占据输入来源；只传 `{id}` 无法复现。现在有官方证据的渠道排除项先从并集中移除，并保留渠道审计事实及来源，产品图像下限也不能覆盖明确排除。操作方完整对象已原样复制到 `apps/web/tests/fixtures/kimi-k3-live-registry-model.json`；普通/紧凑卡片 DOM 断言输入仅文本、图像，音频/视频不支持，输出图像/音频/视频不支持，可见来源为上面的阿里云精确页，title 日期为 `2026-11-09`。小程序编译产物同样保留排除元数据并显示“不支持”。

变更前后对 1064 张卡分别以最小对象和完整静态对象逐卡对照，**只有百炼 kimi-k3 变化**；其余 1063 张卡的事实、来源和展示未改。其他型号仍沿用原模态并集、未知语义与产品输入下限。

**同类官方表格发现：百炼 20 张，其他 30 渠道各 0 张（已登记证据口径，排除 kimi-k3）。** 使用完整目录对象，统计其来源中已有官方渠道页面、包含明确 `输入模态 | …` / `输出模态 | …` 表格且仍有至少一个未知图标的卡片；同一页对应多个精确 ID 时按卡计数。复核 R6 已留存来源，并在 R10 只读补查百炼 25 个未缓存的已登记 URL（百炼合计 36 个 URL）。四列并排表和两列逐行表均计入；原厂继承页、说明文字/标题形式和未核实页面不计入，0 表示该口径无已核实命中，不表示全网不存在页面。页面逐字短引文及 URL 见 `config/channel-audit/modality-table-review-r10-20261109.json`；例如 [Qwen-Image 2.0](https://help.aliyun.com/zh/model-studio/qwen-image-2-0) 和 [MiniMax M3.1 Flash](https://help.aliyun.com/zh/model-studio/minimax-m3-1-flash)。**其余卡片未作修改，待 PM 决定是否扩大明确排除规则。**

**最小对象与完整对象差异：389 / 1064 张**；可见来源不同 89 张，模态不同 388 张，两者交集 88 张。完整对象使用 `STATIC_MODEL_REGISTRY` 的整个 model 条目（含 roles/capabilities/specifications 等已有字段），最小对象只传 `{id}`；来源比较实际展示的第一条链接，模态比较输入/输出四种图标状态。此统计与操作方实时 Core 夹具回归分开，不能把静态目录对象统计称为逐个实时 Core 响应核查。逐渠道如下，两项差异可以重叠：

| 渠道 | 其他同表格且仍未知卡 | 可见来源差异 | 模态差异 | 任一差异 |
| --- | ---: | ---: | ---: | ---: |
| deepseek | 0 | 0 | 0 | 0 |
| kimi | 0 | 2 | 5 | 5 |
| zhipu | 0 | 0 | 5 | 5 |
| siliconflow | 0 | 2 | 21 | 21 |
| anthropic | 0 | 2 | 12 | 12 |
| recraft | 0 | 1 | 15 | 15 |
| xai | 0 | 1 | 3 | 3 |
| gemini | 0 | 12 | 12 | 12 |
| bailian | 20 | 5 | 14 | 15 |
| openai | 0 | 1 | 21 | 21 |
| ark | 0 | 3 | 7 | 7 |
| bfl | 0 | 2 | 12 | 12 |
| stability | 0 | 0 | 5 | 5 |
| ideogram | 0 | 1 | 4 | 4 |
| minimax | 0 | 1 | 2 | 2 |
| mistral | 0 | 1 | 12 | 12 |
| together | 0 | 5 | 13 | 13 |
| fireworks | 0 | 3 | 3 | 3 |
| fal | 0 | 6 | 7 | 7 |
| replicate | 0 | 12 | 57 | 57 |
| tokendance | 0 | 9 | 18 | 18 |
| runware | 0 | 8 | 101 | 101 |
| tokenhub | 0 | 8 | 21 | 21 |
| xiaomi | 0 | 0 | 0 | 0 |
| sensenova | 0 | 1 | 4 | 4 |
| stepfun | 0 | 0 | 0 | 0 |
| qianfan | 0 | 1 | 6 | 6 |
| iflytek | 0 | 2 | 8 | 8 |
| longcat | 0 | 0 | 0 | 0 |
| antling | 0 | 0 | 0 | 0 |
| novita | 0 | 0 | 0 | 0 |
| **合计** | **20** | **89** | **388** | **389** |

上表保留 R10 当时的静态对象结果；[R10 计数脚本输出](model-card-audit-20261109-r10-counts.json) 已按 R11 要求改为完整 Core 对象（623 / 1061），可用 `node scripts/report-model-card-r10.mjs --check` 离线复核当前输出。报告和表格证据仅供审计，不参与运行时生成规则。

### B / C：显示名与确认弹窗

- 小程序非移除型号恢复静态目录 label 查询；未命中时移除 `accounts/…/models/` 前缀。移除型号优先使用 removed-models 的 displayName。修改落在生成源，重新同步后仍保留；新增目录 label、前缀回退、移除 displayName 三类测试。
- Web 改选确认框的 `.tw-dialog-body > p` 明确使用 **14px**，桌面与移动端均高于 12px。DOM 测试检查全部正文段落的计算字号，另递归核对相关 CSS 声明（含媒体规则）；jsdom 不执行真实视口媒体布局，因此这是 DOM/CSS 验收，不冒称实屏截图。

### 验证与包体

- Web 受影响测试：**131/131**，含 R3–R10 模型审计、规格、改选、模型库/选择器/设置；新增 R10 **3/3**。
- 小程序全套：**138/138**；`build` / `check` 通过。目录 label、前缀、移除名称及明确排除新增 **4/4**。
- 生成器、目录 codec、registry 测试：**22/22**；Core 审计 **7/7**、类型检查通过；Gateway 审计 **6/6**。
- Web `build` 通过；保留已有大 chunk 提示。审计生成、目录同步已运行；审计生成 `--check`、目录/参考上传两个 `sync --check`、thinking `--check` 与 R10 计数 `--check` 均通过。
- 小程序精确源码 **1,568,676 bytes**，runtime **1,145,277 bytes**，媒体 **189,978 bytes**。比 R9 的 1,567,915 增加 **761 bytes**，距原 **1,572,864** 上限还余 **4,188 bytes**；预算和预算测试未修改，生成 `.js` 与 `.ts` 已同步。

## R9：显示名清理与渠道来源优先（历史验收）

基线为 `785b99df`。全程未运行 Git 写命令；无真实/付费模型调用、提交、推送或部署。

- 小米移除项显示名逐字保留 `MiMo-v2.5` / `MiMo-v2.5-pro`。
- `config/removed-models.json` 的 `bailian/deepseek-v4-flash` 显示名改为 `DeepSeek-V4-Flash`。原 `c7b6a2fc` 名称夹具保留不动，`removed-model-name-overrides-r9.json` 仅允许这一身份覆盖并写明原因；Web、小程序和生成器原有逐项断言继续覆盖全部 68 项，未降低数量、跳过或删减断言。
- 清查同类文案：版本目录中 5 个名称的“（具体版本待确认）”备注一并移除，包含 DeepSeek 直连、硅基两项及百炼两项；共享无具体版本提示改为“具体版本未知”。Core/Web/小程序派生目录同步，不改变模型 ID、版本事实、调用标识、能力或权限。历史审计文档和冻结名称夹具保留原文用于追溯；运行时清理正则仅作防御，不输出该措辞。
- 卡片来源统一按**最终展示字段**的 `provenance === 'channel'` 选择安全 HTTPS 来源（输入、输出、上下文、最大输出的固定顺序），优先于生命周期、原厂及通用目录链接；只有没有展示字段的渠道审计来源时，才沿用既有来源回退，包括 `officialSourceUrl`。已被回退替换的审计字段不能抢占首链接。全部次级证据仍在详情中，下线徽标和弹层保留；共享 URL 同时被标记为原厂来源时，渠道事实的首链接仍标为“官方文档”。
- 百炼 `kimi-k3` 可见链接为 `https://help.aliyun.com/zh/model-studio/kimi-k3`，文字为“官方文档 · help.aliyun.com”，title 沿用“核实日期 2026-11-09”格式。**当前基线 R8 已输出该链接**，因此它不计入本轮实际变化的 46 项；新增 DOM 测试另外注入 `huggingface.co` 通用目录来源，确认无法覆盖百炼证据，普通/紧凑卡片与触屏详情均覆盖。

### R9 全目录首链接变化

按精确 `channel/id` 对比修改前后的生产 `modelCardSpecifications(...).sources[0]`，全静态目录 **1,064 张中 46 张改变、1,018 张不变**，不是角色重复数，也不是来源列表中的 URL 数。只改变来源优先级，没有添加/删除卡片或修改规格事实。

| 渠道 | 首链接变化数 |
| --- | ---: |
| TokenDance / `tokendance` | 38 |
| 百炼 / `bailian` | 3 |
| Ant Ling / `antling` | 5 |
| 合计 | **46** |

沿用现有只读离线计数器 `node scripts/count-model-catalog.mjs . --keys`：静态 1064、完整 mock registry 1061、可见目录 919、可选 878。mock 可见集合中受影响 **8 张**（百炼 3 + Ant Ling 5）；该夹具的 TokenDance 账号目录为空，38 项仍完整纳入全静态统计。直接以静态 registry 驱动目录时可见 985 张，其中 44 张受影响，另 2 张 TokenDance 小米旧型号被生命周期过滤。以上不是实时生产账号目录的计数。

### R9 验证

| 验证 | 结果 |
| --- | --- |
| Web 受影响模型/卡片/目录测试 | **87/87**，包括新增 R9 四项：跨运行时显示名/通知/错误、Kimi 链接与 title 日期、全目录来源规则与安全回退、触屏详情 |
| Web 全量 | **1360/1372**，12 失败，0 跳过 |
| 同环境只读基线 | `git archive HEAD` 导出 `785b99df` 到临时目录，复跑 4 个失败文件 **20/32**；12 个失败名称与本轮完全一致 |
| 小程序全量 / build | **134/134**；`tsc` 通过；预算测试 **2/2** |
| Core model-audit / Gateway model-audit | **8/8** / **6/6**；本地夹具与模拟传输 |
| scripts 全量 | **30/30** |
| 审计生成器 / 目录同步 / 参考上传同步 | 已生成；`generate-model-audit.mjs --check`、`sync-model-catalog.mjs --check`、`sync-reference-upload.mjs --check` 均通过 |
| Web build | 通过；保留已有大 chunk 警告 |
| Git diff 空白检查 | 通过 |

小程序源码 **1,567,915 bytes**、runtime **1,144,691 bytes**、媒体 **189,978 bytes**；相对 R8 源码减少 **140 bytes**，原上限 **1,572,864** 未改，余 **4,949 bytes**。预算测试未修改，生成 `.js` 与 `.ts` 一致。

Web 既有失败分布：`inactive-route-ui` 1、`professional-custom-v381` 8、`workflow-v400-ui` 2、`workspace-migration` 1。日志为 `/tmp/r9-web-full.log`、`/tmp/r9-baseline-web.log`，其他测试/构建为 `/tmp/r9-*.log`。额外检查历史版本报表生成器 `sync-model-version-report.mjs --check` 时，当前和 `785b99df` 基线都报同一 `docs/model-version-mapping.csv` 漂移；该旧报表不属于本轮双 sync，未批量重写历史报表。

验证路径：模型卡 → 查看“官方文档 · help.aliyun.com”链接/title → 触屏点击 → 详情显示同一 URL 与核实日期。Browser 插件未提供；`pnpm --dir apps/web exec playwright --version` 返回 command not found，未安装依赖。证据为真实组件 DOM/交互测试；未声称完成真浏览器截图或微信原生扫描，小程序继续暂停发布。

### R9 附录：46 张首链接变化完整列表

下表每行是一张精确渠道卡片，按渠道/ID 排序；完整 URL 保留以便复查。

| 精确渠道 / 型号 | 修改前可见链接 | 修改后可见链接 |
| --- | --- | --- |
| `antling/Ling-3.0-flash` | https://developer.ant-ling.com/zh-CN/docs/models/ling/ | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ |
| `antling/Ling-3.0-flash-VL` | https://developer.ant-ling.com/zh-CN/docs/models/ling/ | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ |
| `antling/Ling-3.0-tiny` | https://developer.ant-ling.com/zh-CN/docs/models/ling/ | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ |
| `antling/Ling-3.1-flash` | https://developer.ant-ling.com/zh-CN/docs/models/ling/ | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ |
| `antling/Ling-3.2-flash` | https://developer.ant-ling.com/zh-CN/docs/models/ling/ | https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/ |
| `bailian/qwen3.7-max-2026-06-08` | https://help.aliyun.com/zh/model-studio/qwen3-7-max | https://help.aliyun.com/zh/model-studio/models |
| `bailian/qwen3.8-flash` | https://help.aliyun.com/zh/model-studio/vision-model | https://help.aliyun.com/zh/model-studio/models |
| `bailian/qwen3.8-max` | https://help.aliyun.com/zh/model-studio/qwen3-8-max | https://help.aliyun.com/zh/model-studio/models |
| `tokendance/deepseek-v4-pro` | https://api-docs.deepseek.com/quick_start/pricing/ | https://tokendance.space/gateway/v1/models |
| `tokendance/deepseek-v4.1-flash` | https://api-docs.deepseek.com/quick_start/pricing/ | https://tokendance.space/gateway/v1/models |
| `tokendance/dots-3-note-preview` | https://github.com/studio-dots-ai/dots3-note-prev | https://tokendance.space/gateway/v1/models |
| `tokendance/glm-5.3-flashx` | https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash | https://tokendance.space/gateway/v1/models |
| `tokendance/hy4-preview` | https://huggingface.co/tencent/Hy4-preview | https://tokendance.space/gateway/v1/models |
| `tokendance/kimi-k2.5` | https://tokendance.space/docs/kimi-thinking-models.md | https://tokendance.space/gateway/v1/models |
| `tokendance/kimi-k2.6` | https://platform.kimi.com/docs/models | https://tokendance.space/gateway/v1/models |
| `tokendance/kimi-k2.7-code` | https://platform.kimi.com/docs/models | https://tokendance.space/gateway/v1/models |
| `tokendance/kimi-k3` | https://platform.kimi.com/docs/models | https://tokendance.space/gateway/v1/models |
| `tokendance/mimo-v2.5` | https://mimo.mi.com/docs/zh-CN/updates/deprecate | https://tokendance.space/gateway/v1/models |
| `tokendance/mimo-v2.5-pro` | https://mimo.mi.com/docs/zh-CN/updates/deprecate | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3-vl-plus` | https://platform.qianwenai.com/docs/developer-guides/getting-started/vision-models | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.5-35b-a3b` | https://help.aliyun.com/zh/model-studio/models | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.5-flash` | https://help.aliyun.com/zh/model-studio/models | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.5-plus` | https://help.aliyun.com/zh/model-studio/model-depreciation | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.6-plus` | https://help.aliyun.com/zh/model-studio/models | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.7-max` | https://help.aliyun.com/zh/model-studio/models | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.7-plus` | https://help.aliyun.com/zh/model-studio/models | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.8-flash` | https://help.aliyun.com/zh/model-studio/vision-model | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.8-max` | https://help.aliyun.com/zh/model-studio/qwen3-8-max | https://tokendance.space/gateway/v1/models |
| `tokendance/qwen3.8-max-0902` | https://help.aliyun.com/zh/model-studio/models | https://tokendance.space/gateway/v1/models |
| `tokendance/seed-2.0-lite` | https://www.volcengine.com/docs/82379/1330310 | https://tokendance.space/gateway/v1/models |
| `tokendance/seed-2.0-mini` | https://www.volcengine.com/docs/82379/1330310 | https://tokendance.space/gateway/v1/models |
| `tokendance/seed-2.0-pro` | https://www.volcengine.com/docs/82379/1330310 | https://tokendance.space/gateway/v1/models |
| `tokendance/seed-2.1-pro` | https://www.volcengine.com/docs/82379/1330310 | https://tokendance.space/gateway/v1/models |
| `tokendance/seed-2.1-turbo` | https://www.volcengine.com/docs/82379/1330310 | https://tokendance.space/gateway/v1/models |
| `tokendance/seed-evolving` | https://www.volcengine.com/docs/82379/1330310 | https://tokendance.space/gateway/v1/models |
| `tokendance/seedream-5.0-lite` | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh | https://tokendance.space/gateway/v1/models |
| `tokendance/seedream-5.0-pro` | https://docs.volcengine.com/docs/ark/seedream-4-0-5-0?lang=zh | https://tokendance.space/gateway/v1/models |
| `tokendance/spark-x2.5-1.7b` | https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 | https://tokendance.space/gateway/v1/models |
| `tokendance/spark-x2.5-4b` | https://maas.xfyun.cn/api/v1/gpt-finetune/model/base/list-v2?page=1&size=9999 | https://tokendance.space/gateway/v1/models |
| `tokendance/step-3.5-flash` | https://platform.stepfun.com/docs/zh/guides/models/list | https://tokendance.space/gateway/v1/models |
| `tokendance/step-3.7-flash` | https://platform.stepfun.com/docs/zh/guides/models/list | https://tokendance.space/gateway/v1/models |
| `tokendance/step-5-preview` | https://platform.stepfun.com/docs/zh/guides/models/list | https://tokendance.space/gateway/v1/models |
| `tokendance/unifuncs-s3` | https://unifuncs.com/api/deepsearch | https://tokendance.space/gateway/v1/models |
| `tokendance/unifuncs-s3-pro` | https://unifuncs.com/api/deepsearch | https://tokendance.space/gateway/v1/models |
| `tokendance/unifuncs-u3` | https://unifuncs.com/api/deepresearch | https://tokendance.space/gateway/v1/models |
| `tokendance/unifuncs-u3-pro` | https://unifuncs.com/api/deepresearch | https://tokendance.space/gateway/v1/models |

## R8：PM 小项修正（历史验收，R9 覆盖显示名与来源规则）

基于 PR #245 的 `942f6078`。只读 Git；未执行 Git 写命令，未调用真实/付费模型，未提交、推送或部署。以下覆盖 R7/R6B 的显示名、错误文案、token 单位与百炼 Kimi K3 结论。

1. **显示名**：68 个移除记录逐一补入 `displayName`，全部来自只读 `git show c7b6a2fc:apps/web/src/lib/staticModelCatalog.js` 的精确渠道与 ID 对应 `label`；替代名同源。保留 main 的原始大小写、空格与限定语，未按 API ID 猜测。小程序只携带消息/确认所需原名与替代名，复用现有压缩格式；没有下发完整历史目录或证据。Web 我的模型、角色 helper、小程序两个确认入口与 Core/Gateway/Web 错误均有全量移除表断言；原始 ID 仍用于机器字段，显示不泄漏 API ID（main 标签与 ID 逐字相同的条目除外）。
2. **选择按钮**：目录与任务内 ModelPicker 页脚共用同一规则，修正目录通用字号覆盖；字号、最小高度、圆角、背景、颜色及 padding 在 DOM 计算样式中一致。
3. **改选与确认**：我的模型去掉下划线及桌面专用按钮缩小规则；共用 `tw-secondary`。配置 helper 的按钮增加 8px 起始间距，对桌面/移动均生效；确认弹层 `min-height:0; height:auto`，保留通用最大高度与滚动。取消、角色隔离、原库条目及机器身份不变。
4. **百炼 Kimi K3**：仅 `bailian/kimi-k3` 的 totalContextTokens 改为 1048576，maxOutputTokens 仍为 1048576；输入 text、image，输出 text。2026-11-09 官方精确规格原文、URL、日期写入版本化输入与[冲突补充](model-card-audit-20261109-conflicts.md#r8-百炼-kimi-k3-精确规格补充2026-11-09)。对比 `942f6078` 的全部审计字段，只有此精确身份的输入值/来源、输出来源和上下文值变化；其他渠道不变。
5. **单位**：卡片保留官方数字、小数精度和限定语，单位后缀显示大写 K/M；源值及来源详情保留原标签。Web 真实 DOM 和小程序编译后 renderer 各逐卡覆盖 1064 项，既检查无小写单位，又确认原始标签仍在。
6. **错误与文档**：MODEL_UNAVAILABLE 统一为 `模型 {displayName}：原型号已不可用，请重新选择。推荐：{replacementDisplayName}`，无替代时省略推荐段；businessCode/code/statusCode/replacement/sourceUrl 与 not_sent 均保留。只读核对 main 的 SiliconFlow `Qwen/Qwen3.8-27B` 无上下文窗口字段，冲突表、单位表及机器复核记录统一为撤回 1000000 后未知；卡片实测未知。

### R8 验证

| 验证 | 结果 |
| --- | --- |
| 审计生成器、目录同步、参考上传同步 | 已生成；三个 `--check` 均通过 |
| Web 模型/目录/规格定向 | 95/95；最终 R8 文件再跑 4/4 |
| Web 全量 | 1356/1368，12 失败，0 跳过 |
| 只读 HEAD 基线复核 | `git archive 942f6078` 导出到 `/tmp/r8-baseline-7bz7h5cz`，同依赖、同环境跑上述四个失败文件：20/32，12 个失败名称与全量完全一致，无新增失败 |
| 小程序 | 全量 134/134；build 通过；预算测试 2/2 |
| Core model-audit 两文件 | 8/8；Core TypeScript check 通过 |
| Gateway model-audit | 6/6 |
| scripts 全量 | 30/30 |
| Web build | 通过；既有大 chunk 警告保留 |
| Git diff 空白检查 | 通过 |

小程序源码 **1,568,055 bytes**，runtime **1,144,828**，媒体 **189,978**；相对 R7 源码增加 **3,727**，原上限 **1,572,864** 不变，余 **4,809 bytes**。所有 `.js` 已由 `.ts` 编译；预算测试未修改、未跳过。测试只使用本地夹具/模拟传输。

Web 既有失败分布：inactive-route-ui 1、professional-custom-v381 8、workflow-v400-ui 2、workspace-migration 1。日志：`/tmp/r8-web-full.log`、`/tmp/r8-baseline-web.log`；定向及其他验证日志采用 `/tmp/r8-*.log`。没有将这些失败改为通过或跳过。

Browser 插件未提供；`pnpm --dir apps/web exec playwright --version` 返回 command not found，未安装依赖。验证为 DOM/计算样式、编译后小程序组件与构建；1280/390 真浏览器截图、微信原生扫描未完成。小程序继续暂停发布。

### R8 移除显示名逐项来源

下表 68 项的来源均为 **`c7b6a2fc:apps/web/src/lib/staticModelCatalog.js` → `STATIC_MODEL_REGISTRY[channel].models` → 精确 `id` 的 `label`**。冻结测试夹具：`apps/web/tests/fixtures/removed-model-names-main-c7b6a2fc.json`。特别地，main 小米标签为 `MiMo-v2.5` / `MiMo-v2.5-pro`，逐字保留，没有替换为任务示例中的大写 V。

| 精确渠道 / 型号 | displayName（逐字） |
| --- | --- |
| `bailian/MiniMax-M2.1` | `MiniMax-M2.1` |
| `bailian/MiniMax/MiniMax-M2.1` | `MiniMax-M2.1` |
| `bailian/Moonshot-Kimi-K2-Instruct` | `Moonshot-Kimi-K2-Instruct` |
| `bailian/deepseek-r1` | `DeepSeek-r1` |
| `bailian/deepseek-r1-0528` | `DeepSeek-r1-0528` |
| `bailian/deepseek-r1-distill-qwen-14b` | `DeepSeek-r1-distill-qwen-14b` |
| `bailian/deepseek-r1-distill-qwen-32b` | `DeepSeek-r1-distill-qwen-32b` |
| `bailian/deepseek-r1-distill-qwen-7b` | `DeepSeek-r1-distill-qwen-7b` |
| `bailian/deepseek-v3` | `DeepSeek-V3` |
| `bailian/deepseek-v3.1` | `DeepSeek-V3.1` |
| `bailian/deepseek-v3.2` | `DeepSeek-V3.2` |
| `bailian/deepseek-v3.2-exp` | `DeepSeek-V3.2-exp` |
| `bailian/deepseek-v4-flash` | `DeepSeek-V4-Flash（具体版本待确认）` |
| `bailian/glm-4.5` | `GLM-4.5` |
| `bailian/glm-4.5-air` | `GLM-4.5-air` |
| `bailian/glm-4.7` | `GLM-4.7` |
| `bailian/kimi-k2-thinking` | `Kimi-k2-thinking` |
| `bailian/qvq-max` | `qvq-max` |
| `bailian/qvq-plus` | `qvq-plus` |
| `bailian/qwen-image-edit` | `Qwen-image-edit` |
| `bailian/qwen-image-edit-max` | `Qwen-image-edit-max` |
| `bailian/qwen-image-edit-max-2026-01-16` | `Qwen-image-edit-max-2026-01-16` |
| `bailian/qwen-image-edit-plus` | `Qwen-image-edit-plus` |
| `bailian/qwen-image-edit-plus-2025-10-30` | `Qwen-image-edit-plus-2025-10-30` |
| `bailian/qwen-image-edit-plus-2025-12-15` | `Qwen-image-edit-plus-2025-12-15` |
| `bailian/qwen-image-max` | `Qwen-image-max` |
| `bailian/qwen-image-max-2025-12-30` | `Qwen-image-max-2025-12-30` |
| `bailian/qwen-image-plus` | `Qwen-image-plus` |
| `bailian/qwen-image-plus-2026-01-09` | `Qwen-image-plus-2026-01-09` |
| `bailian/qwen-long-2025-01-25` | `Qwen-long-2025-01-25` |
| `bailian/qwen-long-latest` | `Qwen-long-latest` |
| `bailian/qwen-omni-turbo` | `Qwen-omni-turbo` |
| `bailian/qwen-vl-max` | `Qwen-vl-max` |
| `bailian/qwen-vl-plus` | `Qwen-vl-plus` |
| `bailian/qwen2.5-omni-7b` | `Qwen2.5-omni-7b` |
| `bailian/qwen3-14b` | `Qwen3-14b` |
| `bailian/qwen3-235b-a22b` | `Qwen3-235b-a22b` |
| `bailian/qwen3-235b-a22b-instruct-2507` | `Qwen3-235b-a22b-instruct-2507` |
| `bailian/qwen3-235b-a22b-thinking-2507` | `Qwen3-235b-a22b-thinking-2507` |
| `bailian/qwen3-30b-a3b` | `Qwen3-30b-a3b` |
| `bailian/qwen3-30b-a3b-instruct-2507` | `Qwen3-30b-a3b-instruct-2507` |
| `bailian/qwen3-30b-a3b-thinking-2507` | `Qwen3-30b-a3b-thinking-2507` |
| `bailian/qwen3-32b` | `Qwen3-32b` |
| `bailian/qwen3-8b` | `Qwen3-8b` |
| `bailian/qwen3-coder-30b-a3b-instruct` | `Qwen3-coder-30b-a3b-instruct` |
| `bailian/qwen3-coder-480b-a35b-instruct` | `Qwen3-coder-480b-a35b-instruct` |
| `bailian/qwen3-coder-plus` | `Qwen3-coder-plus` |
| `bailian/qwen3-coder-plus-2025-07-22` | `Qwen3-coder-plus-2025-07-22` |
| `bailian/qwen3-coder-plus-2025-09-23` | `Qwen3-coder-plus-2025-09-23` |
| `bailian/qwen3-next-80b-a3b-instruct` | `Qwen3-next-80b-a3b-instruct` |
| `bailian/qwen3-next-80b-a3b-thinking` | `Qwen3-next-80b-a3b-thinking` |
| `bailian/qwen3-omni-flash` | `Qwen3-omni-flash` |
| `bailian/qwen3-omni-flash-2025-09-15` | `Qwen3-omni-flash-2025-09-15` |
| `bailian/qwen3-omni-flash-2025-12-01` | `Qwen3-omni-flash-2025-12-01` |
| `bailian/qwen3-vl-flash` | `Qwen3-vl-flash` |
| `bailian/qwen3.6-max-preview` | `Qwen3.6-max-preview` |
| `bailian/qwq-plus` | `qwq-plus` |
| `fireworks/accounts/fireworks/models/deepseek-v4-flash-0731` | `DeepSeek V4 Flash (0731)` |
| `fireworks/accounts/fireworks/models/deepseek-v4-flash-vision-exp` | `DeepSeek V4 Flash Vision Exp` |
| `fireworks/accounts/fireworks/models/deepseek-v4-pro-0813` | `DeepSeek-V4-Pro-0813` |
| `fireworks/accounts/fireworks/models/glm-5p2` | `GLM 5.2` |
| `fireworks/accounts/fireworks/models/kimi-k2p6` | `Kimi K2.6` |
| `fireworks/accounts/fireworks/models/kimi-k2p7-code` | `Kimi K2.7 Code` |
| `fireworks/accounts/fireworks/models/muse-glimmer-30b` | `Muse Glimmer 30B` |
| `stepfun/step-2x-large` | `Step 2x Large` |
| `stepfun/step-image-edit-2` | `Step Image Edit 2` |
| `xiaomi/mimo-v2.5` | `MiMo-v2.5` |
| `xiaomi/mimo-v2.5-pro` | `MiMo-v2.5-pro` |



## R6B：界面修正（历史验收）

基于已提交的 R6A `b418f1f7`，保留数据事实、任意角色空默认和执行合同。未运行 Git 写入命令，未调用真实/付费模型，未提交、推送或部署。下方 R6A/R5 等记录保留为历史；本节覆盖界面相关的旧文案和样式结论。

| 项 | 本轮结果 |
| --- | --- |
| 4 | 九张带限定语的窗口统一为“数值 tokens（限定语）”，Web DOM 与编译后小程序均逐卡覆盖：SiliconFlow 6、讯飞 1 为 `≈ 131K tokens（需 YaRN）` / `128K tokens（需 YaRN；原生 32K）`；Runware 2 在 R6A 已为默认 32768，保留 `≈ 33K tokens（默认）`，不改回 YaRN 扩展窗口。精确值悬停不变。 |
| 6 | 未知模态统一使用既有灰色图标，移除 `?`，保留可访问的“未知”语义；全未知也显示灰色图标。最大输出使用同一 Lucide 图标集的 TextCursorInput，上下文仍为 ScanText。小程序现有文本布局保留灰色未知项并去掉问号。 |
| 7 | 单条或合并的已移除通知出现时，不再同时显示“还没有添加模型 / 没有匹配的模型 / 清除筛选”。短展示名用于通知、角色 helper、切换按钮、确认弹框和下线详情；API ID 仍用于查找、提交及悬停身份信息。 |
| 8 | 统一“原型号已不可用，请重新选择”，有替代时追加“。推荐：MiMo-V2.6-Flash / GLM 5.3”等短名。Web 改选复用现有有边框的次级按钮样式；我的模型通知也支持显式确认。小程序选择器复用 secondary-button，配置面板保留 role-key-button。取消不写入，确认只改当前角色；原记录/停用状态与其他角色保留。 |
| 9 | 仅来源和下线弹层设置 `min-height:0; height:auto`，覆盖移动端通用 45dvh 下限；保留最大高度与滚动。来源链接显示“下线公告 / 官方文档 · 域名”，完整 URL 保留在链接目标和悬停；小程序原生详情显示域名，复制仍得到完整 URL。DOM 验证两类弹层的计算样式及触屏交互。 |
| 10 | 网格卡片顶部对齐；标题最多两行并有完整 title。API ID 与角色标签保持一行，ID 可收缩且完整值保留在 DOM/title；连接 ID 从可见副标题移入 title，选择器也仅显示连接名。延用紧凑 padding、四条规格与共用来源/操作行，不新增卡片区块。像素高度相对 main 的“一行以内”仍需实屏验收。 |

### 验证与边界

- Web 定向：模型、目录、思考及 rendered-interactions 共 **205/205**；新增 R6B DOM **6/6**，保留原确认/取消、来源、精确身份与空默认断言。
- Web 全量：**1345 通过 / 12 失败 / 0 跳过**（1357 总数）。从 `b418f1f7` 用只读 `git archive` 解出临时源树，同一环境对失败文件复跑 **20 通过 / 12 失败 / 0 跳过**；失败名称集合完全一致。涉及 inactive-route-ui 1、professional-custom-v381 8、workflow-v400-ui 2、workspace-migration 1。本轮没有修改这些默认/迁移合同或跳过失败。
- 小程序：**130/130**，`build` / `check` 通过。源码 **1,564,174 bytes**（比 R6A 少 **195**），runtime **1,141,303**、媒体 **189,978 bytes**；原上限 **1,572,864** 不变，余 **8,690**。移除选择器未渲染的重复投影字段，复用生成的短名/hint helper；保留 availabilityNotes、版本详情、选择约束和原预算测试。`.js` 已由 `.ts` 编译。
- 生成器：scripts **28/28**；`sync-model-catalog.mjs --check`、`sync-reference-upload.mjs --check`、`generate-model-audit.mjs --check` 通过。小程序后缀为显示字段，服务端审计事实、API、价格和权限不变。
- Web build 通过，已有大 chunk 提示仍在；`git diff --check` 通过。
- 验证流程：模型目录/我的模型 → 失效通知与改选确认；模型选择器 → 灰色未知模态、带限定语的窗口；触屏来源/下线徽标 → 内容高度弹层。Browser 插件未提供，`pnpm --dir apps/web exec playwright --version` 返回 command not found；未安装依赖。以上为 DOM/组件与 CSS 计算样式证据，不是 1280/390 实屏或微信原生扫描。小程序继续暂停发布，外部实屏待办保留。

## R6A / R6A2：数据阻塞项完成（R6B 的数据基线）

继续保留工作区既有修改，完成任务 1、2、3、5、11；没有运行 Git 写命令，没有真实/付费模型调用、提交、推送或部署。main 基线仍为 `c7b6a2fc`，工作区 HEAD `5798720c`。以下是本轮结果；后面的 R4/R5 数字与“审计优先”规则仅为历史记录。

### 1 · 模态合并与全目录下限

共享显示层对输入/输出取已知支持项的并集；vision、编辑、源图、参考图及要求图像输入的 operation 至少保留图像输入。产品推导显示“图研输入要求”，不冒充“渠道公布”；未列出的模态仍为未知，明确不支持必须有官方原文。没有改变执行能力、角色、默认型号或请求参数。

全量静态 **1064** 张卡检查通过，**345 张 / 351 个模态字段**修正；其中 **41** 张原来错误显示仅文本的卡已修复，另有此前未知的角色必需输入得到补全。与 main 的已核实支持项相比，原退化实际是 **9 个精确渠道+ID / 13 个字段**，全部恢复；任务举例的“12”把 fal 同卡的输入、输出分别计入，且全量另发现百炼 `qwen3.7-max-2026-06-08`。本轮测试对全部型号逐模态核对冻结 main 夹具，未降低已知支持项。

| 渠道 | 修正卡数 | 原错误仅文本 | 原低于 main 的卡数 |
| --- | --- | --- | --- |
| zhipu | 2 | 0 | 0 |
| siliconflow | 20 | 0 | 0 |
| anthropic | 10 | 0 | 0 |
| recraft | 14 | 0 | 0 |
| xai | 10 | 8 | 1 |
| bailian | 28 | 18 | 2 |
| openai | 20 | 0 | 0 |
| ark | 4 | 0 | 0 |
| bfl | 10 | 0 | 0 |
| stability | 5 | 0 | 0 |
| ideogram | 3 | 0 | 0 |
| minimax | 1 | 0 | 0 |
| mistral | 11 | 0 | 0 |
| together | 13 | 0 | 1 |
| fal | 16 | 14 | 4 |
| replicate | 45 | 0 | 0 |
| tokendance | 8 | 1 | 1 |
| runware | 93 | 0 | 0 |
| tokenhub | 15 | 0 | 0 |
| sensenova | 4 | 0 | 0 |
| qianfan | 7 | 0 | 0 |
| iflytek | 6 | 0 | 0 |

全量 Web 与小程序投影的四字段 value/state/provenance 均一致；原对象不变断言覆盖每个型号。

### 2 · 官方 K/M 标签和整数

采用单一约定：官方给整数则存整数；只给 K/k/M 标签则存字面字符串，保留大小写、小数精度，不按 1000 或 1024 反推。两种写法并列时采用明确整数。已有 catalog 的文字标签也直接保留。整数依旧走现有 formatter，精确整数放在悬停和来源详情；标签不加 ≈。小程序仅存标签值，不再同时存一个不展示的推算整数。

全目录 **126 张卡 / 157 个 token 字段**变化，其中 **145 个字段**改用标签；源输入、canonical、claims、supplement 共 **142 处**字段变更。300 个输入正整数字段逐项记录整数原文、原厂参考、标签转换或未证实别名回退。DeepSeek `384K` 不再显示为 `≈ 393K`；Fireworks `1040k`、Step 5 `64k`、GLM Fast Preview `131K` 等保留原文精度。百炼 Kimi K3 的新官方最大输出表值为 1048576；无精确别名证据的 `kimi/kimi-k3` 旧 16384 覆盖撤回。所有逐值清单见 [单位复核](model-card-audit-20261109-units.md) 和 `config/channel-audit/review-r6a-20261109.json`。

### 3 · 图像角色的 token 展示

静态目录 437 张 image 角色卡中，**24 张**恢复已核实最大输出（Gemini 5、Together 4、fal 5、Replicate 5、Runware 5）；**410 张**仍为不适用，另 3 张缺 token 证据但有文本输出语义，显示未知。这 24 张的最大输入上限不是总上下文窗口：上下文保持未知，不凭名称或 image 角色覆盖已知 token 值，也不把输入限制冒充窗口。

### 5 · 原始 85 项冲突逐项保留

[冲突表](model-card-audit-20261109-conflicts.md) 已为全部 85 行增加“官方原文”及决定，**49 项原文支持、36 项撤回覆盖并回退**。未取得可用原文的行明确写出未证实和已检查链接，未制造引文。三条 Qwen Plus 快照按各自章节确认 131072；百炼 Kimi K3 撤回 262144；TokenDance LongCat-2.0 按该渠道精确 JSON 行确认 1000000；SiliconFlow Qwen3.8-27B 无渠道原文，回退既有值/未知。第三方 DeepSeek Flash 图像输入已撤回原厂继承；产品角色要求独立保留。

### 11 · 在线开关序列化恢复

原 qwen3-omni-flash 及日期快照均已移除；当前 Omni 3.5 明确禁止思考。使用仍在库、同 `bailian-openai-chat` 协议的 **qwen3.8-flash**，对 main/vision × true/false/省略运行 **6 次真实适配器 + mock fetch**，保留响应、单次请求、完整 URL、model、stream、enable_thinking、audio/effort/budget/extra_body 缺省断言。Omni 当前型号的另外 4 个省略路径继续断言 `modalities=['text']`；这个 Omni 专属字段不能泄漏到 Qwen3.8。旧 ID 零传输/零工作流/零记录拒绝和旧思考快照的纯序列化断言仍在。

### 全量计数：同一显示规则解析 main / head

使用当前只读计数脚本分别运行 `node scripts/count-model-catalog.mjs ../Tuyan-wt-baseline --keys` 和 `node scripts/count-model-catalog.mjs . --keys`；两根都使用本轮共同显示规则，base 不存在审计层时为空。不是把历史 UI 截图计数当作当前规则计数。输入/输出数只表示至少一个已知模态，不等于全部模态已核实。

| 分母 | 总数 main → head | 已知输入 | 已知输出 | 已知上下文 | 已知最大输出 |
| --- | --- | --- | --- | --- | --- |
| 静态目录 | 1125 → 1064 | 746 → 791 | 327 → 495 | 224 → 350 | 74 → 209 |
| 可见目录 | 923 → 919 | 869 → 868 | 819 → 838 | 411 → 412 | 68 → 181 |
| 完整 mock registry | 1122 → 1061 | 1032 → 997 | 968 → 967 | 534 → 519 | 74 → 209 |

可选模型 884 → 878；目录仍为 1125 − 68 + 7 = 1064，7 项将下线。完整差异、逐渠道卡数与逐字段修改见 [R6A 计数 JSON](model-card-audit-20261109-count-r6a.json)。完整 mock 的部分总数减少来自移除集合及无原文覆盖撤回；没有恢复已移除型号，也未改变任意角色可空默认的 H 决策。

### 小程序载荷与构建一致性

继续复用原 pack/delta codec。模态值与既有 registry 相同则存引用，差异保存运算项并在运行时取并集；图像角色下限使用同一共享函数推导。相同字段来源引用行默认来源，避免每条事实重复存 URL 索引。未展示的审核标志和移除记录日期/证据不打包；显示用来源、说明、限制、精确身份和替代提示保持。

源码包 **1,564,369 bytes**，比 main 的 1,570,043 少 **5,674 bytes**；比原上限 **1,572,864** 少 **8,495 bytes**。runtime **1,141,228 bytes**，媒体 **189,978 bytes**。未修改预算或预算测试，未压缩/混淆手写源码，已执行 tsc build，提交目录内 `.js` 与 `.ts` 一致。小程序仍暂停发布。

### 最终验证

| 范围 | 命令 / 结果 |
| --- | --- |
| 审计、目录、参考上传 | generate-model-audit；sync-model-catalog；sync-reference-upload，各自 --check 通过 |
| scripts 全套 | `node --test scripts/*.test.mjs`：28/28 |
| Web 模型、目录、思考 | `node --import tsx --import ./tests/dom-setup.mjs --test tests/*model*.test.mjs tests/catalog-isolation.test.mjs tests/provider-catalogs.test.mjs tests/*thinking*.test.mjs tests/workspace-catalog-v35.test.mjs`：179/179 |
| 小程序 | `pnpm --dir apps/miniprogram test`：128/128；build/check 和原包体预算通过 |
| 受影响 API | `thinking-bailian-console-54`、`model-audit`、`model-audit-http`：10/10；Core check 通过 |
| Web 构建 | `pnpm --dir apps/web build` 通过；已有大 chunk 提示仍在 |
| Git 只读检查 | `git diff --check` 通过；未运行 Git 写命令 |

本轮没有重跑全部 Core/Web/Gateway；不将上述定向验证写成全量通过。Browser 插件未提供，按前端验证流程尝试现有 Playwright 时 `pnpm exec playwright --version` 返回 command not found，未安装新依赖；真实浏览器截图/移动实屏和微信原生扫描仍未完成，DOM 交互已覆盖标签、来源详情和选择行为。

---

本报告取代旧轮次的基线、计数和测试汇总。PR 基线为 **main `c7b6a2fc`**；第三轮 1–6 已在 `00d04cee`，main 已于 `fe5a764d` 合入。R4 修改留在工作区，未运行任何 Git 写命令、部署或真实/付费提供商调用；不更改价格、计费、许可、权限、凭据或服务器配置。

## A–P 逐项记录

| 项 | 处理结果 | 文件与验证 |
| --- | --- | --- |
| A | 卡片按字段回退到既有已核实数据，标记 catalog / 图研既有核实，保留来源、日期和限定语；审计优先并记录冲突。 | apps/web/src/lib/catalogCardFacts.js、modelCardSpecifications.js；model-audit-r4 / model-specifications 测试及双根计数。 |
| B | 未列出的模态显示中性问号；空模态数组也为未知，只有带官方来源的明确 false / unsupported 才是不支持。Web、小程序同义。 | modelModalityIcons.js、model-picker.ts、generate-model-audit.mjs；生成器、Web 及小程序模态回归。 |
| C | 恢复既有输入/窗口断言；qwen3.8-max 的 text-only 缺明确证据，移除该审计字段以回退文本/图像/视频；Ling-3.0-flash-VL 的视频来源和 image_url / video_url 说明写入补充数据。main 的小程序默认断言保持原强度。 | provider-catalogs、bailian-multimodal、model-registry 测试；config/channel-audit/model-audit-supplement-20261109.json。 |
| D | Core 顶层和 optimizeInputs 捕获 MODEL_UNAVAILABLE，返回 400、替代提示、not_sent。 | runtime/handler.ts；model-audit.test.ts，提供商全 mock。 |
| E | 自定义 API / TokenDance 凭据预检返回相同 400；在读取凭据或调用处理器前停止。 | src/server.ts；model-audit-http.test.ts 通过内存 HTTP 走真实 Express 中间件。 |
| F | 首次同步无服务端存档及显式 import 保留历史条目；用户添加传 intent=add，继续拒绝移除 ID。已有存档普通保存仍按精确身份验证新条目。调用前可用性检查仍独立生效。 | packages/api/src/model-audit.ts、model-library.js、useWorkspaceModels.js；Gateway 首次同步/导入与 Web hook 往返测试。 |
| G | 保留生产 formatContextLimit 十进制 K/M 规则及原有 ≈；精确整数放悬停或点击详情。 | modelCardSpecifications.js、小程序 model-picker.ts；R3 格式回归。 |
| H | 保留 availabilityNotes；保留 main 对所有角色允许空默认的规则及移除默认的跳过逻辑，StepFun 默认绘图仍为空。 | scripts/lib/mini-model-catalog.mjs；model-registry / package-budget / R3 空槽测试。 |
| I | 恢复选择器思考状态、连接说明；我的模型显示连接名 · 完整连接 ID，同渠道同名连接可区分。 | ModelPicker.jsx、WorkspaceModelCatalog.jsx；model-audit-r4.test.mjs。 |
| J | 确认替换只更新当前角色；原库条目的启用/停用状态保持原样，所有其他预设继续保留原绑定。 | ModelReplacement.jsx；确认、取消、库对象不变的 DOM 回归。 |
| K | 57 个百炼删除型号在 main 均只配置 cn-beijing，全部保留删除，国际恢复和待国际公告确认均为 0。 | 逐 ID 地区表见 model-card-audit-20261109-regions.md。 |
| L | 生成器默认读取版本化最小输入快照，--check 无需私有审计目录、网络或基线工作树。 | config/channel-audit/input-20261109.json（478430 bytes）；generate-model-audit.mjs / --check。 |
| M | 报告和计数只用仓库相对路径；扫描相对 main 的全部新增差异，不含绝对本机路径。 | 本系列文档、计数脚本与 JSON；git diff 只读检查。 |
| N | 百炼 kimi/kimi-k2.7-code-highspeed 最大输出设为 null，阻止旧值回退，并注明“待核实：官方页面需浏览器渲染核对”。 | 补充数据 fieldOverrides / suppressFallback；Web、生成器回归。 |
| O | 历史沙箱失败与任务提供的沙箱外结果分别记录；本轮 head/base 的沙箱结果单独列出。 | 本文及 SYNC.md。 |
| P | Web 按静态目录顺序引用身份，保留动态目录额外行，去掉生成器 additions 清单；小程序仅带卡片/选择字段，移除不用的服务端验证函数。 | sync-model-catalog.mjs、mini-model-catalog.mjs；codec、完整小程序测试及构建。 |

## 第三轮 1–6 合并后复验

| 项 | 仍成立的行为 | 验证入口 |
| --- | --- | --- |
| 1 | StepFun 绘图默认为空，“应用此连接的默认组合”显示此连接暂无默认绘图模型；其他角色空默认也沿用 main 规则。 | model-audit-r3.test.mjs / 小程序 model-registry |
| 2 | Ling-2.6-1T、Ling-2.6-flash、Ring-2.6-1T 保留至 2026-11-15 00:00 UTC+8，替代 Ling-3.1-flash；将下线总数 7。四个更早退役型号仍不在目录。 | deprecations-addendum-20261109.json；生成器/Core/Gateway 边界测试 |
| 3 | 生产 formatContextLimit(1048576) 为 ≈ 1M，262144 为 ≈ 262K，393216 为 ≈ 393K；精确整数和完整 URL 在详情。 | Web R3 / 小程序 model-audit |
| 4 | 移除提示按当前渠道和厂商过滤；多个提示合为一个可展开通知，替代名优先短且无歧义展示名。 | Web R3；13 条公共预览夹具 |
| 5 | 移除槽为请选择 + 单句 helper + 改选确认，不在打开/刷新时自动改写；只改当前角色。 | Web R3 / 小程序移除角色回归 |
| 6 | 将下线徽标在标题旁；API ID 保持完整 DOM 和换行布局，点击徽标可读日期及替代型号。 | Web R3；1280/390 实屏仍需外部环境 |

## main 与 head 计数

运行同一只读脚本：

```sh
node scripts/count-model-catalog.mjs ../Tuyan-wt-baseline --keys
node scripts/count-model-catalog.mjs . --keys
```

计数日期固定 2026-11-09，所有外部目录请求均 mock。TokenDance 空账号目录，其他动态目录离线失败。四项已知计数使用当前同一个 `modelCardSpecifications`，分别注入两根的静态目录/既有规格/审计数据；main 无审计层，输入为空审计。数字不适用行不算已知窗口。

| 范围 | main c7b6a2fc | head |
| --- | --- | --- |
| staticRegistry | 1125 | 1064 |
| mockRegistry | 1122 | 1061 |
| catalogVisible | 923 | 919 |
| pickerSelectable | 884 | 878 |

| 已知字段 | main | head | 差值 |
| --- | --- | --- | --- |
| inputModalities | 746 | 791 | 45 |
| outputModalities | 327 | 495 | 168 |
| totalContextTokens | 224 | 350 | 126 |
| maxOutputTokens | 74 | 209 | 135 |

静态目录和可见卡片的四项总数均未下降。完整 mock registry 包括已删除历史型号，其减少另见下表逐项说明。静态净变化为删除 68、增加 7；目录净变化为移除 11 个原可见项、增加 7；可选集合增加的 7 项中 OpenAI 两个图像型号仍缺尺寸合同、保持不可选。已删除 ID 没有重新进入目录；将下线为 7；未核实为 667。既有模型库夹具 13 条原样保存，显示 10 张卡、3 条移除引用提示。生产 1408 不具备同一时点可重放快照，不作逐 ID 差额推断。

| 渠道 | 静态 base → head | mock base → head | 目录 base → head | 可选 base → head |
| --- | --- | --- | --- | --- |
| anthropic | 14 → 14 | 14 → 14 | 14 → 14 | 14 → 14 |
| antling | 6 → 8 | 6 → 8 | 6 → 8 | 6 → 8 |
| ark | 36 → 36 | 36 → 36 | 22 → 22 | 22 → 22 |
| bailian | 183 → 126 | 183 → 126 | 123 → 119 | 121 → 117 |
| bfl | 14 → 14 | 14 → 14 | 14 → 14 | 14 → 14 |
| deepseek | 4 → 4 | 4 → 4 | 2 → 2 | 2 → 2 |
| fal | 49 → 49 | 48 → 48 | 48 → 48 | 44 → 44 |
| fireworks | 26 → 20 | 26 → 20 | 26 → 20 | 26 → 20 |
| gemini | 17 → 17 | 17 → 17 | 17 → 17 | 17 → 17 |
| ideogram | 14 → 14 | 14 → 14 | 14 → 14 | 13 → 13 |
| iflytek | 34 → 34 | 34 → 34 | 34 → 34 | 34 → 34 |
| kimi | 6 → 6 | 6 → 6 | 6 → 6 | 6 → 6 |
| longcat | 2 → 3 | 2 → 3 | 2 → 3 | 2 → 3 |
| minimax | 11 → 11 | 11 → 11 | 11 → 11 | 11 → 11 |
| mistral | 18 → 18 | 18 → 18 | 16 → 16 | 16 → 16 |
| novita | 1 → 1 | 1 → 1 | 1 → 1 | 1 → 1 |
| openai | 69 → 71 | 69 → 71 | 49 → 51 | 49 → 49 |
| qianfan | 37 → 37 | 37 → 37 | 30 → 30 | 29 → 29 |
| recraft | 17 → 17 | 17 → 17 | 17 → 17 | 17 → 17 |
| replicate | 109 → 109 | 108 → 108 | 108 → 108 | 99 → 99 |
| runware | 148 → 148 | 148 → 148 | 144 → 144 | 124 → 124 |
| sensenova | 8 → 8 | 8 → 8 | 8 → 8 | 8 → 8 |
| siliconflow | 68 → 68 | 68 → 68 | 63 → 63 | 61 → 61 |
| stability | 6 → 6 | 5 → 5 | 5 → 5 | 5 → 5 |
| stepfun | 7 → 5 | 7 → 5 | 5 → 5 | 5 → 5 |
| together | 53 → 53 | 53 → 53 | 52 → 52 | 52 → 52 |
| tokendance | 74 → 74 | 74 → 74 | 0 → 0 | 0 → 0 |
| tokenhub | 49 → 50 | 49 → 50 | 44 → 45 | 44 → 45 |
| xai | 12 → 12 | 12 → 12 | 11 → 11 | 11 → 11 |
| xiaomi | 5 → 3 | 5 → 3 | 3 → 3 | 3 → 3 |
| zhipu | 28 → 28 | 28 → 28 | 28 → 28 | 28 → 28 |

| mockRegistry 已知字段 | main | head | 差值 |
| --- | --- | --- | --- |
| inputModalities | 1032 | 997 | -35 |
| outputModalities | 968 | 967 | -1 |
| totalContextTokens | 534 | 519 | -15 |
| maxOutputTokens | 74 | 209 | 135 |

| catalogVisible 已知字段 | main | head | 差值 |
| --- | --- | --- | --- |
| inputModalities | 869 | 868 | -1 |
| outputModalities | 819 | 838 | 19 |
| totalContextTokens | 411 | 412 | 1 |
| maxOutputTokens | 68 | 181 | 113 |

完整 mock 的已知数量减少仅由明确删除的历史型号造成；每个失去的已知字段都在[逐项表](model-card-audit-20261109-field-losses.md)列出，存续型号没有规格回退。

完整机器计数：[count-r3.json](model-card-audit-20261109-count-r3.json)（沿用文件名，内容已更新为 main/R4 双根比较）。85 项规格差异见[冲突表](model-card-audit-20261109-conflicts.md)，百炼逐 ID 地区见[地区表](model-card-audit-20261109-regions.md)。

## 离线证据与打包

`input-20261109.json` 仅包含生成器读取的精确 ID、字段值、来源/映射、公告和七项新增的必要证据。`model-audit-supplement-20261109.json` 保存 Ling 视频来源、已知/未知边界及 Kimi 待核实覆盖；`deprecations-addendum-20261109.json` 保存三项 Ling 时间边界。无密钥、本机路径或账户数据。CI 顺序：

```sh
node scripts/generate-model-audit.mjs --check
node scripts/sync-model-catalog.mjs --check
node scripts/sync-reference-upload.mjs --check
node --test scripts/pack-model-catalog.test.mjs scripts/generate-model-audit.test.mjs
```

普通同步与默认生成器均可独立复现；比较脚本才需要只读基线。Ling-3.0-flash-VL 的视频证据来自[Chat API](https://developer.ant-ling.com/zh-CN/docs/api-reference/chat/openai/)及[型号页](https://developer.ant-ling.com/zh-CN/docs/models/ling/)，任务提供的说明明确图片使用 image_url、视频使用 video_url，本轮未重新访问网页。

| Web 产物 | 修改前 raw / gzip bytes | 修改后 raw / gzip bytes |
| --- | --- | --- |
| modelAudit.js | 86295 / 13408 | 57528 / 8445 |
| 包含它的 WorkspaceRoot chunk | 5480897 / 796857 | 5459168 / 794198 |

构建前 chunk 为 `WorkspaceRoot-lM_XlHeN.js`，构建后为 `WorkspaceRoot-Bhzx-oTm.js`；gzip 使用 Node zlib 默认参数。

| 小程序预算测量（bytes） | main | R4 修改前 | R4 head | 上限 |
| --- | --- | --- | --- | --- |
| source | 1570043 | 1527613 | 1571089 | 1572864 |
| runtime | 1157620 | 1104307 | 1148153 | 1572864 |
| media | 189978 | 189978 | 189978 | 204800 |

源码包相对 main 增加 1046 bytes，距原 1.5 MiB 上限尚余 1775 bytes；相对修改前增加主要来自恢复 availabilityNotes 和既有规格/来源。预算未提高。源码测量含 TS，运行产物测量排除 TS；这不是微信原生包扫描。

## 验证与失败归类

| 范围 | head | 同环境 main |
| --- | --- | --- |
| 同步目录、参考上传、生成器 --check | 全部通过 | 基线只读，未重新生成 |
| 生成器 + codec + Gateway audit | 17 通过 / 0 失败 / 0 跳过（17 项） | 新增审计行为，定向 fixture 全 mock |
| Core 新增审计/预检 | 7 / 7 通过 | main 尚无审计层 |
| Core 主回归 core-composition | 193 通过 / 1 失败 / 0 跳过（194 项） | 193 通过 / 1 失败 / 0 跳过（194 项） |
| Core HTTP / 地区 / 目录定向（head 含上述 7 项） | 15 通过 / 31 失败 / 0 跳过（46 项） | 8 通过 / 31 失败 / 0 跳过（39 项） |
| Core TypeScript check | 通过 | 未改基线 |
| Gateway 全套（当前沙箱） | 190 通过 / 87 失败 / 1 跳过（278 项） | 185 通过 / 87 失败 / 1 跳过（273 项） |
| Web 全套 | 1334 通过 / 12 失败 / 0 跳过（1346 项） | 1310 通过 / 14 失败 / 0 跳过（1324 项） |
| Web 审计/模型管理定向 | 82 通过 / 0 失败 / 0 跳过（82 项） | 新增断言与恢复既有规格断言 |
| 小程序全套 | 127 通过 / 0 失败 / 0 跳过（127 项） | 121 通过 / 0 失败 / 0 跳过（121 项） |
| 根目录 + client-platform | 33 通过 / 3 失败 / 0 跳过（36 项） | 33 通过 / 3 失败 / 0 跳过（36 项） |
| 构建 | Web build、小程序 build/check 通过 | 基线只读，不构建 |

R4 上表已执行的定向范围未发现新增失败；随后操作方的全量 Core 对比发现 19 项新增失败，修复与最新验证见下方 R5。逐测试名的双根归类见[失败比较 JSON](model-card-audit-20261109-test-comparison.json)。Web 的 12 个失败均在 main 复现；main 另外两项 Vite 构建用例无法向只读基线输出文件，未修改基线以绕过。Core 主回归唯一失败是 xAI 样本已于 2026-11-02 过期；HTTP/地区定向的 31 个失败在 main 同样复现，属于本沙箱监听/本地 HTTP 限制。根目录 3 项均为 main 已有历史目录/版本快照断言。

**Gateway 两次环境结果不可混写**：任务提供的此前沙箱外完整执行为 **275 通过 / 0 失败 / 1 跳过**（276 项）；旧沙箱执行为 188 / 87 / 1。上表本轮沙箱 head 已增加审计测试，为 190 / 87 / 1；main 为 185 / 87 / 1。87 个监听失败是当前运行环境结果，不能冒充真实环境业务失败，也不能当作本轮沙箱外已重跑通过。

任务注明 main 的 account-lifecycle.mjs:146 历史失败及完整 Core 并发 1578/2/1，本轮未重跑这些额外集成/全并发范围，不把它们作为本轮新增证据。未跳过测试或降低预算；仅将与新规格/投影不相容的断言换为精确值、来源、完整投影与历史条目不变的断言。

## 预览边界

[截图夹具与 UI 路径](model-card-audit-20261109-preview.md)已更新到 13 条，新增 Ling-3.0-flash-VL。1–6 的 DOM/交互及保留字段回归通过；当前没有可用监听/浏览器环境，1280/390 实屏和微信原生扫描仍待外部验收。小程序继续暂停，生产未发布。


## R5：修复全量 Core 新增的 19 项回归

操作方提供的沙箱外全量结果为 main `c7b6a2fc` 1580 通过 / 13 失败 / 1 跳过，R5 前 head 1567 / 32 / 1。本节按失败日志中的实际测试名与文件定位；任务摘要中部分文件名错位。`core-composition`、`material-files`、`task-material-lifecycle`、`original-material-workflow` 对应的是已给出的基线失败，本轮未改这些文件。

保留 61 个退役型号和 7 个 Fireworks serverless 型号的物理删除，未改 `MODEL_UNAVAILABLE` 守卫。新增测试辅助 `tests/helpers/catalog-retirements.ts` 冻结枚举全部 68 个移除身份，逐一检查静态目录/源目录/可执行合同缺席及 `config/removed-models.json` 的精确 stopDate、sourceUrl；七项新增也逐项核对角色、未实测状态和 OpenAI 禁用原因。总量使用 **1125 − 枚举的 68 + 枚举的 7 = 1064**，不以当前目录反推预期数。历史默认仅 StepFun 已移除的 image 默认变为空，其余全部保留原断言。

以下路径均相对 `apps/paperbanana-api/tests/`；同文件的存续身份、请求内容、计费/恢复断言均保留，没有删测试或新增跳过。

| # | 文件 / 原失败测试 | 修复 |
| --- | --- | --- |
| 1 | `official-catalog-v24.test.ts` · September 29 and October 10 retirement gates | Step 两个移除 ID 改查退役证据和原审计的中国零点产品策略；即使回放历史时间也禁止调用。千帆原时间边界断言保留。 |
| 2 | `official-image-size-v24.test.ts` · all advertised SenseNova/StepFun selections | 原四型号集合减去明确枚举的两个 Step ID，并逐个断言删除证据；其余全部 504 个操作/档位/画幅组合继续检查，原 >250 覆盖门槛保留。 |
| 3 | `official-image-size-v24.test.ts` · Step image lifecycle cutoff | 从移除表读取同一 ID、日期和来源；对照历史公告及 `Asia/Shanghai` 产品零点，保留官方仅有日期、无具体时刻的边界。 |
| 4 | `thinking-bailian-console-54.test.ts` · actual Omni text and vision adapters | 使用在库 `qwen3.5-omni-plus`，保留真实适配器的双角色文本 SSE、模型 ID、端点、字段省略断言；旧 ID 在传输/工作流/计费记录前报 MODEL_UNAVAILABLE。 |
| 5 | `model-channel-contracts.test.ts` · catalog lifecycle and regional corrections | 百炼 qwen-image-edit 的存在断言改为明确缺席与精确退役证据；其他生命周期、地区、角色断言保留。 |
| 6 | `official-catalog-v24.test.ts` · v24 coverage totals | 从原清单 84 减去明确移除的两项，得到 82；main/vision/image 同样逐角色相减，为 73/26/5。 |
| 7 | `official-catalog-v24.test.ts` · v24 longcat exact identity/role | 原 v24 集合继续精确相等，LongCat-2.5 归入后续新增，并由当前目录/文本合同测试独立检查。 |
| 8 | `official-catalog-v24.test.ts` · v24 stepfun exact identity/role | 两个移除项逐一验证缺席、日期、来源与原身份；所有存续 ID 的角色、协议、未实测边界不变。 |
| 9 | `thinking-contracts.test.ts` · every full static catalog runtime disposition | 在 domestic/global 审计源补全七项精确 disposition，生成 Core/Web/support.csv；每个角色/协议仍恰好一项，并验证空 wire、拒绝未审核控制、两款 OpenAI 图像继续禁用。 |
| 10 | `catalog-20261026.test.ts` · new retirement metadata | 小米 mimo-v2.5/pro 改查缺席与精确 `2026-10-21T10:00:00+08:00` 证据；动态目录也缺席，调用报 MODEL_UNAVAILABLE 且零传输；其他日期级证据断言保留。 |
| 11 | `official-text-channels.test.ts` · official text selection | 保留历史 MaaS/LongCat 精确集合；单独检查后来新增 LongCat-2.5 的 main 角色、openai-chat 与官方端点。 |
| 12 | `thinking-other-110.test.ts` · real Fireworks adapter functions | muse-glimmer fixture 换为在库 kimi-k3，按其已审核 effort 枚举走同一 Chat Completions 文本/视觉路径，所有 wire 断言保留；旧 ID 零传输、零工作流/计费记录拒绝。 |
| 13 | `refine-controls.test.ts` · stepfun lost-submit recovery | 换用在库 SenseNova Fast，共用 callOfficialImageChannel 的同步 checkpoint/计费路径；保留一次提交、不可恢复、不重复规划/计费等全部断言，另验证 Step 旧 ID 调用前拒绝。 |
| 14 | `refine-controls.test.ts` · stepfun download recovery | 同一当前 fixture，保留下载可恢复、同 jobId、一次计费提交及规划复用等全部断言；Step 拒绝检查使用有效所属原图且零提供商调用/执行记录。 |
| 15 | `frontier-refresh.test.ts` · real dynamic catalog five routes | 注册表版本对齐 v43；五个同步路由、五个 Batch 排除及不授予图像输出的断言不变。 |
| 16 | `channels-v381.test.ts` · v3.8.1 exact identities | 精确集合增加 Ling-3.1/3.2 和 LongCat-2.5；所有既有 ID、角色、默认、Preview 与证据边界断言保留。 |
| 17 | `catalog-20261016.test.ts` · v32 preserves defaults / 20 identities | 版本对齐 v43；20 项身份原断言保留；默认逐项保留或验证退役缺席，并检查完整枚举差额。 |
| 18 | `catalog-20261026.test.ts` · weekly 19 identities | 版本与总量改为 v43 和显式增减清单；原新增身份、角色、默认和不支持协议检查保留。 |
| 19 | `catalog-20261019.test.ts` · weekly additions preserve defaults | 同上；原未实测状态、思考边界与未适配发现的关闭断言保留。 |

Omni 当前在库型号的既有审核明确不支持 thinking 开关，不能把旧快照的 true/false 权限继承给 3.5。旧快照的布尔序列化、默认省略、错误枚举测试原样保留；当前适配器检查未提供配置和空配置两个场景，并额外拒绝 true/false。Fireworks 也沿用替换 fixture 自己的已审核枚举，没有把 muse 的 xhigh 推给 Kimi。七项新增 disposition 全部为 `unconfirmed` / 空 controls，OpenAI 两款的说明明确待尺寸合同；未修改任何价格、计费实现、模型权限或可选状态。

逐文件执行指定命令 `pnpm --filter @paperbanana/paperbanana-api exec node --import tsx --test tests/<file>`，结果如下（通过 / 失败）：

| 文件 | 原生沙箱命令 | 补充内存 HTTP 验证 |
| --- | --- | --- |
| official-catalog-v24 | 56 / 0 | 无需 |
| official-image-size-v24 | 2 / 0 | 无需 |
| official-text-channels | 42 / 0 | 无需 |
| model-channel-contracts | 2 / 0 | 无需 |
| thinking-bailian-console-54 | 3 / 0 | 无需 |
| thinking-other-110 | 4 / 0 | 无需 |
| thinking-contracts | 10 / 0 | 无需 |
| channels-v381 | 12 / 0 | 无需 |
| catalog-20261016 | 2 / 6（listen EPERM） | 8 / 0 |
| catalog-20261019 | 3 / 2（listen EPERM） | 5 / 0 |
| catalog-20261026 | 3 / 2（listen EPERM） | 5 / 0 |
| frontier-refresh | 1 / 3（listen EPERM） | 4 / 0 |
| refine-controls | 1 / 19（listen EPERM） | 20 / 0 |

五个受阻文件补充内存 HTTP 验证合计 **42/42**，加上无需监听的八文件 **131/131**，13 个受影响文件的全部断言共 **173/173**，包含上述 19 个原失败测试。原生沙箱命令仍为 141 通过 / 32 个监听失败 / 0 跳过；32 个均在请求断言前因绑定 loopback 失败，不能当作通过。补充验证使用临时、不提交的 Node HTTP shim，把 loopback 请求交给原服务器 request listener；测试代码、Gateway/Core 中间件与所有断言照常执行，提供商仍全部 mock。它不代表沙箱外真实监听或全量 Core 已复跑；操作方仍需按原命令复核全量。

其他回归：Web 模型/目录/思考测试 **180/180**；小程序 **127/127** 及 build 通过；Core `check` 通过。根目录 `node --test scripts/*.test.mjs tests/*.test.mjs` 为 head **56 通过 / 3 失败**，同环境只读 main 为 **49 / 3**，失败名相同：旧审计行 siliconflow/ERNIE、760 历史数量快照、DeepSeek-V4.1-Flash 版本元数据；数量快照实际值 head 761 / main 822，均属原有快照过时，非声称错误值完全相同。目录、参考上传两项 `--check`，以及 thinking 同步和审计生成器 `--check` 均通过。

小程序 build 后源码 **1,571,089**、runtime **1,148,153**、媒体 **189,978 bytes**；源码距未提高的 **1,572,864** 上限仍余 **1,775 bytes**。本轮没有 Git 写命令、网络提供商请求、付费调用或生产发布，既有未提交修改保留。

## 沙箱外全量测试（main c7b6a2fc vs head ccb972e2，同一台机器）

| 套件 | main 通过/失败/跳过 | head 通过/失败/跳过 | 新增失败 |
| --- | --- | --- | --- |
| Web | 1312 / 12 / 0 | 1334 / 12 / 0 | 0（12 项同名，均在 main 复现） |
| paperbanana-api (Core) | 1580 / 13 / 1 | 1586 / 13 / 1 | 0（13 项同名，均在 main 复现，含已到期 xAI WebP 样例） |
| auth-gateway | 272 / 0 / 1 | 277 / 0 / 1 | 0 |
| 小程序 | 121 / 0 / 0 | 127 / 0 / 0 | 0 |
| scripts/*.test.mjs | 20 / 0 / 0 | 27 / 0 / 0 | 0 |
| tests/*.test.mjs（根目录） | 29 / 3 / 0 | 29 / 3 / 0 | 0（与 PR #247 记录的 29/3 一致） |

Web / 小程序构建、Core `tsc --noEmit`、`sync-model-catalog --check`、`sync-reference-upload --check` 均通过。小程序源码包 main 1,570,043 → head 1,571,089 bytes（上限 1,572,864 未改，余 1,775）。CI 中 account-lifecycle.mjs:146 依赖 Mongo 副本集，本机未运行，按 PR #247 记为 main 已知失败。


> 2026-11-09 R6 复算（2c6363b5，同一 count 脚本同时作用于 main c7b6a2fc 与 head）：上表三组已知字段已更新为 R6 规则（角色所需图像输入下限、官方 K/M 标签、图像卡 token 值）下的结果。main 侧数字随规则同步复算，因此与 R4 记录不同。mockRegistry 与 catalogVisible 的减少全部来自已删除型号（catalogVisible 删除 11、新增 7）；全目录测试确认存续型号没有低于 main 的已知模态。

## R6 沙箱外全量测试（main c7b6a2fc vs head 2c6363b5，同一台机器）

| 套件 | main 通过/失败/跳过 | head 通过/失败/跳过 | 新增失败 |
| --- | --- | --- | --- |
| Web | 1312 / 12 / 0 | 1345 / 12 / 0 | 0 |
| paperbanana-api (Core) | 1580 / 13 / 1 | 1586 / 13 / 1 | 0 |
| auth-gateway | 272 / 0 / 1 | 277 / 0 / 1 | 0 |
| 小程序 | 121 / 0 / 0 | 130 / 0 / 0 | 0 |
| scripts/*.test.mjs | 20 / 0 / 0 | 28 / 0 / 0 | 0 |
| tests/*.test.mjs | 29 / 3 / 0 | 29 / 3 / 0 | 0 |

失败名称集合与 main 完全一致。Web / 小程序构建、Core `tsc --noEmit` 通过。小程序源码包 main 1,570,043 → head 1,564,174 bytes（上限 1,572,864 未改）。
