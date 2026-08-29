import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowUpDown, BarChart3, ExternalLink, Loader2, Search } from 'lucide-react'
import { benchmarkLeaderboardRequest } from '@paperbanana/api'

import { appPath } from '../appPaths.js'
import { LEADERBOARD_AXES, resolveLeaderboardRoute } from '../leaderboardRoutes.js'

export const BENCHMARK_AXIS_LABELS = Object.freeze(Object.fromEntries(LEADERBOARD_AXES.map((axis) => [axis.id, axis.label])))

const OVERALL_METRIC = Object.freeze({ id: 'overall', label: 'Overall' })
const WORKSPACE_HREF = appPath('/')
const LEADERBOARD_HREF = appPath('/leaderboard')
const LOGO_HREF = appPath('/logo.svg')

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function formatScore(value) {
  const numeric = finiteNumber(value)
  return numeric === null ? '—' : numeric.toFixed(2)
}

function modelIdentity(model) {
  return model.modelId || model.canonicalModelId || model.profileId || ''
}

function modelName(model) {
  return model.displayName || modelIdentity(model) || '未命名模型'
}

function metricValue(model, metricId) {
  return metricId === 'overall' ? finiteNumber(model.overallScore) : finiteNumber(model.dimensions?.[metricId]?.mean)
}

function metricRank(model, metricId) {
  const rank = metricId === 'overall' ? finiteNumber(model.overallRank) : finiteNumber(model.dimensionRanks?.[metricId])
  return rank === null ? null : rank
}

function rankClass(rank) {
  return rank && rank <= 3 ? `rank-top-${rank}` : ''
}

function compareByMetric(left, right, metricId) {
  const leftValue = metricValue(left, metricId)
  const rightValue = metricValue(right, metricId)
  if (leftValue === null && rightValue === null) return modelName(left).localeCompare(modelName(right), 'zh-CN')
  if (leftValue === null) return 1
  if (rightValue === null) return -1
  return rightValue - leftValue || modelName(left).localeCompare(modelName(right), 'zh-CN')
}

function matchesQuery(model, query) {
  if (!query) return true
  const haystack = `${modelName(model)} ${modelIdentity(model)}`.toLocaleLowerCase('zh-CN')
  return haystack.includes(query.trim().toLocaleLowerCase('zh-CN'))
}

function MetricValue({ model, metricId }) {
  const value = metricValue(model, metricId)
  const rank = metricRank(model, metricId)
  if (value === null || rank === null) return '—'
  return <span>#{rank} · {formatScore(value)}</span>
}

function LeaderboardNav({ methodologyHref = '#methodology' }) {
  return (
    <nav className="bench-nav" aria-label="排行榜导航">
      <a className="bench-brand" href={WORKSPACE_HREF}><img src={LOGO_HREF} alt="" />PaperBanana</a>
      <a href={WORKSPACE_HREF}>工作台</a>
      <span aria-current="page">排行榜</span>
      <a href={methodologyHref}>方法说明</a>
      <a href="https://github.com/zdywrnm/PaperBanana-clients" target="_blank" rel="noreferrer">GitHub <ExternalLink size={12} /></a>
    </nav>
  )
}

function LeaderboardHero({ release }) {
  return (
    <header className="bench-hero">
      <div className="bench-eyebrow">PAPERBANANA IMAGE MODEL LEADERBOARD</div>
      <h1>生图模型排行榜</h1>
      <p>用同一套轻量诊断题观察模型在七个关键维度上的真实差异，并以七维等权均值形成可比较的 Overall 排名。</p>
      <div className="bench-meta" aria-label="排行榜方法摘要">
        <span className="accent">{release.eligibleModelCount ?? release.models?.length ?? 0} 个合格模型</span>
        <span>固定 4 题 · 每模型 4 张</span>
        <span>Codex 双遍盲审</span>
        <span>七维等权</span>
      </div>
    </header>
  )
}

function Methodology() {
  return (
    <section className="bench-methodology bench-section" id="methodology" aria-labelledby="bench-methodology-title">
      <div>
        <div className="bench-eyebrow">METHODOLOGY</div>
        <h2 id="bench-methodology-title">读榜前需要知道</h2>
      </div>
      <ul>
        <li><strong>固定 4 题 / 每模型 4 张：</strong>所有模型使用同一组原创诊断任务。</li>
        <li><strong>Codex 全量两遍结构化盲审：</strong>审核时隐藏模型身份与渠道信息。</li>
        <li><strong>不同原生分辨率同榜：</strong>比较最终可用结果，不将分辨率折算为加分。</li>
        <li><strong>七维等权：</strong>Overall 是七项原始均分的等权平均。</li>
        <li><strong>轻量样本限制：</strong>榜单适合方向性比较，不替代具体业务场景实测。</li>
      </ul>
    </section>
  )
}

