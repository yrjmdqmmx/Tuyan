import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createWorkspaceRouter } from '../src/workspace-sync.js';
import { createWorkspaceHistory } from '../src/workspace-history.js';
test('history route authenticates, binds pagination to session identity and rejects foreign jobs even for administrators',async()=>{
 const calls=[];const backend={call:async(body,context,identity)=>{calls.push({body,identity});return {status:200,data:body.action==='getJob'?{job:{id:body.jobId,userId:'other'}}:{jobs:[{id:'j',userId:'a',methodContent:'method',resultImages:[]}],nextOffset:25}};}};
 let resultReads=0;const auth={optionalSession:async req=>req.headers.cookie==='fixture=a'?{user:{id:'a'}}:null,readWorkspaceHistoryResult:async(req,id,index)=>{resultReads++;assert.equal(req.workspaceUserId,'a');return {format:'png',base64:'iVBORw0KGgo='};}};const app=express();app.use('/api/workspace',createWorkspaceRouter({auth,store:{identifyHistory:async(_id,jobs)=>jobs,importHistory:async(id,jobs)=>{assert.equal(id,'a');assert.equal(jobs[0].id,'j');}},frontendOrigins:['http://localhost'],history:createWorkspaceHistory({auth,backend})}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port+'/api/workspace/history';const headers={Origin:'http://localhost',Cookie:'fixture=a','X-Workspace-Account':'a'};
 try {
  assert.equal((await fetch(base)).status,401);assert.equal((await fetch(base+'/j/results/0')).status,401);assert.equal(resultReads,0);assert.equal((await fetch(base,{headers:{...headers,'X-Workspace-Account':'b'}})).status,409);
  const response=await fetch(base+'?offset=25',{headers});assert.equal(response.status,200);assert.equal((await response.json()).nextOffset,25);
  assert.deepEqual(calls[0],{body:{action:'userJobs',userId:'a',limit:25,offset:25},identity:{authUserId:'a'}});
  assert.equal((await fetch(base+'/j/results/0',{headers})).status,200);assert.equal(resultReads,1);
  assert.equal((await fetch(base+'/someone-else',{headers})).status,403);assert.equal((await fetch(base+'?offset=-1',{headers})).status,400);
 }finally{await new Promise(r=>server.close(r));}
});
