// Official evidence checked 2026-10-13; prior catalogs remain immutable task evidence.
// Scope/date/precedence reasoning: docs/journal-rules-20261013/rules-v4-verification.md.
import {JOURNALS as V3,JOURNAL_SOURCES as SOURCES_V3} from './journal-catalog-v3.js';
export const JOURNAL_VERSION='2026-10-13.v4';
export const VERIFIED_ON='2026-10-13';
const stages=['initial','revision','production'];
const main={stages,purposes:['main','supplementary']};
const ga={stages:['production'],purposes:['graphical_abstract']};
const source=(id,title,url,scope,note,dates={})=>({id,title,url,scope,note,verification:'official-page',verifiedOn:VERIFIED_ON,...dates});
export const JOURNAL_SOURCES={
 ...structuredClone(SOURCES_V3),
 snAiGuidance:source('snAiGuidance','Springer Nature · AI guidance and FAQ','https://group.springernature.com/gp/group/ai/ai-guidance-for-researchers-editors-reviewers','概要与 FAQ；例外直接链接正式期刊政策','未标页面修订日期。Generally no 后有例外链接；按该链接进入的视觉细则核对具体条件，不能解读为绝对禁令。'),
 snVisualAi:source('snVisualAi','Springer Nature · AI use in manuscript preparation','https://www.springernature.com/gp/policies/editorial-policies/ai-manuscript-preparation','正式期刊政策的视觉内容细则','未标页面修订日期。具体图像条件由此细则解释；不能据披露、文件格式或只有提示词认定满足条件。'),
 snAiUpdate:source('snAiUpdate','Springer Nature · AI 政策更新公告','https://group.springernature.com/de/group/media/press-releases/sn-policy-responsible-ai-use/53209516','2026-09-10 政策框架更新；同时链接正式政策和 FAQ','公告日期不是两份页面各自的修订日期，也不是 FAQ 作废声明。',{publishedOn:'2026-09-10'}),
 cellPolicy:source('cellPolicy','Cell Reports · Journal policies','https://www.cell.com/cell-reports/information-for-authors/journal-policies','本刊现行政策；仍未取得正文','本刊政策入口仍受访问限制，不能以相邻刊物的社论替代。'),
 cellGaGuide:source('cellGaGuide','Cell Mentor · Graphical Abstract 制作说明','https://crosstalk.cell.com/blog/attract-readers-at-a-glance-with-your-graphical-abstract','录用后图形摘要；含 Cell Reports 编辑及出版人员说明','官方历史说明可读；尚未与 2026 年本刊最终材料清单对照。不是正文图规格，也不授予 AI 许可。',{publishedOn:'2018-04-04',updatedOn:'2018-09-10'}),
 cellImageScreen:source('cellImageScreen','Cell Mentor · 图像筛查与原始数据核对','https://crosstalk.cell.com/blog/what-to-do-if-your-paper-is-flagged-in-image-screening?hs_amp=true','正文及补充科研图件；直接讨论 Cell Reports 案例','2019 年官方作者指导，支持原始数据与图件对应的人工检查；不是生成式 AI 许可。',{publishedOn:'2019-05-30'}),
 cellPatterns:source('cellPatterns','Patterns · Don’t black box your research','https://doi.org/10.1016/j.patter.2026.101663','2026 年相邻刊物社论；只用于政策溯源','官方可索引全文提及解释性图件的有限 AI 使用，并指向 Cell Press / Elsevier 新政策。不能推定 Cell Reports 已采用相同专项条件。',{publishedOn:'2026-09-11'}),
};
JOURNAL_SOURCES.cellPolicy.verification='unverified-access';
const v4=structuredClone(V3).map(j=>({...j,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,rules:j.rules.map(r=>({...r,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON}))}));
const rule=(id,field,requirement,text,sourceIds,applicability,value=null,aiPolicy)=>({id,field,requirement,text,sourceIds,applicability,value,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,...(aiPolicy?{aiPolicy}:{})});
const sr=v4.find(j=>j.id==='scientific-reports');
sr.summary='正文图与补充图的 AI 生成、生成式精修按可核验来源等具体条件判断；需人工核对。图形摘要不被本刊接受。';
sr.sourceIds.push('snAiUpdate');
sr.inheritance=sr.inheritance.filter(i=>i.sourceId!=='snAiGuidance').concat({sourceId:'snAiGuidance',status:'verified',scope:'FAQ 的例外链接指向正式期刊政策，再进入视觉细则；据链接与适用范围采用具体条件解释一般表述。这是证据解读，不是官方发布的取代声明。'});
sr.rules=sr.rules.filter(r=>!['srep-generate','srep-refine'].includes(r.id)).concat([
 rule('srep-generate','ai','manual','AI 生成正文/补充图：附条件适用。须有可独立核验、可归属的来源及人工验证；披露模型、用途、贡献并核对权利。只有提示词或不可核验的画面不满足条件。工作台不能自动证明这些条件已满足。',['snVisualAi','snAiGuidance'],main,null,{operation:'generate',status:'conditional'}),
 rule('srep-refine','ai','manual','生成式精修正文/补充图：同样受来源可核验、忠实表达、人工验证、权利及披露条件约束。已有原图不等于来源已核验；不得借精修改写研究证据。当前模型精修不能按非生成式调整申报。',['snVisualAi','snAiGuidance'],main,null,{operation:'generative-refine',status:'conditional'}),
]);
const cell=v4.find(j=>j.id==='cell-reports');
cell.summary='已取得官方图形摘要历史规格与图像筛查指导；现行正文图规范和本刊 AI 专项条件仍缺核实。';
cell.sourceIds.push('cellGaGuide','cellImageScreen','cellPatterns');
cell.inheritance.push({sourceId:'cellGaGuide',status:'verified',scope:'该官方说明有 Cell Reports 编辑参与；可确认 2018 年录用后 GA 指导内容，不能推定为现行正文图规范。'});
cell.rules.find(r=>r.id==='cell-pending').text='已取得官方 GA 历史说明及图像筛查指导；本刊现行正文图格式、尺寸、DPI、字体仍未取得，不能将 GA 规格用于正文或补充图。';
cell.rules.find(r=>r.id==='cell-non-generative').text='非生成式调整：2019 年本刊相关官方指导要求亮度/对比度处理一致且不改变结论、保留对应原始数据；现行 AI 工具专项范围尚未取得。这不授权模型重绘或生成式精修。';
cell.rules.find(r=>r.id==='cell-non-generative').sourceIds.push('cellImageScreen');
cell.rules.push(
 rule('cell-ga-reference-size','pixelDimensions','pending','官方历史 GA 规格（2018-09-10）：单面板、1200 × 1200 px、300 dpi、正方形。现行要求待对照，不作为本轮文件达标阈值。',['cellGaGuide'],ga),
 rule('cell-ga-reference-format','format','pending','官方历史 GA 格式（2018-09-10）：TIFF、PDF 或 JPG，不接受 PowerPoint。仅供查证，不能据此宣布当前 PNG/TIFF 已符合本刊投稿要求。',['cellGaGuide'],ga),
 rule('cell-ga-reference-font','font','pending','官方历史 GA 字体（2018-09-10）：Arial、12–16 pt。现行适用性和实际字体均未自动确认。',['cellGaGuide'],ga),
 rule('cell-image-integrity','quality','manual','人工核对原始数据与图件/面板对应关系、拼接及重复使用说明；保留原始数据，亮度/对比度处理保持一致且不改变结论。依据 2019 年官方指导；本工具不验证实验真实性。',['cellImageScreen'],{...main,contentTypes:['data','primary']}),
);
export const JOURNALS=v4;
