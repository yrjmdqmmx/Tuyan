const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm')
const {createRequire}=require('node:module')
const {STATIC_MODEL_REGISTRY}=require('../miniprogram/utils/static-model-catalog.js')
const {sourceTitle,titleSourceRows}=require('../miniprogram/utils/card-presentation.js')
const filename=require.resolve('../miniprogram/components/model-picker/model-picker.js')
let definition,modal,clipboard
const context={Component(value){definition=value},exports:{},require:createRequire(filename),wx:{showModal(value){modal=value},setClipboardData(value){clipboard=value.data}}}
vm.runInNewContext(fs.readFileSync(filename,'utf8')+'\nthis.present=presentModel',context,{filename})

test('R23F compiled Mini preserves the four title examples and version/date separators',async()=>{
 const {titleExamples}=await import('../../../test-support/source-titles-r23.mjs')
 for(const [url,model,expected]of titleExamples)assert.equal(sourceTitle(url,model),expected)
 for(const version of ['3-5','3_5','3.8','4.1','v2.6','2507','0813'])assert.ok(sourceTitle('https://docs.example.test/models/model-'+version).toLowerCase().includes(version.replace('_','-')))
})

test('R23F3 compiled Mini restores known dotted versions and preserves curated/true hyphens',async()=>{
 const {f3TitleExamples,titleIssues}=await import('../../../test-support/source-titles-r23.mjs')
 for(const [url,model,expected]of f3TitleExamples)assert.equal(sourceTitle(url,model),expected,url)
 for(const token of ['Qwen3-8','K2-7','V4-1'])assert.ok(titleIssues({url:'https://docs.example.test/general',label:'官方文档 · Example · '+token},'Unrelated Card').some(issue=>issue.startsWith('hyphenated dotted version:')),token)
 for(const model of STATIC_MODEL_REGISTRY.stability.models.filter(model=>model.id.startsWith('sd3.5'))){
  assert.equal(sourceTitle('https://docs.stability.ai/api-reference/generate/stable-diffusion-35',model),'Stability · Stable Diffusion 3.5')
 }
})

test('R23F all 1064 compiled Mini cards and copy dialogs pass the title scan; generated titles match the shared helper',async t=>{
 const {scanTitles,titleBaseline}=await import('../../../test-support/source-titles-r23.mjs')
 const {expectedHumanRows}=await import('../../../test-support/source-links-i3-r24.mjs')
 const shared=await import('../../../packages/api/src/card-presentation.mjs')
 const cards=[];let dialogs=0
 for(const [provider,entry]of Object.entries(STATIC_MODEL_REGISTRY))for(const model of entry.models){
  const card=provider+'/'+model.id,data=context.present(model,'','',provider),old=titleBaseline.mini.find(row=>row.card===card)
  const rows=structuredClone(data.specSources)
  assert.equal(data.label,old.name,card);assert.deepEqual(rows.map(row=>row.url),expectedHumanRows(old.rows,card,'mini').map(row=>row.url),card)
  assert.equal(new Set(rows.map(row=>row.label)).size,rows.length,card)
  assert.equal(new Set(rows.map(row=>shared.sourceIdentity(row.url))).size,rows.length,card)
  const roles=rows.map(row=>({...row,label:row.label.split(' · ')[0]}))
  assert.deepEqual(titleSourceRows(roles,model),shared.titleSourceRows(roles,model),card)
  for(const row of rows){
   definition.methods.copySource({currentTarget:{dataset:{url:row.url,source:row.label,notice:data.auditMessage}}})
   assert.ok(modal.content.endsWith(row.label));modal.success({confirm:true});assert.equal(clipboard,row.url);dialogs++
  }
  cards.push({card,name:old.name,rows})
 }
 assert.equal(cards.length,1064);assert.ok(dialogs>1064);assert.deepEqual(scanTitles(cards),[])
 t.diagnostic(JSON.stringify({cards:cards.length,dialogs,suspicious:0}))
})

test('R23F Mini icon taps show the missing-page hint for exactly seven historical TokenDance ids',async()=>{
 const {historicalIds}=await import('../../../test-support/source-titles-r23.mjs')
 let changed=0,controls=0
 for(const model of STATIC_MODEL_REGISTRY.tokendance.models){
  const data=context.present(model,'','','tokendance'),unknown=data.specRows.flatMap(row=>row.icons).filter(icon=>['unknown','unlisted'].includes(icon.state))
  if(historicalIds.includes(model.id)){
   assert.ok(unknown.length,model.id)
   for(const icon of unknown){
    assert.equal(icon.tooltip,'渠道页无此型号')
    definition.methods.showModality({currentTarget:{dataset:{label:icon.accessibleLabel,detail:icon.tooltip}}})
    assert.equal(modal.content,icon.tooltip);assert.equal(modal.showCancel,false)
   }
   changed++
  }else {for(const icon of unknown)assert.match(icon.tooltip,/^渠道未标注此模态/);assert.doesNotMatch(JSON.stringify(data.specRows),/渠道页无此型号/);controls++}
 }
 assert.equal(changed,7);assert.equal(controls,67)
})
