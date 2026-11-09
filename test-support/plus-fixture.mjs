// SYNTHETIC TEST DATA. Not official prices, measured token bounds, or a launch tariff.
import {TAXONOMY_VERSION} from '../packages/figure-taxonomy/src/catalog.js';
const rate=(priceMicros,perUnits=1)=>({priceMicros,perUnits,source:'https://example.invalid/synthetic-test-only',checkedAt:'2026-10-31'});
export const fixturePlusPricing={version:'TEST-ONLY-DO-NOT-LAUNCH',creditCostMicros:1000,tariff:{version:'TEST-ONLY',validated:true,rates:Object.fromEntries([
 ...['qwen3.8-flash','qwen3.8-max-0902'].map(id=>[id,{input_non_cached:rate(1),input_cached:rate(1,10),output_total:rate(2)}]),
 ['qwen-image-3.0-pro',{qima_input_1k:rate(10000),qima_input_2k:rate(20000),qima_output_1k:rate(50000),qima_output_2k:rate(100000)}]
])},transportLimits:{validated:true,maxInputBytes:8192,maxImages:4,maxImageInputTokens:2048,maxOutputTokens:16384},taskCaps:Object.fromEntries(['png','svg'].map(path=>[path,Object.fromEntries(['fast','balanced','extreme'].map(mode=>[mode,{generate:400,edit:400}]))]))};
export const fixturePlusWorkspace=(path='svg',kind='generate')=>({taskId:'fixture-task',runId:'fixture-run',request:{action:path==='png'&&kind==='edit'?'refineImage':'createJob',outputFormat:path,requirements:'Synthetic three-step diagram',editInstruction:'Move the first box',caption:'',negativePrompt:'',figureTypeId:'method_framework',figureSpecVersion:TAXONOMY_VERSION,...(kind==='edit'?{materialFiles:[{id:'fixture-owned-source'}]}:{})}});
