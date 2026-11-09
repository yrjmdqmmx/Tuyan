import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import sharp from 'sharp'
import {memoryDb} from '../../../test-support/memory-db.mjs'
import {createMaterialFiles,readMaterialBytes,materialDescriptor} from '../src/material-files.js'
test('ten files, per-job claims, terminal cleanup, retry, immutable resume and abandoned uploads',async()=>{
 const db=memoryDb(),objects=new Map<string,Buffer>(),owner={userId:'alice',accountGeneration:'g1'};let failDelete=false,failSnapshot=false;
 const service=createMaterialFiles({db,bucket:()=>({getUploadUrl:async(k:string)=>k,getDownloadUrl:async(k:string)=>k,readFile:async(k:string)=>{if(!objects.has(k))throw Error('missing');return objects.get(k)},writeFile:async(k:string,b:Buffer)=>objects.set(k,b),deleteFile:async(k:string)=>{if(failSnapshot&&k==='snapshot'){failSnapshot=false;throw Error('snapshot temporarily unavailable')}if(failDelete){failDelete=false;throw Error('storage temporarily unavailable')}objects.delete(k)}}),ownerPrefix:o=>o.userId,assertOwner:async()=>{}});
 const bytes=Buffer.from('Alpha,35\nBeta,12'),clientFileId=randomUUID();
 const upload=async(extra:any={})=>{const [u]=await service.prepare(owner,[{filename:'data.csv',size:bytes.length,clientFileId,...extra}]);objects.set(u.objectKey,bytes);return {u,f:await service.finalize(owner,u.id)}};
 assert.equal(materialDescriptor({filename:'a.png',size:10_000_000}).size,10_000_000);assert.throws(()=>materialDescriptor({filename:'a.png',size:10_000_001}));
 await assert.rejects(service.prepare(owner,Array.from({length:11},()=>({filename:'a.txt',size:1}))),/10 份/);
 const ten=await service.prepare(owner,Array.from({length:10},()=>({filename:'a.txt',size:1})));assert.equal(ten.length,10);
 for(const v of ten){await db.collection('paperbanana_material_files').updateOne({_id:v.id},{$set:{expiresAt:new Date(0)}});objects.set(v.objectKey,Buffer.from('x'));}await service.sweep();assert.ok(ten.every(v=>!objects.has(v.objectKey)));
 for(const status of ['succeeded','failed','cancelled']){
  const {f,u}=await upload(),jobId='job-'+status;await db.collection('paperbanana_jobs').insertOne({_id:jobId,...owner,status:'running',materialFiles:[f]});await service.claim(owner,[f],jobId);
  await assert.rejects(service.claim(owner,[f],'other-task'),/仅供一次/);await assert.rejects(service.remove(owner,f.id),/正在读取/);
  await service.read(owner,f.id,{op:'read'},jobId);await service.finishJob(jobId);assert.ok(objects.size>0);
  await db.collection('paperbanana_provider_steps').insertOne({_id:jobId+':material',jobId,taskMaterialCache:true,state:'complete',chunks:1});
  await db.collection('paperbanana_provider_step_chunks').insertOne({_id:jobId+':material:0',data:'encrypted original bytes'});
  await db.collection('paperbanana_provider_step_chunks').insertOne({_id:jobId+':paid:0',data:'paid receipt, retain for recovery'});
  await db.collection('paperbanana_jobs').updateOne({_id:jobId},{$set:{status}});failDelete=status==='failed';await service.finishJob(jobId);
  if(status==='failed'){assert.equal((await db.collection('paperbanana_jobs').findOne({_id:jobId})).materialCleanup.status,'pending');await service.sweep();}
  assert.equal(await db.collection('paperbanana_provider_step_chunks').findOne({_id:jobId+':material:0'}),null);assert.ok(await db.collection('paperbanana_provider_step_chunks').findOne({_id:jobId+':paid:0'}));
  assert.ok(![...objects.keys()].some(k=>k.includes('/materials/'+f.id+'/')));assert.equal((await db.collection('paperbanana_jobs').findOne({_id:jobId})).materialCleanup.status,'cleared');await assert.rejects(service.get(owner,f.id));
  if(status==='succeeded'){objects.set('snapshot',bytes);await db.collection('paperbanana_jobs').updateOne({_id:jobId},{$set:{materialSourceSnapshotKey:'snapshot'}});failSnapshot=true;await service.finishJob(jobId);assert.equal((await db.collection('paperbanana_jobs').findOne({_id:jobId})).materialCleanup.status,'pending');await service.sweep();assert.ok(!objects.has('snapshot'));assert.equal((await db.collection('paperbanana_jobs').findOne({_id:jobId})).materialCleanup.status,'cleared');}
  // A still-valid staging PUT cannot resurrect a usable original and the reaper removes it.
  objects.set(u.objectKey,bytes);await service.sweep();assert.ok(!objects.has(u.objectKey));
  if(status==='failed'){
   await assert.rejects(service.prepare({...owner,userId:'bob'},[{filename:'data.csv',size:bytes.length,restoreId:f.id,jobId}]),/不属于/);
   const [bad]=await service.prepare(owner,[{filename:'data.csv',size:bytes.length,restoreId:f.id,jobId}]);objects.set(bad.objectKey,Buffer.alloc(bytes.length,120));await assert.rejects(service.finalize(owner,bad.id),/SHA-256/);await service.remove(owner,bad.id);
   const {f:restored}=await upload({restoreId:f.id,jobId});assert.equal(restored.id,f.id);assert.equal(restored.sha256,f.sha256);await service.sweep();assert.equal((await service.get(owner,restored.id)).sha256,f.sha256);await service.claim(owner,[restored],jobId);await service.finishJob(jobId);await assert.rejects(service.get(owner,f.id));
  }
 }
});
test('images are whole-page material reads; overview is not understanding and active SVG is rejected',async()=>{
 for(const format of ['png','jpeg','webp'] as const){const b=await sharp({create:{width:64,height:32,channels:3,background:'#36a'}}).toFormat(format).toBuffer();const overview=await readMaterialBytes(b,'image.'+format,{op:'overview'});assert.equal(overview.status,'unread');const result=await readMaterialBytes(b,'image.'+format,{op:'render',pages:[1]});assert.equal(result.images.length,1);assert.equal(result.images[0].width,64);assert.equal(result.images[0].height,32);}
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"><path d="M0 0L60 25" stroke="red"/></svg>');assert.equal((await readMaterialBytes(svg,'vector.svg',{op:'render'})).images.length,1);
 await assert.rejects(readMaterialBytes(Buffer.from('<svg><script>alert(1)</script></svg>'),'bad.svg',{op:'overview'}),/活动内容/);
 await assert.rejects(readMaterialBytes(Buffer.from('invalid'),'bad.png',{op:'overview'}));
});

