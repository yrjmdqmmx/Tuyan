import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { pngFixtureContext, pngFixtureDecision, pngFixtureHash, pngFixtureObservation } from './helpers/png-review-fixture.js'

function imageUrls(wire: any): string[] {
  const messages = [...(Array.isArray(wire.input) ? wire.input : wire.input?.messages || []), ...(wire.messages || [])]
  return messages.flatMap((message: any) => Array.isArray(message.content) ? message.content : [])
    .filter((part: any) => part.type === 'input_image' || part.type === 'image_url' || typeof part.image === 'string')
    .map((part: any) => part.image || (typeof part.image_url === 'string' ? part.image_url : part.image_url.url))
}

function inlineBytes(url: string) {
  assert.match(url, /^data:image\/png;base64,/)
  return Buffer.from(url.split(',')[1], 'base64')
}

async function translucentFixture() {
  const width = 512, height = 512, rgba = Buffer.alloc(width * height * 4), white = Buffer.alloc(width * height * 3)
  const color = [10, 80, 160], alphas = [0, 128, 252, 255]
  for (let pixel = 0; pixel < width * height; pixel++) {
    const alpha = alphas[pixel % alphas.length]
    for (let channel = 0; channel < 3; channel++) {
      rgba[pixel * 4 + channel] = color[channel]
      // Independent straight-alpha source-over-white expectation, not the production image transform.
      white[pixel * 3 + channel] = Math.floor((color[channel] * alpha + 255 * (255 - alpha)) / 255)
    }
    rgba[pixel * 4 + 3] = alpha
  }
  return {original: await sharp(rgba, {raw:{width,height,channels:4}}).png().toBuffer(), expectedWhitePixels: white}
}

