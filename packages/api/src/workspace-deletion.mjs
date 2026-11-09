import { newTask } from './workspace-defaults.mjs';

// Only identifiers survive deletion, to reject offline uploads and history import.
export function deletionMarkers(...states) {
  const merged = new Map();
  for (const state of states) for (const row of state?.purgedTasks || []) {
    merged.set(row.id, {id:row.id, jobIds:[...new Set([...(merged.get(row.id)?.jobIds || []), ...row.jobIds])].sort(), ...((row.materialIds?.length||merged.get(row.id)?.materialIds?.length)?{materialIds:[...new Set([...(merged.get(row.id)?.materialIds||[]),...(row.materialIds||[])])].sort()}:{})});
  }
  return [...merged.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
export function taskMaterialIds(task) {
  return [...new Set([...Object.values(task.branches).flatMap(b=>[b.draft,...Object.values(b.refinements)]),...task.runs.map(r=>r.input)].flatMap(d=>[...d.attachments,...Object.values(d.settings).flatMap(s=>s.refineMask?[s.refineMask]:[])]).map(a=>a.clientFileId||a.id))];
}
export function taskJobIds(task) {
  return [...new Set([
    ...task.runs.flatMap(r=>[r.history?.jobId,r.execution?.jobId]),
    ...Object.values(task.branches).flatMap(b=>b.groups.flatMap(g=>g.candidates.flatMap(c=>c.versions.map(v=>v.history?.jobId)))),
  ].filter(Boolean))];
}
export function applyTaskDeletions(state, markers = state?.purgedTasks || []) {
  if (!state || !markers.length) return state;
  const purgedTasks=deletionMarkers(state,{purgedTasks:markers}), ids=new Set(purgedTasks.map(p=>p.id));
  const tasks=state.tasks.filter(t=>!ids.has(t.id)&&!ids.has(t.syncConflict?.taskId));
  // A stable empty replacement avoids each offline tab creating another draft.
  if (!tasks.length) {
    let n=purgedTasks.length,id=`empty-after-delete-${n}`;while(ids.has(id))id=`empty-after-delete-${++n}`;
    tasks.push(newTask(id));
  }
  return {...state,purgedTasks,tasks,selectedTaskId:tasks.some(t=>t.id===state.selectedTaskId)?state.selectedTaskId:tasks[0].id};
}
export function permanentlyRemoveTask(state, taskId) {
  const task=state.tasks.find(t=>t.id===taskId);
  if (!task) return state;
  const removed=state.tasks.filter(t=>t.id===taskId||t.syncConflict?.taskId===taskId);
  if (removed.some(t=>t.activeRunId||t.runs.some(r=>['running','submitting'].includes(r.status)))) throw Error('任务仍在执行，请等待结束后再删除。');
  const retainedJobs=new Set(state.tasks.filter(t=>!removed.includes(t)).flatMap(taskJobIds));
  return applyTaskDeletions(state,removed.map(t=>({id:t.id,jobIds:taskJobIds(t).filter(id=>!retainedJobs.has(id)),...(taskMaterialIds(t).length?{materialIds:taskMaterialIds(t)}:{})})));
}
