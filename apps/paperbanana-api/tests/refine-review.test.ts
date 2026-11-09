import test from 'node:test'
import assert from 'node:assert/strict'
import {refineReviewRequirements} from '../../../packages/api/src/refine-review.js'
import {parsePngDecision} from '../../../packages/api/src/png-workflow.js'
import {imageEvidenceBatches} from '../src/image-evidence.js'
const hash='a'.repeat(64)
const requirements=refineReviewRequirements({version:1,references:[{objectKey:'r',purpose:'color',note:'cyan only'}],mask:{objectKey:'m'},structured:{object:'Output',attributes:'larger',relationship:'retain arrow',preserve:'Input position'}})
const response=()=>({version:1,pngHash:hash,visual:{status:'passed',findings:[]},uncertainties:[],revised_description:'No changes needed.',editChecks:requirements.map(r=>({id:r.id,status:'passed',evidence:'Specific synthetic comparison of this requirement against current and input evidence'}))})
const parse=(r:any)=>parsePngDecision(JSON.stringify(r),1,hash,false,undefined,[],requirements)
test('refine checks cover reference purpose, mask semantics and every structured constraint',()=>{
 assert.deepEqual(requirements.map(r=>r.id),['reference-1','mask','structured-object','structured-attributes','structured-relationship','structured-preserve'])
 assert.equal(parse(response()).passed,true)
 for(const checks of [undefined,[],response().editChecks.slice(1),response().editChecks.map((c,i)=>({...c,id:i?'mask':c.id})),response().editChecks.map(c=>({...c,id:'old-'+c.id})),response().editChecks.map(c=>({...c,evidence:''}))])assert.throws(()=>parse({...response(),editChecks:checks}),/精修/)
})
test('uncertain or failed edit comparisons cannot be waived by an overall visual pass',()=>{
 for(const status of ['uncertain','issues_found']){
  const r=response();r.editChecks[0].status=status
  assert.throws(()=>parse(r),/结论与修改方案矛盾/)
  r.revised_description='Complete plan: implement reference cyan only and preserve all original nodes.'
  const decision=parse(r);assert.equal(decision.passed,false);assert.deepEqual(JSON.parse(decision.assessment).editRequirements,requirements)
 }
 const r=response();delete (r as any).editChecks
 assert.equal(parsePngDecision(JSON.stringify(r),1,hash,false,undefined,[],[]).passed,true,'no new requirements preserves existing review contract')
})
test('image batches preserve ordering and all inputs under count AND aggregate byte budgets',()=>{
 const items=[{id:'current',bytes:6},{id:'original',bytes:6},{id:'reference',bytes:3},{id:'mask',bytes:2}]
 const budget=(batch:typeof items)=>{if(batch.length>2||batch.reduce((n,x)=>n+x.bytes,0)>10)throw Error('over budget')}
 const batches=imageEvidenceBatches(items,budget)
 assert.deepEqual(batches.map(b=>b.map(x=>x.id)),[['current'],['original','reference'],['mask']]);assert.deepEqual(batches.flat(),items)
 assert.throws(()=>imageEvidenceBatches([...items,{id:'too-large',bytes:11}],budget),/over budget/)
})
