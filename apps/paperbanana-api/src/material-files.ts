import {createHash,randomUUID} from 'node:crypto'
import {access} from 'node:fs/promises'
import path from 'node:path'
import {spawn} from 'node:child_process'

export const MATERIAL_FILE_VERSION=2
export const MATERIAL_RETENTION_DAYS=1
export const MATERIAL_MAX_BYTES=10_000_000
export const MATERIAL_MIME:Record<string,string>={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',svg:'image/svg+xml',pdf:'application/pdf',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',txt:'text/plain',md:'text/markdown',csv:'text/csv',tsv:'text/tab-separated-values',json:'application/json'}
export type MaterialOwner={userId:string;accountGeneration?:string}
export type MaterialFile={id:string;filename:string;format:string;size:number;sha256:string;status:'uploaded';expiresAt:string;clientFileId?:string}
export function materialError(message:string,status=400):never {throw Object.assign(new Error(message),{name:'MaterialError',statusCode:status,businessCode:'MATERIAL_READ_ERROR',localInputFailure:true,requestState:'not_sent'})}
export function materialDescriptor(file:any){const filename=String(file?.filename||'');const format=filename.split('.').pop()?.toLowerCase()||'';if(format==='ppt')materialError('暂不支持旧版 PPT，请在 PowerPoint 中另存为 PPTX。');if(!filename||filename.length>240||/[\x00-\x1f/\\]/.test(filename)||!MATERIAL_MIME[format])materialError('不支持该文件格式。');if(!Number.isSafeInteger(file.size)||file.size<1||file.size>MATERIAL_MAX_BYTES)materialError('文件须大于 0 且不超过 10 MB。');return {filename,format,size:file.size,mimeType:MATERIAL_MIME[format]};}
let running=0
export async function readMaterialBytes(bytes:Buffer,filename:string,operation:any){
 if(running>=2)materialError('材料读取繁忙，请稍后重试。',429)
 const descriptor=materialDescriptor({filename,size:bytes.length});
 const candidates=[path.resolve('assets/material-reader/worker.mjs'),path.resolve('apps/paperbanana-api/assets/material-reader/worker.mjs')]
 let worker='';for(const p of candidates){try{await access(p);worker=p;break}catch{}}
 if(!worker)materialError('后端缺少材料读取运行文件。',503)
 running++
 try{return await new Promise<any>((resolve,reject)=>{
  // A separate process receives no auth, API, database or object-store credentials.
  const env:NodeJS.ProcessEnv={PATH:process.env.PATH,TMPDIR:process.env.TMPDIR,LANG:'C.UTF-8',...(process.env.TUYAN_SOFFICE_PATH?{TUYAN_SOFFICE_PATH:process.env.TUYAN_SOFFICE_PATH}:{})}
  const child=spawn(process.execPath,['--max-old-space-size=384',worker],{env,stdio:['pipe','pipe','pipe'],detached:process.platform!=='win32'})
  let output='',diagnostic='',settled=false
  const stop=()=>{try{if(process.platform==='win32')child.kill('SIGKILL');else process.kill(-child.pid!,'SIGKILL')}catch{}}
  const finish=(error?:Error,value?:any)=>{if(settled)return;settled=true;clearTimeout(timer);if(error){stop();reject(Object.assign(error,{name:'MaterialError',statusCode:422,localInputFailure:true,requestState:'not_sent'}))}else resolve(value)}
  const timer=setTimeout(()=>finish(new Error('材料读取超过 60 秒，已停止；原文件保留，可缩小范围重试。')),60000)
  child.stdout.on('data',c=>{output+=c;if(output.length>12*1024*1024)finish(new Error('材料读取结果超限，已停止。'))})
  child.stderr.on('data',c=>{if(diagnostic.length<2000)diagnostic+=c})
  child.on('error',e=>finish(e));child.stdin.on('error',()=>{})
  child.on('close',()=>{try{const start=output.indexOf('{"ok":');const parsed=JSON.parse(output.slice(start));if(!parsed.ok)finish(new Error(parsed.error));else finish(undefined,parsed.result)}catch{finish(new Error('读取进程失败或返回无效结果；请重试或更换文件。'))}})
  child.stdin.end(JSON.stringify({bytes:bytes.toString('base64'),filename,format:descriptor.format,operation}))
 })}finally{running--}
}
const digest=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex')
export function createMaterialFiles({db,bucket,ownerPrefix,assertOwner}: {db:any;bucket:()=>any;ownerPrefix:(owner:MaterialOwner)=>string;assertOwner:(owner:MaterialOwner)=>Promise<void>}){
 const files=db.collection('paperbanana_material_files'),reads=db.collection('paperbanana_material_reads')
 let indexes:Promise<any>|undefined
 const ensureIndexes=()=>indexes||=(Promise.all([files.createIndex({userId:1,accountGeneration:1,status:1}),files.createIndex({expiresAt:1}),reads.createIndex({materialId:1,userId:1,accountGeneration:1,createdAt:-1})]).catch(error=>{indexes=undefined;throw error}))
 function filter(owner:MaterialOwner,id:string){if(!owner.userId||!/^[-\w]{1,80}$/.test(id))materialError('材料归属或 ID 无效。',403);return {_id:id,userId:owner.userId,accountGeneration:owner.accountGeneration||''}}
 const publicFile=(v:any):MaterialFile=>({id:v._id,filename:v.filename,format:v.format,size:v.size,sha256:v.sha256||'',status:'uploaded',expiresAt:new Date(v.expiresAt).toISOString(),...(v.clientFileId?{clientFileId:v.clientFileId}:{})})
 async function owned(owner:MaterialOwner,id:string,allowPrepared=false){await assertOwner(owner);const f=await files.findOne(filter(owner,id));if(!f||f.status==='deleted'||(!allowPrepared&&f.status!=='uploaded'))materialError('原文件不存在或无权访问，请重新上传。',404);if(new Date(f.expiresAt).getTime()<=Date.now())materialError('原文件保存期限已到，请重新上传；未使用旧摘要替代原件。',410);return f}
 async function prepare(owner:MaterialOwner,input:any[]){
  await ensureIndexes();await assertOwner(owner);
  if(!Array.isArray(input)||input.length<1||input.length>10)materialError('每次最多上传 10 份文件。');
  const existing=await files.find({userId:owner.userId,status:{$in:['prepared','uploaded']}}).limit(51).toArray();
  if(existing.length+input.length>50)materialError('未结束的临时上传过多，请等待任务结束或临时材料过期。');
  const results=[];
  for(const file of input){
   const d=materialDescriptor(file);if(file.clientFileId!==undefined&&!/^[a-f0-9-]{36}$/.test(file.clientFileId))materialError('浏览器文件引用无效。');
   let id=randomUUID(),restored:any={};
   if(file.restoreId){
    if(typeof file.jobId!=='string')materialError('恢复材料必须指定原任务。');
    const job=await db.collection('paperbanana_jobs').findOne({_id:file.jobId,userId:owner.userId,accountGeneration:owner.accountGeneration||''});
    const ref=[...(job?.materialFiles||job?.generationContext?.materialFiles||[]),...(job?.taskSourceMaterial?[job.taskSourceMaterial]:[])].find((f:any)=>f.id===file.restoreId);
    if(!ref||job.status!=='failed'||ref.filename!==d.filename||ref.size!==d.size)materialError('材料不属于可恢复的原任务。',403);
    const prior=await files.findOne(filter(owner,ref.id));
    if(prior&&prior.status!=='deleted')materialError('材料已在上传或待恢复，请稍后重试。',409);
    id=ref.id;restored={jobId:file.jobId,expectedSha256:ref.sha256,clientFileId:ref.clientFileId||'',resumeLeaseUntil:new Date(Date.now()+15*60e3)};
   }
   const objectKey=`references/${ownerPrefix(owner)}/materials/${id}/${randomUUID()}/source.${d.format}`,now=Date.now(),putExpiresAt=now+15*60e3;
   const row={_id:id,...d,clientFileId:file.clientFileId||'',...restored,userId:owner.userId,accountGeneration:owner.accountGeneration||'',objectKey,status:'prepared',createdAt:new Date(now),expiresAt:new Date(now+24*3600e3),putExpiresAt:new Date(putExpiresAt)};
   if(file.restoreId){const prior=await files.findOne(filter(owner,id));if(prior){const changed=await files.updateOne({...filter(owner,id),status:'deleted'},{$set:row,$unset:{uploadObjectKey:'',sha256:'',overview:'',cleanupComplete:''}});if(!changed.matchedCount)materialError('材料恢复已被另一请求占用。',409)}else await files.insertOne(row);}else await files.insertOne(row);
   const uploadUrl=await bucket().getUploadUrl(objectKey,900,{ContentType:d.mimeType,ContentLength:d.size});results.push({...publicFile(row),status:'prepared',objectKey,uploadUrl,putExpiresAt,mimeType:d.mimeType});
  }return results;
 }

 async function finalize(owner:MaterialOwner,id:string){
  const f=await owned(owner,id,true);if(f.status==='uploaded')return publicFile(f)
  const b=Buffer.from(await bucket().readFile(f.objectKey,MATERIAL_MAX_BYTES));if(b.length!==f.size)materialError('文件实际大小与上传声明不一致。')
  if(f.expectedSha256&&digest(b)!==f.expectedSha256)materialError('恢复原件与原任务 SHA-256 不一致，未改变任务来源。',409)
  const overview=await readMaterialBytes(b,f.filename,{op:'overview'});await owned(owner,id,true)
  // The public PUT URL can only overwrite the staging object. The finalized original has a different, private key.
  const objectKey=f.objectKey.replace(/source\.[^.]+$/,'original-'+randomUUID()+'.'+f.format)
  const intent=await files.updateOne({...filter(owner,id),status:'prepared'},{$push:{pendingObjectKeys:objectKey}});if(!intent.matchedCount)materialError('上传已取消或已完成，请刷新文件状态。',409)
  await bucket().writeFile(objectKey,b,{ContentType:f.mimeType,CacheControl:'private, no-store'})
  const next={status:'uploaded',objectKey,uploadObjectKey:f.objectKey,sha256:digest(b),overview,expiresAt:new Date(Date.now()+MATERIAL_RETENTION_DAYS*86400e3)}
  const updated=await files.updateOne({...filter(owner,id),status:'prepared'},{$set:next})
  if(!updated.matchedCount){await bucket().deleteFile(objectKey);materialError('上传已取消或已完成，请刷新文件状态。',409)}
  await bucket().deleteFile(f.objectKey);return publicFile({...f,...next})
 }
 async function bind(owner:MaterialOwner,input:any[]){if(!Array.isArray(input)||input.length>10||new Set(input.map(f=>f?.id)).size!==input.length)materialError('文档引用无效或超过 10 份。');return Promise.all(input.map(async ref=>publicFile(await owned(owner,ref.id))))}
 async function read(owner:MaterialOwner,id:string,operation:any,jobId?:string){
  if(jobId!==undefined&&(typeof jobId!=='string'||jobId.length>200||!/^[\w-]*$/.test(jobId)))materialError('任务 ID 无效。');
  const f=await owned(owner,id);if(!operation||typeof operation!=='object'||JSON.stringify(operation).length>2000)materialError('读取参数无效。')
  if(jobId){const job=await db.collection('paperbanana_jobs').findOne({_id:jobId,userId:owner.userId});if(!job||(job.accountGeneration||'')!==(owner.accountGeneration||'')||!(job.materialFiles||job.generationContext?.materialFiles||[]).some((m:any)=>m.id===id))materialError('文件未授权给当前任务。',403)}
  const bytes=Buffer.from(await bucket().readFile(f.objectKey,MATERIAL_MAX_BYTES));if(digest(bytes)!==f.sha256)materialError('原文件内容已改变，无法使用此引用。',409)
  // Stable per-task records make provider-step recovery replay the same prompt and source IDs.
  const recordId=digest(JSON.stringify([id,f.sha256,jobId||'',Object.fromEntries(Object.entries(operation).sort(([a],[b])=>a.localeCompare(b)))]))
  const prior=await reads.findOne({_id:recordId})
  if(prior?.objectKey&&prior.status!=='failed'){const result=JSON.parse(Buffer.from(await bucket().readFile(prior.objectKey,12*1024*1024)).toString());return {...result,recordId,sourceHash:f.sha256,materialId:id}}
  const history=await reads.find({materialId:id}).toArray()
  if(history.length>=64||history.reduce((n:number,r:any)=>n+(r.size||0),0)>=100*1024*1024)materialError('此原件的读取记录已达保存上限；请重新上传以继续新的任务。',413)
  const row={_id:recordId,materialId:id,userId:owner.userId,accountGeneration:owner.accountGeneration||'',jobId:jobId||'',operation,sourceHash:f.sha256,createdAt:new Date(),expiresAt:f.expiresAt}
  let result:any
  try{result=await readMaterialBytes(bytes,f.filename,operation)}catch(error:any){await owned(owner,id);await reads.updateOne({_id:recordId},{$set:{...row,status:'failed',error:error.message}}, {upsert:true});throw error}
  await owned(owner,id)
  const objectKey=f.objectKey.replace(/(?:original(?:-[\w-]+)?|source)\.[^.]+$/,'reads/'+recordId+'.json'),saved=Buffer.from(JSON.stringify(result))
  await bucket().writeFile(objectKey,saved,{ContentType:'application/json',CacheControl:'private, no-store'})
  try{await owned(owner,id)}catch(error){await bucket().deleteFile(objectKey);throw error}
  await reads.updateOne({_id:recordId},{$set:{...row,status:result.status,objectKey,size:saved.length,warnings:result.warnings||[],error:null}},{upsert:true})
  return {...result,recordId,sourceHash:f.sha256,materialId:id}
 }
 async function get(owner:MaterialOwner,id:string){const f=await owned(owner,id);const history=await reads.find({materialId:id,userId:owner.userId,accountGeneration:owner.accountGeneration||''}).sort({createdAt:-1}).limit(64).toArray();return {...publicFile(f),overview:f.overview,downloadUrl:await bucket().getDownloadUrl(f.objectKey,300),readings:await Promise.all(history.map(async(r:any)=>({id:r._id,operation:r.operation,status:r.status,jobId:r.jobId,createdAt:r.createdAt,sourceHash:r.sourceHash,warnings:r.warnings||[],error:r.error||null,...(r.objectKey?{resultUrl:await bucket().getDownloadUrl(r.objectKey,300)}:{})})))}}
 async function erase(f:any,retain=false){const records=await reads.find({materialId:f._id}).toArray();await files.updateOne({_id:f._id},{$set:{status:'deleted'}});for(const r of records)if(r.objectKey)await bucket().deleteFile(r.objectKey);for(const key of f.pendingObjectKeys||[])await bucket().deleteFile(key);await bucket().deleteFile(f.objectKey);if(f.uploadObjectKey)await bucket().deleteFile(f.uploadObjectKey);await reads.deleteMany({materialId:f._id});if(retain)await files.updateOne({_id:f._id},{$set:{status:'deleted',cleanupComplete:true,expiresAt:new Date(Math.max(Date.now(),new Date(f.putExpiresAt).getTime())+86400e3)}});else await files.deleteOne({_id:f._id})}
 async function claim(owner:MaterialOwner,input:any[],jobId:string){
  for(const ref of input){const f=await owned(owner,ref.id);if(f.jobId&&f.jobId!==jobId)materialError('材料临时副本仅供一次任务使用，请从浏览器原件重新上传。',409);const result=await files.updateOne({...filter(owner,ref.id),status:'uploaded',...(f.jobId?{jobId}:{jobId:{$exists:false}})},{$set:{jobId},$unset:{resumeLeaseUntil:''}});if(!result.matchedCount)materialError('材料已被另一任务占用，请重新上传。',409);}
 }
 async function finishJob(jobId:string,force=true){
  const job=await db.collection('paperbanana_jobs').findOne({_id:jobId});if(!job||!['succeeded','failed','cancelled'].includes(job.status))return;
  const rows=await files.find({jobId,userId:job.userId,accountGeneration:job.accountGeneration||''}).toArray();
  if(!rows.length&&!job.materialSourceSnapshotKey)return;
  if(!force&&rows.some((f:any)=>new Date(f.resumeLeaseUntil||0).getTime()>Date.now()))return;
  try{for(const f of rows)if(!f.cleanupComplete)await erase(f,true);if(job.materialSourceSnapshotKey)await bucket().deleteFile(job.materialSourceSnapshotKey);
   // Durable workflow results can contain the original bytes/text too. Keep paid
   // child-call receipts for safe recovery, but discard these enclosing caches.
   const steps=db.collection('paperbanana_provider_steps'),chunks=db.collection('paperbanana_provider_step_chunks');
   for(const step of await steps.find({jobId,taskMaterialCache:true}).toArray()){
    for(let i=0;i<(step.chunks||0);i++)await chunks.deleteOne({_id:`${step._id}:${i}`});
    await steps.updateOne({_id:step._id},{$set:{chunks:0,materialCacheCleared:true,...(step.state==='complete'?{state:'rejected'}:{})}});
   }
   await db.collection('paperbanana_jobs').updateOne({_id:jobId},{$set:{materialCleanup:{status:'cleared',at:new Date()}}});}
  catch{await db.collection('paperbanana_jobs').updateOne({_id:jobId},{$set:{materialCleanup:{status:'pending',at:new Date()}}}).catch(()=>{});}
 }

 return {prepare,finalize,bind,read,get,claim,finishJob,
  async deleteJob(job:any){
   const rows=await files.find({jobId:job._id,userId:job.userId,accountGeneration:job.accountGeneration||''}).toArray();
   for(const f of rows){await erase(f,true);const keep=new Set(['_id','userId','accountGeneration','jobId','status','objectKey','uploadObjectKey','pendingObjectKeys','putExpiresAt','expiresAt','cleanupComplete','cleanupCheckedAt']);await files.updateOne({_id:f._id},{$unset:Object.fromEntries(Object.keys(f).filter(k=>!keep.has(k)).map(k=>[k,'']))});}
   if(job.materialSourceSnapshotKey)await bucket().deleteFile(job.materialSourceSnapshotKey);
  },source:(owner:MaterialOwner,id:string)=>owned(owner,id),
  async list(owner:MaterialOwner){await assertOwner(owner);return (await files.find({userId:owner.userId,accountGeneration:owner.accountGeneration||'',status:'uploaded',expiresAt:{$gt:new Date()}}).sort({createdAt:-1}).limit(50).toArray()).map(publicFile)},
  async remove(owner:MaterialOwner,id:string){const f=await owned(owner,id,true);const active=await db.collection('paperbanana_jobs').find({userId:owner.userId,status:{$in:['queued','running']}}).toArray();if(active.some((j:any)=>(j.materialFiles||j.generationContext?.materialFiles||[]).some((m:any)=>m.id===id)))materialError('任务正在读取此文件，请任务结束后再删除原件。',409);await erase(f,true)},
  async sweep(){await ensureIndexes();const pendingJobs=await db.collection('paperbanana_jobs').find({'materialCleanup.status':'pending'}).limit(100).toArray();for(const j of pendingJobs)await finishJob(j._id,false);const claimed=await files.find({status:{$in:['uploaded','deleted']},jobId:{$exists:true},cleanupComplete:{$ne:true}}).limit(100).toArray();for(const f of claimed)await finishJob(f.jobId,false);const settling=await files.find({status:"deleted"}).sort({cleanupCheckedAt:1}).limit(100).toArray();for(const f of settling){await bucket().deleteFile(f.objectKey);if(f.uploadObjectKey)await bucket().deleteFile(f.uploadObjectKey);await files.updateOne({_id:f._id,status:"deleted"},{$set:{cleanupCheckedAt:new Date()}})}const expired=await files.find({expiresAt:{$lt:new Date()}}).limit(25).toArray();for(const f of expired){const job=f.jobId?await db.collection('paperbanana_jobs').findOne({_id:f.jobId}):null;if(job&&['queued','running'].includes(job.status))continue;await erase(f)}},
  async deleteOwner(userId:string){await reads.deleteMany({userId});await files.deleteMany({userId})},
 }
}
