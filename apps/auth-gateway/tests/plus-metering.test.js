import test from 'node:test';
import assert from 'node:assert/strict';
import {meterPlusUsage,plusRefundFen} from '../../../packages/api/src/plus-metering.mjs';
const rate=(priceMicros,perUnits)=>({priceMicros,perUnits,source:'fixture://not-production-price',checkedAt:'2026-10-31'});
const tariff={version:'test-only',validated:true,rates:{text:{input_non_cached:rate(1000000,1000000),input_cached:rate(100000,1000000),output_total:rate(2000000,1000000)},image:{charged_images:rate(200000,1)}}};
const call=(id,modelId,items)=>({receiptId:id,modelId,state:'confirmed',evidence:'provider_usage',items});
const run=calls=>meterPlusUsage({calls,tariff,creditCostMicros:10000,maxCredits:2000});
test('aggregate complete task once, including image billing and cached tokens',()=>{
 const result=run([call('text','text',[{unit:'input_non_cached',quantity:1000},{unit:'input_cached',quantity:1000},{unit:'output_total',quantity:1000}]),call('image','image',[{unit:'charged_images',quantity:1}])]);
 assert.equal(result.modelCostMicros,203100);assert.equal(result.actualCredits,21);
 assert.equal(run([call('a','text',[{unit:'input_non_cached',quantity:1}]),call('b','text',[{unit:'input_non_cached',quantity:1}])]).actualCredits,1);
});
test('unknown usage, duplicate receipts, missing prices and overrun cannot become an automatic charge',()=>{
 assert.equal(run([{state:'unknown'}]).billing,'unknown');
 const c=call('same','text',[{unit:'output_total',quantity:1}]);assert.throws(()=>run([c,c]),/EVIDENCE/);
 assert.throws(()=>run([call('reasoning','text',[{unit:'reasoning_tokens',quantity:1}])]),/UNITS/);
 assert.throws(()=>run([call('other','unknown',[{unit:'output_total',quantity:1}])]),/RATE/);
 assert.equal(run([call('large','image',[{unit:'charged_images',quantity:101}])]).billing,'over_reservation_review');
 assert.throws(()=>meterPlusUsage({calls:[],tariff:{...tariff,validated:false},creditCostMicros:10000,maxCredits:2000}),/NOT_VALIDATED/);
});
test('refund uses unused/2000 times 39 yuan, rounded to cents',()=>{
 assert.equal(plusRefundFen(2000),3900);assert.equal(plusRefundFen(1000),1950);assert.equal(plusRefundFen(1001),1952);assert.equal(plusRefundFen(0),0);assert.throws(()=>plusRefundFen(2001));
});
