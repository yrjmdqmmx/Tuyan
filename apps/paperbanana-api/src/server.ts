import { createHash, timingSafeEqual } from 'node:crypto'
import http from 'node:http'

import express, { type Express, type NextFunction, type Request, type Response } from 'express'

import { redactLogValue } from './redaction.js'

export type LegacyContext = {
  request: { method: string }
  body: Record<string, unknown>
  headers: Request['headers']
  response: {
    setHeader(name: string, value: string): void
    status(code: number): void
  }
}

export type LegacyHandler = (ctx: LegacyContext) => unknown | Promise<unknown>
export type Readiness = { ready: boolean; dependencies?: Record<string, unknown> }
export type ReadinessProbe = () => Readiness | Promise<Readiness>
export type ServiceLogger = {
  info(message: string, fields?: unknown): void
  warn(message: string, fields?: unknown): void
  error(message: string, fields?: unknown): void
}

export type AppConfig = {
  gatewayToken: string
  adminToken?: string
  adminTransportToken?: string
  benchmarkDiscoveryToken?: string
  serviceName: string
  version: string
}

type AppDependencies = {
  handler: LegacyHandler
  readinessProbe: ReadinessProbe
  healthSnapshot: () => Readiness
  config: AppConfig
  logger: ServiceLogger
  benchmarkService?: {
    handle(body: Record<string, unknown>, isAdmin: boolean): Promise<Record<string, unknown>>
  }
  prepareScientificV2RegistryAuthority?: () => Promise<Record<string, unknown>>
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Paperbanana-Gateway-Token',
  'Access-Control-Max-Age': '86400',
}

const adminActions = new Set([
  'adminJobs',
  'adminFeedback',
  'importReferences',
  'evaluateJob',
  'pingPlotWorker',
  'adminBenchmarkCandidates',
  'adminBenchmarkApprove',
  'adminBenchmarkControl',
  'adminBenchmarkReviewExport',
  'adminBenchmarkReviewImport',
  'adminBenchmarkPublish',
  'adminBenchmarkPromptQueue',
  'adminBenchmarkPromptDigest',
  'adminBenchmarkPromptDecision',
])

const scientificV2AdminOperationHeader = 'x-paperbanana-scientific-v2-admin-operation'

function tokensMatch(actual: string, expected: string): boolean {
  const actualDigest = createHash('sha256').update(actual).digest()
  const expectedDigest = createHash('sha256').update(expected).digest()
  return timingSafeEqual(actualDigest, expectedDigest)
}

function normalizedBody(value: unknown): Record<string, unknown> {
  let body = value
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {}
  return { ...(body as Record<string, unknown>) }
}

function transportBody(value: unknown, config: AppConfig): Record<string, unknown> {
  const body = normalizedBody(value)
  delete body.gatewayToken
  delete body.adminToken
  body.gatewayToken = config.gatewayToken
  return body
}

function applyCors(response: Response): void {
  for (const [name, value] of Object.entries(corsHeaders)) response.setHeader(name, value)
}

function safeLegacyHeader(value: string | undefined, maxLength: number): string | undefined {
  const normalized = String(value || '').replace(/[\r\n]/g, '').trim().slice(0, maxLength)
  return normalized || undefined
}

function legacyHeaders(request: Request): Request['headers'] {
  const headers: Request['headers'] = {}
  const clientIp = safeLegacyHeader(request.get('x-paperbanana-client-ip'), 128)
  const userAgent = safeLegacyHeader(request.get('user-agent'), 512)
  if (clientIp) headers['x-paperbanana-client-ip'] = clientIp
  if (userAgent) headers['user-agent'] = userAgent
  return headers
}

