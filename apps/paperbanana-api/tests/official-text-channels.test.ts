import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { AUDITED_CHANNEL_CONTRACTS } from '../../../packages/api/src/audited-channel-data.js'
import { auditedChannelContract } from '../../../packages/api/src/audited-channel-contracts.js'
import { buildAuditedTextBody, callNewTextChannel, type NewTextInput } from '../../../packages/api/src/text-channel-adapters.js'

// These fixtures never contact a provider. The independently audited SKU list is
// the oracle, so an omitted generated contract cannot silently omit its test.
const readAudit = (provider:string) => JSON.parse(readFileSync(new URL(`../../../config/channel-audit/v24/${provider}.json`, import.meta.url), 'utf8'))
const iflytekAudit = readAudit('iflytek')
const longcatAudit = readAudit('longcat')
const selected = [
  ...iflytekAudit.models.filter((m:any) => m.selectable && m.internalChannelId === 'iflytek_maas' && ['openai-chat', 'anthropic-messages'].includes(m.protocol)).map((m:any) => ({...m, provider:'iflytek'})),
  ...longcatAudit.models.filter((m:any) => m.selectable).map((m:any) => ({...m, provider:'longcat'})),
]
const imageUrl = 'data:image/png;base64,c2NpZW50aWZpYy1maWd1cmU='
const inputFor = (row:any, images:{url:string}[] = []):NewTextInput => ({provider:row.provider, model:row.id, apiKey:'fixture-only-key', system:'保留科学结论与编号', user:'说明节点之间的关系', images})
const openAI = (content:any = '完整的科学规划', finish_reason:any = 'stop') => ({id:'req-fixture', model:'provider-resolved-version', choices:[{index:0, finish_reason, message:{content, reasoning_content:'内部推理不得作为答案'}}], usage:{prompt_tokens:23, completion_tokens:8}})
const anthropic = (content:any = [{type:'text', text:'完整的科学规划'}], stop_reason:any = 'end_turn') => ({id:'msg-fixture', type:'message', role:'assistant', model:'provider-resolved-version', content, stop_reason, usage:{input_tokens:23, output_tokens:8}})

function fixture(respond:(body:any)=>Response|Promise<Response>, pending?:any) {
  const calls:any[] = [], records:any[] = [], checkpoints:any[] = []
  return {
    calls, records, checkpoints,
    io: {
      request:async (url:string, init:RequestInit, label:string, attempts:number) => {
        const body = JSON.parse(String(init.body))
        calls.push({url, init, label, attempts, body})
        return respond(body)
      },
      json:async (response:Response) => {if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json()},
      now:() => 0, sleep:async () => {}, pollIntervalMs:1, pollTimeoutMs:4,
      pending:async () => pending,
      checkpoint:async (value:any) => {checkpoints.push(structuredClone(value)); pending = structuredClone(value)},
      record:async (value:any) => {records.push(value)},
    },
  }
}

test('official text selection contains every ordinary MaaS HTTP SKU and only current LongCat', () => {
  assert.equal(selected.filter((m:any) => m.provider === 'iflytek' && m.protocol === 'openai-chat').length, 24)
  assert.equal(selected.filter((m:any) => m.provider === 'iflytek' && m.protocol === 'anthropic-messages').length, 8)
  assert.deepEqual(selected.filter((m:any) => m.provider === 'longcat').map((m:any) => m.id), ['LongCat-2.0'])
  for (const provider of ['iflytek', 'longcat']) {
    const actual = Object.keys(AUDITED_CHANNEL_CONTRACTS).filter(key => key.startsWith(provider + '/')).sort()
    const expected = selected.filter((m:any) => m.provider === provider).map((m:any) => provider + '/' + m.id).sort()
    assert.deepEqual(actual, expected, `${provider}: separate Spark credentials, subscriptions, WS and held services must not enter ordinary MaaS`)
  }
})

