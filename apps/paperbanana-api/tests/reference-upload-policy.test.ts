import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { crc32 } from 'node:zlib'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'

// Large, valid PNG ancillary chunks test actual upload bytes without fabricating file.size.
function paddedPng(image: Buffer, size: number) {
  const chunk = Buffer.alloc(size - image.length)
  chunk.writeUInt32BE(chunk.length - 12); chunk.write('tEXt', 4); chunk.write('Comment\0', 8)
  chunk.writeUInt32BE(crc32(chunk.subarray(4, -4)), chunk.length - 4)
  return Buffer.concat([image.subarray(0, -12), chunk, image.subarray(-12)])
}
async function upload(runtime: any, bytes: Buffer[], purpose?: string) {
  const response = await runtime.post({ action: 'prepareReferenceUpload', files: bytes.map((b, i) => ({ filename: `figure-${i}.png`, mimeType: 'image/png', size: b.length })) })
  assert.equal(response.data.code, 0, JSON.stringify(response))
  const uploads = response.data.uploads
  for (let i = 0; i < uploads.length; i++) {
    const put = await fetch(uploads[i].uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: new Uint8Array(bytes[i]) })
    assert.equal(put.status, 200)
  }
  const finalized = await runtime.post({ action: 'finalizeReferenceUpload', uploads, ...(purpose ? { purpose } : {}) })
  assert.equal(finalized.data.code, 0, JSON.stringify(finalized))
  return uploads
}

test('8 real uploads, >5MiB originals, processing and vanilla main-model analysis reach generation', async () => {
  const r = await createRefineRuntime()
  try {
    const originals = [paddedPng(r.image, 6 * 1024 * 1024), ...Array.from({length: 7}, () => r.image)]
    const uploads = await upload(r, originals)
    let releaseInspection!: () => void
    const inspection = r.legacy.withReferenceProcessing(() => new Promise<void>(resolve => { releaseInspection = resolve }))
    const result = await r.post({ action: 'createJob', provider: 'openai', apiKeys: { openai: 'fixture-only' },
      mainModelName: 'gpt-4.1', imageModelName: 'gpt-image-1', referenceVisionModelName: 'gpt-4.1',
      referenceImageMode: 'main_model', referenceImages: uploads, pipelineMode: 'vanilla',
      methodContent: 'Compare scientific cell pathways with eight reference diagrams and clear labels.', caption: 'Scientific workflow',
      retrievalSetting: 'none', imageSize: '1K', aspectRatio: '1:1', maxCriticRounds: 0, numCandidates: 1 })
    assert.equal(result.data.code, 0, JSON.stringify(result))
    await new Promise(resolve => setTimeout(resolve, 30))
    assert.equal(r.providerCalls.length, 0, 'accepted job waits while unrelated HTTP inspection holds the processing slot')
    releaseInspection(); await inspection
    await r.legacy.drainJobAdmission()
    const job = await r.db.collection('paperbanana_jobs').findOne({ _id: result.data.jobId })
    assert.equal(job.status, 'succeeded', JSON.stringify(job))
    const vision = r.providerCalls.find((x: any) => x.url.endsWith('/chat/completions'))
    assert.ok(vision)
    const body = JSON.parse(String(vision.options.body))
    const images = body.messages[1].content.filter((x: any) => x.type === 'image_url')
    assert.equal(images.length, 8)
    for (const image of job.referenceImages) {
      const processed = r.objects.get(image.analysisObjectKey)
      assert.ok(processed)
      assert.ok(processed.bytes.length < 6 * 1024 * 1024)
      assert.deepEqual(await sharp(processed.bytes).raw().toBuffer(), await sharp(r.image).raw().toBuffer())
      assert.ok(r.objects.has(image.objectKey), 'original remains intact')
    }
    const generationCall = r.providerCalls.find((x: any) => x.url.endsWith('/images/generations'))
    assert.ok(generationCall)
    const generation = JSON.parse(String(generationCall.options.body))
    assert.match(generation.prompt, /放大标签|原有文字/, 'vision analysis actually enters the image generation prompt')
    assert.equal(r.legacy.referenceProcessingState().peak, 1)
  } finally { await r.close() }
})

