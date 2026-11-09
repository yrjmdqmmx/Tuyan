import {createPlusReconciler} from '../../src/plus-reconciler.js';
import {inspectPlusLedger} from '../../src/plus-inspection.js';
import {createDeletionStore} from '../../src/account-deletion.js';
import {createPlusCoreExecutor} from '../../src/plus-executor.js';
import {planPlusReconciliation,applyPlusReconciliation} from '../../src/plus-reconciliation.js';
import {fixturePlusPricing,fixturePlusWorkspace} from '../../../../test-support/plus-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {MongoClient,ObjectId} from 'mongodb';
import express from 'express';
import {accountWorkspaceStore} from '../../src/workspace-lifecycle.js';
import {createPlusStore,PLUS_MUTATIONS} from '../../src/plus-store.js';
import {createPlusService,createPlusSimulationExecutor} from '../../src/plus-service.js';
import {createPlusRouter} from '../../src/plus-router.js';
const uri=process.env.PLUS_TEST_MONGO_URI;
test('Plus real Mongo transactional ledger and authenticated HTTP',{skip:!uri},async t=>{
  assert.match(uri,/^mongodb:\/\/127\.0\.0\.1:\d+\//);
  const client=new MongoClient(uri);await client.connect();const db=client.db('plus_test_'+new ObjectId().toHexString());
  let time=1000_000;const access={access:'granted',startsAt:900,expiresAt:2000};
  const factory=(maxConcurrent=1)=>accountWorkspaceStore({db,mongoClient:client,factory:opts=>createPlusStore({...opts,namespace:'sandbox:test',now:()=>time,maxConcurrent}),mutations:PLUS_MUTATIONS});
  const store=factory(),many=factory(10),seed=async user=>{await db.collection('user').insertOne({_id:user,email:user+'@example.test'});await store.reconcile(user,access);};
  const reservation=(key,credits=300)=>({key,credits,pricingVersion:'test-v1',fingerprint:'a'.repeat(64),spec:{path:'svg',mode:'fast'}});
  try{
    await t.test('parallel duplicate checks grant exactly once',async()=>{
      await db.collection('user').insertOne({_id:'grant'});await Promise.all(Array.from({length:12},()=>store.reconcile('grant',access)));
      assert.equal((await store.summary('grant')).available,2000);assert.equal(await db.collection('plusLedger').countDocuments({userId:'grant',kind:'grant'}),1);
    });
    await t.test('parallel reservations cannot overdraw and duplicate keys reserve once',async()=>{
      await seed('race');const results=await Promise.allSettled([many.reserve('race',reservation('op-a',1500)),many.reserve('race',reservation('op-b',1500))]);
      assert.equal(results.filter(x=>x.status==='fulfilled').length,1);const key=results[0].status==='fulfilled'?'op-a':'op-b';
      const repeats=await Promise.all(Array.from({length:6},()=>many.reserve('race',reservation(key,1500))));assert.ok(repeats.every(r=>!r.created));
      assert.equal((await store.summary('race')).available,500);assert.equal((await store.summary('race')).held,1500);await assert.rejects(many.reserve('race',reservation(key,1400)),/IDEMPOTENCY/);
    });
    await t.test('unknown requests retain holds and cannot redispatch',async()=>{
      await seed('unknown');await store.reserve('unknown',reservation('original'));assert.equal(await store.claimDispatch('unknown','original'),true);await store.markUnknown('unknown','original');
      assert.equal(await store.claimDispatch('unknown','original'),false);await assert.rejects(store.settle('unknown','original',{kind:'not_sent',evidenceId:'wrong'}),/MAY_HAVE_OCCURRED/);
      await assert.rejects(store.reserve('unknown',reservation('new-key')),/CONCURRENCY/);assert.equal((await store.summary('unknown')).held,300);
    });
    await t.test('settlement and compensation conserve credits and repeat safely',async()=>{
      await seed('settle');await store.reserve('settle',reservation('success'));await store.claimDispatch('settle','success');await store.acceptJob('settle','success','job-1');
      await Promise.all(Array.from({length:5},()=>store.settle('settle','success',{kind:'success',actualCredits:200,evidenceId:'job-1'})));
      let s=await store.summary('settle');assert.deepEqual([s.available,s.held,s.spent],[1800,0,200]);
      await store.reserve('settle',reservation('not-sent'));await store.settle('settle','not-sent',{kind:'not_sent',evidenceId:'admission'});
      s=await store.summary('settle');assert.deepEqual([s.available,s.held,s.spent],[1800,0,200]);await assert.rejects(store.settle('settle','success',{kind:'success',actualCredits:0,evidenceId:'job-1'}),/CONFLICT/);
    });
    await t.test('expired holds do not roll into the new cycle',async()=>{
      await seed('expiry');await store.reserve('expiry',reservation('late'));await store.claimDispatch('expiry','late');await store.acceptJob('expiry','late','late-job');
      time=2000_000;await assert.rejects(store.reserve('expiry',reservation('after-expiry')),/MEMBERSHIP/);await store.reconcile('expiry',{access:'granted',startsAt:2000,expiresAt:3000});
      // The new cycle has no hold, but an unresolved old-cycle task must still
      // be reconciled before accepting this account's refund request.
      await assert.rejects(store.requestRefund('expiry'),/RECONCILIATION/);
      await store.settle('expiry','late',{kind:'unbilled',evidenceId:'late-job'});const s=await store.summary('expiry');assert.deepEqual([s.available,s.held,s.spent],[2000,0,0]);
      await assert.rejects(store.reconcile('expiry',{access:'granted',startsAt:1900,expiresAt:3100}),/OVERLAPPING/);time=1000_000;
    });
    await t.test('failed tasks charge confirmed usage only; refund follows unused credit proportion',async()=>{
      await seed('partial');await store.reserve('partial',reservation('failed-task',1500));await store.claimDispatch('partial','failed-task');await store.acceptJob('partial','failed-task','partial-job');
      await assert.rejects(store.requestRefund('partial'),/RECONCILIATION/);
      await store.settle('partial','failed-task',{kind:'partial_failure',actualCredits:1000,evidenceId:'verified-usage'});
      const summary=await store.summary('partial');assert.deepEqual([summary.available,summary.held,summary.spent],[1000,0,1000]);
      const refund=await store.requestRefund('partial');assert.equal(refund.refundFen,1950);assert.deepEqual(await store.requestRefund('partial'),refund);
      await assert.rejects(store.reserve('partial',reservation('after-refund-request')),/MEMBERSHIP/);
      await assert.rejects(store.refundConfirmed('partial',{cycleId:refund.cycleId,evidenceId:'wrong-amount',refundFen:3900}),/NOT_RECONCILED/);
      await store.refundConfirmed('partial',{cycleId:refund.cycleId,evidenceId:'owner-verified-refund',refundFen:1950});assert.equal((await store.summary('partial')).status,'refunded');
    });
    await t.test('refunds and contradictory access cannot regrant; account deletion blocks mutations',async()=>{
      await seed('refund');const c=await store.summary('refund');const refund=await store.requestRefund('refund');assert.equal(refund.refundFen,3900);await store.refundConfirmed('refund',{cycleId:c.cycleId,evidenceId:'verified-refund',refundFen:3900});await store.reconcile('refund',access);
      assert.equal((await store.summary('refund')).status,'refunded');assert.equal((await store.summary('refund')).available,0);
      await seed('suspended');await store.reconcile('suspended',{access:'purchase_required'});await store.reconcile('suspended',access);assert.equal((await store.summary('suspended')).status,'suspended');
      await db.collection('accountDeletionOperations').insertOne({_id:'suspended'});await assert.rejects(store.reserve('suspended',reservation('delete-race')),/LIFECYCLE/);
    });
    await t.test('period anomaly freezes usage without deleting the grant; checks are rate limited',async()=>{
      await seed('period-review');await store.reserve('period-review',reservation('before-review'));await store.claimDispatch('period-review','before-review');await store.acceptJob('period-review','before-review','review-job');
      await store.flagPeriodReview('period-review',access);await store.flagPeriodReview('period-review',access);
      assert.equal((await store.summary('period-review')).status,'review_required');assert.equal((await store.summary('period-review')).available,0);
      await assert.rejects(store.reserve('period-review',reservation('blocked')),/MEMBERSHIP/);
      await store.settle('period-review','before-review',{kind:'partial_failure',actualCredits:100,evidenceId:'review-job-usage'});
      const quarantined=await db.collection('plusCycles').findOne({userId:'period-review'});assert.deepEqual([quarantined.available,quarantined.held,quarantined.spent],[1900,0,100]);
      assert.equal((await store.summary('period-review')).lockedCredits,1900);
      await store.reconcile('period-review',access);assert.equal((await store.summary('period-review')).status,'review_required');
      assert.equal(await db.collection('plusLedger').countDocuments({userId:'period-review',kind:'grant'}),1);
      for(let i=0;i<30;i++)await store.consumeRequest('period-review');await assert.rejects(store.consumeRequest('period-review'),/RATE_LIMIT/);
    });

    await t.test('cancel before admission leaves a tombstone, and cancellation cannot release a sent call',async()=>{
      await seed('cancel-race');await store.cancelUnclaimed('cancel-race','late-request');
      await assert.rejects(store.reserve('cancel-race',reservation('late-request')),e=>e.code==='PLUS_IDEMPOTENCY_CONFLICT');
      await store.reserve('cancel-race',reservation('reserved-request'));await store.cancelUnclaimed('cancel-race','reserved-request');assert.equal((await store.summary('cancel-race')).held,0);
      await store.reserve('cancel-race',reservation('sent-request'));await store.claimDispatch('cancel-race','sent-request');await assert.rejects(store.cancelUnclaimed('cancel-race','sent-request'));assert.equal((await store.summary('cancel-race')).held,300);
    });
    await t.test('platform period correction preserves spent credits and never issues another grant',async()=>{
      const oldTime=time;time=1793435000*1000;const user='period-correction',period={access:'granted',startsAt:1793434822,expiresAt:1798791622};
      await db.collection('user').insertOne({_id:user});await store.reconcile(user,period);await store.reserve(user,reservation('used-before-freeze'));await store.claimDispatch(user,'used-before-freeze');await store.acceptJob(user,'used-before-freeze','corrected-job');await store.settle(user,'used-before-freeze',{kind:'success',actualCredits:90,evidenceId:'corrected-job'});
      await store.flagPeriodReview(user,period);const original=await store.summary(user);
      const corrected={...period,expiresAt:1796026822};await store.reconcile(user,corrected);await store.reconcile(user,corrected);
      const after=await store.summary(user);assert.equal(after.cycleId,original.cycleId);assert.equal(after.available,1910);assert.equal(after.spent,90);assert.equal(after.status,'active');assert.equal(await db.collection('plusLedger').countDocuments({userId:user,kind:'grant'}),1);assert.equal(await db.collection('plusLedger').countDocuments({userId:user,kind:'period_corrected'}),1);time=oldTime;
    });
    await t.test('unexpected same-cycle changes freeze cached rights and require current evidence',async()=>{
      const oldTime=time;time=1793435000*1000;const user='period-flap',period={access:'granted',startsAt:1793434822,expiresAt:1796026822};await db.collection('user').insertOne({_id:user});await store.reconcile(user,period);
      await store.reconcile(user,{...period,expiresAt:period.expiresAt+86400});assert.equal((await store.summary(user)).status,'review_required');assert.equal((await store.summary(user)).available,0);
      await store.confirmPeriod(user,{startsAt:period.startsAt,expiresAt:period.expiresAt,actor:'fixture',evidenceId:'current-provider-proof'});assert.equal((await store.summary(user)).available,2000);
      await store.flagPeriodReview(user,{startsAt:period.startsAt,expiresAt:1798791622});assert.equal((await store.summary(user)).status,'review_required');assert.equal(await db.collection('plusLedger').countDocuments({userId:user,kind:'grant'}),1);time=oldTime;
    });
    await t.test('managed quotes bind actual input, settle frozen prices, and keep pricing out of public operations',async()=>{
      const user='managed';await seed(user);let submitted=0;
      const pricing=structuredClone(fixturePlusPricing),workspace=fixturePlusWorkspace(),spec={path:'svg',mode:'fast',kind:'generate',candidates:1,reviews:1};
      const config={enabled:true,environment:'sandbox',entitlementId:'test-ent',executionMode:'managed',modelExecutionEnabled:true,newTasksEnabled:true,pricing,bailianApiKey:'fixture-not-real'};
      const backend={call:async body=>{if(body.action==='health')return {status:200,data:{plusManagedContractVersion:1}};if(body.action==='createJob'){submitted++;return {status:200,data:{id:'managed-job'}};}return {status:200,data:{job:{id:'managed-job',userId:user,status:'completed',result_images:[],plusUsage:{complete:true,operationKey:workspace.runId,pricingVersion:pricing.version,calls:[{provider:'bailian',model:'qwen3.8-flash',workflowStepId:'managed-step',requestId:'managed-receipt',usage:{prompt_tokens:100,prompt_tokens_details:{cached_tokens:0},completion_tokens:200}}]}}}};}};
      const executor=createPlusCoreExecutor({backend,config,workspaceStore:{get:async()=>({state:{tasks:[{id:workspace.taskId,activeRunId:workspace.runId,runs:[{id:workspace.runId,status:'submitting'}]}]}})}});
      const service=createPlusService({config,store,payment:{access:async()=>access},secret:'fixture-secret',executor,now:()=>time});
      const quote=await service.quote(user,{...spec,workspace});
      await assert.rejects(service.submit(user,{key:workspace.runId,quote:quote.token,spec,workspace:{...workspace,request:{...workspace.request,requirements:'changed after approval'}}}),e=>e.code==='PLUS_QUOTE_MISMATCH');assert.equal((await store.summary(user)).held,0);
      await service.submit(user,{key:workspace.runId,quote:quote.token,spec,workspace});assert.equal((await store.operation(user,workspace.runId)).pricing,undefined);assert.equal((await store.pending(user))[0].pricing,undefined);
      config.pricing={...pricing,version:'changed-after-dispatch',creditCostMicros:1};const result=await service.poll(user,workspace.runId);assert.equal(result.operation.settlement.actualCredits,1);assert.equal(result.operation.settlement.modelCostMicros,500);await service.poll(user,workspace.runId);assert.equal(submitted,1);assert.equal((await store.summary(user)).available,1999);
    });
    await t.test('lost submit response recovers the original Core operation without submitting again',async()=>{
      const user='recover-core';await seed(user);let calls=0;
      const executor={submit:async()=>{calls++;throw Error('lost response');},find:async()=> 'original-core-job',get:async()=>({id:'original-core-job',status:'completed',billing:'simulation_usage',actualCredits:60})};
      const config={environment:'sandbox',entitlementId:'test-ent',executionMode:'simulation',newTasksEnabled:true};const service=createPlusService({config,store,payment:{access:async()=>access},secret:'fixture-secret',executor,now:()=>time});
      const spec={path:'svg',mode:'fast'},quote=await service.quote(user,spec);await assert.rejects(service.submit(user,{key:'unknown-submit',quote:quote.token,spec}),e=>e.code==='PLUS_SUBMISSION_UNKNOWN');
      const result=await service.poll(user,'unknown-submit');assert.equal(result.operation.status,'settled');assert.equal(result.operation.jobId,'original-core-job');assert.equal(calls,1);assert.equal((await store.summary(user)).available,1940);
    });
    await t.test('background tick grants a paid checkout and settles an original job without a browser',async()=>{
      const store=accountWorkspaceStore({db,mongoClient:client,factory:opts=>createPlusStore({...opts,namespace:'sandbox:background',now:()=>time}),mutations:PLUS_MUTATIONS});
      const buyer='background-buyer',user='background-job';await db.collection('user').insertOne({_id:buyer});await store.noteCheckout(buyer);await db.collection('user').insertOne({_id:user});await store.reconcile(user,access);
      const qConfig={environment:'sandbox',executionMode:'simulation',newTasksEnabled:true,newPurchasesEnabled:true},service=createPlusService({config:qConfig,store,payment:{access:async()=>access},secret:'fixture',executor:createPlusSimulationExecutor()}),spec={path:'svg',mode:'fast'};
      const quote=await service.quote(user,spec);await service.submit(user,{key:'background-original',quote:quote.token,spec});
      const worker=createPlusReconciler({service,store});await worker.tick();await worker.stop();assert.equal((await store.summary(buyer)).available,2000);assert.equal((await store.summary(user)).spent,60);assert.equal((await store.operation(user,'background-original')).status,'settled');assert.equal(await db.collection('plusLedger').countDocuments({userId:buyer,kind:'grant'}),1);
    });
    await t.test('manual settlement can recover a late original result without a second charge',async()=>{
      const user='late-manual';await db.collection('user').insertOne({_id:user});await store.reconcile(user,access);
      await store.reserve(user,{key:'manual-late-run',fingerprint:'f'.repeat(64),credits:120,pricingVersion:'fixture',spec:{path:'svg',mode:'balanced',kind:'generate',candidates:1,reviews:1}});await store.claimDispatch(user,'manual-late-run');await store.markUnknown(user,'manual-late-run');
      await store.manualSettle(user,'manual-late-run',{kind:'success',actualCredits:60,evidenceId:'audited-terminal-provider-bill',actor:'fixture-reviewer',pricingVersion:'fixture'});
      const service=createPlusService({config:{environment:'sandbox',executionMode:'simulation'},store,payment:{},secret:'fixture',executor:{find:async()=> 'late-original-job',get:async()=>({status:'completed',billing:'confirmed_usage',actualCredits:60,result_images:[]})}});
      const result=await service.poll(user,'manual-late-run');assert.equal(result.operation.status,'settled');assert.equal(result.operation.jobId,'late-original-job');assert.equal(result.operation.settlement.evidenceId,'audited-terminal-provider-bill');assert.equal((await store.summary(user)).spent,60);assert.equal(await db.collection('plusLedger').countDocuments({userId:user,kind:'settle'}),1);
    });
    await t.test('operator reconciliation and refund confirmation are auditable and repeat safely',async()=>{
      const user='operator';await seed(user);await store.reserve(user,reservation('review-task'));await store.claimDispatch(user,'review-task');await store.markUnknown(user,'review-task');
      const plan=await planPlusReconciliation(store,{action:'settle',userId:user,key:'review-task',actor:'local-fixture-operator',evidenceId:'fixture-provider-unbilled-confirmation',confirmedUnbilled:true});await applyPlusReconciliation(store,plan);await applyPlusReconciliation(store,plan);assert.equal((await store.summary(user)).available,2000);
      const request=await store.requestRefund(user);const refund=await planPlusReconciliation(store,{action:'refund_confirmed',userId:user,actor:'local-fixture-operator',evidenceId:'fixture-refund-proof',cycleId:request.cycleId,refundFen:3900,confirmedMoneyReturned:true});await applyPlusReconciliation(store,refund);await applyPlusReconciliation(store,refund);assert.equal((await store.summary(user)).status,'refunded');assert.equal(await db.collection('plusLedger').countDocuments({userId:user,kind:'refund_confirmed'}),1);
    });
    await t.test('account deletion shares the write lock and rejects open payment/benefit records',async()=>{
      const deletion=createDeletionStore(db.collection('accountDeletionOperations'),()=>new Date(time),{mongoClient:client,users:db.collection('user'),plusCycles:db.collection('plusCycles'),plusOperations:db.collection('plusOperations'),plusAccounts:db.collection('plusAccounts')});
      await seed('delete-paid');await assert.rejects(deletion.begin('delete-paid'),e=>e.code==='PLUS_ACCOUNT_SETTLEMENT_REQUIRED');assert.equal(await deletion.get('delete-paid'),null);
      await db.collection('user').insertOne({_id:'delete-checkout'});await store.noteCheckout('delete-checkout');await assert.rejects(deletion.begin('delete-checkout'),e=>e.code==='PLUS_ACCOUNT_SETTLEMENT_REQUIRED');
      await store.clearCheckout('delete-checkout',{actor:'fixture-operator',evidenceId:'all-fixture-links-invalid-and-unpaid'});assert.equal((await deletion.begin('delete-checkout')).status,'pending');
    });
    await t.test('existing suspended/refund cycles cannot receive a second purchase link',async()=>{
      const monthly={access:'granted',startsAt:900,expiresAt:900+30*86400},user='repurchase';
      await db.collection('user').insertOne({_id:user});await store.reconcile(user,monthly);
      const service=createPlusService({config:{newPurchasesEnabled:true},store,payment:{access:async()=>({access:'purchase_required',purchaseUrl:'https://pay.watcha.cn/fixture'})},secret:'fixture',now:()=>time});
      for(let i=0;i<2;i++){
        const blocked=await service.check(user);assert.equal(blocked.purchaseBlocked,true);assert.equal(blocked.purchaseUrl,undefined);
        assert.equal(await store.checkoutPending(user),false);
        await store.confirmPeriod(user,{...monthly,actor:'operator',evidenceId:'independent-period-proof-'+i});
      }
      assert.equal(await db.collection('plusLedger').countDocuments({userId:user,kind:'suspended'}),2);
      const refund=await store.requestRefund(user);assert.equal((await service.check(user)).purchaseBlocked,true);
      await store.refundConfirmed(user,{cycleId:refund.cycleId,refundFen:3900,evidenceId:'returned'});assert.equal((await service.check(user)).purchaseBlocked,true);
      await db.collection('user').insertOne({_id:'new-checkout'});assert.ok((await service.check('new-checkout')).purchaseUrl);assert.equal((await service.status('new-checkout')).checkoutPending,true);
    });
    await t.test('ledger pagination crosses 100 rows without exposing another account or operator evidence',async()=>{
      await seed('history');await seed('history-other');
      await db.collection('plusLedger').insertMany(Array.from({length:130},(_,i)=>({_id:'history-'+String(i).padStart(4,'0'),userId:'history',namespace:'sandbox:test',kind:'period_review',at:time,availableDelta:0,heldDelta:0,evidenceId:'private-proof',reviewedBy:'private-operator',modelCostMicros:123})));
      const rows=[];let cursor;do{const page=await store.history('history',{cursor});rows.push(...page.entries);cursor=page.nextCursor||undefined;}while(cursor);
      assert.equal(rows.length,131);assert.equal(new Set(rows.map(x=>x.entryId)).size,131);assert.ok(rows.every(x=>!('userId'in x)&&!('evidenceId'in x)&&!('reviewedBy'in x)&&!('modelCostMicros'in x)));
      const foreign=(await store.history('history')).nextCursor;const other=await store.history('history-other',{cursor:foreign});assert.ok(other.entries.every(x=>!String(x.entryId).startsWith('history-')));
      await assert.rejects(store.history('history',{cursor:'not-json'}),/INVALID_HISTORY/);await assert.rejects(store.history('history',{limit:1000}),/INVALID_HISTORY/);
    });
    await t.test('read rate limits are separate from writes and the review queue includes frozen periods',async()=>{
      await seed('read-limit');for(let i=0;i<90;i++)await store.consumeRequest('read-limit','read');await assert.rejects(store.consumeRequest('read-limit','read'),e=>e.status===429);await store.consumeRequest('read-limit');
      await store.flagPeriodReview('read-limit',{startsAt:access.startsAt,expiresAt:access.expiresAt+62*86400});assert.ok((await store.reviewQueue()).periods.some(p=>p.userId==='read-limit'));
    });
    await t.test('read-only inspection reports orphan holds and incorrect balances without changing data',async()=>{
      const namespace='sandbox:inspection',inspector=accountWorkspaceStore({db,mongoClient:client,factory:opts=>createPlusStore({...opts,namespace,now:()=>time}),mutations:PLUS_MUTATIONS});
      await db.collection('user').insertOne({_id:'inspect'});await inspector.reconcile('inspect',access);
      let report=await inspectPlusLedger(db,namespace,{now:time});assert.deepEqual(report.alerts,[]);assert.equal(report.cycles,1);
      await inspector.reserve('inspect',reservation('inspection'));await inspector.claimDispatch('inspect','inspection');await inspector.markUnknown('inspect','inspection');
      report=await inspectPlusLedger(db,namespace,{now:time});assert.ok(report.alerts.includes('task_reconciliation_required'));assert.equal(report.holdMismatches,0);
      await db.collection('plusCycles').updateOne({namespace},{$inc:{available:1}});
      const before=await inspector.summary('inspect');report=await inspectPlusLedger(db,namespace,{now:time});assert.equal(report.balanceMismatches,1);assert.ok(report.alerts.includes('ledger_inconsistent'));assert.deepEqual(await inspector.summary('inspect'),before);
      assert.ok(!JSON.stringify(report).includes('"userId"'));
      await db.collection('plusCycles').updateOne({namespace},{$inc:{available:-1,spent:1}});
      assert.equal((await inspectPlusLedger(db,namespace,{now:time})).balanceMismatches,1,'spent must match settled ledger charges');
      await db.collection('plusCycles').updateOne({namespace},{$inc:{spent:-1}});
      assert.equal((await inspectPlusLedger(db,namespace,{now:time})).balanceMismatches,0);
      await db.collection('plusOperations').insertOne({_id:'orphan-fixture',namespace,cycleId:'missing-cycle',status:'unknown',credits:1,createdAt:time});
      assert.equal((await inspectPlusLedger(db,namespace,{now:time})).holdMismatches,1);
    });
    await t.test('HTTP flow binds identity, rejects tampering and submits once',async()=>{
      await seed('http');let submits=0;const simulation=createPlusSimulationExecutor(),config={enabled:true,environment:'sandbox',entitlementId:'ent-test',executionMode:'simulation',newPurchasesEnabled:true,newTasksEnabled:true,paymentConfigured:true};
      const service=createPlusService({config,store,payment:{access:async()=>access},secret:'isolated-test-secret',now:()=>time,executor:{...simulation,submit:async p=>{submits++;return simulation.submit(p);}}});
      const app=express();app.use('/api/plus',createPlusRouter({auth:{optionalSession:async req=>req.get('cookie')==='fixture=http'?{user:{id:'http'}}:null},service,config,frontendOrigins:['http://127.0.0.1']}));
      const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/api/plus`,headers={cookie:'fixture=http','X-Workspace-Account':'http','Content-Type':'application/json',origin:'http://127.0.0.1'};
      const post=(path,body)=>fetch(base+path,{method:'POST',headers,body:JSON.stringify(body)});
      try{
        assert.equal((await fetch(base+'/account')).status,401);assert.equal((await fetch(base+'/account',{headers:{...headers,'X-Workspace-Account':'other'}})).status,409);assert.equal((await fetch(base+'/account',{headers:{...headers,origin:'https://evil.test'}})).status,403);
        assert.equal((await fetch(base+'/ledger')).status,401);assert.equal((await fetch(base+'/ledger?cursor=bad',{headers})).status,400);assert.equal((await (await fetch(base+'/ledger',{headers})).json()).entries.length,1);
        const spec={path:'svg',mode:'fast'},q=await (await post('/quote',spec)).json();assert.equal(q.simulation,true);assert.equal((await post('/jobs',{key:'tampered',quote:q.token+'x',spec})).status,400);
        const body={key:'http-original',quote:q.token,spec};const responses=await Promise.all([post('/jobs',body),post('/jobs',body)]);assert.ok(responses.every(r=>r.ok));assert.equal(submits,1);
        const result=await (await fetch(base+'/jobs/http-original',{headers})).json();assert.equal(result.operation.status,'settled');assert.equal(result.job.simulation,true);
        config.newTasksEnabled=false;config.newPurchasesEnabled=false;
        assert.equal((await post('/quote',spec)).status,503);
        assert.equal((await post('/jobs',{...body,key:'paused-new-key'})).status,409);
        assert.equal((await post('/jobs',body)).status,200);
        await fetch(base+'/jobs/http-original',{headers});assert.equal((await store.summary('http')).spent,60);assert.equal(submits,1);
        assert.equal((await post('/refund/request',{})).status,200);
      }finally{await new Promise(r=>server.close(r));}
    });
  }finally{await db.dropDatabase();await client.close();}
});
