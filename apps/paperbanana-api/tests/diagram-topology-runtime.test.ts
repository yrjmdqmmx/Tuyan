import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {spawn} from 'node:child_process'
import {createHash} from 'node:crypto'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
import {TAXONOMY_VERSION} from '../../../packages/figure-taxonomy/src/index.js'
import {TokenDanceError} from '../../../packages/api/src/tokendance.js'
import {mockTopology,mockTopologyAudit,semanticFixture} from './helpers/topology-fixtures.js'
const old='../../docs/infographic-v400/completion/evidence/live-bailian',out='../../.superpowers/sdd/2026-10-10-svg-topology-repair/runtime-evidence'
const parts=(w:any)=>[...(Array.isArray(w.input)?w.input:[]),...(w.messages||[])]
const user=(w:any)=>parts(w).filter((m:any)=>m.role==='user').flatMap((m:any)=>typeof m.content==='string'?[m.content]:m.content.filter((p:any)=>['text','input_text'].includes(p.type)).map((p:any)=>p.text)).join('\n')
const images=(w:any)=>parts(w).flatMap((m:any)=>Array.isArray(m.content)?m.content:[]).filter((p:any)=>['image_url','input_image'].includes(p.type))
const body={action:'createJob',provider:'openai',apiKeys:{openai:'fixture'},mainModelName:'gpt-5.6-sol',imageModelName:'gpt-image-2',referenceVisionModelName:'gpt-5.6-sol',visionMode:'none',methodContent:'Input then Output. Explicit synthetic topology test with no other relationships.',caption:'Explicit mock test',taskName:'diagram',figureTypeId:'workflow',figureSpecVersion:TAXONOMY_VERSION,outputFormat:'svg',pipelineMode:'planner_critic',retrievalSetting:'none',maxCriticRounds:1,numCandidates:1,imageSize:'1K',aspectRatio:'16:9'}
const hash=(v:any)=>createHash('sha256').update(v).digest('hex')
async function create(r:any,payload:any){const created=await r.post(payload);assert.equal(created.data.code,0,JSON.stringify(created));await r.legacy.drainJobAdmission();return (await r.post({action:'getJob',jobId:created.data.jobId})).data.job}
function actualWorker(wire:any):Promise<any>{return new Promise((resolve,reject)=>{const child=spawn(process.env.TUYAN_QA_PYTHON||'/Users/a1-6/.cache/tuyan-figure-qa-20261010/bin/python',['../../scripts/figures/render-json.py']),out:Buffer[]=[],err:Buffer[]=[];child.stdout.on('data',b=>out.push(b));child.stderr.on('data',b=>err.push(b));child.on('error',reject);child.on('close',code=>{try{if(code)throw Error(Buffer.concat(err).toString());resolve(JSON.parse(Buffer.concat(out).toString()))}catch(e){reject(e)}});child.stdin.end(JSON.stringify(wire))})}
function install(r:any,{kind='simple',wrong=false,repair=false,missingAudit=false,stale=false,ambiguous=false,tiny=false,advisoryPlan='',requirements=[],omitRendererAudit=false,styleOnlyRepair=false,unknownNode=false,badCompositeAudit=false,mutate}:{kind?:'simple'|'state_transition'|'workflow';wrong?:boolean;repair?:boolean;missingAudit?:boolean;stale?:boolean;ambiguous?:boolean;tiny?:boolean;advisoryPlan?:string;requirements?:any[];omitRendererAudit?:boolean;styleOnlyRepair?:boolean;unknownNode?:boolean;badCompositeAudit?:boolean|'large';mutate?:(kind:string,answer:string,context:any,calls:any[])=>string|Promise<string>}={}){
 const calls:any[]=[],workers:any[]=[];let reviewed=0
 r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
  if(String(url).endsWith('/models'))return Response.json({data:[]})
  assert.ok(!String(url).includes('/images/'),'deterministic diagrams and numeric panels never invoke image generation')
  const wire=JSON.parse(String(init.body)),all=JSON.stringify(wire),text=user(wire)
  if(String(url).endsWith('/render')){const result=await actualWorker(wire);assert.equal(result.ok,true);workers.push({wire,result});if(tiny)result.svg_base64=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><text x="40" y="100" font-size="8">tiny immutable numeric fixture</text></svg>').toString('base64');if(tiny)result.render_validation.svgHash=hash(Buffer.from(result.svg_base64,'base64'));return Response.json(result)}
  let callKind=all.includes('You are the style planner')?'styling':'plan',answer=advisoryPlan||JSON.stringify({plan:'Mock planning: retain original facts; references only guide style.',plotStyle:{width:9,height:6,fontSize:12}}),context:any
  if(all.includes('Diagram Topology Agent')){callKind='topology';context=JSON.parse(text);const g=kind==='simple'?mockTopology(context.methodology):semanticFixture(kind,context.methodology);if(wrong)g.edges.find(e=>e.label==='cancel')!.target='n4';if(ambiguous)g.uncertainties=['Unstated branch destination'];answer=JSON.stringify(g)}
  else if(all.includes('You are the visual observer')){callKind='observation';context=JSON.parse(text);answer=JSON.stringify({content:'Mock observation: original nodes and relations visible.',actual_text:[],layout:'Readable actual layout.',connections:[],problems:[],suggestions:[],uncertainties:[]})}
  else if(all.includes('SVG visual AND code review')){callKind='review';context=JSON.parse(text.split('\nAuxiliary visual observation report:')[0]);reviewed++;const issues=repair&&reviewed===1,topology=context.topology,audit=topology?mockTopologyAudit(topology):undefined
   if(unknownNode&&audit){audit.originalRequiredNodes[0].nodeId='missing_entry';(audit.nodeIssues as any[]).push({issue:'Missing required named entry Input; do not erase this diagnostic.'})}
   if(wrong&&audit)audit.originalRequiredRelations=mockTopologyAudit(semanticFixture('state_transition',context.methodology)).originalRequiredRelations
   answer=JSON.stringify({version:context.version,svgHash:stale?'0'.repeat(64):context.svgHash,visual:{status:issues?'issues_found':'passed',findings:issues?[{issue:'Layout clarity',location:'whole canvas',evidence:'Mock visible crowding between the two routed edges',suggestion:'Change direction only'}]:[]},code:{status:'passed',findings:[]},uncertainties:[],...(!omitRendererAudit?{rendererAudit:{originalRequirements:requirements}}:{}),revised_description:issues?'Complete mock layout revision: retain all original nodes and links, change orientation only.':'No changes needed.',...(!missingAudit&&audit?{topologyAudit:audit}:{}),...(issues?{layoutRepair:{direction:context.layout.direction==='RIGHT'?'DOWN':'RIGHT'}}:{})})
   if(badCompositeAudit&&context.childOriginals){const raw=JSON.parse(answer),marker='CURRENT_COMPOSITE_CRITIQUE_MUST_SURVIVE';raw.visual={status:'issues_found',findings:[{issue:marker,location:'panel B',evidence:'Current panel B layout needs inspection.',suggestion:'Correct the current layout.'}]};raw.revised_description='Correct the current panel B layout.';raw.rendererAudit={originalRequirements:[{sourceField:'methodology',sourceQuote:'NOT IN ORIGINAL',requirement:'Explicit layout',verdict:'unmet',evidence:marker+(badCompositeAudit==='large'?'跨语言证据'.repeat(30000):'')}]};answer=JSON.stringify(raw)}
   assert.equal(images(wire).length,context.auxiliaryVisualReport?0:1);assert.ok(context.fullSvgCode)
  }else if(all.includes('Decide whether the current candidate')){callKind='data-review';context=JSON.parse(text.split('\nAuxiliary visual observation report:')[0]);answer=JSON.stringify({critic_suggestions:'Mock visual opinion only',...(!omitRendererAudit?{rendererAudit:{originalRequirements:requirements}}:{}),revised_description:styleOnlyRepair?'Draw vertical red bars with title and grid.':'No changes needed.'})}
  calls.push({kind:callKind,context,text,wire,images:images(wire).length});if(mutate)answer=await mutate(callKind,answer,context,calls);calls.at(-1).answer=answer;return Response.json({output_text:answer,choices:[{message:{content:answer}}]})
 });return {calls,workers}
}

