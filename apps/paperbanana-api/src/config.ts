export type ServiceConfig = {
  host: string
  port: number
  gatewayToken: string
  adminToken?: string
  singleReplica: true
  strictObjectStorage: true
  admission: {
    maxActive: number
    maxPending: number
    maxPerOwner: number
    maxPerIp: number
  }
  readinessProbeTimeoutMs: number
  referenceImageMaxBytes: number
  providerImageMaxBytes: number
  mongodb: {
    uri: string
    database: string
  }
  oss: {
    region: string
    accessKeyId: string
    accessKeySecret: string
    bucket: string
    internalEndpoint: string
    publicEndpoint: string
    secure: true
    pathStyle: false
  }
}

type Environment = Record<string, string | undefined>

function required(env: Environment, name: string): string {
  const value = env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

function boundedInteger(env: Environment, name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = env[name]?.trim()
  const value = raw ? Number(raw) : fallback
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`)
  }
  return value
}

function ossEndpoint(env: Environment, name: string, expectedHostname: string): string {
  const value = required(env, name)
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} must be a valid HTTPS URL`)
  }
  if (
    url.protocol !== 'https:'
    || url.hostname !== expectedHostname
    || url.port
    || url.username
    || url.password
    || url.pathname !== '/'
    || url.search
    || url.hash
  ) {
    throw new Error(`${name} must be https://${expectedHostname}`)
  }
  return url.origin
}

export function loadConfig(env: Environment = process.env): ServiceConfig {
  const gatewayToken = required(env, 'PAPERBANANA_GATEWAY_TOKEN')
  if (env.PAPERBANANA_SINGLE_REPLICA?.trim() !== 'true') {
    throw new Error('PAPERBANANA_SINGLE_REPLICA=true is required until job leases support multiple replicas')
  }
  if (env.PAPERBANANA_STRICT_OBJECT_STORAGE !== 'true') {
    throw new Error('PAPERBANANA_STRICT_OBJECT_STORAGE=true is required for the Node runtime')
  }

  const port = Number(env.PORT || 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535')

  const region = required(env, 'OSS_REGION')
  const internalEndpoint = ossEndpoint(env, 'OSS_INTERNAL_ENDPOINT', `${region}-internal.aliyuncs.com`)
  const publicEndpoint = ossEndpoint(env, 'OSS_PUBLIC_ENDPOINT', `${region}.aliyuncs.com`)
  if (internalEndpoint === publicEndpoint) throw new Error('OSS_INTERNAL_ENDPOINT and OSS_PUBLIC_ENDPOINT must be distinct')

  return {
    host: env.HOST?.trim() || '0.0.0.0',
    port,
    gatewayToken,
    adminToken: env.ADMIN_TOKEN?.trim() || undefined,
    singleReplica: true,
    strictObjectStorage: true,
    admission: {
      maxActive: boundedInteger(env, 'PAPERBANANA_MAX_ACTIVE_JOBS', 1, 1, 8),
      maxPending: boundedInteger(env, 'PAPERBANANA_MAX_PENDING_JOBS', 2, 0, 32),
      maxPerOwner: boundedInteger(env, 'PAPERBANANA_MAX_JOBS_PER_OWNER', 1, 1, 8),
      maxPerIp: boundedInteger(env, 'PAPERBANANA_MAX_JOBS_PER_IP', 1, 1, 8),
    },
    readinessProbeTimeoutMs: boundedInteger(env, 'PAPERBANANA_READINESS_PROBE_TIMEOUT_MS', 2000, 100, 10_000),
    referenceImageMaxBytes: boundedInteger(env, 'PAPERBANANA_MAX_REFERENCE_BYTES', 5 * 1024 * 1024, 5 * 1024 * 1024, 5 * 1024 * 1024),
    providerImageMaxBytes: boundedInteger(env, 'PAPERBANANA_MAX_PROVIDER_IMAGE_BYTES', 20 * 1024 * 1024, 5 * 1024 * 1024, 50 * 1024 * 1024),
    mongodb: {
      uri: required(env, 'MONGODB_URI'),
      database: env.MONGODB_BUSINESS_DB?.trim() || 'paperbanana_business',
    },
    oss: {
      region,
      accessKeyId: required(env, 'OSS_ACCESS_KEY_ID'),
      accessKeySecret: required(env, 'OSS_ACCESS_KEY_SECRET'),
      bucket: required(env, 'PAPERBANANA_BUCKET'),
      internalEndpoint,
      publicEndpoint,
      secure: true,
      pathStyle: false,
    },
  }
}
