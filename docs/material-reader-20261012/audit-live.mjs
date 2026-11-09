import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const out=process.argv[2],summary=JSON.parse(await readFile(path.join(out,'summary.json'),'utf8'));
const byModel={};
for(const c of summary.calls){const m=byModel[c.model]??={requests:0,successfulHttp:0,promptTokens:0,completionTokens:0,totalTokens:0,imageCount:0};m.requests++;m.successfulHttp+=c.httpStatus===200?1:0;m.promptTokens+=c.usage?.prompt_tokens||c.usage?.input_tokens||0;m.completionTokens+=c.usage?.completion_tokens||c.usage?.output_tokens||0;m.totalTokens+=c.usage?.total_tokens||0;m.imageCount+=c.generatedImageCount||0;}
const runs=[];
for(const r of summary.runs){
 const calls=summary.calls.filter(c=>c.scenario===r.name),reads=r.readings||[];
 const recordById=new Map(reads.filter(x=>x.type==='read').map(x=>[x.recordId,x]));
 const deliveries=reads.filter(x=>x.type==='model_received'&&x.pageImages?.length).map(x=>({phase:x.phase,step:x.step,pages:x.pageImages.map(p=>({file:recordById.get(p.recordId)?.filename,page:p.page,sha256:p.sha256,recordId:p.recordId}))}));
 const completions=reads.filter(x=>x.type==='completion').map(x=>({phase:x.phase,evidence:x.evidence,limitations:x.limitations,usedRecordIds:x.usedRecordIds}));
 let browser=[];try{browser=JSON.parse(await readFile(path.join(out,r.name+'-browser.json'),'utf8'));}catch{}
 const files=(r.files||[]).map(f=>({filename:f.filename,temporaryId:f.id,clientFileId:f.clientFileId,sha256:f.sha256,browserMatches:browser.some(b=>b.kind==='file'&&b.id===f.clientFileId&&b.sha256===f.sha256&&b.bytes===f.size)}));
 runs.push({scenario:r.name,status:r.status,error:r.error||r.runnerError,review:r.review,files,cleanup:r.cleanup,realCalls:calls.length,requestIds:calls.map(c=>c.requestId).filter(Boolean),deliveries,completions,protocolErrors:reads.filter(x=>x.type==='protocol_error'),artifacts:r.artifacts||[],restoredFromBrowser:Boolean(r.restoredBrowserOriginals)});
}
const current=runs.filter(r=>r.scenario.startsWith('generate-svg-')||r.scenario.startsWith('restored-png-')||r.scenario.startsWith('refine-png-')||r.scenario.startsWith('refine-fixed-'));
const fileReuse={};
for(const r of current)for(const f of r.files){const x=fileReuse[f.filename]??={hashes:[],browserIds:[],temporaryIds:[]};x.hashes.push(f.sha256);x.browserIds.push(f.clientFileId);x.temporaryIds.push(f.temporaryId);}
for(const f of Object.values(fileReuse)){f.taskCount=f.hashes.length;f.originalHashPreserved=f.taskCount>=2&&new Set(f.hashes).size===1;f.browserOriginalReused=f.taskCount>=2&&new Set(f.browserIds).size===1;f.newServerCopyPerTask=f.taskCount>=2&&new Set(f.temporaryIds).size===f.temporaryIds.length;}
await writeFile(path.join(out,'acceptance-audit.json'),JSON.stringify({realProvider:true,localAuthDatabaseObjectStore:true,invoiceCost:'not_reconciled',requestCount:summary.calls.length,byModel,fileReuse,browserErrors:summary.browserErrors,runs},null,2));
console.log(JSON.stringify({requestCount:summary.calls.length,byModel,runs:runs.map(r=>({name:r.scenario,status:r.status,review:r.review?.status,files:r.files.length,visualDeliveries:r.deliveries.length,cleanup:r.cleanup?.status})),fileReuse},null,2));
