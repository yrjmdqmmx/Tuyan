import { catalogBeforeNovember24 } from '../test-support/retirement-projections.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { STATIC_MODEL_REGISTRY as catalog } from '../apps/web/src/lib/staticModelCatalog.js';
import { MODEL_AUDIT_DATA, removedModel, auditedModelLifecycle } from '../apps/web/src/lib/modelAudit.js';
import { modelDeveloper } from '../apps/web/src/lib/modelPresentation.js';
import miniAudit from '../apps/miniprogram/miniprogram/utils/model-audit.js';
import { catalogBeforeVersionReview } from '../test-support/catalog-version-review.mjs';
const read = file => JSON.parse(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'));
const batch = read('config/channel-audit/retirements-20261117.json');
const baseline = read('test-support/model-retirements-20261117-baseline.json');
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const removals = new Set(batch.remove.map(row => row.provider + '/' + row.id));
const november17Catalog = catalogBeforeNovember24(catalog);
const retirementCatalog = catalogBeforeVersionReview(november17Catalog);

test('batch 1 removes exactly 31 catalog identities and preserves every surviving static model and default', () => {
  assert.equal(batch.remove.length, 31);
  assert.equal(removals.size, 31);
  assert.deepEqual(Object.fromEntries(['openai', 'siliconflow', 'antling'].map(p => [p, batch.remove.filter(r => r.provider === p).length])), { openai: 20, siliconflow: 8, antling: 3 });
  assert.equal(Object.keys(MODEL_AUDIT_DATA.removed).length, 167);
  assert.equal(Object.values(catalog).reduce((sum, p) => sum + p.models.length, 0), 968);
  // Main's static catalog omitted the display-only specification. Keep its exact hash
  // and independently lock the complete merged catalog to the surviving #251 rows.
  assert.equal(hash(november17Catalog), '009e4d21d27462aa062c53fcac0fab3dd98102115428e13a2ac1ab21ed90a9f5');
  assert.equal(hash(retirementCatalog), 'acadc122db56fde4ecddb2dfb9d9b16caac5a2f2ef063395711ddc653b8b81be');
  const mainModel = ({specificModelSpecifications, ...model}) => model;
  const retained = Object.fromEntries(Object.entries(retirementCatalog).map(([p, value]) => [p, { ...value, models: value.models.filter(m => !removals.has(p + '/' + m.id)).map(mainModel) }]));
  assert.equal(hash(retained), baseline.survivingCatalogSha256);
  const source = read('config/model-catalog-updates.json'), versions = read('config/model-version-audit.json'), sizes = read('config/image-size-contracts.json');
  for (const row of batch.remove) {
    const key = row.provider + '/' + row.id, tombstone = removedModel(row.provider, row.id, Date.parse('2026-11-17T12:00:00+08:00'));
    assert.ok(tombstone, key);
    assert.equal(tombstone.stopDate.slice(0, 10), row.date);
    assert.equal(tombstone.sourceUrl, row.source);
    // The old catalog appended the resolved snapshot to eight OpenAI alias labels.
    assert.equal(tombstone.displayName, baseline.removedLabels[key].replace(/ · \d{4}(?:-\d{2}-\d{2})?$/, ''), key);
    assert.equal(row.evidence_read, '2026-11-17');
    assert.equal(catalog[row.provider].models.some(m => m.id === row.id), false, key);
    assert.equal(source.providers[row.provider].some(m => m.id === row.id), false, key);
    assert.equal(versions.models.some(m => m.channel === row.provider && m.apiModelId === row.id), false, key);
    assert.equal(sizes.routes[key], undefined, key);
    assert.equal(MODEL_AUDIT_DATA.rows[key], undefined, key);
  }
});
test('removed names identify the exact batch API ID and both clients retain its developer', () => {
  const normalize = name => name.toLowerCase().replace(/[ -]/g, '');
  const source = read('config/removed-models.json');
  const now = Date.parse('2026-11-24T12:00:00+08:00');
  for (const { provider, id } of batch.remove) {
    const key = provider + '/' + id;
    assert.equal(normalize(source[key].displayName), normalize(id.split('/').at(-1)), key);
  }
  for (const [key, row] of Object.entries(source)) {
    const [provider, ...path] = key.split('/'), id = path.join('/');
    for (const notice of [removedModel(provider, id, now), miniAudit.removedModel(provider, id, now)]) {
      assert.equal(notice.displayName, row.displayName, key);
      assert.equal(notice.developer, row.developer, key);
      assert.notEqual(modelDeveloper(provider, { id, vendorId: notice.developer }).id, 'unconfirmed', key);
    }
    if (row.developer) assert.equal(modelDeveloper(provider, { id }).id, 'unconfirmed', key);
  }
});
test('batch 1 leaves all 51 protected candidates and their notices unchanged', () => {
  assert.equal(baseline.protected.length, 51);
  const review = read('config/channel-audit/retirements-20261124.json');
  for (const row of baseline.protected) {
    const key = row.provider + '/' + row.id;
    assert.equal(hash(retirementCatalog[row.provider]?.models.filter(m => m.id === row.id).map(({specificModelSpecifications,...model}) => model)[0] ?? null), row.staticSha256, key);
    if (review.remove.some(change => change.provider === row.provider && change.id === row.id)) {
      assert.ok(MODEL_AUDIT_DATA.removed[key], key);
      continue;
    }
    if (review.upcoming.some(change => change.provider === row.provider && change.id === row.id)) {
      assert.equal(MODEL_AUDIT_DATA.notices[key].stopDate, '2027-01-22T14:00:00+08:00');
      continue;
    }
    assert.deepEqual(MODEL_AUDIT_DATA.notices[key] ?? null, row.notice, key);
    assert.equal(MODEL_AUDIT_DATA.removed[key], undefined, key);
  }
});
test('batch 1 ten sourced notices keep UTC+8 times and evidence dates without admitting new models', () => {
  assert.equal(batch.upcoming.length, 10);
  assert.equal(Object.keys(MODEL_AUDIT_DATA.notices).length, 9);
  for (const row of batch.upcoming.filter(row => row.provider !== 'minimax')) {
    const stop = Date.parse(row.time || row.date);
    const notice = auditedModelLifecycle(row.provider, row.id, stop - 1);
    assert.equal(notice.sourceUrl, row.source);
    assert.equal(notice.stopDate, row.time || row.date);
    assert.equal(row.evidence_read, '2026-11-17');
    assert.equal(removedModel(row.provider, row.id, stop - 1), null);
    assert.equal(removedModel(row.provider, row.id, stop).sourceUrl, row.source);
  }
});
