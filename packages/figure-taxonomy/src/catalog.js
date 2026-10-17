import {DETERMINISTIC_PLOT_TYPES} from './capabilities.js'
/** Authored semantic catalog. Layout/color are parameters, never separate types. */
import {TYPE_DETAILS,DOMAIN_RULES} from './specifications.js'
import {REFERENCE_EXAMPLES} from './reference-examples.js'
export const TAXONOMY_VERSION = '2026-10-10.v1'
export const FIGURE_GROUPS = [
 ['schematic','研究示意与机制','Scientific schematics'], ['process','过程、时间与控制','Process and time'],
 ['architecture','系统与工程结构','Systems and engineering'], ['relation','关系与集合','Relations and sets'],
 ['comparison','数值比较与估计','Comparison and estimation'], ['distribution','分布与不确定性','Distribution'],
 ['trend','趋势与生存','Trends and survival'], ['association','关联与多变量','Association and multivariate'],
 ['composition','组成与层级数量','Composition'], ['spatial','空间与场','Spatial fields'],
 ['bioscience','生物序列与组学','Sequences and omics'], ['evaluation','模型与证据评价','Model evaluation'],
 ['assembly','组合表达','Figure composition'],
].map(([id,label,en])=>({id,label,en}))

// id | Chinese | English/aliases | group | kind | definition/use | required inputs | encoding rules | confusable IDs | meaningful variants
const entries = `
method_framework|方法框架图|Method framework;研究框架;方法总览|schematic|schematic|呈现研究方法的模块及信息如何转化，适用于方法总览|研究目标、模块功能、输入输出、创新模块、连接语义|模块分组必须对应方法分工；箭头区分数据与反馈；不能把贡献夸大为已验证结论|system_architecture,workflow|训练与推理双路径
experimental_design|实验设计图|Experimental design;试验设计|schematic|schematic|表达实验单位、分组、处理和测量设计|实验单位、分配方法、处理、对照、测量时点、真实样本量或未定标记|分配和测量区别表达；重复测量保留同一实验单位；样本量不得从参考图复制|workflow,timeline|交叉设计;因子设计;重复测量设计
apparatus|实验装置图|Apparatus schematic;仪器示意图;装置示意|schematic|schematic|解释物理部件如何连接与测量|部件、接口、介质或光路、传感器位置、比例是否示意|区分实物流、电路和光路；空间邻近不能代替连接；尺寸无依据时标示不按比例|system_architecture,circuit|剖面;爆炸视图
mechanism|机制示意图|Mechanism illustration;作用机制|schematic|schematic|解释实体作用导致现象的证据链|实体、作用方向、证据来源、已知与假设关系|激活、抑制、转运等采用不同且有图例的符号；假设关系用独立编码；关联不可画成因果|causal_dag,sbgn_pd|反馈机制;多尺度机制
anatomical|解剖定位示意图|Anatomical schematic;解剖图|schematic|domain|表达器官组织的相对位置与定位|物种、解剖部位、切面、方向术语、可核验结构来源|左右与观察方向明确；示意比例不能当测量；不得凭空补组织结构|apparatus,mechanism|切面定位;局部放大
chemical_reaction|化学反应式图|Reaction scheme;反应路线|schematic|domain|表达化学结构、反应条件和转化关系|准确结构标识、反应物产物、试剂条件、立体化学、产率来源|原子连接和电荷守恒；反应箭头与平衡箭头不同；无实测来源不补产率|mechanism,sbgn_pd|多步合成;催化循环
energy_diagram|能量剖面图|Energy profile;反应坐标图;势能图|schematic|domain|表达反应坐标上的态与势垒|态、过渡态、坐标定义、能量值与单位或定性声明|横轴是反应坐标不默认时间；定量势垒须有数值；定性曲线不可暗示精确差值|line,chemical_reaction|多路径势垒
sbgn_pd|生化过程描述图|SBGN Process Description;SBGN PD|schematic|domain|以实体池、过程和调控弧描述生化状态转化|实体池、状态、区室、反应、消耗生产和调控关系|遵循 SBGN PD 图元和弧端点规则；过程节点不能省略为普通因果箭头|sbgn_af,sbgn_er|区室化过程
sbgn_af|生物活动流图|SBGN Activity Flow;SBGN AF|schematic|domain|表达生物活动之间的正负影响|活动、影响符号、逻辑算子、证据|遵循 SBGN AF；活动不是物质池；影响不等于物质转化|sbgn_pd,causal_dag|逻辑调控
sbgn_er|生物实体关系图|SBGN Entity Relationship;SBGN ER|schematic|domain|表达实体状态、关系及对关系的调控|实体、状态变量、关系和调控规则|遵循 SBGN ER；不把关系链自动解释为时间过程；不同于数据库 ER|entity_relationship,sbgn_pd|状态关系
workflow|流程图|Flowchart;Workflow;处理流程|process|schematic|表达操作顺序、分支和终止条件|起点终点、步骤、分支条件、输入输出|分支标注互斥或并发语义；每条路径有去向；回路有条件|method_framework,decision_tree|并行流程;循环流程
swimlane|泳道流程图|Swimlane;跨角色流程|process|schematic|表达流程步骤的责任归属与交接|角色、步骤、交接、顺序、分支条件|每步骤归属角色；跨泳道连线代表交接；泳道不是时间比例轴|workflow,sequence_diagram|跨组织流程
decision_tree|决策树图|Decision tree;判定树|process|schematic|表达条件逐级划分到决策叶节点|分支条件、阈值来源、叶节点含义、规则或已训练树|条件覆盖与互斥明确；不得编造训练指标；结构应无循环|workflow,hierarchy|规则树;已训练模型树
state_transition|状态转移图|State transition;状态机|process|schematic|表达系统状态与触发事件|状态、初始终止态、事件、守卫条件|节点是状态不是动作；边标注事件；自循环与不可达态显式检查|workflow,network|有限状态机;马尔可夫链
sequence_diagram|时序交互图|Sequence diagram;消息时序图|process|schematic|表达参与者间消息的时间顺序|参与者、消息方向、同步异步、返回和条件|生命线对应参与者；时间轴顺序一致；区分同步调用与返回|swimlane,timeline|异步消息;条件交互
dataflow|数据流图|Data flow diagram;DFD|process|schematic|表达数据在处理过程、存储和外部实体间移动|数据实体、处理、存储、外部边界、流名|数据流有名称；不能把控制顺序冒充数据；分解前后输入输出平衡|workflow,system_architecture|分层数据流
timeline|时间线|Timeline;事件时间轴|process|schematic|按有依据的时间表达事件先后|事件、日期或相对时点、时间单位、缺失区间|等间距若非真实比例必须注明；事件不能靠视觉间距虚构持续时间|roadmap,gantt|区间事件;多轨时间线
gantt|甘特图|Gantt chart;进度计划|process|data|用区间长度表达任务起止和依赖|任务 label、数值 start/end、时间单位、依赖|结束不得早于开始；真实时间尺度一致；计划与完成状态分开|timeline,roadmap|依赖进度;资源泳道
roadmap|研究路线图|Roadmap;技术路线图|process|schematic|表达未来目标、阶段、依赖和里程碑|阶段目标、依赖、预期交付、时间是估计或承诺|计划明确标为计划；阶段关系不等于已完成实证结果|timeline,method_framework|技术成熟度路线
system_architecture|系统架构图|System architecture;软件架构|architecture|schematic|表达系统组件、边界、层次及接口|组件职责、边界、接口、部署或逻辑视角|声明视角；接口方向与协议来源明确；逻辑层不冒充实际部署|method_framework,dataflow|部署视图;逻辑视图
neural_architecture|神经网络架构图|Neural network architecture;模型结构|architecture|schematic|表达模型算子、张量路径及训练推理关系|模块、算子、张量维度、跳连、共享权重、损失|张量维度变换可追踪；共享权重不同于数据流；训练损失与推理输出区分|system_architecture,method_framework|编码器解码器;多分支结构
entity_relationship|数据库实体关系图|Entity relationship diagram;ERD;数据库ER|architecture|schematic|表达数据实体、属性与基数约束|实体、主外键、关系、基数、可空性|关系两端基数完整；概念实体与数据表视角明确；不混淆生物 SBGN ER|concept_map,sbgn_er|概念数据模型;逻辑数据模型
circuit|电路原理图|Circuit schematic;电气原理图|architecture|domain|表达电子元件端口和电气连接|元件型号、端口、网络、参考地、电源、符号体系|采用声明的 IEC/ANSI 符号；交叉与连接点可辨；电气连通需网表核对|apparatus,system_architecture|模拟电路;数字逻辑
concept_map|概念关系图|Concept map;知识关系图|relation|schematic|表达概念之间有名称的语义关系|概念列表、关系动词、层级或非层级说明|连接有关系词；包含与因果分开；概念不重复造成虚假数量|hierarchy,causal_dag|交叉链接
hierarchy|层级树图|Hierarchy;树状图;分类树|relation|schematic|表达唯一父子包含或分类关系|节点、父子关系、层级定义|同层语义一致；多父归属应改网络；不能用枝长暗示进化距离|phylogenetic,concept_map|组织层级;分类目录
network|节点连接网络图|Node-link network;关系网络|relation|data|表达有依据的实体连接和属性|source/target 边表、节点、方向、权重含义|布局距离不是科学距离除非声明；权重与中心性必须来自计算；孤立点不丢失|causal_dag,chord|二部网络;加权网络
adjacency_matrix|邻接矩阵图|Adjacency matrix;连接矩阵|relation|data|以矩阵格表达成对连接|行 row 与列 column 标识、value、方向和权重语义|行列顺序记录；有向矩阵不强制对称；零与缺失分开|heatmap,correlation_matrix|二值邻接;加权邻接
venn|韦恩集合图|Venn diagram;Venn|relation|data|表达少量集合的成员归属与交集|集合名称和真实成员清单，或完整交集计数与定义|交集由成员计算；面积是否按数量注明；空交集与未给数据分开|upset,euler|二集合韦恩图
euler|欧拉集合图|Euler diagram;欧拉图|relation|data|仅绘制实际存在的集合区域与包含关系|集合名称、完整成员清单、空交集依据|不要求枚举全部可能交集；缺少区域表示经数据确认的空集；不同于韦恩图的全组合结构|venn,upset|面积比例欧拉
upset|UpSet 交集图|UpSet;集合交集矩阵|relation|data|用集合组合矩阵和条形表达多集合交集大小|集合名称、成员清单、包含式或互斥交集口径|点阵与计数对齐；声明交集口径；不得把累积交集当互斥数|venn,adjacency_matrix|互斥交集;包含式交集
sankey|桑基流量图|Sankey;桑基图|relation|data|以带宽表达节点之间的数量流|source/target/value、流量单位、守恒假设|带宽成比例；负流量禁止；源汇或损耗明确，不能为美观伪造守恒|alluvial,chord|多阶段流量
chord|弦图|Chord diagram;弦带图|relation|data|圆周实体间以弦带表达成对数量|source/target/value、有向或无向、单位|角宽带宽映射声明；有向流的方向明确；不要把普通连线伪装定量带|sankey,network|有向弦图
causal_dag|因果有向无环图|Causal DAG;因果图|relation|schematic|表达有依据的因果假设及混杂结构|变量、方向、混杂假设、观测或潜变量、依据|无有向循环；相关不推出因果；未测混杂变量用独立编码|mechanism,network|潜变量DAG
bar|柱形图|Bar chart;柱状图;条形图|comparison|data|用共同基线长度比较类别量|label/value、单位、统计量含义、原始或汇总来源|长度轴通常从零起；汇总与原始分布区别；误差必须声明 SD/SE/CI|dotplot,histogram|分组;堆叠;百分比堆叠;误差区间
dotplot|类别点图|Dot plot;Cleveland dot plot|comparison|data|用共同数轴位置比较类别数值|label/value、单位、排序依据|位置编码不暗示连续趋势；区间与点估计分开；类别排序有依据|scatter,bar|分组点图;区间点图
stripplot|原始观测点图|Strip plot;Beeswarm;蜂群图;抖动散点|distribution|data|按类别展示每个原始观测值|观测ID、group/value、单位、抖动或碰撞规避方法|每点对应一个原始观测；抖动只能沿非数据轴；不得用均值复制生成伪观测|dotplot,raincloud|蜂群排列;随机抖动
lollipop|棒棒糖图|Lollipop|comparison|data|用点和基线杆比较类别值|label/value、单位、基线|杆长基线一致；点面积不编码未经声明的额外变量|bar,dotplot|分组棒棒糖
dumbbell|哑铃图|Dumbbell;配对点图|comparison|data|比较同一对象的两个数值|label/start/end、配对ID、单位|连线只连接同一对象；两端意义明确；不把独立组伪装配对|line,dotplot|前后对照
forest|森林图|Forest plot;效应量区间图|comparison|data|比较多个效应估计及置信区间|label/value/low/high、效应尺度、置信水平、权重来源|参考线随差值或比值变化；区间含点估计；合并效应须真实算法|dotplot,funnel_meta|荟萃森林图
waterfall|瀑布增量图|Waterfall;桥接图|comparison|data|表达增减项如何构成总量|label/value、初值、增量和总计标识|累计值逐项可复算；总计与增量不能混用|bar,area|收支桥接
radar|雷达图|Radar;Spider chart;蜘蛛图|comparison|data|在共同指标轴上比较多维概况|label/value/group、各指标单位与归一化规则|不同单位先声明标准化；固定轴序；多边形面积不当总分|parallel_coordinates,bar|多对象雷达
histogram|直方图|Histogram;频数分布|distribution|data|用分箱计数表达连续变量分布|原始 value、单位、分箱边界或规则|箱宽与密度关系正确；边界闭合规则明确；不把类别柱图称直方图|bar,density|等宽分箱;不等宽密度
density|核密度图|Density;KDE;密度曲线|distribution|data|用明确平滑方法估计连续分布|原始 value、单位、核与带宽、边界处理|密度积分约为1；带宽影响展示；小样本不能伪装精细多峰证据|histogram,violin|多组密度
boxplot|箱线图|Box plot;Boxplot;箱须图|distribution|data|用中位数四分位和须线概括分布|原始 value/group 或明确分位数、须线算法、样本量|四分位算法和1.5IQR或极差须线明示；离群值不能擅删|violin,raincloud|分组箱线;缺口箱线
violin|小提琴图|Violin plot|distribution|data|用对称密度表达组间分布形状|原始 value/group、带宽、归一化规则、样本量|宽度代表密度或样本量必须声明；不能从均值误差臆造分布|boxplot,density|分裂小提琴
raincloud|云雨图|Raincloud|distribution|data|组合半密度、原始点和摘要统计|原始 value/group、带宽、摘要统计定义|密度、点和箱线必须来自同一数据；抖动仅沿非数值轴|violin,boxplot|配对云雨
ridgeline|山脊密度图|Ridgeline;Joyplot;峰峦图|distribution|data|错位排列多组同尺度密度|原始 value/group、组序、带宽、重叠规则|横轴统一；纵向偏移不是概率值；截断和重叠说明|density,small_multiples|时间组山脊
ecdf|经验累积分布图|ECDF;经验CDF|distribution|data|表达样本中不超过阈值的累计比例|原始 value、单位、样本量|非递减且末值为1；阶梯位置对应真实观测；权重另行声明|density,kaplan_meier|加权ECDF
qq|分位数比较图|Q-Q plot;QQ图|distribution|data|比较样本分位数与另一分布分位数|原始 value、参考分布及参数估计方式|分位数算法一致；参考线不等于显著性检验；不可虚构正态结论|scatter,histogram|正态QQ;两样本QQ
line|折线图|Line chart;时间序列|trend|data|连接有序数值显示变化|x/y、顺序和单位、缺失值规则|连线仅适用于有序横轴；缺失区间不默认插补；区间来源可追踪|scatter,timeline|多序列;误差带;阶梯线
area|面积趋势图|Area chart;面积图|trend|data|以基线到曲线面积表达量随序变化|x/y/group、基线、单位、堆叠规则|零基线和堆叠累计一致；有正负时不误导；不能从面积推积分结论|line,streamgraph|堆叠面积;百分比面积
streamgraph|流图|Streamgraph;河流图|trend|data|围绕移动基线显示非负组成的变化|x/y/group、非负值、基线算法|形状偏移不表示负值；总厚度可复算；说明基线不是零|area,sankey|中心基线流图
kaplan_meier|生存曲线|Kaplan–Meier;KM曲线|trend|data|表达含删失观测的生存概率估计|time/event/group、事件编码、删失定义、时间单位、置信方法|风险集逐时复算；删失不能当事件；不能从曲线编造风险比或P值|ecdf,cumulative_incidence|分组生存曲线
cumulative_incidence|累计发生率曲线|Cumulative incidence;CIF;竞争风险图|trend|data|在竞争事件存在时表达特定事件累计发生概率|time/event/cause、事件种类、删失、估计方法|竞争事件不能当普通删失后直接取1减KM；每时点各原因累计概率和不超过1；原因编码与风险集可复算|kaplan_meier,ecdf|多原因累计发生率
scatter|散点图|Scatter plot;散布图|association|data|用两个数值坐标表达成对观测|x/y、观测ID、单位、分组|每点对应真实观测；趋势拟合必须说明方法；相关不等于因果|dotplot,ordination|分组散点;回归叠加;误差棒
bubble|气泡散点图|Bubble chart;气泡图|association|data|在散点上用面积编码第三个量|x/y/size、单位、面积映射|面积而非半径与量成比例；size非负；提供大小图例|scatter,bubble_matrix|分组气泡
heatmap|数值热图|Heatmap;热力矩阵|association|data|用色彩编码行列组合的数值|row/column/value、单位、缺失值、变换|顺序色或有依据中心的发散色；缺失与零不同；聚类方法声明|correlation_matrix,adjacency_matrix|聚类热图;环形热图
bubble_matrix|气泡矩阵|Bubble matrix;点阵图|association|data|在离散行列上以面积和可选颜色编码数值|row/column/value、面积和颜色变量定义|面积编码非负；颜色若编码不同变量须单独图例；零与缺失可区分|heatmap,bubble|双变量矩阵
binary_matrix|二值存在矩阵|Binary matrix;Presence absence;圆点二值图;方格二值图|association|data|表达样本与特征的存在或缺失|row/column/value为0或1、检测阈值、缺测定义|二值存在不是连接强度；零与未测分开；点或方格只是图元变体|adjacency_matrix,heatmap|圆点图元;方格图元
correlation_matrix|相关矩阵图|Correlogram;相关性热图|association|data|表达变量之间的相关系数|row/column/value、相关方法、样本量、缺失处理、多重检验|系数在[-1,1]；对称性与对角线按定义；星号须有检验和校正依据|heatmap,causal_dag|组内相关;组间相关
matrix_link_overlay|关联矩阵与网络叠合图|Matrix and network overlay;Mantel关联图|assembly|data|将矩阵和连线叠合表达不同但有对应关系的统计结果|矩阵数值与行列实体、连线端点和统计量、两套计算方法、样本对应与显著性来源|矩阵格与连线必须各自说明统计含义；使用Mantel时声明距离和置换策略；边颜色显著性不能自行推定|correlation_matrix,multipanel|关联矩阵叠合网络
parallel_coordinates|平行坐标图|Parallel coordinates|association|data|连接同一观测的多维数值|观测ID、变量矩阵、单位、每轴缩放|每条折线对应同一观测；各轴刻度和方向显示；缩放不冒充同单位|radar,line|标准化平行坐标
ordination|排序投影图|Ordination;PCA;PCoA;NMDS;CCA;RDA;UMAP;t-SNE|association|data|表达经声明分析方法得到的低维坐标|原始矩阵或已计算坐标x/y、method、预处理、距离/载荷/解释率或stress来源|方法不是可交换外观；PCA解释率不得用于NMDS/UMAP；坐标和载荷使用正确标度|scatter,phylogenetic|双标图;样本投影
pie|饼图|Pie chart;Donut;环图|composition|data|显示互斥部分占同一整体的比例|label/value、非负值、总体定义|总量大于0；类别互斥且口径一致；环孔为布局参数不是新图型|bar,treemap|环形
treemap|矩形树图|Treemap;面积树图|composition|data|用嵌套矩形面积表达层级数量|节点label/parent/value、汇总口径|面积按量缩放；父子总量一致；不能混算父节点自有量和子树总量|hierarchy,circle_packing|嵌套矩形
circle_packing|圆堆积层级图|Circle packing;圆堆砌|composition|data|用包含圆表示层级和叶节点大小|节点label/parent/value、叶节点计数|叶圆面积编码；圆间空隙不算数据；父圆面积不等于精确子项和|treemap,venn|嵌套圆
rose|极坐标面积图|Rose chart;玫瑰图;极区图|composition|data|以等角扇区面积表达周期或方向量|label/value、角度区间、面积或半径编码声明|默认面积与value成比例即半径开方；方向0点和旋转方向明确|pie,radar|方向频率玫瑰
alluvial|冲积流转图|Alluvial;平行集合|composition|data|表达个体群组在离散阶段间的类别转换|个体ID或聚合路径、阶段、类别、value|同一队列路径连续；带宽与人数一致；失访或新增明确|sankey,parallel_coordinates|队列流转
geological_section|地质剖面图|Geological section;地层剖面|spatial|domain|按明确剖面位置表达地层与构造关系|剖面路线、方向、测井或测绘来源、标高基准、水平垂直尺度、地层单位|水平与垂直比例及夸大倍数明确；推断接触与实测资料区分；地层厚度不得凭空生成|apparatus,contour|构造剖面;地层对比剖面
point_map|地理点位图|Point map;采样地图|spatial|data|表达真实地理坐标上的观测位置和量|经纬度x/y、坐标系、底图许可、单位|经纬度范围和投影正确；比例尺依投影计算；不能编造采样点|scatter,choropleth|比例符号地图
choropleth|分区设色地图|Choropleth;专题地图|spatial|data|用地理区域填色表达区域统计|区域ID和边界、value、标准化分母、投影与许可|总数与率区别；分级阈值声明；缺失区域不填零|point_map,heatmap|分位数分级
contour|等值线图|Contour;等高线|spatial|data|表达标量场相等值的空间轨迹|规则网格x/y/value或采样坐标、插值法、单位|等值线值准确；插值与外推区域标注；不由少数点伪造细结构|heatmap,vector_field|填色等值面
vector_field|矢量场图|Vector field;Quiver;流线图|spatial|data|表达位置上向量方向和大小|x/y/u/v、单位、坐标基、归一化|箭头缩放明示；流线计算需场定义；无速度数据不能补流速|contour,network|流线;箭矢
volcano|火山图|Volcano plot;差异表达图|bioscience|data|联合表达效应大小与统计证据|label/effect/p、效应尺度、原始或调整P值、阈值、检验方法|横轴通常log2效应纵轴负log10P；P=0处理明确；不得把原始P当FDR|ma_plot,scatter|调整P值火山
ma_plot|MA 图|MA plot;Bland–Altman expression|bioscience|data|联合表达平均丰度与对数差异|label/mean/effect、归一化、对数底数|平均丰度与差异不能交换；低丰度偏差可见；显著性需独立证据|volcano,bland_altman|RNA表达MA
enrichment|富集结果图|Enrichment plot;GO;KEGG;富集气泡图|bioscience|data|展示有明确定义背景的富集分析结果|term/count/background/p、分析方法、基因集和校正、比值口径|背景集真实；富集比和gene ratio区分；不能从条长猜显著性|bar,bubble_matrix|气泡;条形;圈形
gene_track|基因坐标轨道图|Gene track;基因簇排列;基因结构|bioscience|data|在基因组坐标上表达基因外显子与方向|label/start/end/strand、染色体、组装版本、坐标闭开规则|坐标范围一致；链方向箭头正确；断轴或省略区间明示|synteny,protein_domain|基因簇;外显子内含子
protein_domain|蛋白结构域图|Protein domains;保守结构域|bioscience|data|沿蛋白序列坐标标注结构域与位点|蛋白ID长度、start/end、域名、数据库版本和阈值|氨基酸坐标不当核苷酸；重叠域保留；预测与实验证据区分|gene_track,motif_logo|基序位置轨道
motif_logo|序列标识图|Sequence logo;Motif logo;序列徽标|bioscience|data|以字母堆叠表达序列位点频率或信息量|对齐序列或position/symbol/value、字母表、频率或bits定义、校正|字母高度和总信息量由频率计算；不能从位置条形伪造保守性|protein_domain,bar|概率标识;信息量标识
genome_circos|基因组环形轨道图|Genomic Circos;基因组圈图|bioscience|data|在有真实序列尺度的圆周整合轨道和连接|序列长度、轨道坐标和值、连接端点、组装版本|圆弧按序列长度；多轨尺度独立标注；连接不能越界|chord,gene_track|多组学环轨
synteny|基因组共线性图|Synteny;MCScanX;共线性|bioscience|data|表达基因组区段间有证据的同源对应|序列与坐标、同源块、方向、比对方法和阈值|对应带端点绑定坐标；倒位明确；不能只凭颜色推共同祖先|gene_track,chord|微共线性;全基因组共线性
phylogenetic|系统发育树图|Phylogenetic tree;进化树;Newick|bioscience|data|表达有来源的进化拓扑、枝长和支持度|Newick或边表、枝长含义、支持度算法、根的依据|根与无根含义不同；枝长单位明确；支持度不是概率除非方法允许|hierarchy,network|有根树;无根树;性状注释
dendrogram|层次聚类树状图|Dendrogram;聚类树|association|data|表达明确距离与连接准则得到的层次聚类|原始矩阵或linkage结果、距离度量、连接准则、预处理|分叉高度对应聚合距离而非进化时间；叶序可变但拓扑不能变；截断阈值必须有依据|phylogenetic,hierarchy|热图附属聚类树
roc|ROC 曲线|Receiver operating characteristic;受试者工作特征|evaluation|data|比较阈值变化下真阳性与假阳性率|真实标签和score，或已验证fpr/tpr点、正类定义、验证集|阈值由同一验证集计算；AUC不能凭图估算；对角线为随机基准|pr_curve,line|多模型ROC
pr_curve|精确率召回率曲线|Precision–Recall;PR curve|evaluation|data|比较阈值下精确率和召回率|真实标签和score或precision/recall、正类比例、验证集|基线随正类比例；AP与梯形AUC不同；数据泄漏必须披露|roc,line|多模型PR
confusion_matrix|混淆矩阵|Confusion matrix|evaluation|data|表达真实类别与预测类别交叉计数|row真实类别/column预测类别/value计数、类别顺序、归一化方法|行列方向明确；总数与样本量一致；归一化分母明示|heatmap,adjacency_matrix|行归一化;原始计数
calibration|校准曲线|Calibration plot;可靠性图|evaluation|data|比较预测概率和实际事件比例|逐样本概率与标签或bin/predicted/observed/count、分箱|分箱样本量与边界可追溯；y=x参考线；区间不能凭空添加|roc,scatter|分位数分箱
bland_altman|Bland–Altman 一致性图|Bland–Altman;均值差值图|evaluation|data|评估两种测量方法差异及一致性界限|逐对象配对测量、单位、差值方向、界限算法|偏倚与一致性界限真实计算；不能用相关系数代替一致性|ma_plot,scatter|比例差值
funnel_meta|荟萃漏斗图|Funnel plot;Meta-analysis funnel|evaluation|data|展示研究效应与精度的关系|各研究effect/se、效应尺度、固定或随机效应方法|纵轴精度方向明确；漏斗不对称不能直接定性发表偏倚；检验有方法来源|forest,scatter|等高显著性漏斗
comparison|并列比较示意图|Comparison schematic;方案对比|assembly|schematic|在一致维度下比较对象或条件的结构差异|比较对象、共同维度、已知差异、相同项|相同元素用相同视觉语法；不同尺寸不能暗示未给数值；结论有依据|bar,multipanel|前后对照;方法对照
multipanel|多面板组合图|Multi-panel figure;组合图;拼图|assembly|composite|以统一叙事组织多种不同子图|每面板类型和输入、面板标签、叙事关系、独立单位|每面板执行自己的规范；共享图例只用于相同语义；保留完整上下文|small_multiples,comparison|示意加数据;跨尺度组合
small_multiples|分面小多图|Small multiples;Facet;分面图|assembly|composite|重复同一图型比较条件或分组|子图类型、分组数据、轴是否共享、面板顺序|共享坐标才能直接比较大小；不同尺度明确；子图不重复抽样或改口径|multipanel,comparison|固定尺度分面;独立尺度分面
`.trim().split('\n')

