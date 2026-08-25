import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BarChart3, ExternalLink, Loader2, ShieldCheck, X } from 'lucide-react'
import { benchmarkLeaderboardRequest } from '@paperbanana/api'

export const BENCHMARK_AXIS_LABELS = Object.freeze({
  faithfulness: '忠实度',
  conciseness: '简洁度',
  readability: '可读性',
  aesthetics: '美观度',
  text_accuracy: '文字 / 符号',
  topology: '拓扑关系',
  instruction_adherence: '指令遵从',
})

const axes = Object.keys(BENCHMARK_AXIS_LABELS)

function score(value) {
  return Number(value || 0).toFixed(1)
}

function percentage(value) {
  return `${Math.round(Number(value || 0) * 100)}%`
}

function statusLabel(status) {
  return status === 'verified' ? '正式画像' : status === 'superseded' ? '已被修正' : '临时画像'
}

function modelStatus(model, release) {
  return model.profileStatus || release.profileStatus || 'provisional'
}

function dimensionEntries(model) {
  return axes
    .map((axis) => [axis, model.dimensions?.[axis]])
    .filter(([, dimension]) => dimension && Number.isFinite(Number(dimension.mean)))
}

function updateModelQuery(modelId) {
  if (!globalThis.history || !globalThis.location) return
  const url = new URL(globalThis.location.href)
  if (modelId) url.searchParams.set('model', modelId)
  else url.searchParams.delete('model')
  globalThis.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

export default function BenchmarkPage({ apiBase, backendMode = 'gateway', enabled = true }) {
  const [release, setRelease] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(enabled)
  const [selectedModelId, setSelectedModelId] = useState(() => new URLSearchParams(globalThis.location?.search || '').get('model') || '')

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    setLoading(true)
    benchmarkLeaderboardRequest(apiBase, { backendMode })
      .then((data) => { if (!cancelled) setRelease(data.release || null) })
      .catch((reason) => { if (!cancelled) setError(reason?.message || String(reason)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [apiBase, backendMode, enabled])

  if (!enabled) return <BenchmarkUnavailable />
  if (loading) return <div className="bench-state"><Loader2 className="spin" />正在读取不可变横评 release…</div>
  if (error) return <div className="bench-state bench-state-error">模型横评暂不可用：{error}</div>
  if (!release) return <div className="bench-state">尚未发布首个模型画像。Worker 保持只发现、不调用。</div>

  function selectModel(modelId) {
    setSelectedModelId(modelId)
    updateModelQuery(modelId)
  }

  return <BenchmarkObservatory release={release} selectedModelId={selectedModelId} onSelectModel={selectModel} />
}

function BenchmarkUnavailable() {
  return (
    <main className="bench-state">
      <BarChart3 size={28} />
      <strong>模型横评尚未开放</strong>
      <span>该页面受 feature flag 控制，公开数据与运行队列彼此隔离。</span>
      <a href="/"><ArrowLeft size={15} />返回工作台</a>
    </main>
  )
}

export function BenchmarkObservatory({ release, selectedModelId, onSelectModel }) {
  const [activeAxis, setActiveAxis] = useState('text_accuracy')
  const models = Array.isArray(release.models) ? release.models : []
  const ranked = useMemo(() => [...models].sort((left, right) =>
    Number(right.dimensions?.[activeAxis]?.mean || -1) - Number(left.dimensions?.[activeAxis]?.mean || -1)), [models, activeAxis])
  const identity = (model) => model.profileId || model.modelId
  const selected = models.find((model) => identity(model) === selectedModelId)

  return (
    <main className="bench-shell">
      <nav className="bench-nav" aria-label="模型横评导航">
        <a className="bench-brand" href="/"><span>🍌</span> PaperBanana</a>
        <a href="/">工作台</a>
        <span aria-current="page">模型横评</span>
        <a href="#methodology">方法学</a>
        <a href="https://github.com/zdywrnm/PaperBanana-clients" target="_blank" rel="noreferrer">GitHub <ExternalLink size={12} /></a>
      </nav>

      <header className="bench-hero">
        <div className="bench-eyebrow">PAPERBANANA IMAGE MODEL OBSERVATORY</div>
        <h1>不是谁“第一”，而是谁更适合你的图</h1>
        <p>固定原创提示、双模型盲评、Codex 结构化审核。先看模型特点，再按单一维度核对相对位置、置信区间与同题证据。</p>
        <div className="bench-meta" aria-label="发布元数据">
          <span className="accent">{release.suiteId}</span>
          <span>{release.judgeEpoch}</span>
          <span>{release.reviewerEpoch || 'Codex epoch 待记录'}</span>
          <span>{release.lane}</span>
          <span>{statusLabel(release.profileStatus)}</span>
          <span>{release.sampleCount || 0} 张</span>
          <span>审计 {percentage(release.auditRatio)}</span>
        </div>
      </header>

      <section className="bench-section" aria-labelledby="bench-features-title">
        <div className="bench-section-head">
          <div><h2 id="bench-features-title">模型特点速览</h2><p>七维质量画像；速度、成本与成功率单列，不折算成总分。</p></div>
          <span>{models.length} 个已发布模型</span>
        </div>
        <div className="bench-model-grid">
          {models.map((model) => <ModelCard key={identity(model)} model={model} release={release} onSelect={() => onSelectModel(identity(model))} />)}
        </div>
      </section>

      <section className="bench-section" aria-labelledby="bench-ranking-title">
        <div className="bench-section-head">
          <div><h2 id="bench-ranking-title">单维排行榜</h2><p>只比较相同题集、分辨率赛道和 judge epoch；不产生综合总榜。</p></div>
          <span>95% bootstrap 区间</span>
        </div>
        <div className="bench-ranking">
          <div className="bench-axis-tabs" role="tablist" aria-label="选择评分维度">
            {axes.map((axis) => (
              <button key={axis} type="button" role="tab" aria-selected={axis === activeAxis} className={axis === activeAxis ? 'active' : ''} onClick={() => setActiveAxis(axis)}>
                {BENCHMARK_AXIS_LABELS[axis]}
              </button>
            ))}
          </div>
          <div className="bench-rank-head" aria-hidden="true"><span>名次</span><span>模型</span><span>得分</span><span>95% 区间</span><span>成功率</span><span>样本</span><span>状态</span></div>
          {ranked.map((model, index) => {
            const dimension = model.dimensions?.[activeAxis]
            const status = modelStatus(model, release)
            return (
              <button className="bench-rank-row" type="button" key={identity(model)} onClick={() => onSelectModel(identity(model))}>
                <span className="bench-rank">{status === 'verified' ? String(ranked.slice(0, index + 1).filter((item) => modelStatus(item, release) === 'verified').length).padStart(2, '0') : '—'}</span>
                <span className="bench-rank-model"><strong>{model.displayName || model.modelId}</strong><small>{model.providerLabel || model.provider} · {model.developer || '开发者未记录'}</small></span>
                <span className="bench-score">{dimension ? score(dimension.mean) : '—'}</span>
                <span>{dimension?.ci95 ? `${score(dimension.ci95.low)}–${score(dimension.ci95.high)}` : '—'}</span>
                <span>{model.successRate === undefined ? '—' : percentage(model.successRate)}</span>
                <span>{model.sampleCount || 0}</span>
                <span className={`bench-status ${status}`}>{statusLabel(status)}</span>
              </button>
            )
          })}
          <p className="bench-ranking-note">临时画像可参与展示，但不能获得“维度领先”或相对强项标签；不同分辨率赛道禁止直接排名。</p>
        </div>
      </section>

      <section className="bench-evidence-method bench-section" id="methodology">
        <div className="bench-evidence">
          <h2>同题证据</h2>
          <p>中位、强项与典型失败均来自 release allowlist，图片地址短期签发。</p>
          <EvidenceGallery evidence={release.evidence || []} />
        </div>
        <div className="bench-method">
          <h2>为什么可以审计这张榜</h2>
          <ul>
            <li>临时集固定 12×2；正式集固定 48×3，先题内聚合再跨题统计。</li>
            <li>OpenRouter Gemini 与百炼 Qwen 双盲评；身份不进入评审提示。</li>
            <li>分歧、异常、公开证据与固定 10% 进入 Codex 结构化审核。</li>
            <li>题集、rubric、registry、价格、代码与 release hash 全部版本化。</li>
          </ul>
          <div className="bench-limit"><ShieldCheck size={17} /><span>Codex 是结构化审计者，不标注为人类专家。成功率、能力覆盖、稳定性、延迟和估算成本不混入质量分。</span></div>
        </div>
      </section>

      {selected ? <ModelProfileDialog model={selected} release={release} evidence={(release.evidence || []).filter((item) => item.profileId ? item.profileId === identity(selected) : item.modelId === selected.modelId)} onClose={() => onSelectModel('')} /> : null}
    </main>
  )
}

function ModelCard({ model, release, onSelect }) {
  const status = modelStatus(model, release)
  const topDimensions = dimensionEntries(model).sort(([, left], [, right]) => Number(right.mean) - Number(left.mean)).slice(0, 3)
  const traits = status === 'verified' ? (model.traits || []) : []
  return (
    <button type="button" className="bench-model-card" onClick={onSelect}>
      <span className="bench-model-title"><strong>{model.displayName || model.modelId}</strong><span className={`bench-status ${status}`}>{statusLabel(status)}</span></span>
      <span className="bench-model-origin"><span>接入：{model.providerLabel || model.provider || '未记录'}</span><span>开发者：{model.developer || '未记录'}</span></span>
      {traits.length ? <span className="bench-traits">{traits.slice(0, 2).map((trait) => `${BENCHMARK_AXIS_LABELS[trait.axis]}${trait.direction === 'strength' ? '强项' : '短板'}`).join(' · ')}</span> : <span className="bench-traits muted">{status === 'provisional' ? '样本仍少，暂不生成强弱标签' : '暂无满足置信阈值的标签'}</span>}
      <span className="bench-bars">
        {topDimensions.map(([axis, dimension]) => <span className="bench-bar" key={axis}><small>{BENCHMARK_AXIS_LABELS[axis]}</small><i><i style={{ width: `${Math.min(100, Number(dimension.mean) * 10)}%` }} /></i><b>{score(dimension.mean)}</b></span>)}
      </span>
      <span className="bench-ops"><span><b>{model.successRate === undefined ? '—' : percentage(model.successRate)}</b>成功率</span><span><b>{model.latency?.p50Seconds ? `${model.latency.p50Seconds}s` : '—'}</b>P50</span><span><b>{model.sampleCount || 0}</b>样本</span></span>
    </button>
  )
}

function EvidenceGallery({ evidence }) {
  if (!evidence.length) return <div className="bench-empty-evidence">首个公开证据 allowlist 尚未发布。</div>
  return <div className="bench-gallery">{evidence.slice(0, 6).map((item) => <figure key={item.sampleId}><img src={item.imageUrl} alt={item.caption || `${item.kind} 样本`} /><figcaption><b>{item.kind === 'median' ? '中位样本' : item.kind === 'strength' ? '强项样本' : '典型失败'}</b>{item.caption}</figcaption></figure>)}</div>
}

function ModelProfileDialog({ model, release, evidence, onClose }) {
  const status = modelStatus(model, release)
  return (
    <div className="bench-dialog-backdrop" onClick={onClose}>
      <section className="bench-profile-dialog" role="dialog" aria-modal="true" aria-label={`${model.displayName || model.modelId} 完整画像`} data-model-id={model.modelId} onClick={(event) => event.stopPropagation()}>
        <button className="bench-dialog-close" type="button" aria-label="关闭模型画像" onClick={onClose}><X /></button>
        <div className="bench-eyebrow">MODEL PROFILE · {statusLabel(status)}</div>
        <h2>{model.displayName || model.modelId}</h2>
        <p className="bench-profile-origin">接入渠道：<b>{model.providerLabel || model.provider}</b>　模型开发者：<b>{model.developer || '未记录'}</b></p>
        <div className="bench-profile-dimensions">
          {dimensionEntries(model).map(([axis, dimension]) => <div key={axis}><span>{BENCHMARK_AXIS_LABELS[axis]}</span><b>{score(dimension.mean)}</b><small>{dimension.ci95 ? `${score(dimension.ci95.low)}–${score(dimension.ci95.high)}` : '区间待发布'}</small></div>)}
        </div>
        <div className="bench-profile-audit"><ShieldCheck size={18} /><span>Codex 结构化审核 · {release.reviewerEpoch || 'reviewer epoch 未记录'} · 审计 {percentage(release.auditRatio)}</span></div>
        <h3>公开证据</h3>
        <EvidenceGallery evidence={evidence} />
      </section>
    </div>
  )
}
