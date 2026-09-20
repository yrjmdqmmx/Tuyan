import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { ArrowRight, Minus, Plus, RotateCcw, Settings2, X } from 'lucide-react'
import { metricScore } from './benchmarkParetoMath.js'
import { clamp, clampView, clusterPoints, costDomain, costTicks, displayCost, focusView, linearTicks, tickCost, zoomView } from './benchmarkParetoDisplay.js'
import { Brand, brand, brandIcon, CostInfo, profileHref, Sources } from './BenchmarkParetoDetails.jsx'

function Popup({ points, position, metric, label, selectedId, onSelect, onClose, onEnter, onLeave, mobile }) {
  const root = useRef(null)
  const [size, setSize] = useState({ width: 300, height: 154 })
  const [expanded, setExpanded] = useState(false)
  const primary = points.find(p => p.row.model.modelId === selectedId) || points[0]
  useLayoutEffect(() => {
    if (!root.current) return
    const update = () => setSize({ width: root.current.offsetWidth || 300, height: root.current.offsetHeight || 154 })
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(root.current)
    return () => observer?.disconnect()
  }, [expanded, points.length])
  const left = position.x + 22 + size.width <= position.width ? position.x + 22 : position.x - size.width - 22
  const top = position.y - size.height - 18 >= 4 ? position.y - size.height - 18 : position.y + 22
  const { model, price } = primary.row
  return <div ref={root} className={`pareto-popover${mobile ? ' is-mobile' : ''}`} role="dialog" aria-label="模型计价详情"
    style={mobile ? undefined : { left: clamp(left, 5, Math.max(5, position.width - size.width - 5)), top: clamp(top, 5, Math.max(5, position.height - size.height - 5)) }}
    onPointerEnter={onEnter} onPointerLeave={onLeave}>
    <header><Brand model={model} /><strong>{model.displayName}</strong><button type="button" aria-label="关闭模型信息" onClick={onClose}><X size={17} /></button></header>
    {points.length > 1 && <div className="pareto-cluster-options" aria-label="重叠模型选择"><p>{points.length} 个相邻或重合模型，选择具体型号</p>{points.map(({ row }) => <button key={row.model.modelId} data-model-trigger type="button" onClick={() => onSelect(row.model.modelId, true)}><span>{row.model.displayName}</span><b>{displayCost(row.price.usd)}</b></button>)}</div>}
    <div className="pareto-popover-values"><span>{label}<b>{metricScore(model, metric).toFixed(2)}</b></span><span>USD/张<b>{displayCost(price.usd)}</b></span></div>
    <div className="pareto-popover-footer"><span className={price.costBasis === 'test' ? 'pareto-test-label' : ''}>{price.costBasis === 'test' ? '测试费用 · 账单已核对' : '官方标准报价'}</span><button type="button" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>{expanded ? '收起依据' : '计费详情'}</button></div>
    {expanded && <div className="pareto-popover-expanded"><code>{model.modelId}</code><p>完整精度：USD {price.usd}/张</p><p>{price.conditions}</p><p>{price.rateText}</p><p>{price.calculation}</p><small>{price.channel} · {price.checkedAt}</small><Sources price={price} /></div>}
    <a className="pareto-detail-link" href={profileHref(model)}>查看模型评分与原图 <ArrowRight size={14} /></a>
  </div>
}

