import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { Db } from 'mongodb'
import { TOKENDANCE_APP_URL, TOKENDANCE_ORIGIN, TokenDanceError, tokenDanceAmount, tokenDanceBalance, tokenDanceJson, tokenDanceResponse } from '../../../packages/api/src/tokendance.js'

export function tokenDanceCipher(secret: string) {
  const key = Buffer.from(secret, 'base64')
  if (key.length !== 32 || key.toString('base64') !== secret) throw new Error('TOKENDANCE_ENCRYPTION_KEY must be canonical base64 of 32 random bytes')
  return {
    seal(value: unknown, owner: string) {
      const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv)
      cipher.setAAD(Buffer.from(owner))
      const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()])
      return { v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') }
    },
    open(value: any, owner: string): any {
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64'))
      decipher.setAAD(Buffer.from(owner)); decipher.setAuthTag(Buffer.from(value.tag, 'base64'))
      return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString())
    },
  }
}

const publicSession = (session: any) => Object.fromEntries(['id', 'amount', 'status', 'payment_url', 'alipay_url', 'expired_at', 'created_at', 'paid_at'].filter(k => session[k] !== undefined).map(k => [k, session[k]]))
const idPattern = /^[A-Za-z0-9_-]{1,160}$/

export function createTokenDanceService({ db, fetcher = fetch, secret = '', callbackUrl = TOKENDANCE_APP_URL, managementKey = '', applicationId = '01M22GYKP6XTME912AJ18BK2S9', now = () => Date.now() }: {
  db: Db; fetcher?: typeof fetch; secret?: string; callbackUrl?: string; managementKey?: string; applicationId?: string; now?: () => number
}) {
  const cipher = secret ? tokenDanceCipher(secret) : null
  const connections = db.collection<any>('paperbanana_tokendance_connections')
  const flows = db.collection<any>('paperbanana_tokendance_flows')
  const payments = db.collection<any>('paperbanana_tokendance_payments')
  const callback = new URL(callbackUrl)
  if (callback.origin !== new URL(TOKENDANCE_APP_URL).origin && !['localhost', '127.0.0.1'].includes(callback.hostname)) throw new Error('观猹 TokenDance callback must be first party or explicit local test URL')
  if (callback.hash || callback.username || callback.password) throw new Error('Invalid TokenDance callback URL')
  const request = async (path: string, key: string, body?: unknown) => tokenDanceJson(await tokenDanceResponse(fetcher, path, key, body, AbortSignal.timeout(30_000)))
  const enabled = () => { if (!cipher) throw new TokenDanceError(503, '观猹 TokenDance 连接服务尚未配置。') }
  const owner = (userId: string) => { if (!/^[A-Za-z0-9._:-]{3,200}$/.test(userId) || userId.startsWith('guest:')) throw new TokenDanceError(401, '请先登录图研。'); return userId }
  async function accepting(userId: string) {
    owner(userId)
    const head = await db.collection<any>('paperbanana_account_deletions').findOne({ _id: `user:${userId}` })
    if (head && !(head.contractVersion === 3 && head.status === 'active')) throw new TokenDanceError(409, '账号注销处理中，暂不可操作。')
  }
  async function credential(userId: string) {
    enabled(); await accepting(userId)
    const row = await connections.findOne({ _id: userId })
    if (!row) throw new TokenDanceError(401, '请先连接观猹 TokenDance。', 'reauthorize_api_key')
    return { key: cipher!.open(row.secret, userId).key as string, version: row.version as string }
  }
  async function begin(userId: string, platform: unknown) {
    enabled(); await accepting(userId)
    const state = randomBytes(32).toString('base64url'), verifier = randomBytes(48).toString('base64url')
    const at = new Date(now()), expiresAt = new Date(now() + 10 * 60_000)
    const count = await flows.countDocuments({ userId, createdAt: { $gt: new Date(now() - 60_000) } })
    if (count >= 5) throw new TokenDanceError(429, '授权发起过于频繁，请稍后重试。', 'rate_limit', 60)
    await flows.updateMany({ userId, status: { $in: ['pending', 'exchanging', 'saving'] } }, { $set: { status: 'superseded' }, $unset: { secret: '' } })
    await flows.insertOne({ _id: state, userId, status: 'pending', secret: cipher!.seal({ verifier }, userId + ':' + state), createdAt: at, expiresAt })
    const authorization = new URL('/auth', TOKENDANCE_ORIGIN)
    authorization.searchParams.set('app_url', TOKENDANCE_APP_URL)
    authorization.searchParams.set('code_challenge', createHash('sha256').update(verifier).digest('base64url'))
    authorization.searchParams.set('code_challenge_method', 'S256')
    authorization.searchParams.set('key_name', '图研 Tuyan')
    if (platform !== 'miniprogram') {
      const target = new URL(callback)
      target.searchParams.set('tokendance_callback', '1'); target.searchParams.set('state', state)
      authorization.searchParams.set('callback_url', target.toString())
    }
    return { state, authorizationUrl: authorization.toString(), expiresAt: expiresAt.toISOString(), mode: platform === 'miniprogram' ? 'manual-code' : 'redirect' }
  }
  async function exchange(userId: string, state: unknown, code: unknown) {
    enabled(); await accepting(userId)
    if (typeof state !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(state) || typeof code !== 'string' || code.length < 1 || code.length > 2048) throw new TokenDanceError(400, '授权回调参数无效。')
    const flow = await flows.findOneAndUpdate({ _id: state, userId, status: 'pending', expiresAt: { $gt: new Date(now()) } }, { $set: { status: 'exchanging' } }, { returnDocument: 'before' })
    if (!flow) throw new TokenDanceError(409, '授权流程已过期、被使用或不属于当前账号，请重新授权。', 'reauthorize_api_key')
    try {
      const { verifier } = cipher!.open(flow.secret, userId + ':' + state)
      const data = await request('/portal/api/v1/auth/keys', '', { code, code_verifier: verifier, code_challenge_method: 'S256' })
      if (typeof data.key !== 'string' || !data.key.trim() || data.key.length > 8192) throw new TokenDanceError(502, '授权交换响应不完整，请重新授权。', 'reauthorize_api_key', 0, true)
      await accepting(userId)
      // Cancellation/disconnect while the exchange is in flight cannot install a key.
      const active = await flows.findOneAndUpdate({ _id: state, userId, status: 'exchanging' }, { $set: { status: 'saving' } }, { returnDocument: 'after' })
      if (!active) throw new TokenDanceError(409, '授权已取消，请重新授权。')
      await connections.updateOne({ _id: userId }, { $set: { secret: cipher!.seal({ key: data.key }, userId), version: state, connectedAt: new Date(now()) } }, { upsert: true })
      if (!(await flows.findOne({ _id: state, userId, status: 'saving' }))) {
        await connections.deleteOne({ _id: userId, version: state }); throw new TokenDanceError(409, '授权已取消。')
      }
      await flows.updateOne({ _id: state, userId, status: 'saving' }, { $set: { status: 'complete' }, $unset: { secret: '' } })
      return { connected: true }
    } catch (error) {
      await flows.updateOne({ _id: state, userId }, { $set: { status: 'failed' }, $unset: { secret: '' } })
      if (error instanceof TokenDanceError) throw error
      throw new TokenDanceError(502, '授权未完成，请重新授权。', 'reauthorize_api_key')
    }
  }
  function validateSession(session: any, expectedAmount: number, expectedId?: string) {
    if (!session || typeof session.id !== 'string' || !idPattern.test(session.id) || (expectedId && session.id !== expectedId) || session.amount !== expectedAmount || !['pending', 'paid', 'failed', 'closed', 'refunded'].includes(session.status) || !Number.isSafeInteger(session.expired_at) || session.expired_at <= 0 || !Number.isSafeInteger(session.created_at) || session.created_at <= 0) throw new TokenDanceError(502, '支付状态格式无效，请核对观猹 TokenDance 订单。', 'review_request', 0, true)
    if (session.status_url !== `${TOKENDANCE_ORIGIN}/portal/api/v1/payment/sessions/${session.id}`) throw new TokenDanceError(502, '支付查询地址无效。', 'review_request', 0, true)
    if (session.payment_url && !/^https:\/\//.test(session.payment_url)) throw new TokenDanceError(502, '支付二维码内容无效。')
    if (session.alipay_url && !/^alipays:\/\/platformapi\/startapp\?/.test(session.alipay_url)) throw new TokenDanceError(502, '支付宝地址无效。')
    if (session.status === 'paid' && !Number.isSafeInteger(session.paid_at)) throw new TokenDanceError(502, '支付到账时间尚未确认。')
    return session
  }
  async function createPayment(userId: string, value: unknown, attemptId: unknown) {
    const amount = tokenDanceAmount(value)
    if (typeof attemptId !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(attemptId)) throw new TokenDanceError(400, '缺少支付请求编号。')
    const { key, version } = await credential(userId), id = userId + ':' + attemptId
    const existing = await payments.findOne({ _id: id })
    if (existing) {
      if (existing.amount !== amount) throw new TokenDanceError(409, '支付请求编号与金额不匹配。')
      if (existing.session) return { session: publicSession(existing.session), attemptId }
      throw new TokenDanceError(409, '支付创建结果尚未确认，请在观猹 TokenDance 核对订单后再操作。', 'review_request', 0, true)
    }
    await payments.updateMany({ userId, active: true, expiresAt: { $lte: new Date(now()) } }, { $set: { active: false } })
    const pending = await payments.countDocuments({ userId, active: true, expiresAt: { $gt: new Date(now()) } })
    if (pending) throw new TokenDanceError(409, '已有待支付或待核对的订单，请先查看充值记录。')
    try { await payments.insertOne({ _id: id, userId, amount, active: true, state: 'creating', createdAt: new Date(now()), expiresAt: new Date(now() + 86400_000), secret: cipher!.seal({ key }, id) }) }
    catch { throw new TokenDanceError(409, '该支付请求正在处理。') }
    try {
      await accepting(userId)
      if (!(await connections.findOne({ _id: userId, version }))) throw new TokenDanceError(401, '连接已变更，请重新操作。', 'reauthorize_api_key')
      const data = await request('/portal/api/v1/payment/sessions', key, { amount })
      await accepting(userId)
      const session = validateSession(data.session, amount)
      await payments.updateOne({ _id: id }, { $set: { session, state: session.status, active: session.status === 'pending' && session.expired_at * 1000 > now() } })
      return { session: publicSession(session), attemptId }
    } catch (error) {
      // A malformed 2xx reply or a failed DB write can still mean the order was
      // created upstream. Only an explicit non-5xx rejection allows a new POST.
      const uncertain = !(error instanceof TokenDanceError) || error.uncertain || error.status >= 500
      await payments.updateOne({ _id: id }, { $set: { state: uncertain ? 'unknown' : 'failed', active: uncertain }, $unset: { secret: '' } })
      throw error
    }
  }
  async function paymentStatus(userId: string, attemptId: unknown) {
    enabled(); await accepting(userId)
    const id = userId + ':' + String(attemptId || '')
    const row = await payments.findOne({ _id: id, userId })
    if (!row?.session) throw new TokenDanceError(404, '未找到可查询的充值订单。')
    const poll = await payments.updateOne({ _id: id, userId, $or: [{ checkedAt: { $exists: false } }, { checkedAt: { $lte: new Date(now() - 3000) } }] }, { $set: { checkedAt: new Date(now()) } })
    if (!poll.modifiedCount) return { session: publicSession(row.session), attemptId }
    const { key } = row.secret ? cipher!.open(row.secret, id) : await credential(userId)
    // Never accept a status URL from a client or append their arbitrary path.
    const path = new URL(row.session.status_url).pathname
    let data
    try { data = await request(path, key) }
    catch (error) {
      // Reauthorization may revoke the order's captured key. Retry this GET
      // once with the same owner's current key only after an explicit rejection.
      if (!(error instanceof TokenDanceError) || error.uncertain || error.recoveryAction !== 'reauthorize_api_key') throw error
      const current = await credential(userId)
      if (current.key === key) throw error
      data = await request(path, current.key)
    }
    if (!data.session?.id || typeof data.session.status !== 'string') throw new TokenDanceError(502, '支付状态尚未确认。')
    const session = validateSession({ ...row.session, ...data.session }, row.amount, row.session.id)
    await payments.updateOne({ _id: id, userId }, { $set: { session, state: session.status, active: session.status === 'pending' && session.expired_at * 1000 > now(), checkedAt: new Date(now()) } })
    return { session: publicSession(session), attemptId }
  }
  async function remove(userId: string) {
    await flows.updateMany({ userId }, { $set: { status: 'cancelled' }, $unset: { secret: '' } })
    await connections.deleteOne({ _id: userId })
    await payments.updateMany({ userId }, { $unset: { secret: '' } })
  }
  return {
    cipher, credential, remove, accepting,
    async eraseUserData(userId: string) {
      await remove(userId)
      await flows.deleteMany({ userId })
      await payments.deleteMany({ userId })
    },
    async ensureIndexes() {
      await flows.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      await flows.createIndex({ userId: 1, createdAt: -1 })
      await payments.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      await payments.createIndex({ userId: 1, createdAt: -1 })
      await payments.createIndex({ userId: 1 }, { unique: true, partialFilterExpression: { active: true } })
    },
    async handle(body: Record<string, any>, userId: string, isAdmin = false): Promise<any> {
      if (body.action === 'adminTokenDancePricing') {
        if (!isAdmin) throw new TokenDanceError(403, '需要站长身份。')
        if (!managementKey) return { code: 0, available: false, reason: '尚未配置产品方管理凭据。', pricingUrl: TOKENDANCE_ORIGIN + '/application/pricing' }
        if (!idPattern.test(applicationId)) throw new TokenDanceError(503, '产品方应用 ID 配置无效。')
        const response = await tokenDanceResponse(fetcher, `/portal/api/v1/applications/${applicationId}/profit-share/pricing`, managementKey, undefined, AbortSignal.timeout(30_000))
        const text = await response.text()
        if (text.length > 1_000_000) throw new TokenDanceError(502, '分润价目响应过大。')
        return { code: 0, available: true, markdown: text.split(managementKey).join('[redacted]'), kind: 'estimated-unit-share', settledIncome: null }
      }
      await accepting(userId)
      switch (body.action) {
        case 'tokenDanceStatus': {
          const row = cipher ? await connections.findOne({ _id: userId }) : null
          return { code: 0, available: Boolean(cipher), connected: Boolean(row), connectedAt: row?.connectedAt || null, appUrl: TOKENDANCE_APP_URL, remoteRevokeSupported: false }
        }
        case 'tokenDanceAuthorize': return { code: 0, ...await begin(userId, body.platform) }
        case 'tokenDanceExchange': return { code: 0, ...await exchange(userId, body.state, body.code) }
        case 'tokenDanceCancel':
          await flows.updateOne({ _id: String(body.state || ''), userId }, { $set: { status: 'cancelled' }, $unset: { secret: '' } })
          return { code: 0, cancelled: true }
        case 'tokenDanceDisconnect': await remove(userId); return { code: 0, connected: false, remoteRevoked: false }
        case 'tokenDanceBalance': return { code: 0, wallet: tokenDanceBalance(await request('/portal/api/v1/user/balance', (await credential(userId)).key)) }
        case 'tokenDancePaymentCreate': return { code: 0, ...await createPayment(userId, body.amount, body.attemptId) }
        case 'tokenDancePaymentStatus': return { code: 0, ...await paymentStatus(userId, body.attemptId) }
        case 'tokenDancePayments': return { code: 0, payments: (await payments.find({ userId }).sort({ createdAt: -1 }).limit(10).toArray()).map(row => ({ attemptId: row._id.slice(userId.length + 1), amount: row.amount, state: row.state, createdAt: row.createdAt?.toISOString(), checkedAt: row.checkedAt?.toISOString(), ...(row.session ? { session: publicSession(row.session) } : {}) })) }
        default: throw new TokenDanceError(400, '不受支持的观猹 TokenDance 操作。')
      }
    },
  }
}
