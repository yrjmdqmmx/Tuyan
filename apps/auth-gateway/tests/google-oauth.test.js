import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {loadGoogleConfig,googleAuthorizationUrl,exchangeGoogleIdentity,createGoogleKeyResolver,isGoogleEmail} from '../src/google-oauth.js';
import {redactText} from '../src/redaction.js';
const settings={clientId:'123-local.apps.googleusercontent.com',clientSecret:'GOCSPX-local-fixture-secret-only',redirectUri:'http://127.0.0.1:4316/api/auth/oauth2/callback/google'};
const nonce='a'.repeat(64),verifier='b'.repeat(64),now=new Date('2026-10-31T08:00:00Z'),epoch=+now/1000;
const {privateKey,publicKey}=await generateKeyPair('RS256');
const jwk={...await exportJWK(publicKey),kid:'local-key',alg:'RS256',use:'sig'};
const claims={sub:'107001234567890',name:'Google 测试用户',iss:'https://accounts.google.com',aud:settings.clientId,nonce,iat:epoch,exp:epoch+3600,email:'existing@example.test',picture:'https://private.invalid/photo',email_verified:true};
const sign=(payload,key=privateKey)=>new SignJWT(payload).setProtectedHeader({alg:'RS256',kid:'local-key'}).sign(key);
async function provider(payload=claims,key=privateKey){const token=await sign(payload,key);const calls=[];return {calls,fetch:async(url,options)=>{
  calls.push({url,options});assert.equal(options.redirect,'error');assert.ok(options.signal);
  if(url==='https://oauth2.googleapis.com/token'){assert.equal(options.method,'POST');const body=new URLSearchParams(options.body);assert.equal(body.get('code_verifier'),verifier);assert.equal(body.get('redirect_uri'),settings.redirectUri);assert.equal(body.get('client_secret'),settings.clientSecret);assert.equal(body.get('grant_type'),'authorization_code');return Response.json({id_token:token,access_token:'do-not-store',refresh_token:'do-not-store'});}
  assert.equal(url,'https://www.googleapis.com/oauth2/v3/certs');return Response.json({keys:[jwk]});
}};}
const exchange=(p,keys)=>exchangeGoogleIdentity(settings,'one-use-code',verifier,nonce,p.fetch,()=>now,keys);
test('disabled by default; enabling requires a valid dedicated Google client',()=>{
 assert.deepEqual(loadGoogleConfig({}),{enabled:false});assert.deepEqual(loadGoogleConfig({GOOGLE_OAUTH_ENABLED:'false',GOOGLE_CLIENT_SECRET:'ignored'}),{enabled:false});
 assert.throws(()=>loadGoogleConfig({GOOGLE_OAUTH_ENABLED:'true'}),/GOOGLE_CONFIGURATION_INCOMPLETE/);
 assert.deepEqual(loadGoogleConfig({GOOGLE_OAUTH_ENABLED:'true',GOOGLE_CLIENT_ID:settings.clientId,GOOGLE_CLIENT_SECRET:settings.clientSecret}),{enabled:true,clientId:settings.clientId,clientSecret:settings.clientSecret});
 assert.ok(isGoogleEmail('user@GOOGLE.TUYAN.INVALID'));assert.ok(!isGoogleEmail('user@gmail.com'));
});
test('Google URL has minimal identity scope, PKCE, independent nonce and no offline grant',()=>{
 const u=new URL(googleAuthorizationUrl(settings,'c'.repeat(64),verifier,nonce));assert.equal(u.origin,'https://accounts.google.com');assert.equal(u.searchParams.get('scope'),'openid profile');assert.equal(u.searchParams.get('nonce'),nonce);assert.equal(u.searchParams.get('response_type'),'code');assert.equal(u.searchParams.get('access_type'),'online');assert.equal(u.searchParams.get('code_challenge_method'),'S256');assert.equal(u.searchParams.get('code_challenge'),createHash('sha256').update(verifier).digest('base64url'));assert.equal(u.searchParams.get('client_secret'),null);
});
test('signed identity uses sub only; verified email and provider tokens are not returned; JWKS cache reused',async()=>{
 const p=await provider(),keys=createGoogleKeyResolver(p.fetch);
 assert.deepEqual(await exchange(p,keys),{accountId:claims.sub,nickname:claims.name});await exchange(p,keys);
 assert.deepEqual(p.calls.map(c=>c.url),['https://oauth2.googleapis.com/token','https://www.googleapis.com/oauth2/v3/certs','https://oauth2.googleapis.com/token']);
});
test('both official issuers and authorized multi-audience token accepted; profile name optional',async()=>{
 const p=await provider({...claims,iss:'accounts.google.com',aud:[settings.clientId,'second-audience'],azp:settings.clientId,name:undefined});assert.deepEqual(await exchange(p),{accountId:claims.sub,nickname:'Google 用户'});
});
for(const [label,patch] of Object.entries({issuer:{iss:'https://evil.test'},audience:{aud:'wrong-client'},nonce:{nonce:'d'.repeat(64)},expired:{exp:epoch-1},future:{iat:epoch+10},old:{iat:epoch-601},subject:{sub:''},unicodeSubject:{sub:'不合法'},oversizedSubject:{sub:'x'.repeat(256)},authorizedParty:{azp:'wrong-client'},missingAuthorizedParty:{aud:[settings.clientId,'another']}}))test(`rejects signed token with invalid ${label}`,async()=>{const p=await provider({...claims,...patch});await assert.rejects(exchange(p),e=>e.body.code==='GOOGLE_PROVIDER_UNAVAILABLE');});
for(const field of ['sub','iss','aud','iat','exp','nonce'])test(`requires signed ${field}`,async()=>{const payload={...claims};delete payload[field];await assert.rejects(exchange(await provider(payload)));});
test('rejects untrusted signing key and unsigned/HS token; never follows token or JWKS redirects',async()=>{
 const other=await generateKeyPair('RS256');await assert.rejects(exchange(await provider(claims,other.privateKey)));
 for(const token of ['eyJhbGciOiJub25lIn0.e30.','eyJhbGciOiJIUzI1NiJ9.e30.fake','x'.repeat(16385)])await assert.rejects(exchange({fetch:async()=>Response.json({id_token:token})}));
 for(const status of [302,500])await assert.rejects(exchange({fetch:async()=>new Response('',{status,headers:{location:'https://evil.test'}})}));
});
test('bounded provider/JWKS input, no provider failure retries, no token in errors/logs',async()=>{
 let calls=0;await assert.rejects(exchange({fetch:async()=>{calls++;return Response.json({error:'denied',secret:'not-for-logs'},{status:400});}}),e=>!String(e).includes('not-for-logs'));assert.equal(calls,1);
 await assert.rejects(exchange({fetch:async()=>new Response('x'.repeat(65537))}));
 const token=await sign(claims);await assert.rejects(exchange({fetch:async url=>url.includes('/token')?Response.json({id_token:token}):new Response('x'.repeat(65537))}));
 const text=redactText(JSON.stringify({id_token:token,nonce,client_secret:settings.clientSecret}));for(const value of [token,nonce,settings.clientSecret])assert.ok(!text.includes(value));
 assert.ok(!redactText('https://fixture.invalid/?nonce='+nonce+'&id_token='+token).includes(nonce));
});
