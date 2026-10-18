import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthRateLimitStorage} from '../src/auth-rate-limit-storage.js';

function fixture() {
  let time=0;const rows=new Map(),legacy=new Map(), writes=[];
  const db={collection:name=>name==='sessionReadRateLimit'?{
    async findOne({_id}){return rows.get(_id)||null;},
    async updateOne({_id},change){const row=rows.get(_id)||{...change.$setOnInsert,count:0};row.count+=change.$inc.count;rows.set(_id,row);},
  }:{async findOne({key}){return legacy.get(key)||null;},async insertOne(row){legacy.set(row.key,row);writes.push(row);},async updateMany({key},{$set}){Object.assign(legacy.get(key),$set);writes.push($set);}}};
  const store=createAuthRateLimitStorage(db,()=>time);
  // Same request/response decisions as the installed Better Auth limiter.
  async function request(key='client|/get-session'){
    const before=await store.get(key);if(before&&time-before.lastRequest<60000&&before.count>=100)return 429;
    const current=await store.get(key),count=current&&time-current.lastRequest<60000?current.count+1:1;
    await store.set(key,{key,count,lastRequest:time},!!current);return 200;
  }
  return {store,request,rows,writes,advance:ms=>{time+=ms;}};
}
test('steady session polling across two hours never accumulates into a false 429',async()=>{
  const f=fixture();for(let i=0;i<480;i++){assert.equal(await f.request(),200);f.advance(15000);}
  assert.ok([...f.rows.values()].every(r=>r.count<=4));
});
test('a true burst is still limited at 100, and the next fixed minute resets without requiring idle time',async()=>{
  const f=fixture();for(let i=0;i<100;i++){assert.equal(await f.request(),200);f.advance(500);}
  assert.equal(await f.request(),429);f.advance(10001);assert.equal(await f.request(),200);
});
test('concurrent responses count atomically and the storage key contains no raw client IP',async()=>{
  const f=fixture();await Promise.all(Array.from({length:40},()=>f.store.set('192.0.2.1|/get-session',{count:1,lastRequest:0})));
  assert.equal((await f.store.get('192.0.2.1|/get-session')).count,40);assert.doesNotMatch([...f.rows.keys()].join(),/192\.0\.2/);
});
test('sensitive auth routes retain their original database count and last-request semantics',async()=>{
  const f=fixture();for(const path of ['/sign-in/email','/request-password-reset','/change-password']){
    const key='client|'+path;await f.store.set(key,{count:1,lastRequest:100},false);
    await f.store.set(key,{count:2,lastRequest:150},true);assert.deepEqual(await f.store.get(key),{key,count:2,lastRequest:150});
  }assert.equal(f.rows.size,0);
});
