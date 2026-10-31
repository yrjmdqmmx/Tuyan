import assert from 'node:assert/strict';
import {ObjectId} from 'mongodb';
import {createWatchaFixture} from './watcha-fixture.mjs';
let clock=new Date();const providerCalls=[];
const fixture=await createWatchaFixture({uri:process.env.WECHAT_TEST_MONGO_URI,now:()=>clock,wechat:{enabled:true,appId:'wx0123456789abcdef',appSecret:'fixture-secret'},
 wechatFetch:async(value,options)=>{const url=new URL(value);providerCalls.push(url.pathname);assert.equal(url.origin,'https://api.weixin.qq.com');assert.equal(options.redirect,'error');
  if(url.pathname==='/sns/oauth2/access_token'){if(url.searchParams.get('code')==='reject')return Response.json({errcode:40029,errmsg:'secret failure'});return Response.json({access_token:url.searchParams.get('code'),openid:url.searchParams.get('code'),scope:'snsapi_login'});}
  if(url.pathname==='/sns/userinfo')return Response.json({openid:url.searchParams.get('openid'),nickname:'微信测试用户',unionid:'same-union-not-a-merge-key'});
  throw Error('External network forbidden');
 }});
const {origin,db,runtime}=fixture;
function browser(){const cookies=new Map();return {cookies,userId:'',async request(path,body,headers={}){
 const response=await fetch(path.startsWith('http')?path:`${origin}${path}`,{method:body===undefined?'GET':'POST',redirect:'manual',headers:{origin,'content-type':'application/json',cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),...(this.userId?{'x-workspace-account':this.userId}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
 for(const cookie of response.headers.getSetCookie()){const[k,...v]=cookie.split(';')[0].split('=');if(v.join('='))cookies.set(k,v.join('='));else cookies.delete(k);}
 return {status:response.status,headers:response.headers,data:await response.json().catch(()=>null)};
},async json(action,body,headers){return this.request(`/api/auth/${action}`,body,headers);}};}
async function start(b,intent='login'){const r=await b.json('wechat/start',{intent,returnOrigin:origin});assert.equal(r.status,200,JSON.stringify(r.data));return r.data.url;}
async function launch(b,url){const r=await b.request(url);assert.equal(r.status,302,JSON.stringify(r.data));return new URL(r.headers.get('location')).searchParams.get('state');}
async function callback(b,state,identity){return b.request(`/api/auth/oauth2/callback/wechat?${new URLSearchParams({state,code:identity})}`);}
async function scan(b,identity,intent='login',popup=b){const url=await start(b,intent);const state=await launch(popup,url);const r=await callback(popup,state,identity);assert.equal(r.status,302,JSON.stringify(r.data));assert.match(r.headers.get('location'),/wechat=pending$/);return {state,url};}
async function existing(b,email){assert.equal((await b.json('sign-up/email',{email,password:'fixture-password-long',name:'Original'})).status,200);await db.collection('user').updateOne({email},{$set:{emailVerified:true}});const r=await b.json('sign-in/email',{email,password:'fixture-password-long'});assert.equal(r.status,200);b.userId=r.data.user.id;return b.userId;}
try{
 const b=browser(),popup=browser(),other=browser();
 assert.equal((await b.json('wechat/status')).data.available,true);
 assert.equal((await b.json('wechat/start',{intent:'login',returnOrigin:'https://evil.test'})).status,400);
 assert.equal((await b.json('wechat/start',{intent:'link',returnOrigin:origin})).status,401);
 const url=await start(b),state=await launch(popup,url);
 assert.equal((await popup.request(url)).status,400);
 const count=providerCalls.length;assert.equal((await callback(other,state,'wx-one')).status,400);assert.equal(providerCalls.length,count);
 const r=await callback(popup,state,'wx-one');assert.match(r.headers.get('location'),/wechat=pending$/);
 assert.equal((await callback(popup,state,'wx-one')).status,400);
 assert.equal((await popup.json('wechat/complete',{createAccount:true})).status,400);
 assert.equal((await b.json('wechat/complete',{})).data.code,'WECHAT_REGISTRATION_REQUIRED');
 assert.equal((await b.json('wechat/status')).data.pending.newAccount,true);
 const race=await Promise.all([b.json('wechat/complete',{createAccount:true}),b.json('wechat/complete',{createAccount:true})]);assert.equal(race.filter(x=>x.status===200).length,1,JSON.stringify(race));
 const logged=(await b.json('get-session')).data;assert.ok(logged.user.id);assert.equal(logged.user.wechatOnly,true);assert.equal(logged.user.emailVerified,false);
 assert.equal(await db.collection('user').countDocuments({}),1);assert.equal(await db.collection('account').countDocuments({providerId:'wechat'}),1);
 console.log('PASS one-use launch/state, wrong-browser rejection, separate popup/original cookie redemption, explicit registration and concurrent completion');
 const returning=browser();await scan(returning,'wx-one');assert.equal((await returning.json('wechat/complete',{})).status,200);assert.equal((await returning.json('get-session')).data.user.id,logged.user.id);
 const old=browser(),id=await existing(old,'old@example.test');
 const collections=['workspaceDocuments','workspaceModelLibraries','workspaceResults'];
 for(const name of collections)await db.collection(name).insertOne({_id:'preserved',userId:id,tasks:['task'],drafts:['draft'],configuration:{custom:'kept'}});
 const before=await Promise.all(collections.map(name=>db.collection(name).findOne({_id:'preserved'})));
 await scan(old,'wx-two','link');assert.equal((await old.json('wechat/complete',{})).status,200);
 assert.deepEqual(await Promise.all(collections.map(name=>db.collection(name).findOne({_id:'preserved'}))),before);
 const originalLogin=browser();await scan(originalLogin,'wx-two');assert.equal((await originalLogin.json('wechat/complete',{})).status,200);assert.equal((await originalLogin.json('get-session')).data.user.id,id);
 assert.equal(await db.collection('user').countDocuments({}),2);
 console.log('PASS existing-account binding retains user ID, tasks, drafts and settings; UnionID does not merge accounts');
 const conflict=browser(),conflictId=await existing(conflict,'conflict@example.test');await scan(conflict,'wx-two','link');assert.equal((await conflict.json('wechat/complete',{})).data.code,'WECHAT_BINDING_CONFLICT');assert.equal(await db.collection('account').countDocuments({providerId:'wechat',userId:new ObjectId(conflictId)}),0);
 await conflict.json('wechat/cancel',{});
 const stale=await start(conflict,'link');const staleState=await launch(conflict,stale);await conflict.json('sign-out',{});await callback(conflict,staleState,'wx-three');assert.equal((await conflict.json('wechat/complete',{})).data.code,'WECHAT_ACCOUNT_CHANGED');
 console.log('PASS binding conflict and changed/revoked session fail closed');
 const exp=browser();const expiredUrl=await start(exp);clock=new Date(+clock+61000);assert.equal((await exp.request(expiredUrl)).status,400);
 const expiry=browser();const fresh=await start(expiry),freshState=await launch(expiry,fresh);clock=new Date(+clock+600001);assert.equal((await callback(expiry,freshState,'wx-four')).status,400);
 const failed=browser();const failedState=await launch(failed,await start(failed));const bad=await callback(failed,failedState,'reject');assert.match(bad.headers.get('location'),/wechat=error$/);assert.equal((await failed.json('wechat/status')).data.pending,null);
 console.log('PASS launch/authorization expiry and provider rejection create no accounts');
 b.userId=logged.user.id;await scan(b,'wx-one','delete');const proof=(await b.json('wechat/complete',{})).data;assert.ok(proof.confirmationToken);
 const session=(await b.json('get-session')).data;
 assert.equal(await runtime.consumeDeletionConfirmation({confirmationToken:proof.confirmationToken,session}),true);assert.equal(await runtime.consumeDeletionConfirmation({confirmationToken:proof.confirmationToken,session}),false);
 await db.collection('accountDeletionOperations').insertOne({_id:id,state:'deleting'});assert.equal((await old.json('wechat/start',{intent:'delete',returnOrigin:origin})).status,403);
 const reserved=await browser().json('sign-up/email',{email:'fake@wechat.tuyan.invalid',password:'fixture-password-long',name:'Reserved'});assert.equal(reserved.status,400);
 const mail=fixture.mail.length;await browser().json('request-password-reset',{email:logged.user.email,redirectTo:`${origin}/account/reset-password.html`});assert.equal(fixture.mail.length,mail);
 console.log('PASS fresh WeChat deletion proof is session-bound and single-use; deletion fencing and reserved-email guard');
}finally{await fixture.close();}
