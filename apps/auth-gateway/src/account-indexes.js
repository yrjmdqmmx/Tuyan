// No implicit legacy migration: whitespace/collisions must be reviewed before
// creating the unique index. The index also closes concurrent-signup races.
export function normalizeAccountInput(input) {
  if (typeof input.email === 'string' && input.email.trim().toLowerCase().endsWith('@accounts.tuyan.invalid')) throw new Error('Reserved account address');
  return typeof input.email === 'string' ? { ...input, email: input.email.trim().toLowerCase() } : input;
}
export async function ensureAccountIndexes(db) {
  const users = db.collection('user');
  const rows = await users.find({}, { projection: { email: 1 } }).toArray();
  const seen = new Set();
  for (const row of rows) {
    const email = String(row.email || '');
    const normalized = email.trim().toLowerCase();
    if (!normalized || email !== normalized || seen.has(normalized)) {
      throw new Error('AUTH_EMAIL_INDEX_REVIEW_REQUIRED');
    }
    seen.add(normalized);
  }
  await users.createIndex({ email: 1 }, { name: 'auth_email_unique_v1', unique: true, collation: { locale: 'en', strength: 2 } });
  await users.createIndex({ createdAt: -1, _id: -1 });
  await db.collection('account').createIndex({ userId: 1 });
  await db.collection('session').createIndex({ userId: 1, createdAt: -1 });
  await db.collection('accountVerificationTokens').createIndex({ expiresAt: 1 }, { name: 'account_verification_expiry', expireAfterSeconds: 0 });
  await db.collection('accountDeletionOperations').createIndex({ status: 1, nextAttemptAt: 1 }, { name: 'account_deletion_recovery' });
}
