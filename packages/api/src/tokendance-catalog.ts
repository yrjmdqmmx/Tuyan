// Live metadata is untrusted. Never derive invocation protocols from model names.
export type TokenDanceCatalogIssue = { id: string | null; index: number; reason: string }
export type TokenDanceCatalogModel = { id: string; supported_protocols: string[] }
export type TokenDanceCatalogSnapshot = {
  models: TokenDanceCatalogModel[]; issues: TokenDanceCatalogIssue[]; total: number;
  state: 'ready' | 'partial' | 'unavailable'; cause: string | null; checkedAt: number | null;
  expiresAt: number | null; stale: boolean; failureCount: number; alert: 'none' | 'warning' | 'critical';
}
export class TokenDanceCatalogError extends Error {
  constructor(public causeCode: string, public httpStatus?: number) { super('TokenDance catalog: ' + causeCode) }
}
const catalogIssueMessages: Record<string, string> = {
  protocol_changed: '调用协议与图研已审核的协议不一致', missing_live: '当前目录未列出该模型',
  row_type: '记录不是对象', id_missing: '缺少模型 ID', id_null: '模型 ID 为空值', id_type: '模型 ID 类型错误', id_invalid: '模型 ID 格式异常',
  protocols_missing: '缺少 supported_protocols 字段', protocols_null: 'supported_protocols 返回 null',
  protocols_type: 'supported_protocols 不是数组', protocols_empty: '未声明任何调用协议', protocols_item: '调用协议内容格式异常', duplicate_id: '模型 ID 重复，无法确认对应协议',
}
export function tokenDanceCatalogIssueMessage(reason: string) { return catalogIssueMessages[reason] || '模型目录数据异常' }
export function parseTokenDanceCatalog(value: unknown): Pick<TokenDanceCatalogSnapshot, 'models' | 'issues' | 'total'> {
  const data = (value as any)?.data
  if (!Array.isArray(data) || data.length > 5000) throw new TokenDanceCatalogError('envelope')
  const models: TokenDanceCatalogModel[] = [], issues: TokenDanceCatalogIssue[] = []
  const ids = new Map<string, number>()
  const safeId = (id: unknown): id is string => typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,159}$/.test(id) && !/^(sk-|Bearer|eyJ)/i.test(id)
  for (const row of data) if (safeId(row?.id)) ids.set(row.id, (ids.get(row.id) || 0) + 1)
  data.forEach((row, index) => {
    let reason = ''
    const id = safeId(row?.id) ? row.id : null
    if (!row || typeof row !== 'object' || Array.isArray(row)) reason = 'row_type'
    else if (!Object.hasOwn(row, 'id')) reason = 'id_missing'
    else if (row.id === null) reason = 'id_null'
    else if (typeof row.id !== 'string') reason = 'id_type'
    else if (!id) reason = 'id_invalid'
    else if (ids.get(id)! > 1) reason = 'duplicate_id'
    else if (!Object.hasOwn(row, 'supported_protocols')) reason = 'protocols_missing'
    else if (row.supported_protocols === null) reason = 'protocols_null'
    else if (!Array.isArray(row.supported_protocols)) reason = 'protocols_type'
    else if (!row.supported_protocols.length) reason = 'protocols_empty'
    else if (row.supported_protocols.length > 32 || row.supported_protocols.some((p: unknown) => typeof p !== 'string' || p.length > 160 || !/^[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+$/.test(p))) reason = 'protocols_item'
    if (reason) issues.push({ id, index, reason })
    else models.push({ id: id!, supported_protocols: [...new Set<string>(row.supported_protocols)] })
  })
  return { models, issues, total: data.length }
}

export function tokenDanceCatalogModelReason(snapshot: TokenDanceCatalogSnapshot, id: string, expectedProtocol: string): string | null {
  if (snapshot.stale || snapshot.cause && !['empty', 'all_invalid'].includes(snapshot.cause)) return '当前目录未能核实，已暂停调用；请稍后刷新目录。'
  const issue = snapshot.issues.find(issue => issue.id === id)
  if (issue) return tokenDanceCatalogIssueMessage(issue.reason) + '，已暂停调用；请等待供应商修复或主动选择其他模型。'
  const model = snapshot.models.find(model => model.id === id)
  if (!model) return '当前目录未列出该模型，已暂停调用；请刷新目录或主动选择其他模型。'
  if (!model.supported_protocols.includes(expectedProtocol)) return '当前调用协议与图研已审核的协议不一致，已暂停调用；请等待适配核验或主动选择其他模型。'
  return null
}

export function tokenDanceCatalogMessage(snapshot: TokenDanceCatalogSnapshot): string {
  const causeMessages: Record<string, string> = {
    envelope: '整个目录格式异常', timeout: '读取目录超时', network: '读取目录时网络连接失败',
    rejected: '目录接口拒绝访问', rate_limit: '目录接口限流', provider: '目录服务发生供应商异常',
    empty: '供应商返回空目录', all_invalid: '目录中的全部模型记录均异常',
  }
  if (snapshot.state === 'unavailable') return `观猹 TokenDance：${causeMessages[snapshot.cause || ''] || '目录暂不可用'}，暂不能确认模型可用性。${snapshot.stale ? '上次目录仅供查看，不能用于调用。' : ''}已保留原选择，请稍后重试目录或主动选择其他模型。`
  if (snapshot.state === 'partial') {
    const affected = [...new Set(snapshot.issues.map(issue => `${issue.id || '第 ' + (issue.index + 1) + ' 条记录'}（${tokenDanceCatalogIssueMessage(issue.reason)}）`))]
    return `观猹 TokenDance：已隔离 ${snapshot.issues.length} 条异常记录：${affected.slice(0, 5).join('、')}${affected.length > 5 ? '等' : ''}。其他 ${snapshot.models.length} 条记录可继续核验使用；已接入的正常模型不受此异常影响。请稍后刷新，或主动选择其他可用模型。`
  }
  return ''
}

