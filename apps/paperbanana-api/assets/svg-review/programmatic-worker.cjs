'use strict'

const { parentPort, workerData } = require('node:worker_threads')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { createHash } = require('node:crypto')
const { SaxesParser } = require('saxes')
const { compileBoundedResvgWasm } = require('./wasm-memory.cjs')

const SVG_NS = 'http://www.w3.org/2000/svg'
const XML_NS = 'http://www.w3.org/XML/1998/namespace'
const XLINK_NS = 'http://www.w3.org/1999/xlink'
const XMLNS_NS = 'http://www.w3.org/2000/xmlns/'
const ELEMENTS = new Set(('svg g defs symbol use path rect circle ellipse line polyline polygon text tspan textPath '
  + 'linearGradient radialGradient stop clipPath marker title desc metadata style').split(' '))
const TEXT_ELEMENTS = new Set(['text', 'tspan', 'textPath'])
const FONT_FAMILIES = new Set(['Noto Sans', 'Noto Sans CJK SC', 'Noto Sans Math'])
const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'inherit', 'initial'])
const CSS_FUNCTIONS = new Set(['rgb', 'rgba', 'hsl', 'hsla', 'calc', 'min', 'max', 'clamp',
  'matrix', 'translate', 'translatex', 'translatey', 'scale', 'scalex', 'scaley', 'rotate', 'skewx', 'skewy'])

function fail(code, detail) { throw new Error(`PROGRAMMATIC_SVG_${code}: ${detail}`) }

function dimensions(width, height, limits) {
  if (![width, height].every(n => Number.isFinite(n) && n > 0)) fail('DIMENSIONS', 'positive finite canvas dimensions are required')
  if (Math.ceil(width) > limits.maxEdge || Math.ceil(height) > limits.maxEdge
    || Math.ceil(width) * Math.ceil(height) > limits.maxPixels) fail('PIXELS', 'canvas exceeds 4096px edge or 8MP limit')
}

