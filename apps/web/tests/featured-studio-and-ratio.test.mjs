import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AspectRatioPicker from '../src/components/AspectRatioPicker.jsx'
import FeaturedTemplateStudio from '../src/components/FeaturedTemplateStudio.jsx'
import { FEATURED_TEMPLATES, attachFeaturedTemplateImages } from '../src/lib/featuredTemplates.js'
import { buildAspectRatioOptions } from '../src/lib/aspectRatios.js'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

function studioTemplates() {
  return attachFeaturedTemplateImages(FEATURED_TEMPLATES.map((template) => ({
    id: template.sourceReferenceId,
    imageUrl: `https://images.example/${template.sourceReferenceId}.png`,
  })))
}

test('featured hero exposes carousel controls and accessible six-template dialog preview', async () => {
  const user = userEvent.setup()
  render(React.createElement(FeaturedTemplateStudio, { templates: studioTemplates(), isDirty: false, onApply() {} }))

  assert.ok(screen.getByRole('region', { name: '精选学术图示模板' }))
  assert.ok(screen.getByRole('button', { name: '上一张模板' }))
  assert.ok(screen.getByRole('button', { name: '下一张模板' }))
  assert.equal(screen.getAllByRole('button', { name: /查看第 \d 张模板/u }).length, 6)
  await user.click(screen.getByRole('button', { name: '浏览模板' }))
  const dialog = screen.getByRole('dialog', { name: '精选模板库' })
  assert.ok(dialog)
  assert.equal(dialog.querySelectorAll('.featured-template-card').length, 6)
  await user.click(screen.getByRole('button', { name: `预览模板 ${FEATURED_TEMPLATES[3].title}` }))
  assert.ok(screen.getAllByText(FEATURED_TEMPLATES[3].summary).length >= 1)
  assert.equal(screen.getByRole('button', { name: '套用到输入区' }).disabled, false)
})

test('clean template apply is direct while dirty apply asks confirmation and cancel is lossless', async () => {
  const user = userEvent.setup()
  const applied = []
  const { rerender } = render(React.createElement(FeaturedTemplateStudio, {
    templates: studioTemplates(), isDirty: false, onApply: (template) => applied.push(template.id),
  }))
  await user.click(screen.getByRole('button', { name: '浏览模板' }))
  await user.click(screen.getByRole('button', { name: `预览模板 ${FEATURED_TEMPLATES[1].title}` }))
  await user.click(screen.getByRole('button', { name: '套用到输入区' }))
  assert.deepEqual(applied, [FEATURED_TEMPLATES[1].id])
  assert.equal(screen.queryByRole('dialog', { name: '替换输入内容？' }), null)

  rerender(React.createElement(FeaturedTemplateStudio, {
    templates: studioTemplates(), isDirty: true, onApply: (template) => applied.push(template.id),
  }))
  await user.click(screen.getByRole('button', { name: '浏览模板' }))
  await user.click(screen.getByRole('button', { name: `预览模板 ${FEATURED_TEMPLATES[2].title}` }))
  await user.click(screen.getByRole('button', { name: '套用到输入区' }))
  assert.ok(screen.getByRole('dialog', { name: '替换输入内容？' }))
  await user.click(screen.getByRole('button', { name: '取消' }))
  assert.deepEqual(applied, [FEATURED_TEMPLATES[1].id])
  assert.ok(screen.getByRole('dialog', { name: '精选模板库' }))
  await user.click(screen.getByRole('button', { name: '套用到输入区' }))
  await user.click(screen.getByRole('button', { name: '确认替换' }))
  assert.deepEqual(applied, [FEATURED_TEMPLATES[1].id, FEATURED_TEMPLATES[2].id])
})

test('fallback template artwork remains readable and selectable', () => {
  render(React.createElement(FeaturedTemplateStudio, {
    templates: attachFeaturedTemplateImages([]), isDirty: false, onApply() {},
  }))
  assert.equal(screen.getAllByText('结构预览').length >= 1, true)
  assert.ok(screen.getAllByText(FEATURED_TEMPLATES[0].title).length >= 1)
})

test('ratio picker renders auto and all fixed values with precise disabled reasons', async () => {
  const changed = []
  const options = buildAspectRatioOptions({ capabilities: { aspectRatios: ['1:1', '16:9'] }, capabilityField: 'aspectRatios', modelLabel: 'Wan Image' })
  const user = userEvent.setup()
  render(React.createElement(AspectRatioPicker, { label: '画面比例', value: '16:9', options, onChange: (value) => changed.push(value) }))
  const group = document.querySelector('.aspect-ratio-options')
  assert.ok(group)
  assert.equal(group.querySelectorAll('button').length, 11)
  assert.equal(screen.getByRole('button', { name: '画面比例 自动' }).disabled, false)
  assert.equal(screen.getByRole('button', { name: '画面比例 21:9，Wan Image 不支持 21:9 比例' }).disabled, true)
  await user.click(screen.getByRole('button', { name: '画面比例 1:1' }))
  assert.deepEqual(changed, ['1:1'])
  fireEvent.keyDown(screen.getByRole('button', { name: '画面比例 1:1' }), { key: 'ArrowRight' })
})
