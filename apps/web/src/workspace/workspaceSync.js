import { applyTaskDeletions, deletionMarkers, permanentlyRemoveTask, taskMaterialIds } from '../../../../packages/api/src/workspace-deletion.mjs';
import { readAccountHistory } from './workspaceHistory.js';
import { cleanWorkspace } from '../../../../packages/api/src/workspace-sync.mjs';
import { newWorkspace, uid, taskHasContent } from './workspaceState.js';

export const LEGACY_WORKSPACE_KEY = 'tuyan.workspace-ui-preview.v1';
export const ORIGINAL_SCOPE = 'workspace-ui-preview:local';
function canonical(value, context = '') {
  if(Array.isArray(value)){const items=value.map(item=>canonical(item,context));return ['tasks','runs','groups','candidates','versions'].includes(context)?items.sort((a,b)=>a.id.localeCompare(b.id)):items;}
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.keys(value).sort().filter(key=> !(
    key==='deleted'&&!value.deleted || ['url','loadError'].includes(key)&&(value.resultId || value.history) || ['status','browserSaved'].includes(key)&&value.clientFileId ||
    key==='selectedTaskId'&&value.tasks || key==='path'&&value.branches ||
    ['targetId','lastTargetId','groupId','candidateId','versionId','navRevision','unreadVersionId'].includes(key)&&value.groups&&value.draft ||
    key==='viewedVersionId'&&value.versions
  )).map(key=>[key,canonical(value[key], context==='refinements'?'draft':key)]));
}
const comparable = value => JSON.stringify(canonical(value));
export const equal = (a,b) => comparable(a) === comparable(b);
export async function workspaceFingerprint(state) {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(comparable(state)));
  return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
}
export const versionsOf = state => state.tasks.flatMap(t=>Object.values(t.branches).flatMap(b=>b.groups.flatMap(g=>g.candidates.flatMap(c=>c.versions))));
export function readLegacy(storage = globalThis.localStorage) {
  const raw = storage.getItem(LEGACY_WORKSPACE_KEY);
  if (!raw) return newWorkspace();
  const state = JSON.parse(raw)?.state;
  if (state?.schema !== 1 || !state.tasks?.length || !state.tasks.some(t=>t.id===state.selectedTaskId) || !state.tasks.every(t=>t.runs && ['png','svg'].every(p=>t.branches?.[p]?.draft?.settings && Array.isArray(t.branches[p].groups)))) throw Error('原浏览器草稿无法读取，已保留原存储；请先导出备份后处理。');
  return state;
}
// Three-way merge at editable fields and stable entity IDs. Derived execution
// observations never become user conflicts. Local navigation is projected last.
const clone = value => value === undefined ? undefined : structuredClone(value);
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
function conflictId(task) {
  // Stable across retries/tabs; two independent 64-bit hashes over canonical data.
  const source=comparable(task);let a=14695981039346656037n,b=7809847782465536322n;
  for(let i=0;i<source.length;i++){const c=BigInt(source.charCodeAt(i));a=BigInt.asUintN(64,(a^c)*1099511628211n);b=BigInt.asUintN(64,(b^c)*14029467366897019727n);}
  return `conflict-${a.toString(16)}-${b.toString(16)}`;
}
function mergeText(base,local,remote) {
  const change=value=>{let start=0,end=base.length,tail=value.length;while(start<end&&start<tail&&base[start]===value[start])start++;while(end>start&&tail>start&&base[end-1]===value[tail-1]){end--;tail--;}return {start,end,text:value.slice(start,tail)};};
  const a=change(local),b=change(remote);
  if(a.start===b.start||a.start<b.end&&b.start<a.end)return null;
  return [a,b].sort((x,y)=>y.start-x.start).reduce((text,c)=>text.slice(0,c.start)+c.text+text.slice(c.end),base);
}
function mergeValue(base, local, remote, fields, path='') {
  if(same(local,remote))return clone(local);
  if(same(local,base))return clone(remote);
  if(same(remote,base))return clone(local);
  const key=path.split('.').at(-1);
  if(['text','caption','avoid'].includes(key)&&[base,local,remote].every(v=>typeof v==='string')){const merged=mergeText(base,local,remote);if(merged!==null)return merged;}
  if(['updatedAt','revision'].includes(key)&&Number.isFinite(local)&&Number.isFinite(remote))return Math.max(local,remote)+(key==='revision'?1:0);
  if(key==='createdAt'&&Number.isFinite(local)&&Number.isFinite(remote))return Math.min(local,remote);
  if(Array.isArray(local)&&Array.isArray(remote)&&[...(base||[]),...local,...remote].every(v=>v&&typeof v.id==='string')) {
    const before=new Map((base||[]).map(v=>[v.id,v])),ours=new Map(local.map(v=>[v.id,v])),theirs=new Map(remote.map(v=>[v.id,v]));
    return [...new Set([...ours.keys(),...theirs.keys()])].map(id=>mergeValue(before.get(id),ours.get(id),theirs.get(id),fields,`${path}.${id}`)).filter(v=>v!==undefined);
  }
  if(local&&remote&&typeof local==='object'&&typeof remote==='object'&&!Array.isArray(local)&&!Array.isArray(remote)) {
    // A terminal server observation wins over a delayed running poll.
    const isRun=local.input&&local.groupId&&local.status&&remote.status;
    const rank=r=>['succeeded','failed'].includes(r.status)?2:r.accepted?1:0;
    const observation=isRun?(rank(local)>rank(remote)?local:remote):null;
    const out={};
    for(const k of new Set([...Object.keys(base||{}),...Object.keys(local),...Object.keys(remote)])) {
      if(observation&&['status','stage','accepted','error'].includes(k)){if(observation[k]!==undefined)out[k]=clone(observation[k]);continue;}
      if(k==='activeRunId')continue;
      if(k==='title'&&(local.automaticTitle||remote.automaticTitle)){out[k]=!local.automaticTitle?local[k]:remote[k];continue;}
      const v=mergeValue(base?.[k],local[k],remote[k],fields,path?`${path}.${k}`:k);if(v!==undefined)out[k]=v;
    }
    if(local.runs&&remote.runs) {
      const running=out.runs.filter(r=>['running','submitting'].includes(r.status));
      out.activeRunId=running.find(r=>(r.accepted||r.execution?.jobId)&&[remote.activeRunId,local.activeRunId].includes(r.id))?.id||running.find(r=>r.id===remote.activeRunId)?.id||running.find(r=>r.id===local.activeRunId)?.id||null;
      if(out.automaticTitle&&!out.runs.length)out.title=out.branches[local.path||remote.path||'png'].draft.text.trim().split('\n')[0].slice(0,32)||'新任务';
    }
    return out;
  }
  // Deleting an entity while someone edits it is a real conflict too.
  fields.add(path);return clone(remote);
}
// ACCEPT clears only the submitted input. A concurrently typed next draft is
// independent user work, so that derived clear must not conflict with it.
function preserveConcurrentDraft(task, other, before) {
  for(const run of task.runs) {
    if(!run.accepted)continue;
    const get=t=>{const branch=t?.branches?.[run.path];return run.parentId?branch?.refinements?.[run.parentId]:branch?.draft;};
    const draft=get(task),prior=get(before),concurrent=get(other);
    if(!draft||!prior||!concurrent||draft.revision!==run.draftRevision+1||prior.revision!==run.draftRevision)continue;
    for(const key of run.parentId?['text']:['text','caption','avoid','attachments']) {
      const empty=key==='attachments'?[]:'';
      if(same(draft[key],empty)&&!same(concurrent[key],empty)&&same(prior[key],run.input[key])&&!same(concurrent[key],prior[key]))draft[key]=clone(prior[key]);
    }
  }
}
export function mergeWorkspaces(base, local, remote, makeId = conflictId) {
  const purgedTasks=deletionMarkers(base,local,remote);
  base=applyTaskDeletions(base,purgedTasks);local=applyTaskDeletions(local,purgedTasks);remote=applyTaskDeletions(remote,purgedTasks);
  if(!remote)return {state:local,conflicts:0};
  if(!base&&!local.tasks.some(taskHasContent))return {state:remote,conflicts:0};
  const baseline=new Map((base?.tasks||[]).map(t=>[t.id,t])),ours=new Map(local.tasks.map(t=>[t.id,t])),theirs=new Map(remote.tasks.map(t=>[t.id,t]));
  const tasks=[],copies=[];let conflicts=0;
  for(const id of new Set([...ours.keys(),...theirs.keys()])) {
    const before=baseline.get(id),task=ours.get(id),other=theirs.get(id),fields=new Set();
    if(!task&&!before){tasks.push(clone(other));continue;}
    if(!other&&!before){tasks.push(clone(task));continue;}
    // Compare content without view cursors, URLs or local material availability.
    let merged;
    if(equal(task,other)||equal(other,before))merged=clone(task);
    else if(equal(task,before))merged=task&&other?preserveView(other,task):clone(other);
    else if(!task||!other){fields.add('deleted');merged=clone(other);}
    else {
      const left=canonical(task),right=canonical(other),prior=canonical(before);
      preserveConcurrentDraft(left,canonical(other),prior);preserveConcurrentDraft(right,canonical(task),prior);
      merged=mergeValue(prior,left,right,fields);
      // Preserve hydrated assets and browser material flags after canonical merge.
      merged=restoreLocalAssets(merged,[other,task]);
      if(task.deleted!==other.deleted&&(task.deleted||other.deleted)){fields.add('deleted');merged.deleted=!!other.deleted;}
      merged=preserveView(merged,task);
    }
    if(merged)tasks.push(merged);
    if(fields.size&&task) {
      const copy={...clone(task),id:makeId(task),title:`${task.title.slice(0,105)} · 冲突副本`,automaticTitle:false,deleted:false,
        syncConflict:{taskId:id,fields:[...fields].slice(0,40)},activeRunId:null};
      // Copies are evidence/drafts, never a second execution owner.
      copies.push(copy);conflicts++;
    }
  }
  for(const copy of copies)if(!tasks.some(t=>t.id===copy.id))tasks.push(copy);
  // Old clients can still remove records. Keep a selected deleted task as a
  // tombstone instead of navigating away; new clients use explicit tombstones.
  if(!tasks.some(t=>t.id===local.selectedTaskId)&&ours.has(local.selectedTaskId))tasks.push({...clone(ours.get(local.selectedTaskId)),deleted:true,activeRunId:null});
  return {state:applyTaskDeletions({schema:1,selectedTaskId:local.selectedTaskId,tasks},purgedTasks),conflicts};
}
function restoreLocalAssets(task,sources) {
  const assets=new Map();for(const source of sources)for(const v of versionsOf({tasks:[source]}))if(v.url&&!assets.has(v.id))assets.set(v.id,v);
  for(const d of [...Object.values(task.branches).flatMap(b=>[b.draft,...Object.values(b.refinements)]),...task.runs.map(r=>r.input)])for(const a of d.attachments){a.status='local';a.browserSaved=true;}
  for(const v of versionsOf({tasks:[task]})){const source=assets.get(v.id);if(source){v.url=source.url;if(source.loadError)v.loadError=source.loadError;}}
  return task;
}
function preserveView(remote, local) {
  const task=structuredClone(remote);task.path=local.path;
  for(const path of ['png','svg']) {
    const b=task.branches[path], old=local.branches[path], ids=new Set(b.groups.flatMap(g=>g.candidates.flatMap(c=>c.versions.map(v=>v.id))));
    for(const key of ['targetId','lastTargetId','versionId','unreadVersionId'])b[key]=old[key]&&ids.has(old[key])?old[key]:null;
    if(b.targetId&&!b.refinements[b.targetId])b.targetId=null;
    b.groupId=b.groups.some(g=>g.id===old.groupId)?old.groupId:null;b.candidateId=b.groupId?old.candidateId:null;
    if(!b.versionId&&ids.size)b.unreadVersionId=[...ids].at(-1);
    if(!old.versionId&&!old.groups.some(g=>g.candidates.some(c=>c.versions.length))&&!old.targetId){const g=b.groups.find(g=>g.candidates.some(c=>c.versions.length)),c=g?.candidates.find(c=>c.versions.length);if(c){b.groupId=g.id;b.candidateId=c.id;b.versionId=c.versions[0].id;b.unreadVersionId=null;}}
    b.navRevision=old.navRevision;
    for(const g of b.groups)for(const c of g.candidates){const previous=old.groups.find(x=>x.id===g.id)?.candidates.find(x=>x.id===c.id);c.viewedVersionId=c.versions.some(v=>v.id===previous?.viewedVersionId)?previous.viewedVersionId:null;}
  }
  return task;
}
export function importBrowserDrafts(account, guest) {
  const tasks = guest.tasks.filter(taskHasContent).map(t=>({ ...structuredClone(t), id: uid(), automaticTitle: false }));
  return tasks.length ? { ...account, selectedTaskId: tasks[0].id, tasks: [...tasks, ...account.tasks] } : account;
}
export function createWorkspaceClient({ baseUrl = '', userId, fetcher = fetch }) {
  const base = baseUrl.replace(/\/$/,'') + '/api/workspace';
  const request = async (path, method = 'GET', body, signal) => {
    const response = await fetcher(base+path, { method, credentials:'include', cache:'no-store', headers: { 'X-Workspace-Account': userId, ...(body ? {'Content-Type':'application/json'} : {}) }, ...(body ? {body:JSON.stringify(body)} : {}), signal: signal || AbortSignal.timeout(20000) });
    const data = await response.json().catch(()=>null);
    const message=data?.error==='ACCOUNT_CHANGED'?'登录账号已变化，请刷新账号状态；当前草稿仍保留在本机。':data?.error;
    if (!response.ok) throw Object.assign(Error(message || '同步暂时不可用，草稿仍保留在本机。'), {status:response.status});
    return data;
  };
  // No original-file reader is available to this transport. Only generated result
  // data URLs are accepted; signed external URLs and connection secrets are omitted.
  const resultCache = new Map();
  async function wire(state) {
    const out = structuredClone(state);
    for (const v of versionsOf(out)) {
      if (v.resultId || v.history) continue;
      if (!v.url?.startsWith(`data:image/${v.format==='png'?'png':'svg+xml'}`)) throw Error('此结果还不能同步，请先保留本机副本。');
      if (!resultCache.has(v.url)) {
        const split = v.url.indexOf(','), header = v.url.slice(0,split), content = v.url.slice(split+1);
        const base64 = header.endsWith(';base64') ? content : bytesToBase64(new TextEncoder().encode(decodeURIComponent(content)));
        resultCache.set(v.url, (await request('/results','POST',{format:v.format,base64,taskId:out.tasks.find(t=>versionsOf({tasks:[t]}).some(item=>item===v))?.id})).resultId);
      }
      v.resultId = resultCache.get(v.url);
    }
    return cleanWorkspace(out);
  }
  const historyCache=new Map();let hydratedDeletions='';
  async function history(offset=0) {
    const data=await readAccountHistory({baseUrl,userId,fetcher,offset});
    for(const job of data.jobs)historyCache.set(job.id,{expires:Date.now()+240000,job});
    return data;
  }
  async function hydrate(wireState, existing) {
    if (!wireState) return null;
    const deleted=JSON.stringify(wireState.purgedTasks||[]);if(deleted!==hydratedDeletions){resultCache.clear();historyCache.clear();hydratedDeletions=deleted;}
    const out = cleanWorkspace(wireState), known = new Map(versionsOf(existing || {tasks:[]}).filter(v=>v.resultId && v.url).map(v=>[v.resultId,v.url]));
    if(versionsOf(out).some(v=>v.history && (!historyCache.has(v.history.jobId) || historyCache.get(v.history.jobId).expires<Date.now()))){
      try {let offset=0;do {const data=await history(offset);if(data.nextOffset==null || data.nextOffset<=offset)break;offset=data.nextOffset;}while(true);}
      catch(error){if(error.status===401 || error.status===409)throw error;}
    }
    for (const v of versionsOf(out)) {
      if(v.history){
        const h=v.history,k=h.jobId;
        try {
          if(!historyCache.has(k))throw Error('历史结果暂不可用');
          const job=historyCache.get(k).job,asset=job.results.find(r=>r.index===h.index&&r.format===v.format);
          if(asset?.storageError){v.url='';v.loadError=asset.storageError;continue;}
          if(job.source!==h.source || !asset?.url)throw Error('历史结果文件暂不可用，记录已保留。');
          v.url=asset.url;
        }catch(error){if(error.status===401 || error.status===409)throw error;v.url='';v.loadError='历史结果暂不可用，可重新同步重试；原记录仍保留。';}
        continue;
      }
      if (!known.has(v.resultId)) {
        let result;try{result = await request('/results/'+v.resultId);}
        catch(error){if(error.status!==410)throw error;v.url='';v.loadError=error.message;continue;}
        if (result.format !== v.format) throw Error('保存结果的格式与版本记录不一致，请重试同步。');
        known.set(v.resultId, `data:image/${v.format==='png'?'png':'svg+xml'};base64,${result.base64}`);
      }
      v.url = known.get(v.resultId);
    }
    for (const t of out.tasks) for (const d of [...Object.values(t.branches).flatMap(b=>[b.draft,...Object.values(b.refinements)]), ...t.runs.map(r=>r.input)]) for (const a of d.attachments) { a.status='local'; a.browserSaved=true; }
    return out;
  }
  return { history, deleteTask:async(taskId,revision)=>{const saved=await request('/tasks/'+encodeURIComponent(taskId),'DELETE',{revision});resultCache.clear();historyCache.clear();return saved;}, get:revision=>request(Number.isSafeInteger(revision)?`?revision=${revision}`:''), put:(revision,state)=>request('','PUT',{revision,state}), wire, hydrate };
}

