import fs from 'node:fs'
import vm from 'node:vm'
import {createRequire} from 'node:module'
import {assertDialogDates,assertUnknownIconDates} from '../../../test-support/dialog-dates-r26.mjs'
import conflictCards from '../../../test-support/fixtures/conflict-cards-r26.json' with {type:'json'}
import test from 'node:test'
import assert from 'node:assert/strict'
import {phase2Registry} from '../../../test-support/phase2-modality.mjs'
import {verifiedRetirement} from '../../../scripts/lib/model-evidence-r26.mjs'
test('R26 I6 Core projects the model-specific 397b retirement citation and excludes the generic page',async()=>{
 const registry=await phase2Registry(),card=registry.providers.bailian.models.find(m=>m.id==='qwen3.5-397b-a17b').cardSpecifications
 assert.equal(card.lifecycleSourceUrl,'https://www.aliyun.com/notice/118728')
 assert.ok([card.sourceUrl,...card.retirementSources].includes('https://www.aliyun.com/notice/118728'))
 assert.equal(card.verifiedAt,'2026-11-09')
 assert.ok(card.excludedSources.includes('https://help.aliyun.com/zh/model-studio/model-depreciation'))
 verifiedRetirement('bailian/qwen3.5-397b-a17b',card.lifecycleSourceUrl,'2027-01-19')
 assert.ok(!registry.providers.qianfan.models.find(m=>m.id==='qwen3.5-397b-a17b').cardSpecifications.lifecycleSourceUrl)
 const filename=new URL('../../miniprogram/miniprogram/components/model-picker/model-picker.js',import.meta.url),context={Component(){},exports:{},require:createRequire(filename)}
 vm.runInNewContext(fs.readFileSync(filename,'utf8')+'\nthis.present=presentModel',context)
 let cards=0
 for(const [provider,entry]of Object.entries(registry.providers))for(const model of entry.models){
  const key=provider+'/'+model.id,display=context.present(model,'','',provider),audit=model.cardSpecifications
  assertDialogDates(display.auditMessage,audit.fields,audit.verifiedAt,key)
  assertUnknownIconDates(display.specRows.flatMap(row=>row.icons),key)
  assert.doesNotMatch(display.auditMessage,/图研之前记录|核实日期|渠道公布/,key)
  cards++
 }
 // The existing phase2 fixture has 1061 live models (model-modality-phase2.test.ts).
 assert.equal(cards,1061)
})
