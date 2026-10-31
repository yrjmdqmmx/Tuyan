import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {PLUS_PRODUCT,PLUS_PRESETS,PLUS_PRESET_VERSION,PLUS_IMAGE_MODEL,plusSimulationQuote,plusTaskSpec} from '../../../packages/api/src/plus.mjs';
import {plusWorkspaceRequest} from '../../../packages/api/src/plus-request.mjs';
import {plusPreparedQuote} from './plus-pricing.js';
const fail=(code,status=409)=>Object.assign(Error(code),{code,status});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function createPlusService({config,store,payment,secret,executor,now=()=>Date.now()}){
  const sign=value=>createHmac('sha256',secret).update('tuyan-plus-quote-v1\0'+value).digest('base64url');
  async function check(user,{exposePurchase=true}={}){
    let access;try{access=await payment.access(user);}catch(error){if(error.code==='PLUS_PAYMENT_PERIOD_REVIEW'&&error.observedPeriod)await store.flagPeriodReview(user,error.observedPeriod);throw error;}
    const membership=await store.reconcile(user,access);
    // Never offer another payment while the previous local cycle is unresolved.
    // Refunded overlapping cycles need provider semantics before accepting money.
    const purchaseBlocked=access.access==='purchase_required'&&Boolean(membership.cycleId)&&!(membership.status==='expired'||membership.status==='refunded'&&membership.expiresAt*1000<=now());
    const showPurchase=exposePurchase&&access.purchaseUrl&&config.newPurchasesEnabled===true&&!purchaseBlocked;
    if(showPurchase)await store.noteCheckout?.(user);
    return {membership,...(showPurchase?{purchaseUrl:access.purchaseUrl}:{}),purchaseBlocked,purchasePaused:access.access==='purchase_required'&&config.newPurchasesEnabled!==true,checkedAt:now()};
  }
  async function quote(user,input){
    if(config.newTasksEnabled!==true)throw fail('PLUS_NEW_TASKS_PAUSED',503);
    if(config.executionMode!=='simulation'&&!(config.executionMode==='managed'&&config.modelExecutionEnabled&&config.pricing))throw fail('PLUS_PRICING_NOT_VALIDATED',503);
    const {membership}=await check(user,{exposePurchase:false});
    if(membership.status!=='active')throw fail('PLUS_MEMBERSHIP_REQUIRED',403);
    const workspace=plusWorkspaceRequest(input.workspace,input);
    if(config.executionMode==='managed'&&!workspace)throw fail('PLUS_WORKSPACE_REQUIRED',400);
    const price=config.executionMode==='simulation'?plusSimulationQuote(input):plusPreparedQuote(input,config.pricing);
    if(price.credits>membership.available)throw fail('PLUS_INSUFFICIENT_CREDITS');
    const data={user:String(user),environment:config.environment,entitlementId:config.entitlementId,cycleId:membership.cycleId,...price,workspaceHash:hash(workspace),pricingHash:price.simulation?null:hash(config.pricing),expiresAt:now()+120000};
    const encoded=Buffer.from(JSON.stringify(data)).toString('base64url');
    return {spec:plusTaskSpec(input),credits:price.credits,pricingVersion:price.pricingVersion,simulation:price.simulation,expiresAt:data.expiresAt,token:encoded+'.'+sign(encoded)};
  }
  function verify(user,token,input){
    if(typeof token!=='string'||token.length>4096)throw fail('PLUS_INVALID_QUOTE',400);
    const [encoded,signature,...rest]=token.split('.'),expected=Buffer.from(sign(encoded||'')),actual=Buffer.from(signature||'');
    if(rest.length||expected.length!==actual.length||!timingSafeEqual(expected,actual))throw fail('PLUS_INVALID_QUOTE',400);
    let quote;try{quote=JSON.parse(Buffer.from(encoded,'base64url'));}catch{throw fail('PLUS_INVALID_QUOTE',400);}
    if(quote.user!==String(user)||quote.environment!==config.environment||quote.entitlementId!==config.entitlementId||quote.simulation!==(config.executionMode==='simulation')||quote.workspaceHash!==hash(plusWorkspaceRequest(input.workspace,input))||JSON.stringify(plusTaskSpec(quote))!==JSON.stringify(plusTaskSpec(input)))throw fail('PLUS_QUOTE_MISMATCH');
    return quote;
  }
  return {
    catalog(){return {enabled:config.enabled,environment:config.environment,executionMode:config.executionMode,paymentConfigured:config.paymentConfigured,newPurchasesEnabled:config.newPurchasesEnabled===true,newTasksEnabled:config.newTasksEnabled===true,product:PLUS_PRODUCT,presets:PLUS_PRESETS,presetVersion:PLUS_PRESET_VERSION,imageModel:PLUS_IMAGE_MODEL,paidExecutionEnabled:config.modelExecutionEnabled===true};},
    rateLimit:(user,bucket)=>store.consumeRequest(user,bucket),
    check,
    async status(user){const page=await store.history(user);return {membership:await store.summary(user),ledger:page.entries,ledgerNextCursor:page.nextCursor,checkoutPending:await store.checkoutPending(user),pending:await store.pending(user)};},
    history:(user,cursor)=>store.history(user,{cursor}),
    quote,
    async requestRefund(user){return {...await store.requestRefund(user),moneyRefunded:false,processing:'manual'};},
    async cancelUnsent(user,key){await store.cancelUnclaimed(user,key);return store.operation(user,key);},
    async submit(user,{key,quote:token,spec,workspace:inputWorkspace}){
      if(!['simulation','managed'].includes(config.executionMode)||!executor)throw fail('PLUS_EXECUTION_DISABLED',503);
      const workspace=plusWorkspaceRequest(inputWorkspace,spec);
      if(workspace&&workspace.runId!==key)throw fail('PLUS_OPERATION_BINDING_MISMATCH',400);
      const quoted=verify(user,token,{...spec,workspace}),old=await store.operation(user,key);
      const pricing=quoted.simulation?undefined:structuredClone(config.pricing);
      if(!old&&config.newTasksEnabled!==true)throw fail('PLUS_NEW_TASKS_PAUSED',409);
      const fingerprint=hash({spec:plusTaskSpec(spec),credits:quoted.credits,pricingVersion:quoted.pricingVersion,cycleId:quoted.cycleId,workspaceHash:quoted.workspaceHash,pricingHash:quoted.pricingHash});
      if(!old){
        if(!quoted.simulation&&(!config.modelExecutionEnabled||quoted.pricingHash!==hash(pricing)))throw fail('PLUS_PRICING_CHANGED');
        if(quoted.expiresAt<=now())throw fail('PLUS_QUOTE_EXPIRED');
        const {membership}=await check(user,{exposePurchase:false});
        if(membership.cycleId!==quoted.cycleId||membership.status!=='active')throw fail('PLUS_PERIOD_CHANGED_REVIEW_REQUIRED');
      }
      const reservation=await store.reserve(user,{key,fingerprint,credits:quoted.credits,pricingVersion:quoted.pricingVersion,spec:plusTaskSpec(spec),workspace,...(!quoted.simulation?{pricing}:{})});
      // Existing reservation/submission is queried; never resubmitted, even if
      // the first worker crashed before it could persist a returned job ID.
      if(!reservation.created)return store.operation(user,key);
      let dispatched=false;
      try{
        await executor.preflight?.({userId:String(user),workspace,spec:plusTaskSpec(spec),pricing});
        dispatched=await store.claimDispatch(user,key);if(!dispatched)return store.operation(user,key);
        const result=await executor.submit({userId:String(user),operationKey:key,spec:plusTaskSpec(spec),preset:PLUS_PRESETS[spec.mode],presetVersion:PLUS_PRESET_VERSION,workspace,credits:quoted.credits,pricing});
        await store.acceptJob(user,key,result.id);
      }catch(error){
        if(dispatched&&error.confirmedNotSent)await store.settle(user,key,{kind:'unbilled',evidenceId:'core-confirmed-not-sent'});
        else if(dispatched)await store.markUnknown(user,key);
        else await store.settle(user,key,{kind:'not_sent',evidenceId:'admission-not-sent'});
        throw fail(dispatched&&!error.confirmedNotSent?'PLUS_SUBMISSION_UNKNOWN':error.code||'PLUS_EXECUTION_DISABLED',dispatched&&!error.confirmedNotSent?503:error.status||409);
      }
      return store.operation(user,key);
    },
    async poll(user,key){
      let operation=await store.operation(user,key);
      if(!operation)throw fail('PLUS_OPERATION_NOT_FOUND',404);
      if(!operation.jobId&&executor?.find&&(operation.dispatchedAt||['submitting','unknown'].includes(operation.status))){const found=await executor.find({userId:String(user),operationKey:key});if(found){await store.acceptJob(user,key,found);operation=await store.operation(user,key);}}
      if(!operation.jobId||!executor)return {operation};
      const privateOperation=store.execution?await store.execution(user,key):operation;
      // Only the original server-recorded job may be queried. There is no
      // public endpoint accepting claimed usage, refund proof or a job result.
      let job;try{job=await executor.get({userId:String(user),id:operation.jobId,spec:operation.spec,credits:operation.credits,pricing:privateOperation.pricing,operationKey:key});}catch{throw fail('PLUS_RESULT_PENDING',503);}
      // An audited terminal ledger is final; later result reads must not replace
      // its evidence or charge it again (especially after manual reconciliation).
      if(['settled','released'].includes(operation.status))return {operation,job};
      if(job.status==='completed'&&['confirmed_usage','simulation_usage'].includes(job.billing)&&Number.isSafeInteger(job.actualCredits)){
        if(job.billing==='simulation_usage'&&config.executionMode!=='simulation')throw fail('PLUS_INVALID_SETTLEMENT',503);
        await store.settle(user,key,{kind:'success',actualCredits:job.actualCredits,evidenceId:operation.jobId,...(job.modelCostMicros===undefined?{}:{modelCostMicros:job.modelCostMicros,tariffVersion:job.tariffVersion})});
        operation=await store.operation(user,key);
      }else if(job.status==='failed'&&job.billing==='confirmed_usage'&&Number.isSafeInteger(job.actualCredits)){
        await store.settle(user,key,{kind:'partial_failure',actualCredits:job.actualCredits,evidenceId:operation.jobId,...(job.modelCostMicros===undefined?{}:{modelCostMicros:job.modelCostMicros,tariffVersion:job.tariffVersion})});operation=await store.operation(user,key);
      }else if(['failed','completed'].includes(job.status)&&job.billing==='confirmed_unbilled'){
        await store.settle(user,key,{kind:'unbilled',evidenceId:operation.jobId});operation=await store.operation(user,key);
      }else if(['failed','completed'].includes(job.status)){await store.markUnknown(user,key);operation=await store.operation(user,key);}
      return {operation,job};
    },
  };
}

