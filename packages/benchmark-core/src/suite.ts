import type { BenchmarkAxis } from './contracts.js'
import { canonicalHash } from './hash.js'

export const BENCHMARK_CATEGORIES = [
  'simple_flow',
  'complex_topology',
  'dense_hierarchy',
  'bilingual_terms',
  'math_symbols',
  'multi_panel_process',
  'proportional_layout',
  'negative_constraints',
] as const

export type BenchmarkCategory = typeof BENCHMARK_CATEGORIES[number]

interface CaseSeed {
  title: string
  instruction: string
  caption: string
  requiredEntities: string[]
  requiredRelations: string[]
  requiredText: string[]
  forbidden: string[]
}

export interface BenchmarkDiagnosticCase extends Omit<CaseSeed, 'instruction'> {
  id: string
  category: BenchmarkCategory
  renderPrompt: string
  negativePrompt: string
  aspectRatio: 'auto' | '16:9' | '4:3' | '3:4' | '1:1' | '21:9'
  rubric: Record<BenchmarkAxis, string>
  license: { spdx: 'CC-BY-4.0'; author: 'PaperBanana contributors'; source: 'original' }
  manifestHash: string
}

const commonNegative = '不要水印、品牌标识、照片质感、无关装饰、伪造脚注或题目未要求的额外节点。'

const categoryRubrics: Record<BenchmarkCategory, Partial<Record<BenchmarkAxis, string>>> = {
  simple_flow: { topology: '步骤顺序和箭头方向准确。', conciseness: '只保留要求的步骤。' },
  complex_topology: { topology: '所有分支、汇合、回路和方向均准确。', faithfulness: '节点与边完整对应题意。' },
  dense_hierarchy: { readability: '密集层级仍可逐层辨认。', topology: '父子归属无歧义。' },
  bilingual_terms: { text_accuracy: '中英文术语逐字正确且配对。', readability: '混排清晰不拥挤。' },
  math_symbols: { text_accuracy: '公式、上下标和希腊字母准确。', readability: '数学符号可读。' },
  multi_panel_process: { instruction_adherence: '面板数量、顺序和标签均符合要求。', topology: '跨面板流程连续。' },
  proportional_layout: { instruction_adherence: '比例、区域位置和画幅符合要求。', aesthetics: '比例约束下仍平衡美观。' },
  negative_constraints: { instruction_adherence: '所有禁止项均未出现。', conciseness: '没有自行添加内容。' },
}

const sharedRubric: Record<BenchmarkAxis, string> = {
  faithfulness: '画面准确覆盖提示词要求且无实质性臆造。',
  conciseness: '信息密度适当，没有重复或无关内容。',
  readability: '文字、节点与视觉层级清晰可读。',
  aesthetics: '构图、配色、留白和风格专业协调。',
  text_accuracy: '要求出现的文字与符号准确无乱码。',
  topology: '实体关系、方向、包含和连接准确。',
  instruction_adherence: '画幅、数量、顺序、禁止项等约束均满足。',
}

