import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {JOURNAL_REFERENCES} from '../src/references.js'
import {FIGURE_TYPES,referenceIsUsable} from '../src/index.js'
import {browseFigureReferences,retrieveFigureCandidates,selectFigureReferences} from '../src/library.js'

const root=new URL('../../../',import.meta.url)
const json=path=>JSON.parse(fs.readFileSync(new URL(path,root),'utf8'))
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')
const batch=json('scripts/figures/expansion-20261010.json')
const audit=json('docs/infographic-v400/evidence/expansion-20261010-audit.json')

test('every new case has an individual review bound to its exact image, caption and article license',()=>{
 assert.equal(batch.length,38)
 for(const item of batch){
  const ref=JOURNAL_REFERENCES.find(r=>r.id===`journal_${item.id}`)
  const review=audit.find(r=>r.figureId===item.id)
  assert.ok(referenceIsUsable(ref),item.id)
  assert.equal(review.status,'verified')
  assert.equal(review.grantUrl,ref.license.url)
  assert.equal(review.originalCaptionSha256,digest(Buffer.from(ref.originalCaption)))
  assert.equal(review.articleXmlSha256,digest(fs.readFileSync(new URL(review.articleXml,root))))
  assert.deepEqual(Object.keys(review.permissionReview).sort(),['adaptation','display','modelInput','storage'])
  for(const kind of ['large','original']){
   const asset=ref.assets[kind]
   assert.equal(digest(fs.readFileSync(new URL(asset.path,root))),asset.sha256)
   assert.equal(review[kind+'Sha256'],asset.sha256)
  }
  assert.ok(ref.license.attribution.includes(ref.paper.doi))
  assert.ok(ref.originalCaption&&ref.paper.authors.length&&ref.figureNumber)
  assert.equal(ref.license.thirdPartyReview,review.thirdPartyReview)
 }
 const swimlane=JOURNAL_REFERENCES.find(r=>r.id==='journal_s13012-022-01192-w.g001')
 assert.equal(swimlane.license.id,'CC-BY-4.0','a CC0 data waiver must not replace the article image license')
 assert.match(swimlane.originalCaption,/hypothetical data/)
})

test('all newly mapped primary and panel types are discoverable and ranked as exact matches',()=>{
 for(const item of batch){
  for(const type of new Set([item.type,...Object.values(item.panels)])){
   const id=`journal_${item.id}`
   assert.ok(FIGURE_TYPES.some(t=>t.id===type),type)
   const filtered=browseFigureReferences({figureTypeId:type,pageSize:200})
   assert.ok(filtered.references.some(r=>r.id===id),`${id} in ${type}`)
   const ranked=retrieveFigureCandidates({figureTypeId:type})
   assert.ok(ranked.some(r=>r.id===id&&r.match.level==='exact'),`${id} exact ${type}`)
  }
 }
 const result=browseFigureReferences({pageSize:200})
 assert.equal(result.corpusVersion,'journal-2026-10-10.v2')
 assert.equal(result.totalItems,107)
 assert.deepEqual(result.facets.visualCategories.filter(c=>c.count===0).map(c=>c.value).sort(),['roadmap','rose','streamgraph'])
 for(const id of ['roadmap','rose','streamgraph'])assert.equal(browseFigureReferences({figureTypeId:id}).totalItems,0)
})

test('corrected historical cases keep stable IDs but no longer claim the wrong scientific structure',()=>{
 const old=selectFigureReferences(['journal_pbio.1002128.g002','journal_pone.0340807.g007'])
 assert.ok(!old[0].panelTypes.some(p=>p.typeId==='dumbbell'))
 assert.ok(!old[1].panelTypes.some(p=>p.typeId==='bubble'))
 const excluded=JOURNAL_REFERENCES.filter(r=>!referenceIsUsable(r))
 assert.equal(excluded.length,7)
 for(const ref of excluded)assert.throws(()=>selectFigureReferences([ref.id]),/许可/)
 assert.ok(!JOURNAL_REFERENCES.some(r=>r.id.includes('s41598-024-83710-y')))
})
