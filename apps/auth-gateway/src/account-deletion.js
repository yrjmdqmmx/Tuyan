import { randomUUID } from 'node:crypto';
import { authUserFilter } from './account-verification.js';

const VERSION = 3;
const pending = (phase = 'waiting', error = 'ACCOUNT_DELETION_PROCESSING') => ({
  status: 202, data: { code: 202, accepted: true, state: 'deleting', phase, error, retryAfterSeconds: 30 },
});
const valid = (result) => result?.status >= 200 && result.status < 300 && result.data?.code === 0;

// This collection is in the Auth database so deleting Auth and advancing to
// acknowledgement can be committed in one transaction (see deleteAuthUser).
export function createDeletionStore(collection, now = () => new Date(), { mongoClient, users } = {}) {
  if (Boolean(mongoClient) !== Boolean(users)) throw new Error('ACCOUNT_DELETION_TRANSACTION_CONFIGURATION_REQUIRED');
  return {
    async begin(userId, accountGeneration = '') {
      const begin = async (options = {}) => {
        const existing = await collection.findOne({ _id: userId }, options);
        if (existing) return existing;
        if (users) {
          // Share the user-document write lock with Watcha mutations. A stale
          // snapshot that read no operation must conflict and retry after this
          // transaction durably freezes the account, before Core is called.
          const touched = await users.updateOne(authUserFilter(userId), { $inc: { watchaWriteVersion: 1 } }, options);
          if (touched.matchedCount !== 1) throw new Error('ACCOUNT_DELETION_USER_UNAVAILABLE');
        }
        await collection.updateOne({ _id: userId }, { $setOnInsert: {
          operationId: randomUUID(), userId, accountGeneration, contractVersion: VERSION, phase: 'business',
          status: 'pending', attempts: 0, createdAt: now(), updatedAt: now(), nextAttemptAt: now(),
        } }, { ...options, upsert: true });
        return collection.findOne({ _id: userId }, options);
      };
      if (!mongoClient) return begin();
      const session = mongoClient.startSession();
      try {
        return await session.withTransaction(() => begin({ session }), {
          readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' },
        });
      } finally { await session.endSession(); }
    },
    get: (userId) => collection.findOne({ _id: userId }),
    async due() {
      return collection.find({ contractVersion: VERSION, status: 'pending', nextAttemptAt: { $lte: now() } })
        .sort({ nextAttemptAt: 1 }).limit(25).toArray();
    },
    async claim(userId) {
      const leaseToken = randomUUID();
      const result = await collection.updateOne({ _id: userId, status: 'pending', contractVersion: VERSION, $or: [
        { leaseUntil: { $exists: false } }, { leaseUntil: { $lte: now() } },
      ] }, { $set: { leaseToken, leaseUntil: new Date(now().getTime() + 180000), updatedAt: now() }, $inc: { attempts: 1 } });
      return result.matchedCount === 1 ? collection.findOne({ _id: userId, leaseToken }) : null;
    },
    async save(operation, fields) {
      const result = await collection.updateOne({ _id: operation.userId, operationId: operation.operationId, leaseToken: operation.leaseToken }, {
        $set: { ...fields, updatedAt: now(), leaseUntil: new Date(now().getTime() + 180000) },
      });
      if (result.matchedCount !== 1) throw new Error('ACCOUNT_DELETION_LEASE_LOST');
      Object.assign(operation, fields);
    },
    release: (operation) => collection.updateOne({ _id: operation.userId, leaseToken: operation.leaseToken }, { $unset: { leaseToken: '', leaseUntil: '' } }),
  };
}

