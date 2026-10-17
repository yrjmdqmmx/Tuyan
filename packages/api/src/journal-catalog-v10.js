// Source evidence and scope interpretations: docs/journal-rules-20261014/rules-v10-verification.md.
// Keep v1–v9 immutable, including earlier unresolved interpretations.
import {JOURNALS as V9,JOURNAL_SOURCES as SOURCES_V9} from './journal-catalog-v9.js';
export const JOURNAL_VERSION='2026-10-14.v10';
export const VERIFIED_ON='2026-10-14';
export const JOURNAL_SOURCES=structuredClone(SOURCES_V9);
export const JOURNALS=structuredClone(V9).map(j=>({...j,version:JOURNAL_VERSION,rules:j.rules.map(r=>({...r,version:JOURNAL_VERSION}))}));
const source=(id,title,url,scope,note,dates={})=>({id,title,url,scope,note,verification:'official-page',verifiedOn:VERIFIED_ON,...dates});
const main={stages:['initial','revision','production'],purposes:['main']};
const rule=(id,field,requirement,text,sourceIds,applicability=main)=>({id,field,requirement,text,sourceIds,applicability,value:null,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON});
const journal=id=>JOURNALS.find(j=>j.id===id);
const replace=(j,id,changes)=>Object.assign(j.rules.find(r=>r.id===id),{verifiedOn:VERIFIED_ON,...changes});

const hssc=journal('hssc');
JOURNAL_SOURCES.hsscGuide.note='本刊最终制作一般段建议 87/180 mm；照片与位图专节明确为 88/180 mm。v10 按具体图件类型采用专节，属于适用范围解释，并非官方勘误、容差或新旧替代声明。不能把其他 Nature 期刊的尺寸作为本刊规则。图件段继续直链本刊 AI 图像条款，未见可靠修订日期。';
hssc.summary='最终制作按类型检查：位图 88/180 mm，简单矢量 87/180 mm。AI 按本刊专项条件核对，集团较宽条款尚无本刊替代声明。';
replace(hssc,'hssc-width',{
 value:{oneOf:[180],pendingOneOf:[87,88],vectorOneOf:[87,180],rasterOneOf:[88,180]},
 text:'最终制作宽度建议：照片/位图按专节 88/180 mm，简单矢量按一般段 87/180 mm。按章节范围解释适用性，不把 1 mm 差异当容差或硬性禁用；混合/未知内容的单栏宽度另行确认。实际文件检查不改变像素数或模型。',
});
replace(hssc,'hssc-ai-author-guide',{text:'适用顺序：本刊投稿指南直接引用自身 AI 图像专节，所以本刊明确涉及的图像先核对该专项条件，再核对集团责任、权利和披露要求。此为工作台对来源范围的解释，未找到官方声明集团新细则撤销本刊专节；仅符合集团较宽条件时，仍不能确认本刊接收。',sourceIds:['hsscGuide','hsscPolicy','snVisualAi','snPolicyScope']});
replace(hssc,'hssc-ai-rollout',{text:'集团正在推广新的 AI 框架；推广过程不构成本刊专项规则的废止证明。2026-09-10 为公告发布日期，不是 HSSC 页面修订日期。',sourceIds:['snAiEditorGuidance','snAiUpdate']});
for(const [id,operation] of [['hssc-generate','AI 生成'],['hssc-refine','生成式精修']])replace(hssc,id,{text:`${operation}：先按本刊图像专节核对合同供图、直接讨论 AI 的研究、或基于特定可归属且可核验科学数据开发的工具等例外，并满足权利、人工核验及图内标识条件。集团较宽细则不能单独证明本刊许可；普通提示词或已有原图不自动满足例外。替代关系未获官方确认，不把这个缺口改成一概禁止。`,sourceIds:['hsscGuide','hsscPolicy','snVisualAi','snPolicyScope','snAiGuidance']});

