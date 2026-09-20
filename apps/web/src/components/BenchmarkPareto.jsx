import { useCallback, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { OFFICIAL_PRICES, comparisonPrice, filterModels, metricScore, paretoFrontier } from './benchmarkParetoMath.js'
import { clamp, costDomain, displayCost, modelName, sortedCosts } from './benchmarkParetoDisplay.js'
import { Brand, CostInfo, PriceTable, profileHref } from './BenchmarkParetoDetails.jsx'
import BenchmarkParetoScatter from './BenchmarkParetoScatter.jsx'
import useCompactLayout from '../hooks/useCompactLayout.js'

function BudgetFilters({ vendors, vendor, min, max, ceiling, error, onVendor, onBudget, onReset }) {
  const lower = clamp(Number(min) || 0, 0, ceiling), upper = clamp(max === '' || !Number.isFinite(Number(max)) ? ceiling : Number(max), 0, ceiling)
  return <div className="pareto-filters" id="pareto-filters" aria-label="供应商与预算筛选">
    <label className="pareto-vendor-label">供应商<select aria-label="供应商" value={vendor} onChange={e => onVendor(e.target.value)}><option value="">全部供应商</option>{vendors.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
    <fieldset className="pareto-budget"><legend>每张预算 <span>USD</span></legend>
      <div className="pareto-budget-values"><span>{displayCost(lower)}</span><span>{displayCost(upper)}</span></div>
      <div className="pareto-range-track" style={{ '--range-low': `${lower / ceiling * 100}%`, '--range-high': `${upper / ceiling * 100}%` }}>
        <input type="range" aria-label="预算下限滑杆" min="0" max={ceiling} step="0.001" value={lower} onChange={e => onBudget(e.target.value, String(Math.max(Number(e.target.value), upper)))} />
        <input type="range" aria-label="预算上限滑杆" min="0" max={ceiling} step="0.001" value={upper} onChange={e => onBudget(String(Math.min(lower, Number(e.target.value))), e.target.value)} />
      </div>
    </fieldset>
    <div className="pareto-budget-exact"><label>最低价格<input aria-label="最低价格" inputMode="decimal" value={min} placeholder="不限" onChange={e => onBudget(e.target.value, max)} /></label><span>—</span><label>最高价格<input aria-label="最高价格" inputMode="decimal" value={max} placeholder="不限" onChange={e => onBudget(min, e.target.value)} /></label></div>
    <div className="pareto-budget-presets" aria-label="常用预算">{[['不限', '', ''], ['$0.05 内', '', '.05'], ['$0.10 内', '', '.10'], ['$0.10–0.20', '.10', '.20']].map(([title, a, b]) => <button type="button" key={title} aria-pressed={min === a && max === b} onClick={() => onBudget(a, b)}>{title}</button>)}<button type="button" className="pareto-reset-filter" onClick={onReset}>重置筛选</button></div>
    {error && <p role="alert" className="pareto-error">{error}</p>}
  </div>
}

function FrontierList({ rows, metric, selectedId, onSelect, onHover }) {
  return <aside className="pareto-frontier" aria-label="帕累托最优模型">
    <header><h2>帕累托最优</h2><span>{rows.length}</span></header>
    <p>当前评分与筛选范围</p>
    <ol>{[...rows].reverse().map(({ model, price }) => <li key={model.modelId} className={selectedId === model.modelId ? 'is-selected' : ''}>
      <button type="button" data-model-trigger aria-label={`定位 ${model.displayName}`} onPointerEnter={() => onHover(model.modelId)} onPointerLeave={() => onHover(null)} onClick={() => onSelect(model.modelId, true)}>
        <Brand model={model} /><span className="pareto-frontier-name">{model.displayName}{price.costBasis === 'test' && <i className="pareto-test-dot" title="已核对测试费用" />}</span>
        <span className="pareto-frontier-values"><b>{metricScore(model, metric).toFixed(2)}</b><small>{displayCost(price.usd)}</small></span>
      </button>
    </li>)}</ol>
    {rows.length === 0 && <p className="pareto-list-empty">暂无符合条件的模型</p>}
    <details className="pareto-definition"><summary>什么是帕累托最优？</summary><p>没有其他可见模型同时做到成本不更高、分数不更低，且至少一项更好。同成本同分的模型一起保留。</p></details>
  </aside>
}

function CostRanking({ rows, frontier, metric, label, costBasis, selectedId, onSelect, onHover, onShowData }) {
  const [order, setOrder] = useState('score'), [optimalOnly, setOptimalOnly] = useState(false), [expanded, setExpanded] = useState(false)
  const ordered = sortedCosts(optimalOnly ? frontier : rows, metric, order)
  const visible = expanded ? ordered : ordered.slice(0, 10)
  const maxCost = Math.max(.001, ...rows.map(r => r.price.usd))
  const frontierIds = new Set(frontier.map(r => r.model.modelId))
  return <section className="pareto-cost-ranking" aria-label="单张成本榜">
    <header><div><h2>单张成本 <CostInfo costBasis={costBasis} onShowData={onShowData} /></h2><p>USD/张 · 条形按成本等比例显示</p></div>
      <div className="pareto-cost-controls"><label className="pareto-checkbox"><input type="checkbox" checked={optimalOnly} onChange={e => { setOptimalOnly(e.target.checked);setExpanded(false) }} />仅帕累托最优</label><select aria-label="成本榜排序" value={order} onChange={e => setOrder(e.target.value)}><option value="score">按评分排名</option><option value="low">成本从低到高</option><option value="high">成本从高到低</option></select></div>
    </header>
    <div className="pareto-cost-columns" aria-hidden="true"><span>模型</span><span>0 <i />{displayCost(maxCost)}</span><span>USD/张</span><span>{label}</span></div>
    <ol className="pareto-cost-rows">{visible.map(({ model, price }, index) => <li key={model.modelId}>
      <button type="button" data-model-trigger data-model-id={model.modelId} data-cost={price.usd} className={`pareto-cost-row${selectedId === model.modelId ? ' is-selected' : ''}${frontierIds.has(model.modelId) ? ' is-frontier' : ''}`} aria-label={`定位 ${model.displayName}，成本 ${displayCost(price.usd)}，${label} ${metricScore(model, metric).toFixed(2)}`} onClick={() => onSelect(model.modelId, true)} onPointerEnter={() => onHover(model.modelId)} onPointerLeave={() => onHover(null)}>
        <span className="pareto-cost-model"><span className="pareto-cost-position">{index + 1}</span><Brand model={model} /><strong>{model.displayName}</strong>{price.costBasis === 'test' && <i className="pareto-test-dot" title="已核对测试费用" />}</span>
        <span className="pareto-cost-bar-track"><span className="pareto-cost-bar" style={{ width: `${price.usd / maxCost * 100}%` }} /></span>
        <b className="pareto-cost-value">{displayCost(price.usd)}</b><span className="pareto-cost-score">{metricScore(model, metric).toFixed(2)}<small> 分</small></span>
      </button>
    </li>)}</ol>
    {!ordered.length && <p className="pareto-list-empty">当前筛选下没有可比较的成本记录。</p>}
    {ordered.length > 10 && <button type="button" className="pareto-show-more" onClick={() => setExpanded(v => !v)}>{expanded ? '收起列表' : `展开全部 ${ordered.length} 个模型`}<ChevronDown size={15} /></button>}
  </section>
}

export default function BenchmarkPareto({ models, axes, viewSwitch }) {
  const compact = useCompactLayout()
  const [metric, setMetric] = useState('overall'), [query, setQuery] = useState(''), [vendor, setVendor] = useState('')
  const [min, setMin] = useState(''), [max, setMax] = useState(''), [costBasis, setCostBasis] = useState('combined')
  const [filtersOpen, setFiltersOpen] = useState(false), [selectedId, setSelectedId] = useState(null), [hoverId, setHoverId] = useState(null), [focusRequest, setFocusRequest] = useState(null)
  const dataRef = useRef(null), plotRef = useRef(null)
  const normalized = useMemo(() => models.map(model => ({ ...model, displayName: modelName(model) })), [models])
  const rows = useMemo(() => normalized.map(model => ({ model, price: comparisonPrice(model, costBasis) })), [normalized, costBasis])
  const filtered = useMemo(() => filterModels(rows, { query, vendor, min, max, metric }), [rows, query, vendor, min, max, metric])
  const frontier = useMemo(() => paretoFrontier(filtered.visible, metric), [filtered.visible, metric])
  const vendors = [...new Set(models.map(m => m.developer).filter(Boolean))].sort()
  const label = metric === 'overall' ? '总分' : axes.find(a => a.id === metric)?.label
  const ceiling = costDomain(rows.filter(r => r.price.status === 'comparable'))[1]
  const filterCount = Number(!!vendor) + Number(min !== '' || max !== '')
  const selection = filtered.visible.some(r => r.model.modelId === selectedId) ? selectedId : null
  const clear = useCallback(() => { setSelectedId(null);setHoverId(null) }, [])
  const select = useCallback((id, focus) => {
    setSelectedId(id);setHoverId(null)
    if (focus) {
      setFocusRequest(old => ({ id, sequence: (old?.sequence || 0) + 1 }))
      const box = plotRef.current?.getBoundingClientRect()
      if (box && (box.top < 0 || box.top > window.innerHeight / 2)) plotRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    }
  }, [])
  function resetFilters() { setQuery('');setVendor('');setMin('');setMax('');clear() }
  function showData() { if (dataRef.current) { dataRef.current.open = true;dataRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) } }
  function budget(a, b) { setMin(a);setMax(b);clear() }
  const filterKey = `${costBasis}|${metric}|${query}|${vendor}|${min}|${max}`
  return <section className="pareto-view" aria-label="帕累托视图">
    <div className="pareto-toolbar">
      {viewSwitch}
      <label className="pareto-metric-label"><span className="pareto-sr-only">评测维度</span><select aria-label="评测维度" value={metric} onChange={e => { setMetric(e.target.value);clear() }}><option value="overall">总分</option>{axes.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
      <label className="pareto-search"><Search size={17} /><input aria-label="模型搜索" value={query} placeholder="搜索模型" onChange={e => { setQuery(e.target.value);clear() }} />{query && <button type="button" aria-label="清空搜索" onClick={() => { setQuery('');clear() }}><X size={14} /></button>}</label>
      <button type="button" className="pareto-filter-toggle" aria-expanded={filtersOpen} aria-controls="pareto-filters" onClick={() => setFiltersOpen(v => !v)}><SlidersHorizontal size={16} />{filtersOpen ? '收起筛选' : '筛选'}{filterCount > 0 && <b>{filterCount}</b>}</button>
    </div>
    {filtersOpen && <BudgetFilters vendors={vendors} vendor={vendor} min={min} max={max} ceiling={ceiling} error={filtered.error} onVendor={v => { setVendor(v);clear() }} onBudget={budget} onReset={resetFilters} />}
    {!filtersOpen && filterCount > 0 && <div className="pareto-active-filters"><span>{vendor || '全部供应商'} · {min || '0'}–{max || '不限'} USD/张</span><button type="button" onClick={resetFilters}>清除筛选 <X size={12} /></button>{filtered.error && <span role="alert">{filtered.error}</span>}</div>}
    <div className="pareto-plot-layout" ref={plotRef}>
      <BenchmarkParetoScatter key={filterKey} rows={filtered.visible} frontier={frontier} metric={metric} label={label} costBasis={costBasis} selectedId={selection} hoverId={hoverId} focusRequest={focusRequest} searching={!!query.trim()} onSelect={select} onHover={setHoverId} onClear={clear} onShowData={showData} />
      <FrontierList rows={frontier} metric={metric} selectedId={selection} onSelect={select} onHover={setHoverId} />
    </div>
    <CostRanking key={filterKey} rows={filtered.visible} frontier={frontier} metric={metric} label={label} costBasis={costBasis} selectedId={selection} onSelect={select} onHover={setHoverId} onShowData={showData} />
    <details className="pareto-data" ref={dataRef} id="pareto-pricing"><summary>数据与计费说明 <ChevronDown size={17} /></summary>
      <div className="pareto-data-content"><div className="pareto-data-settings"><label>成本来源<select aria-label="成本来源" value={costBasis} onChange={e => { setCostBasis(e.target.value);clear() }}><option value="combined">{compact ? '官方报价 + 测试费用' : '官方报价 + 7 项已核对测试费用'}</option><option value="official">仅官方定价</option></select></label><p>默认包含 28 个官方报价与 7 个历史测试账单，费用来源逐模型保留。两类来源不同，不将测试费用解释为当前厂商直营价格。</p></div>
        <div className="pareto-method-grid"><div><h3>固定九题等权</h3><p>单张成本 =（6 道生成费用 + 3 道编辑费用）÷ 9。每题 1 张，编辑含 1 张 2048×1152 源图。沿用原分辨率和质量条件，不按成功图片数重新加权。测试费用含当前公开题位内的调用尝试，不含审评费用。</p></div><div><h3>汇率与精度</h3><p>CNY × 1.1460 ÷ 7.6755 = USD；采用 ECB {OFFICIAL_PRICES.fx.date} 参考汇率。USD 账单不换汇。前沿使用原始分数与精确价格，主界面小数位仅用于显示。</p><a href={OFFICIAL_PRICES.fx.source} target="_blank" rel="noreferrer">ECB 参考汇率</a></div><div><h3>数据与计算范围</h3><p>正式榜单 {models.length} 个模型；前沿只在当前维度、搜索、供应商与预算范围内计算。缩放只改变视窗。连线为视觉引导。缺价不记零，官方估算不进入前沿。</p><p>价格查询 / 账单读取：{OFFICIAL_PRICES.checkedAt}。原评分、评语、费用和生成证据保持不变。</p></div></div>
        <details className="pareto-exclusions"><summary>未纳入成本比较的模型 · 当前搜索与供应商范围 {filtered.missing.length} 个</summary><ul>{filtered.missing.map(({ model, price }) => <li key={model.modelId}><a href={profileHref(model)}>{model.displayName}</a><code>{model.modelId}</code><p>{price.reason || '当前评分维度无正式分数。'}</p></li>)}</ul></details>
        <details className="pareto-source-details"><summary>完整价格来源与逐题计算 · {rows.length} 个模型</summary><PriceTable rows={rows} /></details>
      </div>
    </details>
  </section>
}
