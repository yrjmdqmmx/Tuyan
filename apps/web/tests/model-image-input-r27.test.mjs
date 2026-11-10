import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {render, fireEvent, cleanup} from '@testing-library/react'
import {ModelSpecifications} from '../src/components/ModelSpecifications.jsx'
import {STATIC_MODEL_REGISTRY} from '../src/lib/staticModelCatalog.js'
import {modelCardSpecifications} from '../src/lib/modelCardSpecifications.js'
import {modelSourceRows} from '../src/lib/modelCardSources.js'
import {modalityIconStates} from '../src/lib/modelModalityIcons.js'
import {assertImageInput, review} from '../../../test-support/image-input-r27.mjs'
import {humanSourceUrl} from '../../../packages/api/src/card-presentation.mjs'

test('R27 all 15 Web image icons and opened evidence dialogs cite the verified edit interface', () => {
  for (const [key, fields] of Object.entries(review.reviews)) {
    const provider = key.split('/')[0], id = key.slice(provider.length + 1)
    const model = STATIC_MODEL_REGISTRY[provider].models.find(model => model.id === id)
    const data = modelCardSpecifications(provider, model)
    assertImageInput(key, data.inputFact, modalityIconStates(data.input, data.inputFact, provider, id), modelSourceRows(data))
    const ui = render(React.createElement(ModelSpecifications, {provider, model}))
    try {
      const trigger = ui.container.querySelector('.model-modality-trigger')
      assert.match(trigger.getAttribute('aria-label'), /图像：支持/)
      fireEvent.click(trigger)
      const dialog = document.querySelector('.model-evidence-dialog')
      assert.ok(dialog, key)
      assert.match(dialog.textContent, /图像：支持/)
      assert.match(dialog.textContent, /编辑接口/)
      assert.ok(dialog.textContent.includes(fields.inputModalities.verifiedAt), key)
      assert.ok([...dialog.querySelectorAll('a')].some(a => a.href === humanSourceUrl(fields.inputModalities.sourceUrl)), key)
      assert.doesNotMatch(dialog.textContent, /创始人|决定 A/)
    } finally { cleanup() }
  }
})
