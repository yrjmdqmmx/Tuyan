# 图研信息图完整目录与类型规范

注册表版本 2026-10-10.v1。本文件由运行注册表自动导出；不额外维护第二套分类。

92 个基础图型、142 个有名称的变体、8 种分析方法。变体数量不是已实现数量：当前数据绘制只接受基础图型，变体请求会被拒绝；示意变体仅进入约束。真实案例缺口如实保留。

## 大类总览

|大类|基础图型数|具体图型|
|---|---:|---|
|研究示意与机制|10|方法框架图、实验设计图、实验装置图、机制示意图、解剖定位示意图、化学反应式图、能量剖面图、生化过程描述图、生物活动流图、生物实体关系图|
|过程、时间与控制|9|流程图、泳道流程图、决策树图、状态转移图、时序交互图、数据流图、时间线、甘特图、研究路线图|
|系统与工程结构|4|系统架构图、神经网络架构图、数据库实体关系图、电路原理图|
|关系与集合|10|概念关系图、层级树图、节点连接网络图、邻接矩阵图、韦恩集合图、欧拉集合图、UpSet 交集图、桑基流量图、弦图、因果有向无环图|
|数值比较与估计|7|柱形图、类别点图、棒棒糖图、哑铃图、森林图、瀑布增量图、雷达图|
|分布与不确定性|9|原始观测点图、直方图、核密度图、箱线图、小提琴图、云雨图、山脊密度图、经验累积分布图、分位数比较图|
|趋势与生存|5|折线图、面积趋势图、流图、生存曲线、累计发生率曲线|
|关联与多变量|9|散点图、气泡散点图、数值热图、气泡矩阵、二值存在矩阵、相关矩阵图、平行坐标图、排序投影图、层次聚类树状图|
|组成与层级数量|5|饼图、矩形树图、圆堆积层级图、极坐标面积图、冲积流转图|
|空间与场|5|地质剖面图、地理点位图、分区设色地图、等值线图、矢量场图|
|生物序列与组学|9|火山图、MA 图、富集结果图、基因坐标轨道图、蛋白结构域图、序列标识图、基因组环形轨道图、基因组共线性图、系统发育树图|
|模型与证据评价|6|ROC 曲线、精确率召回率曲线、混淆矩阵、校准曲线、Bland–Altman 一致性图、荟萃漏斗图|
|组合表达|4|关联矩阵与网络叠合图、并列比较示意图、多面板组合图、分面小多图|

## 研究示意与机制

### 方法框架图 · Method framework

稳定 ID：`method_framework`；完整路径：研究示意与机制 / 方法框架图。

- **定义**：呈现研究方法的模块及信息如何转化，适用于方法总览
- **适用**：呈现研究方法的模块及信息如何转化，适用于方法总览
- **不适用**：逐步操作细节或部署拓扑应选流程图或系统架构图
- **别名**：研究框架、方法总览
- **表达目的**：explain
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：研究目标；模块功能；输入输出；创新模块；连接语义
- **关键元素**：模块容器；输入输出；带语义的箭头；创新标记
- **编码规则**：模块分组必须对应方法分工；箭头区分数据与反馈；不能把贡献夸大为已验证结论
- **常见变体**：训练与推理双路径 (method_framework.v1)
- **容易混淆**：系统架构图 (system_architecture)；流程图 (workflow)
- **生成要求**：模块分组必须对应方法分工；箭头区分数据与反馈；不能把贡献夸大为已验证结论；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：模块分组必须对应方法分工；核对：箭头区分数据与反馈；核对：不能把贡献夸大为已验证结论；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Integrating a tailored recurrent neural network with Bayesian experimental design to optimize microbial community functions](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011436)，Fig 1。边界：外观中的曲面和阴影不能覆盖图研SVG静态渲染限制。
- [Integrating a tailored recurrent neural network with Bayesian experimental design to optimize microbial community functions](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011436)，Fig 4 / b。边界：原论文资源、喂料策略和产量不是新任务的证据。
- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 1。边界：原始数据库、损失与生物结论不可迁移。
- [PPanGGOLiN: Depicting microbial diversity via a partitioned pangenome graph](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1007732)，Fig 1。边界：矩阵行是基因家族、列是基因组；0/1 表达存在缺失，不能当节点邻接。
- [Model-based Traction Force Microscopy Reveals Differential Tension in Cellular Actin Bundles](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1004076)，Fig 2。边界：逆问题解依赖模型假设和正则化，框图不构成方法有效性的证据。

### 实验设计图 · Experimental design

稳定 ID：`experimental_design`；完整路径：研究示意与机制 / 实验设计图。

- **定义**：表达实验单位、分组、处理和测量设计
- **适用**：表达实验单位、分组、处理和测量设计
- **不适用**：没有真实分组方案时不能暗示随机化或样本量
- **别名**：试验设计
- **表达目的**：explain
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：实验单位；分配方法；处理；对照；测量时点；真实样本量或未定标记
- **关键元素**：实验单位；处理分支；对照；测量时点；样本量标记
- **编码规则**：分配和测量区别表达；重复测量保留同一实验单位；样本量不得从参考图复制
- **常见变体**：交叉设计 (experimental_design.v1)；因子设计 (experimental_design.v2)；重复测量设计 (experimental_design.v3)
- **容易混淆**：流程图 (workflow)；时间线 (timeline)
- **生成要求**：分配和测量区别表达；重复测量保留同一实验单位；样本量不得从参考图复制；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：分配和测量区别表达；核对：重复测量保留同一实验单位；核对：样本量不得从参考图复制；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [The Experimental Design Assistant](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.2003779)，Fig 2。边界：实验单位、分组和样本量须来自新任务。
- [Integrating a tailored recurrent neural network with Bayesian experimental design to optimize microbial community functions](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011436)，Fig 3 / a。边界：误差条是中位数与IQR，时间曲线带是标准差；不能混用为95%CI。

### 实验装置图 · Apparatus schematic

稳定 ID：`apparatus`；完整路径：研究示意与机制 / 实验装置图。

- **定义**：解释物理部件如何连接与测量
- **适用**：解释物理部件如何连接与测量
- **不适用**：需要电气端口连通校验时应另附电路原理图
- **别名**：仪器示意图、装置示意
- **表达目的**：explain
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：部件；接口；介质或光路；传感器位置；比例是否示意
- **关键元素**：器件轮廓；端口；连接；测量位置；方向与比例声明
- **编码规则**：区分实物流、电路和光路；空间邻近不能代替连接；尺寸无依据时标示不按比例
- **常见变体**：剖面 (apparatus.v1)；爆炸视图 (apparatus.v2)
- **容易混淆**：系统架构图 (system_architecture)；电路原理图 (circuit)
- **生成要求**：区分实物流、电路和光路；空间邻近不能代替连接；尺寸无依据时标示不按比例；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：区分实物流、电路和光路；核对：空间邻近不能代替连接；核对：尺寸无依据时标示不按比例；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Integrating a tailored recurrent neural network with Bayesian experimental design to optimize microbial community functions](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011436)，Fig 4 / a。边界：原论文资源、喂料策略和产量不是新任务的证据。
- [Simple and efficient estimation of photovoltaic cells and modules parameters using approximation and correction technique](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0216201)，Fig 1 / a。边界：结构图为示意；I-V曲线及工作点有原论文模型依据，不能当其他器件实测。
- [Model-based Traction Force Microscopy Reveals Differential Tension in Cellular Actin Bundles](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1004076)，Fig 1 / A。边界：位移与牵引使用不同量纲；正则化参数和噪声会改变箭头场，不可仅凭视觉断言真值。

### 机制示意图 · Mechanism illustration

稳定 ID：`mechanism`；完整路径：研究示意与机制 / 机制示意图。

- **定义**：解释实体作用导致现象的证据链
- **适用**：解释实体作用导致现象的证据链
- **不适用**：只有相关性或推测时不能把关系画成已验证因果
- **别名**：作用机制
- **表达目的**：explain
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：实体；作用方向；证据来源；已知与假设关系
- **关键元素**：实体；作用弧；激活抑制图例；区室；证据状态
- **编码规则**：激活、抑制、转运等采用不同且有图例的符号；假设关系用独立编码；关联不可画成因果
- **常见变体**：反馈机制 (mechanism.v1)；多尺度机制 (mechanism.v2)
- **容易混淆**：因果有向无环图 (causal_dag)；生化过程描述图 (sbgn_pd)
- **生成要求**：激活、抑制、转运等采用不同且有图例的符号；假设关系用独立编码；关联不可画成因果；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：激活、抑制、转运等采用不同且有图例的符号；核对：假设关系用独立编码；核对：关联不可画成因果；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Automated visualization of rule-based models](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005857)，Fig 2。边界：酶底物和磷酸化位点来自此论文，不应复制到其他机制。
- [Automated visualization of rule-based models](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005857)，Fig 9。边界：反馈环不能用于无环因果DAG模板。
- [Monkeyflower (Mimulus) uncovers the evolutionary basis of the eukaryote telomere sequence variation](https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1011738)，Fig 10。边界：它是提出的机制模型，不是所有边都有定量枝长的系统发育树。
- [Identification of periodic attractors in Boolean networks using a priori information](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009702)，Fig 1 / C。边界：A节点是变量，B节点是整组布尔状态，C含反应节点，不能互相混用。D是表格，不能为了填补覆盖而标成二值矩阵图。

### 解剖定位示意图 · Anatomical schematic

稳定 ID：`anatomical`；完整路径：研究示意与机制 / 解剖定位示意图。

- **定义**：表达器官组织的相对位置与定位
- **适用**：表达器官组织的相对位置与定位
- **不适用**：真实定量影像测量不能由自由示意比例替代
- **别名**：解剖图
- **表达目的**：explain
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：物种；解剖部位；切面；方向术语；可核验结构来源
- **关键元素**：定位结构；切面；方向标签；定位小图；尺度声明
- **编码规则**：左右与观察方向明确；示意比例不能当测量；不得凭空补组织结构
- **常见变体**：切面定位 (anatomical.v1)；局部放大 (anatomical.v2)
- **容易混淆**：实验装置图 (apparatus)；机制示意图 (mechanism)
- **生成要求**：左右与观察方向明确；示意比例不能当测量；不得凭空补组织结构；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：左右与观察方向明确；核对：示意比例不能当测量；核对：不得凭空补组织结构；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Using ephaptic coupling to estimate the synaptic cleft resistivity of the calyx of Held synapse](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009527)，Fig 2 / A。边界：突触间隙不按比例；电路是作者假设模型，并非真实电气接线。

### 化学反应式图 · Reaction scheme

稳定 ID：`chemical_reaction`；完整路径：研究示意与机制 / 化学反应式图。

- **定义**：表达化学结构、反应条件和转化关系
- **适用**：表达化学结构、反应条件和转化关系
- **不适用**：缺少明确结构或反应依据时不能补全产物和产率
- **别名**：反应路线
- **表达目的**：explain
- **学科标签**：化学
- **组合方式**：single
- **必要输入**：准确结构标识；反应物产物；试剂条件；立体化学；产率来源
- **关键元素**：结构式；反应箭头；试剂条件；原子电荷；立体键
- **编码规则**：原子连接和电荷守恒；反应箭头与平衡箭头不同；无实测来源不补产率；核对元素、键级、电荷、同位素与立体键，反应前后必要的质量电荷平衡需要化学源数据校验。；普通反应箭头、平衡箭头与共振箭头分别使用；收率和反应条件只取自输入。；未提供 SMILES/Molfile 等可核验结构时列出结构证据缺口，不能由视觉评审宣称化学正确。
- **常见变体**：多步合成 (chemical_reaction.v1)；催化循环 (chemical_reaction.v2)
- **容易混淆**：机制示意图 (mechanism)；生化过程描述图 (sbgn_pd)
- **生成要求**：原子连接和电荷守恒；反应箭头与平衡箭头不同；无实测来源不补产率；核对元素、键级、电荷、同位素与立体键，反应前后必要的质量电荷平衡需要化学源数据校验。；普通反应箭头、平衡箭头与共振箭头分别使用；收率和反应条件只取自输入。；未提供 SMILES/Molfile 等可核验结构时列出结构证据缺口，不能由视觉评审宣称化学正确。；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：原子连接和电荷守恒；核对：反应箭头与平衡箭头不同；核对：无实测来源不补产率；核对：核对元素、键级、电荷、同位素与立体键，反应前后必要的质量电荷平衡需要化学源数据校验。；核对：普通反应箭头、平衡箭头与共振箭头分别使用；收率和反应条件只取自输入。；核对：未提供 SMILES/Molfile 等可核验结构时列出结构证据缺口，不能由视觉评审宣称化学正确。；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [An AKAP-Lbc-RhoA interaction inhibitor promotes the translocation of aquaporin-2 to the plasma membrane of renal collecting duct principal cells](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0191423)，Fig 3 / A。边界：化合物活性属于原研究，不能转移；条件编号须与完整图注对应。
- [Computational explanation for bioactivation mechanism of targeted anticancer agents mediated by cytochrome P450s: A case of Erlotinib](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0179333)，Fig 1。边界：箭头是化学转化而非一般工作步骤；不能将假设反应路线当成新任务实验事实。

### 能量剖面图 · Energy profile

稳定 ID：`energy_diagram`；完整路径：研究示意与机制 / 能量剖面图。

- **定义**：表达反应坐标上的态与势垒
- **适用**：表达反应坐标上的态与势垒
- **不适用**：时间趋势和无能量依据的定量势垒不适用
- **别名**：反应坐标图、势能图
- **表达目的**：explain
- **学科标签**：化学
- **组合方式**：single
- **必要输入**：态；过渡态；坐标定义；能量值与单位或定性声明
- **关键元素**：态与过渡态；反应坐标；能量轴；势垒；单位或定性标记
- **编码规则**：横轴是反应坐标不默认时间；定量势垒须有数值；定性曲线不可暗示精确差值
- **常见变体**：多路径势垒 (energy_diagram.v1)
- **容易混淆**：折线图 (line)；化学反应式图 (chemical_reaction)
- **生成要求**：横轴是反应坐标不默认时间；定量势垒须有数值；定性曲线不可暗示精确差值；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：横轴是反应坐标不默认时间；核对：定量势垒须有数值；核对：定性曲线不可暗示精确差值；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Computational explanation for bioactivation mechanism of targeted anticancer agents mediated by cytochrome P450s: A case of Erlotinib](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0179333)，Fig 4。边界：能量单位和参照态必须保留；横向间隔不是反应时间，计算势垒不是实验测量值。

### 生化过程描述图 · SBGN Process Description

稳定 ID：`sbgn_pd`；完整路径：研究示意与机制 / 生化过程描述图。

- **定义**：以实体池、过程和调控弧描述生化状态转化
- **适用**：以实体池、过程和调控弧描述生化状态转化
- **不适用**：只表达活动影响而不描述物质状态转化时应选 SBGN AF
- **别名**：SBGN PD
- **表达目的**：explain
- **学科标签**：生命科学
- **组合方式**：single
- **必要输入**：实体池；状态；区室；反应；消耗生产和调控关系
- **关键元素**：实体池图元；状态变量；过程节点；消耗生产弧；调控弧；区室
- **编码规则**：遵循 SBGN PD 图元和弧端点规则；过程节点不能省略为普通因果箭头；实体池连接过程：消耗弧从实体池到过程，生产弧从过程到实体池；调控弧的靶点为过程而非冒充物质流。；过程使用小方框；简单化学物使用圆形、宏分子使用圆角矩形，区室与状态变量不能混成过程。；催化用空心圆弧端、抑制用横杠、刺激用空心三角；每种符号需对应规范且不得互换。；复制实体池需声明克隆标记；状态发生改变时用不同状态实体池，不用一条普通箭头省略反应。
- **常见变体**：区室化过程 (sbgn_pd.v1)
- **容易混淆**：生物活动流图 (sbgn_af)；生物实体关系图 (sbgn_er)
- **生成要求**：遵循 SBGN PD 图元和弧端点规则；过程节点不能省略为普通因果箭头；实体池连接过程：消耗弧从实体池到过程，生产弧从过程到实体池；调控弧的靶点为过程而非冒充物质流。；过程使用小方框；简单化学物使用圆形、宏分子使用圆角矩形，区室与状态变量不能混成过程。；催化用空心圆弧端、抑制用横杠、刺激用空心三角；每种符号需对应规范且不得互换。；复制实体池需声明克隆标记；状态发生改变时用不同状态实体池，不用一条普通箭头省略反应。；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：遵循 SBGN PD 图元和弧端点规则；核对：过程节点不能省略为普通因果箭头；核对：实体池连接过程：消耗弧从实体池到过程，生产弧从过程到实体池；调控弧的靶点为过程而非冒充物质流。；核对：过程使用小方框；简单化学物使用圆形、宏分子使用圆角矩形，区室与状态变量不能混成过程。；核对：催化用空心圆弧端、抑制用横杠、刺激用空心三角；每种符号需对应规范且不得互换。；核对：复制实体池需声明克隆标记；状态发生改变时用不同状态实体池，不用一条普通箭头省略反应。；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Automated visualization of rule-based models](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005857)，Fig 11 / A。边界：SBGN PD、ER、Kappa和rxncon不可互相替代；F不标为SBGN AF。
- [Mathematical modeling reveals ferritin as the strongest cellular driver of dietary iron transfer block in enterocytes](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1012374)，Fig 1。边界：必须保留专业记号语义；普通美化不能删除过程节点。
- [Quick tips for creating effective and impactful biological pathways using the Systems Biology Graphical Notation](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005740)，Fig 1 / a。边界：PD 的过程、ER 的状态关系、AF 的活动影响不能互换；不沿用原模型实体或推断。
- [Quick tips for creating effective and impactful biological pathways using the Systems Biology Graphical Notation](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005740)，Fig 3 / left、right。边界：节点克隆不代表新增物种，布局优化不等于原模型被科学验证。

### 生物活动流图 · SBGN Activity Flow

稳定 ID：`sbgn_af`；完整路径：研究示意与机制 / 生物活动流图。

