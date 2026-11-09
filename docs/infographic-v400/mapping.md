# 历史类别与 OpenAcad 候选映射

旧任务保留原字段；不能无证据地把综合类别推断为具体图型。旧任务重开时，历史统计图须选择具体图型并补结构化数据。

|旧名称或 ID|新 ID|处理|
|---|---|---|
|mantel_association|matrix_link_overlay|别名/稳定 ID 兼容|
|method_framework|method_framework|别名/稳定 ID 兼容|
|workflow|workflow|别名/稳定 ID 兼容|
|system_architecture|system_architecture|别名/稳定 ID 兼容|
|mechanism|mechanism|别名/稳定 ID 兼容|
|comparison|comparison|别名/稳定 ID 兼容|
|timeline|timeline|别名/稳定 ID 兼容|
|concept_map|concept_map|别名/稳定 ID 兼容|
|data_stat|未推断|保留历史含义，新增任务需明确选择|
|方法框架图|method_framework|别名/稳定 ID 兼容|
|流程图|workflow|别名/稳定 ID 兼容|
|系统架构图|system_architecture|别名/稳定 ID 兼容|
|机制示意图|mechanism|别名/稳定 ID 兼容|
|对比图|comparison|别名/稳定 ID 兼容|
|时间线/路线图|未推断|保留历史含义，新增任务需明确选择|
|时间线|timeline|别名/稳定 ID 兼容|
|概念关系图|concept_map|别名/稳定 ID 兼容|
|数据统计图|未推断|保留历史含义，新增任务需明确选择|

## OpenAcad 55 项逐项映射

本地来源 `/Users/a1-6/Documents/ChatGPT/OpenAcad/docs/acceptance/templates.csv`。模板映射不表示移植了它的渲染器或分析方法。

|模板|基础图型|变体或分析配置|
|---|---|---|
|分组柱状图 (bar-grouped)|bar|分组|
|散点图 (scatter)|scatter|基础|
|折线图与分组折线图 (line)|line|基础|
|数值热图 (heatmap)|heatmap|基础|
|箱线图 (box)|boxplot|基础|
|饼图与环图 (pie)|pie|基础|
|柱状图 (bar)|bar|基础|
|分类柱状图 (bar-category)|bar|分组|
|误差柱状图 (bar-error)|bar|误差区间|
|分组误差柱状图 (bar-grouped-error)|bar|分组+误差区间|
|散点误差图 (scatter-error)|scatter|误差棒|
|堆叠柱状图 (bar-stacked)|bar|堆叠|
|分组堆叠柱状图 (bar-grouped-stacked)|bar|分组+堆叠|
|柱状图与折线组合 (bar-line)|multipanel|bar+line|
|棒棒糖图 (lollipop)|lollipop|基础|
|分类棒棒糖图 (lollipop-category)|lollipop|分组棒棒糖|
|分组误差折线图 (line-error)|line|误差带|
|分组箱线图 (box-grouped)|boxplot|分组箱线|
|小提琴图 (violin)|violin|基础|
|云雨图 (raincloud)|raincloud|基础|
|峰峦图 (ridgeline)|ridgeline|基础|
|UpSet 集合交集图 (upset)|upset|基础|
|玫瑰图 (rose)|rose|基础|
|雷达图 (radar)|radar|基础|
|哑铃图 (dumbbell)|dumbbell|基础|
|分组散点图 (scatter-grouped)|scatter|分组散点|
|圈形热图 (circle-heatmap)|heatmap|环形热图|
|圆点二值图 (binary-dot)|binary_matrix|圆点图元|
|方格二值图 (binary-rect)|binary_matrix|方格图元|
|数值气泡矩阵 (bubble-matrix)|bubble_matrix|基础|
|组内相关性热图 (correlation)|correlation_matrix|组内相关|
|组间相关性热图 (double-correlation)|correlation_matrix|组间相关|
|Mantel 关联热图 (mantel)|matrix_link_overlay|基础|
|韦恩集合交集图 (venn)|venn|基础|
|分组圆堆砌图 (packing)|circle_packing|基础|
|桑基流向图 (sankey)|sankey|基础|
|动态关系网络图 (network)|network|基础|
|地理采样点地图 (map)|point_map|基础|
|差异表达火山图 (volcano)|volcano|基础|
|富集气泡图 (enrichment-dot)|enrichment|气泡|
|富集条形图 (enrichment-bar)|enrichment|条形|
|富集圈图 (enrichment-circle)|enrichment|圈形|
|基因簇排列图 (gene-cluster)|gene_track|基因簇|
|蛋白保守结构域图 (protein-domains)|protein_domain|基础|
|蛋白保守基序图 (protein-motifs)|protein_domain|基序位置轨道|
|基因组圈图 (genome-circos)|genome_circos|基础|
|MCScanX 共线性图 (synteny)|synteny|基础|
|主成分分析 PCA (pca)|ordination|method:pca|
|主坐标分析 PCoA (pcoa)|ordination|method:pcoa|
|非度量多维尺度 NMDS (nmds)|ordination|method:nmds|
|典范对应分析 CCA (cca)|ordination|method:cca|
|冗余分析 RDA (rda)|ordination|method:rda|
|矩形进化树工作台 (tree-normal)|phylogenetic|有根树;layout:rectangular|
|环形进化树工作台 (tree-circle)|phylogenetic|有根树;layout:circular|
|无根进化树工作台 (tree-unrooted)|phylogenetic|无根树|
