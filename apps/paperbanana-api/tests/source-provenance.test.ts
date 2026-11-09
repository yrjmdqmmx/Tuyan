import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {buildSourceCatalog,strictSourceJson,validateSourceCatalog,resolveReviewSourceRefs,sourceScope,sourcePanelBody,buildSourceProtocolSnapshot,sourceProtocolMismatch} from '../src/source-provenance.js'
import {resolveTopologySourceRefs,parseDiagramTopology,validateTopologyAudit,topologyExtractionPrompt} from '../src/diagram-topology.js'
import {validateRendererAudit,programRendererReviewPrompt} from '../src/renderer-contract.js'
import {topologyProtocolCorrection,reviewProtocolCorrection} from '../src/protocol-correction.js'
import {mockTopology,mockTopologyAudit,semanticFixture} from './helpers/topology-fixtures.js'
import {topologyWire,reviewWire} from './helpers/source-fixtures.js'
const body={figureTypeId:'workflow',outputFormat:'svg',methodContent:'Input then Output. "科学🧪"; 原样引用。',caption:'White background.',negativePrompt:'No grid.'},catalog=buildSourceCatalog(body,sourceScope('a'))
const sha=(s:string)=>createHash('sha256').update(s).digest('hex')
const tagged=(prompt:string,tag:string)=>{const m=prompt.match(new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`));assert.ok(m,tag);return m[1]}

test('complete anonymous and program root templates validate without wrapping values or relocating headers',()=>{
 const original={methodContent:'Unnamed initial dot enters Ready.',caption:'Use English labels.'},c=buildSourceCatalog(original,'job:complete-template'),ref=c.entries.find(e=>e.sourceField==='methodology')!.id
 const raw=tagged(topologyExtractionPrompt(),'topology_v2_anonymous_template').replaceAll('EXACT ORIGINAL NAME','Ready').replaceAll('copy current catalogHash',c.catalogHash).replaceAll('choose original source ID containing this exact name',ref).replaceAll('choose original source ID requesting the unnamed marker',ref).replaceAll('exact original marker phrase inside that source slice','Unnamed initial dot').replaceAll('choose original relation source ID',ref)
 const wire=JSON.parse(raw),graph=parseDiagramTopology(resolveTopologySourceRefs(raw,c).resolvedRaw,original.methodContent)
 assert.deepEqual(Object.keys(wire.anonymousInitials),['marker_a']);assert.equal(wire.edges[0].source.initial,'marker_a');assert.deepEqual(graph.nodes.map(n=>n.label),['Ready','']);assert.equal(graph.edges[0].target,graph.nodes[0].id)
 const prompt=programRendererReviewPrompt();assert.doesNotMatch(prompt,/<renderer_audit_v2_template>|Return strict JSON \{"critic_suggestions"/)
 const response=JSON.parse(tagged(prompt,'program_review_v2_template').replaceAll('CURRENT_CATALOG_HASH',c.catalogHash).replaceAll('CURRENT_ORIGINAL_REF',c.entries.find(e=>e.sourceField==='visualIntent')!.id))
 assert.deepEqual(Object.keys(response).sort(),['critic_suggestions','revised_description','sourceProtocolVersion','sourceCatalogHash','rendererAudit'].sort());assert.deepEqual(Object.keys(response.rendererAudit),['originalRequirements'])
 for(const verdict of ['satisfied','unmet','unsupported','uncertain']){response.rendererAudit.originalRequirements[0].verdict=verdict;assert.equal(validateRendererAudit(resolveReviewSourceRefs(JSON.stringify(response),c).resolvedRaw,original).passed,verdict==='satisfied')}
})

test('round-five captured flattened initial maps and nested program headers remain rejected with precise stable diagnostics',async()=>{
 const root='../../docs/infographic-v400/svg-repair-20261010/evidence/round-5'
 for(const [scenario,n] of [['state-diagram-svg',2],['state-diagram-svg',3],['mixed-workflow-bar-svg',8],['mixed-workflow-bar-svg',9]] as const){
  const captured=JSON.parse(await readFile(`${root}/${scenario}/call-${n}-${n<4?'topology':'review'}.json`,'utf8')),content=captured.request.messages.find((m:any)=>m.role==='user').content,context=JSON.parse(typeof content==='string'?content:content.filter((p:any)=>p.type==='text').map((p:any)=>p.text).join('\n')),raw=captured.responseText,before=sha(raw)
  let error:any;try{if(n<4)resolveTopologySourceRefs(raw,context.sourceCatalog);else resolveReviewSourceRefs(raw,context.sourceCatalog)}catch(e){error=e}assert.ok(error,'invalid raw must not be automatically repaired')
  const correction=n<4?topologyProtocolCorrection(raw,error):reviewProtocolCorrection(raw,error);assert.ok(correction)
  assert.equal(correction.code,n<4?'source_initial_fields':'source_envelope');assert.equal(correction.diagnostic?.path,n<4?'$.anonymousInitials["sourceRef"]':'$.sourceProtocolVersion');assert.equal(correction.diagnostic?.actualType,n<4?'string':'missing')
  if(n<4)assert.match(correction.diagnostic!.expected,/map.*marker_a/);else assert.equal(correction.diagnostic?.observedPath,'$.rendererAudit.sourceProtocolVersion')
  assert.equal(sha(raw),before);assert.equal(JSON.stringify(correction),JSON.stringify(n<4?topologyProtocolCorrection(raw,error):reviewProtocolCorrection(raw,error)),'stable retry descriptor input')
 }
})
test('catalogues bind exact Unicode spans, source bytes, job/panel and immutable snapshots',()=>{
 assert.deepEqual(buildSourceCatalog(body,sourceScope('a')),catalog)
 for(const e of catalog.entries){const original=({methodology:body.methodContent,visualIntent:body.caption,avoid:body.negativePrompt})[e.sourceField];assert.equal(e.text,original.slice(e.start,e.end));assert.equal(e.sha256,sha(e.text))}
 for(const scope of ['job:b','job:a/panel:1','job:a/panel:2'])assert.notEqual(buildSourceCatalog(body,scope).catalogHash,catalog.catalogHash)
 for(const change of [{methodContent:body.methodContent+' '},{caption:'White background!'}])assert.throws(()=>validateSourceCatalog(catalog,{...body,...change},catalog.scope),/original snapshot/)
 const changed=structuredClone(catalog);changed.entries[0].text+='x';assert.throws(()=>validateSourceCatalog(changed,body,catalog.scope),/integrity/)
 const composite={...body,figureTypeId:'multipanel',generationContext:{methodContent:'wrong inherited original'},figurePanels:[{label:'A',figureTypeId:'workflow'},{label:'B',figureTypeId:'workflow',methodContent:'B original'}]};const p=sourcePanelBody(composite,composite.figurePanels[0]);assert.equal(p.methodContent,body.methodContent);assert.equal(p.generationContext,undefined);assert.doesNotMatch(JSON.stringify(buildSourceCatalog(p,'panel')),/仅绘制|wrong inherited/)
 const snapshot=buildSourceProtocolSnapshot(body,'a');assert.equal(sourceProtocolMismatch({kind:'create',jobId:'a',body,sourceProtocol:snapshot}),false);assert.equal(sourceProtocolMismatch({kind:'create',jobId:'a',body}),true);assert.equal(sourceProtocolMismatch({kind:'create',jobId:'a',body:{...body,caption:'changed'},sourceProtocol:snapshot}),true)
 assert.equal(sourceProtocolMismatch({kind:'create',jobId:'a',body:{taskName:'diagram',outputFormat:'svg'}}),false)
})
test('strict JSON rejects duplicate decoded keys including hidden substantive findings and special names are safe',()=>{
 for(const raw of ['{"End":1,"End":2}','{"End":1,"\\u0045nd":2}','{"x":{"a":1,"\\u0061":2}}','{"visual":{"findings":["missing"]},"visual":{"findings":[]}}'])assert.throws(()=>strictSourceJson(raw),/duplicate JSON/)
 for(const raw of ['{}','[]','{"a":"brace \\" }", "b": []}','{"__proto__":{},"constructor":1}'])assert.deepEqual(strictSourceJson(raw),JSON.parse(raw))
 const names=['__proto__','constructor'],original=names.join(' then '),c=buildSourceCatalog({methodContent:original},'special'),g=mockTopology(original);g.nodes.forEach((n,i)=>n.label=names[i]);const parsed=parseDiagramTopology(resolveTopologySourceRefs(JSON.stringify(topologyWire(g,c)),c).resolvedRaw,original);assert.deepEqual(parsed.nodes.map(n=>n.label),names);assert.equal(({} as any).polluted,undefined)
})
test('new name-keyed wire produces one shared End and unchanged state semantics, while legacy duplicates remain rejected',async()=>{
 const root='../../docs/infographic-v400/svg-repair-20261010/evidence/round-4'
 for(const kind of ['workflow','state_transition'] as const){const name=kind==='workflow'?'mixed-workflow-bar-svg':'state-diagram-svg',input=JSON.parse(await readFile(`${root}/${name}/input.json`,'utf8')),b=kind==='workflow'?{...input,...input.figurePanels[0]}:input,c=buildSourceCatalog(b,'job:actual/panel:1'),g=semanticFixture(kind,b.methodContent),wire=topologyWire(g,c),parsed=parseDiagramTopology(resolveTopologySourceRefs(JSON.stringify(wire),c).resolvedRaw,b.methodContent+'\n'+b.caption)
 assert.equal(parsed.nodes.length,g.nodes.length);assert.equal(parsed.edges.length,7);assert.equal(parsed.nodes.filter(n=>n.label==='End').length,kind==='workflow'?1:0);assert.deepEqual(parsed.nodes.map(n=>n.label).sort(),g.nodes.map(n=>n.label).sort());assert.ok(parsed.nodes.every(n=>n.id.length===18));assert.deepEqual(resolveTopologySourceRefs(JSON.stringify(wire),c).resolvedRaw,resolveTopologySourceRefs(JSON.stringify(wire),c).resolvedRaw)
 if(kind==='workflow'){const end=parsed.nodes.find(n=>n.label==='End')!;assert.equal(parsed.edges.filter(e=>e.target===end.id).length,2)}
 else{const idle=parsed.nodes.find(n=>n.label==='Idle')!.id;assert.equal(parsed.edges.find(e=>e.label==='cancel')!.target,idle);assert.equal(parsed.edges.find(e=>e.label==='reset')!.target,idle);assert.equal(parsed.nodes.find(n=>n.label==='Completed')!.role,'normal')}
 }
 for(const call of ['call-6-topology','call-7-topology']){const input=JSON.parse(await readFile(`${root}/mixed-workflow-bar-svg/input.json`,'utf8')),captured=JSON.parse(await readFile(`${root}/mixed-workflow-bar-svg/${call}.json`,'utf8')),c=buildSourceCatalog(input,'legacy'),r=resolveTopologySourceRefs(captured.responseText,c);assert.equal(r.resolvedRaw,captured.responseText);assert.equal(r.mode,'legacy_quote');assert.throws(()=>parseDiagramTopology(r.resolvedRaw,input.methodContent),/duplicate named|ambiguous original/)}
})
test('source refs reject foreign hashes, unknown/mixed evidence, names absent from source, and never repair bad legacy quotes',()=>{
 const g=mockTopology(body.methodContent),wire=topologyWire(g,catalog),raw=JSON.stringify(wire)
 for(const c of [buildSourceCatalog(body,'job:b'),buildSourceCatalog(body,'job:a/panel:1')])assert.throws(()=>resolveTopologySourceRefs(raw,c),/hash mismatch/)
 const mutate=(f:(v:any)=>void)=>{const d=structuredClone(wire);f(d);assert.throws(()=>resolveTopologySourceRefs(JSON.stringify(d),catalog),/SOURCE_PROTOCOL_INVALID/)}
 mutate(d=>d.namedNodes.Input.sourceRef='unknown');mutate(d=>d.namedNodes.Input.sourceQuote='Input');mutate(d=>d.namedNodes.Input.sourceField='figureContract');mutate(d=>d.namedNodes.Invented=d.namedNodes.Input);mutate(d=>d.edges[0].target={name:'unknown'});mutate(d=>d.namedNodes.Input.sourceRef=catalog.entries.find(e=>e.sourceField==='avoid')!.id)
 const parsed=parseDiagramTopology(resolveTopologySourceRefs(raw,catalog).resolvedRaw,body.methodContent),audit={topologyAudit:mockTopologyAudit(parsed),rendererAudit:{originalRequirements:[]}},v2=reviewWire(audit,catalog)
 assert.equal(validateTopologyAudit(resolveReviewSourceRefs(JSON.stringify(v2),catalog,parsed).resolvedRaw,parsed,body.methodContent).passed,true)
 for(const change of [{sourceQuote:'fabricated'},{sourceField:'figureContract'},{sourceRef:'unknown'},{sourceRef:catalog.entries.find(e=>e.sourceField==='avoid')!.id}]){const d=structuredClone(v2);Object.assign(d.topologyAudit.originalRequiredNodes[0],change);assert.throws(()=>resolveReviewSourceRefs(JSON.stringify(d),catalog,parsed),/SOURCE_PROTOCOL_INVALID/)}
 const legacy=JSON.stringify({topologyAudit:{...audit.topologyAudit,originalRequiredNodes:audit.topologyAudit.originalRequiredNodes.map(n=>({...n,sourceQuote:'States: ... Input'}))}}),resolved=resolveReviewSourceRefs(legacy,catalog,parsed);assert.equal(resolved.resolvedRaw,legacy);assert.throws(()=>validateTopologyAudit(resolved.resolvedRaw,parsed,body.methodContent),/original evidence/)
 const own=JSON.stringify({...v2,panelRendererAudits:{A:{originalRequirements:[{sourceRef:'foreign-panel',verdict:'unmet'}]}}});assert.deepEqual(JSON.parse(resolveReviewSourceRefs(own,catalog).resolvedRaw).panelRendererAudits,JSON.parse(own).panelRendererAudits,'parent cannot resolve or certify child audit')
})
test('resolved renderer audit preserves unsupported original requirements and current failures',()=>{
 const requirement={sourceField:'visualIntent',sourceQuote:body.caption,requirement:'White background',verdict:'unsupported',evidence:'Current renderer mismatch.'},raw=reviewWire({rendererAudit:{originalRequirements:[requirement]},visual:{status:'issues_found',findings:['real issue']},uncertainties:['real uncertainty']},catalog),resolved=resolveReviewSourceRefs(JSON.stringify(raw),catalog)
 assert.equal(validateRendererAudit(resolved.resolvedRaw,body).passed,false);assert.deepEqual(JSON.parse(resolved.resolvedRaw).visual,raw.visual);assert.deepEqual(JSON.parse(resolved.resolvedRaw).uncertainties,raw.uncertainties)
 const mixed=structuredClone(raw);mixed.rendererAudit.originalRequirements[0].sourceField='figureContract';assert.throws(()=>resolveReviewSourceRefs(JSON.stringify(mixed),catalog),/mixed or unknown/)
})

test('deeply nested duplicate-key attacks cannot fall back to legacy JSON and erase substantive findings',async()=>{
 const {reviewProtocolCorrection,topologyProtocolCorrection}=await import('../src/protocol-correction.js')
 const raw='{"visual":{"status":"issues_found","findings":["missing semantic node"]},"padding":'+'['.repeat(20000)+'null'+']'.repeat(20000)+',"padding":null,"visual":{"status":"passed","findings":[]},"rendererAudit":{"originalRequirements":[]}}'
 for(const resolve of [resolveReviewSourceRefs,resolveTopologySourceRefs]){let error:any;try{resolve(raw,catalog)}catch(e){error=e}assert.match(error.message,/nesting exceeds/);assert.equal(reviewProtocolCorrection(raw,error),undefined);assert.equal(topologyProtocolCorrection(raw,error),undefined)}
 for(const raw of ['{"uncertainties":["unknown"],"uncertainties":[]}','{"visual":{"findings":["missing"]},"visual":{"findings":[]}}']){let error:any;try{resolveReviewSourceRefs(raw,catalog)}catch(e){error=e}assert.match(error.message,/duplicate JSON/);assert.equal(reviewProtocolCorrection(raw,error),undefined);assert.equal(topologyProtocolCorrection(raw,error),undefined)}
})

test('captured round-4 ellipsized review remains invalid in legacy mode; large quoted literals are not nesting',async()=>{
 const base='../../docs/infographic-v400/svg-repair-20261010/evidence/round-4/state-diagram-svg',input=JSON.parse(await readFile(base+'/input.json','utf8')),extraction=JSON.parse(await readFile(base+'/call-2-topology.json','utf8')),graph=parseDiagramTopology(extraction.responseText,input.methodContent+'\n'+input.caption),c=buildSourceCatalog(input,'legacy-state')
 for(const n of [3,4]){const captured=JSON.parse(await readFile(`${base}/call-${n}-review.json`,'utf8')),resolved=resolveReviewSourceRefs(captured.responseText,c,graph);assert.equal(resolved.mode,'legacy_quote');assert.equal(resolved.resolvedRaw,captured.responseText);assert.throws(()=>validateTopologyAudit(resolved.resolvedRaw,graph,input.methodContent+'\n'+input.caption),/original evidence/)}
 const literal='['.repeat(30000)+'"escaped quote" '+']'.repeat(30000),raw=JSON.stringify({literal,arrays:[[],{}]});assert.deepEqual(strictSourceJson(raw),JSON.parse(raw))
})