test('actual typed runtime uses plan/extraction/review with exact version evidence; generic SVG tests retain old route',async()=>{
 const r=await createRefineRuntime();try{const {calls}=install(r),job=await create(r,body);assert.equal(job.status,'succeeded',job.error);assert.deepEqual(calls.map(c=>c.kind),['plan','topology','review']);const review=job.resultImages[0].review;assert.equal(review.status,'passed');assert.equal(review.topology.svgHash,review.deliveredSvgHash);assert.equal(review.rendererAudit.svgHash,review.deliveredSvgHash);assert.equal(review.history[0].svgHash,review.topology.svgHash);assert.equal(review.topology.geometry.passed,true);assert.equal(calls[2].context.topologyHash,review.topology.topologyHash);assert.ok(calls[2].context.methodology.includes('Input then Output'))}finally{await r.close()}
})

test('one explicit extraction correction preserves both raw responses and never changes the review budget',async()=>{
 const r=await createRefineRuntime();try{for(const persistent of [false,true]){
  const {calls}=install(r,{mutate:async(kind,answer,context,calls)=>{
   if(kind!=='topology')return answer
   const attempts=calls.filter(c=>c.kind==='topology').length
   if(attempts===2){assert.equal(context.protocolCorrection.attempt,1);assert.match(context.protocolCorrection.failedResponse,/duplicate/);const jobs=await r.db.collection('paperbanana_jobs').find({}).toArray();assert.ok(jobs.some((j:any)=>j.stages?.some((s:any)=>s.type==='topology_extraction'&&s.text.includes('duplicate'))),'failed raw persisted before extra call')}
   const graph=JSON.parse(answer);if(attempts===1||persistent)graph.nodes.push({...graph.nodes[1],id:'duplicate'});return JSON.stringify(graph)
  }}),job=await create(r,body)
  assert.equal(calls.filter(c=>c.kind==='topology').length,2);assert.equal(job.stages.filter((s:any)=>s.type==='topology_extraction').length,2);assert.equal(job.stages.filter((s:any)=>s.type==='protocol_correction').length,1)
  if(persistent){assert.equal(job.status,'failed');assert.equal(calls.length,3);assert.match(job.error,/模型结构化输出/);assert.match(job.error,/已使用一次额外主模型/);assert.doesNotMatch(job.error,/缩减面板|补充不明确/)}
  else {assert.equal(job.status,'succeeded',job.error);assert.equal(calls.length,4);assert.equal(job.resultImages[0].review.status,'passed');assert.equal(job.resultImages[0].review.roundsUsed,1);assert.equal(job.resultImages[0].review.topology.topology.nodes.length,2)}
 }}finally{await r.close()}
})

test('schema-only critique retries the exact same version within budget and omits every old visual opinion',async()=>{
 const r=await createRefineRuntime();try{for(const rounds of [1,2]){
  const marker='OLD_VISUAL_OPINION_MUST_NOT_BE_INPUT', {calls}=install(r,{mutate:(kind,answer,_context,calls)=>{
   if(kind!=='review'||calls.filter(c=>c.kind==='review').length!==1)return answer
   const raw=JSON.parse(answer);raw.topologyAudit.originalRequiredNodes[0].sourceQuote='Input ... Output';raw.visual.summary=marker;return JSON.stringify(raw)
  }}),job=await create(r,{...body,maxCriticRounds:rounds}),review=job.resultImages[0].review
  assert.equal(review.status,rounds===2?'passed':'review_failed');assert.equal(review.deliveredVersion,1);assert.equal(review.roundsUsed,rounds);assert.equal(calls.length,2+rounds);assert.equal(review.history[0].status,'review_failed');assert.match(review.history[0].assessment,new RegExp(marker));assert.match(review.history[0].error,/original evidence/)
  const reviews=calls.filter(c=>c.kind==='review');if(rounds===2){assert.equal(reviews[1].context.svgHash,reviews[0].context.svgHash);assert.equal(reviews[1].context.pngHash,reviews[0].context.pngHash);assert.equal(reviews[1].context.submittedImageHash,reviews[0].context.submittedImageHash);assert.equal(reviews[1].context.protocolCorrection.code,'node_provenance');assert.equal(reviews[1].context.protocolCorrection.previousRound,1);assert.doesNotMatch(JSON.stringify(reviews[1].wire),new RegExp(marker));assert.equal(reviews[1].context.fullSvgCode,reviews[0].context.fullSvgCode)}
 }}finally{await r.close()}
})

test('mixed substantive/schema critique, wrong-version responses and uncertain provider results do not trigger protocol retry',async()=>{
 const r=await createRefineRuntime();try{for(const mode of ['semantic','nodes','observed','visual','uncertain','unknown','wrong-version']){
  const {calls}=install(r,{mutate:(kind,answer)=>{
   if(kind!=='review')return answer
   if(mode==='unknown')throw Object.assign(new Error('fixture unknown paid outcome'),{uncertain:true,requestState:'unknown'})
   const raw=JSON.parse(answer);raw.topologyAudit.originalRequiredNodes[0].sourceQuote='fabricated quote'
   if(mode==='semantic')raw.topologyAudit.nodeIssues=[{issue:'Missing required content'}]
   if(mode==='nodes')raw.topologyAudit.originalRequiredNodes.pop()
   if(mode==='observed')raw.topologyAudit.observedRelations[0].target='wrong'
   if(mode==='visual')raw.visual.findings={issue:'Clipped label'}
   if(mode==='uncertain')raw.uncertainties=['Unreadable endpoint']
   if(mode==='wrong-version')raw.version=2
   return JSON.stringify(raw)
  }}),job=await create(r,{...body,maxCriticRounds:2})
  assert.equal(calls.length,3,mode);assert.equal(job.stages.filter((s:any)=>s.type==='protocol_correction').length,0,mode);if(job.resultImages?.length)assert.equal(job.resultImages[0].review.status,'review_failed',mode)
 }}finally{await r.close()}
})

