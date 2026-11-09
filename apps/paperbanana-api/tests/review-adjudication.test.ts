import test from 'node:test'
import assert from 'node:assert/strict'
import {indexVisualObservation} from '../../../packages/api/src/review-adjudication.js'
import {parsePngDecision} from '../../../packages/api/src/png-workflow.js'
import {parseSvgDecision,parseSvgObservation} from '../../../packages/api/src/svg-workflow.js'
const hash='a'.repeat(64),report={problems:[{issue:'Module missing',location:'right',evidence:'No box',suggestion:'Restore'}],uncertainties:['Label unreadable']}
const issues=indexVisualObservation(report,2,hash)
const base={version:2,pngHash:hash,svgHash:hash,visual:{status:'passed',findings:[]},code:{status:'passed',findings:[]},uncertainties:[],revised_description:'No changes needed.'}
const decisions=issues.map(({id})=>({id,decision:'reject',reason:'Observer confused the background with a box.',evidence:'Full SVG contains the output node at x=100 and label Output at x=110.'}))
for(const parser of [parsePngDecision,parseSvgDecision]){
 const parse=(changes:any={},expected=issues)=>parser(JSON.stringify({...base,...changes}),2,hash,false,undefined,expected)
 test(`${parser.name}: cannot omit, merge, duplicate, forge or replay observer decisions`,()=>{
  assert.throws(()=>parse(),/逐项裁决/)
  for(const visualAdjudications of [[decisions[0]],[decisions[0],decisions[0]],decisions.map(x=>({...x,id:'unknown'})),decisions.map(x=>({...x,reason:''})),decisions.map(x=>({...x,evidence:''})),decisions.map(x=>({...x,decision:'passed'}))])assert.throws(()=>parse({visualAdjudications}),/裁决/)
  assert.throws(()=>parse({visualAdjudications:decisions},indexVisualObservation(report,3,hash)),/过期/)
  assert.throws(()=>parse({visualAdjudications:decisions},indexVisualObservation(report,2,hash,'current',2)),/过期/)
  assert.throws(()=>parse({visualAdjudications:decisions},indexVisualObservation(report,2,'b'.repeat(64))),/过期/)
 })
 test(`${parser.name}: explicit evidence-based rejection may pass; acceptance or uncertainty cannot`,()=>{
  const accepted=parse({visualAdjudications:decisions})
  assert.equal(accepted.passed,true)
  assert.deepEqual(JSON.parse(accepted.assessment).auxiliaryVisualIssues,issues)
  for(const decision of ['accept','unresolved']){
   const visualAdjudications=decisions.map(x=>({...x,decision}))
   assert.throws(()=>parse({visualAdjudications}),/方案/)
   assert.equal(parse({visualAdjudications,revised_description:'Redraw the complete Input to Output workflow with both nodes and readable labels.'}).passed,false)
  }
  assert.equal(parse({},[]).passed,true)
  assert.throws(()=>parse({visualAdjudications:decisions},[]),/裁决/)
 })
}
test('original-image uncertainties have separate bound IDs; SVG observation rejects malformed uncertainty',()=>{
 const original=indexVisualObservation(report,2,hash,'original')
 assert.notEqual(original[0].id,issues[0].id)
 assert.throws(()=>parseSvgObservation(JSON.stringify({content:'x',layout:'x',actual_text:[],connections:[],problems:[],suggestions:[],uncertainties:[{}]})),/不确定/)
})
