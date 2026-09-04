import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

import { createApp } from '../src/app.js';

function fakeAuth() {
  const calls = [];
  return {
    calls,
    async webHandler() { calls.push('webHandler'); return Response.json({ code: 0 }); },
    async optionalSession() { calls.push('optionalSession'); return null; },
    cachedStatus() { return { ok: true }; },
    async ready() { return { ok: true }; },
  };
}

function fakeBackend() {
  const calls = [];
  return {
    calls,
    mode: 'node',
    async call(body) { calls.push(body); return { status: 200, data: { code: 0 } }; },
    cachedStatus() { return { ok: true, mode: 'node' }; },
    async ready() { return { ok: true }; },
  };
}

function config() {
  return {
    production: true,
    frontendOrigins: ['https://paperbanana.asia'],
    trustProxy: 1,
    adminToken: 'internal-admin-token',
    adminUserIds: new Set(['admin-id']),
    guestCookie: {
      name: '__Host-paperbanana_guest',
      secret: 'current-guest-cookie-secret-32-bytes-long',
      previousSecret: '',
      ttlSeconds: 30 * 24 * 60 * 60,
      secure: true,
    },
    backend: { mode: 'node' },
    maintenance: { retryAfterSeconds: 120 },
    oss: {
      bucket: 'paperbanana-hk',
      publicEndpoint: 'https://oss-cn-hongkong.aliyuncs.com',
      allowLegacyExternalRefineUrl: false,
    },
  };
}

async function withApp(run, { logger } = {}) {
  const auth = fakeAuth();
  const backend = fakeBackend();
  const app = createApp({
    config: config(),
    auth,
    backend,
    isMaintenance: () => false,
    nowSeconds: () => 1_800_000_000,
    randomBytes: () => Buffer.alloc(32, 5),
    logger: logger || { info() {}, warn() {}, error() {} },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await run({ baseUrl: `http://127.0.0.1:${server.address().port}`, auth, backend });
  } finally {
    server.close();
    await once(server, 'close');
  }
}

async function mcp(baseUrl, method, params = {}, headers = {}) {
  return fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': '2025-06-18',
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
}

async function resultOf(response) {
  const text = await response.text();
  if (response.headers.get('content-type')?.includes('text/event-stream')) {
    const data = text.split('\n').find((line) => line.startsWith('data: '));
    return JSON.parse(data.slice(6));
  }
  return JSON.parse(text);
}

test('initialize advertises only tools and resources without creating state', async () => {
  await withApp(async ({ baseUrl, auth, backend }) => {
    const response = await mcp(baseUrl, 'initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'tuyan-test', version: '1.0.0' },
    });
    const body = await resultOf(response);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('mcp-session-id'), null);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.equal(response.headers.get('access-control-allow-credentials'), null);
    assert.deepEqual(Object.keys(body.result.capabilities).sort(), ['resources', 'tools']);
    assert.equal(body.result.protocolVersion, '2025-06-18');
    assert.deepEqual(auth.calls, []);
    assert.deepEqual(backend.calls, []);
  });
});

