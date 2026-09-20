import prices from '../data/benchmarkOfficialPrices.json'
import testCosts from '../data/benchmarkTestCosts.json'

export const OFFICIAL_PRICES = prices
export const TEST_COSTS = testCosts

// Keep decimal prices and FX exact through aggregation and dominance checks.
const gcd = (a, b) => b === 0n ? a : gcd(b, a % b)
function fraction(n, d = 1n) {
  if (d <= 0n || n < 0n) throw new Error('Invalid nonnegative price')
  const g = gcd(n, d)
  return { n: n / g, d: d / g }
}
export function decimal(value) {
  if (!/^\d*\.?\d+$/.test(String(value))) throw new Error('Invalid price decimal')
  const [whole, part = ''] = String(value).split('.')
  return fraction(BigInt((whole || '0') + part), 10n ** BigInt(part.length))
}
const add = (a, b) => fraction(a.n * b.d + b.n * a.d, a.d * b.d)
const multiply = (a, b) => fraction(a.n * b.n, a.d * b.d)
const divide = (a, b) => fraction(a.n * b.d, a.d * b.n)
export const compareCost = (a, b) => a.n * b.d < b.n * a.d ? -1 : a.n * b.d > b.n * a.d ? 1 : 0
export const costNumber = (a) => Number(a.n) / Number(a.d)
export const formatCost = (value) => `$${Number(value).toFixed(5).replace(/0+$/, '').replace(/\.$/, '')}`

export function megapixels(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) throw new Error('Missing dimensions')
  return Math.ceil(width * height / 1048576)
}

export function slotCost(rule, slot, sourceImage) {
  const edit = slot.kind === 'edit'
  if (rule.kind === 'per_image') return add(decimal(rule.output), decimal(edit ? rule.input : '0'))
  if (rule.kind === 'per_operation') return decimal(edit ? rule.edit : rule.generation)
  if (rule.kind === 'pixel_tier') {
    megapixels(slot.width, slot.height)
    return add(decimal(slot.width * slot.height <= rule.threshold ? rule.low : rule.high), decimal(edit ? rule.input : '0'))
  }
  if (rule.kind === 'bfl_mp') {
    const outputMp = megapixels(slot.width, slot.height)
    const inputMp = edit ? megapixels(sourceImage.width, sourceImage.height) : 0
    if (outputMp > 4 || inputMp > 4) throw new Error('Dimensions outside verified billing range')
    return add(add(decimal(rule.first), multiply(decimal(rule.additional), decimal(outputMp - 1))), multiply(decimal(rule.input), decimal(inputMp)))
  }
  throw new Error('Unverified billing rule')
}

function bindingMatches(model, entry, catalog) {
  const evidence = model.evidence || []
  if (evidence.length !== 9 || entry.binding?.length !== 9 || new Set(evidence.map(s => s.caseId)).size !== 9) return false
  if (new Set(entry.binding.map(s => s.caseId)).size !== 9) return false
  if (entry.binding.filter(s => s.kind === 'generation').length !== 6 || entry.binding.filter(s => s.kind === 'edit').length !== 3) return false
  return entry.binding.every(bound => {
    const actual = evidence.find(s => s.caseId === bound.caseId)
    if (!actual || !catalog.caseIds.includes(bound.caseId)) return false
    if (bound.kind === 'edit' && bound.sourceHash !== catalog.sourceImage.hash) return false
    return ['kind', 'status', 'imageHash', 'sourceHash', 'requestedResolution'].every(k => (actual[k] ?? null) === bound[k]) &&
      (actual.actualOutputPixels?.width ?? null) === bound.width && (actual.actualOutputPixels?.height ?? null) === bound.height
  })
}

export function officialPrice(model, catalog = prices) {
  const entry = catalog.models.find(p => p.modelId === model.modelId)
  if (!entry) return { status: 'unconfirmed', reason: '官方价格待确认：此准确模型 ID 尚未核实。', sources: [] }
  if (!['comparable', 'estimated'].includes(entry.status)) return entry
  if (!bindingMatches(model, entry, catalog)) return { ...entry, status: 'conditions_missing', reason: '当前九题产物或计价条件与已核实快照不一致，需重新核对价格适用条件。' }
  try {
    // Every original slot has weight 1/9, including failures. Never divide by successful images.
    const slots = entry.binding.map(s => ({ caseId: s.caseId, kind: s.kind, cost: slotCost(entry.rule, s, catalog.sourceImage) }))
    const native = divide(slots.reduce((sum, s) => add(sum, s.cost), decimal('0')), decimal('9'))
    const exact = entry.currency === 'USD' ? native : entry.currency === 'CNY' ? multiply(native, divide(decimal(catalog.fx.USD), decimal(catalog.fx.CNY))) : null
    if (!exact || exact.n <= 0n) throw new Error('No comparable positive cost')
    return { ...entry, exact, usd: costNumber(exact), native: costNumber(native), slots }
  } catch {
    return { ...entry, status: 'conditions_missing', reason: '原题位的完整计费量或币种换算尚不可核验，暂不参与成本比较。' }
  }
}

