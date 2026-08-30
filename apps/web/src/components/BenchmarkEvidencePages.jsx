import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ExternalLink, Image as ImageIcon, Loader2, Search, Send, X } from 'lucide-react'
import {
  adminBenchmarkRequest,
  adminStatusRequest,
  benchmarkCaseEvidenceRequest,
  benchmarkModelProfileRequest,
  benchmarkPromptSubmissionRequest,
} from '@paperbanana/api'

import { appPath } from '../appPaths.js'
import { useAuthSession } from '../hooks/useAuthSession.js'
import { LEADERBOARD_AXES } from '../leaderboardRoutes.js'

const WORKSPACE_HREF = appPath('/')
const LEADERBOARD_HREF = appPath('/leaderboard')
const METHODOLOGY_HREF = appPath('/leaderboard/methodology')
const SUBMIT_HREF = appPath('/leaderboard/submit-prompt')
const LOGO_HREF = appPath('/logo.svg')

function EvidenceNav({ current }) {
  return (
    <nav className="bench-nav" aria-label="排行榜导航">
      <a className="bench-brand" href={WORKSPACE_HREF}><img src={LOGO_HREF} alt="" />PaperBanana</a>
      <a href={WORKSPACE_HREF}>工作台</a>
      {current === 'leaderboard' ? <span aria-current="page">排行榜</span> : <a href={LEADERBOARD_HREF}>排行榜</a>}
      {current === 'methodology' ? <span aria-current="page">方法说明</span> : <a href={METHODOLOGY_HREF}>方法说明</a>}
      {current === 'submit' ? <span aria-current="page">提交评估题</span> : <a href={SUBMIT_HREF}>提交评估题</a>}
      <a href="https://github.com/zdywrnm/PaperBanana-clients" target="_blank" rel="noreferrer">GitHub <ExternalLink size={12} /></a>
    </nav>
  )
}

function scoreText(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '—'
}

function variantByKind(variants, kind) {
  return Array.isArray(variants) ? variants.find((variant) => variant.kind === kind) : null
}

export function BenchmarkEvidenceImage({ variants, alt }) {
  const [expanded, setExpanded] = useState(false)
  const thumbnail = variantByKind(variants, 'thumbnail') || variants?.[0]
  const detail = variantByKind(variants, 'detail') || thumbnail
  const full = variantByKind(variants, 'full') || detail
  if (!thumbnail?.url) return <div className="bench-evidence-image-missing"><ImageIcon />图片版本暂不可用</div>
  const responsive = [thumbnail, detail]
    .filter((variant, index, list) => variant?.url && list.findIndex((candidate) => candidate?.url === variant.url) === index)
    .map((variant) => `${variant.url} ${variant.width}w`).join(', ')
  return (
    <>
      <button className="bench-evidence-image-button" type="button" aria-label={`查看${alt}高清图`} onClick={() => setExpanded(true)}>
        <img
          src={thumbnail.url}
          srcSet={responsive}
          sizes="(max-width: 720px) 100vw, 720px"
          width={thumbnail.width}
          height={thumbnail.height}
          loading="lazy"
          decoding="async"
          alt={alt}
        />
        <span>点击查看高清图</span>
      </button>
      {expanded ? (
        <div className="bench-evidence-lightbox" role="dialog" aria-modal="true" aria-label={`${alt}高清图`}>
          <button type="button" aria-label="关闭高清图" onClick={() => setExpanded(false)}><X /></button>
          <img src={full.url} width={full.width} height={full.height} decoding="async" alt={`${alt}高清图`} />
        </div>
      ) : null}
    </>
  )
}

function EvidenceScores({ scores }) {
  return (
    <dl className="bench-evidence-scores">
      {LEADERBOARD_AXES.map((axis) => <div key={axis.id}><dt>{axis.label}</dt><dd>{scoreText(scores?.[axis.id])}</dd></div>)}
    </dl>
  )
}

