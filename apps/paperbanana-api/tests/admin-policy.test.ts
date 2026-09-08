import assert from 'node:assert/strict'
import test from 'node:test'
import { createAdminOperations } from '../src/admin-operations.js'
import { literal, mask, paging, requireRevision, revision, safe, timeFilter } from '../src/admin-policy.js'

test('admin query parsers reject malformed pagination, objects, status dates and backwards intervals', () => {
  for (const page of [0, -1, 1.5, 'invalid', 100001]) assert.throws(() => paging({ page }))
  assert.throws(() => paging({ pageSize: 10000 }))
  for (const from of ['yesterday', '2026-02-30T00:00:00Z', '2026-09-08', {}, '2026-09-08T12:00:00+08:00']) assert.throws(() => timeFilter({ from }))
  assert.throws(() => timeFilter({ from: '2026-09-09T00:00:00Z', to: '2026-09-08T00:00:00Z' }))
  assert.equal(literal('.*').test('normal text'), false)
  assert.equal(literal('x.y').test('x.y'), true)
})

test('operator text redacts credential maps, nested serialized secrets and auth URLs', () => {
  const content = safe('apiKeys: { openai: "MAP_CANARY", gemini: "MAP2_CANARY" } token=TOKEN_CANARY password: PASSWORD_CANARY https://example.test?key=URL_CANARY', 4000)
  assert.doesNotMatch(content, /CANARY/)
  assert.equal(mask('researcher@example.test'), 'r***@example.test')
  assert.equal(mask('13800001234'), '13***34')
  const row = { updatedAt: new Date('2026-09-08T00:00:00Z'), adminVersion: 2 }
  assert.doesNotThrow(() => requireRevision({ expectedRevision: revision(row) }, row))
  assert.throws(() => requireRevision({ expectedRevision: revision({ ...row, adminVersion: 1 }) }, row))
})

test('unconfigured benchmark data is unavailable rather than a fabricated empty list; service itself rejects non-admin', async () => {
  const db = { collection() { return {} } } as any
  const service = createAdminOperations({ db, publicJob: async () => ({}) })
  await assert.rejects(service.handle({ action: 'adminCommunityList' }, true), /数据库未配置/)
  await assert.rejects(service.handle({ action: 'adminTaskList' }, false), /管理员身份/)
})
