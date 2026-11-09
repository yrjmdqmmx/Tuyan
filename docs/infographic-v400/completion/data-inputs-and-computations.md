# 数据输入、计算与验证目录

全部示例均为明确标记的模拟教学数据。每类均需 `figureData.source`、`rows`、`units`；参数在 `options`，分析口径在 `figureAnalysis`。模型不能补写缺失数据。PNG 与 SVG 使用同一场景。

## 甘特图 · gantt

规范要求：任务 label；数值 start/end；时间单位；依赖。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：interval_start、interval_width。
[完整输入](../evidence/plots/gantt.json) · [实际 PNG](evidence/data-core/gantt.png) · [可编辑 SVG](evidence/data-core/gantt.svg)

## 节点连接网络图 · network

规范要求：source/target 边表；节点；方向；权重含义。
实际行字段：source:string、target:string、value?:number。
专属参数：nodes:{id,label?}[]；directed:boolean；layout:circular；weightUnit?:string。
基础实现范围：Explicit nodes preserve isolates. Circular positions are layout, not scientific distance. Optional positive edge weights map to line width.
程序记录的计算：positions、degree、isolatedNodes、lineWidthPerWeight。
程序校验：edge_1_width、edge_2_width、degree_sum、rendered_node_count、source_row_count。
[完整输入](../evidence/plots/network.json) · [实际 PNG](evidence/data-core/network.png) · [可编辑 SVG](evidence/data-core/network.svg)

## 邻接矩阵图 · adjacency_matrix

规范要求：行 row 与列 column 标识；value；方向和权重语义。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：missingCells。
程序校验：matrix_cells。
[完整输入](../evidence/plots/adjacency_matrix.json) · [实际 PNG](evidence/data-core/adjacency_matrix.png) · [可编辑 SVG](evidence/data-core/adjacency_matrix.svg)

## 韦恩集合图 · venn

规范要求：集合名称和真实成员清单，或完整交集计数与定义。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：intersection_labels。
[完整输入](../evidence/plots/venn.json) · [实际 PNG](evidence/data-core/venn.png) · [可编辑 SVG](evidence/data-core/venn.svg)

## 欧拉集合图 · euler

规范要求：集合名称；完整成员清单；空交集依据。
实际行字段：set:string、members:string[]。
专属参数：areaMode:schematic。
基础实现范围：Exactly two nonempty sets, unique members. Topology and counts are exact; circle area is explicitly schematic. Empty sets are rejected.
程序记录的计算：intersection、onlyA、onlyB、union、topology、areaMode。
程序校验：union_count、source_row_count。
[完整输入](../evidence/plots/euler.json) · [实际 PNG](evidence/data-core/euler.png) · [可编辑 SVG](evidence/data-core/euler.svg)

## UpSet 交集图 · upset

规范要求：集合名称；成员清单；包含式或互斥交集口径。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：exclusive_intersections、union_size。
[完整输入](../evidence/plots/upset.json) · [实际 PNG](evidence/data-core/upset.png) · [可编辑 SVG](evidence/data-core/upset.svg)

## 桑基流量图 · sankey

规范要求：source/target/value；流量单位；守恒假设。
实际行字段：source:string、target:string、value:number。
专属参数：nodes:{id,stage:0|1}[]；layout:bipartite；flowSemantics:string。
基础实现范围：Two-stage flow only. Ribbon thickness uses one global value scale; source/sink totals are calculated, not invented internal conservation.
程序记录的计算：nodeTotals、totalFlow、dataSpaceWidthPerValue。
程序校验：A_node_height、B_node_height、C_node_height、D_node_height、ribbon_5_width、ribbon_6_width、ribbon_7_width、A_allocated_flow、B_allocated_flow、C_allocated_flow、D_allocated_flow、both_column_total、source_row_count。
[完整输入](../evidence/plots/sankey.json) · [实际 PNG](evidence/data-core/sankey.png) · [可编辑 SVG](evidence/data-core/sankey.svg)

## 弦图 · chord

