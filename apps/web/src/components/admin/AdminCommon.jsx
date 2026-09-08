import { Loader2, AlertTriangle } from 'lucide-react';
import { date, label } from './adminState';
import { errorText } from './adminApi';

export function State({ loading, error, data, retry, children }) {
  if (loading && !data) return <div className="ops-state" role="status"><Loader2 size={20} className="spin" />正在读取后台数据…</div>;
  if (error) return <div className="ops-state ops-error" role="alert"><AlertTriangle size={20} /><p>{errorText(error)}</p>{retry && <button onClick={retry}>重新加载</button>}</div>;
  return <>{loading && <p role="status" className="ops-muted">正在刷新数据…</p>}{children}</>;
}
export function Badge({ value, children }) { return <span className={`ops-badge ops-badge-${value || 'unknown'}`}>{children || label(value)}</span>; }
export function Identity({ id, email, go }) { return id ? <div className="ops-identity"><button className="ops-link" title={id} onClick={() => go('users', { id })}>{email || id}</button>{email && <small title={id}>{id}</small>}</div> : <span className="ops-muted">访客 / 未记录账号</span>; }
export function Pager({ pagination, change }) {
  if (!pagination) return null;
  const { page, total, totalPages, pageSize } = pagination;
  return <div className="ops-pager"><span>共 <strong>{total}</strong> 条 · 第 {page} / {Math.max(totalPages, 1)} 页</span><div><label>每页<select aria-label="每页条数" value={pageSize} onChange={(e) => change({ pageSize: Number(e.target.value), page: 1 })}>{[10, 20, 50].map((n) => <option key={n}>{n}</option>)}</select></label><button disabled={page <= 1} onClick={() => change({ page: page - 1 })}>上一页</button><button disabled={page >= totalPages} onClick={() => change({ page: page + 1 })}>下一页</button></div></div>;
}
export function Facts({ items }) { return <dl className="ops-facts">{items.map(([title, value]) => <div key={title}><dt>{title}</dt><dd>{value || '未记录'}</dd></div>)}</dl>; }
export function History({ entries = [], legacy }) {
  return <section className="ops-card"><h3>处理记录</h3>{!entries.length && <p className="ops-muted">{legacy ? '这条记录在操作历史功能上线前处理，以下为已保存的审核信息。' : '暂无运营处理记录。'}</p>}{legacy && <p>{legacy}</p>}<ol className="ops-history">{[...entries].reverse().map((e, i) => <li key={`${e.at}-${i}`}><header><Badge value={e.toStatus} /><span>{date(e.at)}</span></header><p>{e.notes || '未填写说明'}</p><small>处理人：{e.actorId} · {label(e.fromStatus)} → {label(e.toStatus)}</small>{e.changes?.length > 0 && <details><summary>查看修改前后</summary>{e.changes.map((c) => <div key={c.field}><strong>{c.field === 'adminEditedPrompt' ? '题目内容' : '能力分类'}</strong><p className="ops-pre">修改前：{c.before || '空'}</p><p className="ops-pre">修改后：{c.after || '空'}</p></div>)}</details>}</li>)}</ol></section>;
}
