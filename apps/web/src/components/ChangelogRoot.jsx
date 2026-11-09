import { useAppLocale } from './BenchmarkLocale.jsx'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import changelog from '../data/changelog.json'
import { CHANGE_KINDS, CHANGELOG_VIEWS, groupChangesByTopic, groupPublishedUpdates, publishedVersions, publicEvents, resolveChangelogAnchor, versionLabel } from '../changelog.js'
import { SitePageShell } from './LeaderboardRoot.jsx'

function Sources({ entry }) {
  const { t } = useAppLocale()
  const sources = entry.sources.filter(source => source.url)
  if (!sources.length) return null
  return <details className="changelog-sources"><summary aria-label={t("查看来源：{v0}", {v0: t(entry.title)})}>{t("查看来源")}</summary>
    <div>{sources.map(source => <a href={source.url} key={source.id} target="_blank" rel="noopener noreferrer">{t(source.label)}<ExternalLink size={12} aria-hidden="true" /></a>)}</div>
  </details>
}
function ChangeSections({ changes, label }) {
  const { t } = useAppLocale()
  return CHANGE_KINDS.map(kind => {
    const items = changes.filter(change => change.kind === kind)
    return items.length ? <section className="changelog-change-group" aria-label={`${label} ${t(kind === '优化' ? '更新类型：优化' : kind)}`} key={kind}>
      <h5><span className={`changelog-kind changelog-kind-${kind}`}>{t(kind === '优化' ? '更新类型：优化' : kind)}</span></h5>
      <ul className="changelog-changes">{items.map((change, index) => <li key={index}>{t(change.text)}</li>)}</ul>
    </section> : null
  })
}
function TopicChanges({ entry, groups }) {
  const { t } = useAppLocale()
  const listRef = useRef(null)
  const label = entry.product ? versionLabel(entry) : t(entry.title)
  const setAll = open => {
    for (const details of listRef.current?.children || []) details.open = open
  }
  return <div className="changelog-topics">
    <div className="changelog-topic-toolbar">
      <span>{t('按主题浏览')}</span>
      <div role="group" aria-label={t('{version} 的更新展开控制', { version: label })}>
        <button type="button" aria-controls={`${entry.id}-topics`} onClick={() => setAll(true)}>{t('全部展开')}</button>
        <button type="button" aria-controls={`${entry.id}-topics`} onClick={() => setAll(false)}>{t('全部收起')}</button>
      </div>
    </div>
    <div className="changelog-topic-list" id={`${entry.id}-topics`} ref={listRef}>
      {groups.map(group => <details className="changelog-topic" key={group.id}>
        <summary>
          <span className="changelog-topic-heading">
            <span className="changelog-topic-title"><strong>{t(group.title)}</strong><span className="changelog-topic-count">{t('{count} 项更新', { count: group.changes.length })}</span></span>
            {group.summary && <span className="changelog-topic-summary">{t(group.summary)}</span>}
          </span>
          <ChevronDown size={18} className="changelog-topic-chevron" aria-hidden="true"/>
        </summary>
        <div className="changelog-topic-content"><ChangeSections changes={group.changes} label={`${label} ${t(group.title)}`}/></div>
      </details>)}
    </div>
  </div>
}
function EntryDetails({ entry }) {
  const { t } = useAppLocale()
  const groups = groupChangesByTopic(entry)
  return <>
    <h4>{t(entry.title)}</h4><p className="changelog-summary">{t(entry.summary)}</p>
    {entry.notes?.length > 0 && <ul className="changelog-notes">{entry.notes.map(note => <li key={note}>{t(note)}</li>)}</ul>}
    {groups.length ? <TopicChanges entry={entry} groups={groups}/> : <ChangeSections changes={entry.changes} label={entry.product ? versionLabel(entry) : t(entry.title)}/>}
    <Sources entry={entry}/>
  </>
}
function VersionEntry({ entry }) {
  const { t } = useAppLocale()
  return <article className="changelog-day" id={entry.id} aria-labelledby={`version-${entry.id}`}>
    <div className="changelog-version-meta">
      <h3 id={`version-${entry.id}`} className="changelog-version"><a href={`#${entry.id}`}>{versionLabel(entry)}</a></h3>
      <span className="changelog-release">{t("已发布 · ")}{entry.release.surfaces.map(surface => t(surface)).join(' / ')}</span>
      <p className="changelog-date"><time dateTime={entry.release.date}>{entry.release.date}</time></p>
    </div>
    <div className="changelog-day-entries"><div className="changelog-entry"><EntryDetails entry={entry}/></div></div>
  </article>
}
function UpdatesOverview({ data }) {
  const { t } = useAppLocale()
  return <section className="changelog-overview" aria-label={t("更新日志")}>
    {groupPublishedUpdates(data).map(({ date, items }) => <section className="changelog-day changelog-date-group" aria-labelledby={`date-${date}`} key={date}>
      <h2 className="changelog-event-date" id={`date-${date}`}><time dateTime={date}>{date}</time></h2>
      <div className="changelog-day-entries">
        {items.map(({ category, entry }) => <article className="changelog-entry changelog-overview-entry" id={entry.id} aria-labelledby={`entry-${entry.id}`} key={entry.id}>
          <header className="changelog-item-heading">
            <span className="changelog-category">{t(CHANGELOG_VIEWS[category])}</span>
            <h3 className="changelog-version" id={`entry-${entry.id}`}><a href={`#${entry.id}`}>{entry.product ? versionLabel(entry) : t(entry.title)}</a></h3>
            {entry.product && <p className="changelog-surfaces">{t("已发布 · ")}{entry.release.surfaces.map(surface => t(surface)).join(' / ')}</p>}
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
export function ChangelogPage({ data = changelog, embedded = false }) {
  const { t } = useAppLocale()
  const [selection, setSelection] = useState(() => selectionForHash(data, window.location.hash))
  const { view, anchor } = selection
  useEffect(() => {
    const syncSelection = () => setSelection(current => selectionForHash(data, window.location.hash, current.view))
    window.addEventListener('hashchange', syncSelection)
    window.addEventListener('popstate', syncSelection)
    return () => { window.removeEventListener('hashchange', syncSelection); window.removeEventListener('popstate', syncSelection) }
  }, [data])
  useEffect(() => { if (anchor) document.getElementById(anchor)?.scrollIntoView?.({ block: 'start' }) }, [anchor, view, data])
  return <main className="changelog-page" id="changelog-content">
    {!embedded && <header className="changelog-intro"><span className="changelog-eyebrow">TUYAN · CHANGELOG</span><h1>{t("更新日志")}</h1></header>}
    <nav className="changelog-products" aria-label={t("更新分类")}>
      {Object.entries(CHANGELOG_VIEWS).map(([id, label]) => <a href={`#${id}`} key={id} aria-current={view === id ? 'page' : undefined}>{t(label)}</a>)}
    </nav>
    {view === 'all' ? <UpdatesOverview data={data}/> : view === 'ecosystem' ? <section className="changelog-timeline" aria-label={t("生态事件")}>
      <h2 className="changelog-group-title">{t("生态事件")}</h2>
      {publicEvents(data).map(entry => <article className="changelog-day" id={entry.id} aria-label={t(entry.title)} key={entry.id}>
        <div className="changelog-version-meta"><h3 className="changelog-event-date"><a href={`#${entry.id}`}><time dateTime={entry.date}>{entry.date}</time></a></h3><p className="changelog-surfaces">{entry.surfaces.map(surface => t(surface)).join(' / ')}</p></div>
        <div className="changelog-day-entries"><div className="changelog-entry"><EntryDetails entry={entry}/></div></div>
      </article>)}
    </section> : <section className="changelog-timeline" aria-label={t(CHANGELOG_VIEWS[view])}>
      <h2 className="changelog-group-title">{t(CHANGELOG_VIEWS[view])}</h2>
      {view === 'tuyan' && <p className="changelog-section-note">{t("PaperBanana 是 Tuyan 在 1.x–2.x 的历史品牌。")}</p>}
      {publishedVersions(data, view).map(entry => <VersionEntry entry={entry} key={entry.id}/>)}
    </section>}
  </main>
}
export default function ChangelogRoot(props) { return <SitePageShell {...props} section="changelog"><ChangelogPage/></SitePageShell> }
