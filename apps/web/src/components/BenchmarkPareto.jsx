import { useId, useMemo, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ExternalLink, Maximize2, Minus, Plus, Search, X } from 'lucide-react'
import { leaderboardDetailHref } from '../leaderboardRoutes.js'
import { appPath } from '../appPaths.js'
import { OFFICIAL_PRICES, filterModels, formatCost, groupPoints, metricScore, comparisonPrice, paretoFrontier } from './benchmarkParetoMath.js'

const profileHref = model => leaderboardDetailHref(`/leaderboard/models/${encodeURIComponent(model.profileId)}`)
const statuses = { unconfirmed: '官方价格待确认', metering_missing: '官方单价已核实 · 计费量待确认', conditions_missing: '官方单价已核实 · 条件待确认', estimated: '官方单价已核实 · 仅估算' }
const brands = [
  ['black-forest-labs/', 'BFL', '#262b25'], ['qwen', 'Q', '#7050bc'], ['wan', 'W', '#6271c4'],
  ['seedream', '豆', '#38797c'], ['doubao', '豆', '#38797c'], ['krea/', 'K', '#272727'],
  ['recraft/', 'R', '#be542d'], ['google/', 'G', '#397ab6'], ['openai/', 'O', '#467b64'],
  ['x-ai/', 'x', '#30353a'], ['sourceful/', 'S', '#bf6b49'], ['microsoft/', 'M', '#2f76a3'], ['z-image', 'Z', '#856297'],
]
function brand(model) { return brands.find(([prefix]) => model.modelId.startsWith(prefix)) || ['', model.developer?.slice(0, 1) || '•', '#5c6e66'] }
function brandIcon(model) {
  const file = model.modelId.startsWith('google/') ? 'google.png' : model.modelId.startsWith('openai/') ? 'openai.png' : model.modelId.startsWith('black-forest-labs/') ? 'bfl.png' : model.modelId.startsWith('qwen') ? 'qwen.png' : model.modelId.startsWith('wan') ? 'wan.ico' : /^(seedream|doubao)/.test(model.modelId) ? 'bytedance.png' : model.modelId.startsWith('recraft/') ? 'recraft.png' : model.modelId.startsWith('krea/') ? 'krea.png' : model.modelId.startsWith('x-ai/') ? 'xai.svg' : null
  return file ? appPath(`/brand/benchmark/${file}`) : null
}
function Brand({ model }) { const [, mark, color] = brand(model), icon = brandIcon(model); return <span className="pareto-brand" style={{ '--brand-color': color }} aria-label={model.developer}>{icon ? <img src={icon} alt="" /> : mark}</span> }
function Sources({ price }) { if (price.costBasis === 'test') return <a className="pareto-sources" href={profileHref(price)}>公开逐题账单与生成证据 <ExternalLink size={11} /></a>; return <span className="pareto-sources">{price.sources.map((s, i) => <a href={s.url} target="_blank" rel="noreferrer" key={s.url}>{s.label}<ExternalLink size={11} />{i < price.sources.length - 1 ? ' ' : ''}</a>)}</span> }

