import test from 'node:test'
import assert from 'node:assert/strict'
import {plusResponseFormat} from '../src/plus-response-format.js'
import {boundedPlusTransport} from '../src/plus-budget.js'
import {fixturePlusPricing as pricing} from '../../../test-support/plus-fixture.mjs'
const wire=(system:string,images=false)=>({model:'qwen3.8-flash',messages:[{role:'system',content:system},{role:'user',content:images?[{type:'text',text:'synthetic'},{type:'image_url',image_url:{url:'data:image/png;base64,AAAA'}}]:'synthetic'}],enable_thinking:true,thinking_budget:1024,stream:true})
test('managed review schema requires all evidence sections; raw SVG and user instructions cannot select it',()=>{
 const review:any=plusResponseFormat(wire('PNG visual review AFTER generation'));
 assert.equal(review.type,'json_schema');assert.equal(review.json_schema.strict,true);
 for(const key of ['numericReview','visualAdjudications','uncertainties'])assert.ok(review.json_schema.schema.required.includes(key));
 assert.ok(review.json_schema.schema.properties.numericReview.required.includes('checks'));
 const raw=wire('SVG Diagram Agent');raw.messages[1].content='PNG visual review AFTER generation';assert.equal(plusResponseFormat(raw),undefined);
 assert.equal(plusResponseFormat(wire('Lead Visual Designer: Output ONLY the final polished Detailed Description.')),undefined);
 assert.equal((plusResponseFormat(wire('material-aware scientific figure planner')) as any).type,'json_schema');
 assert.equal((plusResponseFormat(wire('visual observer assisting 图研',true)) as any).type,'json_object');
});
test('schema input is included in the pre-dispatch bound and never lowers thinking limits',()=>{
 const request=wire('PNG visual review AFTER generation');const policy:any={plusPreset:{mode:'fast'},plusBilling:{maxCostMicros:1000000,tariff:pricing.tariff,limits:{...pricing.transportLimits,maxInputBytes:65536}}};
 const url='https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',init={method:'POST',body:JSON.stringify(request)};
 const result=boundedPlusTransport(url,init,policy),sent=JSON.parse(String(result.init.body));assert.equal(sent.thinking_budget,1024);assert.equal(sent.stream_options.include_usage,true);assert.equal(sent.response_format.type,'json_schema');
 policy.plusBilling.limits.maxInputBytes=Buffer.byteLength(JSON.stringify(request.messages))+10;
 assert.throws(()=>boundedPlusTransport(url,init,policy),/材料/);
});