for (const row of selected) test(`${row.provider}/${row.id}: exact protocol, role, request and complete response`, async () => {
  const contract = auditedChannelContract(row.provider, row.id)
  assert.ok(contract, `${row.id} is missing its generated contract`)
  assert.equal(contract.textEndpoint, row.request.endpoint)
  assert.deepEqual([...contract.roles].sort(), [...row.roles].sort())
  assert.equal(contract.maxImages, row.roles.includes('vision') ? 1 : 0, 'unknown provider image cap uses the documented conservative local cap')
  const images = row.roles.includes('main') ? [] : [{url:imageUrl}]
  const input = inputFor(row, images)
  const body = buildAuditedTextBody(input)
  assert.equal(body.model, row.id)
  for (const [key,value] of Object.entries(row.request.constants)) assert.deepEqual(body[key], value, `official constant ${key}`)
  assert.equal(JSON.stringify(body).includes(input.apiKey), false)
  if (row.protocol === 'anthropic-messages') {
    assert.equal(contract.textProtocol, 'anthropic-messages')
    assert.equal(body.system, input.system)
    assert.equal(body.messages.some((m:any) => m.role === 'system'), false)
    assert.equal(body.messages[0].role, 'user')
    assert.ok(Number.isInteger(body.max_tokens) && body.max_tokens > 0)
    // Even interpreting k as 1024, an 8k-context SKU cannot reserve all 8192
    // tokens for output while this request also includes nonempty input.
    if (row.limits.contextLabel === '8k') assert.ok(body.max_tokens < 8192, `${row.id}: output budget must leave room for input`)
    assert.ok(body.messages[0].content === input.user || body.messages[0].content.some((b:any) => b.type === 'text' && b.text === input.user))
  } else {
    assert.deepEqual(body.messages[0], {role:'system', content:input.system})
    assert.equal(body.messages[1].role, 'user')
    if (images.length) assert.deepEqual(body.messages[1].content, [{type:'text', text:input.user}, {type:'image_url', image_url:images[0]}])
    else assert.equal(body.messages[1].content, input.user)
  }
  const expectedResponse = row.protocol === 'anthropic-messages' ? anthropic() : openAI()
  const f = fixture(() => Response.json(expectedResponse))
  assert.equal(await callNewTextChannel(input, f.io), '完整的科学规划')
  assert.equal(f.calls.length, 1)
  assert.equal(f.calls[0].url, row.request.endpoint)
  assert.equal(f.calls[0].init.method, row.request.method)
  assert.equal(f.calls[0].init.redirect, 'error')
  assert.equal(f.calls[0].attempts, 1, 'billable POST must never be auto-retried')
  assert.equal(new Headers(f.calls[0].init.headers).get('Authorization'), 'Bearer fixture-only-key')
  assert.deepEqual(f.calls[0].body, body)
  assert.equal(f.records.length, 1)
  assert.equal(f.records[0].provider, row.provider)
  assert.equal(f.records[0].model, row.id)
  assert.equal(f.records[0].operation, images.length ? 'vision' : 'text')
  assert.equal(f.records[0].resolvedModel, expectedResponse.model)
  assert.deepEqual(f.records[0].usage, expectedResponse.usage)
  assert.equal(f.records[0].reportedCost, null)
  assert.equal(f.records[0].estimatedCost, null)
  assert.equal(f.records[0].invoiceCost, null)
  assert.equal(JSON.stringify(f.records).includes(input.apiKey), false)
})

test('MaaS vision preserves URL and inline image inputs for every image-capable SKU', async () => {
  const vision = selected.filter((m:any) => m.roles.includes('vision'))
  assert.equal(vision.length, 6)
  for (const row of vision) for (const url of [imageUrl, 'https://example.org/scientific-figure.png']) {
    const f = fixture(() => Response.json(openAI()))
    await callNewTextChannel(inputFor(row, [{url}]), f.io)
    assert.deepEqual(f.calls[0].body.messages[1].content[1], {type:'image_url', image_url:{url}})
    assert.equal(f.records[0].operation, 'vision')
  }
})

test('role, local image cap and unavailable service rejection happen before any POST', async () => {
  const f = fixture(() => {throw new Error('invalid inputs must not reach the transport')})
  for (const row of selected) {
    const images = row.roles.includes('vision') ? [{url:imageUrl}, {url:imageUrl}] : [{url:imageUrl}]
    await assert.rejects(callNewTextChannel(inputFor(row, images), f.io), (e:any) => e.localInputFailure === true && e.requestState === 'not_sent')
    if (!row.roles.includes('main')) await assert.rejects(callNewTextChannel(inputFor(row), f.io), (e:any) => e.localInputFailure === true)
  }
  for (const [provider,model] of [['longcat','LongCat-Flash-Chat'], ['longcat','LongCat-Flash-Omni-2603'], ['iflytek','lite'], ['iflytek','s3fd61810'], ['iflytek','xopglm5'], ['iflytek','xoppaddleocrv16 ']] as const) {
    await assert.rejects(callNewTextChannel({...inputFor(selected[0]), provider, model}, f.io), (e:any) => e.localInputFailure === true)
  }
  assert.equal(f.calls.length, 0)
})