function PriceDetail({ row, metric, label, onClose }) {
  const { model, price } = row
  return <div className="pareto-inspect" aria-label="模型计价详情">
    <header><Brand model={model} /><strong>{model.displayName}</strong><button type="button" aria-label="关闭模型信息" onClick={onClose}><X size={16} /></button></header>
    <code>{model.modelId}</code>
    <div className="pareto-inspect-values"><span>{label}<b>{metricScore(model, metric)?.toFixed(2) ?? '—'}<small> / 10</small></b></span><span>{price.costBasis === 'test' ? '测试费用均值' : '官方定价折算'}<b>{formatCost(price.usd)}<small> / 张</small></b></span></div>
    <span className={`pareto-cost-badge ${price.costBasis === 'test' ? 'is-test' : ''}`}>{price.costBasis === 'test' ? '测试费用 · 账单已核对' : '官方标准定价'}</span><p>{price.conditions}</p><p>{price.rateText}</p>
    <small>{price.channel} · 查询 {price.checkedAt}</small>
    <Sources price={price} />
    <a className="pareto-detail-link" href={profileHref(model)}>查看模型评分与原图 <ArrowRight size={14} /></a>
  </div>
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
function Scatter({ rows, frontier, metric, label, costLabel, activeId, onActive }) {
  const clip = useId().replace(/:/g, '')
  const [zoom, setZoom] = useState(1)
  const [scale, setScale] = useState('log')
  const [center, setCenter] = useState({ x: .5, y: .5 })
  const [drag, setDrag] = useState(null)
  const frontierIds = new Set(frontier.map(r => r.model.modelId))
  const groups = groupPoints(rows, metric)
  const maxCost = Math.max(.01, ...rows.map(r => r.price.usd)) * 1.2
  const lowCost = Math.min(.01, ...rows.map(r => r.price.usd)) / 1.2
  const costAt = position => scale === 'log' ? Math.exp(Math.log(lowCost) + position * Math.log(maxCost / lowCost)) : position * maxCost
  const costPosition = cost => scale === 'log' ? Math.log(cost / lowCost) / Math.log(maxCost / lowCost) : cost / maxCost
  const half = .5 / zoom, cx = clamp(center.x, half, 1 - half), cy = clamp(center.y, half, 1 - half)
  const minX = costAt(cx - half), maxX = costAt(cx + half), minY = (cy - half) * 10, maxY = (cy + half) * 10
  const x = cost => 68 + (costPosition(cost) - cx + half) * zoom * 684
  const y = score => 402 - (score - minY) / (maxY - minY) * 350
  const ticks = Array.from({ length: 6 }, (_, i) => i / 5)
  const inView = row => row.price.usd >= minX && row.price.usd <= maxX && metricScore(row.model, metric) >= minY && metricScore(row.model, metric) <= maxY
  const uniqueFrontier = groupPoints(frontier, metric).map(g => g[0])
  const path = uniqueFrontier.map((r, i) => `${i ? 'L' : 'M'} ${x(r.price.usd)} ${y(metricScore(r.model, metric))}`).join(' ')
  const placed = []
  const labels = groups.filter(g => frontierIds.has(g[0].model.modelId) && inView(g[0])).map(group => {
    const r = group[0], px = x(r.price.usd), py = y(metricScore(r.model, metric))
    const name = r.model.displayName.replace(/^[^:]+: /, '').replace('Black Forest Labs ', '') + (group.length > 1 ? ` +${group.length - 1}` : '')
    const w = Math.min(180, name.length * 6.3 + 16)
    const pointBounds = groups.filter(g => inView(g[0])).map(g => ({ x: x(g[0].price.usd), y: y(metricScore(g[0].model, metric)) }))
    for (const [dx, dy] of [[-w / 2, -39], [20, -10], [-w - 20, -10], [-w / 2, 24], [-w / 2, -65], [25, -48], [-w - 25, 36], [-w / 2, 65]]) {
      const lx = clamp(px + dx, 72, 750 - w), ly = py + dy
      if (ly < 28 || ly + 20 > 408 || placed.some(p => lx < p.x + p.w + 5 && lx + w + 5 > p.x && ly < p.y + 24 && ly + 24 > p.y)) continue
      if (pointBounds.some(p => lx < p.x + 18 && lx + w > p.x - 18 && ly < p.y + 18 && ly + 21 > p.y - 18)) continue
      placed.push({ x: lx, y: ly, w });return { key: r.model.modelId, name, px, py, lx, ly, w }
    }
    return null
  }).filter(Boolean)
  function changeZoom(next) {
    const selected = rows.find(r => r.model.modelId === activeId)
    if (selected) setCenter({ x: costPosition(selected.price.usd), y: metricScore(selected.model, metric) / 10 })
    setZoom(clamp(next, 1, 5))
  }
  function pan(dx, dy) { setCenter({ x: clamp(cx + dx / zoom, half, 1 - half), y: clamp(cy + dy / zoom, half, 1 - half) }) }
  return <div className="pareto-chart">
    <div className="pareto-chart-heading"><div><h2>帕累托前沿</h2><p>越靠左上，成本越低、分数越高</p></div><div className="pareto-zoom" role="group" aria-label="图表缩放">
      <button aria-label="缩小图表" disabled={zoom === 1} onClick={() => changeZoom(zoom - 1)}><Minus size={16} /></button>
      <output aria-label="当前缩放">{zoom}×</output>
      <button aria-label="放大图表" disabled={zoom === 5} onClick={() => changeZoom(zoom + 1)}><Plus size={16} /></button>
      <button aria-label="重置图表" onClick={() => { setZoom(1);setCenter({ x: .5, y: .5 }) }}><Maximize2 size={16} /></button>
    </div></div>
    <div className="pareto-scale"><label>成本刻度 <select aria-label="成本刻度" value={scale} onChange={e => { setScale(e.target.value);setZoom(1);setCenter({ x: .5, y: .5 }) }}><option value="log">对数</option><option value="linear">线性</option></select></label><small>缩放仅改变视窗，不改变比较范围</small></div>
    {zoom > 1 && <div className="pareto-pan" role="group" aria-label="平移图表"><span>拖动图表或平移</span>{[[ArrowLeft, -.2, 0, '向左平移'], [ArrowRight, .2, 0, '向右平移'], [ArrowUp, 0, .2, '向上平移'], [ArrowDown, 0, -.2, '向下平移']].map(([Icon, dx, dy, title]) => <button key={title} aria-label={title} onClick={() => pan(dx, dy)}><Icon size={14} /></button>)}</div>}
    <p className="pareto-scroll-hint">左右滑动查看完整图表；也可在下方列表点选前沿模型。</p>
    <div className="pareto-chart-scroll" tabIndex={0} aria-label="成本与评分散点图，可横向滚动">
      <svg className="pareto-svg" viewBox="0 0 790 470" role="group" aria-label={`${label}与${costLabel}，${rows.length} 个模型`} style={{ touchAction: zoom > 1 ? 'none' : 'auto' }}
        onPointerDown={e => { if (zoom > 1 && e.target.tagName !== 'text' && !e.target.closest('[data-point]')) { e.currentTarget.setPointerCapture(e.pointerId);setDrag({ x: e.clientX, y: e.clientY, cx, cy, width: e.currentTarget.getBoundingClientRect().width }) } }}
        onPointerMove={e => { if (drag) setCenter({ x: clamp(drag.cx - (e.clientX - drag.x) / drag.width / zoom, half, 1 - half), y: clamp(drag.cy + (e.clientY - drag.y) / (drag.width * 350 / 790) / zoom, half, 1 - half) }) }}
        onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
        <defs><clipPath id={clip}><rect x="49" y="24" width="724" height="397" /></clipPath></defs>
        <text x="68" y="19" className="pareto-axis-title">{label} / 10</text>
        {ticks.map(t => <g key={t} className="pareto-grid"><line x1="68" x2="752" y1={402 - t * 350} y2={402 - t * 350} /><text x="53" y={407 - t * 350} textAnchor="end">{(minY + t * (maxY - minY)).toFixed(1)}</text><line x1={68 + t * 684} x2={68 + t * 684} y1="52" y2="402" /><text x={68 + t * 684} y="429" textAnchor="middle">{formatCost(costAt(cx - half + t / zoom))}</text></g>)}
        <text x="410" y="460" textAnchor="middle" className="pareto-axis-title">{costLabel}（USD/张） →</text>
        <g clipPath={`url(#${clip})`}>
          <path d={path} className="pareto-frontier-line" />
          {labels.map(l => <g key={l.key} className="pareto-point-label" aria-hidden="true"><line x1={l.px} y1={l.py} x2={l.lx + l.w / 2} y2={l.ly + 10} /><rect x={l.lx} y={l.ly} width={l.w} height="21" rx="5" /><text x={l.lx + l.w / 2} y={l.ly + 14} textAnchor="middle">{l.name}</text></g>)}
          {groups.map(group => {
            const row = group[0], model = row.model, score = metricScore(model, metric), [, mark, color] = brand(model)
            if (!inView(row)) return null
            const optimal = frontierIds.has(model.modelId), active = group.some(r => r.model.modelId === activeId)
            const content = <><title>{group.map(r => r.model.displayName).join(' / ')} · {score.toFixed(2)} · {formatCost(row.price.usd)}{group.length > 1 ? '（同成本同分）' : ''} · {group.map(r => r.price.costBasis === 'test' ? '测试费用' : '官方定价').join(' / ')}</title><circle r="22" fill="transparent" /><rect x="-14" y="-14" width="28" height="28" rx="8" fill="var(--bench-paper)" stroke={optimal ? '#41735f' : color} strokeWidth={active ? 3 : optimal ? 2 : 1} />{brandIcon(model) ? <image href={brandIcon(model)} x="-10" y="-10" width="20" height="20" aria-hidden="true" /> : <text textAnchor="middle" y="5" fill={color} fontWeight="800" fontSize={mark.length > 1 ? 9 : 15}>{mark}</text>}{group.length > 1 && <><circle cx="13" cy="-13" r="8" fill="#191b1f" /><text x="13" y="-10" textAnchor="middle" fontSize="9" fill="white">{group.length}</text></>}{group.some(r => r.price.costBasis === 'test') && <circle cx="-13" cy="13" r="5" fill="#ba791d" stroke="#fffdf8" strokeWidth="1.5" />}{active && <circle r="20" fill="none" stroke="#e9aa21" strokeWidth="2" />}</>
            return <g key={model.modelId} transform={`translate(${x(row.price.usd)},${y(score)})`} data-point="true" data-cost-basis={group.some(r => r.price.costBasis === 'test') ? 'test' : 'official'} className={`pareto-point${optimal ? ' is-frontier' : ''}`}>
              {group.length === 1 ? <a href={profileHref(model)} aria-label={`${model.displayName}，${score.toFixed(2)} 分，${formatCost(row.price.usd)}/张，查看详情`} onMouseEnter={() => onActive(group)} onFocus={() => onActive(group)}>{content}</a> : <g role="button" tabIndex={0} aria-label={`${group.length} 个同成本同分模型，展开查看`} onMouseEnter={() => onActive(group)} onFocus={() => onActive(group)} onClick={() => onActive(group)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault();onActive(group) } }}>{content}</g>}
            </g>
          })}
        </g>
      </svg>
    </div>
    {rows.length === 0 && <div className="pareto-chart-empty" role="status">当前条件下没有可比较的模型。请调整筛选，或查看下方未纳入原因。</div>}
    <div className="pareto-legend"><span><i />帕累托最优</span><span><i />其他可比模型</span><span className="pareto-test-legend"><i />琥珀标记：测试费用</span><small>悬浮或键盘聚焦查看计价；点击模型进入详情。同坐标模型合并显示。</small></div>
  </div>
}

