const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

function hasMiniprogramMetadata(directory) {
  return ['package.json', 'project.config.json'].every((file) => fs.existsSync(path.join(directory, file)))
}

const localMiniprogramRoot = path.resolve(__dirname, '..')
const candidateRepositoryRoot = path.resolve(__dirname, '..', '..', '..')
const candidateMonorepoMiniprogramRoot = path.join(candidateRepositoryRoot, 'apps', 'miniprogram')
const syncPath = path.join(candidateRepositoryRoot, 'SYNC.md')
const localHasMetadata = hasMiniprogramMetadata(localMiniprogramRoot)
const candidateHasMetadata = hasMiniprogramMetadata(candidateMonorepoMiniprogramRoot)
assert.ok(localHasMetadata, 'cannot locate local miniprogram metadata')
const isMonorepo = fs.existsSync(syncPath)
  && candidateHasMetadata
  && fs.realpathSync(candidateMonorepoMiniprogramRoot) === fs.realpathSync(localMiniprogramRoot)
const miniprogramRoot = isMonorepo ? candidateMonorepoMiniprogramRoot : localMiniprogramRoot

if (fs.existsSync(syncPath) && candidateHasMetadata && fs.realpathSync(candidateMonorepoMiniprogramRoot) === fs.realpathSync(localMiniprogramRoot)) {
  assert.equal(isMonorepo, true, 'monorepo test run must select monorepo mode')
}
const packageJson = JSON.parse(fs.readFileSync(path.join(miniprogramRoot, 'package.json'), 'utf8'))
const projectConfig = JSON.parse(fs.readFileSync(path.join(miniprogramRoot, 'project.config.json'), 'utf8'))
const sourceConfig = fs.readFileSync(path.join(miniprogramRoot, 'miniprogram', 'utils', 'config.ts'), 'utf8')
const readme = fs.readFileSync(path.join(miniprogramRoot, 'README.md'), 'utf8')
const changelog = fs.readFileSync(path.join(miniprogramRoot, 'CHANGELOG.md'), 'utf8')

function sectionFrom(markdown, heading) {
  const start = markdown.indexOf(heading)
  assert.notEqual(start, -1, `missing section: ${heading}`)
  const nextHeading = markdown.indexOf('\n## ', start + heading.length)
  return markdown.slice(start, nextHeading === -1 ? undefined : nextHeading)
}

assert.equal(packageJson.version, '3.3.0')
assert.equal(projectConfig.description, '图研Tuyan 3.3.0 微信小程序')
assert.match(sourceConfig, /export const CLIENT_VERSION = 'miniprogram-3\.3\.0'/)

const parity = sectionFrom(changelog, '## 图研Tuyan 3.1.0（2026-09-09）')
for (const feature of ['输入优化', '原图精修', '账号 ID', '21 个渠道', '未上传']) assert.ok(parity.includes(feature))

const readmeRelease = sectionFrom(readme, '## 3.0.1 上传备注')
for (const feature of ['邮箱验证/重发', '忘记密码', '登录后修改密码', '冷却/错误反馈', '既有任务、模型设置和账号删除']) {
  assert.ok(readmeRelease.includes(feature), `README release note omits ${feature}`)
}
assert.match(readmeRelease, /不代表.*审核.*发布/)

const changelogRelease = sectionFrom(changelog, '## 图研Tuyan 3.0.1（2026-08-23）')
for (const feature of ['邮箱验证/重发', '忘记密码', '登录后修改密码', '兼容现有任务、模型设置和账号删除']) {
  assert.ok(changelogRelease.includes(feature), `CHANGELOG release section omits ${feature}`)
}
assert.match(changelogRelease, /无需用户、数据库或本地存储迁移/)
assert.match(changelogRelease, /既有会话保持有效/)

if (isMonorepo && fs.existsSync(syncPath)) {
  const sync = fs.readFileSync(syncPath, 'utf8')
  const heading = '### [2026-08-23] 标准账号安全与邮件恢复契约'
  const start = sync.indexOf(heading)
  assert.notEqual(start, -1, 'missing standard account-security SYNC entry')
  const accountSecuritySync = sync.slice(start, sync.indexOf('\n### ', start + heading.length))
  assert.match(accountSecuritySync, /- \[x\] 微信小程序/)
  assert.match(accountSecuritySync, /3\.0\.1 实现与测试完成/)
  assert.match(accountSecuritySync, /3\.0\.1 开发者工具上传已完成；体验版\/审核\/发布仍待完成/)
  assert.match(accountSecuritySync, /- \[ \] Android \/ Windows \/ macOS \/ HarmonyOS/)
  assert.match(accountSecuritySync, /- \[ \] 部署 \/ 运维/)
}

console.log('release-metadata-3.0.1.test.cjs passed')
