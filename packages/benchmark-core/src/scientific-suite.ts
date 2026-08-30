import { canonicalHash } from './hash.js'
import { SCIENTIFIC_BENCHMARK_AXES, SCIENTIFIC_BENCHMARK_IDENTITY, type ScientificBenchmarkAxis } from './scientific-contracts.js'
import { SCIENTIFIC_EDIT_SOURCE } from './scientific-edit-source.js'

type ScientificRubric = Readonly<Partial<Record<ScientificBenchmarkAxis, string>>>

interface ScientificCaseBase {
  id: string
  title: string
  instruction: string
  applicableAxes: readonly ScientificBenchmarkAxis[]
  rubric: ScientificRubric
  manifestHash: string
}

export interface ScientificGenerationCase extends ScientificCaseBase {
  kind: 'generation'
  aspectRatio: '16:9'
  negativePrompt: string
}

export interface ScientificEditCase extends ScientificCaseBase {
  kind: 'edit'
  sourceHash: string
  region: typeof SCIENTIFIC_EDIT_SOURCE.regions[number]
}

export type ScientificBenchmarkCase = ScientificGenerationCase | ScientificEditCase

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value as Record<string, unknown>).forEach(deepFreeze)
  }
  return value
}

const commonGenerationAxes = SCIENTIFIC_BENCHMARK_AXES.slice(0, 8)
const commonGenerationRubric: ScientificRubric = {
  scientific_faithfulness: '科研概念、实体、过程与给定事实准确，不臆造结论。',
  structural_topology: '节点、模块、分支、包含、箭头方向与因果关系准确。',
  text_symbol_accuracy: '标题、术语、缩写、数学符号和中英文标注逐字准确。',
  quantitative_accuracy: '固定数值、单位、坐标、图例和跨面板对应关系准确。',
  instruction_adherence: '面板、画幅、指定内容及所有正负向约束均满足。',
  readability_visual_hierarchy: '标题、面板、节点、标注和阅读顺序清晰。',
  information_density: '科研信息完整而紧凑，无冗余装饰或关键内容缺失。',
  publication_aesthetics: '达到科研论文配图所需的构图、配色、留白与一致性。',
}

const editRubric: ScientificRubric = {
  scientific_faithfulness: commonGenerationRubric.scientific_faithfulness,
  structural_topology: commonGenerationRubric.structural_topology,
  text_symbol_accuracy: commonGenerationRubric.text_symbol_accuracy,
  instruction_adherence: commonGenerationRubric.instruction_adherence,
  readability_visual_hierarchy: commonGenerationRubric.readability_visual_hierarchy,
  publication_aesthetics: commonGenerationRubric.publication_aesthetics,
  edit_target_accuracy: '目标区域的指定局部修改精确完成，没有漏改或过度修改。',
  non_target_preservation: '目标外的文字、节点、箭头、数值、颜色和布局保持像素语义一致。',
}

function generationCase(id: string, title: string, instruction: string, negativePrompt: string): ScientificGenerationCase {
  const base = {
    id,
    kind: 'generation' as const,
    title,
    instruction,
    negativePrompt,
    aspectRatio: '16:9' as const,
    applicableAxes: [...commonGenerationAxes],
    rubric: { ...commonGenerationRubric },
  }
  return { ...base, manifestHash: canonicalHash(base) }
}

function editCase(
  id: string,
  title: string,
  instruction: string,
  region: ScientificEditCase['region'],
  targetAxis: 'text_symbol_accuracy' | 'structural_topology' | 'publication_aesthetics',
): ScientificEditCase {
  const applicableAxes = [
    targetAxis,
    'instruction_adherence',
    'readability_visual_hierarchy',
    'publication_aesthetics',
    'edit_target_accuracy',
    'non_target_preservation',
  ].filter((axis, index, all) => all.indexOf(axis) === index) as ScientificBenchmarkAxis[]
  const base = {
    id,
    kind: 'edit' as const,
    title,
    instruction,
    applicableAxes,
    rubric: Object.fromEntries(applicableAxes.map((axis) => [axis, editRubric[axis]])) as ScientificRubric,
    sourceHash: SCIENTIFIC_EDIT_SOURCE.sourceHash,
    region,
  }
  return { ...base, manifestHash: canonicalHash(base) }
}

