import { normalizeUniversalConnection, normalizeUniversalRoute } from './universal-contract.js';
import express from 'express';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const fail = (status, message) => Object.assign(new Error(message), { status });
const text = (value, max = 160) => typeof value === 'string' && value.length <= max ? value : (() => { throw fail(400, '模型库字段无效'); })();
const id = value => /^[\w-]{1,160}$/.test(text(value)) && !['__proto__','prototype','constructor'].includes(value) ? value : (() => { throw fail(400, '模型库标识无效'); })();
export function cleanModelLibrary(input) {
  try {
  if (!Array.isArray(input?.connections) || input.connections.length > 64 || !Array.isArray(input?.models) || input.models.length > 500) throw fail(400, '模型库超过容量或格式无效');
  const connections = input.connections.map(c => {
    if (!['browser', 'account', 'authorization'].includes(c.scope) || (c.provider === 'tokendance') !== (c.scope === 'authorization')) throw fail(400, '连接保存范围无效');
    return { id: id(c.id), provider: id(c.provider), label: text(c.label, 100), scope: c.scope, region: c.region === 'cn' ? 'cn' : 'global', disabled: c.disabled === true, ...(c.provider === 'custom' ? { custom: normalizeUniversalConnection({ ...c.custom, connectionId: c.id }), ...(Number.isSafeInteger(c.expiresAt)?{expiresAt:c.expiresAt}:{}) } : {}) };
  });
  const models = input.models.map(m => ({ id: id(m.id), connectionId: id(m.connectionId), modelId: text(m.modelId, 500), disabled: m.disabled === true, ...(connections.find(c=>c.id===m.connectionId)?.provider === 'custom' ? { custom: normalizeUniversalRoute({ accessProvider:'custom', modelId:m.modelId, custom:m.custom }).custom } : {}) }));
  if (new Set(connections.map(c => c.id)).size !== connections.length || new Set(models.map(m => m.id)).size !== models.length || models.some(m => !m.modelId || !connections.some(c => c.id === m.connectionId))) throw fail(400, '模型与连接关系无效');
  return { connections, models };
  } catch (error) { throw error.status ? error : fail(400, '模型库自定义接口配置无效'); }
}

// Secrets never leave this store. Browser-scoped secrets are not accepted here.
export function createModelLibraryStore({ db, secret, assertActive = async () => {} }) {
  const collection = db.collection('workspaceModelLibraries');
  const key = createHash('sha256').update('tuyan-model-library-v1\0').update(secret).digest();
  const owner = user => createHash('sha256').update(String(user)).digest('hex');
  const publicRow = row => ({ revision: row?.revision || 0, connections: (row?.connections || []).map(c => ({ ...c, hasCredential: c.scope === 'account' && !!row.sealed?.[c.id] })), models: row?.models || [] });
  return {
    async resolve(user, connectionId) {
      await assertActive(user);
      const row = await collection.findOne({ _id: owner(user) }), c = row?.connections.find(c => c.id === connectionId && !c.disabled);
      if (!c) throw fail(400, '连接已停用或不存在');
      if (c.scope !== 'account') return null;
      const sealed = row.sealed?.[connectionId]; if (!sealed) throw fail(400, '账号连接缺少密钥');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(sealed.iv, 'base64'));
      decipher.setAAD(Buffer.from(`${owner(user)}/${connectionId}`)); decipher.setAuthTag(Buffer.from(sealed.tag, 'base64'));
      return Buffer.concat([decipher.update(Buffer.from(sealed.data, 'base64')), decipher.final()]).toString('utf8');
    },
    async get(user) { await assertActive(user); return publicRow(await collection.findOne({ _id: owner(user) })); },
    async put(user, input) {
      const data = cleanModelLibrary(input);
      if (!Number.isSafeInteger(input.revision) || input.revision < 0) throw fail(400, '无效版本');
      await assertActive(user);
      const _id = owner(user), previous = await collection.findOne({ _id });
      if ((previous?.revision || 0) !== input.revision) throw fail(409, '模型库已在其他页面更新，请刷新后重试。');
      const sealed = Object.fromEntries(data.connections.filter(c => c.scope === 'account' && previous?.connections.some(old => old.id === c.id && old.provider === c.provider && old.region === c.region && old.scope === c.scope && JSON.stringify(old.custom) === JSON.stringify(c.custom)) && previous?.sealed?.[c.id]).map(c => [c.id, previous.sealed[c.id]]));
      for (const [connectionId, value] of Object.entries(input.credentials || {})) {
        const c = data.connections.find(c => c.id === connectionId);
        if (!c || c.scope !== 'account') throw fail(400, '浏览器密钥不得上传到账号');
        const credential = text(value, 16384).trim();
        if (!credential) throw fail(400, '密钥不能为空');
        const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
        cipher.setAAD(Buffer.from(`${_id}/${connectionId}`));
        const encrypted = Buffer.concat([cipher.update(credential, 'utf8'), cipher.final()]);
        sealed[connectionId] = { iv: iv.toString('base64'), data: encrypted.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
      }
      const row = { _id, userId: user, ...data, sealed, revision: input.revision + 1 };
      if (!previous) { try { await collection.insertOne(row); } catch (error) { if (error.code === 11000) throw fail(409, '模型库已更新，请刷新后重试。'); throw error; } }
      else if (!(await collection.replaceOne({ _id, revision: input.revision }, row)).matchedCount) throw fail(409, '模型库已更新，请刷新后重试。');
      try { await assertActive(user); } catch (error) { await collection.deleteMany({ userId: user }); throw error; }
      return publicRow(row);
    },
  };
}

export function createModelLibraryRouter({ auth, store, frontendOrigins, isMaintenance = () => false }) {
  const router = express.Router(), origins = new Set(frontendOrigins);
  router.use(async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      if (req.get('origin') && !origins.has(req.get('origin')) || req.method !== 'GET' && !origins.has(req.get('origin'))) throw fail(403, 'INVALID_ORIGIN');
      if (req.method !== 'GET' && isMaintenance()) throw fail(503, 'MAINTENANCE');
      const session = await auth.optionalSession(req);
      if (!session?.user?.id) throw fail(401, '请先登录图研');
      if (req.get('x-workspace-account') !== String(session.user.id)) throw fail(409, '账号已切换，请重新打开模型管理');
      if (!store) throw fail(503, '模型库暂时不可用');
      req.modelOwner = String(session.user.id); next();
    } catch (error) { next(error); }
  });
  router.use(express.json({ limit: '256kb' }));
  router.get('/', (req, res, next) => store.get(req.modelOwner).then(data => res.json(data)).catch(next));
  router.put('/', (req, res, next) => store.put(req.modelOwner, req.body).then(data => res.json(data)).catch(next));
  router.use((error, req, res, next) => res.status(error.status || 503).json({ error: error.publicMessage ? error.message : error.status === 400 ? '模型库请求格式无效' : error.status === 413 ? '模型库请求超过容量' : '模型库保存失败，请重试' }));
  return router;
}
