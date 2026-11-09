import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { chooseMenuOption } from './menu-helpers.mjs';
import { WorkspaceModelConfig, WorkspaceModelManager } from '../src/workspace/WorkspaceModelPanels.jsx';
import WorkspaceModelCatalog from '../src/workspace/WorkspaceModelCatalog.jsx';
import WorkspaceApiSetup from '../src/workspace/WorkspaceApiSetup.jsx';
import WorkspaceCustomModel, { CustomConnectionFields } from '../src/workspace/WorkspaceCustomModel.jsx';
import WorkspaceBailianConnection from '../src/workspace/WorkspaceBailianConnection.jsx';
import { newDraft } from '../src/workspace/workspaceState.js';
import UniversalApiSettings from '../src/components/UniversalApiSettings.jsx';
import { emptyUniversalDraft } from '../src/lib/universalApi.js';
import ModelPicker from '../src/components/ModelPicker.jsx';
import { removedModel } from '../src/lib/modelAudit.js';
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js';

const h = React.createElement, read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const noop = () => {}, noSave = () => assert.fail('Rendering/hover/cancel must not save or call providers');
beforeEach(t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-11-09'));
  t.mock.method(globalThis, 'fetch', noSave);
});
afterEach(() => { cleanup(); window.localStorage.clear(); });
function fixture(ids = ['mimo-v2.5']) {
  return { ready: true, busy: false, registryStatus: 'ready', summary: {},
    registry: { providers: STATIC_MODEL_REGISTRY },
    library: { connections: [{ id: 'c', provider: 'xiaomi', label: '科研连接', scope: 'browser', hasCredential: true }],
      models: ids.map((modelId, i) => ({ id: `m${i}`, connectionId: 'c', modelId })) },
    save: noSave, refresh: noop, retry: noop };
}
const current = { libraryModelId: 'm0', connectionId: 'c', accessProvider: 'xiaomi', modelId: 'mimo-v2.5' };

// PR #245 retains only model configuration and channel connection surfaces.
const keepFiles = [
  "components/ControlField.jsx",
  "components/ModelPicker.jsx",
  "components/ModelRoutingSettings.jsx",
  "components/ModelUnavailableText.jsx",
  "components/TokenDancePanel.jsx",
  "components/UniversalApiSettings.jsx",
  "components/UniversalCapabilities.jsx",
  "components/UniversalConnections.jsx",
  "components/UniversalExtensions.jsx",
  "workspace/WorkspaceApiSetup.jsx",
  "workspace/WorkspaceBailianConnection.jsx",
  "workspace/WorkspaceCustomModel.jsx",
  "workspace/WorkspaceModelCatalog.jsx",
  "workspace/WorkspaceModelPanels.jsx"
];

// Deliberate whole-choice targets only. A second control inside any label fails.
const domAllowlist = [
  ['.tw-storage-option > input[type="radio"]', 'The storage choice includes its explanatory text'],
  ['.universal-capabilities label > input[type="checkbox"]', 'Clicking the capability text toggles that capability'],
  ['.universal-confirm > input[type="checkbox"]', 'The confirmation text belongs to its checkbox'],
];
function assertSeparateControls(root = document.body) {
  for (const label of root.querySelectorAll('label')) {
    const controls = [...label.querySelectorAll('input,select,textarea,button')];
    if (!controls.length) continue;
    assert.equal(controls.length, 1, label.outerHTML);
    assert.ok(domAllowlist.some(([selector, reason]) => reason && controls[0].matches(selector)), label.outerHTML);
  }
  for (const field of root.querySelectorAll('.control-field')) {
    const control = field.querySelector('input,select,textarea,button[role="combobox"]');
    assert.ok(control, field.outerHTML);
    assert.equal(control.closest('label'), null);
    assert.ok(control.getAttribute('aria-label') || control.getAttribute('aria-labelledby') || control.labels?.length, control.outerHTML);
    if (control.matches('input,select,textarea')) {
      const label = field.querySelector('label');
      assert.equal(label.htmlFor, control.id);
      assert.equal(label.control, control);
    }
    for (const id of (control.getAttribute('aria-labelledby') || '').split(' ').filter(Boolean)) {
      const label = document.getElementById(id);
      assert.ok(label && label.parentElement === field, id);
      assert.equal(label.contains(control), false);
    }
  }
}

