import { sourceTitle } from '../../../packages/api/src/card-presentation.mjs'
import test, {beforeEach, afterEach} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {render, screen, fireEvent, cleanup, within} from '@testing-library/react'
import {ModelSpecifications} from '../src/components/ModelSpecifications.jsx'
import WorkspaceModelCatalog from '../src/workspace/WorkspaceModelCatalog.jsx'
import WorkspaceModelPicker from '../src/workspace/WorkspaceModelPicker.jsx'
import {STATIC_MODEL_REGISTRY} from '../src/lib/staticModelCatalog.js'

let style
beforeEach(t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-11-09'))
  style = document.createElement('style')
  style.textContent = ['../src/components/ModelSpecifications.css', '../src/workspace/workspaceModels.css']
    .map(file => fs.readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n')
  document.head.append(style)
})
afterEach(() => { cleanup(); style.remove() })
const computed = element => window.getComputedStyle(element)

function assertSource(card) {
  const link = card.querySelector('.model-spec-sources a')
  const label = link.querySelector('.model-spec-source-label')
  const domain = link.querySelector('.model-spec-source-domain')
  assert.equal(link.textContent, `${label.textContent}${sourceTitle(link.href, {displayName:card.querySelector('h3')?.textContent})}`)
  assert.match(label.textContent, /^(官方文档|原厂规格|下线公告) · $/)
  assert.equal(domain.title, link.href)
  assert.ok(link.title.includes(link.href))
  for (const node of [link, domain]) {
    assert.equal(computed(node).whiteSpace, 'nowrap')
    assert.equal(computed(node).overflowWrap, 'normal')
    assert.equal(computed(node).wordBreak, 'normal')
  }
  assert.equal(computed(link).minWidth, 'auto', 'the link must not collapse beside actions')
  assert.equal(computed(link).maxWidth, '100%')
  assert.equal(computed(link.querySelector('svg')).flexShrink, '0')
  assert.equal(computed(label).flexShrink, '0')
  assert.equal(computed(domain).overflow, 'hidden')
  assert.equal(computed(domain).textOverflow, 'ellipsis')
}

function assertFooter(card) {
  assertSource(card)
  const footer = card.querySelector('.model-spec-footer')
  const source = footer.querySelector('.model-spec-sources')
  const actions = footer.querySelector('.tw-catalog-card-actions')
  assert.deepEqual([...footer.children], [source, actions], 'source precedes the entire action group')
  assert.equal(computed(footer).display, 'flex')
  assert.equal(computed(footer).flexWrap, 'wrap')
  assert.equal(computed(source).flexGrow, '1', 'source fills its row after wrapping')
  assert.equal(computed(source).flexShrink, '0', 'wrap before squeezing the source beside actions')
  assert.equal(computed(source).flexBasis, 'auto')
  assert.equal(computed(source).width, 'max-content')
  assert.equal(computed(source).minWidth, 'auto')
  assert.equal(computed(source).maxWidth, '100%', 'long domains are capped to card width')
  assert.equal(computed(actions).flexShrink, '0')
  assert.equal(computed(actions).minWidth, 'max-content')
  assert.equal(computed(actions).flexWrap, 'nowrap')
  assert.equal(computed(actions).whiteSpace, 'nowrap')
}

function fixture(unverified) {
  const model = {...STATIC_MODEL_REGISTRY.tokendance.models.find(m => m.id === 'qwen3.8-flash'),
    catalogPresence: {status: unverified ? 'unverified' : 'listed'},
    selectable: !unverified, disabledReason: unverified ? '暂时无法确认此型号是否仍在目录中' : ''}
  return {ready: true, busy: false, registryStatus: 'ready',
    registry: {providers: {tokendance: {models: [model]}}},
    summary: {tokenDance: {connected: true}},
    library: {connections: [{id: 'saved', provider: 'tokendance', label: '保留连接'}],
      models: [{id: 'selected', connectionId: 'saved', modelId: model.id}]},
    save: () => assert.fail('layout must not save configuration')}
}

for (const unverified of [false, true]) test(`R16 catalog ${unverified ? 'unverified' : 'listed'}: source wraps before the intact hint and action`, () => {
  const models = fixture(unverified), before = structuredClone(models.library)
  render(React.createElement(WorkspaceModelCatalog, {models}))
  const card = screen.getByRole('article')
  assertFooter(card)
  assert.equal(card.querySelector('.model-spec-source-domain').textContent, 'TokenDance · Qwen3.8 Flash')
  const button = within(card).getByRole('button', {name: /^添加 /})
  assert.equal(button.disabled, unverified)
  if (unverified) {
    const hint = within(card).getByText('暂时无法确认')
    assert.equal(hint.parentElement, button.parentElement)
    assert.equal(computed(hint).whiteSpace, 'nowrap')
    fireEvent.click(button)
    assert.equal(screen.queryByRole('dialog'), null)
  } else {
    fireEvent.click(button)
    assert.ok(screen.getByRole('dialog', {name: '添加到模型库'}))
  }
  assert.deepEqual(models.library, before)
})

for (const mobile of [false, true]) for (const unverified of [false, true]) test(`R16 ${mobile ? 'mobile' : 'desktop'} ${unverified ? 'unverified' : 'listed'} saved picker uses the same footer and preserves selection`, t => {
  const originalMatchMedia = window.matchMedia
  window.matchMedia = () => ({matches: mobile, addEventListener() {}, removeEventListener() {}})
  t.after(() => { window.matchMedia = originalMatchMedia })
  const models = fixture(unverified), changes = []
  render(React.createElement(WorkspaceModelPicker, {models, role: 'main', path: 'svg', onChange: value => changes.push(value)}))
  fireEvent.click(screen.getByRole('button', {name: '主模型', exact: true}))
  fireEvent.click(screen.getByRole('button', {name: '观猹 TokenDance', exact: true}))
  if (mobile) fireEvent.click(screen.getByRole('button', {name: '厂商 阿里巴巴', exact: true}))
  const card = screen.getByRole('article')
  assertFooter(card)
  assert.equal(changes.length, 0)
  const button = within(card).getByRole('button', {name: /^选择 Qwen/})
  assert.equal(button.disabled, unverified)
  fireEvent.click(button)
  assert.deepEqual(changes, unverified ? [] : [{libraryModelId: 'selected', connectionId: 'saved', accessProvider: 'tokendance', modelId: 'qwen3.8-flash'}])
})

test('R16 long domains only ellipsize visually and retain the complete URL for every source label', () => {
  const longUrl = `https://${'very-long-hostname-'.repeat(3)}example.com/model/footer`
  for (const [provider, model, expectedLabel] of [
    ['custom', {id: 'long-domain', specifications: {version: 1, sourceUrls: [longUrl]}}, '官方文档'],
    ['replicate', {id: 'google/imagen-3'}, '原厂规格'],
    ['antling', {id: 'Ling-2.6-flash'}, '下线公告'],
  ]) {
    const {container, unmount} = render(React.createElement('article', {className: 'tw-catalog-card', style: {width: 155}},
      React.createElement(ModelSpecifications, {provider, model, compactSources: true})))
    assertSource(container)
    assert.equal(container.querySelector('.model-spec-source-label').textContent, `${expectedLabel} · `)
    if (provider === 'custom') assert.equal(screen.getByRole('link').href, longUrl)
    unmount()
  }
})