test('raw-evidence storage failure stops before extraction correction or same-version rereview',async()=>{
 const r=await createRefineRuntime(),bucket=(globalThis as any).__refineTestCloud.storage.bucket(),write=bucket.writeFile.bind(bucket)
 try{for(const stage of ['topology','review']){
  bucket.writeFile=async(key:string,bytes:Buffer,metadata:any)=>{if(key.endsWith('.json'))throw Error('fixture evidence storage failure');return write(key,bytes,metadata)}
  const {calls}=install(r,{mutate:(kind,answer)=>{if(kind!==stage)return answer;const raw=JSON.parse(answer);raw.padding='large'.repeat(70000);if(stage==='topology')raw.nodes[0].shape='invalid';else raw.topologyAudit.originalRequiredNodes[0].sourceQuote='invalid quote';return JSON.stringify(raw)}}),job=await create(r,{...body,maxCriticRounds:2})
  assert.equal(calls.length,stage==='topology'?2:3);assert.equal(job.stages.filter((s:any)=>s.type==='protocol_correction').length,0);if(stage==='review')assert.equal(job.resultImages[0].review.status,'review_failed');else assert.equal(job.status,'failed')
 }}finally{bucket.writeFile=write;await r.close()}
})

test('durable resume reuses accepted extraction/correction/first review and retries only a definitively rejected next review',async()=>{
 const r=await createRefineRuntime({tokenDance:true});try{
  // Use the real durable journal, injecting one definitive provider rejection
  // inside its operation boundary rather than emulating result memoization.
  const call=r.workflow!.call,descriptors:string[]=[];let rejected=false
  r.workflow!.call=(descriptor:any,operation:any,role:any)=>{
   const key=JSON.stringify(descriptor),retry=key.includes('node_provenance')&&key.includes('previousRound')
   if(retry)descriptors.push(key)
   return call(descriptor,async()=>{if(retry&&!rejected){rejected=true;throw new TokenDanceError(429,'fixture definitive rate limit','rate_limit',0,false,'rejected')}return operation()},role)
  }
  const {calls}=install(r,{mutate:(kind,answer,_context,calls)=>{
   const count=calls.filter(c=>c.kind===kind).length,raw=JSON.parse(answer)
   if(kind==='topology'&&count===1)raw.nodes.push({...raw.nodes[1],id:'duplicate'})
   if(kind==='review'&&count===1)raw.topologyAudit.originalRequiredNodes[0].sourceQuote='Input ... Output'
   return JSON.stringify(raw)
  }}),first=await create(r,{...body,maxCriticRounds:2}),id=first.id||first._id
  assert.equal(first.status,'failed');assert.equal(first.recovery.canResume,true,JSON.stringify(first.recovery));assert.equal(calls.length,4)
  const before=await r.db.collection('paperbanana_provider_steps').find({jobId:id}).toArray();assert.equal(before.filter((s:any)=>s.state==='complete').length,6,'four model calls plus two local reference checkpoints');assert.equal(before.filter((s:any)=>s.state==='unknown').length,0)
  await r.workflow!.resume(id,'refine-owner',(r.legacy as any).resumeTokenDanceJob);await r.legacy.drainJobAdmission()
  const job=(await r.post({action:'getJob',jobId:id})).data.job;assert.equal(job.status,'succeeded',job.error);assert.equal(job.resultImages[0].review.status,'passed');assert.equal(calls.length,5,'four completed calls are replayed locally; only rejected request is submitted again')
  assert.equal(descriptors.length,2);assert.equal(descriptors[0],descriptors[1],'correction request descriptor stays byte-stable on resume');assert.equal(calls.filter(c=>c.kind==='topology').length,2);assert.equal(calls.filter(c=>c.kind==='plan').length,1)
  const after=await r.db.collection('paperbanana_provider_steps').find({jobId:id}).toArray();assert.equal(after.length,7);assert.ok(after.every((s:any)=>s.state==='complete'));assert.equal(job.resultImages[0].review.history.length,2)
 }finally{await r.close()}
})

test('unknown, poll-only and cancellation extraction failures cannot enter structural correction',async()=>{
 const r=await createRefineRuntime();try{for(const state of ['unknown','poll','cancel']){
  const {calls}=install(r,{mutate:(kind,answer)=>{if(kind==='topology')throw Object.assign(Error('fixture interrupted extraction'),state==='unknown'?{uncertain:true,requestState:'unknown'}:state==='poll'?{pollOnly:true}:{workflowStopped:true,requestState:'not_sent'});return answer}}),job=await create(r,{...body,maxCriticRounds:2})
  assert.equal(job.status,'failed');assert.equal(calls.length,2);assert.equal(job.stages.filter((s:any)=>s.type==='protocol_correction'||s.type==='topology_extraction').length,0)
 }}finally{await r.close()}
})

test('actual oversized layout fails locally with specific copy and never requests extraction correction',async()=>{
 const r=await createRefineRuntime();try{
  const labels=Array.from({length:24},(_,i)=>'Node'+i+' '+('wide label ').repeat(7)),original=labels.join(' then '),{calls}=install(r,{mutate:(kind,answer)=>kind==='topology'?JSON.stringify({schemaVersion:1,nodes:labels.map((label,i)=>({id:'n'+i,label,shape:'process',role:'normal'})),edges:labels.slice(1).map((_,i)=>({id:'e'+i,source:'n'+i,target:'n'+(i+1),label:'',sourceQuote:original})),uncertainties:[],layout:{direction:'RIGHT'}}):answer})
  const job=await create(r,{...body,methodContent:original});assert.equal(job.status,'failed');assert.equal(calls.length,2);assert.match(job.error,/本地布局未通过/);assert.match(job.error,/未使用额外主模型/);assert.ok(job.stages.some((s:any)=>String(s.error).includes('DIAGRAM_LAYOUT_UNSUPPORTED')));assert.equal(job.stages.filter((s:any)=>s.type==='protocol_correction').length,0)
 }finally{await r.close()}
})

test('auxiliary observer schema retry consumes a round; reported problems prevent it and old observation is excluded',async()=>{
 const r=await createRefineRuntime();try{for(const problems of [false,true]){
  const {calls}=install(r,{mutate:(kind,answer,_context,calls)=>{if(kind!=='observation'||calls.filter(c=>c.kind==='observation').length!==1)return answer;const raw=JSON.parse(answer);raw.content={old:'OLD_OBSERVATION_MUST_NOT_REENTER'};if(problems)raw.problems=[{issue:'Actual unreadable edge'}];return JSON.stringify(raw)}}),job=await create(r,{...body,visionMode:'assist',maxCriticRounds:2}),review=job.resultImages[0].review
  assert.equal(review.status,problems?'review_failed':'passed');assert.equal(review.roundsUsed,problems?1:2);assert.equal(calls.filter(c=>c.kind==='observation').length,problems?1:2)
  if(!problems){const second=calls.filter(c=>c.kind==='observation')[1];assert.equal(second.context.protocolCorrection.code,'observation_fields');assert.doesNotMatch(JSON.stringify(second.wire),/OLD_OBSERVATION_MUST_NOT_REENTER/);assert.equal(review.history[0].svgHash,review.history[1].svgHash)}
 }}finally{await r.close()}
})

