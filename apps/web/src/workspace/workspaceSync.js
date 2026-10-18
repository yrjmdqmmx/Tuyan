import { readAccountHistory } from './workspaceHistory.js';
import { cleanWorkspace } from '../../../../packages/api/src/workspace-sync.mjs';
import { newWorkspace, uid, taskHasContent } from './workspaceState.js';

export const LEGACY_WORKSPACE_KEY = 'tuyan.workspace-ui-preview.v1';
export const ORIGINAL_SCOPE = 'workspace-ui-preview:local';
function canonical(value, context = '') {
  if(Array.isArray(value))return value.map(item=>canonical(item,context));
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.keys(value).sort().filter(key=> !(
    ['url','loadError'].includes(key)&&(value.resultId || value.history) || ['status','browserSaved'].includes(key)&&value.clientFileId ||
    key==='selectedTaskId'&&value.tasks || key==='path'&&value.branches ||
    ['targetId','lastTargetId','groupId','candidateId','versionId','navRevision','unreadVersionId'].includes(key)&&value.groups&&value.draft ||
    key==='viewedVersionId'&&value.versions || key==='mode'&&context==='draft'
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
// Each device retains its own view selection. Concurrent edits to the same task
// keep both complete branches/settings/version histories as an explicit copy.
export function mergeWorkspaces(base, local, remote, makeId = uid) {
  if (!remote) return { state: local, conflicts: 0 };
  if (!base && !local.tasks.some(taskHasContent)) return { state: remote, conflicts: 0 };
  const baseline = new Map((base?.tasks || []).map(t=>[t.id,t])), theirs = new Map(remote.tasks.map(t=>[t.id,t]));
  const tasks = [], seen = new Set(); let selectedTaskId = local.selectedTaskId, conflicts = 0;
  for (const task of local.tasks) {
    const other = theirs.get(task.id), before = baseline.get(task.id); seen.add(task.id);
    if (!other) { tasks.push(task); continue; }
    if (equal(task,other)) { tasks.push(task); continue; }
    if (equal(task,before)) { tasks.push(preserveView(other,task)); continue; }
    if (equal(other,before)) { tasks.push(task); continue; }
    const duplicate = { ...structuredClone(task), id: makeId(), title: `${task.title.slice(0,105)} · 冲突副本`, automaticTitle: false };
    tasks.push(duplicate, other); if (selectedTaskId === task.id) selectedTaskId = duplicate.id; conflicts++;
  }
  for (const task of remote.tasks) if (!seen.has(task.id)) tasks.push(task);
  return { state: { schema: 1, selectedTaskId: tasks.some(t=>t.id===selectedTaskId) ? selectedTaskId : tasks[0].id, tasks }, conflicts };
}
function preserveView(remote, local) {
  const task=structuredClone(remote);task.path=local.path;
  for(const path of ['png','svg']) {
    const b=task.branches[path], old=local.branches[path], ids=new Set(b.groups.flatMap(g=>g.candidates.flatMap(c=>c.versions.map(v=>v.id))));
    for(const key of ['targetId','lastTargetId','versionId','unreadVersionId'])if(!old[key]||ids.has(old[key]))b[key]=old[key];
    if(b.targetId&&!b.refinements[b.targetId])b.targetId=null;
    if(b.groups.some(g=>g.id===old.groupId)){b.groupId=old.groupId;b.candidateId=old.candidateId;}
    b.navRevision=old.navRevision;b.draft.mode=old.draft.mode;
    for(const [id,draft] of Object.entries(b.refinements))if(old.refinements[id])draft.mode=old.refinements[id].mode;
    for(const g of b.groups)for(const c of g.candidates){const previous=old.groups.find(x=>x.id===g.id)?.candidates.find(x=>x.id===c.id);if(c.versions.some(v=>v.id===previous?.viewedVersionId))c.viewedVersionId=previous.viewedVersionId;}
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
        resultCache.set(v.url, (await request('/results','POST',{format:v.format,base64})).resultId);
      }
      v.resultId = resultCache.get(v.url);
    }
    return cleanWorkspace(out);
  }
  const historyCache=new Map();
  async function history(offset=0) {
    const data=await readAccountHistory({baseUrl,userId,fetcher,offset});
    for(const job of data.jobs)historyCache.set(job.id,{expires:Date.now()+240000,job});
    return data;
  }
  async function hydrate(wireState, existing) {
    if (!wireState) return null;
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
          if(job.source!==h.source || !asset?.url)throw Error('历史结果文件暂不可用，记录已保留。');
          v.url=asset.url;
        }catch(error){if(error.status===401 || error.status===409)throw error;v.url='';v.loadError='历史结果暂不可用，可重新同步重试；原记录仍保留。';}
        continue;
      }
      if (!known.has(v.resultId)) {
        const result = await request('/results/'+v.resultId);
        if (result.format !== v.format) throw Error('保存结果的格式与版本记录不一致，请重试同步。');
        known.set(v.resultId, `data:image/${v.format==='png'?'png':'svg+xml'};base64,${result.base64}`);
      }
      v.url = known.get(v.resultId);
    }
    for (const t of out.tasks) for (const d of [...Object.values(t.branches).flatMap(b=>[b.draft,...Object.values(b.refinements)]), ...t.runs.map(r=>r.input)]) for (const a of d.attachments) { a.status='local'; a.browserSaved=true; }
    return out;
  }
  return { history, get:()=>request(''), put:(revision,state)=>request('','PUT',{revision,state}), wire, hydrate };
}

