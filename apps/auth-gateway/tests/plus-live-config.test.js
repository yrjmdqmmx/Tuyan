import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadPlusConfig} from '../src/plus-config.js';
import {fixturePlusPricing} from '../../../test-support/plus-fixture.mjs';
test('live pilot fails closed for public users, sandbox fallback and unready commerce',()=>{
 const base={NODE_ENV:'production',PLUS_ENABLED:'true',PLUS_ADMIN_ONLY:'true',PLUS_PAYMENT_ENVIRONMENT:'live'};
 assert.equal(loadPlusConfig(base).paymentConfigured,false);
 assert.throws(()=>loadPlusConfig({...base,PLUS_ADMIN_ONLY:'false'}),/ADMIN_ONLY_REQUIRED/);
 assert.throws(()=>loadPlusConfig({...base,PLUS_PAYMENT_ENVIRONMENT:'sandbox'}),/PRODUCTION_REQUIRES_LIVE/);
 assert.throws(()=>loadPlusConfig({...base,PLUS_EXECUTION_MODE:'simulation'}),/SIMULATION/);
 assert.throws(()=>loadPlusConfig({...base,PLUS_PAYMENT_RETURN_URL:'http://localhost/'}),/RETURN_URL/);
 const sandbox={...base,PLUS_WATCHA_SANDBOX_API_KEY:'sandbox-fixture',PLUS_WATCHA_SANDBOX_ENTITLEMENT_ID:'sandbox-ent',PLUS_PAYMENT_RETURN_URL:'https://tuyansci.cn/?view=account&section=account'};
 assert.equal(loadPlusConfig(sandbox).apiKey,'');assert.equal(loadPlusConfig(sandbox).entitlementId,'');
 for(const key of ['PLUS_NEW_PURCHASES_ENABLED','PLUS_NEW_TASKS_ENABLED'])assert.throws(()=>loadPlusConfig({...sandbox,[key]:'true',PLUS_LIVE_COMMERCE_READY:'true'}),/LIVE_NOT_READY/);
});
test('opening administrator commerce requires separate live resources and validated managed execution',()=>{
 const dir=mkdtempSync(join(tmpdir(),'tuyan-plus-config-'));try{
  const file=join(dir,'pricing.json');writeFileSync(file,JSON.stringify({...fixturePlusPricing,creditCostMicros:10000}));
  const base={NODE_ENV:'production',PLUS_ENABLED:'true',PLUS_ADMIN_ONLY:'true',PLUS_PAYMENT_ENVIRONMENT:'live',PLUS_EXECUTION_MODE:'managed',PLUS_MODEL_EXECUTION_ENABLED:'true',PLUS_BAILIAN_API_KEY:'fixture-only',PLUS_PRICING_FILE:file,PLUS_WATCHA_LIVE_API_KEY:'live-fixture',PLUS_WATCHA_LIVE_ENTITLEMENT_ID:'live-ent',PLUS_PAYMENT_RETURN_URL:'https://tuyansci.cn/?view=account&section=account',PLUS_NEW_PURCHASES_ENABLED:'true',PLUS_NEW_TASKS_ENABLED:'true'};
  assert.throws(()=>loadPlusConfig(base),/LIVE_NOT_READY/);
  const enabled=loadPlusConfig({...base,PLUS_LIVE_COMMERCE_READY:'true'});assert.equal(enabled.modelExecutionEnabled,true);assert.equal(enabled.apiKey,'live-fixture');assert.equal(enabled.adminOnly,true);
  assert.throws(()=>loadPlusConfig({...base,PLUS_LIVE_COMMERCE_READY:'true',PLUS_MODEL_EXECUTION_ENABLED:'false'}),/LIVE_NOT_READY/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
