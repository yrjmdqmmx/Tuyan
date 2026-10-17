import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {zipSync,strToU8} from 'fflate'
import {readMaterialBytes,createMaterialFiles,materialDescriptor} from '../src/material-files.js'
import {memoryDb} from '../../../test-support/memory-db.mjs'
const fixture=(n:string)=>readFile(new URL('../../../docs/material-reader-20261012/fixtures/'+n,import.meta.url))
test('PDF actual bytes: text, columns, vector page, table, scan, mixed; errors',async()=>{
 const dense=await fixture('dense.pdf');assert.ok((await readMaterialBytes(dense,'dense.pdf',{op:'read',pages:[1]})).chunks[0].text.length>1400);assert.equal((await readMaterialBytes(dense,'dense.pdf',{op:'render',pages:[1]})).images.length,1);await assert.rejects(readMaterialBytes(dense,'dense.pdf',{op:'read',pages:[1],includePositions:true}),/includePositions/);
 const bytes=await fixture('mixed-research.pdf')
 assert.equal((await readMaterialBytes(bytes,'paper.pdf',{op:'overview'})).pageCount,6)
 for(const n of [1,2,3,4,5,6]){const r=await readMaterialBytes(bytes,'paper.pdf',{op:'read',pages:[n]});assert.equal(r.chunks[0].page,n);if(n===5)assert.equal(r.status,'partial');else assert.ok(r.chunks[0].text.trim());}
 const positioned=await readMaterialBytes(bytes,'paper.pdf',{op:'read',pages:[1],includePositions:true});assert.ok(positioned.chunks[0].positionedText.length);assert.equal((await readMaterialBytes(bytes,'paper.pdf',{op:'read',pages:[1],startLine:1,endLine:1})).chunks[0].lines[1],1);
 const r=await readMaterialBytes(bytes,'paper.pdf',{op:'render',pages:[3,5,6]});assert.equal(r.images.length,3);for(const p of r.images)assert.ok(Buffer.from(p.base64,'base64').subarray(1,4).equals(Buffer.from('PNG')))
 const found=await readMaterialBytes(bytes,'paper.pdf',{op:'search',query:'Control'});assert.deepEqual(found.chunks.map((c:any)=>c.page),[4])
 await assert.rejects(readMaterialBytes(await fixture('encrypted.pdf'),'encrypted.pdf',{op:'overview'}))
 await assert.rejects(readMaterialBytes(await fixture('corrupt.pdf'),'corrupt.pdf',{op:'overview'}))
 await assert.rejects(readMaterialBytes(bytes,'paper.pdf',{op:'read',pages:[301]}),/页码/)
 assert.throws(()=>materialDescriptor({filename:'legacy.ppt',size:8}),/PPTX/)
 assert.throws(()=>materialDescriptor({filename:'huge.pdf',size:11*1024*1024}),/10 MB/)
})
test('PPTX real OOXML and whole-page conversion retain Chinese, charts, tables, notes and pixels',async()=>{
 const bytes=await fixture('research-slides.pptx'),r=await readMaterialBytes(bytes,'slides.pptx',{op:'read',pages:[1,2]})
 assert.match(r.chunks[0].text,/研究材料/);assert.match(r.chunks[0].notes.text,/备注专属/);assert.equal(r.chunks[0].notes.visibility,'speaker_notes_not_visible_on_slide')
 assert.ok(r.chunks[1].images.length);assert.deepEqual(r.chunks[1].tables[0],[['名称','原值'],['Alpha','35'],['Beta','12']])
 assert.deepEqual(r.chunks[1].charts[0].series[0].savedValues.map((p:any)=>p.value),['35','12']);assert.ok(r.chunks[1].charts[0].embeddedWorkbooks[0].sheets[0].cells.some((c:any)=>c.value==='35'))
 const v=await readMaterialBytes(bytes,'slides.pptx',{op:'render',pages:[1,2]});assert.equal(v.images.length,2);assert.match(v.chunks[0].text,/研究材料/);assert.ok(v.warnings.some((w:string)=>w.includes('Calibri')));assert.ok(!v.warnings.some((w:string)=>w.includes('文字覆盖不完整')))
 const evil=zipSync({'[Content_Types].xml':strToU8('<Types/>'),'ppt/presentation.xml':strToU8('<p/>'),'ppt/_rels/presentation.xml.rels':strToU8('<Relationships><Relationship TargetMode="External" Target="http://127.0.0.1/secret"/></Relationships>')});await assert.rejects(readMaterialBytes(Buffer.from(evil),'bad.pptx',{op:'overview'}),/外部链接/)
})
test('material ownership, task scope, authoritative original, retention, deletion and same-byte restoration',async()=>{
 const db=memoryDb(),objects=new Map<string,Buffer>(),owner={userId:'alice'};const store={getUploadUrl:async(k:string)=>'https://fixture.invalid/'+k,getDownloadUrl:async(k:string)=>'https://fixture.invalid/'+k,readFile:async(k:string)=>{if(!objects.has(k))throw Error('missing');return objects.get(k)},writeFile:async(k:string,b:Buffer)=>objects.set(k,Buffer.from(b)),deleteFile:async(k:string)=>objects.delete(k)}
 const service=createMaterialFiles({db,bucket:()=>store,ownerPrefix:o=>o.userId,assertOwner:async()=>{}}),data=await fixture('observations.csv')
 const [u]=await service.prepare(owner,[{filename:'observations.csv',size:data.length}]);objects.set(u.objectKey,data);const f=await service.finalize(owner,u.id);assert.equal(f.status,'uploaded');assert.ok(f.sha256)
 assert.equal((await service.bind(owner,[{id:f.id,filename:'forged'}]))[0].filename,'observations.csv')
 await assert.rejects(service.get({userId:'bob'},f.id));await assert.rejects(service.get({userId:'alice',accountGeneration:'new'},f.id))
 await db.collection('paperbanana_jobs').insertOne({_id:'job',userId:'alice',status:'succeeded',materialFiles:[f]})
 const read=await service.read(owner,f.id,{op:'read'},'job');assert.match(read.chunks[0].text,/Alpha,35/);assert.equal(read.sourceHash,f.sha256)
 const restored=await service.get(owner,f.id);assert.equal(restored.readings.length,1);assert.equal(restored.sha256,f.sha256);assert.ok(restored.downloadUrl)
 await assert.rejects(service.read(owner,f.id,{op:'read'},'unrelated'),/当前任务/);await assert.rejects(service.read(owner,f.id,{op:'read'},{$ne:'x'} as any),/任务 ID/)
 const originalKey=(await db.collection('paperbanana_material_files').findOne({_id:f.id})).objectKey;objects.set(u.objectKey,Buffer.from('signed PUT replay'));assert.match((await service.read(owner,f.id,{op:'read'},'job')).chunks[0].text,/Alpha,35/);assert.equal((await service.read(owner,f.id,{op:'read'},'job')).recordId,read.recordId);objects.set(originalKey,Buffer.from('changed'));await assert.rejects(service.read(owner,f.id,{op:'read'}),/改变/);objects.set(originalKey,data)
 await service.remove(owner,f.id);assert.equal(objects.has(u.objectKey),false);await assert.rejects(service.get(owner,f.id));
 const [expired]=await service.prepare(owner,[{filename:'data.csv',size:data.length}]);objects.set(expired.objectKey,data);await service.finalize(owner,expired.id);await db.collection('paperbanana_material_files').updateOne({_id:expired.id},{$set:{expiresAt:new Date(0)}});await assert.rejects(service.get(owner,expired.id),/期限/);await service.sweep();assert.equal(objects.has(expired.objectKey),false)
})
test('DOCX/XLSX real reads, unsupported visuals, malformed PPTX, explicit unhandled objects and bounds',async()=>{
 const doc=await fixture('observations.docx'),word=await readMaterialBytes(doc,'study.docx',{op:'read',pages:[1]});assert.match(word.chunks[0].text,/Alpha/);assert.equal((await readMaterialBytes(doc,'study.docx',{op:'render',pages:[1]})).images.length,1)
 const xlsx=await fixture('observations.xlsx');assert.deepEqual((await readMaterialBytes(xlsx,'data.xlsx',{op:'overview'})).sheets,['原始数据']);const sheet=await readMaterialBytes(xlsx,'data.xlsx',{op:'read',sheet:'原始数据'});assert.equal(sheet.chunks[0].cells.find((c:any)=>c.address==='B2').value,'35');assert.match(sheet.chunks[0].cells.find((c:any)=>c.address==='C2').warning,/公式缺缓存/);await assert.rejects(readMaterialBytes(xlsx,'data.xlsx',{op:'render'}),/暂不支持/)
 await assert.rejects(readMaterialBytes(Buffer.from('broken'),'deck.pptx',{op:'overview'}));await assert.rejects(readMaterialBytes(await fixture('legacy.ppt'),'protected.pptx',{op:'overview'}));await assert.rejects(readMaterialBytes(await fixture('research-slides.pptx'),'slides.pptx',{op:'search',startPage:-3,query:'Alpha'}),/页码/)
 const {unzipSync}=await import('fflate'),z=unzipSync(await fixture('research-slides.pptx'));z['ppt/slides/slide1.xml']=strToU8(Buffer.from(z['ppt/slides/slide1.xml']).toString().replace('</p:sld>','<p:timing/><p:oleObj/><a:videoFile/><a:audioFile/><m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"/></p:sld>'));const special=Buffer.from(zipSync(z));const native=await readMaterialBytes(special,'special.pptx',{op:'read',pages:[1]});assert.equal(native.status,'partial');for(const q of ['嵌入对象','视频','音频','动画','公式'])assert.ok(native.warnings.some((w:string)=>w.includes(q)));await assert.rejects(readMaterialBytes(special,'special.pptx',{op:'render',pages:[1]}),/OLE/)
 await assert.rejects(readMaterialBytes(Buffer.from('{'),'broken.json',{op:'read'}));assert.equal((await readMaterialBytes(Buffer.from('{'),'broken.json',{op:'overview'})).status,'unread')
})