const seeds: Record<BenchmarkCategory, CaseSeed[]> = {
  simple_flow: [
    { title: '雨水回收', instruction: '绘制横向四步流程：屋顶集水→过滤→储水罐→花园灌溉；每步一个图标，箭头只向右。', caption: '城市住宅雨水回收的四步闭环流程。', requiredEntities: ['屋顶集水', '过滤', '储水罐', '花园灌溉'], requiredRelations: ['屋顶集水->过滤', '过滤->储水罐', '储水罐->花园灌溉'], requiredText: ['屋顶集水', '过滤', '储水罐', '花园灌溉'], forbidden: ['反向箭头', '第五步骤'] },
    { title: '论文投稿', instruction: '绘制五步学术投稿流程：准备稿件→提交→编辑初审→同行评议→录用；使用编号 1–5。', caption: '从准备稿件到录用的标准投稿流程。', requiredEntities: ['准备稿件', '提交', '编辑初审', '同行评议', '录用'], requiredRelations: ['顺序1-5'], requiredText: ['1', '2', '3', '4', '5'], forbidden: ['拒稿分支'] },
    { title: '咖啡冲煮', instruction: '绘制竖向四步手冲咖啡流程：称豆→研磨→注水→萃取；在每步右侧标注动作名。', caption: '手冲咖啡从称豆到萃取的基础步骤。', requiredEntities: ['称豆', '研磨', '注水', '萃取'], requiredRelations: ['称豆->研磨', '研磨->注水', '注水->萃取'], requiredText: ['称豆', '研磨', '注水', '萃取'], forbidden: ['横向主流程'] },
    { title: '电池充放电', instruction: '绘制三阶段循环：充电→储能→放电，并用一条回箭从放电返回充电；中心写“循环”。', caption: '电池充电、储能和放电的循环关系。', requiredEntities: ['充电', '储能', '放电', '循环'], requiredRelations: ['充电->储能', '储能->放电', '放电->充电'], requiredText: ['循环'], forbidden: ['开放链'] },
    { title: '快递履约', instruction: '绘制五步包裹履约时间线：下单→打包→揽收→运输→签收；突出“运输”为蓝色。', caption: '电商包裹从下单到签收的履约时间线。', requiredEntities: ['下单', '打包', '揽收', '运输', '签收'], requiredRelations: ['顺序履约'], requiredText: ['运输'], forbidden: ['退款步骤'] },
    { title: '种子发芽', instruction: '绘制四步自然过程：种子→吸水→萌芽→幼苗；使用浅色科学插画而非照片。', caption: '种子吸水、萌芽并成长为幼苗的过程。', requiredEntities: ['种子', '吸水', '萌芽', '幼苗'], requiredRelations: ['生长顺序'], requiredText: ['种子', '幼苗'], forbidden: ['成熟果树', '照片'] },
  ],
  complex_topology: [
    { title: '持续集成', instruction: '绘制 CI 图：代码提交同时触发单元测试和静态检查；两者均通过后汇合到构建，构建再到部署；任一失败回到代码提交。', caption: '具有并行检查、汇合和失败回路的持续集成拓扑。', requiredEntities: ['代码提交', '单元测试', '静态检查', '构建', '部署'], requiredRelations: ['提交->单元测试', '提交->静态检查', '两检查->构建', '失败->提交'], requiredText: ['通过', '失败'], forbidden: ['失败->部署'] },
    { title: '订单风控', instruction: '绘制订单风控决策：订单进入规则引擎；低风险直达支付，高风险拒绝，中风险进入人工复核；人工复核可批准到支付或拒绝。', caption: '订单按风险等级分流并经人工复核的决策图。', requiredEntities: ['订单', '规则引擎', '人工复核', '支付', '拒绝'], requiredRelations: ['低风险->支付', '高风险->拒绝', '中风险->人工复核'], requiredText: ['低风险', '中风险', '高风险'], forbidden: ['高风险->支付'] },
    { title: '神经网络跳连', instruction: '绘制四层网络：Input→L1→L2→Output，并增加 Input→L2 的跳跃连接以及 L1→Output 的跳跃连接；所有边有方向。', caption: '包含两条跳跃连接的四层神经网络。', requiredEntities: ['Input', 'L1', 'L2', 'Output'], requiredRelations: ['Input->L1', 'L1->L2', 'L2->Output', 'Input->L2', 'L1->Output'], requiredText: ['Input', 'Output'], forbidden: ['Output->Input'] },
    { title: '水循环分支', instruction: '绘制水循环：蒸发→凝结→降水；降水分为地表径流和下渗，两者最终汇入海洋，海洋再蒸发。', caption: '包含分支、汇合与闭环的自然水循环。', requiredEntities: ['蒸发', '凝结', '降水', '地表径流', '下渗', '海洋'], requiredRelations: ['降水分支', '两支->海洋', '海洋->蒸发'], requiredText: ['地表径流', '下渗'], forbidden: ['下渗->云'] },
    { title: '消息重试', instruction: '绘制消息处理拓扑：队列→消费者→处理成功→确认；处理失败进入重试队列，最多三次后进入死信队列，重试可返回消费者。', caption: '带重试上限和死信分支的消息消费拓扑。', requiredEntities: ['队列', '消费者', '确认', '重试队列', '死信队列'], requiredRelations: ['失败->重试', '重试->消费者', '三次->死信'], requiredText: ['最多 3 次'], forbidden: ['死信->确认'] },
    { title: '权限继承', instruction: '绘制角色权限图：管理员继承编辑者，编辑者继承查看者；审计员独立拥有查看日志权限；管理员与审计员共同拥有导出报告权限。', caption: '包含继承和共享权限的角色访问控制图。', requiredEntities: ['管理员', '编辑者', '查看者', '审计员', '导出报告'], requiredRelations: ['管理员继承编辑者', '编辑者继承查看者', '共同拥有导出'], requiredText: ['继承', '独立'], forbidden: ['审计员继承管理员'] },
  ],
  dense_hierarchy: [
    { title: '生物分类', instruction: '绘制树状层级：动物界下分脊索动物门和节肢动物门；脊索动物门下分哺乳纲、鸟纲；节肢动物门下分昆虫纲、蛛形纲；每纲列两个示例。', caption: '动物界到纲及代表物种的三级分类树。', requiredEntities: ['动物界', '脊索动物门', '节肢动物门', '哺乳纲', '鸟纲', '昆虫纲', '蛛形纲'], requiredRelations: ['界包含门', '门包含纲'], requiredText: ['界', '门', '纲'], forbidden: ['分类交叉'] },
    { title: '公司组织', instruction: '绘制组织树：CEO 下设产品、工程、运营；产品含设计和研究，工程含前端、后端、基础设施，运营含市场和客服。', caption: '从 CEO 到九个职能团队的公司组织结构。', requiredEntities: ['CEO', '产品', '工程', '运营', '设计', '研究', '前端', '后端', '基础设施', '市场', '客服'], requiredRelations: ['CEO直属三部门', '部门包含团队'], requiredText: ['基础设施', '客服'], forbidden: ['团队跨部门'] },
    { title: '文件目录', instruction: '绘制项目目录树：root 下有 apps、packages、docs；apps 下有 web、worker；packages 下有 api、core；docs 下有 method.md。使用等宽字体。', caption: '包含应用、共享包和文档的项目目录结构。', requiredEntities: ['root', 'apps', 'packages', 'docs', 'web', 'worker', 'api', 'core', 'method.md'], requiredRelations: ['目录父子关系'], requiredText: ['root/', 'method.md'], forbidden: ['node_modules'] },
    { title: '课程知识树', instruction: '绘制“数据科学”知识树：数学、编程、领域三支；数学含概率和线代，编程含 Python 和 SQL，领域含实验设计和沟通；每个叶子一行解释。', caption: '数据科学能力的三分支知识层级图。', requiredEntities: ['数据科学', '数学', '编程', '领域', '概率', '线代', 'Python', 'SQL', '实验设计', '沟通'], requiredRelations: ['三支层级'], requiredText: ['Python', 'SQL'], forbidden: ['第四主分支'] },
    { title: '城市行政层级', instruction: '绘制抽象行政树：城市 A 下有北区、南区；北区含街道 N1、N2、N3，南区含街道 S1、S2；每条街道下各放两个社区圆点。', caption: '城市、区、街道和社区的四级行政层级。', requiredEntities: ['城市 A', '北区', '南区', 'N1', 'N2', 'N3', 'S1', 'S2'], requiredRelations: ['城市->区', '区->街道', '街道->社区'], requiredText: ['北区', '南区'], forbidden: ['真实地名'] },
    { title: '产品指标树', instruction: '绘制“月活用户”指标树：新增、留存、召回三支；新增含自然和付费，留存含次日和七日，召回含邮件和推送；在叶子旁显示公式占位符。', caption: '月活用户的增长、留存与召回指标分解。', requiredEntities: ['月活用户', '新增', '留存', '召回', '自然', '付费', '次日', '七日', '邮件', '推送'], requiredRelations: ['指标分解'], requiredText: ['MAU', '='], forbidden: ['真实数值'] },
  ],
  bilingual_terms: [
    { title: '机器学习术语', instruction: '绘制中英双语术语卡：训练集 Training Set、验证集 Validation Set、测试集 Test Set；中文在上、英文在下，三卡等宽。', caption: '训练、验证与测试数据集的中英术语对照。', requiredEntities: ['训练集', '验证集', '测试集'], requiredRelations: ['一一配对'], requiredText: ['Training Set', 'Validation Set', 'Test Set'], forbidden: ['Training Date'] },
    { title: '供应链术语', instruction: '绘制供应链横向图：供应商 Supplier→制造商 Manufacturer→分销商 Distributor→零售商 Retailer；中英文必须成对。', caption: '供应链四类角色及英文名称的对照流程。', requiredEntities: ['供应商', '制造商', '分销商', '零售商'], requiredRelations: ['供应链顺序'], requiredText: ['Supplier', 'Manufacturer', 'Distributor', 'Retailer'], forbidden: ['Customer'] },
    { title: '隐私原则', instruction: '绘制四象限隐私原则：数据最小化 Data Minimization、目的限制 Purpose Limitation、存储限制 Storage Limitation、透明度 Transparency。', caption: '四项数据隐私原则的中英双语四象限图。', requiredEntities: ['数据最小化', '目的限制', '存储限制', '透明度'], requiredRelations: ['四象限并列'], requiredText: ['Data Minimization', 'Purpose Limitation', 'Storage Limitation', 'Transparency'], forbidden: ['Consent'] },
    { title: '医学方向词', instruction: '绘制人体方向术语示意：前 Anterior、后 Posterior、上 Superior、下 Inferior；使用抽象轮廓与四个方向箭头。', caption: '人体解剖方向词的中英双语示意图。', requiredEntities: ['人体轮廓', '四方向箭头'], requiredRelations: ['方向对应'], requiredText: ['Anterior', 'Posterior', 'Superior', 'Inferior'], forbidden: ['真实器官'] },
    { title: '产品漏斗', instruction: '绘制产品漏斗四层：访问 Visit、注册 Sign-up、激活 Activation、付费 Purchase；每层中英同一行且从上到下变窄。', caption: '访问到付费的中英双语产品转化漏斗。', requiredEntities: ['访问', '注册', '激活', '付费'], requiredRelations: ['漏斗顺序'], requiredText: ['Visit', 'Sign-up', 'Activation', 'Purchase'], forbidden: ['Retention'] },
    { title: '气候术语', instruction: '绘制三栏比较：减缓 Mitigation、适应 Adaptation、韧性 Resilience；每栏给一个抽象图标和一句中文定义。', caption: '气候行动三类核心概念的中英对照。', requiredEntities: ['减缓', '适应', '韧性'], requiredRelations: ['三栏并列'], requiredText: ['Mitigation', 'Adaptation', 'Resilience'], forbidden: ['错误拼写'] },
  ],
  math_symbols: [
    { title: '贝叶斯公式', instruction: '绘制贝叶斯定理教学卡，中心公式为 P(A|B)=P(B|A)P(A)/P(B)，四周标注先验、似然、证据、后验。', caption: '贝叶斯定理公式及四个组成概念的教学图。', requiredEntities: ['公式', '先验', '似然', '证据', '后验'], requiredRelations: ['概念指向公式项'], requiredText: ['P(A|B)', 'P(B|A)', 'P(A)', 'P(B)'], forbidden: ['P(A+B)'] },
    { title: '损失函数', instruction: '绘制均方误差卡片：MSE = (1/n) Σᵢ₌₁ⁿ (yᵢ − ŷᵢ)²；下方解释 n、yᵢ、ŷᵢ。', caption: '均方误差公式与变量含义的清晰排版。', requiredEntities: ['MSE公式', '变量解释'], requiredRelations: ['变量对应'], requiredText: ['MSE', 'Σ', 'yᵢ', 'ŷᵢ', '²'], forbidden: ['绝对值符号'] },
    { title: '矩阵维度', instruction: '绘制矩阵乘法维度图：A₍m×n₎ · B₍n×p₎ = C₍m×p₎，用同色突出两个 n，并标注“内维匹配”。', caption: '矩阵乘法中内维匹配与结果维度的示意。', requiredEntities: ['矩阵A', '矩阵B', '矩阵C'], requiredRelations: ['A·B=C', 'n匹配'], requiredText: ['m×n', 'n×p', 'm×p', '内维匹配'], forbidden: ['A+B'] },
    { title: '正态分布', instruction: '绘制正态分布曲线，横轴标 μ−2σ、μ−σ、μ、μ+σ、μ+2σ；标出 68% 和 95% 区间。', caption: '正态分布均值、标准差与经验区间图。', requiredEntities: ['钟形曲线', '横轴', '区间'], requiredRelations: ['区间围绕μ'], requiredText: ['μ', 'σ', '68%', '95%'], forbidden: ['100%区间'] },
    { title: '欧姆定律', instruction: '绘制三角关系卡：顶部 V，底部 I 与 R；旁边准确列出 V=IR、I=V/R、R=V/I。', caption: '电压、电流和电阻关系的欧姆定律卡片。', requiredEntities: ['V', 'I', 'R', '关系三角'], requiredRelations: ['V=I×R'], requiredText: ['V=IR', 'I=V/R', 'R=V/I'], forbidden: ['V=I/R'] },
    { title: '集合关系', instruction: '绘制两个相交集合 A、B 的维恩图，交集标 A∩B，并在外部标全集 U；另列 A∪B 与 A\\B 符号。', caption: '集合交、并、差与全集符号的维恩图。', requiredEntities: ['集合A', '集合B', '全集U', '交集'], requiredRelations: ['A与B相交'], requiredText: ['A∩B', 'A∪B', 'A\\B', 'U'], forbidden: ['三个集合'] },
  ],
  multi_panel_process: [
    { title: '实验流程', instruction: '绘制编号 A–D 四面板：A 提出假设，B 设计实验，C 收集数据，D 得出结论；底部一条箭头串联全部面板。', caption: '科学实验从假设到结论的四面板过程。', requiredEntities: ['A 假设', 'B 实验', 'C 数据', 'D 结论'], requiredRelations: ['A->B->C->D'], requiredText: ['A', 'B', 'C', 'D'], forbidden: ['第五面板'] },
    { title: '用户旅程', instruction: '绘制三面板用户旅程：发现、试用、订阅；每面板上方写阶段，下方各放一个情绪点，依次为中性、满意、愉悦。', caption: '从发现到订阅的三阶段用户旅程。', requiredEntities: ['发现', '试用', '订阅', '情绪点'], requiredRelations: ['阶段顺序', '情绪递增'], requiredText: ['发现', '试用', '订阅'], forbidden: ['愤怒情绪'] },
    { title: '细胞分裂', instruction: '绘制四面板有丝分裂简图：前期、 中期、后期、末期；每面板只用抽象染色体线条，并在下方标中文阶段。', caption: '有丝分裂四阶段的抽象科学示意。', requiredEntities: ['前期', '中期', '后期', '末期'], requiredRelations: ['时间顺序'], requiredText: ['前期', '中期', '后期', '末期'], forbidden: ['真实显微照片'] },
    { title: '事故响应', instruction: '绘制五面板事故响应：检测→分级→遏制→修复→复盘；在“复盘”面板画一条虚线反馈到“检测”。', caption: '包含复盘反馈回路的五阶段事故响应过程。', requiredEntities: ['检测', '分级', '遏制', '修复', '复盘'], requiredRelations: ['五阶段顺序', '复盘->检测'], requiredText: ['复盘'], forbidden: ['跳过分级'] },
    { title: '设计迭代', instruction: '绘制 2×2 四面板：理解、构思、原型、测试；顺时针排列，测试用弧形箭头返回理解。', caption: '从理解到测试并循环迭代的设计过程。', requiredEntities: ['理解', '构思', '原型', '测试'], requiredRelations: ['顺时针', '测试->理解'], requiredText: ['理解', '构思', '原型', '测试'], forbidden: ['线性无回路'] },
    { title: '面包制作', instruction: '绘制六面板过程：混合、揉面、一次发酵、整形、二次发酵、烘烤；使用统一俯视插画并按 1–6 编号。', caption: '从混合原料到烘烤的六步面包制作过程。', requiredEntities: ['混合', '揉面', '一次发酵', '整形', '二次发酵', '烘烤'], requiredRelations: ['步骤1-6'], requiredText: ['1', '2', '3', '4', '5', '6'], forbidden: ['七步'] },
  ],
  proportional_layout: [
    { title: '七三仪表盘', instruction: '绘制 16:9 仪表盘，左侧主图区严格约占 70%，右侧三张指标卡约占 30%；顶部标题栏不超过总高 12%。', caption: '按七三比例划分主图和指标卡的仪表盘。', requiredEntities: ['主图区', '三张指标卡', '标题栏'], requiredRelations: ['左70%右30%'], requiredText: ['趋势', '指标'], forbidden: ['左右等宽'] },
    { title: '黄金分割海报', instruction: '绘制竖版 3:4 科普海报，标题区约 38% 高，内容区约 62% 高；内容区包含一个主图和两条短说明。', caption: '采用近似黄金分割的竖版科普海报。', requiredEntities: ['标题区', '内容区', '主图', '两条说明'], requiredRelations: ['38%/62%纵向比例'], requiredText: ['38%', '62%'], forbidden: ['三条说明'] },
    { title: '四象限矩阵', instruction: '绘制正方形 1:1 的四象限矩阵，横轴“投入”由低到高，纵轴“影响”由低到高；四象限面积完全相等。', caption: '投入与影响两个维度的等面积四象限矩阵。', requiredEntities: ['四象限', '横轴', '纵轴'], requiredRelations: ['四块等面积'], requiredText: ['投入', '影响', '低', '高'], forbidden: ['矩形画布'] },
    { title: '时间占比', instruction: '绘制一天时间分配环形图：睡眠 8 小时、工作 8 小时、通勤 2 小时、自由 6 小时；扇区比例必须对应 24 小时。', caption: '按实际小时比例绘制的一天时间分配环图。', requiredEntities: ['睡眠', '工作', '通勤', '自由'], requiredRelations: ['8:8:2:6'], requiredText: ['8h', '8h', '2h', '6h'], forbidden: ['等分四块'] },
    { title: '超宽路线图', instruction: '绘制 21:9 超宽路线图，Q1、Q2、Q3、Q4 四段等宽；每段恰好两个里程碑，沿同一水平时间轴。', caption: '四季度等宽、每季双里程碑的超宽路线图。', requiredEntities: ['Q1', 'Q2', 'Q3', 'Q4', '八个里程碑'], requiredRelations: ['季度等宽', '水平时间轴'], requiredText: ['Q1', 'Q2', 'Q3', 'Q4'], forbidden: ['九个里程碑'] },
    { title: '三栏比较', instruction: '绘制 4:3 比较页，三栏宽度依次为 25%、50%、25%；中栏标题“推荐方案”，左右栏为“方案 A”“方案 B”。', caption: '突出中间推荐方案的二五二比例比较页。', requiredEntities: ['方案 A', '推荐方案', '方案 B'], requiredRelations: ['25:50:25'], requiredText: ['25%', '50%', '25%'], forbidden: ['三栏等宽'] },
  ],
  negative_constraints: [
    { title: '无箭头对照', instruction: '绘制“太阳能”和“风能”两栏静态对照，每栏恰好三个要点；只允许分隔线，不得出现任何箭头、流程或连接线。', caption: '不使用箭头的太阳能与风能静态对照表。', requiredEntities: ['太阳能', '风能', '六个要点'], requiredRelations: ['两栏并列'], requiredText: ['太阳能', '风能'], forbidden: ['箭头', '连接线', '流程'] },
    { title: '纯黑白安全卡', instruction: '绘制黑白两色安全须知卡，仅包含“检查电源”“保持干燥”“佩戴护具”三项；不得使用红色、黄色或警告三角形。', caption: '严格黑白、无警告三角的三项安全须知。', requiredEntities: ['三项须知'], requiredRelations: ['并列'], requiredText: ['检查电源', '保持干燥', '佩戴护具'], forbidden: ['红色', '黄色', '警告三角'] },
    { title: '无人物架构', instruction: '绘制云端架构：客户端、API、数据库三层；不得画人物、手、设备照片或拟人机器人，只用几何图形。', caption: '仅用几何图形表达的三层云端架构。', requiredEntities: ['客户端', 'API', '数据库'], requiredRelations: ['客户端->API->数据库'], requiredText: ['API'], forbidden: ['人物', '手', '照片', '机器人'] },
    { title: '禁止渐变', instruction: '绘制四张功能卡：搜索、收藏、分享、导出；只用纯色填充和 2px 描边，不得使用渐变、阴影、纹理或 3D 效果。', caption: '无渐变阴影纹理的四功能扁平卡片。', requiredEntities: ['搜索', '收藏', '分享', '导出'], requiredRelations: ['四卡等权'], requiredText: ['搜索', '收藏', '分享', '导出'], forbidden: ['渐变', '阴影', '纹理', '3D'] },
    { title: '严格三节点', instruction: '绘制“输入→处理→输出”流程，必须恰好三个矩形节点和两根单向箭头；不得出现标题、副标题、图例或额外说明。', caption: '恰好三节点两箭头且没有辅助文字的流程图。', requiredEntities: ['输入', '处理', '输出'], requiredRelations: ['输入->处理', '处理->输出'], requiredText: ['输入', '处理', '输出'], forbidden: ['第四节点', '标题', '图例'] },
    { title: '留白约束', instruction: '绘制中心单一灯泡图标，图标不得超过画布面积 20%；四周保持纯白留白，不得加入文字、边框、背景图案或其他物体。', caption: '主体小于五分之一且四周纯白的单图标构图。', requiredEntities: ['灯泡图标'], requiredRelations: ['居中且<=20%'], requiredText: [], forbidden: ['文字', '边框', '背景图案', '其他物体'] },
  ],
}

