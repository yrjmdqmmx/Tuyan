import assert from 'node:assert/strict'
import test from 'node:test'
import { clampView, clusterPoints, costDomain, costTicks, displayCost, focusView, modelName, pinchView, tickCost, zoomView } from './benchmarkParetoDisplay.js'

test('readable names and prices preserve meaningful variants', () => {
  assert.equal(modelName({ modelId: 'google/nano-banana-pro' }), 'Nano Banana Pro')
  assert.equal(modelName({ modelId: 'openai/gpt-image-2.5-sunburst' }), 'GPT Image 2.5 Sunburst')
  assert.equal(modelName({ displayName: 'Black Forest Labs: FLUX.2 Pro' }), 'FLUX.2 Pro')
  assert.equal(displayCost(.0756499), '$0.076')
})
test('cost ticks use readable 1/2/5 prices and remain in the viewport when zoomed', () => {
  assert.deepEqual(costDomain([{ price: { usd: .015833333 } }, { price: { usd: .3 } }]), [.01, .5])
  const ticks = costTicks(.01, .5, 'log')
  assert.deepEqual(ticks.map(t => tickCost(t, ticks)), ['$0.01', '$0.02', '$0.05', '$0.10', '$0.20', '$0.50'])
  for (const scale of ['log', 'linear']) {
    const zoomed = costTicks(.113, .119, scale)
    assert.ok(zoomed.length >= 2)
    assert.ok(zoomed.every(t => t >= .113 && t <= .119))
    assert.equal(new Set(zoomed.map(t => tickCost(t, zoomed))).size, zoomed.length)
  }
})
test('mouse anchored zoom preserves the data under the pointer and focusing keeps models visible', () => {
  const before = { zoom: 2, x: .5, y: .5 }, anchor = { x: .27, y: .74 }
  const after = zoomView(before, 4, anchor)
  for (const axis of ['x', 'y']) assert.ok(Math.abs(before[axis] + (anchor[axis] - .5) / before.zoom - after[axis] - (anchor[axis] - .5) / after.zoom) < 1e-12)
  for (const point of [{ x: .03, y: .99 }, { x: .9, y: .05 }, { x: .5, y: .6 }]) {
    const centered = focusView(after, point)
    assert.equal(centered.zoom, 4)
    for (const axis of ['x', 'y']) assert.ok(Math.abs(point[axis] - centered[axis]) <= .5 / centered.zoom)
  }
  assert.deepEqual(clampView({ zoom: 1, x: -100, y: 100 }), { zoom: 1, x: .5, y: .5 })
})
test('coincident and adjacent points remain selectable without moving their coordinates', () => {
  const point = (id, x, y, frontier = false) => ({ row: { model: { modelId: id } }, x, y, frontier })
  const points = [point('a', 100, 100), point('b', 100, 100, true), point('c', 112, 105), point('d', 250, 250)]
  const groups = clusterPoints(points, 'a')
  assert.deepEqual(groups.map(g => g.map(p => p.row.model.modelId)), [['a', 'b', 'c'], ['d']])
  assert.deepEqual(points.map(p => [p.x, p.y]), [[100, 100], [100, 100], [112, 105], [250, 250]])
})

test('pinch zoom and midpoint movement preserve the touched data, including zoom limits', () => {
  const before = { zoom: 2, x: .5, y: .5 }, start = { x: .4, y: .6 }, current = { x: .55, y: .45 }
  const after = pinchView(before, 1.5, start, current)
  assert.equal(after.zoom, 3)
  for (const axis of ['x', 'y']) assert.ok(Math.abs(before[axis] + (start[axis] - .5) / before.zoom - after[axis] - (current[axis] - .5) / after.zoom) < 1e-12)
  assert.equal(pinchView(before, 100, start, current).zoom, 8)
  assert.deepEqual(pinchView(before, .01, start, current), { zoom: 1, x: .5, y: .5 })
})
test('touch clusters never leave overlapping 44-pixel hit targets', () => {
  const points = Array.from({ length: 20 }, (_, i) => ({ row: { model: { modelId: String(i) } }, x: i * 17, y: (i % 3) * 12 }))
  const groups = clusterPoints(points, '4', 46)
  assert.equal(groups.flat().length, points.length)
  assert.equal(groups[0][0].row.model.modelId, '4')
  for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) assert.ok(Math.hypot(groups[i][0].x - groups[j][0].x, groups[i][0].y - groups[j][0].y) >= 46)
})
