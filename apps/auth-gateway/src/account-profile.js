import { isGoogleEmail } from './google-oauth.js';
import { isGithubEmail } from './github-oauth.js';
import { isWechatEmail } from './wechat-oauth.js';
import express from 'express';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import sharp from 'sharp';
import { authUserFilter } from './account-verification.js';
import { assertWorkspaceAccountActive, withWorkspaceAccountWrite } from './workspace-lifecycle.js';

const fail = (status, message) => Object.assign(Error(message), { status });
const normalizeEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const validEmail = value => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const ttl = 10 * 60_000;

// Persist only a small, decoded and re-encoded raster in the private user record.
// No remote fetch, public avatar object, metadata, animated image or SVG is retained.
export async function normalizeAvatar(base64) {
  if (typeof base64 !== 'string' || base64.length > 2_800_000 || base64.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw fail(400, '请选择不超过 2 MB 的 PNG、JPEG 或 WebP 图片');
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > 2 * 1024 * 1024) throw fail(413, '头像不能超过 2 MB');
  const raster = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    || bytes.subarray(0, 3).equals(Buffer.from([255,216,255]))
    || (bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP');
  if (!raster) throw fail(400, '仅支持 PNG、JPEG 和 WebP 头像');
  try {
    const image = sharp(bytes, { limitInputPixels: 16_000_000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (!['png','jpeg','webp'].includes(metadata.format) || (metadata.pages || 1) !== 1) throw Error('unsupported');
    const output = await image.rotate().resize(256,256,{fit:'cover'}).webp({quality:80}).toBuffer();
    if (output.length > 64_000) throw Error('oversize');
    return `data:image/webp;base64,${output.toString('base64')}`;
  } catch { throw fail(400, '无法读取这张头像，请换一张静态图片'); }
}

export function createAccountProfile({ db, mongoClient, limiter, transport, deliveryEnabled, secret, now = () => new Date() }) {
  const hmac = value => createHmac('sha256',secret).update(value).digest('hex');
  const binding = session => hmac(String(session.session?.token || session.session?.id || ''));
  const write = (userId, work) => withWorkspaceAccountWrite({db,mongoClient,userId},work);
  const current = async (scoped, session) => {
    const id = String(session.user.id);
    await assertWorkspaceAccountActive(scoped,id);
    const live = await scoped.collection('session').findOne({...authUserFilter(session.session?.id), userId:{$in:authUserFilter(id)._id.$in}, expiresAt:{$gt:now()}});
    if (!live) throw fail(401,'登录已失效，请重新登录');
    return scoped.collection('user').findOne(authUserFilter(id));
  };
  return {
    async active(userId) { await assertWorkspaceAccountActive(db,userId); },
    async avatar(session, base64) {
      await limiter.consume({kind:'profile-user',value:String(session.user.id),template:'avatar'});
      const image = base64 === null ? null : await normalizeAvatar(base64);
      return write(String(session.user.id),async scoped => {
        await current(scoped,session);
        await scoped.collection('user').updateOne(authUserFilter(session.user.id),{$set:{image,updatedAt:now()}});
        return {ok:true};
      });
    },
    async startEmail(session, input, ip) {
      if (!deliveryEnabled) throw fail(503,'邮件服务尚未启用，暂时不能更换邮箱');
      const newEmail = normalizeEmail(input), userId = String(session.user.id);
      if (!validEmail(newEmail) || (isWechatEmail(newEmail) || isGithubEmail(newEmail) || isGoogleEmail(newEmail))) throw fail(400,'请输入有效的新邮箱');
      const user = await current(db,session);
      if ((isWechatEmail(user.email) || isGithubEmail(user.email) || isGoogleEmail(user.email))) throw fail(400,'当前账号尚未绑定邮箱，请先使用账户中的其他登录方式');
      if (newEmail === normalizeEmail(user.email)) throw fail(400,'新邮箱与当前邮箱相同');
      // Separate user and destination budgets prevent one account spamming many addresses.
      for (const [kind,value] of [['profile-user',userId],['email',user.email],['email',newEmail],['ip',ip]]) {
        if (value) await limiter.consume({kind,value,template:'change-email'});
      }
      const requestId = randomBytes(24).toString('hex');
      const oldCode = String(randomInt(0,1_000_000)).padStart(6,'0');
      let newCode;
      do { newCode = String(randomInt(0,1_000_000)).padStart(6,'0'); } while (newCode === oldCode);
      await write(userId,async scoped => {
        const fresh = await current(scoped,session);
        if (fresh.email !== user.email) throw fail(409,'账号信息已变化，请重新发起');
        await scoped.collection('accountEmailChanges').updateOne({_id:userId},{$set:{userId,requestId,sessionBinding:binding(session),oldEmail:user.email,newEmail,
          oldHash:hmac(`${requestId}:old:${oldCode}`),newHash:hmac(`${requestId}:new:${newCode}`),attempts:0,ready:false,expiresAt:new Date(+now()+ttl)}},{upsert:true});
      });
      try {
        for (const [toAddress,code,label] of [[user.email,oldCode,'当前邮箱'],[newEmail,newCode,'新邮箱']]) {
          await transport.send({toAddress,subject:'图研 Tuyan｜更换登录邮箱验证码',
            textBody:`你正在更换图研登录邮箱。${label}验证码：${code}。10 分钟内有效，请勿转发。需要同时验证当前邮箱与新邮箱才能完成更换；若非本人操作，请忽略并检查账号登录安全。`,
            htmlBody:`<p>你正在更换图研登录邮箱。</p><p>${label}验证码：<strong>${code}</strong></p><p>10 分钟内有效，请勿转发。需要同时验证当前邮箱与新邮箱才能完成更换；若非本人操作，请忽略并检查账号登录安全。</p>`});
        }
        const ready = await db.collection('accountEmailChanges').updateOne({_id:userId,requestId},{$set:{ready:true}});
        if (ready.matchedCount !== 1) throw Error('superseded');
      } catch {
        await db.collection('accountEmailChanges').deleteOne({_id:userId,requestId});
        throw fail(503,'验证码发送未完成，请稍后重新发起；登录邮箱尚未更改');
      }
      return {requestId,expiresInSeconds:ttl/1000};
    },
    async confirmEmail(session, input = {}) {
      const userId = String(session.user.id);
      if (!/^[a-f0-9]{48}$/.test(input.requestId || '') || !/^\d{6}$/.test(input.oldCode || '') || !/^\d{6}$/.test(input.newCode || '')) throw fail(400,'请输入两个邮箱收到的 6 位验证码');
      // Charge attempts outside the transaction so a rejected proof cannot roll it back.
      const row = await db.collection('accountEmailChanges').findOneAndUpdate({_id:userId,requestId:input.requestId,sessionBinding:binding(session),ready:true,expiresAt:{$gt:now()},attempts:{$lt:5}},{$inc:{attempts:1}},{returnDocument:'after'});
      const equal = (actual,expected) => timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(expected,'hex'));
      if (!row || !equal(row.oldHash,hmac(`${row.requestId}:old:${input.oldCode}`)) || !equal(row.newHash,hmac(`${row.requestId}:new:${input.newCode}`))) throw fail(400,'验证码错误、已过期或尝试次数过多，请重新获取');
      try {
        await write(userId,async scoped => {
          const user = await current(scoped,session);
          const live = await scoped.collection('accountEmailChanges').findOne({_id:userId,requestId:row.requestId,ready:true,expiresAt:{$gt:now()}});
          if (!live || user.email !== row.oldEmail) throw fail(409,'更换申请已失效，请重新发起');
          if (await scoped.collection('user').findOne({email:row.newEmail},{collation:{locale:'en',strength:2}})) throw fail(409,'此邮箱暂时无法用于更换，请使用其他邮箱');
          // The unique email index arbitrates a concurrent signup/change.
          await scoped.collection('user').updateOne({...authUserFilter(userId),email:row.oldEmail},{$set:{email:row.newEmail,emailVerified:true,updatedAt:now()}});
          await scoped.collection('accountEmailChanges').deleteOne({_id:userId});
          await scoped.collection('accountVerificationTokens').deleteMany({userId});
          await scoped.collection('verification').deleteMany({value:{$in:authUserFilter(userId)._id.$in}});
          for (const name of ['watchaTransactions','watchaEmailCodes','watchaDeletionConfirmations']) await scoped.collection(name).deleteMany({userId});
          await scoped.collection('session').deleteMany({userId:{$in:authUserFilter(userId)._id.$in}});
        });
      } catch (error) { if (error.code === 11000) throw fail(409,'此邮箱暂时无法用于更换，请使用其他邮箱'); throw error; }
      return {ok:true,signInRequired:true};
    },
  };
}

export function createAccountProfileRouter({auth,backend,frontendOrigins,isMaintenance=()=>false}) {
  const router=express.Router(), origins=new Set(frontendOrigins);
  const route=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
  // Install authentication before reading image bytes or any account state.
  router.use(async(req,res,next)=>{
    res.set('Cache-Control','no-store');
    try {
      if ((req.get('origin') && !origins.has(req.get('origin'))) || (req.method!=='GET' && !origins.has(req.get('origin')))) throw fail(403,'INVALID_ORIGIN');
      if (req.method!=='GET' && req.get('content-type')?.split(';')[0].trim()!=='application/json') throw fail(415,'JSON_REQUIRED');
      if (req.method!=='GET' && isMaintenance()) throw fail(503,'MAINTENANCE');
      const session=await auth.optionalSession(req);
      if (!session?.user?.id) throw fail(401,'SIGN_IN_REQUIRED');
      if (req.get('x-workspace-account')!==String(session.user.id)) throw fail(409,'ACCOUNT_CHANGED');
      if (!auth.accountProfile) throw fail(503,'个人资料服务暂不可用');
      await auth.accountProfile.active(String(session.user.id));
      req.profileSession=session; next();
    } catch(error){next(error);}
  });
  router.use(express.json({limit:'3mb'}));
  router.post('/avatar',route(async(req,res)=>res.json(await auth.accountProfile.avatar(req.profileSession,req.body?.base64))));
  router.post('/email/start',route(async(req,res)=>res.json(await auth.accountProfile.startEmail(req.profileSession,req.body?.newEmail,req.ip))));
  router.post('/email/confirm',route(async(req,res)=>res.json(await auth.accountProfile.confirmEmail(req.profileSession,req.body))));
  router.get('/activity',route(async(req,res)=>{
    const userId=String(req.profileSession.user.id);
    const result=await backend.call({action:'userDrawingActivity',userId},{},{authUserId:userId});
    if (result.status!==200 || result.data?.code || result.data?.activity?.contractVersion!==1) throw fail(503,'绘制活动暂时无法加载，请稍后重试');
    res.json(result.data.activity);
  }));
  router.use((error,_req,res,_next)=>{
    const status=Number.isInteger(error.status)?error.status:Number.isInteger(error.statusCode)?error.statusCode:503;
    res.status(status).json({error:status===429?'请求过于频繁，请稍后再试':Number.isInteger(error.status)&&status<500?error.message:'个人资料服务暂时不可用，请稍后重试'});
  });
  return router;
}
