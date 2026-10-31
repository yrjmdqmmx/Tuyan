// Parse only provider-reported usage. Never infer consumption from output text
// length, a successful download, a timeout or a generic failure status.
const count=n=>Number.isSafeInteger(n)&&n>=0;
export function plusBailianUsage(row){
  const unknown={state:'unknown',modelId:row?.model};
  if(row?.provider!=='bailian'||!row.requestId||!row.workflowStepId||!row.usage)return unknown;
  const u=row.usage,items=[];
  if(row.model==='qwen-image-3.0-pro'){
    if(!count(u.input_image_count)||!count(u.output_image_count)||!['qima_input_1k','qima_input_2k'].includes(u.input_image_type)||!['qima_output_1k','qima_output_2k'].includes(u.output_image_type))return unknown;
    items.push({unit:u.input_image_type,quantity:u.input_image_count},{unit:u.output_image_type,quantity:u.output_image_count});
  }else if(['qwen3.8-flash','qwen3.8-max-0902'].includes(row.model)){
    const cached=u.prompt_tokens_details?.cached_tokens;
    // Missing cache details need reconciliation; do not charge discounted
    // tokens at the uncached rate or add reasoning tokens a second time.
    if(!count(u.prompt_tokens)||!count(u.completion_tokens)||!count(cached)||cached>u.prompt_tokens)return unknown;
    items.push({unit:'input_non_cached',quantity:u.prompt_tokens-cached},{unit:'input_cached',quantity:cached},{unit:'output_total',quantity:u.completion_tokens});
  }else return unknown;
  return {state:'confirmed',evidence:'provider_usage',receiptId:`bailian:${row.requestId}`,workflowStepId:row.workflowStepId,modelId:row.model,items};
}
