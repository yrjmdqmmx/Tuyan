import { useRef } from 'react'

export default function AspectRatioPicker({ label, value, options, onChange, compact = false }) {
  const buttonRefs = useRef([])

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
      <div className="aspect-ratio-options" role="group" aria-label={label}>
        {options.map((option, index) => {
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
              <span>{option.label}</span>
              {option.disabled ? <small>不支持</small> : null}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
