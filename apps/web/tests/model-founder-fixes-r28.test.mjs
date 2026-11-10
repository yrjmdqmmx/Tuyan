import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {render, fireEvent, cleanup} from '@testing-library/react'
import {ModelSpecifications} from '../src/components/ModelSpecifications.jsx'
import {sourceTitle} from '../../../packages/api/src/card-presentation.mjs'
import review from '../../../config/channel-audit/review-r28-20261110.json' with {type:'json'}

test('R28 every fal catalog field shows its verified title in rendered hover and dialog; JSON attribution stays plain', () => {
  for (const row of review.fields) {
    try {
      const ui = render(React.createElement(ModelSpecifications, {provider:'fal',model:{id:row.identity.slice(4)}}))
      const direction = row.field === 'inputModalities' ? '输入模态' : '输出模态'
      const title = '渠道资料 · ' + sourceTitle(row.sourceUrl)
      const group = ui.container.querySelector(`[role="group"][aria-label="${direction}"]`)
      assert.ok([...group.children].some(icon => icon.title.includes(title)), row.identity)
      fireEvent.click(group.parentElement)
      const dialog = document.querySelector('.model-evidence-dialog')
      assert.ok(dialog.textContent.includes(title))
      assert.ok([...dialog.querySelectorAll('a')].some(link => link.href === row.sourceUrl))
      assert.doesNotMatch(dialog.textContent, /渠道资料 · API · 模型列表|有条件支持/)
    } finally {cleanup()}
  }
  const model = {id:'catalog-fallback',specifications:{version:1,modalityFacts:{inputModalities:{state:'known',value:['text'],provenance:'channel',sourceUrl:review.catalogUrl}}}}
  try {
    const ui = render(React.createElement(ModelSpecifications, {provider:'custom',model}))
    fireEvent.click(ui.container.querySelector('.model-modality-trigger'))
    const dialog = document.querySelector('.model-evidence-dialog')
    assert.ok(dialog.textContent.includes('渠道资料 · fal 模型目录'))
    assert.equal(dialog.querySelector('a[href="https://api.fal.ai/v1/models"]'), null)
  } finally {cleanup()}
})

test('R28 Kimi K3 unknown icon retains its modality and exact prefixed source explanation', () => {
  try {
    const ui = render(React.createElement(ModelSpecifications, {provider:'kimi',model:{id:'kimi-k3'}}))
    const icons = [...ui.container.querySelectorAll('[data-state="unknown"]')]
    assert.ok(icons.length)
    for (const icon of icons) {
      assert.match(icon.title, /^未标注 · /)
      assert.equal(icon.getAttribute('aria-label').split('：').slice(1).join('：'), icon.title)
    }
    assert.ok(icons.some(icon => icon.title === '未标注 · 图研既有核实 · Hugging Face · Kimi K3'))
  } finally {cleanup()}
})
