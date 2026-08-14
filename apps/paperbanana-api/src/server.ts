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
  serviceName: string
  version: string
}

type AppDependencies = {
  handler: LegacyHandler
  readinessProbe: ReadinessProbe
  healthSnapshot: () => Readiness
  config: AppConfig
  logger: ServiceLogger
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Admin-Token,X-Paperbanana-Gateway-Token',
  'Access-Control-Max-Age': '86400',
}

const adminActions = new Set([
  'adminJobs',
  'adminFeedback',
  'importReferences',
  'evaluateJob',
  'pingPlotWorker',
])

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
  if (config.adminToken && adminActions.has(String(body.action || ''))) {
    body.adminToken = config.adminToken
  }
  return body
}

function applyCors(response: Response): void {
  for (const [name, value] of Object.entries(corsHeaders)) response.setHeader(name, value)
}

export function createApp({ handler, readinessProbe, healthSnapshot, config, logger }: AppDependencies): Express {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb', strict: false }))
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
    if (!tokensMatch(token, config.gatewayToken)) {
      return response.status(401).json({ code: 401, error: 'Unauthorized internal transport' })
    }

    const incoming = request.method === 'GET' ? request.query : request.body
    const ctx: LegacyContext = {
      request: { method: request.method },
      body: transportBody(incoming, config),
      headers: request.headers,
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
