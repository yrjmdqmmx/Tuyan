import {checkOriginalMaterial} from './materials.js';

// No localStorage/base64 fallback: an unconfirmed durable write must never permit upload.
export const MATERIAL_DB='tuyan-original-materials-v2';
const sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
async function database(){
 if(!globalThis.indexedDB)throw Error('浏览器文件保存不可用，请允许此站点使用浏览器存储；尚未上传服务器。');
 return new Promise((resolve,reject)=>{const r=indexedDB.open(MATERIAL_DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('records',{keyPath:['scope','id']});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('浏览器文件库被旧页面占用，请关闭旧页面后重试。'));});
}
async function transaction(mode,fn){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('records',mode),store=tx.objectStore('records');let value;tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(tx.error||Error('浏览器文件保存事务失败。'));fn(store,v=>{value=v});});}finally{db.close();}}
export const getBrowserRecord=(scope,id)=>transaction('readonly',(s,done)=>{s.get([scope,id]).onsuccess=e=>done(e.target.result)});
export const putBrowserRecord=record=>transaction('readwrite',s=>s.put(record));
export const deleteBrowserRecord=(scope,id)=>transaction('readwrite',s=>s.delete([scope,id]));
export async function listBrowserMaterials(scope){return (await transaction('readonly',(s,done)=>{s.getAll().onsuccess=e=>done(e.target.result)})).filter(r=>r.scope===scope&&r.kind==='file').sort((a,b)=>b.createdAt-a.createdAt).map(descriptor);}
export function descriptor(r){return {id:r.id,clientFileId:r.id,filename:r.filename,format:r.format,size:r.size,sha256:r.sha256,status:'local',browserSaved:true};}
export async function saveBrowserMaterial(scope,file){
 const info=checkOriginalMaterial(file),bytes=await file.arrayBuffer(),hash=await sha(bytes),id=crypto.randomUUID();
 try{
  await putBrowserRecord({scope,id,kind:'file',...info,mimeType:file.type,bytes,sha256:hash,createdAt:Date.now()});
  const saved=await getBrowserRecord(scope,id);
  if(!saved||saved.bytes.byteLength!==file.size||await sha(saved.bytes)!==hash)throw Error('原件回读校验失败');
  return descriptor(saved);
 }catch(error){await deleteBrowserRecord(scope,id).catch(()=>{});throw Error('浏览器未能确认保存原文件（空间不足或访问受限），尚未上传服务器。'+(error?.message||''));}
}
export async function browserFile(scope,ref){
 const r=await getBrowserRecord(scope,ref.clientFileId||ref.id);
 if(!r?.bytes||r.kind!=='file')throw Error(`当前浏览器没有 ${ref.filename||'该文件'} 的原件，可能已删除、清除站点数据或来自其他设备，请重新上传。`);
 if(r.sha256!==ref.sha256||await sha(r.bytes)!==r.sha256)throw Error(`浏览器原件 ${r.filename} 校验不一致，未上传。`);
 return new File([r.bytes],r.filename,{type:r.mimeType});
}
export async function rememberMaterialJob(scope,job){
 const refs=[...(job.materialFiles||job.generationContext?.materialFiles||[]),...(job.taskSourceMaterial?[job.taskSourceMaterial]:[])];
 if(!refs.length)return;
 await putBrowserRecord({scope,id:'job:'+job.id,kind:'job',refs,readings:job.materialReads||[],status:job.status,updatedAt:Date.now()});
}
