import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import {createPlusRouter} from '../src/plus-router.js';

test('every Plus route rejects ordinary or forged admin requests before payment or ledger access',async()=>{
 const admins=new Set(['real-admin']),calls=[];
 const app=express();app.use('/api/plus',createPlusRouter({
  config:{enabled:true,adminOnly:true},
  auth:{optionalSession:async req=>req.get('X-Test-Identity')?{user:{id:req.get('X-Test-Identity')}}:null},
  isAllowed:user=>admins.has(user.id),
  service:new Proxy({},{get:(_target,method)=>async()=>{calls.push(method);return {enabled:true};}}),
 }));
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}/api/plus`;
 try{
  for(const [method,path] of [['GET','/catalog'],['GET','/account'],['GET','/ledger'],['GET','/jobs/original'],['POST','/membership/check'],['POST','/quote'],['POST','/jobs'],['POST','/jobs/original/cancel'],['POST','/refund/request']]){
   const r=await fetch(base+path,{method,headers:{'X-Test-Identity':'ordinary','X-Workspace-Account':'real-admin','Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify({isAdmin:true,userId:'real-admin'})}:{})});
   assert.equal(r.status,403,path);assert.equal((await r.json()).code,'PLUS_ADMIN_ONLY');
  }
  assert.equal(calls.length,0);
  assert.equal((await fetch(base+'/catalog')).status,401);
  const headers={'X-Test-Identity':'real-admin','X-Workspace-Account':'real-admin'};
  assert.equal((await fetch(base+'/catalog',{headers})).status,200);
  assert.deepEqual(calls,['rateLimit','catalog']);admins.clear();
  assert.equal((await fetch(base+'/catalog',{headers})).status,403);
  assert.equal(calls.length,2);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('admin-only router fails closed when no admin checker is wired',async()=>{
 const app=express();app.use('/api/plus',createPlusRouter({config:{enabled:true,adminOnly:true},auth:{optionalSession:async()=>({user:{id:'claimed-admin',isAdmin:true}})},service:{}}));
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 try{assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/plus/catalog`,{headers:{'X-Workspace-Account':'claimed-admin'}})).status,403);}finally{await new Promise(resolve=>server.close(resolve));}
});