test('80MiB actual storage roundtrip; exact count, bytes, aggregate and SVG ceilings cannot be bypassed', async () => {
  const r = await createRefineRuntime()
  try {
    const max = 20 * 1024 * 1024
    const bytes = paddedPng(r.image, max)
    const uploads = await upload(r, [bytes, bytes, bytes, bytes])
    const inputs = await r.legacy.buildVisionImageInputs(uploads, '', { accessProvider: 'openai', modelId: 'gpt-4.1' })
    assert.equal(inputs.length, 4)
    const file = { filename: 'limit.png', mimeType: 'image/png', size: max }
    for (const files of [[{...file, size: max + 1}], Array(5).fill(file), Array(9).fill({...file,size: 1}), [{...file,size:1.5}], [{...file,size:0}], [{...file, filename:'x.svg',mimeType:'image/svg+xml',size:6*1024*1024}]]) {
      assert.notEqual((await r.post({ action: 'prepareReferenceUpload', files })).data.code, 0)
    }
    assert.equal(r.providerCalls.length, 0)
  } finally { await r.close() }
})

test('decode bounds, lossless failure, actual Base64 request budget, and processing concurrency reject before providers', async () => {
  const r = await createRefineRuntime()
  try {
    const p = r.legacy.referenceSubmissionPolicy('bailian', 'qwen3.8-flash')
    const wide = await sharp({create: {width: 8000,height:4000,channels:3,background:'#abc'}}).png().toBuffer()
    const output = await r.legacy.normalizeReferenceForModel(wide, 'image/png', p)
    assert.ok(output.width * output.height <= p.maxPixels)
    await assert.rejects(r.legacy.normalizeReferenceForModel(r.image, 'image/png', {...p,maxBytes: 1}), /无损处理/)
    await assert.rejects(r.legacy.normalizeReferenceForModel(r.image, 'image/jpeg', p), /格式/)
    const oversized = await sharp({create: {width: 8001,height:4000,channels:3,background:'#abc'}}).png().toBuffer()
    await assert.rejects(r.legacy.normalizeReferenceForModel(oversized, 'image/png', p), /32MP/)
    const tall = await sharp({create:{width:512,height:10000,channels:3,background:'#abc'}}).png().toBuffer()
    await assert.rejects(r.legacy.normalizeReferenceForModel(tall, 'image/png', r.legacy.referenceSubmissionPolicy('recraft','recraftv4_1','refine')), /短边不足/)
    assert.throws(() => r.legacy.checkedReferenceRequest('gemini', 'gemini-2.5-pro', {data:'x'.repeat(20000000)}), /请求超过/)
    assert.throws(() => r.legacy.checkedReferenceRequest('anthropic', 'claude-sonnet-4-6', {data:'x'.repeat(32000000)}), /请求超过/)
    let release!: () => void
    const active = r.legacy.withReferenceProcessing(() => new Promise(resolve => { release = () => resolve('done') }))
    await assert.rejects(r.legacy.withReferenceProcessing(async () => {}), (error: any) => error.statusCode === 429)
    release(); await active
    assert.equal(r.legacy.referenceProcessingState().active, 0)
    assert.equal(r.providerCalls.length, 0)
  } finally { await r.close() }
})

