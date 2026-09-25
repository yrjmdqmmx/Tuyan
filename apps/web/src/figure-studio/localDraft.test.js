import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '@paperbanana/figure-core';
import { createLocalDraftSaver, readLocalDraft } from './localDraft.js';
import { STORAGE_KEY } from './state.js';
import './localDraft.cases.jsx';

function storageFor(source = null) {
  let value = source;
  return { writes: 0, getItem(key) { assert.equal(key, STORAGE_KEY); return value; },
    setItem(key, next) { assert.equal(key, STORAGE_KEY); value = next; this.writes++; } };
}
function serialLocks(start = Promise.resolve()) {
  let queue = start;
  return { request(_name, callback) { const next = queue.then(callback); queue = next.catch(() => {}); return next; } };
}

test('the initial document and comparison token come from one storage read', () => {
  const source = JSON.stringify(createDocument({ title: 'Snapshot' }));
  let reads = 0;
  const draft = readLocalDraft({ getItem() { reads++; return source; } });
  assert.equal(reads, 1); assert.equal(draft.baseline, source);
  assert.equal(draft.history.document.title, 'Snapshot');
});

test('same ID and revision with different contents cannot overwrite even before the storage event arrives', async () => {
  const document = createDocument({ title: 'Initial' });
  const baseline = JSON.stringify(document), storage = storageFor(baseline);
  const saver = createLocalDraftSaver({ storage, baseline, locks: serialLocks() });
  const external = JSON.stringify({ ...document, title: 'Other tab' });
  storage.setItem(STORAGE_KEY, external);
  assert.equal((await saver.save({ ...document, title: 'Stale tab' })).kind, 'conflict');
  assert.equal(storage.getItem(STORAGE_KEY), external);
  assert.equal(storage.writes, 1);
});

test('simultaneous tabs serialize their comparison and write, leaving one saved and one conflicted', async () => {
  const document = createDocument({ title: 'Initial' });
  const baseline = JSON.stringify(document), storage = storageFor(baseline), locks = serialLocks();
  const first = createLocalDraftSaver({ storage, baseline, locks });
  const second = createLocalDraftSaver({ storage, baseline, locks });
  const states = await Promise.all([first.save({ ...document, title: 'First' }), second.save({ ...document, title: 'Second' })]);
  assert.deepEqual(states.map(state => state.kind), ['saved', 'conflict']);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).title, 'First');
  assert.equal(storage.writes, 1);
});

test('queued obsolete scenes are cancelled before they can write', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const storage = storageFor(), saver = createLocalDraftSaver({ storage, baseline: null, locks: serialLocks(gate) });
  const old = saver.save(createDocument({ title: 'Old' }));
  const latest = saver.save(createDocument({ title: 'Latest' }));
  release(); await Promise.all([old, latest]);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).title, 'Latest');
  assert.equal(storage.writes, 1);
  const unmounted = await saver.save(createDocument({ title: 'Unmounted' }), { isCurrent: () => false });
  assert.equal(unmounted.kind, 'saved'); assert.equal(storage.writes, 1);
});

test('explicit adoption rechecks the exact external snapshot and refuses a newer external edit', async () => {
  const document = createDocument({ title: 'This tab' });
  const baseline = JSON.stringify(document), storage = storageFor(baseline);
  const saver = createLocalDraftSaver({ storage, baseline, locks: serialLocks() });
  const first = JSON.stringify({ ...document, title: 'Other tab v1' });
  const second = JSON.stringify({ ...document, title: 'Other tab v2' });
  storage.setItem(STORAGE_KEY, first); saver.inspect();
  storage.setItem(STORAGE_KEY, second);
  assert.equal((await saver.save(document, { adopt: true, external: first })).kind, 'conflict');
  assert.equal(storage.getItem(STORAGE_KEY), second);
  assert.equal((await saver.save(document, { adopt: true, external: second })).kind, 'saved');
  assert.equal(storage.getItem(STORAGE_KEY), baseline);
});

test('explicitly loading an external source does not write or merge either scene', async () => {
  const document = createDocument({ title: 'This tab' });
  const baseline = JSON.stringify(document), storage = storageFor(baseline);
  const saver = createLocalDraftSaver({ storage, baseline, locks: serialLocks() });
  const external = JSON.stringify({ ...document, title: 'Other tab' });
  storage.setItem(STORAGE_KEY, external); saver.inspect();
  let opened;
  const result = await saver.loadStored({ external, onOpen(value) { opened = value; } });
  assert.equal(result.kind, 'saved'); assert.equal(opened.title, 'Other tab');
  assert.equal(storage.writes, 1);
  assert.equal((await saver.save({ ...opened, title: 'Continued', revision: opened.revision + 1 })).kind, 'saved');
});

test('corrupt or removed external source never replaces the in-memory scene', async () => {
  for (const external of ['not a document', null]) {
    const baseline = JSON.stringify(createDocument()), storage = storageFor(baseline);
    const saver = createLocalDraftSaver({ storage, baseline, locks: serialLocks() });
    storage.setItem(STORAGE_KEY, external); saver.inspect();
    let opened = false;
    const state = await saver.loadStored({ external, onOpen() { opened = true; } });
    assert.equal(state.kind, 'conflict'); assert.match(state.message, /无法读取/);
    assert.equal(opened, false); assert.equal(storage.getItem(STORAGE_KEY), external);
  }
});

test('a corrupt initial draft is retained until explicit adoption', async () => {
  const storage = storageFor('{invalid'); const initial = readLocalDraft(storage);
  const saver = createLocalDraftSaver({ ...initial, recoveryError: initial.history.recoveryError, locks: serialLocks() });
  assert.equal((await saver.save(initial.history.document)).kind, 'conflict');
  assert.equal(storage.writes, 0); assert.equal(storage.getItem(STORAGE_KEY), '{invalid');
});

test('missing locks and a failing storage write are reported without claiming successful autosave', async () => {
  const storage = storageFor();
  const unsupported = createLocalDraftSaver({ storage, baseline: null, locks: null });
  assert.equal((await unsupported.save(createDocument())).kind, 'unavailable');
  assert.equal(storage.writes, 0);
  const full = createLocalDraftSaver({ storage: { getItem: () => null, setItem() { throw new Error('QuotaExceeded'); } }, baseline: null, locks: serialLocks() });
  assert.equal((await full.save(createDocument())).kind, 'failed');
});