规范要求：source/target/value；有向或无向；单位。
实际行字段：source:string、target:string、value:number。
专属参数：nodes:string[]；directed:false。
基础实现范围：Undirected weighted edges only; each pair occurs once, no loops. Each edge consumes its value at BOTH incident arcs; ribbon endpoint angular width is proportional to value.
程序记录的计算：incidentTotals、edgeSpansRadians、radiansPerValue、undirectedTotal。
程序校验：edge_0_source_span、edge_0_target_span、edge_1_source_span、edge_1_target_span、edge_2_source_span、edge_2_target_span、A_incident_allocation、B_incident_allocation、C_incident_allocation、source_row_count。
[完整输入](../evidence/plots/chord.json) · [实际 PNG](evidence/data-core/chord.png) · [可编辑 SVG](evidence/data-core/chord.svg)

## 柱形图 · bar

规范要求：label/value；单位；统计量含义；原始或汇总来源。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：bar_widths。
[完整输入](../evidence/plots/bar.json) · [实际 PNG](evidence/data-core/bar.png) · [可编辑 SVG](evidence/data-core/bar.svg)

## 类别点图 · dotplot

规范要求：label/value；单位；排序依据。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：point_values。
[完整输入](../evidence/plots/dotplot.json) · [实际 PNG](evidence/data-core/dotplot.png) · [可编辑 SVG](evidence/data-core/dotplot.svg)

## 原始观测点图 · stripplot

规范要求：观测ID；group/value；单位；抖动或碰撞规避方法。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：observations_0、observations_1。
[完整输入](../evidence/plots/stripplot.json) · [实际 PNG](evidence/data-core/stripplot.png) · [可编辑 SVG](evidence/data-core/stripplot.svg)

## 棒棒糖图 · lollipop

规范要求：label/value；单位；基线。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：point_values。
[完整输入](../evidence/plots/lollipop.json) · [实际 PNG](evidence/data-core/lollipop.png) · [可编辑 SVG](evidence/data-core/lollipop.svg)

## 哑铃图 · dumbbell

规范要求：label/start/end；配对ID；单位。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：start_points、end_points。
[完整输入](../evidence/plots/dumbbell.json) · [实际 PNG](evidence/data-core/dumbbell.png) · [可编辑 SVG](evidence/data-core/dumbbell.svg)

## 森林图 · forest

规范要求：label/value/low/high；效应尺度；置信水平；权重来源。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：point_estimates、intervals。
[完整输入](../evidence/plots/forest.json) · [实际 PNG](evidence/data-core/forest.png) · [可编辑 SVG](evidence/data-core/forest.svg)

## 瀑布增量图 · waterfall

规范要求：label/value；初值；增量和总计标识。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：cumulativeValues。
程序校验：increments、cumulative_baselines。
[完整输入](../evidence/plots/waterfall.json) · [实际 PNG](evidence/data-core/waterfall.png) · [可编辑 SVG](evidence/data-core/waterfall.svg)

## 雷达图 · radar

规范要求：label/value/group；各指标单位与归一化规则。
实际行字段：label:string、group:string、value:number。
专属参数：axes:{id,min,max,unit}[]；normalization:axis_range。
基础实现范围：Explicit ordered per-axis ranges; every group has all axes. Normalized radius=(value-min)/(max-min); polygon area is not an aggregate score.
程序记录的计算：normalizedRadii。
程序校验：A_radius_error、B_radius_error、source_row_count。
[完整输入](../evidence/plots/radar.json) · [实际 PNG](evidence/data-core/radar.png) · [可编辑 SVG](evidence/data-core/radar.svg)

## 直方图 · histogram

规范要求：原始 value；单位；分箱边界或规则。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：binEdges、binCounts。
程序校验：bin_heights、total_count。
[完整输入](../evidence/plots/histogram.json) · [实际 PNG](evidence/data-core/histogram.png) · [可编辑 SVG](evidence/data-core/histogram.svg)

## 核密度图 · density

规范要求：原始 value；单位；核与带宽；边界处理。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：bandwidth、groupSizes。
程序校验：density_0、density_1。
[完整输入](../evidence/plots/density.json) · [实际 PNG](evidence/data-core/density.png) · [可编辑 SVG](evidence/data-core/density.svg)

