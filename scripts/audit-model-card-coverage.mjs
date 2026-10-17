import fs from 'node:fs'
import {modelCardSpecifications,modelCardName} from '../apps/web/src/lib/modelCardSpecifications.js'
const [input,output]=process.argv.slice(2)
if(!input||!output)throw new Error('Usage: audit-model-card-coverage.mjs registry.json output-prefix')
const registry=JSON.parse(fs.readFileSync(input,'utf8'))
const rows=Object.entries(registry.providers).flatMap(([provider,entry])=>entry.models.map(model=>{
 const facts=modelCardSpecifications(provider,model)
 return {provider,id:model.id,name:modelCardName(provider,model),selectable:model.selectable===true,discovered:model.catalogDiscovered===true,
  input:facts.input,output:facts.output,context:facts.context,limits:facts.limitRows.map(row=>`${row.label}：${row.value}`).join('；'),sources:facts.sources,
  modalitiesComplete:![facts.input,facts.output].some(value=>/待确认/.test(value)),numericContext:/tokens$/.test(facts.context),promptLimit:facts.limitRows.some(row=>row.label!=='上下文窗口'),
 }
}))
const summary={registryVersion:registry.registryVersion,generatedAt:new Date().toISOString(),routeRows:rows.length,channels:Object.keys(registry.catalogProviders).length,
 withSources:rows.filter(row=>row.sources.length).length,modalitiesComplete:rows.filter(row=>row.modalitiesComplete).length,numericContext:rows.filter(row=>row.numericContext).length,promptLimits:rows.filter(row=>row.promptLimit).length,
 providers:Object.entries(registry.catalogProviders).map(([id,descriptor])=>({id,...descriptor,rows:rows.filter(row=>row.provider===id).length,health:registry.catalogHealth[id]||null}))}
fs.writeFileSync(output+'.json',JSON.stringify(summary,null,2)+'\n')
const fields=['provider','id','name','selectable','discovered','input','output','context','limits','sources']
const quote=value=>'"'+String(Array.isArray(value)?value.join(' | '):value??'').replaceAll('"','""')+'"'
fs.writeFileSync(output+'.csv','\ufeff'+[fields,...rows.map(row=>fields.map(key=>row[key]))].map(row=>row.map(quote).join(',')).join('\n')+'\n')
console.log(JSON.stringify({...summary,providers:summary.providers.map(({id,access,rows,health})=>({id,access,rows,state:health?.state}))},null,2))
