const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').resolve(__dirname, '../paperbanana-api.ts'), 'utf8');
const scope = source.match(/const identityScopedActions = new Set\(\[([\s\S]*?)\]\)/)[1];
for (const action of ['deleteAccount', 'completeAccountDeletion', 'accountDeletionStatus', 'finalizeReferenceUpload', 'abortReferenceUpload']) {
  assert.ok(scope.includes(`'${action}'`), `${action} must require the trusted gateway`);
  assert.ok(source.includes(`if (action === '${action}')`), `${action} must be dispatched`);
}
assert.match(source, /if \(action === 'accountDeletionCapability'\)[\s\S]*deletionContractVersion: 3/);
for (const [handler, next, background] of [
  ['createJob', 'refineImage', 'startCreateJobInBackground'],
  ['refineImage', 'getJob', 'startRefineJobInBackground'],
]) {
  const start = source.indexOf(`async function ${handler}`);
  const section = source.slice(start, source.indexOf(`async function ${next}`, start));
  assert.ok(section.lastIndexOf('ensureAccountAcceptingWork') > section.indexOf('jobs.insertOne'));
  assert.ok(section.lastIndexOf('ensureAccountAcceptingWork') < section.indexOf(background));
}
for (const saver of ['saveResult', 'saveStageImage']) {
  const start = source.indexOf(`export async function ${saver}`);
  const section = source.slice(start, source.indexOf('\nexport async function ', start + 1));
  assert.ok((section.match(/assert(?:JobOwner|OwnerKeys)AcceptingWork/g) || []).length >= 2);
  assert.match(section, /bucket\.deleteFile\(filename\)/);
}
const feedback = source.slice(source.indexOf('async function submitFeedback('), source.indexOf('async function adminFeedback('));
assert.ok((feedback.match(/ensureAccountAcceptingWork/g) || []).length >= 2);
assert.match(feedback, /feedback\.deleteOne/);
// Behavioral crash/restart/same-email/late-PUT tests execute the real functions
// in apps/paperbanana-api/tests/account-lifecycle.test.ts.
console.log('account deletion v3 trust and writer fences ok');
