import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {loadGithubConfig,githubAuthorizationUrl,exchangeGithubIdentity,isGithubEmail} from '../src/github-oauth.js';
import {redactText} from '../src/redaction.js';
const settings={clientId:'fixture-client-id',clientSecret:'a'.repeat(40),redirectUri:'https://auth.example.test/api/auth/oauth2/callback/github'};
const verifier='b'.repeat(64);
test('GitHub defaults disabled; missing credentials fail closed; authorization has state, PKCE and minimal scope',()=>{
 assert.deepEqual(loadGithubConfig({}),{enabled:false});assert.throws(()=>loadGithubConfig({GITHUB_OAUTH_ENABLED:'true'}));
 assert.equal(loadGithubConfig({GITHUB_OAUTH_ENABLED:'true',GITHUB_CLIENT_ID:settings.clientId,GITHUB_CLIENT_SECRET:settings.clientSecret}).enabled,true);
 const url=new URL(githubAuthorizationUrl(settings,'random-state',verifier));
 assert.equal(url.origin,'https://github.com');assert.equal(url.pathname,'/login/oauth/authorize');assert.equal(url.searchParams.get('scope'),'read:user');
 assert.equal(url.searchParams.get('redirect_uri'),settings.redirectUri);assert.equal(url.searchParams.get('state'),'random-state');
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('code_challenge'),createHash('sha256').update(verifier).digest('base64url'));
 assert.equal(url.searchParams.has('client_secret'),false);assert.equal(url.searchParams.has('code_verifier'),false);assert.equal(isGithubEmail('abc@GITHUB.TUYAN.INVALID'),true);
});
test('GitHub exchange pins POST/token and profile endpoints, tolerates expiring tokens and private email; retains ID/name only',async()=>{
 const calls=[];
 const sender=async(url,options)=>{calls.push({url,options});return Response.json(calls.length===1?{access_token:'ghu_fixture',token_type:'bearer',expires_in:28800,refresh_token:'discard'}:{id:9001,login:'original-login',type:'User',name:'Display name',email:null,avatar_url:'https://untrusted.test/pixel'});};
 assert.deepEqual(await exchangeGithubIdentity(settings,'code',verifier,sender),{accountId:'9001',nickname:'Display name'});
 assert.equal(calls.length,2);assert.equal(calls[0].url,'https://github.com/login/oauth/access_token');assert.equal(calls[0].options.method,'POST');assert.equal(calls[0].options.redirect,'error');
 const body=new URLSearchParams(calls[0].options.body);assert.equal(body.get('code_verifier'),verifier);assert.equal(body.get('client_secret'),settings.clientSecret);assert.equal(body.get('redirect_uri'),settings.redirectUri);
 assert.equal(calls[1].url,'https://api.github.com/user');assert.equal(calls[1].options.headers.authorization,'Bearer ghu_fixture');
});
test('GitHub malformed/oversized/rejected provider responses fail closed, never retry or leak credentials',async()=>{
 let calls=0;await assert.rejects(()=>exchangeGithubIdentity(settings,'code',verifier,async()=>{calls++;throw Error(settings.clientSecret);}),error=>error.body.code==='GITHUB_PROVIDER_UNAVAILABLE'&&!error.message.includes(settings.clientSecret));assert.equal(calls,1);
 for(const profile of [{id:0},{id:'9001'},{id:9007199254740992},{id:9001,type:'Organization'},{id:9001,type:'User',login:'bad/login'}]){
  let count=0;await assert.rejects(()=>exchangeGithubIdentity(settings,'code',verifier,async()=>Response.json(++count===1?{access_token:'token',token_type:'bearer'}:profile)));
 }
 await assert.rejects(()=>exchangeGithubIdentity(settings,'code',verifier,async()=>new Response('x'.repeat(65537))));
 await assert.rejects(()=>exchangeGithubIdentity(settings,'code',verifier,async()=>Response.json({error:'bad_verification_code'})));
 let count=0;assert.deepEqual(await exchangeGithubIdentity(settings,'code',verifier,async()=>Response.json(++count===1?{access_token:'token',token_type:'bearer'}:{id:5,type:'User',login:'fallback',name:null,email:'unverified@example.test'})),{accountId:'5',nickname:'fallback'});
});
test('GitHub code, PKCE verifier and client secret are redacted in logs',()=>{
 const value=redactText('code=private-code&code_verifier=private-verifier&client_secret=private-secret {"access_token":"private-token","refresh_token":"private-refresh"}');
 for(const word of ['private-code','private-verifier','private-secret','private-token','private-refresh'])assert.equal(value.includes(word),false,value);
});
