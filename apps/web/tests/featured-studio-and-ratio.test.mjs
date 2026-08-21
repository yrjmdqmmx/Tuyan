import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
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

function installMatchMedia({ compact = false, reducedMotion = false } = {}) {
  const entries = new Map()
  window.matchMedia = (query) => {
    if (!entries.has(query)) {
      const listeners = new Set()
      entries.set(query, {
        matches: query === '(max-width: 760px)' ? compact : reducedMotion,
        addEventListener(type, listener) { if (type === 'change') listeners.add(listener) },
        removeEventListener(type, listener) { if (type === 'change') listeners.delete(listener) },
        dispatch(matches) {
          this.matches = matches
          for (const listener of listeners) listener({ matches })
        },
        listenerCount() { return listeners.size },
      })
    }
    return entries.get(query)
  }
  return entries
}

test('desktop carousel exposes four valid start positions with one current dot', async () => {
  const user = userEvent.setup()
  render(React.createElement(FeaturedTemplateStudio, { templates: studioTemplates(), isDirty: false, onApply() {} }))

  assert.ok(screen.getByRole('region', { name: '精选学术图示模板' }))
  assert.ok(screen.getByRole('button', { name: '上一张模板' }))
  assert.ok(screen.getByRole('button', { name: '下一张模板' }))
  const dots = screen.getAllByRole('button', { name: /查看第 \d 张模板/u })
  assert.equal(dots.length, 4)
  assert.equal(dots.filter((dot) => dot.getAttribute('aria-current') === 'true').length, 1)
  await user.click(screen.getByRole('button', { name: '浏览模板' }))
  const dialog = screen.getByRole('dialog', { name: '精选模板库' })
  assert.ok(dialog)
  assert.equal(dialog.querySelectorAll('.featured-template-card').length, 6)
  await user.click(screen.getByRole('button', { name: `预览模板 ${FEATURED_TEMPLATES[3].title}` }))
  assert.ok(screen.getAllByText(FEATURED_TEMPLATES[3].summary).length >= 1)
  assert.equal(screen.getByRole('button', { name: '套用到输入区' }).disabled, false)
})

test('mobile carousel exposes six valid start positions with one current dot', () => {
  const previousMatchMedia = window.matchMedia
  try {
    installMatchMedia({ compact: true })
    render(React.createElement(FeaturedTemplateStudio, { templates: studioTemplates(), isDirty: false, onApply() {} }))
    const dots = screen.getAllByRole('button', { name: /查看第 \d 张模板/u })
    assert.equal(dots.length, 6)
    assert.equal(dots.filter((dot) => dot.getAttribute('aria-current') === 'true').length, 1)
  } finally {
    window.matchMedia = previousMatchMedia
  }
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
  assert.equal(screen.getAllByRole('dialog').length, 1)
  assert.ok(screen.getByRole('dialog', { name: '替换输入内容？' }))
  await user.click(screen.getByRole('button', { name: '取消' }))
  assert.deepEqual(applied, [FEATURED_TEMPLATES[1].id])
  assert.equal(screen.getAllByRole('dialog').length, 1)
  assert.ok(screen.getByRole('dialog', { name: '精选模板库' }))
  assert.equal(screen.getByRole('button', { name: `预览模板 ${FEATURED_TEMPLATES[2].title}` }).getAttribute('aria-pressed'), 'true')
  await act(() => new Promise((resolve) => setTimeout(resolve, 40)))
  assert.equal(document.activeElement, screen.getByRole('button', { name: '套用到输入区' }))
  await user.click(screen.getByRole('button', { name: '套用到输入区' }))
  assert.equal(screen.getAllByRole('dialog').length, 1)
  await user.click(screen.getByRole('button', { name: '确认替换' }))
  assert.deepEqual(applied, [FEATURED_TEMPLATES[1].id, FEATURED_TEMPLATES[2].id])
  assert.equal(screen.queryAllByRole('dialog').length, 0)
})

test('carousel advances on a controlled five-second timer, pauses while hidden, and clears on unmount', () => {
  const previousMatchMedia = window.matchMedia
  const previousSetInterval = window.setInterval
  const previousClearInterval = window.clearInterval
  const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden')
  const intervals = new Map()
  const cleared = []
  let nextId = 1
  let rendered
  try {
    installMatchMedia()
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    window.setInterval = (callback, delay) => {
      const id = nextId++
      intervals.set(id, { callback, delay })
      return id
    }
    window.clearInterval = (id) => { cleared.push(id); intervals.delete(id) }
    rendered = render(React.createElement(FeaturedTemplateStudio, { templates: studioTemplates(), isDirty: false, onApply() {} }))

    assert.equal(intervals.size, 1)
    const [firstId, firstTimer] = [...intervals.entries()][0]
    assert.equal(firstTimer.delay, 5000)
    act(() => firstTimer.callback())
    assert.equal(screen.getByRole('button', { name: '查看第 2 张模板' }).getAttribute('aria-current'), 'true')

    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    assert.ok(cleared.includes(firstId))
    assert.equal(intervals.size, 0)

    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    assert.equal(intervals.size, 1)
    const resumedId = [...intervals.keys()][0]
    rendered.unmount()
    rendered = null
    assert.ok(cleared.includes(resumedId))
  } finally {
    rendered?.unmount()
    window.matchMedia = previousMatchMedia
    window.setInterval = previousSetInterval
    window.clearInterval = previousClearInterval
    if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor)
    else delete document.hidden
  }
})

test('prefers-reduced-motion prevents autoplay and removes its listener on unmount', () => {
  const previousMatchMedia = window.matchMedia
  const previousSetInterval = window.setInterval
  let intervalCount = 0
  let rendered
  try {
    const media = installMatchMedia({ reducedMotion: true })
    window.setInterval = () => { intervalCount += 1; return intervalCount }
    rendered = render(React.createElement(FeaturedTemplateStudio, { templates: studioTemplates(), isDirty: false, onApply() {} }))
    const reduced = media.get('(prefers-reduced-motion: reduce)')
    assert.equal(intervalCount, 0)
    assert.equal(reduced.listenerCount(), 1)
    rendered.unmount()
    rendered = null
    assert.equal(reduced.listenerCount(), 0)
  } finally {
    rendered?.unmount()
    window.matchMedia = previousMatchMedia
    window.setInterval = previousSetInterval
  }
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
