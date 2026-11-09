// Official follow-up checked 2026-10-13. v1/v2 remain frozen task evidence.
// Sources, access failures and unresolved precedence: docs/journal-rules-20261013/rules-v3-verification.md.
import {JOURNALS as V2,JOURNAL_SOURCES as SOURCES_V2} from './journal-catalog-v2.js';
export const JOURNAL_VERSION='2026-10-13.v3';
export const VERIFIED_ON='2026-10-13';
const all={stages:['initial','revision','production'],purposes:['main','supplementary','graphical_abstract','toc','cover']};
const source=(id,title,url,scope,verification='official-page',note='')=>({id,title,url,scope,verification,note,verifiedOn:VERIFIED_ON});
export const JOURNAL_SOURCES={
 ...structuredClone(SOURCES_V2),
 ieeeAuthorAi:source('ieeeAuthorAi','IEEE Author Center · AI publishing policy','https://journals.ieeeauthorcenter.ieee.org/become-an-ieee-journal-author/publishing-ethics/guidelines-and-policies/submission-and-peer-review-policies/','期刊作者；直接链接 PSPB 手册','official-browser'),
 ieeePspb:source('ieeePspb','IEEE · PSPB Operations Manual (2026-06-25)','https://pspb.ieee.org/images/files/files/opsmanual.pdf','印刷页 5–6 与 106–107；IEEE 出版物作者','official-document','核对准确性与抄袭、披露 AI 内容、禁止伪造。文字润色例外不能推定为图像编辑许可。'),
 cellSubmission:source('cellSubmission','Cell Reports · Editorial Manager','https://www.editorialmanager.com/cell-reports/','本刊公开投稿入口','official-browser','公开指南链接仍指向 cell.com；未登录或提交；不能证明图件规则或 AI 许可。'),
 cell:source('cell','Cell Reports · Information for authors','https://www.cell.com/cell-reports/information-for-authors','本刊专属要求仍未取得','unverified-access','改查 ScienceDirect 作者指南、投稿系统、官方独立 PDF；尚未取得可核验的本刊现行图件规范。'),
 cellPolicy:source('cellPolicy','Cell Press · Journal policies','https://www.cell.com/cell/information-for-authors/journal-policies','Cell Press 专项政策；正文未取得','unverified-access','浏览器停在自动安全验证；没有绕过。第三方摘要不作为正式规则。'),
 elsevierUpdate:source('elsevierUpdate','Elsevier · Journal AI policy update (2026-08-18)','https://www.elsevier.com/connect/updated-generative-ai-policies-for-journals-supporting-responsible-use-while-protecting-trust','出版社更新公告；尚未确认 Cell Reports 专刊映射','official-browser','明确区分示意图、数据图、原始科研图像、GA 与封面；不据此认定 Cell Reports 已适配。'),
 srepAi:source('srepAi','Scientific Reports · Artificial intelligence','https://www.nature.com/srep/journal-policies/ai','本刊风险框架；链接 Springer Nature AI Hub','official-browser'),
 natureAi:source('natureAi','Nature Portfolio · Artificial intelligence','https://www.nature.com/nature-portfolio/editorial-policies/ai','本刊继承的风险框架；链接 AI Hub','official-browser'),
 snAiGuidance:source('snAiGuidance','Springer Nature · AI guidance and FAQ','https://group.springernature.com/gp/group/ai/ai-guidance-for-researchers-editors-reviewers','AI Hub 指引；图像 FAQ 与详细政策存在不一致','official-page','FAQ 对生成式图像仍写一般不允许；纯文字/数值显示项被排除；非生成式调整需披露供逐案评估。'),
 snAiPolicy:source('snAiPolicy','Springer Nature · Editorial policy index','https://www.springernature.com/gp/policies/editorial-policies','AI Hub 指向的正式期刊政策索引'),
 snVisualAi:source('snVisualAi','Springer Nature · AI use in manuscript preparation','https://www.springernature.com/gp/policies/editorial-policies/ai-manuscript-preparation','索引直接链接的稿件准备及视觉内容细则；与 FAQ 并存'),
};
const rule=(id,requirement,text,sourceIds,aiPolicy)=>({id,field:'ai',requirement,text,sourceIds,aiPolicy,value:null,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,applicability:all});
const v3=structuredClone(V2).map(j=>({...j,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,rules:j.rules.map(r=>({...r,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON}))}));
function amend(id,metadata,remove,extra){const j=v3.find(j=>j.id===id);Object.assign(j,metadata);j.rules=j.rules.filter(r=>!remove.includes(r.id)).concat(extra);}
amend('ieee-access',{
 summary:'格式规范已核实；AI 生成与精修的逐项许可未明确，披露和真实性义务已确认。',
 sourceIds:['access','accessTemplate','accessFinal','ieeeAuthorAi','ieeePspb'],
 inheritance:[{sourceId:'ieeePspb',scope:'IEEE Author Center 直接链接 PSPB 手册；Access 本刊披露条款一致。未推定未列明的图像操作许可。',status:'verified'}],
},['ieee-operation'],[
 rule('ieee-generate','pending','AI 生成新图：已核实披露、准确性核对及禁止伪造的义务；未找到单独明确图像生成许可边界的条款。未明确不等于禁止，也不能据披露义务认定获准。',['access','ieeePspb'],{operation:'generate',status:'unspecified'}),
 rule('ieee-refine','pending','生成式精修：未找到对重绘、局部替换、增删图像内容的专门许可。手册文字润色例外仅涉及文字，不能用于免除图像披露或认定精修获准。',['ieeeAuthorAi','ieeePspb'],{operation:'generative-refine',status:'unspecified'}),
 rule('ieee-non-generative','pending','非生成式图像调整：所核验 AI 条款未单列图像亮度、裁切或线条调整许可；禁止伪造仍适用。当前模型精修不是此类操作。',['ieeePspb'],{operation:'non-generative-edit',status:'unspecified'}),
]);
amend('cell-reports',{
 summary:'已换查官方投稿系统与出版社更新公告；本刊图件规范及 AI 专项政策仍未取得，继续待核实。',
 sourceIds:['cell','cellPolicy','cellSubmission','elsevier','elsevierUpdate'],
 inheritance:[{sourceId:'elsevierUpdate',scope:'已读取出版社新政策公告；Cell Reports / Cell Press 的专刊适用关系与例外仍未完成核实。',status:'pending'}],
},['cell-pending','elsevier-reference'],[
 {id:'cell-pending',field:'scope',requirement:'pending',text:'当前官方替代渠道尚未提供可核验的本刊现行图件规范；格式、尺寸、DPI、字体与特殊用途仍待确认，未采用第三方数值。',sourceIds:['cell','cellSubmission'],value:null,version:JOURNAL_VERSION,verifiedOn:VERIFIED_ON,applicability:all},
 rule('cell-generate','pending','AI 生成新图：出版社已公布分类条件；本刊专项条款和继承关系尚待确认，不将出版社条件直接当成本刊许可或禁令。',['cellPolicy','elsevierUpdate'],{operation:'generate',status:'unverified'}),
 rule('cell-refine','pending','生成式精修：本刊对修改已有图的具体适用条件尚待确认；重新导出文件不能解除原操作的政策问题。',['cellPolicy','elsevier'],{operation:'generative-refine',status:'unverified'}),
 rule('cell-non-generative','pending','非生成式调整：本刊当前图像完整性条款未取得，不能从出版社生成式条款推定允许范围。',['cellPolicy'],{operation:'non-generative-edit',status:'unverified'}),
]);
amend('scientific-reports',{
 summary:'AI 生成与生成式精修存在官方来源冲突；非生成式调整另行评估。图形摘要不被本刊接受。',
 sourceIds:['srep','srepAi','srepEditorial','natureAi','snAiGuidance','snAiPolicy','snVisualAi'],
 inheritance:[
  {sourceId:'srepEditorial',scope:'Scientific Reports 明确继承 Nature Portfolio，专刊另有说明时优先。',status:'verified'},
  {sourceId:'snAiPolicy',scope:'本刊及 Nature Portfolio AI 页面 → AI Hub → 研究者指引 → 期刊政策索引 → 稿件准备细则。',status:'verified'},
  {sourceId:'snAiGuidance',scope:'FAQ 与详细视觉政策并存且结论不同；未找到明确取代声明，保留冲突，不按抓取先后选值。',status:'conflict'},
 ],
},['srep-operation'],[
 rule('srep-generate','conflict','AI 生成新图：详细视觉政策附条件允许，但 AI Hub FAQ 仍称一般不允许生成式图像；未找到明确取代说明，适用结论保留冲突。',['snVisualAi','snAiGuidance'],{operation:'generate',status:'conflict'}),
 rule('srep-refine','conflict','生成式精修：详细政策涉及修改已有视觉内容，FAQ 的图像限制仍并存；不能把文字润色或非生成式调整的许可当成重绘许可。',['snVisualAi','snAiGuidance'],{operation:'generative-refine',status:'conflict'}),
 rule('srep-non-generative','manual','非生成式调整：FAQ 要求在图注披露并由编辑逐案评估；保持图像真实性，不能掩盖或伪造证据。当前模型精修不能按非生成式调整申报。',['snAiGuidance','srepEditorial'],{operation:'non-generative-edit',status:'conditional'}),
 rule('srep-source-integrity','manual','本刊风险框架要求输出可核验、人工负责，禁止伪造数据、深度伪造及以 AI 代替学术判断；披露只是其中一项义务。',['srepAi','natureAi']),
]);
export const JOURNALS=v3;
