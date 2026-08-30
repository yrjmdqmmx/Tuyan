import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { buildScientificEditSvg } from './scientific-edit-assets.js'

const destination = fileURLToPath(new URL('../assets/scientific-edit-source-v2.svg', import.meta.url))
writeFileSync(destination, buildScientificEditSvg())
