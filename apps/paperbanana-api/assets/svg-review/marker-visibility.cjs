'use strict'

const { SaxesParser } = require('saxes')
const SHAPES = new Set(['path', 'line', 'polyline', 'polygon'])
const POSITIONS = ['start', 'mid', 'end']
const escape = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// Operates on already validated static SVG. It never changes the delivered source.
// Actual raster differences include markerUnits, refX/Y, viewBox, transforms,
// clipping and paint order; they do not prove the intended semantic connection.
function markerCandidates(svg) {
  const parser = new SaxesParser({ xmlns: true })
  const stack = [], candidates = [], limitations = new Set()
  let ordinal = 0, hasMarkers = false, hasUse = false
  parser.on('opentag', tag => {
    const attrs = Object.fromEntries(Object.values(tag.attributes).map(a => [a.local, a.value]))
    const parent = stack.at(-1)
    const style = {}
    for (const declaration of (attrs.style || '').split(';')) {
      const colon = declaration.indexOf(':')
      if (colon < 0) continue
      const key = declaration.slice(0, colon).trim().toLowerCase()
      const raw = declaration.slice(colon + 1).trim()
      const important = /!important\s*$/i.test(raw)
      if (!style[key]?.important || important) style[key] = { value: raw.replace(/!important\s*$/i, '').trim(), important }
    }
    const property = key => style[key]?.value ?? attrs[key]
    const inherited = (key, fallback) => {
      const own = property(key)
      return own == null || own === 'inherit' || own === 'unset' ? parent?.[key] ?? fallback : own === 'initial' ? fallback : own
    }
    const state = { name: tag.local, hidden: parent?.hidden || property('display') === 'none' || Number(property('opacity')) === 0,
      visibility: inherited('visibility', 'visible'),
      definition: parent?.definition || ['defs', 'marker', 'symbol', 'clipPath'].includes(tag.local) }
    const shorthand = property('marker')
    if (shorthand && POSITIONS.some(position => property('marker-' + position) != null)) {
      limitations.add('Mixed marker shorthand and longhand declarations require full CSS cascade analysis.')
    }
    for (const position of POSITIONS) {
      const key = 'marker-' + position
      state[key] = inherited(key, 'none')
      if (shorthand && property(key) == null) state[key] = shorthand === 'inherit' ? parent?.[key] || 'none' : shorthand
    }
    stack.push(state)
    if (tag.local === 'marker') hasMarkers = true
    if (tag.local === 'use') hasUse = true
    if (!SHAPES.has(tag.local) || state.definition || state.hidden || state.visibility !== 'visible') return
    ordinal++
    const end = parser.position, start = svg.lastIndexOf('<', end - 1), opening = svg.slice(start, end)
    for (const position of POSITIONS) {
      const value = state['marker-' + position]
      if (!value || value === 'none') continue
      if (position === 'mid') {
        if (tag.local !== 'line') limitations.add('Intermediate vertex markers are not independently checked.')
        continue
      }
      const match = /^url\(\s*['"]?#([^\s'")]+)['"]?\s*\)$/.exec(value)
      if (!match) { limitations.add('Unsupported marker declaration: ' + value); continue }
      candidates.push({ start, end, opening, style: attrs.style || '', position, markerId: match[1],
        element: attrs.id ? '#' + attrs.id : tag.local + '[' + ordinal + ']' })
    }
  })
  const inspectStyle = text => {
    if (stack.at(-1)?.name === 'style' && /\bmarker(?:-start|-mid|-end)?\s*:/i.test(text)) limitations.add('Stylesheet marker declarations require computed-style instance analysis.')
  }
  parser.on('text', inspectStyle)
  parser.on('cdata', inspectStyle)
  parser.on('closetag', () => stack.pop())
  parser.write(svg).close()
  if (hasUse && hasMarkers) limitations.add('Marker visibility inside use/symbol instances is not independently checked.')
  return { candidates, limitations: [...limitations] }
}

function checkMarkerVisibility(svg, originalPixels, renderPixels, { maxChecks = 12, maxPixels = 16_000_000, maxMs = 3000 } = {}) {
  const started = Date.now(), { candidates, limitations } = markerCandidates(svg)
  const checks = []
  let pixels = 0
  for (const candidate of candidates) {
    if (checks.length >= maxChecks || pixels + originalPixels.length / 4 > maxPixels || Date.now() - started >= maxMs) {
      limitations.push('Bounded local marker-check budget reached; remaining declarations were not checked.')
      break
    }
    // Inline !important overrides inherited and inline declarations. Stylesheet
    // marker rules are explicitly outside coverage, even if some checks succeed.
    const existingStyle = candidate.style.replace(/[;\s]+$/, '')
    const style = escape((existingStyle ? existingStyle + ';' : '') + 'marker-' + candidate.position + ':none!important')
    const opening = candidate.opening.replace(/\sstyle\s*=\s*(?:"[^"]*"|'[^']*')/, '')
      .replace(/\s*(\/?>)$/, ' style="' + style + '"$1')
    const modified = svg.slice(0, candidate.start) + opening + svg.slice(candidate.end)
    const comparison = renderPixels(modified)
    if (comparison.length !== originalPixels.length) {
      limitations.push('Counterfactual raster dimensions differ; comparison discarded.')
      break
    }
    let changedPixels = 0
    for (let i = 0; i < comparison.length; i += 4) {
      if (comparison[i] !== originalPixels[i] || comparison[i + 1] !== originalPixels[i + 1]
        || comparison[i + 2] !== originalPixels[i + 2] || comparison[i + 3] !== originalPixels[i + 3]) changedPixels++
    }
    pixels += originalPixels.length / 4
    checks.push({ element: candidate.element, position: candidate.position, markerId: candidate.markerId,
      changedPixels, status: changedPixels ? 'visible_contribution' : 'no_visible_contribution' })
  }
  return { checker: 'marker-raster-difference-v1', scope: 'Declared marker contribution only; not arrow semantics, gradients, text or numerical correctness.',
    status: checks.some(c => !c.changedPixels) ? 'issues_found' : limitations.length ? 'uncertain' : candidates.length ? 'clear' : 'not_applicable',
    declared: candidates.length, checked: checks.length, checks, limitations }
}

module.exports = { checkMarkerVisibility, markerCandidates }
