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
  return status === 'published' || status === 'verified' ? '已发布' : status === 'superseded' ? '已被修正' : '未发布'
}

function modelStatus(model, release) {
  return model.profileStatus || release.profileStatus || 'provisional'
}

function dimensionEntries(model) {
  return axes
    .map((axis) => [axis, model.dimensions?.[axis]])
    .filter(([, dimension]) => dimension && Number.isFinite(Number(dimension.mean)))
}

const providerLabels = Object.freeze({ bailian: '阿里百炼', ark: '火山方舟', openrouter: 'OpenRouter' })

function providerName(provider) {
  return providerLabels[provider] || provider || '未记录'
}

function pixelSummary(model) {
  const values = Array.isArray(model.actualOutputPixels) ? model.actualOutputPixels : []
  const unique = [...new Set(values.map((item) => Number.isInteger(item?.width) && Number.isInteger(item?.height) ? `${item.width}×${item.height}` : '').filter(Boolean))]
  return unique.length ? unique.join(' / ') : '像素未记录'
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
  const ranked = useMemo(() => {
    const eligible = models.filter((model) => model.ranked !== false && Number.isFinite(Number(model.dimensions?.[activeAxis]?.mean)))
      .sort((left, right) => Number(right.dimensions[activeAxis].mean) - Number(left.dimensions[activeAxis].mean))
    const unranked = models.filter((model) => !eligible.includes(model))
    return [...eligible, ...unranked]
  }, [models, activeAxis])
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
        <p>冻结生产注册表，把别名与跨渠道重复路线归一为实际模型；每个实际模型固定 4 张图，由 Codex 全量两遍盲审。榜单用于观察差异，不产生综合总分。</p>
        <div className="bench-meta" aria-label="发布元数据">
          <span className="accent">{release.suiteId}</span>
          <span>{release.evaluationMode === 'codex_single' ? 'Codex 单审' : release.judgeEpoch}</span>
          <span>{release.evaluationEpoch || release.reviewerEpoch || 'Codex epoch 待记录'}</span>
          <span>Standard · 4 题</span>
          <span>{statusLabel(release.profileStatus)}</span>
          <span>{release.sampleCount || 0} 张</span>
          <span>审计 {percentage(release.auditRatio)}</span>
        </div>
      </header>

      <section className="bench-section" aria-labelledby="bench-features-title">
        <div className="bench-section-head">
          <div><h2 id="bench-features-title">模型特点速览</h2><p>七维质量画像；实际像素、速度、生成成本与成功率单列，不折算成总分。</p></div>
          <span>{models.length} 个实际模型</span>
        </div>
        <div className="bench-model-grid">
          {models.map((model) => <ModelCard key={identity(model)} model={model} release={release} onSelect={() => onSelectModel(identity(model))} />)}
        </div>
      </section>

      <section className="bench-section" aria-labelledby="bench-ranking-title">
        <div className="bench-section-head">
          <div><h2 id="bench-ranking-title">单维排行榜</h2><p>同一 Standard 题集与 evaluation epoch；不同原生分辨率同榜，但完整披露实际像素。</p></div>
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
            const eligible = model.ranked !== false && Number.isFinite(Number(dimension?.mean))
            const rank = eligible ? ranked.slice(0, index + 1).filter((item) => item.ranked !== false && Number.isFinite(Number(item.dimensions?.[activeAxis]?.mean))).length : 0
            return (
              <button className="bench-rank-row" type="button" key={identity(model)} onClick={() => onSelectModel(identity(model))}>
                <span className="bench-rank">{eligible ? String(rank).padStart(2, '0') : '—'}</span>
                <span className="bench-rank-model"><strong>{model.displayName || model.modelId}</strong><small>{providerName(model.primaryAccessProvider || model.provider)} · {model.developer || '开发者未记录'} · {pixelSummary(model)}</small></span>
                <span className="bench-score">{eligible ? score(dimension.mean) : '—'}</span>
                <span>{eligible && dimension?.ci95 ? `${score(dimension.ci95.low)}–${score(dimension.ci95.high)}` : '—'}</span>
                <span>{model.successRate === undefined ? '—' : percentage(model.successRate)}</span>
                <span>{model.sampleCount || 0}</span>
                <span className={`bench-status ${eligible ? status : 'insufficient'}`}>{eligible ? statusLabel(status) : '样本不足'}</span>
              </button>
            )
          })}
          <p className="bench-ranking-note">至少成功并审核 3/4 张才进入质量排名；其余模型仍保留在公开目录。样本量小、单一审阅者、不同原生分辨率同榜，均属于已知限制。</p>
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
            <li>固定 4 个原创诊断题，每个实际模型每题只生成一次，禁止自动重试。</li>
            <li>自动 Judge 调用为 0；全部成功图片由 Codex 全量两遍结构化盲审。</li>
            <li>模型身份、渠道与历史分数不进入审核包；图片、题目要求和 rubric 均以 hash 绑定。</li>
            <li>题集、registry、归一映射、价格、代码与 release hash 全部版本化。</li>
          </ul>
          <div className="bench-limit"><ShieldCheck size={17} /><span>Codex 是单一结构化审阅者，不标注为人类专家。公开费用仅含生图；实际像素、成功率、延迟和成本不混入质量分。</span></div>
        </div>
      </section>

      {selected ? <ModelProfileDialog model={selected} release={release} evidence={(release.evidence || []).filter((item) => item.profileId ? item.profileId === identity(selected) : item.modelId === selected.modelId)} onClose={() => onSelectModel('')} /> : null}
    </main>
  )
}

