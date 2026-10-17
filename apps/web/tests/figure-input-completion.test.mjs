import test,{afterEach} from 'node:test'
import assert from 'node:assert/strict'
import React,{useState} from 'react'
import {render,screen,fireEvent,cleanup,within} from '@testing-library/react'
import FigureInputs from '../src/components/FigureInputs.jsx'
import {SPECIALIST_SCHEMAS,validateFigureRequest} from '../../../packages/figure-taxonomy/src/index.js'
import {figurePayload,figureDraftFromPayload,syntheticFigureDraft,schemaOptionFields,validateFigureOptions,switchPanelType} from '../src/lib/figureInput.js'
import {saveFigureSettings,loadFigureSettings,restoreFigureTask} from '../src/lib/figureSettings.js'
afterEach(cleanup)
function Editor({typeId,initial={}}){const [draft,setDraft]=useState(initial);return React.createElement(React.Fragment,null,React.createElement(FigureInputs,{typeId,draft,onChange:setDraft}),React.createElement('output',{'data-testid':'draft'},JSON.stringify(draft)))}
function memoryStorage(){const values=new Map();return {getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),values}}

test('all 23 specialist schemas restore rows, options, units and analysis without changing data',()=>{
 assert.equal(Object.keys(SPECIALIST_SCHEMAS).length,23)
 for(const [id,schema] of Object.entries(SPECIALIST_SCHEMAS)){
  const body=figurePayload(id,figureDraftFromPayload(schema.example))
  assert.deepEqual(body.figureData,schema.example.figureData,id)
  assert.deepEqual(body.figureAnalysis,schema.example.figureAnalysis,id)
  assert.doesNotThrow(()=>validateFigureRequest(body),id)
  assert.doesNotThrow(()=>validateFigureOptions(body),id)
  assert.deepEqual(schemaOptionFields(id).map(f=>f.key),schema.options.map(spec=>spec.split(':')[0].replace(/\?$/,'')),id)
 }
})
test('numeric fields outside catalog and dynamic axes parse as numbers in CSV',()=>{
 const cumulative=syntheticFigureDraft('cumulative_incidence');cumulative.dataMode='csv';cumulative.csv='id,time,event,cause\na,1,1,A\nb,2,0,null'
 assert.deepEqual(figurePayload('cumulative_incidence',cumulative).figureData.rows,[{id:'a',time:1,event:1,cause:'A'},{id:'b',time:2,event:0,cause:null}])
 const parallel=syntheticFigureDraft('parallel_coordinates');parallel.dataMode='csv';parallel.csv='id,height,mass,age\nP1,160,50,30\nP2,180,80,50'
 assert.equal(figurePayload('parallel_coordinates',parallel).figureData.rows[0].height,160)
 const synteny=syntheticFigureDraft('synteny');synteny.dataMode='csv';synteny.csv='source,start,end,target,targetStart,targetEnd,strand\nGenome A,100,350,Genome B,200,450,+'
 assert.equal(figurePayload('synteny',synteny).figureData.rows[0].targetStart,200)
 const calibration=figurePayload('calibration',{csv:'predicted,observed,count\n0.2,0.3,10',source:'observations',units:{predicted:'dimensionless',observed:'dimensionless'}})
 assert.equal(calibration.figureData.rows[0].count,10)
})
test('editable structured parameter JSON stays raw until validated; malformed data never silently replaces supplied values',()=>{
 const draft=syntheticFigureDraft('choropleth');draft.optionInputs={regions:'[{"id":"A","polygon":[[0,0],[2,0],[2,2],[0,2]]}]',boundaries:'[0,10,20,30]'}
 assert.deepEqual(figurePayload('choropleth',draft).figureData.options.regions[0].polygon,[[0,0],[2,0],[2,2],[0,2]])
 draft.optionInputs.regions='[{'
 assert.throws(()=>figurePayload('choropleth',draft),/options.regions不是有效 JSON/)
 const invalid=syntheticFigureDraft('dendrogram');invalid.unitsJson='{'
 assert.throws(()=>figurePayload('dendrogram',invalid),/单位不是有效 JSON/)
 const qq=syntheticFigureDraft('qq');qq.optionInputs={mean:'2',sd:'3',reference:'normal'}
 assert.equal(figurePayload('qq',qq).figureData.options.mean,2)
 assert.equal(figurePayload('qq',qq).figureData.options.sd,3)
})
test('specialist UI starts empty, creates synthetic data only after opt-in and submits edited parameter values',()=>{
 render(React.createElement(Editor,{typeId:'network'}))
 assert.equal(screen.getByLabelText('节点连接网络图数据行 JSON').value,'')
 assert.equal(screen.getByLabelText('options.nodes').value,'')
 fireEvent.click(screen.getByRole('button',{name:/填入模拟教学示例/}))
 assert.match(screen.getByLabelText('数据来源').value,/Synthetic/)
 fireEvent.change(screen.getByLabelText('options.nodes'),{target:{value:'[{"id":"A"},{"id":"B"},{"id":"C"},{"id":"D"}]'}})
 fireEvent.change(screen.getByLabelText('options.directed'),{target:{value:'false'}})
 const draft=JSON.parse(screen.getByTestId('draft').textContent)
 const payload=figurePayload('network',draft)
 assert.equal(payload.figureData.options.directed,false)
 assert.equal(payload.figureData.options.nodes.at(-1).id,'D')
 fireEvent.click(screen.getByRole('button',{name:/检查数据与参数/}))
 assert.ok(screen.getByText(/数据与专用参数检查通过/))
})
test('every specialist input renders all dedicated parameter controls with visible requirements',()=>{
 for(const [id,schema] of Object.entries(SPECIALIST_SCHEMAS)){
  const view=render(React.createElement(Editor,{typeId:id}))
  for(const field of schemaOptionFields(id))assert.ok(screen.getByLabelText(`options.${field.key}`),`${id}:${field.key}`)
  assert.ok(screen.getByText(schema.help).closest('details'),id)
  assert.match(screen.getByText(schema.help).closest('.figure-specialist-contract').querySelector('p').textContent,/[\u4e00-\u9fff]/,id)
  view.unmount()
 }
})
test('composite UI preserves per-type data drafts and per-panel content while changing types',()=>{
 const initial={panels:[{label:'A',typeId:'bar',methodContent:'A research method describes supplied observations',caption:'Panel A',draft:{csv:'label,value\nA,7',source:'batch A',units:{value:'mg'}}},{label:'B',typeId:'workflow',methodContent:'B research method describes process structure',caption:'Panel B',draft:{}}]}
 render(React.createElement(Editor,{typeId:'multipanel',initial}))
 const panel=within(screen.getAllByRole('group')[0])
 fireEvent.change(panel.getByLabelText('子图类型'),{target:{value:'network'}})
 assert.equal(panel.getByLabelText('节点连接网络图数据行 JSON').value,'')
 fireEvent.change(panel.getByLabelText('子图类型'),{target:{value:'bar'}})
 assert.equal(panel.getByLabelText('柱形图数据表').value,'label,value\nA,7')
 assert.equal(panel.getByLabelText('本面板图注').value,'Panel A')
 const draft=JSON.parse(screen.getByTestId('draft').textContent),body=figurePayload('multipanel',draft)
 assert.equal(body.figurePanels[0].methodContent,initial.panels[0].methodContent)
 assert.equal(body.figurePanels[0].figureData.rows[0].value,7)
 assert.doesNotThrow(()=>validateFigureRequest(body));assert.doesNotThrow(()=>validateFigureOptions(body))
 draft.panels[0]=switchPanelType(draft.panels[0],'histogram');draft.panels[0].draft={csv:'value\n1',source:'real',units:{value:'mg'},options:{bins:0}}
 assert.throws(()=>validateFigureOptions(figurePayload('multipanel',draft)),/bins/)
})
test('reload restores complete typed composite draft/output/user content while credentials are excluded',()=>{
 const storage=memoryStorage(),panels=[{label:'A',typeId:'radar',methodContent:'First panel',caption:'Caption A',draft:syntheticFigureDraft('radar')},{label:'B',typeId:'choropleth',methodContent:'Second panel',caption:'Caption B',draft:syntheticFigureDraft('choropleth')}]
 const settings={figureTypeId:'multipanel',figureDrafts:{multipanel:{panels},bar:{csv:'label,value\nA,5',source:'study',units:{value:'mg'}}},outputFormat:'svg',methodContent:'User supplied methods',caption:'User caption',negativePrompt:'Do not fabricate',apiKeys:{provider:'private'},figureAnalysis:{description:'Explicit analysis',apiKey:'private'}}
 assert.equal(saveFigureSettings(settings,storage),true)
 const restored=loadFigureSettings(storage)
 assert.equal(restored.outputFormat,'svg');assert.equal(restored.methodContent,settings.methodContent)
 assert.deepEqual(restored.figureDrafts,settings.figureDrafts)
 assert.deepEqual(figurePayload('multipanel',restored.figureDrafts.multipanel),figurePayload('multipanel',{panels}))
 assert.equal(restored.apiKeys,undefined);assert.equal(restored.figureAnalysis.apiKey,undefined)
 assert.equal(JSON.stringify([...storage.values.values()]).includes('private'),false)
 const job={...figurePayload('multipanel',{panels}),method_content:'Saved methods',caption:'Saved figure',output_format:'svg',image_size:'4K',aspect_ratio:'16:9'}
 const task=restoreFigureTask(job)
 assert.deepEqual(figurePayload(task.figureTypeId,task.draft),figurePayload('multipanel',{panels}))
 assert.equal(task.methodContent,'Saved methods');assert.equal(task.outputFormat,'svg');assert.equal(task.imageSize,'4K')
})

