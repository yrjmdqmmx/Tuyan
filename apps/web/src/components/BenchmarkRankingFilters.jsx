import { useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useBenchmarkLocale } from './BenchmarkLocale.jsx'
import { benchmarkDeveloperOptions } from './benchmarkDevelopers.js'

export default function BenchmarkRankingFilters({ models, count, query, vendor, onQuery, onVendor, viewSwitch }) {
  const { t, locale } = useBenchmarkLocale()
  const [open, setOpen] = useState(false)
  const options = benchmarkDeveloperOptions(models, locale)
  const reset = () => { onQuery(''); onVendor('') }
  return <section className="bench-ranking-filters" aria-label={t('排名筛选')}>
    <div className="pareto-toolbar">
      {viewSwitch}
      <label className="pareto-search"><Search size={17} /><input type="search" aria-label={t('模型搜索')} placeholder={t('搜索模型、ID 或研发厂商')} value={query} onChange={event => onQuery(event.target.value)} />{query && <button type="button" aria-label={t('清空搜索')} onClick={() => onQuery('')}><X size={14} /></button>}</label>
      <button type="button" className="pareto-filter-toggle" aria-expanded={open} aria-controls="ranking-filters" onClick={() => setOpen(value => !value)}><SlidersHorizontal size={16} />{t(open ? '收起筛选' : '筛选')}{vendor && <b>1</b>}</button>
    </div>
    {open && <div className="pareto-filters bench-ranking-filter-panel" id="ranking-filters">
      <label className="pareto-vendor-label">{t('模型研发厂商')}<select aria-label={t('模型研发厂商')} value={vendor} onChange={event => onVendor(event.target.value)}><option value="">{t('全部研发厂商')}</option>{options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
    </div>}
    <div className="pareto-active-filters bench-ranking-summary" role="status">
      <span>{t('匹配 {count} / {total} 个模型', { count, total: models.length })}</span>
      {vendor && <span className="bench-filter-chip">{t('模型研发厂商')}：{options.find(option => option.id === vendor)?.label || t('待确认')}</span>}
      {query && <span className="bench-filter-chip">{t('搜索')}：{query}</span>}
      {(query || vendor) && <button type="button" onClick={reset}>{t('清空条件')}<X size={12} /></button>}
    </div>
    <p className="bench-ranking-scope">{t('筛选仅改变展示范围；名次为完整榜单的正式名次，分数为原始得分。维度 Top10 从匹配模型中选取。')}</p>
    {count === 0 && <div className="bench-empty" role="status"><strong>{t('没有匹配的模型')}</strong><p>{t('请调整搜索或模型研发厂商，或清空条件查看全部模型。')}</p><button type="button" onClick={reset}>{t('清空条件')}</button></div>}
  </section>
}
