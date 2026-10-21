import test from 'node:test'
import assert from 'node:assert/strict'
import { memoryDb } from '../../../test-support/memory-db.mjs'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { createProviderWorkflow } from '../src/provider-workflow.js'
import { createTokenDanceService } from '../src/tokendance-service.js'
import { pngFixtureDecision, pngFixtureHash, pngFixtureObservation } from './helpers/png-review-fixture.js'

function checkpointFixture(id: string) {
  const db = memoryDb()
  const service = createTokenDanceService({db:db as any,secret:Buffer.alloc(32,19).toString('base64'),fetcher:(async()=>{throw new Error('Unexpected provider request')}) as any})
  const workflow = createProviderWorkflow({db:db as any,service})
  const task = {jobId:id,kind:'create',body:{userId:'checkpoint-owner',provider:'openai'},routeSecrets:{openai:'fixture-unused'}}
  return {db,workflow,task}
}

test('generic unknown checkpoint errors carry explicit uncertainty and cannot replay',async()=>{
  const {db,workflow,task}=checkpointFixture('explicit-unknown')
  await db.collection('paperbanana_jobs').insertOne({_id:task.jobId})
  await workflow.prepare(task)
  let calls=0
  await assert.rejects(workflow.run(task,()=>workflow.call(['image'],async()=>{
    calls++
    throw new Error('ECONNRESET after request submitted')
  })),(error:any)=>error.uncertain===true && error.requestState==='unknown')
  const execution=await db.collection('paperbanana_provider_executions').findOne({_id:task.jobId})
  assert.equal(execution.state,'blocked')
  assert.equal(execution.recovery.canResume,false)
  await assert.rejects(workflow.resume(task.jobId,task.body.userId,async()=>{calls++}))
  assert.equal(calls,1)
})

test('successful execution cannot clear recovery when an inner unknown error was swallowed',async()=>{
  const {db,workflow,task}=checkpointFixture('swallowed-unknown')
  await db.collection('paperbanana_jobs').insertOne({_id:task.jobId})
  await workflow.prepare(task)
  await assert.rejects(workflow.run(task,async()=>{
    try {await workflow.call(['image'],async()=>{throw new Error('reply lost')})} catch { /* Deliberately mimic a caller retaining an earlier image. */ }
  }),(error:any)=>error.uncertain===true && error.requestState==='unknown')
  const execution=await db.collection('paperbanana_provider_executions').findOne({_id:task.jobId})
  assert.equal(execution.state,'blocked')
  assert.ok(execution.secret)
  assert.equal(execution.recovery.requestState,'unknown')
  assert.equal((await db.collection('paperbanana_jobs').findOne({_id:task.jobId})).recovery.canResume,false)
})

for(const journalOperation of ['read','write'])test(`journal ${journalOperation} failure cannot erase uncertainty or permit another paid operation`,async()=>{
  const {db,workflow,task}=checkpointFixture('unknown-journal-failure')
  await db.collection('paperbanana_jobs').insertOne({_id:task.jobId})
  await workflow.prepare(task)
  const steps=db.collection('paperbanana_provider_steps'), update=steps.updateOne.bind(steps), read=steps.findOne.bind(steps)
  let calls=0, failedWrite=false, operationFailed=false
  steps.findOne=async(filter:any)=>{
    if(journalOperation==='read' && operationFailed && !failedWrite){failedWrite=true;throw new Error('primary stepped down')}
    return read(filter)
  }
  steps.updateOne=async(filter:any,change:any,...rest:any[])=>{
    if(journalOperation==='write' && !failedWrite && change.$set?.state==='unknown'){failedWrite=true;throw new Error('primary stepped down')}
    return update(filter,change,...rest)
  }
  await assert.rejects(workflow.run(task,async()=>{
    await assert.rejects(workflow.call(['image'],async()=>{calls++;operationFailed=true;throw new Error('reply lost after submit')}),(error:any)=>error.uncertain===true && error.requestState==='unknown')
    await assert.rejects(workflow.call(['next-image'],async()=>{calls++;return 'must not run'}))
  }),(error:any)=>error.uncertain===true && error.requestState==='unknown')
  assert.equal(calls,1)
  assert.equal((await db.collection('paperbanana_provider_executions').findOne({_id:task.jobId})).recovery.canResume,false)
})

