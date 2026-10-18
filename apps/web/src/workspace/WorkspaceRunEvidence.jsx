import JobFailureNotice from '../components/JobFailureNotice.jsx';
import JournalExportPanel from '../components/JournalExportPanel.jsx';
import StageTimeline from '../components/StageTimeline.jsx';
import ResultFigure from '../components/ResultFigure.jsx';
import {elapsedLabel} from './workspaceProgress.js';
import { useEffect, useState } from 'react';
import { API_BASE_DEFAULT } from '../config.js';
import { pollWorkspaceRun } from './workspaceExecution.js';

async function inspectHistory(base,body,userId){const response=await fetch(base+'/api/workspace/history/'+encodeURIComponent(body.jobId)+'/inspect/'+body.candidateId,{credentials:'include',headers:{'X-Workspace-Account':userId},signal:AbortSignal.timeout(30000)});const data=await response.json();if(!response.ok)throw Error(data.error||'文件检查暂不可用');return data;}
const candidateNumber = (image, index) => { const value = Number(image.candidateId ?? image.candidate_id ?? image.candidate ?? index); return Number.isSafeInteger(value) && value >= 0 && value < 26 ? value : index; };
const reviewLabels = { passed: '模型评审通过', issues_found: '模型评审发现问题', modified_unreviewed: '修改后尚未复审', review_failed: '评审未完成', not_requested: '未请求评审' };

// Read only, on demand. Supplier metadata is never treated as new model config.
export default function WorkspaceRunEvidence({ taskId, run, userId, base = API_BASE_DEFAULT, read = pollWorkspaceRun, renderRecovery }) {
  const [job, setJob] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const createdAt=job?.created_at??job?.createdAt, completedAt=job?.completed_at??job?.completedAt;
  useEffect(()=>{if(!job||!['running','queued','pending'].includes(job.status))return;const timer=setTimeout(()=>void load(),15000);return()=>clearTimeout(timer);},[job]);
  if (!userId || (!run.execution?.jobId && !run.history) || run.execution?.simulation) return null;
  async function load() {
    setBusy(true); setError('');
    try { if(run.history){const response=await fetch(base+'/api/workspace/history/'+encodeURIComponent(run.history.jobId),{credentials:'include',headers:{'X-Workspace-Account':userId},signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok)throw Error(data.error);setJob(data.job);}else setJob(await read(base, userId, run.execution.taskId || taskId, run.id, run.execution.jobId)); }
    catch { setError('暂时无法读取渠道与评审记录，已保存的结果不受影响。'); }
    finally { setBusy(false); }
  }
  return <div className="tw-run-evidence">
    <button type="button" className="tw-text-button" onClick={load} disabled={busy}>{busy ? '正在读取记录…' : job ? '刷新渠道与评审记录' : '查看渠道与评审记录'}</button>
    {error && <p role="alert">{error}</p>}
    {job && <>
      <div className="tw-evidence-summary"><strong>{['running','queued','pending'].includes(job.status)?'执行中':job.status==='succeeded'?'已完成':'执行记录'}</strong>{createdAt && <span>{completedAt?'总耗时':'已用时'} {elapsedLabel(new Date(completedAt || Date.now())-new Date(createdAt))}</span>}<span>{job.stages?.length || 0} 个阶段记录</span></div><JobFailureNotice job={job}/>{renderRecovery?.(job,run,taskId)}
      {(job.candidateProgress || job.candidate_progress)?.length > 0 && <details><summary>各候选状态与失败原因</summary><ul>{(job.candidateProgress || job.candidate_progress).map((candidate,index)=><li key={candidate.candidateId ?? candidate.candidate_id ?? index}>候选 {candidateNumber(candidate,index)+1} · {job.status === 'failed' && ['pending','queued','running'].includes(candidate.status) ? '已停止' : ({pending:'等待中',queued:'等待中',running:'执行中',succeeded:'已完成',failed:'失败',cancelled:'已停止'})[candidate.status] || candidate.status}{candidate.error ? `：${typeof candidate.error === 'string' ? candidate.error : candidate.error.message || candidate.error.code || ''}` : ''}</li>)}</ul></details>}
      {(job.referenceSelection || job.reference_images?.some(image=>image.url)) && <details><summary>本次采用的参考</summary>{job.referenceSelection && <p>采用 {job.referenceSelection.selectedCount ?? 0} 张参考；{job.referenceSelection.mode === 'images' ? `提交 ${job.referenceSelection.imageCount ?? 0} 张图片` : '使用参考信息'}。{job.referenceSelection.matchStatus === 'no_suitable_reference' && '未找到合适参考。'}{job.referenceSelection.manualUnmatchedCount > 0 && '部分手选参考未证明结构相容。'}</p>}<div className="image-grid reference-echo">{(job.reference_images || []).filter(image=>image.url).map((image,index)=><ResultFigure key={image.object_key || image.filename || index} image={{...image,candidate_id:index}} apiBase={base} labelPrefix="参考图"/>)}</div><p className="tw-muted">只查看本次执行已有的参考记录，不把原材料加入账号同步。</p></details>}
      <StageTimeline job={job} apiBase={base}/>{job.journalName&&<p>当时的期刊规则：{job.journalName} · {job.journalVersion}</p>}
      <details className="tw-provider-evidence"><summary>渠道调用回报 · {Array.isArray(job.providerCalls)?`${job.providerCalls.length} 次`:'历史记录未提供次数'}</summary>
      <ol>{(job.providerCalls || []).map((call, index) => <li key={index}>{call.channel} · 请求 {call.requestedModel}<br/>实际回报：{call.actualModel || '渠道未提供'}{call.protocol && <small> · {call.protocol}</small>}</li>)}</ol></details>
      <h4>结果评审</h4>
      {(job.result_images || job.results || []).map((image, index) => <div key={image.filename || index}><strong>候选 {String.fromCharCode(65 + candidateNumber(image,index))} · {reviewLabels[image.review?.status || (typeof image.review === 'string' ? image.review : '')] || (typeof image.review === 'string' && image.review ? '历史评审记录' : '未提供评审结论')}</strong>{typeof image.review === 'string' && image.review && !reviewLabels[image.review] ? <p>{image.review}</p> : typeof image.review?.note === 'string' && <p>{image.review.note}</p>}{job.journalProfile&&<JournalExportPanel backdropClassName="tw-nested-backdrop" originalOnly jobId={run.history?.jobId||run.execution.jobId} snapshot={job.journalProfile} candidateId={image.candidate_id??image.candidate??index} apiBase={base} {...(run.history?.source==='production'?{inspectRequest:(base,body)=>inspectHistory(base,body,userId)}:{})}/>}</div>)}
      <p className="tw-muted">这是该次执行的渠道回报与模型评审，不修改所选型号，也不代表人工验收。</p>
    </>}
  </div>;
}
