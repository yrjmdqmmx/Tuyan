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
  assert.doesNotMatch(source, /仅存储在您设备本机的 iOS Keychain|stored ONLY in your device's local iOS Keychain/)
  assert.doesNotMatch(source, /Sealos.*杭州|Sealos.*Hangzhou/)
})

test('terms match the gateway transit-only API key behavior and contain no legal placeholders', async () => {
  const source = await readFile(new URL('terms-of-service.html', publicDir), 'utf8')
  assert.doesNotMatch(source, /初稿模板|DRAFT TEMPLATE|\[fill in/)
  assert.match(source, /2026-08-19/)
  assert.match(source, /经.*网关.*处理过程|gateway.*in memory/is)
  assert.match(source, /不持久化|do not persist/i)
  assert.match(source, /中华人民共和国法律/)
  assert.match(source, /People's Republic of China/)
})
