import test from 'node:test';
import assert from 'node:assert/strict';
import {MongoClient,ObjectId} from 'mongodb';
import express from 'express';
import sharp from 'sharp';
import {ensureAccountIndexes} from '../../src/account-indexes.js';
import {createAccountProfile,createAccountProfileRouter} from '../../src/account-profile.js';
import {readDrawingActivity} from '../../../paperbanana-api/src/drawing-activity.ts';
const uri=process.env.WORKSPACE_COMPAT_TEST_URI;

test('real Mongo: profile transactions, concurrent email ownership and activity isolation',{skip:!uri},async t=>{
  assert.match(uri,/^mongodb:\/\/127\.0\.0\.1:\d+\//);
  const mongo=new MongoClient(uri);await mongo.connect();const db=mongo.db('profile_integration_'+new ObjectId().toHexString());
  const now=new Date(),mail=[];await ensureAccountIndexes(db);
  const service=createAccountProfile({db,mongoClient:mongo,secret:'isolated-profile-integration',deliveryEnabled:true,limiter:{consume:async()=>{}},transport:{send:async m=>mail.push(m)}});
  async function seed(id){const session={user:{id},session:{id:'session-'+id,token:'private-'+id}};await db.collection('user').insertOne({_id:id,email:id+'@example.test',emailVerified:true});await db.collection('session').insertMany([{_id:session.session.id,userId:id,expiresAt:new Date(+now+3600000)},{_id:'second-'+id,userId:id,expiresAt:new Date(+now+3600000)}]);await db.collection('workspaceDocuments').insertOne({_id:id,userId:id,revision:7,state:{draft:'keep '+id}});return session;}
  async function challenge(session,email){const r=await service.startEmail(session,email,'127.0.0.1');const sent=mail.slice(-2);return {...r,oldCode:sent[0].textBody.match(/验证码：(\d{6})/)[1],newCode:sent[1].textBody.match(/验证码：(\d{6})/)[1]};}
  try{
    await t.test('HTTP avatar stores sanitized raster, shared identity stays stable and wrong account is rejected',async()=>{
      const session=await seed('avatar');const app=express();app.use('/api/account/profile',createAccountProfileRouter({auth:{accountProfile:service,optionalSession:async req=>req.get('cookie')==='fixture=avatar'?session:null},frontendOrigins:['https://tuyansci.cn','https://www.paperbanana.asia'],backend:{call:async()=>({status:200,data:{activity:{contractVersion:1}}})}}));
      const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
      try{const bytes=await sharp({create:{width:512,height:300,channels:3,background:'#336699'}}).png().toBuffer();const url=`http://127.0.0.1:${server.address().port}/api/account/profile/avatar`;const headers={origin:'https://www.paperbanana.asia',cookie:'fixture=avatar','x-workspace-account':'avatar','content-type':'application/json'};
        assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify({base64:bytes.toString('base64')})})).status,200);
        const stored=await db.collection('user').findOne({_id:'avatar'}),meta=await sharp(Buffer.from(stored.image.split(',')[1],'base64')).metadata();assert.equal(meta.width,256);assert.equal(meta.height,256);assert.equal(meta.format,'webp');assert.equal(meta.exif,undefined);
        assert.equal((await fetch(url,{method:'POST',headers:{...headers,'x-workspace-account':'other'},body:'{"base64":null}'})).status,409);
        await service.avatar(session,null);assert.equal((await db.collection('user').findOne({_id:'avatar'})).image,null);assert.equal((await db.collection('workspaceDocuments').findOne({_id:'avatar'})).revision,7);
      }finally{await new Promise(r=>server.close(r));}
    });
    await t.test('two verified accounts racing for one email commit exactly one owner and preserve both workspaces',async()=>{
      const a=await seed('race-a'),b=await seed('race-b');const pa=await challenge(a,'shared@example.test'),pb=await challenge(b,'shared@example.test');
      for(const id of ['race-a','race-b']){await db.collection('accountVerificationTokens').insertOne({userId:id});await db.collection('verification').insertOne({value:id});}
      const outcomes=await Promise.allSettled([service.confirmEmail(a,pa),service.confirmEmail(b,pb)]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.find(x=>x.status==='rejected').reason.status,409);
      const winner=await db.collection('user').findOne({email:'shared@example.test'}),loser=winner._id==='race-a'?'race-b':'race-a';assert.equal(await db.collection('user').countDocuments({email:'shared@example.test'}),1);assert.equal(await db.collection('session').countDocuments({userId:winner._id}),0);assert.equal(await db.collection('session').countDocuments({userId:loser}),2);assert.equal(await db.collection('accountVerificationTokens').countDocuments({userId:winner._id}),0);assert.equal(await db.collection('verification').countDocuments({value:winner._id}),0);
      for(const id of ['race-a','race-b'])assert.deepEqual((await db.collection('workspaceDocuments').findOne({_id:id})).state,{draft:'keep '+id});
    });
    await t.test('concurrent verification attempts are durable, bounded and cannot become a valid sixth attempt',async()=>{
      const s=await seed('attempt'),p=await challenge(s,'attempt-new@example.test');const bad={...p,oldCode:p.oldCode==='000000'?'111111':'000000'};const outcomes=await Promise.allSettled(Array.from({length:8},()=>service.confirmEmail(s,bad)));assert.ok(outcomes.every(x=>x.status==='rejected'));assert.equal((await db.collection('accountEmailChanges').findOne({_id:'attempt'})).attempts,5);await assert.rejects(service.confirmEmail(s,p),{status:400});assert.equal((await db.collection('user').findOne({_id:'attempt'})).email,'attempt@example.test');
    });
    await t.test('resend and session binding reject stale proofs; successful proof is single use',async()=>{
      const s=await seed('resend'),old=await challenge(s,'resend-new@example.test'),fresh=await challenge(s,'resend-new@example.test');await assert.rejects(service.confirmEmail(s,old),{status:400});await assert.rejects(service.confirmEmail({...s,session:{id:'second-resend',token:'other'}},fresh),{status:400});const row=await db.collection('accountEmailChanges').findOne({_id:'resend'});assert.equal(row.attempts,0);assert.ok(!JSON.stringify(row).includes('private-resend'));assert.notEqual(row.oldHash,fresh.oldCode);await service.confirmEmail(s,fresh);await assert.rejects(service.confirmEmail(s,fresh),{status:400});
    });
    await t.test('failed delivery and lifecycle closure keep identity and workspace unchanged',async()=>{
      const s=await seed('closed');let sent=0;const failing=createAccountProfile({db,mongoClient:mongo,secret:'integration',deliveryEnabled:true,limiter:{consume:async()=>{}},transport:{send:async()=>{if(++sent===2)throw Error('delivery failed');}}});await assert.rejects(failing.startEmail(s,'closed-new@example.test','127.0.0.1'),{status:503});assert.equal(await db.collection('accountEmailChanges').countDocuments({_id:'closed'}),0);const p=await challenge(s,'closed-new@example.test');await db.collection('accountDeletionOperations').insertOne({_id:'closed'});await assert.rejects(service.confirmEmail(s,p),{status:403});await assert.rejects(service.avatar(s,null),{status:403});assert.equal((await db.collection('user').findOne({_id:'closed'})).email,'closed@example.test');assert.equal((await db.collection('workspaceDocuments').findOne({_id:'closed'})).state.draft,'keep closed');
    });
    await t.test('real activity cursor filters ownership and counts final candidate images only',async()=>{
      const image={candidateId:0,mimeType:'image/png',filename:'output.png'};await db.collection('jobs').insertMany([{_id:'own',userId:'activity',status:'succeeded',completedAt:now,resultImages:[image,image],prompt:'private excluded'},{_id:'legacy',user_id:'activity',status:'succeeded',completedAt:now,resultImages:[image]},{_id:'other',userId:'other',user_id:'activity',status:'succeeded',completedAt:now,resultImages:[image]},{_id:'failed',userId:'activity',status:'failed',completedAt:now,resultImages:[image]}]);const result=await readDrawingActivity(db.collection('jobs'),'activity',now);assert.equal(result.total,2);assert.equal(JSON.stringify(result).includes('private excluded'),false);
    });
  }finally{await db.dropDatabase();await mongo.close();}
});