- **定义**：表达生物活动之间的正负影响
- **适用**：表达生物活动之间的正负影响
- **不适用**：实体池的反应消耗与生产不能用活动影响替代
- **别名**：SBGN AF
- **表达目的**：explain
- **学科标签**：生命科学
- **组合方式**：single
- **必要输入**：活动；影响符号；逻辑算子；证据
- **关键元素**：生物活动图元；正负影响弧；逻辑算子；区室
- **编码规则**：遵循 SBGN AF；活动不是物质池；影响不等于物质转化；节点代表生物活动；正影响端为空心三角、负影响为横杠，未知影响须用独立的未知语义。；逻辑 AND、OR、NOT 的输入以逻辑弧连接；影响源可来自活动或逻辑算子，目标为活动。；实体存在量、生产或消耗不是活动影响图语义；不得从正影响推导化学反应守恒。
- **常见变体**：逻辑调控 (sbgn_af.v1)
- **容易混淆**：生化过程描述图 (sbgn_pd)；因果有向无环图 (causal_dag)
- **生成要求**：遵循 SBGN AF；活动不是物质池；影响不等于物质转化；节点代表生物活动；正影响端为空心三角、负影响为横杠，未知影响须用独立的未知语义。；逻辑 AND、OR、NOT 的输入以逻辑弧连接；影响源可来自活动或逻辑算子，目标为活动。；实体存在量、生产或消耗不是活动影响图语义；不得从正影响推导化学反应守恒。；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：遵循 SBGN AF；核对：活动不是物质池；核对：影响不等于物质转化；核对：节点代表生物活动；正影响端为空心三角、负影响为横杠，未知影响须用独立的未知语义。；核对：逻辑 AND、OR、NOT 的输入以逻辑弧连接；影响源可来自活动或逻辑算子，目标为活动。；核对：实体存在量、生产或消耗不是活动影响图语义；不得从正影响推导化学反应守恒。；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Quick tips for creating effective and impactful biological pathways using the Systems Biology Graphical Notation](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005740)，Fig 1 / c。边界：PD 的过程、ER 的状态关系、AF 的活动影响不能互换；不沿用原模型实体或推断。

### 生物实体关系图 · SBGN Entity Relationship

稳定 ID：`sbgn_er`；完整路径：研究示意与机制 / 生物实体关系图。

- **定义**：表达实体状态、关系及对关系的调控
- **适用**：表达实体状态、关系及对关系的调控
- **不适用**：数据库实体基数和时间顺序不是此图的语义
- **别名**：SBGN ER
- **表达目的**：explain
- **学科标签**：生命科学
- **组合方式**：single
- **必要输入**：实体；状态变量；关系和调控规则
- **关键元素**：实体；状态变量；赋值或相互作用；结果节点；调控弧
- **编码规则**：遵循 SBGN ER；不把关系链自动解释为时间过程；不同于数据库 ER；实体状态赋值、实体相互作用与调控分开表达；结果节点表示关系发生的结果而非操作步骤。；状态变量明确变量名与值；调控连接关系或结果，不能自动转成时间流程。；相互作用不表示生成产物或数据表外键，涉及反应顺序时另用 PD。
- **常见变体**：状态关系 (sbgn_er.v1)
- **容易混淆**：数据库实体关系图 (entity_relationship)；生化过程描述图 (sbgn_pd)
- **生成要求**：遵循 SBGN ER；不把关系链自动解释为时间过程；不同于数据库 ER；实体状态赋值、实体相互作用与调控分开表达；结果节点表示关系发生的结果而非操作步骤。；状态变量明确变量名与值；调控连接关系或结果，不能自动转成时间流程。；相互作用不表示生成产物或数据表外键，涉及反应顺序时另用 PD。；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：遵循 SBGN ER；核对：不把关系链自动解释为时间过程；核对：不同于数据库 ER；核对：实体状态赋值、实体相互作用与调控分开表达；结果节点表示关系发生的结果而非操作步骤。；核对：状态变量明确变量名与值；调控连接关系或结果，不能自动转成时间流程。；核对：相互作用不表示生成产物或数据表外键，涉及反应顺序时另用 PD。；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Automated visualization of rule-based models](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005857)，Fig 11 / D。边界：SBGN PD、ER、Kappa和rxncon不可互相替代；F不标为SBGN AF。
- [Quick tips for creating effective and impactful biological pathways using the Systems Biology Graphical Notation](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005740)，Fig 1 / b。边界：PD 的过程、ER 的状态关系、AF 的活动影响不能互换；不沿用原模型实体或推断。

## 过程、时间与控制

### 流程图 · Flowchart

稳定 ID：`workflow`；完整路径：过程、时间与控制 / 流程图。

- **定义**：表达操作顺序、分支和终止条件
- **适用**：表达操作顺序、分支和终止条件
- **不适用**：静态组成或没有顺序含义的概念关系不宜画成流程
- **别名**：Workflow、处理流程
- **表达目的**：sequence
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：起点终点；步骤；分支条件；输入输出
- **关键元素**：起止节点；步骤；条件分支；方向箭头；循环条件
- **编码规则**：分支标注互斥或并发语义；每条路径有去向；回路有条件
- **常见变体**：并行流程 (workflow.v1)；循环流程 (workflow.v2)
- **容易混淆**：方法框架图 (method_framework)；决策树图 (decision_tree)
- **生成要求**：分支标注互斥或并发语义；每条路径有去向；回路有条件；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：分支标注互斥或并发语义；核对：每条路径有去向；核对：回路有条件；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [The Experimental Design Assistant](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.2003779)，Fig 1。边界：案例不是所有实验都必须遵守的唯一流程。
- [Twelve quick tips for software design](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009809)，Fig 2。边界：图中的具体算法不应转移到别的流程。
- [Model-based Traction Force Microscopy Reveals Differential Tension in Cellular Actin Bundles](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1004076)，Fig 2 / B。边界：逆问题解依赖模型假设和正则化，框图不构成方法有效性的证据。

### 泳道流程图 · Swimlane

稳定 ID：`swimlane`；完整路径：过程、时间与控制 / 泳道流程图。

- **定义**：表达流程步骤的责任归属与交接
- **适用**：表达流程步骤的责任归属与交接
- **不适用**：泳道宽度和位置不能代表处理时长
- **别名**：跨角色流程
- **表达目的**：sequence
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：角色；步骤；交接；顺序；分支条件
- **关键元素**：角色泳道；步骤；交接箭头；条件；起止节点
- **编码规则**：每步骤归属角色；跨泳道连线代表交接；泳道不是时间比例轴
- **常见变体**：跨组织流程 (swimlane.v1)
- **容易混淆**：流程图 (workflow)；时序交互图 (sequence_diagram)
- **生成要求**：每步骤归属角色；跨泳道连线代表交接；泳道不是时间比例轴；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：每步骤归属角色；核对：跨泳道连线代表交接；核对：泳道不是时间比例轴；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Extending analytic methods for economic evaluation in implementation science](https://link.springer.com/article/10.1186/s13012-022-01192-w)，Fig. 1 / a、b。边界：c 面板为作者明确标注的假设数据；泳道图表达流程责任，不表示实际实施效果。

### 决策树图 · Decision tree

稳定 ID：`decision_tree`；完整路径：过程、时间与控制 / 决策树图。

- **定义**：表达条件逐级划分到决策叶节点
- **适用**：表达条件逐级划分到决策叶节点
- **不适用**：有循环控制的系统不能强制画成树；无训练结果时不补模型指标
- **别名**：判定树
- **表达目的**：sequence
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：分支条件；阈值来源；叶节点含义；规则或已训练树
- **关键元素**：根节点；分支条件；阈值；决策叶；规则来源
- **编码规则**：条件覆盖与互斥明确；不得编造训练指标；结构应无循环
- **常见变体**：规则树 (decision_tree.v1)；已训练模型树 (decision_tree.v2)
- **容易混淆**：流程图 (workflow)；层级树图 (hierarchy)
- **生成要求**：条件覆盖与互斥明确；不得编造训练指标；结构应无循环；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：条件覆盖与互斥明确；核对：不得编造训练指标；核对：结构应无循环；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Predicting self-intercepted medication ordering errors using machine learning](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0254358)，Fig 2。边界：只呈现训练树的一部分；原图注称causal patterns，但这是预测规则，不能推导因果关系或照搬用药建议。新图须逐边标注条件，不能只靠红绿区分。

### 状态转移图 · State transition

稳定 ID：`state_transition`；完整路径：过程、时间与控制 / 状态转移图。

- **定义**：表达系统状态与触发事件
- **适用**：表达系统状态与触发事件
- **不适用**：操作步骤不是状态；有概率时需另核对行和与来源
- **别名**：状态机
- **表达目的**：sequence
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：状态；初始终止态；事件；守卫条件
- **关键元素**：状态节点；初态；终态；触发边；守卫条件
- **编码规则**：节点是状态不是动作；边标注事件；自循环与不可达态显式检查
- **常见变体**：有限状态机 (state_transition.v1)；马尔可夫链 (state_transition.v2)
- **容易混淆**：流程图 (workflow)；节点连接网络图 (network)
- **生成要求**：节点是状态不是动作；边标注事件；自循环与不可达态显式检查；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：节点是状态不是动作；核对：边标注事件；核对：自循环与不可达态显式检查；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Identification of periodic attractors in Boolean networks using a priori information](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009702)，Fig 1 / B。边界：A节点是变量，B节点是整组布尔状态，C含反应节点，不能互相混用。D是表格，不能为了填补覆盖而标成二值矩阵图。

### 时序交互图 · Sequence diagram

稳定 ID：`sequence_diagram`；完整路径：过程、时间与控制 / 时序交互图。

- **定义**：表达参与者间消息的时间顺序
- **适用**：表达参与者间消息的时间顺序
- **不适用**：需要精确持续时间的任务排程应选甘特图
- **别名**：消息时序图
- **表达目的**：sequence
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：参与者；消息方向；同步异步；返回和条件
- **关键元素**：参与者；生命线；消息；激活段；返回和条件框
- **编码规则**：生命线对应参与者；时间轴顺序一致；区分同步调用与返回
- **常见变体**：异步消息 (sequence_diagram.v1)；条件交互 (sequence_diagram.v2)
- **容易混淆**：泳道流程图 (swimlane)；时间线 (timeline)
- **生成要求**：生命线对应参与者；时间轴顺序一致；区分同步调用与返回；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：生命线对应参与者；核对：时间轴顺序一致；核对：区分同步调用与返回；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Development platform for artificial pancreas algorithms](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0243139)，Fig 7。边界：此处时序轴表达先后，不按执行时长成比例。原代码、认证参数和胰岛素算法并非新系统实现依据。

### 数据流图 · Data flow diagram

稳定 ID：`dataflow`；完整路径：过程、时间与控制 / 数据流图。

- **定义**：表达数据在处理过程、存储和外部实体间移动
- **适用**：表达数据在处理过程、存储和外部实体间移动
- **不适用**：控制信号先后和硬件部署不等于数据流
- **别名**：DFD
- **表达目的**：sequence
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：数据实体；处理；存储；外部边界；流名
- **关键元素**：外部实体；处理；存储；命名数据流；系统边界
- **编码规则**：数据流有名称；不能把控制顺序冒充数据；分解前后输入输出平衡
- **常见变体**：分层数据流 (dataflow.v1)
- **容易混淆**：流程图 (workflow)；系统架构图 (system_architecture)
- **生成要求**：数据流有名称；不能把控制顺序冒充数据；分解前后输入输出平衡；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：数据流有名称；核对：不能把控制顺序冒充数据；核对：分解前后输入输出平衡；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Data analysis and modeling pipelines for controlled networked social science experiments](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0242453)，Fig 3。边界：这些是数据/控制流，不应误标为物质守恒桑基图。
- [Data analysis and modeling pipelines for controlled networked social science experiments](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0242453)，Fig 11 / 1,2。边界：配置文件、函数名及结果均属于原论文。
- [SIMPROV: Provenance capturing for simulation studies](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0327607)，Fig 1。边界：来源依据与派生关系不能改画为时间或因果证明。

### 时间线 · Timeline

稳定 ID：`timeline`；完整路径：过程、时间与控制 / 时间线。

- **定义**：按有依据的时间表达事件先后
- **适用**：按有依据的时间表达事件先后
- **不适用**：没有时间证据的未来目标应选路线图并声明估计
- **别名**：事件时间轴
- **表达目的**：sequence
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：事件；日期或相对时点；时间单位；缺失区间
- **关键元素**：时间轴；事件标记；日期；区间；尺度声明
- **编码规则**：等间距若非真实比例必须注明；事件不能靠视觉间距虚构持续时间
- **常见变体**：区间事件 (timeline.v1)；多轨时间线 (timeline.v2)
- **容易混淆**：研究路线图 (roadmap)；甘特图 (gantt)
- **生成要求**：等间距若非真实比例必须注明；事件不能靠视觉间距虚构持续时间；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：等间距若非真实比例必须注明；核对：事件不能靠视觉间距虚构持续时间；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Bioimage informatics: Investing in software usability is essential](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3002213)，Fig 1。边界：年份间的视觉间隔未必精确表示时长；历史里程碑不是未来路线图。

### 甘特图 · Gantt chart

稳定 ID：`gantt`；完整路径：过程、时间与控制 / 甘特图。

- **定义**：用区间长度表达任务起止和依赖
- **适用**：用区间长度表达任务起止和依赖
- **不适用**：只有先后顺序而没有起止时间时不能虚构条长
- **别名**：进度计划
- **表达目的**：sequence
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：任务 label；数值 start/end；时间单位；依赖
- **关键元素**：任务行；起止条；时间轴；依赖；计划实际标记
- **编码规则**：结束不得早于开始；真实时间尺度一致；计划与完成状态分开
- **常见变体**：依赖进度 (gantt.v1)；资源泳道 (gantt.v2)
- **容易混淆**：时间线 (timeline)；研究路线图 (roadmap)
- **生成要求**：结束不得早于开始；真实时间尺度一致；计划与完成状态分开；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：结束不得早于开始；核对：真实时间尺度一致；核对：计划与完成状态分开；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Ten simple rules for implementing a successful field season](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1012189)，Fig 1。边界：原图按半月格展示计划，不应把相同格宽当作每天完全等距；原论文日期、许可流程和任务期限不能直接迁移。

### 研究路线图 · Roadmap

稳定 ID：`roadmap`；完整路径：过程、时间与控制 / 研究路线图。

- **定义**：表达未来目标、阶段、依赖和里程碑
- **适用**：表达未来目标、阶段、依赖和里程碑
- **不适用**：已发生事件应选时间线，实际排程应提供甘特数据
- **别名**：技术路线图
- **表达目的**：sequence
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：阶段目标；依赖；预期交付；时间是估计或承诺
- **关键元素**：阶段；目标；依赖；里程碑；预期交付标记
- **编码规则**：计划明确标为计划；阶段关系不等于已完成实证结果
- **常见变体**：技术成熟度路线 (roadmap.v1)
- **容易混淆**：时间线 (timeline)；方法框架图 (method_framework)
- **生成要求**：计划明确标为计划；阶段关系不等于已完成实证结果；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：计划明确标为计划；核对：阶段关系不等于已完成实证结果；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- 暂无通过本次许可与质量核验的案例；保持缺口，不以无关图补位。

## 系统与工程结构

### 系统架构图 · System architecture

稳定 ID：`system_architecture`；完整路径：系统与工程结构 / 系统架构图。

- **定义**：表达系统组件、边界、层次及接口
- **适用**：表达系统组件、边界、层次及接口
- **不适用**：研究贡献叙事不等同于组件部署关系
- **别名**：软件架构
- **表达目的**：structure
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：组件职责；边界；接口；部署或逻辑视角
- **关键元素**：组件；层；系统边界；接口；方向和视角标签
- **编码规则**：声明视角；接口方向与协议来源明确；逻辑层不冒充实际部署
- **常见变体**：部署视图 (system_architecture.v1)；逻辑视图 (system_architecture.v2)
- **容易混淆**：方法框架图 (method_framework)；数据流图 (dataflow)
- **生成要求**：声明视角；接口方向与协议来源明确；逻辑层不冒充实际部署；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：声明视角；核对：接口方向与协议来源明确；核对：逻辑层不冒充实际部署；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Connectivity concepts in neuronal network modeling](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1010086)，Fig 10 / A。边界：阈值隐藏连接有明示规则；新任务不能默认删掉低概率边。
- [Data analysis and modeling pipelines for controlled networked social science experiments](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0242453)，Fig 5。边界：等式是结构示意，不表示可计算数值公式。

### 神经网络架构图 · Neural network architecture

稳定 ID：`neural_architecture`；完整路径：系统与工程结构 / 神经网络架构图。

- **定义**：表达模型算子、张量路径及训练推理关系
- **适用**：表达模型算子、张量路径及训练推理关系
- **不适用**：只知道模型名称而无实际结构时不能补造层数和张量尺寸
- **别名**：模型结构
- **表达目的**：structure
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：模块；算子；张量维度；跳连；共享权重；损失
- **关键元素**：算子模块；张量维度；跳连；共享权重；损失与输出
- **编码规则**：张量维度变换可追踪；共享权重不同于数据流；训练损失与推理输出区分
- **常见变体**：编码器解码器 (neural_architecture.v1)；多分支结构 (neural_architecture.v2)
- **容易混淆**：系统架构图 (system_architecture)；方法框架图 (method_framework)
- **生成要求**：张量维度变换可追踪；共享权重不同于数据流；训练损失与推理输出区分；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：张量维度变换可追踪；核对：共享权重不同于数据流；核对：训练损失与推理输出区分；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Integrating a tailored recurrent neural network with Bayesian experimental design to optimize microbial community functions](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011436)，Fig 3 / b。边界：误差条是中位数与IQR，时间曲线带是标准差；不能混用为95%CI。
- [Integrating a tailored recurrent neural network with Bayesian experimental design to optimize microbial community functions](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011436)，Fig 5。边界：保持新模型的尺寸和约束；不能凭参考图添加网络层。

### 数据库实体关系图 · Entity relationship diagram

稳定 ID：`entity_relationship`；完整路径：系统与工程结构 / 数据库实体关系图。

