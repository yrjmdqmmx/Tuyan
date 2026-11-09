import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ObjectId} from 'mongodb';
import {createWatchaFixture} from './watcha-fixture.mjs';
let clock=new Date();const providerCalls=[];
const pkce = new Map();
const identities = new Map(['wx-one','wx-two','wx-three','wx-four'].map((code,index)=>[code,index+100]));
let profileName = 'GitHub test';
const fixture=await createWatchaFixture({uri:process.env.GITHUB_TEST_MONGO_URI,now:()=>clock,github:{enabled:true,clientId:'fixture-client',clientSecret:'fixture-secret'},
 githubFetch:async(value,options)=>{const url=new URL(value);providerCalls.push(url.pathname);assert.equal(options.redirect,'error');
  if(value==='https://github.com/login/oauth/access_token'){
    assert.equal(options.method,'POST');const body=new URLSearchParams(options.body);
    assert.equal(body.get('client_id'),'fixture-client');assert.equal(body.get('client_secret'),'fixture-secret');
    assert.equal(body.get('redirect_uri'),`${fixture.origin}/api/auth/oauth2/callback/github`);
    assert.ok([...pkce.values()].includes(createHash('sha256').update(body.get('code_verifier')).digest('base64url')));
    if(body.get('code')==='reject')return Response.json({error:'denied',error_description:'secret failure'},{status:400});
    return Response.json({access_token:`fixture_${identities.get(body.get('code'))}`,token_type:'Bearer',expires_in:28800,refresh_token:'must-not-save'});
  }
  if(value==='https://api.github.com/user')return Response.json({id:Number(options.headers.authorization.split('_')[1]),login:'test-user',name:profileName,type:'User',email:'old@example.test',avatar_url:'https://example.test/do-not-fetch'});
  throw Error('External network forbidden');
 }});