test('reasoning-only, empty and truncated JSON are never accepted or automatically resubmitted', async () => {
  for (const row of selected) {
    const invalid = row.protocol === 'anthropic-messages'
      ? [anthropic([{type:'thinking', thinking:'only internal reasoning'}]), anthropic([]), anthropic([{type:'text',text:'   '}]), anthropic([{type:'text',text:123}]), anthropic(undefined,'max_tokens'), anthropic(undefined,'tool_use'), anthropic(undefined,null)]
      : [openAI(''), openAI('   '), openAI(null), openAI(undefined,'length'), openAI(undefined,'content_filter'), openAI(undefined,null), {choices:[{finish_reason:'stop',message:{reasoning_content:'only internal reasoning'}}]}]
    for (const response of invalid) {
      const f = fixture(() => Response.json(response))
      const images = row.roles.includes('main') ? [] : [{url:imageUrl}]
      await assert.rejects(callNewTextChannel(inputFor(row, images), f.io), `${row.id} accepted incomplete/hidden-only content`)
      assert.equal(f.calls.length, 1)
      assert.equal(f.calls[0].attempts, 1)
    }
  }
})

test('Anthropic output only contains text blocks, preserving usage without leaking thinking', async () => {
  const row = selected.find((m:any) => m.protocol === 'anthropic-messages')
  const response = anthropic([{type:'thinking', thinking:'hidden chain'}, {type:'text',text:'科学'}, {type:'text',text:'规划'}])
  const f = fixture(() => Response.json(response))
  const result = await callNewTextChannel(inputFor(row), f.io)
  assert.match(result, /科学\s*规划/)
  assert.equal(result.includes('hidden'), false)
  assert.deepEqual(f.records[0].usage, {input_tokens:23,output_tokens:8})
})

test('HTTP failures, invalid JSON and lost acknowledgements never retry or switch provider', async () => {
  for (const row of [selected.find((m:any) => m.provider === 'iflytek' && m.protocol === 'openai-chat'), selected.find((m:any) => m.protocol === 'anthropic-messages'), selected.find((m:any) => m.provider === 'longcat')]) {
    const responses = [
      ...[401,403,429,500,503].map(status => () => Response.json({error:{message:'fixture rejection'}}, {status})),
      () => Response.json({error:{message:'logical failure'}}),
      () => Response.json({code:10013,message:'quota rejected'}),
      () => new Response('{invalid JSON', {headers:{'Content-Type':'application/json'}}),
      () => {throw new Error('reply lost after request reached provider')},
    ]
    for (const respond of responses) {
      const f = fixture(respond)
      await assert.rejects(callNewTextChannel(inputFor(row), f.io))
      assert.equal(f.calls.length, 1)
      assert.equal(f.calls[0].url, row.request.endpoint)
      assert.equal(f.calls[0].attempts, 1)
      assert.equal(f.records.length, 0)
    }
  }
})

test('an existing synchronous task never causes a second inference request', async () => {
  for (const row of selected) for (const pending of [
    {provider:row.provider,model:row.id,taskId:'unknown-result'},
    {provider:row.provider,model:row.id,taskId:'rejected-result',failed:true},
    {provider:'another-provider',model:row.id,taskId:'another-route'},
  ]) {
    const f = fixture(() => {throw new Error('must not resubmit')}, pending)
    await assert.rejects(callNewTextChannel(inputFor(row, row.roles.includes('main') ? [] : [{url:imageUrl}]), f.io))
    assert.equal(f.calls.length, 0)
    assert.equal(f.checkpoints.length, 0)
  }
})