test('R15/R17 every retained source wrapping label is explicitly allow-listed with a reason', () => {
  const ts = createRequire(new URL('../../miniprogram/package.json', import.meta.url))('typescript');
  const root = new URL('../src/', import.meta.url), wrappers = [];
  for (const file of [...keepFiles].sort()) {
    const source = ts.createSourceFile(file, fs.readFileSync(new URL(file, root), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === 'label') {
        const controls = [];
        function find(child) {
          if (ts.isJsxOpeningElement(child) || ts.isJsxSelfClosingElement(child)) {
            const tag = child.tagName.getText(source);
            if (['input','select','textarea','button','MenuSelect'].includes(tag)) controls.push({ tag,
              type: child.attributes.properties.find(attr => attr.name?.getText(source) === 'type')?.initializer?.text });
          }
          ts.forEachChild(child, find);
        }
        node.children.forEach(find);
        if (controls.length) {
          assert.equal(controls.length, 1, `${file}: only a single intentional choice may be wrapped`);
          assert.equal(controls[0].tag, 'input', file);
          wrappers.push({ file: file.split(path.sep).join('/'), type: controls[0].type });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  const allowed = JSON.parse(read('./fixtures/label-wrapping-allowlist-r15.json'));
  assert.ok(allowed.every(row => row.reason.length > 10));
  assert.deepEqual(wrappers, allowed.map(({ file, type }) => ({ file, type })));
});

test('R15 rendered workspace and model-management controls remain outside labels across conditional forms', () => {
  const models = fixture(), draft = newDraft();
  draft.mode = 'advanced';
  const connection = { id: 'custom', provider: 'custom', custom: { protocol: 'openai-chat', baseUrl: 'https://fixture.example/v1', auth: 'bearer-expiring' } };
  const scenes = [
    h(WorkspaceApiSetup, { models }),
    h(UniversalApiSettings, { drafts:Object.fromEntries(['main','image','vision'].map(role=>[role,emptyUniversalDraft(role)])), keys:{}, contractSupported:true, health:{backendMode:'gateway'}, apiBase:'https://fixture.example', onChange:noop, onKeyChange:noop, onSave:noSave }),
    h(CustomConnectionFields, { value: connection, onChange: noop }),
    h(WorkspaceBailianConnection, { value: { bailian: { workspaceId:'fixture', region:'cn-beijing' } }, onChange: noop }),
    h(WorkspaceCustomModel, { connection, role: 'image', models }),
    h(WorkspaceCustomModel, { connection, role: 'main', models }),
    h(WorkspaceCustomModel, { connection, role: 'vision', models }),
    h(WorkspaceCustomModel, { connection: {...connection, custom:{...connection.custom, protocol:'gemini-generate-content'}}, role: 'image', models }),
    ...['catalog', 'library', 'connections', 'api'].map(initialView => h(WorkspaceModelManager, { models, initialView })),
  ];
  let fields = 0;
  for (const scene of scenes) {
    const view = render(scene);
    assertSeparateControls(); fields += document.querySelectorAll('.control-field').length;
    if (scene.type === WorkspaceModelManager && scene.props.initialView === 'connections') {
      fireEvent.click(screen.getAllByRole('button', { name:'添加连接' })[0]);
      assertSeparateControls(); fields += document.querySelectorAll('.control-field').length;
    }
    view.unmount();
  }
  assert.ok(fields >= 65, `exercise nested and repeated forms, got ${fields}`);
});

test('R15 ordinary preset is a labelled full-width vertical field; only its control opens the menu', () => {
  const models = fixture(), before = structuredClone(models.library), draft = newDraft();
  const view = render(h(WorkspaceModelConfig, { models, draft, path:'png', onChange: noSave }));
  const control = screen.getByRole('combobox', { name:'普通预设' });
  const label = document.getElementById(control.getAttribute('aria-labelledby'));
  assert.equal(label.textContent, '普通预设');
  assert.equal(label.parentElement, control.parentElement);
  fireEvent.mouseOver(label); fireEvent.click(label);
  assert.equal(control.getAttribute('aria-expanded'), 'false');
  chooseMenuOption(control, 'c');
  assert.equal(control.value, 'c');
  assert.equal(screen.getByRole('button', { name:'应用此连接的默认组合' }).disabled, false);
  assert.deepEqual(models.library, before);
  assertSeparateControls(view.container);
  const css = read('../src/workspace/workspace.css');
  assert.match(css, /\.tw-field\.control-field\{display:grid;gap:8px;min-width:0\}/);
  assert.match(css, /\.tw-field\.control-field :is\(input,textarea,select,\.ui-select\)\{width:100%;margin:0\}/);
  assert.match(css, /\.tw-model-config \.tw-preset-group > small\{margin:0\}/);
  assert.ok(control.closest('.tw-preset-group.tw-field'));
  assert.match(css, /\.tw-dialog button:hover/);
  assert.doesNotMatch(read('../src/components/ControlField.css'), /:hover/);
});

test('R15 every unavailable notice keeps complete names in nowrap spans, including grouped and no-replacement notices', () => {
  for (const [provider, ids] of [['xiaomi', ['mimo-v2.5', 'mimo-v2.5-pro']], ['fireworks', ['accounts/fireworks/models/glm-5p2']], ['stepfun', ['step-2x-large']]]) {
    const models = fixture(ids); models.library.connections[0].provider = provider;
    for (const id of ids) {
      const view = render(h(ModelPicker, { registry: models.registry, route:{ accessProvider:provider, modelId:id }, label:'主模型', role:'main', outputFormat:'svg' }));
      const removed = removedModel(provider, id), notice = screen.getByRole('status');
      assert.deepEqual([...notice.querySelectorAll('.model-name-nowrap')].map(node => node.textContent),
        [removed.displayName, ...(removed.replacementApiId ? [removed.replacementDisplayName] : [])]);
      view.unmount();
    }
    const view = render(h(WorkspaceModelCatalog, { models, mode:'library' }));
    const notices = view.container.querySelectorAll('.model-unavailable-notice');
    assert.equal(notices.length, ids.length);
    notices.forEach((notice, i) => {
      const row = removedModel(provider, ids[i]);
      assert.deepEqual([...notice.querySelectorAll('.model-name-nowrap')].map(node => node.textContent),
        [row.displayName, ...(row.replacementApiId ? [row.replacementDisplayName] : [])]);
    });
    view.unmount();
  }
});

test('R15 mobile notice puts 改选 on a separate left-aligned line with exactly 8px gap', () => {
  const style = document.createElement('style'); style.textContent = read('../src/components/modelUnavailable.css');
  document.head.append(style);
  try {
    const rules = [...style.sheet.cssRules];
    const nowrap = rules.find(rule => rule.selectorText === '.model-name-nowrap');
    assert.equal(nowrap.style.getPropertyValue('white-space'), 'nowrap');
    assert.equal(nowrap.style.getPropertyValue('display'), 'inline-block');
    const media = rules.find(rule => rule.conditionText === '(max-width: 480px)');
    assert.ok(media, 'the narrow-screen rule must be present');
    const notice = [...media.cssRules].find(rule => rule.selectorText === '.model-unavailable-notice');
    assert.equal(notice.style.getPropertyValue('flex-direction'), 'column');
    assert.equal(notice.style.getPropertyValue('align-items'), 'flex-start');
    assert.equal(notice.style.getPropertyValue('gap'), '8px');
    const button = [...media.cssRules].find(rule => rule.selectorText === '.model-unavailable-notice > button');
    assert.equal(button.style.getPropertyValue('align-self'), 'flex-start');
    assert.equal(button.style.getPropertyValue('margin'), '0px');
    const draft = newDraft(); draft.settings.simple.models = { main: current };
    render(h(WorkspaceModelConfig, { models: fixture(), draft, path:'svg', onChange: noSave }));
    const action = screen.getByRole('button', { name:'改选' });
    assert.ok(action.parentElement.matches('.model-unavailable-notice'));
    assert.ok(action.previousElementSibling.matches('.model-unavailable-text'));
    fireEvent.click(action);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name:'取消' }));
  } finally { style.remove(); }
});
