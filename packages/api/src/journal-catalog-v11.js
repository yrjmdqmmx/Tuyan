// Nature main journal only. Sources checked 2026-10-19; no inferred source revision dates.
// v1–v10 remain immutable. Existing journals keep their original verification dates.
import {JOURNALS as V10,JOURNAL_SOURCES as SOURCES_V10} from './journal-catalog-v10.js';

export const JOURNAL_VERSION='2026-10-19.v11';
export const VERIFIED_ON='2026-10-19';
export const JOURNAL_SOURCES=structuredClone(SOURCES_V10);
export const JOURNALS=structuredClone(V10).map(j=>({...j,version:JOURNAL_VERSION,rules:j.rules.map(r=>({...r,version:JOURNAL_VERSION}))}));
const source=(id,title,url,scope,note='未找到可靠的页面修订日期；核验日期不等于政策生效日期。',verification='official-page')=>({id,title,url,scope,note,verification,verifiedOn:VERIFIED_ON});
Object.assign(JOURNAL_SOURCES,{
 natureHome:source('natureHome','Nature · 主刊官网','https://www.nature.com/nature/','Nature 主刊；不是 Nature Communications 或 Scientific Reports'),
 natureInfo:source('natureInfo','Nature · Journal information','https://www.nature.com/nature/journal-information','主刊简介与范围'),
 natureInitial:source('natureInitial','Nature · Initial submission','https://www.nature.com/nature/for-authors/initial-submission','原创研究初稿；另含提前准备终稿的建议'),
 natureFormatting:source('natureFormatting','Nature · Formatting guide','https://www.nature.com/nature/for-authors/formatting-guide','Article 稿件、图注、正文图及 Extended Data'),
 natureFinal:source('natureFinal','Nature · Final submission','https://www.nature.com/nature/for-authors/final-submission','仅编辑要求提交制作文件后适用；不作为初投门槛'),
 naturePanels:source('naturePanels','Nature · Building and exporting figure panels','https://research-figure-guide.nature.com/figures/building-and-exporting-figure-panels/','主刊正文图制作与 Extended Data；由作者指南直接链接'),
 natureSpecs:source('natureSpecs','Nature · Preparing figures: specifications','https://research-figure-guide.nature.com/figures/preparing-figures-our-specifications/','图中文字、数据图、照片、比例尺与输出'),
 natureExtended:source('natureExtended','Nature · Extended Data formatting','https://research-figure-guide.nature.com/figures/extended-data-formatting-guidelines/','在线 Extended Data 图表；与 Supplementary Information 区分'),
 natureEditorial:source('natureEditorial','Nature · Editorial policies','https://www.nature.com/nature/editorial-policies','本刊明确采用 Nature Portfolio 共同政策'),
 natureMainAi:source('natureMainAi','Nature · Artificial Intelligence','https://www.nature.com/nature/editorial-policies/ai','主刊当前 AI 风险框架','已在官网浏览器直接读取；不以旧社论或其他子刊规则替代当前页面。未列可靠修订日期。','official-browser'),
 natureVisualAi:source('natureVisualAi','Springer Nature · AI use in manuscript preparation','https://www.springernature.com/gp/policies/editorial-policies/ai-manuscript-preparation','集团视觉细则；与主刊框架合读'),
 natureAiFaq:source('natureAiFaq','Springer Nature · AI guidance and FAQ','https://group.springernature.com/gp/group/ai/ai-guidance-for-researchers-editors-reviewers','集团 FAQ；图像问题链接正式政策','FAQ 的一般不许可与正式细则的条件式表述并存；不从网页日期推定任一来源已作废。'),
 natureIntegrity:source('natureIntegrity','Nature · Image integrity and standards','https://www.nature.com/nature/editorial-policies/image-integrity','研究图像处理、原始数据与处理记录'),
 natureCovers:source('natureCovers','Nature · Cover artwork guide','https://research-figure-guide.nature.com/covers/','Nature 主刊及 Nature 品牌研究期刊的投稿封面；不是书架展示图的授权'),
});
const all={stages:['initial','revision','production'],purposes:['main','supplementary','graphical_abstract','toc','cover']};
const main={...all,purposes:['main']};
const production={stages:['production'],purposes:['main']};
const extended={stages:['production'],purposes:['supplementary']};
const cover={...all,purposes:['cover']};
const rule=(id,field,requirement,text,sourceIds,applicability=main,value=null,extra={})=>({id:`nature-${id}`,field,requirement,text,sourceIds,applicability,value,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,...extra});

