import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { ModelBrandLogo } from '../components/ModelBrandLogo.jsx';
import { MODEL_CHANNEL_LABELS } from '../lib/modelPresentation.js';

export const channelLabel = provider => provider === 'custom' ? '自定义 API' : MODEL_CHANNEL_LABELS[provider] || provider;

export default function WorkspaceChannelPicker({ providers, value, disabled, onChange }) {
  const id = useId();
  const root = useRef(null), trigger = useRef(null), list = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(value);
  const [position, setPosition] = useState(null);

  // Keep the menu inside the dialog's accessibility/focus boundary, but outside
  // its scrolling form so short windows and on-screen keyboards cannot clip it.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const box = trigger.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop || 0;
      const bottom = top + (viewport?.height || window.innerHeight);
      const below = bottom - box.bottom - 12, above = box.top - top - 12;
      const upwards = below < 180 && above > below;
      const maxHeight = Math.max(0, Math.min(240, upwards ? above : below));
      const next = { left: box.left, width: box.width, top: upwards ? box.top - maxHeight - 4 : box.bottom + 4, maxHeight };
      setPosition(previous => previous && Object.keys(next).every(key => previous[key] === next[key]) ? previous : next);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dismiss = event => {
      if (!root.current?.contains(event.target) && !list.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const option = list.current?.querySelector('[tabindex="0"]');
    option?.focus({ preventScroll: true });
    option?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active, Boolean(position)]);

  function close() {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      close();
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const index = providers.indexOf(active);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? providers.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + providers.length) % providers.length;
      setActive(providers[next]);
    }
  }

  return <div className="tw-channel-picker" ref={root}>
    <span id={`${id}-label`} className="tw-connection-label">渠道</span>
    <button ref={trigger} type="button" className="tw-channel-trigger" disabled={disabled}
      aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox"
      aria-expanded={open} aria-controls={open ? `${id}-list` : undefined}
      onClick={() => { setActive(value); setOpen(!open); }}
      onKeyDown={event => {
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
          event.preventDefault();
          setActive(value);
          setOpen(true);
        }
      }}>
      <ModelBrandLogo brand={value} channel/>
      <span id={`${id}-value`}>{channelLabel(value)}</span>
      {!disabled && <ChevronDown size={16} aria-hidden="true"/>}
    </button>
    {open && position && createPortal(<div ref={list} id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`}
      className="tw-channel-options" style={position} onKeyDown={handleKeyDown}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      {providers.map(provider => <button key={provider} type="button" role="option"
        aria-selected={provider === value} tabIndex={provider === active ? 0 : -1}
        onFocus={() => setActive(provider)}
        onClick={() => { onChange(provider); close(); }}>
        <ModelBrandLogo brand={provider} channel/>
        <span>{channelLabel(provider)}</span>
        {provider === value && <Check size={16} aria-hidden="true"/>}
      </button>)}
    </div>, root.current.closest('[role="dialog"]'))}
  </div>;
}
