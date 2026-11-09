import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlusReconciler} from '../src/plus-reconciler.js';
test('background reconciliation coalesces ticks and only queries original payment/task identity',async()=>{
 let unblock;const gate=new Promise(r=>{unblock=r}),calls=[],attempts=[];
 const worker=createPlusReconciler({store:{reconciliationBatch:async()=>({operations:[{userId:'u',key:'original'}],checkouts:[{userId:'buyer'}]}),recordReconciliationAttempt:async(...x)=>attempts.push(x)},service:{poll:async(...x)=>{calls.push(['poll',...x]);await gate;},check:async(...x)=>calls.push(['check',...x]),submit:()=>assert.fail('must never resubmit')},logger:{warn:()=>assert.fail('unexpected warning')}});
 const first=worker.tick(),second=worker.tick();assert.equal(first,second);unblock();await first;
 assert.deepEqual(calls,[['poll','u','original'],['check','buyer',{exposePurchase:false}]]);assert.equal(attempts.length,2);await worker.stop();await worker.tick();assert.equal(calls.length,2);
});
test('unknown result backs off, never retries submission, and does not block other buyers',async()=>{
 const attempts=[],checks=[];const worker=createPlusReconciler({store:{reconciliationBatch:async()=>({operations:[{userId:'u',key:'unknown'}],checkouts:[{userId:'buyer'}]}),recordReconciliationAttempt:async(user,value)=>attempts.push({user,...value})},service:{poll:async()=>{throw Error('timeout');},check:async user=>checks.push(user),submit:()=>assert.fail('must never resubmit')}});
 await worker.tick();await worker.stop();assert.equal(attempts[0].delayMs,300000);assert.equal(attempts[0].failed,true);assert.deepEqual(checks,['buyer']);
});
test('a successful query with unresolved billing still backs off',async()=>{
 const attempts=[];const worker=createPlusReconciler({store:{reconciliationBatch:async()=>({operations:[{userId:'u',key:'unknown'}],checkouts:[]}),recordReconciliationAttempt:async(_u,v)=>attempts.push(v)},service:{poll:async()=>({operation:{status:'unknown'}})}});
 await worker.tick();await worker.stop();assert.equal(attempts[0].delayMs,300000);assert.equal(attempts[0].failed,true);
});

test('stale unclaimed holds use atomic cancellation; possibly sent requests remain query-only',async()=>{
 const calls=[];const worker=createPlusReconciler({now:()=>600000,store:{reconciliationBatch:async()=>({operations:[{userId:'u',key:'unsent',status:'reserved',createdAt:1},{userId:'u',key:'uncertain',status:'submitting',createdAt:1}],checkouts:[]}),recordReconciliationAttempt:async()=>{}},service:{cancelUnsent:async(_u,key)=>calls.push(['cancel',key]),poll:async(_u,key)=>calls.push(['query',key])}});
 await worker.tick();await worker.stop();assert.deepEqual(calls,[['cancel','unsent'],['query','uncertain']]);
});
