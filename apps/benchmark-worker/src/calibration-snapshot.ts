import sharp from 'sharp'

import { JUDGE_CALIBRATION_FIXTURES } from './calibration-fixtures.js'
import { renderCalibrationFixture } from './calibration-render.js'

for (const fixture of JUDGE_CALIBRATION_FIXTURES) {
  const png = await renderCalibrationFixture(fixture)
  const metadata = await sharp(png).metadata()
  if (metadata.format !== 'png' || metadata.width !== Number(fixture.svg.match(/width="(\d+)"/)?.[1]) || metadata.height !== Number(fixture.svg.match(/height="(\d+)"/)?.[1]) || png.byteLength < 4_000) {
    throw new Error(`BENCHMARK_CALIBRATION_SNAPSHOT_INVALID:${fixture.id}`)
  }
}
