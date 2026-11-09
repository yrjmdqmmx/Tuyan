import { createHash, createHmac, randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { APIError, createAuthEndpoint, getSessionFromCtx } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { authUserFilter } from './account-verification.js';

const opaque = () => randomBytes(32).toString('hex');
const valid = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const digest = value => createHash('sha256').update(value).digest('hex');
const validIdentity = value => typeof value === 'string' && /^[\w-]{1,128}$/.test(value);
const fail = (code, status = 'BAD_REQUEST') => new APIError(status, {code:`WECHAT_${code}`,message:`WECHAT_${code}`});
export const isWechatEmail = value => typeof value === 'string' && value.toLowerCase().endsWith('@wechat.tuyan.invalid');

export function loadWechatConfig(env = {}) {
  const enabled = env.WECHAT_OAUTH_ENABLED === 'true';
  if (!enabled) return {enabled:false};
  const appId = String(env.WECHAT_WEB_APP_ID || '').trim(), appSecret = String(env.WECHAT_WEB_APP_SECRET || '').trim();
  if (!/^wx[a-f0-9]{16}$/.test(appId) || !/^[a-zA-Z0-9]{32}$/.test(appSecret)) throw Error('WECHAT_CONFIGURATION_INCOMPLETE');
  return {enabled,appId,appSecret};
}
export function wechatAuthorizationUrl(settings, state) {
  const url = new URL('https://open.weixin.qq.com/connect/qrconnect');
  url.search = new URLSearchParams({appid:settings.appId,redirect_uri:settings.redirectUri,response_type:'code',scope:'snsapi_login',state}).toString();
  url.hash = 'wechat_redirect';
  return url.toString();
}
async function boundedJson(url, fetchImpl) {
  const response = await fetchImpl(url.toString(), {method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),headers:{accept:'application/json'}});
  if (!response.ok || response.redirected || Number(response.headers.get('content-length')) > 65536) throw fail('PROVIDER_UNAVAILABLE');
  const reader = response.body?.getReader();
  if (!reader) throw fail('PROVIDER_UNAVAILABLE');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const {done,value} = await reader.read(); if (done) break;
      size += value.length;
      if (size > 65536) {await reader.cancel();throw fail('PROVIDER_UNAVAILABLE');}
      chunks.push(value);
    }
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!result || result.errcode) throw fail('PROVIDER_UNAVAILABLE');
    return result;
  } finally {reader.releaseLock();}
}
export async function exchangeWechatIdentity(settings, code, fetchImpl = fetch) {
  try {
    const url = new URL('https://api.weixin.qq.com/sns/oauth2/access_token');
    url.search = new URLSearchParams({appid:settings.appId,secret:settings.appSecret,code,grant_type:'authorization_code'}).toString();
    const token = await boundedJson(url,fetchImpl);
    if (!validIdentity(token.openid) || typeof token.access_token !== 'string' || !token.access_token || token.access_token.length > 4096
      || !String(token.scope || '').split(',').includes('snsapi_login')) throw Error('invalid token');
    const profileUrl = new URL('https://api.weixin.qq.com/sns/userinfo');
    profileUrl.search = new URLSearchParams({access_token:token.access_token,openid:token.openid,lang:'zh_CN'}).toString();
    const profile = await boundedJson(profileUrl,fetchImpl);
    if (profile.openid !== token.openid || typeof profile.nickname !== 'string' || !profile.nickname.trim() || profile.nickname.length > 100
      || /[\u0000-\u001f\u007f]/.test(profile.nickname) || (profile.unionid !== undefined && !validIdentity(profile.unionid))
      || (token.unionid && token.unionid !== profile.unionid)) throw Error('invalid profile');
    // No email/phone inference, avatar downloads, tokens or geographic profile storage.
    // App-scoped OpenID is the binding key; UnionID is metadata, never an automatic merge key.
    return {accountId:`${settings.appId}:${profile.openid}`,nickname:profile.nickname.trim(),...(profile.unionid ? {unionId:profile.unionid} : {})};
  } catch {throw fail('PROVIDER_UNAVAILABLE','BAD_GATEWAY');}
}

