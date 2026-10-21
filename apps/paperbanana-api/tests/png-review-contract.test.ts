import test from 'node:test'
import assert from 'node:assert/strict'
import { pngDecisionPrompt, parsePngDecision } from '../../../packages/api/src/png-workflow.js'
import { parsePngReviewDecision } from '../src/png-review.js'
import { operationalMetrics } from '../src/operational-metrics.js'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { pngFixtureContext, pngFixtureDecision } from './helpers/png-review-fixture.js'

const hash = 'a'.repeat(64)
const valid = () => ({version:2,pngHash:hash,visual:{status:'passed',findings:[]},uncertainties:[],revised_description:'No changes needed.'})
// Redacted shape of the complete but invalid TokenDance response observed on Oct 21.
const alternate = (version=2,pngHash=hash) => ({version,pngHash,submittedImageHash:pngHash,round:1,pass:true,status:'passed',issues:[],minor_observations:[],checks:{labels_exact:true},numeric_review:{applicable:false,reason:'Workflow only'},revised_description:'No changes needed.'})

test('bound PNG contract retains mandatory fields even for non-quantitative diagrams', () => {
  const prompt = pngDecisionPrompt(true,{version:2,pngHash:hash})
  assert.ok(prompt.includes(hash)); assert.match(prompt,/version=2/)
  assert.match(prompt,/numeric_review/); assert.match(prompt,/"checks":\[\]/)
  assert.throws(()=>parsePngDecision(JSON.stringify(alternate()),2,hash),/完整画面/)
  assert.throws(()=>parsePngDecision(JSON.stringify({...valid(),uncertainties:undefined}),2,hash),/不确定项/)
  assert.throws(()=>parsePngDecision(JSON.stringify(valid()),1,hash),/版本/)
  assert.throws(()=>parsePngDecision(JSON.stringify(valid()),2,'b'.repeat(64)),/摘要/)
  assert.throws(()=>parsePngDecision(JSON.stringify({...valid(),numericReview:{applicable:false,reason:'Workflow only'}}),2,hash,true),/数值/)
  assert.equal(parsePngDecision(JSON.stringify({...valid(),numericReview:{applicable:false,reason:'No quantitative marks',checks:[]}}),2,hash,true,{applicableRequired:false}).passed,true)
})

test('review counters distinguish validated pass, issues and protocol failure without dropping uncertainty', () => {
  const before=operationalMetrics.snapshot().counters
  assert.equal(parsePngReviewDecision(JSON.stringify(valid()),2,hash).passed,true)
  const issue={...valid(),visual:{status:'issues_found',findings:[{issue:'Clipping',location:'Right edge',evidence:'The label extends beyond the canvas',suggestion:'Move the final node left'}]},revised_description:'Preserve the full workflow and move the last node left so the entire label is visible.'}
  assert.equal(parsePngReviewDecision(JSON.stringify(issue),2,hash).passed,false)
  const uncertain={...valid(),uncertainties:['The last label cannot be read'],revised_description:'Preserve the workflow and enlarge the final label until legible.'}
  assert.equal(parsePngReviewDecision(JSON.stringify(uncertain),2,hash).passed,false)
  assert.throws(()=>parsePngReviewDecision(JSON.stringify(alternate()),2,hash),/完整画面/)
  const after=operationalMetrics.snapshot().counters
  assert.equal(after['review.png_passed']-before['review.png_passed'],1)
  assert.equal(after['review.png_issues_found']-before['review.png_issues_found'],2)
  assert.equal(after['review.png_protocol_failed']-before['review.png_protocol_failed'],1)
})

for(const malformed of [true,false])test(`PNG runtime preserves image without repeating malformed review: malformed=${malformed}`,async()=>{
  const r=await createRefineRuntime();const calls:string[]=[]
  try {
    r.legacy.configureRuntimeFetch(async(input:any,init:any={})=>{
      const url=String(input)
      if(url.endsWith('/models'))return Response.json({data:[]})
      if(url.includes('/images/')){calls.push('image');return Response.json({data:[{b64_json:r.output.toString('base64')}]})}
      const wire=JSON.parse(String(init.body)),review=JSON.stringify(wire).includes('PNG visual review')
      calls.push(review?'review':'plan')
      let content='A complete scientific workflow: input, analysis, output. White background and clear arrows.'
      if(review){const c=pngFixtureContext(wire);assert.ok(JSON.stringify(wire).includes('Copy those two values exactly'));content=malformed?JSON.stringify(alternate(c.version,c.pngHash)):pngFixtureDecision(wire)}
      return Response.json({output_text:content,choices:[{message:{content}}]})
    })
    const created=await r.post({action:'createJob',provider:'openai',configurationMode:'advanced',apiKeys:{openai:'fixture-only'},modelRoutes:{main:{accessProvider:'openai',modelId:'gpt-5.6-sol'},image:{accessProvider:'openai',modelId:'gpt-image-2'}},visionMode:'none',methodContent:'Input connects to analysis and output.',caption:'Workflow',outputFormat:'png',imageSize:'1K',aspectRatio:'1:1',pipelineMode:'planner_critic',retrievalSetting:'none',numCandidates:1,maxCriticRounds:1})
    assert.equal(created.data.code,0,JSON.stringify(created.data));await r.legacy.drainJobAdmission()
    const job=(await r.post({action:'getJob',jobId:created.data.jobId})).data.job
    assert.equal(job.status,'succeeded');assert.equal(job.resultImages.length,1)
    assert.equal(job.resultImages[0].review.status,malformed?'review_failed':'passed')
    assert.deepEqual(calls,['plan','image','review'])
    if(malformed)assert.match(job.resultImages[0].review.history[0].error,/完整画面/)
  }finally{await r.close()}
})
