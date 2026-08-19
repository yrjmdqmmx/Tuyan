import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const workflow = fs.readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')

test('CI selects an iOS destination eligible for the PaperBanana scheme', () => {
  assert.doesNotMatch(workflow, /simctl list devices/)
  assert.match(workflow, /xcodebuild -showdestinations/)
  assert.match(workflow, /platform:iOS Simulator[\s\S]*name:iPhone/)
  assert.match(workflow, /test -n "\$destination_id"/)
})