- **定义**：表达数据实体、属性与基数约束
- **适用**：表达数据实体、属性与基数约束
- **不适用**：生物实体调控和普通概念图不适用数据库基数符号
- **别名**：ERD、数据库ER
- **表达目的**：structure
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：实体；主外键；关系；基数；可空性
- **关键元素**：实体；属性；主外键；关系；两端基数
- **编码规则**：关系两端基数完整；概念实体与数据表视角明确；不混淆生物 SBGN ER
- **常见变体**：概念数据模型 (entity_relationship.v1)；逻辑数据模型 (entity_relationship.v2)
- **容易混淆**：概念关系图 (concept_map)；生物实体关系图 (sbgn_er)
- **生成要求**：关系两端基数完整；概念实体与数据表视角明确；不混淆生物 SBGN ER；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：关系两端基数完整；核对：概念实体与数据表视角明确；核对：不混淆生物 SBGN ER；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Twelve quick tips for software design](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009809)，Fig 3。边界：数据库ER不同于SBGN ER，不复制患者数据字段作为新任务事实。
- [Data analysis and modeling pipelines for controlled networked social science experiments](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0242453)，Fig 7。边界：保留新系统自身的数据实体和基数。

### 电路原理图 · Circuit schematic

稳定 ID：`circuit`；完整路径：系统与工程结构 / 电路原理图。

- **定义**：表达电子元件端口和电气连接
- **适用**：表达电子元件端口和电气连接
- **不适用**：空间装置照片或部件摆放不能代替电气连通
- **别名**：电气原理图
- **表达目的**：structure
- **学科标签**：电子工程
- **组合方式**：single
- **必要输入**：元件型号；端口；网络；参考地；电源；符号体系
- **关键元素**：电气元件符号；引脚；网络；连接点；电源与参考地
- **编码规则**：采用声明的 IEC/ANSI 符号；交叉与连接点可辨；电气连通需网表核对；元件实例与引脚逐项对应输入；以网络节点核对电气连通而非仅检查线条视觉相交。；有电连接的交叉必须有明确连接点；无连接的跨线与结点区分，参考地与电源极性不可猜测。；符号体系在图注声明；未提供网表时列出“无法完成连通验证”，不得声称电路通过电气校验。
- **常见变体**：模拟电路 (circuit.v1)；数字逻辑 (circuit.v2)
- **容易混淆**：实验装置图 (apparatus)；系统架构图 (system_architecture)
- **生成要求**：采用声明的 IEC/ANSI 符号；交叉与连接点可辨；电气连通需网表核对；元件实例与引脚逐项对应输入；以网络节点核对电气连通而非仅检查线条视觉相交。；有电连接的交叉必须有明确连接点；无连接的跨线与结点区分，参考地与电源极性不可猜测。；符号体系在图注声明；未提供网表时列出“无法完成连通验证”，不得声称电路通过电气校验。；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：采用声明的 IEC/ANSI 符号；核对：交叉与连接点可辨；核对：电气连通需网表核对；核对：元件实例与引脚逐项对应输入；以网络节点核对电气连通而非仅检查线条视觉相交。；核对：有电连接的交叉必须有明确连接点；无连接的跨线与结点区分，参考地与电源极性不可猜测。；核对：符号体系在图注声明；未提供网表时列出“无法完成连通验证”，不得声称电路通过电气校验。；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Optimized equivalent circuit models for series-parallel configurations of piezoelectric transducers in energy harvesting](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0323682)，Fig 1。边界：图中等效参数、器件与电流方向仅属于该压电模型；新电路需独立网表。
- [Simple and efficient estimation of photovoltaic cells and modules parameters using approximation and correction technique](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0216201)，Fig 1 / b。边界：结构图为示意；I-V曲线及工作点有原论文模型依据，不能当其他器件实测。
- [Using ephaptic coupling to estimate the synaptic cleft resistivity of the calyx of Held synapse](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009527)，Fig 2 / B。边界：突触间隙不按比例；电路是作者假设模型，并非真实电气接线。

## 关系与集合

### 概念关系图 · Concept map

稳定 ID：`concept_map`；完整路径：关系与集合 / 概念关系图。

- **定义**：表达概念之间有名称的语义关系
- **适用**：表达概念之间有名称的语义关系
- **不适用**：需要数值权重或严格因果假设时应选网络或 DAG
- **别名**：知识关系图
- **表达目的**：relate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：概念列表；关系动词；层级或非层级说明
- **关键元素**：概念节点；有动词的连线；层级和交叉联系
- **编码规则**：连接有关系词；包含与因果分开；概念不重复造成虚假数量
- **常见变体**：交叉链接 (concept_map.v1)
- **容易混淆**：层级树图 (hierarchy)；因果有向无环图 (causal_dag)
- **生成要求**：连接有关系词；包含与因果分开；概念不重复造成虚假数量；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：连接有关系词；核对：包含与因果分开；核对：概念不重复造成虚假数量；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Implications of disparities in social and built environment antecedents to adult nature engagement](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0274948)，Fig 1。边界：作者从访谈形成的概念路径不等于实验因果证明；原图部分箭头含义靠正文解释，新图应显式补充关系名称而非复制未说明箭头。

### 层级树图 · Hierarchy

稳定 ID：`hierarchy`；完整路径：关系与集合 / 层级树图。

- **定义**：表达唯一父子包含或分类关系
- **适用**：表达唯一父子包含或分类关系
- **不适用**：多父关系不能强塞树；枝长无进化或距离含义
- **别名**：树状图、分类树
- **表达目的**：relate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：节点；父子关系；层级定义
- **关键元素**：根；父子枝；层级标签；叶节点
- **编码规则**：同层语义一致；多父归属应改网络；不能用枝长暗示进化距离
- **常见变体**：组织层级 (hierarchy.v1)；分类目录 (hierarchy.v2)
- **容易混淆**：系统发育树图 (phylogenetic)；概念关系图 (concept_map)
- **生成要求**：同层语义一致；多父归属应改网络；不能用枝长暗示进化距离；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：同层语义一致；核对：多父归属应改网络；核对：不能用枝长暗示进化距离；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [A hierarchical loss and its problems when classifying non-hierarchically](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0226222)，Fig 1。边界：这是分类层级，分支长度没有进化时间或聚类距离含义。
- [A Standardised Vocabulary for Identifying Benthic Biota and Substrata from Underwater Imagery: The CATAMI Classification Scheme](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0141039)，Fig 1。边界：可见形态分类不等同系统发育关系；不能依据图片布局推断亲缘距离。

### 节点连接网络图 · Node-link network

稳定 ID：`network`；完整路径：关系与集合 / 节点连接网络图。

- **定义**：表达有依据的实体连接和属性
- **适用**：表达有依据的实体连接和属性
- **不适用**：节点布局距离不能未经声明当作科学距离
- **别名**：关系网络
- **表达目的**：relate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：source/target 边表；节点；方向；权重含义
- **关键元素**：节点；连接；方向；权重图例；孤立点
- **编码规则**：布局距离不是科学距离除非声明；权重与中心性必须来自计算；孤立点不丢失
- **常见变体**：二部网络 (network.v1)；加权网络 (network.v2)
- **容易混淆**：因果有向无环图 (causal_dag)；弦图 (chord)
- **生成要求**：布局距离不是科学距离除非声明；权重与中心性必须来自计算；孤立点不丢失；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：布局距离不是科学距离除非声明；核对：权重与中心性必须来自计算；核对：孤立点不丢失；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 4 / C。边界：A是组织空间图，不是经纬度地图；D是关系弦图，不是基因组Circos。
- [Connectivity concepts in neuronal network modeling](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1010086)，Fig 7 / A–H。边界：概率、连接规则和自连接语义不能从视觉简化推定。
- [Connectivity concepts in neuronal network modeling](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1010086)，Fig 8。边界：这是该论文提议的神经网络记号，不能冒充通用标准。
- [Connectivity concepts in neuronal network modeling](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1010086)，Fig 10 / B,C。边界：阈值隐藏连接有明示规则；新任务不能默认删掉低概率边。
- [Passion fruit plants alter the soil microbial community with continuous cropping and improve plant disease resistance by recruiting beneficial microorganisms](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0281854)，Fig 7。边界：共现相关边不是因果或直接物理作用。
- [Identification of periodic attractors in Boolean networks using a priori information](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009702)，Fig 1 / A。边界：A节点是变量，B节点是整组布尔状态，C含反应节点，不能互相混用。D是表格，不能为了填补覆盖而标成二值矩阵图。
- [Social Network Analysis As a Tool for Research Policy](https://journals.plos.org/plosntds/article?id=10.1371/journal.pntd.0004266)，Fig 1 / b。边界：行列均为作者节点，不是样本与特征的存在缺失表；共著不代表科学影响力。
- [PPanGGOLiN: Depicting microbial diversity via a partitioned pangenome graph](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1007732)，Fig 1 / pangenome graph。边界：矩阵行是基因家族、列是基因组；0/1 表达存在缺失，不能当节点邻接。

### 邻接矩阵图 · Adjacency matrix

稳定 ID：`adjacency_matrix`；完整路径：关系与集合 / 邻接矩阵图。

- **定义**：以矩阵格表达成对连接
- **适用**：以矩阵格表达成对连接
- **不适用**：普通热图和相关系数矩阵具有不同科学语义
- **别名**：连接矩阵
- **表达目的**：relate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：行 row 与列 column 标识；value；方向和权重语义
- **关键元素**：行列实体；连接格；权重图例；方向与缺失标记
- **编码规则**：行列顺序记录；有向矩阵不强制对称；零与缺失分开
- **常见变体**：二值邻接 (adjacency_matrix.v1)；加权邻接 (adjacency_matrix.v2)
- **容易混淆**：数值热图 (heatmap)；相关矩阵图 (correlation_matrix)
- **生成要求**：行列顺序记录；有向矩阵不强制对称；零与缺失分开；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：行列顺序记录；核对：有向矩阵不强制对称；核对：零与缺失分开；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Social Network Analysis As a Tool for Research Policy](https://journals.plos.org/plosntds/article?id=10.1371/journal.pntd.0004266)，Fig 1 / a。边界：行列均为作者节点，不是样本与特征的存在缺失表；共著不代表科学影响力。

### 韦恩集合图 · Venn diagram

稳定 ID：`venn`；完整路径：关系与集合 / 韦恩集合图。

- **定义**：表达少量集合的成员归属与交集
- **适用**：表达少量集合的成员归属与交集
- **不适用**：集合很多或需要精准比较交集数量时宜选 UpSet
- **别名**：Venn
- **表达目的**：relate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：集合名称和真实成员清单，或完整交集计数与定义
- **关键元素**：集合边界；所有逻辑区域；交集标记；计数和集合标签
- **编码规则**：交集由成员计算；面积是否按数量注明；空交集与未给数据分开
- **常见变体**：二集合韦恩图 (venn.v1)
- **容易混淆**：UpSet 交集图 (upset)；欧拉集合图 (euler)
- **生成要求**：交集由成员计算；面积是否按数量注明；空交集与未给数据分开；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：交集由成员计算；核对：面积是否按数量注明；核对：空交集与未给数据分开；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 5 / E。边界：不能从原图抄取AUC或交集数量；复杂韦恩只作多集合方法边界案例。
- [Passion fruit plants alter the soil microbial community with continuous cropping and improve plant disease resistance by recruiting beneficial microorganisms](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0281854)，Fig 4。边界：五集合适合说明复杂度边界；数量不可沿用，更多集合优先考虑UpSet。
- [Identification of a novel AP2 transcription factor in zygotes with an essential role in Plasmodium ookinete development](https://journals.plos.org/plospathogens/article?id=10.1371/journal.ppat.1010510)，Fig 4 / B。边界：E 的字母高度是 bits，不是任意字形大小；C 是互斥峰区域的组成。F 虽在图注称 histogram，画面实际以折线连接频数，不能作为柱形直方图模板；不迁移原论文结合基序或因果结论。

### 欧拉集合图 · Euler diagram

稳定 ID：`euler`；完整路径：关系与集合 / 欧拉集合图。

- **定义**：仅绘制实际存在的集合区域与包含关系
- **适用**：仅绘制实际存在的集合区域与包含关系
- **不适用**：不知道空交集时不能省略区域来暗示不存在
- **别名**：欧拉图
- **表达目的**：relate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：集合名称；完整成员清单；空交集依据
- **关键元素**：存在区域；包含关系；集合边界；空集依据
- **编码规则**：不要求枚举全部可能交集；缺少区域表示经数据确认的空集；不同于韦恩图的全组合结构
- **常见变体**：面积比例欧拉 (euler.v1)
- **容易混淆**：韦恩集合图 (venn)；UpSet 交集图 (upset)
- **生成要求**：不要求枚举全部可能交集；缺少区域表示经数据确认的空集；不同于韦恩图的全组合结构；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：不要求枚举全部可能交集；核对：缺少区域表示经数据确认的空集；核对：不同于韦恩图的全组合结构；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [COVID-19, tuberculosis, and HIV triad: a prospective observational study in ambulatory patients in Kenya, Uganda, and South Africa](https://journals.plos.org/globalpublichealth/article?id=10.1371/journal.pgph.0004471)，Fig 3。边界：集合面积与计数的具体拟合需另验；不能假定所有理论交集都存在。

### UpSet 交集图 · UpSet

稳定 ID：`upset`；完整路径：关系与集合 / UpSet 交集图。

- **定义**：用集合组合矩阵和条形表达多集合交集大小
- **适用**：用集合组合矩阵和条形表达多集合交集大小
- **不适用**：不能把累积包含交集误当互斥区域
- **别名**：集合交集矩阵
- **表达目的**：relate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：集合名称；成员清单；包含式或互斥交集口径
- **关键元素**：集合行；交集组合点阵；交集计数条；口径图例
- **编码规则**：点阵与计数对齐；声明交集口径；不得把累积交集当互斥数
- **常见变体**：互斥交集 (upset.v1)；包含式交集 (upset.v2)
- **容易混淆**：韦恩集合图 (venn)；邻接矩阵图 (adjacency_matrix)
- **生成要求**：点阵与计数对齐；声明交集口径；不得把累积交集当互斥数；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：点阵与计数对齐；核对：声明交集口径；核对：不得把累积交集当互斥数；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 5 / B,C。边界：不能从原图抄取AUC或交集数量；复杂韦恩只作多集合方法边界案例。

### 桑基流量图 · Sankey

稳定 ID：`sankey`；完整路径：关系与集合 / 桑基流量图。

- **定义**：以带宽表达节点之间的数量流
- **适用**：以带宽表达节点之间的数量流
- **不适用**：无流量数据时只能画流程，不能捏造带宽
- **别名**：桑基图
- **表达目的**：relate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：source/target/value；流量单位；守恒假设
- **关键元素**：阶段节点；定量带；源汇；流量单位；损耗
- **编码规则**：带宽成比例；负流量禁止；源汇或损耗明确，不能为美观伪造守恒
- **常见变体**：多阶段流量 (sankey.v1)
- **容易混淆**：冲积流转图 (alluvial)；弦图 (chord)
- **生成要求**：带宽成比例；负流量禁止；源汇或损耗明确，不能为美观伪造守恒；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：带宽成比例；核对：负流量禁止；核对：源汇或损耗明确，不能为美观伪造守恒；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 3 / F。边界：UMAP不是PCA；F带宽代表相互作用强度，不代表守恒物质流。
- [Noise and neglect: Social-media signals expose attention gaps for dengue, chikungunya, lymphatic filariasis and kala-azar in India’s vector-borne NTDs](https://journals.plos.org/plosntds/article?id=10.1371/journal.pntd.0013378)，Fig 2 / A。边界：原图省略极小类，不能推断完整总量；新任务必须明确省略条件和原始分母。

### 弦图 · Chord diagram

稳定 ID：`chord`；完整路径：关系与集合 / 弦图。

- **定义**：圆周实体间以弦带表达成对数量
- **适用**：圆周实体间以弦带表达成对数量
- **不适用**：基因组坐标轨道和无权网络不是定量弦图
- **别名**：弦带图
- **表达目的**：relate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：source/target/value；有向或无向；单位
- **关键元素**：圆周实体；定量弦带；方向；数量图例
- **编码规则**：角宽带宽映射声明；有向流的方向明确；不要把普通连线伪装定量带
- **常见变体**：有向弦图 (chord.v1)
- **容易混淆**：桑基流量图 (sankey)；节点连接网络图 (network)
- **生成要求**：角宽带宽映射声明；有向流的方向明确；不要把普通连线伪装定量带；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：角宽带宽映射声明；核对：有向流的方向明确；核对：不要把普通连线伪装定量带；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 4 / D。边界：A是组织空间图，不是经纬度地图；D是关系弦图，不是基因组Circos。
- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 5 / A。边界：不能从原图抄取AUC或交集数量；复杂韦恩只作多集合方法边界案例。
- [Noise and neglect: Social-media signals expose attention gaps for dengue, chikungunya, lymphatic filariasis and kala-azar in India’s vector-borne NTDs](https://journals.plos.org/plosntds/article?id=10.1371/journal.pntd.0013378)，Fig 2 / B。边界：原图省略极小类，不能推断完整总量；新任务必须明确省略条件和原始分母。

### 因果有向无环图 · Causal DAG

稳定 ID：`causal_dag`；完整路径：关系与集合 / 因果有向无环图。

- **定义**：表达有依据的因果假设及混杂结构
- **适用**：表达有依据的因果假设及混杂结构
- **不适用**：反馈机制有环，不能宣称为 DAG；相关不能自动转换为因果
- **别名**：因果图
- **表达目的**：relate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：变量；方向；混杂假设；观测或潜变量；依据
- **关键元素**：变量节点；有向边；潜变量标记；假设说明
- **编码规则**：无有向循环；相关不推出因果；未测混杂变量用独立编码
- **常见变体**：潜变量DAG (causal_dag.v1)
- **容易混淆**：机制示意图 (mechanism)；节点连接网络图 (network)
- **生成要求**：无有向循环；相关不推出因果；未测混杂变量用独立编码；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：无有向循环；核对：相关不推出因果；核对：未测混杂变量用独立编码；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Robust methods in Mendelian randomization via penalization of heterogeneous causal estimates](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0222362)，Fig 1。边界：缺失G到Y和G与U关联路径是工具变量假设，不能从参考图自动继承到新研究；它不是带权相关网络。

## 数值比较与估计

### 柱形图 · Bar chart

稳定 ID：`bar`；完整路径：数值比较与估计 / 柱形图。

- **定义**：用共同基线长度比较类别量
- **适用**：用共同基线长度比较类别量
- **不适用**：连续分布分箱应选直方图；只给均值不能展示原始离散程度
- **别名**：柱状图、条形图
- **表达目的**：compare
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：label/value；单位；统计量含义；原始或汇总来源
- **关键元素**：类别轴；共同零基线；定量条；单位；统计量说明
- **编码规则**：长度轴通常从零起；汇总与原始分布区别；误差必须声明 SD/SE/CI
- **常见变体**：分组 (bar.v1)；堆叠 (bar.v2)；百分比堆叠 (bar.v3)；误差区间 (bar.v4)
- **容易混淆**：类别点图 (dotplot)；直方图 (histogram)
- **生成要求**：长度轴通常从零起；汇总与原始分布区别；误差必须声明 SD/SE/CI；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：长度轴通常从零起；核对：汇总与原始分布区别；核对：误差必须声明 SD/SE/CI；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Beyond Bar and Line Graphs: Time for a New Data Presentation Paradigm](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.1002128)，Fig 1 / A。边界：这是方法学示例，不代表本用户实验数据或P值。
- [Beyond Bar and Line Graphs: Time for a New Data Presentation Paradigm](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.1002128)，Fig 2 / A。边界：B–D 是用斜线连接配对观测的点图，不是共享数值轴上的标准哑铃图。配对 ID、测试结果不可移植。
- [Integrating a tailored recurrent neural network with Bayesian experimental design to optimize microbial community functions](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011436)，Fig 3 / c,d。边界：误差条是中位数与IQR，时间曲线带是标准差；不能混用为95%CI。
- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 3 / E。边界：UMAP不是PCA；F带宽代表相互作用强度，不代表守恒物质流。
- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 5 / F。边界：不能从原图抄取AUC或交集数量；复杂韦恩只作多集合方法边界案例。
- [Passion fruit plants alter the soil microbial community with continuous cropping and improve plant disease resistance by recruiting beneficial microorganisms](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0281854)，Fig 6 / 右侧。边界：这是相似性聚类树，不是系统发育树；不能推断进化关系。
- [Passion fruit plants alter the soil microbial community with continuous cropping and improve plant disease resistance by recruiting beneficial microorganisms](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0281854)，Fig 8 / a–h。边界：功能预测不冒充实测代谢通量；原论文结论不可迁移。
- [Identification of a novel AP2 transcription factor in zygotes with an essential role in Plasmodium ookinete development](https://journals.plos.org/plospathogens/article?id=10.1371/journal.ppat.1010510)，Fig 4 / D。边界：E 的字母高度是 bits，不是任意字形大小；C 是互斥峰区域的组成。F 虽在图注称 histogram，画面实际以折线连接频数，不能作为柱形直方图模板；不迁移原论文结合基序或因果结论。

### 类别点图 · Dot plot

稳定 ID：`dotplot`；完整路径：数值比较与估计 / 类别点图。

- **定义**：用共同数轴位置比较类别数值
- **适用**：用共同数轴位置比较类别数值
- **不适用**：原始观测点展示不是类别估计点图
- **别名**：Cleveland dot plot
- **表达目的**：compare
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：label/value；单位；排序依据
- **关键元素**：类别轴；数值轴；点；可选区间；排序说明
- **编码规则**：位置编码不暗示连续趋势；区间与点估计分开；类别排序有依据
- **常见变体**：分组点图 (dotplot.v1)；区间点图 (dotplot.v2)
- **容易混淆**：散点图 (scatter)；柱形图 (bar)
- **生成要求**：位置编码不暗示连续趋势；区间与点估计分开；类别排序有依据；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：位置编码不暗示连续趋势；核对：区间与点估计分开；核对：类别排序有依据；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [The distribution of technology induced job loss: Evidence from a population-wide study in Norway](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0321072)，Fig 2。边界：点是参数估计，不是个体样本；模型设定与区间水平必须随新数据重新说明。

### 棒棒糖图 · Lollipop

稳定 ID：`lollipop`；完整路径：数值比较与估计 / 棒棒糖图。

- **定义**：用点和基线杆比较类别值
- **适用**：用点和基线杆比较类别值
- **不适用**：面积比较和时间趋势不适用棒棒糖杆长语义
- **别名**：无
- **表达目的**：compare
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：label/value；单位；基线
- **关键元素**：类别；共同基线；杆；端点；单位
- **编码规则**：杆长基线一致；点面积不编码未经声明的额外变量
- **常见变体**：分组棒棒糖 (lollipop.v1)
- **容易混淆**：柱形图 (bar)；类别点图 (dotplot)
- **生成要求**：杆长基线一致；点面积不编码未经声明的额外变量；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：杆长基线一致；核对：点面积不编码未经声明的额外变量；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Comparison of journal and top publisher self-citation rates in COVID-19 research](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0314976)，Fig 3。边界：排名、指标值与分组仅适用于原数据；端点大小没有第三变量含义。
- [Improving the diagnostic recognition of thoracic endometriosis: Spotlight on a new histo-morphological indicator](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0251385)，Fig 3。边界：Cramér V 表达关联强度而非因果或诊断性能；阈值颜色不可迁移为显著性。

### 哑铃图 · Dumbbell

稳定 ID：`dumbbell`；完整路径：数值比较与估计 / 哑铃图。

- **定义**：比较同一对象的两个数值
- **适用**：比较同一对象的两个数值
- **不适用**：非配对的独立样本不能通过连线暗示对应
- **别名**：配对点图
- **表达目的**：compare
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：label/start/end；配对ID；单位
- **关键元素**：配对对象；两个端点；连接段；两端图例；单位
- **编码规则**：连线只连接同一对象；两端意义明确；不把独立组伪装配对
- **常见变体**：前后对照 (dumbbell.v1)
- **容易混淆**：折线图 (line)；类别点图 (dotplot)
- **生成要求**：连线只连接同一对象；两端意义明确；不把独立组伪装配对；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：连线只连接同一对象；核对：两端意义明确；核对：不把独立组伪装配对；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Self-reports from behind the scenes: Questionable research practices and rates of replication in ego depletion research](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0199554)，Fig 1。边界：两端是类别汇总比例，不是个体配对轨迹；连线不表示时间演化。

### 森林图 · Forest plot

稳定 ID：`forest`；完整路径：数值比较与估计 / 森林图。

- **定义**：比较多个效应估计及置信区间
- **适用**：比较多个效应估计及置信区间
- **不适用**：没有区间来源时不能生成置信线或合并效应
- **别名**：效应量区间图
- **表达目的**：compare
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：label/value/low/high；效应尺度；置信水平；权重来源
- **关键元素**：研究标签；点估计；置信区间；无效应线；效应尺度
- **编码规则**：参考线随差值或比值变化；区间含点估计；合并效应须真实算法
- **常见变体**：荟萃森林图 (forest.v1)
- **容易混淆**：类别点图 (dotplot)；荟萃漏斗图 (funnel_meta)
- **生成要求**：参考线随差值或比值变化；区间含点估计；合并效应须真实算法；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：参考线随差值或比值变化；核对：区间含点估计；核对：合并效应须真实算法；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Magnitude of workplace violence and associated factors among healthcare professionals in East Africa: A systematic review and meta-analysis](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0332415)，Fig 2。边界：权重与总体菱形来自随机效应计算，不得由模型补出。

### 瀑布增量图 · Waterfall

稳定 ID：`waterfall`；完整路径：数值比较与估计 / 瀑布增量图。

- **定义**：表达增减项如何构成总量
- **适用**：表达增减项如何构成总量
- **不适用**：普通互斥类别量不能未经声明当作可累加增量
- **别名**：桥接图
- **表达目的**：compare
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：label/value；初值；增量和总计标识
- **关键元素**：累计初值；正负增量；浮动条；累计基线；总计说明
- **编码规则**：累计值逐项可复算；总计与增量不能混用
- **常见变体**：收支桥接 (waterfall.v1)
- **容易混淆**：柱形图 (bar)；面积趋势图 (area)
- **生成要求**：累计值逐项可复算；总计与增量不能混用；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：累计值逐项可复算；核对：总计与增量不能混用；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [A novel method to derive personalized minimum viable recommendations for type 2 diabetes prevention based on counterfactual explanations](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0272825)，Fig 4。边界：SHAP 是模型输出分解，不是因果效应或通用风险建议；舍入数值和原患者特征不可移植。

### 雷达图 · Radar

稳定 ID：`radar`；完整路径：数值比较与估计 / 雷达图。

- **定义**：在共同指标轴上比较多维概况
- **适用**：在共同指标轴上比较多维概况
- **不适用**：异量纲未标准化和把多边形面积当总分不适用
- **别名**：Spider chart、蜘蛛图
- **表达目的**：compare
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：label/value/group；各指标单位与归一化规则
- **关键元素**：共同指标轴；逐轴刻度；归一化说明；对象轮廓；轴序
- **编码规则**：不同单位先声明标准化；固定轴序；多边形面积不当总分
- **常见变体**：多对象雷达 (radar.v1)
- **容易混淆**：平行坐标图 (parallel_coordinates)；柱形图 (bar)
- **生成要求**：不同单位先声明标准化；固定轴序；多边形面积不当总分；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：不同单位先声明标准化；核对：固定轴序；核对：多边形面积不当总分；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [Multidimensional mechanics: Performance mapping of natural biological systems using permutated radar charts](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0204309)，Fig 3 / a–d。边界：四组轴变量不同，不能跨面板直接比较面积；面积受轴序影响。阴影混合SD/SE/范围，借鉴时必须统一并声明统计口径；原论文形状分析法不是普适总分。

## 分布与不确定性

### 原始观测点图 · Strip plot

稳定 ID：`stripplot`；完整路径：分布与不确定性 / 原始观测点图。

- **定义**：按类别展示每个原始观测值
- **适用**：按类别展示每个原始观测值
- **不适用**：均值或汇总数不能复制成虚构样本点
- **别名**：Beeswarm、蜂群图、抖动散点
- **表达目的**：distribution
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：观测ID；group/value；单位；抖动或碰撞规避方法
- **关键元素**：类别轴；每个观测点；数据轴；必要的点重叠声明
- **编码规则**：每点对应一个原始观测；抖动只能沿非数据轴；不得用均值复制生成伪观测
- **常见变体**：蜂群排列 (stripplot.v1)；随机抖动 (stripplot.v2)
- **容易混淆**：类别点图 (dotplot)；云雨图 (raincloud)
- **生成要求**：每点对应一个原始观测；抖动只能沿非数据轴；不得用均值复制生成伪观测；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：每点对应一个原始观测；核对：抖动只能沿非数据轴；核对：不得用均值复制生成伪观测；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Beyond Bar and Line Graphs: Time for a New Data Presentation Paradigm](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.1002128)，Fig 1 / B–E。边界：这是方法学示例，不代表本用户实验数据或P值。
- [Beyond Bar and Line Graphs: Time for a New Data Presentation Paradigm](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.1002128)，Fig 2 / B–D、E。边界：B–D 是用斜线连接配对观测的点图，不是共享数值轴上的标准哑铃图。配对 ID、测试结果不可移植。

