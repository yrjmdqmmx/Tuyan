import { APIError } from 'better-auth/api';
import { authUserFilter } from './account-verification.js';

export function createAccountWriteGuard(db) {
  async function assertActive(userId) {
    if (!userId || !await db.collection('user').findOne(authUserFilter(userId))
      || await db.collection('accountDeletionOperations').findOne({ _id: String(userId) })) {
      throw new APIError('FORBIDDEN', { code: 'ACCOUNT_LIFECYCLE_CLOSED', message: 'Account is no longer accepting credential or session changes.' });
    }
  }
  const hooks = (name) => ({
    create: {
      async before(row) { await assertActive(row.userId); return { data: row }; },
      async after(row) {
        try { await assertActive(row.userId); }
        catch (error) {
          // Compensate a concurrent deletion after the pre-insert check. Never
          // recreate an old user's credential/session from a stale reset token.
          await db.collection(name).deleteOne(authUserFilter(row.id || row._id));
          throw error;
        }
      },
    },
  });
  return { account: hooks('account'), session: hooks('session') };
}
