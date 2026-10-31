import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { ObjectId } from 'mongodb';
import sharp from 'sharp';
import { APIError, createAuthEndpoint, getSessionFromCtx } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { authUserFilter } from './account-verification.js';

const TTL = 300000;
const RESEND_SECONDS = 60;
const opaque = () => randomBytes(24).toString('hex');
const validId = value => typeof value === 'string' && /^[a-f0-9]{48}$/.test(value);
const fail = (code, status = 'BAD_REQUEST', extra = {}) => new APIError(status, { code: `PHONE_${code}`, message: `PHONE_${code}`, ...extra });
export function normalizePhone(value) {
  if (typeof value !== 'string' || value.length > 24) throw fail('INVALID_NUMBER');
  const phone = value.trim().replace(/[ -]/g, '');
  const normalized = /^1[3-9]\d{9}$/.test(phone) ? `+86${phone}` : phone;
  if (!/^\+861[3-9]\d{9}$/.test(normalized)) throw fail('INVALID_NUMBER');
  return normalized;
}
export const isPhoneEmail = value => typeof value === 'string' && value.endsWith('@phone.tuyan.invalid');
export const maskPhone = phone => `${phone.slice(0, 6)}****${phone.slice(-4)}`;

export async function renderPhoneCaptcha(answer) {
  const lines = Array.from({length:8}, () => `<path d="M${randomInt(180)} ${randomInt(52)}L${randomInt(180)} ${randomInt(52)}" stroke="#a9b9b0" stroke-width="1"/>`).join('');
  const letters = [...answer].map((letter, i) => `<text x="${18+i*32}" y="${35+randomInt(-4,5)}" transform="rotate(${randomInt(-16,17)} ${25+i*32} 27)" font-family="sans-serif" font-weight="bold" font-size="28" fill="#244a3c">${letter}</text>`).join('');
  return `data:image/png;base64,${(await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="52"><rect width="180" height="52" fill="#f0f3ef"/>${lines}${letters}</svg>`)).png().toBuffer()).toString('base64')}`;
}

// Custom Better Auth plugin: OTP consumption, account linking and uniqueness are
// one Mongo transaction, rather than a non-atomic read/verify/delete sequence.
export function createPhoneAuth({config, db, mongoClient, transport, now = () => new Date(), renderCaptcha = renderPhoneCaptcha}) {
  const enabled = config.sms?.enabled === true && Boolean(transport);
  const hmac = value => createHmac('sha256', config.authSecret).update(`phone-v1:${value}`).digest('hex');
  const users = db.collection('user'), accounts = db.collection('account');
  const codes = db.collection('phoneCodes'), challenges = db.collection('phoneChallenges'), limits = db.collection('phoneRateLimits'), confirmations = db.collection('phoneConfirmations');
  const cookieName = config.production ? '__Host-tuyan_phone' : 'tuyan_phone';
  const origins = new Set(config.frontendOrigins.filter(value => !/servicewechat|developers.weixin/.test(value)));
  const expiry = milliseconds => new Date(+now() + milliseconds);
  const userIds = id => authUserFilter(id)._id.$in;
  const phoneQuery = phone => ({providerId:'phone', accountId:phone});
  async function transaction(work) {
    const session = mongoClient.startSession();
    try { return await session.withTransaction(() => work({session}), {readConcern:{level:'snapshot'},writeConcern:{w:'majority'}}); }
    finally { await session.endSession(); }
  }
  async function active(id, options = {}, marker) {
    const user = await users.findOne(authUserFilter(id), options);
    if (!user || await db.collection('accountDeletionOperations').findOne({_id:String(id)}, options)) throw fail('ACCOUNT_UNAVAILABLE','FORBIDDEN');
    const history = await db.collection('accountDeletionOperationHistory').findOne({userId:String(id)},{...options,sort:{closedAt:-1,_id:-1},projection:{_id:1}});
    const generation = `${new Date(user.createdAt).toISOString()}:${history?._id || ''}`;
    if (marker !== undefined && generation !== marker) throw fail('ACCOUNT_CHANGED','CONFLICT');
    return {...user,phoneGeneration:generation};
  }
  async function current(ctx, required = false) {
    const session = await getSessionFromCtx(ctx,{disableCookieCache:true});
    if (!session?.user) { if (required) throw fail('SIGN_IN_REQUIRED','UNAUTHORIZED'); return null; }
    const user = await active(session.user.id);
    return {...session,phoneGeneration:user.phoneGeneration};
  }
  async function guard(session, options) {
    const user = await active(session.user.id, options, session.phoneGeneration);
    if (!await db.collection('session').findOne({...authUserFilter(session.session.id), userId:{$in:userIds(session.user.id)}, expiresAt:{$gt:now()}}, options)) throw fail('SIGN_IN_REQUIRED','UNAUTHORIZED');
    await users.updateOne({_id:user._id}, {$inc:{workspaceWriteVersion:1}}, options);
    return user;
  }
  function browser(ctx, create = false) {
    let token = ctx.phoneBrowserToken || ctx.getCookie(cookieName);
    if (!validId(token)) {
      if (!create) throw fail('CHALLENGE_EXPIRED');
      token = opaque(); ctx.phoneBrowserToken = token; ctx.setCookie(cookieName,token,{httpOnly:true,secure:config.production,sameSite:'lax',path:'/',maxAge:86400});
    }
    return hmac(token);
  }
  async function context(ctx, purpose, phone) {
    if (!['login','link','delete'].includes(purpose)) throw fail('INVALID_REQUEST');
    const session = await current(ctx,purpose !== 'login');
    if (purpose === 'login' && session) throw fail('SIGN_OUT_REQUIRED','CONFLICT');
    if (session && ctx.headers.get('x-workspace-account') !== session.user.id) throw fail('ACCOUNT_CHANGED','CONFLICT');
    const linked = session && await accounts.findOne({providerId:'phone',userId:{$in:userIds(session.user.id)}});
    if (purpose === 'link' && linked) throw fail('ALREADY_LINKED','CONFLICT');
    if (purpose === 'delete' && linked?.accountId !== phone) throw fail('INVALID_NUMBER');
    return {session, binding:session ? hmac(session.session.token) : browser(ctx), userId:session?.user.id || '', generation:session?.phoneGeneration};
  }
  function ip(ctx) {
    // The HTTP bridge overwrites this with Express's trusted proxy resolution.
    const value = ctx.headers.get('x-tuyan-client-ip');
    if (!value || !isIP(value)) throw fail('UNAVAILABLE','SERVICE_UNAVAILABLE');
    return value;
  }
  async function bucket(key, maximum, seconds, window) {
    const stamp = window?.stamp ?? Math.floor(+now()/1000/seconds), id = hmac(`${key}:${seconds}:${stamp}`);
    let row;
    try { row = await limits.findOneAndUpdate({_id:id},{$inc:{count:1},$setOnInsert:{expiresAt:window?.expiresAt || new Date((stamp+2)*seconds*1000)}},{upsert:true,returnDocument:'after'}); }
    catch (error) { if (error.code !== 11000) throw error; row = await limits.findOneAndUpdate({_id:id},{$inc:{count:1}},{returnDocument:'after'}); }
    if (!row || row.count > maximum) throw fail('RATE_LIMIT','TOO_MANY_REQUESTS',{retryAfter:Math.max(1,Math.ceil(((window?.resetAt?.getTime() || (Number(stamp)+1)*seconds*1000)-+now())/1000))});
  }
  async function cooldown(phone) {
    try { await limits.updateOne({_id:hmac(`cooldown:${phone}`), nextAt:{$lte:now()}},{$set:{nextAt:expiry(RESEND_SECONDS*1000),expiresAt:expiry(86400000)}},{upsert:true}); }
    catch (error) {
      if (error.code !== 11000) throw error;
      const previous = await limits.findOne({_id:hmac(`cooldown:${phone}`)});
      const remaining = Math.ceil((+previous?.nextAt-+now())/1000);
      throw fail('RATE_LIMIT','TOO_MANY_REQUESTS',{retryAfter:Number.isFinite(remaining) ? Math.max(1,remaining) : RESEND_SECONDS});
    }
  }
  function endpoint(path, method, work) {
    return createAuthEndpoint(path,{method,requireHeaders:true},async ctx => {
      ctx.setHeader('Cache-Control','no-store');
      if (!enabled && path !== '/phone/status') throw fail('DISABLED','SERVICE_UNAVAILABLE');
      if (method === 'POST' && (!origins.has(ctx.headers.get('origin')) || ctx.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')) throw fail('INVALID_ORIGIN','FORBIDDEN');
      try { return await work(ctx); }
      catch (error) {
        if (error instanceof APIError) { if(error.body?.retryAfter)ctx.setHeader('Retry-After',String(error.body.retryAfter)); throw error; }
        if (error.code === 11000) throw fail('BINDING_CONFLICT','CONFLICT');
        throw fail('UNAVAILABLE','SERVICE_UNAVAILABLE');
      }
    });
  }
  async function proof(ctx) {
    const phone = normalizePhone(ctx.body?.phone), purpose = ctx.body?.purpose;
    const bound = await context(ctx,purpose,phone);
    await bucket(`verify-ip:${ip(ctx)}`,60,900);
    const requestId = ctx.body?.requestId, code = ctx.body?.code;
    if (!validId(requestId)) throw fail('INVALID_CODE');
    const row = await codes.findOneAndUpdate({_id:hmac(`${purpose}:${hmac(phone)}:${bound.binding}`),requestId,ready:true,expiresAt:{$gt:now()},attempts:{$lt:5}},{$inc:{attempts:1}},{returnDocument:'after'});
    const expected = hmac(`${requestId}:${String(code || '')}`);
    if (!row || typeof code !== 'string' || !/^\d{6}$/.test(code) || !timingSafeEqual(Buffer.from(row.codeHash),Buffer.from(expected))) throw fail('INVALID_CODE');
    if (purpose !== 'login' && row.generation !== bound.generation) throw fail('ACCOUNT_CHANGED','CONFLICT');
    return {phone,purpose,bound,row};
  }
  async function consume(row, options) {
    const result = await codes.deleteOne({_id:row._id,requestId:row.requestId,ready:true,expiresAt:{$gt:now()}},options);
    if (result.deletedCount !== 1) throw fail('INVALID_CODE');
  }
  async function sessionFor(ctx, userId, phone, generation) {
    const assertBinding = async () => {
      await active(userId,{},generation);
      if (!await accounts.findOne({...phoneQuery(phone),userId:{$in:userIds(userId)}})) throw fail('BINDING_CONFLICT','CONFLICT');
    };
    await assertBinding();
    const user = await ctx.context.internalAdapter.findUserById(userId);
    if (!user) throw fail('SESSION_FAILED','INTERNAL_SERVER_ERROR');
    const session = await ctx.context.internalAdapter.createSession(userId);
    if (!session) throw fail('SESSION_FAILED','INTERNAL_SERVER_ERROR');
    try { await assertBinding(); await setSessionCookie(ctx,{session,user}); }
    catch(error) { await ctx.context.internalAdapter.deleteSession(session.token); throw error; }
  }
  return {
    async ensureIndexes() {
      if (!enabled) return;
      for (const collection of [codes,challenges,limits,confirmations]) await collection.createIndex({expiresAt:1},{expireAfterSeconds:0});
      await accounts.createIndex({providerId:1,accountId:1},{name:'phone_identity_unique_v1',unique:true,partialFilterExpression:{providerId:'phone'}});
      await accounts.createIndex({userId:1,providerId:1},{name:'phone_user_unique_v1',unique:true,partialFilterExpression:{providerId:'phone'}});
    },
    async consumeDeletionConfirmation({confirmationToken,session}) {
      if (!enabled || !validId(confirmationToken) || !session?.user?.id) return false;
      try { return await transaction(async options => {
        const user = await guard(session,options);
        const result = await confirmations.deleteOne({_id:hmac(confirmationToken),userId:session.user.id,binding:hmac(session.session.token),generation:user.phoneGeneration,expiresAt:{$gt:now()}},options);
        return result.deletedCount === 1;
      }); } catch { return false; }
    },
    plugin:{id:'tuyan-phone',endpoints:{
      phoneStatus:endpoint('/phone/status','GET',async ctx => {
        if (!enabled) return ctx.json({available:false});
        const session = await current(ctx);
        const account = session && await accounts.findOne({providerId:'phone',userId:{$in:userIds(session.user.id)}});
        return ctx.json({available:true,linked:Boolean(account),maskedPhone:account?.maskedPhone || ''});
      }),
      phoneChallenge:endpoint('/phone/challenge','POST',async ctx => {
        const phone = normalizePhone(ctx.body?.phone), purpose = ctx.body?.purpose;
        browser(ctx,true);
        const bound = await context(ctx,purpose,phone);
        await bucket(`challenge-ip:${ip(ctx)}`,60,3600);
        await bucket(`challenge-browser:${browser(ctx)}`,30,3600);
        const answer = Array.from({length:5},()=> '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'[randomInt(31)]).join('');
        const id = opaque();
        await challenges.insertOne({_id:id,phoneHash:hmac(phone),purpose,binding:bound.binding,answerHash:hmac(`${id}:${answer}`),expiresAt:expiry(120000),userId:bound.userId});
        return ctx.json({challengeId:id,image:await renderCaptcha(answer),expiresInSeconds:120});
      }),
      phoneSend:endpoint('/phone/send-code','POST',async ctx => {
        const phone = normalizePhone(ctx.body?.phone), purpose = ctx.body?.purpose;
        const bound = await context(ctx,purpose,phone), id = ctx.body?.challengeId;
        await bucket(`send-ip:${ip(ctx)}`,20,3600);
        if (!validId(id)) throw fail('CAPTCHA_INVALID');
        // Consume even a wrong answer; a challenge cannot be used for parallel sends.
        const captcha = await challenges.findOneAndDelete({_id:id,phoneHash:hmac(phone),purpose,binding:bound.binding,expiresAt:{$gt:now()}});
        const expected = hmac(`${id}:${String(ctx.body?.captcha || '').trim().toUpperCase()}`);
        if (!captcha || !timingSafeEqual(Buffer.from(captcha.answerHash),Buffer.from(expected))) throw fail('CAPTCHA_INVALID');
        await cooldown(phone);
        for (const [key,max,seconds] of [[`phone:${phone}`,5,3600],[`phone:${phone}`,10,86400],[`ip:${ip(ctx)}`,100,86400],
          [`browser:${browser(ctx)}`,10,3600],[`browser:${browser(ctx)}`,30,86400],['global',config.sms.dailyMax || 200,86400]]) await bucket(key,max,seconds);
        const date = now();
        await bucket('global-month',config.sms.monthlyMax || 5000,31*86400,{stamp:`${date.getUTCFullYear()}-${date.getUTCMonth()}`,resetAt:new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)),expiresAt:new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+2,1))});
        const requestId = opaque(), code = String(randomInt(1000000)).padStart(6,'0');
        const codeId = hmac(`${purpose}:${hmac(phone)}:${bound.binding}`);
        const owner = purpose === 'login' ? await accounts.findOne(phoneQuery(phone)) : null;
        const ownerUser = owner ? await active(String(owner.userId)) : null;
        await codes.updateOne({_id:codeId},{$set:{ownerId:ownerUser ? String(ownerUser._id) : null,generation:ownerUser?.phoneGeneration || bound.generation || null,requestId,codeHash:hmac(`${requestId}:${code}`),userId:bound.userId,attempts:0,ready:false,expiresAt:expiry(TTL)}},{upsert:true});
        try {
          const receipt = await transport.send({phone,code,requestId,purpose});
          if (receipt?.accepted !== true) throw Error('not accepted');
          const result = await codes.updateOne({_id:codeId,requestId},{$set:{ready:true}});
          if (result.matchedCount !== 1) throw Error('superseded');
        } catch {
          await codes.deleteOne({_id:codeId,requestId});
          throw fail('SEND_UNCONFIRMED','SERVICE_UNAVAILABLE',{retryAfter:60});
        }
        return ctx.json({ok:true,requestId,retryAfter:RESEND_SECONDS,expiresInSeconds:TTL/1000});
      }),
      phoneVerify:endpoint('/phone/verify','POST',async ctx => {
        const {phone,purpose,bound,row} = await proof(ctx);
        const result = await transaction(async options => {
          await consume(row,options);
          let owner = await accounts.findOne(phoneQuery(phone),options);
          if (row.ownerId && row.ownerId !== String(owner?.userId)) throw fail('ACCOUNT_CHANGED','CONFLICT');
          let user;
          if (purpose === 'link') {
            user = await guard(bound.session,options);
            if (owner && String(owner.userId) !== String(user._id)) throw fail('BINDING_CONFLICT','CONFLICT');
            const previous = await accounts.findOne({providerId:'phone',userId:user._id},options);
            if (previous) throw fail('ALREADY_LINKED','CONFLICT');
          } else if (purpose === 'delete') {
            user = await guard(bound.session,options);
            if (String(owner?.userId) !== String(user._id)) throw fail('BINDING_CONFLICT','CONFLICT');
            const token = opaque();
            await confirmations.insertOne({_id:hmac(token),userId:String(user._id),binding:bound.binding,generation:user.phoneGeneration,expiresAt:expiry(TTL)},options);
            return {confirmationToken:token};
          } else if (owner) {
            user = await active(String(owner.userId),options,row.ownerId ? row.generation : undefined);
            await users.updateOne({_id:user._id},{$inc:{workspaceWriteVersion:1}},options);
          } else {
            const id = new ObjectId();
            user = {_id:id,email:`${id}@phone.tuyan.invalid`,emailVerified:false,name:'图研用户',phoneOnly:true,createdAt:now(),updatedAt:now()};
            await users.insertOne(user,options);
          }
          if (!owner) await accounts.insertOne({_id:new ObjectId(),...phoneQuery(phone),userId:user._id,maskedPhone:maskPhone(phone),createdAt:now(),updatedAt:now()},options);
          const identity = await active(String(user._id),options);
          return {userId:String(user._id),generation:identity.phoneGeneration};
        });
        if (purpose === 'login') await sessionFor(ctx,result.userId,phone,result.generation);
        return ctx.json({ok:true,...(result.confirmationToken ? {confirmationToken:result.confirmationToken} : {})});
      }),
    }},
  };
}
