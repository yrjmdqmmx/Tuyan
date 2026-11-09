// Evidence and interpretation: docs/journal-rules-20261014/rules-v9-verification.md.
// Archived catalogs are not rewritten when a source becomes clearer.
import {JOURNALS as V8,JOURNAL_SOURCES as SOURCES_V8} from './journal-catalog-v8.js';
export const JOURNAL_VERSION='2026-10-14.v9';
export const VERIFIED_ON='2026-10-14';
export const JOURNAL_SOURCES=structuredClone(SOURCES_V8);
const source=(id,title,url,scope,note,dates={})=>({id,title,url,scope,note,verification:'official-page',verifiedOn:VERIFIED_ON,...dates});
Object.assign(JOURNAL_SOURCES,{
 elsevierAiExplainer:source('elsevierAiExplainer','Elsevier Connect · Updated generative AI policies','https://www.elsevier.com/connect/updated-generative-ai-policies-for-journals-supporting-responsible-use-while-protecting-trust','2026 年政策说明；链接正式政策和 Researcher Academy 培训','说明性图像创作有条件允许；披露生成/修改的要求不单独证明每类修改均获许可。',{publishedOn:'2026-08-18'}),
 elsevierAiAcademy:source('elsevierAiAcademy','Elsevier Researcher Academy · Using Generative AI in Manuscript Preparation','https://researcheracademy.elsevier.com/writing-research/fundamentals-manuscript-preparation/using-generative-ai-manuscript-preparation','由 Elsevier 生成式 AI 政策负责人讲解的官方培训及附件','已读培训介绍、讲稿和下载速查表；没有可靠修订日期。培训材料仍指向正式政策及本刊指南，不能替代更窄的本刊条款。'),
 elsevierAiFactsheet:source('elsevierAiFactsheet','Elsevier Researcher Academy · AI policy factsheet for journal authors (PDF)','https://researcheracademy.elsevier.com/download/media/2905','2 页官方作者速查表；说明图、数据图、原始科研图像和 GA 分别列示','已从官方课程下载并核对第 2 页表格。说明图一栏 AI allowed 为 Yes，第 1 页具体操作为创作；没有单独列已有说明图的模型重绘许可。',{verification:'official-pdf'}),
 populationGuide:source('populationGuide','人口研究 · 投稿须知（2026）','https://rkyj.ruc.edu.cn/CN/column/column3.shtml','本刊投稿须知第 5 条图表要求；正文图','指南标题为 2026，页面发布日期为 2025-12-24；不把标题年份或本次访问日当修订日。图表题均要求中英文置于上方。',{publishedOn:'2025-12-24'}),
 actaPsychGuide:source('actaPsychGuide','心理学报 · 投稿指南','https://journal.psych.ac.cn/xlxb/CN/column/column6.shtml','本刊 3.8 插图、3.10 录用后格式；当前官方投稿入口','页面发布日期 2019-08-09，未标后续修订日期；当前官网仍列此指南。初投图中文字六号宋体；录用后数字/英文 Times New Roman。Word 要求属于稿件，不是独立图件格式。',{publishedOn:'2019-08-09'}),
 advancesPsychGuide:source('advancesPsychGuide','心理科学进展 · 投稿指南','https://journal.psych.ac.cn/xlkxjz/CN/column/column6.shtml','本刊 4.7 插图、4.9 录用后格式；当前官方投稿入口','页面发布日期 2019-12-19；图中文字六号，但本条未规定宋体，不能复制《心理学报》的字体要求。',{publishedOn:'2019-12-19'}),
 lisTemplate:source('lisTemplate','图书情报工作 · 论文写作模板','https://www.lis.ac.cn/CN/column/column41.shtml','当前导航直达的本刊模板；图件、表格和地图','Chrome 完整读取。页面发布日期 2023-07-26，正文含较新参考文献示例，不据示例猜修订日期。“≥300 像素”缺密度单位；“双栏排图最大宽度 8CM”保留适用条件。',{publishedOn:'2023-07-26',verification:'official-browser'}),
 lisAi:source('lisAi','图书情报工作 · AI 政策声明','https://www.lis.ac.cn/CN/column/column27.shtml','本刊当前出版政策菜单直达；包含制作图片和图形元素','声明署期 2023-06-14，页面发布 2023-07-04。主要内容由 AI 生成按学术不端处理；另有图件 AI 使用披露义务，但不是任意生成/修改许可。',{publishedOn:'2023-07-04',verification:'official-browser'}),
});
JOURNAL_SOURCES.hsscGuide={...JOURNAL_SOURCES.hsscGuide,verifiedOn:VERIFIED_ON,verification:'official-browser',note:'重新读取整页层级：87 mm 位于最终制作一般段；88 mm 仅在 Photographic and bitmapped images 专节；双栏均为 180 mm。非位图不受位图专节的 88 mm 约束；位图的总则/专节重叠仍无勘误或明确优先说明。本页图件段直接链接本页 Generative AI images，有限例外仍在现行投稿说明中。未标可靠修订日。'};
const v9=structuredClone(V8).map(j=>({...j,version:JOURNAL_VERSION,rules:j.rules.map(r=>({...r,version:JOURNAL_VERSION}))}));
const stages=['initial','revision','production'],purposes=['main','supplementary','graphical_abstract','toc','cover'];
const all={stages,purposes},main={stages,purposes:['main']},final={stages:['production'],purposes:['main']};
const rule=(id,field,requirement,text,sourceIds,applicability=main,value=null)=>({id,field,requirement,text,sourceIds,applicability,value,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON});
const ai=(id,operation,text,sourceIds)=>({...rule(id,'ai','pending',text,sourceIds,all),aiPolicy:{operation,status:'unspecified'}});
const cell=v9.find(j=>j.id==='cell-reports');
const cellEvidence=['elsevierAiExplainer','elsevierAiAcademy','elsevierAiFactsheet'];
cell.sourceIds.push(...cellEvidence);
cell.inheritance.push({sourceId:'elsevierAiFactsheet',status:'verified',scope:'官方培训附件确认说明图类别可以使用 AI，并要求回到正式政策及本刊指南；不是单独的精修许可，也不覆盖 Cell 本刊更窄条件。'});
const cellRefine=cell.rules.find(r=>r.id==='cell-refine');
Object.assign(cellRefine,{verifiedOn:VERIFIED_ON,sourceIds:[...cellRefine.sourceIds,...cellEvidence],text:'说明图生成式精修：本刊及 Elsevier 正式政策许可说明图创作；官方培训速查表也将说明图列为可使用 AI。仍未单独说明已有说明图的模型重绘，不能仅凭类别表或生成/修改披露要求确认每种精修均获准，也没有依据宣布一概禁止。须核对是否始终为说明图、准确性与授权；数据图、原始科研图像、GA 和封面按各自规则。'});
const hssc=v9.find(j=>j.id==='hssc');
hssc.summary='87 mm 属最终制作一般建议，88 mm 属位图专节；可排除位图的简单 SVG 按 87/180 mm 检查，位图单栏差异仍待确认。AI 本刊有限例外与集团细则均保留。';
Object.assign(hssc.rules.find(r=>r.id==='hssc-width'),{verifiedOn:VERIFIED_ON,value:{oneOf:[180],pendingOneOf:[87,88],vectorOneOf:[87,180]},text:'最终制作：一般段单栏 87 mm、双栏 180 mm；88 mm 仅出现在照片/位图专节。可排除位图的简单 SVG 按一般建议 87/180 mm 检查；位图或不能判明内容的文件，87/88 mm 仍需确认。提交前未读取实际文件时不凭 SVG 扩展名判为矢量。'});
for(const id of ['hssc-generate','hssc-refine']){
 const r=hssc.rules.find(r=>r.id===id);r.sourceIds=[...new Set([...r.sourceIds,'hsscGuide'])];r.verifiedOn=VERIFIED_ON;
 r.text+=' 本次重读发现现行投稿指南图件段仍直接指向本页较窄的 AI 图像例外，不能只凭集团公告的日期推定本刊条款已撤销。';
}
hssc.rules.push(rule('hssc-ai-author-guide','scope','manual','已核实：本刊现行投稿指南内仍有专门 AI 图像条款，并由图件段直接引用。集团说明涵盖创建/修改/增强，但没有给出 HSSC 此条款的撤销日期或冲突优先级。此处明确记录两个适用来源，既不把披露当许可，也不把未说明的操作补成禁令。',['hsscGuide','hsscPolicy','snVisualAi','snAiEditorGuidance'],all));