test('composite overall and fixed bar schema retry stay on the same immutable code/data and existing budget',async()=>{
 const r=await createRefineRuntime(),prior=process.env.PLOT_WORKER_URL;process.env.PLOT_WORKER_URL='http://plot-fixture.invalid'
 try{for(const mode of ['composite','bar']){
  const counts:Record<string,number>={}, {calls,workers}=install(r,{mutate:(kind,answer,context)=>{
   if(!(mode==='composite'?kind==='review'&&context.childOriginals:kind==='data-review'))return answer
   if((counts[mode]=(counts[mode]||0)+1)>1)return answer
   const raw=JSON.parse(answer);raw.rendererAudit.originalRequirements=[{sourceField:'rendererContract',sourceQuote:'not original',requirement:'contract check',verdict:'met',evidence:'OLD_NON_ORIGINAL_REQUIREMENT'}];return JSON.stringify(raw)
  }}),panel=(label:string)=>({label,figureTypeId:'workflow',methodContent:body.methodContent,caption:body.caption}),original=JSON.parse(await readFile(old+'/mixed-workflow-bar-svg/input.json','utf8')),payload=mode==='composite'?{figureTypeId:'multipanel',figurePanels:[panel('A'),panel('B')]}:{...original.figurePanels[1],taskName:'plot'},job=await create(r,{...body,...payload,maxCriticRounds:2}),review=job.resultImages[0].review
  assert.equal(job.status,'succeeded',job.error);assert.equal(review.status,'passed');assert.equal(review.roundsUsed,2);assert.equal(review.deliveredVersion,1);assert.equal(review.history[0].status,'review_failed');assert.equal(review.history[1].status,'passed');assert.equal(review.history[0].svgHash,review.history[1].svgHash);assert.equal(review.history[0].pngHash,review.history[1].pngHash)
  const reviews=calls.filter(c=>mode==='composite'?c.kind==='review'&&c.context.childOriginals:c.kind==='data-review');assert.equal(reviews.length,2);assert.doesNotMatch(JSON.stringify(reviews[1].wire),/OLD_NON_ORIGINAL_REQUIREMENT/);assert.equal(reviews[1].context.protocolCorrection.code,'renderer_provenance')
  assert.equal(workers.length,mode==='bar'?1:0);if(mode==='bar'){assert.equal(review.dataValidation.dataHash,hash(JSON.stringify(original.figurePanels[1].figureData)));assert.equal(reviews[0].context.currentCode,reviews[1].context.currentCode);assert.doesNotMatch(review.note,/未完成/)}
 }}finally{if(prior===undefined)delete process.env.PLOT_WORKER_URL;else process.env.PLOT_WORKER_URL=prior;await r.close()}
})

test('wrong semantic inference, missing audit, stale version and ambiguous topology cannot silently pass or fall back',async()=>{
 const r=await createRefineRuntime();try{const original=JSON.parse(await readFile(old+'/state-diagram-svg/input.json','utf8'))
  for(const options of [{wrong:true},{missingAudit:true},{stale:true},{ambiguous:true}]){const {calls}=install(r,{kind:'state_transition',...options}),job=await create(r,{...body,figureTypeId:'state_transition',methodContent:original.methodContent})
   if(options.ambiguous){assert.equal(job.status,'failed');assert.equal(calls.length,2);assert.match(job.error,/结构化关系/);assert.ok(job.stages.some((s:any)=>String(s.error).includes('ambiguous')))}else{assert.equal(job.status,'succeeded',job.error);assert.equal(job.resultImages[0].review.status,options.wrong?'issues_found':'review_failed');assert.equal(calls.length,3);assert.equal(job.resultImages[0].review.deliveredVersion,1)}
  }
 }finally{await r.close()}
})

test('bounded local layout repair preserves topology and new SVG is unreviewed until a separate actual round',async()=>{
 const r=await createRefineRuntime();try{for(const rounds of [1,2]){const {calls}=install(r,{repair:true}),job=await create(r,{...body,maxCriticRounds:rounds});assert.equal(job.status,'succeeded',job.error);const review=job.resultImages[0].review;assert.equal(review.status,rounds===1?'modified_unreviewed':'passed');assert.equal(review.deliveredVersion,2);assert.equal(review.reviewedVersion,rounds===1?1:2);assert.equal(review.rendererAudit.version,review.reviewedVersion);assert.equal(review.rendererAudit.svgHash,review.reviewedSvgHash);assert.equal(calls.filter(c=>c.kind==='topology').length,1);assert.equal(calls.filter(c=>c.kind==='review').length,rounds);assert.equal(calls.length,2+rounds);assert.notEqual(review.history[0].svgHash,review.deliveredSvgHash);assert.equal(review.topology.topologyHash,calls.find(c=>c.kind==='review').context.topologyHash)}}finally{await r.close()}
})

test('original mixed workflow and real program bars receive final viewport before planning; final review gets originals and exact geometry at 1K/2K',async()=>{
 const r=await createRefineRuntime(),prior=process.env.PLOT_WORKER_URL;process.env.PLOT_WORKER_URL='http://plot-fixture.invalid';await mkdir(out,{recursive:true})
 try{const original=JSON.parse(await readFile(old+'/mixed-workflow-bar-svg/input.json','utf8'))
  for(const imageSize of ['1K','2K']){const {calls,workers}=install(r,{kind:'workflow'}),job=await create(r,{...body,figureTypeId:'multipanel',figurePanels:original.figurePanels,methodContent:original.methodContent,imageSize})
   assert.equal(job.status,'succeeded',job.error);const review=job.resultImages[0].review;assert.equal(review.status,'passed',JSON.stringify(review.composition.layout));assert.equal(review.composition.layout.passed,true);assert.equal(workers.length,1)
   const final=calls.filter(c=>c.kind==='review').at(-1)!.context;assert.equal(final.childOriginals.length,2);for(const child of final.childOriginals){assert.equal(child.review.history,undefined);assert.equal(child.review.reviewedSvgHash,undefined);assert.equal(child.review.rendererAudit.svgHash,child.review.deliveredSvgHash||child.review.dataValidation.svgHash)}assert.deepEqual(final.childOriginals[1].figureData,original.figurePanels[1].figureData);assert.match(final.childOriginals[1].rendererScope.fixed.orientation,/horizontal/);assert.equal(final.childOriginals[0].rendererScope.kind,'topology');assert.equal(final.childOriginals[0].methodology,original.figurePanels[0].methodContent);assert.equal(final.childOriginals[0].review.topology.topology.nodes.filter((n:any)=>n.label==='End').length,1)
   const plans=calls.filter(c=>c.kind==='plan');assert.equal(plans.length,2);for(const plan of plans)assert.match(plan.text,/outputViewport/)
   assert.equal(review.composition.panels[1].dataHash,hash(JSON.stringify(original.figurePanels[1].figureData)));assert.equal(review.composition.panels[1].svgHash,hash(Buffer.from(workers[0].result.svg_base64,'base64')))
   for(const check of review.composition.layout.panels)assert.ok(check.minTextPx>=(imageSize==='1K'?14:28)-.1)
   const entry=[...r.objects.entries()].find(([key])=>key.includes(job.id||job._id)&&key.includes('composition-render'))!;await writeFile(`${out}/original-mixed-${imageSize}.png`,entry[1].bytes)
  }
 }finally{if(prior===undefined)delete process.env.PLOT_WORKER_URL;else process.env.PLOT_WORKER_URL=prior;await r.close()}
})

