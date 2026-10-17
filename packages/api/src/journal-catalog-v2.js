// Reviewed 2026-10-13. Explicit amendments to the frozen v1 bundle; never mutate v1.
// Evidence, precedence decisions and unresolved questions: docs/journal-rules-20261013/rules-v2-verification.md.
import {JOURNALS as V1,JOURNAL_SOURCES as SOURCES_V1} from './journal-catalog-v1.js';
export const JOURNAL_VERSION='2026-10-13.v2';
export const VERIFIED_ON='2026-10-13';
const all={purposes:['main','supplementary','graphical_abstract','toc','cover']};
const mainAndSupplement={purposes:['main','supplementary']};
const supplement={purposes:['supplementary']};
const final={stages:['revision','production']};
const production={stages:['production']};
const toc={purposes:['toc','graphical_abstract']};
const source=(id,title,url,scope,verification='official-page',note='')=>({id,title,url,scope,verification,note,verifiedOn:VERIFIED_ON});
export const JOURNAL_SOURCES={
 ...structuredClone(SOURCES_V1),
 plosSupplement:source('plosSupplement','PLOS ONE · Supporting information','https://journals.plos.org/plosone/s/supporting-information','补充文件；不继承正文图制作规格'),
 wileyAi:source('wileyAi','Wiley · Using AI tools in your research','https://www.wiley.com/publishing/article/ai-guidelines','期刊作者；AMI 作者指南直接引用','official-browser','已读取当前页面；示意、数据可视化与照片处理分开规定。'),
 acsSoftware:source('acsSoftware','ACS · Acceptable software by file designation','https://pubs.acs.org/page/4authors/submission/software.html','Omega 作者指南直接链接；正文图与补充材料分开','official-search-index','正文图列 TIFF/PDF/EPS；File Designations 仅列 PDF/TIFF，EPS 保留冲突。'),
 acsDesignation:source('acsDesignation','ACS · How to choose file designations','https://pubs.acs.org/pages/4authors_file-designations','单独上传的正文图','official-search-index','与格式表的 EPS 列项不一致；未静默选用任一列表。'),
 acsToc:source('acsToc','ACS · TOC/Abstract graphics guidelines','https://pubsapp.acs.org/paragonplus/submission/toc_abstract_graphics_guidelines.pdf','Omega 作者指南直接引用的 TOC/摘要图规范；文档更新 2024-02-28'),
 access:source('access','IEEE Access · Preparing your article','https://ieeeaccess.ieee.org/authors/preparing-your-article/','本刊模板入口、AI 披露与真实性'),
 accessTemplate:source('accessTemplate','IEEE Access · Official Word template','https://ieeeaccess.ieee.org/wp-content/uploads/2025/08/Access-Template-2024.docx','由 Access 准备页面下载；图件格式、分辨率、字体与标号','official-document','采用专刊模板至少 300/600 dpi；不把出版社大于阈值移植到专刊。'),
 accessFinal:source('accessFinal','IEEE Access · Post acceptance guide','https://ieeeaccess.ieee.org/authors/post-acceptance-guide/','录用后独立图件及 GA','official-search-index','正文图格式列表与模板的 PNG 有出入；GA 必须优先采用已接受正文图。'),
 cell:source('cell','Cell Reports · Information for authors','https://www.cell.com/cell-reports/information-for-authors','本刊专属要求仍无法读取','unverified-access','作者页及图件页读取失败；Chrome 停在安全验证，未绕过。官方检查表下载也失败。'),
 srep:source('srep','Scientific Reports · Submission guidelines','https://www.nature.com/srep/author-instructions/submission-guidelines','初投、修回、正文图及补充材料','official-browser'),
 srepAi:source('srepAi','Scientific Reports · Artificial intelligence','https://www.nature.com/srep/journal-policies/ai','本刊风险分级、作者责任与披露','official-browser','已读取全文；不是旧版一概禁止 AI 图像的条款，也未逐项授权本工具的生成/重绘。'),
 srepEditorial:source('srepEditorial','Scientific Reports · Editorial policies','https://www.nature.com/srep/journal-policies/editorial-policies','明确继承 Nature Portfolio 政策，专刊另有说明时例外；数字图像完整性','official-browser'),
};
const rule=(id,field,requirement,text,sourceIds,value=null,scope={})=>({id,field,requirement,text,sourceIds:Array.isArray(sourceIds)?sourceIds:[sourceIds],value,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,applicability:{stages:['initial','revision','production'],purposes:['main'],...scope}});
const conditional=(id,text,sourceIds,scope=mainAndSupplement)=>rule(id,'ai','manual',text,sourceIds,{allowAI:true},scope);
const unresolved=(id,text,sourceIds,scope=all)=>rule(id,'ai','pending',text,sourceIds,{blockAI:true,issueKind:'pending'},scope);
const v2=structuredClone(V1).map(j=>({...j,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,rules:j.rules.map(r=>({...r,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON}))}));
function amend(id,metadata,replacements,extra=[]){
 const j=v2.find(j=>j.id===id);Object.assign(j,metadata);
 j.rules=j.rules.flatMap(r=>Object.hasOwn(replacements,r.id)?(replacements[r.id]?[replacements[r.id]]:[]):[r]).concat(extra);
}
amend('plos-one',{sourceIds:['plos','plosAi','plosSupplement'],summary:'正文制作与补充图规则分开核实；TIFF 可导出，10 MB 边界仍有官方表述冲突。'},{
 'plos-stage':rule('plos-stage','stage','recommendation','Editorial Accept 前正文图豁免制作格式要求；录用后按正文图规范准备。','plos',{formatExempt:true},{stages:['initial','revision']}),
 'plos-panels':rule('plos-panels','panels','hard','多面板合成单页单文件；图注可用 (A) 或 (a)，应与图内标号一致。','plos',null,production),
 'plos-line':rule('plos-line','stroke','unspecified','已核验的通用图件要求未列统一最小线宽；SigmaPlot 导出示例的 0.2 mm 不作为所有图件硬门槛。','plos',null,production),
 'plos-ai':conditional('plos-ai','可辅助生成/修改示意或结果总结图；图注披露工具、用法及输出核验方式，作者核对准确性、权利，不得伪造原始数据。','plosAi'),
},[
 rule('plos-supp-format','format','hard','补充文件接受任意文件类型；不沿用正文 TIFF/EPS 限制。','plosSupplement',['*'],supplement),
 rule('plos-supp-size','fileSize','recommendation','补充文件建议小于 10 MB；单位边界未定义，边界区间人工确认。','plosSupplement',{boundaryMB:10},supplement),
 rule('plos-supp-label','panels','hard','补充图按 S1、S2 等整编号命名，文件名、正文引用和图注一致。','plosSupplement',null,supplement),
]);
amend('frontiers-ai',{summary:'正文与补充图规则已核实；补充图可用 PNG，正文可导出 TIFF，字体/线宽仍需人工检查。'},{
 'frontiers-stroke':rule('frontiers-stroke','stroke','hard','普通图件最细线条至少 2 pt；化学结构另有键线 0.6 pt、粗线 2 pt 的专项要求，不能将通用线宽套用到化学键。','frontiers'),
},[
 rule('frontiers-supp-format','format','hard','补充图接受 CDX、EPS、JPEG、PDF、PNG、TIF/TIFF。','frontiers',['cdx','eps','jpeg','pdf','png','tiff'],supplement),
 rule('frontiers-supp-dpi','dpi','hard','补充图按最终尺寸 300 dpi 准备。','frontiers',{min:300},supplement),
 rule('frontiers-supp-color','color','hard','补充图为 RGB。','frontiers',{spaces:['srgb']},supplement),
 rule('frontiers-size','fileSize','unspecified','本次核验的作者指南未列图件统一文件大小上限；投稿系统上传限额仍需现场确认。','frontiers',null,mainAndSupplement),
]);
amend('frontiers-ai',{}, {'frontiers-ai':conditional('frontiers-ai','允许 AI 生成或编辑视觉内容，作者必须核对数据与权利；在致谢及适用的 Methods 披露工具名称、版本、模型、来源。建议附输入提示和输出。','frontiers')});
amend('advanced-materials-interfaces',{sourceIds:['ami','wileyAi'],summary:'已核实本刊继承 Wiley 的 AI 图件条件；封面禁止生成式 AI，正文 300 dpi 的强制性表述仍有冲突。',inheritance:[{sourceId:'wileyAi',scope:'AMI 人工智能条款直接引用 Wiley 期刊 AI 指南；本刊封面禁令优先',status:'verified'}]},{
 'ami-stage':rule('ami-stage','stage','recommendation','新投稿支持 Free Format；清晰度、研究完整性与专门图件条件仍适用。','ami',null,{stages:['initial'],purposes:['main']}),
 'ami-ai':conditional('ami-ai','允许 AI 辅助示意图/数据可视化；作者验证准确性和许可，披露工具及用法。禁止 AI 增强研究照片；方法研究中的 AI 分析须另行说明。','wileyAi',{purposes:['main','supplementary','toc']}),
},[
 rule('ami-cover-ai','ai','hard','Advanced Materials Interfaces 明确不应使用生成式 AI 制作封面；当前生成与精修不可用于该用途。','ami',{blockAI:true},{purposes:['cover']}),
 rule('ami-supp-package','packaging','hard','补充图应嵌入单独 Word/PDF 补充文件，不单独提交图像；本导出只提供图件，尚未完成投稿文件编排。','ami',null,supplement),
 rule('ami-color','color','manual','无需为彩色图片强行指定特定 ICC；色彩准确性关键时联系编辑。未声明统一 RGB/CMYK 硬限制。','ami'),
]);
amend('acs-omega',{summary:'TIFF/PDF 正文图格式已核实；EPS 列表冲突保留。TOC 禁用 AI，封面有条件允许。',sourceIds:['acs','acsAi','acsSoftware','acsDesignation','acsToc'],inheritance:[{sourceId:'acsAi',scope:'Omega AI 条款直接引用 ACS AI 政策',status:'verified'},{sourceId:'acsSoftware',scope:'Omega 指南链接的文件格式表；EPS 与文件用途说明冲突',status:'verified'},{sourceId:'acsToc',scope:'Omega Appendix 2 链接的 TOC 专项规范',status:'verified'}]},{
 'acs-stage':rule('acs-stage','stage','recommendation','初投 Fast Format 将图嵌入正文，修回按要求另交图件；不等于豁免所有分辨率要求。','acs'),
 'acs-format':{...rule('acs-format','format','hard','单独正文图：TIFF/PDF 两份官方列表均确认；格式表另列 EPS，而文件用途说明未列，EPS 暂待确认。',['acsSoftware','acsDesignation'],['tiff','pdf']),pendingFormats:['eps']},
 'acs-font':rule('acs-font','font','hard','最终字号不小于 4.5 pt；需按实际排版人工检查。','acs'),
 'acs-ai':conditional('acs-ai','AI 图像须符合研究伦理；致谢及图注说明使用方式，实质研究用途另在 Methods 说明。作者负责准确性，编辑保留决定权。','acsAi'),
 'acs-cover-ai':conditional('acs-cover-ai','封面允许 AI 生成，但须在随图说明中披露工具及用法；作者确保商业使用许可、输出权利及编辑接受。','acsAi',{purposes:['cover']}),
},[
 rule('acs-font-family','font','recommendation','推荐 Helvetica 或 Arial。','acs'),
 rule('acs-supp-format','format','hard','单独补充图文件接受 GIF、JPEG、PDF、TIFF；不能套用正文图格式表。','acsSoftware',['gif','jpeg','pdf','tiff'],supplement),
 rule('acs-toc-format','format','hard','TOC/Abstract Graphic：TIFF 或 EPS；EPS 使用 RGB 并嵌入字体或转轮廓。','acsToc',['tiff','eps'],toc),
 rule('acs-toc-width','width','hard','TOC 最大宽度 3.25 英寸（82.55 mm）。','acsToc',{max:82.55},toc),
 rule('acs-toc-height','height','hard','TOC 最大高度 1.75 英寸（44.45 mm）。','acsToc',{max:44.45},toc),
 rule('acs-toc-dpi','dpi','hard','TOC TIFF：彩色 300 dpi、黑白 1200 dpi；灰度不从正文 600 dpi 自动推定。','acsToc',{byKind:{color:300,lineart:1200}},{...toc,formats:['tiff']}),
 rule('acs-toc-font','font','hard','TOC 无衬线字体至少 6 pt；推荐 8 pt。','acsToc',null,toc),
]);
amend('ieee-access',{summary:'已核实本刊模板和录用后图件规范；PNG 接收有来源冲突，AI 操作许可边界仍需确认。',sourceIds:['access','accessTemplate','accessFinal'],inheritance:[]},{
 'ieee-dpi':rule('ieee-dpi','dpi','hard','本刊模板：彩色/灰度至少 300 dpi；线稿至少 600 dpi。采用专刊模板，不套用通用页面的大于阈值。','accessTemplate',{byKind:{color:300,grayscale:300,lineart:600}}),
 'ieee-width':rule('ieee-width','width','recommendation','通常单栏 3.5 英寸（约 89 mm）、双栏 7.16 英寸（约 182 mm）；允许中间宽度，不应硬判仅两档。','accessTemplate'),
 'ieee-ai':rule('ieee-ai','ai','manual','本刊直接要求致谢披露 AI 系统、涉及部分及使用程度，禁止捏造内容；该披露义务不等于所有图像操作获准。','access',null,all),
},[
 rule('ieee-format-review','format','hard','本刊模板接受 PS、EPS、TIFF、PDF、PNG，及 Word/PowerPoint/Excel 原生图件；PDF 为推荐格式。','accessTemplate',['ps','eps','tiff','pdf','png','doc','docx','ppt','pptx','xls','xlsx'],{stages:['initial','revision']}),
 {...rule('ieee-format','format','hard','录用后单独正文图：PDF、Word、EPS、PS、TIFF；模板另列 PNG，录用后页面未列，PNG 待确认。',['accessTemplate','accessFinal'],['pdf','doc','docx','eps','ps','tiff'],production),pendingFormats:['png']},
 rule('ieee-height','height','manual','最大图深约 216 mm，需预留图注空间；单独图片不能核验图注后总深度。','accessTemplate'),
 rule('ieee-color','color','hard','彩色 RGB/CMYK；灰度及线稿应按自身内容采用灰度或黑白模式。','accessTemplate',{spacesByKind:{color:['srgb','cmyk'],grayscale:['b-w'],lineart:['b-w']}}),
 rule('ieee-font','font','recommendation','Times New Roman、Helvetica、Arial、Cambria、Symbol；图内文字约 8–10 pt。','accessTemplate'),
 rule('ieee-vector-font','font','hard','EPS/PDF/PS 矢量图的字体必须嵌入或转为轮廓，需人工检查原文件。','accessTemplate',null,{formats:['eps','pdf','ps']}),
 rule('ieee-panel','panels','hard','多面板组合后提交；(a)、(b)、(c) 位于各子图下方中央，8 pt Times New Roman。','accessTemplate'),
 rule('ieee-ga-reuse','packaging','hard','GA 应采用已接受论文中的图；原文没有图时可概括主要贡献；附图注不超过 60 词。不得直接把新生成图当作已接受图。','accessFinal',null,{...production,purposes:['graphical_abstract']}),
 rule('ieee-ga-format','format','recommendation','GA 理想格式为 JPG；当前工作台未提供 JPG 导出。','accessFinal',['jpeg'],{...production,purposes:['graphical_abstract']}),
 rule('ieee-ga-pixels','pixelDimensions','recommendation','GA 理想尺寸 660×295 px。','accessFinal',{width:660,height:295},{...production,purposes:['graphical_abstract']}),
 rule('ieee-ga-size','fileSize','hard','GA 不超过 45K；同页理想规格写小于 45 KB，单位与等号边界保留确认。','accessFinal',{boundaryKB:45},{...production,purposes:['graphical_abstract']}),
 unresolved('ieee-operation','已确认本刊 AI 披露条款；对本工具生成/重绘的具体图像许可尚待确认，当前可查看规则及检查文件。','access'),
]);
amend('cell-reports',{summary:'作者页与图件指南仍受访问限制；已查出版社分类政策，尚未据此放开本刊 AI 操作。',sourceIds:['cell','elsevier']},{
 'cell-pending':rule('cell-pending','scope','pending','本刊作者页、图件指南、官方检查表未能读取；格式、尺寸、用途仍待专刊证据。未采用旧转载文档。','cell',null,all),
 'elsevier-reference':unresolved('elsevier-reference','该期刊对当前 AI 图像操作的许可尚待确认。出版社允许辅助示意图、可复现数据图，禁止通用生图制作摘要图，封面需预先许可；专刊映射未完成。','elsevier'),
});
amend('scientific-reports',{status:'partial',summary:'本刊格式及当前 AI 风险框架已读取；不接受图形摘要，具体生成式图像操作仍需确认。',sourceIds:['srep','srepAi','srepEditorial'],inheritance:[{sourceId:'srepEditorial',scope:'本刊明确继承 Nature Portfolio；本刊 AI 页面采用风险框架，不移植其他刊的旧禁令',status:'verified'}]},{
 'srep-stage':rule('srep-stage','stage','recommendation','初投可嵌图或单独上传清晰图件；修回每幅完整图单独上传。','srep'),
 'srep-format':{...rule('srep-format','format','recommendation','修回/出版：线稿优先 EPS/AI，位图示例为 TIFF/JPG/PSD；列举非封闭清单，SVG/PNG 接收待编辑确认。','srep',['eps','ai','tiff','jpeg','psd'],final),openFormatList:true},
 'srep-color':rule('srep-color','color','hard','修回/出版位图使用 RGB 或 CMYK；出版社不替作者转换。','srep',{spaces:['srgb','cmyk']},final),
 'srep-font':rule('srep-font','font','hard','使用统一、清晰无衬线字；希腊字母用 Symbol；未给通用固定字号，缩小后仍须清晰。','srep',null,final),
 'srep-stroke':rule('srep-stroke','stroke','hard','线宽至少 1 pt。','srep',null,final),
 'srep-panel':rule('srep-panel','panels','hard','小写粗体面板标号；比例尺需人工确认。','srep',null,final),
 'srep-width':rule('srep-width','width','unspecified','本次核验的专刊投稿指南未列统一单/双栏毫米数；依可读性和排版确认，不套用 Nature 的栏宽。','srep'),
 'srep-ai':rule('srep-ai','ai','manual','本刊当前政策按风险分级：辅助及受监督使用有条件允许；禁止捏造数据、不可验证输出、以 AI 替代学术判断及深度伪造，作者负责核对和披露。','srepAi',null,all),
},[
 unresolved('srep-operation','已读取本刊 AI 风险框架；其未逐项说明本工具的图像生成/重绘和许可边界，尚待确认。不能据此称全面允许或沿用他刊旧版一概禁令。','srepAi'),
 rule('srep-no-ga','availability','hard','Scientific Reports 明确不接受图形摘要；此用途不可作为该刊投稿图件。','srep',{blockAI:true,unsupportedPurpose:true},{purposes:['graphical_abstract']}),
 rule('srep-background','background','hard','图件使用白底，避免无必要的装饰和过度框线；是否真正白底仍需人工检查。','srep',null,final),
 rule('srep-supp-package','packaging','recommendation','补充材料合并为单独文件，优先 PDF；图与图注放在文件中，不能把单张 PNG/TIFF 当作完整补充文件。','srep',null,supplement),
 rule('srep-supp-size','fileSize','manual','补充文件最大 50 MB，适用于合并后的投稿文件；当前检查单张图无法核验整个文件。','srep',null,supplement),
]);
export const JOURNALS=v2;
