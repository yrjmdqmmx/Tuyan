import { authUserFilter } from './account-verification.js';

// One inventory for hard deletion, migration and execution identity storage.
export const WORKSPACE_ACCOUNT_COLLECTIONS = Object.freeze([
  'workspaceTaskDeletions', 'workspaceMigrationBackups', 'workspaceDocuments', 'workspaceResults',
  'workspaceQuotas', 'workspaceModelLibraries', 'workspaceExecutions',
  'workspaceExecutionLocks', 'workspaceHistoryExecutions',
  'accountEmailChanges',
]);

export async function assertWorkspaceAccountActive(db, userId) {
  if (!userId || !await db.collection('user').findOne(authUserFilter(userId))
    || await db.collection('accountDeletionOperations').findOne({ _id: String(userId) })) {
    throw Object.assign(Error('ACCOUNT_LIFECYCLE_CLOSED'), { status: 403 });
  }
}

function sessionDatabase(db, session) {
  const positions = { find:1, findOne:1, insertOne:1, insertMany:1, updateOne:2,
    updateMany:2, replaceOne:2, deleteOne:1, deleteMany:1, findOneAndUpdate:2 };
  return { collection(name) {
    const collection = db.collection(name);
    return new Proxy(collection, { get(target, method) {
      if (Object.hasOwn(positions, method)) return (...args) => {
        const at = positions[method]; args[at] = { ...args[at], session };
        return target[method](...args);
      };
      return typeof target[method] === 'function' ? target[method].bind(target) : target[method];
    } });
  } };
}

export async function withWorkspaceAccountWrite({ db, mongoClient, userId }, work) {
  if (!mongoClient) throw Error('WORKSPACE_TRANSACTION_REQUIRED');
  const session = mongoClient.startSession();
  try {
    return await session.withTransaction(async () => {
      const scoped = sessionDatabase(db, session);
      await assertWorkspaceAccountActive(scoped, userId);
      // Deletion begin and final user removal write this same document. Mongo
      // retries conflicting snapshots; no import can commit behind the tombstone.
      const touched = await scoped.collection('user').updateOne(authUserFilter(userId), { $inc: { workspaceWriteVersion: 1 } });
      if (touched.matchedCount !== 1) throw Object.assign(Error('ACCOUNT_LIFECYCLE_CLOSED'), { status:403 });
      return work(scoped);
    }, { readConcern:{level:'snapshot'}, writeConcern:{w:'majority'} });
  } finally { await session.endSession(); }
}

export function accountWorkspaceStore({ db, mongoClient, factory, mutations }) {
  const create = scoped => factory({ db:scoped, assertActive:userId=>assertWorkspaceAccountActive(scoped,userId) });
  const store = create(db);
  return Object.fromEntries(Object.keys(store).map(method => [method, mutations.includes(method)
    ? (...args) => withWorkspaceAccountWrite({db,mongoClient,userId:args[0]}, scoped=>create(scoped)[method](...args))
    : store[method].bind(store)]));
}