export class WorkspaceSyncController {
  constructor({cache,key,client,legacy=readLegacy,notify=()=>{},broadcast=()=>{},recoveryId,restoreId,purgeLocal}) {
    Object.assign(this,{cache,key,client,legacy,notify,broadcast,recoveryId,restoreId,purgeLocal});
    this.purgedLocally='';this.state=null;this.base=null;this.cacheBase=null;this.revision=0;this.cacheRevision=0;this.queue=Promise.resolve();this.disposed=false;this.blocked=false;this.running=false;this.generation=0;this.importedGuest=false;this.notice='';
  }
  emit(status,error='') {
    this.status=status;this.error=error;
    const count=this.state?.tasks.filter(t=>t.syncConflict&&!t.deleted).length||0;
    this.notice=count?`有 ${count} 份并发修改的冲突副本已保留，请查看处理；其他任务继续自动同步。`:'';
    if(!this.disposed)this.notify(this);
  }
  async init() {
    try {
      const saved=await this.cache.read(this.key);
      const recovery=this.restoreId&&await this.cache.read(`${this.key}:tab:${this.restoreId}`);
      if(this.disposed)return;
      if(recovery){Object.assign(this,{state:recovery.state,base:recovery.base,revision:recovery.revision,importedGuest:recovery.importedGuest||false});this.cacheBase=recovery.cacheBase;this.cacheRevision=recovery.cacheRevision||0;}
      else if(saved){Object.assign(this,{state:saved.state,base:saved.base,revision:saved.revision,cacheRevision:saved.cacheRevision,importedGuest:saved.importedGuest||false});this.cacheBase=clone(saved.state);}
      else this.state=this.client?newWorkspace():this.legacy();
      this.emit('local');await this.persist();if(this.client&&!this.blocked)this.schedule(0);
    }catch(error){this.blocked=true;this.emit('error',error.message);}
  }
  setState(update) {
    if(!this.state||this.disposed)return;
    const updateState=typeof update==='function'?update(this.state):update;
    const next=applyTaskDeletions(updateState,deletionMarkers(this.state,updateState));
    if(next===this.state||same(next,this.state))return;
    const contentChanged=!equal(next,this.state);this.state=next;
    if(contentChanged)this.generation++;
    this.emit(this.blocked?'error':contentChanged?'saving':this.status,this.error);
    void this.persist();if(contentChanged)this.schedule();
  }
  async backup() {
    if(this.recoveryId&&this.cache.backup)await this.cache.backup(`${this.key}:tab:${this.recoveryId}`,clone({state:this.state,base:this.base,revision:this.revision,cacheBase:this.cacheBase,cacheRevision:this.cacheRevision,importedGuest:this.importedGuest}));
  }
  persist() {
    const write=async()=>{
      if(!this.state||this.disposed)return;
      try {
        // Independent per-document recovery is durable before any merge/CAS retry.
        await this.backup();
        for(let attempt=0;attempt<12;attempt++) {
          const latest=await this.cache.read(this.key);if(this.disposed)return;
          if(latest&&latest.cacheRevision!==this.cacheRevision) {
            this.state=mergeWorkspaces(this.cacheBase,this.state,latest.state).state;
            if(latest.revision>=this.revision){this.base=latest.base;this.revision=latest.revision;}
            this.cacheRevision=latest.cacheRevision;this.cacheBase=clone(latest.state);this.importedGuest=latest.importedGuest||this.importedGuest;
            this.emit(this.status,this.error);await this.backup();
          }
          const deletionKey=JSON.stringify(this.state.purgedTasks||[]);
          if(this.purgeLocal&&deletionKey!==this.purgedLocally){await this.purgeLocal(this.state);this.purgedLocally=deletionKey;}
          this.base=applyTaskDeletions(this.base,this.state.purgedTasks);this.cacheBase=applyTaskDeletions(this.cacheBase,this.state.purgedTasks);
          const snapshot=clone({state:this.state,base:this.base,revision:this.revision,importedGuest:this.importedGuest});
          const previous=this.cacheRevision;
          try {
            this.cacheRevision=await this.cache.write(this.key,previous,snapshot);this.cacheBase=clone(snapshot.state);this.blocked=false;
            await this.backup();
            if(this.cacheRevision!==previous)this.broadcast({key:this.key,cacheRevision:this.cacheRevision});
            if(!this.running&&this.status!=='error')this.emit(this.client?(this.base&&equal(this.state,this.base)?'synced':'pending'):'local');
            return;
          }catch(error){if(error.code!=='LOCAL_CONFLICT')throw error;}
        }
        // Contention is retryable, never a workspace-wide permanent lock.
        this.emit('pending');this.schedule(200);setTimeout(()=>{if(!this.disposed)void this.persist();},200);
      }catch(error){this.blocked=true;this.emit('error',error.message);}
    };
    this.queue=this.queue.then(write);return this.queue;
  }
  async receive(message) {
    if(this.disposed||message?.key!==this.key||message.cacheRevision<=this.cacheRevision)return;
    await this.persist();this.schedule(100);
  }
  schedule(delay=700) {
    if(!this.client||this.disposed)return;
    clearTimeout(this.timer);this.timer=setTimeout(()=>void this.sync({background:true}),delay);
  }
  async sync({background=false}={}) {
    if(!this.client||!this.state||this.disposed)return;
    if(this.running){this.resync=true;return this.inFlight;}
    this.running=true;
    this.inFlight=this.performSync(background).finally(()=>{this.running=false;this.inFlight=null;if(this.resync){this.resync=false;this.schedule(100);}});
    return this.inFlight;
  }
  async performSync(background) {
    let quiet=background&&this.status==='synced'&&this.base&&equal(this.state,this.base);
    if(!quiet)this.emit('syncing');
    try {
      if(!quiet||this.blocked)await this.persist();if(this.blocked||this.disposed)return;
      for(let attempt=0;attempt<6;attempt++) {
        const remote=await this.client.get(quiet?this.revision:undefined);if(this.disposed)return;

        if(!remote.deletionPending&&(remote.unchanged&&equal(this.state,this.base)||quiet&&remote.revision===this.revision&&equal(this.state,this.base)))return;
        // A revision-only reply may race with typing. We already have its base.
        const hydrated=remote.unchanged?this.base:await this.client.hydrate(remote.state,this.state);if(this.disposed)return;
        if(remote.revision<this.revision){quiet=false;continue;}
        this.state=mergeWorkspaces(this.base,this.state,hydrated).state;this.base=hydrated;this.revision=remote.revision;
        this.emit('syncing');await this.persist();if(this.blocked||this.disposed)return;
        if(remote.deletionPending)throw Error('任务已移除，服务器文件清理仍在重试，请稍后同步确认。');
        if(this.base&&equal(this.state,this.base)){this.emit('synced');return;}
        const snapshot=clone(this.state),expected=this.revision;
        const wire=await this.client.wire(snapshot);if(this.disposed)return;
        const wireVersions=versionsOf(wire),snapshotVersions=versionsOf(snapshot);
        const ids=new Map(snapshotVersions.map((v,i)=>[v.id,wireVersions[i].resultId]).filter(([,id])=>id));
        for(const v of [...versionsOf(this.state),...snapshotVersions])if(ids.has(v.id))v.resultId=ids.get(v.id);
        let saved;
        try{saved=await this.client.put(expected,wire);}catch(error){if(error.status===409&&error.message==='WORKSPACE_CONFLICT'){quiet=false;continue;}throw error;}
        if(this.disposed)return;
        const acknowledged=await this.client.hydrate(wire,snapshot);if(this.disposed)return;
        // A broadcast can advance the shared base while an older PUT is in flight.
        if(saved.revision>=this.revision){this.revision=saved.revision;this.base=acknowledged;}
        await this.persist();if(this.blocked)return;
        const clean=equal(this.state,this.base);this.emit(clean?'synced':'pending');if(!clean)this.schedule(200);return;
      }
      this.emit('pending');this.schedule(300);
    }catch(error){if(this.disposed)return;this.emit('error',error.status===401?'登录已过期，本机草稿已保留；请重新登录后同步。':error.message);if(!error.status||error.status>=500)this.schedule(5000);}
  }
  async deleteTask(taskId) {
    if(this.deleting)throw Error('正在删除任务，请稍候。');
    this.deleting=true;
    try {
      await this.flush();
      if(this.client){
        await this.sync();
        if(this.status!=='synced')throw Error(this.error||'请先完成账号同步再删除。');
        try {
          const saved=await this.client.deleteTask(taskId,this.revision);
          const state=await this.client.hydrate(saved.state,this.state);
          this.state=mergeWorkspaces(this.base,this.state,state).state;this.base=state;this.revision=saved.revision;
        } catch(error) {await this.sync();throw error;}
      } else this.state=permanentlyRemoveTask(this.state,taskId);
      this.base=applyTaskDeletions(this.base,this.state.purgedTasks);
      this.cacheBase=applyTaskDeletions(this.cacheBase,this.state.purgedTasks);
      await this.persist();if(this.blocked)throw Error(this.error);
      this.emit(this.client?'synced':'local');
    } finally {this.deleting=false;}
  }
  async flush(){await this.persist();if(this.blocked)throw Error('草稿尚未安全保存，请先导出备份再退出。');}
  dispose(){this.disposed=true;clearTimeout(this.timer);}
}
function bytesToBase64(bytes) {
  let value=''; for (let i=0;i<bytes.length;i+=8192) value+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(value);
}