function PriceTable({ rows }) {
  return <div className="pareto-price-table-wrap" tabIndex={0} aria-label="逐模型成本来源表，可横向滚动"><table className="pareto-price-table"><thead><tr><th>模型 / 准确 ID</th><th>成本 · USD/张</th><th>计费依据 / 条件</th><th>费用来源 / 核对日期</th></tr></thead><tbody>{rows.map(({ model, price }) => <tr key={model.modelId}>
    <th scope="row"><a href={profileHref(model)}>{model.displayName}</a><code>{model.modelId}</code><small>官方 ID：{price.officialModelId || '映射待确认'}<br />版本：{price.version || '待确认'}</small></th>
    <td>{price.status === 'comparable' ? <><strong>{formatCost(price.usd)}</strong><small className={price.costBasis === 'test' ? 'pareto-test-label' : ''}>{price.costBasis === 'test' ? '测试费用 · 九题账单已核对' : '官方单价已核实 · 可复算'}<br />{price.costBasis === 'test' ? `测试总费用 $${price.total} ÷ 9` : '每题等权 · 非实际扣费'}</small></> : <><span className="pareto-pending">{statuses[price.status]}</span>{price.status === 'estimated' && <strong className="pareto-estimate">{formatCost(price.usd)} / 张（估算）</strong>}<small>{price.reason}</small></>}</td>
    <td>{price.rateText}<small>{price.conditions}</small><details><summary>原参数、费用组成与计算</summary><small>{price.generationApi}<br />{price.editApi}</small><small>原请求：{price.originalParameters?.requestedResolution?.join(' / ')}；输出 {price.originalParameters?.observedOutputPixels?.join(' / ')}；{price.originalParameters?.quality}；每题 1 张，生成无参考图，编辑 1 张源图。</small>{price.feeBreakdown && <dl>{Object.entries(price.feeBreakdown).map(([k, v]) => <div key={k}><dt>{{ imageOutput: '输出图', textInput: '文本输入', referenceInput: '参考图输入', otherRequired: '其他费用' }[k]}</dt><dd>{v}</dd></div>)}</dl>}<small>{price.calculation}</small>{price.missingFields?.length > 0 && <small>待确认字段：{price.missingFields.join('；')}</small>}{price.auditNotes?.map(note => <small key={note}>{note}</small>)}</details>{price.slots && <details><summary>展开九题{price.status === 'estimated' ? '估算' : '计算'}</summary><ol>{price.slots.map((s, i) => <li key={s.caseId}>{s.kind === 'edit' ? '编辑' : '生成'} {i + 1}：{price.currency} {(Number(s.cost.n) / Number(s.cost.d)).toFixed(5).replace(/0+$/, '').replace(/\.$/, '')}{s.billing && <small>账单核对：{s.billing.verifiedAt.slice(0, 10)} · 证据 {s.billing.evidenceHash.slice(0, 12)}</small>}</li>)}</ol><small>{price.costBasis === 'test' ? '九题已核对账单合计' : '九题原币报价合计'} ÷ 9{price.currency === 'CNY' ? ' × 1.1460 ÷ 7.6755' : ''} = USD {price.usd.toPrecision(12)}/张{price.status === 'estimated' ? '（估算，不进入前沿）' : ''}。</small></details>}{price.officialAudit && <details><summary>保留的官方定价核对</summary><small>{price.officialAudit.rateText}<br />{price.officialAudit.reason}</small><Sources price={price.officialAudit} /></details>}</td>
    <td><small>{price.channel}<br />查询：{price.checkedAt || '待确认'}</small><Sources price={price} /></td>
  </tr>)}</tbody></table></div>
}