function PromptDetails({ benchmarkCase }) {
  return (
    <details className="bench-evidence-prompt" open>
      <summary>完整提示词与要求</summary>
      <h4>正向提示词</h4><pre>{benchmarkCase?.renderPrompt || '—'}</pre>
      <h4>负向提示词</h4><pre>{benchmarkCase?.negativePrompt || '—'}</pre>
      <div className="bench-evidence-requirements">
        <p><strong>必需实体</strong>{(benchmarkCase?.requiredEntities || []).join('；') || '无'}</p>
        <p><strong>必需关系</strong>{(benchmarkCase?.requiredRelations || []).join('；') || '无'}</p>
        <p><strong>必需文字</strong>{(benchmarkCase?.requiredText || []).join('；') || '无'}</p>
        <p><strong>禁止项</strong>{(benchmarkCase?.forbidden || []).join('；') || '无'}</p>
      </div>
    </details>
  )
}

function EvidenceCard({ item, benchmarkCase, modelName }) {
  return (
    <article className="bench-evidence-card">
      <header>
        <div><span>{benchmarkCase?.id || item.caseId}</span><h2>{benchmarkCase?.title || item.caseId}</h2></div>
        <small>{item.actualOutputPixels?.width} × {item.actualOutputPixels?.height} · {scoreText(item.actualOutputPixels?.megapixels)} MP</small>
      </header>
      <BenchmarkEvidenceImage variants={item.variants} alt={`${modelName} · ${benchmarkCase?.title || item.caseId}`} />
      <EvidenceScores scores={item.scores} />
      <section className="bench-evidence-notes"><h3>审核依据与扣分说明</h3><ul>{(item.reviewNotes || []).map((note, index) => <li key={`${item.sampleId}-${index}`}>{note}</li>)}</ul></section>
      <PromptDetails benchmarkCase={benchmarkCase} />
      <footer><code>SHA-256 {item.imageHash}</code><a href={appPath(`/leaderboard/cases/${encodeURIComponent(item.caseId)}`)}>查看本题全部模型 →</a></footer>
    </article>
  )
}

function EvidenceState({ children, error = false }) {
  return <main className={`bench-state${error ? ' bench-state-error' : ''}`}>{children}</main>
}

export function BenchmarkModelEvidencePage({ apiBase, backendMode, enabled, profileId }) {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    benchmarkModelProfileRequest(apiBase, { backendMode }, { profileId })
      .then((response) => { if (!cancelled) setProfile(response.profile || null) })
      .catch((reason) => { if (!cancelled) setError(reason?.message || String(reason)) })
    return () => { cancelled = true }
  }, [apiBase, backendMode, enabled, profileId])
  if (!enabled) return <EvidenceState>排行榜尚未开放。</EvidenceState>
  if (error) return <EvidenceState error>模型证据暂不可用：{error}</EvidenceState>
  if (!profile) return <EvidenceState><Loader2 className="spin" />正在读取模型生成证据…</EvidenceState>
  const cases = new Map((profile.cases || []).map((benchmarkCase) => [benchmarkCase.id, benchmarkCase]))
  const modelName = profile.displayName || profile.modelId
  return (
    <main className="bench-shell bench-evidence-page">
      <EvidenceNav current="leaderboard" />
      <header className="bench-subpage-hero bench-evidence-hero">
        <a href={LEADERBOARD_HREF}><ArrowLeft size={15} />返回综合总榜</a>
        <div className="bench-eyebrow">MODEL EVIDENCE</div>
        <h1>{modelName}</h1>
        <p>公开同一固定题集下的真实生成图片、逐图七维分数与原审核依据。</p>
        <div className="bench-meta"><span className="accent">Overall #{profile.overallRank ?? '—'} · {scoreText(profile.overallScore)}</span><span>{profile.evidence?.length || 0} 张已审核样本</span><span>{profile.modelId}</span></div>
      </header>
      <section className="bench-evidence-list">
        {(profile.evidence || []).map((item) => <EvidenceCard item={item} benchmarkCase={cases.get(item.caseId)} modelName={modelName} key={item.sampleId} />)}
      </section>
    </main>
  )
}

