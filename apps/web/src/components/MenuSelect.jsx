import { Children, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

function textOf(node) {
  return Children.toArray(node).map(child => isValidElement(child) ? textOf(child.props.children) : String(child)).join('');
}

function optionsOf(children, group = '', disabled = false) {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement(child)) return [];
    if (child.type === Fragment) return optionsOf(child.props.children, group, disabled);
    if (child.type === 'optgroup') return optionsOf(child.props.children, child.props.label, disabled || child.props.disabled);
    if (child.type !== 'option' || child.props.hidden) return [];
    const label = textOf(child.props.children);
    return [{ value: String(child.props.value ?? label), label, group, disabled: disabled || child.props.disabled }];
  });
}

/** Single-choice menu shared by filters, settings and forms. Keeps the caller's
 * value/onChange contract; focus stays on the labelled trigger while browsing. */
export default function MenuSelect({ children, value, defaultValue, onChange, disabled = false,
  className = '', id, name, onKeyDown, onClick, ...props }) {
  const uid = useId(), listId = `${uid}-options`;
  const trigger = useRef(null), panel = useRef(null), search = useRef({ text: '', at: 0 });
  const options = optionsOf(children);
  const [localValue, setLocalValue] = useState(() => String(defaultValue ?? options[0]?.value ?? ''));
  const current = String(value ?? localValue);
  const selected = options.findIndex(option => option.value === current);
  const [open, setOpen] = useState(false), [active, setActive] = useState(-1);
  const enabled = options.flatMap((option, index) => option.disabled ? [] : [index]);
  const available = options[active] && !options[active].disabled;
  const groups = [];
  options.forEach((option, index) => {
    if (!groups.length || groups.at(-1).label !== option.group) groups.push({ label: option.group, options: [] });
    groups.at(-1).options.push({ ...option, index });
  });
  function expand(index = selected) {
    search.current = { text: '', at: 0 };
    setActive(enabled.includes(index) ? index : (enabled[0] ?? -1)); setOpen(true);
  }
  function choose(index) {
    const option = options[index];
    if (!option || option.disabled) return;
    setLocalValue(option.value);
    // Existing consumers use the same event-shaped value contract as <select>.
    if (option.value !== current) onChange?.({ target: { value: option.value, name }, currentTarget: { value: option.value, name } });
    setOpen(false);
  }

  useLayoutEffect(() => {
    if (!open) return;
    const box = panel.current;
    // The top layer escapes scrolling/transforming dialog containers, while the
    // DOM remains inside that dialog's accessible subtree.
    box.showPopover?.();
    function position() {
      const anchor = trigger.current.getBoundingClientRect();
      const width = Math.min(Math.max(anchor.width, 160), window.innerWidth - 16);
      box.style.width = `${width}px`;
      box.style.left = `${Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8))}px`;
      const below = window.innerHeight - anchor.bottom - 14, above = anchor.top - 14;
      const flip = below < Math.min(box.scrollHeight, 320) && above > below;
      const height = Math.max(0, Math.min(320, flip ? above : below));
      box.style.maxHeight = `${height}px`;
      box.style.top = `${flip ? anchor.top - Math.min(box.scrollHeight, height) - 6 : anchor.bottom + 6}px`;
    }
    position();
    window.addEventListener('resize', position);
    return () => { window.removeEventListener('resize', position); if (box.hidePopover && box.matches(':popover-open')) box.hidePopover?.(); };
  }, [open]);

  useEffect(() => {
    if (disabled || (open && !available)) setOpen(false);
  }, [disabled, open, available]);
  useEffect(() => {
    if (!open) return;
    const outside = event => {
      if (!trigger.current?.contains(event.target) && !panel.current?.contains(event.target)) setOpen(false);
    };
    const scroll = event => { if (!panel.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outside);
    document.addEventListener('scroll', scroll, true);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('focusin', outside); document.removeEventListener('scroll', scroll, true); };
  }, [open]);
  useEffect(() => {
    if (open) panel.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active]);

  function keyDown(event) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const index = enabled.indexOf(active);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1)
        : enabled[Math.max(0, Math.min(enabled.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))];
      if (open) setActive(next ?? -1); else expand(['Home', 'End'].includes(event.key) ? next : selected);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); event.stopPropagation();
      if (open) choose(active); else expand();
    } else if (event.key === 'Escape' && open) {
      event.preventDefault(); event.stopPropagation(); setOpen(false);
    } else if (event.key === 'Tab' && open) {
      choose(active);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now(), old = now - search.current.at < 700 ? search.current.text : '';
      const query = (old + event.key).toLocaleLowerCase();
      search.current = { text: query, at: now };
      const prefix = [...query].every(char => char === query[0]) ? query[0] : query;
      const from = open ? active : selected;
      const ordered = [...enabled.filter(i => i > from), ...enabled.filter(i => i <= from)];
      const found = ordered.find(i => options[i].label.toLocaleLowerCase().startsWith(prefix));
      if (found !== undefined) { setActive(found); setOpen(true); }
    }
  }

  return <>
    <button {...props} id={id || uid} ref={trigger} type="button" role="combobox" disabled={disabled}
      className={`ui-select ${className}`.trim()} value={current} aria-haspopup="listbox" aria-expanded={open}
      aria-controls={open ? listId : undefined} aria-activedescendant={open && available ? `${uid}-${active}` : undefined}
      onKeyDown={keyDown} onClick={event => { onClick?.(event); if (!event.defaultPrevented) open ? setOpen(false) : expand(); }}>
      <span className="ui-select-value">{options[selected]?.label || current || '请选择'}</span><ChevronDown className="ui-select-arrow" size={14} aria-hidden="true"/>
    </button>
    {name && <input type="hidden" name={name} value={current} disabled={disabled}/>}
    {open && createPortal(<div id={listId} ref={panel} className="ui-select-menu" role="listbox" popover={typeof window !== 'undefined' && typeof window.HTMLElement.prototype.showPopover === 'function' ? 'manual' : undefined}
      aria-label={props['aria-label']} aria-labelledby={props['aria-label'] ? undefined : id || uid}>
      {groups.map((group, groupIndex) => <div key={groupIndex} role={group.label ? 'group' : undefined} aria-label={group.label || undefined}>
        {group.label && <div className="ui-menu-group" aria-hidden="true">{group.label}</div>}
        {group.options.map((option) => { const index = option.index; return <div key={index} id={`${uid}-${index}`} role="option" data-index={index} data-value={option.value}
          aria-selected={index === selected} aria-disabled={option.disabled || undefined}
          className={`ui-menu-option ${index === active ? 'is-active' : ''}`}
          onPointerMove={() => { if (!option.disabled) setActive(index); }}
          onMouseDown={event => event.preventDefault()} onClick={() => { choose(index); trigger.current?.focus({ preventScroll: true }); }}>
          <span>{option.label}</span><Check size={14} aria-hidden="true" style={{ visibility: index === selected ? 'visible' : 'hidden' }}/>
        </div>; })}
      </div>)}
    </div>, trigger.current?.closest('[role="dialog"]') || document.body)}
  </>;
}