test('supported photographic WebP is retained before PNG expansion, and Bailian includes its VL fallback bounds', async () => {
  const r = await createRefineRuntime()
  try {
    const webp = await sharp(randomBytes(512*512*3), {raw:{width:512,height:512,channels:3}}).webp({quality:70}).toBuffer()
    const png = await sharp(webp).png().toBuffer()
    assert.ok(png.length > webp.length * 2)
    const policy = {...r.legacy.referenceSubmissionPolicy('openai','gpt-4.1'),maxBytes:webp.length+1}
    const processed = await r.legacy.normalizeReferenceForModel(webp,'image/webp',policy)
    assert.equal(processed.mimeType,'image/webp')
    assert.deepEqual(processed.bytes,webp)
    for (const model of ['qwen3.7-max','qwen3.8-flash']) {
      const selected = r.legacy.referenceSubmissionPolicy('bailian',model)
      const fallback = r.legacy.referenceSubmissionPolicy('bailian','qwen-vl-max')
      for (const key of ['maxCount','maxBytes','maxTotalBytes','maxDimension','maxPixels','requestMaxBytes'] as const) assert.ok(selected[key] <= fallback[key],key)
    }
    for (const url of ['http://127.0.0.1/a.jpg','https://169.254.169.254/latest/meta-data','https://legacy-cdn.example/image?id=1']) {
      const denied = await r.invoke({action:'refineImage',provider:'openai',imageModelName:'gpt-image-1',sourceImageUrl:url,editInstruction:'Enlarge labels',userId:'refine-owner'})
      assert.notEqual(denied.code,0)
      assert.match(denied.error,/上传精修原图/)
    }
    assert.equal(r.providerCalls.length,0)
  } finally { await r.close() }
})

test('Bailian compatibility retry receives derivatives within the actual fallback model budget', async () => {
  const previous = process.env.BAILIAN_VISION_MODEL
  process.env.BAILIAN_VISION_MODEL = 'qwen-vl-max'
  const r = await createRefineRuntime()
  try {
    const raw = await sharp({create:{width:6000,height:3000,channels:3,background:'#abc'}}).png().toBuffer()
    const uploads = await upload(r,[raw])
    const inputs = await r.legacy.buildVisionImageInputs(uploads,'',{accessProvider:'bailian',modelId:'qwen3.7-max'})
    const seen: string[] = []
    r.legacy.configureRuntimeFetch(async (_input: any, options: any) => {
      const body = JSON.parse(options.body);seen.push(body.model)
      if(body.model==='qwen3.7-max') return Response.json({error:{message:'Unexpected item type in content'}},{status:400})
      assert.equal(body.model,'qwen-vl-max')
      const fallback = r.legacy.referenceSubmissionPolicy('bailian',body.model)
      for(const item of body.messages[1].content.filter((part:any)=>part.type==='image_url')) {
        const key = decodeURIComponent(new URL(item.image_url.url).pathname.replace('/objects/',''))
        const bytes = r.objects.get(key)!.bytes
        const metadata = await sharp(bytes).metadata()
        assert.ok(bytes.length <= fallback.maxBytes)
        assert.ok(metadata.width! * metadata.height! <= fallback.maxPixels)
      }
      return Response.json({choices:[{message:{content:'Reference labels preserved.'}}]})
    })
    const text = await (r.legacy as any).callVisionModel('bailian','qwen3.7-max','fixture-only','Scientific method','Figure caption',inputs)
    assert.match(text,/preserved/)
    assert.deepEqual(seen,['qwen3.7-max','qwen-vl-max'])
  } finally {
    await r.close()
    if(previous===undefined) delete process.env.BAILIAN_VISION_MODEL
    else process.env.BAILIAN_VISION_MODEL = previous
  }
})

