#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { REFERENCE_METADATA_ZH_CN as DEFAULT_LEGACY_METADATA } from '../src/data/reference-metadata.zh-CN.v1.js';
import {
  PAPERBANANA_BENCH_V2_DIAGRAM_NUMBERS,
  validateReferenceCorpusV2,
} from '../src/data/reference-corpus-quality.js';

export const PAPERBANANA_BENCH_COMMIT = 'a876264bcd1e826a0320f805f8fb1cd705cf510f';
export const REFERENCE_METADATA_ZH_CN_V2_VERSION = 'zh-CN.v2';
export const DEFAULT_DIAGRAM_IDS = Object.freeze(PAPERBANANA_BENCH_V2_DIAGRAM_NUMBERS.map((number) => `ref_${number}`));

// Curated against the fixed plot/ref.json order. English source titles remain in `title`.
const PLOT_TITLES_ZH = Object.freeze([
  '农业增长指标与各学科出版量', '全国与高校教育程度分布', '奢侈品牌特征对比', '文学类型特征对比',
  '文本摘要评估指标相关性', '技术采用率分布', '三类文学作品特征对比', '2013 与 2022 年预算分配',
  '四家车企季度收益与增长率', '两种治疗方案的周期效果', '不同治疗对患者康复的影响', '学术文献中的哲学流派占比',
  '各年级师生比变化', '政治人物支持率变化', '四种方法的跨任务平均准确率', '医学测试得分对比',
  '两项研究中各年龄组的情绪反应', '人工标注与一致性偏差检查', '环形烘焙店份额图', '教育行业分布',
  '六大区域的市场份额与满意度变化', '三国 GDP 增长率变化', '梯度步数与数值趋势对比', '2018 至 2022 年经济增长率',
  '宗教归属与趋势分析', '不同人群的心理评估信度', '不同城市的人口增长与平均收入', '运动品牌市场份额',
  '交通方式的旅行时间与油耗', '两地区宗教分布对比', '心理治疗方法的疗效变化', '图像分类类别准确率',
  '2023 年技术采用率分布', '词表规模对零样本准确率的影响', '科学研究一致性与相关性', '传统与新技术农业指标对比',
  '部门绩效与偏差', '球员绩效分析', '不同技术领域的独立发言者数量', '艺术项目与设计项目开支',
  'A 队与 B 队绩效趋势', '不同作者与方法的 M_B 值', '全国与项目能源消耗', '卫生支出分布',
  '各年龄组人口分布', '法律执业领域分布', '不同政策领域的政治策略绩效', '政治支持与反对率',
  '社会政治类别与不文明行为比例', '全国与项目能源消耗', '不同分辨率和方法的 Top-1 准确率', '每周点击、分享、浏览与点赞趋势',
  '公立与私立学校的学生成绩', '汽车市场份额', '生活质量指标对比', '三类传感器的季节性污染水平',
  '哲学领域的群外与群内偏差', '农产品份额分布', '各年龄组人口分布', '量化误差与搜索窗口比率',
  '平均相对误差', '各国总能耗与可再生能源使用量', '各能源类型的效率与减碳率', '不同治疗方案的患者反应',
  '合成数据与人工数据的交互类别', '各类水果市场份额', '季度财务表现', '历年人口增长',
  '不同沟通媒介的效果', '各城市温度变化与分析方法', '古典哲学与现代哲学分布', '三类法律领域的绩效指标',
  '两座城市的人口与平均年龄', '原始与调整后的土地利用', '投票者与被投者占比', '人口增长时间分析',
  '科技设备迭代绩效', '各地年平均气温', '政治人物支持率与政策认同率', '两国经济指标对比',
  '模型对数概率与误差范围', '社交媒体使用分布', '加权均方根误差与每像素位数关系', '社会指标满意率',
  '律师效率与客户满意度', '不同沟通方式的用户数与互动量', 'CIFAR100 状态零样本准确率', '教育项目绩效指标',
  '两类社会的指标对比', '研究 A 与研究 B 的对比热力图', '技术采用趋势', '教育、医疗与技术发展趋势',
  '认知类别与模型绩效', '经济部门之间的互动', '历年人口增长', '不同作者的段落召回率',
  '对称与非对称误差下的平均市场价格', '五类宗教知识与行为绩效', '议会席位分布', '游客数、收入与满意度年度趋势',
  '各城市人口增长趋势', '各行业股票波动性与预期回报', '各类别销售额分布', '不同 DNN 配置的绩效指标',
  '迪士尼与环球影城对比', '不同方法的焦虑、情绪与压力得分', '绩效表现与策略特征', '三座城市的环境科学指标',
  'XNLI 加速倍率对比', '哲学流派绩效对比', 'LIVE 与 CSIQ 数据的标注函数相似性', '干预前后的污染物水平',
  '政党支持率分布', '教育活动时间分配', '不同城市的健身水平', '数十年间的平均气温变化',
  '国内与国际游客量的年度变化', '年度能源使用降幅', '不同 NLP 模型的绩效热力图', '世界主要宗教分布',
  '哲学思想流派分布', '各地区与年龄组的人口分布', '数字营销、纸媒广告与社交媒体营销指标', '两个数据集上的政治类别模型 F1 得分',
  '不同机构的信任水平与偏差指数', '各城市人口统计', '各角色发言时长与词元数', '不同平台的受众参与度',
  '媒体热度时间对比', 'NLP 学术会议影响力', '专家组评估的治疗效果', '商业绩效指标对比',
  '沟通方式效果对比', '三个系列电影的票房收入趋势', '两项赛事中运动员的分年龄绩效', '训练数据比例与模型测试准确率',
  '小麦、玉米与大豆产量', '讨论层级与认同、分歧、反思及批评率', '两组股票的年度价格趋势', '社交媒体的浏览、点赞、分享与评论趋势',
  '年龄、收入与负债的社会趋势', '各国平均气温变化', 'Llama-2-70B 的文本类别绩效', '宠物类别与占比',
  '不同不确定性阈值下的模型准确率', '政治参与中的社交媒体使用时长', '学科受欢迎程度分布', '科技公司平台与项目使用占比',
  '分子数据集参数量与归一化误差', '年度阅读量与平均阅读速度', '全球区域占比分布', '教学方法绩效指标',
  '八个学科的成绩混淆矩阵', '四家公司的股价趋势', '五道问题的调查回答分布', '非营利组织增长可视化',
  '作物产量与用水效率', '政治支持度趋势', '丰富语境下的共鸣偏好', '交通工具与运输服务的效率及满意度',
  '哲学家影响力与贡献变化', 'GPT-4 与 PaLM-2 评估的模型胜负率', '原始数值与调整数值', '可再生能源来源占比',
  '不同治疗和安慰剂的压力与满意度', '各国待办与已解决案件数', '不同方法对心理健康的改善效果', 'POPE 评估指标对比',
  '不同宗教角色的互动热力图', 'A 党与 B 党的指标排名', '金融市场各行业份额', '领先科技品牌市场份额',
  '千类图像数据集线性探测结果', '技术领域独立发言者数量分析', '各城市季节气温变化', '学习方法下的学生参与度与成绩改善',
  '干预前后的得分对比', '两家医院的患者满意度', '逻辑方格题的准确率、成本与算力', '科技领域的群内与群外偏差',
  '各学科知识增长与出版量', '经济指标时间变化', '各年龄组幸福指数', '三种 GNN 模型的绩效指标',
  '三个推荐数据集的模型表现', '不同区域的产品表现', '媒体类型与年龄组热力分布', '各文学类型的阅读时间与理解度',
  '不同作者的人口增长率预测', '不同语言的群外偏差方向与幅度', '糖尿病识别的域外准确率与分布偏差', '认知功能与记忆保留率',
  '不同标准下的信号强度与距离', '可再生与不可再生能源结构', '两种安全评估模型的结果对比', 'GDP 增长率趋势',
  '月平均气温', '单位面积作物产量与虫害水平', '作物产量的时间变化', '不同宗教的表征准确率',
  '流媒体服务的六类体验评分', '2013 与 2022 年专利申请量', 'AI 法律模型绩效对比', '不同地点的污染物水平',
  '2023 年月度能源消耗', '各社会政治类别的发言者数量', '治疗效果、副作用与年度进展', '各文学类型的平均图书评分',
  '年降水量的原始与调整值', '各地区二氧化碳排放趋势', '模型调优方法的算力与准确率', '销售概率、销量与科技产品评分',
  '各城市年平均降雨量', '旅游目的地综合对比', '天气类型与时段气温热力图', '世界宗教分布',
  '开发集用户数与模型 F1 得分', '邮件、即时消息与社交帖文数量', '眼动与脑电指标的一致性', '全球气温异常趋势',
  '不同人群十个月的日均步数', '四个实体的八类科技领域绩效', '公司收入、利润与开支', '哲学流派影响力变化',
  '学生成绩与教学效果相关性', '标普 500 各行业市场份额', '传统与现代沟通方式分布', '热门旅游目的地指标对比',
  '云服务商使用趋势', '能源行业分布', '科技与通信行业市场份额', '社交媒体互动与粉丝增长',
  '不同教育类别的发言情况', '方法多样性与效果', '常见心理健康障碍流行率', '法律领域独立发言者数量分析',
  '政府与企业的云采用周期和数据用量', '轿车与 SUV 的油耗、排放与车速关系', '迭代次数与 N-ELBO 趋势', '各地区宗教信众数量',
]);

