import { createHash, timingSafeEqual } from 'node:crypto';
import express from 'express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { fromJsonSchema, McpServer } from '@modelcontextprotocol/server';
import { OPS_KINDS, OPS_WINDOW_SCHEMA, OPS_EMPTY_SCHEMA, OpsQueryError } from '../../../packages/api/src/ops-read-contract.mjs';
import { createOpsService } from './ops-service.js';
import { createOpsCoreClient } from './ops-core-client.js';

const descriptions = {
  overview: 'Read aggregate retained-account and Core-job counts. Optional UTC time window, maximum 90 days; defaults to the last 24 hours ending at the current minute. Not DAU, revenue or lifetime totals.',
  failures: 'Read failed-job counts by fixed category, stage and request state. Same createdAt window as overview. No job records or free-text errors.',
  health: 'Read selected Core process/database and existing Hangzhou host observations. Missing and stale sources are explicit; this is not an all-services readiness guarantee.',
};
function errorStatus(error) { return error instanceof OpsQueryError ? 400 : error?.status === 503 ? 503 : 500; }
function errorMessage(error) { return error instanceof OpsQueryError ? error.message : error?.status === 503 ? 'Operations reader busy; retry later' : 'Operations reader unavailable'; }

export function createOpsRouter({ config = { enabled: false }, accounts, coreUrl, logger = console, nowMs = Date.now, coreRead }) {
  const router = express.Router();
  const rateWindows = new Map(); // Only configured credential IDs (maximum eight).
  const read = config.enabled ? createOpsService({ accounts, nowMs, hostSnapshotFile: config.hostSnapshotFile,
    coreRead: coreRead || createOpsCoreClient({ url: coreUrl, token: config.internalToken }) }) : null;

  router.use((request, response, next) => {
    response.set('Cache-Control', 'no-store');
    if (!config.enabled) return response.sendStatus(404);
    const startedAt = nowMs();
    response.locals.operation = 'unknown';
    response.on('finish', () => logger.info?.('ops-agent request completed', {
      actor: response.locals.actor?.id || 'unauthenticated', operation: response.locals.operation,
      status: response.statusCode, durationMs: Math.max(0, nowMs() - startedAt),
    }));
    // Service credential transport only; no browser cookies, URL keys or wildcard CORS.
    if (request.get('origin')) return response.status(403).json({ error: 'Browser origins are not supported' });
    const header = request.get('authorization') || '';
    if (!/^Bearer [A-Za-z0-9_-]{43,128}$/.test(header)) return response.status(401).json({ error: 'Unauthorized' });
    const digest = createHash('sha256').update(header.slice(7)).digest();
    let actor;
    for (const token of config.tokens) {
      if (timingSafeEqual(digest, Buffer.from(token.sha256, 'hex')) && Date.parse(token.expiresAt) > nowMs()) actor = token;
    }
    if (!actor) return response.status(401).json({ error: 'Unauthorized' });
    response.locals.actor = actor;
    const previous = rateWindows.get(actor.id);
    const window = previous && previous.resetAt > nowMs() ? previous : { count: 0, resetAt: nowMs() + 60_000 };
    window.count++;
    rateWindows.set(actor.id, window);
    if (window.count > 60) {
      response.set('Retry-After', String(Math.max(1, Math.ceil((window.resetAt - nowMs()) / 1000))));
      return response.status(429).json({ error: 'Operations rate limit exceeded' });
    }
    return next();
  });
  for (const kind of OPS_KINDS) {
    router.get(`/${kind}`, async (request, response) => {
      response.locals.operation = kind;
      if (!response.locals.actor.scopes.includes(`${kind}:read`)) return response.status(403).json({ error: 'Scope denied' });
      try { return response.json(await read(kind, request.query)); }
      catch (error) { return response.status(errorStatus(error)).json({ error: errorMessage(error) }); }
    });
  }
  router.post('/mcp', express.json({ limit: '16kb' }), async (request, response) => {
    if (Object.keys(request.query).length) return response.status(400).json({ error: 'MCP query parameters are not supported' });
    const method = request.body?.method;
    response.locals.operation = ['initialize', 'notifications/initialized', 'ping', 'tools/list', 'tools/call'].includes(method) ? method : 'unknown';
    const server = new McpServer({ name: 'tuyan-private-operations', version: '1.0.0' }, {
      instructions: 'Private aggregate read-only operations. Report source availability, staleness, sampling times and metric definitions. Never infer DAU, lifetime totals, charges or revenue from these counts.',
    });
    for (const kind of OPS_KINDS) {
      if (!response.locals.actor.scopes.includes(`${kind}:read`)) continue;
      server.registerTool(`tuyan_ops_${kind}`, {
        title: `Tuyan operations ${kind}`, description: descriptions[kind],
        inputSchema: fromJsonSchema(kind === 'health' ? OPS_EMPTY_SCHEMA : OPS_WINDOW_SCHEMA),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      }, async input => {
        response.locals.operation = kind;
        try {
          const result = await read(kind, input);
          return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
        } catch (error) { return { isError: true, content: [{ type: 'text', text: errorMessage(error) }] }; }
      });
    }
    // A separate server/transport per stateless request prevents connection/identity reuse.
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    let closed = false;
    const close = () => { if (!closed) { closed = true; void server.close().catch(() => {}); } };
    response.on('close', close);
    try { await server.connect(transport); await transport.handleRequest(request, response, request.body); }
    catch {
      close();
      if (!response.headersSent) response.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Operations MCP unavailable' }, id: null });
    }
  });
  router.all(['/overview', '/failures', '/health', '/mcp'], (_request, response) => response.sendStatus(405));
  router.use((_request, response) => response.sendStatus(404));
  router.use((error, _request, response, _next) => {
    response.status(error?.type === 'entity.too.large' ? 413 : 400).json({ error: 'Invalid operations request body' });
  });
  return router;
}