export function createAccountDeletionService({ auth, backend, store, isMaintenance = () => false, now = () => new Date(), logger = console }) {
  let timer;
  let running;
  const unavailable = () => ({ status: 503, data: { code: 503, error: 'ACCOUNT_DELETION_CONTRACT_UNAVAILABLE' } });
  async function capability() {
    const result = await backend.call({ action: 'accountDeletionCapability' });
    return valid(result) && result.data.deletionContractVersion === VERSION;
  }
  async function advance(userId) {
    const op = await store.claim(userId);
    if (!op) {
      const current = await store.get(userId);
      return current?.status === 'completed' ? { status: 200, data: { code: 0, ok: true } }
        : current?.status === 'review_required' ? { status: 409, data: { code: 409, error: 'ACCOUNT_DELETION_REVIEW_REQUIRED' } }
        : pending(current?.phase);
    }
    try {
      if (!await capability()) throw new Error('ACCOUNT_DELETION_CONTRACT_UNAVAILABLE');
      if (op.phase === 'business') {
        const result = await backend.call({ action: 'deleteAccount', userId: op.userId, operationId: op.operationId, accountGeneration: op.accountGeneration || '' }, {}, { timeoutMs: 120000 });
        if (result.data?.error === 'ACCOUNT_DELETION_REVIEW_REQUIRED' || result.data?.error === 'ACCOUNT_DELETION_OPERATION_MISMATCH') {
          await store.save(op, { status: 'review_required', lastErrorCode: result.data.error });
          return { status: 409, data: { code: 409, error: 'ACCOUNT_DELETION_REVIEW_REQUIRED' } };
        }
        if (!valid(result) || result.data?.ok !== true || result.data?.deletionContractVersion !== VERSION
          || result.data.operationId !== op.operationId || result.data.phase !== 'awaiting_auth') {
          const retry = Math.max(30, Math.min(86400, Number(result.data?.retryAfterSeconds) || 30));
          const code = ['ACCOUNT_DELETION_WAITING_FOR_UPLOADS', 'ACCOUNT_DELETION_WAITING_FOR_JOBS'].includes(result.data?.error)
            ? result.data.error : 'ACCOUNT_DELETION_RETRY_SCHEDULED';
          await store.save(op, { nextAttemptAt: new Date(now().getTime() + retry * 1000), lastErrorCode: code });
          return pending('business', code);
        }
        await store.save(op, { phase: 'auth', lastErrorCode: '' });
      }
      if (op.phase === 'auth') {
        // Writes phase=ack in the same Mongo transaction as deleting user,
        // credentials and sessions; a lost response cannot strand the operation.
        await auth.deleteUser(op.userId, { operationId: op.operationId, leaseToken: op.leaseToken });
        op.phase = 'ack';
      }
      if (op.phase === 'ack') {
        const result = await backend.call({ action: 'completeAccountDeletion', userId: op.userId, operationId: op.operationId });
        if (!valid(result) || result.data?.ok !== true || result.data.operationId !== op.operationId || result.data.phase !== 'completed'
          || result.data.deletionContractVersion !== VERSION) throw new Error('ACCOUNT_DELETION_ACK_FAILED');
        await store.save(op, { phase: 'completed', status: 'completed', completedAt: now(), lastErrorCode: '' });
      }
      return { status: 200, data: { code: 0, ok: true } };
    } catch {
      await store.save(op, { nextAttemptAt: new Date(now().getTime() + 30000), lastErrorCode: `ACCOUNT_DELETION_${op.phase.toUpperCase()}_RETRY` });
      return pending(op.phase, 'ACCOUNT_DELETION_RETRY_SCHEDULED');
    } finally {
      await store.release(op);
    }
  }
  async function tick() {
    if (isMaintenance()) return;
    for (const op of await store.due()) {
      if (isMaintenance()) break;
      await advance(op.userId);
    }
  }
  function schedule() {
    if (running) return;
    running = tick().catch(() => logger.warn?.('account deletion recovery needs retry'))
      .finally(() => { running = null; });
  }
  return {
    async request(userId) {
      if (!userId) return unavailable();
      if (!await capability()) return unavailable();
      // begin must be durable BEFORE Core is allowed to freeze or remove data.
      const status = await backend.call({ action: 'accountDeletionStatus', userId });
      if (!valid(status) || status.data.deletionContractVersion !== VERSION) return unavailable();
      await store.begin(userId, status.data.accountGeneration || '');
      return advance(userId);
    },
    async status(userId) {
      const result = await backend.call({ action: 'accountDeletionStatus', userId });
      if (!valid(result) || result.data.deletionContractVersion !== VERSION) return unavailable();
      const op = await store.get(userId);
      if (result.data.state === 'active' && op?.status === 'pending') {
        return { status: 200, data: { code: 0, state: 'deleting', phase: op.phase, error: op.lastErrorCode || '', deletionContractVersion: VERSION } };
      }
      return result;
    },
    tick,
    start() { if (!timer) { timer = setInterval(schedule, 30000); timer.unref?.(); schedule(); } },
    async stop() { clearInterval(timer); timer = null; await running; },
  };
}