const domestic=(id,name,publisher,subjects,sourceIds,rules,summary)=>({id,name,publisher,subjects:['人文社科',...subjects],status:'partial',version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,defaults:{widthMm:85},sourceIds,inheritance:[],summary,rules:[
 ...rules,
 rule(`${id}-unverified-specs`,'scope','pending','已读本刊资料没有可直接用于全部正文图的完整独立文件格式、物理尺寸、像素密度及色彩阈值；未查到不等于官方未规定。85 mm 是工作台初始值，不是本刊栏宽。字体、标题和科学真实性须人工核对。',sourceIds),
 ...['generate','generative-refine','non-generative-edit'].map(operation=>ai(`${id}-${operation}`,operation,`${operation==='generate'?'AI 生成':operation==='generative-refine'?'生成式精修':'非生成式调整'}：已读本刊材料未给出当前操作的完整许可边界，不能据未写明判断允许或禁止。正文条件不外推到补充图、GA、TOC、封面；模型不能修改研究数据或科学结论。`,sourceIds)),
 ]});
v9.push(
 domestic('population-research','人口研究','中国人民大学 · 人口研究编辑部',['人口学','社会学','经济学','Population Research'],['populationGuide'],[
  rule('population-labels','labels','hard','图表应简洁清晰并置于正文相应位置；中英文图题/表题均置于上方居中，必要的资料来源与注释放在下方。不能套用其他期刊的下置图题习惯。',['populationGuide']),
  rule('population-tables','layout','manual','表格使用三线表，线条粗细区分清楚；表格保持结构化和可编辑，不能以图像导出代替稿件表格排版。',['populationGuide']),
 ],'已接入本刊中英文图题位置、来源注释与清晰度要求；统一尺寸、图件格式和 AI 操作边界未完整核实。'),
 domestic('acta-psychologica-sinica','心理学报','中国心理学会 / 中国科学院心理研究所',['心理学','行为科学','Acta Psychologica Sinica'],['actaPsychGuide'],[
  rule('acta-figure-font','font','hard','插图中文字用六号宋体，图像和照片应清晰，照片要有良好对比度与层次。六号为官方原表述，不由模型宣称栅格字体已验证。',['actaPsychGuide']),
  rule('acta-final-font','font','hard','录用后的数字和英文使用 Times New Roman；插图文字六号。与中文宋体按文字类别区分，当前自动检查不能认证字体或字号。',['actaPsychGuide'],final),
  rule('acta-statistics','labels','manual','统计符号、上下标及数据表述按本刊规范人工核对；不得为了字体、版面或期刊要求更改数值、统计量和科学结论。',['actaPsychGuide']),
 ],'已接入六号宋体、录用后英文/数字字体及清晰度规范；无独立图片格式和统一 DPI 的已核实阈值。'),
 domestic('advances-psychological-science','心理科学进展','中国科学院心理研究所 / 中国心理学会',['心理学','行为科学','综述','Advances in Psychological Science'],['advancesPsychGuide'],[
  rule('advances-figure-font','font','hard','图中文字使用六号字，图像达到清晰印刷要求；本条没有规定宋体，不继承其他心理学期刊的字体。',['advancesPsychGuide']),
  rule('advances-final-font','font','hard','录用后的数字和英文使用 Times New Roman；插图六号字。当前无法自动认证最终字号与印刷可读性。',['advancesPsychGuide'],final),
 ],'已接入六号图中文字及录用后英文/数字字体；未将邻刊的宋体要求套用，AI 操作边界待确认。'),
 domestic('library-information-service','图书情报工作','中国科学院文献情报中心 · 图书情报工作杂志社',['图书馆学','情报学','信息资源管理','数字人文','Library and Information Service'],['lisTemplate','lisAi'],[
  rule('lis-font','font','hard','图中文字用小六号（7 磅），文字清晰；此为本刊模板明确数值，实际字体和最终字号仍须人工确认。',['lisTemplate']),
  rule('lis-labels','labels','hard','图题、表题需提供对应英文；一般使用三线表，表头不能空。表格结构不能由栅格图片替代。',['lisTemplate']),
  rule('lis-width','width','manual','模板写“需要双栏排图的最大宽度是 8CM”；需先确认具体排图方式，不能将 80 mm 当作所有单/双栏图的通用硬上限。',['lisTemplate']),
  rule('lis-dpi','dpi','pending','模板写“图的分辨率大于等于 300 像素”，没有给出 dpi/ppi 或宽高维度，不能自行补成 300 dpi，也不据任一边达到 300 px 宣称通过。',['lisTemplate']),
  rule('lis-map','quality','manual','地图图件需按本刊地图要求核对审图与标准底图；不要让模型重绘或改动地理边界。仅涉及地图时适用，程序不能认证审图通过。',['lisTemplate']),
  rule('lis-ai-disclosure','ai','manual','本刊声明：若论文主要内容由 AI 生成，按学术不端处理；使用 AI 制作图片/图形元素等须在数据来源、方法设计或结语中写明工具、详细过程、作用和贡献，由编辑评判原创性。披露条款不是所有生成或精修的许可。',['lisAi'],all),
 ],'已接入 7 磅图中文字、双语图题与本刊 AI 声明；8 cm 适用排图方式及“300 像素”单位仍需确认。'),
);
export const JOURNALS=v9;
