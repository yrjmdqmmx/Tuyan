import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FigureStudioEditor } from './FigureStudio.jsx';
import { STORAGE_KEY } from './state.js';

afterEach(() => { cleanup(); window.localStorage.clear(); });

test('account changes invalidate export capabilities while retaining the local editable source', async () => {
  const previousFetch = globalThis.fetch;
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = window.localStorage;
  const pending = [];
  globalThis.fetch = async (_url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : {};
    if (body.action === 'figureStudioCapabilities') return new Promise((resolve) => pending.push(resolve));
    return Response.json({ code: 0, runtime: 'laf', providers: {} });
  };
  try {
    const props = { auth: { isPending: false }, onSignIn() {} };
    const view = render(<FigureStudioEditor {...props} currentUser={{ id: 'a' }} authGeneration={1} />);
    await waitFor(() => assert.equal(pending.length, 1));
    fireEvent.click(screen.getByRole('button', { name: '添加文字' }));
    assert.match(screen.getByRole('region', { name: '图稿画布' }).textContent, /1 个独立对象/);
    view.rerender(<FigureStudioEditor {...props} currentUser={{ id: 'b' }} authGeneration={2} />);
    await waitFor(() => assert.equal(pending.length, 2));
    fireEvent.click(screen.getByRole('button', { name: '导出', exact: true }));
    await act(async () => pending[0](Response.json({ code: 0, formats: { pdf: true } })));
    assert.equal(screen.getByRole('button', { name: 'PDF', exact: true }).disabled, true);
    await act(async () => pending[1](Response.json({ code: 0, formats: { pdf: true } })));
    assert.equal(screen.getByRole('button', { name: 'PDF', exact: true }).disabled, false);
    let loginRequests = 0;
    view.rerender(<FigureStudioEditor {...props} onSignIn={() => loginRequests++} currentUser={null} authGeneration={3} />);
    assert.equal(screen.queryByRole('dialog'), null);
    fireEvent.click(screen.getByRole('button', { name: '导出', exact: true }));
    assert.equal(screen.getByRole('button', { name: 'PDF', exact: true }).disabled, false);
    fireEvent.click(screen.getByRole('button', { name: 'PDF', exact: true }));
    assert.equal(loginRequests, 1);
    assert.match(screen.getByRole('region', { name: '图稿画布' }).textContent, /1 个独立对象/);
  } finally { globalThis.fetch = previousFetch; globalThis.localStorage = previousStorage; }
});

test('anonymous authors can edit locally and open the shared login without sending model work', async () => {
  const previousFetch = globalThis.fetch;
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = window.localStorage;
  const actions = []; let loginRequests = 0;
  globalThis.fetch = async (_url, options = {}) => {
    actions.push(options.body ? JSON.parse(options.body).action : 'health');
    return Response.json({ code: 0, runtime: 'laf', providers: {} });
  };
  try {
    render(<FigureStudioEditor auth={{ isPending: false }} currentUser={null} authGeneration={0} onSignIn={() => loginRequests++} />);
    fireEvent.change(screen.getByLabelText('研究材料与制图目标'), { target: { value: 'Synthetic research outline' } });
    fireEvent.click(screen.getByRole('button', { name: '生成结构方案' }));
    assert.ok(!actions.includes('figureStudioPlan'));
    assert.equal(screen.queryByRole('button', { name: '登录图研', exact: true }), null);
    assert.equal(loginRequests, 1);
    fireEvent.click(screen.getByRole('button', { name: '添加矩形' }));
    assert.match(screen.getByRole('region', { name: '图稿画布' }).textContent, /1 个独立对象/);
  } finally { globalThis.fetch = previousFetch; globalThis.localStorage = previousStorage; }
});

