import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import sharp from 'sharp';
import { createAccountProfile, createAccountProfileRouter, normalizeAvatar } from '../src/account-profile.js';
import { memoryDb } from '../../../test-support/memory-db.mjs';

function fixture({deliveryEnabled=true,transport}={}) {
  let time=new Date('2026-10-19T00:00:00Z');
  const session={user:{id:'A'},session:{id:'session-A',token:'fixture-token'}};
  const db=memoryDb({user:[{_id:'A',email:'old@example.test',emailVerified:true,name:'A'},{_id:'B',email:'taken@example.test'}],session:[{_id:'session-A',userId:'A',expiresAt:new Date('2027-01-01')},{_id:'session-B',userId:'A',expiresAt:new Date('2027-01-01')},{_id:'other',userId:'B',expiresAt:new Date('2027-01-01')}]});
  const sent=[],limited=[];
  const service=createAccountProfile({db,mongoClient:{startSession:()=>({withTransaction:fn=>fn(),endSession:async()=>{}})},secret:'fixture-secret',now:()=>time,deliveryEnabled,
    limiter:{consume:async v=>limited.push(v)},transport:transport||{send:async mail=>sent.push(mail)}});
  const proofs=()=>({oldCode:sent.at(-2).textBody.match(/验证码：(\d{6})/)[1],newCode:sent.at(-1).textBody.match(/验证码：(\d{6})/)[1]});
  return {db,session,service,sent,limited,proofs,advance:ms=>time=new Date(+time+ms)};
}

test('both mailbox proofs are required; changing identity preserves account id and revokes all its sessions and old proofs',async()=>{
  const f=fixture();await f.db.collection('user').createIndex({email:1},{unique:true});
  for(const name of ['accountVerificationTokens','verification','watchaTransactions'])await f.db.collection(name).insertOne({_id:name,userId:'A',value:'A'});
  const result=await f.service.startEmail(f.session,' NEW@Example.test ','127.0.0.1');
  assert.equal(f.sent.length,2);assert.deepEqual(f.sent.map(m=>m.toAddress),['old@example.test','new@example.test']);
  assert.equal((await f.db.collection('user').findOne({_id:'A'})).email,'old@example.test');
  const proofs=f.proofs();const stored=JSON.stringify(f.db.collection('accountEmailChanges').rows);
  assert.ok(!stored.includes(`"${proofs.oldCode}"`)&&!stored.includes(`"${proofs.newCode}"`));
  assert.equal(stored.includes('fixture-token'),false);
  await assert.rejects(f.service.confirmEmail(f.session,{...result,...proofs,newCode:proofs.newCode==='000000'?'111111':'000000'}),{status:400});
  assert.deepEqual(await f.service.confirmEmail(f.session,{...result,...proofs}),{ok:true,signInRequired:true});
  assert.equal((await f.db.collection('user').findOne({_id:'A'})).email,'new@example.test');
  assert.equal((await f.db.collection('user').findOne({_id:'A'})).emailVerified,true);
  assert.deepEqual(f.db.collection('session').rows.map(s=>s.userId),['B']);
  for(const name of ['accountEmailChanges','accountVerificationTokens','verification','watchaTransactions'])assert.equal(f.db.collection(name).rows.length,0);
  await assert.rejects(f.service.confirmEmail(f.session,{...result,...proofs}),{status:400});
  assert.deepEqual(f.limited.map(x=>x.kind),['profile-user','email','email','ip']);
});

test('proofs cannot cross users or sessions, be replayed after resend, survive expiry or deletion',async()=>{
  for(const mode of ['other-user','other-session','expired','deleted','resend','email-changed']){
    const f=fixture();const started=await f.service.startEmail(f.session,'new@example.test','ip');const proof={...started,...f.proofs()};let session=f.session;
    if(mode==='other-user')session={...session,user:{id:'B'}};
    if(mode==='other-session')session={...session,session:{id:'session-B',token:'another'}};
    if(mode==='expired')f.advance(600001);
    if(mode==='deleted')await f.db.collection('accountDeletionOperations').insertOne({_id:'A'});
    if(mode==='resend')await f.service.startEmail(f.session,'new@example.test','ip');
    if(mode==='email-changed')await f.db.collection('user').updateOne({_id:'A'},{$set:{email:'changed@example.test'}});
    await assert.rejects(f.service.confirmEmail(session,proof),undefined,mode);
    assert.notEqual((await f.db.collection('user').findOne({_id:'A'})).email,'new@example.test');
  }
});

