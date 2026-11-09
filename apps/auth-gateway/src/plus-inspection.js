// Read-only financial inspection. Use a snapshot session for a consistent report.
// Outputs counts/ages only; user identifiers, prompts, keys and receipts stay private.
export async function inspectPlusLedger(db,namespace,{now=Date.now(),session}={}){
  const options=session?{session}:{};
  const grouped=async(name,match,group)=>db.collection(name).aggregate([{$match:{namespace,...match}},{$group:group}],options).toArray();
  const pending=['reserved','submitting','running','unknown'];
  // MongoDB transactions do not support parallel operations on one session.
  const ledger=await grouped('plusLedger',{}, {_id:'$cycleId',available:{$sum:'$availableDelta'},held:{$sum:'$heldDelta'},spent:{$sum:'$charged'},grants:{$sum:{$cond:[{$eq:['$kind','grant']},1,0]}}});
  const holds=await grouped('plusOperations',{status:{$in:pending}}, {_id:'$cycleId',credits:{$sum:'$credits'},count:{$sum:1},oldest:{$min:'$createdAt'},unknown:{$sum:{$cond:[{$eq:['$status','unknown']},1,0]}}});
  const cycles=await db.collection('plusCycles').find({namespace},{...options,projection:{_id:1,status:1,available:1,held:1,spent:1,refundRequestedAt:1}}).toArray();
  const checkouts=await grouped('plusAccounts',{checkoutPending:true},{_id:null,count:{$sum:1},oldest:{$min:'$checkoutIssuedAt'}});
  const amounts=new Map(ledger.map(x=>[x._id,x])),reservations=new Map(holds.map(x=>[x._id,x]));
  const summary={checkedAt:new Date(now).toISOString(),cycles:cycles.length,pendingOperations:0,unknownOperations:0,pendingCheckouts:checkouts[0]?.count||0,refundRequests:0,periodReviews:0,balanceMismatches:0,grantMismatches:0,holdMismatches:0,oldestOperationAgeSeconds:0,oldestCheckoutAgeSeconds:0,oldestRefundAgeSeconds:0};
  const age=value=>Number.isFinite(value)?Math.max(0,Math.floor((now-value)/1000)):0;
  for(const c of cycles){
    const l=amounts.get(c._id),h=reservations.get(c._id);
    if(![c.available,c.held,c.spent].every(x=>Number.isSafeInteger(x)&&x>=0)||l?.available!==c.available||l?.held!==c.held||l?.spent!==c.spent)summary.balanceMismatches++;
    if(l?.grants!==1)summary.grantMismatches++;
    if((h?.credits||0)!==c.held)summary.holdMismatches++;
    if(['suspended','review_required'].includes(c.status))summary.periodReviews++;
    if(c.status==='refund_requested'){summary.refundRequests++;summary.oldestRefundAgeSeconds=Math.max(summary.oldestRefundAgeSeconds,age(c.refundRequestedAt));}
    reservations.delete(c._id);amounts.delete(c._id);
  }
  // Orphan financial rows cannot disappear from a nominally healthy report.
  summary.holdMismatches+=reservations.size;summary.balanceMismatches+=amounts.size;
  for(const h of holds){summary.pendingOperations+=h.count;summary.unknownOperations+=h.unknown;summary.oldestOperationAgeSeconds=Math.max(summary.oldestOperationAgeSeconds,age(h.oldest));}
  summary.oldestCheckoutAgeSeconds=age(checkouts[0]?.oldest);
  const alerts=[];
  if(summary.balanceMismatches||summary.grantMismatches||summary.holdMismatches)alerts.push('ledger_inconsistent');
  if(summary.periodReviews)alerts.push('membership_review_required');
  if(summary.unknownOperations||summary.oldestOperationAgeSeconds>1800)alerts.push('task_reconciliation_required');
  if(summary.oldestCheckoutAgeSeconds>1800)alerts.push('payment_reconciliation_required');
  if(summary.refundRequests)alerts.push('refund_review_required');
  return {...summary,alerts,readOnly:true};
}
