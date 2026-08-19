import { useEffect, useId, useRef } from 'react'
import { Settings2, X } from 'lucide-react'

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function GenerationSettingsDrawer({ open, onClose, focusSetting = '', children }) {
  const titleId = useId()
  const panelRef = useRef(null)
  const previousFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    let focusTimer = 0
    const frame = window.requestAnimationFrame(() => {
      const requested = focusSetting
        ? panelRef.current?.querySelector(`[data-focus-setting="${focusSetting}"]`)
        : null
      const focusTarget = requested?.querySelector(FOCUSABLE)
        || requested
        || panelRef.current?.querySelector(FOCUSABLE)
        || panelRef.current
      focusTarget?.focus()
      focusTimer = window.setTimeout(() => focusTarget?.focus(), 80)
    })
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && document.querySelector('.accessible-dialog-backdrop')) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...(panelRef.current?.querySelectorAll(FOCUSABLE) || [])]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus?.()
    }
  }, [focusSetting, open])

  return (
    <div
      className={`generation-drawer-backdrop ${open ? 'open' : ''}`}
      aria-hidden={!open}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <aside
        ref={panelRef}
        className="generation-settings-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-focus-target={focusSetting || undefined}
        tabIndex={-1}
        inert={!open}
      >
        <header className="generation-drawer-head">
          <div>
            <span>Generation controls</span>
            <h2 id={titleId}><Settings2 size={19} /> 生成设置</h2>
          </div>
          <button type="button" aria-label="关闭生成设置" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="generation-drawer-body">{children}</div>
      </aside>
    </div>
  )
}
