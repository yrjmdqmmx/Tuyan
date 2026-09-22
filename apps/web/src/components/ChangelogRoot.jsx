import { useEffect, useState } from 'react'
import { ExternalLink, Search, X } from 'lucide-react'
import changelog from '../data/changelog.json'
import { CHANGE_KINDS, CHANGE_STATES, RELEASE_STATES, filterChangelog, resolveChangelogAnchor } from '../changelog.js'
import { SitePageShell } from './LeaderboardRoot.jsx'

function Sources({entry}) {
  return <details className="changelog-sources"><summary aria-label={`查看来源：${entry.title || entry.summary}`}>查看来源</summary>
    <div>{entry.sources.map(source => source.url ? <a href={source.url} key={source.id} target="_blank" rel="noopener noreferrer">{source.label}<ExternalLink size={12} aria-hidden="true" /></a> : <span key={source.id}>{source.label}</span>)}</div>
  </details>
}
function VersionEntry({entry}) {
  return <article className="changelog-day" id={entry.id} aria-labelledby={`version-${entry.id}`}>
    <div className="changelog-version-meta">
      <h3 id={`version-${entry.id}`} className="changelog-version"><a href={`#${entry.id}`}>v{entry.version}</a></h3>
      <span className={`changelog-release changelog-release-${entry.release.status}`}>{RELEASE_STATES[entry.release.status]}{entry.release.surfaces?.length ? ` · ${entry.release.surfaces.join(' / ')}` : ''}</span>
      {entry.release.date ? <p className="changelog-date">发布于 <time dateTime={entry.release.date}>{entry.release.date}</time></p> : <p className="changelog-date">{entry.release.status === 'unreleased' ? '正式发布日期待定' : '发布日期待核实'}</p>}
      {entry.announcementDate && <p className="changelog-announcement">公告记录 <time dateTime={entry.announcementDate}>{entry.announcementDate}</time></p>}
      <p className="changelog-surfaces">{entry.surfaces.join(' / ')}</p>
    </div>
    <div className="changelog-day-entries"><div className="changelog-entry">
      <h4>{entry.title}</h4><p className="changelog-summary">{entry.summary}</p>
      {entry.notes.length > 0 && <ul className="changelog-notes">{entry.notes.map(note=><li key={note}>{note}</li>)}</ul>}
      {CHANGE_KINDS.map(kind => {
        const changes=entry.changes.filter(change=>change.kind===kind)
        return changes.length ? <section className="changelog-change-group" aria-label={`${entry.version} ${kind}`} key={kind}>
          <h5><span className={`changelog-kind changelog-kind-${kind}`}>{kind}</span></h5>
          <ul className="changelog-changes">{changes.map((change,index)=><li key={index}>
            <div>{change.text}{(entry.release.status !== 'released' || change.state !== 'released' || change.surfaces) && <div className="changelog-change-meta">
              {change.surfaces && <span>{change.surfaces.join(' / ')}</span>}
              {(entry.release.status !== 'released' || change.state !== 'released') && <span className={`changelog-change-state changelog-change-state-${change.state}`}>{CHANGE_STATES[change.state]}</span>}
            </div>}</div>
          </li>)}</ul>
        </section> : null
      })}
      <Sources entry={entry}/>
    </div></div>
  </article>
}
export function ChangelogPage({ data = changelog }) {
  const [query, setQuery] = useState('')
  const entries=filterChangelog(data.entries,query), unassigned=filterChangelog(data.unassigned || [],query)
  const pending=entries.filter(entry=>entry.release.status==='unreleased'), history=entries.filter(entry=>entry.release.status!=='unreleased')
  useEffect(()=>{
    const id=resolveChangelogAnchor(data,window.location.hash.slice(1))
    if(id) document.getElementById(id)?.scrollIntoView?.({block:'start'})
  },[data])
  return <main className="changelog-page" lang="zh-CN" id="changelog-content">
    <header className="changelog-intro"><span className="changelog-eyebrow">TUYAN · CHANGELOG</span><h1>更新日志</h1>
      <p className="changelog-lead">按版本回顾图研的新增、优化与修复。</p><p className="changelog-coverage">{data.coverage.description}</p>
    </header>
    <div className="changelog-toolbar"><label className="changelog-search"><Search size={17} aria-hidden="true"/><span className="changelog-sr-only">搜索更新日志</span>
      <input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="搜索版本、功能、模型或日期"/>
      {query && <button type="button" aria-label="清除搜索" onClick={()=>setQuery('')}><X size={16}/></button>}
    </label><span className="changelog-count" role="status">{query.trim()?'找到 ':''}{entries.length} 个版本{unassigned.length ? ` · ${unassigned.length} 项归属待核实` : ''}</span></div>
    {pending.length>0 && <section className="changelog-pending" aria-label="待发布版本"><h2 className="changelog-group-title">待发布版本</h2><p className="changelog-section-note">下列版本尚未正式发布。条目分别标明开发、验证和此前上线状态，不代表整个版本已上线。</p>{pending.map(entry=><VersionEntry entry={entry} key={entry.id}/>)}</section>}
    {history.length>0 && <section className="changelog-timeline" aria-label="历史版本"><h2 className="changelog-group-title">历史版本</h2>{history.map(entry=><VersionEntry entry={entry} key={entry.id}/>)}</section>}
    {unassigned.length>0 && <section className="changelog-unassigned" aria-label="版本归属待核实"><h2 className="changelog-group-title">版本归属待核实</h2><p className="changelog-section-note">保留历史内容，待确认对应的图研版本后再归档；不另设独立产品版本线。</p>{unassigned.map(entry=><div className="changelog-unassigned-entry" id={entry.id} key={entry.id}><h3>{entry.summary}</h3><p className="changelog-announcement">公告记录 {entry.announcementDate || '日期待核实'}</p><p>{entry.note}</p><Sources entry={entry}/></div>)}</section>}
    {!entries.length&&!unassigned.length&&<div className="changelog-empty"><h2>未找到相关更新</h2><p>试试版本号、“精修”或“排行榜”。</p><button type="button" onClick={()=>setQuery('')}>查看全部更新</button></div>}
    <footer className="changelog-footer">版本归属与发布状态分别核对。公告日期不等于实际发布日期；历史功能不代表当前所有渠道、型号或客户端均可用。</footer>
  </main>
}
export default function ChangelogRoot(props) { return <SitePageShell {...props} section="changelog"><ChangelogPage/></SitePageShell> }
