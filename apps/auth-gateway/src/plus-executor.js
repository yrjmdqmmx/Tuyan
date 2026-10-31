import {plusModelRequest} from '../../../packages/api/src/plus-request.mjs';
import {plusBailianUsage} from '../../../packages/api/src/plus-usage.mjs';
import {meterPlusUsage} from '../../../packages/api/src/plus-metering.mjs';
const fail=(code,status=409)=>Object.assign(Error(code),{code,status});
// The only managed-model transport is the existing authenticated Core client.
// Production gates and a reviewed tariff are checked before obtaining a key.
export function createPlusCoreExecutor({backend,workspaceStore,config}){
  return {
    async preflight({userId,workspace,pricing}){
      if(!workspace)throw fail('PLUS_WORKSPACE_REQUIRED',400);
      const task=(await workspaceStore.get(userId)).state?.tasks.find(t=>t.id===workspace.taskId);
      if(!task||task.deleted||task.activeRunId!==workspace.runId||!task.runs?.some(r=>r.id===workspace.runId&&r.status==='submitting'))throw fail('PLUS_WORKSPACE_CHANGED');
      if(config.modelExecutionEnabled!==true||!pricing?.tariff?.validated||!config.bailianApiKey)throw fail('PLUS_EXECUTION_DISABLED',503);
      const health=await backend.call({action:'health'},{},{authUserId:userId,timeoutMs:10000});
      if(health.status!==200||health.data?.plusManagedContractVersion!==1)throw fail('PLUS_CORE_NOT_PREPARED',503);
    },
    async submit({userId,operationKey,spec,workspace,credits,pricing}){
      const body=plusModelRequest(workspace,spec,{apiKey:config.bailianApiKey,operationKey,budget:{maxCostMicros:credits*pricing.creditCostMicros,pricingVersion:pricing.version,tariff:pricing.tariff,limits:pricing.transportLimits}});
      const result=await backend.call({...body,userId}, {}, {authUserId:userId,timeoutMs:40000});
      const id=result.data?.jobId||result.data?.id;
      if(result.status<200||result.status>=300||result.data?.code||!id){
        const error=fail('PLUS_CORE_SUBMISSION_UNKNOWN',503);
        if(result.data?.requestState==='not_sent'&&!id)error.confirmedNotSent=true;
        throw error;
      }
      return {id:String(id)};
    },
    async find({userId,operationKey}){
      const result=await backend.call({action:'getPlusOperation',userId,operationKey},{},{authUserId:userId,timeoutMs:10000});
      if(result.status!==200||result.data?.code)throw fail('PLUS_RESULT_PENDING',503);
      const job=result.data?.job;if(!job)return null;if(String(job.userId)!==userId||job.plusUsage?.operationKey!==operationKey)throw fail('PLUS_RESULT_PENDING',503);return job.id;
    },
    async get({userId,id,spec,credits,pricing,operationKey}){
      const result=await backend.call({action:'getJob',jobId:id},{},{authUserId:userId,timeoutMs:10000});
      const job=result.data?.job;
      if(result.status!==200||result.data?.code||!job||String(job.userId)!==userId)throw fail('PLUS_RESULT_PENDING',503);
      const resultImages=(job.resultImages||job.result_images||[]).map((image,index)=>({filename:image.filename||image.url||String(index),url:image.url,candidate_id:image.candidateId??image.candidate_id??index,mime_type:image.mimeType||image.mime_type||'',...((image.libraryId||image.library_id)?{library_id:image.libraryId||image.library_id}:{}),...((image.storageError||image.storage_error)?{storage_error:image.storageError||image.storage_error}:{}),...(image.review?{review:image.review}:{})}));
      const safe={id,status:job.status==='succeeded'?'completed':job.status==='cancelled'?'failed':job.status,result_images:resultImages,stages:job.stages||[],candidate_progress:job.candidateProgress||[],error:job.error,failure:job.failure,recovery:job.recovery,simulation:false};
      if(!['completed','succeeded','failed','cancelled'].includes(job.status))return safe;
      // A final Core billing manifest accounts for every claimed transport,
      // including missing/failed receipts. providerCalls alone is insufficient.
      const manifest=job.plusUsage;
      if(!manifest||manifest.complete!==true||manifest.operationKey!==operationKey||manifest.pricingVersion!==pricing?.version)return {...safe,billing:'unknown'};
      const calls=(manifest.calls||[]).map(plusBailianUsage);
      if(!calls.length&&manifest.confirmedUnbilled===true)return {...safe,billing:'confirmed_unbilled',actualCredits:0};
      if(!calls.length)return {...safe,billing:'unknown'};
      const usage=meterPlusUsage({calls,tariff:pricing.tariff,creditCostMicros:pricing.creditCostMicros,maxCredits:credits});
      return {...safe,...usage,status:job.status==='cancelled'?'failed':safe.status};
    },
  };
}
