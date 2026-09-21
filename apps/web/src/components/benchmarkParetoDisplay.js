import { benchmarkRecordKey } from './benchmarkDevelopers.js'
import { compareCost, metricScore } from './benchmarkParetoMath.js'

const NAMES = {
  'openai/gpt-image-2': 'GPT Image 2',
  'openai/gpt-image-2.5-sunburst': 'GPT Image 2.5 Sunburst',
  'openai/gpt-image-2.5-flare': 'GPT Image 2.5 Flare',
  'google/nano-banana': 'Nano Banana',
  'google/nano-banana-pro': 'Nano Banana Pro',
  'google/nano-banana-2': 'Nano Banana 2',
  'google/nano-banana-2-lite': 'Nano Banana 2 Lite',
}
export const modelName = model => NAMES[model.modelId] || (model.displayName || model.modelId).replace(/^[^:]+:\s*/, '')
export const displayCost = value => '$' + value.toFixed(3)
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value))

function niceBounds(value, direction) {
  const power = 10 ** Math.floor(Math.log10(Math.max(value, 1e-8)))
  const steps = [1, 2, 5, 10].map(n => n * power)
  return direction === 'up' ? steps.find(n => n >= value) : [...steps].reverse().find(n => n <= value)
}
export function costDomain(rows) {
  if (!rows.length) return [.01, .5]
  return [niceBounds(Math.min(...rows.map(r => r.price.usd)) * .85, 'down'), niceBounds(Math.max(...rows.map(r => r.price.usd)) * 1.15, 'up')]
}
export function linearTicks(min, max, count = 5) {
  if (!(max > min)) return []
  const step = niceBounds((max - min) / count, 'up')
  const first = Math.ceil(min / step - 1e-9) * step
  return Array.from({ length: Math.max(0, Math.floor((max - first) / step + 1e-9) + 1) }, (_, i) => Number((first + i * step).toPrecision(12)))
}
export function costTicks(min, max, scale) {
  if (scale === 'linear') return linearTicks(min, max)
  const ticks = []
  for (let power = Math.floor(Math.log10(Math.max(min, 1e-8))); power <= Math.ceil(Math.log10(max)); power++) {
    for (const n of [1, 2, 5]) {
      const value = Number((n * 10 ** power).toPrecision(12))
      if (value >= min * (1 - 1e-10) && value <= max * (1 + 1e-10)) ticks.push(value)
    }
  }
  return ticks.length >= 2 ? ticks : linearTicks(min, max, 4)
}
export function tickCost(value, ticks) {
  const step = ticks.length > 1 ? Math.min(...ticks.slice(1).map((v, i) => v - ticks[i])) : .01
  return '$' + value.toFixed(clamp(-Math.floor(Math.log10(step) + 1e-9), 2, 6))
}
export function clampView(view) {
  const zoom = clamp(view.zoom, 1, 8), half = .5 / zoom
  return { zoom, x: clamp(view.x, half, 1 - half), y: clamp(view.y, half, 1 - half) }
}
// Anchor is expressed in viewport fractions. Preserve the data under that pixel.
export function zoomView(view, nextZoom, anchor = { x: .5, y: .5 }) {
  const zoom = clamp(nextZoom, 1, 8)
  return clampView({
    zoom,
    x: view.x + (anchor.x - .5) / view.zoom - (anchor.x - .5) / zoom,
    y: view.y + (anchor.y - .5) / view.zoom - (anchor.y - .5) / zoom,
  })
}
export const focusView = (view, point) => clampView({ ...view, x: point.x, y: point.y })

// Keep the data beneath the initial pinch midpoint beneath the moving midpoint.
export function pinchView(view, ratio, start, current) {
  const zoom = clamp(view.zoom * ratio, 1, 8)
  return clampView({
    zoom,
    x: view.x + (start.x - .5) / view.zoom - (current.x - .5) / zoom,
    y: view.y + (start.y - .5) / view.zoom - (current.y - .5) / zoom,
  })
}

// Mark nearby screen coordinates as a selectable cluster; do not change data values.
export function clusterPoints(points, selectedId, minimumDistance = 0) {
  const sorted = [...points].sort((a, b) => Number(benchmarkRecordKey(b.row.model) === selectedId) - Number(benchmarkRecordKey(a.row.model) === selectedId) || Number(b.frontier) - Number(a.frontier))
  const clusters = []
  for (const point of sorted) {
    const match = clusters.find(g => Math.hypot(point.x - g[0].x, point.y - g[0].y) < Math.max(minimumDistance, (point.frontier || g[0].frontier || benchmarkRecordKey(point.row.model) === selectedId || benchmarkRecordKey(g[0].row.model) === selectedId) ? 25 : 18))
    if (match) match.push(point)
    else clusters.push([point])
  }
  return clusters
}
export function sortedCosts(rows, metric, order) {
  return [...rows].sort((a, b) => {
    const cost = compareCost(a.price.exact, b.price.exact)
    return (order === 'low' ? cost : order === 'high' ? -cost : metricScore(b.model, metric) - metricScore(a.model, metric)) || cost || a.model.modelId.localeCompare(b.model.modelId)
  })
}
