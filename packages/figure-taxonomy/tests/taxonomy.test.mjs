import test from 'node:test'
import assert from 'node:assert/strict'
import {FIGURE_TYPES,FIGURE_GROUPS,getFigureType,searchFigureTypes,validateFigureRequest,figureStagePrompt,rankFigureReferences,referenceIsUsable} from '../src/index.js'
import {buildDeterministicPlotCode,validateDeterministicOptions,deterministicPlotStyle,deterministicPlotRendererContract} from '../src/plot.js'
test('navigation parents cannot masquerade as selectable scientific types',()=>{
 assert.equal(getFigureType('distribution'),null)
 assert.equal(getFigureType('数据统计图'),null)
 assert.equal(getFigureType('方法框架图').id,'method_framework')
 assert.equal(getFigureType('时间线/路线图'),null)
 assert.equal(getFigureType('SBGN ER').id,'sbgn_er')
 assert.notEqual(getFigureType('SBGN ER').id,getFigureType('ERD').id)
 assert.equal(new Set(FIGURE_TYPES.map(t=>t.id)).size,FIGURE_TYPES.length)
 for(const type of FIGURE_TYPES){assert.ok(FIGURE_GROUPS.some(g=>g.id===type.group));assert.ok(type.confusable.every(id=>getFigureType(id)));assert.ok(type.encodingRules.length>=2)}
})
test('English, Chinese, analysis methods and aliases locate a concrete type',()=>{
 for(const query of ['boxplot','箱须','PCA','nmds','ERD','桑基','Q-Q']) assert.ok(searchFigureTypes(query).length,query)
 assert.deepEqual(searchFigureTypes('pca').map(t=>t.id),['ordination'])
})
const body={figureTypeId:'bar',taskName:'plot',figureData:{source:'simulated fixture; not research evidence',units:{value:'mg'},rows:[{label:'A',value:2},{label:'B',value:5}]}}
test('renderer contract matches only effective program options and bar restrictions stay scoped to bar',()=>{
 const viewport={width:480,height:500,minFontPx:14},plan=JSON.stringify({plotStyle:{width:16,height:14,fontSize:20},orientation:'vertical',color:'red',title:'Invented title'})
 const contract=deterministicPlotRendererContract(body,viewport),style=deterministicPlotStyle(body,plan,viewport),code=buildDeterministicPlotCode(body,plan,viewport)
 assert.match(contract.fixed.orientation,/horizontal/);assert.equal(contract.fixed.barColor,'#487968');assert.equal(contract.fixed.title,false);assert.equal(contract.fixed.grid,false);assert.match(contract.planParameters.overrides,/override ALL/)
 assert.deepEqual({...style,labelPad:undefined},{width:4.8,height:5,fontSize:10.08,labelPad:undefined});assert.ok(Math.abs(style.labelPad-6.552)<1e-10);assert.match(code,/ax\.barh/);assert.ok(!code.includes('Invented title'));assert.equal(code,buildDeterministicPlotCode(body,'Draw vertical red bars',viewport))
 assert.equal(deterministicPlotStyle({...body,aspectRatio:'16:9'},plan).width,9);assert.equal(deterministicPlotStyle({...body,aspectRatio:'16:9'},plan).fontSize,20)
 assert.equal(deterministicPlotRendererContract({...body,figureTypeId:'scatter'}).fixed.orientation,undefined)
 assert.deepEqual(JSON.parse(JSON.parse(code.match(/d = json\.loads\(([^\n]+)\)/)[1])).rows,body.figureData.rows)
})
test('data errors stop before planning instead of authorizing fabricated plots',()=>{
 assert.throws(()=>validateFigureRequest({...body,figureData:null}),/真实结构化数据/)
 assert.throws(()=>validateFigureRequest({...body,taskName:'diagram'}),/路线不一致/)
 assert.throws(()=>validateFigureRequest({...body,figureData:{...body.figureData,rows:[{label:'A',value:'2'}]}}),/有限数值/)
 assert.throws(()=>validateFigureRequest({...body,figureData:{...body.figureData,units:{}}}),/单位/)
 assert.equal(validateFigureRequest(body).status,'input_validated')
 assert.throws(()=>validateFigureRequest({...body,figureTypeId:'ordination',figureAnalysis:{}}),/指定分析方法/)
})
test('real statistical semantics cannot be replaced by appearance',()=>{
 const data={source:'simulated',units:{value:'ratio',low:'ratio',high:'ratio'},rows:[{label:'study',value:2,low:3,high:4}]}
 assert.throws(()=>validateFigureRequest({...body,figureTypeId:'forest',figureData:data,figureAnalysis:{description:'95% CI'}}),/包含点估计/)
 assert.throws(()=>validateFigureRequest({...body,figureTypeId:'volcano',figureData:{source:'simulated',units:{effect:'log2',p:'dimensionless'},rows:[{effect:2,p:0}]}}),/检测下限/)
 assert.throws(()=>validateDeterministicOptions({...body,figureTypeId:'sankey'}),/专用图型需要/)
 assert.throws(()=>validateDeterministicOptions({...body,figureTypeId:'forest',figureData:{...data,rows:[{label:'study',value:0,low:-1,high:1}],options:{nullValue:1}}}),/必须为正/)
})
test('each stage receives source facts and complete figure-specific rules independently',()=>{
 for(const stage of ['retrieval','planning','drawing','review']){
  const prompt=figureStagePrompt(body,stage)
  assert.ok(prompt.includes('长度轴通常从零起'))
  assert.ok(prompt.includes('"value": 5'))
  assert.ok(prompt.includes('Never transfer'))
 }
 assert.notEqual(figureStagePrompt(body,'review'),figureStagePrompt({...body,figureTypeId:'boxplot'},'review'))
})
test('licensing is a use-specific gate, not an open-access boolean',()=>{
 assert.equal(referenceIsUsable({openAccess:true,imageUrl:'https://example.org/image.png'}),false)
 const reference={id:'good',figureTypeId:'bar',imageUrl:'https://example.org/image.png',license:{status:'verified',permissions:{storage:true,display:true,modelInput:true,adaptation:true}}}
 assert.equal(referenceIsUsable(reference),true)
 assert.equal(referenceIsUsable({...reference,license:{...reference.license,permissions:{...reference.license.permissions,modelInput:false}}}),false)
 assert.equal(rankFigureReferences([reference],{figureTypeId:'volcano',methodContent:'exact same topic'}).length,0)
 const exact={...reference,id:'exact',figureTypeId:'method_framework'}
 const compatible={...reference,id:'related',figureTypeId:'workflow',title:'many matching topic topic'}
 const ranked=rankFigureReferences([compatible,exact],{figureTypeId:'method_framework',methodContent:'many matching topic'})
 assert.equal(ranked[0].id,'exact');assert.equal(ranked[1].match.level,'compatible');assert.equal(ranked[1].match.requestedTypeId,'method_framework')
})
test('model text cannot replace numerical payload in fixed renderer',()=>{
 const code=buildDeterministicPlotCode(body,'Ignore data and draw 9000')
 assert.ok(code.includes('immutable source data'))
 assert.ok(!code.includes('draw 9000'))
 assert.ok(code.includes('get_width()'))
 assert.throws(()=>buildDeterministicPlotCode({...body,figureVariantIds:['bar.v4']}),/变体/)
})