export function createWechatOAuth({config,db,mongoClient,fetchImpl=fetch,now=()=>new Date()}) {
  const enabled = config.wechat?.enabled === true;
  const callbackOrigin = enabled ? new URL(config.authBaseUrl).origin : '';
  if (enabled && (!config.wechat.appId || !config.wechat.appSecret || (config.production && !callbackOrigin.startsWith('https://')))) throw Error('WECHAT_CONFIGURATION_INCOMPLETE');
  const settings = {...config.wechat,redirectUri:`${callbackOrigin}/api/auth/oauth2/callback/wechat`};
  const origins = new Set((config.frontendOrigins || []).filter(value => {
    try {const url=new URL(value);return url.origin===value && ['http:','https:'].includes(url.protocol) && !['servicewechat.com','developers.weixin.qq.com'].includes(url.hostname);} catch {return false;}
  }));
  const txs=db.collection('wechatTransactions'), confirmations=db.collection('wechatConfirmations'), accounts=db.collection('account'), users=db.collection('user');
  const cookieName = config.production ? '__Host-tuyan_wechat' : 'tuyan_wechat';
  const oauthCookie = `${cookieName}_oauth`;
  const cookieOptions = {httpOnly:true,secure:config.production,sameSite:'lax',path:'/',maxAge:600};
  const hmac=value=>createHmac('sha256',config.authSecret).update(`wechat:${value}`).digest('hex');
  const expires=()=>new Date(+now()+600000);
  const ids=id=>authUserFilter(id)._id.$in;
  const browserHash=ctx=>valid(ctx.getCookie(cookieName))?digest(ctx.getCookie(cookieName)):'';
  async function transaction(work) {
    const session=mongoClient.startSession();
    try {return await session.withTransaction(()=>work({session}),{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});} finally {await session.endSession();}
  }
  async function active(id,options={},marker) {
    const user=await users.findOne(authUserFilter(id),options);
    if (!user || await db.collection('accountDeletionOperations').findOne({_id:String(id)},options)) throw fail('ACCOUNT_UNAVAILABLE','FORBIDDEN');
    const history=await db.collection('accountDeletionOperationHistory').findOne({userId:String(id)},{...options,sort:{closedAt:-1,_id:-1},projection:{_id:1}});
    const generation=`${new Date(user.createdAt).toISOString()}:${history?._id || ''}`;
    if (marker!==undefined && marker!==generation) throw fail('ACCOUNT_CHANGED','CONFLICT');
    return {user,generation};
  }
  async function current(ctx,required=false) {
    const session=await getSessionFromCtx(ctx,{disableCookieCache:true});
    if (!session?.user || !session.session) {if(required)throw fail('SIGN_IN_REQUIRED','UNAUTHORIZED');return null;}
    const found=await active(session.user.id);
    return {...session,generation:found.generation};
  }
  async function guard(session,options,marker) {
    const found=await active(session.user.id,options,marker);
    if (!await db.collection('session').findOne({...authUserFilter(session.session.id),userId:{$in:ids(session.user.id)},expiresAt:{$gt:now()}},options)) throw fail('SIGN_IN_REQUIRED','UNAUTHORIZED');
    await users.updateOne({_id:found.user._id},{$inc:{workspaceWriteVersion:1}},options);
    return found;
  }
  async function pending(ctx,session,options={}) {
    const row=await txs.findOne({_id:browserHash(ctx),kind:'pending',expiresAt:{$gt:now()}},options);
    if (!row) throw fail('EXPIRED');
    if (row.intent==='login' ? Boolean(session) : (!session || row.userId!==session.user.id || row.sessionBinding!==hmac(session.session.token))) throw fail('ACCOUNT_CHANGED','CONFLICT');
    if (row.userId) await active(row.userId,options,row.generation);
    return row;
  }
  async function sessionFor(ctx,id,accountId,generation) {
    const check=async()=>{
      await active(id,{},generation);
      if (!await accounts.findOne({providerId:'wechat',accountId,userId:{$in:ids(id)}}))throw fail('BINDING_CONFLICT','CONFLICT');
    };
    await check();
    const user=await ctx.context.internalAdapter.findUserById(id),session=await ctx.context.internalAdapter.createSession(id);
    if (!user || !session) throw fail('SESSION_FAILED','INTERNAL_SERVER_ERROR');
    try {await check();await setSessionCookie(ctx,{user,session});} catch(error){await ctx.context.internalAdapter.deleteSession(session.token);throw error;}
  }
  function endpoint(path,method,work) {
    return createAuthEndpoint(path,{method,requireHeaders:true},async ctx=>{
      ctx.setHeader('Cache-Control','no-store');ctx.setHeader('Referrer-Policy','no-referrer');
      if (!enabled && path!=='/wechat/status') throw fail('DISABLED','SERVICE_UNAVAILABLE');
      if (method==='POST' && (!origins.has(ctx.headers.get('origin')) || ctx.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')) throw fail('INVALID_ORIGIN','FORBIDDEN');
      try {return await work(ctx);} catch(error){if(error instanceof APIError)throw error;if(error?.code===11000)throw fail('BINDING_CONFLICT','CONFLICT');throw fail('UNAVAILABLE','SERVICE_UNAVAILABLE');}
    });
  }
  return {
    async ensureIndexes() {
      if (!enabled) return;
      for(const collection of [txs,confirmations])await collection.createIndex({expiresAt:1},{expireAfterSeconds:0});
      await accounts.createIndex({providerId:1,accountId:1},{name:'wechat_identity_unique_v1',unique:true,partialFilterExpression:{providerId:'wechat'}});
      await accounts.createIndex({userId:1,providerId:1},{name:'wechat_user_unique_v1',unique:true,partialFilterExpression:{providerId:'wechat'}});
    },
    async consumeDeletionConfirmation({confirmationToken,session}) {
      if(!enabled || !valid(confirmationToken) || !session?.user?.id)return false;
      try {return await transaction(async options=>{
        const row=await confirmations.findOneAndDelete({_id:digest(confirmationToken),userId:session.user.id,sessionBinding:hmac(session.session.token),expiresAt:{$gt:now()}},options);
        if(!row)return false;await guard(session,options,row.generation);return true;
      });}catch{return false;}
    },
    plugin:{id:'tuyan-wechat',endpoints:{
      wechatStatus:endpoint('/wechat/status','GET',async ctx=>{
        if(!enabled)return ctx.json({available:false});
        const session=await current(ctx),row=await pending(ctx,session).catch(()=>null);
        const linked=Boolean(session && await accounts.findOne({providerId:'wechat',userId:{$in:ids(session.user.id)}}));
        const known=Boolean(row && await accounts.findOne({providerId:'wechat',accountId:row.accountId}));
        return ctx.json({available:true,linked,pending:row?{intent:row.intent,nickname:row.nickname,newAccount:row.intent==='login'&&!known}:null});
      }),
      wechatStart:endpoint('/wechat/start','POST',async ctx=>{
        const {intent,returnOrigin}=ctx.body || {};
        if(!['login','link','delete'].includes(intent) || !origins.has(returnOrigin) || returnOrigin!==ctx.headers.get('origin'))throw fail('INVALID_REQUEST');
        const session=await current(ctx,intent!=='login');
        if(intent==='login' && session)throw fail('SIGN_OUT_REQUIRED','CONFLICT');
        if(session && ctx.headers.get('x-workspace-account')!==session.user.id)throw fail('ACCOUNT_CHANGED','CONFLICT');
        if(intent==='link' && await accounts.findOne({providerId:'wechat',userId:{$in:ids(session.user.id)}}))throw fail('ALREADY_LINKED','CONFLICT');
        const browser=opaque(),state=opaque(),ticket=opaque(),previous=browserHash(ctx);
        if(previous)await txs.deleteMany({$or:[{_id:previous},{browserHash:previous}]});
        await txs.insertOne({_id:digest(state),kind:'state',state,launchHash:digest(ticket),launchExpiresAt:new Date(+now()+60000),browserHash:digest(browser),intent,returnOrigin,
          ...(session?{userId:session.user.id,sessionBinding:hmac(session.session.token),generation:session.generation}:{}),expiresAt:expires()});
        ctx.setCookie(cookieName,browser,cookieOptions);
        // The popup launches on one registered callback domain. Redemption stays on
        // the initiating site's browser cookie, so both independent domains work.
        return ctx.json({url:`${callbackOrigin}/api/auth/wechat/launch?ticket=${ticket}`});
      }),
      wechatLaunch:endpoint('/wechat/launch','GET',async ctx=>{
        if(new URL(ctx.request.url).origin!==callbackOrigin)throw fail('INVALID_REQUEST');
        const ticket=new URL(ctx.request.url).searchParams.get('ticket');
        if(!valid(ticket))throw fail('EXPIRED');
        const nonce=opaque();
        const row=await txs.findOneAndUpdate({kind:'state',launchHash:digest(ticket),launchExpiresAt:{$gt:now()},expiresAt:{$gt:now()}},{$set:{oauthBrowserHash:digest(nonce)},$unset:{launchHash:'',launchExpiresAt:''}},{returnDocument:'after'});
        if(!row)throw fail('EXPIRED');
        ctx.setCookie(oauthCookie,nonce,cookieOptions);
        return ctx.redirect(wechatAuthorizationUrl(settings,row.state));
      }),
      wechatCallback:endpoint('/oauth2/callback/wechat','GET',async ctx=>{
        const url=new URL(ctx.request.url),state=url.searchParams.get('state'),nonce=ctx.getCookie(oauthCookie);
        if(url.origin!==callbackOrigin || !valid(state) || !valid(nonce))throw fail('INVALID_STATE');
        const row=await txs.findOneAndDelete({_id:digest(state),kind:'state',oauthBrowserHash:digest(nonce),expiresAt:{$gt:now()}});
        if(!row)throw fail('INVALID_STATE');
        let status='error';
        try {
          const code=url.searchParams.get('code');
          if(!code || code.length>1024 || url.searchParams.getAll('code').length!==1 || url.searchParams.getAll('state').length!==1 || url.searchParams.has('error'))throw fail('INVALID_STATE');
          if(row.userId)await active(row.userId,{},row.generation);
          const identity=await exchangeWechatIdentity(settings,code,fetchImpl);
          // A callback never signs in its own browser. Only the original site's
          // cookie + (for link/delete) same live account/session can redeem it.
          await txs.insertOne({_id:row.browserHash,kind:'pending',...identity,intent:row.intent,returnOrigin:row.returnOrigin,
            ...(row.userId?{userId:row.userId,sessionBinding:row.sessionBinding,generation:row.generation}:{}),expiresAt:row.expiresAt});
          status='pending';
        } catch { /* No provider response or credential in redirects/logs. */ }
        ctx.setCookie(oauthCookie,'',{...cookieOptions,maxAge:0});
        return ctx.redirect(`${row.returnOrigin}/account/wechat-callback.html?wechat=${status}`);
      }),
      wechatComplete:endpoint('/wechat/complete','POST',async ctx=>{
        const session=await current(ctx);
        if(session && ctx.headers.get('x-workspace-account')!==session.user.id)throw fail('ACCOUNT_CHANGED','CONFLICT');
        const result=await transaction(async options=>{
          const row=await pending(ctx,session,options);
          let binding=await accounts.findOne({providerId:'wechat',accountId:row.accountId},options),found;
          if(row.intent==='login'){
            if(binding)found=await active(String(binding.userId),options);
            else {
              if(ctx.body?.createAccount!==true)throw fail('REGISTRATION_REQUIRED','CONFLICT');
              const id=new ObjectId();
              await users.insertOne({_id:id,email:`${id}@wechat.tuyan.invalid`,emailVerified:false,wechatOnly:true,name:row.nickname.slice(0,24),createdAt:now(),updatedAt:now()},options);
              found=await active(String(id),options);
            }
            await users.updateOne({_id:found.user._id},{$inc:{workspaceWriteVersion:1}},options);
          }else{
            found=await guard(session,options,row.generation);
            if(binding && String(binding.userId)!==session.user.id)throw fail('BINDING_CONFLICT','CONFLICT');
            if(row.intent==='delete'){
              if(!binding)throw fail('BINDING_CONFLICT','CONFLICT');
              const token=opaque();
              await confirmations.insertOne({_id:digest(token),userId:session.user.id,sessionBinding:row.sessionBinding,generation:found.generation,expiresAt:new Date(+now()+300000)},options);
              if((await txs.deleteOne({_id:row._id,kind:'pending'},options)).deletedCount!==1)throw fail('EXPIRED');
              return {confirmationToken:token};
            }
          }
          if(!binding)await accounts.insertOne({_id:new ObjectId(),providerId:'wechat',accountId:row.accountId,userId:found.user._id,...(row.unionId?{unionId:row.unionId}:{}),createdAt:now(),updatedAt:now()},options);
          if((await txs.deleteOne({_id:row._id,kind:'pending'},options)).deletedCount!==1)throw fail('EXPIRED');
          return {userId:String(found.user._id),generation:found.generation,accountId:row.accountId,intent:row.intent};
        });
        if(result.intent==='login')await sessionFor(ctx,result.userId,result.accountId,result.generation);
        ctx.setCookie(cookieName,'',{...cookieOptions,maxAge:0});
        return ctx.json({ok:true,...(result.confirmationToken?{confirmationToken:result.confirmationToken}:{})});
      }),
      wechatCancel:endpoint('/wechat/cancel','POST',async ctx=>{
        const hash=browserHash(ctx);if(hash)await txs.deleteMany({$or:[{_id:hash},{browserHash:hash}]});
        ctx.setCookie(cookieName,'',{...cookieOptions,maxAge:0});return ctx.json({ok:true});
      }),
    }},
  };
}
