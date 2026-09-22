import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import changelog from '../data/changelog.json'
import { CHANGE_KINDS, CHANGELOG_VIEWS, groupPublishedUpdates, publishedVersions, publicEvents, resolveChangelogAnchor, versionLabel } from '../changelog.js'
import { SitePageShell } from './LeaderboardRoot.jsx'

function Sources({ entry }) {
  const sources = entry.sources.filter(source => source.url)
  if (!sources.length) return null
  return <details className="changelog-sources"><summary aria-label={`查看来源：${entry.title}`}>查看来源</summary>
    <div>{sources.map(source => <a href={source.url} key={source.id} target="_blank" rel="noopener noreferrer">{source.label}<ExternalLink size={12} aria-hidden="true" /></a>)}</div>
  </details>
}
function EntryDetails({ entry }) {
  return <>
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
  </>
}
function VersionEntry({ entry }) {
  return <article className="changelog-day" id={entry.id} aria-labelledby={`version-${entry.id}`}>
    <div className="changelog-version-meta">
      <h3 id={`version-${entry.id}`} className="changelog-version"><a href={`#${entry.id}`}>{versionLabel(entry)}</a></h3>
      <span className="changelog-release">已发布 · {entry.release.surfaces.join(' / ')}</span>
      <p className="changelog-date"><time dateTime={entry.release.date}>{entry.release.date}</time></p>
    </div>
    <div className="changelog-day-entries"><div className="changelog-entry"><EntryDetails entry={entry}/></div></div>
  </article>
}
function UpdatesOverview({ data }) {
  return <section className="changelog-overview" aria-label="更新日志">
    {groupPublishedUpdates(data).map(({ date, items }) => <section className="changelog-day changelog-date-group" aria-labelledby={`date-${date}`} key={date}>
      <h2 className="changelog-event-date" id={`date-${date}`}><time dateTime={date}>{date}</time></h2>
      <div className="changelog-day-entries">
        {items.map(({ category, entry }) => <article className="changelog-entry changelog-overview-entry" id={entry.id} aria-labelledby={`entry-${entry.id}`} key={entry.id}>
          <header className="changelog-item-heading">
            <span className="changelog-category">{CHANGELOG_VIEWS[category]}</span>
            <h3 className="changelog-version" id={`entry-${entry.id}`}><a href={`#${entry.id}`}>{entry.product ? versionLabel(entry) : entry.title}</a></h3>
            {entry.product && <p className="changelog-surfaces">已发布 · {entry.release.surfaces.join(' / ')}</p>}
          </header>
          {entry.product && <EntryDetails entry={entry}/>}
        </article>)}
      </div>
    </section>)}
  </section>
}
function selectionForHash(data, hash, currentView = 'all') {
  const fragment = hash.replace(/^#/, '')
  if (Object.hasOwn(CHANGELOG_VIEWS, fragment)) return { view: fragment, anchor: null }
  const anchor = resolveChangelogAnchor(data, fragment)
  if (!anchor) return { view: 'all', anchor: null }
  // Keep in-view permalinks in their current category; older cross-category links open the overview.
  const visible = currentView === 'all' || (currentView === 'ecosystem' ? publicEvents(data) : publishedVersions(data, currentView)).some(entry => entry.id === anchor)
  return { view: visible ? currentView : 'all', anchor }
}
export function ChangelogPage({ data = changelog }) {
  const [selection, setSelection] = useState(() => selectionForHash(data, window.location.hash))
  const { view, anchor } = selection
  useEffect(() => {
    const syncSelection = () => setSelection(current => selectionForHash(data, window.location.hash, current.view))
    window.addEventListener('hashchange', syncSelection)
    return () => window.removeEventListener('hashchange', syncSelection)
  }, [data])
  useEffect(() => { if (anchor) document.getElementById(anchor)?.scrollIntoView?.({ block: 'start' }) }, [anchor, view, data])
  return <main className="changelog-page" lang="zh-CN" id="changelog-content">
    <header className="changelog-intro"><span className="changelog-eyebrow">TUYAN · CHANGELOG</span><h1>更新日志</h1></header>
    <nav className="changelog-products" aria-label="更新分类">
      {Object.entries(CHANGELOG_VIEWS).map(([id, label]) => <a href={`#${id}`} key={id} aria-current={view === id ? 'page' : undefined}>{label}</a>)}
    </nav>
    {view === 'all' ? <UpdatesOverview data={data}/> : view === 'ecosystem' ? <section className="changelog-timeline" aria-label="生态事件">
      <h2 className="changelog-group-title">生态事件</h2>
      {publicEvents(data).map(entry => <article className="changelog-day" id={entry.id} aria-label={entry.title} key={entry.id}>
        <div className="changelog-version-meta"><h3 className="changelog-event-date"><a href={`#${entry.id}`}><time dateTime={entry.date}>{entry.date}</time></a></h3><p className="changelog-surfaces">{entry.surfaces.join(' / ')}</p></div>
        <div className="changelog-day-entries"><div className="changelog-entry"><EntryDetails entry={entry}/></div></div>
      </article>)}
    </section> : <section className="changelog-timeline" aria-label={CHANGELOG_VIEWS[view]}>
      <h2 className="changelog-group-title">{CHANGELOG_VIEWS[view]}</h2>
      {view === 'tuyan' && <p className="changelog-section-note">PaperBanana 是 Tuyan 在 1.x–2.x 的历史品牌。</p>}
      {publishedVersions(data, view).map(entry => <VersionEntry entry={entry} key={entry.id}/>)}
    </section>}
  </main>
}
export default function ChangelogRoot(props) { return <SitePageShell {...props} section="changelog"><ChangelogPage/></SitePageShell> }
