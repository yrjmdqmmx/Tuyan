import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {render, fireEvent, cleanup} from '@testing-library/react'
import {ModelSpecifications} from '../src/components/ModelSpecifications.jsx'
import {STATIC_MODEL_REGISTRY} from '../src/lib/staticModelCatalog.js'
import {modalityIconStates} from '../src/lib/modelModalityIcons.js'
import {iconBaseline, expectedR2Icon} from '../../../test-support/icon-simplify-r27.mjs'
import {expectedI11 as expectedR28} from '../../../test-support/source-title-history-r29.mjs'
import {review} from '../../../test-support/image-input-r27.mjs'

const css = fs.readFileSync(new URL('../src/components/ModelSpecifications.css', import.meta.url), 'utf8')
const tokens = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const ink = tokens.match(/--ink: (#[a-f0-9]{6})/)[1], muted = tokens.match(/--muted: (#[a-f0-9]{6})/)[1]
const rgb = hex => 'rgb(' + hex.slice(1).match(/../g).map(v => parseInt(v, 16)).join(', ') + ')'
const noDate = text => text.replace(/（(?:核实日期：)?\d{4}-\d{2}-\d{2}）/g, '')
test('R27 I8 all 1064 Web cards render identical solid grey unsupported/unknown glyphs, three short labels and exact evidence dialogs', () => {
  const style = document.createElement('style')
  style.textContent = css.replaceAll('var(--ink)', ink).replaceAll('var(--muted)', muted)
  document.head.append(style)
  const glyphs = new Map(), counts = {}, states = new Set()
  let cards = 0, decisionA = 0
  try {
    assert.doesNotMatch(css, /modality-strike|modality-question|stroke-dasharray|dashed|\bsup\b|::(?:before|after)/)
    for (const [provider, catalog] of Object.entries(STATIC_MODEL_REGISTRY)) for (const model of catalog.models) {
      const key = provider + '/' + model.id, before = iconBaseline.rows[key].web
      const expected = [...expectedR28[key].web.inputIcons, ...expectedR28[key].web.outputIcons]
      const ui = render(React.createElement(ModelSpecifications, {provider, model}))
      try {
        const nodes = [...ui.container.querySelectorAll('.model-modality-icon')]
        assert.equal(nodes.length, expected.length, key)
        nodes.forEach((node, index) => {
          const icon = expected[index]
          states.add(icon.state); counts[icon.state] = (counts[icon.state] || 0) + 1
          assert.equal(node.dataset.state, icon.state, key)
          assert.equal(node.className, 'model-modality-icon is-' + icon.state)
          assert.equal(node.getAttribute('aria-label'), icon.accessibleLabel, key)
          assert.match(node.getAttribute('aria-label'), /^(支持|此渠道不支持|该模型不支持|官方资料未说明是否支持)(文本|图像|视频|音频)(输入|输出)(（[^（）]+）)?$/)
          assert.equal(node.title, icon.tooltip, key)
          assert.equal(node.children.length, 1)
          assert.equal(node.firstElementChild.tagName.toLowerCase(), 'svg')
          assert.equal(node.textContent, '')
          assert.equal(node.querySelectorAll('[stroke-dasharray], sup, [style]').length, 0)
          const glyph = node.innerHTML
          if (!glyphs.has(icon.id)) glyphs.set(icon.id, glyph)
          assert.equal(glyph, glyphs.get(icon.id), key + ' state must never change the modality glyph')
          assert.equal(getComputedStyle(node).color, ['supported','conditional'].includes(icon.state) ? rgb(ink) : rgb(muted), key)
          assert.ok(!getComputedStyle(node.firstElementChild).strokeDasharray || getComputedStyle(node.firstElementChild).strokeDasharray === 'none')
        })
        if (review.reviews[key]) {
          const image = nodes[1]
          assert.equal(image.dataset.state, 'supported'); assert.equal(image.getAttribute('aria-label'), '支持图像输入')
          assert.equal(getComputedStyle(image).color, rgb(ink)); decisionA++
        }
        fireEvent.click(ui.container.querySelector('.model-modality-trigger'))
        const dialog = document.querySelector('.model-evidence-dialog')
        for (const icon of expected) assert.ok(dialog.textContent.includes(noDate(icon.tooltip)), key + ' missing distinction/evidence')
      } finally { cleanup() }
      cards++
    }
    assert.equal(cards, 1064); assert.equal(decisionA, 15)
    assert.deepEqual([...states].sort(), ['conditional', 'supported', 'unknown', 'unsupported'])
    console.log('R27 I8 Web states: ' + JSON.stringify(counts))
  } finally { style.remove(); cleanup() }
})

test('R27 I8 vendor, conditional and unlisted fixtures retain semantics without decoration or extra short labels', () => {
  const vendor = modalityIconStates('', {state:'unsupported', provenance:'vendor', sourceUrl:'https://example.com/spec', verifiedAt:'2026-11-09'})
  for (const icon of vendor) {
    assert.match(icon.accessibleLabel, /^该模型不支持(文本|图像|视频|音频)输入$/)
    assert.equal(icon.tooltip, '该模型不支持' + icon.label + '输入')
  }
  const vendorModel = {id:'vendor-exclusion',specifications:{version:1,modalityFacts:{inputModalities:{state:'unsupported',provenance:'vendor',sourceUrl:'https://example.com/spec',verifiedAt:'2026-11-09'}}}}
  try {
    const ui = render(React.createElement(ModelSpecifications, {provider:'custom',model:vendorModel}))
    fireEvent.click(ui.container.querySelector('.model-modality-trigger'))
    assert.match(document.querySelector('.model-evidence-dialog').textContent, /该模型不支持图像输入/)
  } finally {cleanup()}
  const icons = modalityIconStates('文本、音频（有限支持）')
  assert.equal(icons[1].state, 'unlisted'); assert.equal(icons[1].accessibleLabel, '官方资料未说明是否支持图像输入')
  assert.equal(icons[3].state, 'conditional'); assert.equal(icons[3].accessibleLabel, '支持音频输入（仅部分音频功能）')
  assert.equal(icons[3].tooltip, '支持音频输入（仅部分音频功能）')
  const model = {id:'conditional',specifications:{version:1,modalityFacts:{inputModalities:{state:'known',value:['text','audio'],displayValue:'文本、音频（有限支持）'}}}}
  const style = document.createElement('style'); style.textContent = css.replaceAll('var(--ink)', ink).replaceAll('var(--muted)', muted); document.head.append(style)
  try {
    const ui = render(React.createElement(ModelSpecifications, {provider:'custom',model}))
    const audio = ui.container.querySelector('[data-state="conditional"]')
    assert.ok(audio); assert.equal(audio.getAttribute('aria-label'), '支持音频输入（仅部分音频功能）'); assert.equal(getComputedStyle(audio).color, rgb(ink))
    for (const state of ['unsupported','unknown','unlisted']) {
      audio.className = 'model-modality-icon is-' + state
      assert.equal(getComputedStyle(audio).color, rgb(muted))
      assert.equal(audio.children.length, 1); assert.equal(audio.textContent, '')
    }
    fireEvent.click(ui.container.querySelector('.model-modality-trigger'))
    assert.match(document.querySelector('.model-evidence-dialog').textContent, /支持音频输入（仅部分音频功能）/)
  } finally {style.remove(); cleanup()}
})
