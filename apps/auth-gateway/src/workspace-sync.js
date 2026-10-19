import express from 'express';
import { createHash } from 'node:crypto';
import { cleanWorkspace, resultReferences, MAX_RESULT_BYTES } from '../../../packages/api/src/workspace-sync.mjs';

import { mergeAccountHistory } from '../../../packages/api/src/workspace-history-merge.mjs';
import { newWorkspace } from '../../../packages/api/src/workspace-defaults.mjs';

const failure = (status, message) => Object.assign(new Error(message), { status });
const MAX_ACCOUNT_RESULT_BYTES = 100_000_000;
export function createWorkspaceStore({ db, assertActive = async () => {} }) {
  const key = userId => createHash('sha256').update(String(userId)).digest('hex');
  const get = async userId => {
    await assertActive(userId);
    const row = await db.collection('workspaceDocuments').findOne({ _id: key(userId) });
    return row ? { revision: row.revision, state: row.state } : { revision: 0, state: null };
  };
  const compensate = async userId => {
    try { await assertActive(userId); }
    catch (error) {
      for (const name of ['workspaceDocuments','workspaceResults','workspaceQuotas']) await db.collection(name).deleteMany({ userId });
      throw error;
    }
  };
  return {
    get,
    async identifyHistory(userId, jobs) {
      await assertActive(userId);
      return Promise.all(jobs.map(async job => {
        const execution = await db.collection('workspaceExecutions').findOne({userId,jobId:job.id});
        return execution && !execution.historical ? {...job,workspaceExecution:{taskId:execution.taskId,runId:execution.runId}} : job;
      }));
    },
    async importHistory(userId, jobs) {
      // Input is the owner-checked projection from Core (never a request body).
      // CAS retries merge onto the newest state, preserving concurrent drafts.
      jobs = await this.identifyHistory(userId, jobs);
      for (let attempt = 0; attempt < 5; attempt++) {
        const current = await get(userId);
        const before = current.state || newWorkspace('account-draft');
        const state = cleanWorkspace(mergeAccountHistory(before, jobs));
        if (current.state && JSON.stringify(state) === JSON.stringify(cleanWorkspace(current.state))) return { ...current, imported: 0 };
        try {
          const saved = await this.put(userId, current.revision, state);
          const count = value => value.tasks.reduce((n,t)=>n+t.runs.filter(r=>r.history).length,0);
          return { ...saved, state, imported: count(state)-count(before) };
        } catch (error) { if (error.status !== 409 || attempt === 4) throw error; }
      }
    },
    async put(userId, revision, input) {
      if (!Number.isSafeInteger(revision) || revision < 0) throw failure(400, 'INVALID_REVISION');
      const state = cleanWorkspace(input);
      await assertActive(userId);
      for (const resultId of resultReferences(state)) {
        if (!await db.collection('workspaceResults').findOne({ _id: `${key(userId)}:${resultId}` }, { projection: { _id: 1 } })) throw failure(400, 'RESULT_NOT_SAVED');
      }
      const collection = db.collection('workspaceDocuments');
      const document = { userId, state, revision: revision + 1, updatedAt: new Date() };
      let changed = false;
      if (!revision) {
        try { await collection.insertOne({ _id: key(userId), ...document }); changed = true; }
        catch (error) { if (error.code !== 11000) throw error; }
      } else changed = (await collection.updateOne({ _id: key(userId), revision }, { $set: document })).matchedCount === 1;
      if (!changed) throw failure(409, 'WORKSPACE_CONFLICT');
      await compensate(userId);
      return { revision: document.revision };
    },
    async saveResult(userId, { format, base64 } = {}) {
      if (!['png','svg'].includes(format) || typeof base64 !== 'string' || base64.length > Math.ceil(MAX_RESULT_BYTES/3)*4 || (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64))) throw failure(400, 'INVALID_RESULT');
      const bytes = Buffer.from(base64, 'base64');
      if (!bytes.length || bytes.length > MAX_RESULT_BYTES) throw failure(413, 'RESULT_TOO_LARGE');
      if (format === 'png' && !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw failure(400, 'INVALID_PNG');
      // SVGs are returned as data, never executable HTML or an inline document.
      if (format === 'svg') {
        const source = bytes.toString('utf8');
        const unsafeReference = [...source.matchAll(/(?:href|src)\s*=\s*(["'])(.*?)\1/gi)].some(([, , value]) => !/^(?:#[\w:.-]+|data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+)$/.test(value));
        const unsafeCss = [...source.matchAll(/url\s*\((.*?)\)/gi)].some(([, value]) => !/^["']?#[\w:.-]+["']?$/.test(value.trim()));
        if (!/<svg[\s/>]/i.test(source) || unsafeReference || unsafeCss || /<!DOCTYPE|<!ENTITY|<\?xml-stylesheet|@import|<\s*(?:[\w.-]+:)?(?:script|foreignObject|iframe|object|embed)\b|\bon\w+\s*=/i.test(source)) throw failure(400, 'UNSAFE_SVG_RESULT');
      }
      await assertActive(userId);
      const resultId = createHash('sha256').update(format).update(bytes).digest('hex'), ownerKey = key(userId), _id = `${ownerKey}:${resultId}`;
      const results = db.collection('workspaceResults'), quotas = db.collection('workspaceQuotas');
      if (await results.findOne({ _id }, { projection: { _id: 1 } })) return { resultId };
      await quotas.updateOne({ _id: ownerKey }, { $setOnInsert: { userId, bytes: 0 } }, { upsert: true });
      const reserved = await quotas.updateOne({ _id: ownerKey, bytes: { $lte: MAX_ACCOUNT_RESULT_BYTES - bytes.length } }, { $inc: { bytes: bytes.length } });
      if (!reserved.matchedCount) throw failure(413, '账号结果存储已达当前 100 MB 上限，本机结果仍保留。');
      try { await results.insertOne({ _id, userId, resultId, format, base64, size: bytes.length, createdAt: new Date() }); }
      catch (error) {
        await quotas.updateOne({ _id: ownerKey }, { $inc: { bytes: -bytes.length } });
        if (error.code !== 11000) throw error;
      }
      await compensate(userId);
      return { resultId };
    },
    async result(userId, resultId) {
      await assertActive(userId);
      if (!/^[a-f0-9]{64}$/.test(resultId)) throw failure(404, 'RESULT_NOT_FOUND');
      const row = await db.collection('workspaceResults').findOne({ _id: `${key(userId)}:${resultId}` });
      if (!row) throw failure(404, 'RESULT_NOT_FOUND');
      return { resultId, format: row.format, base64: row.base64 };
    },
  };
}

export function createWorkspaceRouter({ auth, store, frontendOrigins, isMaintenance = () => false, history }) {
  const router = express.Router(), origins = new Set(frontendOrigins);
  router.use(async (req, res, next) => {
    res.set('Cache-Control','no-store'); res.set('X-Content-Type-Options','nosniff');
    try {
      if (req.get('origin') && !origins.has(req.get('origin')) || req.method !== 'GET' && !origins.has(req.get('origin'))) throw failure(403, 'INVALID_ORIGIN');
      if (isMaintenance() && req.method !== 'GET') throw failure(503, 'MAINTENANCE');
      const session = await auth.optionalSession(req);
      if (!session?.user?.id) throw failure(401, 'SIGN_IN_REQUIRED');
      // This header never authorizes access; it prevents late requests crossing accounts.
      if (req.get('x-workspace-account') !== String(session.user.id)) throw failure(409, 'ACCOUNT_CHANGED');
      if (!store) throw failure(503, 'WORKSPACE_UNAVAILABLE');
      req.workspaceUserId = String(session.user.id); next();
    } catch (error) { next(error); }
  });
  router.use(express.json({ limit: '14mb' }));
  const route = fn => (req,res,next) => Promise.resolve(fn(req,res)).catch(next);
  router.get('/history', route(async (req,res) => { if (!history) throw failure(503,'历史任务暂时不可用'); const data=await history(req); data.jobs=await store.identifyHistory(req.workspaceUserId,data.jobs); if (!isMaintenance()) await store.importHistory(req.workspaceUserId,data.jobs); res.json(data); }));
  router.get('/history/:id', route(async (req,res) => { if (!history) throw failure(503,'历史任务暂时不可用'); res.json(await history(req,req.params.id)); }));
  router.get('/history/:id/inspect/:index', route(async(req,res)=>{if(!auth.inspectWorkspaceHistoryResult)throw failure(503,'此服务未启用历史文件检查桥');res.json(await auth.inspectWorkspaceHistoryResult(req,req.params.id,Number(req.params.index)));}));
  router.get('/history/:id/results/:index', route(async (req,res) => {
    if(!auth.readWorkspaceHistoryResult)throw failure(503,'此服务未启用历史结果读取桥。');
    res.json(await auth.readWorkspaceHistoryResult(req,req.params.id,Number(req.params.index)));
  }));
  router.get('/', route(async (req,res) => {const saved=await store.get(req.workspaceUserId);res.json(req.query.revision===String(saved.revision)?{revision:saved.revision,unchanged:true}:saved);}));
  router.put('/', route(async (req,res) => res.json(await store.put(req.workspaceUserId, req.body?.revision, req.body?.state))));
  router.post('/results', route(async (req,res) => res.json(await store.saveResult(req.workspaceUserId, req.body))));
  router.get('/results/:id', route(async (req,res) => res.json(await store.result(req.workspaceUserId, req.params.id))));
  router.use((error, _req, res, _next) => res.status(error.status || 503).json({ code: error.status || 503, error: error.status ? error.message : '工作区同步暂时不可用，草稿仍保留在本机。' }));
  return router;
}
