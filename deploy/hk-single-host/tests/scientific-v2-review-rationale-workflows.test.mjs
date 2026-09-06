import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const manifestHash = 'a'.repeat(64)
const packetHash = 'b'.repeat(64)
const itemHash = 'c'.repeat(64)
const sourceSetHash = 'd'.repeat(64)
const validRationale = '图中 Figure 2 的 NF-κB → αβ 分支保留，p=0.05 与 3 个节点清楚；箭头方向正确，标签边缘仍有少量重叠。'

const workflows = [
  ['stage-scientific-v2-review-validation-bundle.yml', 'review'],
  ['stage-scientific-v2-arbitration-bundle.yml', 'arbitration'],
].map(([name, kind]) => {
  const source = readFileSync(fileURLToPath(new URL(`../../../.github/workflows/${name}`, import.meta.url)), 'utf8')
  const anchor = kind === 'review'
    ? 'jq -e --arg role "$ROLE" --arg manifest "$MANIFEST_HASH"'
    : 'jq -e --arg manifest "$MANIFEST_HASH"'
  const start = source.indexOf(anchor)
  assert.notEqual(start, -1, `downloaded input validator missing: ${name}`)
  const filter = source.slice(start + anchor.length).match(/^\s*'([\s\S]*?)' "\$input" >\/dev\/null/)?.[1]
  assert.ok(filter, `downloaded input validator is not extractable: ${name}`)
  return { name, kind, source, filter }
})

function submission(kind, rationale, role = 'A') {
  const result = { itemHash, rationale, redLines: [], scores: { scientific_faithfulness: 8 } }
  return kind === 'review'
    ? { schemaVersion: 2, batchManifestHash: manifestHash, role, publicAssignment: { role }, submissions: [{ packetHash, results: [{ ...result, blindLabel: 'item-01', lowConfidence: false }] }] }
    : { schemaVersion: 2, batchManifestHash: manifestHash, sourceSetHash, reasoningEffort: 'xhigh', results: [result] }
}

function validate(workflow, value, role = 'A') {
  return spawnSync('jq', ['-e', '--arg', 'manifest', manifestHash, '--arg', 'role', role, workflow.filter], {
    input: JSON.stringify(value), encoding: 'utf8',
  })
}

for (const workflow of workflows) {
  test(`${workflow.name}: real jq accepts Chinese, English, digits, Greek and scientific symbols`, () => {
    for (const role of workflow.kind === 'review' ? ['A', 'B'] : ['A']) {
      const accepted = validate(workflow, submission(workflow.kind, validRationale, role), role)
      assert.equal(accepted.status, 0, accepted.stderr)
      assert.equal(accepted.stdout.trim(), 'true')
    }
  })

  test(`${workflow.name}: real jq rejects every C0 control, DEL and Unicode format controls`, () => {
    const forbidden = [...Array.from({ length: 32 }, (_, code) => code), 127, 0x061c, 0x200b, 0x200e, 0x202e, 0x2060, 0xfeff]
    for (const code of forbidden) {
      const rejected = validate(workflow, submission(workflow.kind, `${validRationale}${String.fromCodePoint(code)}甲`))
      assert.notEqual(rejected.status, 0, `accepted U+${code.toString(16).padStart(4, '0')}`)
      assert.equal(rejected.stdout.trim(), 'false', rejected.stderr)
    }
  })

  test(`${workflow.name}: real jq still rejects credentials and placeholder rationales`, () => {
    for (const rationale of [
      '图中结构可以复核，但是 secret 字段不应出现在公开理由中。',
      '节点排列可辨，但是 api_key 字段不应出现在公开理由中。',
      '图中结构可以复核，说明见 https://example.com/evidence 页面。',
      '整体表现良好，图中所有节点均按照原有布局显示。',
      'looks good, the figure follows the requirements completely.',
    ]) {
      const rejected = validate(workflow, submission(workflow.kind, rationale))
      assert.notEqual(rejected.status, 0)
      assert.equal(rejected.stdout.trim(), 'false', rejected.stderr)
    }
  })
}

test('review and arbitration stagers keep independent control SHA and frozen data-plane SHA bindings', () => {
  for (const { source, name } of workflows) {
    assert.match(source, /"\$GITHUB_SHA" == "\$CONTROL_SHA"/, name)
    assert.match(source, /"\$DEPLOYED_SHA" =~ \^\[a-f0-9\]\{40\}\$/, name)
    assert.doesNotMatch(source, /"\$GITHUB_SHA" == "\$DEPLOYED_SHA"|"\$CONTROL_SHA" == "\$DEPLOYED_SHA"/, name)
    assert.match(source, /target_commitish == \$deployed/, name)
  }
})
