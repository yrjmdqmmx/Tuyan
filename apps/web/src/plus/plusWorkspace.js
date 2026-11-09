import {plusTaskSpec} from '../../../../packages/api/src/plus.mjs';
export async function submitPlusWorkspace({request,taskId,run,prepared,confirm,isCurrent=()=>true}){
  let spec,workspace,quote;
  try{
    const {workspaceExecution:_execution,workspaceAccount:_account,...body}=prepared;
    spec=plusTaskSpec({path:run.path,mode:run.input.settings[run.input.mode].plusMode,kind:run.kind==='generate'?'generate':'edit',candidates:body.numCandidates,reviews:body.maxCriticRounds||1,imageSize:body.imageSize||'2K',aspectRatio:body.aspectRatio});
    workspace={taskId,runId:run.id,request:structuredClone(body)};
    quote=await request('/quote',{...spec,workspace});
    if(!isCurrent()||!await confirm({quote,spec})||!isCurrent())throw Error('已取消，未开始模型任务。');
    if(Number.isFinite(quote.expiresAt)&&quote.expiresAt<=Date.now())throw Error('积分报价已过期，请重新确认；尚未开始模型任务。');
  }catch(error){if(error.message==='PLUS_UNSUPPORTED_MODEL_DIMENSIONS')error.message='当前 Plus 图片型号支持 1K、2K，请在绘图设置调整清晰度。';error.beforeDispatch=true;throw error;}
  // Once submitted, any uncertainty is reconciled under the same run ID.
  // Never regenerate a key, automatically retry, or infer failure from timeout.
  try{
    const operation=await request('/jobs',{key:run.id,quote:quote.token,spec,workspace});
    return {id:operation.jobId};
  }catch(error){
    if(['PLUS_QUOTE_EXPIRED','PLUS_PRICING_CHANGED','PLUS_INSUFFICIENT_CREDITS','PLUS_NEW_TASKS_PAUSED','PLUS_PERIOD_CHANGED_REVIEW_REQUIRED'].includes(error.code)){
      try{const closed=await request('/jobs/'+encodeURIComponent(run.id)+'/cancel',{});if(closed.status==='released'&&closed.settlement?.kind==='not_sent')error.beforeDispatch=true;}catch{/* Unknown cancellation is reconciled under the original operation key. */}
    }
    throw error;
  }
}
