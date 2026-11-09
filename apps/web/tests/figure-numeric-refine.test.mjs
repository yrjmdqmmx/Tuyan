import test,{afterEach} from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {render,screen,cleanup} from '@testing-library/react'
import JobStatus from '../src/components/JobStatus.jsx'
afterEach(cleanup)
test('data and mixed result cards offer input restoration and block generative refinement',()=>{
 for(const figure of [{figureTypeId:'bar'},{figureTypeId:'multipanel',figurePanels:[{label:'A',figureTypeId:'workflow'},{label:'B',figureTypeId:'bar'}]},{generationContext:{figureTypeId:'multipanel',figurePanels:[{figureTypeId:'bar'}]}}]){
  render(React.createElement(JobStatus,{apiBase:'https://example.invalid',onUseForRefine:()=>{},onRestoreInput:()=>{},job:{id:'qa',status:'succeeded',num_candidates:1,output_format:'png',...figure,result_images:[{filename:'synthetic.png',url:'https://example.invalid/synthetic.png',mime_type:'image/png',candidate_id:0}]}}))
  assert.equal(screen.queryByRole('button',{name:'精修候选图 1'}),null)
  assert.ok(screen.getByRole('button',{name:'恢复图型与完整输入'}));assert.ok(screen.getByText(/生图精修可能改变数值，已停用/));cleanup()
 }
 render(React.createElement(JobStatus,{apiBase:'https://example.invalid',onUseForRefine:()=>{},job:{id:'qa',status:'succeeded',figureTypeId:'workflow',num_candidates:1,result_images:[{filename:'synthetic.png',url:'https://example.invalid/synthetic.png',mime_type:'image/png',candidate_id:0}]}}))
 assert.ok(screen.getByRole('button',{name:'精修候选图 1'}))
})
