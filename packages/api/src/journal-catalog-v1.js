// Reviewed records are immutable. Publish a new version; never edit historical entries in place.
export const JOURNAL_VERSION = '2026-10-13.v1';
export const VERIFIED_ON = '2026-10-13';
const source = (id, title, url, scope, verification = 'official-page') => ({id,title,url,scope,verification,verifiedOn:VERIFIED_ON});
export const JOURNAL_SOURCES = {
  plos: source('plos','PLOS ONE · Figures','https://journals.plos.org/plosone/s/figures','PLOS ONE 正文图；Editorial Accept 前豁免格式要求'),
  plosAi: source('plosAi','PLOS ONE · Ethical publishing practice','https://journals.plos.org/plosone/s/ethical-publishing-practice','PLOS ONE 作者、图件与 AI 披露'),
  frontiers: source('frontiers','Frontiers in Artificial Intelligence · Author guidelines','https://www.frontiersin.org/journals/artificial-intelligence/for-authors/author-guidelines','该刊正文图与作者 AI 使用'),
  ami: source('ami','Advanced Materials Interfaces · Author guidelines','https://advanced.onlinelibrary.wiley.com/hub/journal/21967350/author-guidelines','该刊 Free Format、Graphics FAQ、TOC'),
  wileyAi: source('wileyAi','Wiley · AI guidelines for researchers','https://www.wiley.com/en-kr/publish/article/ai-guidelines/','Wiley 期刊作者；不是图书政策','official-search-index; direct-page-403'),
  acs: source('acs','ACS Omega · Author guidelines','https://researcher-resources.acs.org/publish/author_guidelines?coden=acsodf','ACS Omega；页面更新 2026-10-05'),
  acsAi: source('acsAi','ACS · AI policy','https://researcher-resources.acs.org/publish/aipolicy','ACS 期刊图件、TOC、封面'),
  ieee: source('ieee','IEEE · Resolution and size','https://journals.ieeeauthorcenter.ieee.org/create-your-ieee-journal-article/create-graphics-for-your-article/resolution-and-size/','IEEE 通用图件；Access 专刊映射待确认','official-search-index'),
  ieeeAi: source('ieeeAi','IEEE · Submission and peer review policies','https://journals.ieeeauthorcenter.ieee.org/become-an-ieee-journal-author/publishing-ethics/guidelines-and-policies/submission-and-peer-review-policies/','IEEE 出版物 AI 披露'),
  access: source('access','IEEE Access · Submission guidelines','https://ieeeaccess.ieee.org/authors/submission-guidelines/','该刊技术细则映射未完成','incomplete'),
  cell: source('cell','Cell Reports · Information for authors','https://www.cell.com/cell-reports/information-for-authors','Cell Reports；本次无法读取','unverified-403'),
  elsevier: source('elsevier','Elsevier · Generative AI policies for journals','https://www.elsevier.com/about/policies-and-standards/generative-ai-policies-for-journals','出版社参考；不能替代 Cell Reports 专刊核验'),
  srep: source('srep','Scientific Reports · Submission guidelines','https://www.nature.com/srep/author-instructions/submission-guidelines','Scientific Reports 初投、修回图件','official-search-index'),
  natureAi: source('natureAi','Nature · Artificial intelligence','https://www.nature.com/nature/editorial-policies/ai','Nature 页面；不能自动继承到 Scientific Reports','scope-unconfirmed'),
};
// requirement: hard | recommendation | manual | unspecified | pending | conflict.
// Each rule has its own scope; no implicit publisher-wide inheritance.
const rule = (id, field, requirement, text, sourceId, value = null, applicability = {}) => ({id,field,requirement,text,sourceIds:[sourceId],value,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,applicability:{stages:['initial','revision','production'],purposes:['main'],...applicability}});
const anyPurpose = {purposes:['main','supplementary','graphical_abstract','toc','cover']};
const production = {stages:['production']};
const commonManual = () => [
  {id:'author-integrity',field:'integrity',requirement:'manual',text:'作者核对数据、科学结论、授权与 AI 披露；程序无法认证真实性。',sourceIds:[],value:null,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,origin:'product-capability',applicability:{...anyPurpose}},
];
const profile = (id,name,publisher,status,summary,sourceIds,inheritance,rules,defaults={}) => ({id,name,publisher,status,summary,sourceIds,inheritance,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,defaults:{widthMm:85,...defaults},rules:[...rules,...commonManual()]});
export const JOURNALS = [
  profile('plos-one','PLOS ONE','PLOS','partial','正文图与 AI 条件已核实；TIFF 可导出，EPS 暂不支持。',['plos','plosAi'],[],[
    rule('plos-stage','stage','recommendation','Editorial Accept 前豁免格式要求；以下制作规范用于录用后正文图。','plos',null,anyPurpose),
    rule('plos-format','format','hard','录用后正文图：TIFF 或 EPS。','plos',['tiff','eps'],production),
    rule('plos-width','width','hard','最终宽度 66.8–190.5 mm。','plos',{min:66.8,max:190.5},production),
    rule('plos-height','height','hard','最终高度不超过 222.3 mm。','plos',{max:222.3},production),
    rule('plos-dpi','dpi','hard','最终尺寸 300–600 dpi；不得靠放大像素补足细节。','plos',{min:300,max:600},production),
    rule('plos-size','fileSize','conflict','摘要写小于 10 MB，细则写不超过 10 MB；边界及 MB 单位待确认。','plos',{boundaryMB:10},production),
    rule('plos-color','color','hard','8 bit/channel RGB 或灰度；TIFF 单页、合并图层、无透明度、LZW。','plos',{spaces:['srgb','b-w'],depth:'uchar',opaque:true,lzw:true},production),
    rule('plos-font','font','hard','Arial、Times 或 Symbol；最终字号 8–12 pt。PNG/TIFF 无法可靠检测。','plos',null,production),
    rule('plos-panels','panels','manual','分面标号与图注一致；未核实统一的大写或小写要求。','plos'),
    rule('plos-line','stroke','pending','未核实适用于所有图件的统一最小线宽；不等于官方未规定。','plos'),
    rule('plos-ai','ai','manual','允许辅助性示意/总结图，作者须验证准确性与权利，在图注等适当位置披露工具及使用方式；不得伪造原始数据。','plosAi',null,anyPurpose),
  ],{widthMm:85}),
  profile('frontiers-ai','Frontiers in Artificial Intelligence','Frontiers','partial','正文图规则和 AI 条件已核实；TIFF 可导出，字体/线宽需人工确认。',['frontiers'],[],[
    rule('frontiers-format','format','hard','TIFF 或 JPEG；EPS 在录用阶段提供。','frontiers',['tiff','jpeg']),
    rule('frontiers-format-final','format','hard','录用阶段可提供 TIFF、JPEG 或 EPS。','frontiers',['tiff','jpeg','eps'],production),
    rule('frontiers-width','width','hard','按单栏 85 mm 或双栏 180 mm 准备。','frontiers',{oneOf:[85,180]}),
    rule('frontiers-height','height','manual','图件适合一页；具体可用高度需结合版面确认。','frontiers'),
    rule('frontiers-dpi','dpi','hard','最终尺寸至少 300 dpi。','frontiers',{min:300}),
    rule('frontiers-color','color','hard','RGB 色彩模式。','frontiers',{spaces:['srgb']}),
    rule('frontiers-font','font','hard','最小文字 8 pt；需在最终尺寸检查。','frontiers'),
    rule('frontiers-stroke','stroke','hard','最细线条至少 2 pt。','frontiers'),
    rule('frontiers-panels','panels','hard','分面标为 (A)、(B)…，放在图外、不遮盖内容；图注用粗体括号大写标号。','frontiers'),
    rule('frontiers-ai','ai','manual','AI 视觉生成/编辑需准确、可核查且无侵权，致谢披露名称、版本、模型与来源，涉及研究方法时写入 Methods。','frontiers',null,anyPurpose),
  ]),
  profile('advanced-materials-interfaces','Advanced Materials Interfaces','Wiley','partial','支持 PNG/TIFF；300 dpi 强制/建议表述有冲突，按场景显示。',['ami','wileyAi'],[{sourceId:'wileyAi',scope:'Wiley 期刊 AI 政策',status:'verified'}],[
    rule('ami-stage','stage','recommendation','新投稿支持 Free Format；仍需清晰可读。','ami',null,{stages:['initial'],...anyPurpose}),
    {...rule('ami-format','format','hard','位图 TIFF/PNG；矢量优先 PDF/PS/EPS，另列 Word/可编辑原生图；未核实 SVG 接收。','ami',['tiff','png','pdf','ps','eps','doc','ai','pptx','cdr']),pendingFormats:['svg']},
    rule('ami-width','width','recommendation','通常单栏 85 mm、双栏 178 mm；不是所有用途的统一硬上限。','ami',{oneOf:[85,178]}),
    rule('ami-dpi','dpi','conflict','同页正文称位图必须至少 300 dpi，Graphics FAQ 称最好至少 300 dpi。按最终尺寸报告数值，强制性待确认。','ami',{min:300}),
    rule('ami-vector-raster','conversion','hard','矢量转位图要求至少 1200 dpi；本功能不提供该转换。','ami'),
    rule('ami-font','font','recommendation','图表标注/符号通常 10–12 pt。','ami'),
    rule('ami-panel','panels','recommendation','小写 a、b、c，12 pt 无衬线字，左上角。','ami'),
    rule('ami-toc','dimensions','hard','TOC：55×50 mm 或 110×20 mm；位图宽 650 或 1300 px；字至少 10 pt。','ami',{pairs:[[55,50],[110,20]],pixelWidths:[650,1300]},{purposes:['toc']}),
    rule('ami-ai','ai','manual','Wiley 期刊政策允许示意图与数据可视化辅助，需核对准确性/权利并披露；不允许 AI 修改照片或生成/修改事实证据图。','wileyAi',null,anyPurpose),
  ]),
  profile('acs-omega','ACS Omega','ACS','partial','技术尺寸、分辨率和 AI 限制已核实；可接收文件格式仍待核验。',['acs','acsAi'],[{sourceId:'acsAi',scope:'ACS 期刊 AI 政策',status:'verified'}],[
    rule('acs-stage','stage','recommendation','初投 Fast Format 将图嵌入正文，修回另交图件；不等于豁免所有分辨率要求。','acs',null,anyPurpose),
    rule('acs-format','format','pending','具体可接收图件文件格式待核验；不得仅据 TIFF/PNG 扩展名声称可投稿。','acs'),
    rule('acs-width','width','hard','单栏不超过 240 pt；双栏 300–504 pt。','acs',{ranges:[[0,240*25.4/72],[300*25.4/72,504*25.4/72]]}),
    rule('acs-height','height','manual','最大深度 660 pt 含图注，每行图注按 12 pt 计；仅检查图片无法判断总深度。','acs'),
    rule('acs-dpi','dpi','hard','彩色 300 dpi、灰度 600 dpi、线稿 1200 dpi。','acs',{byKind:{color:300,grayscale:600,lineart:1200}}),
    rule('acs-font','font','hard','最小字号 4.5 pt；Arial/Helvetica 为推荐字体。','acs'),
    rule('acs-stroke','stroke','hard','线宽至少 0.5 pt。','acs'),
    rule('acs-ai','ai','manual','生成图像须在致谢及图注披露，实质研究用途写入 Methods；披露不替代许可与准确性。','acsAi',null,anyPurpose),
    rule('acs-toc-ai','ai','hard','AI 生成图不应用于 TOC/Abstract Graphic。切换 PNG/SVG 或精修不能绕过。','acsAi',{blockAI:true},{purposes:['toc','graphical_abstract']}),
    rule('acs-cover-ai','ai','manual','封面需具备所需权利、商业使用许可及图注披露，编辑保留决定权。','acsAi',null,{purposes:['cover']}),
  ],{widthMm:83}),
  profile('ieee-access','IEEE Access','IEEE','partial','已记录出版社规则；Access 技术映射与具体 AI 图像用途尚待确认。',['access','ieee','ieeeAi'],[{sourceId:'ieee',scope:'IEEE 图件技术规则 → Access',status:'pending'},{sourceId:'ieeeAi',scope:'IEEE 出版物 AI 披露',status:'verified'}],[
    rule('ieee-dpi','dpi','pending','出版社要求彩色/灰度大于 300 dpi、黑白线稿大于 600 dpi；Access 适用映射待确认。','ieee',{byKind:{color:300,grayscale:300,lineart:600},exclusiveMin:true}),
    rule('ieee-width','width','pending','出版社常见栏宽 88.9/182 mm 为参考；Access 专刊版面待核验。','ieee',{oneOf:[88.9,182]}),
    rule('ieee-ai','ai','manual','IEEE 要求在致谢说明 AI 系统、涉及部分和使用程度；该披露条款不证明所有图像操作均获允许。','ieeeAi',null,anyPurpose),
  ],{widthMm:88.9}),
  profile('cell-reports','Cell Reports','Cell Press / Elsevier','pending','专刊页面 403；不能把 Elsevier 通用政策直接作为该刊已核实许可。',['cell','elsevier'],[{sourceId:'elsevier',scope:'出版社政策 → Cell Reports 专刊',status:'pending'}],[
    rule('cell-pending','scope','pending','图件格式、尺寸、用途与 AI 操作的专刊规则待确认。','cell',null,anyPurpose),
    rule('elsevier-reference','ai','pending','出版社参考：示意图有条件允许；数据图须基于可复现数据流程；原始研究图和图形摘要限制更严，封面需预先许可。专刊映射未完成。','elsevier',null,anyPurpose),
  ]),
  profile('scientific-reports','Scientific Reports','Springer Nature','pending','部分技术规则已核验，AI 政策的专刊适用范围待确认。',['srep','natureAi'],[{sourceId:'natureAi',scope:'Nature 政策 → Scientific Reports',status:'pending'}],[
    rule('srep-stage','stage','recommendation','初投可嵌入清晰图；修回提交单独完整图件。','srep',null,anyPurpose),
    rule('srep-format','format','recommendation','线稿优先 EPS/AI；位图 TIFF/JPG/PSD。SVG/PNG 的最终接收未核实。','srep',['eps','ai','tiff','jpeg','psd']),
    rule('srep-dpi','dpi','recommendation','如可能，按最终尺寸提供 300 dpi；不可改写为一律强制。','srep',{min:300},{stages:['revision','production']}),
    rule('srep-color','color','hard','RGB 或 CMYK。','srep',{spaces:['srgb','cmyk']}),
    rule('srep-font','font','recommendation','一致的无衬线字体，希腊字母用 Symbol。','srep'),
    rule('srep-stroke','stroke','hard','线宽至少 1 pt。','srep'),
    rule('srep-panel','panels','hard','小写粗体面板标号；比例尺需人工确认。','srep'),
    rule('srep-width','width','pending','本次未核实专刊固定栏宽；不套用 Nature 的常见栏宽，也不等于官方未规定。','srep'),
    rule('srep-ai','ai','pending','专刊 AI 页面未能读取；Nature 新框架与旧禁令的范围/版本不能自动套用。','natureAi',null,anyPurpose),
  ]),
];
// Archive the sources with their rules: a later source/date change must not alter an older version.
// Future releases add a separate bundle; never replace an existing version key.
export const JOURNAL_ARCHIVES = {[JOURNAL_VERSION]:{journals:JOURNALS,sources:JOURNAL_SOURCES}};
