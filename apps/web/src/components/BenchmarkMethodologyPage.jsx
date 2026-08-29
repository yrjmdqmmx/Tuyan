import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { benchmarkMethodologyRequest } from '@paperbanana/api'

import { appPath } from '../appPaths.js'
import { normalizeMethodologyResponse } from './benchmarkMethodology.js'

const WORKSPACE_HREF = appPath('/')
const LEADERBOARD_HREF = appPath('/leaderboard')
const LOGO_HREF = appPath('/logo.svg')

const RUBRIC_AXES = Object.freeze([
  Object.freeze({ id: 'faithfulness', label: '忠实度' }),
  Object.freeze({ id: 'conciseness', label: '简洁度' }),
  Object.freeze({ id: 'readability', label: '可读性' }),
  Object.freeze({ id: 'aesthetics', label: '美观度' }),
  Object.freeze({ id: 'text_accuracy', label: '文字 / 符号' }),
  Object.freeze({ id: 'topology', label: '拓扑关系' }),
  Object.freeze({ id: 'instruction_adherence', label: '指令遵从' }),
])

const CONSTRAINT_GROUPS = Object.freeze([
  Object.freeze({ key: 'requiredEntities', label: '必需实体' }),
  Object.freeze({ key: 'requiredRelations', label: '必需关系' }),
  Object.freeze({ key: 'requiredText', label: '必需文字' }),
  Object.freeze({ key: 'forbidden', label: '禁止项' }),
])

function licenseText(license) {
  if (typeof license === 'string') return license
  return [license?.spdx, license?.author, license?.source].filter(Boolean).join(' · ')
}

function MethodologyNav() {
  return (
    <nav className="bench-nav" aria-label="排行榜导航">
      <a className="bench-brand" href={WORKSPACE_HREF}><img src={LOGO_HREF} alt="" />PaperBanana</a>
      <a href={WORKSPACE_HREF}>工作台</a>
      <a href={LEADERBOARD_HREF}>排行榜</a>
      <span aria-current="page">方法说明</span>
      <a href="https://github.com/zdywrnm/PaperBanana-clients" target="_blank" rel="noreferrer">GitHub <ExternalLink size={12} /></a>
    </nav>
  )
}

function MethodologyHero({ data }) {
  const { methodology, releaseHash, suite } = data
  return (
    <header className="bench-method-hero">
      <a className="bench-method-back" href={LEADERBOARD_HREF}><ArrowLeft size={15} />返回综合总榜</a>
      <div className="bench-eyebrow">REPRODUCIBLE METHODOLOGY</div>
      <h1>评测方法与完整题集</h1>
      <p>公开当前 release 的冻结方法、完整提示词、约束与逐维评分原文，便于复核和复现实验。</p>
      <dl className="bench-method-identities">
        <div><dt>Suite ID</dt><dd>{suite.id}</dd></div>
        <div><dt>Suite manifest</dt><dd className="bench-method-hash">{suite.manifestHash}</dd></div>
        <div><dt>Release hash</dt><dd className="bench-method-hash">{releaseHash}</dd></div>
        <div><dt>Evaluation mode</dt><dd>{methodology.evaluationMode}</dd></div>
        <div><dt>Evaluation epoch</dt><dd>{methodology.evaluationEpoch}</dd></div>
        <div><dt>License</dt><dd>{licenseText(suite.license)}</dd></div>
      </dl>
    </header>
  )
}

function PageDirectory() {
  return (
    <nav className="bench-method-directory" aria-label="方法说明目录">
      <strong>本页目录</strong>
      <a href="#evaluation-process">01 评测流程</a>
      <a href="#public-suite">02 完整题集</a>
      <a href="#scoring-contract">03 评分与排名</a>
      <a href="#review-limits">04 审核与限制</a>
    </nav>
  )
}