## 箱线图 · boxplot

规范要求：原始 value/group 或明确分位数；须线算法；样本量。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：median_0、median_1。
[完整输入](../evidence/plots/boxplot.json) · [实际 PNG](evidence/data-core/boxplot.png) · [可编辑 SVG](evidence/data-core/boxplot.svg)

## 小提琴图 · violin

规范要求：原始 value/group；带宽；归一化规则；样本量。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：medians。
[完整输入](../evidence/plots/violin.json) · [实际 PNG](evidence/data-core/violin.png) · [可编辑 SVG](evidence/data-core/violin.svg)

## 云雨图 · raincloud

规范要求：原始 value/group；带宽；摘要统计定义。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：bandwidth、groupSizes。
程序校验：density_polygon_0、observations_0、density_polygon_1、observations_1。
[完整输入](../evidence/plots/raincloud.json) · [实际 PNG](evidence/data-core/raincloud.png) · [可编辑 SVG](evidence/data-core/raincloud.svg)

## 山脊密度图 · ridgeline

规范要求：原始 value/group；组序；带宽；重叠规则。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：bandwidth、groupSizes。
程序校验：density_polygon_0、density_polygon_1。
[完整输入](../evidence/plots/ridgeline.json) · [实际 PNG](evidence/data-core/ridgeline.png) · [可编辑 SVG](evidence/data-core/ridgeline.svg)

## 经验累积分布图 · ecdf

规范要求：原始 value；单位；样本量。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：ecdf_sorted_values、ecdf_probability。
[完整输入](../evidence/plots/ecdf.json) · [实际 PNG](evidence/data-core/ecdf.png) · [可编辑 SVG](evidence/data-core/ecdf.svg)

## 分位数比较图 · qq

规范要求：原始 value；参考分布及参数估计方式。
实际行字段：value:number。
专属参数：reference:normal|sample；plottingPosition:hazen；mean:number (normal)；sd:positive number (normal)；referenceValues:number[] (sample)；referenceUnit:string (sample)。
基础实现范围：Normal quantiles use explicit supplied mean/sd and (i-0.5)/n. Sample comparison uses linear interpolation at the same probabilities. No fitted distribution or normality test is implied.
程序记录的计算：probabilities、referenceQuantiles、sampleQuantiles、plottingPosition、parameterSource。
程序校验：sample_order_error、quantile_order_violations、source_row_count。
[完整输入](../evidence/plots/qq.json) · [实际 PNG](evidence/data-core/qq.png) · [可编辑 SVG](evidence/data-core/qq.svg)

## 折线图 · line

规范要求：x/y；顺序和单位；缺失值规则。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：plotted_xy。
[完整输入](../evidence/plots/line.json) · [实际 PNG](evidence/data-core/line.png) · [可编辑 SVG](evidence/data-core/line.svg)

## 面积趋势图 · area

规范要求：x/y/group；基线；单位；堆叠规则。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：plotted_xy。
[完整输入](../evidence/plots/area.json) · [实际 PNG](evidence/data-core/area.png) · [可编辑 SVG](evidence/data-core/area.svg)

## 流图 · streamgraph

规范要求：x/y/group；非负值；基线算法。
实际行字段：x:number、y:number、group:string。
专属参数：baseline:symmetric。
基础实现范围：Complete shared x grid required. Nonnegative series use baseline=-sum(y)/2; thickness is y, never a negative observation.
程序记录的计算：x、totalThickness、baseline、series。
程序校验：A_thickness_error、B_thickness_error、symmetric_baseline_error、source_row_count。
[完整输入](../evidence/plots/streamgraph.json) · [实际 PNG](evidence/data-core/streamgraph.png) · [可编辑 SVG](evidence/data-core/streamgraph.svg)

## 生存曲线 · kaplan_meier