test('model overall passed never overrides deterministic final-panel readability failure',async()=>{
 const r=await createRefineRuntime(),prior=process.env.PLOT_WORKER_URL;process.env.PLOT_WORKER_URL='http://plot-fixture.invalid'
 try{const original=JSON.parse(await readFile(old+'/mixed-workflow-bar-svg/input.json','utf8'));install(r,{kind:'workflow',tiny:true});const job=await create(r,{...body,figureTypeId:'multipanel',figurePanels:original.figurePanels,methodContent:original.methodContent});assert.equal(job.status,'succeeded',job.error);const review=job.resultImages[0].review;assert.equal(review.status,'issues_found');assert.equal(review.history[0].status,'issues_found');assert.equal(review.composition.layout.passed,false);assert.match(review.note,/本地问题/)}finally{if(prior===undefined)delete process.env.PLOT_WORKER_URL;else process.env.PLOT_WORKER_URL=prior;await r.close()}
})

test('invalid composite renderer audit retains raw critique and exact current evidence without certifying the review',async()=>{
 const r=await createRefineRuntime();try{for(const badCompositeAudit of [true,'large'] as const){
  const {calls}=install(r,{badCompositeAudit}),panel=(label:string)=>({label,figureTypeId:'workflow',methodContent:body.methodContent,caption:body.caption})
  const job=await create(r,{...body,figureTypeId:'multipanel',figurePanels:[panel('A'),panel('B')]}),result=job.resultImages[0],review=result.review
  assert.equal(job.status,'succeeded',job.error);assert.equal(review.status,'review_failed');assert.equal(review.reviewedVersion,undefined);assert.equal(review.rendererAudit,undefined)
  assert.equal(calls.length,7,'no extra model call after invalid final audit');assert.equal(calls.filter(c=>c.kind==='review').length,3)
  assert.equal(hash(r.objects.get(result.objectKey)!.bytes),review.deliveredSvgHash);assert.equal(review.history.length,1)
  const entry=review.history[0];assert.equal(entry.status,'review_failed');assert.equal(entry.version,review.deliveredVersion);assert.equal(entry.svgHash,review.deliveredSvgHash);assert.equal(entry.pngHash,review.deliveredPngHash)
  assert.match(entry.assessment,/CURRENT_COMPOSITE_CRITIQUE_MUST_SURVIVE/);assert.match(entry.error,/RENDERER_REVIEW_INVALID/);assert.match(review.note,/RENDERER_REVIEW_INVALID/)
  const summaries=job.stages.filter((s:any)=>s.type==='critic'&&s.title==='组合画面与子图检查汇总');assert.equal(summaries.length,1);assert.ok(Buffer.byteLength(summaries[0].text,'utf8')<=256*1024)
  let evidence=JSON.parse(summaries[0].text)
  if(badCompositeAudit==='large'){const ref=evidence.evidenceArtifact,object=r.objects.get(ref.filename);assert.ok(object);assert.equal(ref.mimeType,'application/json');assert.match(ref.filename,/\.json$/);assert.ok(ref.byteLength>256*1024);assert.equal(object.bytes.length,ref.byteLength);assert.equal(hash(object.bytes),ref.sha256);assert.equal(evidence.svgHash,review.deliveredSvgHash);evidence=JSON.parse(object.bytes.toString('utf8'))}
  else {assert.ok(summaries[0].text.length>12000,'structured evidence cannot use the ordinary stage truncation limit');assert.equal(evidence.evidenceArtifact,undefined)}
  assert.equal(evidence.assessment,entry.assessment);assert.equal(evidence.version,review.deliveredVersion);assert.equal(evidence.svgHash,review.deliveredSvgHash);assert.equal(evidence.pngHash,review.deliveredPngHash);assert.equal(evidence.submittedImageHash,entry.submittedImageHash);assert.ok(summaries[0].image);assert.equal(evidence.childOriginals.length,2);assert.equal(evidence.localGeometryCheck.svgHash,review.deliveredSvgHash)
  for(const child of evidence.childOriginals){assert.equal(child.review.status,'passed');assert.equal(child.review.history,undefined);assert.equal(child.review.reviewedSvgHash,undefined);assert.equal(child.review.topology.svgHash,hash(child.fullSvgCode));assert.equal(child.review.rendererAudit.svgHash,child.review.deliveredSvgHash)}
  for(const child of evidence.panelValidation.panels){assert.equal(child.review.history,undefined);assert.equal(child.review.reviewedSvgHash,undefined)}
 }}finally{await r.close()}
})


test('failed layout-version storage retains original delivered source, topology and exact reviewed hash',async()=>{
 const r=await createRefineRuntime(),bucket=(globalThis as any).__refineTestCloud.storage.bucket(),write=bucket.writeFile.bind(bucket)
 try{const {calls}=install(r,{repair:true});bucket.writeFile=async(key:string,bytes:Buffer,metadata:any)=>{if(key.endsWith('/candidate-0-svg-v2.svg'))throw new Error('fixture topology revision storage unavailable');return write(key,bytes,metadata)}
  const job=await create(r,{...body,maxCriticRounds:2});assert.equal(job.status,'succeeded',job.error);const result=job.resultImages[0],review=result.review;assert.equal(review.status,'issues_found');assert.equal(review.deliveredVersion,1);assert.equal(review.reviewedVersion,1);assert.equal(hash(r.objects.get(result.objectKey)!.bytes),review.reviewedSvgHash);assert.equal(review.topology.svgHash,review.deliveredSvgHash);assert.equal(review.rendererAudit.svgHash,review.deliveredSvgHash);assert.equal(calls.length,3);assert.match(review.history[0].error,/storage unavailable/)
 }finally{bucket.writeFile=write;await r.close()}
})

