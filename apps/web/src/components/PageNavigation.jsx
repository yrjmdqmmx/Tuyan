/** Shared page navigation: links for routes, buttons for workspace views. */
export default function PageNavigation({ items, activeId, onSelect, label = '主导航' }) {
  return <nav className="paper-tabs" aria-label={label}>
    {items.map(({ id, label: text, href }) => {
      const state = { className: activeId === id ? 'active' : undefined, 'aria-current': activeId === id ? 'page' : undefined };
      return href
        ? <a key={id} href={href} {...state}>{text}</a>
        : <button key={id} type="button" {...state} onClick={() => onSelect(id)}>{text}</button>;
    })}
  </nav>;
}
