import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import test from 'node:test'
import { inspectFigureExport } from '../src/figure-export-inspection.js'

const expected = { widthMm: 89, heightMm: 70 }
const page = '/Type /Page /Parent 2 0 R /Contents 4 0 R'
const font = '<< /Type /Font /Subtype /TrueType /BaseFont /FixtureSans /FontDescriptor 6 0 R >>'
const descriptor = '<< /Type /FontDescriptor /FontName /FixtureSans /FontFile2 7 0 R >>'
const content = 'q BT /F1 6 Tf 1 0 0 1 10 20 Tm (Independent label) Tj ET Q'
function stream(raw: Buffer | string, compressed = true, extra = '') {
  const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw, 'latin1'), encoded = compressed ? deflateSync(bytes) : bytes
  return Buffer.concat([Buffer.from(`<< /Length ${encoded.length}${compressed ? ' /Filter /FlateDecode' : ''} ${extra} >>\nstream\n`), encoded, Buffer.from('\nendstream')])
}
function pdf(overrides: Record<number, string | Buffer | undefined> = {}, trailer = '') {
  const objects: Record<number, string | Buffer | undefined> = {
    1: '<< /Type /Catalog /Pages 2 0 R >>',
    2: '<< /Type /Pages /Count 1 /Kids [3 0 R] /MediaBox [0 0 252.283465 198.425197] /Resources << /Font << /F1 5 0 R >> >> >>',
    3: `<< ${page} >>`, 4: stream(content), 5: font, 6: descriptor,
    // Synthetic bytes prove only non-empty stream presence, never font validity.
    7: stream('synthetic-font-bytes'), ...overrides,
  }
  const chunks = [Buffer.from('%PDF-1.5\n')], offsets = [0]
  const max = Math.max(...Object.keys(objects).map(Number))
  for (let id = 1; id <= max; id++) {
    offsets.push(chunks.reduce((sum, b) => sum + b.length, 0))
    chunks.push(Buffer.from(`${id} 0 obj\n`), Buffer.from(objects[id] ?? 'null'), Buffer.from('\nendobj\n'))
  }
  const position = chunks.reduce((sum, b) => sum + b.length, 0)
  chunks.push(Buffer.from(`xref\n0 ${max + 1}\n0000000000 65535 f \n${offsets.slice(1).map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${max + 1} /Root 1 0 R ${trailer} >>\nstartxref\n${position}\n%%EOF\n`))
  return Buffer.concat(chunks)
}
const result = (bytes: Buffer, kind: 'pdf' | 'eps' = 'pdf', size = expected) => inspectFigureExport(bytes, kind, size).checks
const item = (checks: ReturnType<typeof result>, id: string) => checks.find(c => c.id === id)!
const allUnverified = (bytes: Buffer) => assert.ok(result(bytes).slice(0, 3).every(c => c.status === 'unverified'))
const eps = (header = '%%BoundingBox: 0 0 253 199\n%%HiResBoundingBox: 0 0 252.283465 198.425197', tail = '') => Buffer.from(`%!PS-Adobe-3.0 EPSF-3.0\n%%Creator: cairo 1.16.0\n${header}\n%%EndComments\n%%BeginProlog\n%%EndProlog\n%%Page: 1 1\nshowpage\n%%Trailer\n${tail}\nend\n%%EOF\n`)

test('compressed PDF uses inherited page tree dimensions and actual text/font resources', () => {
  const checks = result(pdf())
  assert.equal(item(checks, 'export-page-size').status, 'passed')
  assert.equal(item(checks, 'export-text-operators').status, 'passed')
  assert.equal(item(checks, 'export-text-operators').actual.textShowOperations, 1)
  assert.equal(item(checks, 'export-font-embedding').status, 'passed')
  assert.match(item(checks, 'export-font-embedding').message, /未验证字体程序/)
  assert.equal(item(checks, 'export-visual-and-editing-review').status, 'manual')
  assert.ok(checks.every(c => c.scope === 'exported-file' && typeof c.actual.sha256 === 'string'))
  assert.ok(checks.every(c => !('editable' in c.actual) && !('journalCompliant' in c.actual)))
})