function EvaluationProcess({ data }) {
  const { methodology, scoring, suite } = data
  const automaticJudgeCount = Array.isArray(methodology.automaticJudges) ? methodology.automaticJudges.length : 0
  return (
    <section className="bench-method-section" id="evaluation-process" aria-labelledby="evaluation-process-title">
      <div className="bench-method-section-head"><span>01</span><div><div className="bench-eyebrow">PROCESS</div><h2 id="evaluation-process-title">评测流程</h2></div></div>
      <ol className="bench-method-steps">
        <li><b>01</b><div><strong>冻结 / 归一模型</strong><p>以同一 evaluation epoch <code>{methodology.evaluationEpoch}</code> 固定比较边界。</p></div></li>
        <li><b>02</b><div><strong>每模型四题各一次</strong><p>固定 {suite.cases.length} 题、每模型最多 {scoring.maximumSamplesPerModel} 张，禁止自动重试。</p></div></li>
        <li><b>03</b><div><strong>Codex 两遍结构化盲审</strong><p>{methodology.reviewerKind} · {methodology.reviewerPasses} 遍 · automaticJudges = {automaticJudgeCount}。</p></div></li>
        <li><b>04</b><div><strong>至少 3 / 4 入榜</strong><p>七维等权，采用 competition 1, 1, 3 的并列名次。</p></div></li>
      </ol>
    </section>
  )
}

function CopyPromptButton({ caseTitle, kind, prompt, onCopy }) {
  const label = kind === 'positive' ? '正向' : '负向'
  return <button type="button" aria-label={`复制${label}提示词：${caseTitle}`} onClick={() => onCopy(kind, prompt)}><Copy size={14} />复制{label}提示词</button>
}

function PromptBlock({ caseTitle, kind, prompt, onCopy }) {
  const label = kind === 'positive' ? '正向 renderPrompt' : '负向 negativePrompt'
  return (
    <section className="bench-method-prompt-block">
      <header><h4>{label}</h4><CopyPromptButton caseTitle={caseTitle} kind={kind} prompt={prompt} onCopy={onCopy} /></header>
      <pre className="bench-method-prompt">{prompt}</pre>
    </section>
  )
}

function ConstraintGroup({ label, values }) {
  const items = Array.isArray(values) ? values : []
  return (
    <section className="bench-method-constraint" aria-label={label}>
      <h3>{label}</h3>
      {items.length ? <ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>无</p>}
    </section>
  )
}

