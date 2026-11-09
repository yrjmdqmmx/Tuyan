import test from 'node:test'
import assert from 'node:assert/strict'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
import {CURATED_REFERENCES,retrieveFigureCandidates} from '../../../packages/figure-taxonomy/src/library.js'
test('manual references retain user order and accurately label structural matches and unmatched choices',async()=>{
 const r=await createRefineRuntime()
 try {
  let calls=0;r.legacy.configureRuntimeFetch(async()=>{calls++;throw Error('Unexpected model request')})
  const exact=retrieveFigureCandidates({figureTypeId:'bar'}).find((x:any)=>x.match.level==='exact')!
  const unrelated=CURATED_REFERENCES.find((x:any)=>x.figureTypeId==='chemical_reaction')!
  const selected=await r.legacy.resolveRetrievedReferences({figureTypeId:'bar',retrievalSetting:'manual',manualReferenceIds:[unrelated.id,exact.id]}, {})
  assert.deepEqual(selected.map((x:any)=>x.id),[unrelated.id,exact.id]);assert.equal(selected[0].match.level,'manual_unmatched');assert.equal(selected[1].match.level,'exact');assert.equal(calls,0)
 }finally{await r.close()}
})
