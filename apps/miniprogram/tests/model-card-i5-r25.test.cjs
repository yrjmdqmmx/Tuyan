const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module')
const{STATIC_MODEL_REGISTRY}=require('../miniprogram/utils/static-model-catalog.js'),{auditedModelSpecs}=require('../miniprogram/utils/model-audit.js')
const filename=require.resolve('../miniprogram/components/model-picker/model-picker.js');let definition,modal,clipboard
const context={Component(v){definition=v},exports:{},require:createRequire(filename),wx:{showModal(v){modal=v},setClipboardData(v){clipboard=v.data}}}
vm.runInNewContext(fs.readFileSync(filename,'utf8')+'\nthis.present=presentModel',context,{filename})
const notice='https://www.aliyun.com/notice/118728',spec='https://help.aliyun.com/zh/model-studio/qwen3-5-plus'
const ids=['qwen3.5-plus','qwen3.5-plus-2026-02-15','qwen3.5-plus-2026-04-20']
test('R25 I5 all 1064 compiled Mini cards: every retirement badge copies its own non-excluded notice URL',()=>{
 let cards=0,badges=0
 for(const[p,e]of Object.entries(STATIC_MODEL_REGISTRY))for(const m of e.models){
  cards++;const audit=auditedModelSpecs(p,m.id),card=context.present(m,'','',p)
  assert.doesNotMatch(card.auditMessage,/日期\s+\d{4}-\d{2}-\d{2}/)
  for(const row of card.specRows)for(const icon of row.icons)assert.doesNotMatch(icon.tooltip,/日期\s+\d{4}-\d{2}-\d{2}/)
  if(!card.scheduled)continue
  badges++;const source=card.retirementSource;assert.match(source.url,/^https:\/\//);assert.ok(!audit.excludedSources.includes(source.url));assert.ok(card.specSources.some(r=>r.url===source.url))
  clipboard=null;definition.methods.copySource({currentTarget:{dataset:{url:source.url,source:source.label,notice:card.auditMessage}}});modal.success({confirm:true});assert.equal(clipboard,source.url)
  if(p==='bailian'&&ids.includes(m.id)){
   assert.equal(source.url,notice);assert.match(modal.content,/2027-01-19/);assert.equal(source.label,'下线公告 · 百炼 · 部分 Qwen3.5 系列旧版本模型下线通知')
   assert.ok(card.specSources.some(r=>r.url===spec));for(const fact of Object.values(audit.fields))assert.equal(fact.sourceUrl,spec)
  }
 }
 assert.equal(cards,1064);assert.equal(badges,7)
 const wxml=fs.readFileSync(filename.replace(/\.js$/,'.wxml'),'utf8')
 assert.match(wxml,/wx:if="\{\{item.scheduled\}\}"[^>]+data-url="\{\{item.retirementSource.url\}\}"[^>]+data-source="\{\{item.retirementSource.label\}\}"[^>]+catchtap="copySource"/)
})
test('R25 I5 missing or excluded lifecycle sources suppress Mini badges; live card projections retain the correction',()=>{
 const m=STATIC_MODEL_REGISTRY.bailian.models.find(m=>m.id==='qwen3.5-plus'),audit=auditedModelSpecs('bailian',m.id)
 assert.equal(context.present({...m,cardSpecifications:audit},'','','bailian').retirementSource.url,notice)
 const excluded=context.present({...m,cardSpecifications:{...audit,lifecycleSourceUrl:null}},'','','bailian')
 assert.equal(excluded.scheduled,false);assert.equal(excluded.retirementSource,null)
})