const cell=journal('cell-reports');
JOURNAL_SOURCES.elsevierAiFaq=source('elsevierAiFaq','Elsevier · AI images and artwork FAQ','https://www.elsevier.com/en-au/about/policies-and-standards/generative-ai-policies-for-journals','正式政策的说明图类别、作者责任和图件 FAQ','本轮读取可访问的官方地区入口。说明图辅助创作明确许可；生成/修改的披露只是附加义务。已有说明图的忠实改绘按同一类别条件解释，不宣称官方逐项批准任意精修。');
cell.sourceIds.push('elsevierAiFaq');
cell.inheritance=cell.inheritance.map(i=>i.sourceId==='elsevierAiFactsheet'?{...i,scope:'官方速查表说明图 AI allowed 为 Yes；结合正式政策与本刊类别条件理解辅助创作，不能单凭披露扩展到数据/原始研究图像、GA 或封面。'}:i);
cell.inheritance.push({sourceId:'elsevierAiFaq',status:'verified',scope:'本刊直接要求遵循 Elsevier 图像政策；说明图的辅助创作许可按用途解释为包括忠实改绘，保留本刊更窄用途条件。'});
cell.summary='现行正文/GA 格式已核实；说明图创作及忠实精修有条件，数据图重绘、原始科研图像和特殊用途分别判断。';
replace(cell,'cell-refine',{requirement:'manual',aiPolicy:{operation:'generative-refine',status:'conditional'},sourceIds:['cellPolicy','elsevierAiFaq','elsevierAiFactsheet'],text:'说明图生成式精修有条件：依本刊和 Elsevier 对说明图辅助创作的许可，将作者自有概念、流程或关系的忠实改绘纳入同类操作（适用解释，不是官方逐项批准“精修”）。作者须逐项核验准确性、完整性和权利，并披露工具、版本及使用方式。含研究数据/原始影像的面板不能按说明图处理；不得改变数据、关系或科学结论。GA、TOC、封面及艺术性插图不由本条授权。'});