test('tools/list exposes one read-only closed-schema tool', async () => {
  await withApp(async ({ baseUrl }) => {
    const response = await mcp(baseUrl, 'tools/list');
    const body = await resultOf(response);
    assert.equal(response.status, 200);
    assert.equal(body.result.tools.length, 1);
    const [tool] = body.result.tools;
    assert.equal(tool.name, 'tuyan.get_workflow_bundle');
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.deepEqual(tool.inputSchema.required, ['operation', 'visualCategory', 'outputFormat', 'locale', 'knowledgeMajor']);
    assert.deepEqual(tool.annotations, {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });
});

test('tool calls return the selected public workflow without forwarding arguments', async () => {
  await withApp(async ({ baseUrl, auth, backend }) => {
    const response = await mcp(baseUrl, 'tools/call', {
      name: 'tuyan.get_workflow_bundle',
      arguments: {
        operation: 'create',
        visualCategory: 'method_framework',
        outputFormat: 'png',
        locale: 'zh-CN',
        knowledgeMajor: 1,
      },
    });
    const body = await resultOf(response);
    assert.equal(response.status, 200);
    assert.equal(body.result.isError, undefined);
    assert.equal(body.result.structuredContent.workflow.visualCategory, 'method_framework');
    assert.equal(body.result.structuredContent.execution.renderer, 'agent-image-tool');
    assert.deepEqual(auth.calls, []);
    assert.deepEqual(backend.calls, []);
  });
});

test('tool calls reject free text, extra fields, invalid versions, and invalid enums', async () => {
  await withApp(async ({ baseUrl }) => {
    const valid = {
      operation: 'create',
      visualCategory: 'method_framework',
      outputFormat: 'png',
      locale: 'zh-CN',
      knowledgeMajor: 1,
    };
    for (const args of [
      { ...valid, prompt: 'do not accept me' },
      { ...valid, paper: 'do not accept me' },
      { ...valid, knowledgeMajor: 2 },
      { ...valid, visualCategory: 'poster' },
    ]) {
      const body = await resultOf(await mcp(baseUrl, 'tools/call', {
        name: 'tuyan.get_workflow_bundle',
        arguments: args,
      }));
      assert.ok(body.error || body.result?.isError, JSON.stringify(body));
      assert.equal(JSON.stringify(body).includes('do not accept me'), false);
    }
  });
});

test('resources list in stable order and dynamic workflow resources can be read', async () => {
  await withApp(async ({ baseUrl }) => {
    const listed = await resultOf(await mcp(baseUrl, 'resources/list'));
    assert.deepEqual(listed.result.resources.map(({ uri }) => uri), [
      'tuyan://manifest',
      'tuyan://schemas/figure-spec/v1',
      'tuyan://schemas/critique-record/v1',
      'tuyan://schemas/output-bundle/v1',
      'tuyan://datasets/paperbanana-bench/v1',
    ]);

    const templates = await resultOf(await mcp(baseUrl, 'resources/templates/list'));
    assert.deepEqual(templates.result.resourceTemplates.map(({ uriTemplate }) => uriTemplate), [
      'tuyan://workflows/v1/{locale}/{operation}/{category}/{format}',
    ]);

    const read = await resultOf(await mcp(baseUrl, 'resources/read', {
      uri: 'tuyan://workflows/v1/en-US/evaluate/data_stat/svg',
    }));
    const value = JSON.parse(read.result.contents[0].text);
    assert.equal(value.workflow.operation, 'evaluate');
    assert.equal(value.execution.renderer, 'code');
  });
});

test('MCP has an independent 64 KiB request ceiling', async () => {
  await withApp(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {}, padding: 'x'.repeat(70 * 1024) }),
    });
    assert.equal(response.status, 413);
  });
});

test('MCP limits each client IP to 60 requests per minute', async () => {
  await withApp(async ({ baseUrl }) => {
    for (let index = 0; index < 60; index += 1) {
      const response = await mcp(baseUrl, 'tools/list', {}, { 'x-forwarded-for': '203.0.113.9' });
      assert.equal(response.status, 200, `request ${index + 1}`);
    }
    const limited = await mcp(baseUrl, 'tools/list', {}, { 'x-forwarded-for': '203.0.113.9' });
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('retry-after'), '60');
  });
});

test('MCP operational logs exclude arguments and user-controlled values', async () => {
  const logs = [];
  const logger = { info(message, detail) { logs.push({ message, detail }); }, warn() {}, error() {} };
  await withApp(async ({ baseUrl }) => {
    await mcp(baseUrl, 'tools/call', {
      name: 'tuyan.get_workflow_bundle',
      arguments: {
        operation: 'create',
        visualCategory: 'method_framework',
        outputFormat: 'png',
        locale: 'zh-CN',
        knowledgeMajor: 1,
        prompt: 'PRIVATE_SENTINEL',
      },
    });
  }, { logger });
  const serialized = JSON.stringify(logs);
  assert.equal(serialized.includes('PRIVATE_SENTINEL'), false);
  assert.ok(logs.some(({ message, detail }) => message === 'mcp request completed'
    && Object.keys(detail).sort().join(',') === 'durationMs,method,status,version'));
});

test('MCP logs normalize unknown method names instead of recording arbitrary text', async () => {
  const logs = [];
  const logger = { info(message, detail) { logs.push({ message, detail }); }, warn() {}, error() {} };
  await withApp(async ({ baseUrl }) => {
    await mcp(baseUrl, 'PRIVATE_METHOD_SENTINEL');
  }, { logger });
  const serialized = JSON.stringify(logs);
  assert.equal(serialized.includes('PRIVATE_METHOD_SENTINEL'), false);
  assert.ok(logs.some(({ message, detail }) => message === 'mcp request completed' && detail.method === 'unknown'));
});

test('stateless MCP serves concurrent read requests without sessions', async () => {
  await withApp(async ({ baseUrl }) => {
    const responses = await Promise.all(Array.from({ length: 8 }, () => mcp(baseUrl, 'tools/list')));
    const bodies = await Promise.all(responses.map(resultOf));
    assert.ok(responses.every((response) => response.status === 200));
    assert.ok(responses.every((response) => response.headers.get('mcp-session-id') === null));
    assert.ok(bodies.every((body) => body.result.tools[0].name === 'tuyan.get_workflow_bundle'));
  });
});
