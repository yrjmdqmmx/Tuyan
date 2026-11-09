import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const {createRefineRuntime}=await import(pathToFileURL(path.join(root,'test-support/refine-runtime.mjs')));
const {renderSvgForReview}=await import(pathToFileURL(path.join(root,'apps/paperbanana-api/src/svg-review.ts')));
let key=process.env.TUYAN_BAILIAN_LIVE_KEY || '';delete process.env.TUYAN_BAILIAN_LIVE_KEY;
if(!key)throw new Error('Missing temporary credential');
const out=path.join(root,'docs/workflow-v400/bailian-followup-20261010/svg-fresh');await mkdir(out,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
const clean=x=>JSON.parse(JSON.stringify(x,(_k,v)=>typeof v==='string'?v.split(key).join('[REDACTED]'):v));
const realFetch=globalThis.fetch;
const runs=[];let count=0,stop=false;
const total={prompt_tokens:0,completion_tokens:0,total_tokens:0};
const limit=10;
const reference='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400"><rect width="800" height="400" fill="white"/><text x="630" y="40" font-size="24">REF-73</text><rect x="70" y="150" width="240" height="100" rx="12" fill="#dbeafe" stroke="#2563eb"/><text x="100" y="210" font-size="28">样品输入</text><path d="M320 200 H450 M435 190 L450 200 L435 210" stroke="#334155" stroke-width="4" fill="none"/><rect x="470" y="150" width="240" height="100" rx="12" fill="#dcfce7" stroke="#15803d"/><text x="500" y="210" font-size="28">结果输出</text></svg>';
const rendered=await renderSvgForReview(reference);await writeFile(path.join(out,'reference.svg'),reference);await writeFile(path.join(out,'reference.png'),rendered.png);
const jobs=[
 {name:'ordinary-direct',main:'qwen3.7-plus',vision:'none',rounds:1},
 {name:'ordinary-assisted',main:'deepseek-v4-pro',vision:'assist',rounds:1},
];
function requestKind(w){const s=JSON.stringify(w);return s.includes('SVG visual AND code review')?'review':s.includes('visual observer')?'observer':s.includes('SVG Diagram Agent')?'svg':'plan'}
function summarizeWire(w){return JSON.parse(JSON.stringify(w,(_k,v)=>{if(typeof v==='string'&&v.startsWith('data:image/')){const bytes=Buffer.from(v.split(',')[1],'base64');return {mime:v.slice(5,v.indexOf(';')),sha256:hash(bytes),bytes:bytes.length}}return v}))}
async function saveSummary(){await writeFile(path.join(out,'summary.json'),JSON.stringify(clean({date:'2026-10-10',provider:'bailian',endpoint:'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',realProvider:true,localInfrastructure:true,maxRequests:limit,testOverrides:{enable_thinking:false,max_tokens:8192,stream_options:{include_usage:true}},requests:count,usage:total,runs}),null,2)+'\n')}
try{
 for(const spec of jobs){
  if(stop)break;
  console.log('START',spec.name,spec.main);
  const r=await createRefineRuntime();const dir=path.join(out,spec.name);await mkdir(dir,{recursive:true});const calls=[];
  const run={scenario:spec.name,main:spec.main,vision:spec.vision,calls,artifacts:[]};runs.push(run);
  r.legacy.configureRuntimeFetch(async(url,init={})=>{
   url=String(url);
   if(url.startsWith(r.baseUrl+'/objects/')){const o=r.objects.get(decodeURIComponent(url.slice((r.baseUrl+'/objects/').length)));return new Response(o?.bytes||'',{status:o?200:404,headers:{'Content-Type':o?.mimeType||'text/plain'}})}
   if(url.endsWith('/models'))return Response.json({data:[]});
   if(url!=='https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions')throw new Error('Live runner refuses unexpected external endpoint');
   if(stop||count>=limit)throw Object.assign(new Error('Live test request budget reached or provider stopped'),{localInputFailure:true});
   const original=JSON.parse(String(init.body));
   const wire={...original,enable_thinking:false,max_tokens:8192,stream_options:{include_usage:true}};
   if(JSON.stringify(wire).includes('http://127.0.0.1:'))throw new Error('Unreachable local image URL in actual request');
   const n=++count,kind=requestKind(wire),started=Date.now();
   const call={endpoint:url,number:n,kind,model:wire.model,request:summarizeWire(wire),originalParameters:{enable_thinking:original.enable_thinking,max_tokens:original.max_tokens,stream_options:original.stream_options}};calls.push(call);
   console.log('CALL',n,spec.name,kind,wire.model);
   let response;
   try{response=await realFetch(url,{...init,body:JSON.stringify(wire),headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},signal:AbortSignal.timeout(180000),redirect:'error'});const text=await response.text();call.httpStatus=response.status;call.elapsedMs=Date.now()-started;
    const parts=[];let usage=null;
    for(const line of text.split('\n'))if(line.startsWith('data: ')&&!line.includes('[DONE]')){try{const d=JSON.parse(line.slice(6));if(d.usage)usage=d.usage;if(d.choices?.[0]?.delta?.content)parts.push(d.choices[0].delta.content);if(d.id)call.requestId=d.id;if(d.error)call.providerError=d.error}catch{}}
    if(!response.ok){let data;try{data=JSON.parse(text)}catch{data={message:text.slice(0,500)}}call.providerError=clean(data);stop=true;}
    call.responseText=parts.join('');call.usage=usage;
    if(usage)for(const k of Object.keys(total))total[k]+=usage[k]||0;
    await writeFile(path.join(dir,`call-${n}-${kind}.json`),JSON.stringify(clean(call),null,2)+'\n');await saveSummary();
    console.log('DONE',n,response.status,call.responseText.length+' chars',call.elapsedMs+' ms');
    return new Response(text,{status:response.status,headers:response.headers});
   }catch(e){stop=true;call.error=String(e.message).split(key).join('[REDACTED]');await saveSummary();throw new Error(call.error)}
  });
  try{
   r.objects.set('library/reference.png',{bytes:rendered.png,mimeType:'image/png'});
   await r.db.collection('paperbanana_references').insertOne({_id:'live-svg-reference',id:'live-svg-reference',taskName:'diagram',title:'双节点方法图参考',summary:'观察该图的颜色、布局和右上角标识，作为版式参考。',source:'paperbanana-bench',corpusVersion:'zh-CN.v2',imageObjectKey:'library/reference.png',imageUrl:r.baseUrl+'/objects/library/reference.png'});
   const body={action:'createJob',configurationMode:'advanced',provider:'bailian',apiKeys:{bailian:'live-secret-injected-only-at-transport'},modelRoutes:{main:{accessProvider:'bailian',modelId:spec.main},vision:{accessProvider:'bailian',modelId:'qwen3.7-plus'},image:{accessProvider:'bailian',modelId:'wan2.7-image-pro'}},methodContent:'这是合成测试案例，不代表真实研究。绘制三步科学流程：样品输入（n=12）→ 数据标准化（x / x₀）→ 结果输出（均值 1.0）。方向必须从左到右，不能添加其他步骤或数值。文字使用中文，数学表达式准确保留。若提供参考图，使用其配色与圆角框布局，并把参考图右上角的短标识原样放在新图右上角。',caption:'从样品输入到标准化结果的三步方法流程。',negativePrompt:'禁止虚构实验结论、遗漏标签、交叉或反向连线；不要在图内写图注。',infographicCategory:'method',outputFormat:'svg',visionMode:spec.vision,pipelineMode:spec.library?'vanilla':'planner_critic',retrievalSetting:spec.library?'manual':'none',manualReferenceIds:spec.library?['live-svg-reference']:[],numCandidates:1,maxCriticRounds:spec.rounds,aspectRatio:'16:9',imageSize:'1K'};
   const a=await r.post(body);if(a.data.code!==0){run.admission=clean(a);console.log('ADMISSION',spec.name,a.data.code,a.data.message||a.data.error||'');continue}
   await r.legacy.drainJobAdmission();const job=(await r.post({action:'getJob',jobId:a.data.jobId})).data.job;
   run.job=job;run.status=job.status;run.error=job.error;run.review=job.resultImages?.[0]?.review;
   for(const [objectKey,o]of r.objects){if(objectKey.includes(job.id||job._id)){const file=path.basename(objectKey);await writeFile(path.join(dir,file),o.bytes);run.artifacts.push({file,mimeType:o.mimeType,sha256:hash(o.bytes)})}}
   await writeFile(path.join(dir,'input.json'),JSON.stringify({...body,apiKeys:{bailian:'[REDACTED]'}},null,2));
   await writeFile(path.join(dir,'job.json'),JSON.stringify(clean(job),null,2)+'\n');console.log('RESULT',spec.name,job.status,run.review?.status,job.error||'');
  }catch(e){run.error=String(e.message).split(key).join('[REDACTED]');console.log('ERROR',spec.name,run.error.slice(0,500))}
  finally{await r.close();await saveSummary()}
 }
 console.log('SUMMARY',JSON.stringify({requests:count,usage:total,runs:runs.map(r=>({scenario:r.scenario,status:r.status,review:r.review?.status,error:r.error,admission:r.admission?.data?.code}))}));
}finally{await saveSummary();key='';}