const body=(extra:Record<string,any>={})=>({action:'createJob',provider:'openai',configurationMode:'advanced',apiKeys:{openai:'fixture-unused'},modelRoutes:{main:{accessProvider:'openai',modelId:'gpt-5.6-sol'},image:{accessProvider:'openai',modelId:'gpt-image-2'},vision:{accessProvider:'openai',modelId:'gpt-4.1'}},visionMode:'assist',methodContent:'Module A sends measured data to module B.',caption:'Two modules and an arrow.',outputFormat:'png',imageSize:'1K',aspectRatio:'1:1',pipelineMode:'planner_critic',retrievalSetting:'none',numCandidates:3,maxCriticRounds:1,...extra})

test('uncertain redraw stops later candidates and retains completed results and recovery',async()=>{
  const r=await createRefineRuntime({tokenDance:true})
  try {
    let images=0,plans=0,decisions=0
    r.legacy.configureRuntimeFetch(async(input:any,init:any={})=>{
      const url=String(input)
      if(url.endsWith('/models'))return Response.json({data:[]})
      if(url.includes('/images/')){
        images++
        if(images===3)throw new Error('ECONNRESET after request submitted')
        return Response.json({data:[{b64_json:r.output.toString('base64')}]})
      }
      const wire=JSON.parse(String(init.body)),text=JSON.stringify(wire)
      const observer=text.includes('visual observer assisting'),decision=text.includes('Decide whether the current candidate')
      if(decision)decisions++
      else if(!observer)plans++
      const content=observer?pngFixtureObservation('Observed modules A and B.',decisions>0):decision?pngFixtureDecision(wire,decisions===1?undefined:'Complete revised plan: move label B above its arrow; keep modules A and B.'):'Complete plan: module A connects to module B.'
      return Response.json({output_text:content,choices:[{message:{content}}]})
    })
    const created=await r.post(body())
    assert.equal(created.data.code,0,JSON.stringify(created.data))
    await r.legacy.drainJobAdmission()
    const job=(await r.post({action:'getJob',jobId:created.data.jobId})).data.job
    assert.equal(job.status,'failed')
    assert.deepEqual(job.resultImages.map((item:any)=>item.candidateId),[0,1])
    assert.equal(job.resultImages[0].review.status,'passed')
    const retained=job.resultImages[1]
    assert.equal(retained.review.status,'issues_found','an uncertain redraw preserves the completed review conclusion for the retained PNG')
    assert.match(retained.review.note,/已检查且仍有问题.*重新生成未完成/)
    assert.equal(retained.review.deliveredVersion,1)
    assert.equal(retained.review.reviewedVersion,1)
    assert.equal(retained.review.deliveredPngHash,pngFixtureHash(r.output))
    assert.equal(retained.review.history[0].status,'issues_found')
    const retainedObject=r.objects.get(retained.objectKey)
    assert.ok(retainedObject,'the retained PNG is persisted in object storage')
    assert.deepEqual(retainedObject.bytes,r.output)
    assert.deepEqual(job.candidateProgress.map((item:any)=>item.status),['succeeded','failed','queued'])
    assert.equal(images,3)
    assert.equal(plans,2)
    assert.equal(decisions,2)
    assert.equal(job.recovery.requestState,'unknown')
    assert.equal(job.recovery.canResume,false)
    assert.equal((await r.db.collection('paperbanana_provider_executions').findOne({_id:job.id || created.data.jobId})).state,'blocked')
    await assert.rejects(r.workflow!.resume(created.data.jobId,'refine-owner',async()=>{throw new Error('Must not resume an unknown submission')}))
    assert.equal(images,3)
  }finally{await r.close()}
})

test('authenticated unmanaged plot enhancement transport uncertainty also stops later candidates',async()=>{
  const previous=process.env.PLOT_WORKER_URL
  process.env.PLOT_WORKER_URL='http://plot-uncertain-fixture.invalid'
  const r=await createRefineRuntime()
  try {
    let images=0,workers=0,plans=0
    r.legacy.configureRuntimeFetch(async(input:any,init:any={})=>{
      const url=String(input)
      if(url.endsWith('/models'))return Response.json({data:[]})
      if(url==='http://plot-uncertain-fixture.invalid/render'){workers++;return Response.json({ok:true,image_base64:r.output.toString('base64')})}
      if(url.includes('/images/')){
        images++
        assert.match(init.body.get('prompt'),/Complete main-model plan:\s*MAIN_PLAN_SENTINEL/)
        throw new Error('ECONNRESET after request submitted')
      }
      plans++
      const content=plans===1?'MAIN_PLAN_SENTINEL: Plot the measured values without changing any data.':'import matplotlib.pyplot as plt\nplt.plot([1,2],[3,4])\nplt.savefig("output.png")'
      return Response.json({output_text:content,choices:[{message:{content}}]})
    })
    const payload=body({taskName:'plot',imageSize:'2K',visionMode:'none',maxCriticRounds:0,numCandidates:2})
    const anonymous=await r.post(payload,'anonymous')
    assert.equal(anonymous.status,401);assert.deepEqual([images,workers,plans],[0,0,0])
    const created=await r.post(payload)
    assert.equal(created.data.code,0,JSON.stringify(created.data))
    await r.legacy.drainJobAdmission()
    const job=await r.db.collection('paperbanana_jobs').findOne({_id:created.data.jobId})
    assert.equal(job.status,'failed')
    assert.equal(images,1)
    assert.equal(workers,1)
    assert.equal(plans,2)
  }finally{
    await r.close()
    if(previous===undefined)delete process.env.PLOT_WORKER_URL
    else process.env.PLOT_WORKER_URL=previous
  }
})

