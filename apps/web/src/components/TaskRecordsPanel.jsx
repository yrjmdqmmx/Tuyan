import {useState, useRef, useEffect} from 'react';
import { useAppLocale } from './BenchmarkLocale.jsx'
import { AlertTriangle, FileText, Loader2, RefreshCcw, ShieldCheck } from 'lucide-react';
import { formatErrorMessage } from '../utils';
import JobTable from './JobTable';

export default function TaskRecordsPanel({ authEnabled, currentUser, isPending, jobs, error, apiBase, onLogin, onRefresh, onUseForRefine, renderRecovery, onOpenTask }) {
  const { t } = useAppLocale()
  const [opening,setOpening]=useState(''),[openError,setOpenError]=useState('')
  const owner=useRef(currentUser?.id), sequence=useRef(0)
  owner.current=currentUser?.id
  useEffect(()=>{sequence.current++;setOpening('');setOpenError('');return()=>{sequence.current++}},[currentUser?.id])
  async function openTask(id) {
    const request=++sequence.current, account=owner.current
    setOpening(id);setOpenError('')
    try {await onOpenTask(id)} catch(error) {if(request===sequence.current&&owner.current===account)setOpenError(error.message||'暂时无法读取任务，请刷新记录后重试。')}
    finally {if(request===sequence.current&&owner.current===account)setOpening('')}
  }
  return (
    <section className="user-jobs-panel">
      <div className="section-head">
        <FileText size={20} />
        <div>
          <h2>{t("我的任务记录")}</h2>
          <p>{t("任务记录与账号绑定，登录后可以查看自己提交过的任务。")}</p>
        </div>
      </div>

      {isPending ? (
        <div className="login-required-card">
          <Loader2 className="spin" size={22} />
          <div>
            <h3>{t("正在检查登录状态")}</h3>
            <p>{t("请稍候。")}</p>
          </div>
        </div>
      ) : !currentUser ? (
        <div className="login-required-card">
          <ShieldCheck size={22} />
          <div>
            <h3>{t("任务记录需要登录后使用")}</h3>
            <p>{t("请登录提交任务时使用的账号。匿名任务无法通过账号记录找回。")}</p>
            {authEnabled ? (
              <button type="button" onClick={onLogin}>{t("登录 / 注册")}</button>
            ) : (
              <span>{t("账号服务部署后即可使用。")}</span>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="admin-controls">
            <input value={currentUser?.email || ''} readOnly aria-label={t("当前账号")} />
            <button type="button" onClick={onRefresh}><RefreshCcw size={17} />{t("刷新")}</button>
          </div>
          <p className="universal-hint">{t('服务器已接收的任务不会因关闭网页而取消。重新登录同一账号后可查看进度或结果；查看任务不会重新提交模型调用。')}</p>
          {openError&&<p className="error-line" role="alert">{openError}</p>}
          {error ? <div className="error-line"><AlertTriangle size={16} /> {formatErrorMessage(error)}</div> : null}
          <JobTable jobs={jobs} showUser={false} apiBase={apiBase} onUseForRefine={onUseForRefine} renderRecovery={renderRecovery} onOpenTask={onOpenTask?openTask:undefined} openingTask={opening} />
        </>
      )}
    </section>
  );
}