test('owned extensionless JPEG sources keep working through Gateway and the real refine adapter', async () => {
  const r = await createRefineRuntime()
  try {
    const key = 'owned-jpeg-job/original'
    const jpeg = await sharp(r.image).jpeg().toBuffer()
    r.objects.set(key,{bytes:jpeg,mimeType:'image/jpeg'})
    await r.db.collection('paperbanana_jobs').insertOne({_id:'owned-jpeg-job',userId:'refine-owner',status:'succeeded',resultImages:[{objectKey:key,url:r.baseUrl+'/objects/'+key}]})
    const queued = await r.post({action:'refineImage',provider:'openai',apiKeys:{openai:'fixture-only'},mainModelName:'gpt-4.1',imageModelName:'gpt-image-1',referenceVisionModelName:'gpt-4.1',sourceImageObjectKey:key,editInstruction:'Enlarge labels',aspectRatio:'1:1',imageSize:'1K',outputFormat:'png'})
    assert.equal(queued.data.code,0,JSON.stringify(queued))
    await r.legacy.drainJobAdmission()
    const job = await r.db.collection('paperbanana_jobs').findOne({_id:queued.data.jobId})
    assert.equal(job.status,'succeeded',JSON.stringify(job))
    const call = r.providerCalls.find((item:any)=>item.url.endsWith('/images/edits'))!
    const form = call.options.body as FormData
    const part = (form.get('image') || form.get('image[]')) as Blob
    const pixels = await sharp(Buffer.from(await part.arrayBuffer())).raw().toBuffer()
    assert.deepEqual(pixels,await sharp(jpeg).raw().toBuffer())
  } finally {await r.close()}
})

test('SVG retains vector detail at model size and refuses silent text loss; HTTP busy finalize is retryable', async () => {
  const previousWasm = process.env.RESVG_WASM_PATH
  process.env.RESVG_WASM_PATH = fileURLToPath(new URL('../node_modules/@resvg/resvg-wasm/index_bg.wasm', import.meta.url))
  const r = await createRefineRuntime()
  try {
    const p = r.legacy.referenceSubmissionPolicy('tokendance', 'qwen3.8-flash')
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4000 2000"><rect width="4000" height="2000" fill="white"/><path d="M100 100 H3900 V110 H100 Z" fill="black"/></svg>'
    const image = await r.legacy.normalizeReferenceForModel(Buffer.from(svg), 'image/svg+xml', p)
    assert.equal(image.width, 4000); assert.equal(image.height, 2000)
    const dark = await sharp(image.bytes).extract({left: 100,top: 100,width:1,height:1}).removeAlpha().raw().toBuffer()
    assert.deepEqual([...dark], [0, 0, 0])
    const textSvg = svg.replace('</svg>', '<text x="10" y="30">Gene A</text></svg>')
    await assert.rejects(r.legacy.normalizeReferenceForModel(Buffer.from(textSvg), 'image/svg+xml', p), /文字转为路径/)
    const uploads = await upload(r, [r.image])
    let release!: () => void
    const active = r.legacy.withReferenceProcessing(() => new Promise(resolve => { release = () => resolve('done') }))
    const busy = await r.post({action: 'finalizeReferenceUpload', uploads, purpose: 'refine'})
    assert.equal(busy.status, 429)
    assert.match(busy.data.error || busy.data.message, /繁忙/)
    assert.ok(r.objects.has(uploads[0].objectKey))
    release(); await active
    assert.equal((await r.post({action: 'finalizeReferenceUpload', uploads, purpose: 'refine'})).data.code, 0)
    assert.equal(r.providerCalls.length, 0)
  } finally {
    await r.close()
    if (previousWasm === undefined) delete process.env.RESVG_WASM_PATH
    else process.env.RESVG_WASM_PATH = previousWasm
  }
})

test('processed aggregate budget stops a real multi-image batch before a paid transport', async () => {
  const r = await createRefineRuntime()
  try {
    const noisy = await sharp(randomBytes(1024 * 1024 * 3), { raw: {width:1024,height:1024,channels:3} }).png().toBuffer()
    const uploads = await upload(r, Array(5).fill(noisy))
    await assert.rejects(r.legacy.buildVisionImageInputs(uploads, '', {accessProvider:'gemini',modelId:'gemini-2.5-pro'}), /合计超过/)
    assert.equal(r.providerCalls.length, 0)
    for (const upload of uploads) assert.ok(r.objects.has(upload.objectKey))
  } finally { await r.close() }
})

