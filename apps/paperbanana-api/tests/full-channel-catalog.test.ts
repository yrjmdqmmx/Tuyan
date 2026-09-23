import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'
import { AUDITED_CHANNEL_CONTRACTS } from '../../../packages/api/src/audited-channel-data.js'
import { buildAuditedRunwareImage, buildAuditedTokenHubImage } from '../../../packages/api/src/image-channel-adapters.js'
import { buildAuditedTextBody } from '../../../packages/api/src/text-channel-adapters.js'
import { resolveImageSize, imageAspectRatiosByResolution } from '../../../packages/types/src/image-size-contract.js'
import { refineControlsFor, refineInputIssue } from '../../../packages/api/src/refine-controls.js'
import { CANONICAL_ASPECT_RATIOS } from '../../../packages/types/src/aspect-ratios.js'
import { assertChannelRequest } from '../../../packages/api/src/audited-channel-contracts.js'
const root=new URL('../../../',import.meta.url)
const sizes=JSON.parse(fs.readFileSync(new URL('config/image-size-contracts.json',root),'utf8'))
const catalog=JSON.parse(fs.readFileSync(new URL('config/model-catalog-updates.json',root),'utf8'))
const ajv=new (Ajv2020 as any)({strict:false,validateFormats:false})
const bytes=Buffer.alloc(24);bytes.writeUInt32BE(0x89504e47,0);bytes.writeUInt32BE(1024,16);bytes.writeUInt32BE(1024,20)
const base64=bytes.toString('base64'),source={base64,mimeType:'image/png',dataUrl:'data:image/png;base64,'+base64}
const task='12345678-1234-4123-8123-123456789abc'
for(const [key,c]of Object.entries(AUDITED_CHANNEL_CONTRACTS).filter(([key])=>['runware','tokenhub','xiaomi'].includes(key.split('/')[0]))) {
  const at=key.indexOf('/'),provider=key.slice(0,at),model=key.slice(at+1)
  test(`official per-model request: ${key}`,async()=>{
    const row=catalog.providers[provider].find((m:any)=>m.id===model)
    assert.ok(row);assert.deepEqual(row.roles,c.roles)
    if(c.taskType!=='imageInference'&&!['hy35','vidu','vega','seedream'].includes(c.taskType)) {
      const cases=c.minImages?[1]:c.maxImages?[0,1,c.maxImages]:[0]
      for(const count of cases) {
        const body=buildAuditedTextBody({provider:provider as any,model,apiKey:'fixture',system:'保持科学内容',user:'说明图中节点及关系',images:Array.from({length:count},()=>({url:source.dataUrl}))},task)
        if(c.schema){const valid=ajv.compile(c.schema);assert.ok(valid(body),JSON.stringify(valid.errors))}
      }
      assert.throws(()=>buildAuditedTextBody({provider:provider as any,model,apiKey:'fixture',system:'x',user:'x',images:Array.from({length:c.maxImages+1},()=>({url:source.dataUrl}))},task))
      return
    }
    for(const op of ['generation','editing']) {
      const route=sizes.routes[key]?.[op];if(!route)continue
      const profile=sizes.profiles[route];const map=imageAspectRatiosByResolution(profile,CANONICAL_ASPECT_RATIOS)
      const caps=refineControlsFor(provider,model)
      let combinations=0
      for(const [resolution,ratios]of Object.entries(map))for(const aspectRatio of profile.mode==='inherit'?['auto']:(ratios as string[])) {
        const count=op==='editing'?Math.max(1,caps?.minImages||1):0
        const refs=Array.from({length:Math.max(0,count-1)},(_,i)=>({objectKey:'ref'+i,purpose:'content' as const}))
        const inputs={version:1 as const,references:refs,...(caps?.maskRequired?{mask:{objectKey:'mask'}}:{})}
        const input={provider,model,apiKey:'fixture',prompt:'仅修改目标颜色，保留标注与科研结构。',aspectRatio,resolution,size:resolveImageSize(profile,aspectRatio,resolution),...(count?{source,edit:{inputs,references:refs.map(()=>source),...(caps?.maskRequired?{mask:source}:{})}}:{})}
        assert.equal(refineInputIssue(caps,count?inputs:undefined,aspectRatio,resolution),'')
        const body=provider==='runware'?buildAuditedRunwareImage(input,task):(await buildAuditedTokenHubImage(input,{publicSource:async()=> 'https://fixtures.example/ref.png'})).body
        if(c.schema){const valid=ajv.compile(c.schema);assert.ok(valid(body),`${op} ${resolution} ${aspectRatio} ${JSON.stringify(valid.errors)}`)}
        combinations++
      }
      assert.ok(combinations>0,op+' has no selectable size')
      if(op==='editing'&&caps) {
        const resolution=Object.keys(map)[0],aspectRatio=profile.mode==='inherit'?'auto':map[resolution][0]
        for(const count of new Set([Math.max(1,caps.minImages||1),Math.min(9,caps.maxImages)]))for(const mask of [false,true]) {
          const references=Array.from({length:count-1},(_,i)=>({objectKey:'aux'+i,purpose:'style' as const}))
          const inputs={version:1 as const,references,...(mask?{mask:{objectKey:'region'}}:{})}
          const issue=refineInputIssue(caps,inputs,aspectRatio,resolution)
          if((caps.maskRequired&&!mask)||(mask&&(!caps.mask||(references.length&&!caps.maskWithReferences)))){assert.ok(issue);continue}
          assert.equal(issue,'')
          const input={provider,model,apiKey:'fixture',prompt:'仅修改选定区域，保留标注',aspectRatio,resolution,size:resolveImageSize(profile,aspectRatio,resolution),source,edit:{inputs,references:references.map(()=>source),...(mask?{mask:source}:{})}}
          const body=provider==='runware'?buildAuditedRunwareImage(input,task):(await buildAuditedTokenHubImage(input,{publicSource:async()=> 'https://fixtures.example/ref.png'})).body
          if(c.schema){const valid=ajv.compile(c.schema);assert.ok(valid(body),`mask=${mask}, count=${count}: ${JSON.stringify(valid.errors)}`)}
          if(provider==='runware')assert.equal(c.sourceField==='referenceImages'?body.inputs.referenceImages.length:1+(body.inputs[c.auxiliaryField]?.length||0),count)
        }
        const tooMany={version:1 as const,references:Array.from({length:Math.min(9,caps.maxImages)},(_,i)=>({objectKey:'over'+i,purpose:'content' as const}))}
        assert.ok(refineInputIssue(caps,tooMany,aspectRatio,resolution))
      }
    }
  })
}
test('all three official directories have one disposition per ID; not merely representatives',()=>{
  const all=['runware','cn'].flatMap(k=>JSON.parse(fs.readFileSync(new URL(`config/channel-audit/${k}-directory.json`,root),'utf8')))
  assert.equal(all.filter(r=>r.channel==='runware').length,355)
  assert.equal(all.filter(r=>r.channel==='xiaomi').length,9)
  for(const row of all){assert.ok(row.decision,JSON.stringify(row));assert.ok(row.source);assert.equal(row.checkedAt,'2026-09-22')}
})
test('scheduled retirement retains the original ID until its documented product cutoff, then rejects without transport',()=>{
  const realNow=Date.now
  try {
    for(const [key,c]of Object.entries(AUDITED_CHANNEL_CONTRACTS))if(c.expiresAt) {
      const at=key.indexOf('/'),provider=key.slice(0,at),id=key.slice(at+1),life=catalog.lifecycle[provider]?.[id] || catalog.providers[provider].find((m:any)=>m.id===id)?.metadata
      assert.equal(Date.parse(life.expirationAt),Date.parse(c.expiresAt),key)
      Date.now=()=>Date.parse(c.expiresAt)-1
      assert.doesNotThrow(()=>assertChannelRequest({...c,schema:undefined},{}))
      Date.now=()=>Date.parse(c.expiresAt)
      assert.throws(()=>assertChannelRequest({...c,schema:undefined},{}),(e:any)=>e.requestState==='not_sent'&&e.localInputFailure)
    }
  } finally {Date.now=realNow}
})
