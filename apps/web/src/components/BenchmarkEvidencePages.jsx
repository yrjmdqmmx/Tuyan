import { useBenchmarkLocale } from './BenchmarkLocale.jsx'
import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ExternalLink, Image as ImageIcon, Loader2, Search, Send, X } from 'lucide-react'
import {
  adminStatusRequest,
  benchmarkCaseEvidenceRequest,
  benchmarkModelProfileRequest,
  benchmarkPromptSubmissionRequest,
} from '@paperbanana/api'

import { appPath } from '../appPaths.js'
import { LEADERBOARD_AXES, SCIENTIFIC_LEADERBOARD_AXES, leaderboardDetailHref } from '../leaderboardRoutes.js'
import { hasScientificHint, normalizeScientificCaseResponse, normalizeScientificProfile } from './benchmarkRelease.js'
import { benchmarkDeveloperName, matchesBenchmarkModel } from './benchmarkDevelopers.js'
import { useLeaderboardSession } from './LeaderboardRoot.jsx'

const AdminWorkspace = lazy(() => import('./admin/AdminWorkspace'));
const WORKSPACE_HREF = appPath('/')
const LEADERBOARD_HREF = appPath('/leaderboard')
const METHODOLOGY_HREF = appPath('/leaderboard/methodology')
const SUBMIT_HREF = appPath('/leaderboard/submit-prompt')
const LOGO_HREF = appPath('/logo.svg')

function EvidenceNav({ current }) {
  const { t, locale } = useBenchmarkLocale()
  return (
    <nav className="bench-nav" aria-label={t("排行榜导航")}>
      <a className="bench-brand" href={WORKSPACE_HREF}><img src={LOGO_HREF} alt="" />{t("图研Tuyan")}</a>
      <a href={WORKSPACE_HREF}>{t("工作台")}</a>
      {current === 'leaderboard' ? <span aria-current="page">{t("排行榜")}</span> : <a href={LEADERBOARD_HREF}>{t("排行榜")}</a>}
      {current === 'methodology' ? <span aria-current="page">{t("方法说明")}</span> : <a href={METHODOLOGY_HREF}>{t("方法说明")}</a>}
      {current === 'submit' ? <span aria-current="page">{t("提交评估题")}</span> : <a href={SUBMIT_HREF}>{t("提交评估题")}</a>}
      <a href="https://github.com/yrjmdqmmx/Tuyan" target="_blank" rel="noreferrer">GitHub <ExternalLink size={12} /></a>
    </nav>
  )
}

function scoreText(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '—'
}

const COST_LABELS = {
  invoice_reconciled: '账单已核对', official_rate_calculated: '按官方单价核算',
  budget_estimate: '预算记账估算，待核实实扣', not_called: '未发起调用', unavailable: '暂无可核对的费用记录',
}
function moneyText(currency, amount, t = value => value) {
  if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) return t('待核对')
  return `${currency === 'USD' ? '$' : currency === 'CNY' ? '¥' : ''}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}${currency ? ` ${currency}` : ''}`
}
export function BenchmarkCaseCost({ cost }) {
  const { t, locale } = useBenchmarkLocale()
  return <p className="bench-case-cost"><strong>{t("本题费用")} {cost?.amount != null ? moneyText(cost.currency, cost.amount, t) : t("待核对")}</strong><span>{t(COST_LABELS[cost?.basis] || COST_LABELS.unavailable)}</span></p>
}
export function BenchmarkModelCost({ summary }) {
  const { t, locale } = useBenchmarkLocale()
  const totals = summary?.totals || []
  return <section className="bench-model-cost" aria-label={t("模型测试费用")}>
    <h2>{t("本轮测试总费用")}</h2>
    <strong>{totals.length ? totals.map(total => moneyText(total.currency, total.amount, t)).join(' + ') : t("待核对")}</strong>
    <p>{summary?.knownCaseCount ?? 0} / {summary?.caseCount ?? 9} {t("题有费用记录；")}{summary?.billedCaseCount ?? 0} {t("题已核对账单。包括本轮题位内的调用尝试；审评费用不计入生图金额。")}</p>
    {totals.map(total => <p key={total.currency}>{t("账单已核对")} {moneyText(total.currency, total.billedAmount, t)} {t("· 单价核算")}{moneyText(total.currency, total.calculatedAmount, t)} {t("· 预算估算")}{moneyText(total.currency, total.budgetAmount, t)}</p>)}
    {(summary?.knownCaseCount ?? 0) < (summary?.caseCount ?? 9) ? <p>{t("尚有费用未确认，已知金额不代表完整实扣；未知费用不按零元计算。")}</p> : null}
  </section>
}

