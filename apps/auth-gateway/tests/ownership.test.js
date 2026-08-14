import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authorizeJobOwner,
  normalizeRefineSource,
  ownerFields,
} from '../src/ownership.js';

test('allows current account id, historical account email, guest owner, or admin', () => {
  const job = { userId: 'account-1', user_email: 'old@example.com' };
  assert.equal(authorizeJobOwner(job, { userId: 'account-1', email: 'new@example.com' }), true);
  assert.equal(authorizeJobOwner(job, { userId: 'account-2', email: 'OLD@example.com' }), true);
  assert.equal(authorizeJobOwner({ user_id: 'guest:abc' }, { guestOwner: 'guest:abc' }), true);
  assert.equal(authorizeJobOwner({}, { isAdmin: true }), true);
});

test('fails closed when job owner fields are absent or mismatched', () => {
  assert.equal(authorizeJobOwner({}, { userId: 'account-1' }), false);
  assert.equal(authorizeJobOwner({ userId: 'account-2' }, { userId: 'account-1' }), false);
  assert.deepEqual(ownerFields({}), { userId: '', userEmail: '' });
});

test('prefers an explicit result object key and derives its source job id', () => {
  assert.deepEqual(
    normalizeRefineSource(
      {
        sourceImageObjectKey: 'job-123/candidate-1.png',
        sourceImageUrl: 'https://attacker.example/source.png',
      },
      {
        backendMode: 'node',
        bucket: 'paperbanana-hk',
        publicEndpoint: 'https://oss-cn-hongkong.aliyuncs.com',
      },
    ),
    {
      objectKey: 'job-123/candidate-1.png',
      jobId: 'job-123',
      payload: { sourceImageObjectKey: 'job-123/candidate-1.png' },
    },
  );
});

test('accepts a signed URL only for the configured virtual-hosted OSS bucket', () => {
  const signedUrl =
    'https://paperbanana-hk.oss-cn-hongkong.aliyuncs.com/job-456/candidate-2.png?x-oss-signature-version=OSS4-HMAC-SHA256&x-oss-credential=credential&x-oss-expires=900&x-oss-signature=abc';
  const normalized = normalizeRefineSource(
    { sourceImageUrl: signedUrl },
    {
      backendMode: 'node',
      bucket: 'paperbanana-hk',
      publicEndpoint: 'https://oss-cn-hongkong.aliyuncs.com',
    },
  );

  assert.equal(normalized.objectKey, 'job-456/candidate-2.png');
  assert.equal(normalized.jobId, 'job-456');
  assert.deepEqual(normalized.payload, { sourceImageObjectKey: 'job-456/candidate-2.png' });
});

test('rejects external, unsigned, path-traversal, and reference-library refine sources in Node mode', () => {
  const config = {
    backendMode: 'node',
    bucket: 'paperbanana-hk',
    publicEndpoint: 'https://oss-cn-hongkong.aliyuncs.com',
  };
  for (const source of [
    { sourceImageUrl: 'https://169.254.169.254/latest/meta-data' },
    { sourceImageUrl: 'https://paperbanana-hk.oss-cn-hongkong.aliyuncs.com/job/source.png' },
    { sourceImageObjectKey: '../job/source.png' },
    { sourceImageObjectKey: 'references/user/source.png' },
  ]) {
    assert.throws(() => normalizeRefineSource(source, config), /REFINE_SOURCE_FORBIDDEN/);
  }
});

test('allows an external URL only behind the explicit Laf rollback switch', () => {
  const input = { sourceImageUrl: 'https://legacy-cdn.example/source.png' };
  assert.throws(
    () => normalizeRefineSource(input, { backendMode: 'laf', allowLegacyExternalUrl: false }),
    /REFINE_SOURCE_FORBIDDEN/,
  );
  assert.deepEqual(
    normalizeRefineSource(input, { backendMode: 'laf', allowLegacyExternalUrl: true }),
    { objectKey: '', jobId: '', payload: input, legacyExternal: true },
  );
});