for (const visionMode of ['none', 'assist']) test(`Wan automatic PNG iteration uses the same white canvas for ${visionMode === 'assist' ? 'observer' : 'main'} review and redraw while retaining RGBA versions`, async () => {
  const r = await createRefineRuntime()
  try {
    const {original, expectedWhitePixels} = await translucentFixture()
    const revised = await sharp({create:{width:512,height:512,channels:4,background:{r:180,g:80,b:30,alpha:252/255}}}).png().toBuffer()
    const outputs = [original, revised, revised], calls: Array<{kind:string;wire:any}> = []
    let imageCalls = 0
    r.legacy.configureRuntimeFetch(async (input: any, init: any = {}) => {
      const url = String(input)
      const asset = /^https:\/\/generated\.invalid\/white-canvas-(\d+)\.png$/.exec(url)
      if (asset) return new Response(outputs[Number(asset[1]) - 1], {headers:{'Content-Type':'image/png'}})
      if (url.endsWith('/models')) return Response.json({data:[]})
      assert.equal(init.method, 'POST', `Unexpected fixture request: ${url}`)
      const wire = JSON.parse(String(init.body)), prompt = JSON.stringify(wire)
      const kind = /^wan2\.7-image/.test(wire.model) ? 'image' : prompt.includes('PNG visual review AFTER generation') ? 'review' : prompt.includes('visual observer assisting') ? 'observation' : 'plan'
      calls.push({kind,wire})
      if (kind === 'image') {
        imageCalls++
        assert.ok(imageCalls <= outputs.length, 'No unrequested generation is allowed')
        return Response.json({output:{choices:[{message:{content:[{image:`https://generated.invalid/white-canvas-${imageCalls}.png`}]}}]}})
      }
      const content = kind === 'review' ? pngFixtureDecision(wire, 'Keep A connected to B. Move B above its arrow, preserve both labels and all required values.')
        : kind === 'observation' ? pngFixtureObservation('Visible A and B on the white drawing canvas.', true)
        : 'Draw A connected to B on a light canvas. Preserve A, B and the arrow direction.'
      return Response.json({choices:[{message:{content}}]})
    })
    const accepted = await r.post({action:'createJob',provider:'bailian',configurationMode:'advanced',apiKeys:{bailian:'fixture-only'},modelRoutes:{main:{accessProvider:'bailian',modelId:'qwen3.8-flash'},vision:{accessProvider:'bailian',modelId:'qwen3.8-flash'},image:{accessProvider:'bailian',modelId:'wan2.7-image-pro'}},visionMode,methodContent:'A connects to B; retain both labels and the directed arrow.',caption:'Two-stage scientific method.',negativePrompt:'Do not invent data.',infographicCategory:'method',outputFormat:'png',imageSize:'1K',aspectRatio:'1:1',pipelineMode:'planner_critic',retrievalSetting:'none',numCandidates:1,maxCriticRounds:1})
    assert.equal(accepted.data.code, 0, JSON.stringify(accepted))
    await r.legacy.drainJobAdmission()
    const job = (await r.post({action:'getJob',jobId:accepted.data.jobId})).data.job
    assert.equal(job.status, 'succeeded', job.error)
    assert.deepEqual(calls.map(call => call.kind), visionMode === 'assist' ? ['plan','image','observation','review','image'] : ['plan','image','review','image'])

    const visionCall = calls.find(call => call.kind === (visionMode === 'assist' ? 'observation' : 'review'))!
    const [submittedReviewUrl, ...unexpectedReviewImages] = imageUrls(visionCall.wire)
    assert.deepEqual(unexpectedReviewImages, [])
    const submittedReview = inlineBytes(submittedReviewUrl)
    const images = calls.filter(call => call.kind === 'image')
    assert.deepEqual(imageUrls(images[0].wire), [], 'Initial generation has no invented source')
    assert.equal(imageUrls(images[1].wire).length, 1, 'Revision must retain its previous image source')
    const submittedRegeneration = inlineBytes(imageUrls(images[1].wire)[0])
    for (const bytes of [submittedReview, submittedRegeneration]) {
      assert.equal((await sharp(bytes).metadata()).hasAlpha, false)
      assert.deepEqual(await sharp(bytes).raw().toBuffer(), expectedWhitePixels)
    }
    assert.deepEqual(await sharp(submittedReview).raw().toBuffer(), await sharp(submittedRegeneration).raw().toBuffer())
    const context = pngFixtureContext(calls.find(call => call.kind === 'review')!.wire)
    assert.equal(context.displayBackground, '#ffffff')
    assert.equal(context.pngHash, pngFixtureHash(original))
    assert.equal(context.submittedImageHash, pngFixtureHash(submittedReview))
    if (visionMode === 'assist') {
      assert.deepEqual(imageUrls(calls.find(call => call.kind === 'review')!.wire), [])
      assert.match(context.auxiliaryVisualReport, /white drawing canvas/)
    }

    const result = job.resultImages[0], review = result.review
    assert.equal(review.displayBackground, '#ffffff')
    assert.equal(review.status, 'modified_unreviewed')
    assert.equal(review.roundsUsed, 1)
    assert.equal(review.deliveredVersion, 2)
    assert.equal(review.deliveredPngHash, pngFixtureHash(revised))
    assert.equal(review.reviewedVersion, 1)
    assert.equal(review.reviewedPngHash, pngFixtureHash(original))
    assert.equal(review.history.length, 1)
    assert.equal(review.history[0].version, 1)
    assert.equal(review.history[0].pngHash, pngFixtureHash(original))
    assert.equal(review.history[0].submittedImageHash, pngFixtureHash(submittedReview))
    assert.equal(review.history[0].status, 'issues_found')
    const originalObject = r.objects.get(`${job.id || accepted.data.jobId}/candidate-0-png-v1.png`)
    const deliveredObject = r.objects.get(result.objectKey)
    assert.ok(originalObject, 'The original RGBA version remains in storage')
    assert.ok(deliveredObject, 'The delivered revision exists in storage')
    assert.deepEqual(originalObject.bytes, original)
    assert.deepEqual(deliveredObject.bytes, revised)
    assert.equal((await sharp(deliveredObject.bytes).metadata()).hasAlpha, true)
    const referenceStage = job.stages.find((stage:any) => stage.type === 'reference' && stage.title === '重画方式（第1轮）')
    const evidence = JSON.parse(referenceStage.text)
    assert.equal(evidence.sourceVersion, 1)
    assert.equal(evidence.sourcePngHash, pngFixtureHash(original))
    assert.equal(evidence.submittedSourceImageHash, pngFixtureHash(submittedRegeneration))
    assert.equal(evidence.displayBackground, '#ffffff')
    assert.match(evidence.note, /白底.*原始 PNG 保留/)
    const submittedSourceObject = r.objects.get(referenceStage.image.filename)
    assert.ok(submittedSourceObject, 'The exact source submitted for regeneration remains in storage')
    assert.deepEqual(submittedSourceObject.bytes, submittedRegeneration)
    assert.equal([...r.objects.keys()].some(key => key.startsWith('bailian-vision/')), false)
    if(visionMode==='none'){
      const beforeRefine=calls.length
      const request={action:'refineImage',sourceImageObjectKey:result.objectKey,provider:'bailian',apiKeys:{bailian:'fixture-only'},modelRoutes:job.modelRoutes,visionMode:'none',editInstruction:'Increase spacing while preserving A and B.',aspectRatio:'1:1',imageSize:'1K'}
      const admission=await r.post(request);assert.equal(admission.data.code,0,JSON.stringify(admission.data));await r.legacy.drainJobAdmission()
      const refined=(await r.post({action:'getJob',jobId:admission.data.jobId})).data.job
      assert.equal(refined.status,'succeeded',refined.error)
      const sent=calls.slice(beforeRefine).find(c=>c.kind==='image')!
      const source=inlineBytes(imageUrls(sent.wire)[0]);assert.equal((await sharp(source).metadata()).hasAlpha,false)
      const pixel=await sharp(source).raw().toBuffer();assert.deepEqual([...pixel.subarray(0,3)],[180,80,30].map(c=>Math.floor((c*252+255*3)/255)))
      assert.deepEqual(r.objects.get(result.objectKey)!.bytes,revised,'Generated original is never rewritten')
      const audit=JSON.parse(refined.stages.find((s:any)=>s.title==='精修原图显示副本').text)
      assert.equal(audit.sourcePngHash,pngFixtureHash(revised));assert.equal(audit.submittedSourceImageHash,pngFixtureHash(source));assert.equal(refined.resultImages[0].review.displayBackground,'#ffffff')
      const record=r.db.collection('paperbanana_jobs').rows.find((j:any)=>j._id===job.id)
      delete record.resultImages[0].review.displayBackground
      const bytes=Buffer.from('Keep A and B.');const prepared=await r.post({action:'prepareMaterialUpload',files:[{filename:'aux.txt',size:bytes.length}]});const upload=prepared.data.uploads[0];
      await fetch(upload.uploadUrl,{method:'PUT',headers:{'Content-Type':upload.mimeType},body:new Uint8Array(bytes)});
      const finalized=await r.post({action:'finalizeMaterialUpload',materialId:upload.id});assert.equal(finalized.data.code,0);
      const beforeRejected=calls.length;
      const rejected=await r.post({...request,materialFiles:[finalized.data.file]});await r.legacy.drainJobAdmission();assert.equal(calls.length,beforeRejected,'Invalid original fails before any paid material understanding')
      const rejectedJob=(await r.post({action:'getJob',jobId:rejected.data.jobId})).data.job
      assert.equal(rejectedJob.status,'failed');assert.match(rejectedJob.error,/透明像素/);assert.equal(imageCalls,3,'No background claim means no opaque edit submission')
    }
  } finally { await r.close() }
})

