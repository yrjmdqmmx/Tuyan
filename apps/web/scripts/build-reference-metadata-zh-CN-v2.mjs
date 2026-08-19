#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { REFERENCE_METADATA_ZH_CN as DEFAULT_LEGACY_METADATA } from '../src/data/reference-metadata.zh-CN.v1.js';
import { PAPERBANANA_BENCH_V2_DIAGRAM_NUMBERS } from '../src/data/reference-corpus-quality.js';

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
  ref_254: '频谱调节注意力机制的性能提升',
  ref_257: '近无限上下文训练的同心环序列并行框架',
  ref_278: '直线斯坦纳最小树的针点训练与障碍测试',
  ref_297: '视频对话模型的智能体推理',
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
  const sourceIndex = Number(source.id.slice(4));
  const shortTemplates = [
    `以${visualLabel}呈现「${titleZh}」，依据源数据中的 ${keys.length} 个关键字段完成分组、对比与趋势表达`,
    `采用${visualLabel}组织「${titleZh}」，将源数据的 ${keys.length} 组维度转化为清晰的视觉对比`,
    `围绕「${titleZh}」构建${visualLabel}，用 ${keys.length} 组源数据展示分布、差异与变化关系`,
    `该${visualLabel}解读「${titleZh}」，按原始视觉意图突出 ${keys.length} 组数据维度间的关联`,
  ];
  const shortIntroZh = finishChineseSentence(shortTemplates[sourceIndex % shortTemplates.length]);
  const detailZh = finishChineseSentence(`该${domain}案例根据源数据的 ${keys.length} 组字段与原始视觉意图，将「${titleZh}」组织为${visualLabel}。围绕「${titleZh}」，图中通过坐标、分组、图例和视觉层次传达数据关系，适合参考其信息结构、比较方式与重点强调策略`);
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
  const shortIntroZh = finishChineseSentence(`以${visualLabel}梳理「${titleZh}」的核心模块、信息流向与方法关系`);
  const detailZh = finishChineseSentence(`该${domain}案例围绕「${titleZh}」展开，依据原始方法内容与视觉意图，用${visualLabel}串联整体方法、模块关系与信息流向。围绕「${titleZh}」，图示保留既有中文标题所概括的研究重点，可用于参考研究逻辑的分层、连接与视觉强调方式`);
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
  const plotById = new Map(plotReferences.map((item) => [item.id, item]));
  const diagramById = new Map(diagramReferences.map((item) => [item.id, item]));
  const legacyById = new Map(legacyMetadata.map((item) => [item.id, item]));
  const expectedPlotIds = Array.from({ length: plotReferences.length }, (_, index) => `ref_${index}`);
  const missing = [
    ...expectedPlotIds.filter((id) => !plotById.has(id)),
    ...diagramIds.filter((id) => !diagramById.has(id)),
  ];
  if (missing.length) throw new Error(`Source corpus is missing: ${missing.join(', ')}`);
  return [
    ...expectedPlotIds.map((id) => buildPlotEntry(plotById.get(id))),
    ...diagramIds.map((id) => buildDiagramEntry(diagramById.get(id), legacyById)),
  ];
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
