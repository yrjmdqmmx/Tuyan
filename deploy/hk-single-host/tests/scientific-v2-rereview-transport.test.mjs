import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const read = (path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')
const script = read('../scripts/run-scientific-v2-admin-operator.sh')
const workflow = read('../../../.github/workflows/run-scientific-v2-admin-operator.yml')
const staging = read('../../../.github/workflows/stage-scientific-v2-admin-input.yml')
const embedded = script.match(/node_script='\n([\s\S]*?)\n'\n"\$\{compose\[@\]\}" exec/)?.[1]
assert.ok(embedded)
const commands = ['freeze', 'export', 'import', 'arbitrate', 'inspect', 'publish']
const sessionId = 'review-only-session-20260917'
const inputFor = (reviewCommand) => ({ reviewCommand, sessionId, payload: { frozenHash: 'a'.repeat(64) } })
const responseFor = (reviewCommand) => ({
  sessionId, reviewCommand, status: 'frozen', providerCalls: 0,
  ...(reviewCommand === 'export' ? {
    assignment: { role: 'A', items: [{ imageUrl: 'https://example.invalid/image', imageHash: 'b'.repeat(64), sourceUrl: 'https://example.invalid/source', prompt: 'PRIVATE_PROMPT_CONTENT' }] },
  } : { submissionCount: 0, audit: { rationale: 'PRIVATE_REVIEW_CONTENT' } }),
})

const run = (input, response = responseFor(input.reviewCommand), expectFetch = true) => spawnSync(process.execPath, ['--input-type=module', '-e', `
  globalThis.fetch=async(url,request)=>{
    if(!${expectFetch})throw new Error("UNEXPECTED_FETCH");
    if(url!=="http://127.0.0.1:3000/paperbanana-api"||request.method!=="POST")throw new Error("WRONG_TRANSPORT");
    const body=JSON.parse(request.body);
    const expected=JSON.parse(process.env.REREVIEW_TEST_INPUT);
    if(JSON.stringify(body)!==JSON.stringify({action:"adminBenchmarkControl",evaluationMode:"codex_scientific_v2",command:"reviewOnly",...expected}))throw new Error("WRONG_REQUEST");
    if(request.headers["x-paperbanana-scientific-v2-admin-operation"]!=="rereview")throw new Error("WRONG_OPERATION_HEADER");
    return {ok:true,json:async()=>({code:0,run:JSON.parse(process.env.REREVIEW_TEST_RESPONSE)})};
  };
  ${embedded}
`], {
  input: JSON.stringify(input), encoding: 'utf8',
  env: { ...process.env, PAPERBANANA_SCIENTIFIC_V2_ADMIN_OPERATION: 'rereview', REREVIEW_TEST_INPUT: JSON.stringify(input), REREVIEW_TEST_RESPONSE: JSON.stringify(response) },
})

test('review-only transport routes all six commands through the protected zero-call command', () => {
  for (const command of commands) {
    const result = run(inputFor(command))
    assert.equal(result.status, 0, result.stderr)
    const value = JSON.parse(result.stdout)
    assert.equal(value.operation, 'rereview')
    assert.equal(value.providerCalls, 0)
    assert.equal(value.data.sessionId, sessionId)
    assert.equal(value.data.reviewCommand, command)
    assert.equal(value.data.providerCalls, 0)
    assert.deepEqual(value.privateData, responseFor(command))
    assert.doesNotMatch(JSON.stringify(value.data), /PRIVATE_|https:/)
  }
})

test('review-only transport rejects widened or malformed input before sending a request', () => {
  const valid = inputFor('inspect')
  for (const input of [
    { ...valid, command: 'run' }, { ...valid, action: 'adminBenchmarkPublish' },
    { ...valid, reviewCommand: 'generate' }, { ...valid, sessionId: '../session' },
    { ...valid, sessionId: '' }, { ...valid, payload: [] }, { ...valid, payload: null },
    { reviewCommand: 'freeze', sessionId },
  ]) {
    const result = run(input, {}, false)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /SCIENTIFIC_V2_ADMIN_INPUT_SCHEMA_INVALID/)
    assert.doesNotMatch(result.stderr, /UNEXPECTED_FETCH/)
  }
})

