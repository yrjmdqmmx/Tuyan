import { Check, ChevronDown, FilePenLine, Layers, Sparkles } from 'lucide-react';
import WorkspaceArchive from './WorkspaceArchive.jsx';
import WorkspaceRunEvidence from './WorkspaceRunEvidence.jsx';
import { ROLE_NAMES } from './workspaceModels.js';
import { PATHS, locateVersion, versionLabel } from './workspaceState.js';

function timeLabel(value) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? { iso: date.toISOString(), label: new Intl.DateTimeFormat('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).format(date) } : null;
}
const statusLabel = run => run.status === 'succeeded' || run.status === 'completed' ? (run.kind === 'edit' ? '已保存' : '已完成') : ({ failed:'执行失败', cancelled:'已停止', running:'执行中', queued:'等待中', submitting:'提交中' }[run.status] || '待确认');

export default function WorkspaceExecutionDetails({ task, userId, renderRecovery, onShowVersion }) {
  const versions = Object.values(task.branches).flatMap(b => b.groups.flatMap(g => g.candidates.flatMap(c => c.versions.map(v => locateVersion(task, v.id)))));
  return <div className="tw-execution-details">
    <div className="tw-execution-overview"><div><span className="tw-execution-eyebrow">任务记录</span><h3>{task.title}</h3><p>{task.runs.length} 条记录<span>·</span>{versions.length} 个版本</p></div><WorkspaceArchive task={task} userId={userId}/></div>
    <div className="tw-execution-list">{[...task.runs].reverse().map((run, index) => {
      const manual = run.kind === 'edit', input = run.input, settings = input.settings[input.mode];
      const results = versions.filter(v => v.runId === run.id), parent = locateVersion(task, run.parentId), at = timeLabel(run.createdAt);
      const title = manual ? 'SVG 手工编辑' : run.kind === 'refine' ? '修改方案' : '生成新方案';
      const Icon = manual ? FilePenLine : Sparkles;
      return <details key={run.id} className={`tw-execution-record ${run.status === 'failed' ? 'is-failed' : ''}`} open={index === 0 && !manual ? true : undefined}>
        <summary><span className="tw-execution-symbol"><Icon size={18}/></span><span className="tw-execution-summary"><span className="tw-execution-title"><strong>{title}</strong><span className={`tw-execution-badge is-${run.status}`}>{statusLabel(run)}</span></span><span className="tw-execution-meta">{PATHS[run.path]}{results.length > 0 && ` · ${results.map(v => versionLabel(v)).join('、')}`}{manual && ' · 未重新评审'}</span>{run.status === 'failed' && <span className="tw-execution-error">{run.error || run.stage}</span>}</span><span className="tw-execution-time">{at ? <time dateTime={at.iso}>{at.label}</time> : '时间未记录'}</span><ChevronDown className="tw-execution-chevron" size={16}/></summary>
        <div className="tw-execution-content">
          {run.stage && <p className="tw-execution-stage">{run.status === 'succeeded' && <Check size={14}/>} {run.stage}</p>}
          {(parent || results.length > 0) && <div className="tw-execution-versions"><Layers size={15}/>{parent && <span>源版本：{versionLabel(parent)}</span>}{results.map(v => <button type="button" key={v.id} onClick={() => onShowVersion(v.id)}>查看 {versionLabel(v)}</button>)}</div>}
          <section className="tw-execution-input"><h4>{manual ? '保存说明' : '提交时的要求'}</h4><p className="tw-preserve-text">{input.text || '未记录文字要求'}</p>{!manual && input.caption && <p>指定图注：{input.caption}</p>}{!manual && input.avoid && <p>避免出现：{input.avoid}</p>}</section>
          {!manual && <>
            <dl className="tw-execution-settings"><div><dt>模式</dt><dd>{input.mode === 'simple' ? '普通' : '专业'}</dd></div><div><dt>比例</dt><dd>{settings.ratio === 'auto' ? '自动' : settings.ratio}</dd></div><div><dt>候选与评审</dt><dd>{run.path === 'png' && (run.parentId || input.attachments.some(a => a.purpose === 'source')) ? '单张精修 · 执行后评审' : `${run.parentId ? 1 : settings.candidates} 个候选 · ${settings.reviews} 轮评审`}</dd></div></dl>
            <dl className="tw-run-models">{Object.entries(settings.models || {}).filter(([,m]) => m).map(([role,m]) => <div key={role}><dt>{ROLE_NAMES[role] || role}</dt><dd>{m.modelId} · {m.accessProvider}{m.connectionId && ` · 连接 ${m.connectionId.slice(0,8)}`}</dd></div>)}</dl>
          </>}
          {run.execution && <p className="tw-execution-source">{run.execution.simulation ? '本地模拟 · 未调用真实模型' : '执行服务'} · {run.execution.jobId || '等待确认任务编号'}</p>}
          {run.history && <details className="tw-execution-history"><summary>服务器历史快照</summary><p>{run.history.jobId} · {run.history.status}</p><p>原设置：比例 {run.history.ratio === 'auto' ? '自动' : run.history.ratio} · {run.history.candidates} 个候选 · {run.history.reviews} 轮评审</p>{Object.entries(run.history.models || {}).map(([role,m]) => <p key={role}>{ROLE_NAMES[role] || role}：{m.modelId} · {m.accessProvider}</p>)}{run.history.originalCount > 0 && <p>历史执行包含 {run.history.originalCount} 份原材料。未迁移原件，需要用于新执行时请重新添加。</p>}</details>}
          <WorkspaceRunEvidence renderRecovery={run.id === task.activeRunId ? renderRecovery : null} taskId={task.id} run={run} userId={userId}/>
        </div>
      </details>;
    })}</div>
    {!task.runs.length && <p className="tw-muted">暂无执行记录</p>}
  </div>;
}
