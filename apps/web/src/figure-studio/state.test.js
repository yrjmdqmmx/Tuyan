import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument, createExampleDocument } from '@paperbanana/figure-core';
import { historyReducer, initialHistory, parseSource, STORAGE_KEY } from './state.js';

test('saved source reopens with identical scene, object identity and working rules', () => {
  const document = createExampleDocument();
  document.ruleOverrides = { 'text-size': { value: { min: 6, max: 9 } } };
  const storage = { getItem(key) { assert.equal(key, STORAGE_KEY); return JSON.stringify(document); } };
  const restored = initialHistory(storage);
  assert.deepEqual(restored.document, document);
  assert.notEqual(restored.document, document);
  assert.equal(restored.past.length, 0);
});

test('undo and redo restore content while advancing revision, rejecting old model patches', () => {
  let state = { document: createDocument({ title: '初稿' }), past: [], future: [] };
  state = historyReducer(state, { type: 'commands', commands: [{ type: 'title', title: '已修改' }], baseRevision: 0 });
  assert.equal(state.document.revision, 1);
  state = historyReducer(state, { type: 'undo' });
  assert.equal(state.document.title, '初稿');
  assert.equal(state.document.revision, 2);
  assert.throws(() => historyReducer(state, { type: 'commands', commands: [{ type: 'title', title: '过期修改' }], baseRevision: 0 }), /版本冲突/);
  state = historyReducer(state, { type: 'redo' });
  assert.equal(state.document.title, '已修改');
  assert.equal(state.document.revision, 3);
});

test('editing after undo discards future state and imported files start a new undo chain', () => {
  let state = { document: createDocument({ title: 'A' }), past: [], future: [] };
  state = historyReducer(state, { type: 'commands', commands: [{ type: 'title', title: 'B' }] });
  state = historyReducer(state, { type: 'undo' });
  state = historyReducer(state, { type: 'commands', commands: [{ type: 'title', title: 'C' }] });
  assert.equal(state.future.length, 0);
  const source = parseSource(JSON.stringify(createExampleDocument()));
  state = historyReducer(state, { type: 'open', document: source });
  assert.equal(state.past.length, 0);
  assert.equal(state.document.id, source.id);
});

test('malformed cache is preserved and reported instead of being treated as a valid saved source', () => {
  const state = initialHistory({ getItem: () => '{"schemaVersion":"wrong"}' });
  assert.match(state.recoveryError, /原缓存未删除/);
  assert.equal(state.document.elements.length, 0);
  assert.throws(() => parseSource('{"schemaVersion":"wrong"}'), /版本不受支持/);
});

test('rejecting an invalid edit leaves the original scene unchanged', () => {
  const document = createExampleDocument();
  const state = { document, past: [], future: [] };
  const before = JSON.stringify(document);
  assert.throws(() => historyReducer(state, { type: 'commands', commands: [{ type: 'update', id: 'plan-title', patch: { fontSize: -10 } }] }));
  assert.equal(JSON.stringify(document), before);
});
