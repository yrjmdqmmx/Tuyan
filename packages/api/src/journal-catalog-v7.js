// Official evidence and interpretation: docs/journal-rules-20261014/rules-v7-verification.md.
// Preserve earlier catalogs and their verification dates for historical tasks.
import {JOURNALS as V6,JOURNAL_SOURCES as SOURCES_V6} from './journal-catalog-v6.js';
export const JOURNAL_VERSION='2026-10-14.v7';
export const VERIFIED_ON='2026-10-14';
export const JOURNAL_SOURCES=structuredClone(SOURCES_V6);
const source=(id,title,url,scope,note,verification='official-page')=>({id,title,url,scope,note,verification,verifiedOn:VERIFIED_ON});
Object.assign(JOURNAL_SOURCES,{
 hsscInformation:source('hsscInformation','HSSC · Journal Information','https://www.nature.com/palcomms/journal-information','本刊声明采用 Springer Nature 家族期刊的伦理和编辑政策','本刊自己的政策关系声明，不只从出版商品牌推定继承；不能单独证明冲突条款已被取代。'),
 snPolicyScope:source('snPolicyScope','Springer Nature · About our policies','https://www.springernature.com/gp/policies/about-our-policies','集团自有期刊；代学会出版期刊有不同适用边界','与 HSSC 本刊的政策声明合读；适用范围与某一冲突条款的优先级是两件事。'),
 natureAiFramework:source('natureAiFramework','Nature Portfolio · Artificial Intelligence','https://www.nature.com/nature-portfolio/editorial-policies/ai','当前风险评估框架；作者、评审和编辑的不同责任','完整页面已读；没有发布本刊图像条款作废声明，也未列本页修订日期。'),
 cellChecklistDownload:source('cellChecklistDownload','Cell Reports · 历史作者清单下载入口','http://download.cell.com/images/EdImages/cellreports/author_checklist.pdf','旧作者指南中的官方 PDF 地址；未取得正文','HTTP 与 HTTPS 均超时；第三方镜像只用于定位官方地址，不证明现行有效性。','unverified-access'),
 cellGaVersioned:source('cellGaVersioned','Cell Press · 带版本号的 GA 指南 PDF','https://www.cell.com/pb/assets/raw/shared/figureguidelines/GA_guide-1780933691430.pdf','新发现的官方附件地址；未取得正文','直接请求返回 403。文件名数字不作为发布日期，不能据此确认历史 1200×1200 规格仍有效。','unverified-access'),
 cellTemplates:source('cellTemplates','Cell Press · Article templates','https://www.cell.com/information-for-authors/article-templates','作者模板与最终材料清单的候选溯源渠道','直接请求返回 403；未将邻刊模板或第三方最终文件清单转写为本刊规则。','unverified-access'),
});
Object.assign(JOURNAL_SOURCES.hsscGuide,{verifiedOn:VERIFIED_ON,note:'完整读取：Making a submission 明确要求遵循初投和修改稿清单；一般段单栏 87 mm、照片/位图段 88 mm，双栏均 180 mm。未给两段单栏差异的优先说明。'});
Object.assign(JOURNAL_SOURCES.hsscChecklist,{verifiedOn:VERIFIED_ON,note:'本刊指南明确引用本清单作为投稿要求；初投和修改稿图表均排除 PDF。按特定阶段解释，不把通用技术格式表当作投稿许可。修改稿含 accepted in principle。'});
Object.assign(JOURNAL_SOURCES.snAiUpdate,{verifiedOn:VERIFIED_ON,url:'https://group.springernature.com/us/group/media/press-releases/sn-policy-responsible-ai-use/53209516'});
Object.assign(JOURNAL_SOURCES.snVisualAi,{verifiedOn:VERIFIED_ON,note:'现行正式视觉细则分别覆盖生成、修改和非生成式处理，要求来源可独立核验。更新公告只确认框架更新，未给此页逐条修订日期；HSSC 本刊段落与 FAQ 仍有较窄表述。'});
Object.assign(JOURNAL_SOURCES.snAiGuidance,{verifiedOn:VERIFIED_ON,note:'2026-09-10 公告链接的现行 FAQ 仍写一般不许可并将例外指向正式政策；同页将不含图像的文字/数值展示项排除在该图像说明之外。不能从类别名称或格式自动授予例外。'});
const v7=structuredClone(V6).map(j=>({...j,version:JOURNAL_VERSION,rules:j.rules.map(r=>({...r,version:JOURNAL_VERSION}))}));
const hssc=v7.find(j=>j.id==='hssc');
const replace=(id,changes)=>Object.assign(hssc.rules.find(r=>r.id===id),changes,{verifiedOn:VERIFIED_ON});
const all={stages:['initial','revision','production'],purposes:['main','supplementary','graphical_abstract','toc','cover']};
const rule=(id,field,requirement,text,sourceIds)=>({id,field,requirement,text,sourceIds,applicability:all,value:null,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON});
hssc.summary='审稿阶段按清单排除 PDF；双栏 180 mm 可检查，单栏 87/88 mm 仍需确认。AI 已补集团适用与更新证据，逐图条件仍需人工核对。';
hssc.sourceIds.push('hsscInformation','snPolicyScope','natureAiFramework','snAiUpdate','snAiGuidance');
hssc.inheritance=hssc.inheritance.filter(i=>i.sourceId!=='snVisualAi').concat([
 {sourceId:'hsscInformation',status:'verified',scope:'本刊明确声明采用 Springer Nature 家族的伦理与编辑政策；集团政策不是仅供无关背景对照。'},
 {sourceId:'snAiUpdate',status:'verified',scope:'2026-09-10 公告确认框架更新，并链接正式政策及 FAQ；公告日期不是各页面修订日期或本刊条款撤销日期。'},
 {sourceId:'snVisualAi',status:'conflict',scope:'集团视觉细则的适用关系已有本刊声明支持；未决点缩小为：较宽的可核验来源条件是否取代本刊有限例外。现行 FAQ 仍有旧表述，不能只凭更新公告判定本刊段落失效。'},
 {sourceId:'hsscChecklist',status:'verified',scope:'本刊指南明确要求遵循各阶段清单；初投/修改图件排除 PDF，包含原则录用后的修改。通用格式列表不覆盖此特定阶段要求。'},
]);
replace('hssc-format',{text:'审稿图件接收 PNG、SVG、TIFF 等列明格式；初投、修改稿（含原则录用后的修改）按本刊指南明确引用的清单排除 PDF。通用格式表列矢量 PDF 不等于本阶段接收。'});
delete hssc.rules.find(r=>r.id==='hssc-format').pendingFormats;
replace('hssc-pdf-review',{requirement:'manual',text:'当前阶段清单明确排除 PDF 图件。最终制作的矢量 PDF 技术格式条目不能替代初投/修改清单；不要通过改阶段绕过投稿要求。'});
replace('hssc-production-format',{text:'最终制作图件按技术格式列表支持 PNG、SVG、TIFF 等；PDF 须为支持矢量的文件。原则录用后仍按修改稿提交时，应选择“修改稿”并遵循其非 PDF 清单。'});
replace('hssc-width',{requirement:'recommendation',value:{oneOf:[180],pendingOneOf:[87,88]},text:'最终制作：一般段单栏 87 mm，照片/位图段 88 mm；双栏均为 180 mm。双栏可按共同值检查，单栏两种值的适用优先级仍待确认；其他宽度不符合已列出的排版建议。宽度判断不认证矢量可编辑性。'});
replace('hssc-generate',{text:'AI 生成：本刊页列合同机构供图、关于 AI 的研究及特定可核验科学数据工具等有限例外；现行集团细则另列可核验数据/作者材料、人工验证、权利和披露条件。集团适用关系已补证，但较宽条件是否替代本刊例外未获明确说明；普通通用模型加提示词不自动满足例外，不据披露授予许可。',sourceIds:['hsscPolicy','hsscInformation','snVisualAi','snAiUpdate','snAiGuidance']});
replace('hssc-refine',{text:'生成式精修：现行集团细则明确包含修改/增强，要求来源可核验、忠实表达、权利与披露；本刊较窄生成图像例外的替代关系未明。需逐图人工核对，已有原图或改用 TIFF 不证明满足条件；模型重绘不能按非生成式调整申报。',sourceIds:['hsscPolicy','hsscInformation','snVisualAi','snAiUpdate']});
replace('hssc-nongenerative',{text:'非生成式处理：本刊和集团均要求保留可归属的原始材料、不歪曲内容、披露并接受编辑审查；亮度/对比度调整或机器学习处理不能据此授权生成式重绘。',sourceIds:['hsscPolicy','snVisualAi']});
hssc.rules.push(rule('hssc-ai-applicability','scope','manual','集团 FAQ 将不含图像的纯文字/数值表、流程图和简单图表排除在该图像说明之外；本刊页没有单列此边界。是否属于该类须核对实际内容，不能仅凭“数据图/示意图”类别或 PNG/SVG 格式判定豁免。',['snAiGuidance','hsscPolicy']));
const cell=v7.find(j=>j.id==='cell-reports');
cell.sourceIds.push('cellChecklistDownload','cellGaVersioned','cellTemplates');
// v6 appended an already inherited submission source; deduplicate only the new version.
cell.sourceIds=[...new Set(cell.sourceIds)];
cell.summary='已转查官方 PDF 下载主机、带版本号的 GA 附件和作者模板；未取得现行正文，历史规格与本刊 AI 专项条件仍不能认证。';
Object.assign(cell.rules.find(r=>r.id==='cell-current-access'),{verifiedOn:VERIFIED_ON,text:'续查官方附件：旧作者清单下载主机 HTTP/HTTPS 超时；带版本号的 GA PDF 与作者模板返回 403。未取得现行正文，不据文件名、第三方镜像或相邻刊物推定历史规格有效或 AI 操作获准。',sourceIds:['cellChecklistDownload','cellGaVersioned','cellTemplates']});
export const JOURNALS=v7;
