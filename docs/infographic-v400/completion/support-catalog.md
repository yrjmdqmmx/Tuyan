# 逐图型实际支持目录

2026-10-10，本地工作树。PNG/SVG 列是基础形态的流程验证，不是所有变体或真实论文输入的质量保证。完整 184 路径及每项证据见 [CSV](support-matrix.csv) / [JSON](support-matrix.json)。

|ID|具体图型|变更前|当前基础形态|PNG / SVG 验证|真实模型代表性结果|
|---|---|---|---|---|---|
|method_framework|方法框架图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|experimental_design|实验设计图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|apparatus|实验装置图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|mechanism|机制示意图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|anatomical|解剖定位示意图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|chemical_reaction|化学反应式图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|energy_diagram|能量剖面图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|sbgn_pd|生化过程描述图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|sbgn_af|生物活动流图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|sbgn_er|生物实体关系图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|workflow|流程图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|png: passed|
|swimlane|泳道流程图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|decision_tree|决策树图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|state_transition|状态转移图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|svg: modified_unreviewed|
|sequence_diagram|时序交互图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|dataflow|数据流图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|timeline|时间线|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|gantt|甘特图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|roadmap|研究路线图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|system_architecture|系统架构图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|neural_architecture|神经网络架构图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|entity_relationship|数据库实体关系图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|circuit|电路原理图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|concept_map|概念关系图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|hierarchy|层级树图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|network|节点连接网络图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|adjacency_matrix|邻接矩阵图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|venn|韦恩集合图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|euler|欧拉集合图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|upset|UpSet 交集图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|sankey|桑基流量图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|chord|弦图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|causal_dag|因果有向无环图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|bar|柱形图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|dotplot|类别点图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|stripplot|原始观测点图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|lollipop|棒棒糖图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|dumbbell|哑铃图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|forest|森林图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|waterfall|瀑布增量图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|radar|雷达图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|histogram|直方图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|density|核密度图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|boxplot|箱线图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|violin|小提琴图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|raincloud|云雨图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|ridgeline|山脊密度图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|ecdf|经验累积分布图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|qq|分位数比较图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|line|折线图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|area|面积趋势图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|streamgraph|流图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|kaplan_meier|生存曲线|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|cumulative_incidence|累计发生率曲线|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|scatter|散点图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|bubble|气泡散点图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|heatmap|数值热图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|bubble_matrix|气泡矩阵|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|binary_matrix|二值存在矩阵|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|correlation_matrix|相关矩阵图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|matrix_link_overlay|关联矩阵与网络叠合图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|parallel_coordinates|平行坐标图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|ordination|排序投影图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|pie|饼图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|treemap|矩形树图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|circle_packing|圆堆积层级图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|rose|极坐标面积图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|alluvial|冲积流转图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|geological_section|地质剖面图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|point_map|地理点位图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|choropleth|分区设色地图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|contour|等值线图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|vector_field|矢量场图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|volcano|火山图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|ma_plot|MA 图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|enrichment|富集结果图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|gene_track|基因坐标轨道图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|protein_domain|蛋白结构域图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|motif_logo|序列标识图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|genome_circos|基因组环形轨道图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|synteny|基因组共线性图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|phylogenetic|系统发育树图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|dendrogram|层次聚类树状图|candidate_unavailable|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|roc|ROC 曲线|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|pr_curve|精确率召回率曲线|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|confusion_matrix|混淆矩阵|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|calibration|校准曲线|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|bland_altman|Bland–Altman 一致性图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|funnel_meta|荟萃漏斗图|deterministic_base|固定程序绘制|真实程序双格式＋数值/重新打开|待逐类实测|
|comparison|并列比较示意图|generative_contract|主模型/生图模型生成|模拟模型请求＋真实 SVG 渲染|待逐类实测|
|multipanel|多面板组合图|schematic_panels_only|独立子图与矢量编排|真实程序＋模拟模型|svg: issues_found|
|small_multiples|分面小多图|schematic_panels_only|独立子图与矢量编排|真实程序＋模拟模型|待逐类实测|

## 单独记录的能力边界

- 142 个变体已定义；数值/组合变体未开放，示意变体仅传递专属要求，逐变体实际验收为 0。不要将基础形态的某个参数分支计成整个目录变体已通过。
- 8 个具名分析方法接收用户已计算结果与方法说明，未实现从原始矩阵自动计算 PCA、PCoA、NMDS、CCA、RDA、UMAP、t-SNE 或 Mantel 检验。
- 已实现的必要基础计算（Q-Q 分位数、Aalen–Johansen、欧氏聚类、比例/面积分配、序列信息量等）列在下面的输入与计算目录，并有程序数值证据。
- 分面图当前只支持同图型、明确标注的独立尺度。共享坐标和跨面板合并图例未开放。
