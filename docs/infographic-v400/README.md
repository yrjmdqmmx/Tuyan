# 图研信息图分类、选择器与论文参考库交付

日期：2026-10-10；本地实施，未部署。工作树 `/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`，分支 `codex/tuyan-v400-workflow-20261009`，基线 HEAD `5e6989f59416e44d9f22fd26703d3830ed861ea7`。交接 lineage `lin-8d844715eaed7a33`，parent `20261009-153125-codex-tuyan-v400-workflow-catalog-ui-local-01a0e6ff-aacc-7072-831c-`。

统一分类、设置选择器、正式论文图库和阶段约束已落地；这不是“92 种图型已全面验收”。当前具体支持与缺口如下，候选仍明确阻断。

## 交付索引与计数

|项目|结果|证据|
|---|---:|---|
|浏览大类|13|[目录与专属规范](catalog.md)|
|基础图型定义|92|[机器可读完整目录](catalog.json)|
|命名变体定义|142|同上；不是已实现/已验证变体数|
|独立分析方法配置|8|Mantel、PCA、PCoA、NMDS、CCA、RDA、UMAP、t-SNE；不冒充分析算法实现|
|新基础数据图实际绘制验证|40|真实 Python/Matplotlib 子进程＋合成数据检查|
|示意/领域图生成合同接入|27|各阶段请求检查通过；没有本次逐类型真实模型质量验收|
|受限组合类型|2|只接受示意子图；含数据子图阻断|
|仍是候选、绘制未开放|23|专用数据程序尚未验证|
|正式及隔离台账记录|114|[逐图许可索引](references.md)、[完整台账](reference-register.json)|
|正式可用论文案例|107|67 篇论文；102 个 CC BY 4.0，5 个 CC0 1.0|
|隔离案例|7|1 个第三方标志待核验，6 个质量/类型边界排除|
|有合格案例的图型|89|整体与明确子图分别标注；仍有 3 个类别缺口|
|具体图型预览|92|89 个真实论文预览，3 个结构示例；不是生成验收数量|

数据来自 [counts.json](counts.json)，可由 `node scripts/figures/export-catalog.mjs` 重新生成。图库包含 PLOS ONE/One 的原始大小写差异，按期刊身份归并为 10 个期刊；106 张来自 PLOS 出版群，1 张来自 Implementation Science，出版方分布仍集中。

最新扩充：[38 张真实论文插图、28 个预览替换及 3 个保留缺口](expansion-20261010.md)。

交付文件：

- [研究基线与设计取舍](design.md)，[完整类型规范](catalog.md)，[旧八类及 OpenAcad 55 项映射](mapping.md)。
- [主模型、生图模型、程序绘图与具体提示词如何运行](runtime.md)，[实际合同片段](prompt-examples)。
- [许可与排除原因](references.md)，原始 XML/图注在 `evidence/papers`、逐图元数据在 `evidence/figures`，原图/预览路径及 hash 在台账中。
- [验证明细](validation.md)，[工作树保留核查](evidence/worktree-preservation.json)。

## 原有思路中需要纠正的前提

扩展数量本身不等于科学支持。OpenAcad 的 55 个模板里包含基础图型、分组/误差等变体、分析方法和领域任务，直接平铺会造成重复，也会掩盖独立输入要求。图研旧八类中也存在不同维度混排。此次保留六个独立维度：目的、基础图型、变体、分析方法、学科、组合；大类仅作可浏览导航。

另一个关键前提是“开放获取不等于任何图片都能收入产品”。此次逐图保留文章许可、图注与例外核查，不依赖论文能否下载。可用图需同时满足许可和质量条件；第三方标志待核验图与差质示例均隔离。参考图的科学数据与结论始终不能迁移到新研究。

## 分类边界的研究证据