// Only successful refreshes establish freshness. A failure never extends it.
// Stale data is bounded and display-only; invocation forces a read-only refresh.
export function createTokenDanceCatalogCache(options: {
  fetcher: (input: string, init: RequestInit) => Promise<Response>; now?: () => number;
  report?: (event: Record<string, unknown>) => void; appUrl: string;
  expectedModels?: { id: string; protocol: string }[];
  freshMs?: number; staleMs?: number; retryMs?: number; timeoutMs?: number;
}) {
  const now = options.now || Date.now
  const freshMs = options.freshMs ?? 60_000, staleMs = options.staleMs ?? 15 * 60_000, retryMs = options.retryMs ?? 10_000
  let last: TokenDanceCatalogSnapshot | null = null, current: TokenDanceCatalogSnapshot | null = null
  let pending: Promise<TokenDanceCatalogSnapshot> | null = null, retryAt = 0, count = 0, since = 0, lastReport = 0, lastSignature = ''
  function publish(snapshot: TokenDanceCatalogSnapshot, httpStatus?: number) {
    const unhealthy = snapshot.state !== 'ready'
    count = unhealthy ? count + 1 : 0
    if (!since && unhealthy) since = now()
    if (!unhealthy) since = 0
    snapshot.failureCount = count
    snapshot.alert = !unhealthy ? 'none' : snapshot.state === 'unavailable' || count >= 3 || now() - since >= 300_000 ? 'critical' : 'warning'
    const compatibleCount = options.expectedModels?.filter(expected => !tokenDanceCatalogModelReason(snapshot, expected.id, expected.protocol)).length
    if (compatibleCount === 0) snapshot.alert = 'critical'
    const signature = JSON.stringify([snapshot.state, snapshot.cause, snapshot.alert, snapshot.issues])
    if (signature !== lastSignature || unhealthy && now() - lastReport >= 60_000) {
      // No upstream body, descriptions, headers, keys, user data or exception text.
      options.report?.({ event: 'tokendance_catalog_health', level: snapshot.alert === 'critical' ? 'error' : unhealthy ? 'warn' : 'info',
        state: snapshot.state, cause: snapshot.cause, httpStatus, alert: snapshot.alert, consecutiveAnomalies: count,
        anomalySince: since || null, checkedAt: snapshot.checkedAt, stale: snapshot.stale, total: snapshot.total,
        valid: snapshot.models.length, compatibleCount, issueCount: snapshot.issues.length, issues: snapshot.issues.slice(0, 100) })
      lastSignature = signature; lastReport = now()
    }
    current = snapshot
    return snapshot
  }
  async function refresh() {
    try {
      const response = await options.fetcher('https://tokendance.space/gateway/v1/models', { headers: { 'X-App-URL': options.appUrl }, signal: AbortSignal.timeout(options.timeoutMs ?? 10_000) })
      if (!response.ok) throw new TokenDanceCatalogError(response.status === 429 ? 'rate_limit' : response.status >= 500 ? 'provider' : 'rejected', response.status)
      let body: unknown
      try { body = await response.json() } catch (error: any) {
        if (error instanceof SyntaxError) throw new TokenDanceCatalogError('envelope')
        throw error
      }
      const parsed = parseTokenDanceCatalog(body), checkedAt = now()
      for (const expected of options.expectedModels || []) {
        if (!parsed.models.length || parsed.issues.some(issue => issue.id === expected.id)) continue
        const live = parsed.models.find(model => model.id === expected.id)
        if (!live || !live.supported_protocols.includes(expected.protocol)) parsed.issues.push({ id: expected.id, index: -1, reason: live ? 'protocol_changed' : 'missing_live' })
      }
      const snapshot: TokenDanceCatalogSnapshot = { ...parsed, state: !parsed.models.length ? 'unavailable' : parsed.issues.length ? 'partial' : 'ready',
        cause: !parsed.total ? 'empty' : !parsed.models.length ? 'all_invalid' : null,
        checkedAt, expiresAt: checkedAt + freshMs, stale: false, failureCount: 0, alert: 'none' }
      last = snapshot; retryAt = 0
      return publish(snapshot)
    } catch (error: any) {
      const cause = error instanceof TokenDanceCatalogError ? error.causeCode : ['AbortError', 'TimeoutError'].includes(error?.name) ? 'timeout' : 'network'
      const retained = last && now() - last.checkedAt! <= staleMs ? last : null
      retryAt = now() + retryMs
      return publish({ models: retained?.models || [], issues: retained?.issues || [], total: retained?.total || 0,
        state: 'unavailable', cause, checkedAt: retained?.checkedAt ?? null, expiresAt: retained?.expiresAt ?? null,
        stale: Boolean(retained), failureCount: 0, alert: 'critical' }, error instanceof TokenDanceCatalogError ? error.httpStatus : undefined)
    }
  }
  return {
    async get(forCall = false): Promise<TokenDanceCatalogSnapshot> {
      if (pending) return pending
      if (current && now() < retryAt) {
        if (current.checkedAt !== null && now() - current.checkedAt > staleMs) current = { ...current, models: [], issues: [], total: 0, checkedAt: null, expiresAt: null, stale: false }
        return current
      }
      if (!forCall && current?.expiresAt && !current.stale && now() < current.expiresAt) return current
      pending = refresh()
      try { return await pending } finally { pending = null }
    },
  }
}
