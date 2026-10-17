// Official browser/PDF evidence: docs/journal-rules-20261014/rules-v8-verification.md.
// Earlier catalogs remain byte-for-byte archives, including their unresolved evidence.
import {JOURNALS as V7,JOURNAL_SOURCES as SOURCES_V7} from './journal-catalog-v7.js';
export const JOURNAL_VERSION='2026-10-14.v8';
export const VERIFIED_ON='2026-10-14';
export const JOURNAL_SOURCES=structuredClone(SOURCES_V7);
const source=(id,title,url,scope,note,verification='official-browser')=>({id,title,url,scope,note,verification,verifiedOn:VERIFIED_ON});
Object.assign(JOURNAL_SOURCES,{
 cell:source('cell','Cell Reports · Information for authors','https://www.cell.com/cell-reports/information-for-authors','本刊现行作者指南与阶段入口','Chrome 已读取正文；初投不必满足其他章节的制作格式。页面未列可靠修订日期。'),
 cellPolicy:source('cellPolicy','Cell Reports · Journal policies','https://www.cell.com/cell-reports/information-for-authors/journal-policies#generative','本刊 AI 图像与图像处理专项政策','本刊直接要求遵循 Elsevier 政策，并另列说明图、数据图、研究图像、GA 和封面条件。不能以集团较宽封面许可覆盖本刊更窄例外。'),
 cellFinal:source('cellFinal','Cell Reports · Final submission','https://www.cell.com/cell-reports/information-for-authors/final-submission','最终生产文件、正文图与图形摘要','直接链接 Cell Press 图件指南、本刊最终清单和本次读取的 GA PDF；要求正文图遵循图件指南。'),
 cellFinalChecklist:source('cellFinalChecklist','Cell Reports · Final file requirements PDF','https://www.cell.com/pb-assets/journals/EM/MasterFFCs/CELREPFFC-1790092533613.pdf','本刊终稿；第 3 页正文图、第 4 页 GA 与补充材料','从本刊当前 final-submission 链接下载，全文提取并逐页核对关键规格。没有把文件名数字当发布日期。','official-pdf'),
 cellFigures:source('cellFigures','Cell Press · Figure guidelines','https://www.cell.com/information-for-authors/figure-guidelines','本刊明确引用的通用图件指南；审稿与制作分别适用','通用接收列表比本刊终稿 TIFF/PDF 清单宽；终稿按本刊清单。85/114/174 mm 是不同栏布局的最大宽度，非只能取这几个数。'),
 cellGaVersioned:source('cellGaVersioned','Cell Press · Graphical abstract guidelines PDF','https://www.cell.com/pb/assets/raw/shared/figureguidelines/GA_guide-1780933691430.pdf','本刊最终投稿页直接链接的现行 GA 指南','8 页全文读取，第 2 页图像核对：1200×1200 px、300 dpi、Arial 8–12 pt；通用生成式 AI 不得制作 GA，专用科学插图工具中的 AI 有条件允许。无可靠修订日期。','official-pdf'),
 snAiEditorGuidance:source('snAiEditorGuidance','Springer Nature · AI editor guidance','https://www.springernature.com/gp/policies/editorial-policies/ai-editor-guidance','集团编辑实施指导；框架与工作流采用过程','明确存在政策与投稿/审稿工作流的推广采用期；未指明 HSSC 本刊图像条款的废止日期或优先级。','official-page'),
});
// Keep the older Elsevier source record used by other journals unchanged in this version.
JOURNAL_SOURCES.cellElsevier=source('cellElsevier','Elsevier · Generative AI policies for journals','https://www.elsevier.com/about/policies-and-standards/generative-ai-policies-for-journals','经 Cell 本刊明确引用的集团政策；图像三大类与操作边界','页面注明 Policy updated June 2026；披露生成/修改的 FAQ 不单独授予修改许可。');
JOURNAL_SOURCES.cellElsevier.updatedOn='2026-06';
const v8=structuredClone(V7).map(j=>({...j,version:JOURNAL_VERSION,rules:j.rules.map(r=>({...r,version:JOURNAL_VERSION}))}));
const stages=['initial','revision','production'],purposes=['main','supplementary','graphical_abstract','toc','cover'];
const all={stages,purposes},ordinary={stages,purposes:['main','supplementary']},mainFinal={stages:['production'],purposes:['main']},gaFinal={stages:['production'],purposes:['graphical_abstract']};
const rule=(id,field,requirement,text,sourceIds,applicability=all,value=null)=>({id,field,requirement,text,sourceIds,applicability,value,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON});
const ai=(id,operation,status,text,applicability,sourceIds=['cellPolicy','cellElsevier'])=>({...rule(id,'ai',status==='prohibited'?'hard':status==='conditional'?'manual':'pending',text,sourceIds,applicability),aiPolicy:{operation,status}});
const cell=v8.find(j=>j.id==='cell-reports');
Object.assign(cell,{
 status:'partial',verifiedOn:VERIFIED_ON,
 summary:'现行本刊指南、终稿清单与 AI 条款已核实。正文终稿 TIFF/PDF；可导出 TIFF，PDF 暂不支持。通用模型不得制作 GA，封面限本刊研究例外。',
 sourceIds:['cell','cellPolicy','cellFinal','cellFinalChecklist','cellFigures','cellGaVersioned','cellElsevier'],
 inheritance:[
  {sourceId:'cellElsevier',status:'verified',scope:'本刊 Journal policies 明确要求遵循 Elsevier；本刊封面更窄限制仍适用，不能由集团许可覆盖。'},
  {sourceId:'cellFigures',status:'verified',scope:'本刊 Final submission 明确要求正文图遵循 Cell Press Figure guidelines；制作阈值不倒灌为初投要求。'},
  {sourceId:'cellFinalChecklist',status:'verified',scope:'本刊当前终稿页链接的专项清单优先说明本刊终稿 TIFF/PDF；通用系统可接收其他格式不等于本刊终稿要求。'},
  {sourceId:'cellGaVersioned',status:'verified',scope:'本刊当前终稿页链接此 GA PDF；1200 px/300 dpi 仍有效，字体改为 Arial 8–12 pt。历史 12–16 pt 仅保留在旧版本。'},
 ],
});
cell.rules=[
 ...cell.rules.filter(r=>r.id==='author-integrity'),
 rule('cell-initial','stage','recommendation','初投不必满足其他章节的制作格式；审稿可使用多种格式、尺寸与分辨率，单图建议 1–2 MB。以下正文制作阈值仅用于录用后制作。',['cell','cellFigures'],{stages:['initial'],purposes:['main']},{formatExempt:true}),
 rule('cell-review','scope','manual','修改阶段与终稿制作分开；这里未将录用后 TIFF/PDF 和像素阈值强制用于修改稿。请按编辑决定信准备材料。',['cell'],{stages:['revision'],purposes:['main']}),
 rule('cell-main-format','format','hard','正文终稿按本刊最终清单提交单独高分辨率 TIFF 或 PDF；通用 EM 格式列表不能替代这份专项清单。当前可导出 TIFF，尚无 PDF 导出。',['cellFinalChecklist','cellFinal','cellFigures'],mainFinal,['tiff','pdf']),
 rule('cell-main-width','width','hard','正文制作最大全栏宽度 174 mm；双栏文章/综述的一栏、1.5 栏分别最大 85/114 mm，三栏短文一栏最大 55 mm。程序只检查共同最大宽度，具体栏型须人工确认。',['cellFigures'],mainFinal,{max:174}),
 rule('cell-main-layout','layout','manual','每幅图单独文件，全部面板置于同一页。图件指南建议页面不超过 6.5×8 英寸（页面同时列 16.5×20 cm，存在取整差）；不将取整建议当作精确硬上限。正文图注放在稿件末尾。',['cellFigures','cellFinalChecklist'],mainFinal),
 rule('cell-main-size','fileSize','hard','单个生产图件不得超过 20 MB；文件字节处于十进制/二进制单位边界时待人工确认。',['cellFigures'],mainFinal,{boundaryMB:20}),
 rule('cell-main-dpi','dpi','recommendation','制作像素密度：彩色/灰度至少 300 ppi，纯线稿至少 1000 ppi；黑白图另列 500 ppi，不能把全部灰度图一律当作黑白二值图。检查按最终排版宽度计算，不认证原生细节。',['cellFigures'],mainFinal,{byKind:{color:300,grayscale:300,lineart:1000}}),
 rule('cell-black-white','dpi','manual','黑白图的 500 ppi 类别须人工确认；当前彩色/灰度/线稿选择无法可靠识别二值黑白及混合面板，不能仅凭文件通道认定。',['cellFigures'],mainFinal),
 rule('cell-main-color','color','recommendation','图件指南建议 RGB 色彩；文件检查仅核对实际容器色彩空间，不验证科学内容。',['cellFigures'],mainFinal,{spaces:['srgb','rgb']}),
 rule('cell-main-font','font','recommendation','正文制作使用并嵌入 Arial，最终字体 6–8 pt；字体嵌入、字号与可读性须人工确认。',['cellFigures'],mainFinal),
 rule('cell-main-stroke','stroke','recommendation','正文制作线宽 0.5–1.5 pt；按最终排版尺寸人工检查。',['cellFigures'],mainFinal),
 rule('cell-main-panels','panels','recommendation','多面板使用大写字母标号；保持字号、线条和符号一致，避免难辨别的红绿组合。',['cellFigures'],mainFinal),
 rule('cell-main-count','layout','manual','终稿 Article 通常最多 7 个正文图/表，Report 最多 4 个，编辑可允许例外；需结合整篇稿件人工核对，不能用单张图片认证。',['cellFinalChecklist'],mainFinal),
 rule('cell-supplement','scope','manual','终稿补充图/表及图注须整理为完整可发表的补充 PDF（数据文件另论），建议不超过 20 幅补充图。当前单图 TIFF 导出不完成整套补充材料打包。',['cellFinalChecklist'],{stages:['production'],purposes:['supplementary']}),
 rule('cell-ga-required','scope','manual','Cell Reports 要求图形摘要；当前指南规定单面板、突出一个结论，不包含数据项，素材须原创或具备商业使用权。',['cellFinal','cellGaVersioned'],gaFinal),
 rule('cell-ga-size','pixelDimensions','hard','图形摘要为 1200×1200 像素正方形；程序核对实际文件，不通过放大像素冒充原生细节。',['cellFinalChecklist','cellGaVersioned'],gaFinal,{width:1200,height:1200}),
 rule('cell-ga-dpi','dpi','recommendation','图形摘要按 300 dpi 准备；同时核对实际 1200×1200 像素及指定排版宽度下的像素密度。DPI 元数据不能证明图像质量。',['cellGaVersioned','cellFinalChecklist'],gaFinal,{min:300}),
 rule('cell-ga-format','format','recommendation','图形摘要优选 TIFF、PDF、JPG；当前仅提供 PNG 原像素转 TIFF，PDF/JPG 导出尚未实现。',['cellGaVersioned','cellFinalChecklist'],gaFinal,['tiff','pdf','jpeg']),
 rule('cell-ga-font','font','hard','现行图形摘要使用 Arial 8–12 pt；历史 12–16 pt 不再作为当前规范。实际字体、字号须人工核对。',['cellGaVersioned'],gaFinal),
 ai('cell-generate','generate','conditional','说明性示意图可使用生成式 AI 辅助创作；作者核实准确性、原创与授权，图注及全稿 AI 声明写明工具、版本和用途。此许可不涵盖原始科研图像、GA 或封面。',{...ordinary,contentTypes:['schematic']}),
 ai('cell-refine','generative-refine','unspecified','说明图生成式精修：本刊明确许可创作，但未单独逐项说明已有说明图的模型重绘。集团要求披露生成/修改并非独立许可；保留准确性与权利审查，不据此宣布禁止或已获准。',{...ordinary,contentTypes:['schematic']}),
 ai('cell-data-generate','generate','conditional','数据可视化只允许从真实底层数据经可复现的分析、计算或统计方法直接产生；在 Methods/STAR Methods 及 AI 声明记录工具、版本和开发者。当前模型绘图不能认证这套方法，不得捏造/改变数值，须提供可复现的数据处理依据。',{...ordinary,contentTypes:['data']}),
 ai('cell-data-refine','generative-refine','prohibited','本刊不允许用生成式或 AI 辅助工具改动呈现实验/观测数据的图像。当前精修对已有数据图作模型重绘，无法保证直接由底层数据和可复现方法重算，不能用于此操作；需回到原数据绘图流程。',{...ordinary,contentTypes:['data']}),
 ...['generate','generative-refine'].map(operation=>ai(`cell-primary-${operation}`,operation,'prohibited','本刊不允许 AI 创建或改动原始实验/观测图像，包括亮度、对比度和色彩平衡；正式研究方法中的 AI 须另有可复现方法记录，当前生成/精修不能认证该例外。',{stages,purposes,contentTypes:['primary']})),
 ...['generate','generative-refine'].map(operation=>ai(`cell-ga-${operation}`,operation,'prohibited','本刊及现行 GA 指南禁止通用生成式 AI 制作图形摘要；专用科学插图工具中的 AI 有条件允许。图研当前通用模型生成/重绘不属于已核实的专用工具例外，不能通过改格式或从原图重绘规避。',{stages,purposes:['graphical_abstract']},['cellPolicy','cellGaVersioned','cellElsevier'])),
 ...['generate','generative-refine'].map(operation=>ai(`cell-cover-${operation}`,operation,'prohibited','本刊禁止 AI 制作封面；仅当 AI 为稿件研究不可分割的一部分时可获编辑例外。当前流程不处理编辑特批；集团的一般事先许可不能覆盖本刊更窄条件。',{stages,purposes:['cover']})),
 ...['generate','generative-refine'].map(operation=>ai(`cell-other-${operation}`,operation,'unspecified','本刊未单独授予当前艺术插图或 TOC 用途的 AI 操作许可；说明性示意图条件不自动外推，未明确规定也不等于禁止。',{stages,purposes:['main','supplementary','toc'],contentTypes:['illustration']})),
 ai('cell-non-generative','non-generative-edit','conditional','普通图像处理应最小且透明：全图一致调整，例外在方法/图注说明；保留原始数据，拼接可见且解释，显微图加比例尺，不隐藏背景。这些条件不授权生成式重绘。',ordinary,['cellPolicy']),
];
const hssc=v8.find(j=>j.id==='hssc');
hssc.sourceIds.push('snAiEditorGuidance');
hssc.inheritance.push({sourceId:'snAiEditorGuidance',status:'verified',scope:'集团编辑指导确认推广采用期；未给 HSSC 旧条款撤销或较宽条款优先的本刊证明。'});
hssc.rules.push(rule('hssc-ai-rollout','scope','manual','集团编辑指导说明新框架处于推广采用过程；未指明 HSSC 本刊图像条款何时被替代。当前能核实集团适用关系，仍不能据更新公告自动撤销本刊有限例外。',['snAiEditorGuidance','hsscPolicy','snVisualAi']));
export const JOURNALS=v8;