[Brehmer & Munzner 任务类型学](https://www.cs.ubc.ca/labs/imager/tr/2013/MultiLevelTaskTypology/)用于区分“为何表达、采用什么操作、输入输出”；[Vega-Lite 图元规范](https://vega.github.io/vega-lite/docs/mark.html)和[箱线复合图元](https://vega.github.io/vega-lite/docs/boxplot.html)用于区分图元/图型/编码参数；[SBGN 规范](https://sbgn.github.io/specifications)用于保留 PD、AF、ER 的专业语义差异。OpenAcad 当前本地 CSV 的 55 项逐条映射，而非把历史“55模板”当作未经重核的现状。

真实论文验证的部分边界：

|容易混淆的类别|实际边界与论文证据|
|---|---|
|框架图 / 流程图 / 架构图|框架呈现方法模块与变换；流程呈现步骤/条件；架构呈现组件、边界与接口。微生物 RNN 方法的总览与模型内部结构分别标注：[Thompson et al., 2023, Fig 1/5](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011436)。|
|状态转移 / 普通网络 / 机制|同一系统的实体节点、状态节点、反应步骤不能通用。[布尔网络论文 Fig 1 A–D](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009702)分别标注；真值表不误标为存在矩阵。|
|时序图 / 流程图 / 时间线|生命线表示参与者，竖向表示消息顺序，通常不表示真实持续时间。[人工胰腺平台 Fig 7](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0243139)。|
|柱形汇总 / 原始观测分布|同样均值可以对应不同分布；不把均值条变成“原始观测”。[Weissgerber et al., 2015, Fig 1/2](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.1002128)。|
|概念关系 / 因果 DAG|语义联系不等于因果。定性环境健康概念图与遗传工具变量 DAG 分别记录：[概念图](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0274948)、[因果假设](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0222362)。|
|圆形网络 / 基因组 Circos|圆形排布本身不包含序列长度或坐标。[scSDNE Fig 2](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)仅保留为边界线索，未填充 Circos 类别。|
|序列表格 / sequence logo|字母出现不是按频率/信息量缩放的标识图；[该论文 Fig 6C](https://journals.plos.org/plospathogens/article?id=10.1371/journal.ppat.1010510)不计为 motif_logo。|

其他保留的科学区别：Euler 与 Venn 的区域定义；聚类树与系统发育树的枝长；累计发生率与 Kaplan–Meier；类别点图与原始观测点图。PCA/PCoA/NMDS 是方法，不以外观相似合并其科学含义；化学反应、地质剖面、电路等保留各自的来源、单位、方向或图元规范。

## 已实现的行为

类别入口移入生成设置，显示完整路径；支持中文、英文、别名，分页卡片和按需详情。桌面分栏、手机横向大类导航，键盘可关闭并返回入口。历史别名恢复，具体选择可在刷新后保留。图库与选择器同一 ID，支持大类/小类/领域筛选、论文原图预览、完整图注及许可出处。

检索先做许可门禁，再按精确图型/子图和明确兼容结构排序；主题相似不能凌驾结构。类型合同独立进入检索、规划、实际绘制和评审。数值图要求真实结构化输入，以固定代码绘制；4K 不调用生图模型。示意/专业规范由提示合同及评审检查执行，不能声称已具备专业符号自动形式证明。

## 成本与尚未完成的验收

107 可用案例的 Web 原图预览约 88 MiB，包含隔离与研究线索的 Core 原始/预览文件约 248 MiB；选择器的 92 个缩略图合计约 2.44 MB；发布时应维持按需加载与缓存，不能把图库压进首页请求。当前 Web 主 JS 构建约 4.75 MB（gzip 约 656 KB），存在大分块提示，目录与模型目录的拆分仍可优化。

23 个候选专用数据类型、142 个变体的完整程序支持、统计分析算法、含数据面板组合、3 个类型（研究路线图、流图、极坐标面积图）的合格案例补齐、更均衡的出版方扩展尚未完成。本次没有逐类真实模型调用，不能以 Mock 或邻会话的 SVG 付费结果充当本任务成图验收。Linux 生产镜像与真实账户权益/费用未验证。小程序按用户要求暂停，Android/Windows/macOS 尚未同步。

因此本次是可运行、可复核的系统改造交付，附明确候选与缺口；不作全图型专业正确性或全端完成声明。