function variantByKind(variants, kind) {
  return Array.isArray(variants) ? variants.find((variant) => variant.kind === kind) : null
}

export function BenchmarkEvidenceImage({ variants, alt }) {
  const { t, locale } = useBenchmarkLocale()
  const [expanded, setExpanded] = useState(false)
  const thumbnail = variantByKind(variants, 'thumbnail') || variants?.[0]
  const detail = variantByKind(variants, 'detail') || thumbnail
  const full = variantByKind(variants, 'full') || detail
  if (!thumbnail?.url) return <div className="bench-evidence-image-missing"><ImageIcon />{t("图片版本暂不可用")}</div>
  const responsive = [thumbnail, detail]
    .filter((variant, index, list) => variant?.url && list.findIndex((candidate) => candidate?.url === variant.url) === index)
    .map((variant) => `${variant.url} ${variant.width}w`).join(', ')
  return (
    <>
      <button className="bench-evidence-image-button" type="button" aria-label={t("查看{v0}高清图", {v0: alt})} onClick={() => setExpanded(true)}>
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
        <span>{t("点击查看高清图")}</span>
      </button>
      {expanded ? (
        <div className="bench-evidence-lightbox" role="dialog" aria-modal="true" aria-label={t("{v0}高清图", {v0: alt})}>
          <button type="button" aria-label={t("关闭高清图")} onClick={() => setExpanded(false)}><X /></button>
          <img src={full.url} width={full.width} height={full.height} decoding="async" alt={t("{v0}高清图", {v0: alt})} />
        </div>
      ) : null}
    </>
  )
}

function EvidenceScores({ scores, axes = LEADERBOARD_AXES }) {
  const { t } = useBenchmarkLocale()
  return (
    <dl className="bench-evidence-scores">
      {axes.map((axis) => <div key={axis.id}><dt>{t(axis.label)}</dt><dd>{scoreText(scores?.[axis.id])}</dd></div>)}
    </dl>
  )
}

function PromptDetails({ benchmarkCase }) {
  const { t, locale } = useBenchmarkLocale()
  if (benchmarkCase?.id?.startsWith('scientific-')) {
    return (
      <details className="bench-evidence-prompt" open>
        <summary>{t("完整题目与要求")}</summary><pre data-original-material lang="zh-CN">{benchmarkCase.instruction}</pre>
        {benchmarkCase.negativePrompt ? <><h4>{t("负向约束")}</h4><pre data-original-material lang="zh-CN">{benchmarkCase.negativePrompt}</pre></> : null}
      </details>
    )
  }
  return (
    <details className="bench-evidence-prompt" open>
      <summary>{t("完整提示词与要求")}</summary>
      <h4>{t("正向提示词")}</h4><pre data-original-material lang="zh-CN">{benchmarkCase?.renderPrompt || '—'}</pre>
      <h4>{t("负向提示词")}</h4><pre data-original-material lang="zh-CN">{benchmarkCase?.negativePrompt || '—'}</pre>
      <div className="bench-evidence-requirements">
        <p><strong>{t("必需实体")}</strong>{(benchmarkCase?.requiredEntities || []).join('；') || t('无')}</p>
        <p><strong>{t("必需关系")}</strong>{(benchmarkCase?.requiredRelations || []).join('；') || t('无')}</p>
        <p><strong>{t("必需文字")}</strong>{(benchmarkCase?.requiredText || []).join('；') || t('无')}</p>
        <p><strong>{t("禁止项")}</strong>{(benchmarkCase?.forbidden || []).join('；') || t('无')}</p>
      </div>
    </details>
  )
}

