import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const workflow = fs.readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')

test('CI selects an iOS destination eligible for the PaperBanana scheme', () => {
  assert.doesNotMatch(workflow, /simctl list devices/)
  assert.doesNotMatch(workflow, /xcodebuild -showdestinations/)
  assert.match(workflow, /runs-on: macos-26/)
  assert.match(workflow, /name: Select newest Xcode 26/)
  assert.match(workflow, /Xcode_26\*\.app/)
  assert.match(workflow, /DEVELOPER_DIR=\$\{xcode_path\}\/Contents\/Developer/)
  assert.match(workflow, /platform=iOS Simulator,name=iPhone 17,OS=latest/)
})
