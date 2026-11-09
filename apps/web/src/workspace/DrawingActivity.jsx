import MenuSelect from '../components/MenuSelect.jsx';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { shiftDrawingDay } from '../../../../packages/api/src/drawing-activity.mjs';

const number = value => Number(value).toLocaleString('zh-CN');
const dateLabel = date => `${date.slice(0, 4)} 年 ${Number(date.slice(5, 7))} 月 ${Number(date.slice(8, 10))} 日`;
const compactDate = date => `${date.slice(0, 4)}年${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日`;
const shortDate = date => `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日`;

function ActivityTooltip({ id, target, onDismiss }) {
  const ref = useRef(null);
  const [position, setPosition] = useState(null);
  useLayoutEffect(() => {
    const anchor = target.element.getBoundingClientRect();
    const box = ref.current.getBoundingClientRect();
    const gap = 10, margin = 8;
    const left = Math.max(margin, Math.min(anchor.left + anchor.width / 2 - box.width / 2, window.innerWidth - box.width - margin));
    const top = anchor.top >= box.height + gap + margin ? anchor.top - box.height - gap : anchor.bottom + gap;
    setPosition({ left, top: Math.max(margin, Math.min(top, window.innerHeight - box.height - margin)) });
  }, [target]);
  useEffect(() => {
    const escape = event => { if (event.key === 'Escape') onDismiss(); };
    const outside = event => { if (!target.element.contains(event.target)) onDismiss(); };
    window.addEventListener('scroll', onDismiss, true);
    window.addEventListener('resize', onDismiss);
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    return () => {
      window.removeEventListener('scroll', onDismiss, true);
      window.removeEventListener('resize', onDismiss);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerdown', outside);
    };
  }, [target, onDismiss]);
  return createPortal(<div ref={ref} id={id} role="tooltip" className="tw-activity-tooltip" style={position || { visibility: 'hidden' }}>
    <span>{target.label}</span><span>{number(target.count)} 张图</span>
  </div>, document.body);
}

