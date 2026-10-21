import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useReducer, useRef, StrictMode } from 'react';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import TaskWorkspace from '../src/workspace/TaskWorkspace.jsx';
import WorkspaceOptimize from '../src/workspace/WorkspaceOptimize.jsx';
import { withOptimizationMaterials } from '../src/workspace/workspaceOptimization.js';
import { newWorkspace, workspaceReducer, currentDraft } from '../src/workspace/workspaceState.js';
window.matchMedia = query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} });
const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; });
const models = { library: { revision: 1, connections: [{ id: 'c', provider: 'channel', hasCredential: true }], models: [{ id: 'm', connectionId: 'c', modelId: 'text' }] }, registry: { providers: { channel: { models: [{ id: 'text', roles: ['main'], selectable: true, inputModalities: ['text'] }] } } } };
function initial() {
 const s = newWorkspace('optimization'); const d = currentDraft(s); d.text = '原始要求'; d.settings.simple.models = { main: { libraryModelId: 'm' } }; return s;
}
function Harness() {
 const [state, dispatch] = useReducer(workspaceReducer, undefined, initial), stateRef = useRef(state); stateRef.current = state;
 return React.createElement(TaskWorkspace, { state, dispatch, renderOptimize: children => React.createElement(WorkspaceOptimize, { stateRef, dispatch, models, userId: 'u', health: { simulation: true }, sync: { ensureSynced: async () => {} } }, children) });
}
const click = name => fireEvent.click(screen.getByRole('button', { name, exact: true }));
test('one click starts once in StrictMode without a dialog; adoption and undo retain manual edits', async () => {
 let calls = 0, resolve; globalThis.fetch = async () => { calls++; return new Promise(r => { resolve = r; }); };
 render(React.createElement(StrictMode, null, React.createElement(Harness)));
 assert.equal(calls, 0); click('优化输入');
 await waitFor(() => assert.equal(calls, 1)); assert.equal(screen.queryByRole('dialog'), null);
 assert.equal(screen.getByRole('button', { name: '优化中…', exact: true }).disabled, true);
 fireEvent.change(screen.getByLabelText('绘图要求'), { target: { value: '等待期间的新要求' } });
 await act(async () => resolve(Response.json({ target: 'methodContent', optimizedText: '优化后的要求' })));
 await screen.findByText('优化稿'); click('采用优化稿');
 assert.equal(screen.getByLabelText('绘图要求').value, '等待期间的新要求'); assert.ok(screen.getByRole('alert'));
 fireEvent.change(screen.getByLabelText('绘图要求'), { target: { value: '原始要求' } }); click('采用优化稿');
 assert.equal(screen.getByLabelText('绘图要求').value, '优化后的要求'); click('撤销采用'); assert.equal(screen.getByLabelText('绘图要求').value, '原始要求');
});
test('switching paths while a request is pending discards its late result and does not start another call', async () => {
 let calls = 0, resolve; globalThis.fetch = async () => { calls++; return new Promise(r => { resolve = r; }); };
 render(React.createElement(Harness)); click('优化输入'); await waitFor(() => assert.equal(calls, 1));
 click('矢量绘图'); await act(async () => resolve(Response.json({ target: 'methodContent', optimizedText: '过期优化稿' })));
 assert.equal(screen.queryByLabelText('优化后的绘图要求'), null); assert.equal(screen.getByLabelText('绘图要求').value, ''); assert.equal(calls, 1);
});
test('failure stays inline and never auto retries', async () => {
 let calls = 0; globalThis.fetch = async () => { calls++; return Response.json({ error: '模型暂时不可用' }, { status: 503 }); };
 render(React.createElement(Harness)); click('优化输入'); await screen.findByText('模型暂时不可用');
 assert.equal(calls, 1); assert.equal(screen.queryByRole('dialog'), null); assert.equal(screen.getByLabelText('绘图要求').value, '原始要求');
});
test('all attachment bytes are loaded, uploaded by identity, then cleaned after success', async () => {
 const events = []; const opts = { base: '', attachments: [{ id: 'a' }, { id: 'b' }], simulation: false, isCurrent: () => true, onProgress() {} };
 const io = { read: async a => { events.push('read:' + a.id); return new File(['content-' + a.id], a.id + '.txt'); }, upload: async f => { events.push(await f.text()); return { id: f.name }; }, remove: async id => events.push('remove:' + id) };
 await withOptimizationMaterials(opts, async refs => { assert.deepEqual(refs, [{ id: 'a.txt' }, { id: 'b.txt' }]); events.push('submit'); }, io);
 assert.deepEqual(events, ['read:a', 'read:b', 'content-a', 'content-b', 'submit', 'remove:a.txt', 'remove:b.txt']);
});
test('missing originals and navigation stop before inference; unknown responses retain temporary inputs', async () => {
 const opts = { attachments: [{ id: 'a' }], isCurrent: () => true, onProgress() {} }; let uploads = 0, calls = 0, removed = 0;
 const io = { read: async () => { throw Error('原件缺失'); }, upload: async () => { uploads++; return { id: 'a' }; }, remove: async () => removed++ };
 await assert.rejects(withOptimizationMaterials(opts, async () => calls++, io), /原件缺失/); assert.equal(uploads, 0);
 io.read = async () => new File(['content'], 'a.txt');
 await assert.rejects(withOptimizationMaterials({ ...opts, isCurrent: () => false }, async () => calls++, io), /切换/); assert.equal(calls, 0);
 await assert.rejects(withOptimizationMaterials(opts, async () => { calls++; throw Error('lost'); }, io), /lost/); assert.equal(removed, 0); assert.equal(calls, 1);
});
test('changing the selected source clears an old optimization offer without remounting the textbox',async()=>{
 function Ready(){let s=initial();for(const a of [{type:'BEGIN',runId:'r'},{type:'ACCEPT',runId:'r'},...['a','b'].map(id=>({type:'RESULT',runId:'r',candidateId:id,version:{id,format:'png',url:'data:image/png;base64,AA=='}})),{type:'FINISH',runId:'r'},{type:'EDIT_DRAFT',patch:{text:'change color'}}])s=workspaceReducer(s,a);return s;}
 function Sources(){const [state,dispatch]=useReducer(workspaceReducer,undefined,Ready),stateRef=useRef(state);stateRef.current=state;return React.createElement(TaskWorkspace,{state,dispatch,renderOptimize:children=>React.createElement(WorkspaceOptimize,{stateRef,dispatch,models,userId:'u',health:{simulation:true},sync:{ensureSynced:async()=>{}}},children)});}
 globalThis.fetch=async()=>Response.json({target:'editInstruction',optimizedText:'更精确的修改要求'});
 render(React.createElement(Sources));const textbox=screen.getByLabelText('修改要求');click('优化输入');await screen.findByText('优化稿');
 fireEvent.change(screen.getByLabelText('当前修改对象'),{target:{value:'b'}});
 assert.equal(screen.queryByRole('button',{name:'采用优化稿',exact:true}),null);assert.equal(screen.getByLabelText('修改要求'),textbox);
});
