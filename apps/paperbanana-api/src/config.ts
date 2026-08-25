export type ServiceConfig = {
  host: string
  port: number
  gatewayToken: string
  adminToken?: string
  adminTransportToken?: string
  benchmarkDiscoveryToken?: string
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
  providerEgress:
    | { mode: 'disabled' }
    | { mode: 'sg-required'; proxyUrl: string }
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
  benchmark?: {
    mongodb: { uri: string; database: string }
    oss: ServiceConfig['oss']
    codeSha: string
    reviewSigningSecret: string
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

function providerEgressConfig(env: Environment): ServiceConfig['providerEgress'] {
  const mode = env.PAPERBANANA_PROVIDER_EGRESS_MODE
  if (mode !== 'disabled' && mode !== 'sg-required') {
    throw new Error('PAPERBANANA_PROVIDER_EGRESS_MODE must be exactly disabled or sg-required')
  }
  if (mode === 'disabled') return { mode }

  const proxyUrl = env.PAPERBANANA_SG_PROXY_URL || ''
  let parsed: URL
  try {
    parsed = new URL(proxyUrl)
  } catch {
    throw new Error('PAPERBANANA_SG_PROXY_URL must be the approved Singapore proxy origin')
  }
  if (
    !/^http:\/\/10\.77\.0\.2:3128\/?$/.test(proxyUrl)
    || parsed.origin !== 'http://10.77.0.2:3128'
    || parsed.pathname !== '/'
    || parsed.username
    || parsed.password
    || parsed.search
    || parsed.hash
  ) {
    throw new Error('PAPERBANANA_SG_PROXY_URL must be the approved Singapore proxy origin')
  }
  return { mode, proxyUrl: parsed.origin }
}

export function loadConfig(env: Environment = process.env, buildCodeSha?: string): ServiceConfig {
  const gatewayToken = required(env, 'PAPERBANANA_GATEWAY_TOKEN')
  const adminTransportToken = env.PAPERBANANA_ADMIN_TRANSPORT_TOKEN?.trim() || undefined
  const benchmarkDiscoveryToken = env.PAPERBANANA_BENCH_DISCOVERY_TOKEN?.trim() || undefined
  if (adminTransportToken && adminTransportToken === gatewayToken) throw new Error('PAPERBANANA_ADMIN_TRANSPORT_TOKEN must differ from PAPERBANANA_GATEWAY_TOKEN')
  if (benchmarkDiscoveryToken && [gatewayToken, adminTransportToken].includes(benchmarkDiscoveryToken)) throw new Error('PAPERBANANA_BENCH_DISCOVERY_TOKEN must be distinct')
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
  const benchmarkFlag = env.PAPERBANANA_BENCH_API_ENABLED?.trim() || 'false'
  if (benchmarkFlag !== 'true' && benchmarkFlag !== 'false') throw new Error('PAPERBANANA_BENCH_API_ENABLED must be exactly true or false')
  let benchmark: ServiceConfig['benchmark']
  if (benchmarkFlag === 'true') {
    const benchmarkRegion = required(env, 'PAPERBANANA_BENCH_OSS_REGION')
    const codeSha = required(env, 'PAPERBANANA_CODE_SHA')
    if (!/^[a-f0-9]{40}$/i.test(codeSha)) throw new Error('PAPERBANANA_CODE_SHA must be an immutable 40-character commit SHA')
    if (!buildCodeSha || !/^[a-f0-9]{40}$/i.test(buildCodeSha)) throw new Error('PAPERBANANA_BUILD_PROVENANCE_REQUIRED')
    if (codeSha.toLowerCase() !== buildCodeSha.toLowerCase()) throw new Error('PAPERBANANA_BUILD_PROVENANCE_MISMATCH')
    benchmark = {
      mongodb: {
        uri: required(env, 'PAPERBANANA_BENCH_MONGODB_URI'),
        database: env.PAPERBANANA_BENCH_MONGO_DB?.trim() || 'paperbanana_benchmark',
      },
      oss: {
        region: benchmarkRegion,
        accessKeyId: required(env, 'PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID'),
        accessKeySecret: required(env, 'PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET'),
        bucket: required(env, 'PAPERBANANA_BENCH_OSS_BUCKET'),
        internalEndpoint: ossEndpoint(env, 'PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT', `${benchmarkRegion}-internal.aliyuncs.com`),
        publicEndpoint: ossEndpoint(env, 'PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT', `${benchmarkRegion}.aliyuncs.com`),
        secure: true,
        pathStyle: false,
      },
      codeSha: buildCodeSha.toLowerCase(),
      reviewSigningSecret: required(env, 'PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET'),
    }
  }

  return {
    host: env.HOST?.trim() || '0.0.0.0',
    port,
    gatewayToken,
    adminToken: env.ADMIN_TOKEN?.trim() || undefined,
    adminTransportToken,
    benchmarkDiscoveryToken,
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
    providerEgress: providerEgressConfig(env),
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
    benchmark,
  }
}