test('synthetic replacement clears old raw option and units drafts instead of shallow merging',()=>{
 const qq=syntheticFigureDraft('qq');qq.optionInputs={mean:'20',sd:'8'};qq.unitsJson='{"value":"wrong"}';qq.csv='value\n999'
 let view=render(React.createElement(Editor,{typeId:'qq',initial:qq}))
 fireEvent.click(screen.getByRole('button',{name:/填入模拟教学示例/}))
 let draft=JSON.parse(screen.getByTestId('draft').textContent)
 assert.deepEqual(figurePayload('qq',draft).figureData,SPECIALIST_SCHEMAS.qq.example.figureData)
 assert.equal(draft.optionInputs,undefined);assert.equal(draft.unitsJson,undefined);assert.equal(draft.csv,undefined)
 assert.equal(screen.getByLabelText('options.mean').value,'0');assert.equal(screen.getByLabelText('options.sd').value,'1')
 view.unmount()
 const dendrogram=syntheticFigureDraft('dendrogram');dendrogram.unitsJson='{';dendrogram.optionInputs={dimensions:'{',linkage:'['}
 render(React.createElement(Editor,{typeId:'dendrogram',initial:dendrogram}))
 fireEvent.click(screen.getByRole('button',{name:/填入模拟教学示例/}))
 draft=JSON.parse(screen.getByTestId('draft').textContent)
 assert.deepEqual(figurePayload('dendrogram',draft).figureData,SPECIALIST_SCHEMAS.dendrogram.example.figureData)
 assert.equal(draft.unitsJson,undefined);assert.equal(draft.optionInputs,undefined)
 assert.doesNotThrow(()=>validateFigureOptions(figurePayload('dendrogram',draft)))
})
