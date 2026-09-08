export const SECTIONS = [
  ['overview', '运营总览'], ['users', '账号与用户'], ['jobs', '近期任务'], ['community', '社区评估题'], ['feedback', '用户反馈'], ['benchmark', '评测运行'],
];
export const LABELS = {
  reserved: '预留中', queued: '排队中', running: '执行中', succeeded: '成功', failed: '失败',
  active: '正常', pending: '待处理', review_required: '注销待复核', completed: '注销已完成',
  grouped: '已归组', candidate: '待审核候选', approved_for_next_suite: '已通过 · 下期候选', merged: '已合并', rejected: '已拒绝',
  unreviewed: '未跟进', followup: '跟进中', resolved: '已处理', generate: '生成', refine: '精修',
  credential: '邮箱密码', github: 'GitHub', verified: '已验证', unverified: '未验证', open: '全部待审核', new: '新反馈',
};
export const JOB_STATES = ['reserved', 'queued', 'running', 'succeeded', 'failed'];
export const REVIEW_STATES = ['open', 'pending', 'grouped', 'candidate', 'approved_for_next_suite', 'merged', 'rejected'];
export const OPEN_REVIEW = ['pending', 'grouped', 'candidate'];
export const label = (value) => LABELS[value] || value || '未记录';
export const date = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '未记录';
export const duration = (ms) => ms == null ? '尚无完成耗时' : ms < 1000 ? `${ms} 毫秒` : ms < 60000 ? `${(ms / 1000).toFixed(1)} 秒` : `${(ms / 60000).toFixed(1)} 分钟`;
const ADMIN_FIELDS = new Set(['q', 'page', 'pageSize', 'status', 'type', 'model', 'followup', 'userId', 'id', 'searchBy', 'verified', 'sort', 'category', 'fromDate', 'toDate', 'range']);
export function readAdminLocation(defaultSection = 'overview') {
  const params = new URLSearchParams(window.location.search);
  const section = params.get('admin');
  return { section: SECTIONS.some(([id]) => id === section) ? section : defaultSection, ...Object.fromEntries([...params].filter(([key]) => key.startsWith('a_') && ADMIN_FIELDS.has(key.slice(2))).map(([key, value]) => [key.slice(2), value])) };
}
export function adminUrl(state) {
  const url = new URL(window.location.href);
  for (const key of [...url.searchParams.keys()]) if (key === 'admin' || key.startsWith('a_')) url.searchParams.delete(key);
  url.searchParams.set('admin', state.section);
  for (const [key, value] of Object.entries(state)) if (ADMIN_FIELDS.has(key) && value !== '' && value != null) url.searchParams.set(`a_${key}`, String(value));
  return `${url.pathname}${url.search}${url.hash}`;
}
export function queryFor(state) {
  const { section, id, fromDate, toDate, range, ...query } = state;
  if ([fromDate, toDate].some((v) => v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(`${v}T00:00:00`)) || new Date(v).toISOString().slice(0, 10) !== v))) return { ...query, from: 'invalid' };
  if (fromDate) query.from = new Date(`${fromDate}T00:00:00`).toISOString();
  if (toDate) { const end = new Date(`${toDate}T00:00:00`); end.setDate(end.getDate() + 1); query.to = end.toISOString(); }
  return query;
}
export function rangeDates(days, now = new Date()) {
  const local = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const start = new Date(now); start.setDate(start.getDate() - days + 1);
  return days ? { fromDate: local(start), toDate: local(now) } : { fromDate: '', toDate: '' };
}