function length(value) {
  if (value === undefined) return undefined
  const match = /^\s*((?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(px|pt|pc|mm|cm|in)?\s*$/i.exec(value)
  if (!match) fail('DIMENSIONS', 'unsupported canvas length (use px, pt, pc, mm, cm, in, or viewBox)')
  const units = { px: 1, pt: 96 / 72, pc: 16, mm: 96 / 25.4, cm: 96 / 2.54, in: 96 }
  return Number(match[1]) * units[(match[2] || 'px').toLowerCase()]
}

function validate(svg, limits) {
  if (Buffer.byteLength(svg, 'utf8') > limits.maxBytes) fail('SIZE', 'source exceeds 5MiB')
  // Refuse DTDs even before parsing their contents. Entity expansion is never enabled.
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(svg)) fail('UNSAFE', 'DTD/entity declarations are forbidden')
  const parser = new SaxesParser({ xmlns: true, defaultXMLVersion: '1.0', forceXMLVersion: true })
  const stack = []
  const nodes = []
  const ids = new Map()
  const refs = []
  const issues = new Set()
  const requestedFamilies = new Set()
  let text = ''
  let root
  let hasTitle = false

  const reference = (value, owner) => {
    if (!/^#[^\s#"'<>]+$/u.test(value)) fail('UNSAFE', 'only local fragment references are allowed')
    const id = value.slice(1)
    refs.push({ id, owner })
    return id
  }
  const fontFamily = value => {
    for (const item of value.split(',')) {
      const family = item.trim().replace(/^['"]|['"]$/g, '')
      if (!family) continue
      requestedFamilies.add(family)
      if (requestedFamilies.size > 32) fail('COMPLEXITY', 'too many requested font families')
      if (!FONT_FAMILIES.has(family) && !GENERIC_FAMILIES.has(family)) {
        issues.add(`Font "${family}" is not bundled; this raster uses the bundled Noto fallback.`)
      }
    }
  }
  const fontSize = value => {
    const number = /^\s*(\d+(?:\.\d+)?)\s*(px|pt)?\s*$/i.exec(value)
    if (number && Number(number[1]) * (number[2] === 'pt' ? 96 / 72 : 1) < 8) {
      issues.add(`Small declared font size (${value}); check actual readability in the raster.`)
    }
  }
  const inspectCss = (input, owner) => {
    const css = input.replace(/\/\*[\s\S]*?\*\//g, '')
    // No escape decoding ambiguity, external font declarations, CSS imports,
    // executable legacy properties, or custom property URL indirection.
    if (/[\\@]/.test(css) || /(?:expression|behavior|-moz-binding|var)\s*[:(]/i.test(css)) {
      fail('UNSAFE', 'CSS escapes, at-rules, variables and active properties are unsupported')
    }
    if (/(?:^|[;{])\s*(?:filter|mask|mix-blend-mode|isolation)\s*:/i.test(css)) fail('COMPOSITING', 'CSS offscreen effects are unsupported; use at most two bounded clip-path attributes')
    for (const match of css.matchAll(/(?:^|[;{])\s*opacity\s*:\s*([^;}]+)/gi)) {
      if (!/^(?:0|1)(?:\.0+)?$/.test(match[1].trim()) && !['path','rect','circle','ellipse','line','polyline','polygon','text','use'].includes(owner.name)) fail('COMPOSITING', 'group opacity can allocate unbounded intermediate rasters; use leaf fill-opacity/stroke-opacity')
    }
    const withoutUrls = css.replace(/url\s*\(\s*(['"]?)([^'"()]*)\1\s*\)/gi, (_, quote, target) => {
      reference(target.trim(), owner)
      return ''
    })
    if (/url\s*\(/i.test(withoutUrls)) fail('UNSAFE', 'malformed CSS URL')
    for (const match of withoutUrls.matchAll(/([a-z_-][\w-]*)\s*\(/gi)) {
      if (!CSS_FUNCTIONS.has(match[1].toLowerCase())) fail('UNSAFE', 'unsupported CSS function')
    }
    for (const match of css.matchAll(/font-family\s*:\s*([^;}]+)/gi)) fontFamily(match[1])
    for (const match of css.matchAll(/font-size\s*:\s*([^;}]+)/gi)) fontSize(match[1])
    if (/font-(?:weight|style)\s*:\s*(?:bold|[6-9]00|italic|oblique)/i.test(css)) {
      issues.add('Only regular Noto font faces are bundled; verify requested bold/italic styling in the raster.')
    }
  }

  parser.on('error', error => fail('XML', error.message))
  parser.on('doctype', () => fail('UNSAFE', 'DTD declarations are forbidden'))
  parser.on('processinginstruction', () => fail('UNSAFE', 'processing instructions are forbidden'))
  parser.on('xmldecl', declaration => {
    if (declaration.version !== '1.0' || declaration.encoding && !/^utf-8$/i.test(declaration.encoding)) {
      fail('XML', 'only XML 1.0 with UTF-8 encoding is supported')
    }
  })
  parser.on('opentag', tag => {
    if (tag.uri !== SVG_NS || !ELEMENTS.has(tag.local)) fail('UNSAFE', `unsupported SVG element ${tag.local}`)
    if (++nodes.length > limits.maxElements || stack.length >= limits.maxDepth) fail('COMPLEXITY', 'element count or nesting limit exceeded')
    if (Object.keys(tag.attributes).length > limits.maxAttributes) fail('COMPLEXITY', 'too many attributes on an element')
    const node = { name: tag.local, attrs: {}, children: [], useTarget: undefined, refs: [], css: '' }
    nodes[nodes.length - 1] = node
    if (stack.length) stack[stack.length - 1].children.push(node)
    else {
      if (tag.local !== 'svg') fail('XML', 'the root element must be svg')
      root = node
    }
    stack.push(node)
    for (const attribute of Object.values(tag.attributes)) {
      const name = attribute.local
      const value = attribute.value
      if (attribute.uri === XMLNS_NS) {
        if (![SVG_NS, XLINK_NS, XML_NS].includes(value)) fail('UNSAFE', 'foreign namespaces are unsupported')
        continue
      }
      if (attribute.uri && ![XML_NS, XLINK_NS].includes(attribute.uri)) fail('UNSAFE', 'foreign namespaced attributes are unsupported')
      if (/^on/i.test(name) || ['src', 'base'].includes(name) || attribute.uri === XLINK_NS && name !== 'href') {
        fail('UNSAFE', `unsupported active/external attribute ${name}`)
      }
      if (/\b(?:NaN|Infinity)\b/.test(value)) fail('DIMENSIONS', 'non-finite numeric attribute')
      if (['filter','mask','mix-blend-mode','isolation'].includes(name)) fail('COMPOSITING', 'filter/mask/blending offscreen effects are unsupported')
      if (name==='opacity' && !/^(?:0|1)(?:\.0+)?$/.test(value.trim()) && !['path','rect','circle','ellipse','line','polyline','polygon','text','use'].includes(node.name)) fail('COMPOSITING', 'nontrivial opacity is unsupported; use leaf fill-opacity/stroke-opacity')
      node.attrs[name] = value
      if (name === 'id') {
        if (!value || ids.has(value)) fail('REFERENCE', 'empty or duplicate SVG id')
        ids.set(value, node)
      }
      if (name === 'href') {
        const id = reference(value, node)
        if (tag.local === 'use') node.useTarget = id
      }
      if (name === 'style' || /url\s*\(|\\|@import/i.test(value)) inspectCss(value, node)
      if (name === 'font-family') fontFamily(value)
      if (name === 'font-size') fontSize(value)
      if (name === 'font-weight' && /^(?:bold|[6-9]00)$/.test(value) || name === 'font-style' && /^(?:italic|oblique)$/.test(value)) {
        issues.add('Only regular Noto font faces are bundled; verify requested bold/italic styling in the raster.')
      }
    }
    if (tag.local === 'title') hasTitle = true
    if (node === root) {
      let viewBox
      if (node.attrs.viewBox !== undefined) {
        viewBox = node.attrs.viewBox.trim().split(/[\s,]+/).map(Number)
        if (viewBox.length !== 4 || viewBox.some(n => !Number.isFinite(n)) || viewBox[2] <= 0 || viewBox[3] <= 0) {
          fail('DIMENSIONS', 'viewBox must have four finite numbers and positive extents')
        }
      }
      const width = length(node.attrs.width)
      const height = length(node.attrs.height)
      if ((!width || !height) && !viewBox) fail('DIMENSIONS', 'provide both dimensions or a viewBox')
      dimensions(width ?? (height ? height * viewBox[2] / viewBox[3] : viewBox[2]),
        height ?? (width ? width * viewBox[3] / viewBox[2] : viewBox[3]), limits)
    }
  })
  const characterData = value => {
    if (stack.at(-1)?.name === 'style') stack.at(-1).css += value
    if (stack.some(node => TEXT_ELEMENTS.has(node.name))) {
      text += value
      if (text.length > limits.maxTextCharacters) fail('COMPLEXITY', 'text character limit exceeded')
    }
  }
  parser.on('text', characterData)
  parser.on('cdata', characterData)
  parser.on('closetag', () => {
    const node = stack.pop()
    if (node.name === 'style') inspectCss(node.css, node)
  })
  parser.write(svg).close()
  if (!root) fail('XML', 'missing SVG root')
  for (const ref of refs) {
    if (!ids.has(ref.id)) fail('REFERENCE', `unresolved local reference #${ref.id}`)
    ref.owner.refs.push(ids.get(ref.id))
  }
  // Walk reference/child edges before resvg can expand an exponential <use>
  // tree, recurse through gradients, or encounter a reference cycle.
  const memo = new Map()
  const visiting = new Set()
  const expansion = (node, depth) => {
    if (visiting.has(node)) fail('REFERENCE', 'cyclic SVG reference')
    if (depth > limits.maxDepth) fail('REFERENCE', 'reference expansion is too deep')
    if (memo.has(node)) return memo.get(node)
    visiting.add(node)
    let count = 1
    for (const child of [...node.children, ...node.refs]) {
      count += expansion(child, depth + 1)
      if (count > limits.maxExpandedElements) fail('COMPLEXITY', 'expanded SVG element limit exceeded')
    }
    visiting.delete(node)
    memo.set(node, count)
    return count
  }
  expansion(root, 0)
  const clipMemo=new Map()
  const clipCost=node=>{
    if(clipMemo.has(node))return clipMemo.get(node)
    let cost=(node.attrs['clip-path'] && node.attrs['clip-path']!=='none'?1:0)
      + (node.name==='symbol' || node.name==='svg' && node!==root ? 1 : 0)
    for(const child of [...node.children,...node.refs]) {cost+=clipCost(child);if(cost>2048)fail('COMPOSITING','scientific composition exceeds 2048 bounded clips/viewports')}
    clipMemo.set(node,cost);return cost
  }
  clipCost(root)
  // Markers also establish viewports. Bound recursive marker/reference chains,
  // while allowing many independent normal arrows in a scientific figure.
  const markerMemo = new Map()
  const markerDepth = node => {
    if (markerMemo.has(node)) return markerMemo.get(node)
    let nested = 0
    for (const child of [...node.children, ...node.refs]) nested = Math.max(nested, markerDepth(child))
    const depth = nested + (node.name === 'marker' ? 1 : 0)
    if (depth > 2) fail('COMPOSITING', 'nested marker viewport chains exceed depth two')
    markerMemo.set(node, depth)
    return depth
  }
  markerDepth(root)
  const weightMemo=new Map()
  const weight=node=>{
    if(weightMemo.has(node))return weightMemo.get(node)
    let size=Object.values(node.attrs).reduce((sum,value)=>sum+value.length,0)+node.css.length
    for(const child of [...node.children,...node.refs]) {size+=weight(child);if(size>2_000_000)fail('COMPLEXITY','expanded attribute/geometry content exceeds 2 million characters')}
    if(size>2_000_000)fail('COMPLEXITY','expanded geometry limit exceeded')
    weightMemo.set(node,size);return size
  }
  weight(root)
  if (!hasTitle) issues.add('SVG has no title element; check the figure description separately.')
  return { text, codeIssues: [...issues], requestedFamilies: [...requestedFamilies] }
}

// The only parsed fonts are our pinned, hash-verified files. Read Unicode cmap
// formats 4/12 to reject unsupported labels before resvg can emit tofu/skip them.
function glyphLookup(font) {
  const tableCount = font.readUInt16BE(4)
  let cmap
  for (let i = 0; i < tableCount; i++) {
    const entry = 12 + i * 16
    if (font.toString('ascii', entry, entry + 4) === 'cmap') cmap = font.readUInt32BE(entry + 8)
  }
  if (cmap === undefined) fail('FONT_UNAVAILABLE', 'font has no Unicode cmap')
  const lookups = []
  const count = font.readUInt16BE(cmap + 2)
  for (let i = 0; i < count; i++) {
    const record = cmap + 4 + i * 8
    const platform = font.readUInt16BE(record)
    const encoding = font.readUInt16BE(record + 2)
    if (platform !== 0 && !(platform === 3 && [1, 10].includes(encoding))) continue
    const offset = cmap + font.readUInt32BE(record + 4)
    const format = font.readUInt16BE(offset)
    if (format === 12) {
      const groups = font.readUInt32BE(offset + 12)
      lookups.push(code => {
        let low = 0, high = groups - 1
        while (low <= high) {
          const mid = (low + high) >>> 1
          const entry = offset + 16 + mid * 12
          const start = font.readUInt32BE(entry), end = font.readUInt32BE(entry + 4)
          if (code < start) high = mid - 1
          else if (code > end) low = mid + 1
          else return font.readUInt32BE(entry + 8) + code - start !== 0
        }
        return false
      })
    } else if (format === 4) {
      const segments = font.readUInt16BE(offset + 6) / 2
      lookups.push(code => {
        if (code > 0xffff) return false
        for (let j = 0; j < segments; j++) {
          const end = font.readUInt16BE(offset + 14 + j * 2)
          if (code > end) continue
          const start = font.readUInt16BE(offset + 16 + segments * 2 + j * 2)
          if (code < start) return false
          const delta = font.readInt16BE(offset + 16 + segments * 4 + j * 2)
          const rangePosition = offset + 16 + segments * 6 + j * 2
          const range = font.readUInt16BE(rangePosition)
          if (!range) return ((code + delta) & 0xffff) !== 0
          const glyph = font.readUInt16BE(rangePosition + range + (code - start) * 2)
          return glyph !== 0 && ((glyph + delta) & 0xffff) !== 0
        }
        return false
      })
    }
  }
  if (!lookups.length) fail('FONT_UNAVAILABLE', 'font Unicode cmap format is unsupported')
  return code => lookups.some(lookup => lookup(code))
}

async function render(svg, limits) {
  const validated = validate(svg, limits)
  let manifest, buffers
  try {
    manifest = JSON.parse(readFileSync(join(__dirname, 'fonts/manifest.json'), 'utf8'))
    buffers = manifest.fonts.map(font => {
      const buffer = readFileSync(join(__dirname, 'fonts', font.file))
      if (createHash('sha256').update(buffer).digest('hex') !== font.sha256) fail('FONT_UNAVAILABLE', `font checksum mismatch: ${font.file}`)
      return buffer
    })
  } catch (error) {
    fail('FONT_UNAVAILABLE', `packaged fonts could not be verified (${error.code || 'invalid font package'})`)
  }
  if (buffers.length !== 3) fail('FONT_UNAVAILABLE', 'Latin, CJK and math fonts are required')
  const lookups = buffers.map(glyphLookup)
  for (const character of new Set(validated.text)) {
    const code = character.codePointAt(0)
    if (/^[\t\r\n ]$/.test(character)) continue
    if (!lookups.some(lookup => lookup(code))) {
      fail('FONT_GLYPH', `bundled fonts do not support U+${code.toString(16).toUpperCase().padStart(4, '0')}; use supported text or outline the glyph`)
    }
  }
  const { Resvg, initWasm } = require('@resvg/resvg-wasm')
  const bounded = compileBoundedResvgWasm(readFileSync(require.resolve('@resvg/resvg-wasm/index_bg.wasm')), limits.maxWasmMemoryBytes)
  await initWasm(bounded.module)
  const options = {
    dpi: 96, languages: ['zh-CN', 'en'],
    font: { fontBuffers: buffers, defaultFontFamily: 'Noto Sans', sansSerifFamily: 'Noto Sans',
      serifFamily: 'Noto Sans', monospaceFamily: 'Noto Sans', cursiveFamily: 'Noto Sans', fantasyFamily: 'Noto Sans' },
  }
  let instance, raster, trapped = false
  try {
    instance = new Resvg(svg, options)
    dimensions(instance.width, instance.height, limits)
    if (instance.imagesToResolve().length) fail('UNSAFE', 'renderer found an external image dependency')
    raster = instance.render()
    dimensions(raster.width, raster.height, limits)
    return { ok: true, png: raster.asPng(), width: raster.width, height: raster.height,
      codeIssues: validated.codeIssues, renderer: 'resvg-wasm@2.6.2/scientific-composition-v1/memory-256MiB',
      fontInfo: { families: manifest.fonts.map(font => font.family),
        sha256: Object.fromEntries(manifest.fonts.map(font => [font.file, font.sha256])), requestedFamilies: validated.requestedFamilies } }
  } catch (error) {
    if (error instanceof WebAssembly.RuntimeError || error instanceof RangeError) {
      trapped = true
      // Rust's allocator traps on failed memory.grow; stack/bounds traps are also
      // failed bounded execution. Do not claim a specific allocation was measured.
      fail('RESOURCE_LIMIT', `bounded WASM execution failed (memory/stack/allocation trap; ${bounded.maximumBytes / 1048576}MiB linear-memory cap)`)
    }
    throw error
  } finally {
    // A trapped allocator may leave partial Rust objects; terminate the whole
    // worker instead of entering its destructors after a failed allocation.
    if (!trapped) { raster?.free(); instance?.free() }
  }
}

render(workerData.svg, workerData.limits)
  .then(result => parentPort.postMessage(result))
  .catch(error => parentPort.postMessage({ ok: false,
    error: error?.message?.startsWith('PROGRAMMATIC_SVG_') ? error.message : `PROGRAMMATIC_SVG_RENDER_FAILED: ${error?.message || 'unknown error'}` }))
