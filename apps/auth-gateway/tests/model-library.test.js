import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createHash, createDecipheriv } from 'node:crypto';
import { createModelLibraryStore, createModelLibraryRouter } from '../src/model-library.js';
const seed = { revision:0, connections:[{id:'connection',provider:'openai',scope:'account',label:'Work'}],models:[{id:'model',connectionId:'connection',modelId:'precise-model'}],credentials:{connection:'fixture-secret-never-return'}};
function database(){const rows=new Map();return {rows,collection:()=>({findOne:async q=>structuredClone(rows.get(q._id)||null),insertOne:async row=>{if(rows.has(row._id))throw Object.assign(Error(),{code:11000});rows.set(row._id,structuredClone(row));},replaceOne:async(q,row)=>{if(rows.get(q._id)?.revision!==q.revision)return {matchedCount:0};rows.set(q._id,structuredClone(row));return {matchedCount:1};},deleteMany:async()=>rows.clear()})};}
test('account secrets use authenticated encryption bound to account+connection and never return through public DTO',async()=>{
 const db=database(),secret='fixture-encryption-key',store=createModelLibraryStore({db,secret});
 const saved=await store.put('A',seed);assert.equal(saved.connections[0].hasCredential,true);assert.doesNotMatch(JSON.stringify(saved),/fixture-secret|sealed|credentials/);
 const row=[...db.rows.values()][0];assert.doesNotMatch(JSON.stringify(row),/fixture-secret-never-return/);
 const key=createHash('sha256').update('tuyan-model-library-v1\0').update(secret).digest(),cipher=row.sealed.connection;
 const decode=aad=>{const d=createDecipheriv('aes-256-gcm',key,Buffer.from(cipher.iv,'base64'));d.setAAD(Buffer.from(aad));d.setAuthTag(Buffer.from(cipher.tag,'base64'));return Buffer.concat([d.update(Buffer.from(cipher.data,'base64')),d.final()]).toString();};
 assert.equal(decode(`${row._id}/connection`),seed.credentials.connection);assert.throws(()=>decode('other-account/connection'));
 assert.equal(await store.resolve('A','connection'),seed.credentials.connection);await assert.rejects(store.resolve('B','connection'),{status:400});
 assert.deepEqual((await store.get('B')).models,[]);await assert.rejects(store.put('A',seed),{status:409});
 const next=await store.put('A',{...saved,connections:saved.connections.map(c=>({...c,scope:'browser'}))});assert.equal(next.connections[0].hasCredential,false);assert.deepEqual([...db.rows.values()][0].sealed,{});
});
test('browser secrets, malformed identity and unrelated API key fields cannot enter the encrypted account library',async()=>{
 const store=createModelLibraryStore({db:database(),secret:'fixture'});
 await assert.rejects(store.put('A',{...seed,connections:seed.connections.map(c=>({...c,scope:'browser'}))}),{status:400});
 await assert.rejects(store.put('A',{...seed,connections:[{...seed.connections[0],id:'__proto__'}]}),{status:400});
 const saved=await store.put('A',{...seed,apiKey:'unsafe',models:[{...seed.models[0],token:'unsafe'}]});assert.doesNotMatch(JSON.stringify(saved),/unsafe/);
});
test('library writes require current identity and trusted Origin; lifecycle closure cannot leave a late write',async()=>{
 const db=database();let checks=0;const store=createModelLibraryStore({db,secret:'fixture',assertActive:async()=>{if(++checks===2)throw Object.assign(Error('closed'),{status:403});}});
 await assert.rejects(store.put('A',seed),{status:403});assert.equal(db.rows.size,0);
 const app=express();app.use('/api/model-library',createModelLibraryRouter({auth:{optionalSession:async()=>({user:{id:'A'}})},store:createModelLibraryStore({db:database(),secret:'fixture'}),frontendOrigins:['http://localhost']}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url=`http://127.0.0.1:${server.address().port}/api/model-library`;
 try {assert.equal((await fetch(url,{headers:{'X-Workspace-Account':'B'}})).status,409);assert.equal((await fetch(url,{method:'PUT',headers:{'X-Workspace-Account':'A','Origin':'https://other.test','Content-Type':'application/json'},body:JSON.stringify(seed)})).status,403);const response=await fetch(url,{headers:{'X-Workspace-Account':'A'}});assert.equal(response.headers.get('cache-control'),'no-store');}finally{await new Promise(r=>server.close(r));}
});

test('malformed JSON never reflects a credential fragment in its error', async()=>{
 const app=express();app.use('/api/model-library',createModelLibraryRouter({auth:{optionalSession:async()=>({user:{id:'A'}})},store:{},frontendOrigins:['http://localhost']}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try {const response=await fetch(`http://127.0.0.1:${server.address().port}/api/model-library`,{method:'PUT',headers:{Origin:'http://localhost','X-Workspace-Account':'A','Content-Type':'application/json'},body:'{"credentials":{"connection":"PRIVATE_KEY_FRAGMENT"}' });assert.equal(response.status,400);assert.doesNotMatch(await response.text(),/PRIVATE_KEY_FRAGMENT|credentials|connection/);}finally{await new Promise(r=>server.close(r));}
});

test('Bailian workspace and region persist as nonsecret metadata and changes invalidate stored credentials',async()=>{
 const store=createModelLibraryStore({db:database(),secret:'fixture'});
 const config={workspaceId:'workspace-one',region:'cn-beijing'};
 const input={...seed,connections:[{...seed.connections[0],provider:'bailian',bailian:config}]};
 let saved=await store.put('A',input);assert.deepEqual(saved.connections[0].bailian,config);assert.equal(saved.connections[0].hasCredential,true);
 saved=await store.put('A',{...saved,connections:saved.connections.map(c=>({...c,label:'Renamed'}))});assert.equal(saved.connections[0].hasCredential,true);
 saved=await store.put('A',{...saved,connections:saved.connections.map(c=>({...c,bailian:{...config,workspaceId:'workspace-two'}}))});assert.equal(saved.connections[0].hasCredential,false);await assert.rejects(store.resolve('A','connection'));
 saved=await store.put('A',{...saved,credentials:seed.credentials});assert.equal(saved.connections[0].hasCredential,true);
 saved=await store.put('A',{...saved,connections:saved.connections.map(c=>({...c,bailian:{...c.bailian,region:'us-east-1'}}))});assert.equal(saved.connections[0].hasCredential,false);
 await assert.rejects(store.put('A',{...saved,connections:saved.connections.map(c=>({...c,bailian:{...config,workspaceId:'https://evil.test'}}))}),{status:400});
 assert.doesNotMatch(JSON.stringify(saved),/fixture-secret-never-return/);
});