for(const reviewRounds of [0,1])test(`parallel uncertainty waits for submitted images to save and stops later paid stages (reviews ${reviewRounds})`,async()=>{
  const previous=process.env.PAPERBANANA_CANDIDATE_CONCURRENCY
  process.env.PAPERBANANA_CANDIDATE_CONCURRENCY='2'
  const r=await createRefineRuntime({tokenDance:true})
  let entered!:()=>void, release!:()=>void
  const secondStarted=new Promise<void>(resolve=>{entered=resolve})
  const finishSecond=new Promise<void>(resolve=>{release=resolve})
  try {
    let images=0,plans=0
    r.legacy.configureRuntimeFetch(async(input:any)=>{
      const url=String(input)
      if(url.endsWith('/models'))return Response.json({data:[]})
      if(url.includes('/images/')){
        const current=++images
        if(current===1){await secondStarted;throw new Error('ECONNRESET after request submitted')}
        if(current===2){entered();await finishSecond}
        return Response.json({data:[{b64_json:r.output.toString('base64')}]})
      }
      plans++
      const content='Complete plan: module A connects to module B.'
      return Response.json({output_text:content,choices:[{message:{content}}]})
    })
    const created=await r.post(body({visionMode:'none',numCandidates:4,maxCriticRounds:reviewRounds}))
    assert.equal(created.data.code,0,JSON.stringify(created.data))
    let deadline:ReturnType<typeof setTimeout> | undefined
    try {await Promise.race([secondStarted,new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('Second candidate did not start')),10000)})])}
    finally {clearTimeout(deadline)}
    let during:any
    for(let attempt=0;attempt<200;attempt++){
      during=await r.db.collection('paperbanana_jobs').findOne({_id:created.data.jobId})
      if(during?.candidateProgress?.some((candidate:any)=>candidate.status==='failed'))break
      await new Promise(resolve=>setTimeout(resolve,10))
    }
    assert.equal(during.candidateProgress[0].status,'failed')
    assert.equal(during.status,'running','in-flight work must settle before workflow recovery is finalized')
    assert.equal((await r.db.collection('paperbanana_provider_executions').findOne({_id:created.data.jobId})).state,'running')
    release()
    await r.legacy.drainJobAdmission()
    const job=await r.db.collection('paperbanana_jobs').findOne({_id:created.data.jobId})
    assert.equal(job.status,'failed')
    assert.equal(images,2)
    assert.equal(plans,2)
    assert.deepEqual(job.resultImages.map((image:any)=>image.candidateId),[1])
    assert.equal(job.resultImages[0].review.roundsUsed,0)
    if(reviewRounds)assert.equal(job.resultImages[0].review.status,'review_failed')
    assert.deepEqual(job.candidateProgress.map((candidate:any)=>candidate.status),['failed','succeeded','queued','queued'])
    assert.equal(job.recovery.canResume,false)
    assert.equal(job.recovery.requestState,'unknown')
  }finally{
    release()
    await r.close()
    if(previous===undefined)delete process.env.PAPERBANANA_CANDIDATE_CONCURRENCY
    else process.env.PAPERBANANA_CANDIDATE_CONCURRENCY=previous
  }
})