function EvidenceCard({ item, benchmarkCase, modelName }) {
  const { t, locale } = useBenchmarkLocale()
  return (
    <article className="bench-evidence-card">
      <header>
        <div><span>{benchmarkCase?.id || item.caseId}</span><h2>{t(benchmarkCase?.title || item.caseId)}</h2></div>
        <small>{item.actualOutputPixels?.width} × {item.actualOutputPixels?.height} · {scoreText(item.actualOutputPixels?.megapixels)} MP</small>
      </header>
      <BenchmarkCaseCost cost={item.cost} />
      <BenchmarkEvidenceImage variants={item.variants} alt={`${modelName} · ${t(benchmarkCase?.title || item.caseId)}`} />
      <EvidenceScores scores={item.scores} />
      <section className="bench-evidence-notes"><h3>{t("审核依据与扣分说明")}</h3><ul>{(item.reviewNotes || []).map((note, index) => <li data-original-material lang="zh-CN" key={`${item.sampleId}-${index}`}>{note}</li>)}</ul></section>
      <PromptDetails benchmarkCase={benchmarkCase} />
      <footer><code>SHA-256 {item.imageHash}</code><a href={appPath(`/leaderboard/cases/${encodeURIComponent(item.caseId)}`)}>{t("查看本题全部模型 →")}</a></footer>
    </article>
  )
}

function ScientificEvidenceCard({ item, benchmarkCase, modelName }) {
  const { t, locale } = useBenchmarkLocale()
  const successful = item.status === 'succeeded'
  const pixels = successful && item.actualOutputPixels
    ? ` · ${item.actualOutputPixels.width} × ${item.actualOutputPixels.height} · ${scoreText(item.actualOutputPixels.megapixels)} MP`
    : ''
  return (
    <article className="bench-evidence-card bench-scientific-evidence-card">
      <header><div><span>{benchmarkCase?.id || item.caseId}</span><h2>{t(benchmarkCase?.title || item.caseId)}</h2></div><small>{benchmarkCase?.kind === 'edit' ? t("局部编辑") : t("生成")} · {item.attemptSummary?.count ?? 0} {t("次尝试")}{pixels}</small></header>
      {!successful ? <section className="bench-evidence-failure"><strong>{t(item.status)}</strong><code>{item.failureReason || t('未提供失败原因')}</code><p>{t("该固定题位按 0 分计入总体。")}</p></section> : benchmarkCase?.kind === 'edit' ? (
        <div className="bench-edit-comparison"><figure><figcaption>{t("编辑前")}</figcaption><BenchmarkEvidenceImage variants={item.beforeVariants} alt={t("{v0} · {v1} · 编辑前", {v0: modelName, v1: t(benchmarkCase.title)})} /></figure><figure><figcaption>{t("编辑后")}</figcaption><BenchmarkEvidenceImage variants={item.variants} alt={t("{v0} · {v1} · 编辑后", {v0: modelName, v1: t(benchmarkCase.title)})} /></figure></div>
      ) : <BenchmarkEvidenceImage variants={item.variants} alt={`${modelName} · ${t(benchmarkCase?.title || item.caseId)}`} />}
      <BenchmarkCaseCost cost={item.cost} />
      {successful ? <EvidenceScores scores={item.scores} axes={SCIENTIFIC_LEADERBOARD_AXES.filter((axis) => benchmarkCase?.applicableAxes?.includes(axis.id))} /> : null}
      {successful ? <section className="bench-evidence-notes"><h3>{t("审核依据与扣分说明")}</h3><ul>{(item.reviewNotes || []).map((note, index) => <li data-original-material lang="zh-CN" key={`${item.caseId}-${index}`}>{note}</li>)}</ul></section> : null}
      <details className="bench-evidence-prompt" open><summary>{t("完整题目与要求")}</summary><pre data-original-material lang="zh-CN">{benchmarkCase?.instruction || '—'}</pre>{benchmarkCase?.negativePrompt ? <><h4>{t("负向约束")}</h4><pre data-original-material lang="zh-CN">{benchmarkCase.negativePrompt}</pre></> : null}</details>
      <footer><code>{item.imageHash ? `SHA-256 ${item.imageHash}` : t("未生成图像")}</code><a href={appPath(`/leaderboard/cases/${encodeURIComponent(item.caseId)}`)}>{t("查看本题全部模型 →")}</a></footer>
    </article>
  )
}

function EvidenceState({ children, error = false }) {
  return <main className={`bench-state${error ? ' bench-state-error' : ''}`}>{children}</main>
}

