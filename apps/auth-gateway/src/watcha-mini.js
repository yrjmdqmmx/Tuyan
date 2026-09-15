import { createHash, randomBytes } from 'node:crypto';

const opaque = () => randomBytes(32).toString('base64url');
const digest = value => createHash('sha256').update(value).digest('hex');
const valid = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);

// A launch link alone cannot log its creator in: the browser must return a second,
// independent code to the initiating mini-program cookie jar. Never poll to sign in.
export function createWatchaMiniBridge({ config, txs, accounts, now, endpoint, current, active, verified,
  browserHash, cookieName, cookieOptions, expiry, hmac, fail, createSession, authorizationUrl, readStatus }) {
  const clear = id => id ? txs.deleteMany({ $or: [{ _id: id }, { clientHash: id }, { browserHash: id }] }) : Promise.resolve();
  const result = (ctx, code = '') => {
    const nonce = opaque();
    ctx.setHeader('Content-Type', 'text/html; charset=utf-8');
    ctx.setHeader('Content-Security-Policy', `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`);
    const content = code
      ? `<p>请返回刚才发起授权的图研小程序，粘贴下方接续码。</p><p>仅用于你本人发起的本次操作。不要发送给他人。</p><input id="code" readonly value="${code}" aria-label="一次性接续码"><button id="copy">复制接续码</button><p id="notice" role="status">接续码短时有效，只能使用一次。</p><script nonce="${nonce}">document.getElementById('copy').onclick=async()=>{const input=document.getElementById('code');try{await navigator.clipboard.writeText(input.value);document.getElementById('notice').textContent='已复制，请返回图研小程序。'}catch{input.select();document.getElementById('notice').textContent='请长按选中接续码并复制。'}};</script>`
      : '<p>授权未完成或已过期。请返回图研小程序重新发起。</p>';
    return new Response(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>返回图研小程序</title><style>body{margin:0;background:#f6f5f0;color:#243c33;font:16px/1.7 system-ui}main{max-width:480px;margin:12vh auto;padding:28px}h1{font-size:26px}input,button{box-sizing:border-box;width:100%;padding:14px;border:1px solid #c9d2cb;border-radius:12px;font-size:16px}button{margin-top:14px;background:#315f51;color:white}p{color:#53665c}</style><main><h1>${code ? '观猹授权已完成' : '请重新授权'}</h1>${content}</main></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'` } });
  };
  return {
    result,
    async callback(ctx, row, identity) {
      if (!await txs.findOne({ _id: `mini:${row.clientHash}`, expiresAt: { $gt: now() } })) return result(ctx);
      if (row.userId) await active(row.userId, {}, row.generation);
      const binding = row.intent === 'login' ? await accounts.findOne({ providerId: 'watcha', accountId: identity.accountId }) : null;
      const linked = binding ? await active(String(binding.userId)) : null;
      const code = opaque();
      await txs.insertOne({ _id: digest(code), kind: 'mini-ready', ...identity, clientHash: row.clientHash,
        intent: row.intent, ...(row.userId ? { userId: row.userId, generation: row.generation, sessionBinding: row.sessionBinding } : linked ? { userId: String(binding.userId), generation: linked.generation } : {}),
        createdAt: now(), expiresAt: row.expiresAt });
      ctx.setCookie(cookieName, '', { ...cookieOptions, maxAge: 0 });
      return result(ctx, code);
    },
    endpoints: {
      watchaMiniStatus: endpoint('/watcha/mini-status', 'GET', async ctx => ctx.json({ ...await readStatus(ctx), miniProgramSupported: true })),
      watchaMiniStart: endpoint('/watcha/mini-start', 'POST', async ctx => {
        const intent = ctx.body?.intent;
        if (!['login', 'link'].includes(intent)) throw fail('INVALID_REQUEST');
        const session = await current(ctx, intent === 'link');
        if (intent === 'login' && session) throw fail('SIGN_OUT_REQUIRED', 'CONFLICT');
        if (session) verified(session);
        await clear(browserHash(ctx));
        const client = opaque(), ticket = opaque(), expiresAt = expiry();
        await txs.insertOne({ _id: digest(ticket), kind: 'mini-launch', clientHash: digest(client), intent,
          ...(session ? { userId: session.user.id, generation: session.generation, sessionBinding: hmac(session.session.token) } : {}), createdAt: now(), expiresAt });
        await txs.insertOne({ _id: `mini:${digest(client)}`, kind: 'mini-client', clientHash: digest(client), ...(session ? { userId: session.user.id } : {}), expiresAt });
        ctx.setCookie(cookieName, client, cookieOptions);
        return ctx.json({ url: `${config.authBaseUrl.replace(/\/$/, '')}/api/auth/watcha/mini-launch?state=${ticket}`, expiresAt: expiresAt.getTime() });
      }),
      watchaMiniLaunch: endpoint('/watcha/mini-launch', 'GET', async ctx => {
        const query = new URL(ctx.request.url).searchParams, ticket = query.get('state');
        if (!valid(ticket) || query.getAll('state').length !== 1) return result(ctx);
        const row = await txs.findOneAndDelete({ _id: digest(ticket), kind: 'mini-launch', expiresAt: { $gt: now() } });
        if (!row) return result(ctx);
        const state = opaque(), browserToken = opaque(), verifier = opaque();
        await txs.insertOne({ ...row, _id: digest(state), kind: 'state', browserHash: digest(browserToken), verifier });
        ctx.setCookie(cookieName, browserToken, cookieOptions);
        ctx.setCookie(`${cookieName}_mini`, '1', cookieOptions);
        return ctx.redirect(authorizationUrl(state, verifier));
      }),
      watchaMiniExchange: endpoint('/watcha/mini-exchange', 'POST', async ctx => {
        const code = ctx.body?.code, clientHash = browserHash(ctx);
        if (!valid(code) || !clientHash) throw fail('PENDING_EXPIRED');
        const query = { _id: digest(code), kind: 'mini-ready', clientHash, expiresAt: { $gt: now() } };
        const row = await txs.findOne(query);
        if (!row || !await txs.findOne({ _id: `mini:${clientHash}`, expiresAt: { $gt: now() } })) throw fail('PENDING_EXPIRED');
        const session = await current(ctx, row.intent === 'link');
        if (row.intent === 'login' && session) throw fail('SIGN_OUT_REQUIRED', 'CONFLICT');
        if (row.intent === 'link' && row.userId) {
          if (row.userId !== session?.user.id || row.sessionBinding !== hmac(session.session.token)) throw fail('ACCOUNT_CHANGED', 'FORBIDDEN');
          verified(session); await active(row.userId, {}, row.generation);
        }
        if (!await txs.findOneAndDelete(query)) throw fail('PENDING_EXPIRED');
        if ((await txs.deleteOne({ _id: `mini:${clientHash}`, expiresAt: { $gt: now() } })).deletedCount !== 1) throw fail('PENDING_EXPIRED');
        const binding = await accounts.findOne({ providerId: 'watcha', accountId: row.accountId });
        if (row.intent === 'login' && (row.userId || binding)) {
          if (!binding || String(binding.userId) !== row.userId) throw fail('BINDING_CONFLICT', 'CONFLICT');
          const found = await active(row.userId, {}, row.generation);
          await createSession(ctx, String(binding.userId), row.accountId, found.generation);
          ctx.setCookie(cookieName, '', { ...cookieOptions, maxAge: 0 });
          return ctx.json({ ok: true, status: 'complete' });
        }
        await txs.insertOne({ _id: clientHash, kind: 'pending', accountId: row.accountId, nickname: row.nickname, intent: row.intent,
          ...(row.userId ? { userId: row.userId, generation: row.generation, sessionBinding: row.sessionBinding } : {}), createdAt: now(), expiresAt: row.expiresAt });
        return ctx.json({ ok: true, status: 'pending' });
      }),
      watchaMiniCancel: endpoint('/watcha/mini-cancel', 'POST', async ctx => {
        await clear(browserHash(ctx));
        ctx.setCookie(cookieName, '', { ...cookieOptions, maxAge: 0 });
        return ctx.json({ ok: true });
      }),
    },
  };
}
