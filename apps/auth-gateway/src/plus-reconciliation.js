import {meterPlusUsage} from '../../../packages/api/src/plus-metering.mjs';
const fail=()=>{throw Error('PLUS_RECONCILIATION_EVIDENCE_REQUIRED');};
// Operator-only preparation API. Never mounted on the customer HTTP router.
// Provider evidence must be independently checked; this module never refunds money.
export async function planPlusReconciliation(store,input){
  const {userId,actor,evidenceId,action}=input||{};
  if(!userId||typeof actor!=='string'||!actor||actor.length>100||typeof evidenceId!=='string'||!evidenceId||evidenceId.length>200)fail();
  if(action==='period_confirmed'){if(input.confirmedProviderPeriod!==true)fail();return {action,userId,args:{startsAt:input.startsAt,expiresAt:input.expiresAt,actor,evidenceId},moneyTransferPerformed:false};}
  if(action==='checkout_clear'){if(input.confirmedAllCheckoutLinksUnpaidAndInvalid!==true)fail();return {action,userId,args:{actor,evidenceId},moneyTransferPerformed:false};}
  if(action==='refund_confirmed'){
    const cycle=await store.summary(userId);
    if(cycle.cycleId!==input.cycleId||!['refund_requested','refunded'].includes(cycle.status)||cycle.refundFen!==input.refundFen||input.confirmedMoneyReturned!==true)fail();
    return {action,userId,args:{cycleId:input.cycleId,refundFen:input.refundFen,evidenceId,actor},moneyTransferPerformed:false};
  }
  if(action!=='settle')fail();
  const operation=await store.execution(userId,input.key);
  let actualCredits=0,kind='unbilled';
  if(input.confirmedUnbilled===true&&input.calls?.length)fail();
  if(input.confirmedUnbilled!==true){
    if(!operation.pricing||!Array.isArray(input.calls)||!input.calls.length||input.calls.some(c=>c.evidence!=='provider_bill'||c.state!=='confirmed'))fail();
    const usage=meterPlusUsage({calls:input.calls,tariff:operation.pricing.tariff,creditCostMicros:operation.pricing.creditCostMicros,maxCredits:operation.credits});
    if(usage.billing!=='confirmed_usage')fail();
    actualCredits=usage.actualCredits;kind=input.taskOutcome==='completed'?'success':input.taskOutcome==='failed'?'partial_failure':fail();
  }
  return {action,userId,key:input.key,args:{kind,actualCredits,evidenceId,actor,pricingVersion:operation.pricingVersion},moneyTransferPerformed:false};
}
export async function applyPlusReconciliation(store,plan){
  if(plan.action==='period_confirmed')await store.confirmPeriod(plan.userId,plan.args);
  else if(plan.action==='checkout_clear')await store.clearCheckout(plan.userId,plan.args);
  else if(plan.action==='refund_confirmed')await store.refundConfirmed(plan.userId,plan.args);
  else if(plan.action==='settle')await store.manualSettle(plan.userId,plan.key,plan.args);
  else fail();
}
