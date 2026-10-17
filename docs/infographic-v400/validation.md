# 本地验证记录

2026-10-10，工作树和 HEAD 见 [交付入口](README.md)。不包括真实模型逐图型效果、线上部署和小程序验收。

## 自动检查

|范围|结果|证据|
|---|---|---|
|Core 完整回归|1198 / 1198|[最终日志](evidence/core-tests-final.log)|
|Web 完整回归|631 / 631（305 mjs＋326 js）|[mjs](evidence/web-tests-final.log)、[js](evidence/web-tests-js-final.log)|
|分类注册表|7 / 7|[日志](evidence/taxonomy-tests.log)|
|知识包|13 / 13|[日志](evidence/knowledge-tests.log)|
|网关 MCP|11 / 11|[日志](evidence/gateway-mcp-tests.log)|
|Core 类型与构建|通过|[类型](evidence/core-typecheck-final.log)、[构建](evidence/core-build-final.log)|
|Web 构建|通过；主分块较大|[日志](evidence/web-build-final.log)|
|真实绘图/数值探针|40 / 40|[结果](evidence/plots/results.json)、[日志](evidence/plot-checks.log)|
|真实受限 worker 子进程|40 / 40|[结果](evidence/plots/worker-results.json)|
|中文 4K|4096×2304，通过|[结果](evidence/plots/chinese-4k-result.json)、[实际 PNG](evidence/plots/chinese-4k.png)|

最初 Core 全量有 1 项失败，是新增准确学科标注后旧 fixture 仍期待“跨学科研究”。更新 fixture 后独立针对性 17 项通过，最终完整 1198 项全部通过。Web 此轮还修正数据 4K 被未使用的 1K 生图配置重置、重复密度选项、数据 SVG/实际 PNG 不一致。保留早期日志以便审计，结论以上表最终日志为准。

最终纯文案修正“邻接矩阵行 row、列 column”后，再执行分类/核心合同与构建复核；不改变数值逻辑。

## 数据图验证口径

输入是明确标记的合成 QA 数据，不是论文研究结果。每类保留 JSON 输入、实际生成 Python、PNG 和 worker PNG。除执行成功/图元一致性外，加入独立可手算探针：直方计数、箱线中位数、密度面积近 1、ECDF 阶跃、KM 风险集与删失、Bland–Altman 偏倚与界限、森林区间、瀑布累计、甘特起点与长度、玫瑰面积、UpSet 交集、矩阵朝向、矢量分量、等值线级别。中文另检查原始数据 2/7 与目标像素，不靠生图升清。

Core 接口测试截获实际发送结构，验证全类型合同进入 PNG/Recraft/观察上下文；流程图与数据图具有不同规则。数值任务只有主模型规划/评审与 worker，没有 images 调用；模型文本不能替换数据。缺数据、未知统计口径、候选渲染器、变体、混合数据组合、未核验参考图在调用前阻断。兼容参考不修改目标 ID；无合适参考返回空。

这些测试不能证明真实模型一定遵守规则，不能证明原始研究设计或用户输入真实性，也没有逐领域专家审稿。

## 浏览器实测

使用本地 Vite 5175 与只读参考接口 8793（`scripts/figures/ui-fixture.mjs`）。接口拒绝生成/账户操作；图像和分类来自当前真实文件，模型请求不在此页面实付。

|行为|实际结果|
|---|---|
|设置入口与完整路径|“数值比较与估计 / 柱形图”可见|
|大类导航|切换“研究示意与机制”只改变浏览列表，原选择仍是柱形图|
|别名搜索|PCA 直接得到排序投影图；bar chart 直接选择柱形图|
|详情|必要输入、非适用、编码规则、易混淆、变体、论文案例及实现状态可展开|
|键盘|Escape 关闭最上层选择器，焦点返回类别按钮|
|持久保存|选择柱形图后刷新，仍显示同一完整路径及专属数据输入|
|输出|数据图选 4K 保持，格式列表只有 PNG|
|图库筛选|过程大类→时序交互图，收敛到 1 个符合结构的论文案例|
|原图出处|展开原始标题/完整图注，作者、2020、Fig 7、CC BY、原论文/原图链接、不可迁移内容可见|
|跨筛选选择|选用时序图再清筛选，总数恢复 69，已选仍为 1|
|空覆盖|化学反应式图显示 0 和“暂无通过许可核验案例”，没有无关补位|
|手机|390×844；图库与类型卡片无页面横向溢出，搜索/确认可操作|
|桌面|1440×1000；分栏浏览，详情与原图并排预览|

截图：[类别选择桌面](evidence/ui/type-picker-final-desktop.png)、[别名详情手机](evidence/ui/type-alias-mobile.png)、[图库手机](evidence/ui/library-mobile.png)、[论文来源桌面](evidence/ui/library-provenance-desktop.png)。浏览器尺寸覆盖在验收后恢复。

## 代码与并行保留

开工已有大量未提交变更，不以 HEAD diff 把它们全计成本任务。对开工 1802 文件逐一比较，没有文件丢失；小程序 224 文件 hash 完全不变。[核查结果](evidence/worktree-preservation.json)列出自基线变化，也包含邻会话期间的合法 SVG/PNG 改动。未执行 reset/stash/commit 或部署；已在 SYNC 顶部记录共享契约和各端待办。