export class WorkspaceSyncController {
  constructor({cache, key, client, legacy = readLegacy, notify = () => {}}) {
    Object.assign(this,{cache,key,client,legacy,notify});
    this.state=null;this.base=null;this.revision=0;this.cacheRevision=0;this.queue=Promise.resolve();this.disposed=false;this.blocked=false;this.running=false;this.generation=0;this.importedGuest=false;this.notice='';
  }
  emit(status, error='') { this.status=status;this.error=error;if (!this.disposed) this.notify(this); }
  async init() {
    try {
      const saved=await this.cache.read(this.key);
      if (this.disposed) return;
      if (saved) { this.state=saved.state;this.base=saved.base;this.revision=saved.revision;this.cacheRevision=saved.cacheRevision;this.importedGuest=saved.importedGuest || false; }
      else this.state=this.client ? newWorkspace() : this.legacy();
      this.emit('local'); await this.persist();
      if(this.client && !this.blocked) this.schedule(0);
    } catch(error) { this.blocked=true;this.emit('error',error.message); }
  }
  setState(update) {
    if (!this.state || this.disposed) return;
    const next=typeof update==='function'?update(this.state):update;
    if(next===this.state || JSON.stringify(next)===JSON.stringify(this.state))return;
    const contentChanged=!equal(next,this.state);
    this.state=next;
    if(contentChanged)this.generation++;
    // Navigation and renewed signed URLs are local cache changes, not new edits.
    this.emit(this.blocked?'error':contentChanged?'saving':this.status,this.error);
    void this.persist();if(contentChanged)this.schedule();
  }
  persist() {
    const write=async()=>{
      if(this.blocked || !this.state) return;
      const snapshot=structuredClone({state:this.state,base:this.base,revision:this.revision,importedGuest:this.importedGuest});
      try { this.cacheRevision=await this.cache.write(this.key,this.cacheRevision,snapshot);if(!this.running && this.status!=='error')this.emit(this.client?(this.base&&equal(this.state,this.base)?'synced':'pending'):'local'); }
      catch(error){this.blocked=true;this.emit('error',error.message);}
    };
    this.queue=this.queue.then(write);return this.queue;
  }
  schedule(delay=700) {
    if(!this.client||this.disposed||this.blocked)return;
    clearTimeout(this.timer);this.timer=setTimeout(()=>void this.sync(),delay);
  }
  async sync({ background = false } = {}) {
    if(!this.client||!this.state||this.running||this.blocked||this.disposed)return;
    const quiet=background && this.status==='synced' && this.base && equal(this.state,this.base);
    this.running=true;if(!quiet)this.emit('syncing');let startGeneration;
    try {
      if(!quiet)await this.persist();if(this.blocked||this.disposed)return;
      const remote=await this.client.get();if(this.disposed)return;
      // An unchanged background revision needs no hydration, cache write or announcement.
      if(quiet && remote.revision===this.revision && equal(this.state,this.base))return;
      const hydrated=await this.client.hydrate(remote.state,this.state);if(this.disposed)return;
      const merged=mergeWorkspaces(this.base,this.state,hydrated);
      this.state=merged.state;this.base=hydrated;this.revision=remote.revision;
      if(merged.conflicts)this.notice=`发现同时修改，已保留 ${merged.conflicts} 份冲突副本。`;
      if(!quiet)this.emit('syncing');await this.persist();if(this.blocked||this.disposed)return;
      if(hydrated && equal(this.state,hydrated)){this.emit('synced');return;}
      const snapshot=structuredClone(this.state);startGeneration=this.generation;
      const wire=await this.client.wire(snapshot);if(this.disposed)return;
      const wireVersions=versionsOf(wire), snapshotVersions=versionsOf(snapshot);
      const ids=new Map(snapshotVersions.map((v,i)=>[v.url,wireVersions[i].resultId]).filter(([,id])=>id));
      // Enrich only the captured result identities; never replace newer typing.
      for(const v of [...versionsOf(this.state),...snapshotVersions]) if(ids.has(v.url))v.resultId=ids.get(v.url);
      const saved=await this.client.put(this.revision,wire);if(this.disposed)return;
      this.revision=saved.revision;this.base=await this.client.hydrate(wire,snapshot);if(this.disposed)return;
      await this.persist();if(this.blocked)return;
      this.emit(this.generation===startGeneration?'synced':'pending');
    } catch(error) {
      if(this.disposed)return;
      this.emit('error',error.status===401?'登录已过期，本机草稿已保留；请重新登录后同步。':error.message);
      if(error.status===409 && error.message==='WORKSPACE_CONFLICT')this.schedule(200);
    } finally {
      this.running=false;
      if(startGeneration!==undefined && this.generation!==startGeneration)this.schedule();
    }
  }
  async flush() { await this.persist();if(this.blocked)throw Error('草稿尚未安全保存，请先导出备份再退出。'); }
  dispose() { this.disposed=true;clearTimeout(this.timer); }
}
function bytesToBase64(bytes) {
  let value=''; for (let i=0;i<bytes.length;i+=8192) value+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(value);
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
    async read(key) { const d=await db(); return new Promise((resolve,reject)=>{const r=d.transaction('snapshots').objectStore('snapshots').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}); },
    async write(key, expected, value) {
      const d=await db(); return new Promise((resolve,reject)=>{
        const tx=d.transaction('snapshots','readwrite'), s=tx.objectStore('snapshots'); let revision, conflict=false;
        const r=s.get(key); r.onsuccess=()=>{
          const previous=r.result;
          const sameContent=previous && equal(previous.state,value.state) && equal(previous.base,value.base) && previous.revision===value.revision && previous.importedGuest===value.importedGuest;
          // A stale tab may renew signed URLs or browse a different version without
          // conflicting. The current writer still persists its own view for reload.
          if(sameContent && (previous.cacheRevision!==expected || JSON.stringify(previous.state)===JSON.stringify(value.state) && JSON.stringify(previous.base)===JSON.stringify(value.base))){revision=previous.cacheRevision;return;}
          if ((previous?.cacheRevision||0)!==expected) { conflict=true; tx.abort(); return; }
          revision=expected+1; s.put({...value,key,cacheRevision:revision});
        };
        tx.oncomplete=()=>resolve(revision);tx.onerror=tx.onabort=()=>reject(conflict ? Object.assign(Error('另一标签页已有更新。当前草稿保留，请导出后刷新；已停止覆盖保存。'),{code:'LOCAL_CONFLICT'}) : Error('本机保存失败，请保持页面打开并导出草稿。'));
      });
    },
  };
}
