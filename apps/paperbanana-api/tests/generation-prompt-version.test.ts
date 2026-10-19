import test from 'node:test'
import assert from 'node:assert/strict'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'

test('server pins compact prompts into encrypted snapshots; missing version retains old full-stage prompts',async()=>{
  const r=await createRefineRuntime({tokenDance:true})
  try {
    let legacy=false
    const captured:any[]=[]
    r.legacy.configureProviderWorkflow({...r.workflow,prepare:async(task:any)=>{
      assert.equal(task.body.generationPromptVersion,1,'client cannot choose or omit the server version')
      if(legacy)delete task.body.generationPromptVersion // Simulate an admitted pre-upgrade snapshot.
      await r.workflow.prepare(task)
      const row=await r.db.collection('paperbanana_provider_executions').findOne({_id:task.jobId})
      assert.equal(r.tokenDanceService.cipher.open(row.secret,task.jobId).task.body.generationPromptVersion,legacy?undefined:1)
    }})
    r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
      if(String(url).endsWith('/models'))return Response.json({data:[]})
      assert.match(String(url),/^https:\/\/api.openai.com\//)
      const wire=JSON.parse(init.body),system=JSON.stringify(wire.instructions||wire.messages?.filter((m:any)=>m.role==='system'))
      const user=typeof wire.input==='string'?wire.input:[...(wire.input||[]),...(wire.messages||[])].filter((m:any)=>m.role==='user').flatMap((m:any)=>typeof m.content==='string'?[m.content]:m.content.filter((p:any)=>['text','input_text'].includes(p.type)).map((p:any)=>p.text)).join('\n')
      captured.push({system,user})
      const content=system.includes('material-aware scientific figure planner')?JSON.stringify({status:'ready',missingInputs:[],plan:'Keep unique fact Alpha 12 and Beta 0.87. White background, teal and amber nodes, one arrow.'}):JSON.stringify({status:'needs_input',missingInputs:['Intentional offline style-stage stop'],plan:''})
      return Response.json({output_text:content,choices:[{message:{content}}]})
    })
    const request={action:'createJob',generationPath:'model-v1',generationPromptVersion:999,provider:'openai',apiKeys:{openai:'fixture'},modelRoutes:{main:{accessProvider:'openai',modelId:'gpt-5.6-sol'},image:{accessProvider:'openai',modelId:'gpt-image-2'}},visionMode:'none',methodContent:'unique-source-fact Alpha 12 and Beta 0.87.',caption:'Synthetic workflow.',outputFormat:'png',pipelineMode:'full',retrievalSetting:'none',numCandidates:1,maxCriticRounds:1,aspectRatio:'1:1',imageSize:'1K'}
    for(const mode of [false,true]){
      legacy=mode;captured.length=0
      const created=await r.post(request);assert.equal(created.data.code,0,JSON.stringify(created.data))
      await r.legacy.drainJobAdmission()
      assert.equal(captured.length,2,'planner and stylist both execute; no draw after missing evidence')
      for(const prompt of captured){assert.equal(prompt.user.split('unique-source-fact').length-1,mode?3:1);assert.match(prompt.user,/Alpha 12 and Beta 0.87/)}
      assert.equal(captured[0].user.includes('Complete task context:'),mode)
      assert.equal(captured[0].system.includes('200-350 words'),!mode)
      const job=await r.db.collection('paperbanana_jobs').findOne({_id:created.data.jobId})
      assert.equal(job.generationPerformance.spans.filter((s:any)=>s.name==='model:text').length,2)
    }
  } finally {await r.close()}
})
