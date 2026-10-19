import test from 'node:test'
import assert from 'node:assert/strict'
import { measureGeneration, withGenerationPerformance, type GenerationPerformance } from '../src/generation-performance.js'
import { generationPlanningContext, workflowContext } from '../../../packages/api/src/workflow-prompts.js'

test('compact planning preserves distinct source, current instruction, constraints and complete plan', () => {
  const body = { generationPath:'model-v1', methodContent:'A=12; score >= 0.87.', caption:'Synthetic workflow.', negativePrompt:'No extra data.', outputFormat:'svg', sourceMaterials:[{text:'Original values: 12, 0.87.'}], materialFiles:[{id:'original-pdf'}], materialReadContext:{records:[{text:'Exact source evidence.'}],warnings:['Partial extraction']}, figureTypeId:'workflow' }
  const extra = {referenceAnalysis:'Distinct appearance report.',retrievalContext:'Distinct library style.'}
  const old = JSON.parse(workflowContext(body,'Complete plan.',extra))
  const compact = JSON.parse(generationPlanningContext(body,'Complete plan.',extra))
  delete old.methodology
  assert.deepEqual(compact,old)
  assert.ok(generationPlanningContext(body,'Complete plan.',extra).length < workflowContext(body,'Complete plan.',extra).length)
  const edited = JSON.parse(generationPlanningContext({...body,generationContext:body,methodContent:'Draw updated values: 19.',caption:'New caption',negativePrompt:'No shadows.'}))
  assert.equal(edited.originalRequest,body.methodContent)
  assert.equal(edited.executionRequest,'Draw updated values: 19.')
  assert.equal(edited.executionVisualIntent,'New caption')
  assert.equal(edited.executionAvoid,'No shadows.')
})

test('nested diagnostics retain parent relationships and content-free counts with concurrent isolation', async () => {
  const reports:GenerationPerformance[]=[]
  await Promise.all([1,2].map(n=>withGenerationPerformance(()=>measureGeneration('phase:planning',()=>measureGeneration('model:text',async()=> 'sensitive'.repeat(n),100)),async r=>{reports.push(r)})))
  assert.equal(reports.length,2)
  for(const r of reports){assert.equal(r.spans.length,2);assert.equal(r.spans[1].parent,0);assert.equal(r.spans[1].inputChars,100);assert.equal(r.spans[1].outcome,'ok');assert.ok(r.durationMs>=0);assert.ok(!JSON.stringify(r).includes('sensitive'))}
  assert.deepEqual(reports.map(r=>r.spans[1].outputChars).sort((a,b)=>a!-b!),[9,18])
})

test('failed operation is never repeated or replaced by telemetry failure; spans stay bounded', async () => {
  let calls=0,report:GenerationPerformance|undefined
  const original=Error('paid request outcome unknown')
  await assert.rejects(withGenerationPerformance(()=>measureGeneration('model:text',async()=>{calls++;throw original}),async r=>{report=r;throw Error('storage unavailable')}),e=>e===original)
  assert.equal(calls,1);assert.equal(report?.spans[0].outcome,'error')
  await withGenerationPerformance(async()=>{for(let i=0;i<260;i++)await measureGeneration('local:test',async()=>undefined)},async r=>{report=r})
  assert.equal(report?.spans.length,256);assert.equal(report?.dropped,4)
})
