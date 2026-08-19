const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.resolve(__dirname, '../paperbanana-api.ts');
const source = fs.readFileSync(sourcePath, 'utf8');

// Account deletion (App Store guideline 5.1.1(v)) must be an identity-scoped
// action so it only runs through the auth-gateway (or admin tooling) and never
// from a forged direct call.
const setMatch = source.match(/const identityScopedActions = new Set\(\[([\s\S]*?)\]\)/);
assert.ok(setMatch, 'identityScopedActions set must exist.');
assert.ok(
  setMatch[1].includes("'deleteAccount'"),
  'identityScopedActions must include deleteAccount.',
);

// Dispatch must route the deleteAccount action.
assert.ok(
  /if \(action === 'deleteAccount'\) \{\s*return await deleteAccount\(body as DeleteAccountBody\)/.test(source),
  'Dispatch must route deleteAccount to the deleteAccount handler.',
);

// The handler must hard-delete jobs and feedback for the user.
assert.ok(
  source.includes('async function deleteAccount('),
  'deleteAccount handler must be defined.',
);
assert.ok(
  /jobs\.deleteMany\(/.test(source),
  'deleteAccount must deleteMany on the jobs collection.',
);
assert.ok(
  /feedback\.deleteMany\(/.test(source),
  'deleteAccount must deleteMany on the feedback collection.',
);

// Reference-image purge must be best-effort: it must not throw out of the
// handler (errors are logged and swallowed).
assert.ok(
  source.includes('deleteReferenceObjectsForOwner'),
  'deleteAccount must best-effort purge reference objects via deleteReferenceObjectsForOwner.',
);
assert.ok(
  /deleteReferenceObjectsForOwner[\s\S]*?console\.warn/.test(source),
  'Reference-object deletion failures must be logged, not thrown.',
);

// Result is reported with the documented counts.
assert.ok(
  source.includes('deletedJobCount') && source.includes('deletedFeedbackCount'),
  'deleteAccount must return deletedJobCount and deletedFeedbackCount.',
);

// Account deletion must remove stored result/stage objects before deleting the
// job records that contain their authoritative object keys. A storage failure
// must leave the account and records intact so the gateway can safely retry.
const deleteAccountStart = source.indexOf('async function deleteAccount(');
const deleteAccountEnd = source.indexOf('\nconst ', deleteAccountStart);
const deleteAccountSource = source.slice(deleteAccountStart, deleteAccountEnd);
assert.ok(
  deleteAccountSource.includes('deleteStoredObjectsForJobs'),
  'deleteAccount must delete result and stage objects for owned jobs.',
);
assert.ok(
  deleteAccountSource.indexOf('await jobs.find(') < deleteAccountSource.indexOf('deleteStoredObjectsForJobs'),
  'deleteAccount must load owned jobs before deleting their stored objects.',
);
assert.ok(
  deleteAccountSource.indexOf('deleteStoredObjectsForJobs') < deleteAccountSource.indexOf('jobs.deleteMany'),
  'Stored objects must be deleted before the job records are removed.',
);
assert.ok(
  deleteAccountSource.includes('deletedResultObjectCount'),
  'deleteAccount must report deleted result/stage object count.',
);
assert.ok(
  !deleteAccountSource.includes('intentionally kept'),
  'deleteAccount must not intentionally retain generated results.',
);

assert.match(source, /collection\('paperbanana_account_deletions'\)/,
  'Account deletion must persist an owner tombstone before cleanup.');
assert.match(source, /collection\('paperbanana_reference_upload_state'\)/,
  'Reference upload URL expiry must be persisted per owner.');
assert.match(source, /async function ensureAccountAcceptingWork/,
  'Create, refine and upload actions need a persistent deletion guard.');
for (const handler of ['prepareReferenceUpload', 'createJob', 'refineImage']) {
  const start = source.indexOf(`async function ${handler}`);
  const end = source.indexOf('\nasync function ', start + 1);
  assert.ok(source.slice(start, end).includes('ensureAccountAcceptingWork'), `${handler} must reject frozen accounts.`);
}
assert.ok(deleteAccountSource.includes('freezeOwners'), 'Account deletion must stop owner-specific admission.');
assert.match(deleteAccountSource, /deletionContractVersion:\s*2/,
  'The gateway needs an explicit deletion contract version before deleting Auth.');

assert.match(source, /action:\s*'accountDeletionCapability'/,
  'The shared API must expose a non-destructive account deletion capability action.');
assert.match(source, /if \(action === 'accountDeletionCapability'\)[\s\S]*deletionContractVersion:\s*2/,
  'Capability probing must report v2 without invoking deleteAccount.');

const feedbackStart = source.indexOf('async function submitFeedback(');
const feedbackEnd = source.indexOf('\nasync function adminFeedback', feedbackStart);
const feedbackSource = source.slice(feedbackStart, feedbackEnd);
assert.ok(
  (feedbackSource.match(/ensureAccountAcceptingWork/g) || []).length >= 2,
  'Feedback must check the persistent tombstone both before and after insertion.',
);
assert.match(feedbackSource, /feedback\.deleteOne\(/,
  'Feedback inserted during a deletion race must be rolled back.');

for (const [handler, nextHandler, backgroundCall] of [
  ['createJob', 'refineImage', 'startCreateJobInBackground'],
  ['refineImage', 'getJob', 'startRefineJobInBackground'],
]) {
  const start = source.indexOf(`async function ${handler}`);
  const end = source.indexOf(`async function ${nextHandler}`, start);
  const section = source.slice(start, end);
  assert.ok(
    section.lastIndexOf('ensureAccountAcceptingWork') > section.indexOf('jobs.insertOne'),
    `${handler} must recheck the persistent tombstone after its job insert.`,
  );
  assert.ok(
    section.lastIndexOf('ensureAccountAcceptingWork') < section.indexOf(backgroundCall),
    `${handler} must not start background work before the post-insert tombstone check.`,
  );
}

assert.match(deleteAccountSource, /status:\s*\{\s*\$in:\s*\['reserved',\s*'queued',\s*'running'\]\s*\}/,
  'Deletion must inspect active database jobs across all isolates.');
assert.match(deleteAccountSource, /ACCOUNT_DELETION_WAITING_FOR_JOBS/,
  'Deletion must fail closed while another isolate still owns active work.');
assert.ok(
  deleteAccountSource.indexOf('ACCOUNT_DELETION_WAITING_FOR_JOBS') < deleteAccountSource.indexOf('deleteStoredObjectsForJobs'),
  'Cross-isolate active jobs must block object cleanup.',
);

for (const action of ['finalizeReferenceUpload', 'abortReferenceUpload']) {
  assert.ok(setMatch[1].includes(`'${action}'`), `${action} must be identity scoped.`);
  assert.match(source, new RegExp(`if \\(action === '${action}'\\)`), `${action} must be dispatched.`);
}
assert.match(source, /async function recordPreparedReferenceUploads/,
  'Every presigned upload must have a durable per-object prepared state.');
assert.match(deleteAccountSource, /status:\s*'prepared'[\s\S]*expiresAt:\s*\{\s*\$gt:/,
  'Deletion must wait for unfinalized, unexpired uploads instead of trusting only an owner max expiry.');
assert.match(deleteAccountSource, /purgeReferencePrefixesUntilQuiet/,
  'Deletion must repeat reference-prefix cleanup for a quiet period.');
assert.match(source, /scheduleAccountDeletionSweep/,
  'Persistent deleted-owner tombstones must schedule later cleanup for delayed PUT completion.');
assert.match(deleteAccountSource, /\$addToSet:\s*\{\s*jobIds:\s*\{\s*\$each:/,
  'Deletion tombstones must retain owned job IDs for late result-object cleanup.');
const sweepStart = source.indexOf('async function sweepDeletedAccountObjects(');
const sweepEnd = source.indexOf('\nasync function ', sweepStart + 1);
const sweepSource = source.slice(sweepStart, sweepEnd);
assert.match(sweepSource, /deleteStoredObjectsForJobPrefix/,
  'The background tombstone sweep must remove result objects written after the first deletion pass.');
assert.match(sweepSource, /lastSweptAt/,
  'The bounded tombstone sweep must advance processed rows instead of starving later deletions.');
assert.match(source, /referenceUploadState\.deleteMany\([\s\S]*expiresAt:\s*\{\s*\$lt:/,
  'The background sweep must prune expired upload lifecycle rows after their safety window.');
assert.doesNotMatch(deleteAccountSource, /accountDeletions\.delete/,
  'The persistent tombstone must survive Auth deletion for delayed-upload cleanup.');

for (const saver of ['saveResult', 'saveStageImage']) {
  const start = source.indexOf(`export async function ${saver}`);
  const end = source.indexOf('\nexport async function ', start + 1);
  const saverSource = source.slice(start, end < 0 ? undefined : end);
  assert.ok((saverSource.match(/assert(?:JobOwner|OwnerKeys)AcceptingWork/g) || []).length >= 2,
    `${saver} must recheck the persistent owner tombstone before and after an OSS write.`);
  assert.match(saverSource, /bucket\.deleteFile\(filename\)/,
    `${saver} must remove an object written during the deletion race.`);
}

const ownerKeysStart = source.indexOf('function accountOwnerKeys(');
const ownerKeysEnd = source.indexOf('\nasync function ensureAccountAcceptingWork', ownerKeysStart);
const ownerKeysSource = source.slice(ownerKeysStart, ownerKeysEnd);
assert.match(ownerKeysSource, /if \(userId\)[\s\S]*return \[`user:\$\{userId\}`\]/,
  'An immutable user ID must be the sole admission tombstone when available.');

console.log('delete-account-guard policy ok');
