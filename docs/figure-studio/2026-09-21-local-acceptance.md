# Figure Studio 本地验收记录 · 2026-09-21

本阶段实现与本地验收完成，尚未生产发布。源稿/SVG 保留独立对象；PDF/EPS 转换可用，但此次外部编辑检查发现文字对象合并和分组丢失，不能声明与源稿对象结构完全等价。付费模型、生产端到端链路、Illustrator、PDF/EPS 同格式编辑往返及外部改稿重导入均未验证。

## 代码与证据范围

- 工作树：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/figure-studio-20260921`。
- 基础提交：`4a601b932a09a3f59f717a7100f1b8b51e0e0b44`；本记录对应其上本轮本地修改，不是生产运行 revision。
- 设计：[批准范围](../superpowers/specs/2026-09-21-figure-studio-design.md)；执行：[实现计划](../superpowers/plans/2026-09-21-figure-studio.md)。
- 实际文件证据根目录：`/Users/a1-6/.codex/visualizations/2026/09/21/tuyan-figure-studio/`。以下相对证据路径均相对此目录；本机证据没有随文档自动上传到仓库。
- 网页验收使用本地纯前端预览，未连接 Gateway/Core。模型测试使用 mock；真实 PDF/EPS 服务转换另行调用本地 service 检查。三者不能合并称为浏览器经登录网关完成的生产端到端验收。

## 本地交付

独立 `/figure-studio/` 路由与原工作台平级。`tuyan.figure/v1` 作为唯一源稿，文字、矩形、椭圆、面板、线段、箭头与图片是独立对象；几何使用 mm，字号使用 pt。首阶段自动落图范围是流程/关系结构，以及基础图形与图片组装；不声称能够自动生成任意统计图或复杂科研插画。画布编辑、模型动作和撤销/重做共用版本校验与原子命令。草稿仅存当前浏览器，可下载和重新打开源稿；没有云图稿库。

模型 action 经过已有认证网关，必须明确选择受支持的原生主模型并提供用户自己的 Key；当前不支持托管观猹或通用 API。模型只规划结构或返回受限对象更新，不隐式生图，不自动重试。面板编辑会明确展示面板与递归后代的作用域，超过 40 个对象时在调用前拒绝。已返回但未通过结构检查的模型结果保留可能计费语义。

导出仅接受通过验证的文档，由服务内部渲染 SVG；不接受任意 SVG、脚本或远程资源。图片实际解码、进程运行时间/字节/并发有界，临时目录独立并清理。源稿、文件 SHA-256 和实际文件检查报告分别绑定；同 ID、同 revision 但内容不同的源稿也会使旧报告失效。四状态为 `passed`、`problem`、`manual`、`unverified`。

当前只有 Nature 主图最终制作的版本化示例基线，来源与核对日期写入 profile。工作覆盖、个人预设和自定义检查不改写官方基线；科学事实、因果关系、AI 政策与期刊最终接受不由技术检查代替。没有声称覆盖 Science、所有 Nature 子刊或所有学科的专业准确性。

## 自动检查

下列数量是各自测试范围的结果，存在包含关系，不应求和为唯一测试总量。

| 范围 | 结果 | 证据 |
| --- | --- | --- |
| figure-core | 37/37 | 本轮 Core 执行记录 |
| Web 最终默认测试入口 | 479/479 | `/tmp/tuyan-figure-web-final.log` |
| Node API 全量 | 661/661 | `/tmp/tuyan-figure-api-full.log` |
| Node API Figure Studio，最后一次面板提示词修改后 | 16/16 | `/tmp/tuyan-figure-api-scoped-final.log` |
| Gateway app | 45/45 | 本轮 Gateway 执行记录 |
| API HTTP | 23/23 | 本轮 HTTP 执行记录；亦在 API 全量范围内 |
| 匿名 MCP | 10/10 | 本轮 MCP 执行记录 |
| 共享 Figure Studio 请求 | 1/1 | 本轮共享 API 执行记录 |
| Web build | 通过 | `/tmp/tuyan-figure-web-build-final.log`；21:03 再次通过，保留已有大 chunk 提示 |
| API 类型检查与 build；diff 检查 | 通过 | 21:03 再次检查；build 见 `/tmp/tuyan-figure-api-build-final.log`，类型/diff 见本轮执行记录 |

Web 交互用例已由 `interaction.test.js` 引入 `interaction.cases.jsx`，最终 479 项包含这些用例，避免默认 Node 测试发现遗漏 `.jsx`。API 661 项在最后一次提示词调整前完成，调整后另跑 16 项针对测试；不把这两次记录伪装成同一次完整运行。

独立审查发现并关闭了：坏像素流绕过容器检查、规划替换超过命令数量限制、导出报告未呈现、同 ID/revision 异内容报告误认、面板子对象不在语言编辑作用域，以及规划字段长度契约漂移。采用实际解码、单个原子替换、报告下载与完整内容身份核验、显式递归作用域及一致限值修复。

## 网页人工交互

桌面 1440 × 980 已验证独立空画布与 14 对象示例。示例明确标为非模型生成、非研究结论；修改“研究输入”为“样本输入”，撤销、重做和 reload 保留文稿与单调递增版本。4 pt 文字触发官方问题，关闭工作字号限制后官方问题仍在。新增/删除 DPI 规则、保存/应用个人预设已操作。

已触发实际 SVG 下载并显示 4054 字节及 SHA-256 报告；打开显式字体的 8 对象源稿、添加 PNG 成为 9 对象后删除。拖动矩形 X 从 10 到 13.3 mm，绑定箭头起点从 35 到 38.3 mm，终点 53 mm 保持不变。

手机 390 × 844 验证 `scrollWidth = innerWidth = 390`，无横向溢出，无编辑工具栏；源稿打开和导出对话框可用。回到旧工作台后生成、历史、精修控件仍在，更多菜单增加同级图稿编辑链接。旧工作台没有迁移其生成/精修流程。

本地预览未连接后端，因此服务能力请求的网络失败属于该测试环境边界。已检查本次浏览器 `dev.logs`：12:36 开发热更新阶段有一条重复 `createRoot` 警告；13:01:29 整页 reload 后页面正常，13:01 后未出现新 error。这不表示整个会话 console 零错误，也不代表在线后端链路已验收。

## Inkscape 与实际文件

本机版本为 `Inkscape 1.4.4 (dcaf3e7, 2026-05-05)`，使用 `/Applications/Inkscape.app/Contents/MacOS/inkscape`。自动检查另依赖 Poppler 与 Ghostscript。仅对本轮合成 fixture 作结论。

| 格式/场景 | 已观察结果 | 明确限制 |
| --- | --- | --- |
| SVG 原始对象 | 4 个 text 和独立形状/分组；原生 UI 修改单处文字、移动椭圆、保存并重开通过 | 只覆盖该 fixture 和此 Inkscape 环境 |
| PDF 导入 Inkscape | 可打开并修改文字/路径；同一水平线上的 Input/Output 标签合并，成为 3 个 text、6 条 path，原分组丢失 | 不保留与源稿一一对应的独立对象；编辑结果仅另存 SVG |
| EPS 导入 Inkscape | 可打开并修改文字/路径；同样观察到 3 个 text、6 条 path及原分组丢失 | 编辑结果仅另存 SVG；未验证 EPS 同格式保存重开 |
| 显式 `Arial Unicode MS` 的中英文 fixture | PDF/EPS 可解析、渲染，预期英文和中文均可提取 | 字体依赖本机安装；此字体在当前 Nature 标准字体基线仍报 `problem`，不自动放宽官方规则 |
| 默认 Arial 的中文 fixture | Inkscape PDF 进程 exit 0，但文件缺少 xref/EOF，Poppler 无法解析；实际 service 返回 502，不提供下载 | 进程成功不等于文件成功；不自动换字体或转曲 |
| 科学符号 `α β ≥ 10 μm` | PDF 精确提取通过；PDF/EPS 渲染外观经肉眼对照一致 | **EPS 精确提取失败，α/β/≥/μ 变为控制字符；视觉一致不等于编码保真** |

主要证据：

- `compatibility-explicit-font/automated-report.json`：显式字体英文/中文提取与渲染；对应 `source.tuyan.json`、`figure.svg`、`figure.pdf`、`figure.eps`、文本/字体报告和渲染图。
- `compatibility-explicit-font/figure-native-edited.svg`、`pdf-native-edited.svg`、`eps-native-opened.svg`：本轮原生 UI 相关工件；这些 SVG 不能证明 PDF/EPS 同格式往返。
- `compatibility-default-font-final/automated-report.json`：默认字体 PDF 无法解析，EPS 中文精确提取失败。
- `compatibility-scientific-labels/automated-report.json`：最新科学符号检查，PDF `scientificSymbolsExtracted=true`，EPS `false`；配套 `pdf-text.txt`、`eps-text.txt` 与两张渲染图。
- `service-export-report.json`：实际 service 对默认字体坏 PDF 返回 502；显式字体 PDF/EPS 返回文件和 scoped verification。它验证服务转换行为，不代表整个浏览器认证链路已联通。

自动报告中的 `independentObjectEditing`、`saveAndReopen` 仍为 `not_verified`，因为该脚本不操作编辑器 UI。上面的原生 UI 观察另行记录，没有回写或篡改原自动报告。生产报告继续将外部兼容性列为人工检查。

## 复现命令

在上述 worktree 根目录，使用 Node 24 和已安装的 pnpm 依赖。以下命令不调用付费模型。

```sh
node --test packages/figure-core/tests/*.test.js
pnpm --filter @paperbanana/web test
pnpm --filter @paperbanana/web build
pnpm --filter @paperbanana/paperbanana-api test
pnpm --filter @paperbanana/paperbanana-api exec tsx --test tests/figure-studio.test.ts
pnpm --filter @paperbanana/paperbanana-api check
pnpm --filter @paperbanana/paperbanana-api build
node --test apps/auth-gateway/tests/app.test.js apps/auth-gateway/tests/mcp.test.js
node --test packages/api/src/figure-studio.test.js
```

兼容性脚本写入新的 `/tmp` 目录，不覆盖本轮证据。脚本输出和 JSON 必须逐项查看，退出码只反映解析/渲染失败，**不能用退出码 0 掩盖 EPS 的科学符号提取失败**。

```sh
PAPERBANANA_INKSCAPE_PATH='/Applications/Inkscape.app/Contents/MacOS/inkscape' \
FIGURE_PROBE_CJK_FONT='Arial Unicode MS' \
node scripts/verify-figure-studio-exports.mjs /tmp/tuyan-figure-explicit-font-recheck

PAPERBANANA_INKSCAPE_PATH='/Applications/Inkscape.app/Contents/MacOS/inkscape' \
node scripts/verify-figure-studio-exports.mjs /tmp/tuyan-figure-default-font-recheck
```

打开生成的 SVG/PDF/EPS 后，应分别核对文字内容、单个对象选择、层级、一次文字和位置修改，再同格式保存重开。当前记录只完成上述表格中的实际步骤，不能因为存在这套复现步骤而将待做项改为通过。

## 后续阶段与未关闭的验收边界

- 尚未发布生产版本；生产运行环境本轮没有配置 Inkscape。Docker 仅补共享包 COPY，未安装生产转换器；能力接口须在缺失转换器时返回 PDF/EPS 不可用。
- 尚未进行真实付费规划或语言编辑；模型测试的路由、鉴权、费用状态、超时与不重试证据来自 mock，不能证明真实渠道的结果质量和账单。
- 尚未完成登录 Gateway → Core → 模型/转换器 → 浏览器下载的整体在线验收；本轮 console 检查仅具有上述本地预览边界。
- Illustrator 尚未验证；PDF/EPS 同格式编辑保存再打开尚未验证；外部修改的 SVG/PDF/EPS 重新导入图研尚未实现/验证。只有图研源稿 JSON 重开属于本阶段已交付能力。
- EPS 科学符号编码失败和 PDF/EPS 对象合并、分组丢失是已知兼容性限制，后续应单独解决或明确约束支持范围，不能仅凭视觉相似宣布通过。
- 目前有全局模型与转换并发限制，尚无按用户配额。生产资源治理作为后续发布准备单独处理。
- 更多期刊/阶段/用途、对应 AI 政策核验、云端源稿库与触摸编辑属于后续阶段；作者仍须确认专业事实、数字、单位、关系与证据。