export function createApp({
  handler, readinessProbe, healthSnapshot, config, logger, benchmarkService,
  prepareScientificV2RegistryAuthority,
}: AppDependencies): Express {
  const app = express()
  app.disable('x-powered-by')
  const standardJsonParser = express.json({ limit: '1mb', strict: false })
  const scientificV2FreezeJsonParser = express.json({ limit: '8mb', strict: false })
  app.use((request, response, next) => {
    const protectedFreezeTransport = request.method === 'POST'
      && request.path === '/paperbanana-api'
      && request.get(scientificV2AdminOperationHeader) === 'freeze'
      && Boolean(config.adminTransportToken)
      && tokensMatch(request.get('x-paperbanana-gateway-token') || '', config.gatewayToken)
      && tokensMatch(request.get('x-paperbanana-admin-transport-token') || '', config.adminTransportToken || '')
    return (protectedFreezeTransport ? scientificV2FreezeJsonParser : standardJsonParser)(request, response, next)
  })
  app.use((request, response, next) => {
    applyCors(response)
    response.on('finish', () => {
      logger.info('request completed', {
        method: request.method,
        path: request.path,
        status: response.statusCode,
      })
    })
    next()
  })

  app.options('/paperbanana-api', (_request, response) => response.status(204).send())

  function sendHealth(response: Response, readiness: Readiness, readinessOnly: boolean) {
    return response.status(readinessOnly && !readiness.ready ? 503 : 200).json({
      ok: readinessOnly ? readiness.ready : true,
      service: config.serviceName,
      runtime: 'node',
      version: config.version,
      ready: readiness.ready,
      dependencies: readiness.dependencies || {},
    })
  }

  async function readyResponse(response: Response) {
    try {
      const readiness = await readinessProbe()
      return sendHealth(response, readiness, true)
    } catch (error) {
      logger.error('readiness probe failed', redactLogValue(error))
      return sendHealth(response, { ready: false, dependencies: {} }, true)
    }
  }

  app.get('/health', (_request, response) => sendHealth(response, healthSnapshot(), false))
  app.get('/ready', (_request, response) => readyResponse(response))

  async function invokeLegacy(request: Request, response: Response) {
    const token = request.get('x-paperbanana-gateway-token') || ''
    const gatewayTransport = tokensMatch(token, config.gatewayToken)
    const discoveryTransport = Boolean(config.benchmarkDiscoveryToken && tokensMatch(token, config.benchmarkDiscoveryToken))
    if (!gatewayTransport && !discoveryTransport) {
      return response.status(401).json({ code: 401, error: 'Unauthorized internal transport' })
    }

    const incoming = request.method === 'GET' ? request.query : request.body
    const body = transportBody(incoming, config)
    const action = String(body.action || '')
    if (discoveryTransport && !gatewayTransport && action !== 'modelRegistry') {
      return response.status(403).json({ code: 403, error: 'Discovery transport is read-only' })
    }
    const adminTransport = request.get('x-paperbanana-admin-transport-token') || ''
    const isAdminTransport = Boolean(
      config.adminTransportToken
      && adminTransport
      && tokensMatch(adminTransport, config.adminTransportToken),
    )
    const declaredScientificV2AdminOperation = request.get(scientificV2AdminOperationHeader) || ''
    const isScientificV2Freeze = action === 'adminBenchmarkControl'
      && body.evaluationMode === 'codex_scientific_v2'
      && body.command === 'freezeBatch'
    if ((declaredScientificV2AdminOperation || (isAdminTransport && isScientificV2Freeze))
      && !(declaredScientificV2AdminOperation === 'freeze' && gatewayTransport && isAdminTransport && isScientificV2Freeze)) {
      return response.status(400).json({ code: 400, error: 'Scientific V2 admin transport rejected' })
    }
    if (isAdminTransport && config.adminToken && adminActions.has(action)) {
      const adminUserId = safeLegacyHeader(request.get('x-paperbanana-admin-user-id'), 200) || ''
      if (!/^[A-Za-z0-9._:-]{3,200}$/.test(adminUserId)) return response.status(401).json({ code: 401, error: 'Missing immutable admin identity' })
      body.adminToken = config.adminToken
      body.adminUserId = adminUserId
    }
    if (benchmarkService && (action.startsWith('benchmark') || action.startsWith('adminBenchmark'))) {
      try {
        const isAdmin = Boolean(isAdminTransport && config.adminToken && body.adminToken === config.adminToken && adminActions.has(action))
        if (action === 'adminBenchmarkControl' && body.command === 'prepareScientificV2Registry') {
          if (!isAdmin) return response.status(200).send({ code: 401, error: 'Benchmark admin required' })
          if (!prepareScientificV2RegistryAuthority) return response.status(200).send({ code: 400, error: 'Benchmark request rejected' })
          return response.status(200).send({ code: 0, registryAuthority: await prepareScientificV2RegistryAuthority() })
        }
        return response.status(200).send(await benchmarkService.handle(body, isAdmin))
      } catch (error) {
        const message = String((error as Error)?.message || '')
        const code = message.startsWith('BENCHMARK_ADMIN_REQUIRED') || message.startsWith('BENCHMARK_PROMPT_LOGIN_REQUIRED')
          ? 401
          : message.startsWith('BENCHMARK_PROMPT_RATE_LIMIT_') ? 429 : 400
        logger.warn('benchmark request rejected', { action, code })
        return response.status(200).json({ code, error: 'Benchmark request rejected' })
      }
    }
    const ctx: LegacyContext = {
      request: { method: request.method },
      body,
      headers: legacyHeaders(request),
      response: {
        setHeader(name, value) { response.setHeader(name, value) },
        status(code) { response.status(code) },
      },
    }

    try {
      const result = await handler(ctx)
      return response.status(200).send(result)
    } catch (error) {
      logger.error('legacy handler failed', redactLogValue(error))
      return response.status(500).json({ code: 500, error: 'Internal server error' })
    }
  }

  app.get('/paperbanana-api', invokeLegacy)
  app.post('/paperbanana-api', invokeLegacy)

  app.use((error: unknown, _request: Request, response: Response, next: NextFunction) => {
    if ((error as { type?: string })?.type === 'entity.too.large') {
      return response.status(413).json({ code: 413, error: 'Request body too large' })
    }
    if ((error as { type?: string })?.type === 'entity.parse.failed') {
      return response.status(400).json({ code: 400, error: 'Invalid JSON body' })
    }
    logger.error('request failed', redactLogValue(error))
    if (response.headersSent) return next(error)
    return response.status(500).json({ code: 500, error: 'Internal server error' })
  })

  return app
}

export function createServer(dependencies: AppDependencies): http.Server {
  return http.createServer(createApp(dependencies))
}
