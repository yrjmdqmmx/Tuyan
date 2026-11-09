import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPlusConfig} from '../src/plus-config.js';
import {createPlusWatcha,normalizeWatchaAccess,safePurchaseUrl} from '../src/plus-watcha.js';
import {PLUS_PRESETS,plusSimulationQuote} from '../../../packages/api/src/plus.mjs';
import {fixturePlusPricing} from '../../../test-support/plus-fixture.mjs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('Plus defaults off; live is admin-only, isolated and never simulated',()=>{
  assert.equal(loadPlusConfig({}).enabled,false);
  assert.throws(()=>loadPlusConfig({PLUS_ENABLED:'true',PLUS_PAYMENT_ENVIRONMENT:'live'}),/ADMIN_ONLY/);
  assert.throws(()=>loadPlusConfig({PLUS_ENABLED:'true',NODE_ENV:'production'}),/REQUIRES_LIVE/);
  const live={PLUS_ENABLED:'true',NODE_ENV:'production',PLUS_PAYMENT_ENVIRONMENT:'live',PLUS_ADMIN_ONLY:'true'};
  assert.equal(loadPlusConfig(live).adminOnly,true);
  assert.equal(loadPlusConfig({...live,PLUS_WATCHA_SANDBOX_API_KEY:'sandbox-only',PLUS_WATCHA_SANDBOX_ENTITLEMENT_ID:'sandbox'}).paymentConfigured,false);
  assert.throws(()=>loadPlusConfig({...live,PLUS_EXECUTION_MODE:'simulation'}),/SIMULATION_LOCAL_ONLY/);
  assert.throws(()=>loadPlusConfig({...live,PLUS_NEW_PURCHASES_ENABLED:'true'}),/LIVE_NOT_READY/);
  assert.throws(()=>loadPlusConfig({...live,PLUS_NEW_TASKS_ENABLED:'true'}),/LIVE_NOT_READY/);
  assert.throws(()=>loadPlusConfig({...live,PLUS_PAYMENT_RETURN_URL:'http://tuyansci.cn'}),/INVALID_RETURN_URL/);
  assert.throws(()=>loadPlusConfig({PLUS_EXECUTION_MODE:'paid'}),/NOT_VALIDATED/);
  assert.equal(loadPlusConfig({PLUS_ENABLED:'true'}).paymentConfigured,false);
});
test('prepared model configuration cannot change the approved one-cent credit conversion',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'plus-conversion-')),path=join(dir,'synthetic.json');
 const env={PLUS_ENABLED:'true',PLUS_EXECUTION_MODE:'managed',PLUS_MODEL_EXECUTION_ENABLED:'true',PLUS_BAILIAN_API_KEY:'fixture-only',PLUS_PRICING_FILE:path};
 try{
  await writeFile(path,JSON.stringify(fixturePlusPricing));assert.throws(()=>loadPlusConfig(env),/CONVERSION_MISMATCH/);
  await writeFile(path,JSON.stringify({...fixturePlusPricing,creditCostMicros:10000}));assert.equal(loadPlusConfig(env).pricing.creditCostMicros,10000);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('duration timestamps and link schemes validate; quota is rejected',()=>{
  const monthEnd=100+30*86400;assert.deepEqual(normalizeWatchaAccess({access:'granted',entitlement:{type:'duration',starts_at:100,expires_at:monthEnd}},500),{access:'granted',startsAt:100,expiresAt:monthEnd});
  assert.throws(()=>normalizeWatchaAccess({access:'granted',entitlement:{type:'duration',starts_at:1793434822,expires_at:1798791622}},1793435000),e=>e.code==='PLUS_PAYMENT_PERIOD_REVIEW');
  for(const data of [{access:'granted',entitlement:{type:'quota',remaining:2000}},{access:'granted',entitlement:{type:'duration',starts_at:100,expires_at:1000}},{access:'nonsense'}])assert.throws(()=>normalizeWatchaAccess(data,2000));
  assert.match(safePurchaseUrl('alipays://platformapi/startapp?x=1'),/^alipays:/);
  for(const url of ['javascript:alert(1)','data:text/html,bad','https://key@evil.test','alipays://evil/path'])assert.throws(()=>safePurchaseUrl(url));
});
test('access binds stable identity and does not retry uncertainty or call consume',async()=>{
  const calls=[],config={enabled:true,environment:'sandbox',paymentConfigured:true,apiKey:'fixture-only-secret',entitlementId:'ent-test',returnUrl:'http://127.0.0.1:5173/'};
  const client=createPlusWatcha({config,fetchImpl:async(url,init)=>{calls.push({url,init});return Response.json({access:'purchase_required',entitlement:{type:'duration'},purchase:{url:'https://pay.watcha.cn/test'}});}});
  assert.equal((await client.access('stable-user')).access,'purchase_required');assert.equal(calls[0].url,'https://pay.watcha.cn/v1/entitlements/access');
  assert.deepEqual(JSON.parse(calls[0].init.body),{entitlement_id:'ent-test',user_id:'stable-user',return_url:'http://127.0.0.1:5173/'});assert.equal(calls[0].init.redirect,'error');
  let attempts=0;const uncertain=createPlusWatcha({config,fetchImpl:async()=>{attempts++;throw Error('timeout fixture-only-secret');}});
  await assert.rejects(uncertain.access('stable-user'),e=>e.code==='PLUS_PAYMENT_CHECK_UNKNOWN'&&!e.message.includes(config.apiKey));assert.equal(attempts,1);
});
test('presets retain approved budgets; pricing stays simulation-only',()=>{
  assert.equal(PLUS_PRESETS.extreme.svgThinkingBudgets.code,8192);assert.equal(PLUS_PRESETS.balanced.pngThinkingBudget,1024);
  assert.equal(plusSimulationQuote({path:'svg',mode:'fast'}).simulation,true);assert.throws(()=>plusSimulationQuote({candidates:1.5}));assert.throws(()=>plusSimulationQuote({reviews:0}));
});
