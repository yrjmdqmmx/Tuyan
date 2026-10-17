// Authorized local acceptance: real provider, real browser/Core/readers; local auth/DB/objects.
// Feed credentials through stdin only. No credential is persisted or put in browser storage.
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=process.cwd(),out=process.argv[2];
if(!out)throw Error('Evidence directory required');
await mkdir(out,{recursive:true});
const {createRefineRuntime}=await import(pathToFileURL(path.join(root,'test-support/refine-runtime.mjs')));
const {chromium}=await import('/Users/a1-6/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const realFetch=globalThis.fetch,hash=b=>createHash('sha256').update(b).digest('hex');
let key='',runtime,context,page,active,stopped=false;
const summary={date:'2026-10-12',realProvider:true,realBrowser:true,localInfrastructure:true,credentialStorage:'process-memory-only',parameterOverrides:'main thinking off via product thinkingConfig; image defaults',requestCeiling:110,imageCeiling:6,calls:[],runs:[],browserErrors:[]};
try{Object.assign(summary,JSON.parse(await readFile(path.join(out,'summary.json'),'utf8')));}catch{}
summary.requestCeiling=110;
const clean=v=>JSON.parse(JSON.stringify(v,(_k,x)=>typeof x==='string'&&key?x.split(key).join('[REDACTED]'):x));
const save=()=>writeFile(path.join(out,'summary.json'),JSON.stringify(clean(summary),null,2));
const dump=(name,value)=>writeFile(path.join(out,name),JSON.stringify(clean(value),null,2));
const assetUrls=new Set();
function kind(w){const t=JSON.stringify(w);return w.input?.messages?'image':t.includes('main model reading original research files')?'material':t.includes('page observer for the current task')?'page-observation':t.includes('visual review')||t.includes('SVG visual AND code review')?'review':t.includes('SVG Diagram Agent')?'svg':'plan';}
async function transport(url,init={}){
 url=String(url);
 if(url.startsWith(runtime.baseUrl+'/objects/')){const o=runtime.objects.get(decodeURIComponent(url.slice((runtime.baseUrl+'/objects/').length)));return new Response(o?new Uint8Array(o.bytes):'',{status:o?200:404,headers:{'Content-Type':o?.mimeType||'application/octet-stream'}});}
 if(url.endsWith('/models'))return Response.json({data:[]}); // Static product catalogue, not a model inference.
 if(assetUrls.has(url))return realFetch(url,{signal:AbortSignal.timeout(60000),redirect:'error'});
 const allowed=['https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions','https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'];
 if(!allowed.includes(url))throw Error('Unexpected provider endpoint: '+new URL(url).origin+new URL(url).pathname);
 if(stopped||!key||summary.calls.length>=summary.requestCeiling)throw Object.assign(Error('Live request budget/stopped/credential guard'),{localInputFailure:true});
 const wire=JSON.parse(String(init.body)),type=kind(wire);
 if(type==='image'&&summary.calls.filter(c=>c.kind==='image').length>=summary.imageCeiling)throw Object.assign(Error('Live image ceiling'),{localInputFailure:true});
 const n=summary.calls.length+1,pictures=[];
 const request=JSON.parse(JSON.stringify(wire,(_k,v)=>{if(typeof v==='string'&&v.startsWith('data:image/')){const bytes=Buffer.from(v.split(',')[1],'base64'),mime=v.slice(5,v.indexOf(';')),file=`call-${n}-input-${pictures.length+1}.${mime==='image/jpeg'?'jpg':'png'}`;pictures.push({bytes,file});return {mime,sha256:hash(bytes),bytes:bytes.length,file};}return v;}));
 for(const im of pictures)await writeFile(path.join(out,im.file),im.bytes);
 const call={number:n,scenario:active?.name,kind:type,model:wire.model,endpoint:url,request,pageImageCount:pictures.length,startedAt:new Date().toISOString()};summary.calls.push(call);await save();console.log('CALL',n,type,wire.model,'images',pictures.length);
 try{
  const res=await realFetch(url,{...init,headers:{...init.headers,'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify(wire),signal:AbortSignal.timeout(240000),redirect:'error'});
  const raw=await res.text();call.httpStatus=res.status;call.elapsedMs=Date.now()-Date.parse(call.startedAt);let parts=[];
  if(raw.trim().startsWith('{')){const d=JSON.parse(raw);call.requestId=d.request_id||d.id;call.usage=d.usage;call.responseText=d.choices?.[0]?.message?.content||d.output_text||'';if(d.code||d.error)call.error=d.message||d.error;for(const ch of d.output?.choices||[])for(const p of ch.message?.content||[])if(p.image){const u=new URL(p.image);if(u.protocol!=='https:'||!/(?:^|\.)(?:aliyuncs\.com|alicdn\.com)$/.test(u.hostname))throw Error('Unexpected generated asset domain');assetUrls.add(p.image);}call.generatedImageCount=d.output?.choices?.flatMap(c=>c.message?.content||[]).filter(p=>p.image).length||0;
  }else{for(const line of raw.split('\n'))if(line.startsWith('data: ')&&!line.includes('[DONE]')){let d;try{d=JSON.parse(line.slice(6));}catch{continue;}if(d.usage)call.usage=d.usage;if(d.id)call.requestId=d.id;if(d.choices?.[0]?.delta?.content)parts.push(d.choices[0].delta.content);if(d.error)call.error=d.error;}call.responseText=parts.join('');}
  if(!res.ok){stopped=true;call.error=call.error||raw.slice(0,2000);}
  await dump(`call-${n}-${type}.json`,call);await save();console.log('DONE',n,res.status,call.elapsedMs,'ms');return new Response(raw,{status:res.status,headers:res.headers});
 }catch(e){stopped=true;call.error=clean(String(e.message));await dump(`call-${n}-${type}.json`,call);await save();throw Error(call.error);}
}
const task='这是合成教学材料的真实文件读取验收。请结合所上传 PDF 的原始两组样本数据与矢量流程图、PPTX 的可见流程布局、数据表/图表和备注，绘制一张简洁的双面板学术图。PDF 与 PPTX 展示同一套三节点流程，只画一套流程并采用 PPTX 的视觉样式；不要把两种示例串成六步。上方面板只放流程节点名称，不把数据附加到节点上。下方只对比 PPTX 图表中的 Alpha、Beta 两组准确原值和单位；PDF 中另一个 Control/Treatment 表格是独立解析示例，不要并入本图。不加入额外研究结论或显著性。主模型规划中说明 PDF 与 PPTX 的来源页、流程箭头方向、PPTX 流程节点的形状和填充颜色，并区分备注和页面可见文字；必须基于相关完整页面画面确认这些视觉特征。图中文字使用英文，保留原材料真实数值，标注 Synthetic example。请精炼规划，不抄写全篇材料。';
async function browserOriginals(){return page.evaluate(async()=>{const db=await new Promise((ok,no)=>{const q=indexedDB.open('tuyan-original-materials-v2');q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);});const rows=await new Promise(ok=>{db.transaction('records').objectStore('records').getAll().onsuccess=e=>ok(e.target.result);});db.close();return rows.map(({bytes,...r})=>({...r,bytes:bytes?.byteLength}));});}
async function closeSettings(){await page.getByRole('button',{name:'关闭生成设置'}).click();await page.locator('.generation-drawer-backdrop').evaluate(el=>Promise.all(el.getAnimations({subtree:true}).filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));}
async function credentials(){await page.getByRole('button',{name:'打开完整设置'}).click();await page.getByLabel(/百炼.*接入密钥/).fill('local-live-transport-credential');await closeSettings();}
async function finish(admission){const res=await admission,data=await res.json();assert.equal(data.code,0,JSON.stringify(data));active.jobId=data.jobId;const submitted={...res.request().postDataJSON()};delete submitted.apiKeys;active.submission=submitted;await runtime.legacy.drainJobAdmission();const job=(await runtime.post({action:'getJob',jobId:data.jobId})).data.job;active.status=job.status;active.error=job.error;active.review=job.resultImages?.[0]?.review;active.files=job.materialFiles;active.readings=job.materialReads;active.cleanup=job.materialCleanup;active.artifacts=[];
 for(const image of job.resultImages||[]){const o=runtime.objects.get(image.objectKey);if(o){const filename=active.name+'-'+path.basename(image.objectKey);await writeFile(path.join(out,filename),o.bytes);active.artifacts.push({filename,mimeType:o.mimeType,sha256:hash(o.bytes)});}}
 for(const [key,value] of runtime.objects)if(key.startsWith(data.jobId+'/')){await mkdir(path.join(out,active.name+'-stages'),{recursive:true});await writeFile(path.join(out,active.name+'-stages',path.basename(key)),value.bytes);}
 const cached=await runtime.db.collection('paperbanana_provider_steps').find({jobId:data.jobId,taskMaterialCache:true}).toArray();active.materialReplayCaches=cached.map(c=>({id:c._id,chunks:c.chunks,cleared:c.materialCacheCleared}));assert.ok(cached.every(c=>c.chunks===0&&c.materialCacheCleared));
 await dump(active.name+'-job.json',job);await dump(active.name+'-browser.json',await browserOriginals());await page.screenshot({path:path.join(out,active.name+'-browser.png'),fullPage:true});await save();console.log('RESULT',active.name,job.status,active.review?.status,job.error||'');if(job.status!=='succeeded')throw Error('Job did not succeed: '+JSON.stringify(job.error));
 assert.equal(job.materialCleanup?.status,'cleared');for(const f of job.materialFiles){assert.notEqual((await runtime.post({action:'getMaterial',materialId:f.id})).data.code,0);assert.ok(![...runtime.objects.keys()].some(k=>k.includes('/materials/'+f.id+'/')));}return job;
}
async function start(){
 runtime=await createRefineRuntime({tokenDance:true,port:8795,frontendOrigin:'http://127.0.0.1:5175'});runtime.legacy.configureRuntimeFetch(transport);
 context=await chromium.launchPersistentContext(path.join(out,'browser-profile'),{headless:true,executablePath:'/Users/a1-6/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',viewport:{width:1440,height:1050}});page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>summary.browserErrors.push(e.message));await page.goto('http://127.0.0.1:5175');
 await page.evaluate(task=>{localStorage.setItem('tuyan.model-routing.v1',JSON.stringify({version:1,mode:'advanced',roles:{main:{accessProvider:'bailian',modelId:'qwen3.7-plus'},image:{accessProvider:'bailian',modelId:'wan2.7-image-pro'},vision:{accessProvider:'bailian',modelId:'qwen3.7-plus'}}}));localStorage.setItem('tuyan.thinking.v1',JSON.stringify({version:1,roles:{main:{provider:'bailian',modelId:'qwen3.7-plus',protocol:'bailian-openai-chat',options:{mode:false}}}}));localStorage.setItem('tuyan.figure-settings.v1',JSON.stringify({version:2,figureTypeId:'method_framework',outputFormat:'png',retrievalSetting:'none',methodContent:task,caption:'Synthetic material reading acceptance',aspectRatio:'16:9',imageSize:'1K'}));localStorage.setItem('tuyan.workflow-settings.v1',JSON.stringify({version:1,numCandidates:1,maxCriticRounds:1,visionMode:'none'}));},task);
 await page.reload();await credentials();console.log('READY',runtime.baseUrl);await save();
}
async function run(name){active={name:name+'-'+(summary.runs.filter(r=>r.name===name||r.name.startsWith(name+'-')).length+1),scenario:name,startedAt:new Date().toISOString()};summary.runs.push(active);await save();
 if(name==='generate-png'||name==='generate-svg'){
  if(name==='generate-svg'){await page.getByRole('button',{name:'打开完整设置'}).click();await page.getByLabel('导出格式',{exact:true}).selectOption('svg');await closeSettings();}
  const before=summary.calls.length;if(await page.locator('.material-file-list article').count()===0){await page.getByLabel('上传文件',{exact:true}).setInputFiles(['mixed-research.pdf','research-slides.pptx'].map(f=>path.join(root,'docs/material-reader-20261012/fixtures',f)));await page.getByText('已保存到浏览器 · 待读取',{exact:true}).nth(1).waitFor();}active.localBeforeUpload=await browserOriginals();assert.equal(summary.calls.length,before);
  if(await page.getByText('当前后端尚不支持思考设置，请升级服务或清除所选参数。',{exact:true}).count())throw Error('Thinking preflight blocked');const pending=page.waitForResponse(r=>r.request().method()==='POST'&&r.request().postDataJSON()?.action==='createJob',{timeout:120000});await page.getByRole('button',{name:'生成候选图',exact:true}).last().click();await finish(pending);
 }else if(name==='edit-svg'){
  await page.getByRole('button',{name:'修改 SVG 1',exact:true}).click();
  await page.getByText('待修改的SVG源码.txt',{exact:true}).waitFor();
  assert.equal(await page.locator('.material-file-list article').count(),3);
  await page.getByLabel('论文方法内容',{exact:true}).fill(task+' 修改所附当前SVG：保持真实数据，将上方流程改为纵向排列且箭头朝下，下方保留横排两组柱状对比，删除任何额外连线，英文文字。用当前完整源码修改，原始材料用于核对事实。');
  const pending=page.waitForResponse(r=>r.request().method()==='POST'&&r.request().postDataJSON()?.action==='createJob',{timeout:120000});await page.getByRole('button',{name:'生成候选图',exact:true}).last().click();await finish(pending);
 }else if(name==='refine-png'||name==='refine-fixed'){
  if(name==='refine-fixed'){
   // Rebuild only the local infrastructure fixture from the ACTUAL earlier result.
   // This is not evidence of production persistence or a replayed model response.
   const original=JSON.parse(await readFile(path.join(out,'restored-png-1-job.json'),'utf8'));
   const bytes=await readFile(path.join(out,'restored-png-1-candidate-0.png')),result=original.resultImages[0];
   assert.equal(hash(bytes),result.review.deliveredPngHash);
   await runtime.db.collection('paperbanana_jobs').insertOne({...original,_id:original.id,accountGeneration:'',createdAt:new Date(original.createdAt),updatedAt:new Date(original.updatedAt)});
   runtime.objects.set(result.objectKey,{bytes,mimeType:'image/png'});
   active.fixtureSourceImport={jobId:original.id,sourcePngHash:hash(bytes),reason:'Actual earlier PNG/metadata imported after local runtime code reload; no inference response replay; browser originals remain in existing IndexedDB.'};
   await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'任务记录',exact:true}).click();
   await page.getByRole('button',{name:'刷新',exact:true}).click();
   await page.getByRole('button',{name:'精修结果图 1',exact:true}).click();
  }else await page.getByRole('button',{name:'精修候选图 1',exact:true}).click();await page.getByText('research-slides.pptx',{exact:true}).waitFor();assert.equal(await page.locator('.material-file-list article').count(),2);
  await page.getByLabel('精修指令',{exact:true}).fill('再次查阅 PDF 与 PPTX 的相关原文和完整页面，核对原始数值与箭头。上方面板仅保留一条 Input→Check→Output 三节点流程，采用PPTX蓝色渐变圆角样式，不要把两套画法串成六步；节点只放名称，不附加数据。下方面板保留Alpha/Beta两组柱状对比，保留PPTX原值和单位，修正柱高使其精确对应原值和坐标轴，零点起始且刻度等距；不能只改标签。删除重复表格和 speaker notes 文字，保留 Synthetic example 标记。将流程整体上移，扩大两面板留白和标签。不得新增结论、组间箭头或显著性。');
  if(await page.getByText('当前后端尚不支持思考设置，请升级服务或清除所选参数。',{exact:true}).count())throw Error('Thinking preflight blocked');const pending=page.waitForResponse(r=>r.request().method()==='POST'&&r.request().postDataJSON()?.action==='refineImage',{timeout:120000});await page.getByRole('button',{name:'提交精修',exact:true}).click();await finish(pending);
 }else if(name==='restored-svg'||name==='restored-png'){
  await page.reload();await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'任务记录',exact:true}).click();await page.getByRole('button',{name:'恢复图型与完整输入'}).last().click();await page.getByText('research-slides.pptx',{exact:true}).waitFor();active.restoredBrowserOriginals=await browserOriginals();assert.equal(await page.locator('.material-file-list article').count(),2);
  await page.getByRole('button',{name:'打开完整设置'}).click();await page.getByLabel('导出格式',{exact:true}).selectOption(name==='restored-png'?'png':'svg');await page.getByLabel(/百炼.*接入密钥/).fill('local-live-transport-credential');await closeSettings();
  if(await page.getByText('当前后端尚不支持思考设置，请升级服务或清除所选参数。',{exact:true}).count())throw Error('Thinking preflight blocked');const pending=page.waitForResponse(r=>r.request().method()==='POST'&&r.request().postDataJSON()?.action==='createJob',{timeout:120000});await page.getByRole('button',{name:'生成候选图',exact:true}).last().click();await finish(pending);
 }else throw Error('Unknown run');
}
const lines=createInterface({input:process.stdin,crlfDelay:Infinity});
console.log('AWAITING_CREDENTIAL_STDIN');
for await(const line of lines){try{const command=JSON.parse(line);if(command.key){if(key)throw Error('Credential already loaded');key=command.key;await start();}else if(command.run){await run(command.run);}else if(command.inspect){console.log((await page.locator('body').innerText()).slice(-14000));}else if(command.close){await save();await context?.close();await runtime?.close();key='';process.exit(0);}else throw Error('Unknown command');}catch(e){const message=clean(String(e.message));console.log('ERROR',message);if(active)active.runnerError=message;await save();if(page){await page.screenshot({path:path.join(out,'latest-error.png'),fullPage:true}).catch(()=>{});console.log('UI_ERROR', (await page.locator('[role=alert]').allTextContents()).join(' ').slice(0,2000));}}}
