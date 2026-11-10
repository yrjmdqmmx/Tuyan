import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {imageInputPresentations} from '../test-support/image-input-r27.mjs'
import {assertAllSentences, assertSentence, conditions} from '../test-support/status-sentences-r29.mjs'
import {modalityIconStates} from '../packages/api/src/modality-presentation.mjs'
const mini = createRequire(import.meta.url)('../apps/miniprogram/miniprogram/utils/card-presentation.js')
test('R29 I11 all 1064 cards: exactly eight sentences, state patterns, no attribution or dates, Web/Mini parity', async () => {
  assertAllSentences(await imageInputPresentations())
})
test('R29 I11 every reviewed qualifier, direction and non-catalog state is safe and identical in Mini', () => {
  for (const direction of ['input','output']) {
    for (const qualifier of Object.keys(conditions)) {
      const icons = modalityIconStates(qualifier, undefined, undefined, undefined, direction)
      assert.deepEqual(mini.modalityIconStates(qualifier, undefined, undefined, undefined, direction), icons)
      for (const icon of icons) assertSentence(icon, undefined, direction)
      assert.ok(icons.some(i => i.state === 'conditional'))
    }
    for (const provenance of ['channel','vendor']) {
      const fact = {state:'unsupported',provenance,sourceUrl:'https://example.com',verifiedAt:'2026-11-10'}
      const icons = modalityIconStates('', fact, '', '', direction)
      assert.deepEqual(mini.modalityIconStates('', fact, '', '', direction), icons)
      for (const icon of icons) assertSentence(icon, fact, direction)
    }
  }
  const unsafe = '图像（需Example渠道 2026-11-10）'
  for (const formatter of [modalityIconStates,mini.modalityIconStates]) {
    assert.equal(formatter(unsafe)[1].tooltip, '支持图像输入（需满足接口要求）')
  }
})
