const failure=(status:number,message:string)=>Object.assign(new Error(message),{status});
const owned=(userId:string)=>({$or:[{userId},{userId:{$in:[null,'']},user_id:userId}]});
const terminal=new Set(['succeeded','completed','failed','cancelled','canceled']);

// Internal gateway operation. The durable inventory permits safe retries after
// partial OSS failures; no prompt, image or credential survives in the marker.
export function createWorkspaceJobDeletion({db,bucket,listKeys,objectKeys,deleteMaterials}:any) {
  return async (userId:string, jobIds:string[])=>{
    if(!userId)throw failure(401,'SIGN_IN_REQUIRED');
    if(!Array.isArray(jobIds)||jobIds.length>1000||jobIds.some(id=>typeof id!=='string'||! /^[\w-]{1,160}$/.test(id)))throw failure(400,'INVALID_JOB_IDS');
    const jobs=db.collection('paperbanana_jobs'),deletions=db.collection('paperbanana_task_deletions');
    // Check the entire request before making any irreversible change.
    for(const id of jobIds){const job=await jobs.findOne({_id:id});if(job){if(!await jobs.findOne({_id:id,...owned(userId)}))throw failure(403,'JOB_OWNER_MISMATCH');if(!terminal.has(job.status))throw failure(409,'JOB_STILL_RUNNING');}}
    for(const id of jobIds){
      const identity={_id:`${userId}:${id}`};
      let operation=await deletions.findOne(identity);
      if(operation?.complete)continue;
      const job=await jobs.findOne({_id:id,...owned(userId)});
      if(!job&&!operation)continue;
      if(!operation){
        const prefix=`${id}/`;
        const projection=Object.fromEntries(['resultImages','result_images','referenceImages','reference_images','stages.image'].flatMap(p=>['objectKey','object_key','filename','analysisObjectKey','analysis_object_key'].map(k=>[p+'.'+k,1])).concat([['sourceImageObjectKey',1],['source_image_object_key',1]]));
        const remaining=await jobs.find({...owned(userId),_id:{$nin:jobIds}},{projection}).toArray();
        // Shared files stay until their last task is deleted. A later deletion
        // may retire a source file under an already-deleted, same-owner job.
        const shared=new Set(remaining.flatMap(objectKeys)), allowedPrefixes=[prefix], candidates=new Set<string>(await listKeys(prefix));
        for(const key of objectKeys(job)){
          const source=String(key).split('/')[0];
          if(source!==id&&await deletions.findOne({userId,jobId:source})){allowedPrefixes.push(source+'/');candidates.add(key);}
        }
        const keys=[...candidates].filter(key=>!shared.has(key));
        operation={...identity,userId,jobId:id,keys,allowedPrefixes:[...new Set(allowedPrefixes)],complete:false};
        await deletions.updateOne(identity,{$setOnInsert:operation},{upsert:true});
        operation=await deletions.findOne(identity);
      }
      const executions=db.collection('paperbanana_provider_executions'), execution=await executions.findOne({_id:id,userId});
      if(execution){const claimed=await executions.updateOne({_id:id,userId,state:{$nin:['running','queued']}},{$set:{state:'deleting'}});if(!claimed.matchedCount)throw failure(409,'JOB_STILL_RUNNING');}
      if(job)await deleteMaterials(job);
      for(const key of operation.keys){if(!operation.allowedPrefixes.some((prefix:string)=>key.startsWith(prefix)))throw failure(409,'INVALID_DELETE_SCOPE');await bucket().deleteFile(key);}
      // Step chunks carry the job id in their immutable key, including orphaned
      // chunks written immediately before a crash (without a step count).
      await db.collection('paperbanana_provider_step_chunks').deleteMany({userId,_id:{$gte:id+':',$lt:id+';'}});
      await db.collection('paperbanana_provider_steps').deleteMany({userId,jobId:id});
      await db.collection('paperbanana_provider_executions').deleteMany({_id:id,userId});
      await jobs.deleteOne({_id:id,...owned(userId)});
      await deletions.updateOne(identity,{$set:{complete:true},$unset:{keys:'',allowedPrefixes:''}});
    }
    return {deleted:true};
  };
}
