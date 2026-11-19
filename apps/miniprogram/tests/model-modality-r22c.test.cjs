const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const {loadComponent}=require('./helpers/component.cjs')
const {STATIC_MODEL_REGISTRY}=require('../miniprogram/utils/static-model-catalog.js')
const {modalityIconStates}=require('../miniprogram/utils/card-presentation.js')
const root=path.join(__dirname,'../miniprogram/components/model-picker')
const filename=path.join(root,'model-picker.js'), context={Component(){},exports:{},require:require('node:module').createRequire(filename)}
require('node:vm').runInNewContext(fs.readFileSync(filename,'utf8')+'\nthis.present=presentModel',context,{filename})

test('R22C Mini presentation distinguishes supported, channel exclusion, vendor exclusion and unknown without changing facts',()=>{
 const fact={value:['text'],state:'known',provenance:'channel',unsupportedModalities:['image'],verifiedAt:'2026-11-09',sourceUrl:'https://example.com/spec'},before=structuredClone(fact)
 const icons=modalityIconStates('文本',fact)
 assert.deepEqual(icons.map(i=>i.state),['supported','unsupported','unknown','unknown'])
 assert.deepEqual(icons.map(i=>i.accessibleLabel),['支持文本输入','此渠道不支持图像输入','官方资料未说明是否支持视频输入','官方资料未说明是否支持音频输入'])
 assert.equal(icons[2].tooltip,'官方资料未说明是否支持视频输入')
 assert.match(icons[0].tooltip,/^支持文本输入$/)
 const vendor=modalityIconStates('文本',{...fact,provenance:'vendor'})
 assert.equal(vendor[1].accessibleLabel,'该模型不支持图像输入');assert.equal(vendor[1].state,'unsupported')
 assert.equal(vendor[2].tooltip,'官方资料未说明是否支持视频输入');assert.deepEqual(fact,before)
})
test('R22C compiled Mini Qwen and historical cards use the same accessible labels and captured quote as Web',()=>{
 for(const model of STATIC_MODEL_REGISTRY.tokendance.models){
  const data=context.present(model,'','','tokendance');assert.ok(data,model.id);assert.doesNotMatch(JSON.stringify(data.specRows),/原厂资料标明不支持/,model.id)
  for(const row of data.specRows.slice(0,2))for(const icon of row.icons)if(icon.state==='unsupported')assert.match(icon.accessibleLabel,/^此渠道不支持/)
  if(model.id==='qwen3.6-plus')for(const row of data.specRows.slice(0,2))for(const icon of row.icons)assert.equal(icon.tooltip,(icon.state==='unsupported'?'此渠道不支持':'支持')+icon.label+row.label)
  if(model.id==='deepseek-v4-flash-vision-exp')for(const icon of data.specRows[0].icons){assert.equal(icon.state,'unknown');assert.match(icon.tooltip,/^官方资料未说明是否支持(文本|图像|视频|音频)输入$/)}
 }
})
test('R22C Mini WXML binds names, data states with one undecorated glyph; tap opens exact evidence without selecting',()=>{
 const wxml=fs.readFileSync(path.join(root,'model-picker.wxml'),'utf8'),css=fs.readFileSync(path.join(root,'model-picker.wxss'),'utf8')
 assert.match(wxml,/data-state="\{\{icon.state\}\}"/);assert.match(wxml,/aria-label="\{\{icon.accessibleLabel\}\}"/)
 assert.doesNotMatch(wxml+css,/modality-strike|modality-question|dashed|stroke-dasharray/);assert.doesNotMatch(css,/is-conditional[^}]*color:#68786d/)
 assert.match(css,/\.modality-icon\{[^}]*width:20px;height:20px;flex:0 0 20px/)
 assert.doesNotMatch(wxml,/unsupportedText.*不支持/)
 let modal
 const {instance,events}=loadComponent('components/model-picker/model-picker.js',{}, {wx:{showModal:value=>{modal=value}}})
 instance.showModality({currentTarget:{dataset:{label:'输入 · 此渠道不支持图像输入',detail:'此渠道不支持图像输入'}}})
 assert.deepEqual(JSON.parse(JSON.stringify(modal)),{title:'输入 · 此渠道不支持图像输入',content:'此渠道不支持图像输入',showCancel:false})
 assert.equal(events.length,0)
})
