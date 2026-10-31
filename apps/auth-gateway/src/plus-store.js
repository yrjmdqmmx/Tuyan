import {createHash,randomUUID} from 'node:crypto';
import {PLUS_PRODUCT} from '../../../packages/api/src/plus.mjs';
import {plusRefundFen} from '../../../packages/api/src/plus-metering.mjs';
const fail=(code,status=409)=>Object.assign(Error(code),{code,status});
const digest=(...parts)=>createHash('sha256').update(JSON.stringify(parts)).digest('hex');
const integer=n=>Number.isSafeInteger(n)&&n>=0;
export const PLUS_MUTATIONS=['consumeRequest','reconcile','flagPeriodReview','reserve','claimDispatch','acceptJob','markUnknown','settle','requestRefund','refundConfirmed','cancelUnclaimed','manualSettle','noteCheckout','clearCheckout','confirmPeriod','recordReconciliationAttempt'];

// Every mutation must run through accountWorkspaceStore / Mongo transactions.
// Financial collections are intentionally excluded from task hard-deletion.
export function createPlusStore({db,assertActive,namespace='sandbox:unconfigured',now=()=>Date.now(),maxConcurrent=1}){
  const accounts=db.collection('plusAccounts'),cycles=db.collection('plusCycles'),operations=db.collection('plusOperations'),ledger=db.collection('plusLedger');
  const accountId=user=>digest(namespace,String(user));
  const operationId=(user,key)=>digest(namespace,String(user),key);
  const audit=async(user,cycle,id,kind,availableDelta,heldDelta,extra={})=>ledger.insertOne({_id:id,userId:String(user),namespace,cycleId:cycle,kind,availableDelta,heldDelta,at:now(),...extra});
  async function current(user){const account=await accounts.findOne({_id:accountId(user)});return account?cycles.findOne({_id:account.cycleId}):null;}
  function publicCycle(c){
    if(!c)return {status:'inactive',available:0,held:0,spent:0};
    const status=c.status==='active'&&c.expiresAt*1000<=now()?'expired':c.status;
    return {cycleId:c._id,status,startsAt:c.startsAt,expiresAt:c.expiresAt,available:status==='active'?c.available:0,lockedCredits:['suspended','review_required','refund_requested'].includes(status)?c.available:0,held:c.held,spent:c.spent,...(c.refundFen!==undefined?{refundFen:c.refundFen}:{})};
  }
  async function requireOperation(user,key){const op=await operations.findOne({_id:operationId(user,key)});if(!op)throw fail('PLUS_OPERATION_NOT_FOUND',404);return op;}
  return {
    async reconciliationBatch(){
      const due={$or:[{nextReconcileAt:{$exists:false}},{nextReconcileAt:{$lte:now()}}]};
      return {operations:await operations.find({namespace,status:{$in:['reserved','submitting','running','unknown']},...due},{projection:{_id:0,userId:1,key:1,status:1,createdAt:1}}).sort({nextReconcileAt:1,createdAt:1}).limit(5).toArray(),checkouts:await accounts.find({namespace,checkoutPending:true,...due},{projection:{_id:0,userId:1}}).sort({nextReconcileAt:1,checkoutIssuedAt:1}).limit(5).toArray()};
    },
    async recordReconciliationAttempt(user,{kind,key,delayMs,failed}){
      await assertActive(user);if(!['operation','checkout'].includes(kind)||!integer(delayMs)||delayMs<30000)throw fail('PLUS_INVALID_RECONCILIATION');
      await (kind==='operation'?operations:accounts).updateOne({_id:kind==='operation'?operationId(user,key):accountId(user)},{$set:{lastReconciledAt:now(),nextReconcileAt:now()+delayMs,reconciliationDeferred:Boolean(failed)}});
    },
    async confirmPeriod(user,{startsAt,expiresAt,actor,evidenceId}){
      await assertActive(user);const cycle=await current(user),days=(expiresAt-startsAt)/86400;
      if(!cycle||!actor||!evidenceId||cycle.startsAt!==startsAt||!integer(expiresAt)||days<27||days>32||expiresAt*1000<=now()||!['suspended','review_required','active'].includes(cycle.status))throw fail('PLUS_RECONCILIATION_EVIDENCE_REQUIRED');
      if(cycle.status==='active'&&cycle.expiresAt===expiresAt)return;
      await cycles.updateOne({_id:cycle._id},{$set:{status:'active',expiresAt,periodCorrectedAt:now()},$unset:{reviewReason:'',observedExpiresAt:''}});
      await audit(user,cycle._id,`${cycle._id}:manual-period:${expiresAt}:${digest(evidenceId)}`,'period_corrected',0,0,{oldExpiresAt:cycle.expiresAt,newExpiresAt:expiresAt,reviewedBy:actor,evidenceId});
    },
    async noteCheckout(user){await assertActive(user);await accounts.updateOne({_id:accountId(user)},{$set:{userId:String(user),namespace,checkoutPending:true},$setOnInsert:{checkoutIssuedAt:now()}},{upsert:true});},
    async clearCheckout(user,{actor,evidenceId}){await assertActive(user);if(!actor||!evidenceId)throw fail('PLUS_RECONCILIATION_EVIDENCE_REQUIRED');await accounts.updateOne({_id:accountId(user)},{$set:{checkoutPending:false,checkoutReviewedBy:actor,checkoutReviewEvidence:evidenceId,checkoutReviewedAt:now()}});},
    async consumeRequest(user,bucket='write'){
      await assertActive(user);if(!['write','read'].includes(bucket))throw fail('PLUS_INVALID_REQUEST',400);
      const window=Math.floor(now()/60000),collection=db.collection('plusRequestLimits'),id=digest(namespace,String(user),window,bucket);
      const row=await collection.findOne({_id:id});
      if((row?.count||0)>=(bucket==='read'?90:30))throw Object.assign(fail('PLUS_RATE_LIMIT',429),{retryAfterSeconds:60-Math.floor(now()/1000)%60});
      await collection.updateOne({_id:id},{$inc:{count:1},$setOnInsert:{userId:String(user),namespace,expiresAt:new Date((window+2)*60000)}},{upsert:true});
    },
    async summary(user){await assertActive(user);return publicCycle(await current(user));},
    async checkoutPending(user){await assertActive(user);return Boolean((await accounts.findOne({_id:accountId(user)}))?.checkoutPending);},
    async history(user,{cursor,limit=25}={}){
      await assertActive(user);
      if(!Number.isInteger(limit)||limit<1||limit>100)throw fail('PLUS_INVALID_HISTORY_CURSOR',400);
      const filter={userId:String(user),namespace};
      if(cursor!==undefined){
        let point;try{if(typeof cursor!=='string'||cursor.length>1024||!cursor)throw Error();point=JSON.parse(Buffer.from(cursor,'base64url').toString('utf8'));}catch{throw fail('PLUS_INVALID_HISTORY_CURSOR',400);}
        if(!integer(point?.at)||typeof point?.id!=='string'||!point.id||point.id.length>500)throw fail('PLUS_INVALID_HISTORY_CURSOR',400);
        filter.$or=[{at:{$lt:point.at}},{at:point.at,_id:{$lt:point.id}}];
      }
      // Explicit public fields: keep operator identities and provider evidence private.
      const rows=await ledger.find(filter,{projection:{_id:1,kind:1,at:1,cycleId:1,operationKey:1,availableDelta:1,heldDelta:1,charged:1,refundFen:1,outcome:1}}).sort({at:-1,_id:-1}).limit(limit+1).toArray();
      const page=rows.slice(0,limit),last=page.at(-1);
      return {entries:page.map(({_id,...entry})=>({...entry,entryId:_id})),nextCursor:rows.length>limit?Buffer.from(JSON.stringify({at:last.at,id:last._id})).toString('base64url'):null};
    },
    async entries(user){await assertActive(user);return ledger.find({userId:String(user),namespace},{projection:{_id:0,userId:0,namespace:0}}).sort({at:-1,_id:-1}).limit(100).toArray();},
    async pending(user){await assertActive(user);return operations.find({userId:String(user),namespace,status:{$in:['reserved','submitting','running','unknown']}},{projection:{_id:0,userId:0,namespace:0,fingerprint:0,pricing:0}}).sort({createdAt:1}).limit(20).toArray();},
    async operation(user,key){await assertActive(user);const op=await operations.findOne({_id:operationId(user,key)});if(!op)return null;const {_id,userId,namespace:ns,fingerprint,pricing,...publicOp}=op;return publicOp;},
    async execution(user,key){await assertActive(user);return requireOperation(user,key);},
    async flagPeriodReview(user,{startsAt,expiresAt}){
      await assertActive(user);const cycle=await current(user);
      if(cycle?.startsAt!==startsAt||cycle.status!=='active')return;
      await cycles.updateOne({_id:cycle._id},{$set:{status:'review_required',reviewReason:'payment_period_mismatch',observedExpiresAt:expiresAt}});
      await audit(user,cycle._id,`${cycle._id}:period-review:${randomUUID()}`,'period_review',0,0);
    },
    async reconcile(user,access){
      await assertActive(user);const previous=await current(user);
      if(access.access==='purchase_required'){
        if(previous?.status==='active'&&previous.expiresAt*1000>now()){
          await cycles.updateOne({_id:previous._id},{$set:{status:'suspended'}});
          await audit(user,previous._id,`${previous._id}:suspended:${randomUUID()}`,'suspended',0,0);
        }
        return publicCycle(await current(user));
      }
      if(access.access!=='granted'||!integer(access.startsAt)||!integer(access.expiresAt)||access.startsAt<=0||access.expiresAt<=access.startsAt||access.startsAt*1000>now()||access.expiresAt*1000<=now())throw fail('PLUS_INVALID_PAYMENT_PERIOD',502);
      await accounts.updateOne({_id:accountId(user)},{$set:{checkoutPending:false}});
      const id=digest(namespace,String(user),'cycle',access.startsAt);
      if(previous?._id===id){
        if(previous.expiresAt!==access.expiresAt){
          const days=(access.expiresAt-access.startsAt)/86400;
          if(previous.status!=='review_required'||previous.reviewReason!=='payment_period_mismatch'||days<27||days>32){
            if(['active','suspended','review_required'].includes(previous.status)){await cycles.updateOne({_id:id},{$set:{status:'review_required',reviewReason:'unexpected_period_change',observedExpiresAt:access.expiresAt}});await ledger.updateOne({_id:`${id}:unexpected-period:${access.expiresAt}`},{$setOnInsert:{userId:String(user),namespace,cycleId:id,kind:'period_review',availableDelta:0,heldDelta:0,at:now(),oldExpiresAt:previous.expiresAt,observedExpiresAt:access.expiresAt}},{upsert:true});}
            return publicCycle(await current(user));
          }
          await cycles.updateOne({_id:id,status:'review_required'},{$set:{status:'active',expiresAt:access.expiresAt,periodCorrectedAt:now()},$unset:{reviewReason:''}});
          await audit(user,id,`${id}:period-corrected:${access.expiresAt}`,'period_corrected',0,0,{oldExpiresAt:previous.expiresAt,newExpiresAt:access.expiresAt});
          return publicCycle(await current(user));
        }
        // A later stale granted response cannot undo a refund/suspension.
        return publicCycle(previous);
      }
      if(previous?.status==='refund_requested')throw fail('PLUS_REFUND_PENDING');
      if(previous&&(access.startsAt<previous.expiresAt||previous.expiresAt*1000>now()))throw fail('PLUS_OVERLAPPING_PERIOD');
      if(await cycles.findOne({_id:id}))throw fail('PLUS_OLD_PERIOD_REPLAY');
      if(previous){
        await cycles.updateOne({_id:previous._id},{$set:{status:'expired',available:0}});
        await audit(user,previous._id,`${previous._id}:expire`,'expired',-previous.available,0);
      }
      const cycle={_id:id,userId:String(user),namespace,status:'active',startsAt:access.startsAt,expiresAt:access.expiresAt,available:PLUS_PRODUCT.credits,held:0,spent:0};
      await cycles.insertOne(cycle);
      await accounts.updateOne({_id:accountId(user)},{$set:{userId:String(user),namespace,cycleId:id}},{upsert:true});
      await audit(user,id,`${id}:grant`,'grant',PLUS_PRODUCT.credits,0);
      return publicCycle(cycle);
    },
    async reserve(user,{key,fingerprint,credits,pricingVersion,spec,pricing,workspace}){
      await assertActive(user);
      if(typeof key!=='string'||!/^[A-Za-z0-9._:-]{3,160}$/.test(key)||typeof fingerprint!=='string'||fingerprint.length!==64||!integer(credits)||credits<1||credits>PLUS_PRODUCT.credits)throw fail('PLUS_INVALID_RESERVATION',400);
      const id=operationId(user,key),old=await operations.findOne({_id:id});
      if(old){if(old.fingerprint!==fingerprint||old.credits!==credits||old.pricingVersion!==pricingVersion)throw fail('PLUS_IDEMPOTENCY_CONFLICT');return {created:false,operation:old};}
      const cycle=await current(user);
      if(!cycle||publicCycle(cycle).status!=='active')throw fail('PLUS_MEMBERSHIP_REQUIRED',403);
      if(await operations.countDocuments({userId:String(user),namespace,status:{$in:['reserved','submitting','running','unknown']}})>=maxConcurrent)throw fail('PLUS_CONCURRENCY_LIMIT');
      if(cycle.available<credits)throw fail('PLUS_INSUFFICIENT_CREDITS');
      const changed=await cycles.updateOne({_id:cycle._id,status:'active',available:{$gte:credits}},{$inc:{available:-credits,held:credits}});
      if(changed.modifiedCount!==1)throw fail('PLUS_INSUFFICIENT_CREDITS');
      const operation={_id:id,userId:String(user),namespace,key,fingerprint,credits,pricingVersion,spec,...(pricing?{pricing}:{}),...(workspace?{workspace:{taskId:workspace.taskId,runId:workspace.runId}}:{}),cycleId:cycle._id,status:'reserved',createdAt:now()};
      await operations.insertOne(operation);await audit(user,cycle._id,`${id}:reserve`,'reserve',-credits,credits,{operationKey:key});
      return {created:true,operation};
    },
    async cancelUnclaimed(user,key){
      await assertActive(user);
      if(typeof key!=='string'||!/^[A-Za-z0-9._:-]{3,160}$/.test(key))throw fail('PLUS_INVALID_RESERVATION',400);
      const id=operationId(user,key),op=await operations.findOne({_id:id});
      if(!op){await operations.insertOne({_id:id,userId:String(user),namespace,key,status:'released',credits:0,createdAt:now(),settledAt:now(),settlement:{kind:'not_sent',actualCredits:0,evidenceId:'closed-before-admission'}});return;}
      if(['released','settled'].includes(op.status))return;
      if(op.status!=='reserved')throw fail('PLUS_DISPATCH_MAY_HAVE_OCCURRED');
      await this.settle(user,key,{kind:'not_sent',evidenceId:'user-cancel-before-dispatch'});
    },
    async claimDispatch(user,key){
      await assertActive(user);const op=await requireOperation(user,key);
      if(op.status!=='reserved')return false;
      const cycle=await cycles.findOne({_id:op.cycleId});
      if(publicCycle(cycle).status!=='active')throw fail('PLUS_MEMBERSHIP_REQUIRED',403);
      const r=await operations.updateOne({_id:op._id,status:'reserved'},{$set:{status:'submitting',dispatchedAt:now()}});return r.modifiedCount===1;
    },
    async acceptJob(user,key,jobId){
      await assertActive(user);const op=await requireOperation(user,key);
      if(typeof jobId!=='string'||!jobId||jobId.length>200)throw fail('PLUS_INVALID_JOB',502);
      if(op.jobId&&op.jobId!==jobId)throw fail('PLUS_JOB_CONFLICT');
      if(['settled','released'].includes(op.status)&&op.dispatchedAt){await operations.updateOne({_id:op._id},{$set:{jobId}});return;}
      if(!['submitting','unknown','running'].includes(op.status))throw fail('PLUS_OPERATION_CLOSED');
      await operations.updateOne({_id:op._id},{$set:{status:'running',jobId}});
    },
    async markUnknown(user,key){
      await assertActive(user);const op=await requireOperation(user,key);
      if(['submitting','running'].includes(op.status))await operations.updateOne({_id:op._id},{$set:{status:'unknown'}});
    },
    async settle(user,key,{kind,actualCredits=0,evidenceId,modelCostMicros,tariffVersion}){
      await assertActive(user);const op=await requireOperation(user,key);
      const charged=['success','partial_failure'].includes(kind);
      if(!['success','partial_failure','not_sent','unbilled'].includes(kind)||!integer(actualCredits)||actualCredits>op.credits||typeof evidenceId!=='string'||!evidenceId||evidenceId.length>200||!charged&&actualCredits!==0)throw fail('PLUS_INVALID_SETTLEMENT',400);
      if(modelCostMicros!==undefined&&(!integer(modelCostMicros)||typeof tariffVersion!=='string'||!tariffVersion))throw fail('PLUS_INVALID_SETTLEMENT',400);
      const cost=modelCostMicros===undefined?{}:{modelCostMicros,tariffVersion};
      const settlement={kind,actualCredits,evidenceId,...cost};
      if(['settled','released'].includes(op.status)){if(JSON.stringify(op.settlement)!==JSON.stringify(settlement))throw fail('PLUS_SETTLEMENT_CONFLICT');return;}
      if(kind==='not_sent'&&op.status!=='reserved')throw fail('PLUS_DISPATCH_MAY_HAVE_OCCURRED');
      if(charged&&!['running','unknown'].includes(op.status))throw fail('PLUS_RESULT_NOT_CONFIRMED');
      const cycle=await cycles.findOne({_id:op.cycleId}),remaining=op.credits-actualCredits;
      // Returning a hold must never reanimate expired/refunded credits or add
      // old-cycle credits to a new cycle. Suspended balances stay quarantined.
      const restore=cycle.expiresAt*1000>now()&&['active','suspended','review_required'].includes(cycle.status)?remaining:0;
      const changed=await cycles.updateOne({_id:cycle._id,held:{$gte:op.credits}},{$inc:{held:-op.credits,available:restore,spent:actualCredits}});
      if(changed.modifiedCount!==1)throw fail('PLUS_LEDGER_INCONSISTENT');
      await operations.updateOne({_id:op._id},{$set:{status:charged?'settled':'released',settlement,settledAt:now()}});
      await audit(user,cycle._id,`${op._id}:settle`,charged?'settle':'release',restore,-op.credits,{operationKey:key,charged:actualCredits,outcome:kind,...cost,expired:remaining-restore});
    },
    async reviewQueue(){return {checkouts:await accounts.find({namespace,checkoutPending:true}).limit(100).toArray(),operations:await operations.find({namespace,status:{$in:['reserved','submitting','running','unknown']}},{projection:{pricing:0,fingerprint:0}}).sort({createdAt:1}).limit(100).toArray(),refunds:await cycles.find({namespace,status:'refund_requested'}).sort({refundRequestedAt:1}).limit(100).toArray(),periods:await cycles.find({namespace,status:{$in:['suspended','review_required']}}).sort({startsAt:1}).limit(100).toArray()};},
    async manualSettle(user,key,{kind,actualCredits,evidenceId,actor,pricingVersion}){
      await assertActive(user);const op=await requireOperation(user,key);
      if(typeof actor!=='string'||!actor||actor.length>100||pricingVersion!==op.pricingVersion)throw fail('PLUS_RECONCILIATION_EVIDENCE_REQUIRED');
      if(op.status==='submitting')await this.markUnknown(user,key);
      await this.settle(user,key,{kind,actualCredits,evidenceId});
      await ledger.updateOne({_id:`${op._id}:settle`,reviewedBy:{$exists:false}},{$set:{reviewedBy:actor,reviewEvidence:evidenceId}});
    },
    async requestRefund(user){
      await assertActive(user);const cycle=await current(user);
      if(cycle?.status==='refund_requested')return {cycleId:cycle._id,refundFen:cycle.refundFen,status:'requested'};
      if(!cycle||publicCycle(cycle).status!=='active')throw fail('PLUS_MEMBERSHIP_REQUIRED',403);
      if(cycle.held!==0||await operations.countDocuments({userId:String(user),namespace,status:{$in:['reserved','submitting','running','unknown']}})>0)throw fail('PLUS_REFUND_RECONCILIATION_REQUIRED');
      const refundFen=plusRefundFen(cycle.available,PLUS_PRODUCT.credits,PLUS_PRODUCT.priceFen);
      if(refundFen<=0)throw fail('PLUS_NO_REFUNDABLE_CREDITS');
      await cycles.updateOne({_id:cycle._id},{$set:{status:'refund_requested',refundFen,refundRequestedAt:now()}});
      await audit(user,cycle._id,`${cycle._id}:refund-request`,'refund_requested',0,0,{refundFen});
      return {cycleId:cycle._id,refundFen,status:'requested'};
    },
    async refundConfirmed(user,{cycleId,evidenceId,refundFen,actor}){
      await assertActive(user);const cycle=await cycles.findOne({_id:cycleId,userId:String(user),namespace});
      if(!cycle||!evidenceId||typeof evidenceId!=='string'||evidenceId.length>200)throw fail('PLUS_INVALID_REFUND',400);
      if(cycle.status==='refunded'){if(cycle.refundEvidence!==evidenceId||cycle.refundFen!==refundFen)throw fail('PLUS_REFUND_CONFLICT');return;}
      if(cycle.status!=='refund_requested'||cycle.held!==0||refundFen!==cycle.refundFen)throw fail('PLUS_REFUND_NOT_RECONCILED');
      await cycles.updateOne({_id:cycle._id},{$set:{status:'refunded',available:0,refundEvidence:evidenceId}});
      await audit(user,cycle._id,`${cycle._id}:refund`,'refund_confirmed',-cycle.available,0,{refundFen,evidenceId,...(actor?{reviewedBy:actor}:{})});
      // Submitted/unknown jobs remain held until their cost is reconciled.
      // This internal method does NOT send money or assert a Watcha refund API.
    },
  };
}