### 直方图 · Histogram

稳定 ID：`histogram`；完整路径：分布与不确定性 / 直方图。

- **定义**：用分箱计数表达连续变量分布
- **适用**：用分箱计数表达连续变量分布
- **不适用**：离散类别比较不是连续分布分箱
- **别名**：频数分布
- **表达目的**：distribution
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：原始 value；单位；分箱边界或规则
- **关键元素**：箱边界；计数或密度轴；连续条；单位；分箱说明
- **编码规则**：箱宽与密度关系正确；边界闭合规则明确；不把类别柱图称直方图
- **常见变体**：等宽分箱 (histogram.v1)；不等宽密度 (histogram.v2)
- **容易混淆**：柱形图 (bar)；核密度图 (density)
- **生成要求**：箱宽与密度关系正确；边界闭合规则明确；不把类别柱图称直方图；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：箱宽与密度关系正确；核对：边界闭合规则明确；核对：不把类别柱图称直方图；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Data analysis and modeling pipelines for controlled networked social science experiments](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0242453)，Fig 15。边界：需要核对密度归一化，不能把原论文分箱数作为通用默认。
- [ROTS: An R package for reproducibility-optimized statistical testing](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005562)，Fig 1 / D。边界：火山纵轴P值不同于MA纵轴效应；红色显著性与PCA坐标必须来自新任务分析。

### 核密度图 · Density

稳定 ID：`density`；完整路径：分布与不确定性 / 核密度图。

- **定义**：用明确平滑方法估计连续分布
- **适用**：用明确平滑方法估计连续分布
- **不适用**：没有原始观测不能凭几个均值画密度；边界分布需考虑偏差
- **别名**：KDE、密度曲线
- **表达目的**：distribution
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：原始 value；单位；核与带宽；边界处理
- **关键元素**：数值轴；密度轴；平滑曲线；带宽；样本说明
- **编码规则**：密度积分约为1；带宽影响展示；小样本不能伪装精细多峰证据
- **常见变体**：多组密度 (density.v1)
- **容易混淆**：直方图 (histogram)；小提琴图 (violin)
- **生成要求**：密度积分约为1；带宽影响展示；小样本不能伪装精细多峰证据；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：密度积分约为1；核对：带宽影响展示；核对：小样本不能伪装精细多峰证据；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Innovation and valuation of Chinese born-global firms](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0325214)，Fig 2。边界：密度可以高于 1；匹配后曲线接近不能单独证明无混杂或因果识别。

### 箱线图 · Box plot

稳定 ID：`boxplot`；完整路径：分布与不确定性 / 箱线图。

- **定义**：用中位数四分位和须线概括分布
- **适用**：用中位数四分位和须线概括分布
- **不适用**：箱须不是置信区间；只有均值和标准差不能还原箱体
- **别名**：Boxplot、箱须图
- **表达目的**：distribution
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：原始 value/group 或明确分位数；须线算法；样本量
- **关键元素**：中位数；四分位箱；须；离群点；样本分组
- **编码规则**：四分位算法和1.5IQR或极差须线明示；离群值不能擅删
- **常见变体**：分组箱线 (boxplot.v1)；缺口箱线 (boxplot.v2)
- **容易混淆**：小提琴图 (violin)；云雨图 (raincloud)
- **生成要求**：四分位算法和1.5IQR或极差须线明示；离群值不能擅删；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：四分位算法和1.5IQR或极差须线明示；核对：离群值不能擅删；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Passion fruit plants alter the soil microbial community with continuous cropping and improve plant disease resistance by recruiting beneficial microorganisms](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0281854)，Fig 3 / a,b。边界：P值属于原论文Kruskal–Wallis检验；不同指标纵轴不能直接比较。

### 小提琴图 · Violin plot

稳定 ID：`violin`；完整路径：分布与不确定性 / 小提琴图。

- **定义**：用对称密度表达组间分布形状
- **适用**：用对称密度表达组间分布形状
- **不适用**：小样本过度平滑易产生假结构，离散值不宜假装连续密度
- **别名**：无
- **表达目的**：distribution
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：原始 value/group；带宽；归一化规则；样本量
- **关键元素**：密度轮廓；数值轴；组别；带宽和归一化说明
- **编码规则**：宽度代表密度或样本量必须声明；不能从均值误差臆造分布
- **常见变体**：分裂小提琴 (violin.v1)
- **容易混淆**：箱线图 (boxplot)；核密度图 (density)
- **生成要求**：宽度代表密度或样本量必须声明；不能从均值误差臆造分布；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：宽度代表密度或样本量必须声明；核对：不能从均值误差臆造分布；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Trade-off between local transmission and long-range dispersal drives infectious disease outbreak size in spatially structured populations](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1008009)，Fig 6 / B、D。边界：A 是模拟坐标，不是地理地图；C 是论文中的荷兰农场空间分布，仅借鉴点位结构，投影和来源须按新任务重新提供。B、D 的分布来自模型模拟，不是观测疫情结论。

### 云雨图 · Raincloud

稳定 ID：`raincloud`；完整路径：分布与不确定性 / 云雨图。

- **定义**：组合半密度、原始点和摘要统计
- **适用**：组合半密度、原始点和摘要统计
- **不适用**：只有汇总统计量不能伪造雨点；必须说明摘要类型
- **别名**：无
- **表达目的**：distribution
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：原始 value/group；带宽；摘要统计定义
- **关键元素**：半密度轮廓；原始点；摘要区间或箱体；组别
- **编码规则**：密度、点和箱线必须来自同一数据；抖动仅沿非数值轴
- **常见变体**：配对云雨 (raincloud.v1)
- **容易混淆**：小提琴图 (violin)；箱线图 (boxplot)
- **生成要求**：密度、点和箱线必须来自同一数据；抖动仅沿非数值轴；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：密度、点和箱线必须来自同一数据；核对：抖动仅沿非数值轴；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Masking noise reduces the anti-predator-like response to an acoustic stimulus: Application of Signal Detection Theory to fish behaviour](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0327092)，Fig 4 / a。边界：时间重复测量不能误当独立样本；误差带是MAD，不能迁移为CI或复制其P值。

### 山脊密度图 · Ridgeline

稳定 ID：`ridgeline`；完整路径：分布与不确定性 / 山脊密度图。

- **定义**：错位排列多组同尺度密度
- **适用**：错位排列多组同尺度密度
- **不适用**：没有共同变量或缩放口径时山脊高度不可直接比较
- **别名**：Joyplot、峰峦图
- **表达目的**：distribution
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：原始 value/group；组序；带宽；重叠规则
- **关键元素**：各组密度；共同数值轴；分组偏移；归一化图例
- **编码规则**：横轴统一；纵向偏移不是概率值；截断和重叠说明
- **常见变体**：时间组山脊 (ridgeline.v1)
- **容易混淆**：核密度图 (density)；分面小多图 (small_multiples)
- **生成要求**：横轴统一；纵向偏移不是概率值；截断和重叠说明；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：横轴统一；核对：纵向偏移不是概率值；核对：截断和重叠说明；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Probability density and information entropy of machine learning derived intracranial pressure predictions](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0306028)，Fig 3。边界：KDE 平滑、带宽和纵向偏移必须重新定义；密度高度不是原始计数。
- [Environmental variables drive plant species composition and distribution in the moist temperate forests of Northwestern Himalaya, Pakistan](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0260687)，Fig 8。边界：群落顺序不是时间；点和分位线来自原研究样本，不可迁移。
- [An empirical appraisal of eLife’s assessment vocabulary](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3002645)，Fig 2。边界：问卷评分不是测量确定值；分布重叠本身不能替代组间统计检验。

