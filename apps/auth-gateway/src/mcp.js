import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { fromJsonSchema, McpServer, ResourceTemplate } from '@modelcontextprotocol/server';
import {
  getWorkflowBundle,
  KNOWLEDGE_VERSION,
  listResources,
  readResource,
  validateWorkflowInput,
  WORKFLOW_INPUT_SCHEMA,
} from '@paperbanana/tuyan-knowledge';
import express from 'express';

const MCP_REQUEST_LIMIT = '64kb';
const MCP_RATE_LIMIT = 60;
const MCP_RATE_WINDOW_MS = 60_000;
const MCP_PROTOCOL_VERSION = '2025-06-18';
const WORKFLOW_URI_TEMPLATE = 'tuyan://workflows/v1/{locale}/{operation}/{category}/{format}';
const LOGGABLE_METHODS = new Set([
  'initialize',
  'notifications/initialized',
  'ping',
  'resources/list',
  'resources/read',
  'resources/templates/list',
  'tools/call',
  'tools/list',
]);

function jsonText(value) {
  return JSON.stringify(value, null, 2);
}

function resourceContents(uri) {
  return {
    contents: [{ uri, mimeType: 'application/json', text: jsonText(readResource(uri)) }],
  };
}

export function createTuyanMcpServer() {
  const server = new McpServer(
    { name: 'tuyan-scientific-figure-knowledge', version: KNOWLEDGE_VERSION },
    { instructions: 'Anonymous read-only scientific-figure workflow knowledge. Never send papers, images, prompts, or credentials.' },
  );

  server.registerTool(
    'tuyan.get_workflow_bundle',
    {
      title: 'Get a Tuyan scientific-figure workflow bundle',
      description: 'Returns public templates, rules, schemas, and version metadata for one fixed workflow selection.',
      inputSchema: fromJsonSchema(WORKFLOW_INPUT_SCHEMA),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (rawInput) => {
      const bundle = getWorkflowBundle(validateWorkflowInput(rawInput));
      return {
        content: [{ type: 'text', text: jsonText(bundle) }],
        structuredContent: bundle,
      };
    },
  );

  for (const resource of listResources()) {
    server.registerResource(
      resource.name,
      resource.uri,
      { title: resource.name, mimeType: resource.mimeType },
      async (uri) => resourceContents(uri.href),
    );
  }

  server.registerResource(
    'Tuyan workflow bundle v1',
    new ResourceTemplate(WORKFLOW_URI_TEMPLATE, { list: undefined }),
    { title: 'Tuyan workflow bundle v1', mimeType: 'application/json' },
    async (uri) => resourceContents(uri.href),
  );

  return server;
}

function clientIp(request) {
  return String(request.ip || request.socket?.remoteAddress || 'unknown');
}

function createRateLimiter(nowMs) {
  const windows = new Map();
  return (request, response, next) => {
    const now = nowMs();
    const ip = clientIp(request);
    const current = windows.get(ip);
    const window = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + MCP_RATE_WINDOW_MS }
      : current;
    window.count += 1;
    windows.set(ip, window);
    if (window.count <= MCP_RATE_LIMIT) return next();

    const retryAfter = Math.max(1, Math.ceil((window.resetAt - now) / 1000));
    response.set('retry-after', String(retryAfter));
    return response.status(429).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'MCP rate limit exceeded' },
      id: request.body?.id ?? null,
    });
  };
}

function methodName(request) {
  const method = typeof request.body?.method === 'string' ? request.body.method : '';
  return LOGGABLE_METHODS.has(method) ? method : 'unknown';
}

export function createTuyanMcpRouter({ logger = console, nowMs = () => Date.now() } = {}) {
  const router = express.Router();
  const mcpApp = createMcpExpressApp({ host: 'api.paperbanana.asia', jsonLimit: MCP_REQUEST_LIMIT });
  const server = createTuyanMcpServer();

  router.use((request, response, next) => {
    response.set('access-control-allow-origin', '*');
    response.set('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS');
    response.set('access-control-allow-headers', 'Content-Type, Accept, Mcp-Protocol-Version, Last-Event-ID');
    if (request.method === 'OPTIONS') return response.status(204).end();
    return next();
  });
  router.use(createRateLimiter(nowMs));

  mcpApp.post('/', async (request, response) => {
    const startedAt = nowMs();
    const method = methodName(request);
    response.on('finish', () => {
      logger.info?.('mcp request completed', {
        method,
        version: MCP_PROTOCOL_VERSION,
        durationMs: Math.max(0, nowMs() - startedAt),
        status: response.statusCode,
      });
    });
    try {
      const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch {
      if (!response.headersSent) {
        response.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal MCP error' },
          id: request.body?.id ?? null,
        });
      }
    }
  });

  const methodNotAllowed = (_request, response) => response.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32600, message: 'Stateless MCP accepts POST requests only' },
    id: null,
  });
  mcpApp.get('/', methodNotAllowed);
  mcpApp.delete('/', methodNotAllowed);

  mcpApp.use((error, _request, response, _next) => {
    if (error?.type === 'entity.too.large') {
      return response.status(413).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'MCP request body exceeds 64 KiB' },
        id: null,
      });
    }
    if (error instanceof SyntaxError) {
      return response.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32700, message: 'Invalid JSON' },
        id: null,
      });
    }
    return response.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal MCP error' },
      id: null,
    });
  });

  router.use(mcpApp);
  return router;
}
