import { useAppLocale } from './BenchmarkLocale.jsx'
/** Shared page navigation: links for routes, buttons for workspace views. */
export default function PageNavigation({ items, activeId, onSelect, label = '主导航' }) {
  const { t } = useAppLocale()
  return <nav className="paper-tabs" aria-label={t(label)}>
    {items.map(({ id, label: text, href }) => {
      const state = { className: activeId === id ? 'active' : undefined, 'aria-current': activeId === id ? 'page' : undefined };
      return href
        ? <a key={id} href={href} {...state}>{t(text)}</a>
        : <button key={id} type="button" {...state} onClick={() => onSelect(id)}>{t(text)}</button>;
    })}
  </nav>;
}
