// Representative paid acceptance. Actual Core/provider requests and actual Python;
// local database/object storage only. No provider response replay or sample edits.
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,unlink,stat,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const [secretPath,runName='round-1',scenario='both']=process.argv.slice(2);
if(!secretPath||!/^round-[\w-]+$/.test(runName)||!['both','state-diagram-svg','mixed-workflow-bar-svg'].includes(scenario))throw Error('Usage: runner.mjs PRIVATE_KEY_FILE round-N [scenario]');
if(((await stat(secretPath)).mode&0o077)!==0)throw Error('Credential file must be private');
let key=(await readFile(secretPath,'utf8')).trim();await unlink(secretPath);
if(!key)throw Error('Empty credential');
const hash=v=>createHash('sha256').update(v).digest('hex');
const redact=v=>JSON.parse(JSON.stringify(v,(_k,x)=>typeof x==='string'?x.split(key).join('[REDACTED]'):x));
const out=path.join(root,'docs/infographic-v400/svg-repair-20261010/evidence',runName);
await mkdir(out,{recursive:false});
let priorRequests=0;
for(const name of await readdir(path.dirname(out))){if(name===runName||!/^round-/.test(name))continue;const previous=path.join(path.dirname(out),name);try{priorRequests+=JSON.parse(await readFile(path.join(previous,'summary.json'),'utf8')).requests||0;for(const child of await readdir(previous)){try{await stat(path.join(previous,child,'final-review.json'));priorRequests++;}catch{}}}catch{}}
const {createRefineRuntime}=await import(pathToFileURL(path.join(root,'test-support/refine-runtime.mjs')));
const originalFetch=globalThis.fetch;
const endpoint='https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
let count=0,stop=false;
const summary={date:'2026-10-10',runName,realProvider:true,localInfrastructure:true,models:{main:'qwen3.7-plus',image:'wan2.7-image-pro'},imageCalls:0,requestCeiling:22,sessionCeiling:54,priorRequests,requests:0,usage:{prompt_tokens:0,completion_tokens:0,total_tokens:0},acceptanceChanges:{maxCriticRounds:2,originalMethodCaptionDataReferences:true},runs:[]};
const save=()=>writeFile(path.join(out,'summary.json'),JSON.stringify(redact(summary),null,2)+'\n');
process.env.PLOT_WORKER_URL='http://local-program-worker.invalid';
async function worker(wire){return new Promise((resolve,reject)=>{
 const child=spawn('/Users/a1-6/.cache/tuyan-figure-qa-20261010/bin/python',[path.join(root,'scripts/figures/render-json.py')]),chunks=[],errors=[];
 child.stdout.on('data',x=>chunks.push(x));child.stderr.on('data',x=>errors.push(x));child.on('error',reject);child.on('close',code=>{try{if(code)throw Error(Buffer.concat(errors).toString());resolve(JSON.parse(Buffer.concat(chunks).toString()))}catch(e){reject(e)}});child.stdin.end(JSON.stringify(wire));
})}
function normalizedWire(wire){return JSON.parse(JSON.stringify(wire,(_k,x)=>{
 if(typeof x==='string'&&x.startsWith('data:image/')){const bytes=Buffer.from(x.split(',')[1],'base64');return {mime:x.slice(5,x.indexOf(';')),sha256:hash(bytes),bytes:bytes.length}}
 return x;
}))}
function kind(wire){const text=JSON.stringify(wire);return text.includes('SVG visual AND code review')||text.includes('Decide whether the current candidate')?'review':text.includes('Topology')||text.includes('topology extraction')?'topology':text.includes('SVG Diagram Agent')?'svg':'plan'}
async function paid(dir,run,wire,stage){
 if(stop||count>=summary.requestCeiling||priorRequests+count>=summary.sessionCeiling-2)throw Object.assign(Error('Explicit live request ceiling reached or previous request uncertain; final review allowance reserved'),{localInputFailure:true});
 const sent={...wire,model:'qwen3.7-plus',enable_thinking:false,max_tokens:8192,stream:true,stream_options:{include_usage:true}};
 const call={number:++count,kind:stage||kind(sent),model:sent.model,endpoint,request:normalizedWire(sent),originalParameters:{enable_thinking:wire.enable_thinking,max_tokens:wire.max_tokens},startedAt:new Date().toISOString()};
 summary.requests=count;run.calls.push(call);await save();
 const filename=path.join(dir,`call-${call.number}-${call.kind}.json`);
 console.log('CALL',call.number,run.scenario,call.kind);
 for(const m of sent.messages||[])for(const [i,p] of (Array.isArray(m.content)?m.content:[]).entries()){const data=p.image_url?.url;if(data?.startsWith('data:image/'))await writeFile(path.join(dir,`call-${call.number}-input-${i}.png`),Buffer.from(data.split(',')[1],'base64'));}
 try{
  const response=await originalFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify(sent),signal:AbortSignal.timeout(180000),redirect:'error'});
  const raw=await response.text(),parts=[];call.httpStatus=response.status;
  for(const line of raw.split('\n'))if(line.startsWith('data: ')&&!line.includes('[DONE]')){let d;try{d=JSON.parse(line.slice(6))}catch{continue}if(d.usage)call.usage=d.usage;if(d.id)call.requestId=d.id;if(d.choices?.[0]?.delta?.content)parts.push(d.choices[0].delta.content);if(d.error)call.providerError=d.error;}
  call.responseText=parts.join('');call.elapsedMs=Date.now()-Date.parse(call.startedAt);
  if(!response.ok){stop=true;call.providerError=raw.slice(0,3000);}
  if(call.usage)for(const k of Object.keys(summary.usage))summary.usage[k]+=call.usage[k]||0;
  await writeFile(filename,JSON.stringify(redact(call),null,2)+'\n');await save();
  console.log('DONE',call.number,response.status,call.responseText.length,'chars');
  return {response:new Response(raw,{status:response.status,headers:response.headers}),call};
 }catch(e){stop=true;call.error=String(e.message).split(key).join('[REDACTED]');await writeFile(filename,JSON.stringify(redact(call),null,2)+'\n');await save();throw Error(call.error);}
}