export function BenchmarkCaseEvidencePage({ apiBase, backendMode, enabled, caseId }) {
  const [benchmarkCase, setBenchmarkCase] = useState(null)
  const [items, setItems] = useState([])
  const [cursor, setCursor] = useState(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const sentinelRef = useRef(null)

  const load = async (nextCursor) => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const response = await benchmarkCaseEvidenceRequest(apiBase, { backendMode }, caseId, { cursor: nextCursor, limit: 12 })
      setBenchmarkCase(response.case)
      setItems((current) => nextCursor ? [...current, ...(response.items || [])] : (response.items || []))
      setCursor(response.nextCursor ?? null)
    } catch (reason) { setError(reason?.message || String(reason)) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (enabled) void load(undefined) }, [apiBase, backendMode, caseId, enabled])
  useEffect(() => {
    if (!cursor || !sentinelRef.current || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) void load(cursor) }, { rootMargin: '500px' })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [cursor, loading])

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLocaleLowerCase('zh-CN')
    return items.filter((item) => !needle || `${item.model?.displayName || ''} ${item.modelId}`.toLocaleLowerCase('zh-CN').includes(needle))
  }, [deferredQuery, items])
  if (!enabled) return <EvidenceState>排行榜尚未开放。</EvidenceState>
  if (!benchmarkCase && loading) return <EvidenceState><Loader2 className="spin" />正在读取题目生成证据…</EvidenceState>
  if (!benchmarkCase && error) return <EvidenceState error>题目证据暂不可用：{error}</EvidenceState>
  return (
    <main className="bench-shell bench-evidence-page">
      <EvidenceNav current="leaderboard" />
      <header className="bench-subpage-hero bench-evidence-hero">
        <a href={METHODOLOGY_HREF}><ArrowLeft size={15} />返回完整方法说明</a>
        <div className="bench-eyebrow">CASE EVIDENCE</div><h1>{benchmarkCase?.title || caseId}</h1><p>{benchmarkCase?.caption}</p>
      </header>
      <PromptDetails benchmarkCase={benchmarkCase} />
      <div className="bench-search bench-case-search"><label htmlFor="bench-case-search">搜索模型</label><span><Search size={15} /><input id="bench-case-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></span><small>{visible.length} 个已加载结果</small></div>
      <section className="bench-case-evidence-grid">
        {visible.map((item) => {
          const name = item.model?.displayName || item.modelId
          return <article className="bench-case-evidence-item" key={item.sampleId}>
            <header><a href={appPath(`/leaderboard/models/${encodeURIComponent(item.profileId)}`)}><strong>{name}</strong><small>{item.modelId}</small></a><span>Overall #{item.model?.overallRank ?? '—'} · {scoreText(item.model?.overallScore)}</span></header>
            <BenchmarkEvidenceImage variants={item.variants} alt={`${name} · ${benchmarkCase?.title || caseId}`} />
            <EvidenceScores scores={item.scores} />
            <ul className="bench-evidence-note-list">{(item.reviewNotes || []).map((note, index) => <li key={`${item.sampleId}-note-${index}`}>{note}</li>)}</ul>
          </article>
        })}
      </section>
      {error ? <p className="bench-inline-error">加载失败：{error}</p> : null}
      <div ref={sentinelRef} className="bench-evidence-sentinel">
        {cursor && typeof IntersectionObserver === 'undefined' ? <button type="button" onClick={() => load(cursor)} disabled={loading}>加载更多模型</button> : null}
        {loading ? <Loader2 className="spin" /> : null}
      </div>
    </main>
  )
}

const emptySubmission = { prompt: '', capability: '', requiredElements: '', forbiddenResults: '', notes: '' }

export function BenchmarkPromptSubmissionForm({ authenticated, onSubmit }) {
  const [fields, setFields] = useState(emptySubmission)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  if (!authenticated) return <section className="bench-prompt-login"><h2>登录后提交评估题</h2><p>投稿者身份不会公开，仅用于限频和处理滥用。</p><a href={WORKSPACE_HREF}>前往工作台登录</a></section>
  const update = (key) => (event) => setFields((current) => ({ ...current, [key]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true); setError(''); setStatus('')
    try {
      await onSubmit(Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.trim()])))
      setFields(emptySubmission)
      setStatus('投稿已进入候选池')
    } catch (reason) { setError(reason?.message || String(reason)) }
    finally { setSubmitting(false) }
  }
  return (
    <form className="bench-prompt-form" onSubmit={submit}>
      <label>评估提示词<textarea required minLength={3} maxLength={4000} value={fields.prompt} onChange={update('prompt')} /></label>
      <label>想测试的模型能力<textarea required minLength={3} maxLength={1000} value={fields.capability} onChange={update('capability')} /></label>
      <label>必须出现的内容或关系<textarea maxLength={1000} value={fields.requiredElements} onChange={update('requiredElements')} /></label>
      <label>不允许出现的结果<textarea maxLength={1000} value={fields.forbiddenResults} onChange={update('forbiddenResults')} /></label>
      <label>补充说明<textarea maxLength={1000} value={fields.notes} onChange={update('notes')} /></label>
      <p>仅接受文字，不支持图片、附件或外部链接。投稿不会改变当前榜单。</p>
      <button type="submit" disabled={submitting}><Send size={16} />{submitting ? '正在提交…' : '提交候选提示词'}</button>
      {status ? <strong role="status">{status}</strong> : null}{error ? <strong role="alert">提交失败：{error}</strong> : null}
    </form>
  )
}