function RubricTable({ benchmarkCase }) {
  return (
    <div className="bench-method-rubric-wrap">
      <table className="bench-method-rubric" aria-label={`${benchmarkCase.title} 七维评分原文`}>
        <thead><tr><th scope="col">维度</th><th scope="col">评分原文</th></tr></thead>
        <tbody>{RUBRIC_AXES.map((axis) => (
          <tr key={axis.id}><th scope="row">{axis.label}</th><td>{benchmarkCase.rubric?.[axis.id] ?? ''}</td></tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function MethodologyCase({ benchmarkCase, index }) {
  const [copyStatus, setCopyStatus] = useState('')
  const copyOperationRef = useRef(0)
  const statusTimerRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      copyOperationRef.current += 1
      if (statusTimerRef.current !== null) globalThis.clearTimeout(statusTimerRef.current)
    }
  }, [])

  const copyPrompt = async (kind, prompt) => {
    const operation = copyOperationRef.current + 1
    copyOperationRef.current = operation
    if (statusTimerRef.current !== null) {
      globalThis.clearTimeout(statusTimerRef.current)
      statusTimerRef.current = null
    }
    setCopyStatus('')
    const label = kind === 'positive' ? '正向' : '负向'
    let status
    try {
      if (!globalThis.navigator?.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE')
      await globalThis.navigator.clipboard.writeText(prompt)
      status = `已复制${label}提示词`
    } catch {
      status = `复制失败，请手动选择并复制${label}提示词`
    }
    if (!mountedRef.current || copyOperationRef.current !== operation) return
    setCopyStatus(status)
    statusTimerRef.current = globalThis.setTimeout(() => {
      if (!mountedRef.current || copyOperationRef.current !== operation) return
      setCopyStatus('')
      statusTimerRef.current = null
    }, 2000)
  }

  return (
    <article className="bench-method-case" aria-labelledby={`benchmark-case-${index}`}>
      <header className="bench-method-case-head">
        <div><span>CASE {String(index).padStart(2, '0')}</span><h3 id={`benchmark-case-${index}`}>{benchmarkCase.title}</h3><p>{benchmarkCase.caption}</p></div>
        <dl>
          <div><dt>ID</dt><dd>{benchmarkCase.id}</dd></div>
          <div><dt>Category</dt><dd>{benchmarkCase.category}</dd></div>
          <div><dt>Aspect ratio</dt><dd>{benchmarkCase.aspectRatio}</dd></div>
          <div><dt>Case hash</dt><dd className="bench-method-hash">{benchmarkCase.manifestHash}</dd></div>
          <div><dt>License</dt><dd>{licenseText(benchmarkCase.license)}</dd></div>
        </dl>
      </header>
      <div className="bench-method-prompts">
        <PromptBlock caseTitle={benchmarkCase.title} kind="positive" prompt={benchmarkCase.renderPrompt} onCopy={copyPrompt} />
        <PromptBlock caseTitle={benchmarkCase.title} kind="negative" prompt={benchmarkCase.negativePrompt} onCopy={copyPrompt} />
      </div>
      {copyStatus ? <p className="bench-method-copy-status" role="status" aria-label={copyStatus}>{copyStatus}</p> : null}
      <div className="bench-method-constraints">
        {CONSTRAINT_GROUPS.map((group) => <ConstraintGroup label={group.label} values={benchmarkCase[group.key]} key={group.key} />)}
      </div>
      <RubricTable benchmarkCase={benchmarkCase} />
    </article>
  )
}

function PublicSuite({ suite }) {
  return (
    <section className="bench-method-section" id="public-suite" aria-labelledby="public-suite-title">
      <div className="bench-method-section-head"><span>02</span><div><div className="bench-eyebrow">PUBLIC SUITE</div><h2 id="public-suite-title">完整题集</h2><p>{suite.title} · v{suite.version} · {suite.language}</p></div></div>
      <div className="bench-method-case-list">{suite.cases.map((benchmarkCase, index) => <MethodologyCase benchmarkCase={benchmarkCase} index={index + 1} key={benchmarkCase.id} />)}</div>
    </section>
  )
}

function RankingContract({ rankingMethod }) {
  const axisOrder = rankingMethod.axes.join(' → ')
  const weightSummary = rankingMethod.axes.map((axis, index) => `${axis} = ${rankingMethod.weights[index]}`).join(' · ')
  return (
    <div aria-label="完整 rankingMethod 合约">
      <dt>Ranking contract</dt>
      <dd><code>rankingMethod = {rankingMethod.id}</code><small>axes = {axisOrder}<br />weights = {weightSummary}<br />tieMethod = {rankingMethod.tieMethod}</small></dd>
    </div>
  )
}

function ScoringContract({ methodology, scoring }) {
  return (
    <section className="bench-method-section" id="scoring-contract" aria-labelledby="scoring-contract-title">
      <div className="bench-method-section-head"><span>03</span><div><div className="bench-eyebrow">SCORING</div><h2 id="scoring-contract-title">评分与排名</h2></div></div>
      <dl className="bench-method-score-grid">
        <div><dt>单轴分数</dt><dd>{scoring.scoreMin}–{scoring.scoreMax}</dd></div>
        <div><dt>最低完整样本</dt><dd>{scoring.minimumReviewedSamples} / {scoring.maximumSamplesPerModel}</dd></div>
        <div><dt>单模型上限</dt><dd>每模型最多 {scoring.maximumSamplesPerModel}</dd></div>
        <div><dt>Overall</dt><dd>七维等权<br /><code>(d1 + d2 + d3 + d4 + d5 + d6 + d7) / 7</code><small>{scoring.overallFormula}<br />noOverallScore = {String(methodology.noOverallScore)}<br />rankingMethod = {methodology.rankingMethod?.id}</small></dd></div>
        <div><dt>红线策略</dt><dd><code>{scoring.redLinePolicy}</code><small>confirmed axis cap</small></dd></div>
        <div><dt>并列规则</dt><dd><code>{scoring.tieMethod}</code><small>competition ranking 1, 1, 3</small></dd></div>
        <RankingContract rankingMethod={methodology.rankingMethod} />
      </dl>
    </section>
  )
}

function ReviewLimits({ methodology }) {
  const automaticJudgeCount = Array.isArray(methodology.automaticJudges) ? methodology.automaticJudges.length : 0
  return (
    <section className="bench-method-section bench-method-limits" id="review-limits" aria-labelledby="review-limits-title">
      <div className="bench-method-section-head"><span>04</span><div><div className="bench-eyebrow">REVIEW & LIMITS</div><h2 id="review-limits-title">审核协议与边界</h2></div></div>
      <dl className="bench-method-review-grid">
        <div><dt>reviewProtocol</dt><dd>{methodology.reviewProtocol}</dd></div>
        <div><dt>reviewerKind</dt><dd>{methodology.reviewerKind}</dd></div>
        <div><dt>reviewerPasses</dt><dd>{methodology.reviewerPasses} 遍</dd></div>
        <div><dt>automaticJudges</dt><dd>{automaticJudgeCount}</dd></div>
      </dl>
      <div className="bench-method-limit-copy">
        <p><strong>如何解读：</strong>当前为单一审阅者、轻量样本；不同原生分辨率同榜，适合方向性比较，不替代你的具体业务实测。</p>
        <p><strong>公开边界：</strong>不公开盲标签、模型映射、内部审核或签名材料。</p>
      </div>
    </section>
  )
}

function MethodologyDocument({ data }) {
  return (
    <main className="bench-shell bench-method-page">
      <MethodologyNav />
      <MethodologyHero data={data} />
      <PageDirectory />
      <EvaluationProcess data={data} />
      <PublicSuite suite={data.suite} />
      <ScoringContract methodology={data.methodology} scoring={data.scoring} />
      <ReviewLimits methodology={data.methodology} />
    </main>
  )
}

function MethodologyState({ children, error = false }) {
  return <main className={`bench-state bench-method-state${error ? ' bench-state-error' : ''}`}>{children}</main>
}

export default function BenchmarkMethodologyPage({ apiBase, backendMode = 'gateway', enabled = true }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(enabled)
  const [retryNonce, setRetryNonce] = useState(0)

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    setLoading(true)
    setError('')
    benchmarkMethodologyRequest(apiBase, { backendMode })
      .then((response) => { if (!cancelled) setData(normalizeMethodologyResponse(response)) })
      .catch((reason) => { if (!cancelled) setError(reason?.message || String(reason)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [apiBase, backendMode, enabled, retryNonce])

  if (!enabled) return <MethodologyState>方法说明尚未开放。</MethodologyState>
  if (loading) return <MethodologyState><Loader2 className="spin" />正在读取方法说明…</MethodologyState>
  if (error) return (
    <MethodologyState error>
      <strong>方法说明暂不可用：{error}</strong>
      <button type="button" onClick={() => setRetryNonce((value) => value + 1)}><RefreshCw size={15} />重新加载方法说明</button>
      <a href={LEADERBOARD_HREF}><ArrowLeft size={15} />返回综合总榜</a>
    </MethodologyState>
  )
  if (!data?.methodology || !data?.scoring || !Array.isArray(data?.suite?.cases) || data.suite.cases.length !== 4) {
    return <MethodologyState><strong>当前 release 未公开可复现题集</strong><a href={LEADERBOARD_HREF}><ArrowLeft size={15} />返回综合总榜</a></MethodologyState>
  }
  return <MethodologyDocument data={data} />
}
