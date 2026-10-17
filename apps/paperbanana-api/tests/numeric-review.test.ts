import test from 'node:test'
import assert from 'node:assert/strict'
import {parsePngDecision} from '../../../packages/api/src/png-workflow.js'
import {parseSvgDecision} from '../../../packages/api/src/svg-workflow.js'
const base={version:2,pngHash:'current',svgHash:'current',visual:{status:'passed',findings:[]},code:{status:'passed',findings:[]},uncertainties:[],revised_description:'No changes needed.'}
for(const parse of [parsePngDecision,parseSvgDecision])test(`${parse.name} quantitative review cannot pass on labels alone or unresolved geometry`,()=>{
 assert.throws(()=>parse(JSON.stringify(base),2,'current',true),/数值/)
 const numericReview={applicable:true,reason:'Bar height encodes samples',checks:[{label:'Alpha/Beta',source:'source.pptx p2 chart raw cells',expected:'35/12 ratio 2.9167',observed:'Printed 35/12; pixel height ratio 2.59',method:'Baseline to bar tops; approximate pixel estimate',status:'issues_found'}]}
 assert.throws(()=>parse(JSON.stringify({...base,numericReview}),2,'current',true),/方案/)
 assert.equal(parse(JSON.stringify({...base,numericReview,revised_description:'Redraw 35 and 12 bars on a common zero baseline and equal ticks.'}),2,'current',true).passed,false)
 assert.equal(parse(JSON.stringify({...base,numericReview:{applicable:false,reason:'Only process boxes; no quantitative encoding',checks:[]}}),2,'current',true).passed,true)
})

import {numericReviewContract,validateNumericReview} from '../../../packages/api/src/numeric-review.js'
for(const parse of [parsePngDecision,parseSvgDecision])test(`${parse.name} server task contract prevents quantitative exemption`,()=>{
 const waiver={...base,numericReview:{applicable:false,reason:'Only labels were drawn',checks:[]}}
 for(const task of [{figureTypeId:'bar'},{figureTypeId:'multipanel',figurePanels:[{figureTypeId:'workflow'},{figureTypeId:'scatter'}]},{figureData:{rows:[['A',35]]}},{generationContext:{figureTypeId:'bar'},figureTypeId:'workflow'}]){
  const contract=numericReviewContract(task)
  assert.equal(contract.applicableRequired,true)
  assert.throws(()=>parse(JSON.stringify({...waiver,numericReviewContract:{applicableRequired:false}}),2,'current',true,contract),/定量/)
 }
 const process=numericReviewContract({figureTypeId:'workflow',methodContent:'Step 1 then Step 2; use p53 labels'})
 assert.equal(parse(JSON.stringify(waiver),2,'current',true,process).passed,true)
 const contract=numericReviewContract({figureTypeId:'bar'})
 const numericReview={applicable:true,reason:'Bars encode source values',checks:[{label:'A',source:'user data A=35',expected:'35',observed:'height 70 at scale 2',method:'SVG baseline 100, top 30',status:'passed',linearScale:{coordinate0:100,coordinate1:0,value0:0,value1:50,markCoordinate:30,sourceValue:35,pixelsPerUnit:2}}]}
 assert.equal(parse(JSON.stringify({...base,numericReview}),2,'current',true,contract).passed,true)
 assert.throws(()=>parse(JSON.stringify({...base,numericReview:{...numericReview,checks:[]}}),2,'current',true,contract),/矛盾/)
})

test('a quantitative server contract itself requires a numeric record',()=>{assert.throws(()=>validateNumericReview(undefined,false,{applicableRequired:true}),/数值/);assert.equal(validateNumericReview(undefined,false),true)})