### 经验累积分布图 · ECDF

稳定 ID：`ecdf`；完整路径：分布与不确定性 / 经验累积分布图。

- **定义**：表达样本中不超过阈值的累计比例
- **适用**：表达样本中不超过阈值的累计比例
- **不适用**：含删失时间不能直接当作普通经验分布
- **别名**：经验CDF
- **表达目的**：distribution
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：原始 value；单位；样本量
- **关键元素**：排序数值；阶梯函数；0到1纵轴；样本量
- **编码规则**：非递减且末值为1；阶梯位置对应真实观测；权重另行声明
- **常见变体**：加权ECDF (ecdf.v1)
- **容易混淆**：核密度图 (density)；生存曲线 (kaplan_meier)
- **生成要求**：非递减且末值为1；阶梯位置对应真实观测；权重另行声明；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：非递减且末值为1；核对：阶梯位置对应真实观测；核对：权重另行声明；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Bayesian inference of relative fitness on high-throughput pooled competition assays](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011937)，Fig 5 / D。边界：论文使用模拟场景，不能将曲线或拟合性能作为真实实验结论。

### 分位数比较图 · Q-Q plot

稳定 ID：`qq`；完整路径：分布与不确定性 / 分位数比较图。

- **定义**：比较样本分位数与另一分布分位数
- **适用**：比较样本分位数与另一分布分位数
- **不适用**：相关散点不等于分位数比较；参考分布须有来源
- **别名**：QQ图
- **表达目的**：distribution
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：原始 value；参考分布及参数估计方式
- **关键元素**：两组分位数坐标；参考线；分布参数；尾部点
- **编码规则**：分位数算法一致；参考线不等于显著性检验；不可虚构正态结论
- **常见变体**：正态QQ (qq.v1)；两样本QQ (qq.v2)
- **容易混淆**：散点图 (scatter)；直方图 (histogram)
- **生成要求**：分位数算法一致；参考线不等于显著性检验；不可虚构正态结论；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：分位数算法一致；核对：参考线不等于显著性检验；核对：不可虚构正态结论；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [Tuberculosis severity associates with variants and eQTLs related to vascular biology and infection-induced inflammation](https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1010387)，Fig 1。边界：这是 GWAS 的 p 值 Q–Q 图，不是默认正态性检验；偏离不能直接证明关联。

## 趋势与生存

### 折线图 · Line chart

稳定 ID：`line`；完整路径：趋势与生存 / 折线图。

- **定义**：连接有序数值显示变化
- **适用**：连接有序数值显示变化
- **不适用**：无自然顺序的类别不宜用连线制造连续趋势
- **别名**：时间序列
- **表达目的**：change
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：x/y；顺序和单位；缺失值规则
- **关键元素**：有序数值轴；观测点与连接；单位；断点
- **编码规则**：连线仅适用于有序横轴；缺失区间不默认插补；区间来源可追踪
- **常见变体**：多序列 (line.v1)；误差带 (line.v2)；阶梯线 (line.v3)
- **容易混淆**：散点图 (scatter)；时间线 (timeline)
- **生成要求**：连线仅适用于有序横轴；缺失区间不默认插补；区间来源可追踪；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：连线仅适用于有序横轴；核对：缺失区间不默认插补；核对：区间来源可追踪；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Integrating a tailored recurrent neural network with Bayesian experimental design to optimize microbial community functions](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011436)，Fig 3 / e。边界：误差条是中位数与IQR，时间曲线带是标准差；不能混用为95%CI。
- [Integrating a tailored recurrent neural network with Bayesian experimental design to optimize microbial community functions](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011436)，Fig 4 / c,d。边界：原论文资源、喂料策略和产量不是新任务的证据。
- [Data analysis and modeling pipelines for controlled networked social science experiments](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0242453)，Fig 14。边界：累积词数和时间窗不可复制；这不是平滑连续过程。
- [SIMPROV: Provenance capturing for simulation studies](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0327607)，Fig 9。边界：轨迹是模拟结果；颜色分类不代表新任务已有数据。
- [Trade-off between local transmission and long-range dispersal drives infectious disease outbreak size in spatially structured populations](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1008009)，Fig 2。边界：函数参数和曲线来源须保留；理论曲线不同于观测拟合。
- [Trade-off between local transmission and long-range dispersal drives infectious disease outbreak size in spatially structured populations](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1008009)，Fig 3 / A。边界：空间单位是模拟km坐标，不是经纬度；不得复制感染结论。
- [Masking noise reduces the anti-predator-like response to an acoustic stimulus: Application of Signal Detection Theory to fish behaviour](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0327092)，Fig 4 / b–g。边界：时间重复测量不能误当独立样本；误差带是MAD，不能迁移为CI或复制其P值。
- [ROTS: An R package for reproducibility-optimized statistical testing](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005562)，Fig 1 / C。边界：火山纵轴P值不同于MA纵轴效应；红色显著性与PCA坐标必须来自新任务分析。
- [Simple and efficient estimation of photovoltaic cells and modules parameters using approximation and correction technique](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0216201)，Fig 1 / c。边界：结构图为示意；I-V曲线及工作点有原论文模型依据，不能当其他器件实测。
- [Mutational signature dynamics indicate SARS-CoV-2’s evolutionary capacity is driven by host antiviral molecules](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011795)，Fig 2 / B。边界：Pearson 系数不是因果关系，拟合曲线不代表预测验证；原病例数不可借用。

### 面积趋势图 · Area chart

稳定 ID：`area`；完整路径：趋势与生存 / 面积趋势图。

- **定义**：以基线到曲线面积表达量随序变化
- **适用**：以基线到曲线面积表达量随序变化
- **不适用**：非零基线面积或负值需要专门声明，基础渲染不支持堆叠
- **别名**：面积图
- **表达目的**：change
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：x/y/group；基线；单位；堆叠规则
- **关键元素**：有序数值轴；边界线；基线；填充；单位
- **编码规则**：零基线和堆叠累计一致；有正负时不误导；不能从面积推积分结论
- **常见变体**：堆叠面积 (area.v1)；百分比面积 (area.v2)
- **容易混淆**：折线图 (line)；流图 (streamgraph)
- **生成要求**：零基线和堆叠累计一致；有正负时不误导；不能从面积推积分结论；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：零基线和堆叠累计一致；核对：有正负时不误导；核对：不能从面积推积分结论；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Mutational signature dynamics indicate SARS-CoV-2’s evolutionary capacity is driven by host antiviral molecules](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011795)，Fig 4 / A、B。边界：比例与数量不可混读；面积堆叠不等于流图的移动基线。

### 流图 · Streamgraph

稳定 ID：`streamgraph`；完整路径：趋势与生存 / 流图。

- **定义**：围绕移动基线显示非负组成的变化
- **适用**：围绕移动基线显示非负组成的变化
- **不适用**：需要精准读每组绝对值时中央漂移基线不合适
- **别名**：河流图
- **表达目的**：change
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：x/y/group；非负值；基线算法
- **关键元素**：有序轴；堆叠带；偏移基线；总量与组别图例
- **编码规则**：形状偏移不表示负值；总厚度可复算；说明基线不是零
- **常见变体**：中心基线流图 (streamgraph.v1)
- **容易混淆**：面积趋势图 (area)；桑基流量图 (sankey)
- **生成要求**：形状偏移不表示负值；总厚度可复算；说明基线不是零；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：形状偏移不表示负值；核对：总厚度可复算；核对：说明基线不是零；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- 暂无通过本次许可与质量核验的案例；保持缺口，不以无关图补位。

### 生存曲线 · Kaplan–Meier

稳定 ID：`kaplan_meier`；完整路径：趋势与生存 / 生存曲线。

- **定义**：表达含删失观测的生存概率估计
- **适用**：表达含删失观测的生存概率估计
- **不适用**：有竞争事件需累计发生率，不能把竞争风险当普通删失
- **别名**：KM曲线
- **表达目的**：change
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：time/event/group；事件编码；删失定义；时间单位；置信方法
- **关键元素**：时间轴；阶梯生存率；删失记号；组别；风险集说明
- **编码规则**：风险集逐时复算；删失不能当事件；不能从曲线编造风险比或P值
- **常见变体**：分组生存曲线 (kaplan_meier.v1)
- **容易混淆**：经验累积分布图 (ecdf)；累计发生率曲线 (cumulative_incidence)
- **生成要求**：风险集逐时复算；删失不能当事件；不能从曲线编造风险比或P值；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：风险集逐时复算；核对：删失不能当事件；核对：不能从曲线编造风险比或P值；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Cure rate estimation with insufficient follow-up: A median-based bootstrap correction approach](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0344669)，Fig 4。边界：本图无置信区间和在险人数表，新任务如需必须由原始数据计算；不得从曲线图反推个体数据或治愈率结论。

### 累计发生率曲线 · Cumulative incidence

稳定 ID：`cumulative_incidence`；完整路径：趋势与生存 / 累计发生率曲线。

- **定义**：在竞争事件存在时表达特定事件累计发生概率
- **适用**：在竞争事件存在时表达特定事件累计发生概率
- **不适用**：不能用 1−Kaplan–Meier 代替有竞争风险的累计发生率
- **别名**：CIF、竞争风险图
- **表达目的**：change
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：time/event/cause；事件种类；删失；估计方法
- **关键元素**：时间轴；分原因累计概率；竞争事件定义；方法说明
- **编码规则**：竞争事件不能当普通删失后直接取1减KM；每时点各原因累计概率和不超过1；原因编码与风险集可复算
- **常见变体**：多原因累计发生率 (cumulative_incidence.v1)
- **容易混淆**：生存曲线 (kaplan_meier)；经验累积分布图 (ecdf)
- **生成要求**：竞争事件不能当普通删失后直接取1减KM；每时点各原因累计概率和不超过1；原因编码与风险集可复算；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：竞争事件不能当普通删失后直接取1减KM；核对：每时点各原因累计概率和不超过1；核对：原因编码与风险集可复算；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [APOE-related risk of mild cognitive impairment and dementia for prevention trials: An analysis of four cohorts](https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1002254)，Fig 1 / all。边界：这是考虑死亡竞争风险的CIF，不是普通KM生存率或简单1-KM；部分分层并不独立。

## 关联与多变量

### 散点图 · Scatter plot

稳定 ID：`scatter`；完整路径：关联与多变量 / 散点图。

- **定义**：用两个数值坐标表达成对观测
- **适用**：用两个数值坐标表达成对观测
- **不适用**：无成对关系的数据不能配对为散点；无方法不画回归结论
- **别名**：散布图
- **表达目的**：associate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：x/y；观测ID；单位；分组
- **关键元素**：成对观测点；两条数值轴；单位；分组图例
- **编码规则**：每点对应真实观测；趋势拟合必须说明方法；相关不等于因果
- **常见变体**：分组散点 (scatter.v1)；回归叠加 (scatter.v2)；误差棒 (scatter.v3)
- **容易混淆**：类别点图 (dotplot)；排序投影图 (ordination)
- **生成要求**：每点对应真实观测；趋势拟合必须说明方法；相关不等于因果；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：每点对应真实观测；核对：趋势拟合必须说明方法；核对：相关不等于因果；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Trade-off between local transmission and long-range dispersal drives infectious disease outbreak size in spatially structured populations](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1008009)，Fig 3 / B–D。边界：空间单位是模拟km坐标，不是经纬度；不得复制感染结论。
- [Multi-objective Big Bang Big Crunch framework for reliable rice disease and variety classification with conditional calibration](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0340807)，Fig 7 / a,b,c、d,e,f。边界：图中的能耗代理、Pareto前沿和校准指标不是新任务实验结果；大小映射需额外明确，不能复制数值。
- [Trade-off between local transmission and long-range dispersal drives infectious disease outbreak size in spatially structured populations](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1008009)，Fig 6 / A。边界：A 是模拟坐标，不是地理地图；C 是论文中的荷兰农场空间分布，仅借鉴点位结构，投影和来源须按新任务重新提供。B、D 的分布来自模型模拟，不是观测疫情结论。
- [Bayesian inference of relative fitness on high-throughput pooled competition assays](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011937)，Fig 5 / A–C。边界：论文使用模拟场景，不能将曲线或拟合性能作为真实实验结论。

### 气泡散点图 · Bubble chart

稳定 ID：`bubble`；完整路径：关联与多变量 / 气泡散点图。

- **定义**：在散点上用面积编码第三个量
- **适用**：在散点上用面积编码第三个量
- **不适用**：半径直接与量成比例会改变面积含义
- **别名**：气泡图
- **表达目的**：associate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：x/y/size；单位；面积映射
- **关键元素**：数值坐标；点面积；颜色图例；大小图例；单位
- **编码规则**：面积而非半径与量成比例；size非负；提供大小图例
- **常见变体**：分组气泡 (bubble.v1)
- **容易混淆**：散点图 (scatter)；气泡矩阵 (bubble_matrix)
- **生成要求**：面积而非半径与量成比例；size非负；提供大小图例；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：面积而非半径与量成比例；核对：size非负；核对：提供大小图例；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [PPanGGOLiN: Depicting microbial diversity via a partitioned pangenome graph](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1007732)，Fig 5。边界：气泡 K 的含义、大小映射与误差条定义须保留；不得复制原物种结论。

### 数值热图 · Heatmap

稳定 ID：`heatmap`；完整路径：关联与多变量 / 数值热图。

- **定义**：用色彩编码行列组合的数值
- **适用**：用色彩编码行列组合的数值
- **不适用**：连接、二值存在和相关系数各有专门语义，应选择具体类型
- **别名**：热力矩阵
- **表达目的**：associate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：row/column/value；单位；缺失值；变换
- **关键元素**：行列标签；数值格；色标；缺失色；变换说明
- **编码规则**：顺序色或有依据中心的发散色；缺失与零不同；聚类方法声明
- **常见变体**：聚类热图 (heatmap.v1)；环形热图 (heatmap.v2)
- **容易混淆**：相关矩阵图 (correlation_matrix)；邻接矩阵图 (adjacency_matrix)
- **生成要求**：顺序色或有依据中心的发散色；缺失与零不同；聚类方法声明；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：顺序色或有依据中心的发散色；核对：缺失与零不同；核对：聚类方法声明；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 3 / B。边界：UMAP不是PCA；F带宽代表相互作用强度，不代表守恒物质流。
- [Trade-off between local transmission and long-range dispersal drives infectious disease outbreak size in spatially structured populations](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1008009)，Fig 3 / E–G。边界：空间单位是模拟km坐标，不是经纬度；不得复制感染结论。
- [Trade-off between local transmission and long-range dispersal drives infectious disease outbreak size in spatially structured populations](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1008009)，Fig 4 / 全部。边界：颜色是插值后的模拟场，不是等值线或实际地理底图。
- [ROTS: An R package for reproducibility-optimized statistical testing](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005562)，Fig 1 / F。边界：火山纵轴P值不同于MA纵轴效应；红色显著性与PCA坐标必须来自新任务分析。

### 气泡矩阵 · Bubble matrix

稳定 ID：`bubble_matrix`；完整路径：关联与多变量 / 气泡矩阵。

- **定义**：在离散行列上以面积和可选颜色编码数值
- **适用**：在离散行列上以面积和可选颜色编码数值
- **不适用**：连续坐标气泡图不是离散矩阵
- **别名**：点阵图
- **表达目的**：associate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：row/column/value；面积和颜色变量定义
- **关键元素**：离散行列；面积点；颜色与大小图例；缺失说明
- **编码规则**：面积编码非负；颜色若编码不同变量须单独图例；零与缺失可区分
- **常见变体**：双变量矩阵 (bubble_matrix.v1)
- **容易混淆**：数值热图 (heatmap)；气泡散点图 (bubble)
- **生成要求**：面积编码非负；颜色若编码不同变量须单独图例；零与缺失可区分；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：面积编码非负；核对：颜色若编码不同变量须单独图例；核对：零与缺失可区分；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 3 / C。边界：UMAP不是PCA；F带宽代表相互作用强度，不代表守恒物质流。
- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 4 / B。边界：A是组织空间图，不是经纬度地图；D是关系弦图，不是基因组Circos。

### 二值存在矩阵 · Binary matrix

稳定 ID：`binary_matrix`；完整路径：关联与多变量 / 二值存在矩阵。

- **定义**：表达样本与特征的存在或缺失
- **适用**：表达样本与特征的存在或缺失
- **不适用**：强度和连续量不能无阈值变成二值
- **别名**：Presence absence、圆点二值图、方格二值图
- **表达目的**：associate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：row/column/value为0或1；检测阈值；缺测定义
- **关键元素**：行列标签；存在缺失编码；未检测标记；阈值
- **编码规则**：二值存在不是连接强度；零与未测分开；点或方格只是图元变体
- **常见变体**：圆点图元 (binary_matrix.v1)；方格图元 (binary_matrix.v2)
- **容易混淆**：邻接矩阵图 (adjacency_matrix)；数值热图 (heatmap)
- **生成要求**：二值存在不是连接强度；零与未测分开；点或方格只是图元变体；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：二值存在不是连接强度；核对：零与未测分开；核对：点或方格只是图元变体；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [PPanGGOLiN: Depicting microbial diversity via a partitioned pangenome graph](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1007732)，Fig 1 / presence/absence matrix。边界：矩阵行是基因家族、列是基因组；0/1 表达存在缺失，不能当节点邻接。

### 相关矩阵图 · Correlogram

稳定 ID：`correlation_matrix`；完整路径：关联与多变量 / 相关矩阵图。