const numericFields = {
 gantt:'start,end',network:'',adjacency_matrix:'value',venn:'',upset:'',sankey:'value',chord:'value',
 bar:'value',dotplot:'value',lollipop:'value',dumbbell:'start,end',forest:'value,low,high',waterfall:'value',radar:'value',
 histogram:'value',density:'value',boxplot:'value',violin:'value',raincloud:'value',ridgeline:'value',stripplot:'value',ecdf:'value',qq:'value',binary_matrix:'value',
 line:'x,y',area:'x,y',streamgraph:'x,y',kaplan_meier:'time,event',scatter:'x,y',bubble:'x,y,size',heatmap:'value',bubble_matrix:'value',correlation_matrix:'value',parallel_coordinates:'',ordination:'x,y',
 pie:'value',treemap:'value',circle_packing:'value',rose:'value',alluvial:'value',point_map:'x,y',choropleth:'value',contour:'x,y,value',vector_field:'x,y,u,v',volcano:'effect,p',ma_plot:'mean,effect',enrichment:'count,background,p',gene_track:'start,end',protein_domain:'start,end',motif_logo:'position,value',genome_circos:'start,end',synteny:'start,end',phylogenetic:'',roc:'fpr,tpr',pr_curve:'precision,recall',confusion_matrix:'value',calibration:'predicted,observed,count',bland_altman:'a,b',funnel_meta:'effect,se',
}
export const FIGURE_TYPES = entries.map(line=>{
 const [id,label,english,group,kind,definition,inputs,encoding,confusable,variants]=line.split('|')
 const [en,...aliases]=english.split(';')
 return {id,label,en,aliases,group,kind,definition,purpose:({schematic:'explain',process:'sequence',architecture:'structure',relation:'relate',comparison:'compare',distribution:'distribution',trend:'change',association:'associate',composition:'part_to_whole',spatial:'locate',bioscience:'biological_annotation',evaluation:'evaluate',assembly:'compose'})[group],scientificDomains:group==='bioscience'||id.startsWith('sbgn_')?['生命科学']:id==='geological_section'?['地球科学']:id==='circuit'?['电子工程']:id==='chemical_reaction'||id==='energy_diagram'?['化学']:['跨学科'],composition:kind==='composite'?'panels':'single',suitable:definition,unsuitable:TYPE_DETAILS[id].unsuitable,
  requiredInputs:inputs.split('、'),elements:TYPE_DETAILS[id].elements,encodingRules:[...encoding.split('；'),...(DOMAIN_RULES[id]||[])],confusable:confusable.split(','),
  variants:variants.split(';').map((name,index)=>({id:`${id}.v${index+1}`,label:name,support:{specification:'defined',execution:kind==='data'||kind==='composite'?'unavailable':'prompt_contract_only',validation:'not_independently_verified'}})),numericFields:(numericFields[id]||'').split(',').filter(Boolean),
  generationRequirements:[...encoding.split('；'),...(DOMAIN_RULES[id]||[]),'仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。'],
  reviewRequirements:[...[...encoding.split('；'),...(DOMAIN_RULES[id]||[])].map(rule=>`核对：${rule}`),'逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。'],
  support:{specification:'defined',research:REFERENCE_EXAMPLES[id]?.length?'paper_boundary_reviewed':'case_gap',pipeline:kind==='data'?(DETERMINISTIC_PLOT_TYPES.includes(id)?'deterministic_base':'candidate_unavailable'):kind==='composite'?'mixed_vector_panels':'generative_contract',formats:['png','svg'],validation:DETERMINISTIC_PLOT_TYPES.includes(id)?'same_scene_numeric_and_export_verified':kind==='composite'?'program_runtime_and_mock_models_verified':'contract_passed_visual_not_verified'},referenceExamples:REFERENCE_EXAMPLES[id]||[],referenceIds:(REFERENCE_EXAMPLES[id]||[]).map(r=>r.id),
 }
})