export default function BenchmarkParetoScatter({ rows, frontier, metric, label, costBasis, selectedId, hoverId, focusRequest, searching, onSelect, onHover, onClear, onShowData }) {
  const canvas = useRef(null), svg = useRef(null), drag = useRef(null), closeTimer = useRef(null), moved = useRef(false)
  const [size, setSize] = useState({ width: 800, height: 420 })
  const [view, setView] = useState({ zoom: 1, x: .5, y: .5 })
  const [scale, setScale] = useState('log'), [popup, setPopup] = useState(null), [dragging, setDragging] = useState(false)
  const clip = useId().replace(/:/g, ''), helpId = useId(), mobile = size.width < 500
  const [domainLow, domainHigh] = costDomain(rows)
  const low = scale === 'log' ? domainLow : 0
  const normalizedCost = cost => scale === 'log' ? Math.log(cost / low) / Math.log(domainHigh / low) : cost / domainHigh
  const costAt = p => scale === 'log' ? low * (domainHigh / low) ** p : p * domainHigh
  const plot = { left: mobile ? 38 : 52, right: size.width - (mobile ? 18 : 28), top: 37, bottom: size.height - 47 }
  const width = plot.right - plot.left, height = plot.bottom - plot.top, half = .5 / view.zoom
  const position = row => ({ x: normalizedCost(row.price.usd), y: metricScore(row.model, metric) / 10 })
  const px = n => plot.left + (n - view.x + half) * view.zoom * width
  const py = n => plot.bottom - (n - view.y + half) * view.zoom * height
  const frontierIds = new Set(frontier.map(r => r.model.modelId))
  const activeId = hoverId || selectedId
  const points = rows.map(row => ({ row, x: px(position(row).x), y: py(position(row).y), frontier: frontierIds.has(row.model.modelId) }))
  const visiblePoints = points.filter(p => p.x >= plot.left - .01 && p.x <= plot.right + .01 && p.y >= plot.top - .01 && p.y <= plot.bottom + .01)
  const clusters = clusterPoints(visiblePoints, activeId)
  const popupPoints = popup ? points.filter(p => popup.ids.includes(p.row.model.modelId)) : []
  const anchor = popupPoints.find(p => p.row.model.modelId === selectedId) || popupPoints[0]
  const xticks = costTicks(costAt(view.x - half), costAt(view.x + half), scale)
  const yticks = linearTicks((view.y - half) * 10, (view.y + half) * 10)
  const frontPath = frontier.map((row, i) => `${i ? 'L' : 'M'}${px(position(row).x)},${py(position(row).y)}`).join(' ')

  function cancelClose() { clearTimeout(closeTimer.current) }
  function close() { cancelClose();setPopup(null);onHover(null) }
  function leave(event) {
    if (event.pointerType === 'touch') return
    cancelClose();closeTimer.current = setTimeout(() => { setPopup(null);onHover(null) }, 150)
  }
  useEffect(() => {
    const update = () => {
      const rect = canvas.current?.getBoundingClientRect()
      if (rect?.width && rect?.height) setSize({ width: rect.width, height: rect.height })
    }
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    if (canvas.current) observer?.observe(canvas.current)
    return () => { observer?.disconnect();clearTimeout(closeTimer.current) }
  }, [])
  useEffect(() => {
    if (!focusRequest) return
    const row = rows.find(r => r.model.modelId === focusRequest.id)
    if (row) setView(v => focusView(v, position(row)))
    setPopup(null)
  // Focus requests come from explicit list/cluster selection, never from hover or zoom.
  }, [focusRequest])
  useEffect(() => {
    function outside(event) {
      if (event.target.closest?.('[data-model-trigger], [data-point], .pareto-popover, [data-chart-controls]')) return
      setPopup(null);onHover(null)
    }
    function escape(event) { if (event.key === 'Escape') { setPopup(null);onHover(null);onClear() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside);document.removeEventListener('keydown', escape) }
  }, [onHover, onClear])
  useEffect(() => {
    const element = svg.current
    function wheel(event) {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault();setPopup(null)
      const rect = element.getBoundingClientRect()
      const anchor = { x: clamp((event.clientX - rect.left - plot.left) / width, 0, 1), y: clamp((plot.bottom - event.clientY + rect.top) / height, 0, 1) }
      setView(v => zoomView(v, v.zoom * (event.deltaY < 0 ? 1.25 : .8), anchor))
    }
    element?.addEventListener('wheel', wheel, { passive: false })
    return () => element?.removeEventListener('wheel', wheel)
  }, [size.width, size.height])
  function zoom(next) {
    close()
    const selected = rows.find(r => r.model.modelId === selectedId)
    if (selected) setView(v => focusView(zoomView(v, next), position(selected)))
    else setView(v => zoomView(v, next))
  }
  function reset() { close();setView({ zoom: 1, x: .5, y: .5 }) }
  function hover(group, event) {
    if (event.pointerType === 'touch' || drag.current) return
    cancelClose();onHover(group[0].row.model.modelId);setPopup({ ids: group.map(p => p.row.model.modelId) })
  }
  function activate(group) {
    cancelClose();onSelect(group[0].row.model.modelId, false);setPopup({ ids: group.map(p => p.row.model.modelId) })
  }
  const placed = []
  const labels = [...clusters].sort((a, b) => Number(b.some(p => p.row.model.modelId === activeId)) - Number(a.some(p => p.row.model.modelId === activeId))).flatMap(group => {
    const p = group[0], active = group.some(p => p.row.model.modelId === activeId)
    if (!active && !searching && !p.frontier) return []
    const name = p.row.model.displayName + (group.length > 1 ? ` +${group.length - 1}` : '')
    const w = Math.min(size.width - 24, name.length * 6.5 + 14), h = 24
    const candidates = [[-w / 2, -43], [23, -12], [-w - 23, -12], [-w / 2, 24], [-w / 2, -73], [23, 33], [-w - 23, 33], [-w / 2, 55]]
    // Search nearby free label positions before considering a more distant callout.
    const lanes = []
    for (let dy = -103; dy <= 79; dy += 14) {
      for (let dx = -w - 25; dx <= 25; dx += 16) lanes.push([dx, dy])
    }
    lanes.sort((a, b) => Math.hypot(a[0] + w / 2, a[1] + h / 2) - Math.hypot(b[0] + w / 2, b[1] + h / 2))
    for (const [dx, dy] of [...candidates, ...lanes]) {
      const x = clamp(p.x + dx, 6, size.width - w - 6), y = p.y + dy
      if (y < 3 || y + h > plot.bottom + 12) continue
      if (placed.some(b => x < b.x + b.w + 5 && x + w + 5 > b.x && y < b.y + h + 4 && y + h + 4 > b.y)) continue
      if (clusters.some(([b]) => x < b.x + (b.frontier ? 18 : 9) && x + w > b.x - (b.frontier ? 18 : 9) && y < b.y + 17 && y + h > b.y - 17)) continue
      placed.push({ x, y, w });return [{ x, y, w, name, point: p, active }]
    }
    return []
  })
  return <div className="pareto-chart">
    <header className="pareto-chart-heading"><div><h2>帕累托前沿</h2><span aria-label="比较范围">{label} · {rows.length} 个模型</span></div>
      <div className="pareto-chart-controls" data-chart-controls>
        <details className="pareto-chart-settings"><summary aria-label="图表设置"><Settings2 size={17} /></summary><label>成本刻度<select aria-label="成本刻度" value={scale} onChange={e => { setScale(e.target.value);reset() }}><option value="log">对数</option><option value="linear">线性</option></select></label><small>⌘ / Ctrl + 滚轮缩放，放大后拖动平移。</small></details>
        <button type="button" aria-label="缩小图表" disabled={view.zoom <= 1} onClick={() => zoom(view.zoom - 1)}><Minus size={17} /></button>
        <output aria-label="当前缩放">{Number(view.zoom.toFixed(1))}×</output>
        <button type="button" aria-label="放大图表" disabled={view.zoom >= 8} onClick={() => zoom(view.zoom + 1)}><Plus size={17} /></button>
        <button type="button" aria-label="重置视图" onClick={reset}><RotateCcw size={16} /><span>重置</span></button>
      </div>
    </header>
    <div className={`pareto-canvas${dragging ? ' is-dragging' : ''}`} ref={canvas}>
      <svg ref={svg} className="pareto-svg" viewBox={`0 0 ${size.width} ${size.height}`} role="group" tabIndex={0} aria-label={`${label}与单张成本，${rows.length} 个模型`} aria-describedby={helpId}
        style={{ touchAction: view.zoom > 1 ? 'none' : 'pan-y' }}
        onPointerDown={e => {
          if (e.target.closest('[data-point]')) return
          moved.current = false
          if (view.zoom > 1) { e.currentTarget.setPointerCapture(e.pointerId);drag.current = { x: e.clientX, y: e.clientY, view };setDragging(true);close() }
        }}
        onPointerMove={e => {
          if (!drag.current) return
          const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y
          if (Math.hypot(dx, dy) > 4) moved.current = true
          setView(clampView({ zoom: drag.current.view.zoom, x: drag.current.view.x - dx / width / drag.current.view.zoom, y: drag.current.view.y + dy / height / drag.current.view.zoom }))
        }}
        onPointerUp={() => { drag.current = null;setDragging(false) }} onPointerCancel={() => { drag.current = null;setDragging(false) }}
        onClick={e => { if (!e.target.closest('[data-point]') && !moved.current) { close();onClear() } }}
        onKeyDown={e => {
          if (e.target !== e.currentTarget) return
          const deltas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }
          if (deltas[e.key]) { e.preventDefault();const [dx, dy] = deltas[e.key];close();setView(v => clampView({ ...v, x: v.x + dx * .15 / v.zoom, y: v.y + dy * .15 / v.zoom })) }
          if (e.key === '+' || e.key === '=') zoom(view.zoom + 1)
          if (e.key === '-') zoom(view.zoom - 1)
          if (e.key === 'Home') reset()
        }}>
        <defs><clipPath id={clip}><rect x={plot.left - 18} y={plot.top - 18} width={width + 36} height={height + 36} /></clipPath></defs>
        <text x={plot.left} y={19} className="pareto-axis-title">{label} / 10</text>
        {yticks.map(t => <g key={t} className="pareto-grid"><line x1={plot.left} x2={plot.right} y1={py(t / 10)} y2={py(t / 10)} /><text x={plot.left - 10} y={py(t / 10) + 4} textAnchor="end">{Number(t.toFixed(2))}</text></g>)}
        {xticks.map(t => <g key={t} className="pareto-grid"><line x1={px(normalizedCost(t))} x2={px(normalizedCost(t))} y1={plot.top} y2={plot.bottom} /><text data-cost-tick x={px(normalizedCost(t))} y={plot.bottom + 27} textAnchor="middle">{tickCost(t, xticks)}</text></g>)}
        <g clipPath={`url(#${clip})`}><path d={frontPath} className="pareto-frontier-line" /></g>
        {labels.map(l => <g key={l.point.row.model.modelId} className={`pareto-point-label${l.active ? ' is-active' : ''}`} aria-hidden="true"><line x1={l.point.x} y1={l.point.y} x2={l.x + l.w / 2} y2={l.y + 12} /><rect x={l.x} y={l.y} width={l.w} height="24" rx="4" /><text x={l.x + l.w / 2} y={l.y + 16} textAnchor="middle">{l.name}</text></g>)}
        {clusters.map(group => {
          const p = group[0], model = p.row.model, [, mark, color] = brand(model), active = group.some(p => p.row.model.modelId === activeId)
          const prominent = p.frontier || active || searching, radius = prominent ? 14 : 5
          return <g key={model.modelId} role="button" tabIndex={0} data-point data-model-ids={group.map(p => p.row.model.modelId).join('|')} data-prominent={prominent} data-selected={group.some(p => p.row.model.modelId === selectedId)}
            transform={`translate(${p.x},${p.y})`} className={`pareto-point${active ? ' is-active' : ''}${p.frontier ? ' is-frontier' : ''}`} aria-label={group.length > 1 ? `展开 ${group.length} 个相邻模型：${group.map(p => p.row.model.displayName).join('、')}` : `${model.displayName}，${metricScore(model, metric).toFixed(2)} 分，${displayCost(p.row.price.usd)}/张`}
            onPointerEnter={e => hover(group, e)} onPointerLeave={leave} onFocus={() => { cancelClose();onHover(model.modelId);setPopup({ ids: group.map(p => p.row.model.modelId) }) }} onBlur={e => { if (!e.relatedTarget?.closest('.pareto-popover')) leave({ pointerType: 'keyboard' }) }}
            onClick={e => { e.stopPropagation();activate(group) }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault();activate(group) } }}>
            <circle r={prominent ? 20 : 12} fill="transparent" />
            <rect x={-radius} y={-radius} width={radius * 2} height={radius * 2} rx={prominent ? 7 : 2} fill={prominent ? '#fff' : color} fillOpacity={prominent ? 1 : .58} stroke={prominent ? '#3d795a' : color} strokeOpacity={prominent ? 1 : .2} strokeWidth={active ? 2.5 : 1.5} />
            {prominent && (brandIcon(model) ? <image href={brandIcon(model)} x="-10" y="-10" width="20" height="20" aria-hidden="true" /> : <text y="4" textAnchor="middle" fontSize="12" fill={color}>{mark}</text>)}
            {active && <circle r="20" fill="none" stroke="#3d795a" strokeWidth="1" opacity=".45" />}
            {group.length > 1 && <g><circle cx={prominent ? 14 : 7} cy={prominent ? -14 : -7} r="8" fill="#44564b" /><text x={prominent ? 14 : 7} y={prominent ? -11 : -4} textAnchor="middle" fontSize="10" fill="#fff">{group.length}</text></g>}
            {prominent && group.some(p => p.row.price.costBasis === 'test') && <circle cx="-13" cy="13" r="3.5" fill="#b6781d" stroke="white" />}
          </g>
        })}
      </svg>
      {rows.length === 0 && <div className="pareto-chart-empty" role="status"><strong>没有符合条件的模型</strong><p>调整搜索或预算范围；缺价原因可在数据说明中查看。</p></div>}
      {anchor && !mobile && <Popup key={popup.ids.join('|')} points={popupPoints} metric={metric} label={label} selectedId={selectedId} position={{ ...anchor, ...size }} onSelect={onSelect} onClose={close} onEnter={cancelClose} onLeave={leave} />}
    </div>
    {anchor && mobile && <Popup key={popup.ids.join('|')} mobile points={popupPoints} metric={metric} label={label} selectedId={selectedId} position={{ ...anchor, ...size }} onSelect={onSelect} onClose={close} onEnter={cancelClose} onLeave={leave} />}
    <footer className="pareto-chart-footer"><span className="pareto-cost-caption">单张成本 · USD/张 <CostInfo costBasis={costBasis} onShowData={onShowData} /></span><div className="pareto-legend"><span><i />前沿</span><span><i />其他模型</span></div></footer>
    <span className="pareto-sr-only" id={helpId}>成本向右增加，分数向上增加。相邻标记可展开选择；放大后可拖动或用方向键平移。缩放不改变前沿计算范围。</span>
  </div>
}
