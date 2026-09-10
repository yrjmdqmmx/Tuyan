import { formatError, requestJson } from '../../utils/api'
import { refreshTokenDanceConnection, invalidateTokenDanceConnection, returnFromTokenDance } from '../../utils/tokendance'
import { getCurrentUser, subscribeSession } from '../../utils/session'

function paymentLabel(status: string): string {
  return ({ pending: '等待支付', paid: '已确认到账', closed: '订单已关闭', failed: '支付失败', refunded: '已退款', creating: '正在确认订单', unknown: '创建结果待核对' } as Record<string, string>)[status] || '状态待查询'
}

Component({
  data: { email: '', emailVerified: false, isLoggedIn: false, showAuthPanel: false, showAccountSettings: false, payments: [] as any[], historyLoaded: false, connected: false, busy: false, statusLoading: false, authorizationPending: false, hasCode: false, code: '', amount: '10', balance: '', error: '', notice: '', payment: null as any, attemptId: '', paymentUncertain: false, uncertainAttemptId: '' },
  pageLifetimes: {
    show() { (this as any).visible = true; void this.refresh(); this.pollPayment() },
    hide() { (this as any).visible = false; this.stopPolling(); (this as any).oneUseCode = ''; this.setData({ code: '', hasCode: false, showAuthPanel: false, showAccountSettings: false }) },
  },
  lifetimes: {
    attached() {
      ;(this as any).epoch = 0; (this as any).owner = getCurrentUser()?.id || ''
      ;(this as any).unsubscribe = subscribeSession(user => {
        if ((this as any).owner !== (user?.id || '')) { (this as any).owner = user?.id || ''; this.resetAccount(); if ((this as any).visible) void this.refresh() }
        this.setData({ email: user?.email || '', emailVerified: user?.emailVerified === true, isLoggedIn: Boolean(user) })
      })
    },
    detached() { (this as any).visible = false; this.resetAccount(); (this as any).unsubscribe?.() },
  },
  methods: {
    resetAccount() {
      ;(this as any).epoch++; this.stopPolling(); (this as any).flow = undefined; (this as any).oneUseCode = ''
      this.setData({ connected: false, busy: false, statusLoading: false, authorizationPending: false, code: '', hasCode: false, balance: '', email: '', emailVerified: false, isLoggedIn: false, showAccountSettings: false, showAuthPanel: false, payments: [], historyLoaded: false, error: '', notice: '', payment: null, attemptId: '', paymentUncertain: false, uncertainAttemptId: '' })
    },
    current(epoch: number) { return epoch === (this as any).epoch && Boolean(getCurrentUser()?.id) && (this as any).owner === getCurrentUser()?.id },
    async accountRequest(body: Record<string, unknown>): Promise<any> {
      const epoch = (this as any).epoch
      if (!this.current(epoch)) throw new Error('请先登录图研。')
      const result = await requestJson(body)
      if (!this.current(epoch)) throw new Error('账户已切换，请重新操作。')
      return result
    },
    openWatcha() { wx.navigateTo({ url: '/pages/watcha/watcha' }) },
    openAuthPanel() { this.setData({ showAuthPanel: true }) },
    closeAuthPanel() { this.setData({ showAuthPanel: false }) },
    onAuthed() { this.closeAuthPanel(); void this.refresh() },
    manageAccount() { if (getCurrentUser()) this.setData({ showAccountSettings: true }); else this.openAuthPanel() },
    closeAccountSettings() { this.setData({ showAccountSettings: false }) },
    returnToTask: returnFromTokenDance,
    async refresh() {
      const epoch = (this as any).epoch
      this.setData({ email: getCurrentUser()?.email || '', emailVerified: getCurrentUser()?.emailVerified === true, isLoggedIn: Boolean(getCurrentUser()), statusLoading: true })
      const status = await refreshTokenDanceConnection()
      if (epoch !== (this as any).epoch) return
      this.setData({ connected: status.connected, statusLoading: false, error: status.error || (status.available === false ? '观猹 TokenDance 暂不可用，请稍后刷新。' : '') })
      const flow = (this as any).flow
      if (flow && flow.expiresAt <= Date.now()) { (this as any).flow = undefined; this.setData({ authorizationPending: false, hasCode: false, code: '', notice: '授权链接已过期，请重新连接。' }) }
    },
    async authorize() {
      if (!getCurrentUser()) { this.openAuthPanel(); return }
      if (this.data.busy || this.data.authorizationPending) return
      const epoch = (this as any).epoch
      this.setData({ busy: true, error: '', code: '', hasCode: false }); (this as any).oneUseCode = ''
      try {
        const result = await this.accountRequest({ action: 'tokenDanceAuthorize', platform: 'miniprogram' })
        if (!/^https:\/\/tokendance\.space\//.test(result.authorizationUrl || '') || typeof result.state !== 'string') throw new Error('授权链接无效，请稍后重试。')
        ;(this as any).flow = { state: result.state, url: result.authorizationUrl, expiresAt: Date.parse(result.expiresAt) || Date.now() + 600000 }
        this.setData({ authorizationPending: true, notice: '在系统浏览器打开授权链接，完成后将一次性 code 粘贴回来。请在 10 分钟内完成。' }); this.copyAuthorization()
      } catch (error) { if (this.current(epoch)) this.setData({ error: formatError(error) }) } finally { if (this.current(epoch)) this.setData({ busy: false }) }
    },
    copyAuthorization() { const flow = (this as any).flow; if (flow && flow.expiresAt > Date.now()) wx.setClipboardData({ data: flow.url }) },
    codeInput(event: WechatMiniprogram.Input) { (this as any).oneUseCode = event.detail.value.slice(0, 2048); this.setData({ hasCode: Boolean(event.detail.value.trim()) }) },
    amountInput(event: WechatMiniprogram.Input) { this.setData({ amount: event.detail.value }) },
    async exchange() {
      const flow = (this as any).flow, code = String((this as any).oneUseCode || '').trim(), epoch = (this as any).epoch
      if (this.data.busy || !flow || !code) return
      ;(this as any).oneUseCode = ''; this.setData({ busy: true, code: '', hasCode: false, error: '' })
      try {
        if (flow.expiresAt <= Date.now()) throw new Error('授权已过期，请取消后重新连接。')
        await this.accountRequest({ action: 'tokenDanceExchange', state: flow.state, code })
        if ((this as any).flow !== flow) return
        ;(this as any).flow = undefined
        this.setData({ authorizationPending: false, notice: '观猹 TokenDance 已连接，可以返回原任务。' }); await this.refresh()
      } catch (error) { if (this.current(epoch)) this.setData({ error: formatError(error) }) } finally { if (this.current(epoch)) this.setData({ busy: false }) }
    },
    async cancel() {
      const flow = (this as any).flow, epoch = (this as any).epoch
      if (!flow) return
      ;(this as any).flow = undefined; (this as any).oneUseCode = ''; this.setData({ authorizationPending: false, code: '', hasCode: false })
      try { await this.accountRequest({ action: 'tokenDanceCancel', state: flow.state }); this.setData({ notice: '授权已取消。' }) }
      catch (error) { if (this.current(epoch)) this.setData({ error: formatError(error) }) }
    },
    async disconnect() {
      if (this.data.busy) return
      const epoch = (this as any).epoch; this.setData({ busy: true })
      try { await this.accountRequest({ action: 'tokenDanceDisconnect' }); invalidateTokenDanceConnection(); this.stopPolling(); (this as any).flow = undefined; this.setData({ connected: false, balance: '', payment: null, authorizationPending: false, notice: '已解除图研连接。远端 Key 如需撤销，请到观猹 TokenDance 密钥管理操作。' }) }
      catch (error) { if (this.current(epoch)) this.setData({ error: formatError(error) }) } finally { if (this.current(epoch)) this.setData({ busy: false }) }
    },
    async queryBalance() {
      const epoch = (this as any).epoch
      try { const result = await this.accountRequest({ action: 'tokenDanceBalance' }); if (!Number.isSafeInteger(result.wallet?.balance)) throw new Error('余额数据暂不可识别，请重试。'); this.setData({ balance: (result.wallet.balance / 1000000).toFixed(6), error: '' }) }
      catch (error) { if (this.current(epoch)) this.setData({ error: formatError(error) }) }
    },
    async createPayment() {
      const amount = Number(this.data.amount)
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000) { this.setData({ error: '请输入 1 至 100000 元的整数。' }); return }
      if (this.data.busy) return
      if (this.data.paymentUncertain || this.data.payments.some(item => ['unknown', 'creating'].includes(item.state) || (item.session?.status === 'pending' && item.session.expired_at * 1000 > Date.now())) || (this.data.payment?.status === 'pending' && this.data.payment.expired_at * 1000 > Date.now())) { this.setData({ error: '已有待支付或待核对的订单，请先刷新充值记录。' }); return }
      const epoch = (this as any).epoch, attemptId = `mini-${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
      this.setData({ busy: true, error: '', attemptId })
      try { const result = await this.accountRequest({ action: 'tokenDancePaymentCreate', amount, attemptId }); this.setData({ payment: result.session }); this.pollPayment() }
      catch (error) { if (this.current(epoch)) this.setData({ paymentUncertain: true, uncertainAttemptId: attemptId, error: formatError(error) + ' 请先刷新充值记录核对，避免重复创建。' }) } finally { if (this.current(epoch)) this.setData({ busy: false }) }
    },
    copyAlipay() { if (/^alipays:\/\/platformapi\/startapp\?/.test(this.data.payment?.alipay_url || '')) { wx.setClipboardData({ data: this.data.payment.alipay_url }); this.setData({ notice: '请将支付宝链接粘贴到系统浏览器，或用图研网页完成充值。返回后查询到账状态。' }) } },
    openWebWallet() { wx.setClipboardData({ data: 'https://www.paperbanana.asia/?view=account' }); this.setData({ notice: '已复制图研账户入口，请用系统浏览器打开，并登录同一图研账号。' }) },
    async recentPayments() {
      const epoch = (this as any).epoch
      try {
        const result = await this.accountRequest({ action: 'tokenDancePayments' })
        if (!Array.isArray(result.payments)) throw new Error('充值记录暂不可用，请重试。')
        const ownAttempt = result.payments.find((item: any) => item.attemptId === (this.data.uncertainAttemptId || this.data.attemptId))
        this.setData({ historyLoaded: true, payments: result.payments.map((item: any) => ({ ...item, statusText: paymentLabel(item.session?.status || item.state), createdText: item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN', { hour12: false }) : '' })), ...(ownAttempt && !['unknown', 'creating'].includes(ownAttempt.state) ? { paymentUncertain: false, uncertainAttemptId: '' } : {}) })
        const row = result.payments.find((item: any) => item.session?.status === 'pending') || result.payments.find((item: any) => item.session)
        if (row) { this.setData({ payment: row.session, attemptId: row.attemptId }); this.pollPayment() }
        this.setData({ notice: result.payments.length ? '到账以订单状态查询为准，待核对的订单请勿重复创建。' : '暂无充值记录。' })
      } catch (error) { if (this.current(epoch)) this.setData({ error: formatError(error) }) }
    },
    async queryHistoryPayment(event: WechatMiniprogram.TouchEvent) {
      const row = this.data.payments.find(item => item.attemptId === event.currentTarget.dataset.attemptId)
      if (row?.session) { this.stopPolling(); this.setData({ payment: row.session, attemptId: row.attemptId }); await this.paymentStatus(); this.pollPayment() }
    },
    async paymentStatus() {
      if (!this.data.attemptId || (this as any).statusInFlight) return
      const epoch = (this as any).epoch, attemptId = this.data.attemptId
      ;(this as any).statusInFlight = true
      try {
        const result = await this.accountRequest({ action: 'tokenDancePaymentStatus', attemptId })
        if (this.data.attemptId !== attemptId) return
        this.setData({ payment: result.session, payments: this.data.payments.map(item => item.attemptId === attemptId ? { ...item, session: result.session, statusText: paymentLabel(result.session.status) } : item) })
        if (result.session.status === 'paid') { this.setData({ notice: '充值已确认到账，可以返回原任务继续。' }); void this.queryBalance() }
        if (result.session.status !== 'pending' || result.session.expired_at * 1000 < Date.now()) this.stopPolling()
      } catch (error) { if (this.current(epoch)) { this.stopPolling(); this.setData({ error: formatError(error) }) } }
      finally { (this as any).statusInFlight = false }
    },
    pollPayment() { this.stopPolling(); if ((this as any).visible && this.data.payment?.status === 'pending' && this.data.payment.expired_at * 1000 > Date.now()) (this as any).paymentTimer = setInterval(() => { void this.paymentStatus() }, 3000) },
    stopPolling() { if ((this as any).paymentTimer) clearInterval((this as any).paymentTimer); (this as any).paymentTimer = null },
  },
})
