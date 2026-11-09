import {assertWorkspaceAccountActive,withWorkspaceAccountWrite} from './workspace-lifecycle.js';
import {createWorkspaceStore} from './workspace-sync.js';
import {mergeAccountHistory} from '../../../packages/api/src/workspace-history-merge.mjs';
import {cleanWorkspace} from '../../../packages/api/src/workspace-sync.mjs';
import {newWorkspace} from '../../../packages/api/src/workspace-defaults.mjs';
export async function backfillHistory({db,mongoClient,groups,apply=false}) {
  const active=id=>assertWorkspaceAccountActive(db,id);
  const store=createWorkspaceStore({db,assertActive:active});
  const summary={accounts:0,skippedAccounts:0,records:0,added:0,unchanged:0};
  // Validate every eligible account before the first write. An invalid snapshot
  // stops the operation, instead of partially importing or truncating that user.
  const plans=[],owners=new Map();
  if(!Array.isArray(groups))throw Error('INVALID_BACKFILL');
  for(const {userId,jobs} of groups){
    if(typeof userId!=='string'||!userId||!Array.isArray(jobs))throw Error('INVALID_BACKFILL');
    if(jobs.some(job=>job.ownerId!==userId))throw Object.assign(Error('HISTORY_OWNER_MISMATCH'),{status:403});
    if(!owners.has(userId))owners.set(userId,new Map());
    for(const job of jobs){const previous=owners.get(userId).get(job.id);if(!previous||job.updatedAt>previous.updatedAt)owners.get(userId).set(job.id,job);}
  }
  for(const [userId,records] of owners){
    const jobs=[...records.values()];
    try{await active(userId);}catch(error){if(error.status===403){summary.skippedAccounts++;continue;}throw error;}
    const current=await store.get(userId),before=current.state||newWorkspace('account-draft');
    const after=cleanWorkspace(mergeAccountHistory(before,jobs));
    const count=s=>s.tasks.reduce((n,t)=>n+t.runs.filter(r=>r.history).length,0);
    const added=count(after)-count(before);plans.push({userId,jobs,current});summary.accounts++;summary.records+=jobs.length;summary.added+=added;summary.unchanged+=jobs.length-added;
  }
  let applied=0;
  if(apply)for(const plan of plans){const saved=await withWorkspaceAccountWrite({db,mongoClient,userId:plan.userId},async scoped=>{
    const transactional=createWorkspaceStore({db:scoped,assertActive:id=>assertWorkspaceAccountActive(scoped,id)});
    const current=await transactional.get(plan.userId);
    // Atomic before-image + import. Retry after concurrent edits uses the latest
    // draft, and a failed import cannot leave orphaned migration backups.
    await scoped.collection('workspaceMigrationBackups').updateOne({_id:'history-v1:'+plan.userId},{$setOnInsert:{userId:plan.userId,revision:current.revision,state:current.state,createdAt:new Date()}},{upsert:true});
    return transactional.importHistory(plan.userId,plan.jobs);
  });applied+=saved.imported;}
  if(apply){summary.added=applied;summary.unchanged=summary.records-applied;}
  return summary;
}
