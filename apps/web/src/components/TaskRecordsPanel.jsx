import { AlertTriangle, FileText, Loader2, RefreshCcw, ShieldCheck } from 'lucide-react';
import { formatErrorMessage } from '../utils';
import JobTable from './JobTable';

export default function TaskRecordsPanel({ authEnabled, currentUser, isPending, jobs, error, apiBase, onLogin, onRefresh, onUseForRefine, renderRecovery }) {
  return (
    <section className="user-jobs-panel">
      <div className="section-head">
        <FileText size={20} />
        <div>
          <h2>我的任务记录</h2>
          <p>任务记录与账号绑定，登录后可以查看自己提交过的任务。</p>
        </div>
      </div>

      {isPending ? (
        <div className="login-required-card">
          <Loader2 className="spin" size={22} />
          <div>
            <h3>正在检查登录状态</h3>
            <p>请稍候。</p>
          </div>
        </div>
      ) : !currentUser ? (
        <div className="login-required-card">
          <ShieldCheck size={22} />
          <div>
            <h3>任务记录需要登录后使用</h3>
            <p>不登录也可以正常生成候选图；登录后，新提交的任务会保存到你的账号记录里。</p>
            {authEnabled ? (
              <button type="button" onClick={onLogin}>登录 / 注册</button>
            ) : (
              <span>账号服务部署后即可使用。</span>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="admin-controls">
            <input value={currentUser?.email || ''} readOnly aria-label="当前账号" />
            <button type="button" onClick={onRefresh}><RefreshCcw size={17} />刷新</button>
          </div>
          {error ? <div className="error-line"><AlertTriangle size={16} /> {formatErrorMessage(error)}</div> : null}
          <JobTable jobs={jobs} showUser={false} apiBase={apiBase} onUseForRefine={onUseForRefine} renderRecovery={renderRecovery} />
        </>
      )}
    </section>
  );
}