规范要求：time/event/group；事件编码；删失定义；时间单位；置信方法。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：Data。
程序校验：survival_0。
[完整输入](../evidence/plots/kaplan_meier.json) · [实际 PNG](evidence/data-core/kaplan_meier.png) · [可编辑 SVG](evidence/data-core/kaplan_meier.svg)

## 累计发生率曲线 · cumulative_incidence

规范要求：time/event/cause；事件种类；删失；估计方法。
实际行字段：id:string、time:number、event:0|1、cause:string|null、group?:string。
专属参数：causes:string[]；estimator:aalen_johansen；censoring:right；entry:zero。
基础实现范围：One independent subject per row; all enter at zero; tied event causes are handled together with events before censoring. Calculates Aalen–Johansen CIF, no confidence interval or hypothesis test.
程序记录的计算：estimator、groups。
程序校验：Data_mass_at_1、Data_mass_at_2、Data_mass_at_3、Data_A_curve_error、Data_A_monotonic_violations、Data_B_curve_error、Data_B_monotonic_violations、source_row_count。
[完整输入](../evidence/plots/cumulative_incidence.json) · [实际 PNG](evidence/data-core/cumulative_incidence.png) · [可编辑 SVG](evidence/data-core/cumulative_incidence.svg)

## 散点图 · scatter

规范要求：x/y；观测ID；单位；分组。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：point_coordinates。
[完整输入](../evidence/plots/scatter.json) · [实际 PNG](evidence/data-core/scatter.png) · [可编辑 SVG](evidence/data-core/scatter.svg)

## 气泡散点图 · bubble

规范要求：x/y/size；单位；面积映射。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：point_coordinates、marker_area。
[完整输入](../evidence/plots/bubble.json) · [实际 PNG](evidence/data-core/bubble.png) · [可编辑 SVG](evidence/data-core/bubble.svg)

## 数值热图 · heatmap

规范要求：row/column/value；单位；缺失值；变换。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：missingCells。
程序校验：matrix_cells。
[完整输入](../evidence/plots/heatmap.json) · [实际 PNG](evidence/data-core/heatmap.png) · [可编辑 SVG](evidence/data-core/heatmap.svg)

## 气泡矩阵 · bubble_matrix

规范要求：row/column/value；面积和颜色变量定义。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：marker_areas。
[完整输入](../evidence/plots/bubble_matrix.json) · [实际 PNG](evidence/data-core/bubble_matrix.png) · [可编辑 SVG](evidence/data-core/bubble_matrix.svg)

## 二值存在矩阵 · binary_matrix

规范要求：row/column/value为0或1；检测阈值；缺测定义。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：missingCells。
程序校验：matrix_cells。
[完整输入](../evidence/plots/binary_matrix.json) · [实际 PNG](evidence/data-core/binary_matrix.png) · [可编辑 SVG](evidence/data-core/binary_matrix.svg)

## 相关矩阵图 · correlation_matrix

规范要求：row/column/value；相关方法；样本量；缺失处理；多重检验。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：missingCells。
程序校验：matrix_cells。
[完整输入](../evidence/plots/correlation_matrix.json) · [实际 PNG](evidence/data-core/correlation_matrix.png) · [可编辑 SVG](evidence/data-core/correlation_matrix.svg)

## 关联矩阵与网络叠合图 · matrix_link_overlay

规范要求：矩阵数值与行列实体；连线端点和统计量；两套计算方法；样本对应与显著性来源。
实际行字段：row:string、column:string、value:number。
专属参数：links:{source,target,value}[]；matrixStatistic:string；linkStatistic:string；linkUnit:string。
基础实现范围：Complete square matrix and links share named entities. Matrix colors encode supplied values; curved links encode absolute supplied magnitude in width. Labels retain sign; no significance or Mantel analysis is inferred.
程序记录的计算：matrix、linkWidthPerAbsoluteValue、suppliedLinks。
程序校验：link_0_width、matrix_value_error、source_row_count。
[完整输入](../evidence/plots/matrix_link_overlay.json) · [实际 PNG](evidence/data-core/matrix_link_overlay.png) · [可编辑 SVG](evidence/data-core/matrix_link_overlay.svg)

## 平行坐标图 · parallel_coordinates

