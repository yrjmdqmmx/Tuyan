import { createHash } from 'node:crypto'

import { canonicalHash } from '@paperbanana/benchmark-core'

export type JudgeCalibrationDefect = typeof JUDGE_CALIBRATION_DEFECTS[number]

export const JUDGE_CALIBRATION_DEFECTS = Object.freeze([
  'missing_node',
  'reversed_arrow',
  'garbled_text',
  'occlusion',
  'low_contrast',
  'aspect_ratio_violation',
] as const)

type FixtureSeed = {
  defect: JudgeCalibrationDefect
  caption: string
  rubric: string
  svg: string
}

const license = Object.freeze({
  spdx: 'CC-BY-4.0' as const,
  author: 'PaperBanana contributors' as const,
  source: 'original' as const,
})

const svg = (body: string, width = 800, height = 500) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>text{font-family:'Noto Sans CJK SC',sans-serif!important}</style><rect width="100%" height="100%" fill="#fffdf8"/>${body}</svg>`
const box = (x: number, label: string, fill = '#e8edff', text = '#17191e') => `<rect x="${x}" y="205" width="170" height="90" rx="16" fill="${fill}" stroke="#4c6fff" stroke-width="4"/><text x="${x + 85}" y="260" text-anchor="middle" font-size="26" font-family="sans-serif" fill="${text}">${label}</text>`
const arrow = (x1: number, x2: number, color = '#17191e') => {
  const wing = x2 >= x1 ? x2 - 18 : x2 + 18
  return `<path d="M${x1} 250 H${x2}" stroke="${color}" stroke-width="7"/><path d="M${wing} 236 L${x2} 250 L${wing} 264" fill="none" stroke="${color}" stroke-width="7"/>`
}

const seeds: FixtureSeed[] = [
  {
    defect: 'missing_node',
    caption: 'Gold defect: the required middle node “过滤” is absent from the three-step flow.',
    rubric: 'Expected red line missing_node. Required topology is 集水→过滤→储存; the visible image jumps from 集水 to 储存.',
    svg: svg(`${box(90, '集水')}${box(540, '储存')}${arrow(260, 540)}<text x="400" y="90" text-anchor="middle" font-size="30" font-family="sans-serif">雨水流程</text>`),
  },
  {
    defect: 'reversed_arrow',
    caption: 'Gold defect: the arrow points from 输出 back to 处理 instead of 处理 to 输出.',
    rubric: 'Expected red line reversed_arrow. Required topology is 输入→处理→输出; the second visible arrow is reversed.',
    svg: svg(`${box(35, '输入')}${box(315, '处理')}${box(595, '输出')}${arrow(205, 315)}${arrow(595, 485)}`),
  },
  {
    defect: 'garbled_text',
    caption: 'Gold defect: the English term Validation Set is visibly misspelled as Va1idati0n S3t.',
    rubric: 'Expected red line garbled_text. Required text is 验证集 Validation Set exactly.',
    svg: svg(`<rect x="120" y="120" width="560" height="260" rx="24" fill="#eef2ff" stroke="#4c6fff" stroke-width="4"/><text x="400" y="220" text-anchor="middle" font-size="44" font-family="sans-serif">验证集</text><text x="400" y="300" text-anchor="middle" font-size="36" font-family="sans-serif">Va1idati0n S3t</text>`),
  },
  {
    defect: 'occlusion',
    caption: 'Gold defect: a dark overlay visibly covers the center node and its label.',
    rubric: 'Expected red line occlusion. All three nodes and labels must remain unobstructed.',
    svg: svg(`${box(35, '输入')}${box(315, '处理')}${box(595, '输出')}${arrow(205, 315)}${arrow(485, 595)}<rect x="335" y="185" width="150" height="130" rx="12" fill="#17191e" fill-opacity="0.94"/>`),
  },
  {
    defect: 'low_contrast',
    caption: 'Gold defect: the required label is nearly indistinguishable from its background.',
    rubric: 'Expected red line low_contrast. The label must have readable foreground/background contrast.',
    svg: svg(`${box(315, '关键指标', '#f4f3ef', '#eeeDE9')}<text x="400" y="110" text-anchor="middle" font-size="30" font-family="sans-serif">低对比度示例</text>`),
  },
  {
    defect: 'aspect_ratio_violation',
    caption: 'Gold defect: a required square 1:1 composition is displayed on a 16:9 canvas.',
    rubric: 'Expected red line aspect_ratio_violation. The required canvas is 1:1, but the visible image is 16:9.',
    svg: svg(`<rect x="210" y="95" width="380" height="310" rx="24" fill="#fff0bb" stroke="#f2aa18" stroke-width="5"/><text x="400" y="235" text-anchor="middle" font-size="38" font-family="sans-serif">要求 1:1</text><text x="400" y="295" text-anchor="middle" font-size="28" font-family="sans-serif">实际 16:9</text>`, 800, 450),
  },
]

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value as Record<string, unknown>).forEach(deepFreeze)
  }
  return value
}

export const JUDGE_CALIBRATION_FIXTURES = deepFreeze(seeds.map((seed, index) => {
  const base = {
    id: `judge-calibration-v1-${String(index + 1).padStart(2, '0')}-${seed.defect}`,
    caption: seed.caption,
    rubric: seed.rubric,
    expectedRedLines: [seed.defect],
    svg: seed.svg,
    license,
  }
  return { ...base, manifestHash: canonicalHash(base) }
}))

type CalibrationJudgment = {
  fixtureId: string
  provider: 'openrouter' | 'bailian'
  redLines: Array<string | { code?: string }>
}

function normalizedRedLines(redLines: CalibrationJudgment['redLines']) {
  return [...new Set(redLines.map((item) => typeof item === 'string' ? item : String(item?.code || '')).filter(Boolean))].sort()
}

export function buildJudgeCalibrationReport(input: {
  fixtures: typeof JUDGE_CALIBRATION_FIXTURES | ReadonlyArray<{ id: string; manifestHash: string; expectedRedLines: readonly string[] }>
  judgments: CalibrationJudgment[]
}) {
  const providers = ['openrouter', 'bailian'] as const
  let correctRedLines = 0
  let agreements = 0
  for (const fixture of input.fixtures) {
    const expected = [...fixture.expectedRedLines].sort()
    const pair = providers.map((provider) => {
      const matches = input.judgments.filter((judgment) => judgment.fixtureId === fixture.id && judgment.provider === provider)
      if (matches.length !== 1) throw new Error('INVALID_JUDGE_CALIBRATION_JUDGMENTS')
      return normalizedRedLines(matches[0].redLines)
    })
    correctRedLines += pair.filter((redLines) => JSON.stringify(redLines) === JSON.stringify(expected)).length
    if (JSON.stringify(pair[0]) === JSON.stringify(pair[1])) agreements += 1
  }
  const totalRedLines = input.fixtures.length * providers.length
  const accuracy = totalRedLines ? correctRedLines / totalRedLines : 0
  const agreement = input.fixtures.length ? agreements / input.fixtures.length : 0
  return {
    fixtureHash: canonicalHash(input.fixtures.map((fixture) => ({ id: fixture.id, manifestHash: fixture.manifestHash, expectedRedLines: fixture.expectedRedLines }))),
    correctRedLines,
    totalRedLines,
    accuracy,
    agreement,
    passed: accuracy >= 0.85 && agreement >= 0.8,
  }
}

export async function executeJudgeCalibration(input: {
  render(fixture: typeof JUDGE_CALIBRATION_FIXTURES[number]): Promise<Uint8Array>
  judge(
    provider: 'openrouter' | 'bailian',
    fixture: typeof JUDGE_CALIBRATION_FIXTURES[number],
    image: Uint8Array,
  ): Promise<{ redLines: Array<string | { code?: string }> }>
}) {
  const rendered = []
  for (const fixture of JUDGE_CALIBRATION_FIXTURES) {
    const image = await input.render(fixture)
    if (!image.byteLength) throw new Error('INVALID_JUDGE_CALIBRATION_IMAGE')
    rendered.push({ fixture, image, imageHash: createHash('sha256').update(image).digest('hex') })
  }
  const judgments: CalibrationJudgment[] = []
  for (const provider of ['openrouter', 'bailian'] as const) {
    for (const item of rendered) {
      const judgment = await input.judge(provider, item.fixture, item.image)
      judgments.push({ fixtureId: item.fixture.id, provider, redLines: judgment.redLines })
    }
  }
  const measured = buildJudgeCalibrationReport({ fixtures: JUDGE_CALIBRATION_FIXTURES, judgments })
  const reportBase = {
    ...measured,
    fixtureHash: canonicalHash(rendered.map((item) => ({
      id: item.fixture.id,
      manifestHash: item.fixture.manifestHash,
      imageHash: item.imageHash,
      expectedRedLines: item.fixture.expectedRedLines,
    }))),
  }
  return { ...reportBase, reportHash: canonicalHash(reportBase) }
}
