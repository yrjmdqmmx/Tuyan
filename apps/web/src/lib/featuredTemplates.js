export const FEATURED_TEMPLATE_REFERENCE_IDS = Object.freeze([
  'ref_279',
  'ref_281',
  'ref_245',
  'ref_240',
  'ref_295',
  'ref_10',
])

export const FEATURED_TEMPLATES = Object.freeze([
  Object.freeze({
    id: 'multi-agent-method',
    sourceReferenceId: 'ref_279',
    category: 'method_framework',
    title: '多智能体方法框架',
    summary: '把规划、检索、生成与评审串成一条可复现的研究主线。',
    methodContent: '我们提出一个面向学术图示生成的多智能体协作框架。输入端接收论文方法与目标图注，检索智能体从研究图库中筛选结构相近的案例；规划智能体把文本拆成模块、数据流与视觉层级；生成智能体依据规划产出候选图；评审智能体从语义一致性、结构完整性和可读性三个维度给出修改意见，并驱动下一轮渲染，直到获得可用于论文排版的最终图示。',
    caption: '图 1：检索、规划、生成与评审协作的多智能体方法框架。',
    negativePrompt: '避免装饰性背景、无意义图标、过密文字、模糊箭头、重复模块和无法辨认的小字号。',
  }),
  Object.freeze({
    id: 'experiment-reconstruction',
    sourceReferenceId: 'ref_281',
    category: 'workflow',
    title: '实验与重建流程',
    summary: '清楚交代采集、预处理、优化、重建与评估的先后关系。',
    methodContent: '本研究构建一套从原始观测到结果重建的实验流程。首先采集多批次样本并完成质量控制、去噪和标准化，随后将有效数据送入特征提取与参数初始化模块。优化阶段交替执行模型更新和误差校正，并以验证集指标决定是否继续迭代。收敛后由重建模块输出最终结果，再通过定量指标、消融实验和人工核验比较不同设置，形成可追踪的实验闭环。',
    caption: '图 1：从样本采集、迭代优化到结果重建与评估的完整流程。',
    negativePrompt: '避免跳过关键步骤、箭头方向冲突、阶段编号错乱、结果与输入混排以及过度立体化装饰。',
  }),
  Object.freeze({
    id: 'molecular-mechanism',
    sourceReferenceId: 'ref_245',
    category: 'mechanism',
    title: '机制与分子通路',
    summary: '突出刺激、受体、信号级联与细胞表型之间的因果链。',
    methodContent: '我们研究外源刺激通过膜受体调控细胞表型的分子机制。刺激首先激活膜上受体复合物，引发胞内激酶依次磷酸化并放大信号；下游转录因子进入细胞核，调节目标基因表达，最终改变代谢、增殖与炎症反应。抑制剂实验和基因敲低分别阻断关键节点，用于验证通路方向与必要性。图中应区分细胞膜、胞质和细胞核，并用激活与抑制两类连线表达因果关系。',
    caption: '图 1：外源刺激经受体和信号级联调控细胞表型的分子机制。',
    negativePrompt: '避免分子名称拼写错误、激活抑制符号混用、细胞区室边界不清、通路回路无来源和写实器官背景。',
  }),
  Object.freeze({
    id: 'model-architecture',
    sourceReferenceId: 'ref_240',
    category: 'system_architecture',
    title: '模型架构总览',
    summary: '用输入、编码、融合、预测和训练目标呈现完整计算路径。',
    methodContent: '我们设计一个多模态预测模型。文本、图像与结构化特征分别进入专用编码器，得到统一维度的表示；跨模态融合模块通过注意力机制对齐互补信息，并把融合表示送入共享骨干网络。任务头分别输出分类、定位与置信度结果，训练阶段联合优化主任务损失、对齐损失和正则项。推理阶段仅保留编码器、融合模块与任务头，图中需明确张量流向和训练专用分支。',
    caption: '图 1：多模态编码、跨模态融合与多任务预测的模型架构。',
    negativePrompt: '避免伪代码大段堆叠、张量尺寸矛盾、训练与推理路径混淆、模块重复以及渐变文字低对比。',
  }),
  Object.freeze({
    id: 'system-memory',
    sourceReferenceId: 'ref_295',
    category: 'system_architecture',
    title: '系统与记忆架构',
    summary: '展示在线请求、短期上下文、长期记忆与检索更新闭环。',
    methodContent: '我们构建一个具备分层记忆的智能系统。用户请求进入编排器后，先与会话级短期上下文合并，再由检索器查询长期语义记忆和结构化事实库。策略模块依据检索结果选择工具并组织模型调用，响应生成后由校验器检查事实与权限边界。通过校验的交互摘要写回长期记忆，原始敏感内容仅保留在当前会话；后台索引任务负责去重、版本化和过期清理，从而形成可审计的记忆闭环。',
    caption: '图 1：短期上下文、长期记忆、工具调用与校验写回组成的系统架构。',
    negativePrompt: '避免把密钥画入存储层、读写箭头含义不明、在线离线流程混杂、数据库图标滥用和无权限边界。',
  }),
  Object.freeze({
    id: 'statistical-comparison',
    sourceReferenceId: 'ref_10',
    category: 'data_stat',
    title: '统计对比面板',
    summary: '把总体指标、分组差异、置信区间与显著性放在同一视图。',
    methodContent: '我们比较基线方法、改进方法与完整方法在三个数据集上的表现。主面板使用分组柱形图展示平均准确率，并附带九十五百分比置信区间；辅助面板以折线图呈现不同样本规模下的性能变化，以箱线图展示多次重复实验的分布。所有面板共享方法配色，明确标注样本量、评价指标和显著性检验结果，同时用简短结论指出完整方法在稳定性与平均性能上的优势。',
    caption: '图 1：三种方法在不同数据集、样本规模与重复实验中的统计比较。',
    negativePrompt: '避免截断纵轴夸大差异、缺失误差线、颜色含义不一致、三维柱状图、过多小数位和未解释的显著性符号。',
  }),
])

export function featuredTemplateRequest() {
  return { referenceIds: FEATURED_TEMPLATE_REFERENCE_IDS }
}

export function attachFeaturedTemplateImages(references = []) {
  const exact = references.length === FEATURED_TEMPLATE_REFERENCE_IDS.length
    && references.every((reference, index) => reference?.id === FEATURED_TEMPLATE_REFERENCE_IDS[index])
  return FEATURED_TEMPLATES.map((template, index) => ({
    ...template,
    imageUrl: exact ? String(references[index]?.imageUrl || references[index]?.image_url || '') : '',
    imageState: exact && (references[index]?.imageUrl || references[index]?.image_url) ? 'ready' : 'fallback',
  }))
}
