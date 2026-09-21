import { useCallback, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { OFFICIAL_PRICES, comparisonPrice, filterModels, metricScore, paretoFrontier } from './benchmarkParetoMath.js'
import { clamp, costDomain, displayCost, modelName, sortedCosts } from './benchmarkParetoDisplay.js'
import { Brand, CostInfo, PriceTable, profileHref } from './BenchmarkParetoDetails.jsx'
import BenchmarkParetoScatter from './BenchmarkParetoScatter.jsx'
import useCompactLayout from '../hooks/useCompactLayout.js'
import { useBenchmarkLocale } from './BenchmarkLocale.jsx'
import { benchmarkRecordKey, benchmarkDeveloperName, benchmarkDeveloperOptions } from './benchmarkDevelopers.js'
import { modelDeveloperName } from '../lib/modelPresentation.js'

function BudgetFilters({ vendors, vendor, min, max, ceiling, error, onVendor, onBudget, onReset }) {
  const { t, locale } = useBenchmarkLocale()
  const lower = clamp(Number(min) || 0, 0, ceiling), upper = clamp(max === '' || !Number.isFinite(Number(max)) ? ceiling : Number(max), 0, ceiling)
  return <div className="pareto-filters" id="pareto-filters" aria-label={t("模型研发厂商与预算筛选")}>
    <label className="pareto-vendor-label">{t("模型研发厂商")}<select aria-label={t("模型研发厂商")} value={vendor} onChange={e => onVendor(e.target.value)}><option value="">{t("全部研发厂商")}</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label>
    <fieldset className="pareto-budget"><legend>{t("每张预算")}<span>USD</span></legend>
      <div className="pareto-budget-values"><span>{displayCost(lower)}</span><span>{displayCost(upper)}</span></div>
      <div className="pareto-range-track" style={{ '--range-low': `${lower / ceiling * 100}%`, '--range-high': `${upper / ceiling * 100}%` }}>
        <input type="range" aria-label={t("预算下限滑杆")} min="0" max={ceiling} step="0.001" value={lower} onChange={e => onBudget(e.target.value, String(Math.max(Number(e.target.value), upper)))} />
        <input type="range" aria-label={t("预算上限滑杆")} min="0" max={ceiling} step="0.001" value={upper} onChange={e => onBudget(String(Math.min(lower, Number(e.target.value))), e.target.value)} />
      </div>
    </fieldset>
    <div className="pareto-budget-exact"><label>{t("最低价格")}<input aria-label={t("最低价格")} inputMode="decimal" value={min} placeholder={t("不限")} onChange={e => onBudget(e.target.value, max)} /></label><span>—</span><label>{t("最高价格")}<input aria-label={t("最高价格")} inputMode="decimal" value={max} placeholder={t("不限")} onChange={e => onBudget(min, e.target.value)} /></label></div>
    <div className="pareto-budget-presets" aria-label={t("常用预算")}>{[[t("不限"), '', ''], [t("$0.05 内"), '', '.05'], [t("$0.10 内"), '', '.10'], ['$0.10–0.20', '.10', '.20']].map(([title, a, b]) => <button type="button" key={title} aria-pressed={min === a && max === b} onClick={() => onBudget(a, b)}>{title}</button>)}<button type="button" className="pareto-reset-filter" onClick={onReset}>{t("重置筛选")}</button></div>
    {error && <p role="alert" className="pareto-error">{t(error)}</p>}
  </div>
}

function FrontierList({ rows, metric, selectedId, onSelect, onHover }) {
  const { t, locale } = useBenchmarkLocale()
  return <aside className="pareto-frontier" aria-label={t("帕累托最优模型")}>
    <header><h2>{t("帕累托最优")}</h2><span>{rows.length}</span></header>
    <p>{t("当前评分与筛选范围")}</p>
    <ol>{[...rows].reverse().map(({ model, price }) => <li key={benchmarkRecordKey(model)} className={selectedId === benchmarkRecordKey(model) ? 'is-selected' : ''}>
      <button type="button" data-model-trigger aria-label={t("定位 {v0}", {v0: model.displayName})} onPointerEnter={() => onHover(benchmarkRecordKey(model))} onPointerLeave={() => onHover(null)} onClick={() => onSelect(benchmarkRecordKey(model), true)}>
        <Brand model={model} /><span className="pareto-frontier-name">{model.displayName}<small className="bench-developer">{benchmarkDeveloperName(model, locale)}</small>{price.costBasis === 'test' && <i className="pareto-test-dot" title={t("已核对测试费用")} />}</span>
        <span className="pareto-frontier-values"><b>{metricScore(model, metric).toFixed(2)}</b><small>{displayCost(price.usd)}</small></span>
      </button>
    </li>)}</ol>
    {rows.length === 0 && <p className="pareto-list-empty">{t("暂无符合条件的模型")}</p>}
    <details className="pareto-definition"><summary>{t("什么是帕累托最优？")}</summary><p>{t("没有其他可见模型同时做到成本不更高、分数不更低，且至少一项更好。同成本同分的模型一起保留。")}</p></details>
  </aside>
}

function CostRanking({ rows, frontier, metric, label, costBasis, selectedId, onSelect, onHover, onShowData }) {
  const { t, locale } = useBenchmarkLocale()
  const [order, setOrder] = useState('score'), [optimalOnly, setOptimalOnly] = useState(false), [expanded, setExpanded] = useState(false)
  const ordered = sortedCosts(optimalOnly ? frontier : rows, metric, order)
  const visible = expanded ? ordered : ordered.slice(0, 10)
  const maxCost = Math.max(.001, ...rows.map(r => r.price.usd))
  const frontierIds = new Set(frontier.map(r => benchmarkRecordKey(r.model)))
  return <section className="pareto-cost-ranking" aria-label={t("单张成本榜")}>
    <header><div><h2>{t("单张成本")}<CostInfo costBasis={costBasis} onShowData={onShowData} /></h2><p>{t("USD/张 · 条形按成本等比例显示")}</p></div>
      <div className="pareto-cost-controls"><label className="pareto-checkbox"><input type="checkbox" checked={optimalOnly} onChange={e => { setOptimalOnly(e.target.checked);setExpanded(false) }} />{t("仅帕累托最优")}</label><select aria-label={t("成本榜排序")} value={order} onChange={e => setOrder(e.target.value)}><option value="score">{t("按评分排名")}</option><option value="low">{t("成本从低到高")}</option><option value="high">{t("成本从高到低")}</option></select></div>
    </header>
    <div className="pareto-cost-columns" aria-hidden="true"><span>{t("模型")}</span><span>0 <i />{displayCost(maxCost)}</span><span>{t("USD/张")}</span><span>{label}</span></div>
    <ol className="pareto-cost-rows">{visible.map(({ model, price }, index) => <li key={benchmarkRecordKey(model)}>
      <button type="button" data-model-trigger data-model-id={model.modelId} data-cost={price.usd} className={`pareto-cost-row${selectedId === benchmarkRecordKey(model) ? ' is-selected' : ''}${frontierIds.has(benchmarkRecordKey(model)) ? ' is-frontier' : ''}`} aria-label={t("定位 {v0}，成本 {v1}，{v2} {v3}", {v0: model.displayName, v1: displayCost(price.usd), v2: label, v3: metricScore(model, metric).toFixed(2)})} onClick={() => onSelect(benchmarkRecordKey(model), true)} onPointerEnter={() => onHover(benchmarkRecordKey(model))} onPointerLeave={() => onHover(null)}>
        <span className="pareto-cost-model"><span className="pareto-cost-position">{index + 1}</span><Brand model={model} /><strong>{model.displayName}<small className="bench-developer">{benchmarkDeveloperName(model, locale)}</small></strong>{price.costBasis === 'test' && <i className="pareto-test-dot" title={t("已核对测试费用")} />}</span>
        <span className="pareto-cost-bar-track"><span className="pareto-cost-bar" style={{ width: `${price.usd / maxCost * 100}%` }} /></span>
        <b className="pareto-cost-value">{displayCost(price.usd)}</b><span className="pareto-cost-score">{metricScore(model, metric).toFixed(2)}<small> {t("分")}</small></span>
      </button>
    </li>)}</ol>
    {!ordered.length && <p className="pareto-list-empty">{t("当前筛选下没有可比较的成本记录。")}</p>}
    {ordered.length > 10 && <button type="button" className="pareto-show-more" onClick={() => setExpanded(v => !v)}>{expanded ? t("收起列表") : t("展开全部 {v0} 个模型", {v0: ordered.length})}<ChevronDown size={15} /></button>}
  </section>
}

export default function BenchmarkPareto({ models, axes, viewSwitch, sharedFilters, active = true }) {
  const { t, locale } = useBenchmarkLocale()
  const compact = useCompactLayout()
  const [metric, setMetric] = useState('overall'), [localQuery, setLocalQuery] = useState(''), [localVendor, setLocalVendor] = useState('')
  const query = sharedFilters?.query ?? localQuery, vendor = sharedFilters?.vendor ?? localVendor
  const setQuery = sharedFilters?.onQuery || setLocalQuery, setVendor = sharedFilters?.onVendor || setLocalVendor
  const [min, setMin] = useState(''), [max, setMax] = useState(''), [costBasis, setCostBasis] = useState('combined')
  const [filtersOpen, setFiltersOpen] = useState(false), [selectedId, setSelectedId] = useState(null), [hoverId, setHoverId] = useState(null), [focusRequest, setFocusRequest] = useState(null)
  const dataRef = useRef(null), plotRef = useRef(null)
  const normalized = useMemo(() => models.map(model => ({ ...model, displayName: modelName(model) })), [models])
  const rows = useMemo(() => normalized.map(model => ({ model, price: comparisonPrice(model, costBasis) })), [normalized, costBasis])
  const filtered = useMemo(() => filterModels(rows, { query, vendor, min, max, metric }), [rows, query, vendor, min, max, metric])
  const frontier = useMemo(() => paretoFrontier(filtered.visible, metric), [filtered.visible, metric])
  const vendors = benchmarkDeveloperOptions(models, locale)
  const label = metric === 'overall' ? t("总分") : t(axes.find(a => a.id === metric)?.label || metric)
  const ceiling = costDomain(rows.filter(r => r.price.status === 'comparable'))[1]
  const filterCount = Number(!!vendor) + Number(min !== '' || max !== '')
  const selection = filtered.visible.some(r => benchmarkRecordKey(r.model) === selectedId) ? selectedId : null
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
  return <section className="pareto-view" aria-label={t("帕累托视图")}>
    <div className="pareto-toolbar">
      {viewSwitch}
      <label className="pareto-metric-label"><span className="pareto-sr-only">{t("评测维度")}</span><select aria-label={t("评测维度")} value={metric} onChange={e => { setMetric(e.target.value);clear() }}><option value="overall">{t("总分")}</option>{axes.map(a => <option key={a.id} value={a.id}>{t(a.label)}</option>)}</select></label>
      <label className="pareto-search"><Search size={17} /><input aria-label={t("模型搜索")} value={query} placeholder={t("搜索模型")} onChange={e => { setQuery(e.target.value);clear() }} />{query && <button type="button" aria-label={t("清空搜索")} onClick={() => { setQuery('');clear() }}><X size={14} /></button>}</label>
      <button type="button" className="pareto-filter-toggle" aria-expanded={filtersOpen} aria-controls="pareto-filters" onClick={() => setFiltersOpen(v => !v)}><SlidersHorizontal size={16} />{filtersOpen ? t("收起筛选") : t("筛选")}{filterCount > 0 && <b>{filterCount}</b>}</button>
    </div>
    {filtersOpen && <BudgetFilters vendors={vendors} vendor={vendor} min={min} max={max} ceiling={ceiling} error={t(filtered.error)} onVendor={v => { setVendor(v);clear() }} onBudget={budget} onReset={resetFilters} />}
    {!filtersOpen && filterCount > 0 && <div className="pareto-active-filters"><span>{vendor ? modelDeveloperName(vendor, locale) : t('全部研发厂商')} · {min || '0'}–{max || t('不限')} {t("USD/张")}</span><button type="button" onClick={resetFilters}>{t("清除筛选")}<X size={12} /></button>{filtered.error && <span role="alert">{t(filtered.error)}</span>}</div>}
    <p className="bench-ranking-scope" role="status">{t('匹配 {count} / {total} 个模型；其中 {valid} 个在当前成本和维度范围内参与前沿比较。', { count: filtered.matching.length, total: models.length, valid: filtered.visible.length })}</p>
    <div className="pareto-plot-layout" ref={plotRef}>
      <BenchmarkParetoScatter active={active} key={filterKey} rows={filtered.visible} frontier={frontier} metric={metric} label={label} costBasis={costBasis} selectedId={selection} hoverId={hoverId} focusRequest={focusRequest} searching={!!query.trim()} onSelect={select} onHover={setHoverId} onClear={clear} onShowData={showData} />
      <FrontierList rows={frontier} metric={metric} selectedId={selection} onSelect={select} onHover={setHoverId} />
    </div>
    <CostRanking key={filterKey} rows={filtered.visible} frontier={frontier} metric={metric} label={label} costBasis={costBasis} selectedId={selection} onSelect={select} onHover={setHoverId} onShowData={showData} />
    <details className="pareto-data" ref={dataRef} id="pareto-pricing"><summary>{t("数据与计费说明")}<ChevronDown size={17} /></summary>
      <div className="pareto-data-content"><div className="pareto-data-settings"><label>{t("成本来源")}<select aria-label={t("成本来源")} value={costBasis} onChange={e => { setCostBasis(e.target.value);clear() }}><option value="combined">{compact ? t("官方报价 + 测试费用") : t("官方报价 + 7 项已核对测试费用")}</option><option value="official">{t("仅官方定价")}</option></select></label><p>{t("默认包含 28 个官方报价与 7 个历史测试账单，费用来源逐模型保留。两类来源不同，不将测试费用解释为当前厂商直营价格。")}</p></div>
        <div className="pareto-method-grid"><div><h3>{t("固定九题等权")}</h3><p>{t("单张成本 =（6 道生成费用 + 3 道编辑费用）÷ 9。每题 1 张，编辑含 1 张 2048×1152 源图。沿用原分辨率和质量条件，不按成功图片数重新加权。测试费用含当前公开题位内的调用尝试，不含审评费用。")}</p></div><div><h3>{t("汇率与精度")}</h3><p>{t("CNY × 1.1460 ÷ 7.6755 = USD；采用 ECB")}{OFFICIAL_PRICES.fx.date} {t("参考汇率。USD 账单不换汇。前沿使用原始分数与精确价格，主界面小数位仅用于显示。")}</p><a href={OFFICIAL_PRICES.fx.source} target="_blank" rel="noreferrer">{t("ECB 参考汇率")}</a></div><div><h3>{t("数据与计算范围")}</h3><p>{t("正式榜单")}{models.length} {t("个模型；前沿只在当前维度、搜索、模型研发厂商与预算范围内计算。缩放只改变视窗。连线为视觉引导。缺价不记零，官方估算不进入前沿。")}</p><p>{t("价格查询 / 账单读取：")}{OFFICIAL_PRICES.checkedAt}{t("。原评分、评语、费用和生成证据保持不变。")}</p></div></div>
        <details className="pareto-exclusions"><summary>{t("未纳入成本比较的模型 · 当前搜索与模型研发厂商范围")}{filtered.missing.length} {t("个")}</summary><ul>{filtered.missing.map(({ model, price }) => <li key={benchmarkRecordKey(model)}><a href={profileHref(model)}>{model.displayName}</a><code>{model.modelId}</code><p>{t(price.reason || '当前评分维度无正式分数。')}</p></li>)}</ul></details>
        <details className="pareto-source-details"><summary>{t("完整价格来源与逐题计算 ·")}{rows.length} {t("个模型")}</summary><PriceTable rows={rows} /></details>
      </div>
    </details>
  </section>
}