规范要求：观测ID；变量矩阵；单位；每轴缩放。
实际行字段：id:string、<axis.id>:number。
专属参数：axes:{id,min,max,unit}[]；normalization:axis_range。
基础实现范围：Each row is one observation. All axis ranges and units remain visible; values must lie in declared ranges.
程序记录的计算：normalizedObservations。
程序校验：P1_normalized_error、P2_normalized_error、source_row_count。
[完整输入](../evidence/plots/parallel_coordinates.json) · [实际 PNG](evidence/data-core/parallel_coordinates.png) · [可编辑 SVG](evidence/data-core/parallel_coordinates.svg)

## 排序投影图 · ordination

规范要求：原始矩阵或已计算坐标x/y；method；预处理；距离/载荷/解释率或stress来源。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：point_coordinates。
[完整输入](../evidence/plots/ordination.json) · [实际 PNG](evidence/data-core/ordination.png) · [可编辑 SVG](evidence/data-core/ordination.svg)

## 饼图 · pie

规范要求：label/value；非负值；总体定义。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：angular_proportions。
[完整输入](../evidence/plots/pie.json) · [实际 PNG](evidence/data-core/pie.png) · [可编辑 SVG](evidence/data-core/pie.svg)

## 矩形树图 · treemap

规范要求：节点label/parent/value；汇总口径。
实际行字段：id:string、label:string、parent:string|null、value:number。
专属参数：valueSemantics:subtree_total。
基础实现范围：One rooted tree, at most 128 nodes/depth 12. Supplied parent totals must equal child sums. Slice-and-dice rectangles have exact proportional area, with no inset padding.
程序记录的计算：geometry、rootTotal、leafTotal、algorithm。
程序校验：root_area_ratio、a_area_ratio、a1_area_ratio、a2_area_ratio、b_area_ratio、leaf_area_sum、leaf_total、source_row_count。
[完整输入](../evidence/plots/treemap.json) · [实际 PNG](evidence/data-core/treemap.png) · [可编辑 SVG](evidence/data-core/treemap.svg)

## 圆堆积层级图 · circle_packing

规范要求：节点label/parent/value；叶节点计数。
实际行字段：id:string、label:string、parent:string|null、value:number。
专属参数：valueSemantics:subtree_total。
基础实现范围：Deterministic tangent-row nested circles; leaf area is exactly proportional to value. Parent radius encloses descendants and is NOT an additive area; empty packing space is not data.
程序记录的计算：geometry、rootTotal、leafTotal、algorithm。
程序校验：a1_leaf_area、a1_containment_excess、a2_leaf_area、a2_containment_excess、a_containment_excess、b_leaf_area、b_containment_excess、leaf_total、source_row_count。
[完整输入](../evidence/plots/circle_packing.json) · [实际 PNG](evidence/data-core/circle_packing.png) · [可编辑 SVG](evidence/data-core/circle_packing.svg)

## 极坐标面积图 · rose

规范要求：label/value；角度区间；面积或半径编码声明。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：area_proportions。
[完整输入](../evidence/plots/rose.json) · [实际 PNG](evidence/data-core/rose.png) · [可编辑 SVG](evidence/data-core/rose.svg)

## 冲积流转图 · alluvial

规范要求：个体ID或聚合路径；阶段；类别；value。
实际行字段：id:string、stage:string、category:string、value:number。
专属参数：stages:string[]；cohortSemantics:string。
基础实现范围：Aggregated path id repeats once at each ordered stage with unchanged positive cohort value. Every path is drawn continuously; births/losses require explicit categories, not silent changes in cohort mass.
程序记录的计算：stageTotals、cohortTotal、pathValues。
程序校验：Before_mass、During_mass、After_mass、ribbon_7_width、ribbon_8_width、ribbon_9_width、ribbon_10_width、ribbon_11_width、ribbon_12_width、source_row_count。
[完整输入](../evidence/plots/alluvial.json) · [实际 PNG](evidence/data-core/alluvial.png) · [可编辑 SVG](evidence/data-core/alluvial.svg)

