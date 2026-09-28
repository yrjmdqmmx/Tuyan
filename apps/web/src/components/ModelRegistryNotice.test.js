import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ModelRoutingSettings from './ModelRoutingSettings.jsx'
import UniversalApiSettings from './UniversalApiSettings.jsx'
import { buildModelSubmission, providerDefaultRoutes } from '../lib/modelRouting.js'
import { PROVIDERS } from '../constants.js'

afterEach(cleanup)
const h = React.createElement
const routes = providerDefaultRoutes('tokendance', null, PROVIDERS)
const props = { configurationMode: 'advanced', modelRoutes: routes, providerConfigs: PROVIDERS, credentialProviders: [], apiKeys: {}, arkProbes: [] }

test('professional settings distinguish pending, failed, unsupported and supported catalogs', () => {
  let retried = 0
  const { rerender } = render(h(ModelRoutingSettings, { ...props, registryStatus: 'loading' }))
  assert.match(screen.getByRole('status').textContent, /正在读取/)
  assert.equal(screen.queryByRole('alert'), null)
  rerender(h(ModelRoutingSettings, { ...props, registryStatus: 'error', onRetryRegistry: () => retried++ }))
  assert.match(screen.getByRole('alert').textContent, /读取失败/)
  assert.doesNotMatch(screen.getByRole('alert').textContent, /不支持/)
  fireEvent.click(screen.getByRole('button', { name: '重新读取模型与渠道能力' }))
  assert.equal(retried, 1)
  rerender(h(ModelRoutingSettings, { ...props, modelRegistry: { providers: {}, routeContractVersion: 0 }, registryStatus: 'ready' }))
  assert.match(screen.getByRole('alert').textContent, /不支持专业模式/)
  rerender(h(ModelRoutingSettings, { ...props, modelRegistry: { providers: {}, routeContractVersion: 1 }, registryStatus: 'ready' }))
  assert.equal(screen.queryByRole('alert'), null)
  assert.equal(screen.queryByRole('status'), null)
})

test('Universal API uses the same loading/failure notice instead of a false unsupported alert', () => {
  const props = { selectedRoles: [], keys: {}, drafts: {}, compact: true, contractSupported: false }
  const { rerender } = render(h(UniversalApiSettings, { ...props, registryStatus: 'loading' }))
  assert.match(screen.getByRole('status').textContent, /正在读取/)
  assert.equal(screen.queryByRole('alert'), null)
  rerender(h(UniversalApiSettings, { ...props, registryStatus: 'error' }))
  assert.match(screen.getByRole('alert').textContent, /读取失败/)
  rerender(h(UniversalApiSettings, { ...props, registryStatus: 'ready' }))
  assert.match(screen.getByRole('alert').textContent, /不支持通用 API/)
})

test('advanced submissions remain blocked with accurate reasons until capability is confirmed', () => {
  for (const [registryStatus, expected] of [['loading', /正在读取/], ['error', /读取失败/]]) {
    assert.throws(() => buildModelSubmission({ configurationMode: 'advanced', modelRoutes: routes, registry: null, registryStatus }), expected)
  }
  assert.throws(() => buildModelSubmission({ configurationMode: 'advanced', modelRoutes: routes, registry: { routeContractVersion: 0 } }), /不支持专业模式/)
  assert.deepEqual(buildModelSubmission({ configurationMode: 'advanced', modelRoutes: routes, registry: { routeContractVersion: 1 } }).modelRoutes, routes)
})
