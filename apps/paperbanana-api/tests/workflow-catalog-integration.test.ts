import test from 'node:test'
import assert from 'node:assert/strict'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { auditedChannelContract } from '../../../packages/api/src/audited-channel-contracts.js'
import { pngFixtureDecision, pngFixtureHash, pngFixtureObservation } from './helpers/png-review-fixture.js'

const visionModel = 'google/gemini-3.5-flash'
const textModel = 'moonshotai/kimi-k2-thinking'
const imageModel = 'blackforestlabs/flux-3/text-to-image'
const payload = (assist: boolean) => ({
  action:'createJob', provider:'replicate', configurationMode:'advanced',
  modelRoutes:{main:{accessProvider:'replicate',modelId:assist?textModel:visionModel},vision:{accessProvider:'replicate',modelId:visionModel},image:{accessProvider:'fal',modelId:imageModel}},
  apiKeys:{replicate:'fixture-replicate',fal:'fixture-fal'}, visionMode:assist?'assist':'none',
  methodContent:'Research input A connects through module B to output C. Preserve measured value 35.',
  caption:'Scientific workflow with readable labels.', negativePrompt:'Do not invent values.',
  outputFormat:'png',imageSize:'1K',aspectRatio:'1:1',pipelineMode:'planner_critic',retrievalSetting:'none',numCandidates:1,maxCriticRounds:1,
})

for (const assist of [false,true]) test(`catalog merge: Replicate ${assist?'observer and main':'main reads images'} and fal redraw preserve the 4.0 review contract`,async()=>{
  const r:any=await createRefineRuntime({tokenDance:true})
  const calls:any[]=[]
  const asset='https://fixture-assets.example.org/catalog-result.png'
  try {
    r.legacy.configureRuntimeFetch(async(input:any,init:any={})=>{
      const url=String(input)
      if(url===asset)return new Response(r.output,{headers:{'Content-Type':'image/png'}})
      if(url.endsWith('/models'))return Response.json({data:[]})
      if(url==='https://api.replicate.com/v1/predictions') {
        const wire=JSON.parse(String(init.body)),text=JSON.stringify(wire.input)
        const kind=text.includes('visual observer assisting')?'observation':text.includes('Decide whether the current candidate')?'decision':'plan'
        calls.push({kind,url,wire})
        const content=kind==='observation'?pngFixtureObservation('CATALOG_OBSERVATION: Label B overlaps an arrow; measured value is 35.',true):kind==='decision'?pngFixtureDecision(wire,'CATALOG_MAIN_REVISION: Complete A to B to C diagram; value 35; label B above its arrow.'):'CATALOG_MAIN_PLAN: Draw A to B to C with measured value 35.'
        return Response.json({id:'text-'+calls.length,version:wire.version,status:'succeeded',output:[content]})
      }
      if(url.startsWith('https://queue.fal.run/')) {
        if(init.method==='POST') {
          const wire=JSON.parse(String(init.body));calls.push({kind:'image',url,wire})
          const task='https://queue.fal.run/blackforestlabs/flux-3/requests/image-'+calls.length
          return Response.json({request_id:'image-'+calls.length,status:'IN_QUEUE',status_url:task+'/status',response_url:task})
        }
        return Response.json(url.endsWith('/status')?{status:'COMPLETED'}:{images:[{url:asset}]})
      }
      throw Error('Unexpected catalog workflow fixture URL: '+url)
    })
    const created=await r.post(payload(assist))
    assert.equal(created.data.code,0,JSON.stringify(created))
    await r.legacy.drainJobAdmission()
    const job=(await r.post({action:'getJob',jobId:created.data.jobId})).data.job
    assert.equal(job.status,'succeeded',JSON.stringify({error:job.error,logs:job.logs,calls:calls.map(({kind,url})=>({kind,url}))}))
    assert.deepEqual(calls.map(c=>c.kind),assist?['plan','image','observation','decision','image']:['plan','image','decision','image'])
    const decision=calls.find(c=>c.kind==='decision')
    assert.equal(decision.wire.version,auditedChannelContract('replicate',assist?textModel:visionModel).version)
    assert.match(JSON.stringify(decision.wire),/Do not invent values/)
    if(assist) {
      assert.match(JSON.stringify(decision.wire),/CATALOG_OBSERVATION/)
      assert.equal(decision.wire.input.images,undefined)
      assert.equal(calls.find(c=>c.kind==='observation').wire.input.images[0],'data:image/png;base64,'+r.output.toString('base64'))
    } else assert.equal(decision.wire.input.images[0],'data:image/png;base64,'+r.output.toString('base64'))
    const images=calls.filter(c=>c.kind==='image')
    assert.equal(images[0].url,'https://queue.fal.run/blackforestlabs/flux-3/text-to-image')
    assert.equal(images[1].url,'https://queue.fal.run/blackforestlabs/flux-3/edit-image')
    assert.match(images[1].wire.prompt,/CATALOG_MAIN_REVISION/)
    assert.equal(images[1].wire.image_urls.length,1)
    const previous=await fetch(images[1].wire.image_urls[0])
    assert.equal(previous.status,200)
    assert.deepEqual(Buffer.from(await previous.arrayBuffer()),r.output,'redraw receives the exact prior candidate')
    assert.equal(job.resultImages[0].review.roundsUsed,1)
    assert.equal(job.resultImages[0].review.status,'modified_unreviewed')
    assert.equal(job.resultImages[0].review.deliveredVersion,2)
    assert.equal(job.resultImages[0].review.reviewedVersion,1)
    assert.equal(job.resultImages[0].review.reviewedPngHash,pngFixtureHash(r.output))
    assert.deepEqual(job.resultImages[0].review.history.map((entry:any)=>[entry.version,entry.pngHash,entry.status]),[[1,pngFixtureHash(r.output),'issues_found']])
  }finally{await r.close()}
})

test('catalog merge: new text-only Replicate route is blocked before any model call when visual review has no observer',async()=>{
  const r:any=await createRefineRuntime({tokenDance:true});let calls=0
  try {
    r.legacy.configureRuntimeFetch(async(input:any,init:any={})=>{
      if((init.method||'GET')==='GET'&&String(input).startsWith('https://api.fal.ai/v1/models'))return new Response('',{status:503})
      calls++;throw Error('No model request is allowed')
    })
    const request=payload(true);request.visionMode='none'
    const result=await r.post(request)
    assert.equal(result.data.code,400)
    assert.equal(result.data.businessCode,'WORKFLOW_VISION_REQUIRED')
    assert.equal(calls,0)
  }finally{await r.close()}
})
