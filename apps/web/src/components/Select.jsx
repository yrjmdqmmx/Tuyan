export default function Select({ label, value, onChange, options, disabled = false, hint = '' }) {
  const hasGroups = options.some((option) => option[2]);
  const groups = hasGroups
    ? options.reduce((acc, option) => {
        const group = option[2] || '其他';
        acc[group] = acc[group] || [];
        acc[group].push(option);
        return acc;
      }, {})
    : null;

  return (
    <label className="field compact">
      <span>{label}</span>
      <select aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {!options.some(([id]) => id === value) ? <option value={value} disabled>{value || '尚未选择'}（当前不可用，请重新选择）</option> : null}
        {groups
          ? Object.entries(groups).map(([group, items]) => (
              <optgroup key={group} label={group}>
                {items.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
              </optgroup>
            ))
          : options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
      </select>
      {hint ? <small className="field-hint">{hint}</small> : null}
    </label>
  );
}
