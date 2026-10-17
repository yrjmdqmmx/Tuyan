import test,{afterEach} from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {render,screen,fireEvent,cleanup} from '@testing-library/react'
import FigureTypePicker from '../src/components/FigureTypePicker.jsx'
import FigureInputs from '../src/components/FigureInputs.jsx'
import {parseFigureCsv,figurePayload} from '../src/lib/figureInput.js'
import {loadFigureSettings,saveFigureSettings} from '../src/lib/figureSettings.js'
import {browseFigureReferences,selectFigureReferences} from '../../../packages/figure-taxonomy/src/library.js'
afterEach(cleanup)
test('navigation does not select parents; alias search chooses a concrete type directly',()=>{
 const chosen=[];render(React.createElement(FigureTypePicker,{value:'method_framework',onChange:id=>chosen.push(id)}))
 fireEvent.click(screen.getByLabelText('信息图类别'))
 assert.ok(screen.getByRole('dialog',{name:'选择信息图类别'}))
 fireEvent.click(screen.getByRole('button',{name:/分布与不确定性/}))
 assert.deepEqual(chosen,[])
 fireEvent.change(screen.getByRole('searchbox',{name:'搜索图类'}),{target:{value:'PCA'}})
 fireEvent.click(screen.getByRole('button',{name:/排序投影图 Ordination/}))
 assert.deepEqual(chosen,['ordination']);assert.equal(screen.queryByRole('dialog'),null)
})
test('Escape cancels selection and old labels resolve on restore',()=>{
 const chosen=[];render(React.createElement(FigureTypePicker,{value:'workflow',onChange:id=>chosen.push(id)}))
 fireEvent.click(screen.getByLabelText('信息图类别'))
 fireEvent.keyDown(window,{key:'Escape'});assert.equal(screen.queryByRole('dialog'),null);assert.deepEqual(chosen,[])
 const values=new Map();const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}
 assert.equal(saveFigureSettings({figureTypeId:'boxplot'},storage),true)
 assert.equal(loadFigureSettings(storage).figureTypeId,'boxplot')
 assert.equal(saveFigureSettings({figureTypeId:'data_stat'},storage),false)
})
test('CSV quoting, explicit missing values, units and independent type drafts',()=>{
 assert.deepEqual(parseFigureCsv('label,value\n"A, one",2\nB,4',['value']),[{label:'A, one',value:2},{label:'B',value:4}])
 assert.throws(()=>parseFigureCsv('label,value\nA,',['value']),/有效数值/)
 assert.throws(()=>parseFigureCsv('label,label\nA,1',[]),/表头/)
 assert.throws(()=>parseFigureCsv('label,value\n"A,2',['value']),/引号/)
 const body=figurePayload('bar',{csv:'label,value\nA,2',source:'batch1',units:{value:'mg'}})
 assert.equal(body.figureData.rows[0].value,2)
 render(React.createElement(FigureInputs,{typeId:'bar',draft:{},onChange:()=>{}}))
 assert.ok(screen.getByLabelText('柱形图数据表'))
 assert.ok(screen.getByLabelText('value单位'))
})
test('library shares stable types, aliases, and explicit empty coverage',()=>{
 const matrix=browseFigureReferences({query:'SBGN ER'})
 assert.ok(matrix.references.some(row=>row.panelTypes.some(p=>p.typeId==='sbgn_er')))
 const empty=browseFigureReferences({figureTypeId:'streamgraph'})
 assert.equal(empty.totalItems,0)
 assert.ok(empty.facets.visualCategories.some(f=>f.value==='streamgraph'&&f.count===0))
 assert.ok(browseFigureReferences({figureTypeId:'energy_diagram'}).totalItems>0)
 assert.throws(()=>selectFigureReferences(['ref_279']),/许可/)
 const result=browseFigureReferences({figureGroup:'bioscience'})
 assert.ok(result.references.length)
 assert.ok(result.references.every(r=>r.license.permissions.modelInput))
})

test('API normalizers preserve type/data provenance and zero-case filters',async()=>{
 const {referenceLibraryRequest,getJobRequest}=await import('../../../packages/api/src/jobs.js');const saved=globalThis.fetch;
 const typeBody={figureTypeId:'bar',figureSpecVersion:'2026-10-10.v1',figureData:{source:'synthetic',rows:[{label:'A',value:2}],units:{value:'mg'}},figureContract:{id:'bar'}};
 globalThis.fetch=async(_url,opts)=>JSON.parse(opts.body).action==='referenceLibrary'?Response.json({code:0,references:[],facets:{visualCategories:[{value:'energy_diagram',count:0}]}}):Response.json({code:0,job:{id:'historic',...typeBody}});
 try{const health={runtime:'gateway',code:0};const library=await referenceLibraryRequest('http://localhost:1',health,{page:1});assert.deepEqual(library.facets.visualCategories,[{value:'energy_diagram',count:0}]);const job=await getJobRequest('http://localhost:1',health,'historic');assert.deepEqual(job.figureData,typeBody.figureData);assert.equal(job.figureTypeId,'bar');assert.deepEqual(job.figureContract,typeBody.figureContract)}finally{globalThis.fetch=saved}
})