const DIAGRAM_TITLE_OVERRIDES = Object.freeze({
  ref_240: 'SGN：面向多变量时间序列的移窗分层变量分组',
  ref_241: 'SQS：自动驾驶稀疏感知的查询式高斯泼溅增强',
  ref_242: 'SSR：原理引导空间推理增强深度感知',
  ref_251: 'SpaceServe：多模态模型互补编解码器的空间复用',
  ref_252: '级联稀疏—稠密表征的统一生成推荐',
  ref_254: '频谱调节注意力机制的性能提升',
  ref_255: 'Spike4DGS：脉冲相机阵列驱动的高速动态场景渲染',
  ref_256: '伪影解释驱动的合成图像检测',
  ref_257: '近无限上下文训练的同心环序列并行框架',
  ref_260: '时间序列基础模型的序列—符号合成数据生成',
  ref_263: 'TP-MDDN：支持自主决策的任务优先多需求导航',
  ref_268: '推理模型中的霍桑效应：测试意识评估与引导',
  ref_270: '球面 B 样条等变网络的管状流形拓扑学习',
  ref_271: '知识图训练赋能通用图迁移',
  ref_275: '合成到真实图像质量评估的数据分布重塑',
  ref_278: '直线斯坦纳最小树的针点训练与障碍测试',
  ref_287: '光谱重建同色异谱困境的半监督高保真方法',
  ref_297: '视频对话模型的智能体推理',
  ref_303: 'TriSense：多模态视听语音时刻理解',
  ref_304: '成员推断的投毒干扰机制',
  ref_305: '面向大语言模型的数据影响力评估',
  ref_306: '身份信息驱动的大语言模型增强推荐',
  ref_307: 'Wonder：基于多智能体上下文校准的好奇心探索',
});

