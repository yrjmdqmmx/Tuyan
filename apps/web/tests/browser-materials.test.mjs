import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {File} from 'node:buffer';
import {IDBFactory,IDBDatabase} from 'fake-indexeddb';
import {act,renderHook,waitFor,cleanup} from '@testing-library/react';
import useTaskMaterials from '../src/hooks/useTaskMaterials.js';
import {saveBrowserMaterial,browserFile,getBrowserRecord,listBrowserMaterials,deleteBrowserRecord} from '../src/lib/browserMaterials.js';
import {checkOriginalMaterial} from '../src/lib/materials.js';
const originalFetch=globalThis.fetch;
afterEach(()=>{cleanup();globalThis.fetch=originalFetch});
test('browser originals: commit, byte verification, reload, owner isolation, removal and exact 10 MB boundary',async()=>{
 globalThis.indexedDB=new IDBFactory();const scope='owner-a',file=new File(['Alpha,35\nBeta,12'],'values.csv',{type:'text/csv'});
 const saved=await saveBrowserMaterial(scope,file);assert.equal(await(await browserFile(scope,saved)).text(),await file.text());
 assert.equal((await listBrowserMaterials(scope)).length,1);assert.equal((await listBrowserMaterials('owner-b')).length,0);
 await assert.rejects(browserFile('owner-b',saved),/当前浏览器没有/);
 assert.equal(checkOriginalMaterial(new File([new Uint8Array(10_000_000)],'large.png')).size,10_000_000);
 assert.throws(()=>checkOriginalMaterial(new File([new Uint8Array(10_000_001)],'large.pdf')),/10 MB/);
 const row=await getBrowserRecord(scope,saved.id);row.bytes=new Uint8Array([1]).buffer;
 const {putBrowserRecord}=await import('../src/lib/browserMaterials.js');await putBrowserRecord(row);await assert.rejects(browserFile(scope,saved),/校验不一致/);
 await deleteBrowserRecord(scope,saved.id);await assert.rejects(browserFile(scope,saved),/当前浏览器没有/);
});
test('selection sends zero requests, ten mixed files persist across remount; upload reads committed bytes first',async()=>{
 globalThis.indexedDB=new IDBFactory();let calls=0;const pending=new Map();let hook;
 globalThis.fetch=async(url,init={})=>{calls++;if(init.method==='PUT')return new Response('');const b=JSON.parse(init.body);
  if(b.action==='prepareMaterialUpload'){const f=b.files[0],stored=await getBrowserRecord(hook.result.current.scope,f.clientFileId);assert.ok(stored?.bytes,'durable original must exist before prepare');assert.equal(stored.bytes.byteLength,f.size);pending.set(f.clientFileId,stored);return Response.json({code:0,uploads:[{id:f.clientFileId,uploadUrl:'https://fixture.invalid/put',mimeType:stored.mimeType}]});}
  if(b.action==='finalizeMaterialUpload'){const s=pending.get(b.materialId);return Response.json({code:0,file:{id:s.id,clientFileId:s.id,filename:s.filename,sha256:s.sha256,status:'uploaded'}});}
  return Response.json({code:0});};
 const config={apiBase:'https://fixture.invalid',health:{runtime:'gateway'},ownerId:'alice',version:2,kind:'generate'};
 hook=renderHook(()=>useTaskMaterials(config));await act(async()=>{await new Promise(r=>setTimeout(r,10))});
 const files=Array.from({length:10},(_,i)=>new File(['value,'+i],i%2?`file${i}.png`:`file${i}.csv`,{type:i%2?'image/png':'text/csv'}));
 await act(()=>hook.result.current.panel.onAddFiles(files));assert.equal(hook.result.current.materials.length,10);assert.equal(calls,0);
 await act(()=>hook.result.current.panel.onAddFiles([files[0]]));assert.match(hook.result.current.error,/10 份/);assert.equal(calls,0);
 hook.unmount();hook=renderHook(()=>useTaskMaterials(config));await waitFor(()=>assert.equal(hook.result.current.materials.length,10));
 let uploaded;await act(async()=>{uploaded=await hook.result.current.prepare()});assert.equal(uploaded.length,10);assert.equal(calls,30);
 await act(()=>hook.result.current.remember({id:'job',status:'succeeded',materialFiles:uploaded,materialReads:[{type:'read',materialId:uploaded[0].id,status:'read',operation:{op:'read'}}]}));
 assert.equal((await getBrowserRecord(hook.result.current.scope,'job:job')).readings.length,1);
 assert.equal((await hook.result.current.restore({materialFiles:uploaded})).length,10);
});
test('storage unavailable or quota failure blocks server upload and preserves an existing replacement',async()=>{
 globalThis.indexedDB=new IDBFactory();let calls=0;globalThis.fetch=async()=>{calls++;throw Error('must not request')};
 const hook=renderHook(()=>useTaskMaterials({apiBase:'https://fixture.invalid',health:{runtime:'gateway'},ownerId:'a',version:2,kind:'refine'}));await act(async()=>{await new Promise(r=>setTimeout(r,10))});
 await act(()=>hook.result.current.panel.onAddFiles([new File(['35'],'a.csv')]));const id=hook.result.current.materials[0].id;
 const idb=globalThis.indexedDB;globalThis.indexedDB=undefined;
 await act(()=>hook.result.current.panel.onReplaceMaterial(id,new File(['12'],'b.csv')));assert.equal(hook.result.current.materials[0].filename,'a.csv');assert.match(hook.result.current.error,/尚未上传/);assert.equal(calls,0);
 globalThis.indexedDB=idb;
 const transaction=IDBDatabase.prototype.transaction;
 IDBDatabase.prototype.transaction=function(names,mode,...rest){if(mode==='readwrite')throw new DOMException('Storage quota exhausted','QuotaExceededError');return transaction.call(this,names,mode,...rest)};
 try{await act(()=>hook.result.current.panel.onReplaceMaterial(id,new File(['99'],'quota.csv')));assert.match(hook.result.current.error,/空间不足/);assert.equal(hook.result.current.materials[0].filename,'a.csv');assert.equal(calls,0);}finally{IDBDatabase.prototype.transaction=transaction;}
});