test('explicit generation-only image thinking uses an audited text redraw instead of an invalid image-input call',async()=>{
 const r=await createRefineRuntime({tokenDance:true});let generated=0;const wires:any[]=[]
 try{
  const png=await sharp({create:{width:512,height:512,channels:3,background:'#ffffff'}}).png().toBuffer()
  r.legacy.configureRuntimeFetch(async(input:any,init:any={})=>{
   const url=String(input);if(url.endsWith('/models'))return Response.json({data:[]});if(url==='https://fixture.invalid/iteration.png')return new Response(png,{headers:{'Content-Type':'image/png'}})
   const wire=JSON.parse(String(init.body));wires.push(wire)
   if(wire.input?.messages){generated++;assert.equal(imageUrls(wire).length,0);assert.equal(wire.parameters.thinking_mode,true);return Response.json({output:{choices:[{message:{content:[{image:'https://fixture.invalid/iteration.png'}]}}]}})}
   return Response.json({choices:[{message:{content:JSON.stringify(wire).includes('PNG visual review AFTER generation')?pngFixtureDecision(wire,'Complete revised plan: A points to B; increase spacing and preserve labels.'):'Draw A pointing to B with clear labels.'}}]})
  })
  const accepted=await r.post({action:'createJob',provider:'bailian',apiKeys:{bailian:'fixture-only'},modelRoutes:{main:{accessProvider:'bailian',modelId:'qwen3.7-plus'},image:{accessProvider:'bailian',modelId:'wan2.7-image-pro'}},thinkingConfig:{version:1,roles:{image:{provider:'bailian',modelId:'wan2.7-image-pro',protocol:'bailian-multimodal-generation',options:{mode:true}}}},visionMode:'none',methodContent:'A points to B in the original workflow. Keep both labels and the directed relation.',caption:'Flow',outputFormat:'png',imageSize:'1K',aspectRatio:'1:1',pipelineMode:'planner_critic',retrievalSetting:'none',numCandidates:1,maxCriticRounds:1})
  assert.equal(accepted.data.code,0,JSON.stringify(accepted.data));await r.legacy.drainJobAdmission();const job=(await r.post({action:'getJob',jobId:accepted.data.jobId})).data.job
  assert.equal(job.status,'succeeded',JSON.stringify({error:job.error,stages:job.stages,calls:wires.map(w=>({model:w.model,parameters:w.parameters}))}));assert.equal(generated,2);const reference=JSON.parse(job.stages.find((s:any)=>s.type==='reference'&&s.title==='重画方式（第1轮）').text);assert.equal(reference.sourceVersion,null);assert.match(reference.note,/显式图片思考参数仅支持纯文生图/)
 }finally{await r.close()}
})
