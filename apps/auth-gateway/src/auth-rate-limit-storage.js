import { createHash } from 'node:crypto';

const SESSION_WINDOW_MS = 60_000;
// Better Auth 1.6.11 advances lastRequest on every response, so steady
// get-session polling accumulates forever until there is a full idle minute.
// Only this read route uses fixed windows. Login/reset/change-password keep
// their existing Better Auth database limiter and stricter rules.
export function createAuthRateLimitStorage(db, now = Date.now) {
  const sessionBucket = key => {
    const start = Math.floor(now() / SESSION_WINDOW_MS) * SESSION_WINDOW_MS;
    return { _id: createHash('sha256').update(key).digest('hex') + ':' + start, start };
  };
  return {
    async get(key) {
      if (key.endsWith('|/get-session')) {
        const { _id } = sessionBucket(key);
        return await db.collection('sessionReadRateLimit').findOne({ _id });
      }
      const row = await db.collection('rateLimit').findOne({ key });
      return row ? { ...row, lastRequest: Number(row.lastRequest) } : null;
    },
    async set(key, value, update) {
      if (key.endsWith('|/get-session')) {
        const { _id, start } = sessionBucket(key);
        const collection = db.collection('sessionReadRateLimit');
        const change = { $inc: { count: 1 }, $setOnInsert: { lastRequest: start, expiresAt: new Date(start + 2 * SESSION_WINDOW_MS) } };
        try { await collection.updateOne({ _id }, change, { upsert: true }); }
        catch (error) {
          // Two gateways may create the same bucket together. _id is unique.
          if (error?.code !== 11000) throw error;
          await collection.updateOne({ _id }, change);
        }
        return;
      }
      const collection = db.collection('rateLimit');
      const data = { count: value.count, lastRequest: value.lastRequest };
      if (update) await collection.updateMany({ key }, { $set: data });
      else await collection.insertOne({ key, ...data });
    },
  };
}
