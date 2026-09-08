import { ObjectId } from 'mongodb';
import { redactText } from './redaction.js';

const fail = (status, message) => { throw Object.assign(new Error(message), { status, statusCode: status }); };
const text = (v, max = 200) => {
  if (v == null) return '';
  if (typeof v !== 'string' || v.length > max) fail(400, '字段格式或长度不正确');
  return v.trim();
};
const safe = (v, max = 200) => redactText(String(v ?? '')).slice(0, max);
const literal = (v) => new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const ids = (values) => values.flatMap((v) => /^[0-9a-f]{24}$/i.test(v) ? [v, new ObjectId(v)] : [v]);
const mask = (value) => { const s = safe(value, 300), at = s.indexOf('@'); return at > 0 ? `${s.slice(0, 1)}***${s.slice(at)}` : s ? `${s.slice(0, 1)}***` : ''; };

function timeFilter(input) {
  const parse = (v) => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(v) || !Number.isFinite(Date.parse(v))) fail(400, '时间必须为 UTC ISO 格式');
    const date = new Date(v);
    if (date.toISOString() !== (v.includes('.') ? v : `${v.slice(0, -1)}.000Z`)) fail(400, '日期不正确');
    return date;
  };
  const from = text(input.from, 40), to = text(input.to, 40), start = from ? parse(from) : null, end = to ? parse(to) : null;
  if (start && end && start >= end) fail(400, '结束时间必须晚于开始时间');
  return start || end ? { createdAt: { ...(start ? { $gte: start } : {}), ...(end ? { $lt: end } : {}) } } : {};
}
const userProjection = { _id: 1, email: 1, name: 1, emailVerified: 1, createdAt: 1, updatedAt: 1 };
const lifecycleLookup = [
  { $lookup: { from: 'accountDeletionOperations', let: { identity: { $toString: '$_id' } }, pipeline: [
    { $match: { $expr: { $eq: ['$_id', '$$identity'] } } }, { $project: { _id: 0, status: 1, phase: 1, createdAt: 1, updatedAt: 1, lastErrorCode: 1 } }, { $limit: 1 },
  ], as: 'deletion' } },
  { $set: { lifecycleStatus: { $ifNull: [{ $arrayElemAt: ['$deletion.status', 0] }, 'active'] } } },
];

// Identity is the immutable Better Auth user id. Account.providerId describes
// login methods; feedback contact is intentionally not treated as verified data.
export function createAdminAccounts(db, now = () => new Date()) {
  const users = db.collection('user');
  async function enrich(rows, reveal = false) {
    const userIds = ids(rows.map((row) => String(row._id)));
    if (!userIds.length) return [];
    const [accounts, sessions] = await Promise.all([
      db.collection('account').find({ userId: { $in: userIds } }, { projection: { _id: 0, userId: 1, providerId: 1, createdAt: 1 } }).toArray(),
      db.collection('session').aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: { $toString: '$userId' }, latestRetainedLoginAt: { $max: '$createdAt' }, activeSessions: { $sum: { $cond: [{ $gt: ['$expiresAt', now()] }, 1, 0] } } } },
      ], { maxTimeMS: 10000 }).toArray(),
    ]);
    const sessionMap = new Map(sessions.map((row) => [String(row._id), row]));
    return rows.map((row) => {
      const id = String(row._id), session = sessionMap.get(id), deletion = row.deletion?.[0];
      return {
        id, name: safe(row.name), email: reveal ? safe(row.email, 300) : mask(row.email), emailVerified: row.emailVerified === true,
        createdAt: row.createdAt ?? null, updatedAt: row.updatedAt ?? null, status: row.lifecycleStatus || 'active',
        loginMethods: [...new Set(accounts.filter((a) => String(a.userId) === id).map((a) => safe(a.providerId)))],
        activeSessions: Number(session?.activeSessions || 0), latestRetainedLoginAt: session?.latestRetainedLoginAt || null,
        ...(deletion ? { deletion: { status: safe(deletion.status), phase: safe(deletion.phase), updatedAt: deletion.updatedAt, lastErrorCode: safe(deletion.lastErrorCode) } } : {}),
      };
    });
  }
  return {
    async overview(input) {
      const range = timeFilter(input);
      const [total, registered] = await Promise.all([users.countDocuments({}, { maxTimeMS: 10000 }), users.countDocuments(range, { maxTimeMS: 10000 })]);
      return { total, registered, asOf: now() };
    },
    async list(input, contactUserIds = []) {
      const page = Number(input.page ?? 1), pageSize = Number(input.pageSize ?? 20);
      if (!Number.isInteger(page) || page < 1 || page > 100000 || ![10, 20, 50].includes(pageSize)) fail(400, '分页参数不正确');
      const q = text(input.q, 120), searchBy = text(input.searchBy) || 'identity', verified = text(input.verified), status = text(input.status), sort = text(input.sort) || 'newest';
      if (!['identity', 'contact'].includes(searchBy) || !['', 'verified', 'unverified'].includes(verified) || !['', 'active', 'pending', 'review_required', 'completed'].includes(status) || !['newest', 'oldest'].includes(sort)) fail(400, '不支持的筛选条件');
      const filters = [timeFilter(input)];
      if (q) {
        if (searchBy === 'contact') filters.push({ _id: { $in: ids(contactUserIds) } });
        else filters.push({ $or: [{ _id: { $in: ids([q]) } }, { email: literal(q) }, { name: literal(q) }] });
      }
      if (verified) filters.push(verified === 'verified' ? { emailVerified: true } : { emailVerified: { $ne: true } });
      const order = { createdAt: sort === 'oldest' ? 1 : -1, _id: sort === 'oldest' ? 1 : -1 };
      const stages = [{ $match: { $and: filters } }];
      // Ordinary lists can use the createdAt index and only join lifecycle on
      // the requested page. A lifecycle filter necessarily joins before count.
      if (status) stages.push({ $project: userProjection }, ...lifecycleLookup, { $match: { lifecycleStatus: status } });
      stages.push({ $sort: order });
      const [result] = await users.aggregate([...stages, { $facet: { count: [{ $count: 'total' }], rows: [
        { $skip: (page - 1) * pageSize }, { $limit: pageSize }, ...(!status ? [{ $project: userProjection }, ...lifecycleLookup] : []),
      ] } }], { maxTimeMS: 10000 }).toArray();
      const total = result?.count?.[0]?.total || 0;
      return { rows: await enrich(result?.rows || []), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    },
    async detail(input) {
      const id = text(input.id);
      if (!id) fail(400, '缺少用户 ID');
      const rows = await users.aggregate([{ $match: { _id: { $in: ids([id]) } } }, { $project: userProjection }, ...lifecycleLookup], { maxTimeMS: 10000 }).toArray();
      if (!rows.length) fail(404, '账号不存在或已注销；历史关联记录仍可按用户 ID 查询');
      return { user: (await enrich(rows, input.revealContact === true))[0] };
    },
  };
}
