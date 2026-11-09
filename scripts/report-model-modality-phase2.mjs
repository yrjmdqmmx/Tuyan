// Historical Phase 2 report uses Phase A sources; current R22B has its own report.
import { productBundle } from '../test-support/execution-capability.mjs'
import snapshot from '../config/channel-audit/tokendance-catalog-snapshot-20261109b.json' with {type:'json'}
// Offline full Core -> Web/Mini projection audit. No provider transport is used.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { phase2Registry, assertPhase2Facts, evidence } from '../test-support/phase2-modality.mjs'
import { loadCard, writeOrCheck } from './lib/model-card-audit.mjs'
const { modalityIconStates } = await productBundle("export { modalityIconStates } from './apps/web/src/lib/modelModalityIcons.js'", 'c76e9c2a')
import before from '../config/channel-audit/model-modality-phase2-before-20261109.json' with {type:'json'}
import { STATIC_MODEL_REGISTRY } from '../apps/web/src/lib/staticModelCatalog.js'
const root=fileURLToPath(new URL('../',import.meta.url)), check=process.argv.includes('--check')
Date.now=()=>Date.parse('2026-11-09T12:00:00Z')
const core=await productBundle("export { modelRegistry, configureRuntimeFetch } from './apps/paperbanana-api/runtime/handler.ts'", 'c76e9c2a')
core.configureRuntimeFetch(async url=>String(url)===snapshot.sourceUrl?Response.json({data:snapshot.data}):Response.json({error:'offline fixture'},{status:503}))
const registry=await core.modelRegistry({}), card=await loadCard(root,'c76e9c2a')
const all=Object.entries(registry.providers).flatMap(([channel,p])=>p.models.map(model=>({key:channel+'/'+model.id,channel,model,card:card(channel,model)})))
const byKey=new Map(all.map(r=>[r.key,r]))
assert.equal(all.length,1061)
assertPhase2Facts(key=>byKey.get(key).card)
const view=c=>({source:c.sources[0],icons:['inputModalities','outputModalities'].map(f=>modalityIconStates(null,c.fields[f]).map(({id,state})=>[id,state]))})
const differences={source:0,modalities:0,either:0,fullResolvedFields:0,coreProjection:0}
const sourceChanges=[]
for(const row of all){
 const a=view(row.card),b=view(card(row.channel,{id:row.model.id}))
 const source=a.source!==b.source,modalities=JSON.stringify(a.icons)!==JSON.stringify(b.icons)
 differences.source+=source;differences.modalities+=modalities;differences.either+=source||modalities
 differences.fullResolvedFields+=JSON.stringify(card(row.channel,{id:row.model.id},registry).fields)!==JSON.stringify(row.card.fields)
 differences.coreProjection+=JSON.stringify(row.model.cardSpecifications.fields)!==JSON.stringify(row.card.fields)
 if(before.firstSources[row.key]!==a.source)sourceChanges.push({key:row.key,before:before.firstSources[row.key],after:a.source})
}
assert.deepEqual(Object.values(differences),[0,0,0,0,0])
for (const [key, source] of Object.entries(before.staticOnlySources)) {
 const slash=key.indexOf('/'),channel=key.slice(0,slash),id=key.slice(slash+1)
 const after=card(channel,STATIC_MODEL_REGISTRY[channel].models.find(m=>m.id===id)).sources[0]
 if(source!==after) sourceChanges.push({key,before:source,after,staticOnly:true})
}
const tables=Object.entries(evidence.tables).map(([key,row])=>({key,legacy20:before.legacyStaticTables.includes(key),...row,before:before.rows[key].fields,after:byKey.get(key).card.fields}))
const reviews=Object.entries(evidence.reviews).flatMap(([key,fields])=>Object.entries(fields).flatMap(([field,row])=>Object.entries(row.decisions).map(([modality,state])=>({key,field,modality,before:before.rows[key].fields[field].value?.includes(modality)?'supported':'unknown',after:state,sourceUrl:row.sourceUrl,quote:row.quote,mode:row.mode}))))
const links=Object.entries(evidence.links).map(([key,row])=>{assert.ok(byKey.has(key));assert.equal(byKey.get(key).card.sources[0],row.visibleUrl);return {key,...row}})
const totals={registryCards:all.length,legacyBailianCards:before.legacyStaticTables.length,bailianFullCards:tables.length,tableFields:tables.length*2,misleadingCards:Object.keys(evidence.reviews).length,reviewedModalityEntries:reviews.length,supported:reviews.filter(r=>r.after==='supported').length,unknown:reviews.filter(r=>r.after==='unknown').length,unsupported:reviews.filter(r=>r.after==='unsupported').length,links:links.length,verifiedChannelAvailability:0,unverifiedChannelAvailability:links.length,sourceChanges:sourceChanges.length,beforeObjectDifferences:before.objectDifferences,remainingProductDifferences:differences}
writeOrCheck(root+'docs/model-modality-audit-20261109-phase2-results.json',JSON.stringify({date:evidence.verifiedAt,basis:'Actual offline Core modelRegistry, complete models, actual Web resolver, ID resolution and Core-generated Mini projection',totals,tables,reviews,links,sourceChanges},null,2)+'\n',check)
console.log(JSON.stringify(totals,null,2))
