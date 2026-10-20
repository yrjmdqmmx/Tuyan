import { useId, useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import WorkspaceDialog from './WorkspaceDialog.jsx';
import { indexSearchTasks, searchDestinations, searchTasks } from './workspaceSearch.js';

export default function WorkspaceSearch({ tasks, searchStateRef, capabilities, returnFocusRef, onClose, onSelect }) {
  const id = useId();
  // Typing only rerenders search; the canvas and model panels stay untouched.
  const [query, setQuery] = useState(searchStateRef.current.query);
  const [archived, setArchived] = useState(searchStateRef.current.archived);
  const taskIndex = useMemo(() => indexSearchTasks(tasks), [tasks]);
  function onQuery(value) { searchStateRef.current.query = value; setQuery(value); }
  function onArchived(value) { searchStateRef.current.archived = value; setArchived(value); }
  const destinations = searchDestinations(query, capabilities);
  const groups = [
    ['任务', searchTasks(taskIndex, query, archived)],
    ['功能', destinations.filter(entry => entry.group === '功能')],
    ['工具', destinations.filter(entry => entry.group === '工具')],
  ];
  const count = groups.reduce((sum, [,entries]) => sum + entries.length, 0);
  return <WorkspaceDialog title="搜索" className="tw-global-search" returnFocusRef={returnFocusRef} onClose={onClose}>
    <div className="tw-search-controls"><input className="tw-search-input" data-autofocus aria-label="搜索任务、功能和工具" placeholder="搜索任务、功能和工具" value={query} onChange={event => onQuery(event.target.value)} autoComplete="off" onKeyDown={event => {
      if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) {
        event.preventDefault();
        const first = groups.flatMap(([,entries]) => entries)[0];
        if (first) onSelect(first.target);
      }
    }} />
    <label className="tw-archive-filter"><input type="checkbox" checked={archived} onChange={event => onArchived(event.target.checked)} />包含旧归档和旧版移除任务</label></div>
    <p className="tw-search-count" role="status">{count ? `找到 ${count} 项` : '没有匹配的任务、功能或工具，试试其他名称或关键词。'}</p>
    {groups.filter(([,entries]) => entries.length || !query.trim()).map(([group,entries], index) => <section className="tw-search-group" key={group} aria-labelledby={`${id}-${index}`}>
      <h3 id={`${id}-${index}`}>{group}<span aria-hidden="true">{entries.length}</span></h3>
      <div className="tw-search-results">{entries.map(entry => <button type="button" key={entry.id} onClick={event => onSelect(entry.target, event)}>
        <div className="tw-search-result-text"><strong>{entry.name}</strong>{' '}<span>{entry.description}</span></div><ArrowUpRight size={16} aria-hidden="true" />
      </button>)}</div>
      {!entries.length && <p className="tw-search-empty">{query.trim() ? `没有匹配的${group}` : group === '任务' ? '还没有任务' : `暂无可用${group}`}</p>}
    </section>)}
  </WorkspaceDialog>;
}
