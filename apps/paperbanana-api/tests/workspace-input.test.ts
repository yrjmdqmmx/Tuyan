import test from 'node:test';
import assert from 'node:assert/strict';
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs';
import {TAXONOMY_VERSION} from '../../../packages/figure-taxonomy/src/index.js';
test('real Gateway/Core admission accepts unified requirements without a hidden caption, while preserving legacy validation',async()=>{
 const r=await createRefineRuntime();
 const body:any={action:'createJob',generationPath:'model-v1',provider:'openai',apiKeys:{openai:'fixture'},modelRoutes:{main:{accessProvider:'openai',modelId:'gpt-5.6-sol'}},visionMode:'none',taskName:'diagram',methodContent:'',caption:'',figureTypeId:'method_framework',figureSpecVersion:TAXONOMY_VERSION,outputFormat:'svg',pipelineMode:'planner_critic',retrievalSetting:'none',numCandidates:1,maxCriticRounds:1,aspectRatio:'auto',imageSize:'auto'};
 try{
  assert.equal((await r.post(body)).data.code,400);
  assert.equal((await r.post({...body,requirements:''})).data.code,400);
  assert.equal((await r.post({...body,requirements:'x'.repeat(12001)})).data.code,400);
  const accepted=await r.post({...body,requirements:'绘制研究流程'});
  assert.equal(accepted.data.code,0,JSON.stringify(accepted.data));assert.ok(accepted.data.jobId);
  const record=await r.db.collection('paperbanana_jobs').findOne({_id:accepted.data.jobId});
  assert.equal(record.methodContent,'绘制研究流程');assert.equal(record.caption,'');
 }finally{await r.close();}
});
