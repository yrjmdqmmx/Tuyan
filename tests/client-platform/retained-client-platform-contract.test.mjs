import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('Web and WeChat Mini Program send their exact platform identifiers', () => {
  const web = read('packages/api/src/jobs.js')
  const webCreate = web.slice(web.indexOf('export async function createJobRequest'), web.indexOf('export async function referenceLibraryRequest'))
  const webRefine = web.slice(web.indexOf('export async function refineImageRequest'), web.indexOf('export async function prepareReferenceUploadRequest'))
  assert.equal((webCreate.match(/clientPlatform: CLIENT_PLATFORM/g) || []).length, 2)
  assert.equal((webRefine.match(/clientPlatform: CLIENT_PLATFORM/g) || []).length, 1)
  assert.match(web, /const CLIENT_PLATFORM = 'web'/)

  const miniprogram = read('apps/miniprogram/miniprogram/utils/payload.ts')
  assert.match(miniprogram, /clientPlatform: 'miniprogram'/)
})

test('retained clients continue to render historical platform labels', () => {
  const sources = [
    read('packages/api/src/jobs.js'),
    read('apps/miniprogram/miniprogram/utils/jobs.ts'),
  ]
  for (const [index, source] of sources.entries()) {
    for (const label of ['Web 网页', '微信小程序', 'Android', 'iOS', 'Windows', 'macOS', 'HarmonyOS', '未记录']) {
      assert.ok(source.includes(label), `retained client mapper ${index + 1} is missing historical label ${label}`)
    }
  }
})

test('retained task detail and record views show the normalized source label', () => {
  const surfaces = [
    [read('apps/web/src/components/JobStatus.jsx'), /任务来源：\{formatClientPlatform\(job\.client_platform\)\}/],
    [read('apps/web/src/components/JobTable.jsx'), /formatClientPlatform\(item\.client_platform\)/],
    [read('apps/miniprogram/miniprogram/pages/job-detail/job-detail.wxml'), /任务来源：\{\{job\.client_platform_text\}\}/],
    [read('apps/miniprogram/miniprogram/pages/records/records.wxml'), /任务来源：\{\{item\.client_platform_text\}\}/],
  ]
  for (const [source, contract] of surfaces) assert.match(source, contract)
})