test('TokenDance invalid reference bytes fail with actionable input errors before any paid call', async () => {
  const r = await createRefineRuntime({ tokenDance: true })
  try {
    const flow = await r.post({action:'tokenDanceAuthorize'})
    await r.post({action:'tokenDanceExchange',state:flow.data.state,code:'fixture-code'})
    const routes = { main:{accessProvider:'tokendance',modelId:'qwen3.8-flash'}, image:{accessProvider:'tokendance',modelId:'seedream-5.0-pro'}, vision:{accessProvider:'tokendance',modelId:'qwen3.8-flash'} }
    const invalid = [r.image.subarray(0,40), await sharp(r.image).jpeg().toBuffer()]
    for (const bytes of invalid) {
      const uploads = await upload(r,[bytes])
      const queued = await r.post({action:'createJob',provider:'tokendance',modelRoutes:routes,referenceImages:uploads,referenceImageMode:'main_model',pipelineMode:'vanilla',methodContent:'研究一种通过输入、处理和输出三个阶段生成学术图示的方法。',caption:'图一：方法流程。',retrievalSetting:'none',imageSize:'2K',aspectRatio:'16:9',numCandidates:1,maxCriticRounds:0})
      assert.equal(queued.data.code,0,JSON.stringify(queued))
      await r.legacy.drainJobAdmission()
      const job = await r.db.collection('paperbanana_jobs').findOne({_id:queued.data.jobId})
      assert.equal(job.status,'failed',JSON.stringify(job))
      assert.match(job.error,/解码|损坏|格式/)
      assert.equal(job.recovery,undefined,'known input failure must not claim uncertain billing')
      const execution = await r.db.collection('paperbanana_provider_executions').findOne({_id:queued.data.jobId})
      assert.equal(execution.state,'failed'); assert.equal(execution.secret,undefined)
      assert.ok(r.objects.has(uploads[0].objectKey),'original is retained for inspection')
    }
    assert.equal(r.tokenDanceCalls.filter((call:any)=>/\/chat\/completions$|\/images\/generations$/.test(call.url)).length,0)
  } finally { await r.close() }
})

test('Seedream 14px is rejected before queueing and 15px reaches the exact refine adapter', async () => {
  const r=await createRefineRuntime({tokenDance:true})
  try {
    const flow=await r.post({action:'tokenDanceAuthorize'})
    await r.post({action:'tokenDanceExchange',state:flow.data.state,code:'fixture-code'})
    const route={accessProvider:'tokendance',modelId:'seedream-5.0-pro'}
    assert.equal(r.legacy.referenceSubmissionPolicy(route.accessProvider,route.modelId,'refine').minDimension,15)
    for(const width of [14,15]){
      const bytes=await sharp({create:{width,height:150,channels:3,background:'white'}}).png().toBuffer()
      const uploads=await upload(r,[bytes],'refine')
      const result=await r.post({action:'refineImage',provider:'tokendance',imageModelName:route.modelId,mainModelName:'qwen3.8-flash',referenceVisionModelName:'qwen3.8-flash',sourceImageObjectKey:uploads[0].objectKey,sourceImageUpload:uploads[0],editInstruction:'放大标题并保留线条。',imageSize:'2K',aspectRatio:'1:1'})
      if(width===14){assert.notEqual(result.data.code,0,JSON.stringify(result));assert.match(result.data.error,/15px/)}
      else {assert.equal(result.data.code,0,JSON.stringify(result));await r.legacy.drainJobAdmission();const job=await r.db.collection('paperbanana_jobs').findOne({_id:result.data.jobId});assert.equal(job.status,'succeeded',JSON.stringify(job))}
    }
    assert.equal(r.tokenDanceCalls.filter((call:any)=>call.url.endsWith('/images/generations')).length,1)
  } finally {await r.close()}
})