const VISUAL_CATEGORY_LABELS = Object.freeze({
  '3d': '三维图', area: '面积图', bar: '柱状图', box: '箱线图', contour: '等高线图',
  density: '密度图', diagram: '研究框架图', donut: '环形图', errorbar: '误差棒图',
  flow: '流程图', heatmap: '热力图', histogram: '直方图', line: '折线图', map: '地图',
  multidiff: '组合图', pie: '饼图', radar: '雷达图', scatter: '散点图', stack: '堆叠图',
  surface: '曲面图', violin: '小提琴图', vision_perception: '视觉感知框架图',
  multimodal: '多模态框架图', language: '语言模型框架图', reinforcement_learning: '强化学习框架图',
  agent_reasoning: '智能体推理框架图', generative_learning: '生成式学习框架图',
  science_applications: '科学应用框架图', science: '科学计算框架图', misc: '数据图表',
});

const RESEARCH_DOMAIN_LABELS = Object.freeze({
  agriculture: '农业科学', biology: '生命科学', business: '商业分析', chemistry: '化学与材料',
  climate: '气候与环境', economics: '经济与金融', education: '教育研究', energy: '能源研究',
  engineering: '工程技术', health: '医学与健康', language: '语言与推理', multimodal: '多模态智能',
  physics: '物理与天文', social: '社会科学', vision_perception: '计算机视觉',
  agent_reasoning: '语言与推理', generative_learning: '生成式学习', science_applications: '科学应用',
  reinforcement_learning: '强化学习', science: '科学计算', general: '综合数据分析',
});