- **定义**：表达变量之间的相关系数
- **适用**：表达变量之间的相关系数
- **不适用**：一般矩阵不能强制相关范围或对称；相关不等于因果
- **别名**：相关性热图
- **表达目的**：associate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：row/column/value；相关方法；样本量；缺失处理；多重检验
- **关键元素**：变量行列；系数格；发散色标；方法与缺失处理
- **编码规则**：系数在[-1,1]；对称性与对角线按定义；星号须有检验和校正依据
- **常见变体**：组内相关 (correlation_matrix.v1)；组间相关 (correlation_matrix.v2)
- **容易混淆**：数值热图 (heatmap)；因果有向无环图 (causal_dag)
- **生成要求**：系数在[-1,1]；对称性与对角线按定义；星号须有检验和校正依据；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：系数在[-1,1]；核对：对称性与对角线按定义；核对：星号须有检验和校正依据；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Mutational signature dynamics indicate SARS-CoV-2’s evolutionary capacity is driven by host antiviral molecules](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011795)，Fig 2 / A。边界：Pearson 系数不是因果关系，拟合曲线不代表预测验证；原病例数不可借用。
- [Differences in soil carbon fractions and microbial communities and their underlying mechanisms between assisted natural regeneration and plantation forests in subtropical China](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0339350)，Fig 3 / matrix。边界：两套分析的样本、距离矩阵与检验方法须独立明确；相关与显著性不能视为因果。
- [Comparison of journal and top publisher self-citation rates in COVID-19 research](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0314976)，Fig 2。边界：同色不表示显著性；自引指标关联不能自动推导评价或伦理结论。

### 平行坐标图 · Parallel coordinates

稳定 ID：`parallel_coordinates`；完整路径：关联与多变量 / 平行坐标图。

- **定义**：连接同一观测的多维数值
- **适用**：连接同一观测的多维数值
- **不适用**：每条线不能拼接不同观测；轴方向改变必须明示
- **别名**：无
- **表达目的**：associate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：观测ID；变量矩阵；单位；每轴缩放
- **关键元素**：平行数轴；各轴尺度；同一观测折线；变量顺序
- **编码规则**：每条折线对应同一观测；各轴刻度和方向显示；缩放不冒充同单位
- **常见变体**：标准化平行坐标 (parallel_coordinates.v1)
- **容易混淆**：雷达图 (radar)；折线图 (line)
- **生成要求**：每条折线对应同一观测；各轴刻度和方向显示；缩放不冒充同单位；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：每条折线对应同一观测；核对：各轴刻度和方向显示；核对：缩放不冒充同单位；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [COVID-19 pandemic and stability of stock market—A sectoral approach](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0250938)，Fig 6。边界：轴值经标准化，不能把不同轴上的距离当成相同物理量或因果路径。
- [Directed closure coefficient and its patterns](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0253822)，Fig 9。边界：必须说明各特征归一化方式；线交叉不是网络中的连接边。

### 排序投影图 · Ordination

稳定 ID：`ordination`；完整路径：关联与多变量 / 排序投影图。

- **定义**：表达经声明分析方法得到的低维坐标
- **适用**：表达经声明分析方法得到的低维坐标
- **不适用**：不能把 PCA、PCoA、NMDS、UMAP 当作可互换的画面变体
- **别名**：PCA、PCoA、NMDS、CCA、RDA、UMAP、t-SNE
- **表达目的**：associate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：原始矩阵或已计算坐标x/y；method；预处理；距离/载荷/解释率或stress来源
- **关键元素**：已计算坐标点；方法名称；有效轴语义；分析元数据
- **编码规则**：方法不是可交换外观；PCA解释率不得用于NMDS/UMAP；坐标和载荷使用正确标度
- **常见变体**：双标图 (ordination.v1)；样本投影 (ordination.v2)
- **容易混淆**：散点图 (scatter)；系统发育树图 (phylogenetic)
- **生成要求**：方法不是可交换外观；PCA解释率不得用于NMDS/UMAP；坐标和载荷使用正确标度；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：方法不是可交换外观；核对：PCA解释率不得用于NMDS/UMAP；核对：坐标和载荷使用正确标度；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 3 / A。边界：UMAP不是PCA；F带宽代表相互作用强度，不代表守恒物质流。
- [Passion fruit plants alter the soil microbial community with continuous cropping and improve plant disease resistance by recruiting beneficial microorganisms](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0281854)，Fig 5。边界：不能把此PCoA布局当作已验证的PCA/NMDS计算结果。
- [Assessing generalizability of an AI-based visual test for cervical cancer screening](https://journals.plos.org/digitalhealth/article?id=10.1371/journal.pdig.0000364)，Fig 1。边界：UMAP投影的簇间距离不直接等于原空间距离，不能添加解释率。
- [ROTS: An R package for reproducibility-optimized statistical testing](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005562)，Fig 1 / E。边界：火山纵轴P值不同于MA纵轴效应；红色显著性与PCA坐标必须来自新任务分析。

### 层次聚类树状图 · Dendrogram

稳定 ID：`dendrogram`；完整路径：关联与多变量 / 层次聚类树状图。

- **定义**：表达明确距离与连接准则得到的层次聚类
- **适用**：表达明确距离与连接准则得到的层次聚类
- **不适用**：枝高不是进化时间，拓扑需要实际聚类结果
- **别名**：聚类树
- **表达目的**：associate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：原始矩阵或linkage结果；距离度量；连接准则；预处理
- **关键元素**：叶对象；层次合并节点；距离高度轴；连接准则
- **编码规则**：分叉高度对应聚合距离而非进化时间；叶序可变但拓扑不能变；截断阈值必须有依据
- **常见变体**：热图附属聚类树 (dendrogram.v1)
- **容易混淆**：系统发育树图 (phylogenetic)；层级树图 (hierarchy)
- **生成要求**：分叉高度对应聚合距离而非进化时间；叶序可变但拓扑不能变；截断阈值必须有依据；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：分叉高度对应聚合距离而非进化时间；核对：叶序可变但拓扑不能变；核对：截断阈值必须有依据；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [Passion fruit plants alter the soil microbial community with continuous cropping and improve plant disease resistance by recruiting beneficial microorganisms](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0281854)，Fig 6 / 左侧。边界：这是相似性聚类树，不是系统发育树；不能推断进化关系。
- [ROTS: An R package for reproducibility-optimized statistical testing](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005562)，Fig 1 / F dendrogram。边界：火山纵轴P值不同于MA纵轴效应；红色显著性与PCA坐标必须来自新任务分析。

## 组成与层级数量

### 饼图 · Pie chart

稳定 ID：`pie`；完整路径：组成与层级数量 / 饼图。

- **定义**：显示互斥部分占同一整体的比例
- **适用**：显示互斥部分占同一整体的比例
- **不适用**：非互斥类别、负量或不同分母不能拼同一饼
- **别名**：Donut、环图
- **表达目的**：part_to_whole
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：label/value；非负值；总体定义
- **关键元素**：扇区；整体定义；类别标签；数量或比例
- **编码规则**：总量大于0；类别互斥且口径一致；环孔为布局参数不是新图型
- **常见变体**：环形 (pie.v1)
- **容易混淆**：柱形图 (bar)；矩形树图 (treemap)
- **生成要求**：总量大于0；类别互斥且口径一致；环孔为布局参数不是新图型；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：总量大于0；核对：类别互斥且口径一致；核对：环孔为布局参数不是新图型；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Identification of a novel AP2 transcription factor in zygotes with an essential role in Plasmodium ookinete development](https://journals.plos.org/plospathogens/article?id=10.1371/journal.ppat.1010510)，Fig 4 / C。边界：E 的字母高度是 bits，不是任意字形大小；C 是互斥峰区域的组成。F 虽在图注称 histogram，画面实际以折线连接频数，不能作为柱形直方图模板；不迁移原论文结合基序或因果结论。

### 矩形树图 · Treemap

稳定 ID：`treemap`；完整路径：组成与层级数量 / 矩形树图。

- **定义**：用嵌套矩形面积表达层级数量
- **适用**：用嵌套矩形面积表达层级数量
- **不适用**：父子累计重复计数会虚增面积
- **别名**：面积树图
- **表达目的**：part_to_whole
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：节点label/parent/value；汇总口径
- **关键元素**：嵌套矩形；层级标签；面积图例；汇总口径
- **编码规则**：面积按量缩放；父子总量一致；不能混算父节点自有量和子树总量
- **常见变体**：嵌套矩形 (treemap.v1)
- **容易混淆**：层级树图 (hierarchy)；圆堆积层级图 (circle_packing)
- **生成要求**：面积按量缩放；父子总量一致；不能混算父节点自有量和子树总量；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：面积按量缩放；核对：父子总量一致；核对：不能混算父节点自有量和子树总量；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [How the medium shapes the message: Printing and the rise of the arts and sciences](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0205771)，Fig 3。边界：原传记样本的覆盖偏差不能当作总体人口职业分布；面积分母须一致。

### 圆堆积层级图 · Circle packing

稳定 ID：`circle_packing`；完整路径：组成与层级数量 / 圆堆积层级图。

- **定义**：用包含圆表示层级和叶节点大小
- **适用**：用包含圆表示层级和叶节点大小
- **不适用**：圆间留白与父圆整体不能直接比较精确总量
- **别名**：圆堆砌
- **表达目的**：part_to_whole
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：节点label/parent/value；叶节点计数
- **关键元素**：嵌套圆；叶标签；面积图例；层级边界
- **编码规则**：叶圆面积编码；圆间空隙不算数据；父圆面积不等于精确子项和
- **常见变体**：嵌套圆 (circle_packing.v1)
- **容易混淆**：矩形树图 (treemap)；韦恩集合图 (venn)
- **生成要求**：叶圆面积编码；圆间空隙不算数据；父圆面积不等于精确子项和；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：叶圆面积编码；核对：圆间空隙不算数据；核对：父圆面积不等于精确子项和；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [Passion fruit plants alter the soil microbial community with continuous cropping and improve plant disease resistance by recruiting beneficial microorganisms](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0281854)，Fig 2。边界：父圆含空隙，面积不可直接等同精确分类丰度和。

### 极坐标面积图 · Rose chart

稳定 ID：`rose`；完整路径：组成与层级数量 / 极坐标面积图。

- **定义**：以等角扇区面积表达周期或方向量
- **适用**：以等角扇区面积表达周期或方向量
- **不适用**：扇区面积与半径编码不能混用；不等角扇区需额外校正
- **别名**：玫瑰图、极区图
- **表达目的**：part_to_whole
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：label/value；角度区间；面积或半径编码声明
- **关键元素**：等角扇区；径向刻度；角度方向；面积说明
- **编码规则**：默认面积与value成比例即半径开方；方向0点和旋转方向明确
- **常见变体**：方向频率玫瑰 (rose.v1)
- **容易混淆**：饼图 (pie)；雷达图 (radar)
- **生成要求**：默认面积与value成比例即半径开方；方向0点和旋转方向明确；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：默认面积与value成比例即半径开方；核对：方向0点和旋转方向明确；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- 暂无通过本次许可与质量核验的案例；保持缺口，不以无关图补位。

### 冲积流转图 · Alluvial

稳定 ID：`alluvial`；完整路径：组成与层级数量 / 冲积流转图。

- **定义**：表达个体群组在离散阶段间的类别转换
- **适用**：表达个体群组在离散阶段间的类别转换
- **不适用**：只有边际分布没有对应路径时不能补造流向
- **别名**：平行集合
- **表达目的**：part_to_whole
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：个体ID或聚合路径；阶段；类别；value
- **关键元素**：阶段；类别层；个体群组带；流转量；缺失去向
- **编码规则**：同一队列路径连续；带宽与人数一致；失访或新增明确
- **常见变体**：队列流转 (alluvial.v1)
- **容易混淆**：桑基流量图 (sankey)；平行坐标图 (parallel_coordinates)
- **生成要求**：同一队列路径连续；带宽与人数一致；失访或新增明确；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：同一队列路径连续；核对：带宽与人数一致；核对：失访或新增明确；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [Comparison of HIV-1 A6 dispersal dynamics in Poland before and after the war in Ukraine](https://journals.plos.org/plospathogens/article?id=10.1371/journal.ppat.1013369)，Fig 1。边界：分类间的流向不是感染传播方向；不得迁移原群体数量和比例。
- [Insect diversity estimation in polarimetric lidar](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0312770)，Fig 5。边界：流带表示分组迁移，不是物质通量；分位阈值须依据新数据计算。

## 空间与场

### 地质剖面图 · Geological section

稳定 ID：`geological_section`；完整路径：空间与场 / 地质剖面图。

- **定义**：按明确剖面位置表达地层与构造关系
- **适用**：按明确剖面位置表达地层与构造关系
- **不适用**：无测井测绘依据不得补地层厚度，示意与实测接触分开
- **别名**：地层剖面
- **表达目的**：locate
- **学科标签**：地球科学
- **组合方式**：single
- **必要输入**：剖面路线；方向；测井或测绘来源；标高基准；水平垂直尺度；地层单位
- **关键元素**：剖面路线；地层单位；接触断层；标高；水平垂直比例
- **编码规则**：水平与垂直比例及夸大倍数明确；推断接触与实测资料区分；地层厚度不得凭空生成；图中标明剖面位置与观察方向、水平和垂直比例；若夸大则报告倍数。；地层接触实测段与推测延伸用不同线型；断层位移、年代顺序和井深对齐必须回到来源核对。
- **常见变体**：构造剖面 (geological_section.v1)；地层对比剖面 (geological_section.v2)
- **容易混淆**：实验装置图 (apparatus)；等值线图 (contour)
- **生成要求**：水平与垂直比例及夸大倍数明确；推断接触与实测资料区分；地层厚度不得凭空生成；图中标明剖面位置与观察方向、水平和垂直比例；若夸大则报告倍数。；地层接触实测段与推测延伸用不同线型；断层位移、年代顺序和井深对齐必须回到来源核对。；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：水平与垂直比例及夸大倍数明确；核对：推断接触与实测资料区分；核对：地层厚度不得凭空生成；核对：图中标明剖面位置与观察方向、水平和垂直比例；若夸大则报告倍数。；核对：地层接触实测段与推测延伸用不同线型；断层位移、年代顺序和井深对齐必须回到来源核对。；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Stratigraphic architecture of the Belly River Group (Campanian, Cretaceous) in the plains of southern Alberta: Revisions and updates to an existing model and implications for correlating dinosaur-rich strata](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0292318)，Fig 9。边界：原钻孔、标高、地层厚度和解释不能迁移。图1/2地图曾被审稿要求澄清许可，本案例只采用作者图9剖面，不含地图素材。

### 地理点位图 · Point map

稳定 ID：`point_map`；完整路径：空间与场 / 地理点位图。

- **定义**：表达真实地理坐标上的观测位置和量
- **适用**：表达真实地理坐标上的观测位置和量
- **不适用**：模拟笛卡尔点不能直接称地理采样地图
- **别名**：采样地图
- **表达目的**：locate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：经纬度x/y；坐标系；底图许可；单位
- **关键元素**：点位；投影与坐标说明；位置图例；可核验比例尺
- **编码规则**：经纬度范围和投影正确；比例尺依投影计算；不能编造采样点
- **常见变体**：比例符号地图 (point_map.v1)
- **容易混淆**：散点图 (scatter)；分区设色地图 (choropleth)
- **生成要求**：经纬度范围和投影正确；比例尺依投影计算；不能编造采样点；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：经纬度范围和投影正确；核对：比例尺依投影计算；核对：不能编造采样点；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [Trade-off between local transmission and long-range dispersal drives infectious disease outbreak size in spatially structured populations](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1008009)，Fig 6 / C。边界：A 是模拟坐标，不是地理地图；C 是论文中的荷兰农场空间分布，仅借鉴点位结构，投影和来源须按新任务重新提供。B、D 的分布来自模型模拟，不是观测疫情结论。
- [A machine learning-enabled open biodata resource inventory from the scientific literature](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0294812)，Fig 7 / A。边界：底图为 Natural Earth；国家汇总数量不是人均率，未显示地区不能直接视作零。

### 分区设色地图 · Choropleth

稳定 ID：`choropleth`；完整路径：空间与场 / 分区设色地图。

- **定义**：用地理区域填色表达区域统计
- **适用**：用地理区域填色表达区域统计
- **不适用**：总数与率不等价；无地域分母不宜声称发病率
- **别名**：专题地图
- **表达目的**：locate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：区域ID和边界；value；标准化分母；投影与许可
- **关键元素**：区域边界；区域统计；分级色标；缺失区域；投影
- **编码规则**：总数与率区别；分级阈值声明；缺失区域不填零
- **常见变体**：分位数分级 (choropleth.v1)
- **容易混淆**：地理点位图 (point_map)；数值热图 (heatmap)
- **生成要求**：总数与率区别；分级阈值声明；缺失区域不填零；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：总数与率区别；核对：分级阈值声明；核对：缺失区域不填零；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [A machine learning-enabled open biodata resource inventory from the scientific literature](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0294812)，Fig 7 / B。边界：底图为 Natural Earth；国家汇总数量不是人均率，未显示地区不能直接视作零。

### 等值线图 · Contour

稳定 ID：`contour`；完整路径：空间与场 / 等值线图。

- **定义**：表达标量场相等值的空间轨迹
- **适用**：表达标量场相等值的空间轨迹
- **不适用**：稀疏点不能未经说明插值出精细结构
- **别名**：等高线
- **表达目的**：locate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：规则网格x/y/value或采样坐标；插值法；单位
- **关键元素**：等值轨迹；等值标签；坐标轴；色标；采样覆盖
- **编码规则**：等值线值准确；插值与外推区域标注；不由少数点伪造细结构
- **常见变体**：填色等值面 (contour.v1)
- **容易混淆**：数值热图 (heatmap)；矢量场图 (vector_field)
- **生成要求**：等值线值准确；插值与外推区域标注；不由少数点伪造细结构；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：等值线值准确；核对：插值与外推区域标注；核对：不由少数点伪造细结构；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Predicting the accumulation of storage compounds by Rhodococcus jostii RHA1 in the feast-famine growth cycles using genome-scale flux balance analysis](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0191835)，Fig 2。边界：来自通量模型的计算场；同值线不是轨迹，不能把模拟结果移作实验数据。

### 矢量场图 · Vector field

稳定 ID：`vector_field`；完整路径：空间与场 / 矢量场图。

- **定义**：表达位置上向量方向和大小
- **适用**：表达位置上向量方向和大小
- **不适用**：只有位置点不能补速度或流向
- **别名**：Quiver、流线图
- **表达目的**：locate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：x/y/u/v；单位；坐标基；归一化
- **关键元素**：位置坐标；向量箭头；方向与量级标尺；单位
- **编码规则**：箭头缩放明示；流线计算需场定义；无速度数据不能补流速
- **常见变体**：流线 (vector_field.v1)；箭矢 (vector_field.v2)
- **容易混淆**：等值线图 (contour)；节点连接网络图 (network)
- **生成要求**：箭头缩放明示；流线计算需场定义；无速度数据不能补流速；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：箭头缩放明示；核对：流线计算需场定义；核对：无速度数据不能补流速；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Model-based Traction Force Microscopy Reveals Differential Tension in Cellular Actin Bundles](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1004076)，Fig 1 / B displacement、C。边界：位移与牵引使用不同量纲；正则化参数和噪声会改变箭头场，不可仅凭视觉断言真值。