function DimensionCard({ axis, models }) {
  const ranked = useMemo(() => [...models].sort((left, right) => compareByMetric(left, right, axis.id)).slice(0, 10), [axis.id, models])
  return (
    <article className="bench-dimension-card">
      <header>
        <div><span>{axis.label}</span><small>TOP10</small></div>
        <strong>Top10</strong>
      </header>
      <ol>
        {ranked.map((model) => {
          const score = metricValue(model, axis.id)
          const rank = metricRank(model, axis.id)
          return (
            <li className="bench-mini-row" key={modelIdentity(model)}>
              <b className={rankClass(rank)}>#{rank ?? '—'}</b>
              <span><strong>{modelName(model)}</strong><small>{modelIdentity(model)}</small></span>
              <i aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, (score || 0) * 10))}%` }} /></i>
              <em>{formatScore(score)}</em>
            </li>
          )
        })}
      </ol>
      <a href={appPath(`/leaderboard/${axis.slug}`)}>查看完整排名 <span aria-hidden="true">→</span></a>
    </article>
  )
}

function DimensionGrid({ models }) {
  return (
    <section className="bench-section" aria-labelledby="bench-dimensions-title">
      <div className="bench-section-head">
        <div><div className="bench-eyebrow">DIMENSION LEADERS</div><h2 id="bench-dimensions-title">七维 Top10</h2><p>先看各维度强项，再进入下方综合矩阵横向比较。</p></div>
      </div>
      <div className="bench-dimension-grid">
        {LEADERBOARD_AXES.map((axis) => <DimensionCard axis={axis} models={models} key={axis.id} />)}
      </div>
    </section>
  )
}

function MatrixHeader({ metric, activeMetric, onSort }) {
  const active = metric.id === activeMetric
  return (
    <th scope="col" {...(active ? { 'aria-sort': 'descending' } : {})}>
      <button type="button" aria-label={`按${metric.label}排序`} onClick={() => onSort(metric.id)}>
        {metric.label}<ArrowUpDown size={13} aria-hidden="true" />
      </button>
    </th>
  )
}

function LeaderboardMatrix({ release, models }) {
  const [query, setQuery] = useState('')
  const [sortMetric, setSortMetric] = useState('overall')
  const deferredQuery = useDeferredValue(query)
  const visibleModels = useMemo(
    () => models.filter((model) => matchesQuery(model, deferredQuery)).sort((left, right) => compareByMetric(left, right, sortMetric)),
    [deferredQuery, models, sortMetric],
  )
  const eligibleCount = release.eligibleModelCount ?? models.length

  return (
    <section className="bench-section bench-matrix-section" aria-labelledby="bench-matrix-title">
      <div className="bench-section-head bench-matrix-head">
        <div><div className="bench-eyebrow">OVERALL MATRIX</div><h2 id="bench-matrix-title">综合总矩阵</h2><p>点击指标表头即可按对应原始分数降序查看；单元格同时展示 competition rank 与得分。</p></div>
        <div className="bench-search">
          <label htmlFor="bench-matrix-search">搜索综合排行榜模型</label>
          <span><Search size={15} aria-hidden="true" /><input id="bench-matrix-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></span>
          <small aria-live="polite">{visibleModels.length} / {eligibleCount}</small>
        </div>
      </div>
      <div className="bench-matrix-scroll" tabIndex="0" aria-label="可横向滚动的综合排行榜">
        <table className="bench-matrix" aria-label="生图模型综合排行榜">
          <thead><tr>
            <th className="bench-model-column" scope="col">模型</th>
            <MatrixHeader metric={OVERALL_METRIC} activeMetric={sortMetric} onSort={setSortMetric} />
            {LEADERBOARD_AXES.map((axis) => <MatrixHeader metric={axis} activeMetric={sortMetric} onSort={setSortMetric} key={axis.id} />)}
          </tr></thead>
          <tbody>
            {visibleModels.map((model) => (
              <tr key={modelIdentity(model)}>
                <th className="bench-model-column" scope="row"><strong>{modelName(model)}</strong><small>{modelIdentity(model)}</small></th>
                <td className={rankClass(metricRank(model, 'overall'))}><MetricValue model={model} metricId="overall" /></td>
                {LEADERBOARD_AXES.map((axis) => <td className={rankClass(metricRank(model, axis.id))} key={axis.id}><MetricValue model={model} metricId={axis.id} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {visibleModels.length === 0 ? <div className="bench-empty">没有匹配的合格模型。</div> : null}
      </div>
    </section>
  )
}

function DimensionLeaderboard({ axis, release, models }) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const ranked = useMemo(
    () => models.filter((model) => matchesQuery(model, deferredQuery)).sort((left, right) => compareByMetric(left, right, axis.id)),
    [axis.id, deferredQuery, models],
  )
  return (
    <main className="bench-shell">
      <LeaderboardNav methodologyHref={`${LEADERBOARD_HREF}#methodology`} />
      <section className="bench-subpage-hero">
        <a href={LEADERBOARD_HREF}><ArrowLeft size={15} />返回综合总榜</a>
        <div className="bench-eyebrow">FULL DIMENSION RANKING</div>
        <h1>{axis.label}完整排名</h1>
        <p>全部 {release.eligibleModelCount ?? models.length} 个合格模型，按原始均分降序排列。</p>
      </section>
      <section className="bench-dimension-full">
        <div className="bench-search">
          <label htmlFor="bench-dimension-search">搜索{axis.label}排名模型</label>
          <span><Search size={15} aria-hidden="true" /><input id="bench-dimension-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></span>
          <small aria-live="polite">{ranked.length} / {release.eligibleModelCount ?? models.length}</small>
        </div>
        <div className="bench-matrix-scroll" tabIndex="0" aria-label={`可横向滚动的${axis.label}完整排名`}>
          <table className="bench-dimension-table" aria-label={`${axis.label}完整排名`}>
            <thead><tr><th scope="col">名次</th><th scope="col">模型</th><th scope="col">分数</th></tr></thead>
            <tbody>{ranked.map((model) => {
              const rank = metricRank(model, axis.id)
              return <tr key={modelIdentity(model)}><td className={rankClass(rank)}>#{rank ?? '—'}</td><th scope="row"><strong>{modelName(model)}</strong><small>{modelIdentity(model)}</small></th><td>{formatScore(metricValue(model, axis.id))}</td></tr>
            })}</tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

function InvalidDimension() {
  return (
    <main className="bench-shell">
      <LeaderboardNav methodologyHref={`${LEADERBOARD_HREF}#methodology`} />
      <section className="bench-not-found">
        <BarChart3 size={30} aria-hidden="true" />
        <h1>没有这个排行榜维度</h1>
        <p>链接可能已失效，返回综合总榜继续浏览七个正式维度。</p>
        <a href={LEADERBOARD_HREF}><ArrowLeft size={15} />返回综合总榜</a>
      </section>
    </main>
  )
}

function BenchmarkUnavailable() {
  return (
    <main className="bench-state">
      <BarChart3 size={28} />
      <strong>排行榜尚未开放</strong>
      <span>该页面当前受功能开关控制。</span>
      <a href={WORKSPACE_HREF}><ArrowLeft size={15} />返回工作台</a>
    </main>
  )
}

export default function BenchmarkPage({ apiBase, backendMode = 'gateway', enabled = true, pathname = globalThis.location?.pathname || '/leaderboard' }) {
  const route = resolveLeaderboardRoute(pathname)
  const [release, setRelease] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled || route.invalidSlug) return undefined
    let cancelled = false
    setLoading(true)
    setError('')
    benchmarkLeaderboardRequest(apiBase, { backendMode })
      .then((data) => { if (!cancelled) setRelease(data.release || null) })
      .catch((reason) => { if (!cancelled) setError(reason?.message || String(reason)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [apiBase, backendMode, enabled, route.invalidSlug])

  if (route.invalidSlug) return <InvalidDimension />
  if (!enabled) return <BenchmarkUnavailable />
  if (loading) return <div className="bench-state"><Loader2 className="spin" />正在读取排行榜…</div>
  if (error) return <div className="bench-state bench-state-error">排行榜暂不可用：{error}</div>
  if (!release) return <div className="bench-state">排行榜尚无已发布数据。</div>
  return <BenchmarkObservatory release={release} pathname={pathname} />
}

export function BenchmarkObservatory({ release, pathname = '/leaderboard' }) {
  const models = Array.isArray(release.models) ? release.models : []
  const route = resolveLeaderboardRoute(pathname)
  if (route.invalidSlug) return <InvalidDimension />
  if (route.dimension) return <DimensionLeaderboard axis={route.dimension} release={release} models={models} />
  return (
    <main className="bench-shell">
      <LeaderboardNav />
      <LeaderboardHero release={release} />
      <Methodology />
      <DimensionGrid models={models} />
      <LeaderboardMatrix release={release} models={models} />
    </main>
  )
}