## 地理点位图 · point_map

规范要求：经纬度x/y；坐标系；底图许可；单位。
实际行字段：label:string、x:number、y:number。
专属参数：crs:EPSG:4326；projection:plate_carree。
基础实现范围：Longitude/latitude on a labelled Plate Carree graticule without an external basemap. Degree geometry is not equal-area or a distance measurement. No inferred coastline or geodesic scale bar.
程序记录的计算：coordinates、projection。
程序校验：coordinate_error、source_row_count。
[完整输入](../evidence/plots/point_map.json) · [实际 PNG](evidence/data-core/point_map.png) · [可编辑 SVG](evidence/data-core/point_map.svg)

## 分区设色地图 · choropleth

规范要求：区域ID和边界；value；标准化分母；投影与许可。
实际行字段：region:string、value:number。
专属参数：regions:{id,polygon:[[longitude,latitude],...]}[]；crs:EPSG:4326；projection:plate_carree；valueSemantics:string；boundarySource:string；boundaries:number[]。
基础实现范围：Supplied simple polygon boundaries only, without holes or antimeridian crossing. Explicit increasing class boundaries; unmatched polygons are grey missing, never zero. Maximum 20,000 vertices.
程序记录的计算：suppliedValues、polygonAreasSquareDegrees、missingRegions、classBoundaries。
程序校验：A_vertices、B_vertices、Missing_vertices、region_count、source_row_count。
[完整输入](../evidence/plots/choropleth.json) · [实际 PNG](evidence/data-core/choropleth.png) · [可编辑 SVG](evidence/data-core/choropleth.svg)

## 等值线图 · contour

规范要求：规则网格x/y/value或采样坐标；插值法；单位。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：gridShape。
程序校验：contour_levels、contour_vertices_0.5、contour_vertices_1.0、contour_vertices_1.5。
[完整输入](../evidence/plots/contour.json) · [实际 PNG](evidence/data-core/contour.png) · [可编辑 SVG](evidence/data-core/contour.svg)

## 矢量场图 · vector_field

规范要求：x/y/u/v；单位；坐标基；归一化。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：vectors。
[完整输入](../evidence/plots/vector_field.json) · [实际 PNG](evidence/data-core/vector_field.png) · [可编辑 SVG](evidence/data-core/vector_field.svg)

## 火山图 · volcano

规范要求：label/effect/p；效应尺度；原始或调整P值；阈值；检验方法。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：negativeLog10P。
程序校验：point_coordinates。
[完整输入](../evidence/plots/volcano.json) · [实际 PNG](evidence/data-core/volcano.png) · [可编辑 SVG](evidence/data-core/volcano.svg)

## MA 图 · ma_plot

规范要求：label/mean/effect；归一化；对数底数。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：point_coordinates。
[完整输入](../evidence/plots/ma_plot.json) · [实际 PNG](evidence/data-core/ma_plot.png) · [可编辑 SVG](evidence/data-core/ma_plot.svg)

## 富集结果图 · enrichment

规范要求：term/count/background/p；分析方法；基因集和校正；比值口径。
实际行字段：term:string、count:number、background:number、p:number。
专属参数：inputSize:integer；backgroundSize:integer。
基础实现范围：Supplied overlap count, term background count and P value. Calculates gene ratio=count/inputSize and fold enrichment=(count/inputSize)/(background/backgroundSize). No enrichment test or P correction is executed; figureAnalysis.pKind must be p or adjusted_p.
程序记录的计算：geneRatio、foldEnrichment、suppliedP、bubbleAreaPointsSquared、bubbleAreaRule。
程序校验：fold_coordinate_error、p_color_error、source_row_count。
[完整输入](../evidence/plots/enrichment.json) · [实际 PNG](evidence/data-core/enrichment.png) · [可编辑 SVG](evidence/data-core/enrichment.svg)

## 基因坐标轨道图 · gene_track

