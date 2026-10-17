import fs from 'node:fs'
import path from 'node:path'
import {FIGURE_TYPES,FIGURE_GROUPS,ANALYSIS_METHODS,SPECIALIST_SCHEMAS} from '../../packages/figure-taxonomy/src/index.js'
import {CURATED_REFERENCES} from '../../packages/figure-taxonomy/src/library.js'
const root='docs/infographic-v400/completion',ev=root+'/evidence'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const data=read(ev+'/data-core-matrix.json'),schematic=read(ev+'/schematic-mock-matrix.json'),composite=read(ev+'/composite-core-matrix.json'),boundaries=read(ev+'/input-boundaries.json'),baseline=read(root+'/baseline.json')
if(data.length!==126||schematic.length!==54||composite.length!==4)throw Error('Incomplete matrix; do not publish a full-coverage claim')
const paid=[]
for(const dir of fs.readdirSync(ev).filter(n=>n.startsWith('live-bailian'))){
 if(!fs.existsSync(`${ev}/${dir}/summary.json`))continue
 const summary=read(`${ev}/${dir}/summary.json`)
 for(const run of summary.runs)paid.push({batch:dir,scenario:run.scenario,typeId:run.figureTypeId,format:run.format,status:run.job.status,review:run.job.resultImages?.[0]?.review?.status||null,evidence:`evidence/${dir}/summary.json`,calls:run.calls.map(c=>({kind:c.kind,model:c.model,httpStatus:c.httpStatus,requestId:c.requestId,usage:c.usage})),references:run.referenceIds})
}
const calls=paid.flatMap(r=>r.calls),usage={}
for(const call of calls){const group=usage[call.model]||={requests:0,reportedUsage:[]};group.requests++;group.reportedUsage.push(call.usage)}
for(const group of Object.values(usage)){
 group.summedFields={};for(const u of group.reportedUsage)for(const [key,value] of Object.entries(u||{}))if(typeof value==='number')group.summedFields[key]=(group.summedFields[key]||0)+value
}
fs.writeFileSync(root+'/live-validation.json',JSON.stringify({scope:'representative; real model requests with local infrastructure and synthetic input',requests:calls.length,byModel:usage,runs:paid,currencyCost:'not_verified_against_provider_bill'},null,2)+'\n')
const matrix=[...data,...schematic,...composite].map(row=>{
 const type=FIGURE_TYPES.find(t=>t.id===row.typeId),latest=paid.filter(r=>r.typeId===row.typeId&&r.format===row.format&&r.status==='succeeded').at(-1)
 return {...row,label:type.label,group:FIGURE_GROUPS.find(g=>g.id===type.group).label,kind:type.kind,base:true,inputBoundaryEvidence:boundaries.find(b=>b.typeId===row.typeId)||null,realModel:latest?{status:latest.status,review:latest.review,evidence:latest.evidence,scope:'one synthetic representative; not general quality certification'}:'pending_per_type_and_format',evidence:type.kind==='data'?'evidence/data-core-matrix.json':type.kind==='composite'?'evidence/composite-core-matrix.json':'evidence/schematic-mock-matrix.json'}
})
fs.writeFileSync(root+'/support-matrix.json',JSON.stringify(matrix,null,2)+'\n')
const csv=v=>'"'+String(v??'').replaceAll('"','""')+'"'
const rows=[['type_id','中文名称','大类','kind','format','input_validation','input_boundaries','reference','drawing','review','real_model','evidence']]
for(const r of matrix)rows.push([r.typeId,r.label,r.group,r.kind,r.format,r.input||r.inputs,r.inputBoundaryEvidence?.boundaries.map(b=>b.name).join(';')||'see contract/runtime tests',r.reference||r.references,r.drawing,r.review,typeof r.realModel==='object'?r.realModel.review:r.realModel,r.evidence])
fs.writeFileSync(root+'/support-matrix.csv','\ufeff'+rows.map(r=>r.map(csv).join(',')).join('\n')+'\n')
const variants=FIGURE_TYPES.flatMap(t=>t.variants.map(v=>({typeId:t.id,typeLabel:t.label,...v})))
fs.writeFileSync(root+'/variant-and-analysis-support.json',JSON.stringify({variants,analysisMethods:ANALYSIS_METHODS},null,2)+'\n')
const lines=['# 逐图型实际支持目录','', '2026-10-10，本地工作树。PNG/SVG 列是基础形态的流程验证，不是所有变体或真实论文输入的质量保证。完整 184 路径及每项证据见 [CSV](support-matrix.csv) / [JSON](support-matrix.json)。','', '|ID|具体图型|变更前|当前基础形态|PNG / SVG 验证|真实模型代表性结果|','|---|---|---|---|---|---|']
for(const t of FIGURE_TYPES){const old=baseline.find(b=>b.id===t.id),live=paid.filter(r=>r.typeId===t.id&&r.status==='succeeded').map(r=>`${r.format}: ${r.review}`).join('；')||'待逐类实测';lines.push(`|${t.id}|${t.label}|${old?.pipeline||'unknown'}|${t.kind==='data'?'固定程序绘制':t.kind==='composite'?'独立子图与矢量编排':'主模型/生图模型生成'}|${t.kind==='data'?'真实程序双格式＋数值/重新打开':t.kind==='composite'?'真实程序＋模拟模型':'模拟模型请求＋真实 SVG 渲染'}|${live}|`)}
lines.push('','## 单独记录的能力边界','','- 142 个变体已定义；数值/组合变体未开放，示意变体仅传递专属要求，逐变体实际验收为 0。不要将基础形态的某个参数分支计成整个目录变体已通过。','- 8 个具名分析方法接收用户已计算结果与方法说明，未实现从原始矩阵自动计算 PCA、PCoA、NMDS、CCA、RDA、UMAP、t-SNE 或 Mantel 检验。','- 已实现的必要基础计算（Q-Q 分位数、Aalen–Johansen、欧氏聚类、比例/面积分配、序列信息量等）列在下面的输入与计算目录，并有程序数值证据。','- 分面图当前只支持同图型、明确标注的独立尺度。共享坐标和跨面板合并图例未开放。')
fs.writeFileSync(root+'/support-catalog.md',lines.join('\n')+'\n')
const specs=['# 数据输入、计算与验证目录','','全部示例均为明确标记的模拟教学数据。每类均需 `figureData.source`、`rows`、`units`；参数在 `options`，分析口径在 `figureAnalysis`。模型不能补写缺失数据。PNG 与 SVG 使用同一场景。','']
for(const t of FIGURE_TYPES.filter(t=>t.kind==='data')){
 const s=SPECIALIST_SCHEMAS[t.id],proof=data.find(r=>r.typeId===t.id)?.validation.numeric
 specs.push(`## ${t.label} · ${t.id}`,'',`规范要求：${t.requiredInputs.join('；')}。`, `实际行字段：${s?s.fields.join('、'):'参见模拟输入 JSON 与基础字段校验'}。`,...(s?[`专属参数：${s.options.join('；')}。`, `基础实现范围：${s.help}`]:[]),`程序记录的计算：${Object.keys(proof.computations||{}).join('、')||'以传入数值直接映射至图元'}。`,`程序校验：${Object.keys(proof.checks||{}).join('、')}。`,`[完整输入](../evidence/plots/${t.id}.json) · [实际 PNG](evidence/data-core/${t.id}.png) · [可编辑 SVG](evidence/data-core/${t.id}.svg)`,'')
}
fs.writeFileSync(root+'/data-inputs-and-computations.md',specs.join('\n')+'\n')
const count={baseTypes:FIGURE_TYPES.length,groups:FIGURE_GROUPS.length,variantsDefined:variants.length,variantsIndependentlyVerified:0,dataTypesProgramVerified:63,compositeTypesRuntimeVerified:2,schematicTypesMockFlowVerified:27,formatPaths:matrix.length,realRepresentativePaths:paid.filter(p=>p.status==='succeeded').length,realRepresentativePassed:paid.filter(p=>p.review==='passed').length,licensedReferenceCases:CURATED_REFERENCES.length,referencePapers:new Set(CURATED_REFERENCES.map(r=>r.paper.doi)).size,boundaryRejections:boundaries.reduce((n,r)=>n+r.boundaries.length,0)}
fs.writeFileSync(root+'/counts.json',JSON.stringify(count,null,2)+'\n');console.log(count)
