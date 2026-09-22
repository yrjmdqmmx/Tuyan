import { useEffect, useState } from 'react'
import { ExternalLink, Search, X } from 'lucide-react'
import changelog from '../data/changelog.json'
import { filterChangelog } from '../changelog.js'
import { SitePageShell } from './LeaderboardRoot.jsx'

export function ChangelogPage({ data = changelog }) {
  const [query, setQuery] = useState('')
  const entries = filterChangelog(data.entries, query)
  const dates = [...new Set(entries.map(entry => entry.date))]
  useEffect(() => {
    // The route is loaded on demand, after the browser's initial fragment jump.
    const id = window.location.hash.slice(1)
    if (data.entries.some(entry => entry.id === id)) document.getElementById(id)?.scrollIntoView?.({ block: 'start' })
  }, [data])

  return <main className="changelog-page" lang="zh-CN" id="changelog-content">
    <header className="changelog-intro">
      <span className="changelog-eyebrow">TUYAN · CHANGELOG</span>
      <h1>更新日志</h1>
      <p className="changelog-lead">图研的每一步改进，都有迹可循。</p>
      <p className="changelog-coverage">{data.coverage.description}</p>
    </header>
    <div className="changelog-toolbar">
      <label className="changelog-search">
        <Search size={17} aria-hidden="true" />
        <span className="changelog-sr-only">搜索更新日志</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索功能、模型或日期" />
        {query && <button type="button" aria-label="清除搜索" onClick={() => setQuery('')}><X size={16} /></button>}
      </label>
      <span className="changelog-count" role="status">{query.trim() ? `找到 ${entries.length} 条更新` : `${entries.length} 条更新`}</span>
    </div>
    {dates.length ? <div className="changelog-timeline">
      {dates.map(date => <section className="changelog-day" key={date} aria-labelledby={`date-${date}`}>
        <h2 id={`date-${date}`} className="changelog-date"><time dateTime={date}>{date}</time></h2>
        <div className="changelog-day-entries">
          {entries.filter(entry => entry.date === date).map(entry => <article className="changelog-entry" id={entry.id} key={entry.id} aria-labelledby={`title-${entry.id}`}>
            <h3 id={`title-${entry.id}`}><a href={`#${entry.id}`}>{entry.title}</a></h3>
            <p className="changelog-summary">{entry.summary}</p>
            <ul className="changelog-changes">
              {entry.changes.map((change, index) => <li key={index}><span className={`changelog-kind changelog-kind-${change.kind}`}>{change.kind}</span><span>{change.text}</span></li>)}
            </ul>
            <details className="changelog-sources">
              <summary aria-label={`查看来源：${entry.title}`}>查看来源</summary>
              <div>{entry.sources.map(source => <a href={source.url} key={source.url} target="_blank" rel="noopener noreferrer">{source.label}<ExternalLink size={12} aria-hidden="true" /></a>)}</div>
            </details>
          </article>)}
        </div>
      </section>)}
    </div> : <div className="changelog-empty"><h2>未找到相关更新</h2><p>试试“精修”“排行榜”或日期。</p><button type="button" onClick={() => setQuery('')}>查看全部更新</button></div>}
    <footer className="changelog-footer">以上为发布时的历史记录，具体可用能力请以当前页面与所选模型为准。</footer>
  </main>
}

export default function ChangelogRoot(props) {
  return <SitePageShell {...props} section="changelog"><ChangelogPage /></SitePageShell>
}
