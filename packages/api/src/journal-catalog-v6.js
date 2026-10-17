// Scope and evidence: docs/journal-rules-20261014/rules-v6-verification.md.
// Re-version existing entries without pretending their sources were re-verified today.
import {JOURNALS as V5,JOURNAL_SOURCES as SOURCES_V5} from './journal-catalog-v5.js';
export const JOURNAL_VERSION='2026-10-14.v6';
export const VERIFIED_ON='2026-10-14';
const stages=['initial','revision','production'];
const main={stages,purposes:['main']};
const mainSupplement={stages,purposes:['main','supplementary']};
const all={stages,purposes:['main','supplementary','graphical_abstract','toc','cover']};
const initial={...main,stages:['initial','revision']};
const final={...main,stages:['production']};
const source=(id,title,url,scope,note,dates={})=>({id,title,url,scope,note,verification:'official-page',verifiedOn:VERIFIED_ON,...dates});
export const JOURNAL_SOURCES={
 ...structuredClone(SOURCES_V5),
 sageOpen:source('sageOpen','Sage Open · Submission Guidelines','https://journals.sagepub.com/author-instructions/SGO','本刊投稿；直接链接图件规范和期刊 AI 政策','本刊列 300 dpi；通用图件页进一步区分线稿 800 dpi。不是将 Word 稿件格式套给图片。页面未标修订日期。'),
 sageArtwork:source('sageArtwork','Sage · Preparing your manuscript / Artwork guidelines','https://www.sagepub.com/journals/information-for-authors/preparing-your-manuscript','由 Sage Open 图件章节直接引用；图像与数据图','TIFF/JPEG 是图片常用格式，EPS 是图表/线稿优选，不是穷尽接收列表。通用印刷黑白建议不变成本刊仅黑白的强制要求。'),
 sageAi:source('sageAi','Sage · Artificial intelligence policy','https://www.sagepub.com/journals/publication-ethics-policies/artificial-intelligence-policy','Sage Open 本刊作者政策直接引用的期刊政策','明确列出代表性插图、信息图生成及数据可视化辅助；不从披露段落单独推定许可。图书/教材 AI 政策不用于本刊。'),
 hsscGuide:source('hsscGuide','HSSC · Submission guidelines','https://www.nature.com/palcomms/author-instructions/submission-instructions','本刊正文图初投、修改、最终制作及补充材料','已取得完整页面。一般段单栏 87 mm、照片/位图段 88 mm；两处双栏均为 180 mm。保留差异，不自选单栏值。未标修订日期。'),
 hsscPolicy:source('hsscPolicy','HSSC · Editorial and publishing policies','https://www.nature.com/palcomms/journal-policies/editorial-and-publishing-policies','本刊 Generative AI images 与图像完整性章节','与本刊投稿指南一致列有限例外；没有发现其被集团通用细则明确替代的声明。采用本刊具体条件，保留集团页面作对照，不能证明用户满足例外。'),
 hsscChecklist:source('hsscChecklist','HSSC · Submission checklists','https://www.nature.com/palcomms/author-instructions/checklists','初投和修改稿的图件与表格清单','两阶段均写图表不接收 PDF，而详细指南列矢量 PDF。无可靠修订日期或取代声明；仅 PDF 接收保留冲突，不扩展到所有格式。'),
 cellSupport:source('cellSupport','Cell Press Support · Journal Article Publishing','https://www.elsevier.support/cell-press/answer/where-can-i-find-information-on-journal-article-publishing','Cell Press 官方作者服务指引','页面引导至 Elsevier 作者支持及按刊查找作者页；没有给出 Cell Reports 图件阈值或 AI 专项条款。所链 HealthAdvance 返回 403。',{updatedOn:'2026-03-02'}),
 cellCnJournals:source('cellCnJournals','Cell Press 中文官网 · 系列期刊','https://cellpress.elsevier.cn/journals','官方中文期刊导航','Cell Reports 条目仍指向 cell.com 本刊主页；不是现行指南镜像。本轮本刊 Authors 浏览器仍停留安全验证。'),
 cellSubmission:source('cellSubmission','Cell Reports · Editorial Manager 公开导航','https://www.editorialmanager.com/cell-reports/default.aspx','公开投稿系统的作者指南链接；未登录或提交','Instructions For Authors 仍指向 cell.com/cell-reports/information-for-authors，正文请求 403。此导航及页面开发提示不能替代现行指南。'),
};
const rule=(id,field,requirement,text,sourceIds,applicability=main,value=null,aiPolicy)=>({id,field,requirement,text,sourceIds,applicability,value,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,...(aiPolicy?{aiPolicy}:{})});
const ai=(id,operation,status,text,sourceIds,scope=mainSupplement)=>rule(id,'ai',status==='conditional'?'manual':status==='prohibited'?'hard':status==='conflict'?'conflict':'pending',text,sourceIds,scope,null,{operation,status});
const v6=structuredClone(V5).map(j=>({...j,version:JOURNAL_VERSION,rules:j.rules.map(r=>({...r,version:JOURNAL_VERSION}))}));
const cell=v6.find(j=>j.id==='cell-reports');
cell.sourceIds.push('cellSupport','cellCnJournals','cellSubmission');
cell.verifiedOn=VERIFIED_ON;
cell.summary='已续查官方中文导航、Cell Press 支持与投稿系统入口；仍未取得现行本刊技术清单与 AI 专项条款，历史规格不作为当前阈值。';
cell.inheritance.push({sourceId:'cellSupport',status:'pending',scope:'官方支持页引导 Elsevier 作者服务，但没有本刊图件/AI 的明确覆盖条款，不能据导航关系补成许可。'});
cell.rules.push(rule('cell-current-access','scope','pending','2026-10-14 续查：官方中文导航和投稿系统仍链接本刊主站；Cell Press 支持页没有刊载本刊规则。现行技术清单、历史 GA 的有效性与本刊 AI 适用关系仍缺直接证据。',['cellSupport','cellCnJournals','cellSubmission'],all));
v6.push({
 id:'sage-open',name:'Sage Open',publisher:'Sage',subjects:['人文社科','社会科学','行为科学','人文学科','经济学','社会学','心理学'],status:'partial',
 summary:'已接入本刊 300 dpi 与线稿 800 dpi、图件制作和 AI 边界；尺寸未规定，EPS 导出和字体自动认证未实现。',
 version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,defaults:{widthMm:85},sourceIds:['sageOpen','sageArtwork','sageAi'],
 inheritance:[{sourceId:'sageArtwork',status:'verified',scope:'Sage Open 的 Artwork 章节直接链接通用图件页；本刊 300 dpi 与通用线稿 800 dpi 按内容分类同时保留。'},{sourceId:'sageAi',status:'verified',scope:'本刊 Authorship 章节直接链接此期刊 AI 政策；不采用其他 Sage 期刊的特殊限制或图书政策。'}],
 rules:[
  {...rule('sage-format','format','recommendation','图片常用 TIFF/JPEG，图表和线稿优选 EPS；非穷尽列表，PNG/SVG 的最终接收需确认。',['sageOpen','sageArtwork'],main,['tiff','jpeg','eps']),openFormatList:true},
  rule('sage-dpi','dpi','hard','本刊图件 300 dpi；所链接规范要求栅格至少 300 dpi、线稿至少 800 dpi。按最终排版尺寸与作者确认的图像构成检查。',['sageOpen','sageArtwork'],main,{byKind:{color:300,grayscale:300,lineart:800}}),
  rule('sage-size','width','unspecified','已读材料未给本刊统一单/双栏宽度；85 mm 为工作台初始值。原图不得通过后期放大冒充原生细节。',['sageOpen','sageArtwork']),
  rule('sage-font','font','recommendation','字体和字号保持一致，通常使用无衬线字体；未列本刊统一字号。',['sageArtwork']),
  rule('sage-figure-labels','panels','hard','图按正文出现顺序编号；图内标题和引用关系须人工核对。',['sageOpen']),
  rule('sage-data','quality','manual','数据可视化须保留可核对的原始数据；不能把生成数据或新研究证据当作示意图提交。',['sageArtwork','sageAi'],{...mainSupplement,contentTypes:['data']}),
  rule('sage-packaging','packaging','manual','Word 内创建的图表放正文；外部图件分别上传并在正文留位置说明。图中表格应保留为可编辑表格。匿名审稿须另行检查。',['sageOpen','sageArtwork']),
  ai('sage-generate','generate','conditional','AI 生成：政策明确列出代表性插图/信息图及数据可视化辅助；需核对原始来源、披露并由编辑评估，禁止虚构数据或将生成图冒充原创研究证据。',['sageAi']),
  ai('sage-refine','generative-refine','unspecified','生成式精修：新增内容仍受生成内容的真实性、披露及禁用要求约束；政策未逐项授予局部重绘/替换许可，不能把文字润色豁免扩展到改图。',['sageAi']),
  ai('sage-nongenerative','non-generative-edit','conditional','非生成式调整须均匀作用于整幅原始图，不歪曲数据；局部修饰不适当，处理方式应披露并保留原始数据。不能据此许可生成式精修。',['sageArtwork']),
  ai('sage-special','generate','unspecified','GA、TOC、封面的本刊接收和 AI 专项条件未核实，普通代表性插图条件不自动成为这些用途的许可。',['sageOpen','sageAi'],{...all,purposes:['graphical_abstract','toc','cover']}),
  ai('sage-special-refine','generative-refine','unspecified','特殊用途的生成式精修适用性须另行确认。',['sageOpen','sageAi'],{...all,purposes:['graphical_abstract','toc','cover']}),
 ]
},{
 id:'hssc',name:'Humanities and Social Sciences Communications',publisher:'Springer Nature',subjects:['人文社科','人文学科','社会科学','经济学','社会学','HSSC'],status:'partial',
 summary:'已接入本刊图件格式、初投像素密度和最终制作规范；单栏 87/88 mm 差异保留，AI 仅按本刊有限例外人工判断。',
 version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,defaults:{widthMm:180},sourceIds:['hsscGuide','hsscPolicy','hsscChecklist','snVisualAi'],
 inheritance:[{sourceId:'hsscPolicy',status:'verified',scope:'本刊投稿指南与本刊编辑政策均有相同的图像例外；规则采用本刊具体条件，不直接复制 Scientific Reports 的适用结论。'},{sourceId:'snVisualAi',status:'conflict',scope:'集团视觉细则与本刊有限例外表述不同；未发现替代声明，不能确认较宽条件已覆盖本刊。保留两份来源及本刊条件。'}],
 rules:[
  {...rule('hssc-format','format','hard','审稿图件接收 PNG、SVG、TIFF 等列明格式；PDF 在详细指南与投稿清单之间冲突，接收条件待确认。文件扩展名被接收不证明内容是真矢量。',['hsscGuide','hsscChecklist'],initial,['psd','ai','eps','tiff','jpeg','png','ps','gif','ppt','pptx','bmp','vsd','cdx','svg','emf','xlsx']),pendingFormats:['pdf']},
  rule('hssc-pdf-review','format','conflict','初投与修改稿清单均排除 PDF；详细指南列矢量 PDF。两页未提供可确定优先级的更新信息，PDF 不作接收或拒绝的确定性结论。',['hsscGuide','hsscChecklist'],{...initial,formats:['pdf']}),
  rule('hssc-production-format','format','hard','最终独立图件按详细指南支持 PNG、SVG、TIFF 等列明格式；PDF 须为支持矢量的文件，不能仅凭扩展名认证。',['hsscGuide'],final,['psd','ai','eps','tiff','jpeg','pdf','png','ps','gif','ppt','pptx','bmp','vsd','cdx','svg','emf','xlsx']),
  rule('hssc-pdf-vector','vector','manual','最终 PDF 的矢量内容须人工核对，当前工作台不生成或认证可编辑 PDF。',['hsscGuide'],{...final,formats:['pdf']}),
  rule('hssc-initial-dpi','dpi','hard','初投/审稿图件至少 300 dpi；检查指定排版宽度下的实际像素密度。',['hsscGuide'],initial,{min:300}),
  rule('hssc-initial-size','fileSize','recommendation','审稿图优选小于 1 MB；单位边界未定义，边界区间待确认。',['hsscGuide'],initial,{boundaryMB:1}),
  rule('hssc-width','width','conflict','最终制作：一般段单栏 87 mm，照片/位图段 88 mm；双栏均为 180 mm。保留单栏差异，不自动判定 87/88 mm 哪个优先。当前初始排版值采用双方一致的双栏宽度。',['hsscGuide'],final),
  rule('hssc-vector','vector','manual','最终线稿、图表和示意图须优先保留原生矢量（EPS 优选），仅必要时用位图；嵌入 PNG 的 SVG 不因此成为可编辑矢量。例外必要性与可编辑性须人工核对。',['hsscGuide'],{...final,contentTypes:['schematic','data']}),
  rule('hssc-final-raster','format','recommendation','最终照片/位图宜用 TIFF（优选）或 JPEG；这条偏好与总接收列表分别展示。',['hsscGuide'],{...final,contentTypes:['primary','illustration']},['tiff','jpeg']),
  rule('hssc-final-dpi','dpi','recommendation','最终照片和位图如可行按 300 dpi 准备；不能把审稿硬要求与最终推荐的强度混为一谈。',['hsscGuide'],{...final,formats:['png','tiff','jpeg']},{min:300}),
  rule('hssc-color','color','hard','最终位图可为 RGB 或 CMYK；期刊不转换色彩模式。',['hsscGuide'],{...final,formats:['png','tiff','jpeg']},{spaces:['srgb','rgb','cmyk']}),
  rule('hssc-font','font','hard','图中字用清晰无衬线字体，各图同字体同字号；缩印后应清楚可读。没有统一数字字号。',['hsscGuide']),
  rule('hssc-stroke','stroke','hard','最终图最细线条至少 1 pt；当前文件检查不能可靠认证所有线宽。',['hsscGuide'],final),
  rule('hssc-panels','panels','hard','多面板用粗体小写 a、b 等，字号与图内其他字一致；逻辑相关面板合并为一张图。',['hsscGuide']),
  rule('hssc-labels','labels','manual','保持数值、变量与统计结论；需要时标误差线并在图注说明，避免截断直方图纵轴夸大差异；白底且减少装饰。',['hsscGuide']),
  rule('hssc-packaging','packaging','manual','一图一文件；主图图注集中放稿件末尾。图中及文件元数据不得泄露匿名审稿身份；最多 12 个图/表展示项须按整稿核对。',['hsscGuide']),
  rule('hssc-supplement','packaging','manual','补充图应带临近图注，编号独立；除表格/音视频外按官方要求合并补充文件，50 MB 为合并文件上限，不能只检查单图就声称满足。',['hsscGuide'],{...all,purposes:['supplementary']}),
  ai('hssc-generate','generate','conditional','AI 生成仅按本刊列明例外人工判断：出版方合同机构合法供图、关于 AI 的研究逐案审查、或基于特定可归属且可核验科学数据开发的工具。普通通用模型加提示词不自动满足例外；例外图内须标明 AI 生成。',['hsscGuide','hsscPolicy'],all),
  ai('hssc-refine','generative-refine','conditional','生成式精修新增内容同受本刊生成图像例外限制；不能借非生成式调整条款许可重绘。须人工证明适用条件并按本刊审核，当前工作台不认证例外成立。',['hsscPolicy'],all),
  ai('hssc-nongenerative','non-generative-edit','conditional','非生成式机器学习处理、组合或增强已有图像须在图注披露，供逐案审查；保留原图和数据完整性。',['hsscPolicy'],all),
 ]
});
export const JOURNALS=v6;
