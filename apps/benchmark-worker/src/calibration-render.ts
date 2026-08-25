import sharp from 'sharp'

import type { JUDGE_CALIBRATION_FIXTURES } from './calibration-fixtures.js'

export async function renderCalibrationFixture(fixture: typeof JUDGE_CALIBRATION_FIXTURES[number]) {
  return sharp(Buffer.from(fixture.svg)).png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer()
}