function ModelCard({ model, release, onSelect }) {
  const status = modelStatus(model, release)
  const topDimensions = dimensionEntries(model).sort(([, left], [, right]) => Number(right.mean) - Number(left.mean)).slice(0, 3)
  const alternateProviders = Array.isArray(model.alternateAccessProviders) ? model.alternateAccessProviders : []
  return (
    <button type="button" className="bench-model-card" onClick={onSelect}>
      <span className="bench-model-title"><strong>{model.displayName || model.modelId}</strong><span className={`bench-status ${model.ranked === false ? 'insufficient' : status}`}>{model.ranked === false ? '样本不足' : statusLabel(status)}</span></span>
      <span className="bench-model-origin"><span>主接入：{providerName(model.primaryAccessProvider || model.provider)}</span><span>开发者：{model.developer || '未记录'}</span></span>
      <span className="bench-traits muted">{model.ranked === false ? '样本不足、未排名' : `实际输出：${pixelSummary(model)}`}{alternateProviders.length ? ` · 替代 ${alternateProviders.map(providerName).join('、')}` : ''}</span>
      <span className="bench-bars">
        {topDimensions.map(([axis, dimension]) => <span className="bench-bar" key={axis}><small>{BENCHMARK_AXIS_LABELS[axis]}</small><i><i style={{ width: `${Math.min(100, Number(dimension.mean) * 10)}%` }} /></i><b>{score(dimension.mean)}</b></span>)}
      </span>
      <span className="bench-ops"><span><b>{model.successRate === undefined ? '—' : percentage(model.successRate)}</b>成功率</span><span><b>{model.latency?.p50Seconds ? `${model.latency.p50Seconds}s` : '—'}</b>P50</span><span><b>{model.sampleCount || 0}/4</b>样本</span><span><b>{Number.isFinite(Number(model.estimatedCost?.usd)) ? `$${Number(model.estimatedCost.usd).toFixed(2)}` : '—'}</b>生图成本</span></span>
    </button>
  )
}

function EvidenceGallery({ evidence }) {
  if (!evidence.length) return <div className="bench-empty-evidence">首个公开证据 allowlist 尚未发布。</div>
  return <div className="bench-gallery">{evidence.slice(0, 6).map((item) => <figure key={item.sampleId}><img src={item.imageUrl} alt={item.caption || `${item.kind} 样本`} /><figcaption><b>{item.kind === 'median' ? '中位样本' : item.kind === 'strength' ? '强项样本' : '典型失败'}</b>{item.caption}</figcaption></figure>)}</div>
}

function ModelProfileDialog({ model, release, evidence, onClose }) {
  const status = modelStatus(model, release)
  const alternateProviders = Array.isArray(model.alternateAccessProviders) ? model.alternateAccessProviders : []
  return (
    <div className="bench-dialog-backdrop" onClick={onClose}>
      <section className="bench-profile-dialog" role="dialog" aria-modal="true" aria-label={`${model.displayName || model.modelId} 完整画像`} data-model-id={model.modelId} onClick={(event) => event.stopPropagation()}>
        <button className="bench-dialog-close" type="button" aria-label="关闭模型画像" onClick={onClose}><X /></button>
        <div className="bench-eyebrow">MODEL PROFILE · {model.ranked === false ? '样本不足、未排名' : statusLabel(status)}</div>
        <h2>{model.displayName || model.modelId}</h2>
        <p className="bench-profile-origin">主接入渠道：<b>{providerName(model.primaryAccessProvider || model.provider)}</b>　替代渠道：<b>{alternateProviders.length ? alternateProviders.map(providerName).join('、') : '无'}</b>　模型开发者：<b>{model.developer || '未记录'}</b></p>
        <p className="bench-profile-origin">成功样本：<b>{model.sampleCount || 0}/4</b>　实际输出：<b>{pixelSummary(model)}</b>　生成成本：<b>{Number.isFinite(Number(model.estimatedCost?.usd)) ? `$${Number(model.estimatedCost.usd).toFixed(2)}` : '未记录'}</b></p>
        <div className="bench-profile-dimensions">
          {dimensionEntries(model).map(([axis, dimension]) => <div key={axis}><span>{BENCHMARK_AXIS_LABELS[axis]}</span><b>{score(dimension.mean)}</b><small>{dimension.ci95 ? `${score(dimension.ci95.low)}–${score(dimension.ci95.high)}` : '区间待发布'}</small></div>)}
        </div>
        <div className="bench-profile-audit"><ShieldCheck size={18} /><span>Codex 全量两遍结构化盲审 · {release.evaluationEpoch || release.reviewerEpoch || 'reviewer epoch 未记录'} · 自动 Judge 0 次</span></div>
        <h3>公开证据</h3>
        <EvidenceGallery evidence={evidence} />
      </section>
    </div>
  )
}