规范要求：label/start/end/strand；染色体；组装版本；坐标闭开规则。
实际行字段：label:string、chrom:string、start:number、end:number、strand:+|-。
专属参数：sequences:{id,length}[]；assembly:string；coordinateSystem:zero_based_half_open。
基础实现范围：Whole-gene intervals only; exact genomic coordinates and strand arrow. No inferred exons/introns or splice structure.
程序记录的计算：intervals。
程序校验：interval_0_length、interval_1_length、source_row_count。
[完整输入](../evidence/plots/gene_track.json) · [实际 PNG](evidence/data-core/gene_track.png) · [可编辑 SVG](evidence/data-core/gene_track.svg)

## 蛋白结构域图 · protein_domain

规范要求：蛋白ID长度；start/end；域名；数据库版本和阈值。
实际行字段：protein:string、label:string、start:number、end:number、evidence:string。
专属参数：proteins:{id,length}[]；database:string；coordinateSystem:one_based_inclusive。
基础实现范围：Amino acid coordinates; domains retain overlaps on individual annotation lanes. Declared protein lengths and evidence labels are required.
程序记录的计算：domains。
程序校验：domain_0_residues、domain_1_residues、source_row_count。
[完整输入](../evidence/plots/protein_domain.json) · [实际 PNG](evidence/data-core/protein_domain.png) · [可编辑 SVG](evidence/data-core/protein_domain.svg)

## 序列标识图 · motif_logo

规范要求：对齐序列或position/symbol/value；字母表；频率或bits定义；校正。
实际行字段：position:integer、symbol:string、value:number。
专属参数：alphabet:string[]；input:counts|frequencies；mode:frequency|information；correction:none。
基础实现范围：Complete alphabet at each position. Counts normalize to frequency; information uses log2(alphabet size)-Shannon entropy with uniform background, explicitly no small-sample correction. Actual vector letter heights sum to frequency or bits.
程序记录的计算：positions、frequencies、informationBits、letterHeights、background、smallSampleCorrection。
程序校验：position_1_C_height、position_1_G_height、position_1_A_height、position_1_stack、position_2_stack、position_3_G_height、position_3_T_height、position_3_stack、source_row_count。
[完整输入](../evidence/plots/motif_logo.json) · [实际 PNG](evidence/data-core/motif_logo.png) · [可编辑 SVG](evidence/data-core/motif_logo.svg)

## 基因组环形轨道图 · genome_circos

规范要求：序列长度；轨道坐标和值；连接端点；组装版本。
实际行字段：chrom:string、label:string、start:number、end:number、value:number。
专属参数：sequences:{id,length}[]；assembly:string；coordinateSystem:zero_based_half_open；valueRange:[min,max]；links?:{source,sourcePosition,target,targetPosition}[]。
基础实现范围：One quantitative interval track colored on explicit value range, plus optional supplied point links. Chromosome angle proportional to length (equal visual gaps excluded). No inferred genome features.
程序记录的计算：sequenceArcsRadians、radiansPerBase、intervalSpansRadians、suppliedLinks。
程序校验：chr1_sequence_angle、chr2_sequence_angle、interval_0_span、interval_1_span、source_row_count。
[完整输入](../evidence/plots/genome_circos.json) · [实际 PNG](evidence/data-core/genome_circos.png) · [可编辑 SVG](evidence/data-core/genome_circos.svg)

## 基因组共线性图 · synteny

规范要求：序列与坐标；同源块；方向；比对方法和阈值。
实际行字段：source:string、start:number、end:number、target:string、targetStart:number、targetEnd:number、strand:+|-。
专属参数：sequences:{id,length}[] (exactly 2)；assembly:string；coordinateSystem:zero_based_half_open；alignmentMethod:string。
基础实现范围：Two sequences on a common base-pair x scale. Ribbon endpoints bind interval coordinates; negative strand reverses destination endpoint order. Homology statistics are supplied, not inferred.
程序记录的计算：ribbonVertices、inversionCount。
程序校验：source_0_width、target_0_width、source_1_width、target_1_width、source_row_count。
[完整输入](../evidence/plots/synteny.json) · [实际 PNG](evidence/data-core/synteny.png) · [可编辑 SVG](evidence/data-core/synteny.svg)