// Local preparation executor. No provider key, transport or model API exists
// here. Real execution requires a separate, calibrated adapter and review gate.
export function createPlusSimulationExecutor(){return {
  async submit({userId,operationKey}){return {id:'plus-sim-'+hash([userId,operationKey])};},
  async get({id,spec}){
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><rect width="960" height="640" fill="#f4f7f5"/><rect x="160" y="200" width="220" height="140" rx="24" fill="#dce9df"/><path d="M400 270H550" stroke="#31533e" stroke-width="6"/><rect x="580" y="200" width="220" height="140" rx="24" fill="#c0d7c6"/><text x="480" y="440" text-anchor="middle" font-size="28" font-family="sans-serif" fill="#31533e">LOCAL SIMULATION — NO MODEL CALL</text></svg>';
    const png=spec.path==='png'?(await (await import('sharp')).default(Buffer.from(svg)).png().toBuffer()).toString('base64'):'';
    return {id,status:'completed',simulation:true,billing:'simulation_usage',actualCredits:plusSimulationQuote(spec).credits,result_images:Array.from({length:spec.candidates},(_,i)=>({candidate_id:i+1,filename:`simulation-${i+1}.${spec.path}`,mime_type:spec.path==='svg'?'image/svg+xml':'image/png',url:spec.path==='svg'?'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64'):'data:image/png;base64,'+png,review:'本地模拟，未调用模型'}))};
  },
};}