test('topology renderer contract reaches reference planning, full stylist, observer and review; invented styling stays advisory',async()=>{
 const r=await createRefineRuntime();try{
  const original=JSON.parse(await readFile(old+'/state-diagram-svg/input.json','utf8')),advisoryPlan='Invented plan-only black/white bold curved arrows, initial state leftmost and strict left-to-right.'
  for(const visionMode of ['none','assist']){const {calls}=install(r,{kind:'state_transition',advisoryPlan})
  const job=await create(r,{...body,figureTypeId:'state_transition',methodContent:original.methodContent,pipelineMode:'full',visionMode,retrievalSetting:visionMode==='none'?'manual':'none',manualReferenceIds:visionMode==='none'?original.manualReferenceIds:[]})
  assert.equal(job.status,'succeeded',job.error);assert.equal(job.resultImages[0].review.status,'passed');assert.deepEqual(calls.map(c=>c.kind),visionMode==='assist'?['plan','styling','topology','observation','review']:['plan','styling','topology','review']);if(visionMode==='none')assert.ok(calls[0].images>0,'real local reference bytes still reach planner')
  for(const call of calls)assert.match(JSON.stringify(call.wire),/elkjs-0\.12\.0-topology-v1/)
  for(const call of calls.filter(c=>['topology','observation','review'].includes(c.kind))){assert.equal(call.context.completePlan,undefined);assert.equal(call.context.advisoryPlan,advisoryPlan);assert.match(call.context.requirementsAuthority,/Original methodology/)}
  const review=calls.at(-1)!.context;assert.deepEqual(review.actualLayout,review.layout);assert.equal(review.nodeIdentityMap.length,5);assert.ok(review.nodeIdentityMap[0].initialEvidence);assert.doesNotMatch(job.resultImages[0].description,/black\/white|bold|curved/)
  }
 }finally{await r.close()}
})

test('original unsupported or uncertain style overrides a model pass; missing renderer audit never passes',async()=>{
 const r=await createRefineRuntime();try{
  for(const verdict of ['unsupported','uncertain','unmet']){const {calls}=install(r,{requirements:[{sourceField:'methodology',sourceQuote:'Use monochrome black and white.',requirement:'Monochrome palette',verdict,evidence:'Fixed compiler emits green node fills.'}]}),job=await create(r,{...body,methodContent:body.methodContent+' Use monochrome black and white.',maxCriticRounds:2})
   assert.equal(job.resultImages[0].review.status,'issues_found');assert.equal(job.resultImages[0].review.deliveredVersion,1);assert.equal(calls.length,3);assert.equal(job.resultImages[0].review.rendererAudit.originalRequirements[0].verdict,verdict)
  }
  install(r,{unknownNode:true});const invalid=await create(r,body);assert.equal(invalid.resultImages[0].review.status,'review_failed');assert.match(invalid.resultImages[0].review.history[0].assessment,/Missing required named entry Input/);assert.ok(invalid.stages.some((s:any)=>s.type==='critic'&&s.text.includes('Missing required named entry Input')));
  install(r,{omitRendererAudit:true});const job=await create(r,body);assert.equal(job.resultImages[0].review.status,'review_failed');assert.match(job.resultImages[0].review.history[0].error,/RENDERER_REVIEW_INVALID/)
 }finally{await r.close()}
})

test('fixed bar contract precedes planning/style/review and neither advisory styling nor unsupported revisions changes immutable data',async()=>{
 const r=await createRefineRuntime(),prior=process.env.PLOT_WORKER_URL;process.env.PLOT_WORKER_URL='http://plot-fixture.invalid'
 try{
  const original=JSON.parse(await readFile(old+'/mixed-workflow-bar-svg/input.json','utf8')),panel=original.figurePanels[1],advisoryPlan='Invented Vertical Bar Chart, red fill, bold title, grid and numeric annotations.'
  for(const mode of ['advisory','unsupported','uncertain','unapplied']){
   const explicit=['unsupported','uncertain'].includes(mode),methodContent=panel.methodContent+(explicit?' Use a vertical bar chart.':''),requirements=explicit?[{sourceField:'methodology',sourceQuote:'Use a vertical bar chart.',requirement:'Vertical bars',verdict:mode,evidence:'Current fixed renderer uses horizontal barh.'}]:[],{calls,workers}=install(r,{advisoryPlan,requirements,styleOnlyRepair:mode==='unapplied'})
   const job=await create(r,{...body,...panel,taskName:'plot',methodContent,pipelineMode:'full',maxCriticRounds:2})
   assert.equal(job.status,'succeeded',job.error);assert.equal(job.resultImages[0].review.status,mode==='advisory'?'passed':'issues_found');assert.equal(workers.length,1,'unsupported/advisory prose never triggers identical rerender');assert.deepEqual(calls.map(c=>c.kind),['plan','styling','data-review'])
   for(const call of calls)assert.match(JSON.stringify(call.wire),/deterministic-program-v1/)
   const c=calls.at(-1)!.context;assert.equal(c.completePlan,undefined);assert.equal(c.advisoryPlan,advisoryPlan);assert.match(c.rendererContract.fixed.orientation,/horizontal/);assert.equal(c.rendererContract.fixed.barColor,'#487968');assert.equal(c.rendererContract.fixed.title,false);assert.equal(c.rendererContract.fixed.grid,false);assert.equal(c.previousReview,undefined)
   const payload=JSON.parse(JSON.parse(workers[0].wire.code.match(/d = json\.loads\(([^\n]+)\)/)![1]));assert.deepEqual(payload.rows,panel.figureData.rows);assert.deepEqual(payload.units,panel.figureData.units);assert.equal(job.resultImages[0].review.dataValidation.dataHash,hash(JSON.stringify(panel.figureData)));assert.doesNotMatch(job.resultImages[0].description,/red fill|bold title|Vertical Bar/)
  }
 }finally{if(prior===undefined)delete process.env.PLOT_WORKER_URL;else process.env.PLOT_WORKER_URL=prior;await r.close()}
})