export function BenchmarkModelEvidencePage({ apiBase, backendMode, enabled, profileId, showNavigation = true }) {
  const { t, locale } = useBenchmarkLocale()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    benchmarkModelProfileRequest(apiBase, { backendMode }, { profileId })
      .then((response) => {
        if (cancelled) return
        const rawProfile = response.profile || null
        const scientific = hasScientificHint(rawProfile) || hasScientificHint(rawProfile?.release)
        const normalized = scientific ? normalizeScientificProfile(rawProfile) : rawProfile
        if (rawProfile && !normalized) setError('模型证据数据格式不受支持')
        setProfile(normalized)
      })
      .catch((reason) => { if (!cancelled) setError(reason?.message || String(reason)) })
    return () => { cancelled = true }
  }, [apiBase, backendMode, enabled, profileId])
  if (!enabled) return <EvidenceState>{t("排行榜尚未开放。")}</EvidenceState>
  if (error) return <EvidenceState error>{t("模型证据暂不可用：")}{t(error)}</EvidenceState>
  if (!profile) return <EvidenceState><Loader2 className="spin" />{t("正在读取模型生成证据…")}</EvidenceState>
  const cases = new Map((profile.cases || []).map((benchmarkCase) => [benchmarkCase.id, benchmarkCase]))
  const modelName = profile.displayName || profile.modelId
  const scientific = profile.release?.presentationVersion === 'scientific-leaderboard-v2' || profile.presentationVersion === 'scientific-leaderboard-v2'
  return (
    <main className="bench-shell bench-evidence-page">
      {showNavigation ? <EvidenceNav current="leaderboard" /> : null}
      <header className="bench-subpage-hero bench-evidence-hero">
        <a href={LEADERBOARD_HREF}><ArrowLeft size={15} />{t("返回综合总榜")}</a>
        <div className="bench-eyebrow">{t("MODEL EVIDENCE")}</div>
        <h1>{modelName}</h1><p className="bench-developer">{t('模型研发厂商')}：{benchmarkDeveloperName(profile, locale)}</p>
        <p>{scientific ? t("公开九个固定科研题位的状态、尝试摘要、十维分数，以及局部编辑 before / after。") : t("公开同一固定题集下的真实生成图片、逐图七维分数与原审核依据。")}</p>
        <div className="bench-meta"><span className="accent">{t("Overall #")}{profile.overallRank ?? '—'} · {scoreText(profile.overallScore)}</span><span>{profile.evidence?.length || 0} {t("个固定题位")}</span>{scientific ? <><span>{t("生成成功率")}{scoreText(profile.generationSuccessRate * 100)}%</span><span>{t("编辑成功率")}{scoreText(profile.editSuccessRate * 100)}%</span></> : null}<span>{profile.modelId}</span></div>
      </header>
      <BenchmarkModelCost summary={profile.costSummary} />
      <p className="bench-original-note">{t('原始评测材料（保持原文）')}</p><section className="bench-evidence-list">
        {(profile.evidence || []).map((item) => scientific
          ? <ScientificEvidenceCard item={item} benchmarkCase={cases.get(item.caseId)} modelName={modelName} key={item.caseId} />
          : <EvidenceCard item={item} benchmarkCase={cases.get(item.caseId)} modelName={modelName} key={item.sampleId} />)}
      </section>
    </main>
  )
}

