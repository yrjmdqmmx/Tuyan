// Reproducible delivery documents from the exact runtime registry, not a second taxonomy.
import {writeFile,readFile,mkdir} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import {FIGURE_TYPES,FIGURE_GROUPS,ANALYSIS_METHODS,LEGACY_CATEGORIES,TAXONOMY_VERSION,figureTypePath,figureStagePrompt,referenceIsUsable} from '../../packages/figure-taxonomy/src/index.js'
import {JOURNAL_REFERENCES} from '../../packages/figure-taxonomy/src/references.js'
const root=fileURLToPath(new URL('../../',import.meta.url)),out=path.join(root,'docs/infographic-v400')
await mkdir(out,{recursive:true})
const usable=JOURNAL_REFERENCES.filter(referenceIsUsable)
const tally=(rows,key)=>Object.fromEntries([...new Set(rows.map(key))].map(value=>[value,rows.filter(row=>key(row)===value).length]))
const summary={date:'2026-10-10',version:TAXONOMY_VERSION,groups:FIGURE_GROUPS.length,types:FIGURE_TYPES.length,variants:FIGURE_TYPES.reduce((n,t)=>n+t.variants.length,0),analysisMethods:ANALYSIS_METHODS.length,pipeline:tally(FIGURE_TYPES,t=>t.support.pipeline),kind:tally(FIGURE_TYPES,t=>t.kind),references:{retained:JOURNAL_REFERENCES.length,usable:usable.length,held:JOURNAL_REFERENCES.length-usable.length,papers:new Set(usable.map(r=>r.paper.doi)).size,journals:tally(usable,r=>r.paper.journal),licenses:tally(usable,r=>r.license.id),coveredTypes:FIGURE_TYPES.filter(t=>t.referenceIds.length).length,caseGapTypes:FIGURE_TYPES.filter(t=>!t.referenceIds.length).map(t=>t.id)}}
await writeFile(path.join(out,'catalog.json'),JSON.stringify({summary,groups:FIGURE_GROUPS,types:FIGURE_TYPES,analysisMethods:ANALYSIS_METHODS,legacyMapping:LEGACY_CATEGORIES},null,2)+'\n')
await writeFile(path.join(out,'counts.json'),JSON.stringify(summary,null,2)+'\n')
const state={deterministic_base:'基础程序绘制：已用合成数据实跑',generative_contract:'生成模型路线：约束已接通，逐类型实图未验证',candidate_unavailable:'候选：未开放绘制',schematic_panels_only:'仅支持示意子图；含数据子图阻断'}
let md='# 图研信息图完整目录与类型规范\n\n注册表版本 '+TAXONOMY_VERSION+'。本文件由运行注册表自动导出；不额外维护第二套分类。\n\n'+FIGURE_TYPES.length+' 个基础图型、'+summary.variants+' 个有名称的变体、'+ANALYSIS_METHODS.length+' 种分析方法。变体数量不是已实现数量：当前数据绘制只接受基础图型，变体请求会被拒绝；示意变体仅进入约束。真实案例缺口如实保留。\n\n'
md+='## 大类总览\n\n|大类|基础图型数|具体图型|\n|---|---:|---|\n'
for(const g of FIGURE_GROUPS){const ts=FIGURE_TYPES.filter(t=>t.group===g.id);md+=`|${g.label}|${ts.length}|${ts.map(t=>t.label).join('、')}|\n`}
for(const g of FIGURE_GROUPS){md+=`\n## ${g.label}\n`;for(const t of FIGURE_TYPES.filter(t=>t.group===g.id)){
 md+=`\n### ${t.label} · ${t.en}\n\n稳定 ID：\`${t.id}\`；完整路径：${figureTypePath(t.id)}。\n\n`
 for(const [label,value] of [['定义',t.definition],['适用',t.suitable],['不适用',t.unsuitable],['别名',t.aliases.join('、')||'无'],['表达目的',t.purpose],['学科标签',t.scientificDomains.join('、')],['组合方式',t.composition],['必要输入',t.requiredInputs.join('；')],['关键元素',t.elements.join('；')],['编码规则',t.encodingRules.join('；')],['常见变体',t.variants.map(v=>`${v.label} (${v.id})`).join('；')],['容易混淆',t.confusable.map(id=>`${FIGURE_TYPES.find(x=>x.id===id)?.label} (${id})`).join('；')],['生成要求',t.generationRequirements.join('；')],['评审要求',t.reviewRequirements.join('；')],['实现状态',state[t.support.pipeline]]])md+=`- **${label}**：${value}\n`
 md+='\n真实论文边界案例：\n\n'
 if(!t.referenceExamples.length)md+='- 暂无通过本次许可与质量核验的案例；保持缺口，不以无关图补位。\n'
 for(const r of t.referenceExamples)md+=`- [${r.paperTitle}](${r.url})，${r.figure}${r.panels.length?' / '+r.panels.join('、'):''}。边界：${r.boundary}\n`
}}
md+='\n## 分析方法（不是基础图型）\n\n'
for(const m of ANALYSIS_METHODS)md+=`### ${m.label}\n\n对应 ${m.typeId}。输入：${m.required.join('；')}。核验：${m.checks.join('；')}。当前排序图只绘制用户已计算的坐标；未实现这些分析算法。\n\n`
await writeFile(path.join(out,'catalog.md'),md)
let legacy='# 历史类别与 OpenAcad 候选映射\n\n旧任务保留原字段；不能无证据地把综合类别推断为具体图型。旧任务重开时，历史统计图须选择具体图型并补结构化数据。\n\n|旧名称或 ID|新 ID|处理|\n|---|---|---|\n'
for(const [old,id] of Object.entries(LEGACY_CATEGORIES))legacy+=`|${old}|${id||'未推断'}|${id?'别名/稳定 ID 兼容':'保留历史含义，新增任务需明确选择'}|\n`
const mappings=JSON.parse(await readFile(path.join(out,'openacad-mapping.json'),'utf8'))
legacy+='\n## OpenAcad '+mappings.length+' 项逐项映射\n\n本地来源 `/Users/a1-6/Documents/ChatGPT/OpenAcad/docs/acceptance/templates.csv`。模板映射不表示移植了它的渲染器或分析方法。\n\n|模板|基础图型|变体或分析配置|\n|---|---|---|\n'
for(const m of mappings)legacy+=`|${m.sourceLabel} (${m.sourceTemplateId})|${m.figureTypeId}|${m.configuration||'基础'}|\n`
await writeFile(path.join(out,'mapping.md'),legacy)
let refs='# 论文参考案例与许可核查索引\n\n完整逐图记录见 [reference-register.json](reference-register.json)，含原图/预览路径与 SHA256、原始图注 XML、全体作者、期刊、年份、DOI、图号/子图、许可正文、用途许可、署名、修改记录、分类边界、不可迁移的内容。\n\n'
refs+=`正式及隔离台账共 ${summary.references.retained} 张，原图均已留存；${usable.length} 张同时满足许可和本次质量条件，来自 ${summary.references.papers} 篇论文；另外 ${summary.references.held} 张隔离。案例来自 PLOS 期刊群及 Implementation Science，出版方覆盖仍有限。另行研究的未批准候选不计入台账数量或可用池。案例整体和子图可覆盖多个类别，不能把类别命中数相加当图片数。\n\n`
refs+='用途授权是依据具体文章许可与图注例外作出的复制、展示及改编判断，不代表模型服务商条款或训练授权。未修改原图；PLOS 原始文件保存为 TIFF，另存出版方 PNG；Implementation Science 保存出版方原尺寸 PNG，文件格式不伪装为 TIFF。模型输入也保留署名与不可迁移内容。\n\n|案例 ID|主要图型|图号|期刊/年|许可/状态|来源|\n|---|---|---|---|---|---|\n'
for(const r of JOURNAL_REFERENCES)refs+=`|${r.id}|${r.figureTypeId}|${r.figureNumber}|${r.paper?.journal} ${r.paper?.year}|${r.license.id} / ${referenceIsUsable(r)?'正式可用':r.license.status}|[论文](${r.paper?.sourceUrl})|\n`
refs+='\n## 保留但不进入正式池\n\n'
for(const r of JOURNAL_REFERENCES.filter(r=>!referenceIsUsable(r)))refs+=`- ${r.id}：${r.quality?.reason||r.reason} 许可状态字段采用保守门禁；excluded_quality 表示未批准正式使用，不表示文章本身没有开放许可。\n`
refs+='\n## 尚无合格案例\n\n'+FIGURE_TYPES.filter(t=>!t.referenceIds.length).map(t=>t.label).join('、')+'。\n'
await writeFile(path.join(out,'references.md'),refs)
await mkdir(path.join(out,'prompt-examples'),{recursive:true})
const examples=[{figureTypeId:'workflow',methodContent:'合成接口样例：输入→质量检查→合格则分析，否则返回修订。',figureSpecVersion:TAXONOMY_VERSION},{figureTypeId:'forest',taskName:'plot',figureSpecVersion:TAXONOMY_VERSION,figureData:{source:'synthetic QA only',units:{value:'mean difference',low:'mean difference',high:'mean difference'},rows:[{label:'A',value:2,low:1,high:3}],options:{nullValue:0}},figureAnalysis:{description:'合成的差值估计与95%区间；不是研究结论。'}}]
for(const body of examples)for(const stage of ['retrieval','planning','drawing','review'])await writeFile(path.join(out,'prompt-examples',`${body.figureTypeId}-${stage}.txt`),figureStagePrompt(body,stage)+'\n')
console.log(JSON.stringify(summary,null,2))