Object.assign(JOURNAL_SOURCES,{
 actaCheck:source('actaCheck','心理学报 · 论文自检报告（当前下载附件）','https://journal.psych.ac.cn/xlxb/CN/item/downloadFile.jsp?filedisplay=20260903180114.doc','一般研究报告；第 3 项 AI 使用、第 5 项统计报告','从本刊下载中心取得 DOC，已完整提取；元分析与理论/史附件也核到同类 AI 问题。索引发布日期和文件名时间不视为正文更新日。',{verification:'official-document'}),
 actaMetaCheck:source('actaMetaCheck','心理学报 · 元分析论文自检报告','https://journal.psych.ac.cn/xlxb/CN/item/downloadFile.jsp?filedisplay=20260903181116.docx','元分析文章；AI 使用范围与原始数据','已下载完整读取；披露不是图像操作许可。',{verification:'official-document'}),
 actaTheoryCheck:source('actaTheoryCheck','心理学报 · 理论与史论文自检报告','https://journal.psych.ac.cn/xlxb/CN/item/downloadFile.jsp?filedisplay=20260903181136.doc','理论与史文章；AI 使用范围','已下载完整读取；不把本栏目要求外推为新的图像格式。',{verification:'official-document'}),
 advancesReviewCheck:source('advancesReviewCheck','心理科学进展 · 综述评论类论文自检报告','https://journal.psych.ac.cn/xlkxjz/fileup/1671-3710/ITEM/20260903181331.doc','综述评论文章；第 4 项 AI 使用','由本刊主页下载中心直接链接，已下载完整读取。没有可靠正文修订日期。',{verification:'official-document'}),
 advancesMetaCheck:source('advancesMetaCheck','心理科学进展 · 元分析论文自检报告','https://journal.psych.ac.cn/xlkxjz/CN/item/downloadFile.jsp?filedisplay=20260903181346.docx','元分析文章；第 2 项 AI 使用','已从本刊下载中心下载完整读取；保留栏目范围，不据披露批准生成或修改。',{verification:'official-document'}),
 actaData:source('actaData','心理学报 · 论文关联数据存缴共享政策','https://journal.psych.ac.cn/xlxb/CN/column/column15.shtml','支撑论文图表和结论的关联数据；投稿阶段','存储库的 PNG/TIFF/SVG 等推荐格式是数据归档建议，不是正文图片格式接收清单。',{publishedOn:'2023-06-20'}),
 advancesData:source('advancesData','心理科学进展 · 论文关联数据存缴共享政策','https://journal.psych.ac.cn/xlkxjz/CN/column/column15.shtml','支撑论文图表和结论的关联数据；投稿阶段','本刊独立政策，不从心理学报继承；需保留隐私/保密/合法权益例外。',{publishedOn:'2023-06-20'}),
});
for(const [id,prefix,checkIds,dataId] of [
 ['acta-psychologica-sinica','acta',['actaCheck','actaMetaCheck','actaTheoryCheck'],'actaData'],
 ['advances-psychological-science','advances',['advancesReviewCheck','advancesMetaCheck'],'advancesData'],
]){
 const j=journal(id);j.sourceIds.push(...checkIds,dataId);
 j.rules.push(rule(`${prefix}-ai-checklist`,'ai','manual',`${prefix==='acta'?'研究报告、元分析和理论与史':'综述评论和元分析'}的当前投稿自检表要求说明是否使用 AI、参与程度及具体部分，并将自检报告放在稿件首页。图件生成和精修记录可供作者填写；此为已核实的披露要求，不等于所有图像操作获准。`,checkIds));
 j.rules.push(rule(`${prefix}-data-provenance`,'quality','manual','数据图需保留可追溯的原始/衍生数据及处理记录。直接支撑论文结论的数据须按本刊政策共享，并在投稿阶段提供数据可用性说明；隐私、保密或第三方权益受限时按政策说明原因与访问条件。程序不能认证数据真实或自动代为公开。',[dataId],{...main,contentTypes:['data']}));
 j.rules.push(rule(`${prefix}-data-format-scope`,'scope','manual','本刊数据存缴政策所列 PNG/TIFF/SVG 等是存储库的数据格式建议，不能据此宣布正文图格式已全部接收或将位图认证为可编辑矢量。',[dataId],{...main,contentTypes:['data']}));
 j.summary+=' 已补当前自检附件的 AI 使用说明，以及数据图来源与共享条件。';
}
journal('acta-psychologica-sinica').rules.push(rule('acta-statistical-intervals','labels','manual','一般研究报告自检表要求检查效应量和统计分析的 95% CI；图中误差线、区间及统计量需与原始分析一致。缺少数据时提示作者补充，不由模型编造区间、样本量或显著性。',['actaCheck'],{...main,contentTypes:['data']}));
const population=journal('population-research');
replace(population,'population-tables',{text:'表格采用三线表，保持结构化和可编辑；本刊“不同线条区分度高”的要求针对绘图，不据此虚构表线粗细数值。图像导出不能代替稿件表格排版。'});
population.rules.push(rule('population-series','stroke','hard','绘图的不同线条应有高区分度、清楚美观；规划与精修应保持系列可辨认，不只依赖难区分的颜色，不改变系列对应数据。官方未给出数值线宽，最终辨识度须人工核对。',['populationGuide']));
const lis=journal('library-information-service');
replace(lis,'lis-labels',{text:'图题、表题需提供对应英文；表格一般用三线表，内容较多且不易分辨时本刊模板允许画全表格线；表头不能空。不要把一般三线表要求变成无条件禁止全表格线。'});
JOURNAL_SOURCES.lisData=source('lisData','图书情报工作 · 数据共享政策','https://www.lis.ac.cn/CN/column/column38.shtml','本刊论文关联数据、可用性声明和引用；官网明确覆盖本刊','正文落款 2022-08-24，网页发布日期 2022-11-04。整体以鼓励共享为主，对直接支撑结论的数据另有“应当共享”措辞；按数据类别和受限例外人工核对，不扩大成无条件公开。',{publishedOn:'2022-11-04'});
lis.sourceIds.push('lisData');
lis.rules.push(rule('lis-data-provenance','quality','manual','本刊鼓励共享关联数据、提供可用性声明并引用数据集；直接支撑结论的数据另有“应当共享”表述，须按数据类别人工核对。数据图保留原始数据、处理方法及 DOI/持久链接；隐私、保密、伦理或第三方权益受限时按政策说明原因与访问条件，不由模型编造数据或自动公开。',['lisData'],{...main,contentTypes:['data']}));
lis.summary+=' 已补数据图关联数据、引用及受限共享条件。';