test('actual size wins over source expectations, includes crop and rotate, and checks every page', () => {
  assert.equal(item(result(pdf(), 'pdf', { widthMm: 100, heightMm: 70 }), 'export-page-size').status, 'problem')
  const rotated = result(pdf({ 3: `<< ${page} /Rotate 90 >>` }), 'pdf', { widthMm: 70, heightMm: 89 })
  assert.equal(item(rotated, 'export-page-size').status, 'passed')
  const cropped = result(pdf({ 3: `<< ${page} /CropBox [0 0 72 144] >>` }), 'pdf', { widthMm: 25.4, heightMm: 50.8 })
  assert.equal(item(cropped, 'export-page-size').status, 'passed')
  const twoPages = pdf({ 2: '<< /Type /Pages /Count 2 /Kids [3 0 R 8 0 R] /MediaBox [0 0 252.283465 198.425197] >>', 8: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] >>' })
  assert.equal(item(result(twoPages), 'export-page-size').status, 'problem')
  assert.equal((item(result(twoPages), 'export-page-size').actual.pages as unknown[]).length, 2)
})

test('fake MediaBox in comments or unrelated dictionaries never certifies dimensions', () => {
  allUnverified(pdf({ 2: '<< /Type /Pages /Count 1 /Kids [3 0 R] >>', 3: `<< ${page} /Comment ( /MediaBox [0 0 252.283465 198.425197] ) >>` }))
  allUnverified(pdf({ 3: `<< ${page} /MediaBox [0 0 0 100] >>` }))
  allUnverified(pdf({ 3: `<< ${page} /UserUnit 0 >>` }))
  allUnverified(pdf({ 3: `<< ${page} /Rotate 45 >>` }))
})

test('page tree cycles, duplicate leaves, missing parent and lying Counts fail closed', () => {
  for (const overrides of [
    { 2: '<< /Type /Pages /Count 1 /Kids [2 0 R] >>' },
    { 2: '<< /Type /Pages /Count 2 /Kids [3 0 R 3 0 R] >>' },
    { 2: '<< /Type /Pages /Count 2 /Kids [3 0 R] >>' },
    { 3: '<< /Type /Page /Contents 4 0 R >>' },
  ]) allUnverified(pdf(overrides))
})

test('xref offsets, encryption, incremental/hybrid files and xref streams are not guessed', () => {
  const original = pdf()
  allUnverified(Buffer.from(original.toString('latin1').replace('0000000009 00000 n', '0000000010 00000 n'), 'latin1'))
  for (const trailer of ['/Encrypt 6 0 R', '/Prev 9', '/XRefStm 9']) allUnverified(pdf({}, trailer))
  const offset = original.toString('latin1').match(/startxref\s+(\d+)/)![1]
  allUnverified(Buffer.from(original.toString('latin1').replace(`startxref\n${offset}`, 'startxref\n9'), 'latin1'))
  allUnverified(pdf({ 3: `<< ${page} /MediaBox [0 0 72 72] /MediaBox [0 0 252.283465 198.425197] >>` }))
})

test('only executable content tokens count, never strings, comments or unused fonts', () => {
  const checks = result(pdf({ 4: stream('% BT /F1 10 Tf (FAKE) Tj ET\nq Q') }))
  assert.equal(item(checks, 'export-text-operators').status, 'unverified')
  assert.equal(item(checks, 'export-font-embedding').status, 'unverified')
  const escaped = result(pdf({ 4: stream('BT /F1 6 Tf (literal \\( Tj ET BT \\) and nested (text)) Tj ET') }))
  assert.equal(item(escaped, 'export-text-operators').actual.textShowOperations, 1)
  assert.equal(item(escaped, 'export-text-operators').status, 'passed')
})

test('missing, unembedded and unsupported fonts have distinct honest results', () => {
  assert.equal(item(result(pdf({ 6: '<< /Type /FontDescriptor >>' })), 'export-font-embedding').status, 'problem')
  for (const overrides of [
    { 5: '<< /Type /Font /Subtype /Type3 /BaseFont /FixtureSans >>' },
    { 4: stream('BT /Unknown 6 Tf (Hi) Tj ET') },
    { 6: '<< /Type /FontDescriptor /FontFile2 99 0 R >>' },
    { 7: stream('') },
  ]) assert.equal(item(result(pdf(overrides)), 'export-font-embedding').status, 'unverified')
})

test('unsupported filters, truncated streams, zip bombs, unknown operators and matrices preserve size evidence only', () => {
  for (const body of [
    stream(content, false, '/Filter /LZWDecode'),
    Buffer.from('<< /Length 100000 >>\nstream\ntruncated\nendstream'),
    stream(Buffer.alloc(8 * 1024 * 1024 + 1, 32)),
    stream('BT /F1 6 Tf (Hi) Tj ET UNKNOWN'),
    stream('1 0 0 cm BT /F1 6 Tf (Hi) Tj ET'),
    stream('BT /F1 6 Tf (Hi) Tj'),
    stream('Q BT /F1 6 Tf (Hi) Tj ET'),
    stream('BI /W 1 /H 1 ID x EI'),
  ]) {
    const checks = result(pdf({ 4: body }))
    assert.equal(item(checks, 'export-page-size').status, 'passed')
    assert.equal(item(checks, 'export-text-operators').status, 'unverified')
    assert.equal(item(checks, 'export-font-embedding').status, 'unverified')
  }
})

test('Form XObjects are recursively inspected with their own resources, and cycles stay unverified', () => {
  const resources = '/Resources << /Font << /F1 5 0 R >> /XObject << /Form1 8 0 R >> >>'
  const parent = `<< /Type /Pages /Count 1 /Kids [3 0 R] /MediaBox [0 0 252.283465 198.425197] ${resources} >>`
  const checks = result(pdf({ 2: parent, 4: stream('q /Form1 Do Q'), 8: stream(content, true, `/Type /XObject /Subtype /Form /BBox [0 0 252 199] ${resources}`) }))
  assert.equal(item(checks, 'export-text-operators').status, 'passed')
  assert.equal(item(checks, 'export-text-operators').actual.textShowOperations, 1)
  const cyclic = result(pdf({ 2: parent, 4: stream('/Form1 Do'), 8: stream('/Form1 Do', true, `/Type /XObject /Subtype /Form /BBox [0 0 252 199] ${resources}`) }))
  assert.equal(item(cyclic, 'export-text-operators').status, 'unverified')
})

test('content arrays retain text state, while uninspected pattern and mask text cannot certify all fonts', () => {
  const joined = result(pdf({ 3: '<< /Type /Page /Parent 2 0 R /Contents [4 0 R 8 0 R] >>', 4: stream('BT /F1 6 Tf'), 8: stream('(Hi) Tj ET') }))
  assert.equal(item(joined, 'export-text-operators').status, 'passed')
  const pattern = result(pdf({ 3: `<< ${page} /Resources << /Font << /F1 5 0 R >> /Pattern << >> >> >>` }))
  assert.equal(item(pattern, 'export-font-embedding').status, 'unverified')
  const mask = result(pdf({ 3: `<< ${page} /Resources << /Font << /F1 5 0 R >> /ExtGState << /Mask << /SMask << /G 8 0 R >> >> >> >> >>`, 4: stream(`/Mask gs ${content}`), 8: stream(content, true, '/Type /XObject /Subtype /Form /BBox [0 0 252 199]') }))
  assert.equal(item(mask, 'export-font-embedding').status, 'unverified')
})

test('real Linux Cairo PDF fixture preserves independently established page/font evidence', () => {
  // Produced by Inkscape 1.2.2 + Cairo 1.16.0 on Linux x64, 2026-09-22.
  // From eps-final-runtime/figure.pdf; prior Poppler evidence: 89x70 mm, four embedded fonts.
  const bytes = readFileSync(new URL('./fixtures/figure-export-inspection/linux-cairo.pdf', import.meta.url))
  const checks = result(bytes)
  assert.equal(item(checks, 'export-page-size').actual.sha256, 'e2a0c476b0d8f79910e48cdf14801b4328dc0d39080b0407a2b3da47deaace3c')
  assert.equal(item(checks, 'export-page-size').status, 'passed')
  assert.equal(item(checks, 'export-text-operators').status, 'passed')
  assert.equal(item(checks, 'export-text-operators').actual.textShowOperations, 32)
  const fonts = item(checks, 'export-font-embedding').actual.fonts as Record<string, unknown>[]
  assert.equal(fonts.length, 4)
  assert.deepEqual(fonts.map(f => f.baseFont), ['AVMUZS+LiberationSans', 'FBCLTS+WenQuanYiMicroHei', 'ZANCFT+WenQuanYiMicroHei', 'INOHIY+LiberationSans'])
  assert.equal(item(checks, 'export-font-embedding').status, 'passed')
  // Equal-length mutation changes bytes, not xref positions: visible page shrinks by ~35.3 mm.
  const changed = Buffer.from(bytes.toString('latin1').replace('252.283465', '152.283465'), 'latin1')
  assert.equal(item(result(changed), 'export-page-size').status, 'problem')
  assert.notEqual(item(result(changed), 'export-page-size').actual.sha256, item(checks, 'export-page-size').actual.sha256)
})

test('EPS prefers actual HiResBoundingBox, accepts atend and never certifies text or font semantics', () => {
  const checks = result(eps(), 'eps')
  assert.equal(item(checks, 'export-page-size').status, 'passed')
  assert.equal(item(checks, 'export-page-size').actual.evidenceKind, 'dsc-declared-bounds')
  assert.equal(item(checks, 'export-text-operators').status, 'unverified')
  assert.equal(item(checks, 'export-font-embedding').status, 'unverified')
  assert.equal(item(result(eps(), 'eps', { widthMm: 100, heightMm: 70 }), 'export-page-size').status, 'problem')
  const atEnd = eps('%%BoundingBox: (atend)\n%%HiResBoundingBox: (atend)', '%%BoundingBox: 0 0 253 199\n%%HiResBoundingBox: 0 0 252.283465 198.425197')
  assert.equal(item(result(atEnd, 'eps'), 'export-page-size').status, 'passed')
})

test('real EPS integer BoundingBox is only approximate evidence, never a millimetre compliance pass', () => {
  const bytes = readFileSync(new URL('./fixtures/figure-export-inspection/linux-cairo.eps', import.meta.url))
  const checks = result(bytes, 'eps'), measured = item(checks, 'export-page-size')
  assert.equal(measured.actual.sha256, 'e8e9a38a255ee8cbe06952e1284caf7a56082d8abbfbaaf7075ac10cdf03ca6f')
  assert.equal(measured.status, 'manual')
  assert.deepEqual(measured.actual.boundingBoxPt, [0, 0, 253, 199])
  assert.equal(measured.actual.hiResBoundingBoxPt, null)
  assert.equal(item(checks, 'export-font-embedding').status, 'unverified')
})

test('malformed, contradictory, nested and missing EPS declarations never get a dimension pass', () => {
  for (const bytes of [
    eps('%%BoundingBox: 0 0 253 199\n%%HiResBoundingBox: 0 0 999 999'),
    eps('%%BoundingBox: 0 0 253 199\n%%BoundingBox: 0 0 253 199'),
    eps('%%BoundingBox: 0 0 253.5 199'),
    eps('%%BoundingBox: (atend)'),
    eps('%%BoundingBox: 0 0 253 199\n%%BeginDocument: nested.ps'),
    eps('%%BoundingBox: 0 0 253 199\n%%BeginBinary 1000'),
    eps('(\n%%BoundingBox: 0 0 253 199\n)'),
    Buffer.from('not eps %%BoundingBox: 0 0 253 199'),
  ]) assert.equal(item(result(bytes, 'eps'), 'export-page-size').status, 'unverified')
})

test('empty or oversized inputs and invalid comparison arguments are bounded and unverified', () => {
  allUnverified(Buffer.alloc(0)); allUnverified(Buffer.alloc(8 * 1024 * 1024 + 1))
  assert.equal(item(result(pdf(), 'pdf', { widthMm: NaN, heightMm: 70 }), 'export-page-size').status, 'unverified')
})