test('page and line scope stays partial; PPTX render preserves raw table and chart data alongside pixels',async()=>{
 const {readFile}=await import('node:fs/promises');const fixtures=new URL('../../../docs/material-reader-20261012/fixtures/',import.meta.url)
 const pdf=await readMaterialBytes(await readFile(new URL('mixed-research.pdf',fixtures)),'mixed-research.pdf',{op:'render',pages:[3]})
 assert.equal(pdf.pageCount,6);assert.equal(pdf.status,'partial');assert.deepEqual(pdf.coverage.unreadPages,[1,2,4,5,6]);assert.equal(pdf.images.length,1)
 const slides=await readMaterialBytes(await readFile(new URL('research-slides.pptx',fixtures)),'research-slides.pptx',{op:'render',pages:[2]})
 assert.equal(slides.pageCount,2);assert.deepEqual(slides.coverage.unreadPages,[1]);assert.ok(slides.chunks[0].tables.length);assert.ok(slides.chunks[0].charts.length);assert.match(slides.chunks[0].nativeText,/Alpha/);assert.equal(slides.images.length,1)
 const text=await readMaterialBytes(Buffer.from(Array.from({length:150},(_,i)=>'line '+i).join('\n')),'notes.txt',{op:'read'})
 assert.equal(text.status,'partial');assert.match(text.warnings.join(' '),/150 行/)
})
