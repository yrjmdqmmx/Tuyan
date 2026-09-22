import { useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import changelog from '../data/changelog.json'
import { CHANGE_KINDS, PRODUCTS, publishedVersions, publicEvents, resolveChangelogAnchor, versionLabel } from '../changelog.js'
import { SitePageShell } from './LeaderboardRoot.jsx'

const GROUP_NAMES = { tuyan: '图研工作台', benchmark: 'Tuyan Benchmark', openacad: 'OpenAcad' }
function Sources({ entry }) {
  const sources = entry.sources.filter(source => source.url)
  if (!sources.length) return null
  return <details className="changelog-sources"><summary aria-label={`查看来源：${entry.title}`}>查看来源</summary>
    <div>{sources.map(source => <a href={source.url} key={source.id} target="_blank" rel="noopener noreferrer">{source.label}<ExternalLink size={12} aria-hidden="true" /></a>)}</div>
  </details>
}
function EntryContent({ entry }) {
  return <div className="changelog-day-entries"><div className="changelog-entry">
    <h4>{entry.title}</h4><p className="changelog-summary">{entry.summary}</p>
    {entry.notes?.length > 0 && <ul className="changelog-notes">{entry.notes.map(note => <li key={note}>{note}</li>)}</ul>}
    {CHANGE_KINDS.map(kind => {
      const changes = entry.changes.filter(change => change.kind === kind)
      return changes.length ? <section className="changelog-change-group" aria-label={`${entry.product ? versionLabel(entry) : entry.title} ${kind}`} key={kind}>
        <h5><span className={`changelog-kind changelog-kind-${kind}`}>{kind}</span></h5>
        <ul className="changelog-changes">{changes.map((change, index) => <li key={index}>{change.text}</li>)}</ul>
      </section> : null
    })}
    <Sources entry={entry}/>
  </div></div>
}
function VersionEntry({ entry }) {
  return <article className="changelog-day" id={entry.id} aria-labelledby={`version-${entry.id}`}>
    <div className="changelog-version-meta">
      <h3 id={`version-${entry.id}`} className="changelog-version"><a href={`#${entry.id}`}>{versionLabel(entry)}</a></h3>
      <span className="changelog-release">已发布 · {entry.release.surfaces.join(' / ')}</span>
      <p className="changelog-date"><time dateTime={entry.release.date}>{entry.release.date}</time></p>
    </div>
    <EntryContent entry={entry}/>
  </article>
}
export function ChangelogPage({ data = changelog }) {
  const groups = Object.keys(PRODUCTS).map(product => ({ product, entries: publishedVersions(data, product) })).filter(group => group.entries.length)
  const events = publicEvents(data)
  useEffect(() => {
    const scrollToAnchor = () => {
      const hash = window.location.hash.slice(1)
      const id = resolveChangelogAnchor(data, hash) || (['tuyan', 'benchmark', 'openacad', 'ecosystem'].includes(hash) ? hash : undefined)
      if (id) document.getElementById(id)?.scrollIntoView?.({ block: 'start' })
    }
    scrollToAnchor()
    window.addEventListener('hashchange', scrollToAnchor)
    return () => window.removeEventListener('hashchange', scrollToAnchor)
  }, [data])
  return <main className="changelog-page" lang="zh-CN" id="changelog-content">
    <header className="changelog-intro"><span className="changelog-eyebrow">TUYAN · CHANGELOG</span><h1>更新日志</h1></header>
    <nav className="changelog-products" aria-label="更新分类">
      {groups.map(({ product }) => <a href={`#${product}`} key={product}>{GROUP_NAMES[product]}</a>)}
      {events.length > 0 && <a href="#ecosystem">生态事件</a>}
    </nav>
    {groups.map(({ product, entries }) => <section className="changelog-timeline" id={product} aria-label={GROUP_NAMES[product]} key={product}>
      <h2 className="changelog-group-title">{GROUP_NAMES[product]}</h2>
      {product === 'tuyan' && <p className="changelog-section-note">PaperBanana 是 Tuyan 在 1.x–2.x 的历史品牌。</p>}
      {entries.map(entry => <VersionEntry entry={entry} key={entry.id}/>)}
    </section>)}
    {events.length > 0 && <section className="changelog-timeline" id="ecosystem" aria-label="生态事件"><h2 className="changelog-group-title">生态事件</h2>
      {events.map(entry => <article className="changelog-day" id={entry.id} aria-label={entry.title} key={entry.id}>
        <div className="changelog-version-meta"><h3 className="changelog-event-date"><a href={`#${entry.id}`}><time dateTime={entry.date}>{entry.date}</time></a></h3><p className="changelog-surfaces">{entry.surfaces.join(' / ')}</p></div>
        <EntryContent entry={entry}/>
      </article>)}
    </section>}
  </main>
}
export default function ChangelogRoot(props) { return <SitePageShell {...props} section="changelog"><ChangelogPage/></SitePageShell> }