for(const managed of [true,false])test(`${managed?'managed':'authenticated unmanaged'} in-flight planning cannot start an image after a sibling becomes unknown`,async()=>{
  const previous=process.env.PAPERBANANA_CANDIDATE_CONCURRENCY
  process.env.PAPERBANANA_CANDIDATE_CONCURRENCY='2'
  const r=await createRefineRuntime({tokenDance:managed})
  let entered!:()=>void, release!:()=>void
  const secondPlanStarted=new Promise<void>(resolve=>{entered=resolve})
  const finishSecondPlan=new Promise<void>(resolve=>{release=resolve})
  try{
    let plans=0,images=0
    r.legacy.configureRuntimeFetch(async(input:any)=>{
      const url=String(input)
      if(url.endsWith('/models'))return Response.json({data:[]})
      if(url.includes('/images/')){images++;await secondPlanStarted;throw new Error('ECONNRESET after request submitted')}
      if(++plans===2){entered();await finishSecondPlan}
      const content='Complete plan: module A connects to module B.'
      return Response.json({output_text:content,choices:[{message:{content}}]})
    })
    const payload=body({visionMode:'none',numCandidates:4,maxCriticRounds:0})
    const anonymous=await r.post(payload,'anonymous')
    assert.equal(anonymous.status,401);assert.deepEqual([images,plans],[0,0])
    const created=await r.post(payload)
    assert.equal(created.data.code,0,JSON.stringify(created.data))
    let during:any
    for(let attempt=0;attempt<500;attempt++){
      during=await r.db.collection('paperbanana_jobs').findOne({_id:created.data.jobId})
      if(during?.candidateProgress?.[0]?.status==='failed')break
      await new Promise(resolve=>setTimeout(resolve,10))
    }
    assert.equal(during.candidateProgress[0].status,'failed')
    release()
    await r.legacy.drainJobAdmission()
    const job=await r.db.collection('paperbanana_jobs').findOne({_id:created.data.jobId})
    assert.equal(job.status,'failed')
    assert.equal(images,1,'the already submitted plan must not start a new image request')
    assert.equal(plans,2)
    assert.deepEqual(job.candidateProgress.map((candidate:any)=>candidate.status),['failed','failed','queued','queued'])
    if(managed){
      assert.equal(job.recovery.requestState,'unknown')
      assert.equal(job.recovery.canResume,false)
      assert.ok((await r.db.collection('paperbanana_provider_steps').find({jobId:created.data.jobId}).toArray()).some((step:any)=>step.state==='complete' && step._id.includes('candidate-1')),'the already submitted plan checkpoint is retained')
    }
  }finally{
    release()
    await r.close()
    if(previous===undefined)delete process.env.PAPERBANANA_CANDIDATE_CONCURRENCY
    else process.env.PAPERBANANA_CANDIDATE_CONCURRENCY=previous
  }
})

for(const responseStatus of [500,200])test(`authenticated unmanaged ${responseStatus===500?'HTTP 500':'incomplete HTTP 200'} enhancement stops instead of silently retaining and continuing`,async()=>{
  const previous=process.env.PLOT_WORKER_URL
  process.env.PLOT_WORKER_URL='http://plot-server-error-fixture.invalid'
  const r=await createRefineRuntime()
  try{
    let images=0,workers=0,plans=0
    r.legacy.configureRuntimeFetch(async(input:any)=>{
      const url=String(input)
      if(url.endsWith('/models'))return Response.json({data:[]})
      if(url==='http://plot-server-error-fixture.invalid/render'){workers++;return Response.json({ok:true,image_base64:r.output.toString('base64')})}
      if(url.includes('/images/')){images++;return Response.json(responseStatus===500?{error:{message:'upstream service internal failure'}}:{data:[]},{status:responseStatus})}
      const content=++plans%2===1?'Complete main plan.':'import matplotlib.pyplot as plt\nplt.plot([1,2],[3,4])\nplt.savefig("output.png")'
      return Response.json({output_text:content,choices:[{message:{content}}]})
    })
    const payload=body({taskName:'plot',imageSize:'2K',visionMode:'none',maxCriticRounds:0,numCandidates:2})
    const anonymous=await r.post(payload,'anonymous')
    assert.equal(anonymous.status,401);assert.deepEqual([images,workers,plans],[0,0,0])
    const created=await r.post(payload)
    assert.equal(created.data.code,0,JSON.stringify(created.data))
    await r.legacy.drainJobAdmission()
    const job=await r.db.collection('paperbanana_jobs').findOne({_id:created.data.jobId})
    assert.equal(job.status,'failed')
    assert.equal(images,1)
    assert.equal(workers,1)
    assert.equal(plans,2)
    assert.equal(job.failure.requestState,'unknown')
    assert.equal(job.failure.stage,'rendering')
  }finally{
    await r.close()
    if(previous===undefined)delete process.env.PLOT_WORKER_URL
    else process.env.PLOT_WORKER_URL=previous
  }
})
