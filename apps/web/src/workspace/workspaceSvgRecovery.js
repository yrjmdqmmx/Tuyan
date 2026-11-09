import {newTask,newDraft} from './workspaceState.js';
import {parseSvg} from '../lib/svgDocument.js';

// Restore the saved illustration, never reconstruct or replay its old execution.
// The stable content ID deduplicates reimports without modifying the source store.
export async function svgRecoveryTask(draft, base, userId) {
  let scope;try{scope=JSON.parse(draft?.key);}catch{}
  if(!scope || scope[0]!==base || scope[1]!== (userId||'anonymous') || scope[2]!==draft.taskId)throw Error('此手工稿不属于当前账号与服务。');
  const svg=parseSvg(draft.svg).svg;
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([draft.key,svg])))),v=>v.toString(16).padStart(2,'0')).join('');
  const task=newTask('svg-recovery-'+hash,'svg'), runId='run-'+hash, groupId='group-'+hash, candidateId='candidate-'+hash, versionId='version-'+hash;
  task.title=`SVG 手工稿 · ${String(draft.taskId).slice(0,70)}`;task.automaticTitle=false;
  const input=newDraft();input.text='从当前浏览器恢复的 SVG 手工稿。原始任务的完整输入与配置未从手工稿推断。';
  const at=Number.isFinite(draft.updatedAt)&&draft.updatedAt>0?draft.updatedAt:Date.now();task.updatedAt=at;
  task.runs=[{id:runId,path:'svg',kind:'edit',status:'succeeded',accepted:true,groupId,candidateId,parentId:null,input,draftRevision:0,navRevision:0,stage:'浏览器手工稿已恢复 · 未生成或重新评审',createdAt:at}];
  const version={id:versionId,format:'svg',url:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),number:1,parentId:null,runId,origin:'恢复手工稿',review:'手工稿未重新评审',createdAt:at};
  Object.assign(task.branches.svg,{groupId,candidateId,versionId,groups:[{id:groupId,number:1,runId,expected:1,candidates:[{id:candidateId,label:'A',viewedVersionId:versionId,versions:[version]}]}]});
  return task;
}
export function mergeSvgRecovery(state, task) {
  // Existing imported copy may already have newer edits; never replace it.
  return {...state,selectedTaskId:task.id,tasks:state.tasks.some(t=>t.id===task.id)?state.tasks:[task,...state.tasks]};
}
