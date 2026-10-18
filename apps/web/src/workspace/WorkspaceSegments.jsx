import { useRef } from 'react';

// A shared moving selection surface for task paths and setting depth.
export default function WorkspaceSegments({ label, value, options, onChange, className = '' }) {
  const buttons = useRef([]);
  const index = Math.max(0, options.findIndex(option => option.value === value));
  function move(event, current) {
    const next = event.key === 'ArrowRight' ? (current + 1) % options.length
      : event.key === 'ArrowLeft' ? (current + options.length - 1) % options.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    if (options[next].value !== value) onChange(options[next].value);
    buttons.current[next]?.focus();
  }
  return <div className={`tw-segmented ${className}`} role="group" aria-label={label} style={{ '--tw-segment-count': options.length, '--tw-segment-index': index }}>
    <span className="tw-segment-indicator" aria-hidden="true" />
    {options.map((option, i) => <button type="button" key={option.value} ref={element => { buttons.current[i] = element; }} aria-pressed={option.value === value} onClick={() => { if (option.value !== value) onChange(option.value); }} onKeyDown={event => move(event, i)}>{option.label}{option.suffix}</button>)}
  </div>;
}
