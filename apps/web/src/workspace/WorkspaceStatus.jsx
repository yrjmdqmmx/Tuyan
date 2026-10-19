import { Activity, AlertTriangle, Cloud, Download, ExternalLink, History, Monitor, RefreshCw } from 'lucide-react';
import WorkspaceDialog from './WorkspaceDialog.jsx';
import { appPath } from '../appPaths.js';

export function workspaceStatusIssues(sync, serviceIssue = '') {
  return [...new Set([sync.error || (sync.status === 'error' ? sync.saveStatus : ''), sync.notice, sync.historyIssue, serviceIssue].filter(Boolean))];
}

export function WorkspaceStatusNotice({ issues, onOpen }) {
  if (!issues.length) return null;
  return <div className="tw-status-notice">
    <AlertTriangle size={16} aria-hidden="true" />
    <span role="alert">{issues[0]}{issues.length > 1 && `（另有 ${issues.length - 1} 项需处理）`}</span>
    <button type="button" onClick={onOpen}>查看并处理</button>
  </div>;
}

export default function WorkspaceStatus({ preview = false, sync, execution, signedIn, run, stepping, onExamples, onExport, issues, open, onOpen, onClose }) {
  const health = execution.health;
  return <>
    <button type="button" className={`tw-status-trigger ${issues.length ? 'has-issue' : ''}`} aria-label="工作区状态与工具" aria-haspopup="dialog" aria-expanded={open} onClick={onOpen}>
      {issues.length ? <AlertTriangle size={17} aria-hidden="true" /> : <Activity size={17} aria-hidden="true" />}<span>工作区状态</span>
    </button>
    {open && <WorkspaceDialog title="工作区状态与工具" onClose={onClose}>
      <div className="tw-status-sections">
        <section>
          <h3><Monitor size={17} aria-hidden="true" />{preview ? '本地预览' : '执行服务'}</h3>
          <p>{!preview && health?.executionMode === 'production' && health.executionEnabled ? '任务与版本随账号保存，执行使用所选渠道。' : health?.executionEnabled === true ? '真实 TokenDance 执行 · 消耗已授权额度 · 任务保存在本机服务' : health?.simulation ? '本地模拟执行 · 不调用真实模型 · 原材料仅存此浏览器' : '正在确认执行服务…'}</p>
          {!health && execution.error && <p className="tw-status-issue">{execution.error}</p>}
          <div className="tw-status-actions">
            <>{preview && <button type="button" onClick={() => onExamples()} disabled={stepping}>载入示例</button>}</>
            <>{preview && <button type="button" onClick={() => onExamples('portrait')} disabled={stepping}>竖图示例</button>}</>
            <button type="button" onClick={execution.refresh} disabled={!run || stepping}><RefreshCw size={14} />刷新执行状态</button>
            {preview && health?.simulation && <button type="button" disabled={!run?.execution} onClick={execution.simulateFailure}>模拟失败</button>}
            <a href={appPath('/?view=legacy')}><ExternalLink size={14} />原工作台</a>
          </div>
        </section>
        <section>
          <h3><Cloud size={17} aria-hidden="true" />账号同步</h3>
          <p className={sync.error ? 'tw-status-issue' : ''}>{sync.error || sync.saveStatus}</p>
          {sync.notice && <p className="tw-status-issue">{sync.notice}</p>}
          {sync.state?.tasks.filter(t=>t.syncConflict&&!t.deleted).map(t=><article key={t.id} className="tw-sync-conflict">
            <h4>{t.title}</h4><p>同一内容发生并发修改，原任务和这份草稿均已保存。可先打开副本核对，再保留为独立任务。</p>
            <div className="tw-status-actions"><button type="button" onClick={()=>{sync.setState(s=>({...s,selectedTaskId:t.id}));onClose();}}>打开冲突副本</button>
            <button type="button" onClick={()=>sync.setState(s=>({...s,tasks:s.tasks.map(task=>{if(task.id!==t.id)return task;const copy={...task};delete copy.syncConflict;return copy;})}))}>保留为独立任务</button></div>
          </article>)}
          <div className="tw-status-actions">
            {signedIn && <button type="button" onClick={sync.retry} disabled={sync.status === 'syncing'}><RefreshCw size={14} />重新同步</button>}
            <button type="button" onClick={onExport}><Download size={14} />导出本机备份</button>
            {sync.canImport && <button type="button" onClick={sync.importGuest}>将此浏览器草稿加入当前账号</button>}
          </div>
        </section>
        {signedIn && <section>
          <h3><History size={17} aria-hidden="true" />历史任务</h3>
          <p className={sync.historyIssue ? 'tw-status-issue' : ''}>{sync.historyStatus || '等待读取账号历史任务。'}</p>
          <div className="tw-status-actions"><button type="button" onClick={sync.loadHistory}><RefreshCw size={14} />同步历史任务</button></div>
        </section>}
      </div>
    </WorkspaceDialog>}
  </>;
}
