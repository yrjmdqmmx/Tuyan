import { closeSync, openSync, readFileSync, writeFileSync } from 'node:fs'

import { createScientificV2SignedStateOperationReport } from './scientific-v2-state-report.js'

const inputPath = process.env.PAPERBANANA_SCIENTIFIC_V2_PERSISTED_REPORT_INPUT
const outputPath = process.env.PAPERBANANA_SCIENTIFIC_V2_PERSISTED_REPORT_OUTPUT

if (!inputPath || !outputPath) throw new Error('SCIENTIFIC_V2_PERSISTED_REPORT_PATH_REQUIRED')

const input = JSON.parse(readFileSync(inputPath, 'utf8'))
const signed = createScientificV2SignedStateOperationReport(input)
const descriptor = openSync(outputPath, 'wx', 0o600)
try {
  writeFileSync(descriptor, `${JSON.stringify(signed)}\n`, 'utf8')
} finally {
  closeSync(descriptor)
}