JOURNALS.unshift({
 id:'nature',name:'Nature',publisher:'Springer Nature · Nature Portfolio',subjects:['综合科学','自然','主刊','自然科学','生命科学','物理科学','医学','工程'],
 status:'partial',version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,defaults:{widthMm:89},
 sourceIds:['natureHome','natureInfo','natureInitial','natureFormatting','natureFinal','naturePanels','natureSpecs','natureExtended','natureEditorial','natureMainAi','natureVisualAi','natureAiFaq','natureIntegrity','natureCovers'],
 inheritance:[
  {sourceId:'natureEditorial',status:'verified',scope:'Nature 主刊明确采用 Nature Portfolio 共同政策；不继承其他子刊的专属要求。'},
  {sourceId:'naturePanels',status:'verified',scope:'主刊投稿与格式指南直接链接这套图件指南；与其他官方页面不一致的条目保留来源冲突。'},
  {sourceId:'natureVisualAi',status:'verified',scope:'与主刊当前风险框架合读集团正式视觉细则；不覆盖封面专门禁令，不自动认证当前素材满足条件。'},
 ],
 summary:'Nature 主刊。初投、修改稿与制作阶段分开；正文尺寸、部分格式和分辨率有官方来源差异，已逐项标注。封面禁止生成式 AI；选择期刊不代表图件获准投稿。',
 rules:[
  rule('initial-package','stage','recommendation','初投建议将文字、图和相邻图注合成带行号的 Word/PDF；图片清楚到可审稿即可，不要求此时提交制作级文件。LaTeX 稿在录用前提供 PDF。',['natureInitial'],{stages:['initial'],purposes:['main','supplementary']},{formatExempt:true}),
  rule('revision-instructions','stage','manual','修改稿按编辑发出的具体格式要求准备；不能把所有录用后制作阈值自动当作修改稿门槛。',['natureInitial'],{stages:['revision'],purposes:['main','supplementary']}),
  rule('article-scope','scope','manual','以下稿件建议以原创研究 Article 为范围；Review、Perspective 等类型另查本刊要求。初投使用在线投稿系统，cover letter 为可选。',['natureInitial']),
  rule('article-length','scope','recommendation','Article 摘要段以不超过约 200 词为宜；典型 6 页约 2,500 词和 4 个小型图表，8 页约 4,300 词和 5–6 个。属于版面示例，最终篇幅由编辑决定，不作为单图硬上限。',['natureFormatting']),
  rule('author-statements','quality','manual','准备作者贡献、利益冲突以及数据和代码可用性说明；生命科学、行为与社会科学研究另须核对 Reporting Summary。涉及数据图时保留精确样本量、重复实验及误差线含义。',['natureInitial','natureFormatting']),
  rule('legend','labels','hard','图注先给简短图题，再说明各面板、符号及统计量；终稿图注放入文字文件，图件另交。不能为满足排版改动研究数值。',['natureFormatting']),
  rule('legend-length','labels','conflict','图注长度：Initial submission 写少于 250 词，Formatting guide 写少于 300 词；没有核实二者替代关系，请按编辑指示确认。',['natureInitial','natureFormatting']),
  rule('final-files','stage','hard','只有编辑要求制作文件后，才分开提交最终文字、正文图、Extended Data 和必要补充材料；确认上传的是最终接受版本。',['natureFinal'],production),
  rule('width','width','conflict','正文图栏宽存在差异：初投/格式指南为 90/180 mm，终稿/图件指南为 89/183 mm。当前默认 89 mm 仅为可修改的工作值，不认证任一组为唯一正确尺寸。',['natureInitial','natureFormatting','natureFinal','naturePanels'],production),
  rule('height','height','hard','图件指南要求正文图最高 170 mm，为图注留空间；终稿页的 247 mm 是整页深度，不作为图件高度。',['naturePanels','natureFinal'],production,{max:170}),
  rule('format','format','hard','正文制作优先可编辑 AI/EPS/PDF；图件指南也列 plain SVG、分层 PSD 等。PNG/JPEG/TIFF 在投稿/终稿页面与图件导出页的接收表述不一致，按待确认处理；SVG 扩展名不能证明内容可编辑。',['naturePanels','natureInitial','natureFinal'],production,['ai','eps','pdf','svg','psd','ps','ppt','xls','xlsx'],{pendingFormats:['png','jpeg','jpg','tiff','tif']}),
  rule('format-conflict','scope','conflict','正文位图格式需编辑确认；将 PNG 转为 TIFF 或放入 SVG 容器，不会解除格式来源冲突，也不会产生可编辑图层。',['naturePanels','natureInitial','natureFinal'],production),
  rule('font','font','hard','使用可编辑的无衬线文字（优先 Arial/Helvetica），不要转轮廓；普通文字 5–7 pt，多面板标号用 8 pt 粗体正体小写 a、b、c。字体及最终字号需人工核对。',['natureSpecs'],production),
  rule('stroke','stroke','recommendation','最终尺寸的线条建议 0.25–1 pt，保留可编辑线条；不能仅靠导出格式认证线宽。',['natureFinal'],production),
  rule('dpi','dpi','conflict','照片分辨率：同一规格页正文最低 300 dpi，导出段写最低 450 dpi；终稿页为 300–600 dpi。最终采用值需确认，不把任一数值当作所有示意图/矢量图的统一门槛。',['natureSpecs','natureFinal'],{...production,contentTypes:['primary']}),
  rule('color','color','recommendation','正文制作建议 RGB；印刷转换由出版流程处理，不能据转换后的外观认证科研真实性。',['natureSpecs'],production,{spaces:['srgb','rgb']}),
  rule('readability','layout','recommendation','面板按字母顺序紧凑排列；采用色觉友好的配色，避免红绿对照及彩虹色标，用图例区分含义，减少装饰元素。',['naturePanels'],production),
  rule('data-axes','labels','hard','数据图须有坐标轴、刻度及单位；采用可读文字，不编造数据或统计结果。',['natureSpecs'],{...main,contentTypes:['data']}),
  rule('image-integrity','quality','manual','原始研究图像仅作必要处理，保存未处理文件、元数据和处理记录；不同时间或位置的图像并置须清楚分隔并说明。图件检查不能验证实验数据真实性。',['natureIntegrity'],{...all,purposes:['main','supplementary'],contentTypes:['data','primary']}),
  rule('extended-scope','scope','manual','本条目的“补充图”按 Nature 的 Extended Data 理解：通常最多 10 个图表展示项；Supplementary Information 与其不同，额外图一般应归入 Extended Data。',['natureFormatting'],{...all,purposes:['supplementary']}),
  rule('extended-format','format','hard','Extended Data 制作文件接受 JPEG、TIFF 或 EPS，逐图独立提交；不能套用正文可编辑 SVG 的接收列表。',['natureExtended'],extended,['jpeg','tiff','eps']),
  rule('extended-width','width','hard','Extended Data 页面最大宽度 180 mm；单图置于单页，为图注留空间。',['natureExtended'],extended,{max:180}),
  rule('extended-height','height','conflict','Extended Data 图件指南写页面 180×170 mm，Final submission 写最大 180×240 mm；尚未核实尺寸替代关系，具体高度与图注布局须编辑确认。',['natureExtended','natureFinal'],extended),
  rule('extended-dpi','dpi','hard','Extended Data 位图最高 300 dpi，不能照搬正文照片的最低分辨率要求。仍需保证内容清楚。',['naturePanels'],{...extended,formats:['png','tiff','jpeg']},{max:300}),
  rule('extended-color','color','hard','Extended Data 文件保存为 RGB，不用 CMYK。',['naturePanels'],extended,{spaces:['srgb','rgb']}),
  rule('extended-size','fileSize','hard','Extended Data 每文件不超过 10 MB；十进制/二进制边界没有明确说明，边界区间留待确认。',['natureFinal'],extended,{boundaryMB:10}),
  rule('ai-framework','ai','manual','当前主刊采用 AI 风险框架：作者负责核查、披露与科研判断；不可伪造数据或将不可核验内容当作研究结果。披露本身不是许可，文件格式也不能证明政策合规。',['natureMainAi'],all),
  ...['generate','generative-refine'].map(operation=>rule(operation,'ai','manual','生成与精修需可核验来源、人工核查、权利合规并披露；是否满足条件须由作者及编辑确认。',['natureVisualAi','natureMainAi'],{...all,purposes:['main','supplementary']},null,{aiPolicy:{operation,status:'conditional'}})),
  rule('ai-faq-scope','scope','manual','集团 FAQ 仍使用一般不许可及有限例外的措辞，并链接正式细则；不据简单图表的类别或“已披露”直接判断当前 AI 图件获准。',['natureAiFaq'],{...all,purposes:['main','supplementary']}),
  rule('non-generative-edit','ai','manual','非生成式图像处理需在图注披露并由编辑逐案判断；本工具的生成式精修不能归入非生成式处理。',['natureAiFaq'],{...all,purposes:['main','supplementary']},null,{aiPolicy:{operation:'non-generative-edit',status:'conditional'}}),
  rule('cover-generate','ai','hard','封面专门指南明确不允许生成式 AI 图像；当前生成或生成式精修不能用于投稿封面。一般 AI 框架不覆盖这项专门禁令。',['natureCovers'],cover,{blockAI:true}),
  rule('cover-format','format','hard','投稿封面接受 PSD、TIFF、JPEG、PNG；按实际尺寸至少 300 dpi。此为投稿作品要求，与书架采用的已出版封面图片不同。',['natureCovers'],{stages:['production'],purposes:['cover']},['psd','tiff','jpeg','png']),
  rule('cover-dpi','dpi','hard','投稿封面在实际尺寸下至少 300 dpi；初次低清稿须说明有高分辨率版本。',['natureCovers'],{stages:['production'],purposes:['cover'],formats:['png','tiff','jpeg']},{min:300}),
  rule('cover-dimensions','dimensions','pending','封面正文写 213×285 mm，页面示意图的宽度标注为 215 mm；未确认其替代或裁切关系。顶部、底部和右侧需 3 mm 出血；具体成品尺寸先向编辑确认。',['natureCovers'],cover),
  rule('cover-layout','layout','recommendation','封面为刊名和封面文字留空间，但作品中不要自行放入期刊 Logo；与终稿同时通过投稿系统提交，或联系经办编辑。',['natureCovers'],cover),
  rule('special-purpose','scope','pending','未核实主刊 Graphical Abstract / TOC 的独立投稿规格和 AI 许可，不能套用其他 Nature 期刊或正文图要求。',['natureInitial','natureFormatting'],{...all,purposes:['graphical_abstract','toc']}),
 ],
});
