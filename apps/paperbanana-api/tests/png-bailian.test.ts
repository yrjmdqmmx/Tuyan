import { publicExecutionFailure } from '../../../packages/api/src/execution-errors.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
import {pngGenerationPrompt,pngPlanningConstraint,PNG_REVISION_REQUIREMENTS} from '../../../packages/api/src/png-workflow.js'
import {FIGURE_TYPES,figureContract} from '../../../packages/figure-taxonomy/src/index.js'

test('typed PNG compaction preserves every executable rule and structural reference lesson',()=>{
 const references=[{id:'licensed-fixture',figureTypeId:'workflow',panels:['workflow'],match:{level:'exact'},layout:'sequence',density:'low',designLessons:['Retain branch arrows'],doNotTransfer:['Original values'],caption:'Source caption context '.repeat(500),license:{status:'verified'}}]
 for(const type of FIGURE_TYPES){
  const body={figureTypeId:type.id,methodContent:'Synthetic test only',caption:'Synthetic figure',negativePrompt:'Never create P values',outputFormat:'png'}
  const prompt=pngGenerationPrompt(body,'Complete plan',{retrievalContext:JSON.stringify(references)})
  const raw=prompt.slice(prompt.indexOf('\n')+1,prompt.indexOf('\n\ncompletePlan')),sent=JSON.parse(raw),full=figureContract(body)
  for(const key of ['requiredInputs','elements','encodingRules'])assert.deepEqual(sent.figureContract[key],full[key],type.id+' '+key)
  for(const rule of full.generationRequirements)assert.ok([...sent.figureContract.encodingRules,...sent.figureContract.generationRequirements].includes(rule))
  assert.equal(sent.avoid,body.negativePrompt);assert.deepEqual(sent.retrievalContext[0].designLessons,references[0].designLessons);assert.deepEqual(sent.retrievalContext[0].doNotTransfer,references[0].doNotTransfer)
  assert.equal(sent.retrievalContext[0].caption,undefined,'Source paper prose is retained at planning/review, not the image API')
 }
})

test('Wan 2.7 sends exact validated PNG bytes inline and does not upload a signed URL',async()=>{
  const r=await createRefineRuntime()
  try {
    const bytes=await sharp({create:{width:512,height:512,channels:3,background:'#e0f2fe'}}).png().toBuffer()
    const calls:any[]=[]
    r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
      if(String(url)==='https://generated.invalid/result.png')return new Response(bytes,{headers:{'Content-Type':'image/png'}})
      const wire=JSON.parse(String(init.body));calls.push(wire)
      return Response.json({output:{choices:[{message:{content:[{image:'https://generated.invalid/result.png'}]}}]}})
    })
    const prompt='Complete plan and method: A → B, preserve 12, label ATP.'
    await r.legacy.callImageModel('bailian','wan2.7-image-pro','fixture',prompt,'1:1',`data:image/png;base64,${bytes.toString('base64')}`,'1K',true)
    assert.equal(calls.length,1)
    assert.equal(calls[0].model,'wan2.7-image-pro')
    assert.deepEqual(calls[0].input.messages[0].content,[{image:`data:image/png;base64,${bytes.toString('base64')}`},{text:prompt}])
    assert.equal([...r.objects.keys()].some(k=>k.startsWith('bailian-vision/')),false)
    for(const source of [
      await sharp({create:{width:512,height:512,channels:4,background:'#ffffff80'}}).png().toBuffer(),
      await sharp({create:{width:128,height:512,channels:3,background:'white'}}).png().toBuffer(),
    ])await assert.rejects(r.legacy.callImageModel('bailian','wan2.7-image-pro','fixture',prompt,'1:1',`data:image/png;base64,${source.toString('base64')}`,'1K',true),/透明像素|尺寸超限/)
    assert.equal(calls.length,1)
    const opaque=await sharp(bytes).ensureAlpha().png().toBuffer()
    await r.legacy.callImageModel('bailian','wan2.7-image-pro','fixture',prompt,'1:1',`data:image/png;base64,${opaque.toString('base64')}`,'1K',true)
    const submitted=Buffer.from(calls[1].input.messages[0].content[0].image.split(',')[1],'base64')
    assert.equal((await sharp(submitted).metadata()).hasAlpha,false)
    assert.deepEqual(await sharp(submitted).raw().toBuffer(),await sharp(opaque).removeAlpha().raw().toBuffer())
    await assert.rejects(r.legacy.callImageModel('bailian','wan2.7-image-pro','fixture','字'.repeat(5001),'1:1','','1K',true),/5000/)
    assert.equal(calls.length,2)
  }finally{await r.close()}
})

test('PNG final prompt preserves task context and reserves bounded complete-plan capacity without truncation',()=>{
  const body={methodContent:'METHOD unique label Δ12',caption:'CAPTION',negativePrompt:'AVOID invented data',infographicCategory:'method',aspectRatio:'16:9',imageSize:'1K',outputFormat:'png',modelRoutes:{image:{accessProvider:'bailian',modelId:'wan2.7-image-pro'}}}
  const prompt=pngGenerationPrompt(body,'COMPLETE PLAN',{referenceAnalysis:'REFERENCE pixels',revisionRequirements:{issue:'Move B'}},true)
  for(const value of ['METHOD unique label Δ12','CAPTION','AVOID invented data','COMPLETE PLAN','REFERENCE pixels','Move B','16:9','1K'])assert.ok(prompt.includes(value))
  assert.match(pngPlanningConstraint(body),/5000.*complete/s)
  assert.throws(()=>pngPlanningConstraint({...body,methodContent:'文'.repeat(4000)}),/原始任务上下文过长/)
})

test('Wan plan budget bounds the final revision wire, including quotes and line breaks',()=>{
  for(const n of [200,500,1100]){
    const body={methodContent:'文'.repeat(n),caption:'保留均值',outputFormat:'png',modelRoutes:{image:{accessProvider:'bailian',modelId:'wan2.7-image-pro'}}}
    const extra={referenceAnalysis:'Reference report',retrievalContext:'Gallery title'}
    const limit=Number(pngPlanningConstraint(body,extra).match(/at most (\d+) characters/)![1])
    const plan=('"\n\\汉').repeat(Math.ceil(limit/4)).slice(0,limit)
    const wire=pngGenerationPrompt(body,plan,{...extra,revisionRequirements:PNG_REVISION_REQUIREMENTS},true)
    assert.ok([...wire].length<=5000)
    assert.ok(wire.endsWith(plan),'complete plan must not be escaped, truncated or rewritten')
  }
})

test('local programming failures are not mislabeled as model-channel failures',()=>{
  const error=Object.assign(new ReferenceError('fixture internal variable'),{failureStage:'planning'})
  const failure=publicExecutionFailure(error)
  assert.equal(failure.code,'WORKFLOW_INTERNAL_ERROR')
  assert.equal(failure.requestState,'not_sent')
  assert.equal(failure.billingStatus,'not_called')
  assert.doesNotMatch(failure.message,/fixture internal variable/)
  assert.equal(publicExecutionFailure(error,1).billingStatus,'prior_calls')
  assert.equal(publicExecutionFailure(error,1,true).requestState,'unknown','real unknown calls still take precedence')
})