## 生物序列与组学

### 火山图 · Volcano plot

稳定 ID：`volcano`；完整路径：生物序列与组学 / 火山图。

- **定义**：联合表达效应大小与统计证据
- **适用**：联合表达效应大小与统计证据
- **不适用**：原始P与FDR不同；P为零不能暗改检测下限
- **别名**：差异表达图
- **表达目的**：biological_annotation
- **学科标签**：生命科学
- **组合方式**：single
- **必要输入**：label/effect/p；效应尺度；原始或调整P值；阈值；检验方法
- **关键元素**：效应轴；负log10P轴；观测点；检验口径；阈值声明
- **编码规则**：横轴通常log2效应纵轴负log10P；P=0处理明确；不得把原始P当FDR
- **常见变体**：调整P值火山 (volcano.v1)
- **容易混淆**：MA 图 (ma_plot)；散点图 (scatter)
- **生成要求**：横轴通常log2效应纵轴负log10P；P=0处理明确；不得把原始P当FDR；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：横轴通常log2效应纵轴负log10P；核对：P=0处理明确；核对：不得把原始P当FDR；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [ROTS: An R package for reproducibility-optimized statistical testing](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005562)，Fig 1 / A。边界：火山纵轴P值不同于MA纵轴效应；红色显著性与PCA坐标必须来自新任务分析。

### MA 图 · MA plot

稳定 ID：`ma_plot`；完整路径：生物序列与组学 / MA 图。

- **定义**：联合表达平均丰度与对数差异
- **适用**：联合表达平均丰度与对数差异
- **不适用**：MA 的横轴不是P值，不能与火山图互换
- **别名**：Bland–Altman expression
- **表达目的**：biological_annotation
- **学科标签**：生命科学
- **组合方式**：single
- **必要输入**：label/mean/effect；归一化；对数底数
- **关键元素**：平均丰度轴；对数差异轴；观测点；归一化说明
- **编码规则**：平均丰度与差异不能交换；低丰度偏差可见；显著性需独立证据
- **常见变体**：RNA表达MA (ma_plot.v1)
- **容易混淆**：火山图 (volcano)；Bland–Altman 一致性图 (bland_altman)
- **生成要求**：平均丰度与差异不能交换；低丰度偏差可见；显著性需独立证据；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：平均丰度与差异不能交换；核对：低丰度偏差可见；核对：显著性需独立证据；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [ROTS: An R package for reproducibility-optimized statistical testing](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005562)，Fig 1 / B。边界：火山纵轴P值不同于MA纵轴效应；红色显著性与PCA坐标必须来自新任务分析。

### 富集结果图 · Enrichment plot

稳定 ID：`enrichment`；完整路径：生物序列与组学 / 富集结果图。

- **定义**：展示有明确定义背景的富集分析结果
- **适用**：展示有明确定义背景的富集分析结果
- **不适用**：没有基因背景与检验输出不能造富集结果
- **别名**：GO、KEGG、富集气泡图
- **表达目的**：biological_annotation
- **学科标签**：生命科学
- **组合方式**：single
- **必要输入**：term/count/background/p；分析方法；基因集和校正；比值口径
- **关键元素**：条目标签；富集量；背景与分母；校正P图例
- **编码规则**：背景集真实；富集比和gene ratio区分；不能从条长猜显著性
- **常见变体**：气泡 (enrichment.v1)；条形 (enrichment.v2)；圈形 (enrichment.v3)
- **容易混淆**：柱形图 (bar)；气泡矩阵 (bubble_matrix)
- **生成要求**：背景集真实；富集比和gene ratio区分；不能从条长猜显著性；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：背景集真实；核对：富集比和gene ratio区分；核对：不能从条长猜显著性；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 3 / D。边界：UMAP不是PCA；F带宽代表相互作用强度，不代表守恒物质流。

### 基因坐标轨道图 · Gene track

稳定 ID：`gene_track`；完整路径：生物序列与组学 / 基因坐标轨道图。