export const ANALYSIS_METHODS = [
 {id:'mantel',label:'Mantel 距离矩阵检验',typeId:'matrix_link_overlay',required:['对齐样本的距离矩阵','距离度量','置换策略、次数、系数与P值来源'],checks:['连线统计量不同于相关格','不能把空间或组内依赖忽略为独立样本']},
 {id:'pca',label:'PCA 主成分分析',typeId:'ordination',required:['变量矩阵或已计算得分','中心化/标准化','载荷和解释方差来源'],checks:['解释率在0..1且总和不超过1','欧氏方差语义，不用距离矩阵冒充原始变量']},
 {id:'pcoa',label:'PCoA 主坐标分析',typeId:'ordination',required:['距离矩阵或坐标','距离度量','负特征值处理','解释率来源'],checks:['坐标对应所选距离','解释率不能套用PCA结果']},
 {id:'nmds',label:'NMDS 非度量多维尺度',typeId:'ordination',required:['距离矩阵或坐标','距离度量','维数/随机种子','stress'],checks:['报告stress，不显示虚构解释率','轴方向没有原变量含义']},
 {id:'cca',label:'CCA 典范对应分析',typeId:'ordination',required:['群落矩阵','环境变量矩阵或完整分析结果','约束变量','尺度类型'],checks:['不能与典型相关分析混用缩写','样本/物种/环境箭头采用正确缩放']},
 {id:'rda',label:'RDA 冗余分析',typeId:'ordination',required:['响应矩阵','解释矩阵或完整分析结果','预处理','约束方差来源'],checks:['约束轴与未约束轴分开','载荷箭头不凭模型想象']},
 {id:'umap',label:'UMAP 嵌入',typeId:'ordination',required:['已计算坐标','邻居数/min_dist','距离度量/随机种子'],checks:['簇间距离和大小不直接解释为真实相似度或丰度','不标解释方差']},
 {id:'tsne',label:'t-SNE 嵌入',typeId:'ordination',required:['已计算坐标','perplexity','距离度量/随机种子'],checks:['全局距离不当原空间距离','不标解释方差']},
].map(method=>({...method,support:{input:'user_precomputed_results',computation:'not_implemented',validation:'input_contract_and_render_only'}}))

export const LEGACY_CATEGORIES = {
 mantel_association:'matrix_link_overlay',method_framework:'method_framework',workflow:'workflow',system_architecture:'system_architecture',mechanism:'mechanism',comparison:'comparison',timeline:'timeline',concept_map:'concept_map',
 data_stat:null,'方法框架图':'method_framework','流程图':'workflow','系统架构图':'system_architecture','机制示意图':'mechanism','对比图':'comparison','时间线/路线图':null,'时间线':'timeline','概念关系图':'concept_map','数据统计图':null,
}
