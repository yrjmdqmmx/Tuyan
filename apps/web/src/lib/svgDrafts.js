const DB_NAME='tuyan-svg-drafts-v1';
const PURGED='tuyan.svg-purged.v1:';
function purgedKey(key){const [api,owner,task]=JSON.parse(key);return PURGED+JSON.stringify([api,owner,task]);}
function isPurged(key){return window.localStorage.getItem(purgedKey(key))==='1';}
const JOURNAL='tuyan.svg-recovery.v1:';
export const svgDraftKey = (api,owner,job,candidate) => JSON.stringify([api,owner||'anonymous',job,candidate]);
function openDatabase() {
  return new Promise((resolve,reject)=>{
    const request=window.indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('drafts',{keyPath:'key'});
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('草稿库被另一页面占用，请关闭旧页面后重试。'));
  });
}
export function journalDraft(draft) {
  try { if(isPurged(draft.key))return false;window.localStorage.setItem(JOURNAL+draft.key,JSON.stringify(draft));return true; } catch { return false; }
}
export function readJournal(key) {
  try { if(isPurged(key))return null;const value=JSON.parse(window.localStorage.getItem(JOURNAL+key));return value?.key===key?value:null; } catch { return null; }
}
export async function readSvgDraft(key) {
  if(isPurged(key))return null;
  const recovery=readJournal(key);
  try {
    const db=await openDatabase();
    const stored=await new Promise((resolve,reject)=>{const tx=db.transaction('drafts');const request=tx.objectStore('drafts').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);tx.oncomplete=()=>db.close();});
    if(recovery && (!stored || recovery.revision>stored.revision))return {...recovery,recovered:true};
    return stored||null;
  } catch(error) { if(recovery)return {...recovery,recovered:true};throw error; }
}
export async function listSvgDrafts(api,owner) {
  let found=[],databaseError;
  try { const db=await openDatabase();
  found=await new Promise((resolve,reject)=>{
    const result=[],tx=db.transaction('drafts'),request=tx.objectStore('drafts').openCursor();
    request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;const item=cursor.value;let scope=[];try{scope=JSON.parse(item.key);}catch{}
      if(!isPurged(item.key)&&scope[0]===api&&scope[1]===(owner||'anonymous'))result.push({key:item.key,taskId:item.taskId,candidateId:item.candidateId,updatedAt:item.updatedAt,jobSnapshot:item.jobSnapshot});cursor.continue();};
    tx.oncomplete=()=>{db.close();resolve(result);};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error);};
  }); } catch(error) {databaseError=error;}
  // Recover journals even when a database write never completed.
  try { for(let i=0;i<window.localStorage.length;i++){
    const storageKey=window.localStorage.key(i);if(!storageKey?.startsWith(JOURNAL))continue;
    const key=storageKey.slice(JOURNAL.length);let scope=[];try{scope=JSON.parse(key);}catch{}
    if(scope[0]!==api||scope[1]!==(owner||'anonymous'))continue;
    const item=readJournal(key);if(item?.taskId&&!found.some(x=>x.key===key))found.push({key,taskId:item.taskId,candidateId:item.candidateId,updatedAt:item.updatedAt,jobSnapshot:item.jobSnapshot});
  }} catch(error) {if(!found.length)throw error;}
  if(!found.length&&databaseError)throw databaseError;
  return found.sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,50);
}
export async function saveSvgDraft(draft) {
  if(isPurged(draft.key))throw Error('任务已彻底删除，无法保存旧手工稿。');
  const db=await openDatabase();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts');
    const request=store.get(draft.key);
    let conflict=false;
    request.onsuccess=()=>{
      if(isPurged(draft.key)){tx.abort();return;}
      const previous=request.result;
      if(previous && previous.writer!==draft.writer && previous.revision>draft.baseRevision){conflict=true;tx.abort();return;}
      if(!previous || previous.revision<=draft.revision)store.put(draft);
    };
    tx.oncomplete=()=>{db.close();resolve();};
    tx.onabort=tx.onerror=()=>{db.close();reject(new Error(conflict?'另一个页面保存了此候选图，未覆盖其版本。请导出当前稿后重新打开。':tx.error?.message||'浏览器草稿保存失败。'));};
  });
  const journal=readJournal(draft.key);
  if(journal?.writer===draft.writer && journal.revision<=draft.revision)try{window.localStorage.removeItem(JOURNAL+draft.key);}catch{/* recovery copy is safe */}
}
// Only retire the exact draft just committed to the account. A concurrent tab's
// newer work must survive, including its recovery journal.
export async function retireSvgDraft(key, saved) {
  const matches = draft => draft?.writer === saved.writer && draft.revision === saved.revision && draft.svg === saved.svg;
  const db = await openDatabase();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),request=store.get(key);
    request.onsuccess=()=>{if(matches(request.result))store.delete(key);};
    tx.oncomplete=()=>{db.close();resolve();};
    tx.onabort=tx.onerror=()=>{db.close();reject(tx.error);};
  });
  if(matches(readJournal(key)))try{window.localStorage.removeItem(JOURNAL+key);}catch{/* keep recoverable work */}
}
export function downloadSvg(svg,filename) {
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=filename;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}

export async function purgeTaskSvgDrafts(api,owner,taskIds) {
  const ids=new Set(taskIds);
  const matches=key=>{try{const scope=JSON.parse(key);return scope[0]===api&&scope[1]===(owner||'anonymous')&&ids.has(scope[2]);}catch{return false;}};
  for(const id of ids)window.localStorage.setItem(PURGED+JSON.stringify([api,owner||'anonymous',id]),'1');
  for(const key of Object.keys(window.localStorage))if(key.startsWith(JOURNAL)&&matches(key.slice(JOURNAL.length)))window.localStorage.removeItem(key);
  const db=await openDatabase();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts','readwrite'),request=tx.objectStore('drafts').openCursor();
    request.onsuccess=()=>{const c=request.result;if(!c)return;if(matches(c.value.key))c.delete();c.continue();};
    tx.oncomplete=()=>{db.close();resolve();};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error);};
  });
}