// Only the seven explicitly authorized models may use their reconciled test bills.
// Keep this snapshot separate from the official price audit and original evidence.
export function comparisonPrice(model, basis = 'combined', catalog = testCosts) {
  const official = { ...officialPrice(model), costBasis: 'official' }
  const entry = catalog.models.find(p => p.modelId === model.modelId)
  if (basis === 'official' || !entry) return official
  const unavailable = reason => ({ ...official, status: 'conditions_missing', reason })
  if (model.profileId !== entry.profileId || !bindingMatches(model, entry, catalog)) {
    return unavailable('测试账单与当前模型或九题产物不一致，需重新核对；未知费用不记为零。')
  }
  try {
    const slots = entry.binding.map(s => {
      const bill = s.billing
      if (bill?.basis !== 'invoice_reconciled' || bill.currency !== 'USD' ||
        !/^[a-f0-9]{64}$/.test(bill.evidenceHash || '') || !Number.isFinite(Date.parse(bill.verifiedAt))) {
        throw new Error('Incomplete reconciled invoice')
      }
      return { caseId: s.caseId, kind: s.kind, cost: decimal(bill.amount), billing: bill }
    })
    const total = slots.reduce((sum, s) => add(sum, s.cost), decimal('0'))
    if (entry.currency !== 'USD' || total.n <= 0n || compareCost(total, decimal(entry.total)) !== 0) throw new Error('Invoice total mismatch')
    const exact = divide(total, decimal('9'))
    return {
      ...official, status: 'comparable', costBasis: 'test', reason: '', exact, usd: costNumber(exact),
      native: costNumber(exact), currency: 'USD', slots, total: entry.total, profileId: entry.profileId,
      channel: entry.channel, checkedAt: catalog.checkedAt,
      generationApi: `原测试渠道：Replicate 官方模型 ${model.modelId}（生成）`,
      editApi: `原测试渠道：Replicate 官方模型 ${model.modelId}（编辑，1 张源图）`,
      rateText: `九题账单已核对：USD ${entry.total} ÷ 9 = ${costNumber(exact)} USD/张。`,
      conditions: '原正式测试的 6 道生成 + 3 道编辑，9/9 题账单已核对；含题位内的调用尝试。历史渠道费用，不代表当前厂商直营标准价。',
      calculation: '采用当前公开九题逐题 invoice_reconciled 金额之和 ÷ 9；不按成功图片数重新加权，不改写历史费用。',
      feeBreakdown: {
        imageOutput: '包含在已核对的完整请求账单金额中',
        textInput: '沿用原完整账单，不将缺失的费用拆分项假定为零',
        referenceInput: '三个编辑题的完整账单金额已纳入',
        otherRequired: '含公开题位内调用尝试；不计审评费用，不额外补加标准价格',
      },
      auditNotes: [`官方定价核验另行保留：${official.reason}`, '当前比较同时含官方标准报价和历史测试实扣，两类来源已分别标注；可切换为仅官方定价。'],
      missingFields: [], officialAudit: official,
    }
  } catch {
    return unavailable('九题测试账单缺失、币种不一致或合计未通过核对，暂不参与比较。')
  }
}

export function metricScore(model, metric) {
  const value = metric === 'overall' ? model.overallScore : model.dimensions?.[metric]?.mean
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function filterModels(rows, { query = '', vendor = '', min = '', max = '', metric = 'overall' }) {
  let low, high
  try { low = min === '' ? null : decimal(min); high = max === '' ? null : decimal(max) } catch { return { matching: [], visible: [], missing: [], error: '请输入非负的价格数值。' } }
  if (low && high && compareCost(low, high) > 0) return { matching: [], visible: [], missing: [], error: '最低价格不能高于最高价格。' }
  const q = query.trim().toLocaleLowerCase()
  const matching = rows.filter(({ model }) => (!vendor || model.developer === vendor) && `${model.displayName} ${model.modelId}`.toLocaleLowerCase().includes(q))
  const missing = matching.filter(r => r.price.status !== 'comparable' || metricScore(r.model, metric) === null)
  const visible = matching.filter(r => r.price.status === 'comparable' && metricScore(r.model, metric) !== null && (!low || compareCost(r.price.exact, low) >= 0) && (!high || compareCost(r.price.exact, high) <= 0))
  return { matching, visible, missing, error: '' }
}

export function paretoFrontier(rows, metric = 'overall') {
  const valid = rows.filter(r => r.price?.status === 'comparable' && r.price.exact?.n > 0n && metricScore(r.model, metric) !== null)
  return valid.filter(a => !valid.some(b => {
    const cost = compareCost(b.price.exact, a.price.exact)
    const scoreA = metricScore(a.model, metric), scoreB = metricScore(b.model, metric)
    return cost <= 0 && scoreB >= scoreA && (cost < 0 || scoreB > scoreA)
  })).sort((a, b) => compareCost(a.price.exact, b.price.exact) || metricScore(b.model, metric) - metricScore(a.model, metric) || a.model.modelId.localeCompare(b.model.modelId))
}

export function groupPoints(rows, metric) {
  const groups = new Map()
  rows.forEach(row => {
    const key = `${row.price.exact.n}/${row.price.exact.d}:${metricScore(row.model, metric)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  })
  return [...groups.values()]
}
