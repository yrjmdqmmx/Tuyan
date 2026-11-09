import assert from 'node:assert/strict';
import test from 'node:test';
import {loadWechatConfig,wechatAuthorizationUrl,exchangeWechatIdentity,isWechatEmail} from '../src/wechat-oauth.js';
import {redactText} from '../src/redaction.js';
const settings={appId:'wx0123456789abcdef',appSecret:'a'.repeat(32),redirectUri:'https://auth.example.test/api/auth/oauth2/callback/wechat'};
test('WeChat disabled by default; a Mini Program or placeholder config does not silently enable it',()=>{
 assert.deepEqual(loadWechatConfig({}),{enabled:false});assert.throws(()=>loadWechatConfig({WECHAT_OAUTH_ENABLED:'true'}));
 assert.equal(loadWechatConfig({WECHAT_OAUTH_ENABLED:'true',WECHAT_WEB_APP_ID:settings.appId,WECHAT_WEB_APP_SECRET:settings.appSecret}).enabled,true);
 const url=new URL(wechatAuthorizationUrl(settings,'state'));
 assert.equal(url.origin,'https://open.weixin.qq.com');assert.equal(url.pathname,'/connect/qrconnect');assert.equal(url.searchParams.get('scope'),'snsapi_login');assert.equal(url.searchParams.get('redirect_uri'),settings.redirectUri);assert.equal(url.searchParams.has('secret'),false);
 assert.equal(isWechatEmail('abc@WECHAT.TUYAN.INVALID'),true);
});
test('provider exchange pins destinations, rejects mismatched identities and never retains tokens or avatar',async()=>{
 const calls=[];const sender=async(url,options)=>{calls.push({url:new URL(url),options});return Response.json(calls.length===1?{access_token:'token',openid:'openid-one',scope:'snsapi_login',unionid:'union-one'}:{openid:'openid-one',unionid:'union-one',nickname:'微信用户',headimgurl:'https://untrusted.test/pixel'});};
 assert.deepEqual(await exchangeWechatIdentity(settings,'code',sender),{accountId:`${settings.appId}:openid-one`,unionId:'union-one',nickname:'微信用户'});
 assert.equal(calls.length,2);assert.equal(calls[0].url.origin,'https://api.weixin.qq.com');assert.equal(calls[0].options.redirect,'error');assert.equal(calls[1].url.searchParams.get('openid'),'openid-one');
 let count=0;await assert.rejects(()=>exchangeWechatIdentity(settings,'code',async()=>{count++;throw Error(settings.appSecret);}),error=>!error.message.includes(settings.appSecret));assert.equal(count,1);
 count=0;await assert.rejects(()=>exchangeWechatIdentity(settings,'code',async()=>Response.json(++count===1?{access_token:'t',openid:'a',scope:'snsapi_login'}:{openid:'different',nickname:'Wrong'})));
 count=0;await assert.rejects(()=>exchangeWechatIdentity(settings,'code',async()=>Response.json(++count===1?{access_token:'t',openid:'a',scope:'snsapi_base'}:{})));assert.equal(count,1);
 await assert.rejects(()=>exchangeWechatIdentity(settings,'code',async()=>new Response('x'.repeat(65537))));
});
test('WeChat authorization secrets and identity identifiers are redacted',()=>{
 const text=redactText('https://x.test/?ticket=private-ticket&code=private-code&secret=private-secret {"openid":"private-openid","unionid":"private-union"}');
 for(const word of ['private-ticket','private-code','private-secret','private-openid','private-union'])assert.equal(text.includes(word),false,text);
});
