import test from 'node:test'
import assert from 'node:assert/strict'
import {auditedModelSpecs,auditedModelLifecycle} from '../src/model-audit.js'
import {cardLifecycle} from '../../../packages/api/src/card-presentation.mjs'
import {verifiedRetirement} from '../../../scripts/lib/model-evidence-r26.mjs'
test('R26 I6 Gateway corrects the 397b display citation without changing the execution notice',()=>{
 const audit=auditedModelSpecs('bailian','qwen3.5-397b-a17b'),execution=auditedModelLifecycle('bailian','qwen3.5-397b-a17b',Date.parse('2026-11-10')),display=cardLifecycle(execution,audit)
 assert.equal(execution.sourceUrl,'https://help.aliyun.com/zh/model-studio/model-depreciation');assert.equal(execution.stopDate,'2027-01-19')
 assert.equal(display.sourceUrl,'https://www.aliyun.com/notice/118728');verifiedRetirement('bailian/qwen3.5-397b-a17b',display.sourceUrl,display.stopDate)
 assert.equal(auditedModelLifecycle('qianfan','qwen3.5-397b-a17b',Date.parse('2026-11-10')),null)
})