test('saving the original submission blocks a replay after a lost response or truncated answer', async () => {
  for (const row of [selected.find((m:any) => m.provider === 'iflytek' && m.protocol === 'openai-chat'), selected.find((m:any) => m.protocol === 'anthropic-messages'), selected.find((m:any) => m.provider === 'longcat')]) {
    for (const mode of ['lost', 'truncated']) {
      const f = fixture(() => {
        assert.equal(f.checkpoints.length, 1, 'checkpoint must exist before the billable POST')
        assert.equal(f.checkpoints[0].provider, row.provider)
        assert.equal(f.checkpoints[0].model, row.id)
        if (mode === 'lost') throw new Error('reply lost after request reached provider')
        return Response.json(row.protocol === 'anthropic-messages' ? anthropic(undefined, 'max_tokens') : openAI(undefined, 'length'))
      })
      await assert.rejects(callNewTextChannel(inputFor(row), f.io))
      await assert.rejects(callNewTextChannel(inputFor(row), f.io))
      assert.equal(f.calls.length, 1, 'retrying the workflow cannot issue another inference POST')
      assert.equal(f.calls[0].attempts, 1)
      assert.equal(JSON.stringify(f.checkpoints).includes('fixture-only-key'), false)
    }
    const f = fixture(() => {throw new Error('must never reach provider if persistence fails')})
    f.io.checkpoint = async () => {throw new Error('checkpoint storage unavailable')}
    await assert.rejects(callNewTextChannel(inputFor(row), f.io), /checkpoint storage/)
    assert.equal(f.calls.length, 0)
  }
})

function sseResponse(events:string[]) {
  const bytes = new TextEncoder().encode(events.join('\r\n\r\n') + '\r\n\r\n')
  // Split through UTF-8 characters and delimiters, as real network chunks can.
  return new Response(new ReadableStream<Uint8Array>({start(controller) {
    for (let at=0; at<bytes.length; at+=7) controller.enqueue(bytes.slice(at,at+7))
    controller.close()
  }}), {headers:{'Content-Type':'text/event-stream; charset=utf-8'}})
}
const dataEvent = (payload:any) => 'data: ' + JSON.stringify(payload)

test('official OpenAI SSE needs stop plus DONE, ignores reasoning and never replays truncation', async () => {
  for (const row of selected.filter((m:any) => m.protocol === 'openai-chat')) {
    const key = row.provider + '/' + row.id
    const original = AUDITED_CHANNEL_CONTRACTS[key]
    assert.ok(original)
    // Production defaults remain non-streaming. Exercise the same official SSE
    // protocol using a temporary in-memory contract, restored even on failure.
    const streamed = structuredClone(original)
    streamed.request = {...streamed.request, stream:true}
    if (streamed.schema?.properties?.stream?.const !== undefined) streamed.schema.properties.stream.const = true
    AUDITED_CHANNEL_CONTRACTS[key] = streamed
    try {
      const start = dataEvent({id:'sse-fixture', model:row.id, choices:[{index:0,delta:{reasoning_content:'never publish reasoning'}}]})
      const text = dataEvent({choices:[{index:0,delta:{content:'科学规划'}}]})
      const stop = dataEvent({choices:[{index:0,delta:{},finish_reason:'stop'}]})
      const usage = dataEvent({choices:[],usage:{prompt_tokens:23,completion_tokens:8}})
      const done = 'data: [DONE]'
      const input = inputFor(row, row.roles.includes('main') ? [] : [{url:imageUrl}])
      const success = fixture(() => sseResponse([start,text,stop,usage,done]))
      assert.equal(await callNewTextChannel(input,success.io),'科学规划')
      assert.deepEqual(success.records[0].usage,{prompt_tokens:23,completion_tokens:8})
      assert.equal(success.calls.length,1)
      for (const events of [[start,text,stop], [start,text,done], [start,stop,done], [start,text,dataEvent({choices:[{index:0,delta:{},finish_reason:'length'}]}),done], [start,text,dataEvent({error:{message:'stream failure'}}),done], [start,text,'data: {broken',stop,done]]) {
        const failure = fixture(() => sseResponse(events))
        await assert.rejects(callNewTextChannel(input,failure.io))
        assert.equal(failure.calls.length,1)
        assert.equal(failure.calls[0].attempts,1)
      }
    } finally {AUDITED_CHANNEL_CONTRACTS[key] = original}
  }
})
