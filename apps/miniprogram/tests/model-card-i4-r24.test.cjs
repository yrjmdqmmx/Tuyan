const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module')
const{STATIC_MODEL_REGISTRY}=require('../miniprogram/utils/static-model-catalog.js'),{auditedModelSpecs}=require('../miniprogram/utils/model-audit.js')
const filename=require.resolve('../miniprogram/components/model-picker/model-picker.js');let definition,modal
const context={Component(v){definition=v},exports:{},require:createRequire(filename),wx:{showModal(v){modal=v}}}
vm.runInNewContext(fs.readFileSync(filename,'utf8')+'\nthis.present=presentModel',context,{filename})
test('R24 I4 compiled Mini shows vendor 65536, the same inheritance note/date, and the dated retirement citation',async()=>{
 const e=await import('../../../test-support/evidence-i4-r24.mjs'),model=STATIC_MODEL_REGISTRY.tokendance.models.find(m=>m.id==='qwen3.5-plus'),audit=auditedModelSpecs('tokendance',model.id),card=context.present(model,'','','tokendance')
 e.assertQwenEvidence(audit);assert.deepEqual(structuredClone(card.specSources.slice(1)),[{url:e.specUrl,label:e.specLabel},{url:e.retirementUrl,label:e.retirementLabel}])
 assert.ok(card.auditMessage.includes(e.inheritanceNote));assert.match(card.auditMessage,/最大输出核实日期：2026-11-10/);assert.match(card.auditMessage,/最大输出：65536 tokens/)
 for(const row of card.specSources){definition.methods.copySource({currentTarget:{dataset:{url:row.url,source:row.label,notice:card.auditMessage}}});assert.ok(modal.content.includes(e.inheritanceNote));assert.ok(modal.content.includes(row.label));assert.ok(!modal.content.includes(e.rejectedUrl))}
})
test('R24 I4 Mini scans all 1064 cards and clears both unsupported image token-limit fields',async t=>{
 const e=await import('../../../test-support/evidence-i4-r24.mjs'),cards=[]
 for(const[p,entry]of Object.entries(STATIC_MODEL_REGISTRY))for(const m of entry.models){const c=context.present(m,'','',p);cards.push({key:p+'/'+m.id,fields:auditedModelSpecs(p,m.id).fields,rows:structuredClone(c.specSources)})
  if(['qianfan/qwen-image-edit','siliconflow/Qwen/Qwen-Image-Edit'].includes(p+'/'+m.id))for(const row of c.specRows.filter(r=>['上下文窗口','最大输出'].includes(r.label)))assert.equal(row.value,'未知')
 }
 t.diagnostic(JSON.stringify(e.scanRetirementSpecs(cards)))
})
