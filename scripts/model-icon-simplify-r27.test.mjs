import test from 'node:test'
import assert from 'node:assert/strict'
import {imageInputPresentations} from '../test-support/image-input-r27.mjs'
import {assertR2Presentations} from '../test-support/icon-simplify-r27.mjs'
test('R27 I8 all 1064 Web and Mini presentations preserve every field except the exact R2 label/evidence transformation', async () => {
 const now=await imageInputPresentations()
 assertR2Presentations(now)
 const key='fal/fal-ai/flux-2-pro',bad=structuredClone(now)
 bad[key].web.inputIcons[1].state='unknown'
 assert.throws(()=>assertR2Presentations(bad),/unexpected changed card\/field|R29 literal title drift/)
 bad[key]=structuredClone(now[key]);bad[key].web.data.inputFact.verifiedAt='2000-01-01'
 assert.throws(()=>assertR2Presentations(bad),/unexpected changed card\/field|R29 literal title drift/)
 bad[key]=structuredClone(now[key]);bad[key].mini.card.specRows[0].icons[1].tooltip='missing attribution'
 assert.throws(()=>assertR2Presentations(bad),/unexpected changed card\/field|R29 literal title drift/)
})


test('R27 I8 evidence scanner separates 未标注 modality sections without hiding same-field contradictions', async () => {
 const {dialogIssues}=await import('../test-support/source-titles-r24.mjs')
 assert.deepEqual(dialogIssues('输入：文本：支持；图像：未标注\n渠道资料 · Example · Spec\n输出：文本：未标注；图像：未标注\n暂无官方资料'), [])
 assert.deepEqual(dialogIssues('输出：文本：未标注；图像：未标注\n渠道资料 · Example · Spec\n暂无官方资料'), ['source plus no-source contradiction'])
})
