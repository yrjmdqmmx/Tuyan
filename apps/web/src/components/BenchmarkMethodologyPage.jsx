import { useBenchmarkLocale } from './BenchmarkLocale.jsx'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { benchmarkMethodologyRequest } from '@paperbanana/api'

import { appPath } from '../appPaths.js'
import { normalizeMethodologyResponse } from './benchmarkMethodology.js'

const WORKSPACE_HREF = appPath('/')
const LEADERBOARD_HREF = appPath('/leaderboard')
const SUBMIT_HREF = appPath('/leaderboard/submit-prompt')
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

const SCIENTIFIC_RUBRIC_AXES = Object.freeze([
  Object.freeze({ id: 'scientific_faithfulness', label: '科研忠实度' }),
  Object.freeze({ id: 'structural_topology', label: '结构拓扑' }),
  Object.freeze({ id: 'text_symbol_accuracy', label: '文字符号' }),
  Object.freeze({ id: 'quantitative_accuracy', label: '数值图表' }),
  Object.freeze({ id: 'instruction_adherence', label: '指令遵从' }),
  Object.freeze({ id: 'readability_visual_hierarchy', label: '信息层级 / 可读性' }),
  Object.freeze({ id: 'information_density', label: '信息密度' }),
  Object.freeze({ id: 'publication_aesthetics', label: '发表级美观' }),
  Object.freeze({ id: 'edit_target_accuracy', label: '编辑目标命中' }),
  Object.freeze({ id: 'non_target_preservation', label: '非目标保持' }),
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
  const { t, locale } = useBenchmarkLocale()
  return (
    <nav className="bench-nav" aria-label={t("排行榜导航")}>
      <a className="bench-brand" href={WORKSPACE_HREF}><img src={LOGO_HREF} alt="" />{t("图研Tuyan")}</a>
      <a href={WORKSPACE_HREF}>{t("工作台")}</a>
      <a href={LEADERBOARD_HREF}>{t("排行榜")}</a>
      <span aria-current="page">{t("方法说明")}</span>
      <a href={SUBMIT_HREF}>{t("提交评估题")}</a>
      <a href="https://github.com/yrjmdqmmx/Tuyan" target="_blank" rel="noreferrer">GitHub <ExternalLink size={12} /></a>
    </nav>
  )
}

function MethodologyHero({ data }) {
  const { t, locale } = useBenchmarkLocale()
  const { methodology, releaseHash, suite } = data
  return (
    <header className="bench-method-hero">
      <a className="bench-method-back" href={LEADERBOARD_HREF}><ArrowLeft size={15} />{t("返回综合总榜")}</a>
      <div className="bench-eyebrow">{t("REPRODUCIBLE METHODOLOGY")}</div>
      <h1>{t("评测方法与完整题集")}</h1>
      <p>{t("公开当前 release 的冻结方法、完整提示词、约束与逐维评分原文，便于复核和复现实验。")}</p>
      <dl className="bench-method-identities">
        <div><dt>{t("Suite ID")}</dt><dd>{suite.id}</dd></div>
        <div><dt>{t("Suite manifest")}</dt><dd className="bench-method-hash">{suite.manifestHash}</dd></div>
        <div><dt>{t("Release hash")}</dt><dd className="bench-method-hash">{releaseHash}</dd></div>
        <div><dt>{t("Evaluation mode")}</dt><dd>{methodology.evaluationMode}</dd></div>
        <div><dt>{t("Evaluation epoch")}</dt><dd>{methodology.evaluationEpoch}</dd></div>
        <div><dt>{t("License")}</dt><dd>{licenseText(suite.license)}</dd></div>
      </dl>
    </header>
  )
}

function PageDirectory() {
  const { t, locale } = useBenchmarkLocale()
  return (
    <nav className="bench-method-directory" aria-label={t("方法说明目录")}>
      <strong>{t("本页目录")}</strong>
      <a href="#evaluation-process">{t("01 评测流程")}</a>
      <a href="#public-suite">{t("02 完整题集")}</a>
      <a href="#scoring-contract">{t("03 评分与排名")}</a>
      <a href="#review-limits">{t("04 审核与限制")}</a>
    </nav>
  )
}

function EvaluationProcess({ data }) {
  const { t, locale } = useBenchmarkLocale()
  const { methodology, scoring, suite } = data
  const automaticJudgeCount = Array.isArray(methodology.automaticJudges) ? methodology.automaticJudges.length : 0
  return (
    <section className="bench-method-section" id="evaluation-process" aria-labelledby="evaluation-process-title">
      <div className="bench-method-section-head"><span>01</span><div><div className="bench-eyebrow">{t("PROCESS")}</div><h2 id="evaluation-process-title">{t("评测流程")}</h2></div></div>
      <ol className="bench-method-steps">
        <li><b>01</b><div><strong>{t("冻结 / 归一模型")}</strong><p>{t("以同一 evaluation epoch")}<code>{methodology.evaluationEpoch}</code> {t("固定比较边界。")}</p></div></li>
        <li><b>02</b><div><strong>{t("每模型四题各一次")}</strong><p>{t("固定")}{suite.cases.length} {t("题、每模型最多")}{scoring.maximumSamplesPerModel} {t("张，禁止自动重试。")}</p></div></li>
        <li><b>03</b><div><strong>{t("Codex 两遍结构化盲审")}</strong><p>{methodology.reviewerKind} · {methodology.reviewerPasses} {t("遍 · automaticJudges =")} {automaticJudgeCount}。</p></div></li>
        <li><b>04</b><div><strong>{t("至少 3 / 4 入榜")}</strong><p>{t("七维等权，采用 competition 1, 1, 3 的并列名次。")}</p></div></li>
      </ol>
    </section>
  )
}

function CopyPromptButton({ caseTitle, kind, prompt, onCopy }) {
  const { t, locale } = useBenchmarkLocale()
  const label = kind === 'positive' ? '正向' : '负向'
  return <button type="button" aria-label={t("复制{v0}提示词：{v1}", {v0: label, v1: caseTitle})} onClick={() => onCopy(kind, prompt)}><Copy size={14} />{t("复制")}{label}{t("提示词")}</button>
}

function PromptBlock({ caseTitle, kind, prompt, onCopy }) {
  const { t, locale } = useBenchmarkLocale()
  const label = kind === 'positive' ? t("正向 renderPrompt") : t("负向 negativePrompt")
  return (
    <section className="bench-method-prompt-block">
      <header><h4>{label}</h4><CopyPromptButton caseTitle={caseTitle} kind={kind} prompt={prompt} onCopy={onCopy} /></header>
      <pre data-original-material lang="zh-CN" className="bench-method-prompt">{prompt}</pre>
    </section>
  )
}

function ConstraintGroup({ label, values }) {
  const { t, locale } = useBenchmarkLocale()
  const items = Array.isArray(values) ? values : []
  return (
    <section className="bench-method-constraint" aria-label={t(label)}>
      <h3>{t(label)}</h3>
      {items.length ? <ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>{t("无")}</p>}
    </section>
  )
}

function RubricTable({ benchmarkCase }) {
  const { t, locale } = useBenchmarkLocale()
  return (
    <div className="bench-method-rubric-wrap">
      <table className="bench-method-rubric" aria-label={t("{v0} 七维评分原文", {v0: t(benchmarkCase.title)})}>
        <thead><tr><th scope="col">{t("维度")}</th><th scope="col">{t("评分原文")}</th></tr></thead>
        <tbody>{RUBRIC_AXES.map((axis) => (
          <tr key={axis.id}><th scope="row">{t(axis.label)}</th><td data-original-material lang="zh-CN">{benchmarkCase.rubric?.[axis.id] ?? ''}</td></tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function MethodologyCase({ benchmarkCase, index }) {
  const { t, locale } = useBenchmarkLocale()
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
      status = { key: "已复制{v0}提示词", label }
    } catch {
      status = { key: "复制失败，请手动选择并复制{v0}提示词", label }
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
        <div><span>{t('CASE')} {String(index).padStart(2, '0')}</span><h3 id={`benchmark-case-${index}`}>{t(benchmarkCase.title)}</h3><p>{benchmarkCase.caption}</p></div>
        <dl>
          <div><dt>ID</dt><dd>{benchmarkCase.id}</dd></div>
          <div><dt>{t('Category')}</dt><dd>{benchmarkCase.category}</dd></div>
          <div><dt>{t('Aspect ratio')}</dt><dd>{benchmarkCase.aspectRatio}</dd></div>
          <div><dt>{t("Case hash")}</dt><dd className="bench-method-hash">{benchmarkCase.manifestHash}</dd></div>
          <div><dt>{t("License")}</dt><dd>{licenseText(benchmarkCase.license)}</dd></div>
        </dl>
      </header>
      <div className="bench-method-prompts">
        <PromptBlock caseTitle={t(benchmarkCase.title)} kind="positive" prompt={benchmarkCase.renderPrompt} onCopy={copyPrompt} />
        <PromptBlock caseTitle={t(benchmarkCase.title)} kind="negative" prompt={benchmarkCase.negativePrompt} onCopy={copyPrompt} />
      </div>
      {copyStatus ? <p className="bench-method-copy-status" role="status" aria-label={t(copyStatus.key, {v0: t(copyStatus.label)})}>{t(copyStatus.key, {v0: t(copyStatus.label)})}</p> : null}
      <div className="bench-method-constraints">
        {CONSTRAINT_GROUPS.map((group) => <ConstraintGroup label={group.label} values={benchmarkCase[group.key]} key={group.key} />)}
      </div>
      <RubricTable benchmarkCase={benchmarkCase} />
      <footer className="bench-method-case-footer">
        <a href={appPath(`/leaderboard/cases/${encodeURIComponent(benchmarkCase.id)}`)}>{t("查看全部模型结果")}<span aria-hidden="true">→</span></a>
      </footer>
    </article>
  )
}

function PublicSuite({ suite }) {
  const { t, locale } = useBenchmarkLocale()
  return (
    <section className="bench-method-section" id="public-suite" aria-labelledby="public-suite-title">
      <div className="bench-method-section-head"><span>02</span><div><div className="bench-eyebrow">{t("PUBLIC SUITE")}</div><h2 id="public-suite-title">{t("完整题集")}</h2><p>{suite.title} · v{suite.version} · {suite.language}</p></div></div>
      <div className="bench-method-case-list">{suite.cases.map((benchmarkCase, index) => <MethodologyCase benchmarkCase={benchmarkCase} index={index + 1} key={benchmarkCase.id} />)}</div>
    </section>
  )
}

function RankingContract({ rankingMethod }) {
  const { t, locale } = useBenchmarkLocale()
  const axisOrder = rankingMethod.axes.join(' → ')
  const weightSummary = rankingMethod.axes.map((axis, index) => `${axis} = ${rankingMethod.weights[index]}`).join(' · ')
  return (
    <div aria-label={t("完整 rankingMethod 合约")}>
      <dt>{t("Ranking contract")}</dt>
      <dd><code>rankingMethod = {rankingMethod.id}</code><small>axes = {axisOrder}<br />weights = {weightSummary}<br />tieMethod = {rankingMethod.tieMethod}</small></dd>
    </div>
  )
}

function ScoringContract({ methodology, scoring }) {
  const { t, locale } = useBenchmarkLocale()
  return (
    <section className="bench-method-section" id="scoring-contract" aria-labelledby="scoring-contract-title">
      <div className="bench-method-section-head"><span>03</span><div><div className="bench-eyebrow">{t("SCORING")}</div><h2 id="scoring-contract-title">{t("评分与排名")}</h2></div></div>
      <dl className="bench-method-score-grid">
        <div><dt>{t("单轴分数")}</dt><dd>{scoring.scoreMin}–{scoring.scoreMax}</dd></div>
        <div><dt>{t("最低完整样本")}</dt><dd>{scoring.minimumReviewedSamples} / {scoring.maximumSamplesPerModel}</dd></div>
        <div><dt>{t("单模型上限")}</dt><dd>{t("每模型最多")} {scoring.maximumSamplesPerModel}</dd></div>
        <div><dt>{t("Overall")}</dt><dd>{t("七维等权")}<br /><code>(d1 + d2 + d3 + d4 + d5 + d6 + d7) / 7</code><small>{scoring.overallFormula}<br />noOverallScore = {String(methodology.noOverallScore)}<br />rankingMethod = {methodology.rankingMethod?.id}</small></dd></div>
        <div><dt>{t("红线策略")}</dt><dd><code>{scoring.redLinePolicy}</code><small>{t("confirmed axis cap")}</small></dd></div>
        <div><dt>{t("并列规则")}</dt><dd><code>{scoring.tieMethod}</code><small>{t("competition ranking 1, 1, 3")}</small></dd></div>
        <RankingContract rankingMethod={methodology.rankingMethod} />
      </dl>
    </section>
  )
}

function ReviewLimits({ methodology }) {
  const { t, locale } = useBenchmarkLocale()
  const automaticJudgeCount = Array.isArray(methodology.automaticJudges) ? methodology.automaticJudges.length : 0
  return (
    <section className="bench-method-section bench-method-limits" id="review-limits" aria-labelledby="review-limits-title">
      <div className="bench-method-section-head"><span>04</span><div><div className="bench-eyebrow">{t("REVIEW & LIMITS")}</div><h2 id="review-limits-title">{t("审核协议与边界")}</h2></div></div>
      <dl className="bench-method-review-grid">
        <div><dt>{t("reviewProtocol")}</dt><dd>{methodology.reviewProtocol}</dd></div>
        <div><dt>{t("reviewerKind")}</dt><dd>{methodology.reviewerKind}</dd></div>
        <div><dt>{t("reviewerPasses")}</dt><dd>{methodology.reviewerPasses} {t("遍")}</dd></div>
        <div><dt>{t("automaticJudges")}</dt><dd>{automaticJudgeCount}</dd></div>
      </dl>
      <div className="bench-method-limit-copy">
        <p><strong>{t("如何解读：")}</strong>{t("当前为单一审阅者、轻量样本；不同原生分辨率同榜，适合方向性比较，不替代你的具体业务实测。")}</p>
        <p><strong>{t("公开边界：")}</strong>{t("不公开盲标签、模型映射、内部审核或签名材料。")}</p>
      </div>
    </section>
  )
}

function MethodologyDocument({ data, showNavigation = true }) {
  const { t } = useBenchmarkLocale()
  return (
    <main className="bench-shell bench-method-page">
      {showNavigation ? <MethodologyNav /> : null}
      <MethodologyHero data={data} />
      <p className="bench-original-note">{t('原始评测材料（保持原文）')}</p><PageDirectory />
      <EvaluationProcess data={data} />
      <PublicSuite suite={data.suite} />
      <ScoringContract methodology={data.methodology} scoring={data.scoring} />
      <ReviewLimits methodology={data.methodology} />
    </main>
  )
}

function ScientificMethodologyCase({ benchmarkCase, index }) {
  const { t, locale } = useBenchmarkLocale()
  const axes = SCIENTIFIC_RUBRIC_AXES.filter((axis) => benchmarkCase.applicableAxes.includes(axis.id))
  return (
    <article className="bench-method-case bench-scientific-case" aria-labelledby={`scientific-case-${index}`}>
      <header className="bench-method-case-head">
        <div><span>{t(benchmarkCase.kind === 'edit' ? 'EDIT' : 'GEN')} {String(index).padStart(2, '0')}</span><h3 id={`scientific-case-${index}`}>{t(benchmarkCase.title)}</h3><p data-original-material lang="zh-CN">{benchmarkCase.instruction}</p></div>
        <dl><div><dt>ID</dt><dd>{benchmarkCase.id}</dd></div><div><dt>{t("题型")}</dt><dd>{benchmarkCase.kind === 'edit' ? t("确定性局部编辑") : t("科研插图生成")}</dd></div><div><dt>{t("Case hash")}</dt><dd className="bench-method-hash">{benchmarkCase.manifestHash}</dd></div></dl>
      </header>
      <section className="bench-method-prompt-block"><header><h4>{benchmarkCase.kind === 'edit' ? t("局部编辑指令") : t("完整生成指令")}</h4></header><pre data-original-material lang="zh-CN" className="bench-method-prompt">{benchmarkCase.instruction}</pre></section>
      {benchmarkCase.kind === 'generation'
        ? <section className="bench-method-prompt-block"><header><h4>{t("负向约束")}</h4></header><pre data-original-material lang="zh-CN" className="bench-method-prompt">{benchmarkCase.negativePrompt}</pre></section>
        : <dl className="bench-method-edit-source"><div><dt>{t("固定源图 SHA-256")}</dt><dd className="bench-method-hash">{benchmarkCase.sourceHash}</dd></div><div><dt>{t("编号区域")}</dt><dd>{benchmarkCase.region}</dd></div></dl>}
      <div className="bench-method-rubric-wrap"><table className="bench-method-rubric" aria-label={t("{v0}适用维度评分原文", {v0: t(benchmarkCase.title)})}><thead><tr><th scope="col">{t("维度")}</th><th scope="col">{t("评分原文")}</th></tr></thead><tbody>{axes.map((axis) => <tr key={axis.id}><th scope="row">{t(axis.label)}</th><td data-original-material lang="zh-CN">{benchmarkCase.rubric[axis.id]}</td></tr>)}</tbody></table></div>
      <footer className="bench-method-case-footer"><a href={appPath(`/leaderboard/cases/${encodeURIComponent(benchmarkCase.id)}`)}>{t("查看全部模型结果")}<span aria-hidden="true">→</span></a></footer>
    </article>
  )
}

function ScientificMethodologyDocument({ data, showNavigation = true }) {
  const { t, locale } = useBenchmarkLocale()
  const { methodology, scoring, suite } = data
  return (
    <main className="bench-shell bench-method-page bench-scientific-method-page">
      {showNavigation ? <MethodologyNav /> : null}
      <header className="bench-method-hero">
        <a className="bench-method-back" href={LEADERBOARD_HREF}><ArrowLeft size={15} />{t("返回综合总榜")}</a>
        <div className="bench-eyebrow">{t("SCIENTIFIC FIGURE BENCHMARK V2")}</div><h1>{t("评测方法与完整题集")}</h1>
        <p>{t("固定九题、十维等权、失败记 0；公开生成与局部编辑的完整指令、适用维度、渠道和审核边界。")}</p>
        <dl className="bench-method-identities"><div><dt>{t("Suite ID")}</dt><dd>{suite.id}</dd></div><div><dt>{t("Suite manifest")}</dt><dd className="bench-method-hash">{suite.manifestHash}</dd></div><div><dt>{t("Release hash")}</dt><dd className="bench-method-hash">{data.releaseHash}</dd></div><div><dt>{t("Evaluation mode")}</dt><dd>{methodology.evaluationMode}</dd></div><div><dt>{t("Evaluation epoch")}</dt><dd>{methodology.evaluationEpoch}</dd></div><div><dt>{t("Review protocol")}</dt><dd>{methodology.reviewProtocol}</dd></div></dl>
      </header>
      <p className="bench-original-note">{t('原始评测材料（保持原文）')}</p><PageDirectory />
      <section className="bench-method-section" id="evaluation-process"><div className="bench-method-section-head"><span>01</span><div><div className="bench-eyebrow">{t("PROCESS")}</div><h2>{t("评测流程")}</h2></div></div><ol className="bench-method-steps">
        <li><b>01</b><div><strong>{t("固定九题")}</strong><p>{t("六道生成题与三道确定性局部编辑题；每个模型固定九个题位。")}</p></div></li>
        <li><b>02</b><div><strong>{t("确认失败最多 4 次")}</strong><p>{t("仅确认的技术或渠道失败允许有界重试；UNKNOWN_PROVIDER_OUTCOME 不自动重试，立即暂停对账。")}</p>{methodology.retryPolicy.providerMaxAttempts?.replicate === 1 ? <p>{t("Replicate：每题最多 1 次提交，不自动重试。")}</p> : null}</div></li>
        <li><b>03</b><div><strong>{t("固定渠道优先级")}</strong><p>{methodology.routePriority.join(' → ')}{t("；不得失败后静默换渠道。")}</p></div></li>
        <li><b>04</b><div><strong>{t("独立双盲审核")}</strong><p>{t("两位审阅者独立评分，分差或红线冲突进入 xhigh 争议仲裁；automatic Judge 固定 0。")}</p></div></li>
      </ol></section>
      <section className="bench-method-section" id="public-suite"><div className="bench-method-section-head"><span>02</span><div><div className="bench-eyebrow">{t("PUBLIC SUITE")}</div><h2>{t("九个固定题位")}</h2><p>{t("6 generation + 3 deterministic edit ·")}{suite.language}</p></div></div><div className="bench-method-case-list">{suite.cases.map((benchmarkCase, index) => <ScientificMethodologyCase benchmarkCase={benchmarkCase} index={index + 1} key={benchmarkCase.id} />)}</div></section>
      <section className="bench-method-section" id="scoring-contract"><div className="bench-method-section-head"><span>03</span><div><div className="bench-eyebrow">{t("SCORING")}</div><h2>{t("十维评分与排名")}</h2></div></div><dl className="bench-method-score-grid"><div><dt>{t("单轴分数")}</dt><dd>{scoring.scoreMin}–{scoring.scoreMax}</dd></div><div><dt>{t("失败 / 不支持")}</dt><dd>{t("失败记 0 · unsupported =")}{scoring.unsupportedScore}</dd></div><div><dt>{t("Overall")}</dt><dd>{t("十维 raw mean 等权")}<small>{scoring.overallFormula}</small></dd></div><div><dt>{t("并列规则")}</dt><dd>{t("competition 1, 1, 3")}</dd></div>{SCIENTIFIC_RUBRIC_AXES.map((axis) => <div key={axis.id}><dt>{t(axis.label)}</dt><dd><code>{axis.id}</code><small>{t("weight = 0.1")}</small></dd></div>)}</dl></section>
      <section className="bench-method-section bench-method-limits" id="review-limits"><div className="bench-method-section-head"><span>04</span><div><div className="bench-eyebrow">{t("BUDGET & LIMITS")}</div><h2>{t("渠道、预算与双盲局限")}</h2></div></div><dl className="bench-method-review-grid"><div><dt>{t("渠道")}</dt><dd>{methodology.routePriority.join(' → ')}</dd></div>{Object.entries(methodology.providerBudgetsCny).map(([provider, budget]) => <div key={provider}><dt>{provider}</dt><dd>¥{budget} {t("硬上限")}</dd></div>)}<div><dt>{t("双盲")}</dt><dd>{methodology.blindReview.reviewers} {t("位独立审阅者")}</dd></div><div><dt>{t("争议仲裁")}</dt><dd>{methodology.blindReview.arbitration}</dd></div></dl><div className="bench-method-limit-copy"><p><strong>{t("固定九题：")}</strong>{t("覆盖面有限，不能代表所有科研领域。")}</p><p><strong>{t("单次生产运行：")}</strong>{t("不估计同模型跨时间方差；渠道、价格和模型版本仍可能变化。")}</p><p><strong>{t("双盲局限：")}</strong>{t("审阅仍包含判断误差，只有预设分差、红线冲突或低置信度才触发仲裁。")}</p></div></section>
    </main>
  )
}

function MethodologyState({ children, error = false }) {
  return <main className={`bench-state bench-method-state${error ? ' bench-state-error' : ''}`}>{children}</main>
}

export default function BenchmarkMethodologyPage({ apiBase, backendMode = 'gateway', enabled = true, showNavigation = true }) {
  const { t, locale } = useBenchmarkLocale()
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

  if (!enabled) return <MethodologyState>{t("方法说明尚未开放。")}</MethodologyState>
  if (loading) return <MethodologyState><Loader2 className="spin" />{t("正在读取方法说明…")}</MethodologyState>
  if (error) return (
    <MethodologyState error>
      <strong>{t("方法说明暂不可用：")}{t(error)}</strong>
      <button type="button" onClick={() => setRetryNonce((value) => value + 1)}><RefreshCw size={15} />{t("重新加载方法说明")}</button>
      <a href={LEADERBOARD_HREF}><ArrowLeft size={15} />{t("返回综合总榜")}</a>
    </MethodologyState>
  )
  if (!data?.methodology || !data?.scoring || !Array.isArray(data?.suite?.cases) || ![4, 9].includes(data.suite.cases.length)) {
    return <MethodologyState><strong>{t("当前 release 未公开可复现题集")}</strong><a href={LEADERBOARD_HREF}><ArrowLeft size={15} />{t("返回综合总榜")}</a></MethodologyState>
  }
  return data.suite.id === 'pb-scientific-figure-v2'
    ? <ScientificMethodologyDocument data={data} showNavigation={showNavigation} />
    : <MethodologyDocument data={data} showNavigation={showNavigation} />
}
