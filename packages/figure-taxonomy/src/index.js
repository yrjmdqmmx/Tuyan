import {validateSpecialistData} from './specialist-schemas.js'
export {SPECIALIST_SCHEMAS,SPECIALIST_PLOT_TYPES,getSpecialistSchema,validateSpecialistData} from './specialist-schemas.js'
export {FIGURE_EXECUTION_VERSION} from './capabilities.js'
export * from './catalog.js'
import { FIGURE_TYPES, FIGURE_GROUPS, LEGACY_CATEGORIES, ANALYSIS_METHODS, TAXONOMY_VERSION } from './catalog.js'
const byId = new Map(FIGURE_TYPES.map(type=>[type.id,type]))
const fold = value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[\s_–—-]+/g,'')
export function getFigureType(value) {
 if(byId.has(value)) return byId.get(value)
 if(Object.hasOwn(LEGACY_CATEGORIES,value)) return byId.get(LEGACY_CATEGORIES[value]) || null
 return FIGURE_TYPES.find(type=>[type.label,type.en,...type.aliases].some(name=>fold(name)===fold(value))) || null
}
export const figureTypePath = value=>{const type=getFigureType(value);return type?`${FIGURE_GROUPS.find(g=>g.id===type.group).label} / ${type.label}`:String(value||'未选择具体图型')}
export function searchFigureTypes(query='',group='') {
 const terms=String(query).trim().split(/\s+/).filter(Boolean).map(fold)
 return FIGURE_TYPES.filter(type=>(!group||type.group===group)&&terms.every(term=>fold([type.label,type.en,...type.aliases,type.definition,...type.variants.map(v=>v.label)].join(' ')).includes(term)))
}
export function figureContract(body={}) {
 const original=body.generationContext||body
 const type=getFigureType(original.figureTypeId||original.infographicCategory)
 if(!type) return {version:TAXONOMY_VERSION,status:'legacy_unspecified',originalCategory:original.infographicCategory||'',requirements:['历史类别未细分，不能擅自推定具体图型；保留原始请求。','禁止补造数据、显著性或科学结论。']}
 const method=ANALYSIS_METHODS.find(m=>m.id===original.figureAnalysis?.method&&m.typeId===type.id)
 return {version:TAXONOMY_VERSION,id:type.id,path:figureTypePath(type.id),definition:type.definition,kind:type.kind,
  suitable:type.suitable,unsuitable:type.unsuitable,confusable:type.confusable.map(id=>({id,label:getFigureType(id)?.label,definition:getFigureType(id)?.definition})),requiredInputs:type.requiredInputs,elements:type.elements,encodingRules:type.encodingRules,
  generationRequirements:type.generationRequirements,reviewRequirements:type.reviewRequirements,
  variants:type.variants.filter(v=>(original.figureVariantIds||[]).includes(v.id)),analysis:method?{...method,...original.figureAnalysis}:original.figureAnalysis||null,
  data:original.figureData||null,panels:(original.figurePanels||[]).map(panel=>({label:panel.label,...figureContract(panel)})),
  evidencePolicy:'Reference figures are evidence about visual structure only. Never transfer their data, labels, numerical results, significance or scientific conclusions. If required inputs are missing, list missing inputs and do not fabricate them.',
 }
}
export function figureStagePrompt(body,stage) {
 const spec=figureContract(body)
 return `\n<figure_type_contract stage="${stage}">\n${JSON.stringify(spec,null,2)}\n</figure_type_contract>\n${stage==='review'?'Apply EVERY applicable type-specific check. A visual judgement cannot certify numeric/statistical correctness. Report missing evidence explicitly.':'Preserve this contract independently of the intermediate plan; a plan cannot relax its constraints.'}${body.generationPath!=='model-v1'&&spec.kind==='data'?'\nThis typed plot uses an immutable deterministic data renderer. Do not create Python, replace data or infer new statistics. The complete plan (including revised_description if revising) must be a JSON string/object with plan and plotStyle:{width,height,fontSize}. Width 6-16 inches, height 4-14 inches, fontSize 10-20 points are the supported layout controls. A revision must change a supported control; if a requested change is unsupported, report that limitation instead of claiming it was applied.':''}`
}
const fail=message=>{const error=new Error(message);error.businessCode='FIGURE_INPUT_INVALID';throw error}
export function validateFigureRequest(body) {
 if(!body.figureTypeId) return {status:'legacy',checks:[]}
 const type=getFigureType(body.figureTypeId)
 if(!type||type.id!==body.figureTypeId) fail('请选择有效的具体图型，不能提交大类或未知类别。')
 if(body.taskName && body.taskName!==(type.kind==='data'?'plot':'diagram')) fail('图型与绘制路线不一致，请重新选择图型。')
 if((body.figureVariantIds||[]).some(id=>!type.variants.some(v=>v.id===id))) fail('图型变体与所选类别不一致。')
 if(type.id==='ordination'&&!ANALYSIS_METHODS.some(m=>m.typeId==='ordination'&&m.id===body.figureAnalysis?.method)) fail('排序图必须指定分析方法；PCA、PCoA、NMDS 等不能互换。')
 if(type.kind==='composite') {
  if(body.figureVariantIds?.length)fail('组合图目前仅支持基础编排；目录中的变体尚未逐项实现和验证。')
  if(!Array.isArray(body.figurePanels)||body.figurePanels.length<2||body.figurePanels.length>12) fail('组合图需要2至12个具名子图及各自的图型和输入。')
  if(type.id==='small_multiples' && new Set(body.figurePanels.map(panel=>panel?.figureTypeId)).size!==1)fail('分面小多图需要各面板使用相同图型；不同图型请用多面板组合图。')
  if(type.id==='small_multiples' && body.figureAnalysis?.panelScales && body.figureAnalysis.panelScales!=='independent')fail('当前分面仅实现明确标注的独立尺度；共享尺度变体尚未验证。')
  const labels=new Set()
  for(const panel of body.figurePanels) {
   if(!panel || typeof panel!=='object' || !getFigureType(panel.figureTypeId) || getFigureType(panel.figureTypeId).id!==panel.figureTypeId)fail('每个子图必须选择有效的具体图型，不能省略或使用历史大类。')
   if(!panel.label||typeof panel.label!=='string'||labels.has(panel.label)) fail('子图标签必须唯一。')
   labels.add(panel.label)
   if(getFigureType(panel.figureTypeId)?.kind==='composite') fail('本版不支持嵌套组合，请展开到具体子图。')
   validateFigureRequest(panel)
  }
 }
 if(type.kind!=='data') return {status:'content_review_required',checks:type.reviewRequirements}
 const data=body.figureData
 if(!data||!Array.isArray(data.rows)||data.rows.length===0) fail(`${type.label}需要真实结构化数据，请填写 figureData.rows；不能以模型编造数值。`)
 if(data.rows.some(row=>!row||typeof row!=='object'||Array.isArray(row))) fail('每一行数据必须是字段对象，不能是空值或数组。')
 if(data.rows.length>10000) fail('当前每图最多10,000行，请先明确聚合方式再提交。')
 if(!data.source||typeof data.source!=='string') fail('请注明数据来源或明确标记为模拟教学数据。')
 if(!data.units||typeof data.units!=='object'||Array.isArray(data.units)) fail('请注明数值字段单位；无量纲请写 dimensionless。')
 for(const field of type.numericFields) {
  if(!String(data.units[field]||'').trim()) fail(`缺少 ${field} 的单位。`)
  for(let i=0;i<data.rows.length;i++) if(typeof data.rows[i]?.[field]!=='number'||!Number.isFinite(data.rows[i][field])) fail(`第 ${i+1} 行 ${field} 必须是有限数值，缺失值须先明确处理，不能自动填零。`)
 }
 const rows=data.rows
 if(['sankey','chord','network'].includes(type.id)&&rows.some(r=>!r.source||!r.target)) fail('边数据必须包含 source 和 target。')
 if(['heatmap','adjacency_matrix','bubble_matrix','correlation_matrix','confusion_matrix','binary_matrix'].includes(type.id)) {
  if(rows.some(r=>r.row===undefined||r.column===undefined)) fail('矩阵数据必须包含 row 和 column。')
  if(new Set(rows.map(r=>JSON.stringify([r.row,r.column]))).size!==rows.length) fail('矩阵包含重复坐标，必须先明确聚合规则。')
 }
 if(['bar','dotplot','lollipop','dumbbell','forest','pie','rose','gantt'].includes(type.id)&&rows.some(r=>!String(r.label||'').trim())) fail('每行需要类别或对象 label。')
 if(['pie','rose','sankey','chord','treemap','circle_packing','alluvial','streamgraph','confusion_matrix'].includes(type.id)&&rows.some(r=>(r.value??r.y)<0)) fail('该图型的面积、流量或计数不能为负。')
 if(type.id==='pie'&&rows.reduce((s,r)=>s+r.value,0)<=0) fail('饼图总量必须大于0。')
 if(type.id==='bubble'&&rows.some(r=>r.size<0)) fail('气泡面积不能为负。')
 if(['gantt','gene_track','protein_domain','genome_circos','synteny'].includes(type.id)&&rows.some(r=>r.end<r.start)) fail('区间终点不能早于起点。')
 if(type.id==='forest'&&rows.some(r=>r.low>r.value||r.high<r.value)) fail('置信区间必须包含点估计。')
 if(type.id==='correlation_matrix'&&new Set(rows.map(r=>r.row)).size===new Set(rows.map(r=>r.column)).size){
  const values=new Map(rows.map(r=>[JSON.stringify([r.row,r.column]),r.value]))
  for(const row of rows){const reverse=values.get(JSON.stringify([row.column,row.row]));if(reverse!==undefined&&Math.abs(reverse-row.value)>1e-8)fail('同一变量对的相关系数必须对称，请核对数据。')}
 }
 if(type.id==='correlation_matrix'&&rows.some(r=>Math.abs(r.value)>1)) fail('相关系数必须在[-1,1]。')
 if(['volcano','enrichment'].includes(type.id)&&rows.some(r=>r.p<=0||r.p>1)) fail('P值须在(0,1]；零值需要先明确检测下限，不能偷偷替换。')
 if(type.id==='kaplan_meier'&&rows.some(r=>r.time<0||![0,1].includes(r.event))) fail('生存时间必须非负，event 为0删失或1事件。')
 if(type.id==='point_map'&&rows.some(r=>Math.abs(r.x)>180||Math.abs(r.y)>90)) fail('经纬度越界；投影坐标不能冒充经纬度。')
 const probabilities={roc:['fpr','tpr'],pr_curve:['precision','recall'],calibration:['predicted','observed']}
 if(probabilities[type.id]?.some(f=>rows.some(r=>r[f]<0||r[f]>1))) fail('概率或比例必须在[0,1]。')
 if(['forest','volcano','enrichment','correlation_matrix','ordination','kaplan_meier','funnel_meta'].includes(type.id)&&!body.figureAnalysis?.description) fail(`${type.label}必须说明计算方法、统计量和校正口径。`)
 if(['venn','upset'].includes(type.id)&&rows.some(r=>!r.set||!Array.isArray(r.members))) fail('集合图每行需要 set 名称与 members 成员数组。')
 validateSpecialistData(body)
 return {status:'input_validated',rowCount:rows.length,checks:['schema','finite_numbers','units','type_semantics'],limitations:['输入检查不证明数据来源真实，也不代替最终图像与统计方法核验。']}
}