const {origin,db,runtime}=fixture;
function browser(){const cookies=new Map();return {cookies,userId:'',async request(path,body,headers={}){
 const response=await fetch(path.startsWith('http')?path:`${origin}${path}`,{method:body===undefined?'GET':'POST',redirect:'manual',headers:{origin,'content-type':'application/json',cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),...(this.userId?{'x-workspace-account':this.userId}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
 for(const cookie of response.headers.getSetCookie()){const[k,...v]=cookie.split(';')[0].split('=');if(v.join('='))cookies.set(k,v.join('='));else cookies.delete(k);}
 return {status:response.status,headers:response.headers,data:await response.json().catch(()=>null)};
},async json(action,body,headers){return this.request(`/api/auth/${action}`,body,headers);}};}
async function start(b,intent='login'){const r=await b.json('github/start',{intent,returnOrigin:origin});assert.equal(r.status,200,JSON.stringify(r.data));return r.data.url;}
async function launch(b,url){const r=await b.request(url);assert.equal(r.status,302,JSON.stringify(r.data));const target=new URL(r.headers.get('location'));assert.equal(target.origin,'https://github.com');assert.equal(target.searchParams.get('scope'),'read:user');assert.equal(target.searchParams.get('code_challenge_method'),'S256');const state=target.searchParams.get('state');pkce.set(state,target.searchParams.get('code_challenge'));return state;}
async function callback(b,state,identity){return b.request(`/api/auth/oauth2/callback/github?${new URLSearchParams({state,code:identity})}`);}
async function scan(b,identity,intent='login',popup=b){const url=await start(b,intent);const state=await launch(popup,url);const r=await callback(popup,state,identity);assert.equal(r.status,302,JSON.stringify(r.data));assert.match(r.headers.get('location'),/github=pending$/);return {state,url};}
async function existing(b,email){assert.equal((await b.json('sign-up/email',{email,password:'fixture-password-long',name:'Original'})).status,200);await db.collection('user').updateOne({email},{$set:{emailVerified:true}});const r=await b.json('sign-in/email',{email,password:'fixture-password-long'});assert.equal(r.status,200);b.userId=r.data.user.id;return b.userId;}
try{
 const b=browser(),popup=browser(),other=browser();
 assert.equal((await b.json('github/status')).data.available,true);
 assert.equal((await b.json('github/start',{intent:'login',returnOrigin:'https://evil.test'})).status,400);
 assert.equal((await b.json('github/start',{intent:'link',returnOrigin:origin})).status,401);
 const url=await start(b),state=await launch(popup,url);
 assert.equal((await popup.request(url)).status,400);
 const count=providerCalls.length;assert.equal((await callback(other,state,'wx-one')).status,400);assert.equal(providerCalls.length,count);
 const r=await callback(popup,state,'wx-one');assert.match(r.headers.get('location'),/github=pending$/);
 assert.equal((await callback(popup,state,'wx-one')).status,400);
 assert.equal((await popup.json('github/complete',{createAccount:true})).status,400);
 assert.equal((await b.json('github/complete',{})).data.code,'GITHUB_REGISTRATION_REQUIRED');
 assert.equal((await b.json('github/status')).data.pending.newAccount,true);
 const race=await Promise.all([b.json('github/complete',{createAccount:true}),b.json('github/complete',{createAccount:true})]);assert.equal(race.filter(x=>x.status===200).length,1,JSON.stringify(race));
 const logged=(await b.json('get-session')).data;assert.ok(logged.user.id);assert.equal(logged.user.githubOnly,true);assert.equal(logged.user.emailVerified,false);
 assert.equal(await db.collection('user').countDocuments({}),1);assert.equal(await db.collection('account').countDocuments({providerId:'github'}),1);
 console.log('PASS one-use launch/state, wrong-browser rejection, separate popup/original cookie redemption, explicit registration and concurrent completion');
 profileName='Renamed GitHub user';
 const returning=browser();await scan(returning,'wx-one');assert.equal((await returning.json('github/complete',{})).status,200);assert.equal((await returning.json('get-session')).data.user.id,logged.user.id);
 const old=browser(),id=await existing(old,'old@example.test');
 const collections=['workspaceDocuments','workspaceModelLibraries','workspaceResults'];
 for(const name of collections)await db.collection(name).insertOne({_id:'preserved',userId:id,tasks:['task'],drafts:['draft'],configuration:{custom:'kept'}});
 const before=await Promise.all(collections.map(name=>db.collection(name).findOne({_id:'preserved'})));
 await scan(old,'wx-two','link');assert.equal((await old.json('github/complete',{})).status,200);
 assert.deepEqual(await Promise.all(collections.map(name=>db.collection(name).findOne({_id:'preserved'}))),before);
 const originalLogin=browser();await scan(originalLogin,'wx-two');assert.equal((await originalLogin.json('github/complete',{})).status,200);assert.equal((await originalLogin.json('get-session')).data.user.id,id);
 assert.equal(await db.collection('user').countDocuments({}),2);
 console.log('PASS stable ID after rename; existing-account binding retains user ID, tasks, drafts and settings; same provider email never merges accounts');
 const stored=await db.collection('account').find({providerId:'github'}).toArray();
 for(const row of stored)for(const field of ['accessToken','refreshToken','access_token','refresh_token','email','avatar_url'])assert.equal(row[field],undefined);
 assert.equal((await old.json('sign-in/email',{email:'old@example.test',password:'fixture-password-long'})).status,200);
 const conflict=browser(),conflictId=await existing(conflict,'conflict@example.test');await scan(conflict,'wx-two','link');assert.equal((await conflict.json('github/complete',{})).data.code,'GITHUB_BINDING_CONFLICT');assert.equal(await db.collection('account').countDocuments({providerId:'github',userId:new ObjectId(conflictId)}),0);
 await conflict.json('github/cancel',{});
 const stale=await start(conflict,'link');const staleState=await launch(conflict,stale);await conflict.json('sign-out',{});await callback(conflict,staleState,'wx-three');assert.equal((await conflict.json('github/complete',{})).data.code,'GITHUB_ACCOUNT_CHANGED');
 console.log('PASS binding conflict and changed/revoked session fail closed');
 const exp=browser();const expiredUrl=await start(exp);clock=new Date(+clock+61000);assert.equal((await exp.request(expiredUrl)).status,400);
 const expiry=browser();const fresh=await start(expiry),freshState=await launch(expiry,fresh);clock=new Date(+clock+600001);assert.equal((await callback(expiry,freshState,'wx-four')).status,400);
 const failed=browser();const failedState=await launch(failed,await start(failed));const bad=await callback(failed,failedState,'reject');assert.match(bad.headers.get('location'),/github=error$/);assert.equal((await failed.json('github/status')).data.pending,null);
 console.log('PASS launch/authorization expiry and provider rejection create no accounts');
 b.userId=logged.user.id;await scan(b,'wx-one','delete');const proof=(await b.json('github/complete',{})).data;assert.ok(proof.confirmationToken);
 const session=(await b.json('get-session')).data;
 assert.equal(await runtime.consumeDeletionConfirmation({confirmationToken:proof.confirmationToken,session}),true);assert.equal(await runtime.consumeDeletionConfirmation({confirmationToken:proof.confirmationToken,session}),false);
 await db.collection('accountDeletionOperations').insertOne({_id:id,state:'deleting'});assert.equal((await old.json('github/start',{intent:'delete',returnOrigin:origin})).status,403);
 const reserved=await browser().json('sign-up/email',{email:'fake@github.tuyan.invalid',password:'fixture-password-long',name:'Reserved'});assert.equal(reserved.status,400);
 const mail=fixture.mail.length;await browser().json('request-password-reset',{email:logged.user.email,redirectTo:`${origin}/account/reset-password.html`});assert.equal(fixture.mail.length,mail);
 const noSession=browser();assert.equal((await noSession.json('github/start',{intent:'login',returnOrigin:origin},{origin:'https://evil.test'})).status,403);
 assert.equal((await browser().json('github/status')).data.pending,null);
 const cancelBrowser=browser();const cancelled=await start(cancelBrowser);await cancelBrowser.json('github/cancel',{});assert.equal((await cancelBrowser.request(cancelled)).status,400);
 const wrongProofSession=(await originalLogin.json('get-session')).data;
 await scan(b,'wx-one','delete');const boundProof=(await b.json('github/complete',{})).data.confirmationToken;
 assert.equal(await runtime.consumeDeletionConfirmation({confirmationToken:boundProof,session:wrongProofSession}),false);
 assert.equal(await runtime.consumeDeletionConfirmation({confirmationToken:boundProof,session}),true);
 console.log('PASS fresh GitHub deletion proof is session-bound and single-use; deletion fencing and reserved-email guard');
}finally{await fixture.close();}
