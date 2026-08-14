export type ServiceConfig = {
  host: string
  port: number
  gatewayToken: string
  adminToken?: string
  singleReplica: true
  strictObjectStorage: true
  mongodb: {
    uri: string
    database: string
  }
  oss: {
    region: string
    accessKeyId: string
    accessKeySecret: string
    bucket: string
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

  return {
    host: env.HOST?.trim() || '0.0.0.0',
    port,
    gatewayToken,
    adminToken: env.ADMIN_TOKEN?.trim() || undefined,
    singleReplica: true,
    strictObjectStorage: true,
    mongodb: {
      uri: required(env, 'MONGODB_URI'),
      database: env.MONGODB_BUSINESS_DB?.trim() || 'paperbanana_business',
    },
    oss: {
      region: required(env, 'OSS_REGION'),
      accessKeyId: required(env, 'OSS_ACCESS_KEY_ID'),
      accessKeySecret: required(env, 'OSS_ACCESS_KEY_SECRET'),
      bucket: required(env, 'PAPERBANANA_BUCKET'),
      secure: true,
      pathStyle: false,
    },
  }
}
