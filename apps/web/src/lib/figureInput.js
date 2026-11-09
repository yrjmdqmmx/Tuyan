import {getFigureType,getSpecialistSchema} from '../../../../packages/figure-taxonomy/src/index.js'
import {validateDeterministicOptions} from '../../../../packages/figure-taxonomy/src/plot.js'

export function parseFigureCsv(text,numericFields=[]) {
 const rows=[];let row=[],cell='',quoted=false
 for(let i=0;i<=text.length;i++){
  const ch=i===text.length?'\n':text[i]
  if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
  else if(!quoted&&(ch===','||ch==='\n'||ch==='\r')){row.push(cell.trim());cell='';if(ch!==','){if(row.some(Boolean))rows.push(row);row=[];if(ch==='\r'&&text[i+1]==='\n')i++}}
  else cell+=ch
 }
 if(quoted)throw new Error('数据中有未闭合的引号。')
 if(rows.length<2)throw new Error('请提供表头及至少一行数据。')
 const headers=rows.shift()
 if(headers.some(h=>!h||['__proto__','constructor','prototype'].includes(h))||new Set(headers).size!==headers.length)throw new Error('数据表头重复或无效。')
 return rows.map((cells,i)=>{
  if(cells.length!==headers.length)throw new Error(`第${i+2}行与表头列数不一致。`)
  return Object.fromEntries(headers.map((h,j)=>{
   const value=cells[j]
   if(numericFields.includes(h)){if(!value||!Number.isFinite(Number(value)))throw new Error(`第${i+2}行 ${h} 不是有效数值。`);return [h,Number(value)]}
   if(h==='members')return [h,value.split(';').map(v=>v.trim()).filter(Boolean)]
   if(['parent','cause'].includes(h)&&value==='null')return [h,null]
   return [h,value]
  }))
 })
}
export function parseFigureJson(text,label='JSON') {
 try {return JSON.parse(text)}catch{throw new Error(`${label}不是有效 JSON，请核对引号、逗号及数组结构。`)}
}
export function schemaOptionFields(typeId) {
 const schema=getSpecialistSchema(typeId)
 return (schema?.options||[]).map(spec=>{
  const match=spec.match(/^([^:]+):(.+)$/),key=match[1].replace(/\?$/,''),shape=match[2].replace(/ \(.+\)$/,'')
  const example=schema.example.figureData.options?.[key]
  let choices=[]
  if(shape==='boolean')choices=[true,false]
  else if(shape==='false'||shape==='true')choices=[shape==='true']
  else if(shape.includes('|')&&!shape.includes('{'))choices=shape.split('|')
  else if(!/[\[\]{}]/.test(shape)&&!['string','number','integer','positive number'].includes(shape))choices=[shape]
  return {key,spec,shape,optional:match[1].endsWith('?'),example,choices,kind:choices.length?'select':/[\[\]{}]/.test(shape)?'json':shape.includes('number')||shape==='integer'?'number':'text'}
 })
}
export function numericInputFields(typeId,options={}) {
 const type=getFigureType(typeId),schema=getSpecialistSchema(typeId)
 const fields=(schema?.fields||[]).filter(f=>/:(?:number|integer|0\|1)/.test(f)&&!f.startsWith('<')).map(f=>f.split(':')[0].replace(/\?$/,''))
 return [...new Set([...(type?.numericFields||[]),...fields,...(options.axes||[]).map(a=>a.id),...(options.dimensions||[]),...(typeId==='calibration'?['count']:[])])]
}
export function figurePayload(typeId,draft={}) {
 const type=getFigureType(typeId)
 if(!type)throw new Error('请选择具体图型。')
 const payload={figureTypeId:type.id,figureVariantIds:draft.variants||[],figureAnalysis:draft.analysis||{}}
 if(type.id==='small_multiples')payload.figureAnalysis={...payload.figureAnalysis,panelScales:payload.figureAnalysis.panelScales||'independent'}
 if(type.kind==='data') {
  const options={...draft.options}
  for(const field of schemaOptionFields(type.id)){
   if(!Object.hasOwn(draft.optionInputs||{},field.key))continue
   const value=draft.optionInputs[field.key]
   if(value===''){delete options[field.key];continue}
   options[field.key]=field.kind==='json'?parseFigureJson(value,`options.${field.key}`):field.kind==='number'?Number(value):value==='true'?true:value==='false'?false:value
   if(field.kind==='number'&&!Number.isFinite(options[field.key]))throw new Error(`options.${field.key}需要有限数值。`)
  }
  const rows=draft.dataMode==='json'||(draft.dataMode!=='csv'&&getSpecialistSchema(type.id))?parseFigureJson(draft.rowsJson||'[]',`${type.label}数据行`):parseFigureCsv(draft.csv||'',numericInputFields(type.id,options))
  if(!Array.isArray(rows))throw new Error('数据行 JSON 必须是对象数组。')
  const units=draft.unitsJson!==undefined?parseFigureJson(draft.unitsJson,'单位'):draft.units||{}
  if(!units||typeof units!=='object'||Array.isArray(units))throw new Error('单位 JSON 必须是字段名到单位的对象。')
  payload.figureData={...draft.extraData,rows,source:draft.source||'',units,options}
 }
 if(type.id==='small_multiples'&&(draft.panels||[]).some(panel=>panel.typeId!==draft.panels[0]?.typeId))throw new Error('小多图需要所有面板使用同一基础图型；不同图型请选择多面板组合图。')
 if(type.kind==='composite') payload.figurePanels=(draft.panels||[]).map(panel=>({label:panel.label,methodContent:panel.methodContent||'',caption:panel.caption||'',...figurePayload(panel.typeId,panel.draft)}))
 return payload
}
export function validateFigureOptions(body) {
 if(body.figureData)validateDeterministicOptions(body)
 for(const panel of body.figurePanels||[])validateFigureOptions(panel)
}
export function figureDraftFromPayload(body={}) {
 const data=body.figureData
 const draft={variants:body.figureVariantIds||[],analysis:body.figureAnalysis||{}}
 if(data){const {rows,source,units,options,...extraData}=data;Object.assign(draft,{dataMode:'json',rowsJson:JSON.stringify(rows,null,2),source:source||'',units:units||{},options:options||{},extraData})}
 if(body.figurePanels)draft.panels=body.figurePanels.map(panel=>({label:panel.label,typeId:panel.figureTypeId,methodContent:panel.methodContent||'',caption:panel.caption||'',draft:figureDraftFromPayload(panel)}))
 return draft
}
export function syntheticFigureDraft(typeId) {
 const sample=getSpecialistSchema(typeId)?.example
 return sample?figureDraftFromPayload(sample):null
}
export function switchPanelType(panel,typeId) {
 const drafts={...panel.drafts,[panel.typeId]:panel.draft||{}}
 return {...panel,typeId,drafts,draft:drafts[typeId]||{}}
}
export function suggestedColumns(type) {
 const schema=getSpecialistSchema(type.id)
 if(schema)return schema.fields.filter(f=>!f.startsWith('<')).map(f=>f.split(':')[0].replace(/\?$/,''))
 if(['venn','upset'].includes(type.id))return ['set','members']
 if(['network','sankey','chord'].includes(type.id))return ['source','target',...type.numericFields]
 if(['heatmap','bubble_matrix','binary_matrix','adjacency_matrix','correlation_matrix','confusion_matrix'].includes(type.id))return ['row','column',...type.numericFields]
 if(['boxplot','violin','density','raincloud','ridgeline','stripplot'].includes(type.id))return ['group',...type.numericFields]
 if(['bar','dotplot','lollipop','dumbbell','forest','gantt','pie','rose','gene_track','protein_domain'].includes(type.id))return ['label',...type.numericFields]
 return type.numericFields.length?type.numericFields:['label','value']
}