// Explicit compatibility edges: a shared parent or research topic is never enough.
export const COMPATIBLE_REFERENCES = {
 method_framework:['workflow','system_architecture'], workflow:['swimlane'], swimlane:['workflow'],
 system_architecture:['neural_architecture'], neural_architecture:['method_framework'],
 boxplot:['raincloud'], violin:['raincloud'], raincloud:['boxplot','violin'],
 dotplot:['forest','lollipop'], bar:['dotplot'], line:['small_multiples'],
 heatmap:['bubble_matrix'], bubble_matrix:['heatmap'], venn:['upset'],upset:['venn'],
 multipanel:['comparison','small_multiples'],comparison:['multipanel'],
}
export function referenceIsUsable(row) {
 return row?.license?.status==='verified'&&['storage','display','modelInput','adaptation'].every(use=>row.license.permissions?.[use]===true)&&Boolean(row.imageUrl||row.imageObjectKey)
}
export function rankFigureReferences(rows,body) {
 const type=getFigureType(body.figureTypeId||body.infographicCategory)
 const words=String(body.methodContent||'').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>2)
 const preferences=body.figureAnalysis?.referencePreferences||{}
 return rows.filter(referenceIsUsable).flatMap(row=>{
  const ids=[row.figureTypeId,...(row.panelTypes||[]).map(p=>p.typeId)]
  const exact=type&&ids.includes(type.id)
  const compatible=type&&!exact&&(COMPATIBLE_REFERENCES[type.id]||[]).some(id=>ids.includes(id))
  if(type&&!exact&&!compatible) return []
  const text=String([row.title,row.summary,row.researchDomain,...(row.tags||[])].join(' ')).toLowerCase()
  const score=(exact?1000:compatible?500:0)+Math.min(50,words.filter(w=>text.includes(w)).length)+(preferences.layout&&row.layout.includes(preferences.layout)?15:0)+(preferences.density&&row.density===preferences.density?10:0)+(preferences.discipline&&text.includes(String(preferences.discipline).toLowerCase())?20:0)
  return [{...row,match:{level:exact?'exact':compatible?'compatible':'legacy',score,requestedTypeId:type?.id||null,preferences,reason:exact?'图型或明确标注的子图精确匹配':compatible?`明确兼容的结构参考；保留目标图型 ${type.label}，不迁移其数据语义`:'历史未细分类别；仅作为通用设计参考'}}]
 }).sort((a,b)=>b.match.score-a.match.score||a.id.localeCompare(b.id))
}
