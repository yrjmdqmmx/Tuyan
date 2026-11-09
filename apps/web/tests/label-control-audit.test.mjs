import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { scanLabelControls } from './label-control-source.mjs';

const scope = JSON.parse(fs.readFileSync(new URL('./fixtures/label-control-scope.json', import.meta.url), 'utf8'));

test('moved files keep controls outside labels except the explicit R15 choices and uploads', () => {
  const wrappers = [];
  for (const file of scope.files.filter(file => file.endsWith('.jsx')).sort()) {
    const source = fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    for (const row of scanLabelControls(file, source).wrappers) {
      const where = `${file}:${row.line}`;
      assert.equal(row.controls.length, 1, `${where}: only one intentional control may be wrapped`);
      const control = row.controls[0];
      assert.equal(control.tag, 'input', where);
      assert.ok(['checkbox', 'radio', 'file', 'range'].includes(control.type), where);
      wrappers.push({ file, type: control.type });
    }
  }
  assert.ok(scope.allowedWrappers.every(row => row.reason.length > 10), 'every exception needs a concrete reason');
  assert.deepEqual(wrappers, scope.allowedWrappers.map(({ file, type }) => ({ file, type })));
});

test('source audit detects nested, conditional, native and custom controls inside labels', () => {
  const source = `<><label><div><input /></div></label>
    <label>{enabled ? <textarea /> : <select />}</label>
    <label><MenuSelect /></label><label><Select /></label>
    <label><input type="checkbox" /><button>Help</button></label>
    <label htmlFor="separate">Separate caption</label><input id="separate" /></>`;
  const { wrappers } = scanLabelControls('fixture.jsx', source);
  assert.deepEqual(wrappers.map(row => row.controls.map(control => control.tag)), [
    ['input'], ['textarea', 'select'], ['MenuSelect'], ['Select'], ['input', 'button'],
  ]);
});