try{
 for(const name of ['state-diagram-svg','mixed-workflow-bar-svg']){
  if(stop)break;if(scenario!=='both'&&name!==scenario)continue;
  const dir=path.join(out,name);await mkdir(dir);
  const originalPath=path.join(root,'docs/infographic-v400/completion/evidence/live-bailian',name,'input.json');
  const original=await readFile(originalPath),body=JSON.parse(original);
  body.apiKeys={bailian:'credential-injected-only-at-transport'};body.maxCriticRounds=2;
  const run={scenario:name,inputSource:path.relative(root,originalPath),originalInputHash:hash(original),calls:[],artifacts:[]};summary.runs.push(run);
  await writeFile(path.join(dir,'input.json'),JSON.stringify({...body,apiKeys:{bailian:'[REDACTED]'}},null,2)+'\n');
  const r=await createRefineRuntime();
  r.legacy.configureRuntimeFetch(async(url,init={})=>{
   url=String(url);
   if(url.startsWith(r.baseUrl+'/objects/')){const object=r.objects.get(decodeURIComponent(url.slice((r.baseUrl+'/objects/').length)));return new Response(object?.bytes||'',{status:object?200:404,headers:{'Content-Type':object?.mimeType||'text/plain'}});}
   if(url.endsWith('/models'))return Response.json({data:[]});
   if(url==='http://local-program-worker.invalid/render')return Response.json(await worker(JSON.parse(String(init.body))));
   if(url!==endpoint)throw Error('Unexpected endpoint in representative SVG run');
   return (await paid(dir,run,JSON.parse(String(init.body)))).response;
  });
  try{
   const created=await r.post(body);run.admission=redact(created.data);
   if(created.data.code!==0){console.log('ADMISSION FAILED',name,created.data.code);continue;}
   await r.legacy.drainJobAdmission();
   const job=(await r.post({action:'getJob',jobId:created.data.jobId})).data.job;
   run.status=job.status;run.error=job.error;run.review=job.resultImages?.[0]?.review;
   for(const [objectKey,object] of r.objects)if(objectKey.includes(job.id||job._id)){const file=path.basename(objectKey);await writeFile(path.join(dir,file),object.bytes);run.artifacts.push({file,mimeType:object.mimeType,sha256:hash(object.bytes)});}
   await writeFile(path.join(dir,'job.json'),JSON.stringify(redact(job),null,2)+'\n');
   console.log('RESULT',name,job.status,run.review?.status,redact(job.error||''));
  }catch(e){run.error=String(e.message).split(key).join('[REDACTED]');console.log('RUN FAILED',name,run.error.slice(0,500));}
  finally{await r.close();await save();}
 }
}finally{await save();key='';}
console.log('SUMMARY',JSON.stringify({requests:summary.requests,usage:summary.usage,runs:summary.runs.map(r=>({scenario:r.scenario,status:r.status,review:r.review?.status,error:r.error}))}));
