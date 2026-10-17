import test from 'node:test'
import {syntheticNumericReview} from './helpers/material-review-fixture.js'
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
import {TAXONOMY_VERSION} from '../../../packages/figure-taxonomy/src/index.js'
import {CURATED_REFERENCES} from '../../../packages/figure-taxonomy/src/library.js'
const user=(w:any)=>typeof w.input==='string'?w.input:[...(Array.isArray(w.input)?w.input:[]),...(w.messages||[])].filter((m:any)=>m.role==='user').flatMap((m:any)=>typeof m.content==='string'?[m.content]:m.content.filter((p:any)=>p.type==='input_text'||p.type==='text').map((p:any)=>p.text)).join('\n')
const images=(w:any)=>[...(Array.isArray(w.input)?w.input:[]),...(w.messages||[])].flatMap((m:any)=>Array.isArray(m.content)?m.content:[]).filter((p:any)=>p.type==='input_image'||p.type==='image_url')
const ref=CURATED_REFERENCES.find((r:any)=>r.id==='journal_pcbi.1009809.g002')!
const body=(files:any[],extra:any={})=>({action:'createJob',generationPath:'model-v1',materialFiles:files,provider:'openai',apiKeys:{openai:'fixture'},modelRoutes:{main:{accessProvider:'openai',modelId:'gpt-5.6-sol'},image:{accessProvider:'openai',modelId:'gpt-image-2'}},visionMode:'none',methodContent:'Draw the exact original Alpha 35 and Beta 12 values; understand arrows and layout from relevant whole pages. Do not invent conclusions.',caption:'',figureTypeId:'bar',figureSpecVersion:TAXONOMY_VERSION,outputFormat:'svg',pipelineMode:'planner_critic',retrievalSetting:'none',numCandidates:1,maxCriticRounds:2,aspectRatio:'1:1',imageSize:'1K',...extra})
test('real original bytes → Gateway/Core → scoped JSON tools → model text/page input → format route → version review → restore',async()=>{
 const r=await createRefineRuntime(),matrix:any[]=[];let calls:any[]=[],reviewed=0,generated=0,expectVisual=false
 const evidence=new URL('file://'+await (await import('node:fs/promises')).mkdtemp('/tmp/tuyan-original-material-regression-')+'/');await mkdir(evidence,{recursive:true})
 try{
 r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
  const u=String(url);if(u.endsWith('/models'))return Response.json({data:[]})
  if(u.startsWith(r.baseUrl+'/objects/')){const o=r.objects.get(decodeURIComponent(u.slice((r.baseUrl+'/objects/').length)));return new Response(o?new Uint8Array(o.bytes):'',{status:o?200:404,headers:{'Content-Type':o?.mimeType||'image/png'}})}
  if(u.includes('/images/')){generated++;calls.push({kind:'image'});return Response.json({data:[{b64_json:r.image.toString('base64')}]})}
  const w=JSON.parse(String(init.body)),sys=JSON.stringify(w.instructions||w.messages?.filter((m:any)=>m.role==='system')||''),text=user(w)
  let kind='',content=''
  if(sys.includes('main model reading original research files')){
   kind='material';const c=JSON.parse(text),results=c.results,requests=c.files.flatMap((f:any)=>[{id:f.id,op:'read',...(f.format==='pdf'?{pages:[1,3]}:f.format==='pptx'?{pages:[1,2]}:{})},...(['pdf','pptx'].includes(f.format)?[{id:f.id,op:'render',pages:[f.format==='pdf'?3:1]}]:[])])
   const next=requests.find((q:any)=>!results.some((v:any)=>v.materialId===q.id&&v.operation?.op===q.op))
   if(next){const {id,...operation}=next;content=JSON.stringify({action:'read',fileId:id,operation})}
   else {assert.match(text,/Alpha.*35|35.*Alpha/s);assert.match(text,/Beta.*12|12.*Beta/s);if(expectVisual)assert.ok(images(w).length>=2,'main model must receive both complete PDF and PPTX pages');const used=results.filter((x:any)=>x.recordId).map((x:any)=>x.recordId);content=JSON.stringify({action:'done',claims:[{text:'Original Alpha=35, Beta=12; source flow and notes inspected.',sourceIds:c.currentSources.map((s:any)=>s.sourceId)}],usedRecordIds:used,evidence:'Original Alpha=35, Beta=12 samples; mixed-research.pdf p1/p3 and research-slides.pptx p1/p2 show Input → Check → Output. Notes are synthetic-data limitations.',limitations:['Synthetic local test; provider reply is simulated'],sufficient:true})}
  }else if(/SVG visual AND code review|PNG visual review AFTER generation/.test(sys)){
   kind='review';reviewed++;const c=JSON.parse(text),issue=reviewed===1
   assert.ok(images(w).length||c.auxiliaryVisualReport||c.observationReport||c.observerReport,'review must see actual rendered result or its configured observer report');assert.match(text,/materialReading|materialFiles/);if(c.svgHash)assert.match(c.fullSvgCode,/Alpha 35 Beta 12/);if(expectVisual){assert.ok(c.originalMaterialComparison.sourcePages.length>=2,'critic must get source page pixels, not just the reading summary');assert.ok(images(w).length>=3||c.auxiliaryVisualReport,'current figure plus original pages reach the critic/observer');assert.ok(c.originalMaterialComparison.sourcePages.some((p:any)=>p.filename.endsWith('.pptx')))}
   content=JSON.stringify({version:c.version,numericReview:syntheticNumericReview(['Alpha','Beta']),...(c.svgHash?{svgHash:c.svgHash,code:{status:'passed',findings:[]}}:{pngHash:c.pngHash}),visual:{status:issue?'issues_found':'passed',findings:issue?[{issue:'Spacing',location:'labels',evidence:'Simulated fixture',suggestion:'Move apart'}]:[]},uncertainties:[],revised_description:issue?'Preserve original Alpha 35 and Beta 12; move labels apart.':'No changes needed.'})
  }else if(sys.includes('SVG Diagram Agent')){kind='svg';generated++;content=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="white"/><text x="40" y="${100+generated*20}" font-size="24">Alpha 35 Beta 12</text></svg>`}
  else if(sys.includes('visual observer assisting')){kind='observation';content=JSON.stringify({content:'Original labels',actual_text:['Alpha','35','Beta','12'],layout:'left to right',connections:[],problems:[],suggestions:[],uncertainties:[]})}
  else if(sys.includes('material-aware scientific figure planner')){kind='plan';assert.match(text,/Original Alpha=35/);content=JSON.stringify({status:'ready',plan:'Draw the original Alpha=35, Beta=12 samples. No significance claims. Sources: uploaded originals, exact saved values.',missingInputs:[]})}
  else if(/retriev/i.test(sys)){kind='retrieval';content=JSON.stringify({selections:[{id:ref.id,relevance:.99,visualFit:true,contribution:'Structure only; retain user data'}]})}
  else if(sys.includes('main model responsible for the scientific diagram')){kind='refine';content='Preserve original Alpha=35, Beta=12; move labels apart.'}
  else throw Error('Unexpected model path '+sys.slice(0,150))
  calls.push({kind,images:images(w).length,phase:kind==='material'?JSON.parse(text).phase:undefined,originalText:kind==='material'&&/Alpha.*35/s.test(text)})
  return Response.json({output_text:content,choices:[{message:{content}}]})
 })
 const upload=async(name:string)=>{const bytes=await readFile(new URL('../../../docs/material-reader-20261012/fixtures/'+name,import.meta.url));const p=await r.post({action:'prepareMaterialUpload',files:[{filename:name,size:bytes.length}]});assert.equal(p.data.code,0,JSON.stringify(p.data));const u=p.data.uploads[0];assert.equal((await fetch(u.uploadUrl,{method:'PUT',headers:{'Content-Type':u.mimeType},body:new Uint8Array(bytes)})).status,200);const f=await r.post({action:'finalizeMaterialUpload',materialId:u.id});assert.equal(f.data.code,0,JSON.stringify(f.data));return f.data.file}
 const csv=await upload('observations.csv'),pdf=await upload('mixed-research.pdf'),pptx=await upload('research-slides.pptx')
 assert.notEqual((await r.post({action:'getMaterial',materialId:csv.id,userId:'refine-owner'},'other-owner')).data.code,0);assert.deepEqual((await r.post({action:'listMaterialFiles'},'other-owner')).data.files,[]);assert.equal((await r.post({action:'listMaterialFiles'})).data.files.length,3);
 await r.db.collection('paperbanana_jobs').insertOne({_id:'active-material',userId:'refine-owner',status:'running',materialFiles:[csv]});assert.notEqual((await r.post({action:'deleteMaterial',materialId:csv.id})).data.code,0);await r.db.collection('paperbanana_jobs').deleteOne({_id:'active-material'});
 assert.notEqual((await r.post({action:'readMaterial',materialId:csv.id,jobId:'unrelated',operation:{op:'read'}})).data.code,0);
 const execute=async(input:any)=>{const uploaded=[];for(const f of input.materialFiles)uploaded.push(await upload(f.filename));input.materialFiles=uploaded;const p=await r.post(input);assert.equal(p.data.code,0,JSON.stringify(p.data));await r.legacy.drainJobAdmission();return(await r.post({action:'getJob',jobId:p.data.jobId})).data.job}
 let saved:any
 for(const format of ['png','svg'])for(const mode of ['none','auto','random','manual']){
  calls=[];reviewed=generated=0;expectVisual=mode==='none';const files=expectVisual?[pdf,pptx]:[csv]
  const job=await execute(body(files,{outputFormat:format,retrievalSetting:mode,manualReferenceIds:mode==='manual'?[ref.id]:[]}))
  assert.equal(job.status,'succeeded',JSON.stringify({error:job.error,logs:job.logs}));assert.equal(job.retrievalSetting,mode);assert.equal(job.materialFiles.length,files.length);assert.equal(reviewed,2);assert.equal(generated,2);assert.equal(job.resultImages[0].review.reviewedVersion,2);assert.equal(job.resultImages[0].review.status,'passed');assert.equal(calls.filter(c=>c.kind==='image').length,format==='png'?2:0);assert.equal(calls.filter(c=>c.kind==='svg').length,format==='svg'?2:0)
  const reads=job.materialReads;assert.ok(reads.some((v:any)=>v.type==='model_received'&&v.recordIds.length));assert.ok(reads.some((v:any)=>v.type==='completion'&&v.phase.includes('review')&&v.phase.endsWith('-2')));if(expectVisual)assert.ok(reads.some((v:any)=>v.type==='model_received'&&v.pageImages.length>=2))
  matrix.push({format,retrieval:mode,originals:files,review:job.resultImages[0].review,delivery:reads.filter((v:any)=>v.type==='model_received'),calls});if(format==='png'&&mode==='none')saved=job
  if(mode==='none')await writeFile(new URL('simulated-original-'+format+'.'+format,evidence),r.objects.get(job.resultImages[0].objectKey)!.bytes)
 }
 calls=[];reviewed=generated=0;expectVisual=true;const assisted=await execute(body([pdf,pptx],{visionMode:'assist',modelRoutes:{main:{accessProvider:'openai',modelId:'gpt-5.6-sol'},image:{accessProvider:'openai',modelId:'gpt-image-2'},vision:{accessProvider:'openai',modelId:'gpt-4.1'}}}));assert.equal(assisted.status,'succeeded',JSON.stringify({error:assisted.error,logs:assisted.logs}));assert.ok(assisted.materialReads.some((x:any)=>x.type==='model_received'&&x.pageImages.length===2));assert.ok(!assisted.materialReads.some((x:any)=>x.type==='vision_received'));matrix.push({scenario:'visual main receives original pages directly even with auxiliary review enabled',review:assisted.resultImages[0].review,calls});
 // Terminal tasks preserve provenance, while originals and read blobs have been removed.
 assert.equal(saved.materialCleanup.status,'cleared');
 for(const f of saved.materialFiles){assert.notEqual((await r.post({action:'getMaterial',materialId:f.id})).data.code,0);assert.ok(![...r.objects.keys()].some(k=>k.includes('/materials/'+f.id+'/')));}

 calls=[];reviewed=1;generated=0;expectVisual=true
 const refined=await execute({...body(saved.materialFiles),action:'refineImage',outputFormat:'png',sourceImageObjectKey:saved.resultImages[0].objectKey,editInstruction:'Preserve data and improve spacing'})
 assert.equal(refined.status,'succeeded',JSON.stringify({error:refined.error,logs:refined.logs}));assert.ok(refined.materialReads.some((x:any)=>x.type==='completion'&&x.phase==='refine-review'))
 calls=[];reviewed=1;generated=0;expectVisual=false;
 const originalImage=await upload('scan.png');
 const uploadedRefine=await execute({...body(Array.from({length:10},()=>csv)),action:'refineImage',sourceImageUpload:{materialId:originalImage.id},editInstruction:'Use exact Alpha 35 and Beta 12 from the auxiliary file; adjust labels.'});
 assert.equal(uploadedRefine.status,'succeeded',JSON.stringify({error:uploadedRefine.error,logs:uploadedRefine.logs}));assert.equal(uploadedRefine.materialFiles.length,10);assert.equal(uploadedRefine.taskSourceMaterial.id,originalImage.id);assert.equal(uploadedRefine.materialCleanup.status,'cleared');assert.ok(![...r.objects.keys()].some(k=>k.includes('/materials/'+originalImage.id+'/')));assert.ok(!r.objects.has(uploadedRefine.sourceImageObjectKey));matrix.push({scenario:'browser-first source-material reference plus ten auxiliary files in refine',source:uploadedRefine.taskSourceMaterial,cleanup:uploadedRefine.materialCleanup,calls});
 const overflow=await r.post({...body(Array.from({length:11},()=>csv)),action:'refineImage',sourceImageUpload:{materialId:originalImage.id},editInstruction:'Over limit'});assert.notEqual(overflow.data.code,0);assert.match(JSON.stringify(overflow.data),/辅助文件最多 10 份/);
 await writeFile(new URL('gateway-model-matrix.json',evidence),JSON.stringify({simulatedProviders:true,realFiles:true,realGatewayCore:true,realModelUnderstandingVerified:false,matrix},null,2))
 }finally{await r.close()}
})