export default function DrawingActivity({ userId, request }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const [mode, setMode] = useState('daily'), [period, setPeriod] = useState('recent'), [selected, setSelected] = useState('');
  const [tooltip, setTooltip] = useState(null);
  const tooltipId = useId();
  const dismissTooltip = useCallback(() => setTooltip(null), []);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(''); setSelected(''); setTooltip(null);
    request('/activity', undefined, controller.signal).then(value => {
      if (!controller.signal.aborted) { setData(value); setSelected(value.today); }
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [userId, request, revision]);
  const series = useMemo(() => {
    if (!data) return [];
    const start = period === 'recent' ? shiftDrawingDay(data.today, -364) : `${period}-01-01`;
    const end = period === 'recent' ? data.today : (`${period}-12-31` < data.today ? `${period}-12-31` : data.today);
    const counts = new Map(data.days.map(d => [d.date, d.count]));
    let cumulative = data.days.filter(d => d.date < start).reduce((n, d) => n + d.count, 0);
    const result = [];
    for (let date = start; date <= end; date = shiftDrawingDay(date, 1)) {
      const count = counts.get(date) || 0;
      cumulative += count;
      result.push({ date, count, cumulative });
    }
    return result;
  }, [data, period]);
  const weeks = useMemo(() => {
    const result = [];
    for (const day of series) {
      const sunday = shiftDrawingDay(day.date, -new Date(`${day.date}T00:00:00Z`).getUTCDay());
      let week = result.at(-1);
      if (week?.key !== sunday) { week = { key: sunday, date: day.date, end: day.date, count: 0 }; result.push(week); }
      week.end = day.date;
      week.count += day.count;
      week.cumulative = day.cumulative;
    }
    return result;
  }, [series]);
  const max = Math.max(1, ...series.map(d => d.count));
  const columnMax = Math.max(1, ...weeks.map(w => mode === 'cumulative' ? w.cumulative : w.count));
  const active = series.find(d => d.date === selected) || series.at(-1);
  const years = data ? [...new Set(data.days.map(d => d.date.slice(0, 4)).concat(data.today.slice(0, 4)))].sort().reverse() : [];
  const offset = series[0] ? new Date(`${series[0].date}T00:00:00Z`).getUTCDay() : 0;
  const columns = weeks.length;

  function targetProps(key, label, count, date) {
    const show = event => { setSelected(date); setTooltip({ key, label, count, element: event.currentTarget }); };
    return {
      'aria-describedby': tooltip?.key === key ? tooltipId : undefined,
      'data-active': tooltip?.key === key || undefined,
      onMouseEnter: show, onMouseLeave: dismissTooltip,
      onFocus: show, onBlur: dismissTooltip, onClick: show,
    };
  }
  function moveCell(event, index) {
    const delta = { ArrowRight: 7, ArrowLeft: -7, ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    const next = Math.max(0, Math.min(series.length - 1, index + delta));
    event.currentTarget.parentElement.querySelector(`[data-date="${series[next].date}"]`)?.focus();
  }
  function moveWeek(event, index) {
    const delta = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    const next = Math.max(0, Math.min(weeks.length - 1, index + delta));
    event.currentTarget.parentElement.querySelector(`[data-week="${weeks[next].key}"]`)?.focus();
  }

  return <section className="tw-drawing-activity" aria-labelledby="drawing-activity-heading">
    <dl className="tw-drawing-stats">{[['累计绘制数量', data?.total, '张'], ['绘制数量峰值', data?.peak, '张 / 天'], ['最长连续天数', data?.longestStreak, '天'], ['当前连续天数', data?.currentStreak, '天']].map(([label, value, unit]) =>
      <div key={label}><dd>{value === undefined ? '—' : number(value)} <small>{unit}</small></dd><dt>{label}</dt></div>)}</dl>
    <div className="tw-activity-heading">
      <h3 id="drawing-activity-heading">绘制活动</h3>
      <div className="tw-activity-controls">
        <MenuSelect aria-label="活动时间范围" value={period} onChange={e => { setPeriod(e.target.value); setSelected(''); dismissTooltip(); }}>
          <option value="recent">近 12 个月</option>{years.map(year => <option key={year} value={year}>{year} 年</option>)}
        </MenuSelect>
        <div className="tw-activity-tabs" role="group" aria-label="绘制活动视图">
          {[['daily', '每天'], ['weekly', '每周'], ['cumulative', '累计总量']].map(([value, label]) =>
            <button type="button" key={value} aria-pressed={mode === value} onClick={() => { setMode(value); dismissTooltip(); }}>{label}</button>)}
        </div>
      </div>
    </div>
    {error ? <p role="alert">{error} <button type="button" onClick={() => setRevision(r => r + 1)}>重新加载</button></p>
      : !data ? <p role="status">正在读取绘制记录…</p> : <>
        <div className="tw-activity-scroll">
          <div className="tw-heatmap" style={{ '--activity-columns': columns }}>
            {mode === 'daily' ? <div className="tw-heatmap-cells" role="group" aria-label="每日绘制数量，方向键切换日期">
              {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} aria-hidden="true" />)}
              {series.map((day, index) => <button type="button" key={day.date} data-date={day.date}
                data-level={day.count === 0 ? 0 : Math.min(4, Math.ceil(day.count / max * 4))}
                tabIndex={active?.date === day.date ? 0 : -1} aria-label={`${dateLabel(day.date)}，绘制 ${number(day.count)} 张`}
                {...targetProps(day.date, shortDate(day.date), day.count, day.date)} onKeyDown={e => moveCell(e, index)} />)}
            </div> : <div className="tw-activity-columns" role="group" aria-label={mode === 'weekly' ? '每周绘制数量' : '累计绘制数量随周次变化'}>
              {weeks.map((week, index) => {
                const count = mode === 'cumulative' ? week.cumulative : week.count;
                const label = `${mode === 'cumulative' ? '累计至 ' : ''}${compactDate(week.key)} 起的一周`;
                const filled = count === 0 ? 0 : Math.max(1, Math.round(count / columnMax * 7));
                return <button key={week.key} type="button" className="tw-activity-column" data-week={week.key}
                  aria-label={`${label}，${mode === 'cumulative' ? '累计' : '绘制'} ${number(count)} 张`}
                  tabIndex={active && week.date <= active.date && week.end >= active.date ? 0 : -1}
                  {...targetProps(week.key, label, count, week.end)} onKeyDown={e => moveWeek(e, index)}>
                  {Array.from({ length: 7 }, (_, row) => <span key={row} aria-hidden="true" data-filled={row >= 7 - filled} />)}
                </button>;
              })}
            </div>}
            <div className="tw-heatmap-months" aria-hidden="true">
              {series.map((day, index) => ((index === 0 && Number(day.date.slice(8, 10)) <= 7) || day.date.endsWith('-01')) &&
                <span key={day.date} style={{ gridColumn: Math.floor((index + offset) / 7) + 1 }}>{Number(day.date.slice(5, 7))}月</span>)}
            </div>
          </div>
        </div>
        {data.total === 0 && <p className="tw-muted">还没有成功交付的绘图记录。完成第一张图后，这里会亮起。</p>}
      </>}
    {tooltip && <ActivityTooltip id={tooltipId} target={tooltip} onDismiss={dismissTooltip} />}
  </section>;
}
