import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommands, createDocument, createExampleDocument } from '@paperbanana/figure-core';
import { selectedEditScope } from './editScope.js';

test('panel editing explicitly scopes all transitive descendants and no unrelated objects', () => {
  const document = createExampleDocument();
  document.elements.push({ id: 'nested-panel', type: 'panel', parentId: 'node-input', x: 10, y: 10, width: 20, height: 12, fill: 'none', stroke: '#000000', strokeWidth: 0.3 });
  document.elements.push({ id: 'nested-text', type: 'text', parentId: 'nested-panel', x: 11, y: 11, width: 10, height: 4, fontSize: 6, fontFamily: 'Arial', fontWeight: 400, color: '#000000', role: 'label', text: 'Child' });
  const scope = selectedEditScope(document, 'node-input');
  assert.equal(scope.error, '');
  assert.deepEqual(new Set(scope.objectIds), new Set(['node-input', 'panel-label-input', 'label-input', 'detail-input', 'nested-panel', 'nested-text']));
  assert.equal(scope.relatedCount, 5);
  const selected = document.elements.find((element) => element.id === 'node-input');
  const after = applyCommands(document, [{ type: 'update', id: selected.id, patch: { x: selected.x + 5 } }]);
  document.elements.forEach((element, index) => {
    if (JSON.stringify(element) !== JSON.stringify(after.elements[index])) assert.ok(scope.objectIds.includes(element.id), `Changed object ${element.id} was outside declared scope`);
  });
});

test('more than 40 scoped objects is rejected before a model request can be formed', () => {
  const panel = { id: 'panel', type: 'panel', x: 1, y: 1, width: 100, height: 100 };
  const elements = [panel, ...Array.from({ length: 40 }, (_, index) => ({ id: `child-${index}`, type: 'text', parentId: 'panel', x: 2, y: 2 + index, width: 15, height: 3, text: String(index) }))];
  const document = createDocument({ elements });
  const scope = selectedEditScope(document, 'panel');
  assert.equal(scope.objectIds.length, 41);
  assert.match(scope.error, /尚未发送请求/);
  assert.match(scope.error, /单次 40/);
  assert.equal(selectedEditScope(document, 'child-0').objectIds.length, 1);
  assert.equal(selectedEditScope(document, 'child-0').error, '');
});