const scientificCases = [
  generationCase(
    'scientific-gen-01-method-flow',
    '复杂科研方法流程',
    '绘制横向科研方法流程图：样本采集（n=120）→质控（排除 8）→特征提取；随后分为训练集 78、验证集 17、测试集 17，训练与验证共同指向模型选择，最终只由测试集指向盲法评估。所有节点、数字、分支和箭头必须明确。',
    '不得改变固定样本数，不得让测试集参与训练或模型选择，不得增加未要求的分析步骤。',
  ),
  generationCase(
    'scientific-gen-02-biological-pathway',
    '生物机制与信号通路',
    '绘制细胞膜到细胞核的机制图：Ligand X 激活 Receptor R，R 磷酸化 K1；K1 分别激活 K2 和 K3，K2/K3 汇合激活 TF-Y，TF-Y 入核促进 Gene Z 转录；Phosphatase P 抑制 K1。区分激活箭头与抑制 T 形端。',
    '不得反转任一箭头，不得把 P 画成激活，不得添加题目外蛋白、细胞器或反馈环。',
  ),
  generationCase(
    'scientific-gen-03-model-architecture',
    '多模块模型架构',
    '绘制多模态模型架构：Text Encoder 与 Image Encoder 并行输入 Cross-modal Fusion；Fusion 输出到 Shared Transformer（标注 12 layers），随后分到 Classification Head 和 Segmentation Head；Residual Adapter 只跨接 Shared Transformer 的第 3–9 层。',
    '不得合并两个编码器，不得把两个任务头串联，不得让 Adapter 跨接到输入编码器。',
  ),
  generationCase(
    'scientific-gen-04-quantitative-panels',
    '固定数值统计多面板',
    '制作 A–D 四面板统计图：A 为三组柱状值 Control=1.00、Drug A=1.82、Drug B=0.64；B 为时间点 0/6/12/24 h 对应 0.10/0.35/0.72/0.91；C 为 2×2 混淆矩阵 [[42,3],[5,50]]；D 为效应量 0.78，95% CI [0.41,1.15] 的森林图。所有数值与单位必须原样显示。',
    '不得平滑、四舍五入或重排固定数值，不得省略面板字母、单位、坐标或置信区间端点。',
  ),
  generationCase(
    'scientific-gen-05-math-bilingual',
    '数学公式与双语标注',
    '绘制优化目标与符号说明图，主公式为 L(θ)=Σᵢ₌₁ⁿ wᵢ‖fθ(xᵢ)−yᵢ‖²+λ‖θ‖₁；右侧逐项双语标注 θ parameters/参数、wᵢ sample weight/样本权重、λ regularization/正则系数，并用箭头对应公式中的精确符号。',
    '不得改写公式、上下标、范数、平方、求和上下界或希腊字母，不得出现中英文错配。',
  ),
  generationCase(
    'scientific-gen-06-controls-negative-constraints',
    '对照实验与负向约束',
    '绘制 2×3 对照实验布局：列为 Vehicle、Low dose、High dose；行为 Baseline 与 24 h。每格只含同尺寸细胞示意和标签，High dose/24 h 格显示凋亡增加；右下角放统一比例尺 20 μm。',
    '不得出现显微照片质感、3D、渐变、动物、统计显著性星号、额外时间点、重复比例尺或品牌水印。',
  ),
  editCase(
    'scientific-edit-01-text-label',
    '单一文字局部编辑',
    '仅将区域 1 的“Ligand A / 配体 A”改为“Ligand B / 配体 B”；其他文字、节点、箭头、颜色和布局保持不变。',
    '01-text-label',
    'text_symbol_accuracy',
  ),
  editCase(
    'scientific-edit-02-node-arrow',
    '节点与箭头局部编辑',
    '仅在区域 2 删除 K1→K3 的下方分支箭头与 K3 节点；K1→K2 分支及其他区域保持不变。',
    '02-node-arrow',
    'structural_topology',
  ),
  editCase(
    'scientific-edit-03-color-legend-callout',
    '颜色、图例与 callout 局部编辑',
    '仅在区域 3 将 activation 色块改为紫色、同步图例，并把 response callout 改为实线；其他内容保持不变。',
    '03-color-legend-callout',
    'publication_aesthetics',
  ),
] as const

const suiteBase = {
  id: SCIENTIFIC_BENCHMARK_IDENTITY.suiteId,
  version: 2,
  language: 'zh-CN',
  caseCount: scientificCases.length,
  cases: scientificCases,
}

export const PB_SCIENTIFIC_FIGURE_V2 = deepFreeze({
  ...suiteBase,
  manifestHash: canonicalHash(suiteBase),
})
