import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {retrieveFigureCandidates} from '../../../packages/figure-taxonomy/src/library.js';
import {TAXONOMY_VERSION} from '../../../packages/figure-taxonomy/src/index.js';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const {createRefineRuntime}=await import(pathToFileURL(path.join(root,'test-support/refine-runtime.mjs')));
const {renderSvgForReview}=await import(pathToFileURL(path.join(root,'apps/paperbanana-api/src/svg-review.ts')));
let key=(await readFile(process.argv[2],'utf8')).trim();await unlink(process.argv[2]);
if(!key)throw new Error('Missing temporary credential');
const out=path.join(root,'docs/infographic-v400/completion/evidence/'+(process.argv[3]?'live-bailian-png-retry':'live-bailian'));await mkdir(out,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
const clean=x=>JSON.parse(JSON.stringify(x,(_k,v)=>typeof v==='string'?v.split(key).join('[REDACTED]'):v));
const realFetch=globalThis.fetch;
const runs=[];let count=0,stop=false;
const total={prompt_tokens:0,completion_tokens:0,total_tokens:0};
const limit=process.argv[3]?5:18;let imageCount=0;const assetUrls=new Set();
const jobs=[
 {name:'workflow-png',main:'qwen3.7-plus',vision:'none',rounds:1,type:'workflow',format:'png'},
 {name:'state-diagram-svg',main:'qwen3.7-plus',vision:'none',rounds:1,type:'state_transition',format:'svg'},
 {name:'mixed-workflow-bar-svg',main:'qwen3.7-plus',vision:'none',rounds:1,type:'multipanel',format:'svg'},
];
process.env.PLOT_WORKER_URL='http://local-program-worker.invalid';
async function actualWorker(wire){return new Promise((resolve,reject)=>{const p=spawn('/Users/a1-6/.cache/tuyan-figure-qa-20261010/bin/python',[path.join(root,'scripts/figures/render-json.py')]),chunks=[],errs=[];p.stdout.on('data',c=>chunks.push(c));p.stderr.on('data',c=>errs.push(c));p.on('error',reject);p.on('close',code=>{try{if(code)throw Error(Buffer.concat(errs).toString());resolve(JSON.parse(Buffer.concat(chunks).toString()))}catch(e){reject(e)}});p.stdin.end(JSON.stringify(wire))})}
function requestKind(w){const s=JSON.stringify(w);return w.input?.messages?'image':s.includes('PNG visual review')||s.includes('SVG visual AND code review')||s.includes('Decide whether the current candidate')?'review':s.includes('visual observer')?'observer':s.includes('SVG Diagram Agent')?'svg':'plan'}
function summarizeWire(w){return JSON.parse(JSON.stringify(w,(_k,v)=>{if(typeof v==='string'&&v.startsWith('data:image/')){const bytes=Buffer.from(v.split(',')[1],'base64');return {mime:v.slice(5,v.indexOf(';')),sha256:hash(bytes),bytes:bytes.length}}return v}))}
async function saveSummary(){await writeFile(path.join(out,'summary.json'),JSON.stringify(clean({date:'2026-10-10',provider:'bailian',endpoint:'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',realProvider:true,localInfrastructure:true,maxRequests:limit,testOverrides:{enable_thinking:false,max_tokens:8192,stream_options:{include_usage:true}},requests:count,usage:total,runs}),null,2)+'\n')}
try{
 for(const spec of jobs){
  if(stop)break;
  if(process.argv[3]&&spec.name!==process.argv[3])continue;
  console.log('START',spec.name,spec.main);
  const r=await createRefineRuntime();const dir=path.join(out,spec.name);await mkdir(dir,{recursive:true});const calls=[];
  const run={scenario:spec.name,main:spec.main,vision:spec.vision,calls,artifacts:[]};runs.push(run);
  r.legacy.configureRuntimeFetch(async(url,init={})=>{
   url=String(url);
   if(url.startsWith(r.baseUrl+'/objects/')){const o=r.objects.get(decodeURIComponent(url.slice((r.baseUrl+'/objects/').length)));return new Response(o?.bytes||'',{status:o?200:404,headers:{'Content-Type':o?.mimeType||'text/plain'}})}
   if(url.endsWith('/models'))return Response.json({data:[]});
   if(assetUrls.has(url)){const res=await realFetch(url,{signal:AbortSignal.timeout(60000),redirect:'error'});const b=Buffer.from(await res.arrayBuffer());await writeFile(path.join(dir,'download-'+hash(b)+'.png'),b);return new Response(b,{status:res.status,headers:res.headers})}
   if(url==='http://local-program-worker.invalid/render')return Response.json(await actualWorker(JSON.parse(String(init.body))));
   const imageEndpoint=url.endsWith('/services/aigc/multimodal-generation/generation');
   if(url!=='https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'&&!imageEndpoint)throw new Error('Live runner refuses unexpected external endpoint');
   if(stop||count>=limit)throw Object.assign(new Error('Live test request budget reached or provider stopped'),{localInputFailure:true});
   const original=JSON.parse(String(init.body));
   const wire=imageEndpoint?original:{...original,enable_thinking:false,max_tokens:8192,stream_options:{include_usage:true}};
   if(imageEndpoint&&++imageCount>2)throw new Error('Image request budget reached');
   for(const m of [...(wire.messages||[]),...(wire.input?.messages||[])])for(const p of (Array.isArray(m.content)?m.content:[])){const u=p.image||p.image_url?.url;if(u?.startsWith('http://127.0.0.1:'))throw new Error('Unreachable local image URL in actual image input');}
   const n=++count,kind=requestKind(wire),started=Date.now();
   const call={endpoint:url,number:n,kind,model:wire.model,request:summarizeWire(wire),originalParameters:{enable_thinking:original.enable_thinking,max_tokens:original.max_tokens,stream_options:original.stream_options}};calls.push(call);
   console.log('CALL',n,spec.name,kind,wire.model);
   for(const m of [...(wire.messages||[]),...(wire.input?.messages||[])])for(const [i,p]of (Array.isArray(m.content)?m.content:[]).entries()){const d=p.image||p.image_url?.url;if(d?.startsWith('data:image/'))await writeFile(path.join(dir,`call-${n}-input-${i}.png`),Buffer.from(d.split(',')[1],'base64'));}
   let response;
   try{response=await realFetch(url,{...init,body:JSON.stringify(wire),headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},signal:AbortSignal.timeout(180000),redirect:'error'});const text=await response.text();call.httpStatus=response.status;call.elapsedMs=Date.now()-started;
    const parts=[];let usage=null;
    for(const line of text.split('\n'))if(line.startsWith('data: ')&&!line.includes('[DONE]')){try{const d=JSON.parse(line.slice(6));if(d.usage)usage=d.usage;if(d.choices?.[0]?.delta?.content)parts.push(d.choices[0].delta.content);if(d.id)call.requestId=d.id;if(d.error)call.providerError=d.error}catch{}}
    if(!response.ok){let data;try{data=JSON.parse(text)}catch{data={message:text.slice(0,500)}}call.providerError=clean(data);stop=true;}
    if(imageEndpoint&&response.ok){const d=JSON.parse(text);call.providerResponse=d;usage=d.usage;for(const choice of d.output?.choices||[])for(const part of choice.message?.content||[]){if(part.image){const u=new URL(part.image);if(u.protocol!=='https:'||!/(?:aliyuncs\.com|alicdn\.com)$/.test(u.hostname))throw Error('Unexpected generated asset host: '+u.hostname);assetUrls.add(part.image);}}}
    call.responseText=parts.join('');call.usage=usage;
    if(usage)for(const k of Object.keys(total))total[k]+=usage[k]||0;
    await writeFile(path.join(dir,`call-${n}-${kind}.json`),JSON.stringify(clean(call),null,2)+'\n');await saveSummary();
    console.log('DONE',n,response.status,call.responseText.length+' chars',call.elapsedMs+' ms');
    return new Response(text,{status:response.status,headers:response.headers});
   }catch(e){stop=true;call.error=String(e.message).split(key).join('[REDACTED]');await saveSummary();throw new Error(call.error)}
  });
  try{
   const refs=retrieveFigureCandidates({figureTypeId:spec.type==='multipanel'?'workflow':spec.type}).slice(0,1);
   const workflow='Synthetic teaching example. English labels: Start → Input → Check (diamond); yes → Output → End; no → Input. Use each named node once. Circle/oval start/end, rectangle operations, diamond check, labelled yes/no arrows. No invented numbers or research claims. Reference is for layout only. Return a concise drawing plan under 1200 characters.';
   const state='Synthetic teaching example of an instrument state machine. States: Idle, Running, Paused, Completed. Initial dot enters Idle. Transitions: Idle→Running: start; Running→Paused: pause; Paused→Running: resume; Running→Completed: finish; Paused→Idle: cancel; Completed→Idle: reset. Each named state appears once. Arrows are labelled events, not process activities. Completed is not a terminal state because reset returns to Idle. English text. Reference is for structural design only.';
   const body={action:'createJob',configurationMode:'advanced',provider:'bailian',apiKeys:{bailian:'live-secret-injected-only-at-transport'},modelRoutes:{main:{accessProvider:'bailian',modelId:spec.main},vision:{accessProvider:'bailian',modelId:'qwen3.7-plus'},image:{accessProvider:'bailian',modelId:'wan2.7-image-pro'}},methodContent:spec.type==='state_transition'?state:workflow,caption:'Explicit synthetic teaching example',negativePrompt:'No invented numbers, statistical significance, or scientific conclusions. Preserve all supplied labels and relations.',taskName:'diagram',figureTypeId:spec.type,figureSpecVersion:TAXONOMY_VERSION,outputFormat:spec.format,visionMode:spec.vision,pipelineMode:'planner_critic',retrievalSetting:refs.length?'manual':'none',manualReferenceIds:refs.map(x=>x.id),numCandidates:1,maxCriticRounds:spec.rounds,aspectRatio:'16:9',imageSize:'1K'};
   if(spec.type==='multipanel')body.figurePanels=[{label:'A',figureTypeId:'workflow',methodContent:workflow,caption:'Synthetic sample process'},{label:'B',figureTypeId:'bar',figureData:{source:'Synthetic QA only, explicitly not measured research data.',rows:[{label:'Alpha',value:2},{label:'Beta',value:5},{label:'Gamma',value:3}],units:{value:'dimensionless'}},methodContent:'Draw the exact supplied synthetic values Alpha 2, Beta 5, Gamma 3. No uncertainty or significance.',caption:'Synthetic values'}];
   run.figureTypeId=spec.type;run.format=spec.format;run.referenceIds=refs.map(x=>x.id);
   const a=await r.post(body);if(a.data.code!==0){run.admission=clean(a);console.log('ADMISSION',spec.name,a.data.code,a.data.message||a.data.error||'');continue}
   await r.legacy.drainJobAdmission();const job=(await r.post({action:'getJob',jobId:a.data.jobId})).data.job;
   run.job=job;run.status=job.status;run.error=job.error;run.review=job.resultImages?.[0]?.review;
   for(const [objectKey,o]of r.objects){if(objectKey.includes(job.id||job._id)){const file=path.basename(objectKey);await writeFile(path.join(dir,file),o.bytes);run.artifacts.push({file,mimeType:o.mimeType,sha256:hash(o.bytes)})}}
   await writeFile(path.join(dir,'input.json'),JSON.stringify({...body,apiKeys:{bailian:'[REDACTED]'}},null,2));
   await writeFile(path.join(dir,'job.json'),JSON.stringify(clean(job),null,2)+'\n');console.log('RESULT',spec.name,job.status,run.review?.status,job.error||'');
  }catch(e){run.error=String(e.message).split(key).join('[REDACTED]');console.log('ERROR',spec.name,run.error.slice(0,500))}
  finally{await r.close();await saveSummary()}
 }
 console.log('SUMMARY',JSON.stringify({imageRequests:imageCount,requests:count,usage:total,runs:runs.map(r=>({scenario:r.scenario,status:r.status,review:r.review?.status,error:r.error,admission:r.admission?.data?.code}))}));
}finally{await saveSummary();key='';}
