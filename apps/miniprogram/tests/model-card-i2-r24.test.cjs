const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm')
const {createRequire}=require('node:module')
const {STATIC_MODEL_REGISTRY}=require('../miniprogram/utils/static-model-catalog.js')
const filename=require.resolve('../miniprogram/components/model-picker/model-picker.js')
let definition,modal,clipboard
const context={Component(v){definition=v},exports:{},require:createRequire(filename),wx:{showModal(v){modal=v},setClipboardData(v){clipboard=v.data}}}
vm.runInNewContext(fs.readFileSync(filename,'utf8')+'\nthis.present=presentModel',context,{filename})

test('R24 I2 Mini source rows reuse the accent class and show a wrapping copy hint',()=>{
 const markup=fs.readFileSync(filename.replace(/\.js$/,'.wxml'),'utf8'),css=fs.readFileSync(filename.replace(/\.js$/,'.wxss'),'utf8')
 assert.match(markup,/<button class="model-copy model-source-link"[^>]*wx:for="{{item.specSources}}"[^>]*catchtap="copySource">{{source.label}}<text class="source-copy-hint"> · 复制链接<\/text>/)
 assert.match(css,/\.model-panel \.model-copy\{[^}]*color:#28634f/)
 assert.match(css,/\.model-source-link\{overflow-wrap:anywhere;white-space:normal/)
 assert.match(css,/\.source-copy-hint\{font-size:10px/)
})

test('R24 I2 all 1064 compiled Mini cards, copy dialogs and modality dialogs pass strict scans',async t=>{
 const {titleIssues,dialogIssues,reviewBaseline}=await import('../../../test-support/source-titles-r24.mjs')
 const shared=await import('../../../packages/api/src/card-presentation.mjs')
 let cards=0,rows=0,icons=0
 for(const [provider,entry]of Object.entries(STATIC_MODEL_REGISTRY))for(const model of entry.models) {
  const card=context.present(model,'','',provider),key=provider+'/'+model.id,old=reviewBaseline.mini.find(c=>c.card===key)
  assert.equal(card.label,old.name);assert.equal(JSON.stringify(card.specSources.map(s=>s.url)),JSON.stringify(old.rows.map(s=>s.url)))
  assert.equal(new Set(card.specSources.map(s=>s.label)).size,card.specSources.length)
  assert.deepEqual(dialogIssues(card.auditMessage),[],key)
  for(const row of card.specSources) {
   assert.deepEqual(titleIssues(row,old.name,model.id),[],key)
   assert.equal(row.label,shared.titleSourceRows(structuredClone(card.specSources).map(s=>({...s,label:s.label.split(' · ')[0]})),model).find(s=>s.url===row.url).label)
   definition.methods.copySource({currentTarget:{dataset:{url:row.url,source:row.label,notice:card.auditMessage}}})
   assert.deepEqual(dialogIssues(modal.content),[],key);assert.ok(modal.content.endsWith(row.label));assert.equal(modal.confirmColor,'#28634f')
   modal.success({confirm:true});assert.equal(clipboard,row.url);rows++
  }
  for(const row of card.specRows)for(const icon of row.icons) {
   definition.methods.showModality({currentTarget:{dataset:{label:icon.accessibleLabel,detail:icon.tooltip}}})
   assert.deepEqual(dialogIssues(modal.content),[],key);assert.equal(modal.content,icon.tooltip);icons++
  }
  cards++
 }
 assert.equal(cards,1064);assert.equal(rows,1103);assert.ok(icons>=1064*8)
 t.diagnostic(JSON.stringify({cards,rows,icons,titleFindings:0,copyFindings:0}))
})