## 复核命令

Node 使用 v24，pnpm 使用工作区版本；macOS 本机需要 CommandLineTools 路径优先，避免系统未接受 Xcode 许可影响 git。不要为复核重装或改变用户系统设置。

```sh
node scripts/figures/export-catalog.mjs
node --test packages/figure-taxonomy/tests/*.test.mjs
pnpm --filter @paperbanana/paperbanana-api check
pnpm --filter @paperbanana/paperbanana-api build
pnpm --filter @paperbanana/web build
# 在各 package 内运行测试，并限制并发：Core 2，Web 1。
# Python 需 Matplotlib、NumPy、Pillow；当前 QA venv 位于用户缓存目录。
node scripts/figures/plot-fixtures.mjs
python scripts/figures/verify-plots.py
python scripts/figures/verify-worker.py
python scripts/figures/verify-resolution.py
```

`refresh-curated.py` 按已审 curation 清单复用/下载出版方文件并重建记录；不自动批准新素材。`build-reference-catalog.py` 依据人工逐图记录编译正式池。新增类型/素材后须重新导出计数并更新对应实跑证据。

## 2026-10-10 生成设置卡片位置与样式调整

信息图类别移到接入凭据下方；参考图偏好紧随检索设置。自动检索展示主题、排布、密度表单；随机参考展示抽取规则；手动参考展示图库入口。不检索、普通模式和精修页不展示该卡片。三种模式的说明对应现有行为，未更改检索排序或生成接口。

Chrome 在 `127.0.0.1:5175` 实际核验：自动→随机→手动→自动后偏好保留；手动图库可打开；不检索和普通模式卡片数量为 0；类别卡片在凭据之后。390×844 下表单单列，卡片 `scrollWidth = clientWidth = 364`，输入与下拉框高度为 48/44/44 px。测试输入已清理，浏览器尺寸覆盖已恢复。

Web 构建通过，figure-taxonomy、workflow-v400-ui、rendered-interactions 三组现有测试 36/36 通过；相关源文件 diff 空白检查通过。构建保留已有的大包体提示。本轮未运行付费生成或部署。

证据：[构建](evidence/settings-layout-build.log)、[测试](evidence/settings-layout-tests.log)、[类别位置](evidence/ui/settings-category-below-credentials.png)、[参考偏好桌面](evidence/ui/settings-reference-auto-desktop.png)、[参考偏好手机](evidence/ui/settings-reference-auto-mobile.png)。

### 同日用户修正：参考图偏好仅自动检索展示

以本条替代上面的三模式卡片规则：自动检索显示参考图偏好；随机参考、不检索均隐藏；手动参考保留独立图库入口，不再使用参考图偏好外层卡片。信息图类别位置与卡片样式保持。

Chrome 实际切换四种模式，偏好卡片数量依次为 auto=1、random=0、manual=0、none=0；手动参考图库正常打开。Web [重新构建通过](evidence/settings-auto-only-build.log)，未重复执行前述 36 项测试。[修正后截图](evidence/ui/settings-preferences-auto-only.png)。

### 同日图库文字与排版修正

实查字体声明一致，无截图可见乱码；设计说明被同时用作标题和正文、筛选框缺少左留白，以及内部版本号全大写展示造成阅读问题。Web 对标题与说明相同的条目使用“图型 · 图号”作为显示标题，说明只显示一次，并增加期刊/年份。原论文题名、图注与许可记录保持可从大图预览查看。调整筛选框、卡片、分页的字号、字重和留白，顶部移除内部语料版本展示；同步移除旧测试对显示版本字段的要求。

Chrome 桌面与 390×844 窄屏检查通过，窄屏无横向溢出（390/390），筛选框与分页按钮高度均为 44 px；分页栏不再被挤压。原论文题名可在预览中查到。Web 构建通过，现有图库契约、本地化及交互测试共 28/28 通过，源文件 diff 空白检查通过。

证据：[构建](evidence/gallery-typography-build.log)、[测试](evidence/gallery-typography-tests.log)、[桌面](evidence/ui/gallery-typography-desktop.png)、[手机](evidence/ui/gallery-typography-mobile.png)。


## 2026-10-10 图库扩充与论文预览替换

本条更新图库和预览计数，前面的初版验证保留为历史证据。新增 38 张逐图核验素材进入正式池，107 张来自 67 篇论文；89/92 图型有合格主图或子图案例。31 个教学预览替换 28 个，剩余研究路线图、流图、极坐标面积图保留结构示例；生成能力状态不变。

分类/图库 10 项测试通过；Web 预览、分类与真实 DOM 交互 30 项通过（含切页回顶、放大不误选、候选仍不可生成）。Web 构建通过，保留主分块偏大的提示。全部新增素材文件、许可、图注哈希校验通过，来源刷新脚本全量复跑成功。Chrome 桌面化学反应式过滤返回 2 个真实案例；流图返回 0 并明确提示。390×844 的 Q–Q 图真实预览正常加载，仍显示“程序绘制待接入”，页面宽度 390/390，无横向溢出。测试没有提交生成任务。

完整逐图清单、许可依据、排除原因、截图和命令见[扩充报告](expansion-20261010.md)。未进行真实付费模型调用或部署。