function scrubSnapshot(snapshot,markers=[]) {
  return {...snapshot,...Object.fromEntries(['state','base','cacheBase'].filter(k=>snapshot[k]).map(k=>[k,applyTaskDeletions(snapshot[k],markers)]))};
}

// Atomic CAS works even in browsers without navigator.locks. An older tab must
// not overwrite a newer tab's local queue, including while the network is down.
export function createWorkspaceCache(indexed = globalThis.indexedDB) {
  let database;
  async function db() {
    if (!indexed) throw Error('浏览器存储不可用，请保持页面打开并导出草稿。');
    database ||= new Promise((resolve,reject)=>{ const r=indexed.open('tuyan-account-workspaces-v1',1); r.onupgradeneeded=()=>r.result.createObjectStore('snapshots',{keyPath:'key'}); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); r.onblocked=()=>reject(Error('浏览器任务库被占用，请关闭旧页面后重试。')); });
    return database;
  }
  return {
    async materialIds(key,markers){
      const d=await db();return new Promise((resolve,reject)=>{
        const ids=new Set(),r=d.transaction('snapshots').objectStore('snapshots').openCursor();
        r.onsuccess=()=>{const c=r.result;if(!c){resolve(ids);return;}const row=c.value;
          for(const field of ['state','base','cacheBase']){const state=row.key===key||row.key.startsWith(key+':tab:')?applyTaskDeletions(row[field],markers):row[field];for(const t of state?.tasks||[])for(const id of taskMaterialIds(t))ids.add(id);}c.continue();};r.onerror=()=>reject(r.error);
      });
    },
    async read(key) { const d=await db(); return new Promise((resolve,reject)=>{const r=d.transaction('snapshots').objectStore('snapshots').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}); },
    async backup(key,value) { const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('snapshots','readwrite');const store=tx.objectStore('snapshots'), root=key.split(':tab:')[0], r=store.get(root);r.onsuccess=()=>store.put({...scrubSnapshot(value,r.result?.state?.purgedTasks),key});tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(Error('本机恢复草稿保存失败，请保持页面打开。'));}); },
    async write(key, expected, value) {
      const d=await db(); return new Promise((resolve,reject)=>{
        const tx=d.transaction('snapshots','readwrite'), s=tx.objectStore('snapshots'); let revision, conflict=false;
        const r=s.get(key); r.onsuccess=()=>{
          const previous=r.result;
          value=scrubSnapshot(value,deletionMarkers(previous?.state,value.state));
          const sameContent=previous && equal(previous.state,value.state) && equal(previous.base,value.base) && previous.revision===value.revision && previous.importedGuest===value.importedGuest;
          // A stale tab may renew signed URLs or browse a different version without
          // conflicting. The current writer still persists its own view for reload.
          if(sameContent){revision=previous.cacheRevision;return;}
          if ((previous?.cacheRevision||0)!==expected) { conflict=true; tx.abort(); return; }
          revision=expected+1; s.put({...value,key,cacheRevision:revision});
          if(value.state.purgedTasks?.length){const cursor=s.openCursor();cursor.onsuccess=()=>{const c=cursor.result;if(!c)return;if(c.key!==key&&String(c.key).startsWith(key+':tab:'))c.update(scrubSnapshot(c.value,value.state.purgedTasks));c.continue();};}
        };
        tx.oncomplete=()=>resolve(revision);tx.onerror=tx.onabort=()=>reject(conflict ? Object.assign(Error('另一标签页已有更新，正在合并本机草稿。'),{code:'LOCAL_CONFLICT'}) : Error('本机保存失败，请保持页面打开并导出草稿。'));
      });
    },
  };
}
