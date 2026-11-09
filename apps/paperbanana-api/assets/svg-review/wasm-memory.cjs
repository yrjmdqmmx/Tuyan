'use strict'

const { createHash } = require('node:crypto')

const PAGE_BYTES = 64 * 1024
const MAX_WASM_MEMORY_BYTES = 256 * 1024 * 1024
// Only this audited resvg-wasm 2.6.2 binary is accepted. A dependency update must
// re-audit its memory layout; never silently instantiate an unbounded new module.
const RESVG_WASM_SHA256 = '22bf6e9f9a100d972da0411a69c5ba504367fc1fa87b3b64e3f35e53926d2d70'

function incompatible(detail) { throw new Error(`SVG_REVIEW_RUNTIME_INCOMPATIBLE: ${detail}`) }
function resourceLimit(detail) { throw new Error(`SVG_REVIEW_RESOURCE_LIMIT: ${detail}`) }

function readU32(bytes, cursor, end) {
  let value = 0
  for (let i = 0; i < 5; i++) {
    if (cursor.position >= end) incompatible('truncated WASM unsigned LEB128')
    const byte = bytes[cursor.position++]
    if (i === 4 && byte > 15) incompatible('invalid WASM unsigned LEB128')
    value += (byte & 0x7f) * 2 ** (7 * i)
    if (!(byte & 0x80)) return value
  }
  incompatible('invalid WASM unsigned LEB128')
}

function writeU32(value) {
  const bytes = []
  do {
    const low = value & 0x7f
    value = Math.floor(value / 128)
    bytes.push(low | (value ? 0x80 : 0))
  } while (value)
  return Buffer.from(bytes)
}

/**
 * Add a real WebAssembly maximum to a private in-memory copy of the pinned
 * module's sole defined wasm32 memory. The VM enforces it for JS memory.grow and
 * WASM memory.grow alike. No disk binary, code section, SVG, or raster is changed.
 * Lower budgets are supported for controlled resource tests; never a higher one.
 */
function compileBoundedResvgWasm(source, maximumBytes = MAX_WASM_MEMORY_BYTES) {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < PAGE_BYTES
    || maximumBytes > MAX_WASM_MEMORY_BYTES || maximumBytes % PAGE_BYTES !== 0) {
    resourceLimit('WASM memory budget must be a whole 64KiB page within 256MiB')
  }
  const bytes = Buffer.from(source)
  if (createHash('sha256').update(bytes).digest('hex') !== RESVG_WASM_SHA256) {
    incompatible('resvg WASM checksum differs from the audited 2.6.2 binary')
  }
  if (!bytes.subarray(0, 8).equals(Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]))) {
    incompatible('unsupported WASM header')
  }
  let replacement, initialPages
  const maximumPages = maximumBytes / PAGE_BYTES
  const cursor = { position: 8 }
  while (cursor.position < bytes.length) {
    const sectionStart = cursor.position
    const sectionId = bytes[cursor.position++]
    const sectionBytes = readU32(bytes, cursor, bytes.length)
    const sectionEnd = cursor.position + sectionBytes
    if (sectionEnd > bytes.length) incompatible('WASM section extends beyond its source')
    if (sectionId === 5) {
      if (replacement) incompatible('multiple WASM memory sections')
      const count = readU32(bytes, cursor, sectionEnd)
      const flags = readU32(bytes, cursor, sectionEnd)
      if (count !== 1 || flags !== 0) incompatible('expected one unshared wasm32 memory without a maximum')
      initialPages = readU32(bytes, cursor, sectionEnd)
      if (cursor.position !== sectionEnd || initialPages !== 23) incompatible('audited initial WASM memory layout changed')
      if (initialPages > maximumPages) resourceLimit('WASM initial memory exceeds its budget')
      const memorySection = Buffer.concat([writeU32(1), writeU32(1), writeU32(initialPages), writeU32(maximumPages)])
      replacement = Buffer.concat([bytes.subarray(0, sectionStart), Buffer.from([5]),
        writeU32(memorySection.length), memorySection, bytes.subarray(sectionEnd)])
    }
    cursor.position = sectionEnd
  }
  if (!replacement) incompatible('WASM defined memory section is missing')
  if (!WebAssembly.validate(replacement)) incompatible('bounded WASM module failed validation')
  const module = new WebAssembly.Module(replacement)
  if (WebAssembly.Module.imports(module).some(item => item.kind === 'memory')
    || WebAssembly.Module.exports(module).filter(item => item.kind === 'memory').length !== 1) {
    incompatible('WASM memory import/export layout changed')
  }
  return Object.freeze({ module, maximumBytes, maximumPages, initialPages, originalSha256: RESVG_WASM_SHA256 })
}

module.exports = { compileBoundedResvgWasm, MAX_WASM_MEMORY_BYTES, RESVG_WASM_SHA256 }
