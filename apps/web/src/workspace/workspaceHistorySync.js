import { mergeAccountHistory, HISTORY_REFRESH_MS, historyRetryDelay, savedHistoryCount, transientHistoryError } from './workspaceHistory.js';

// One scheduler per account controller. Only read-only history requests retry;
// generation admission, saved task identities and conflict copies are untouched.
export class WorkspaceHistorySync {
  constructor({controller,notify,canRefresh = () => true,now = Date.now,setTimer = setTimeout,clearTimer = clearTimeout}) {
    Object.assign(this,{controller,notify,canRefresh,now,setTimer,clearTimer});
    this.failures=0;this.nextDue=0;this.started=false;this.disposed=false;this.inFlight=null;
  }
  start() { if(this.started || this.disposed)return;this.started=true;void this.refresh(); }
  wake() { if(this.started && this.now()>=this.nextDue)void this.refresh(); }
  schedule() {
    this.clearTimer(this.timer);
    if(!this.disposed && this.canRefresh())this.timer=this.setTimer(()=>this.wake(),Math.max(0,this.nextDue-this.now()));
  }
  refresh({manual=false}={}) {
    if(this.disposed || this.controller.disposed || !this.controller.state)return Promise.resolve();
    if(this.inFlight)return this.inFlight;
    if(!this.canRefresh() || !manual && this.now()<this.nextDue)return Promise.resolve();
    this.clearTimer(this.timer);
    this.inFlight=this.perform(manual).finally(()=>{this.inFlight=null;this.schedule();});
    return this.inFlight;
  }
  async perform(manual) {
    const c=this.controller;
    if(manual)this.notify({historyStatus:'正在更新账号历史…'});
    try {
      let offset=0,truncated=false;const seen=new Set();
      do {
        const data=await c.client.history(offset,{force:manual});
        if(this.disposed || c.disposed)return;
        const fresh=data.jobs.filter(job=>!seen.has(job.id));fresh.forEach(job=>seen.add(job.id));
        c.setState(state=>mergeAccountHistory(state,fresh));truncated ||= data.truncated===true;
        if(data.nextOffset==null)break;
        if(!Number.isSafeInteger(data.nextOffset) || data.nextOffset<=offset || !fresh.length)throw Object.assign(Error('历史分页未前进'),{status:422});
        offset=data.nextOffset;
      }while(true);
      this.failures=0;
      const activeHistory=c.state.tasks.some(t=>!t.deleted && t.runs.some(r=>r.history && r.status==='running'));
      this.nextDue=this.now()+(activeHistory?60000:HISTORY_REFRESH_MS);
      this.notify({historyStatus:`历史已更新 · 已保留 ${savedHistoryCount(c.state)} 条执行记录`,historyIssue:truncated?'历史接口尚未返回全部记录，已读取的任务仍保留。':''});
    }catch(error){
      if(this.disposed || c.disposed)return;
      this.failures++;
      const transient=transientHistoryError(error);
      this.nextDue=this.now()+(transient?historyRetryDelay(this.failures):HISTORY_REFRESH_MS);
      const reason=error.status===401?'登录已过期，请重新登录后更新历史':error.status===403||error.status===409?'账号状态已变化，请刷新后重试':error.status===422?'历史返回不完整，请稍后重新同步':/timeout|timed out/i.test(`${error.name} ${error.message}`)?'历史更新超时':'历史暂时无法更新';
      const message=`${reason}；已有任务和草稿已保留${transient?'，将自动重试。':'。'}`;
      this.notify({historyStatus:message,historyIssue:manual||!transient||this.failures>=3?message:''});
    }
  }
  dispose() { this.disposed=true;this.clearTimer(this.timer); }
}