export function BenchmarkPromptSubmissionPage({ apiBase, backendMode }) {
  const auth = useAuthSession()
  return (
    <main className="bench-shell bench-prompt-page">
      <EvidenceNav current="submit" />
      <header className="bench-subpage-hero"><a href={LEADERBOARD_HREF}><ArrowLeft size={15} />返回综合总榜</a><div className="bench-eyebrow">COMMUNITY EVALUATION</div><h1>提交评估提示词</h1><p>告诉我们哪些真实难题值得加入下一期统一测评。Codex 每周整理，管理员最终确认。</p></header>
      {auth.isPending ? <EvidenceState><Loader2 className="spin" />正在确认登录状态…</EvidenceState> : <BenchmarkPromptSubmissionForm authenticated={Boolean(auth.session?.user)} onSubmit={async (payload) => (await benchmarkPromptSubmissionRequest(apiBase, { backendMode }, payload)).submission} />}
    </main>
  )
}

export function BenchmarkPromptAdminPage({ apiBase, backendMode }) {
  const auth = useAuthSession()
  const [admin, setAdmin] = useState(false)
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const reload = async () => {
    const results = await Promise.all(['pending', 'grouped', 'candidate'].map((status) => adminBenchmarkRequest(apiBase, { backendMode }, 'adminBenchmarkPromptQueue', { status, limit: 200 })))
    setRows(results.flatMap((result) => result.submissions || []))
  }
  useEffect(() => {
    if (auth.isPending || !auth.session?.user) return
    adminStatusRequest(apiBase, { backendMode }).then((result) => {
      setAdmin(result.isAdmin)
      if (result.isAdmin) return reload()
    }).catch((reason) => setError(reason?.message || String(reason)))
  }, [apiBase, backendMode, auth.isPending, auth.session?.user?.id])
  const updateRow = (submissionId, key, value) => setRows((current) => current.map((row) => row.submissionId === submissionId ? { ...row, [key]: value } : row))
  const decide = async (row, decision) => {
    try { await adminBenchmarkRequest(apiBase, { backendMode }, 'adminBenchmarkPromptDecision', { submissionId: row.submissionId, decision, editedPrompt: row.prompt, editedCapability: row.capability }); await reload() }
    catch (reason) { setError(reason?.message || String(reason)) }
  }
  return (
    <main className="bench-shell bench-prompt-page">
      <EvidenceNav current="submit" />
      <header className="bench-subpage-hero"><a href={LEADERBOARD_HREF}><ArrowLeft size={15} />返回综合总榜</a><div className="bench-eyebrow">ADMIN REVIEW</div><h1>社区评估题审核</h1><p>这里只处理候选池，不修改当前正式题集或榜单。</p></header>
      {auth.isPending ? <EvidenceState><Loader2 className="spin" />正在确认管理员身份…</EvidenceState> : !admin ? <EvidenceState error>{error || '需要站长账号才能访问。'}</EvidenceState> : (
        <section className="bench-prompt-admin-list">{rows.map((row) => <article key={row.submissionId}><header><strong>{row.status}</strong><code>{row.submissionId}</code></header><label>能力分类<input value={row.capability || ''} onChange={(event) => updateRow(row.submissionId, 'capability', event.target.value)} /></label><label>规范提示词<textarea value={row.prompt || ''} onChange={(event) => updateRow(row.submissionId, 'prompt', event.target.value)} /></label><dl><div><dt>必须项</dt><dd>{row.requiredElements || '无'}</dd></div><div><dt>禁止项</dt><dd>{row.forbiddenResults || '无'}</dd></div></dl><footer><button onClick={() => decide(row, 'approved_for_next_suite')}>批准为下期候选</button><button onClick={() => decide(row, 'merged')}>标记已合并</button><button onClick={() => decide(row, 'rejected')}>拒绝</button></footer></article>)}</section>
      )}
    </main>
  )
}
