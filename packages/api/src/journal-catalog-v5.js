// Official evidence checked 2026-10-13. See docs/journal-rules-20261013/rules-v5-verification.md.
// Existing snapshots, including unresolved Cell Reports evidence, remain immutable.
import {JOURNALS as V4,JOURNAL_SOURCES as SOURCES_V4} from './journal-catalog-v4.js';
export const JOURNAL_VERSION='2026-10-13.v5';
export const VERIFIED_ON='2026-10-13';
const stages=['initial','revision','production'];
const main={stages,purposes:['main']};
const all={stages,purposes:['main','supplementary','graphical_abstract','toc','cover']};
const source=(id,title,url,scope,note,dates={})=>({id,title,url,scope,note,verification:'official-page',verifiedOn:VERIFIED_ON,...dates});
export const JOURNAL_SOURCES={
 ...structuredClone(SOURCES_V4),
 economistGuide:source('economistGuide','经济学家 · 投稿指南','https://jjxj.swufe.edu.cn/CN/column/column6.shtml','本刊初投稿件；正文匿名及文献核对','页面有 2026 年 7 月文献规范；未找到单独图像格式、DPI 或生成式图像许可条款。',{publishedOn:'2026-07-01'}),
 economistHome:source('economistHome','经济学家 · 期刊官网','https://jjxj.swufe.edu.cn/CN/home','期刊身份、出版单位和研究方向','西南财经大学与四川社会科学学术基金会（新知研究院）主办，经济学家杂志社编辑出版；不是英国 The Economist。'),
 cjlcGuide:source('cjlcGuide','财经论丛 · 投稿须知','https://cjlc.zufe.edu.cn/CN/column/item18.shtml','本刊 Word 稿件及匿名处理','Word 是稿件要求，不是单张图件文件格式。',{publishedOn:'2026-01-21'}),
 cjlcFormat:source('cjlcFormat','财经论丛 · 稿件格式要求（2026 年 7 月版）','https://cjlc.zufe.edu.cn/attached/file/20260708/20260708100514_761.pdf','官方模板第 2 页图表标注；正文图','由官网投稿指南 item8.shtml 链接，已下载并对照页面。未据示例推定 DPI、图片宽度、色彩模式或更改研究数值。',{publishedOn:'2026-07-08'}),
 sxufeGuide:source('sxufeGuide','山西财经大学学报 · 投稿须知','https://xb.sxufe.edu.cn/info/1011/1731.htm','本刊投稿范围、实证研究和稿件格式','本刊官方索引可读；页面与附录的字数上限不同，此非图件功能不作自动判定。AI 图像操作边界未在所读指南中单列。',{publishedOn:'2022-12-14'}),
 sxufeFormat:source('sxufeFormat','山西财经大学学报 · 写作格式','https://xb.sxufe.edu.cn/info/1011/1108.htm','本刊正文图表的黑白、中文与变量要求','2018 页面仍由当前官网“写作规范”列出；保留原发布日期，不将正文五号字体直接套给图中文字。',{publishedOn:'2018-08-24'}),
 sxufeIndex:source('sxufeIndex','山西财经大学学报 · 写作规范索引','https://xb.sxufe.edu.cn/xzgf.htm','现行官网列出的作者材料入口','索引同时列 2022 投稿须知与 2018 写作格式；这证明仍有官方入口，不代表页面在 2026 年重新修订。'),
 cssGuide:source('cssGuide','中国社会科学 · 本刊与投稿说明','https://sscp.cssn.cn/kbw/zgshkx/','中国社会科学杂志社本刊；研究成果、资料核对','本刊页面官方索引可读，未取得完整图像制作参数表；不套用《中国社会科学报》或其他期刊规格。'),
 cssAi:source('cssAi','中国社会科学杂志社 · 规范使用生成式人工智能工具的启事','https://sscp.cssn.cn/tzgg/202505/t20250515_5874135.shtml','向本社期刊、报纸和网站投稿；自发布日起施行','第 1 条明确适用范围；第 4 条限非核心研究环节，第 5 条绘图披露不能单独解释成许可。',{publishedOn:'2025-05-15'}),
 cellAuthors:source('cellAuthors','Cell Reports · Authors（作者指南入口）','https://www.cell.com/cell-reports/authors','本刊作者指南的另一官方入口','本轮该入口及 ScienceDirect 本刊入口均返回 403；未取得现行最终文件清单。'),
 cellSymposia:source('cellSymposia','Cell Press Symposia · 2026 投稿与 AI 政策','https://www.cell-symposia.com/mitochondria-2026/submit-abstract.html','会议摘要、海报及演示文稿；仅用于检验适用范围','明确链接 Elsevier 期刊 AI 政策，但该页对象是会议投稿，不是 Cell Reports，不能补足本刊继承关系。'),
};
JOURNAL_SOURCES.cjlcFormat.verification='official-document';
for(const id of ['sxufeGuide','sxufeFormat','sxufeIndex','cssGuide'])JOURNAL_SOURCES[id].verification='official-search-index';
JOURNAL_SOURCES.cellAuthors.verification='unverified-access';
JOURNAL_SOURCES.elsevier.updatedOn='2026-06';
const rule=(id,field,requirement,text,sourceIds,scope=main,value=null,aiPolicy)=>({id,field,requirement,text,sourceIds,applicability:scope,value,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,...(aiPolicy?{aiPolicy}:{})});
const unknownAi=(id,sourceIds,text)=>['generate','generative-refine','non-generative-edit'].map(operation=>rule(`${id}-${operation}`,'ai','pending',`${operation==='generate'?'AI 生成新图':operation==='generative-refine'?'生成式精修':'非生成式调整'}：${text}未查到不等于禁止，也不等于获得许可。`,sourceIds,all,null,{operation,status:'unspecified'}));
const incompleteFormat=(id,sourceIds)=>rule(`${id}-figure-parameters`,'scope','pending','所核读指南未提供完整独立图件参数：格式、物理尺寸、DPI、文件大小和线宽不补成通用值。85 mm 为工作台初始排版宽度，不是本刊规定。',sourceIds);
const journal=(id,name,publisher,status,summary,subjects,sourceIds,rules,inheritance=[])=>({id,name,publisher,status,summary,subjects,sourceIds,rules,inheritance,defaults:{widthMm:85},version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON});
const v5=structuredClone(V4).map(j=>({...j,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,rules:j.rules.map(r=>({...r,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON}))}));
const cell=v5.find(j=>j.id==='cell-reports');
cell.sourceIds.push('cellAuthors','cellSymposia');
cell.inheritance.push({sourceId:'cellSymposia',status:'pending',scope:'2026 Cell Press 会议页面明确使用 Elsevier 政策，但适用对象为会议；Patterns 社论适用于相邻刊物。两者均不能替代 Cell Reports 本刊确认。'});
cell.summary='已对照官方历史 GA 与 2026 年出版社政策；本刊现行作者清单仍无法读取，历史尺寸及 AI 适用关系尚未证实。';
cell.rules.find(r=>r.id==='cell-generate').text='AI 生成新图：Elsevier 2026 年 6 月政策区分解释图、可复现数据图和原始科研图像；本刊专项条款及继承关系尚待确认。会议页面与相邻刊社论不证明本刊采用，不能据此授予许可或禁止。';
cell.rules.find(r=>r.id==='cell-generate').sourceIds=['cellPolicy','cellAuthors','elsevier','cellSymposia'];
cell.rules.find(r=>r.id==='cell-refine').text='生成式精修：本刊现行专项条款未取得，不能将出版社的解释图创作条件直接扩展为本刊已有图重绘许可；历史亮度/对比度指导只支持非生成式处理，格式转换不改变操作性质。';
cell.rules.find(r=>r.id==='cell-refine').sourceIds=['cellPolicy','cellAuthors','elsevier','cellImageScreen'];
v5.push(
 journal('jingjixuejia','经济学家','经济学家杂志社','pending','已核实本刊与投稿入口；正文匿名要求可提示，图件技术参数及 AI 生成、精修许可仍待核实。',['人文社科','经济学','政治经济学'],['economistGuide','economistHome'],[
  rule('economist-anonymity','packaging','manual','初投正文（包括图件及其图注）须按双向匿名审稿要求隐去作者相关信息；作者资料放独立首页。文件检查不能确认匿名是否完整。',['economistGuide'],{...main,stages:['initial']}),
  incompleteFormat('economist',['economistGuide']),
  ...unknownAi('economist',['economistGuide'],'已核读本刊指南，未找到分别规定图像生成或修改的政策；'),
 ]),
 journal('caijing-luncong','财经论丛','浙江财经大学','partial','已接入 2026 年图表标注规范；字体与图注需人工核对，独立图片格式、DPI 及 AI 操作许可未确认。',['人文社科','经济学','金融','会计'],['cjlcGuide','cjlcFormat'],[
  rule('cjlc-axis','labels','hard','带坐标的正文图须注明横、纵坐标标题；不能为满足格式改写变量、单位或研究数据。',['cjlcFormat']),
  rule('cjlc-legend','layout','recommendation','带坐标图的图例尽量放在横纵轴围成的区域内。',['cjlcFormat']),
  rule('cjlc-font','font','hard','正文图的图内文字按官方模板使用宋体六号；图题黑体六号、居中、无首行缩进、1.5 倍行距。字体及排版效果需人工核对。',['cjlcFormat']),
  rule('cjlc-variables','labels','hard','数学变量（包括图表内变量）用斜体；保留变量含义、数值和科学结论。',['cjlcFormat'],{...main,contentTypes:['schematic','data']}),
  rule('cjlc-manuscript','packaging','manual','投稿须上传 Word 稿件；作者和基金信息在首页，正文从第二页开始并隐去这些信息。PNG/SVG/TIFF 导出不等于完整投稿文件。',['cjlcGuide'],{...main,stages:['initial']}),
  incompleteFormat('cjlc',['cjlcFormat']),
  ...unknownAi('cjlc',['cjlcGuide','cjlcFormat'],'所读投稿须知及 2026 年格式附件未单列该操作的许可条件；'),
 ]),
 journal('shanxi-finance-economics','山西财经大学学报','山西财经大学','partial','已接入黑白图表、中文标注及变量规范；PNG 可检查实际黑白内容，其他格式可能需人工核对；AI 操作许可待确认。',['人文社科','经济学','金融','工商管理','会计'],['sxufeGuide','sxufeFormat','sxufeIndex'],[
  rule('sxufe-color','color','hard','正文图表采用黑白格式，不得用彩色；检查实际可见像素是否无彩色，不把 RGB 文件头当作彩色内容的证明。',['sxufeFormat'],main,{achromatic:true}),
  rule('sxufe-labels','labels','hard','图表说明文字用中文；变量的英文字母保留并用斜体。不能把“说明文字中文”扩展成删除或翻译研究变量符号。',['sxufeFormat']),
  rule('sxufe-data','quality','manual','人工逐项核对模型、公式与数据。当前图件检查不验证实证结果、数值或统计结论。',['sxufeFormat'],{...main,contentTypes:['data','schematic']}),
  rule('sxufe-manuscript','packaging','manual','所投 Word 稿件须包含作者信息，不能按整篇 PDF 投稿；这是稿件要求，不是禁止独立 PDF 图件的依据。本刊投稿范围以经济管理类实证研究为主。',['sxufeGuide'],{...main,stages:['initial']}),
  incompleteFormat('sxufe',['sxufeGuide','sxufeFormat']),
  ...unknownAi('sxufe',['sxufeGuide','sxufeFormat'],'当前官网列出的指南未单列该操作的许可条件；'),
 ],[{sourceId:'sxufeIndex',status:'verified',scope:'只采用本刊索引仍列出的写作格式；不把同校《统计学报》要求合并。2018 来源日期保持可见。'}]),
 journal('social-sciences-in-china','中国社会科学','中国社会科学杂志社','partial','已核实本社 AI 的非核心环节限制、披露和材料保护要求；绘图披露不构成逐项生成或精修许可，图件参数仍缺。',['人文社科','哲学','历史','文学','经济学','社会学'],['cssGuide','cssAi'],[
  rule('css-ai-boundary','ai','manual','AI 仅限非核心研究环节；不能生成论文主体架构、核心观点、主要内容、改写既有研究成果或伪造材料。图的学术贡献是否属于核心内容须作者判断，不自动认证。',['cssAi'],all),
  rule('css-ai-disclosure','ai','manual','绘图等 AI 使用须说明涉及部分、工具名称、版本、使用时间并保留生成页面截图；不得将投审稿文章上传到公开生成式 AI 平台。须核对材料范围与服务的数据处理方式。',['cssAi'],all),
  incompleteFormat('css',['cssGuide']),
  ...unknownAi('css',['cssAi'],'启事规定非核心环节与绘图披露，但未分别授予图像生成、重绘或局部替换许可；'),
 ],[{sourceId:'cssAi',status:'verified',scope:'启事第 1 条明确涵盖本社期刊；本刊由中国社会科学杂志社出版。应用限制及披露条款，不从第 5 条推导图像操作许可。'}]),
);
export const JOURNALS=v5;