test('v2 name/ref runtime retains raw and resolved evidence and validates the current exact source catalogue',async()=>{
 const {topologyWire,reviewWire}=await import('./helpers/source-fixtures.js'),{buildSourceCatalog,sourceScope}=await import('../src/source-provenance.js')
 const r=await createRefineRuntime();try{
 const {calls}=install(r,{mutate:(kind,answer,context)=>kind==='topology'?JSON.stringify(topologyWire(JSON.parse(answer),context.sourceCatalog)):kind==='review'?JSON.stringify(reviewWire(JSON.parse(answer),context.sourceCatalog)):answer}),job=await create(r,body),review=job.resultImages[0].review
 assert.equal(review.status,'passed',review.note);assert.equal(calls.length,3);assert.equal(job.sourceProtocol.protocolVersion,2);const c=buildSourceCatalog(body,sourceScope(job.id)),extract=calls[1],critic=calls[2];assert.deepEqual(extract.context.sourceCatalog,c);assert.deepEqual(critic.context.sourceCatalog,c);assert.ok(calls[0].text.includes('sourceCatalog'))
 const raw=JSON.parse(job.stages.find((s:any)=>s.type==='topology_extraction').text),resolved=JSON.parse(job.stages.find((s:any)=>s.type==='topology_resolved').text),rawReview=JSON.parse(job.stages.find((s:any)=>s.type==='critic').text),resolvedReview=JSON.parse(job.stages.find((s:any)=>s.type==='review_resolved').text)
 assert.equal(raw.rawResponse,extract.answer);assert.equal(raw.rawHash,hash(extract.answer));assert.equal(JSON.parse(raw.rawResponse).schemaVersion,2);assert.equal(JSON.parse(resolved.resolvedResponse).schemaVersion,1);assert.equal(resolved.rawHash,raw.rawHash);assert.equal(resolved.resolvedHash,hash(resolved.resolvedResponse));assert.equal(rawReview.assessment,critic.answer);assert.equal(resolvedReview.rawHash,hash(critic.answer));assert.equal(resolvedReview.svgHash,review.deliveredSvgHash);assert.ok(JSON.parse(resolvedReview.resolvedAssessment).topologyAudit.originalRequiredNodes.every((n:any)=>n.sourceQuote&&!n.sourceRef));assert.ok(JSON.parse(rawReview.assessment).topologyAudit.originalRequiredNodes.every((n:any)=>n.sourceRef&&!n.sourceQuote));assert.equal(calls[2].context.topology.edges.length,1)
 }finally{await r.close()}
})

test('round-five anonymous map hierarchy gets one precisely diagnosed correction and never silently wraps invalid raw',async()=>{
 const {topologyWire,reviewWire}=await import('./helpers/source-fixtures.js'),root='../../docs/infographic-v400/svg-repair-20261010/evidence/round-5/state-diagram-svg',original=JSON.parse(await readFile(root+'/input.json','utf8')),captured=JSON.parse(await readFile(root+'/call-2-topology.json','utf8')),bad=JSON.parse(captured.responseText),r=await createRefineRuntime()
 try{for(const persistent of [false,true]){
  const {calls}=install(r,{kind:'state_transition',mutate:async(kind,answer,context,calls)=>{
   if(kind==='review')return JSON.stringify(reviewWire(JSON.parse(answer),context.sourceCatalog))
   if(kind!=='topology')return answer
   const number=calls.filter(c=>c.kind==='topology').length
   if(number===2){assert.equal(context.protocolCorrection.code,'source_initial_fields');assert.equal(context.protocolCorrection.diagnostic.path,'$.anonymousInitials["sourceRef"]');assert.equal(context.protocolCorrection.diagnostic.actualType,'string');assert.match(context.protocolCorrection.diagnostic.expected,/map.*marker_a/);const rows=await r.db.collection('paperbanana_jobs').find({}).toArray();assert.ok(rows.some((j:any)=>j.stages.some((s:any)=>s.type==='topology_extraction'&&s.text.includes('protocolDiagnostic'))),'diagnostic and raw persisted before correction')}
   return JSON.stringify(number===1||persistent?{...bad,sourceCatalogHash:context.sourceCatalog.catalogHash}:topologyWire(JSON.parse(answer),context.sourceCatalog))
  }}),job=await create(r,{...body,figureTypeId:'state_transition',methodContent:original.methodContent,caption:original.caption,negativePrompt:original.negativePrompt,maxCriticRounds:2})
  assert.equal(calls.filter(c=>c.kind==='topology').length,2);assert.equal(calls.length,persistent?3:4);assert.equal(job.stages.filter((s:any)=>s.type==='protocol_correction').length,1)
  if(persistent){assert.equal(job.status,'failed');assert.equal(job.stages.filter((s:any)=>s.type==='topology_resolved').length,0)}else{const review=job.resultImages[0].review;assert.equal(review.status,'passed');assert.equal(review.roundsUsed,1);assert.equal(review.topology.topology.edges.length,7);assert.equal(review.topology.topology.nodes.filter((n:any)=>!n.label).length,1)}
 }}finally{await r.close()}
})