const DOMAIN_RULES = [
  ['农业科学', /\b(?:agric\w*|crop\w*|farm\w*|soil\w*|plant\w*|irrigation|fertilizer|horticulture)\b/iu],
  ['医学与健康', /\b(?:health\w*|medical|clinical|patient\w*|disease\w*|cancer|brain|eeg|mri|patholog\w*|protein\w*|gene\w*|cell\w*|drug\w*)\b/iu],
  ['气候与环境', /\b(?:climate|weather|temperature\w*|rain(?:fall)?|environment\w*|emission\w*|pollution|forest\w*|ocean\w*)\b/iu],
  ['经济与金融', /\b(?:economic\w*|finance|financial|market\w*|stock\w*|income|revenue|gdp|trade|price\w*|sales?)\b/iu],
  ['教育研究', /\b(?:education\w*|student\w*|school\w*|university|learning outcome\w*|publication\w*)\b/iu],
  ['能源研究', /\b(?:energy|power|electric\w*|solar|wind|battery|fuel)\b/iu],
  ['物理与天文', /\b(?:physics|quantum|astronom\w*|galaxy|planet\w*|stellar)\b/iu],
  ['生命科学', /\b(?:biology|ecolog\w*|species|animal\w*|insect\w*|biodiversity|molecule\w*)\b/iu],
  ['工程技术', /\b(?:engineering|manufactur\w*|network\w*|transport\w*|traffic|vehicle\w*|construction)\b/iu],
  ['社会科学', /\b(?:population|demograph\w*|religion\w*|social|country|region\w*|crime|survey)\b/iu],
];

const VISUAL_SIGNAL_RULES = Object.freeze([
  ['时间趋势', /\b(?:trend|time|year|month|week|season|iteration)\w*\b/iu],
  ['群组对比', /\b(?:compar\w*|versus|across|between|different)\b/iu],
  ['构成分布', /\b(?:distribution|share|ratio|proportion|prevalence)\w*\b/iu],
  ['相关关系', /\b(?:correlation|relationship|association)\w*\b/iu],
  ['误差范围', /\b(?:error|uncertainty|variance|deviation)\w*\b/iu],
  ['局部放大', /\b(?:inset|zoom)\w*\b/iu],
  ['累积层次', /\b(?:stacked|cumulative|hierarch)\w*\b/iu],
  ['模块流程', /\b(?:pipeline|framework|module|stage|process)\w*\b/iu],
  ['编解码协作', /\b(?:encoder|decoder|encoding|decoding)\w*\b/iu],
  ['训练与推理', /\b(?:training|inference|optimization|learning)\w*\b/iu],
  ['注意力交互', /\b(?:attention|transformer|token)\w*\b/iu],
  ['图结构传播', /\b(?:graph|node|edge|topology)\w*\b/iu],
  ['生成与重建', /\b(?:generation|generative|diffusion|reconstruction)\w*\b/iu],
  ['记忆与检索', /\b(?:memory|retrieval|retrieve)\w*\b/iu],
]);

const FIELD_LABEL_RULES = Object.freeze([
  ['年份', /\b(?:year|date|time)\b/iu], ['类别', /\b(?:category|type|class|group)\b/iu],
  ['数量', /\b(?:count|number|volume|publications?|users?)\b/iu], ['比率', /\b(?:rate|ratio|percent|percentage|share)\b/iu],
  ['得分', /\b(?:score|accuracy|performance|metric|value)\b/iu], ['收入', /\b(?:income|revenue|earnings?|sales?)\b/iu],
  ['人口', /\bpopulation\b/iu], ['温度', /\btemperature\b/iu], ['能耗', /\b(?:energy|consumption|fuel)\b/iu],
  ['地区', /\b(?:region|country|city|location)\b/iu], ['方法', /\b(?:method|model|strategy|treatment)\b/iu],
]);

const cleanText = (value) => String(value ?? '')
  .replace(/\r?\n+/gu, ' ')
  .replace(/(?:\.\.\.|…)+/gu, '')
  .replace(/\s+/gu, ' ')
  .trim();

const finishChineseSentence = (value) => {
  const text = cleanText(value).replace(/[.,;:]+$/u, '').trim();
  return /[。！？]$/u.test(text) ? text : `${text}。`;
};