const fixedRatios = new Map<string, BenchmarkDiagnosticCase['aspectRatio']>([
  ['proportional_layout-01', '16:9'],
  ['proportional_layout-02', '3:4'],
  ['proportional_layout-03', '1:1'],
  ['proportional_layout-05', '21:9'],
  ['proportional_layout-06', '4:3'],
  ['multi_panel_process-05', '1:1'],
])

const license = Object.freeze({ spdx: 'CC-BY-4.0', author: 'PaperBanana contributors', source: 'original' } as const)

function makeCase(category: BenchmarkCategory, seed: CaseSeed, index: number): BenchmarkDiagnosticCase {
  const id = `${category}-${String(index + 1).padStart(2, '0')}`
  const base = {
    id,
    category,
    title: seed.title,
    renderPrompt: `创建一张专业、清晰、适合公开模型横评的中文信息图。${seed.instruction} 使用中性浅色背景、清晰视觉层级，并严格保留题目指定文字。`,
    negativePrompt: `${commonNegative} ${seed.forbidden.length ? `尤其不得出现：${seed.forbidden.join('、')}。` : ''}`,
    caption: seed.caption,
    aspectRatio: fixedRatios.get(id) || 'auto',
    requiredEntities: seed.requiredEntities,
    requiredRelations: seed.requiredRelations,
    requiredText: seed.requiredText,
    forbidden: seed.forbidden,
    rubric: { ...sharedRubric, ...categoryRubrics[category] },
    license,
  }
  return { ...base, manifestHash: canonicalHash(base) }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value as Record<string, unknown>).forEach(deepFreeze)
  }
  return value
}

const cases = BENCHMARK_CATEGORIES.flatMap((category) => seeds[category].map((seed, index) => makeCase(category, seed, index)))
const quickCaseIds = [
  'simple_flow-01', 'simple_flow-04',
  'complex_topology-01', 'complex_topology-05',
  'dense_hierarchy-02', 'dense_hierarchy-06',
  'bilingual_terms-01', 'bilingual_terms-05',
  'math_symbols-01', 'multi_panel_process-04',
  'proportional_layout-01', 'negative_constraints-05',
]

const suiteBase = {
  id: 'pb-image-diagnostic-v1',
  title: 'PaperBanana Image Diagnostic v1',
  version: 1,
  language: 'zh-CN',
  license,
  caseCount: 48,
  categories: BENCHMARK_CATEGORIES,
  cases,
  quickCaseIds,
}

export const PB_IMAGE_DIAGNOSTIC_V1 = deepFreeze({
  ...suiteBase,
  manifestHash: canonicalHash(suiteBase),
})
