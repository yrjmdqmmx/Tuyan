import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {createImageLibraryRouter,createImageLibraryBridge} from '../src/image-library.js';
import {newWorkspace} from '../../../packages/api/src/workspace-defaults.mjs';

test('image HTTP routes require session, origin and account; map only live tasks and never trust supplied ownership',async()=>{
  const calls=[],state=newWorkspace('task-a'),id='a'.repeat(64);
  const backend={call:async(body,_context,options)=>{calls.push({body,options});return {status:200,data:{code:0,usedBytes:12,maxBytes:100000000,images:[{id,format:'png',size:12,sources:[{taskId:'task-a'},{taskId:'deleted-task'}]}],...(body.action==='imageLibraryRead'?{base64:'c3ludGhldGlj'}:{})}};}};
  const auth={optionalSession:async req=>req.get('cookie')==='fixture=A'?{user:{id:'A'}}:null,workspaceStore:{get:async()=>({state})}};
  const app=express();app.use('/api/account/images',createImageLibraryRouter({auth,backend,frontendOrigins:['http://localhost'],enabled:true}));
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/api/account/images`;
  try{
    assert.equal((await fetch(base)).status,401);
    assert.equal((await fetch(base,{headers:{cookie:'fixture=A','x-workspace-account':'B'}})).status,409);
    assert.equal((await fetch(base,{headers:{cookie:'fixture=A','x-workspace-account':'A',origin:'https://evil.invalid'}})).status,403);
    const headers={cookie:'fixture=A','x-workspace-account':'A',origin:'http://localhost'};
    const list=await (await fetch(base,{headers})).json();assert.deepEqual(list.images[0].taskIds,['task-a']);assert.equal(list.images[0].sources,undefined);
    await fetch(base+'/'+id,{headers});await fetch(base+'/'+id,{method:'DELETE',headers});
    assert.deepEqual(calls.map(c=>c.body.action),['imageLibraryList','imageLibraryRead','imageLibraryRemove']);
    assert.ok(calls.every(c=>c.options.authUserId==='A'));
    assert.equal((await fetch(base+'/'+id,{method:'DELETE',headers:{cookie:'fixture=A','x-workspace-account':'A'}})).status,403);
  }finally{await new Promise(r=>server.close(r));}
});
test('bridge retains 410 and real errors instead of claiming an empty library',async()=>{
  const bridge=createImageLibraryBridge({call:async()=>({status:200,data:{code:410,error:'图片已过期'}})});
  await assert.rejects(bridge.read('A','id'),{status:410,message:'图片已过期'});
});