const stripFocusPrefix = (value) => cleanText(value)
  .replace(/^聚焦\s*[「“][^」”]*[」”]\s*[，,:：]?\s*/u, '')
  .replace(/^聚焦\s*/u, '')
  .trim();

const normalCategory = (source, taskName) => cleanText(
  taskName === 'plot' ? source.original_category || source.category || 'misc' : source.category || 'diagram',
).toLowerCase().replace(/[^a-z0-9]+/gu, '_').replace(/^_|_$/gu, '') || taskName;

const categoryLabel = (category, taskName) => VISUAL_CATEGORY_LABELS[category]
  || (taskName === 'diagram' ? '研究框架图' : '数据图表');

function sourceEnglishTitle(source, taskName) {
  if (taskName === 'diagram') {
    return cleanText(source.additional_info?.file_name).replace(/\.pdf$/iu, '') || `PaperBananaBench ${source.id}`;
  }
  const intent = cleanText(source.visual_intent).replace(/\(size of the desired plot:[^)]+\)/giu, '').trim();
  const titled = [...intent.matchAll(/\btitled\s+([^,()]+(?:\([^)]*\)[^,()]*)?)/giu)]
    .map((match) => cleanText(match[1])).filter(Boolean);
  if (titled.length) return [...new Set(titled)].join(' / ');
  return intent.replace(/^A (?:figure with \d+ subplots?:\s*)?/iu, '').replace(/^(?:an?|the)\s+/iu, '') || `PaperBananaBench ${source.id}`;
}

