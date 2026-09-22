# 论文画布公共接入与验收 · 2026-09-22

## 当前状态

本轮已实现公共模型接入、持久操作记录与恢复；用户正常登录并连接 TokenDance 后，**2 次真实 Qwen3.8 Flash 文本调用及画布恢复链路通过**。PDF/EPS 已完成受限 Linux 验证和 Mac 同格式编辑回环，结论为有条件兼容：PDF 外部另存缩放页面、内容和字号；EPS 首次独立编辑通过，保存重开后部分标签再次合并。通用 API 是唯一仍缺用户凭据的真实联调链路；最终 CI/发布审核仍待。**尚未合并或部署。** 不承诺跨软件无损。

- 已同步 main `0d8b0b4500eb9ca6d8b1b5180450276c7f78b2fb`（#224）。论文画布已有 `0374995`、`9ebba0f`、`632af60`、`29b3101` 仍属于独立 `codex/figure-studio-20260921`。
- 本轮实现提交为 `f8d2a0e95c78c45d69044f6fc1884a7d3a926832`（含前端 `523ea6f`，尚未 push）；[PR #225](https://github.com/yrjmdqmmx/Tuyan/pull/225) 仍为 draft。已有远程 CI 仅覆盖 `de44b604`，最终含文档提交的 CI 待核验。
- 已核对“恢复 Tuyan 模型目录交接”的精修分支 `codex/refine-controls-runware-tokenhub-20260922`，最终本地提交 `8bc6e246e48c66c62884bb2fb9f01e2e3ca6f6f9`，对方确认未推送/未部署；未导入其独立分支工作，也未更改其 `provider-workflow.ts`、`provider-egress.ts`、`jobs.js` 或运行中的 5173/8791 服务。
- 本轮共享改动限于 figure API/类型、通用 API 面板可选角色、TokenDance 文本调用可选输出上限及对应生成代码。工作台默认角色仍为 main/vision/image，保存画布设置会保留另外两个角色。

## 公共能力及故障边界

账号和会话沿用网站 AuthProvider/Gateway；使用原模型目录、ModelPicker、GenerationSettingsDrawer、NativeCredentialFields、TokenDancePanel 与通用 API 连接信封。仅画布材料、结构方案、对象命令、文档版本校验属于专有逻辑。

Plan/Edit 使用客户端固定 requestId + 完整图稿 SHA-256。重复 ID 的相同请求查询原结果，不同输入拒绝；网络错误只查询原 ID。账号代际与租约同时在传输前核验，同账号跨实例最多 2 个在途操作。结果/检查点加密暂存 7 天，账号注销清理；本地仅存无密钥的操作指针。未知付费状态不重放，只有共享渠道恢复机制判定安全时才能显式恢复。原生渠道失败暂不开放恢复。

独立审查复现并修复了账号切换时目录加载竞态、跨实例限额竞态、重启恢复状态不匹配、旧租约恢复后越过新槽位的四个问题；回归使用合成传输，不是实际供应商验收。

## 验证证据

| 层次 | 结果 | 限制 |
| --- | --- | --- |
| Core | 本轮全量 686/686（`/tmp/figure-final-api-tests.log`）；最终 EPS 修复后 figure-core/runtime 合计 53/53、figure service 18/18、类型检查、真实 Docker build 与受限 Linux smoke 通过 | 自动测试使用合成传输；最终提交仍需远程 CI |
| Web | 本轮完整 564/564、build 通过 | 保留现有大 chunk 提示；已本地提交，尚未 push |
| Gateway / 账号 | 定向 app 46/46 通过；用户在本地共用登录入口正常登录并连接 TokenDance | 不记录邮箱、完整余额或凭据；未导出正式站 Cookie |
| 共享 SDK / 本地 auth | 已记录 17/17 通过；模型目录 760 项生成无漂移 | 目录可见与推理成功分开记录 |
| 真实文本推理 | Qwen3.8 Flash 规划、单标签自然语言修改各 1 次成功，共 2 次；刷新恢复、过期版本拒绝通过 | 仅小型联调材料；通用 API 真实推理仍缺用户连接凭据 |
| 真实 MongoDB | 8.0.16：同 ID 跨实例、2 槽限额、全新 Node 进程读回 native/custom 加密结果且零执行、账号切代拒绝、TTL/命名空间隔离均通过；已接入原 disposable Mongo CI runner | 每次 5 个合成 dispatch，外部供应商调用 0；仅清理自己创建的测试库 |
| Linux 导出 | Inkscape 1.2.2、Liberation/WQY 字体；真实 linux/amd64 非 root、只读、断网、1.5 CPU/3 GB、128 MB tmpfs 转换；PDF/EPS 全部 5 类样例文字检查和 sharp 回归通过 | 运行时约新增 386.1 MiB 系统包；本地临时 Debian 镜像源覆盖，仓库保留官方源；外部编辑回环另列 |
| 浏览器 | Chrome 桌面 1440×900、移动 390×844；沿用公共导航，折叠/还原、适合窗口、抓手、文字编辑、撤销、源稿保存重开及下载通过 | 桌面普通编辑区高 738 px，整页高 1019 px，可正常滚动；移动端沿用查看/导出范围 |

抓手实测中 SVG 屏幕位置由 (-139, 192.984) 移至 (1, 221.984)，`width=183mm`、`height=70mm`、对象 14 个、版本 0 不变。文字修改只改所选标签，版本增至 1，撤销恢复文字且版本增至 2。移动端沿用既有阶段范围：查看/导出/规则检查，对象编辑仍需宽屏电脑。

浏览器实际下载 SVG 4056 字节，SHA-256 `079a400815d112b57b4580602ffff31039dbd1300effda8ec4054550f51d5103`，与页面报告一致；下载的源稿重开后仍是 183×70 mm、14 个对象。此为明确标注的结构示例，不是模型生成结果。

随后真实规划生成 18 个对象；手动改标签后，自然语言操作只修改指定单个标签。刷新读回原操作、恢复结果，旧文档版本拒绝应用，源稿保存重开通过。该图稿仍为标注“非真实研究结论”的联调样例，不代表任意统计图或复杂科研插画已自动生成。

## Inkscape 真实兼容性

Linux Inkscape 1.2.2 导出，macOS Inkscape 1.4.4 手动导入/编辑。原始文件与截图保存在本机证据目录 `/Users/a1-6/.codex/visualizations/2026/09/22/tuyan-figure-integration/`。以下保留修复前失败条件，再记录修复后验证，不能用新结果覆盖旧环境的失败。

### 修复前已观测结果

| 格式 | 打开/外观 | 文字 | 独立对象 | 保存后重开 |
| --- | --- | --- | --- | --- |
| SVG | 可打开；字体按本机回退 | 单独将 Input 123 改为 Input 123 edited，其他 5 标签未变 | 6 个独立 text 保留；矩形可单独移动 | 另存 SVG、关闭、重开通过；89×70 mm 不变 |
| PDF | 实际文件解析渲染通过；初始导入显示所有标签 | 中文及 α β ≥ 10 μm 精确提取通过，但 Inkscape 内部导入合并全部 6 个标签 | 编辑副本中的合并文字排到白底/彩色框之前并被遮挡；矩形仍可单独操作 | 回环未通过；具体遮挡发生于导入、编辑还是选择焦点操作尚未定位，不能据此单独认定原 PDF 绘制顺序错误。未将 SVG 中间副本当作 PDF 同格式回环通过 |
| EPS | 实际解析与渲染通过 | 中文/Latin 可提取；科学符号编码失败 | 未通过完整独立对象编辑验收 | 未验证 EPS 同格式回环 |

另有两项明确环境失败：Mac PDF 再次导入曾无响应，隔离 CLI 导入也超时，测试进程已停止；本机 Mac Inkscape 使用默认 Arial 的中文 fallback 导出实际 18 对象文档时，进程 exit 0 但文件停在字体字典、缺 xref/EOF，服务正确拒绝。仅诊断副本显式使用 Arial Unicode MS 后导出完整，用户源稿字体没有被改写。

### 本轮修复与当前边界

- **PDF 标签边界：** 仅服务转换输入增加每个文字标签的整页裁切边界，阻止 Cairo 把相邻标签合为一个绘制文本块；下载 SVG、源稿、背景和页面尺寸保持不变。四侧越界、两层 panel、多行文字，以及私有 SVG 的 -28°/20° 旋转诊断，修复前后 144 dpi 渲染像素及提取文字一致。旋转仅用于诊断，当前图稿 API 仍不支持 transform。
- **PDF 导入：** Linux 1.2.2 将混合字体标签保留为独立组内的多个文字运行；Mac 1.4.4 候选导入副本实际保留 6 个独立标签组和 6 个 text，背景位于它们之前。但缺字体时 Explicit/中文标签被替换成 Webdings，导致外观错误。`runtime-fonts/` 保存生产同版本的 5 个原始字体、许可证和 SHA，供明确的同字体对照；该条件下的结果不能外推为缺字体环境通过。
- **EPS 字体与标签边界：** 为受控 Cairo Type42 输出的重复 FontName 添加唯一子集前缀，并在转换输入保留整页裁切，以标准非绘制 pdfmark BMC/EMC 标记隔离文字块；不改源稿/下载 SVG、不转曲，不能安全识别的资源拒绝处理。中文及 α β ≥ 10 μm 精确提取通过；普通路径与强制 fallback 路径均保持直接渲染像素一致。
- **实际文件：** 受限 Linux smoke 对 PDF/EPS 均要求全部 5 类样例文字精确提取，EPS 不允许以已知编码失败通过 gate。真实图稿服务导出 PDF 35,403 字节；最终 EPS `live-export-boundaries.eps` 为 80,304 字节，13 个文字标签全文精确。不透明 PNG-only EPS 也完成真实服务导出。文件身份 SHA 见证据 `acceptance-status.json`。

### Mac 同格式编辑回环

在安装与 Linux 运行时一致的 Liberation Sans / WenQuanYi Micro Hei 字体后，实际图稿 PDF 经 Inkscape 1.4.4 的 Internal import 打开，单独修改标签及移动矩形，选择 Embed fonts 另存为 `live-native-edited.pdf`，再以 GUI Internal import 重开。`Measurement revised` 仍是可单独编辑的 19 字符标签；仅该标签增加 revised，其余中英文、科学符号全文保留。前后均有 13 个独立文字绘制块，3 个矩形仍独立；扣除页面缩放后，被操作的中间矩形移动约 3.00216 pt（4.0029 CSS px），符合两次 Right 操作。文件有效、1 页，3 个字体均嵌入、子集化并有 ToUnicode。截图为 `inkscape-live-pdf-reopened.png`。

**该 PDF 回环只证明上述文字/对象操作和重开通过，不是尺寸或字号无损。** 图研原始导出约 183×70 mm（518.740×198.425 pt）；Inkscape 另存后变为 183.091667×70.202778 mm（519×199 pt）。内容的 x/y 缩放分别为 1.000500912 / 1.002896825，字号矩阵从 6 变为 6.003005 / 6.017381；不是仅增加页边空白。期刊精确尺寸与字号仍须以外部另存后的实际文件重新核验。此观察不改变原图研导出尺寸正确的结果。

最终 EPS 首次 Mac GUI 导入后，Measurement 为独立 11 字符标签；改为 `Measurement revised`，第二矩形单独 Right 两次均成功。以 Embed fonts、EPS level 3 另存 `live-native-edited.eps`（78,559 字节），再从文件打开流程导入，外观和修改保留；但该标签与下一行合并为一个 48 字符对象，见 `inkscape-live-eps-reopened.png`。因此首次独立编辑、保存内容和重开通过，反复保持独立对象未通过，Web 已提示此限制。仅指定文字增加 revised，其余中英文/符号精确，3 个嵌入字体保留；中间矩形移动 3 pt，其余不变。BoundingBox 从 `0 0 519 199` 变为 `0 1 519 200`，裁剪宽高仍为 519×199 pt；文字绘制块由 13 减为 4，边界标记消失。Linux 导入也观察到文字对象 19→15，合并方式与 Mac 不同。

修复前“首次就合并成 40 字符”的截图 `inkscape-live-eps-merged-edit.png` 仍保留。SVG 与图研源稿是继续编辑的优先交付；上述 Mac 同字体环境结果不覆盖缺字体环境或其他编辑软件。

本地受认证 API 通过临时 `PAPERBANANA_INKSCAPE_PATH` wrapper 调用固定生产字体/转换器镜像 `sha256:a956c5983c8af172848e06ffa051b2eea249859a91d6cc577db70404cceac032`，不改图稿字体设置。为 Mac 同字体对照，已将运行时的 5 个同款字体安装到 `~/Library/Fonts`，原文件、许可证和 SHA 保存在 `runtime-fonts/`。Wrapper 只挂载单次转换目录、断网、只读根文件系统并限制资源；Mac 绑定目录使用调用者非 root UID/GID，生产镜像仍使用 UID 1000。Mac Inkscape 继续承担外部软件验收。

证据索引：`linux-exports/` 保留原始失败样例；`pdf-diagnostic/` 保存导入、字体和实际图稿对照；`pdf-boundary-regression/` 保存边缘/旋转检查；`compat-exports/` 保留第一轮修复验证；`eps-final-runtime/automated-report.json` 为最终合成样例的真实转换结果，同目录 manifest 记录归档 13 文件的 SHA。根目录 `live-native-edited.pdf/.eps` 与对应 reopened 截图是原生回环证据。`acceptance-status.json` 汇总当前状态与实际文件 SHA，历史失败独立保留。

仅省略白底不能解决彩色框遮挡及标签合并；转曲也不能替代文字编辑。服务报告继续将外部编辑和期刊最终文件要求标记为人工核验。期刊自动格式检查不代表科学内容或 AI 政策已通过。

## 远程集成修复

首轮远程 CI 的真实 Figure Linux smoke 通过，但 Benchmark companion Docker 构建遗漏 `packages/figure-core` 依赖，已补两条 COPY；真实 linux/amd64 worker build 和部署契约 32/32 通过。该修复没有降低导出验收条件；本轮 EPS 修复进一步把精确文字检查设为必须通过。HEAD `de44b604` 已记录 CI 成功，本轮实现已提交为 `f8d2a0e`，最终含文档提交仍需完整 CI。

## 真实联调与发布门槛

用户已授权本轮最多 6 次文本调用、累计最高 ¥1，不充值、不自动重试、不调用图像模型。当前 **实际文本调用 2 次，均成功；观测余额差为 ¥0.002692**。该差额不是逐次账单核销，不能据此伪造每次调用费用或声称账单已对齐；原总次数与总金额上限仍有效。

- 真实本地预览 `http://127.0.0.1:5290/figure-studio/` 已通过共用入口正常登录、连接 TokenDance 并完成两次文本推理；本地 Mongo、源稿与加密凭据独立，不接生产 DB。不提取正式浏览器 Cookie 或伪造身份。
- TokenDance Qwen3.8 Flash 官方目录当日可见输入 ¥0.8、输出 ¥2.7/百万 token，画布上限 4096 输出 token。真实验收使用小型联调材料，规划和自然语言编辑各一次；不自动追加调用。
- 用户暂不能提供通用 API 连接和 Key。该真实链路明确未验证；本地消费脚本在 DNS/传输前拒绝 custom 推理并标记 not_sent。
- 通用 API 真实链路及最终 CI/发布审核未关闭前保持 draft，不合并、不触发部署。上述有条件兼容边界不作为跨软件无损实现门槛。后续发布按 [清单](2026-09-22-release-checklist.md) 使用固定 SHA/digest 和现有 GitHub 环境审核，不绕过 required reviewer。
