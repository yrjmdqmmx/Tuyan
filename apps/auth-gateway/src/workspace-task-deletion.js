import { permanentlyRemoveTask, applyTaskDeletions, taskJobIds } from '../../../packages/api/src/workspace-deletion.mjs';
import { cleanWorkspace, resultReferences } from '../../../packages/api/src/workspace-sync.mjs';
const fail=(status,message)=>Object.assign(Error(message),{status});

// All mutations run inside the account's Mongo transaction, shared with claims.
export function taskDeletionStore({db,key,get,assertActive}) {
  const operations=db.collection('workspaceTaskDeletions');
  return {
    async pendingDeletions(userId) {await assertActive(userId);const next=await operations.findOne({userId,complete:false});return next?[next]:[];},
    async beginDelete(userId, taskId, revision) {
      await assertActive(userId);
      if(typeof taskId!=='string'||! /^[\w-]{1,160}$/.test(taskId))throw fail(400,'INVALID_TASK');
      const _id=key(userId)+':'+taskId, previous=await operations.findOne({_id});
      if(previous)return previous;
      const current=await get(userId);
      if(current.revision!==revision)throw fail(409,'WORKSPACE_CONFLICT');
      const task=current.state?.tasks.find(t=>t.id===taskId);
      if(!task)throw fail(404,'任务不存在或已删除。');
      const removed=current.state.tasks.filter(t=>t.id===taskId||t.syncConflict?.taskId===taskId), ids=removed.map(t=>t.id);
      if(removed.some(t=>t.activeRunId||t.runs.some(r=>['submitting','running'].includes(r.status))) || await db.collection('workspaceExecutionLocks').findOne({userId,taskId:{$in:ids}}))throw fail(409,'任务仍在执行，请等待结束后再删除。');
      const state=cleanWorkspace(permanentlyRemoveTask(current.state,taskId));
      const executions=await db.collection('workspaceExecutions').find({userId,taskId:{$in:ids}}).toArray();
      if(executions.some(r=>r.status&&!['succeeded','completed','failed','cancelled','canceled'].includes(r.status)))throw fail(409,'任务仍在执行，请等待结束后再删除。');
      const backups=await db.collection('workspaceMigrationBackups').find({userId}).toArray();
      const oldRemoved=backups.flatMap(b=>(b.state?.tasks||[]).filter(t=>ids.includes(t.id)||ids.includes(t.syncConflict?.taskId)));
      const keptJobs=new Set([...state.tasks.flatMap(taskJobIds),...backups.flatMap(b=>(applyTaskDeletions(b.state,state.purgedTasks)?.tasks||[]).flatMap(taskJobIds))]);
      const jobIds=[...new Set([...[...removed,...oldRemoved].flatMap(taskJobIds),...executions.map(r=>r.jobId).filter(Boolean)])].filter(id=>!keptJobs.has(id));
      // Also mark accepted jobs whose receipt never reached the workspace.
      state.purgedTasks.find(p=>p.id===taskId).jobIds=[...new Set([...state.purgedTasks.find(p=>p.id===taskId).jobIds,...jobIds])];
      cleanWorkspace(state);
      const changed=await db.collection('workspaceDocuments').updateOne({_id:key(userId),revision},{$set:{state,revision:revision+1,updatedAt:new Date()}});
      if(changed.matchedCount!==1)throw fail(409,'WORKSPACE_CONFLICT');
      for(const backup of backups) {
        await db.collection('workspaceMigrationBackups').updateOne({_id:backup._id},{$set:{state:applyTaskDeletions(backup.state,state.purgedTasks)}});
      }
      const retained=new Set([...resultReferences(state),...backups.flatMap(b=>b.state?resultReferences(applyTaskDeletions(b.state,state.purgedTasks)):[])]);
      for(const resultId of resultReferences({tasks:[...removed,...oldRemoved]}).filter(id=>!retained.has(id))) {
        const result=await db.collection('workspaceResults').findOne({_id:key(userId)+':'+resultId});
        if(result){await db.collection('workspaceResults').deleteOne({_id:result._id});await db.collection('workspaceQuotas').updateOne({_id:key(userId)},{$inc:{bytes:-result.size}});}
      }
      for(const name of ['workspaceExecutions','workspaceHistoryExecutions'])await db.collection(name).deleteMany({userId,taskId:{$in:ids}});
      const operation={_id,userId,taskId,jobIds,complete:false};
      await operations.insertOne(operation);
      return operation;
    },
    async finishDelete(userId,taskId) {await assertActive(userId);await operations.updateOne({_id:key(userId)+':'+taskId},{$set:{complete:true},$unset:{jobIds:''}});return get(userId);},
  };
}

export function createTaskDeletionCleanup({backend}) {
  return async operation=>{
    if(!operation.jobIds?.length)return;
    const result=await backend.call({action:'deleteWorkspaceJobs',jobIds:operation.jobIds},{},{authUserId:operation.userId,timeoutMs:60000});
    if(result.status!==200||result.data?.code||result.data?.deleted!==true)throw fail(503,'任务已移除，服务器文件清理尚未完成；请重试删除或稍后同步。');
  };
}
