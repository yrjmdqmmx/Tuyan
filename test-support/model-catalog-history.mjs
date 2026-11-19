import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'
import october from '../docs/model-catalog/2026-10-19-evidence.json' with {type:'json'}

// The original test's sorted projection, captured from ec24b73. Its September
// SHA-256 is still checked before using any of the 760 identities as an oracle.
export const historicalModels = JSON.parse(gunzipSync(fs.readFileSync(
  new URL('./fixtures/model-identities-ec24b73.json.gz', import.meta.url))))

// Retained identities whose admission was explicitly withdrawn after September.
export const laterDisabled = new Set([
  ...Object.entries(october.arkLifecycle).filter(([, row]) => row.selectable === false).map(([id]) => 'ark/'+id),
  'siliconflow/baidu/ERNIE-Image-Turbo',
  'mistral/labs-leanstral-1-5',
  'fal/imagineart/imagineart-2.0-preview/text-to-image',
  'stability/sd3.5-flash',
  'replicate/alibaba/wan-3',
])