export function BenchmarkCaseEvidencePage({ apiBase, backendMode, enabled, caseId, showNavigation = true }) {
  const { t, locale } = useBenchmarkLocale()
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
      const normalized = caseId.startsWith('scientific-') ? normalizeScientificCaseResponse(response, caseId) : response
      if (!normalized) throw new Error('题目证据数据格式不受支持')
      setBenchmarkCase(normalized.case)
      setItems((current) => nextCursor ? [...current, ...(normalized.items || [])] : (normalized.items || []))
      setCursor(normalized.nextCursor ?? null)
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
    return items.filter(item => matchesBenchmarkModel({ ...item.model, modelId: item.modelId }, needle))
  }, [deferredQuery, items])
  const scientific = benchmarkCase?.id?.startsWith('scientific-')
  if (!enabled) return <EvidenceState>{t("排行榜尚未开放。")}</EvidenceState>
  if (!benchmarkCase && loading) return <EvidenceState><Loader2 className="spin" />{t("正在读取题目生成证据…")}</EvidenceState>
  if (!benchmarkCase && error) return <EvidenceState error>{t("题目证据暂不可用：")}{t(error)}</EvidenceState>
  return (
    <main className="bench-shell bench-evidence-page">
      {showNavigation ? <EvidenceNav current="leaderboard" /> : null}
      <header className="bench-subpage-hero bench-evidence-hero">
        <a href={METHODOLOGY_HREF}><ArrowLeft size={15} />{t("返回完整方法说明")}</a>
        <div className="bench-eyebrow">{t("CASE EVIDENCE")}</div><h1>{t(benchmarkCase?.title || caseId)}</h1><p>{benchmarkCase?.caption}</p>
      </header>
      <PromptDetails benchmarkCase={benchmarkCase} />
      <div className="bench-search bench-case-search"><label htmlFor="bench-case-search">{t("搜索模型")}</label><span><Search size={15} /><input id="bench-case-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></span><small>{visible.length} {t("个已加载结果")}</small></div>
      <section className="bench-case-evidence-grid">
        {visible.map((item) => {
          const name = item.model?.displayName || item.modelId
          return <article className="bench-case-evidence-item" key={item.sampleId || item.profileId}>
            <header><a href={leaderboardDetailHref(`/leaderboard/models/${encodeURIComponent(item.profileId)}`)}><strong>{name}</strong><small>{item.modelId}</small><span className="bench-developer">{benchmarkDeveloperName({ ...item.model, modelId: item.modelId }, locale)}</span></a><span>{t("Overall #")}{item.model?.overallRank ?? '—'} · {scoreText(item.model?.overallScore)}{item.status === 'succeeded' && item.actualOutputPixels ? ` · ${item.actualOutputPixels.width} × ${item.actualOutputPixels.height} · ${scoreText(item.actualOutputPixels.megapixels)} MP` : ''}</span></header>
            <BenchmarkCaseCost cost={item.cost} />
            {scientific && item.status !== 'succeeded' ? <section className="bench-evidence-failure"><strong>{t(item.status)}</strong><code>{item.failureReason || t('未提供失败原因')}</code><p>{t("该固定题位按 0 分计入总体。")}</p></section> : scientific && benchmarkCase?.kind === 'edit' ? <div className="bench-edit-comparison"><figure><figcaption>{t("编辑前")}</figcaption><BenchmarkEvidenceImage variants={item.beforeVariants} alt={t("{v0} · {v1} · 编辑前", {v0: name, v1: t(benchmarkCase.title)})} /></figure><figure><figcaption>{t("编辑后")}</figcaption><BenchmarkEvidenceImage variants={item.variants} alt={t("{v0} · {v1} · 编辑后", {v0: name, v1: t(benchmarkCase.title)})} /></figure></div> : <BenchmarkEvidenceImage variants={item.variants} alt={`${name} · ${t(benchmarkCase?.title || caseId)}`} />}
            {item.status === 'succeeded' || !scientific ? <EvidenceScores scores={item.scores} axes={scientific ? SCIENTIFIC_LEADERBOARD_AXES.filter((axis) => benchmarkCase?.applicableAxes?.includes(axis.id)) : LEADERBOARD_AXES} /> : null}
            <ul className="bench-evidence-note-list">{(item.reviewNotes || []).map((note, index) => <li data-original-material lang="zh-CN" key={`${item.sampleId}-note-${index}`}>{note}</li>)}</ul>
          </article>
        })}
      </section>
      {error ? <p className="bench-inline-error">{t("加载失败：")}{t(error)}</p> : null}
      <div ref={sentinelRef} className="bench-evidence-sentinel">
        {cursor && typeof IntersectionObserver === 'undefined' ? <button type="button" onClick={() => load(cursor)} disabled={loading}>{t("加载更多模型")}</button> : null}
        {loading ? <Loader2 className="spin" /> : null}
      </div>
    </main>
  )
}

const emptySubmission = { prompt: '', capability: '', requiredElements: '', forbiddenResults: '', notes: '' }