export default function BenchmarkPareto({ models, axes }) {
  const [costBasis, setCostBasis] = useState('combined')
  const [metric, setMetric] = useState('overall'), [query, setQuery] = useState(''), [vendor, setVendor] = useState('')
  const [min, setMin] = useState(''), [max, setMax] = useState(''), [activeIds, setActiveIds] = useState([])
  const rows = useMemo(() => models.map(model => ({ model, price: comparisonPrice(model, costBasis) })), [models, costBasis])
  const filtered = useMemo(() => filterModels(rows, { query, vendor, min, max, metric }), [rows, query, vendor, min, max, metric])
  const frontier = useMemo(() => paretoFrontier(filtered.visible, metric), [filtered.visible, metric])
  const vendors = [...new Set(models.map(m => m.developer).filter(Boolean))].sort()
  const costLabel = costBasis === 'official' ? '官方定价折算成本' : '单张折算成本'
  const testCount = rows.filter(r => r.price.status === 'comparable' && r.price.costBasis === 'test').length
  const label = metric === 'overall' ? '总分' : axes.find(a => a.id === metric)?.label
  const active = filtered.visible.filter(r => activeIds.includes(r.model.modelId))
  const comparable = rows.filter(r => r.price.status === 'comparable').length
  const select = group => setActiveIds(group.map(r => r.model.modelId))
  return <section className="pareto-view" aria-label="帕累托视图" onKeyDown={e => { if (e.key === 'Escape') setActiveIds([]) }}>
    <div className="pareto-intro"><div><span className="bench-eyebrow">QUALITY × COST</span><h2>为科研图示，找到更合适的模型</h2><p>把当前评测分数与单张成本放在一起比较；每个模型明确标注费用来源。</p></div><a href="#pareto-pricing">费用依据与计算说明 <ArrowDown size={14} /></a></div>
    <div className="pareto-workspace">
      <aside className="pareto-filters" aria-label="帕累托筛选"><h3>比较条件</h3>
        <label>模型搜索<span className="pareto-search"><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="名称或准确 ID" /></span></label>
        <label>成本来源<select aria-label="成本来源" value={costBasis} onChange={e => { setCostBasis(e.target.value);setActiveIds([]) }}><option value="combined">含 7 项已核对测试费用</option><option value="official">仅官方定价</option></select></label>
        <label>评测维度<select aria-label="评测维度" value={metric} onChange={e => { setMetric(e.target.value);setActiveIds([]) }}><option value="overall">总分</option>{axes.map(a => <option value={a.id} key={a.id}>{a.label}</option>)}</select></label>
        <label>供应商<select aria-label="供应商" value={vendor} onChange={e => setVendor(e.target.value)}><option value="">全部供应商</option>{vendors.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
        <fieldset><legend>价格范围 · USD/张</legend><div className="pareto-price-range"><label><span className="pareto-sr-only">最低价格</span><input inputMode="decimal" value={min} onChange={e => setMin(e.target.value)} placeholder="最低" /></label><span>—</span><label><span className="pareto-sr-only">最高价格</span><input inputMode="decimal" value={max} onChange={e => setMax(e.target.value)} placeholder="最高" /></label></div></fieldset>
        {filtered.error && <p role="alert" className="pareto-error">{filtered.error}</p>}
        <button className="pareto-clear" onClick={() => { setQuery('');setVendor('');setMin('');setMax('');setMetric('overall');setActiveIds([]) }}>重置筛选</button>
        <div className="pareto-coverage"><span><b>{comparable}</b> / {models.length}</span><p>模型具备完整成本记录</p><small>{models.length - comparable} 个模型暂不绘入成本图，仍保留全部正式评分与普通排名。</small></div>
        <div className="pareto-price-note"><strong>{costBasis === 'official' ? '官方标准价格' : '官方价 + 测试费用'}</strong><p>6 道生成 + 3 道编辑，9 题等权，每题 1 张。</p><small>{costBasis === 'official' ? '按原测试条件匹配当前标准价格，排除实际扣费。' : `${comparable - testCount} 个模型采用官方价，${testCount} 个采用历史测试账单。两类来源不同，可切换为仅官方定价。`}分辨率随原评测条件而异。</small></div>
      </aside>
      <div className="pareto-main"><div className="pareto-scope" role="status" aria-label="比较范围"><span>当前筛选 · {label} · {costBasis === 'official' ? '仅官方定价' : '含测试费用'}</span><strong>{filtered.visible.length} 个可比模型 · {frontier.length} 个前沿模型</strong></div><div className="pareto-plot-layout">
        <Scatter key={`${costBasis}|${metric}|${query}|${vendor}|${min}|${max}`} rows={filtered.visible} frontier={frontier} metric={metric} label={label} costLabel={costLabel} activeId={active[0]?.model.modelId} onActive={select} />
        <aside className="pareto-frontier" aria-label="帕累托最优模型"><header><h3>帕累托最优模型</h3><span>{frontier.length}</span></header><p>仅在当前维度和筛选范围内计算</p><ol>{[...frontier].reverse().map(row => <li key={row.model.modelId} className={activeIds.includes(row.model.modelId) ? 'is-active' : ''}><button aria-label={`在图中高亮 ${row.model.displayName}`} onMouseEnter={() => select([row])} onFocus={() => select([row])} onClick={() => select([row])}><Brand model={row.model} /><span><strong>{row.model.displayName}</strong><small>{row.model.developer}{row.price.costBasis === 'test' && <em className="pareto-test-label"> · 测试费用</em>}</small></span><span className="pareto-frontier-value"><b>{metricScore(row.model, metric).toFixed(2)}</b><small>{formatCost(row.price.usd)}/张</small></span></button><a href={profileHref(row.model)} aria-label={`查看 ${row.model.displayName} 详情`}><ArrowRight size={15} /></a></li>)}</ol>{frontier.length === 0 && <p>暂无可比较的前沿模型。</p>}
          <div className="pareto-definition">没有其他可见模型同时做到<strong>成本不更高、分数不更低</strong>，且至少一项更优。</div>
        </aside>
      </div><div className="pareto-detail-area">{active.length ? active.map(row => <PriceDetail key={row.model.modelId} row={row} metric={metric} label={label} onClose={() => setActiveIds([])} />) : <div className="pareto-detail-placeholder"><span>读图提示</span><p>悬浮或聚焦模型标识，查看准确 ID、计价条件与官方来源。右侧列表可高亮对应模型。</p><small>连线连接当前前沿点，仅作为视觉引导；不代表可插值的模型或报价。</small></div>}</div></div>
    </div>
    <details className="pareto-exclusions"><summary>当前搜索 / 供应商范围内：{filtered.missing.length} 个模型暂不能纳入比较</summary><p>缺失价格不记为 0。价格范围筛选只作用于可比模型；以下清单显示当前名称及供应商筛选下的缺价原因。</p><ul>{filtered.missing.map(({ model, price }) => <li key={model.modelId}><a href={profileHref(model)}>{model.displayName}</a><code>{model.modelId}</code><span>{price.reason || '当前评分维度无正式分数。'}</span></li>)}</ul></details>
    <section className="pareto-methodology" id="pareto-pricing"><div className="bench-eyebrow">PRICING NOTES</div><h2>每一笔成本，都有依据</h2><div className="pareto-method-grid"><div><b>01 / 同一题集，同一权重</b><p>单张成本 =（6 道生成费用 + 3 道编辑费用）÷ 9。每道编辑题含 1 张 2048×1152 源图。使用原产物像素、请求分辨率和质量条件，生成题无参考图；不重测、不修改评测分数。</p></div><div><b>02 / 计价完整才进入图表</b><p>按 token、像素或运行量计费时须有可核验的计费量。失败仍保留原评分；缺失产物不等于免费。官方价使用九题标准报价；测试费用使用九题已核对账单，包含题位内的调用尝试。不按成功图片数重新加权。</p></div><div><b>03 / 原币价格，统一折算</b><p>CNY 价格按 ECB {OFFICIAL_PRICES.fx.date} 参考汇率换算：CNY × 1.1460 ÷ 7.6755 = USD。USD 价格不换汇。官方价不含优惠或历史扣费；测试费用直接使用原 USD 账单，保留原渠道计费条件。</p><a href={OFFICIAL_PRICES.fx.source} target="_blank" rel="noreferrer">ECB 参考汇率 <ExternalLink size={12} /></a></div></div><p className="pareto-method-footnote">当前成本来源：{costBasis === 'official' ? '仅官方标准价格。' : '28 项官方价与 7 项已核对测试费用（产物校验通过时）共同计算；并非全部采用厂商直营标准价。'} 查询日期：{OFFICIAL_PRICES.checkedAt}。成本与分数均以未四舍五入值判断支配关系；同成本同分的模型同时保留。价格快照与历史测试费用独立，官方当前别名不等同于可追溯的底层权重快照。</p><details className="pareto-source-details"><summary>逐模型成本来源表 · 当前正式榜单 {rows.length} 个模型</summary><PriceTable rows={rows} /></details></section>
  </section>
}
