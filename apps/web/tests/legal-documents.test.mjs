import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const publicDir = new URL('../public/', import.meta.url)

test('privacy policy describes the current Web and WeChat Mini Program data flow without placeholders', async () => {
  const source = await readFile(new URL('privacy-policy.html', publicDir), 'utf8')
  assert.doesNotMatch(source, /初稿模板|DRAFT TEMPLATE|\[fill in|请补充/)
  assert.match(source, /2026-08-19/)
  assert.match(source, /2026-09-03/)
  assert.match(source, /可通过 Web 与微信小程序使用/)
  assert.match(source, /available on the Web and WeChat Mini Program/)
  assert.match(source, /阿里云香港|Alibaba Cloud Hong Kong/)
  assert.match(source, /新加坡.*出口|Singapore.*egress/is)
  assert.match(source, /clientPlatform/)
  assert.match(source, /IP 地址|IP address/)
  assert.match(source, /User-Agent/)
  assert.match(source, /不会持久化|not persist/i)
  assert.match(source, /失效前已经开始[\s\S]*后台持续重扫|后台持续重扫[\s\S]*失效前已经开始/,
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

test('each canonical Web legal document makes the required current data disclosures', async () => {
  const documents = [
    ['public privacy policy HTML', '../public/privacy-policy.html', true],
    ['public terms HTML', '../public/terms-of-service.html', false],
  ]

  for (const [name, path, requiresNoTracking] of documents) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8')
    assert.match(source, /香港|Hong Kong/, `${name} must disclose Hong Kong service`)
    assert.match(source, /新加坡|Singapore/, `${name} must disclose possible Singapore egress`)
    assert.match(source, /方舟|Ark/, `${name} must name Ark`)
    assert.match(source, /短生命周期|临时|ephemeral/i, `${name} must disclose ephemeral BYOK forwarding`)
    assert.match(source, /不持久化.*(?:记录|日志|回显)|do not persist, log, or echo/is, `${name} must disclose no BYOK persistence, logging, or echoing`)
    assert.doesNotMatch(source, /never uploaded to our servers|从不上传我方服务器|初稿模板|DRAFT TEMPLATE|\[fill in/i)
    assert.doesNotMatch(source, /Sealos.{0,80}(?:杭州|Hangzhou)|(?:杭州|Hangzhou).{0,80}Sealos/is,
      `${name} must not move the primary Sealos service from Hong Kong to Hangzhou`)
    if (requiresNoTracking) {
      assert.match(source, /DirectMail.{0,80}(?:杭州|Hangzhou)|(?:杭州|Hangzhou).{0,80}DirectMail/is,
        `${name} must disclose that account-security email uses Hangzhou DirectMail`)
      assert.match(source, /不.*追踪|No Tracking|do not track/i, `${name} must disclose no tracking`)
    }
  }
})

test('terms HTML states that BYOK reaches the provider or platform selected by the user', async () => {
  const source = await readFile(new URL('../public/terms-of-service.html', import.meta.url), 'utf8')
  assert.match(source, /gateway and job core to the selected platform/i)
})

test('the canonical privacy policy documents deletion sequencing and minimized runtime safety fields', async () => {
  const policies = [
    ['public privacy policy HTML', '../public/privacy-policy.html'],
  ]

  for (const [name, path] of policies) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8')
    assert.match(source, /冻结.*(?:任务|上传)|freeze.*(?:jobs|uploads)/is, `${name} must explain that deletion freezes new jobs and uploads`)
    assert.match(source, /直传链接.*运行.*任务.*排空|direct-upload.*(?:running|in-flight).*jobs.*drain/is, `${name} must explain draining active work and direct-upload links`)
    assert.match(source, /tombstone|墓碑|后台.*(?:重扫|扫除)|background.*(?:sweep|rescan)/is, `${name} must explain late-object cleanup after deletion`)
    assert.match(source, /IP 地址|IP address/i, `${name} must disclose IP address`)
    assert.match(source, /User-Agent/i, `${name} must disclose User-Agent`)
    assert.match(source, /clientPlatform/i, `${name} must disclose clientPlatform`)
    assert.match(source, /最小化|data minimization|minimi[sz]ation/i, `${name} must describe data minimization`)
    assert.match(source, /不.*追踪|No Tracking|do not track/i, `${name} must disclose no tracking`)
  }
})