function contentKeys(source) {
  if (source.content && typeof source.content === 'object' && !Array.isArray(source.content)) {
    return Object.keys(source.content).map(cleanText).filter(Boolean).slice(0, 8);
  }
  const heading = cleanText(source.content).match(/^#{1,6}\s*([^#]{3,90})/u)?.[1];
  return [heading || '方法结构', '模块关系'];
}

function sourceSignalsZh(source, fallback, taskName) {
  const haystack = cleanText(source.visual_intent);
  const rules = taskName === 'plot' ? VISUAL_SIGNAL_RULES.slice(0, 7) : VISUAL_SIGNAL_RULES.slice(7);
  const matches = rules.filter(([, pattern]) => pattern.test(haystack)).map(([label]) => label);
  return [...new Set(matches)].slice(0, 3).join('、') || fallback;
}

function topicCue(titleZh) {
  const chinese = cleanText(titleZh)
    .replace(/[A-Za-z][A-Za-z0-9_.+/-]*/gu, '')
    .replace(/\d+(?:\.\d+)?/gu, '')
    .replace(/[^\u3400-\u9fff、，：—与和及的]+/gu, '')
    .replace(/^[：、，—]+|[：、，—]+$/gu, '');
  const substitutions = [
    ['时间序列', '时序'], ['平均', '均值'], ['分布', '构成'], ['对比', '比较'], ['趋势', '走势'],
    ['分析', '研判'], ['变化', '变动'], ['指标', '度量'], ['绩效', '成效'], ['得分', '评分'],
    ['准确率', '识别率'], ['增长率', '增速'], ['关系', '关联'], ['影响', '作用'], ['使用', '采用'], ['效果', '成效'],
    ['份额', '占比'], ['水平', '程度'], ['评估', '评价'], ['模型', '系统'], ['框架', '架构'],
    ['方法', '方案'], ['图像', '影像'], ['数据', '资料'], ['训练', '学习'], ['推理', '推断'],
    ['检测', '识别'], ['生成', '合成'], ['视觉', '图形'], ['分类', '类别判定'], ['优化', '改进'],
    ['分配', '配置'], ['理解', '认知'], ['机制', '机理'], ['反应', '响应'], ['检查', '核查'],
    ['计算', '测算'], ['选择', '筛选'], ['增长', '增幅'], ['占比', '比重'], ['理论', '理论逻辑'],
  ];
  let paraphrase = (chinese || '研究主题').replace(/^(与|和|及|至)+/u, '');
  for (const [from, to] of substitutions) paraphrase = paraphrase.replaceAll(from, to);
  if (paraphrase !== chinese || !chinese) return paraphrase;
  if (paraphrase.includes('与')) return paraphrase.replace('与', '和');
  if (paraphrase.length > 3) return `${paraphrase.slice(0, -2)}相关${paraphrase.slice(-2)}`;
  return `${paraphrase}相关议题`;
}

function localizedFieldCue(keys, fallback) {
  const labels = [];
  for (const key of keys) {
    const chinese = key.match(/[\u3400-\u9fff]{2,}/gu) || [];
    labels.push(...chinese);
    for (const [label, pattern] of FIELD_LABEL_RULES) if (pattern.test(key)) labels.push(label);
  }
  return [...new Set(labels)].slice(0, 3).join('、') || '主题度量';
}

function researchDomain(source, englishTitle, keys) {
  const category = cleanText(source.category).toLowerCase().replace(/[^a-z0-9]+/gu, '_');
  if (RESEARCH_DOMAIN_LABELS[category]) return RESEARCH_DOMAIN_LABELS[category];
  const haystack = `${englishTitle} ${keys.join(' ')} ${cleanText(source.visual_intent)}`;
  return DOMAIN_RULES.find(([, pattern]) => pattern.test(haystack))?.[0] || '综合数据分析';
}

function keywordsFor(source, category, domain, title, keys) {
  const candidates = [domain, categoryLabel(category, source.taskName), ...keys.slice(0, 4), ...title.split(/[^A-Za-z0-9\u3400-\u9fff+-]+/u).filter((word) => word.length >= 3).slice(0, 3)];
  return [...new Set(candidates.map(cleanText).filter(Boolean))].slice(0, 8);
}

function buildPlotEntry(source) {
  const taskName = 'plot';
  const category = normalCategory(source, taskName);
  const visualLabel = categoryLabel(category, taskName);
  const englishTitle = sourceEnglishTitle(source, taskName);
  const keys = contentKeys(source);
  const domain = researchDomain(source, englishTitle, keys);
  const titleZh = PLOT_TITLES_ZH[Number(source.id.slice(4))] || `${visualLabel}案例｜${englishTitle}`;
  const cue = topicCue(titleZh);
  const signals = sourceSignalsZh(source, '数据差异', taskName);
  const fields = localizedFieldCue(keys, cue);
  const shortIntroZh = finishChineseSentence(`「${titleZh}」以${cue}为观察重点，${visualLabel}结合${fields}呈现${signals}`);
  const detailZh = finishChineseSentence(`源图围绕${cue}组织${fields}，通过${visualLabel}的位置、分组与图例设计说明${signals}。在${cue}的表达中，画面将主要差异与辅助信息分层展开，便于读者快速识别数据关联与重点`);
  return {
    id: source.id, taskName, title: englishTitle, summary: cleanText(source.visual_intent), titleZh,
    shortIntroZh, detailZh, visualCategory: visualLabel, researchDomain: domain,
    keywords: keywordsFor({ ...source, taskName }, category, domain, englishTitle, keys),
  };
}

function buildDiagramEntry(source, legacyById) {
  const taskName = 'diagram';
  const legacy = legacyById.get(source.id);
  const category = normalCategory(source, taskName);
  const visualLabel = categoryLabel(category, taskName);
  const englishTitle = sourceEnglishTitle(source, taskName);
  const keys = contentKeys(source);
  const domain = researchDomain(source, englishTitle, keys);
  const titleZh = DIAGRAM_TITLE_OVERRIDES[source.id] || cleanText(legacy?.titleZh) || `研究框架｜${englishTitle}`;
  const cue = topicCue(titleZh);
  const signals = sourceSignalsZh(source, '模块协作', taskName);
  const shortIntroZh = finishChineseSentence(`「${titleZh}」围绕${cue}展开，${visualLabel}突出${signals}及模块间的信息流向`);
  const detailZh = finishChineseSentence(`源图以${cue}为主线，依据原始方法内容将${signals}拆解为可跟踪的步骤与模块。为了说明${cue}的实现路径，画面利用分层、连接和强调关系区分输入、中间处理与结果端`);
  return {
    id: source.id, taskName, title: englishTitle, summary: cleanText(source.visual_intent), titleZh,
    shortIntroZh, detailZh, visualCategory: visualLabel, researchDomain: domain,
    keywords: keywordsFor({ ...source, taskName }, category, domain, englishTitle, keys),
  };
}

export function buildReferenceCorpusV2({
  plotReferences,
  diagramReferences,
  diagramIds = DEFAULT_DIAGRAM_IDS,
  legacyMetadata = DEFAULT_LEGACY_METADATA,
}) {
  if (!Array.isArray(plotReferences) || plotReferences.length !== 240) {
    throw new Error(`PaperBananaBench v2 requires exactly 240 plot references; received ${plotReferences?.length ?? 'invalid'}`);
  }
  if (!Array.isArray(diagramReferences)) throw new Error('PaperBananaBench v2 diagram references must be an array');
  if (diagramIds.length !== DEFAULT_DIAGRAM_IDS.length || diagramIds.some((id, index) => id !== DEFAULT_DIAGRAM_IDS[index])) {
    throw new Error('PaperBananaBench v2 requires the exact fixed 66 diagram IDs');
  }
  const plotById = new Map(plotReferences.map((item) => [item.id, item]));
  const diagramById = new Map(diagramReferences.map((item) => [item.id, item]));
  const legacyById = new Map(legacyMetadata.map((item) => [item.id, item]));
  const expectedPlotIds = Array.from({ length: 240 }, (_, index) => `ref_${index}`);
  const missing = [
    ...expectedPlotIds.filter((id) => !plotById.has(id)),
    ...diagramIds.filter((id) => !diagramById.has(id)),
  ];
  if (missing.length) throw new Error(`Source corpus is missing: ${missing.join(', ')}`);
  const corpus = [
    ...expectedPlotIds.map((id) => buildPlotEntry(plotById.get(id))),
    ...diagramIds.map((id) => buildDiagramEntry(diagramById.get(id), legacyById)),
  ];
  const validationErrors = validateReferenceCorpusV2(corpus);
  if (validationErrors.length) {
    throw new Error(`Generated zh-CN.v2 corpus failed validation: ${validationErrors.slice(0, 8).map(({ code, id, value }) => `${code}${id ? `:${id}` : ''}${value ? `:${value}` : ''}`).join(', ')}`);
  }
  return corpus;
}

export function renderReferenceCorpusModule(corpus) {
  const serialized = corpus.map((item) => `  Object.freeze(${JSON.stringify(item)}),`).join('\n');
  return `// Generated by scripts/build-reference-metadata-zh-CN-v2.mjs. Do not edit by hand.\n// PaperBananaBench dataset commit: ${PAPERBANANA_BENCH_COMMIT}\nexport const PAPERBANANA_BENCH_COMMIT = ${JSON.stringify(PAPERBANANA_BENCH_COMMIT)};\nexport const REFERENCE_METADATA_ZH_CN_V2_VERSION = ${JSON.stringify(REFERENCE_METADATA_ZH_CN_V2_VERSION)};\n\nexport const REFERENCE_METADATA_ZH_CN_V2 = Object.freeze([\n${serialized}\n]);\n\nexport const REFERENCE_METADATA_ZH_CN_V2_BY_ID = new Map(\n  REFERENCE_METADATA_ZH_CN_V2.map((item) => [item.id, item]),\n);\n`;
}

function readArchiveJson(archive, member) {
  return JSON.parse(execFileSync('unzip', ['-p', archive, member], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === '--check') args.check = true;
    else if (key === '--archive' || key === '--output') args[key.slice(2)] = argv[++index];
    else throw new Error(`Unknown argument: ${key}`);
  }
  if (!args.archive) throw new Error('Usage: build-reference-metadata-zh-CN-v2.mjs --archive <PaperBananaBench.zip> [--output <file>] [--check]');
  args.output ||= resolve(import.meta.dirname, '../src/data/reference-metadata.zh-CN.v2.js');
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const corpus = buildReferenceCorpusV2({
    plotReferences: readArchiveJson(args.archive, 'PaperBananaBench/plot/ref.json'),
    diagramReferences: readArchiveJson(args.archive, 'PaperBananaBench/diagram/ref.json'),
  });
  const rendered = renderReferenceCorpusModule(corpus);
  if (args.check) {
    if (readFileSync(args.output, 'utf8') !== rendered) throw new Error(`${args.output} is not reproducible from ${PAPERBANANA_BENCH_COMMIT}`);
    process.stdout.write(`Verified ${corpus.length} deterministic entries at ${PAPERBANANA_BENCH_COMMIT}\n`);
    return;
  }
  writeFileSync(args.output, rendered);
  process.stdout.write(`Wrote ${corpus.length} entries to ${args.output}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
