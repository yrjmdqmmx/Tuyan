import { useId, useRef, useState } from 'react'
import { Scan } from 'lucide-react'

export function ratioRectangle(value, bounds = { width: 48, height: 28 }) {
  const match = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(value)
  if (!match) return null
  const width = Number(match[1]), height = Number(match[2])
  if (!width || !height) return null
  const scale = Math.min(bounds.width / width, bounds.height / height)
  return { width: width * scale, height: height * scale }
}

export default function AspectRatioPicker({ label, value, options, onChange, compact = false, maxVisible = Infinity }) {
  const buttonRefs = useRef([])
  const [expanded, setExpanded] = useState(false)
  const groupId = useId()
  options = options.filter((option) => !option.disabled)
  const total = options.length
  if (!expanded && total > maxVisible) {
    const selected = options.find((option) => option.value === value)
    const visible = options.slice(0, maxVisible)
    if (selected && !visible.includes(selected)) visible[visible.length - 1] = selected
    options = visible
  }

  function moveFocus(index, direction) {
    const enabled = options
      .map((option, optionIndex) => ({ option, optionIndex }))
      .filter(({ option }) => !option.disabled)
    const current = enabled.findIndex(({ optionIndex }) => optionIndex === index)
    if (current < 0) return
    const next = enabled[(current + direction + enabled.length) % enabled.length]
    buttonRefs.current[next.optionIndex]?.focus()
  }

  return (
    <fieldset className={`aspect-ratio-picker${compact ? ' compact' : ''}`}>
      <legend>{label}</legend>
      {!options.length ? <p className="model-picker-empty">当前模型没有可用比例，请检查型号与清晰度。</p> : null}
      <div id={groupId} className="aspect-ratio-options" role="group" aria-label={label}>
        {options.map((option, index) => {
          const shape = ratioRectangle(option.value)
          const ariaLabel = option.disabled
            ? `${label} ${option.label}，${option.reason}`
            : `${label} ${option.label}`
          return (
            <button
              ref={(element) => { buttonRefs.current[index] = element }}
              key={option.value}
              type="button"
              className={value === option.value ? 'active' : ''}
              aria-label={ariaLabel}
              aria-pressed={value === option.value}
              disabled={option.disabled}
              title={option.reason || undefined}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault()
                  moveFocus(index, 1)
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  moveFocus(index, -1)
                }
              }}
            >
              {shape ? <svg className="aspect-ratio-shape" viewBox="0 0 64 36" aria-hidden="true"><rect x={(64 - shape.width) / 2} y={(36 - shape.height) / 2} width={shape.width} height={shape.height} /></svg> : <Scan className="aspect-ratio-auto" size={25} aria-hidden="true" />}
              <span className="aspect-ratio-label">{option.label}</span>
              {option.disabled ? <small>不支持</small> : null}
            </button>
          )
        })}
      </div>
      {total > maxVisible ? <button className="aspect-ratio-expand" type="button" aria-controls={groupId} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? '收起比例' : `展开全部 ${total} 种比例`}</button> : null}
    </fieldset>
  )
}
