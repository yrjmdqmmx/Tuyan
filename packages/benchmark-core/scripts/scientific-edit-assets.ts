import sharp from 'sharp'

// Hand-authored 5x7 vector glyphs. These shapes are original PaperBanana
// contributor work and are distributed with the benchmark under CC-BY-4.0.
const glyphs: Record<string, readonly string[]> = {
  ' ': ['000', '000', '000', '000', '000', '000', '000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '/': ['00001', '00010', '00100', '00100', '01000', '10000', '10000'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  a: ['00000', '00000', '01110', '00001', '01111', '10001', '01111'],
  b: ['10000', '10000', '10110', '11001', '10001', '10001', '11110'],
  c: ['00000', '00000', '01111', '10000', '10000', '10000', '01111'],
  d: ['00001', '00001', '01101', '10011', '10001', '10001', '01111'],
  e: ['00000', '00000', '01110', '10001', '11111', '10000', '01111'],
  f: ['00110', '01001', '01000', '11100', '01000', '01000', '01000'],
  g: ['00000', '00000', '01111', '10001', '01111', '00001', '01110'],
  h: ['10000', '10000', '10110', '11001', '10001', '10001', '10001'],
  i: ['00100', '00000', '01100', '00100', '00100', '00100', '01110'],
  j: ['00010', '00000', '00110', '00010', '00010', '10010', '01100'],
  k: ['10000', '10000', '10010', '10100', '11000', '10100', '10010'],
  l: ['01100', '00100', '00100', '00100', '00100', '00100', '01110'],
  m: ['00000', '00000', '11010', '10101', '10101', '10101', '10101'],
  n: ['00000', '00000', '10110', '11001', '10001', '10001', '10001'],
  o: ['00000', '00000', '01110', '10001', '10001', '10001', '01110'],
  p: ['00000', '00000', '11110', '10001', '11110', '10000', '10000'],
  q: ['00000', '00000', '01111', '10001', '01111', '00001', '00001'],
  r: ['00000', '00000', '10111', '11000', '10000', '10000', '10000'],
  s: ['00000', '00000', '01111', '10000', '01110', '00001', '11110'],
  t: ['01000', '01000', '11100', '01000', '01000', '01001', '00110'],
  u: ['00000', '00000', '10001', '10001', '10001', '10011', '01101'],
  v: ['00000', '00000', '10001', '10001', '10001', '01010', '00100'],
  w: ['00000', '00000', '10001', '10101', '10101', '10101', '01010'],
  x: ['00000', '00000', '10001', '01010', '00100', '01010', '10001'],
  y: ['00000', '00000', '10001', '10001', '01111', '00001', '01110'],
  z: ['00000', '00000', '11111', '00010', '00100', '01000', '11111'],
  配: ['10100100101', '11110111111', '10100100101', '11110111111', '00100100100', '11111111111', '10001010001', '11111011111', '10001010001', '11111011111', '10001010101', '10001011011', '10001010001', '10001010001'],
  体: ['00100100000', '01100111111', '11000100100', '10100100100', '00111111111', '00100100100', '01100100100', '10100100100', '00100100100', '00100100100', '00100100100', '00100100100', '00100100100', '00100100100'],
}

function escapeAttribute(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
}

export function buildScientificVectorLabel(label: string, x: number, y: number, height: number, fill: string) {
  const scale = height / 14
  const pixel = Math.max(0.7, scale * 0.82)
  let cursor = x
  const commands: string[] = []
  for (const rawCharacter of label) {
    const pattern = glyphs[rawCharacter]
    if (!pattern) throw new Error(`MISSING_VECTOR_GLYPH:${rawCharacter}`)
    const rowScale = height / pattern.length
    for (let row = 0; row < pattern.length; row += 1) {
      for (let column = 0; column < pattern[row].length; column += 1) {
        if (pattern[row][column] !== '1') continue
        const left = Number((cursor + column * scale).toFixed(3))
        const top = Number((y + row * rowScale).toFixed(3))
        commands.push(`M${left} ${top}h${pixel.toFixed(3)}v${(rowScale * 0.82).toFixed(3)}h-${pixel.toFixed(3)}Z`)
      }
    }
    cursor += (pattern[0].length + 1) * scale
  }
  return `<path data-label="${escapeAttribute(label)}" fill="${fill}" d="${commands.join('')}"/>`
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-labelledby="title desc">
  <title id="title">PaperBanana scientific edit benchmark source</title>
  <desc id="desc">A hand-authored signaling pathway figure with three stable numbered edit regions. Visible labels are original vector paths and use no external fonts.</desc>
  <metadata data-license="CC-BY-4.0" data-author="PaperBanana contributors" data-vector-glyphs="original"/>
  <rect width="1600" height="900" fill="#f7fafc"/>
  <rect x="72" y="58" width="1456" height="784" rx="32" fill="#ffffff" stroke="#d7e1ea" stroke-width="4"/>
  ${buildScientificVectorLabel('STIMULUS-RESPONSE SIGNALING MAP', 120, 102, 40, '#17324d')}
  ${buildScientificVectorLabel('DETERMINISTIC SOURCE FOR LOCALIZED SCIENTIFIC FIGURE EDITS', 120, 160, 22, '#587086')}
  <g id="region-text" data-region="01-text-label">
    <rect x="120" y="230" width="410" height="300" rx="22" fill="#eef6ff" stroke="#2f80ed" stroke-width="5"/>
    <circle cx="164" cy="270" r="25" fill="#2f80ed"/>${buildScientificVectorLabel('1', 156, 257, 25, '#ffffff')}
    ${buildScientificVectorLabel('Ligand A / 配体 A', 205, 257, 25, '#17324d')}
    <rect x="195" y="340" width="260" height="82" rx="41" fill="#b9dbff" stroke="#2f80ed" stroke-width="4"/>
    ${buildScientificVectorLabel('Receptor R', 254, 368, 24, '#17324d')}
    <path d="M325 425 L325 485" stroke="#2f80ed" stroke-width="10"/><path d="M303 467 L325 495 L347 467" fill="#2f80ed"/>
  </g>
  <g id="region-topology" data-region="02-node-arrow">
    <rect x="595" y="230" width="410" height="300" rx="22" fill="#f2fbf7" stroke="#27ae60" stroke-width="5"/>
    <circle cx="639" cy="270" r="25" fill="#27ae60"/>${buildScientificVectorLabel('2', 631, 257, 25, '#ffffff')}
    <circle cx="710" cy="390" r="54" fill="#bdebd0" stroke="#219653" stroke-width="4"/><circle cx="890" cy="335" r="54" fill="#bdebd0" stroke="#219653" stroke-width="4"/><circle cx="890" cy="455" r="54" fill="#bdebd0" stroke="#219653" stroke-width="4"/>
    <path d="M766 382 L826 349" stroke="#219653" stroke-width="10"/><path d="M808 343 L838 342 L824 368" fill="#219653"/>
    <path d="M766 398 L826 437" stroke="#219653" stroke-width="10"/><path d="M824 418 L838 446 L807 441" fill="#219653"/>
    ${buildScientificVectorLabel('K1', 682, 379, 23, '#17324d')}${buildScientificVectorLabel('K2', 862, 324, 23, '#17324d')}${buildScientificVectorLabel('K3', 862, 444, 23, '#17324d')}
  </g>
  <g id="region-legend" data-region="03-color-legend-callout">
    <rect x="1070" y="230" width="410" height="300" rx="22" fill="#fff8ed" stroke="#f2994a" stroke-width="5"/>
    <circle cx="1114" cy="270" r="25" fill="#f2994a"/>${buildScientificVectorLabel('3', 1106, 257, 25, '#ffffff')}
    <rect x="1132" y="332" width="48" height="48" rx="10" fill="#2f80ed"/>${buildScientificVectorLabel('activation', 1200, 344, 22, '#17324d')}
    <rect x="1132" y="402" width="48" height="48" rx="10" fill="#eb5757"/>${buildScientificVectorLabel('inhibition', 1200, 414, 22, '#17324d')}
    <path d="M1160 484 C1230 540 1360 530 1418 466" fill="none" stroke="#f2994a" stroke-width="7" stroke-dasharray="14 12"/>
    ${buildScientificVectorLabel('response callout', 1194, 480, 18, '#8a4b16')}
  </g>
  <g aria-label="downstream quantitative readout">
    <rect x="120" y="594" width="1360" height="176" rx="22" fill="#f8f5ff" stroke="#9b51e0" stroke-width="4"/>
    ${buildScientificVectorLabel('Normalized response at 24 h', 160, 620, 21, '#4a2b68')}
    <rect x="165" y="688" width="210" height="38" fill="#c7a7e8"/><rect x="420" y="670" width="330" height="56" fill="#9b51e0"/><rect x="795" y="706" width="155" height="20" fill="#d9c6ec"/><rect x="995" y="654" width="420" height="72" fill="#6f2da8"/>
  </g>
</svg>
`

export function buildScientificEditSvg() {
  return Buffer.from(svg)
}

export async function renderScientificEditPng(svgBytes: Uint8Array) {
  return sharp(svgBytes, { density: 92.16 })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer()
}
