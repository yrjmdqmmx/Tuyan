import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const publicDir = new URL('../public/', import.meta.url)

test('privacy policy describes the live multi-platform data flow without placeholders', async () => {
  const source = await readFile(new URL('privacy-policy.html', publicDir), 'utf8')
  assert.doesNotMatch(source, /初稿模板|DRAFT TEMPLATE|\[fill in|请补充/)
  assert.match(source, /2026-08-19/)
  assert.match(source, /阿里云香港|Alibaba Cloud Hong Kong/)
  assert.match(source, /新加坡.*出口|Singapore.*egress/is)
  assert.match(source, /clientPlatform/)
  assert.match(source, /IP 地址|IP address/)
  assert.match(source, /User-Agent/)
  assert.match(source, /不会持久化|not persist/i)
  assert.match(source, /失效前已经开始[\s\S]*后台持续重扫/,
    'privacy policy must disclose delayed cleanup for uploads that finish after URL expiry')
  assert.doesNotMatch(source, /仅存储在您设备本机的 iOS Keychain|stored ONLY in your device's local iOS Keychain/)
  assert.doesNotMatch(source, /Sealos.*杭州|Sealos.*Hangzhou/)
})

test('terms match the gateway transit-only API key behavior and contain no legal placeholders', async () => {
  const source = await readFile(new URL('terms-of-service.html', publicDir), 'utf8')
  assert.doesNotMatch(source, /初稿模板|DRAFT TEMPLATE|\[fill in/)
  assert.match(source, /2026-08-19/)
  assert.match(source, /短生命周期.*网关|ephemeral.*gateway/is)
  assert.match(source, /不持久化|do not persist/i)
  assert.match(source, /中华人民共和国法律/)
  assert.match(source, /People's Republic of China/)
})

test('release legal documents disclose Hong Kong service, possible Singapore egress, Ark, ephemeral BYOK forwarding, and no tracking', async () => {
  const paths = [
    '../../../docs/app-store-submission/privacy-policy.md',
    '../../../docs/app-store-submission/privacy-policy.html',
    '../../../docs/app-store-submission/terms-of-service.md',
    '../../../docs/app-store-submission/terms-of-service.html',
    '../public/privacy-policy.html',
    '../public/terms-of-service.html',
  ]
  const sources = await Promise.all(paths.map(path => readFile(new URL(path, import.meta.url), 'utf8')))
  const joined = sources.join('\n')
  assert.match(joined, /香港|Hong Kong/)
  assert.match(joined, /新加坡|Singapore/)
  assert.match(joined, /方舟|Ark/)
  assert.match(joined, /临时|ephemeral/i)
  assert.match(joined, /不.*追踪|No Tracking|do not track/i)
  assert.doesNotMatch(joined, /杭州|Hangzhou|never uploaded to our servers|从不上传我方服务器|初稿模板|DRAFT TEMPLATE|\[fill in/i)
})

test('App Store listing and review notes keep pipeline finalization distinct from independent Refine', async () => {
  const paths = [
    '../../../docs/app-store-submission/app-store-listing.md',
    '../../../docs/app-store-submission/review-notes.md',
  ]
  const joined = (await Promise.all(paths.map(path => readFile(new URL(path, import.meta.url), 'utf8')))).join('\n')
  assert.match(joined, /rerender\/finalize/)
  assert.match(joined, /重渲染\/定稿/)
  assert.match(joined, /Independent Refine|独立「精修」/)
  assert.doesNotMatch(joined, /plan\s*→\s*render\s*→\s*critique\s*→\s*refine|规划\s*→\s*渲染\s*→\s*评审\s*→\s*精修/i)
})