export function BenchmarkPromptSubmissionForm({ authenticated, onSubmit }) {
  const { t, locale } = useBenchmarkLocale()
  const [fields, setFields] = useState(emptySubmission)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  if (!authenticated) return <section className="bench-prompt-login"><h2>{t("登录后提交评估题")}</h2><p>{t("投稿者身份不会公开，仅用于限频和处理滥用。")}</p><a href={WORKSPACE_HREF}>{t("前往工作台登录")}</a></section>
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
      <label>{t("评估提示词")}<textarea required minLength={3} maxLength={4000} value={fields.prompt} onChange={update('prompt')} /></label>
      <label>{t("想测试的模型能力")}<textarea required minLength={3} maxLength={1000} value={fields.capability} onChange={update('capability')} /></label>
      <label>{t("必须出现的内容或关系")}<textarea maxLength={1000} value={fields.requiredElements} onChange={update('requiredElements')} /></label>
      <label>{t("不允许出现的结果")}<textarea maxLength={1000} value={fields.forbiddenResults} onChange={update('forbiddenResults')} /></label>
      <label>{t("补充说明")}<textarea maxLength={1000} value={fields.notes} onChange={update('notes')} /></label>
      <p>{t("仅接受文字，不支持图片、附件或外部链接。投稿不会改变当前榜单。")}</p>
      <button type="submit" disabled={submitting}><Send size={16} />{submitting ? t("正在提交…") : t("提交候选提示词")}</button>
      {status ? <strong role="status">{t(status)}</strong> : null}{error ? <strong role="alert">{t("提交失败：")}{t(error)}</strong> : null}
    </form>
  )
}

export function BenchmarkPromptSubmissionPage({ apiBase, backendMode, showNavigation = true }) {
  const { t, locale } = useBenchmarkLocale()
  const auth = useLeaderboardSession()
  return (
    <main className="bench-shell bench-prompt-page">
      {showNavigation ? <EvidenceNav current="submit" /> : null}
      <header className="bench-subpage-hero"><a href={LEADERBOARD_HREF}><ArrowLeft size={15} />{t("返回综合总榜")}</a><div className="bench-eyebrow">{t("COMMUNITY EVALUATION")}</div><h1>{t("提交评估提示词")}</h1><p>{t("告诉我们哪些真实难题值得加入下一期统一测评。Codex 每周整理，管理员最终确认。")}</p></header>
      {auth.isPending ? <EvidenceState><Loader2 className="spin" />{t("正在确认登录状态…")}</EvidenceState> : <BenchmarkPromptSubmissionForm authenticated={Boolean(auth.session?.user)} onSubmit={async (payload) => (await benchmarkPromptSubmissionRequest(apiBase, { backendMode }, payload)).submission} />}
    </main>
  )
}

export function BenchmarkPromptAdminPage({ apiBase, backendMode, showNavigation = true }) {
  const { t, locale } = useBenchmarkLocale()
  const auth = useLeaderboardSession()
  const [adminIdentity, setAdminIdentity] = useState('')
  const admin = Boolean(auth.session?.user?.id && adminIdentity === auth.session.user.id)
  const [error, setError] = useState('')
  useEffect(() => {
    setAdminIdentity('')
    setError('')
    if (auth.isPending || !auth.session?.user) return undefined
    let cancelled = false
    const generation = auth.generation
    adminStatusRequest(apiBase, { backendMode }).then((result) => {
      if (!cancelled && auth.isCurrentGeneration(generation)) setAdminIdentity(result.isAdmin ? auth.session.user.id : '')
    }).catch((reason) => {
      if (!cancelled && auth.isCurrentGeneration(generation)) setError(reason?.message || String(reason))
    })
    return () => { cancelled = true }
  }, [apiBase, backendMode, auth.generation, auth.isPending, auth.session?.user?.id])
  return <main className="bench-shell bench-prompt-page">
    {showNavigation ? <EvidenceNav current="submit" /> : null}
    <header className="bench-subpage-hero"><a href={LEADERBOARD_HREF}><ArrowLeft size={15} />{t("返回综合总榜")}</a><h1>{t("社区评估题审核")}</h1><p>{t("社区审核已纳入统一站长工作区，处理候选池，不修改当前正式题集或榜单。")}</p></header>
    {auth.isPending ? <EvidenceState><Loader2 className="spin" />{t("正在确认管理员身份…")}</EvidenceState> : !admin || !auth.session?.user ? <EvidenceState error>{error || t('需要站长账号才能访问。')}</EvidenceState> : <Suspense fallback={<EvidenceState>{t("正在加载后台…")}</EvidenceState>}><AdminWorkspace key={auth.session.user.id} apiBase={apiBase} health={{ backendMode }} defaultSection="community" /></Suspense>}
  </main>
}