- **定义**：在基因组坐标上表达基因外显子与方向
- **适用**：在基因组坐标上表达基因外显子与方向
- **不适用**：蛋白氨基酸坐标不能混作核苷酸坐标
- **别名**：基因簇排列、基因结构
- **表达目的**：biological_annotation
- **学科标签**：生命科学
- **组合方式**：single
- **必要输入**：label/start/end/strand；染色体；组装版本；坐标闭开规则
- **关键元素**：序列坐标；基因区段；链方向；组装版本；省略标记
- **编码规则**：坐标范围一致；链方向箭头正确；断轴或省略区间明示
- **常见变体**：基因簇 (gene_track.v1)；外显子内含子 (gene_track.v2)
- **容易混淆**：基因组共线性图 (synteny)；蛋白结构域图 (protein_domain)
- **生成要求**：坐标范围一致；链方向箭头正确；断轴或省略区间明示；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：坐标范围一致；核对：链方向箭头正确；核对：断轴或省略区间明示；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [Long transposon-rich centromeres in an oomycete reveal divergence of centromere features in Stramenopila-Alveolata-Rhizaria lineages](https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1008646)，Fig 2。边界：组装版本、尺度、信号阈值必须与新输入一致。
- [Identification of a novel AP2 transcription factor in zygotes with an essential role in Plasmodium ookinete development](https://journals.plos.org/plospathogens/article?id=10.1371/journal.ppat.1010510)，Fig 4 / A。边界：E 的字母高度是 bits，不是任意字形大小；C 是互斥峰区域的组成。F 虽在图注称 histogram，画面实际以折线连接频数，不能作为柱形直方图模板；不迁移原论文结合基序或因果结论。

### 蛋白结构域图 · Protein domains

稳定 ID：`protein_domain`；完整路径：生物序列与组学 / 蛋白结构域图。

- **定义**：沿蛋白序列坐标标注结构域与位点
- **适用**：沿蛋白序列坐标标注结构域与位点
- **不适用**：没有结构域注释依据不能根据蛋白名猜域
- **别名**：保守结构域
- **表达目的**：biological_annotation
- **学科标签**：生命科学
- **组合方式**：single
- **必要输入**：蛋白ID长度；start/end；域名；数据库版本和阈值
- **关键元素**：蛋白长度轴；域区间；位点；证据等级；版本
- **编码规则**：氨基酸坐标不当核苷酸；重叠域保留；预测与实验证据区分
- **常见变体**：基序位置轨道 (protein_domain.v1)
- **容易混淆**：基因坐标轨道图 (gene_track)；序列标识图 (motif_logo)
- **生成要求**：氨基酸坐标不当核苷酸；重叠域保留；预测与实验证据区分；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：氨基酸坐标不当核苷酸；核对：重叠域保留；核对：预测与实验证据区分；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [Examination of yield, bacteriolytic activity and cold storage of linker deletion mutants based on endolysin S6_ORF93 derived from Staphylococcus giant bacteriophage S6](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0310962)，Fig 1 / A、C。边界：结构预测不是实验解析结构；氨基酸坐标不能当核苷酸坐标。

### 序列标识图 · Sequence logo

稳定 ID：`motif_logo`；完整路径：生物序列与组学 / 序列标识图。

- **定义**：以字母堆叠表达序列位点频率或信息量
- **适用**：以字母堆叠表达序列位点频率或信息量
- **不适用**：基序文字表格不是序列 logo；字母高度必须由频率计算
- **别名**：Motif logo、序列徽标
- **表达目的**：biological_annotation
- **学科标签**：生命科学
- **组合方式**：single
- **必要输入**：对齐序列或position/symbol/value；字母表；频率或bits定义；校正
- **关键元素**：位点轴；字母堆叠；频率或bits纵轴；字母表
- **编码规则**：字母高度和总信息量由频率计算；不能从位置条形伪造保守性
- **常见变体**：概率标识 (motif_logo.v1)；信息量标识 (motif_logo.v2)
- **容易混淆**：蛋白结构域图 (protein_domain)；柱形图 (bar)
- **生成要求**：字母高度和总信息量由频率计算；不能从位置条形伪造保守性；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：字母高度和总信息量由频率计算；核对：不能从位置条形伪造保守性；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [Identification of a novel AP2 transcription factor in zygotes with an essential role in Plasmodium ookinete development](https://journals.plos.org/plospathogens/article?id=10.1371/journal.ppat.1010510)，Fig 4 / E。边界：E 的字母高度是 bits，不是任意字形大小；C 是互斥峰区域的组成。F 虽在图注称 histogram，画面实际以折线连接频数，不能作为柱形直方图模板；不迁移原论文结合基序或因果结论。

### 基因组环形轨道图 · Genomic Circos

稳定 ID：`genome_circos`；完整路径：生物序列与组学 / 基因组环形轨道图。

- **定义**：在有真实序列尺度的圆周整合轨道和连接
- **适用**：在有真实序列尺度的圆周整合轨道和连接
- **不适用**：只有圆形关系网络时不具有基因组环轨语义
- **别名**：基因组圈图
- **表达目的**：biological_annotation
- **学科标签**：生命科学
- **组合方式**：single
- **必要输入**：序列长度；轨道坐标和值；连接端点；组装版本
- **关键元素**：序列长度圆周；坐标刻度；定量轨道；连接端点；独立图例
- **编码规则**：圆弧按序列长度；多轨尺度独立标注；连接不能越界
- **常见变体**：多组学环轨 (genome_circos.v1)
- **容易混淆**：弦图 (chord)；基因坐标轨道图 (gene_track)
- **生成要求**：圆弧按序列长度；多轨尺度独立标注；连接不能越界；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：圆弧按序列长度；核对：多轨尺度独立标注；核对：连接不能越界；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [Long transposon-rich centromeres in an oomycete reveal divergence of centromere features in Stramenopila-Alveolata-Rhizaria lineages](https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1008646)，Fig 3。边界：圆形外观不等于普通弦图；每轨单位与序列长度独立核对。

### 基因组共线性图 · Synteny

稳定 ID：`synteny`；完整路径：生物序列与组学 / 基因组共线性图。

- **定义**：表达基因组区段间有证据的同源对应
- **适用**：表达基因组区段间有证据的同源对应
- **不适用**：没有序列比对来源不能凭相似颜色推同源
- **别名**：MCScanX、共线性
- **表达目的**：biological_annotation
- **学科标签**：生命科学
- **组合方式**：single
- **必要输入**：序列与坐标；同源块；方向；比对方法和阈值
- **关键元素**：序列坐标轨道；同源块连接；方向；组装与比对说明
- **编码规则**：对应带端点绑定坐标；倒位明确；不能只凭颜色推共同祖先
- **常见变体**：微共线性 (synteny.v1)；全基因组共线性 (synteny.v2)
- **容易混淆**：基因坐标轨道图 (gene_track)；弦图 (chord)
- **生成要求**：对应带端点绑定坐标；倒位明确；不能只凭颜色推共同祖先；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：对应带端点绑定坐标；核对：倒位明确；核对：不能只凭颜色推共同祖先；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [Monkeyflower (Mimulus) uncovers the evolutionary basis of the eukaryote telomere sequence variation](https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1011738)，Fig 9。边界：物种、染色体和同源关系来自该研究，不能靠图形相似猜同源。

### 系统发育树图 · Phylogenetic tree

稳定 ID：`phylogenetic`；完整路径：生物序列与组学 / 系统发育树图。

- **定义**：表达有来源的进化拓扑、枝长和支持度
- **适用**：表达有来源的进化拓扑、枝长和支持度
- **不适用**：聚类树不能仅因外观相似改名进化树
- **别名**：进化树、Newick
- **表达目的**：biological_annotation
- **学科标签**：生命科学
- **组合方式**：single
- **必要输入**：Newick或边表；枝长含义；支持度算法；根的依据
- **关键元素**：树拓扑；根；枝长尺度；支持度；分类标签
- **编码规则**：根与无根含义不同；枝长单位明确；支持度不是概率除非方法允许
- **常见变体**：有根树 (phylogenetic.v1)；无根树 (phylogenetic.v2)；性状注释 (phylogenetic.v3)
- **容易混淆**：层级树图 (hierarchy)；节点连接网络图 (network)
- **生成要求**：根与无根含义不同；枝长单位明确；支持度不是概率除非方法允许；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：根与无根含义不同；核对：枝长单位明确；核对：支持度不是概率除非方法允许；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [Long transposon-rich centromeres in an oomycete reveal divergence of centromere features in Stramenopila-Alveolata-Rhizaria lineages](https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1008646)，Fig 6。边界：布局只是变体；中点定根和外群定根有不同科学前提。

## 模型与证据评价

### ROC 曲线 · Receiver operating characteristic

稳定 ID：`roc`；完整路径：模型与证据评价 / ROC 曲线。

- **定义**：比较阈值变化下真阳性与假阳性率
- **适用**：比较阈值变化下真阳性与假阳性率
- **不适用**：类别极不平衡时应同时考虑PR；AUC不能从图形猜测
- **别名**：受试者工作特征
- **表达目的**：evaluate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：真实标签和score，或已验证fpr/tpr点；正类定义；验证集
- **关键元素**：FPR横轴；TPR纵轴；曲线；随机基线；验证集说明
- **编码规则**：阈值由同一验证集计算；AUC不能凭图估算；对角线为随机基准
- **常见变体**：多模型ROC (roc.v1)
- **容易混淆**：精确率召回率曲线 (pr_curve)；折线图 (line)
- **生成要求**：阈值由同一验证集计算；AUC不能凭图估算；对角线为随机基准；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：阈值由同一验证集计算；核对：AUC不能凭图估算；核对：对角线为随机基准；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 5 / D。边界：不能从原图抄取AUC或交集数量；复杂韦恩只作多集合方法边界案例。
- [Assessing generalizability of an AI-based visual test for cervical cancer screening](https://journals.plos.org/digitalhealth/article?id=10.1371/journal.pdig.0000364)，Fig 3 / a。边界：分类性能、混淆计数和一致性是不同问题，不互相代替。
- [Multi-objective Big Bang Big Crunch framework for reliable rice disease and variety classification with conditional calibration](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0340807)，Fig 5 / a,c。边界：这些分数只属于原验证集；不能把ROC随机线搬到PR作为同一基线。

### 精确率召回率曲线 · Precision–Recall

稳定 ID：`pr_curve`；完整路径：模型与证据评价 / 精确率召回率曲线。

- **定义**：比较阈值下精确率和召回率
- **适用**：比较阈值下精确率和召回率
- **不适用**：AP和梯形积分AUC不相同；缺少正类比例不画假基线
- **别名**：PR curve
- **表达目的**：evaluate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：真实标签和score或precision/recall；正类比例；验证集
- **关键元素**：召回率轴；精确率轴；曲线；正类比例基线；方法说明
- **编码规则**：基线随正类比例；AP与梯形AUC不同；数据泄漏必须披露
- **常见变体**：多模型PR (pr_curve.v1)
- **容易混淆**：ROC 曲线 (roc)；折线图 (line)
- **生成要求**：基线随正类比例；AP与梯形AUC不同；数据泄漏必须披露；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：基线随正类比例；核对：AP与梯形AUC不同；核对：数据泄漏必须披露；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Multi-objective Big Bang Big Crunch framework for reliable rice disease and variety classification with conditional calibration](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0340807)，Fig 5 / b,d。边界：这些分数只属于原验证集；不能把ROC随机线搬到PR作为同一基线。

### 混淆矩阵 · Confusion matrix

稳定 ID：`confusion_matrix`；完整路径：模型与证据评价 / 混淆矩阵。

- **定义**：表达真实类别与预测类别交叉计数
- **适用**：表达真实类别与预测类别交叉计数
- **不适用**：只有准确率无法重建混淆计数
- **别名**：无
- **表达目的**：evaluate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：row真实类别/column预测类别/value计数；类别顺序；归一化方法
- **关键元素**：真实行；预测列；格计数；类别顺序；归一化说明
- **编码规则**：行列方向明确；总数与样本量一致；归一化分母明示
- **常见变体**：行归一化 (confusion_matrix.v1)；原始计数 (confusion_matrix.v2)
- **容易混淆**：数值热图 (heatmap)；邻接矩阵图 (adjacency_matrix)
- **生成要求**：行列方向明确；总数与样本量一致；归一化分母明示；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：行列方向明确；核对：总数与样本量一致；核对：归一化分母明示；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Assessing generalizability of an AI-based visual test for cervical cancer screening](https://journals.plos.org/digitalhealth/article?id=10.1371/journal.pdig.0000364)，Fig 3 / b。边界：分类性能、混淆计数和一致性是不同问题，不互相代替。

### 校准曲线 · Calibration plot

稳定 ID：`calibration`；完整路径：模型与证据评价 / 校准曲线。

- **定义**：比较预测概率和实际事件比例
- **适用**：比较预测概率和实际事件比例
- **不适用**：分类区分能力ROC不能替代概率校准
- **别名**：可靠性图
- **表达目的**：evaluate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：逐样本概率与标签或bin/predicted/observed/count；分箱
- **关键元素**：预测概率轴；观测比例轴；分箱点；y=x线；分箱样本量
- **编码规则**：分箱样本量与边界可追溯；y=x参考线；区间不能凭空添加
- **常见变体**：分位数分箱 (calibration.v1)
- **容易混淆**：ROC 曲线 (roc)；散点图 (scatter)
- **生成要求**：分箱样本量与边界可追溯；y=x参考线；区间不能凭空添加；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：分箱样本量与边界可追溯；核对：y=x参考线；核对：区间不能凭空添加；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Machine learning models in electronic health records can outperform conventional survival models for predicting patient mortality in coronary artery disease](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0202344)，Fig 2 / A、B。边界：图中采用平滑校准，不等于本版基础分箱连线；新图须给出平滑方法或分箱数据并补全纵轴概率刻度。阴影和病例分布不能迁移。

### Bland–Altman 一致性图 · Bland–Altman

稳定 ID：`bland_altman`；完整路径：模型与证据评价 / Bland–Altman 一致性图。

- **定义**：评估两种测量方法差异及一致性界限
- **适用**：评估两种测量方法差异及一致性界限
- **不适用**：独立样本或只给相关系数不能做方法一致性图
- **别名**：均值差值图
- **表达目的**：evaluate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：逐对象配对测量；单位；差值方向；界限算法
- **关键元素**：配对均值；方法差；偏倚线；一致性界限；单位
- **编码规则**：偏倚与一致性界限真实计算；不能用相关系数代替一致性
- **常见变体**：比例差值 (bland_altman.v1)
- **容易混淆**：MA 图 (ma_plot)；散点图 (scatter)
- **生成要求**：偏倚与一致性界限真实计算；不能用相关系数代替一致性；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：偏倚与一致性界限真实计算；核对：不能用相关系数代替一致性；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Assessing generalizability of an AI-based visual test for cervical cancer screening](https://journals.plos.org/digitalhealth/article?id=10.1371/journal.pdig.0000364)，Fig 3 / c。边界：分类性能、混淆计数和一致性是不同问题，不互相代替。

### 荟萃漏斗图 · Funnel plot

稳定 ID：`funnel_meta`；完整路径：模型与证据评价 / 荟萃漏斗图。

- **定义**：展示研究效应与精度的关系
- **适用**：展示研究效应与精度的关系
- **不适用**：漏斗不对称不自动等于发表偏倚
- **别名**：Meta-analysis funnel
- **表达目的**：evaluate
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：各研究effect/se；效应尺度；固定或随机效应方法
- **关键元素**：效应轴；标准误或精度轴；研究点；方法声明
- **编码规则**：纵轴精度方向明确；漏斗不对称不能直接定性发表偏倚；检验有方法来源
- **常见变体**：等高显著性漏斗 (funnel_meta.v1)
- **容易混淆**：森林图 (forest)；散点图 (scatter)
- **生成要求**：纵轴精度方向明确；漏斗不对称不能直接定性发表偏倚；检验有方法来源；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：纵轴精度方向明确；核对：漏斗不对称不能直接定性发表偏倚；核对：检验有方法来源；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：基础程序绘制：已用合成数据实跑

真实论文边界案例：

- [Magnitude of workplace violence and associated factors among healthcare professionals in East Africa: A systematic review and meta-analysis](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0332415)，Fig 3。边界：填补点不是新增真实研究；漏斗不对称不能单独证明发表偏倚。

## 组合表达

### 关联矩阵与网络叠合图 · Matrix and network overlay

稳定 ID：`matrix_link_overlay`；完整路径：组合表达 / 关联矩阵与网络叠合图。

- **定义**：将矩阵和连线叠合表达不同但有对应关系的统计结果
- **适用**：将矩阵和连线叠合表达不同但有对应关系的统计结果
- **不适用**：没有两套有来源结果时不应只模仿 Mantel 风格连线
- **别名**：Mantel关联图
- **表达目的**：compose
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：矩阵数值与行列实体；连线端点和统计量；两套计算方法；样本对应与显著性来源
- **关键元素**：矩阵格；叠合连接；两套独立统计图例；对应关系
- **编码规则**：矩阵格与连线必须各自说明统计含义；使用Mantel时声明距离和置换策略；边颜色显著性不能自行推定
- **常见变体**：关联矩阵叠合网络 (matrix_link_overlay.v1)
- **容易混淆**：相关矩阵图 (correlation_matrix)；多面板组合图 (multipanel)
- **生成要求**：矩阵格与连线必须各自说明统计含义；使用Mantel时声明距离和置换策略；边颜色显著性不能自行推定；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：矩阵格与连线必须各自说明统计含义；核对：使用Mantel时声明距离和置换策略；核对：边颜色显著性不能自行推定；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：候选：未开放绘制

真实论文边界案例：

- [Differences in soil carbon fractions and microbial communities and their underlying mechanisms between assisted natural regeneration and plantation forests in subtropical China](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0339350)，Fig 3。边界：两套分析的样本、距离矩阵与检验方法须独立明确；相关与显著性不能视为因果。

### 并列比较示意图 · Comparison schematic

稳定 ID：`comparison`；完整路径：组合表达 / 并列比较示意图。

- **定义**：在一致维度下比较对象或条件的结构差异
- **适用**：在一致维度下比较对象或条件的结构差异
- **不适用**：数值差异应使用定量图，不靠形状大小暗示优劣
- **别名**：方案对比
- **表达目的**：compose
- **学科标签**：跨学科
- **组合方式**：single
- **必要输入**：比较对象；共同维度；已知差异；相同项
- **关键元素**：对象分栏；共同维度；相同元素；明确差异；依据
- **编码规则**：相同元素用相同视觉语法；不同尺寸不能暗示未给数值；结论有依据
- **常见变体**：前后对照 (comparison.v1)；方法对照 (comparison.v2)
- **容易混淆**：柱形图 (bar)；多面板组合图 (multipanel)
- **生成要求**：相同元素用相同视觉语法；不同尺寸不能暗示未给数值；结论有依据；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：相同元素用相同视觉语法；核对：不同尺寸不能暗示未给数值；核对：结论有依据；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：生成模型路线：约束已接通，逐类型实图未验证

真实论文边界案例：

- [Beyond Bar and Line Graphs: Time for a New Data Presentation Paradigm](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.1002128)，Fig 1。边界：这是方法学示例，不代表本用户实验数据或P值。
- [Beyond Bar and Line Graphs: Time for a New Data Presentation Paradigm](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.1002128)，Fig 2。边界：B–D 是用斜线连接配对观测的点图，不是共享数值轴上的标准哑铃图。配对 ID、测试结果不可移植。
- [Automated visualization of rule-based models](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005857)，Fig 11。边界：SBGN PD、ER、Kappa和rxncon不可互相替代；F不标为SBGN AF。
- [Connectivity concepts in neuronal network modeling](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1010086)，Fig 7。边界：概率、连接规则和自连接语义不能从视觉简化推定。
- [Data analysis and modeling pipelines for controlled networked social science experiments](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0242453)，Fig 11。边界：配置文件、函数名及结果均属于原论文。
- [Quick tips for creating effective and impactful biological pathways using the Systems Biology Graphical Notation](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005740)，Fig 1。边界：PD 的过程、ER 的状态关系、AF 的活动影响不能互换；不沿用原模型实体或推断。
- [Quick tips for creating effective and impactful biological pathways using the Systems Biology Graphical Notation](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005740)，Fig 3。边界：节点克隆不代表新增物种，布局优化不等于原模型被科学验证。
- [Social Network Analysis As a Tool for Research Policy](https://journals.plos.org/plosntds/article?id=10.1371/journal.pntd.0004266)，Fig 1。边界：行列均为作者节点，不是样本与特征的存在缺失表；共著不代表科学影响力。

### 多面板组合图 · Multi-panel figure

稳定 ID：`multipanel`；完整路径：组合表达 / 多面板组合图。

- **定义**：以统一叙事组织多种不同子图
- **适用**：以统一叙事组织多种不同子图
- **不适用**：共享图例不能覆盖不同语义；没有子图输入不能补齐组合
- **别名**：组合图、拼图
- **表达目的**：compose
- **学科标签**：跨学科
- **组合方式**：panels
- **必要输入**：每面板类型和输入；面板标签；叙事关系；独立单位
- **关键元素**：面板标签；子图类型；各自坐标与单位；整体叙事
- **编码规则**：每面板执行自己的规范；共享图例只用于相同语义；保留完整上下文
- **常见变体**：示意加数据 (multipanel.v1)；跨尺度组合 (multipanel.v2)
- **容易混淆**：分面小多图 (small_multiples)；并列比较示意图 (comparison)
- **生成要求**：每面板执行自己的规范；共享图例只用于相同语义；保留完整上下文；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：每面板执行自己的规范；核对：共享图例只用于相同语义；核对：保留完整上下文；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：仅支持示意子图；含数据子图阻断

真实论文边界案例：

- [Integrating a tailored recurrent neural network with Bayesian experimental design to optimize microbial community functions](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011436)，Fig 3。边界：误差条是中位数与IQR，时间曲线带是标准差；不能混用为95%CI。
- [Integrating a tailored recurrent neural network with Bayesian experimental design to optimize microbial community functions](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011436)，Fig 4。边界：原论文资源、喂料策略和产量不是新任务的证据。
- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 3。边界：UMAP不是PCA；F带宽代表相互作用强度，不代表守恒物质流。
- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 4。边界：A是组织空间图，不是经纬度地图；D是关系弦图，不是基因组Circos。
- [scSDNE: A semi-supervised method for inferring cell-cell interactions based on graph embedding](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1013027)，Fig 5。边界：不能从原图抄取AUC或交集数量；复杂韦恩只作多集合方法边界案例。
- [Connectivity concepts in neuronal network modeling](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1010086)，Fig 10。边界：阈值隐藏连接有明示规则；新任务不能默认删掉低概率边。
- [Passion fruit plants alter the soil microbial community with continuous cropping and improve plant disease resistance by recruiting beneficial microorganisms](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0281854)，Fig 6。边界：这是相似性聚类树，不是系统发育树；不能推断进化关系。
- [Assessing generalizability of an AI-based visual test for cervical cancer screening](https://journals.plos.org/digitalhealth/article?id=10.1371/journal.pdig.0000364)，Fig 3。边界：分类性能、混淆计数和一致性是不同问题，不互相代替。
- [Trade-off between local transmission and long-range dispersal drives infectious disease outbreak size in spatially structured populations](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1008009)，Fig 3。边界：空间单位是模拟km坐标，不是经纬度；不得复制感染结论。
- [Masking noise reduces the anti-predator-like response to an acoustic stimulus: Application of Signal Detection Theory to fish behaviour](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0327092)，Fig 4。边界：时间重复测量不能误当独立样本；误差带是MAD，不能迁移为CI或复制其P值。
- [ROTS: An R package for reproducibility-optimized statistical testing](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005562)，Fig 1。边界：火山纵轴P值不同于MA纵轴效应；红色显著性与PCA坐标必须来自新任务分析。
- [Multi-objective Big Bang Big Crunch framework for reliable rice disease and variety classification with conditional calibration](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0340807)，Fig 5。边界：这些分数只属于原验证集；不能把ROC随机线搬到PR作为同一基线。
- [Multi-objective Big Bang Big Crunch framework for reliable rice disease and variety classification with conditional calibration](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0340807)，Fig 7。边界：图中的能耗代理、Pareto前沿和校准指标不是新任务实验结果；大小映射需额外明确，不能复制数值。
- [Simple and efficient estimation of photovoltaic cells and modules parameters using approximation and correction technique](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0216201)，Fig 1。边界：结构图为示意；I-V曲线及工作点有原论文模型依据，不能当其他器件实测。
- [Using ephaptic coupling to estimate the synaptic cleft resistivity of the calyx of Held synapse](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009527)，Fig 2。边界：突触间隙不按比例；电路是作者假设模型，并非真实电气接线。
- [Noise and neglect: Social-media signals expose attention gaps for dengue, chikungunya, lymphatic filariasis and kala-azar in India’s vector-borne NTDs](https://journals.plos.org/plosntds/article?id=10.1371/journal.pntd.0013378)，Fig 2。边界：原图省略极小类，不能推断完整总量；新任务必须明确省略条件和原始分母。
- [Identification of a novel AP2 transcription factor in zygotes with an essential role in Plasmodium ookinete development](https://journals.plos.org/plospathogens/article?id=10.1371/journal.ppat.1010510)，Fig 4。边界：E 的字母高度是 bits，不是任意字形大小；C 是互斥峰区域的组成。F 虽在图注称 histogram，画面实际以折线连接频数，不能作为柱形直方图模板；不迁移原论文结合基序或因果结论。
- [Trade-off between local transmission and long-range dispersal drives infectious disease outbreak size in spatially structured populations](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1008009)，Fig 6。边界：A 是模拟坐标，不是地理地图；C 是论文中的荷兰农场空间分布，仅借鉴点位结构，投影和来源须按新任务重新提供。B、D 的分布来自模型模拟，不是观测疫情结论。
- [Identification of periodic attractors in Boolean networks using a priori information](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009702)，Fig 1。边界：A节点是变量，B节点是整组布尔状态，C含反应节点，不能互相混用。D是表格，不能为了填补覆盖而标成二值矩阵图。
- [Mutational signature dynamics indicate SARS-CoV-2’s evolutionary capacity is driven by host antiviral molecules](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011795)，Fig 2。边界：Pearson 系数不是因果关系，拟合曲线不代表预测验证；原病例数不可借用。
- [Bayesian inference of relative fitness on high-throughput pooled competition assays](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011937)，Fig 5。边界：论文使用模拟场景，不能将曲线或拟合性能作为真实实验结论。
- [Model-based Traction Force Microscopy Reveals Differential Tension in Cellular Actin Bundles](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1004076)，Fig 1。边界：位移与牵引使用不同量纲；正则化参数和噪声会改变箭头场，不可仅凭视觉断言真值。
- [A machine learning-enabled open biodata resource inventory from the scientific literature](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0294812)，Fig 7。边界：底图为 Natural Earth；国家汇总数量不是人均率，未显示地区不能直接视作零。

### 分面小多图 · Small multiples

稳定 ID：`small_multiples`；完整路径：组合表达 / 分面小多图。

- **定义**：重复同一图型比较条件或分组
- **适用**：重复同一图型比较条件或分组
- **不适用**：不同图型的叙事组合应选多面板，不能伪称直接可比
- **别名**：Facet、分面图
- **表达目的**：compose
- **学科标签**：跨学科
- **组合方式**：panels
- **必要输入**：子图类型；分组数据；轴是否共享；面板顺序
- **关键元素**：重复图型；分组标签；共享或独立尺度说明；统一面板顺序
- **编码规则**：共享坐标才能直接比较大小；不同尺度明确；子图不重复抽样或改口径
- **常见变体**：固定尺度分面 (small_multiples.v1)；独立尺度分面 (small_multiples.v2)
- **容易混淆**：多面板组合图 (multipanel)；并列比较示意图 (comparison)
- **生成要求**：共享坐标才能直接比较大小；不同尺度明确；子图不重复抽样或改口径；仅使用用户给出的事实；未知内容标注缺失，禁止复制参考论文的数值和结论。
- **评审要求**：核对：共享坐标才能直接比较大小；核对：不同尺度明确；核对：子图不重复抽样或改口径；逐项核对必要输入；记录证据缺口，不把模型的自信作为事实依据。
- **实现状态**：仅支持示意子图；含数据子图阻断

真实论文边界案例：

- [Passion fruit plants alter the soil microbial community with continuous cropping and improve plant disease resistance by recruiting beneficial microorganisms](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0281854)，Fig 3。边界：P值属于原论文Kruskal–Wallis检验；不同指标纵轴不能直接比较。
- [Passion fruit plants alter the soil microbial community with continuous cropping and improve plant disease resistance by recruiting beneficial microorganisms](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0281854)，Fig 8。边界：功能预测不冒充实测代谢通量；原论文结论不可迁移。
- [Trade-off between local transmission and long-range dispersal drives infectious disease outbreak size in spatially structured populations](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1008009)，Fig 4。边界：颜色是插值后的模拟场，不是等值线或实际地理底图。
- [APOE-related risk of mild cognitive impairment and dementia for prevention trials: An analysis of four cohorts](https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1002254)，Fig 1。边界：这是考虑死亡竞争风险的CIF，不是普通KM生存率或简单1-KM；部分分层并不独立。
- [Multidimensional mechanics: Performance mapping of natural biological systems using permutated radar charts](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0204309)，Fig 3。边界：四组轴变量不同，不能跨面板直接比较面积；面积受轴序影响。阴影混合SD/SE/范围，借鉴时必须统一并声明统计口径；原论文形状分析法不是普适总分。
- [Machine learning models in electronic health records can outperform conventional survival models for predicting patient mortality in coronary artery disease](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0202344)，Fig 2。边界：图中采用平滑校准，不等于本版基础分箱连线；新图须给出平滑方法或分箱数据并补全纵轴概率刻度。阴影和病例分布不能迁移。

## 分析方法（不是基础图型）

### Mantel 距离矩阵检验

对应 matrix_link_overlay。输入：对齐样本的距离矩阵；距离度量；置换策略、次数、系数与P值来源。核验：连线统计量不同于相关格；不能把空间或组内依赖忽略为独立样本。当前排序图只绘制用户已计算的坐标；未实现这些分析算法。

### PCA 主成分分析

对应 ordination。输入：变量矩阵或已计算得分；中心化/标准化；载荷和解释方差来源。核验：解释率在0..1且总和不超过1；欧氏方差语义，不用距离矩阵冒充原始变量。当前排序图只绘制用户已计算的坐标；未实现这些分析算法。

### PCoA 主坐标分析

对应 ordination。输入：距离矩阵或坐标；距离度量；负特征值处理；解释率来源。核验：坐标对应所选距离；解释率不能套用PCA结果。当前排序图只绘制用户已计算的坐标；未实现这些分析算法。

### NMDS 非度量多维尺度

对应 ordination。输入：距离矩阵或坐标；距离度量；维数/随机种子；stress。核验：报告stress，不显示虚构解释率；轴方向没有原变量含义。当前排序图只绘制用户已计算的坐标；未实现这些分析算法。

### CCA 典范对应分析

对应 ordination。输入：群落矩阵；环境变量矩阵或完整分析结果；约束变量；尺度类型。核验：不能与典型相关分析混用缩写；样本/物种/环境箭头采用正确缩放。当前排序图只绘制用户已计算的坐标；未实现这些分析算法。

### RDA 冗余分析

对应 ordination。输入：响应矩阵；解释矩阵或完整分析结果；预处理；约束方差来源。核验：约束轴与未约束轴分开；载荷箭头不凭模型想象。当前排序图只绘制用户已计算的坐标；未实现这些分析算法。

### UMAP 嵌入

对应 ordination。输入：已计算坐标；邻居数/min_dist；距离度量/随机种子。核验：簇间距离和大小不直接解释为真实相似度或丰度；不标解释方差。当前排序图只绘制用户已计算的坐标；未实现这些分析算法。

### t-SNE 嵌入

对应 ordination。输入：已计算坐标；perplexity；距离度量/随机种子。核验：全局距离不当原空间距离；不标解释方差。当前排序图只绘制用户已计算的坐标；未实现这些分析算法。

