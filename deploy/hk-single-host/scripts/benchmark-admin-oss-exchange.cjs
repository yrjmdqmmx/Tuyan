#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { createHmac } = require('node:crypto')
const OSS = require('ali-oss')

const [operation, objectKey, resultPath = ''] = process.argv.slice(2)
const keyPattern = /^bench\/admin-exchange\/[0-9]+-[0-9]+-[a-f0-9]{24}\.json$/
const required = (name) => {
  const value = String(process.env[name] || '').trim()
  if (!value) throw new Error('missing configuration')
  return value
}

async function main() {
  if (operation === 'proof') {
    if (!/^[a-f0-9]{64}$/.test(objectKey || '')) throw new Error('invalid request')
    const names = [
      'PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID',
      'PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET',
      'PAPERBANANA_BENCH_OSS_BUCKET',
      'PAPERBANANA_BENCH_OSS_REGION',
      'PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT',
      'PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT',
    ]
    const proof = createHmac('sha256', objectKey).update(JSON.stringify(names.map(required))).digest('hex')
    process.stdout.write(proof)
    return
  }
  if (!['download', 'delete'].includes(operation) || !keyPattern.test(objectKey || '')) throw new Error('invalid request')
  const endpoint = required('PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT')
  const parsed = new URL(endpoint)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('invalid endpoint')
  const client = new OSS({
    region: required('PAPERBANANA_BENCH_OSS_REGION'),
    accessKeyId: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID'),
    accessKeySecret: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET'),
    bucket: required('PAPERBANANA_BENCH_OSS_BUCKET'),
    endpoint,
    secure: true,
    authorizationV4: true,
    cname: false,
    sldEnable: false,
  })
  if (operation === 'delete') {
    await client.delete(objectKey)
    return
  }
  if (!path.isAbsolute(resultPath) || fs.existsSync(resultPath) || !fs.statSync(path.dirname(resultPath)).isDirectory()) throw new Error('unsafe output')
  const response = await client.get(objectKey)
  const content = Buffer.isBuffer(response?.content) ? response.content : Buffer.from(response?.content || '')
  if (content.length < 2 || content.length > 1024 * 1024) throw new Error('invalid content')
  const fd = fs.openSync(resultPath, 'wx', 0o600)
  try { fs.writeFileSync(fd, content) } finally { fs.closeSync(fd) }
  fs.chmodSync(resultPath, 0o600)
}

main().catch((error) => {
  const status = Number(error?.status || error?.statusCode || error?.res?.status || 0)
  const code = String(error?.code || error?.name || '')
  let reason = 'FAILED'
  if (status === 403 || /AccessDenied|Forbidden|InvalidAccessKeyId/i.test(code)) reason = 'GET_FORBIDDEN'
  else if (status === 404 || /NoSuchKey|NotFound/i.test(code)) reason = 'GET_NOT_FOUND'
  else if (/ENOTFOUND|ECONNRESET|ETIMEDOUT|RequestError|ConnectionTimeout/i.test(code)) reason = 'GET_UNREACHABLE'
  process.stderr.write(`BENCHMARK_ADMIN_OSS_EXCHANGE_${reason}\n`)
  process.exitCode = 1
})
