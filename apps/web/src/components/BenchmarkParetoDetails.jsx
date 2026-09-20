import { useEffect, useRef } from 'react'
import { ExternalLink, Info } from 'lucide-react'
import { leaderboardDetailHref } from '../leaderboardRoutes.js'
import { appPath } from '../appPaths.js'
import { formatCost } from './benchmarkParetoMath.js'

export const profileHref = model => leaderboardDetailHref(`/leaderboard/models/${encodeURIComponent(model.profileId)}`)
const statuses = { unconfirmed: '官方价格待确认', metering_missing: '官方单价已核实 · 计费量待确认', conditions_missing: '官方单价已核实 · 条件待确认', estimated: '官方单价已核实 · 仅估算' }
const brands = [
  ['black-forest-labs/', 'BFL', '#262b25'], ['qwen', 'Q', '#7050bc'], ['wan', 'W', '#6271c4'],
  ['seedream', '豆', '#38797c'], ['doubao', '豆', '#38797c'], ['krea/', 'K', '#272727'],
  ['recraft/', 'R', '#be542d'], ['google/', 'G', '#397ab6'], ['openai/', 'O', '#467b64'],
  ['x-ai/', 'x', '#30353a'], ['sourceful/', 'S', '#bf6b49'], ['microsoft/', 'M', '#2f76a3'], ['z-image', 'Z', '#856297'],
]
export function brand(model) { return brands.find(([prefix]) => model.modelId.startsWith(prefix)) || ['', model.developer?.slice(0, 1) || '•', '#5c6e66'] }
export function brandIcon(model) {
  const file = model.modelId.startsWith('google/') ? 'google.png' : model.modelId.startsWith('openai/') ? 'openai.png' : model.modelId.startsWith('black-forest-labs/') ? 'bfl.png' : model.modelId.startsWith('qwen') ? 'qwen.png' : model.modelId.startsWith('wan') ? 'wan.ico' : /^(seedream|doubao)/.test(model.modelId) ? 'bytedance.png' : model.modelId.startsWith('recraft/') ? 'recraft.png' : model.modelId.startsWith('krea/') ? 'krea.png' : model.modelId.startsWith('x-ai/') ? 'xai.svg' : null
  return file ? appPath(`/brand/benchmark/${file}`) : null
}
export function Brand({ model }) { const [, mark, color] = brand(model), icon = brandIcon(model); return <span className="pareto-brand" style={{ '--brand-color': color }} aria-label={model.developer}>{icon ? <img src={icon} alt="" /> : mark}</span> }
export function Sources({ price }) { if (price.costBasis === 'test') return <a className="pareto-sources" href={profileHref(price)}>公开逐题账单与生成证据 <ExternalLink size={11} /></a>; return <span className="pareto-sources">{price.sources.map((s, i) => <a href={s.url} target="_blank" rel="noreferrer" key={s.url}>{s.label}<ExternalLink size={11} />{i < price.sources.length - 1 ? ' ' : ''}</a>)}</span> }


export function PriceTable({ rows }) {
  return <div className="pareto-price-table-wrap" tabIndex={0} aria-label="逐模型成本来源表，可横向滚动"><table className="pareto-price-table"><thead><tr><th>模型 / 准确 ID</th><th>成本 · USD/张</th><th>计费依据 / 条件</th><th>费用来源 / 核对日期</th></tr></thead><tbody>{rows.map(({ model, price }) => <tr key={model.modelId}>
    <th scope="row"><a href={profileHref(model)}>{model.displayName}</a><code>{model.modelId}</code><small>官方 ID：{price.officialModelId || '映射待确认'}<br />版本：{price.version || '待确认'}</small></th>
    <td>{price.status === 'comparable' ? <><strong>{formatCost(price.usd)}</strong><small className={price.costBasis === 'test' ? 'pareto-test-label' : ''}>{price.costBasis === 'test' ? '测试费用 · 九题账单已核对' : '官方单价已核实 · 可复算'}<br />{price.costBasis === 'test' ? `测试总费用 $${price.total} ÷ 9` : '每题等权 · 非实际扣费'}</small></> : <><span className="pareto-pending">{statuses[price.status]}</span>{price.status === 'estimated' && <strong className="pareto-estimate">{formatCost(price.usd)} / 张（估算）</strong>}<small>{price.reason}</small></>}</td>
    <td>{price.rateText}<small>{price.conditions}</small><details><summary>原参数、费用组成与计算</summary><small>{price.generationApi}<br />{price.editApi}</small><small>原请求：{price.originalParameters?.requestedResolution?.join(' / ')}；输出 {price.originalParameters?.observedOutputPixels?.join(' / ')}；{price.originalParameters?.quality}；每题 1 张，生成无参考图，编辑 1 张源图。</small>{price.feeBreakdown && <dl>{Object.entries(price.feeBreakdown).map(([k, v]) => <div key={k}><dt>{{ imageOutput: '输出图', textInput: '文本输入', referenceInput: '参考图输入', otherRequired: '其他费用' }[k]}</dt><dd>{v}</dd></div>)}</dl>}<small>{price.calculation}</small>{price.missingFields?.length > 0 && <small>待确认字段：{price.missingFields.join('；')}</small>}{price.auditNotes?.map(note => <small key={note}>{note}</small>)}</details>{price.slots && <details><summary>展开九题{price.status === 'estimated' ? '估算' : '计算'}</summary><ol>{price.slots.map((s, i) => <li key={s.caseId}>{s.kind === 'edit' ? '编辑' : '生成'} {i + 1}：{price.currency} {(Number(s.cost.n) / Number(s.cost.d)).toFixed(5).replace(/0+$/, '').replace(/\.$/, '')}{s.billing && <small>账单核对：{s.billing.verifiedAt.slice(0, 10)} · 证据 {s.billing.evidenceHash.slice(0, 12)}</small>}</li>)}</ol><small>{price.costBasis === 'test' ? '九题已核对账单合计' : '九题原币报价合计'} ÷ 9{price.currency === 'CNY' ? ' × 1.1460 ÷ 7.6755' : ''} = USD {price.usd.toPrecision(12)}/张{price.status === 'estimated' ? '（估算，不进入前沿）' : ''}。</small></details>}{price.officialAudit && <details><summary>保留的官方定价核对</summary><small>{price.officialAudit.rateText}<br />{price.officialAudit.reason}</small><Sources price={price.officialAudit} /></details>}</td>
    <td><small>{price.channel}<br />查询：{price.checkedAt || '待确认'}</small><Sources price={price} /></td>
  </tr>)}</tbody></table></div>
}

export function CostInfo({ costBasis, onShowData }) {
  const root = useRef(null)
  useEffect(() => {
    const outside = event => { if (root.current && !root.current.contains(event.target)) root.current.open = false }
    const escape = event => { if (event.key === 'Escape' && root.current) root.current.open = false }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside);document.removeEventListener('keydown', escape) }
  }, [])
  return <details className="pareto-cost-info" ref={root}>
    <summary aria-label="成本口径说明"><Info size={16} /></summary>
    <div role="note">{costBasis === 'official' ? '当前仅比较官方标准报价。' : '当前含官方标准报价和 7 个模型的已核对测试费用；测试费用以琥珀色标记。'} 均按原九题等权折算为 USD/张。
      <button type="button" onClick={() => { root.current.open = false;onShowData() }}>查看数据与计费说明</button>
    </div>
  </details>
}