test('fixed program single root contract diagnoses misplaced source headers and rereviews unchanged data within budget',async()=>{
 const {reviewWire}=await import('./helpers/source-fixtures.js'),root='../../docs/infographic-v400/svg-repair-20261010/evidence/round-5/mixed-workflow-bar-svg',original=JSON.parse(await readFile(root+'/input.json','utf8')),captured=JSON.parse(await readFile(root+'/call-8-review.json','utf8')),bad=JSON.parse(captured.responseText.replace(/^```json\s*|\s*```$/g,'')),panel=original.figurePanels[1],prior=process.env.PLOT_WORKER_URL;process.env.PLOT_WORKER_URL='https://plot-worker.invalid/render';const r=await createRefineRuntime()
 try{for(const persistent of [false,true]){
  const {calls,workers}=install(r,{mutate:(kind,answer,context,calls)=>{
   if(kind!=='data-review')return answer
   const count=calls.filter(c=>c.kind==='data-review').length,system=calls.at(-1).wire.messages.find((m:any)=>m.role==='system').content
   assert.match(system,/<program_review_v2_template>/);assert.doesNotMatch(system,/<renderer_audit_v2_template>|Return strict JSON \{"critic_suggestions"/)
   if(count===2){assert.equal(context.protocolCorrection.diagnostic.path,'$.sourceProtocolVersion');assert.equal(context.protocolCorrection.diagnostic.observedPath,'$.rendererAudit.sourceProtocolVersion');assert.equal(context.protocolCorrection.diagnostic.actualType,'missing');assert.equal(context.protocolCorrection.code,'source_envelope');assert.ok(!JSON.stringify(context).includes(bad.critic_suggestions))}
   return JSON.stringify(count===1||persistent?{...bad,rendererAudit:{...bad.rendererAudit,sourceCatalogHash:context.sourceCatalog.catalogHash}}:reviewWire(JSON.parse(answer),context.sourceCatalog))
  }}),job=await create(r,{...body,...panel,taskName:'plot',negativePrompt:original.negativePrompt,maxCriticRounds:2}),review=job.resultImages[0].review
  assert.equal(calls.filter(c=>c.kind==='data-review').length,2);assert.equal(workers.length,1);assert.equal(review.status,persistent?'review_failed':'passed');assert.equal(review.roundsUsed,2);assert.equal(review.history[0].svgHash,review.history[1].svgHash);assert.equal(review.history[0].pngHash,review.history[1].pngHash);assert.equal(review.dataValidation.dataHash,hash(JSON.stringify(panel.figureData)));assert.match(review.history[0].assessment,/sourceProtocolVersion/)
  if(persistent)assert.ok(job.stages.some((s:any)=>s.type==='review_status'&&s.text.includes('$.rendererAudit.sourceProtocolVersion')))
 }}finally{if(prior===undefined)delete process.env.PLOT_WORKER_URL;else process.env.PLOT_WORKER_URL=prior;await r.close()}
})

test('v2 composite catalogues isolate actual child originals and preserve numeric output through raw/resolved program and final audits',async()=>{
 const {topologyWire,reviewWire}=await import('./helpers/source-fixtures.js'),{buildSourceCatalog,sourcePanelBody,sourceScope}=await import('../src/source-provenance.js')
 const prior=process.env.PLOT_WORKER_URL;process.env.PLOT_WORKER_URL='https://plot-worker.invalid/render';const r=await createRefineRuntime()
 try{const original=JSON.parse(await readFile(old+'/mixed-workflow-bar-svg/input.json','utf8')),payload={...body,figureTypeId:'multipanel',figurePanels:original.figurePanels,methodContent:original.methodContent}, {calls,workers}=install(r,{kind:'workflow',mutate:(kind,answer,context)=>kind==='topology'?JSON.stringify(topologyWire(JSON.parse(answer),context.sourceCatalog)):['review','data-review'].includes(kind)?JSON.stringify(reviewWire(JSON.parse(answer),context.sourceCatalog)):answer}),job=await create(r,payload),review=job.resultImages[0].review
 assert.equal(review.status,'passed',review.note);assert.equal(workers.length,1);assert.equal(job.sourceProtocol.catalogs.length,3);assert.equal(review.composition.panels[1].dataHash,hash(JSON.stringify(original.figurePanels[1].figureData)));assert.equal(review.composition.panels[1].svgHash,hash(Buffer.from(workers[0].result.svg_base64,'base64')))
 const final=calls.filter(c=>c.kind==='review').at(-1)!.context;assert.deepEqual(final.sourceCatalog,buildSourceCatalog(payload,sourceScope(job.id)));for(const [i,child] of final.childOriginals.entries()){const c=buildSourceCatalog(sourcePanelBody(payload,payload.figurePanels[i]),sourceScope(job.id,i+1));assert.deepEqual(child.sourceCatalog,c);assert.notEqual(c.catalogHash,final.sourceCatalog.catalogHash);assert.doesNotMatch(JSON.stringify(c),/仅绘制面板/)}
 assert.equal(job.stages.filter((s:any)=>s.type==='review_resolved').length,3);assert.ok(calls.find(c=>c.kind==='data-review')!.context.sourceCatalog);assert.equal(review.composition.panels[0].review.topology.topology.nodes.filter((n:any)=>n.label==='End').length,1)
 }finally{if(prior===undefined)delete process.env.PLOT_WORKER_URL;else process.env.PLOT_WORKER_URL=prior;await r.close()}
})

test('actual durable recovery refuses missing, stale or changed source snapshots before any planner transport and preserves accepted calls',async()=>{
 const r=await createRefineRuntime({tokenDance:true});try{for(const mode of ['missing','version','prompt-missing','prompt-stale','hash','input','raster-recraft']){
  const call=r.workflow!.call;r.workflow!.call=(descriptor:any,operation:any,role:any)=>call(descriptor,async()=>{if(JSON.stringify(descriptor).includes('SVG visual AND code review'))throw new TokenDanceError(429,'fixture definite rejection','rate_limit',0,false,'rejected');return operation()},role)
  const {calls}=install(r),payload:any=mode==='raster-recraft'?{...body,mainModelName:undefined,imageModelName:undefined,referenceVisionModelName:undefined,configurationMode:'advanced',apiKeys:{openai:'fixture',recraft:'fixture'},modelRoutes:{main:{accessProvider:'openai',modelId:'gpt-5.6-sol'},vision:{accessProvider:'openai',modelId:'gpt-5.6-sol'},image:{accessProvider:'recraft',modelId:'recraftv4_1'}}}:body,job=await create(r,payload),id=job.id;assert.equal(job.recovery.canResume,true);assert.equal(calls.length,2)
  if(mode==='raster-recraft'){const {usesSourceProtocol}=await import('../src/source-provenance.js'),registry=(await r.post({action:'modelRegistry',provider:'recraft'})).data;for(const model of registry.providers.recraft.models)assert.equal(usesSourceProtocol({...payload,modelRoutes:{...payload.modelRoutes,image:{accessProvider:'recraft',modelId:model.id}}}),!(model.selectable&&model.capabilities.outputFormats?.includes('svg')))}
  const collection=r.db.collection('paperbanana_provider_executions'),row=await collection.findOne({_id:id}),cipher=(r as any).tokenDanceService.cipher,snapshot=cipher.open(row.secret,id),before=await r.db.collection('paperbanana_provider_steps').find({jobId:id}).toArray()
  assert.equal(snapshot.task.sourceProtocol.protocolVersion,2)
  assert.equal(snapshot.task.sourceProtocol.promptRevision,1)
  if(mode==='missing'||mode==='raster-recraft')delete snapshot.task.sourceProtocol;else if(mode==='version')snapshot.task.sourceProtocol.protocolVersion=1;else if(mode==='prompt-missing')delete snapshot.task.sourceProtocol.promptRevision;else if(mode==='prompt-stale')snapshot.task.sourceProtocol.promptRevision=0;else if(mode==='hash')snapshot.task.sourceProtocol.catalogs[0].catalogHash='0'.repeat(64);else snapshot.task.body.methodContent+=' changed'
  await collection.updateOne({_id:id},{$set:{secret:cipher.seal(snapshot,id)}})
  await assert.rejects(()=>r.workflow!.resume(id,'refine-owner',(r.legacy as any).resumeTokenDanceJob),/协议版本或原文快照不匹配/);await assert.rejects(()=>(r.legacy as any).resumeTokenDanceJob(snapshot.task),/协议版本或原文快照不匹配/)
  let executed=0;await assert.rejects(()=>r.workflow!.run(snapshot.task,async()=>{executed++}),/协议版本或原文快照不匹配/);assert.equal(executed,0);assert.equal(calls.length,2);assert.deepEqual(await r.db.collection('paperbanana_provider_steps').find({jobId:id}).toArray(),before);const blocked=(await r.post({action:'getJob',jobId:id})).data.job;assert.equal(blocked.recovery.canResume,false);assert.match(blocked.recovery.billingMessage,/原调用结果与费用记录保持不变/);r.workflow!.call=call
 }}finally{await r.close()}
})

test('oversized original source catalogue stops admission without truncation, storage-blame copy or any model call',async()=>{
 const r=await createRefineRuntime();try{const {calls}=install(r),methodContent=Array.from({length:520},(_,i)=>'x'+i+';').join(''),created=await r.post({...body,methodContent});assert.equal(created.data.code,400,JSON.stringify(created));assert.match(JSON.stringify(created.data),/来源索引/);assert.doesNotMatch(JSON.stringify(created.data),/恢复信息未能保存/);assert.equal(calls.length,0);const rows=await r.db.collection('paperbanana_jobs').find({}).toArray();assert.equal(rows.length,1);assert.equal(rows[0].methodContent,methodContent);assert.equal(rows[0].status,'failed');assert.equal(rows[0].errorCode,'JOB_ADMISSION_NOT_STARTED')}finally{await r.close()}
})