test('review-only transport rejects mismatched sessions, provider calls, private mappings, and malformed exports', () => {
  const valid = responseFor('export')
  for (const response of [
    {}, { ...valid, sessionId: 'other-session' }, { ...valid, reviewCommand: 'publish' },
    { ...valid, providerCalls: 1 }, { ...valid, status: '<raw diagnostic>' },
    { ...valid, nested: { objectKey: 'PRIVATE_OBJECT_KEY' } },
    { ...valid, assignment: { ...valid.assignment, privateMappings: [] } },
    { ...valid, assignment: { ...valid.assignment, reviewerIdentity: 'PRIVATE_REVIEWER' } },
    { ...valid, assignment: { ...valid.assignment, items: [] } },
    { ...valid, assignment: { ...valid.assignment, role: 'model' } },
    { ...valid, assignment: { ...valid.assignment, items: [{ imageUrl: 'http://example.invalid', imageHash: 'b'.repeat(64) }] } },
    { ...valid, assignment: { ...valid.assignment, items: [{ imageUrl: 'https://example.invalid', imageHash: 'b'.repeat(64), sourceUrl: null }] } },
    { ...valid, submissionCount: -1 },
  ]) {
    const result = run(inputFor('export'), response)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /SCIENTIFIC_V2_ADMIN_RESPONSE_SCHEMA_INVALID/)
    assert.equal(result.stdout, '')
  }
})

test('review-only transport flushes large blind artifacts and bounds oversized responses', () => {
  for (const size of [512 * 1024, 8 * 1024 * 1024]) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      const largeMockResponse=${JSON.stringify(responseFor('export'))};
      largeMockResponse.assignment.items[0].prompt="x".repeat(${size});
      globalThis.fetch=async()=>({ok:true,json:async()=>({code:0,run:largeMockResponse})});
      ${embedded}
    `], {
      input: JSON.stringify(inputFor('export')), encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, PAPERBANANA_SCIENTIFIC_V2_ADMIN_OPERATION: 'rereview' },
    })
    if (size < 8 * 1024 * 1024) {
      assert.equal(result.status, 0, result.stderr)
      assert.equal(JSON.parse(result.stdout).privateData.assignment.items[0].prompt.length, size)
    } else {
      assert.notEqual(result.status, 0)
      assert.equal(result.stdout, '')
      assert.match(result.stderr, /SCIENTIFIC_V2_ADMIN_RESPONSE_SCHEMA_INVALID/)
    }
  }
})

test('review-only inspection admits anonymous arbitration assignments without requiring an export role', () => {
  const response = { ...responseFor('inspect'), status: 'review_dispute', assignment: { ...responseFor('export').assignment, role: 'ARBITRATION' } }
  const result = run(inputFor('inspect'), response)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(JSON.parse(result.stdout).data.itemCount, 1)
  const wrongExport = run(inputFor('export'), { ...response, reviewCommand: 'export' })
  assert.notEqual(wrongExport.status, 0)
})

test('review-only draft staging admits only the exact review command envelope', () => {
  const filter = staging.match(/jq -e --arg purpose "\$PURPOSE" '\n([\s\S]*?)\n\s+' "\$input" >\/dev\/null/)?.[1]
  assert.ok(filter)
  const check = (value) => spawnSync('jq', ['-e', '--arg', 'purpose', 'rereview', filter], { input: JSON.stringify(value), encoding: 'utf8' }).status
  for (const command of commands) assert.equal(check(inputFor(command)), 0, command)
  for (const value of [
    { ...inputFor('freeze'), command: 'freezeBatch' },
    { ...inputFor('freeze'), reviewCommand: 'run' },
    { ...inputFor('freeze'), sessionId: '../session' },
    { ...inputFor('freeze'), payload: [] },
    { ...inputFor('freeze'), payload: { attestationSecret: 'invalid' } },
  ]) assert.notEqual(check(value), 0)
})

test('review-only workflows preserve complete responses as short-lived artifacts and print only summaries', () => {
  assert.match(workflow, /elif \[\[ "\$OPERATION" == rereview \]\]; then/)
  assert.match(workflow, /ssh[^\n]*"\$command" >"\$review_output"/)
  assert.match(workflow, /jq -c '\{operation,providerCalls:0,data\}' "\$review_output"/)
  assert.match(workflow, /inputs[.]operation == 'rereview'/)
  assert.match(workflow, /name: scientific-v2-rereview-result-/)
  assert.match(workflow, /path:.*scientific-v2-rereview-result[.]json/)
  assert.match(workflow, /retention-days:\s*1/)
  assert.doesNotMatch(workflow, /cat\s+"?\$review_output|jq -c [.] "\$review_output"/)
  assert.match(script, /"\$operation" == rereview[\s\S]*private_response_sha256/)
  assert.match(script, /reviewData:[.]privateData/)
  assert.match(script, /paperbanana-hk-production[.]lock/)
  for (const marker of ['O_NOFOLLOW', 'Config.Image', 'RepoDigests', 'build-provenance.json', 'PAPERBANANA_BENCH_ENABLED', 'PAPERBANANA_BENCH_CONCURRENCY']) assert.ok(script.includes(marker))
})
