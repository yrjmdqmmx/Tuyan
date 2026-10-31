import test from 'node:test';
import assert from 'node:assert/strict';
import {plusBailianUsage} from '../../../packages/api/src/plus-usage.mjs';
const row={provider:'bailian',model:'qwen3.8-flash',requestId:'fixture-request',workflowStepId:'fixture-step'};
test('text usage subtracts cached input and includes reasoning exactly once',()=>{
 const parsed=plusBailianUsage({...row,usage:{prompt_tokens:1000,prompt_tokens_details:{cached_tokens:200},completion_tokens:400,completion_tokens_details:{reasoning_tokens:300}}});
 assert.deepEqual(parsed.items,[{unit:'input_non_cached',quantity:800},{unit:'input_cached',quantity:200},{unit:'output_total',quantity:400}]);
 assert.equal(plusBailianUsage({...row,usage:{prompt_tokens:1000,completion_tokens:400}}).state,'unknown');
});
test('image input and output use the returned billing tier, not a UI resolution guess',()=>{
 const parsed=plusBailianUsage({...row,model:'qwen-image-3.0-pro',usage:{input_image_count:1,input_image_type:'qima_input_2k',output_image_count:1,output_image_type:'qima_output_2k'}});
 assert.deepEqual(parsed.items,[{unit:'qima_input_2k',quantity:1},{unit:'qima_output_2k',quantity:1}]);
 assert.equal(plusBailianUsage({...row,model:'qwen-image-3.0-pro',usage:{}}).state,'unknown');
});
