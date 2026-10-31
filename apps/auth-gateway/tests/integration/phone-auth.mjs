import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { createWatchaFixture } from './watcha-fixture.mjs';
import { renderPhoneCaptcha } from '../../src/phone-auth.js';
let clock = new Date(), answer = '', rejectSend = false;
const sms = [];
const fixture = await createWatchaFixture({ uri:process.env.PHONE_TEST_MONGO_URI, now:()=>clock,
  sms:{enabled:true,deliveryEnabled:false,dailyMax:1000,monthlyMax:30000},
  smsTransport:{async send(message){sms.push(message);if(rejectSend)throw Error('simulated unknown result');return {accepted:true};}},
  phoneCaptchaRenderer:async value=>{answer=value;return renderPhoneCaptcha(value);},
});
const {origin,db,runtime}=fixture;
function browser(){const cookies=new Map();return {cookies,userId:'',async json(path,body,extra={}){
  const response=await fetch(`${origin}${path.startsWith('/api/')?path:`/api/auth/${path}`}`,{method:body===undefined?'GET':'POST',headers:{origin,'content-type':'application/json',cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),...(this.userId?{'x-workspace-account':this.userId}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
  for(const cookie of response.headers.getSetCookie()){const [k,...v]=cookie.split(';')[0].split('=');if(v.join('='))cookies.set(k,v.join('='));else cookies.delete(k);}
  return {status:response.status,data:await response.json().catch(()=>({code:"NON_JSON_RESPONSE"})),headers:response.headers};
}};}
async function challenge(b,phone,purpose='login'){const c=await b.json('phone/challenge',{phone,purpose});assert.equal(c.status,200,JSON.stringify(c.data));assert.match(c.data.image,/^data:image\/png;base64,/);return {...c.data,captcha:answer};}
async function issue(b,phone,purpose='login'){const c=await challenge(b,phone,purpose);const r=await b.json('phone/send-code',{phone,purpose,challengeId:c.challengeId,captcha:c.captcha});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.retryAfter,60);return {phone,purpose,requestId:r.data.requestId,code:sms.at(-1).code};}
async function clearLimits(){await db.collection('phoneRateLimits').deleteMany({});}
async function existing(b,email){assert.equal((await b.json('sign-up/email',{email,password:'fixture-password-long',name:'Existing'})).status,200);await db.collection('user').updateOne({email},{$set:{emailVerified:true}});const r=await b.json('sign-in/email',{email,password:'fixture-password-long'});assert.equal(r.status,200);b.userId=r.data.user.id;return b.userId;}
try {
 const b=browser();assert.equal((await b.json('phone/status')).data.available,true);
 assert.equal((await b.json('phone/challenge',{phone:'+12025550123',purpose:'login'})).data.code,'PHONE_INVALID_NUMBER');
 assert.equal((await b.json('phone/challenge',{phone:'13800000001',purpose:'login'},{origin:'https://evil.test'})).status,403);
 assert.equal((await b.json('phone/challenge',{phone:'13800000001',purpose:'link'})).status,401);
 const c=await challenge(b,'13800000001');
 assert.equal((await b.json('phone/send-code',{phone:'13800000001',purpose:'login',challengeId:c.challengeId,captcha:'WRONG'})).data.code,'PHONE_CAPTCHA_INVALID');
 assert.equal((await b.json('phone/send-code',{phone:'13800000001',purpose:'login',challengeId:c.challengeId,captcha:c.captcha})).data.code,'PHONE_CAPTCHA_INVALID');
 assert.equal(sms.length,0);
 console.log('PASS +86 validation, origin, authenticated binding and single-use CAPTCHA');
 let proof=await issue(b,'13800000001');
 const c2=await challenge(b,'13800000001');assert.equal((await b.json('phone/send-code',{phone:'13800000001',purpose:'login',challengeId:c2.challengeId,captcha:c2.captcha})).status,429);
 assert.equal(sms.length,1);
 const stored=await db.collection('phoneCodes').findOne({});assert.equal(JSON.stringify(stored).includes(proof.code),false);assert.equal(JSON.stringify(stored).includes(proof.phone),false);
 assert.equal((await browser().json('phone/verify',proof)).data.code,'PHONE_CHALLENGE_EXPIRED');
 const invalid=proof.code==='111111'?'222222':'111111';
 for(let i=0;i<5;i++)assert.equal((await b.json('phone/verify',{...proof,code:invalid})).data.code,'PHONE_INVALID_CODE');
 assert.equal((await b.json('phone/verify',proof)).data.code,'PHONE_INVALID_CODE');
 clock=new Date(+clock+59999);
 const boundary=await challenge(b,'13800000001');
 const early=await b.json('phone/send-code',{phone:'13800000001',purpose:'login',challengeId:boundary.challengeId,captcha:boundary.captcha});
 assert.equal(early.status,429);assert.equal(early.data.retryAfter,1);assert.equal(early.headers.get('retry-after'),'1');assert.equal(sms.length,1);
 clock=new Date(+clock+1);proof=await issue(b,'13800000001');
 const race=await Promise.all([b.json('phone/verify',proof),b.json('phone/verify',proof)]);
 assert.equal(race.filter(r=>r.status===200).length,1,JSON.stringify(race.map(r=>r.data)));
 const session=(await b.json('get-session')).data;assert.ok(session.user.id);assert.equal(session.user.phoneOnly,true);
 assert.equal(await db.collection('user').countDocuments({}),1);assert.equal(await db.collection('account').countDocuments({providerId:'phone'}),1);
 const phoneUserId=session.user.id;
 assert.equal((await b.json('phone/challenge',{phone:'13800000001',purpose:'login'})).data.code,'PHONE_SIGN_OUT_REQUIRED');
 console.log('PASS cooldown, hashed storage, browser binding, five attempts, atomic concurrent redemption, automatic account/session');
 await clearLimits();clock=new Date(+clock+61000);
 const returning=browser();proof=await issue(returning,'13800000001');assert.equal((await returning.json('phone/verify',proof)).status,200);assert.equal((await returning.json('get-session')).data.user.id,phoneUserId);
 assert.equal(await db.collection('user').countDocuments({}),1);
 const old=browser(),original=await existing(old,'existing@example.test');
 for(const name of ['workspaceDocuments','workspaceModelLibraries','workspaceResults'])await db.collection(name).insertOne({_id:`preserved-${name}`,userId:original,payload:{drafts:['draft-old'],tasks:['task-old'],config:{model:'unchanged'}}});
 const before=await Promise.all(['workspaceDocuments','workspaceModelLibraries','workspaceResults'].map(name=>db.collection(name).findOne({_id:`preserved-${name}`})));
 proof=await issue(old,'13800000002','link');assert.equal((await old.json('phone/verify',proof)).status,200);
 assert.equal((await old.json('get-session')).data.user.id,original);assert.deepEqual((await old.json('phone/status')).data,{available:true,linked:true,maskedPhone:'+86138****0002'});
 clock=new Date(+clock+61000);const viaPhone=browser();proof=await issue(viaPhone,'13800000002');assert.equal((await viaPhone.json('phone/verify',proof)).status,200);assert.equal((await viaPhone.json('get-session')).data.user.id,original);
 assert.deepEqual(await Promise.all(['workspaceDocuments','workspaceModelLibraries','workspaceResults'].map(name=>db.collection(name).findOne({_id:`preserved-${name}`}))),before);
 console.log('PASS phone login returns original immutable ID; tasks, drafts, model settings and results unchanged');
 const conflict=browser();const other=await existing(conflict,'other@example.test');clock=new Date(+clock+61000);proof=await issue(conflict,'13800000002','link');assert.equal((await conflict.json('phone/verify',proof)).data.code,'PHONE_BINDING_CONFLICT');assert.equal((await conflict.json('get-session')).data.user.id,other);
 assert.equal(await db.collection('account').countDocuments({providerId:'phone',userId:new ObjectId(other)}),0);
 await clearLimits();const expiryBrowser=browser();proof=await issue(expiryBrowser,'13800000003');clock=new Date(+clock+300001);assert.equal((await expiryBrowser.json('phone/verify',proof)).data.code,'PHONE_INVALID_CODE');
 const expiredCaptcha=await challenge(expiryBrowser,'13800000004');clock=new Date(+clock+120001);assert.equal((await expiryBrowser.json('phone/send-code',{phone:'13800000004',purpose:'login',challengeId:expiredCaptcha.challengeId,captcha:expiredCaptcha.captcha})).data.code,'PHONE_CAPTCHA_INVALID');
 console.log('PASS cross-account conflict cannot merge/overwrite; OTP and CAPTCHA expire server-side');
 await clearLimits();rejectSend=true;const failed=await challenge(expiryBrowser,'13800000005');const count=sms.length;
 const failedSend=await expiryBrowser.json('phone/send-code',{phone:'13800000005',purpose:'login',challengeId:failed.challengeId,captcha:failed.captcha});assert.equal(failedSend.data.code,'PHONE_SEND_UNCONFIRMED');assert.equal(sms.length,count+1);assert.equal(await db.collection('phoneCodes').countDocuments({requestId:sms.at(-1).requestId}),0);rejectSend=false;
 console.log('PASS ambiguous provider outcome makes one call and invalidates code, without automatic billing retry');
 await clearLimits();b.userId=phoneUserId;proof=await issue(b,'13800000001','delete');const deletion=await b.json('phone/verify',proof);assert.equal(deletion.status,200,JSON.stringify(deletion.data));
 assert.equal(await runtime.consumeDeletionConfirmation({confirmationToken:deletion.data.confirmationToken,session:(await returning.json('get-session')).data}),false);
 assert.equal(await runtime.consumeDeletionConfirmation({confirmationToken:deletion.data.confirmationToken,session}),true);
 assert.equal(await runtime.consumeDeletionConfirmation({confirmationToken:deletion.data.confirmationToken,session}),false);
 console.log('PASS phone-only account deletion proof is session-bound and single-use');
 await clearLimits();const limiter=browser();const sameIp=await challenge(limiter,'13800000006');await limiter.json('phone/send-code',{phone:'13800000006',purpose:'login',challengeId:sameIp.challengeId,captcha:sameIp.captcha});
 for(let i=0;i<20;i++)await limiter.json('phone/send-code',{phone:'13800000006',purpose:'login',challengeId:'0'.repeat(48),captcha:'WRONG'},{'x-tuyan-client-ip':`10.0.0.${i+1}`});
 assert.equal((await limiter.json('phone/send-code',{phone:'13800000006',purpose:'login'})).status,429);
 console.log('PASS untrusted client IP headers cannot bypass limits');
 await clearLimits();fixture.config.sms.dailyMax=1;
 const budget=browser();await issue(budget,'13800000007');const maxBefore=sms.length;
 const dailyChallenge=await challenge(budget,'13800000008');
 assert.equal((await budget.json('phone/send-code',{phone:'13800000008',purpose:'login',challengeId:dailyChallenge.challengeId,captcha:dailyChallenge.captcha})).status,429);assert.equal(sms.length,maxBefore);
 fixture.config.sms.dailyMax=1000;fixture.config.sms.monthlyMax=1;await clearLimits();
 await issue(budget,'13800000009');const monthBefore=sms.length;const monthlyChallenge=await challenge(budget,'13800000010');
 const monthlyDenied=await budget.json('phone/send-code',{phone:'13800000010',purpose:'login',challengeId:monthlyChallenge.challengeId,captcha:monthlyChallenge.captcha});assert.equal(monthlyDenied.status,429);assert.ok(Number.isFinite(monthlyDenied.data.retryAfter) && monthlyDenied.data.retryAfter > 0);assert.equal(sms.length,monthBefore);
 fixture.config.sms.monthlyMax=30000;await clearLimits();
 // Keep all six attempts in one fixed hourly window, regardless of the wall-clock start time.
 clock=new Date(Math.ceil(+clock/3600000)*3600000+60000);
 const frequency=browser();let previous;
 for(let i=0;i<5;i++){clock=new Date(+clock+61000);const next=await issue(frequency,'13800000011');if(previous)assert.equal((await frequency.json('phone/verify',previous)).data.code,'PHONE_INVALID_CODE');previous=next;}
 clock=new Date(+clock+61000);const tooMany=await challenge(frequency,'13800000011');const lastCount=sms.length;
 assert.equal((await frequency.json('phone/send-code',{phone:'13800000011',purpose:'login',challengeId:tooMany.challengeId,captcha:tooMany.captcha})).status,429);assert.equal(sms.length,lastCount);
 console.log('PASS phone hourly limits, resend invalidation and global daily/monthly spend reservations');
 await clearLimits();const closing=browser();const closingId=await existing(closing,'closing@example.test');
 const closingProof=await issue(closing,'13800000012','link');await db.collection('accountDeletionOperations').insertOne({_id:closingId,state:'deleting'});
 assert.equal((await closing.json('phone/verify',closingProof)).data.code,'PHONE_ACCOUNT_UNAVAILABLE');assert.equal(await db.collection('account').countDocuments({providerId:'phone',userId:new ObjectId(closingId)}),0);
 console.log('PASS account deletion fencing prevents a pending phone binding');
 await clearLimits();clock=new Date(+clock+61000);const restored=browser();const stale=await issue(restored,'13800000001');
 await db.collection('accountDeletionOperationHistory').insertOne({_id:'fixture-restored-generation',userId:phoneUserId,closedAt:clock});
 assert.equal((await restored.json('phone/verify',stale)).data.code,'PHONE_ACCOUNT_CHANGED');assert.equal((await restored.json('get-session')).data,null);
 const reserved=await browser().json('sign-up/email',{email:'reserved@phone.tuyan.invalid',password:'fixture-password-long',name:'Invalid'});assert.equal(reserved.status,400);assert.equal(await db.collection('user').countDocuments({email:'reserved@phone.tuyan.invalid'}),0);
 const mailCount=fixture.mail.length;await browser().json('request-password-reset',{email:session.user.email,redirectTo:`${origin}/account/reset-password.html`});assert.equal(fixture.mail.length,mailCount);
 console.log('PASS restored-account generation rejects old OTP; internal phone emails cannot register or receive reset mail');


} finally {await fixture.close();}
