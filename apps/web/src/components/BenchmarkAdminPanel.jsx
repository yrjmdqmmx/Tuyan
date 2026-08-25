import { useEffect, useState } from 'react'
import { Download, Pause, Play, RefreshCcw, Upload } from 'lucide-react'
import { adminBenchmarkRequest } from '@paperbanana/api'

export default function BenchmarkAdminPanel({ apiBase, health, disabled = false }) {
  const [candidates, setCandidates] = useState([])
  const [candidateId, setCandidateId] = useState('')
  const [runId, setRunId] = useState('')
  const [maxEstimatedUsd, setMaxEstimatedUsd] = useState('5')
  const [maxGenerations, setMaxGenerations] = useState('24')
  const [maxJudgments, setMaxJudgments] = useState('48')
  const [maxJudgeCalls, setMaxJudgeCalls] = useState('192')
  const [price, setPrice] = useState('0.05')
  const [judgePrice, setJudgePrice] = useState('0.005')
  const [priceSource, setPriceSource] = useState('')
  const [publicEvidenceSampleIds, setPublicEvidenceSampleIds] = useState('')
  const [publishEvidence, setPublishEvidence] = useState('[]')
  const [message, setMessage] = useState('')

  async function load() {
    if (disabled) return
    try {
      const data = await adminBenchmarkRequest(apiBase, health, 'adminBenchmarkCandidates')
      setCandidates(data.candidates || [])
      setCandidateId((current) => current || data.candidates?.[0]?.candidateId || '')
      setMessage('')
    } catch (error) { setMessage(error?.message || String(error)) }
  }

  useEffect(() => { void load() }, [apiBase, disabled])

  async function action(name, payload) {
    if (disabled) return
    try {
      const data = await adminBenchmarkRequest(apiBase, health, name, payload)
      setMessage('操作已由服务端接受并写入审计记录。')
      return data
    } catch (error) {
      setMessage(error?.message || String(error))
      return null
    }
  }

  async function exportPacket() {
    const data = await action('adminBenchmarkReviewExport', {
      runId,
      publicEvidenceSampleIds: publicEvidenceSampleIds.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean),
    })
    if (!data?.packet) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(data.packet, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${data.packet.packetHash}.codex-review.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function approve() {
    const data = await action('adminBenchmarkApprove', { candidateId, entitlementConfirmed: true, priceSnapshot: { estimatedPerGeneration: Number(price), estimatedPerJudgeCall: Number(judgePrice), source: priceSource.trim(), capturedAt: new Date().toISOString() }, maxGenerations: Number(maxGenerations), maxJudgments: Number(maxJudgments), maxJudgeCalls: Number(maxJudgeCalls), maxEstimatedUsd: Number(maxEstimatedUsd) })
    if (data?.approval?.runId) setRunId(data.approval.runId)
  }

  async function publish(profileStatus) {
    try {
      const evidence = JSON.parse(publishEvidence)
      if (!Array.isArray(evidence)) throw new Error('精选证据必须是 JSON 数组。')
      await action('adminBenchmarkPublish', { runId, profileStatus, evidence })
    } catch (error) { setMessage(error?.message || String(error)) }
  }

  async function importPacket(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const review = JSON.parse(await file.text())
    await action('adminBenchmarkReviewImport', { runId, review })
    event.target.value = ''
  }

  return (
    <section className="benchmark-admin" aria-label="模型横评站长控制">
      <div className="benchmark-admin-grid">
        <fieldset><legend>候选与预算审批</legend>
          <div className="benchmark-admin-row"><select disabled={disabled} value={candidateId} onChange={(event) => setCandidateId(event.target.value)}><option value="">选择 detected 候选</option>{candidates.map((item) => <option key={item.candidateId} value={item.candidateId}>{item.provider} · {item.modelId} · {item.state}</option>)}</select><button type="button" disabled={disabled} onClick={load}><RefreshCcw size={14} />刷新</button></div>
          <div className="benchmark-admin-row"><label>单图估算 USD<input disabled={disabled} value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" /></label><label>单次 Judge USD<input disabled={disabled} value={judgePrice} onChange={(event) => setJudgePrice(event.target.value)} inputMode="decimal" /></label><label>总预算 USD<input disabled={disabled} value={maxEstimatedUsd} onChange={(event) => setMaxEstimatedUsd(event.target.value)} inputMode="decimal" /></label></div>
          <label>公开价格来源 HTTPS<input disabled={disabled} value={priceSource} onChange={(event) => setPriceSource(event.target.value)} inputMode="url" placeholder="https://…" /></label>
          <div className="benchmark-admin-row"><label>最多生成<input disabled={disabled} value={maxGenerations} onChange={(event) => setMaxGenerations(event.target.value)} inputMode="numeric" /></label><label>最多逻辑 Judgment<input disabled={disabled} value={maxJudgments} onChange={(event) => setMaxJudgments(event.target.value)} inputMode="numeric" /></label><label>最多 Judge dispatch<input disabled={disabled} value={maxJudgeCalls} onChange={(event) => setMaxJudgeCalls(event.target.value)} inputMode="numeric" /></label></div>
          <button type="button" disabled={disabled || !candidateId || !/^https:\/\//.test(priceSource.trim())} onClick={approve}>确认权益与预算并批准 / 增额</button>
        </fieldset>
        <fieldset><legend>运行控制</legend><label>Run ID<input disabled={disabled} value={runId} onChange={(event) => setRunId(event.target.value)} placeholder="bench-run-…" /></label><div className="benchmark-admin-row"><button type="button" disabled={disabled || !runId} onClick={() => action('adminBenchmarkControl', { runId, targetState: 'paused', reason: 'manual pause' })}><Pause size={14} />暂停</button><button type="button" disabled={disabled || !runId} onClick={() => action('adminBenchmarkControl', { runId, targetState: 'quick_running', reason: 'start quick phase' })}><Play size={14} />临时集</button><button type="button" disabled={disabled || !runId} onClick={() => action('adminBenchmarkControl', { runId, targetState: 'full_running', reason: 'start full phase' })}><Play size={14} />正式集</button></div></fieldset>
        <fieldset><legend>Codex 审核包</legend><p>导出包不含模型身份或自动分数；导入校验 packet、图片和 rubric hash。</p><label>纳入公开精选的 Sample ID（逗号或换行分隔）<textarea disabled={disabled} value={publicEvidenceSampleIds} onChange={(event) => setPublicEvidenceSampleIds(event.target.value)} /></label><div className="benchmark-admin-row"><button type="button" disabled={disabled || !runId} onClick={exportPacket}><Download size={14} />导出</button><label className="benchmark-file-button"><Upload size={14} />导入<input type="file" accept="application/json" disabled={disabled || !runId} onChange={importPacket} /></label></div></fieldset>
        <fieldset><legend>发布控制</legend><p>临时与正式画像都会新建不可变 release；修正通过 supersedes 指向历史。</p><label>精选证据 JSON（sampleId / kind / caption）<textarea disabled={disabled} value={publishEvidence} onChange={(event) => setPublishEvidence(event.target.value)} /></label><div className="benchmark-admin-row"><button type="button" disabled={disabled || !runId} onClick={() => publish('provisional')}>发布临时画像</button><button type="button" disabled={disabled || !runId} onClick={() => publish('verified')}>发布正式画像</button></div></fieldset>
      </div>
      <p className="benchmark-admin-note">未配置 Bench 凭据的 Provider 显示为未评测；本面板不接收或展示任何 API Key。{message ? ` ${message}` : ''}</p>
    </section>
  )
}
