import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {render,fireEvent,cleanup} from '@testing-library/react'
import {ModelSpecifications} from '../src/components/ModelSpecifications.jsx'
import {STATIC_MODEL_REGISTRY} from '../src/lib/staticModelCatalog.js'
import {imageInputPresentations} from '../../../test-support/image-input-r27.mjs'
import {assertAllSentences,obsoleteVisibleStatus} from '../../../test-support/status-sentences-r29.mjs'
test('R29 I11 every rendered icon hover equals aria and its complete dialog status line on all 1064 cards', async () => {
  const rows = await imageInputPresentations()
  assertAllSentences(rows)
  for (const [provider, entry] of Object.entries(STATIC_MODEL_REGISTRY)) for (const model of entry.models) {
    const key = provider + '/' + model.id, row = rows[key]
    try {
      const ui = render(React.createElement(ModelSpecifications,{provider,model}))
      const icons = [...ui.container.querySelectorAll('.model-modality-icon')]
      assert.equal(icons.length,8,key)
      fireEvent.click(ui.container.querySelector('.model-modality-trigger'))
      const dialog = document.querySelector('.model-evidence-dialog')
      const lines = dialog.querySelector('.tw-preserve-text').textContent.split('\n')
      for (const [i, expected] of [...row.web.inputIcons,...row.web.outputIcons].entries()) {
        assert.equal(icons[i].title,expected.tooltip,key)
        assert.equal(icons[i].getAttribute('aria-label'),expected.tooltip,key)
        assert.equal(lines.filter(line => line === expected.tooltip).length,1,key)
      }
      assert.doesNotMatch(ui.container.textContent + dialog.textContent,obsoleteVisibleStatus,key)
      assert.ok(dialog.textContent.includes('资料来源'))
      for (const link of dialog.querySelectorAll('a.model-evidence-source')) {
        if (row.web.data.checkedAt) assert.ok(link.title.includes(row.web.data.checkedAt),key+' source hover date')
      }
    } finally {cleanup()}
  }
})