test('five wrong attempts lock the challenge even when a later proof is correct',async()=>{
  const f=fixture();const started=await f.service.startEmail(f.session,'new@example.test','ip'),proofs=f.proofs();
  for(let i=0;i<5;i++)await assert.rejects(f.service.confirmEmail(f.session,{...started,...proofs,oldCode:proofs.oldCode==='000000'?'111111':'000000'}),{status:400});
  await assert.rejects(f.service.confirmEmail(f.session,{...started,...proofs}),{status:400});
  assert.equal((await f.db.collection('user').findOne({_id:'A'})).email,'old@example.test');
});

test('disabled or failed mail delivery and occupied addresses cannot change a login email',async()=>{
  const off=fixture({deliveryEnabled:false});await assert.rejects(off.service.startEmail(off.session,'new@example.test','ip'),{status:503});assert.equal(off.sent.length,0);
  let sends=0;const failed=fixture({transport:{send:async()=>{if(++sends===2)throw Error('provider credentials must not leak');}}});
  await assert.rejects(failed.service.startEmail(failed.session,'new@example.test','ip'),{status:503});assert.equal(failed.db.collection('accountEmailChanges').rows.length,0);
  const f=fixture(),started=await f.service.startEmail(f.session,'taken@example.test','ip');
  await assert.rejects(f.service.confirmEmail(f.session,{...started,...f.proofs()}),{status:409});assert.equal((await f.db.collection('user').findOne({_id:'A'})).email,'old@example.test');
});

test('avatars are bounded, decoded, re-encoded raster; unsafe uploads and closed identities are rejected',async()=>{
  const original=await sharp({create:{width:400,height:200,channels:3,background:'#226644'}}).jpeg().toBuffer();
  const image=await normalizeAvatar(original.toString('base64'));
  assert.match(image,/^data:image\/webp;base64,/);
  const metadata=await sharp(Buffer.from(image.split(',')[1],'base64')).metadata();assert.equal(metadata.width,256);assert.equal(metadata.height,256);assert.equal(metadata.exif,undefined);
  for(const bytes of [Buffer.from('<svg onload="alert(1)"/>'),Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(2_100_000)])await assert.rejects(normalizeAvatar(bytes.toString('base64')));
  const f=fixture();await f.service.avatar(f.session,original.toString('base64'));assert.match((await f.db.collection('user').findOne({_id:'A'})).image,/webp/);
  await f.service.avatar(f.session,null);assert.equal((await f.db.collection('user').findOne({_id:'A'})).image,null);
  await f.db.collection('accountDeletionOperations').insertOne({_id:'A'});await assert.rejects(f.service.avatar(f.session,null),{status:403});
});

test('HTTP profile requires current account, trusted write origin and JSON; activity never accepts a body identity',async()=>{
  const f=fixture(),origin='http://127.0.0.1:5194',app=express();let forwarded;
  app.use('/api/account/profile',createAccountProfileRouter({auth:{optionalSession:async req=>req.headers.cookie==='fixture=A'?f.session:null,accountProfile:f.service},backend:{call:async(...args)=>{forwarded=args;return {status:200,data:{code:0,activity:{contractVersion:1,total:0}}};}},frontendOrigins:[origin]}));
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/api/account/profile`;
  const request=(path,options={})=>fetch(base+path,{...options,headers:{origin,cookie:'fixture=A','x-workspace-account':'A','content-type':'application/json',...options.headers}});
  try{
    assert.equal((await request('/activity',{headers:{cookie:''}})).status,401);
    assert.equal((await request('/activity',{headers:{'x-workspace-account':'B'}})).status,409);
    assert.equal((await request('/avatar',{method:'POST',headers:{origin:'https://evil.test'},body:'{"base64":null}'})).status,403);
    assert.equal((await request('/avatar',{method:'POST',headers:{'content-type':'text/plain'},body:'{}'})).status,415);
    const response=await request('/activity?userId=B');assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
    assert.deepEqual(forwarded,[{action:'userDrawingActivity',userId:'A'},{},{authUserId:'A'}]);
  }finally{await new Promise(r=>server.close(r));}
});