for (const scenario of [
  { name: 'direct account switch', provider: 'openai', label: 'OpenAI', transitions: [{ id: 'b' }] },
  { name: 'sign-out followed by another account', provider: 'minimax', label: 'MiniMax', transitions: [null, { id: 'b' }] },
]) {
  test(`${scenario.name} cannot restore the previous account's key through the actual model settings`, async () => {
    const previousFetch = globalThis.fetch;
    const previousStorage = globalThis.localStorage;
    globalThis.localStorage = window.localStorage;
    const requests = [];
    const capabilities = { code: 0, modelPlanning: true, supportedModelModes: ['api-key'], supportedProviders: [scenario.provider] };
    const registry = { code: 0, routeContractVersion: 1, providerRegionContractVersion: 1, providers: {
      [scenario.provider]: { accessKind: 'direct', models: [{ id: 'exact-fixture', label: 'Account fixture', vendor: scenario.label, roles: ['main'], selectable: true, regions: ['global', 'cn'] }] },
    } };
    globalThis.fetch = async (_url, options = {}) => {
      const body = options.body ? JSON.parse(options.body) : {};
      requests.push(body);
      if (body.action === 'figureStudioCapabilities') return Response.json(capabilities);
      if (body.action === 'modelRegistry') return Response.json(registry);
      if (body.action === 'figureStudioPlan') return Response.json({ code: 0, plan: { title: 'New account plan', summary: '', nodes: [{ id: 'n1', label: 'Synthetic node' }], edges: [], notes: [] } });
      return Response.json({ code: 0, runtime: 'laf' });
    };
    async function selectSameModel() {
      fireEvent.click(screen.getByRole('button', { name: '规划与编辑模型设置' }));
      await waitFor(() => assert.equal(screen.getByRole('button', { name: '刷新目录' }).disabled, false));
      fireEvent.click(screen.getByRole('button', { name: '主模型' }));
      fireEvent.click(screen.getByRole('button', { name: scenario.label, exact: true }));
      fireEvent.click(screen.getByRole('button', { name: '选择 Account fixture' }));
      if (scenario.provider === 'minimax') fireEvent.change(screen.getByLabelText('MiniMax 区域'), { target: { value: 'cn' } });
      return screen.getByLabelText(`${scenario.label} 接入密钥`);
    }
    try {
      const props = { auth: { isPending: false }, onSignIn() {} };
      const view = render(<FigureStudioEditor {...props} currentUser={{ id: 'a' }} authGeneration={1} />);
      fireEvent.change(await selectSameModel(), { target: { value: 'synthetic-account-a-key' } });
      let generation = 1;
      for (const currentUser of scenario.transitions) {
        view.rerender(<FigureStudioEditor {...props} currentUser={currentUser} authGeneration={++generation} />);
        const input = await selectSameModel();
        assert.equal(input.value, '', 'reselecting the old channel and region must not recover its key');
        if (!currentUser) fireEvent.change(input, { target: { value: 'synthetic-anonymous-key' } });
      }
      fireEvent.click(screen.getByRole('button', { name: '关闭生成设置' }));
      fireEvent.change(screen.getByLabelText('研究材料与制图目标'), { target: { value: 'Synthetic research outline' } });
      fireEvent.click(screen.getByRole('button', { name: '生成结构方案' }));
      assert.match(screen.getByRole('alert').textContent, /请填写所选渠道的 API Key/);
      assert.equal(requests.filter((body) => body.action === 'figureStudioPlan').length, 0);

      fireEvent.click(screen.getByRole('button', { name: '规划与编辑模型设置' }));
      fireEvent.change(screen.getByLabelText(`${scenario.label} 接入密钥`), { target: { value: 'synthetic-account-b-key' } });
      fireEvent.click(screen.getByRole('button', { name: '关闭生成设置' }));
      fireEvent.click(screen.getByRole('button', { name: '生成结构方案' }));
      await screen.findByRole('heading', { name: '确认方案' });
      const submitted = requests.filter((body) => body.action === 'figureStudioPlan');
      assert.equal(submitted.length, 1);
      assert.deepEqual(submitted[0].apiKeys, { [scenario.provider]: 'synthetic-account-b-key' });
      assert.deepEqual(submitted[0].mainRoute, { accessProvider: scenario.provider, modelId: 'exact-fixture' });
      if (scenario.provider === 'minimax') assert.deepEqual(submitted[0].providerRegions, { minimax: 'cn' });
      assert.doesNotMatch(JSON.stringify(requests), /synthetic-account-a-key|synthetic-anonymous-key/);
    } finally { globalThis.fetch = previousFetch; globalThis.localStorage = previousStorage; }
  });
}


test('collapsing panels and expanding the editor preserves material input, source bytes and original panel choices', () => {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = window.localStorage;
  try {
    render(<FigureStudioEditor auth={{ isPending: false }} currentUser={null} authGeneration={0} onSignIn={() => {}} />);
    fireEvent.change(screen.getByLabelText('研究材料与制图目标'), { target: { value: 'Preserved synthetic material' } });
    fireEvent.click(screen.getByRole('button', { name: '添加矩形' }));
    const source = localStorage.getItem(STORAGE_KEY);
    fireEvent.click(screen.getByRole('button', { name: '收起材料面板' }));
    assert.equal(screen.queryByRole('complementary', { name: '材料与对象面板' }), null);
    fireEvent.click(screen.getByRole('button', { name: '展开编辑区' }));
    assert.equal(screen.queryByRole('complementary', { name: '属性与规则面板' }), null);
    assert.equal(screen.getByRole('button', { name: '还原编辑区' }).getAttribute('aria-pressed'), 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    assert.equal(screen.getByRole('button', { name: '展开编辑区' }).getAttribute('aria-pressed'), 'false');
    assert.equal(screen.queryByRole('complementary', { name: '材料与对象面板' }), null);
    assert.ok(screen.getByRole('complementary', { name: '属性与规则面板' }));
    fireEvent.click(screen.getByRole('button', { name: '展开材料面板' }));
    fireEvent.click(screen.getByRole('tab', { name: '材料与结构' }));
    assert.equal(screen.getByLabelText('研究材料与制图目标').value, 'Preserved synthetic material');
    assert.equal(localStorage.getItem(STORAGE_KEY), source);
  } finally { globalThis.localStorage = previousStorage; }
});

test('a pending login check never opens another auth flow or dispatches model work', () => {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = window.localStorage;
  let loginRequests = 0;
  try {
    render(<FigureStudioEditor auth={{ isPending: true }} currentUser={null} authGeneration={0} onSignIn={() => loginRequests++} />);
    fireEvent.change(screen.getByLabelText('研究材料与制图目标'), { target: { value: 'Synthetic content' } });
    fireEvent.click(screen.getByRole('button', { name: '生成结构方案' }));
    assert.equal(loginRequests, 0);
    assert.ok(screen.getAllByRole('status').some((node) => /正在检查登录状态/.test(node.textContent)));
    fireEvent.click(screen.getByRole('button', { name: '添加矩形' }));
    assert.match(screen.getByRole('region', { name: '图稿画布' }).textContent, /1 个独立对象/);
  } finally { globalThis.localStorage = previousStorage; }
});