## 系统发育树图 · phylogenetic

规范要求：Newick或边表；枝长含义；支持度算法；根的依据。
实际行字段：source:string、target:string、length:number。
专属参数：root:string；rooting:string；branchLengthUnit:string。
基础实现范围：Rooted edge tree only, nonnegative supplied branch lengths. No Newick parsing, topology inference, support estimates or hidden rooting. Horizontal distances equal summed branch lengths.
程序记录的计算：nodePositions、tipOrder、root、branchLengthSource。
程序校验：Internal_branch_length、C_branch_length、A_branch_length、B_branch_length、source_row_count。
[完整输入](../evidence/plots/phylogenetic.json) · [实际 PNG](evidence/data-core/phylogenetic.png) · [可编辑 SVG](evidence/data-core/phylogenetic.svg)

## 层次聚类树状图 · dendrogram

规范要求：原始矩阵或linkage结果；距离度量；连接准则；预处理。
实际行字段：id:string、<dimension>:number (observations)。
专属参数：input:observations|linkage；dimensions:string[] (observations)；linkage:number[n-1][4] (linkage)；method:single|complete|average；metric:euclidean；preprocessing:none。
基础实现范围：Calculates deterministic agglomeration for <=150 observations with explicit Euclidean metric and no preprocessing, with matching feature units, or validates supplied SciPy-format linkage including membership counts and monotonic heights (units.distance required). No significance test or cut inferred.
程序记录的计算：linkage、leafOrder、inputMode、method、preprocessing。
程序校验：merge_0_height、merge_1_height、merge_2_height、root_membership_count、monotonic_height_violations、source_row_count。
[完整输入](../evidence/plots/dendrogram.json) · [实际 PNG](evidence/data-core/dendrogram.png) · [可编辑 SVG](evidence/data-core/dendrogram.svg)

## ROC 曲线 · roc

规范要求：真实标签和score，或已验证fpr/tpr点；正类定义；验证集。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：plotted_xy。
[完整输入](../evidence/plots/roc.json) · [实际 PNG](evidence/data-core/roc.png) · [可编辑 SVG](evidence/data-core/roc.svg)

## 精确率召回率曲线 · pr_curve

规范要求：真实标签和score或precision/recall；正类比例；验证集。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：plotted_xy。
[完整输入](../evidence/plots/pr_curve.json) · [实际 PNG](evidence/data-core/pr_curve.png) · [可编辑 SVG](evidence/data-core/pr_curve.svg)

## 混淆矩阵 · confusion_matrix

规范要求：row真实类别/column预测类别/value计数；类别顺序；归一化方法。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：missingCells。
程序校验：matrix_cells。
[完整输入](../evidence/plots/confusion_matrix.json) · [实际 PNG](evidence/data-core/confusion_matrix.png) · [可编辑 SVG](evidence/data-core/confusion_matrix.svg)

## 校准曲线 · calibration

规范要求：逐样本概率与标签或bin/predicted/observed/count；分箱。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：plotted_xy。
[完整输入](../evidence/plots/calibration.json) · [实际 PNG](evidence/data-core/calibration.png) · [可编辑 SVG](evidence/data-core/calibration.svg)

## Bland–Altman 一致性图 · bland_altman

规范要求：逐对象配对测量；单位；差值方向；界限算法。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：meanDifference、sampleSdDifference、limits。
程序校验：point_coordinates、agreement_limits。
[完整输入](../evidence/plots/bland_altman.json) · [实际 PNG](evidence/data-core/bland_altman.png) · [可编辑 SVG](evidence/data-core/bland_altman.svg)

## 荟萃漏斗图 · funnel_meta

规范要求：各研究effect/se；效应尺度；固定或随机效应方法。
实际行字段：参见模拟输入 JSON 与基础字段校验。
程序记录的计算：以传入数值直接映射至图元。
程序校验：point_coordinates。
[完整输入](../evidence/plots/funnel_meta.json) · [实际 PNG](evidence/data-core/funnel_meta.png) · [可编辑 SVG](evidence/data-core/funnel_meta.svg)

