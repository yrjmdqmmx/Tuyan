import { changeControl } from './menu-helpers.mjs';
import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React,{useReducer} from 'react';
import {render,screen,cleanup,fireEvent,waitFor} from '@testing-library/react';
import {indexedDB} from 'fake-indexeddb';
import TaskWorkspace from '../src/workspace/TaskWorkspace.jsx';
import WorkspaceSvgEditor from '../src/workspace/WorkspaceSvgEditor.jsx';
import {newWorkspace,workspaceReducer,currentTask,selectedVersion} from '../src/workspace/workspaceState.js';
import {parseSvg} from '../src/lib/svgDocument.js';
import {readSvgDraft,saveSvgDraft,retireSvgDraft,journalDraft,svgDraftKey} from '../src/lib/svgDrafts.js';
window.indexedDB=indexedDB;
window.matchMedia=query=>({matches:false,media:query,addEventListener(){},removeEventListener(){}});
const fetchOriginal=globalThis.fetch;
afterEach(()=>{cleanup();globalThis.fetch=fetchOriginal;window.localStorage.clear();});
const source='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><defs><linearGradient id="g"><stop stop-color="#123"/><stop offset="1" stop-color="#abc"/></linearGradient></defs><rect id="box" x="40" y="40" width="120" height="80" fill="url(#g)"/><text x="80" y="200">原始图示</text></svg>';
function initial(id){
 let s=newWorkspace(id);const send=(type,rest={})=>{s=workspaceReducer(s,{type,...rest});};
 send('SET_PATH',{path:'svg'});send('EDIT_DRAFT',{patch:{text:'原始要求'}});send('BEGIN',{runId:'r'});send('ACCEPT',{runId:'r'});
 send('RESULT',{runId:'r',candidateId:'a',label:'A',version:{id:'v1',format:'svg',url:'data:image/svg+xml,'+encodeURIComponent(source)}});send('FINISH',{runId:'r'});send('EDIT_DRAFT',{patch:{text:'保留下一次要求'}});return s;
}
const click=name=>fireEvent.click(screen.getByRole('button',{name,exact:true}));
async function recolor(value){
 click('图层 / 对象');click('对象：矩形 · box');
 const fill=screen.getByLabelText('填充');changeControl(fill,{target:{value}});fireEvent.blur(fill);
 await waitFor(()=>assert.equal(document.querySelector('.svg-document-host')?.shadowRoot.querySelector('#box')?.getAttribute('fill'),value));
 fireEvent.keyDown(screen.getByLabelText('SVG 直接编辑画布'),{key:'Escape'});
}
test('edits automatically save in the original task, keep the editor and undo history, and reopen the latest version',async()=>{
 let latest,send;const saved=[];
 function Harness(){const [state,dispatch]=useReducer(workspaceReducer,initial('inline-auto'));latest=state;send=dispatch;return React.createElement(TaskWorkspace,{state,dispatch,renderSvgEditor:version=>React.createElement(WorkspaceSvgEditor,{key:currentTask(state).id,version,versionIds:currentTask(state).branches.svg.groups.flatMap(g=>g.candidates.flatMap(c=>c.versions.map(v=>v.id))),taskId:currentTask(state).id,userId:'owner',base:'https://inline.test',dataProtected:false,onSave:async(svg,ids)=>{saved.push(svg);dispatch({type:'SAVE_SVG',taskId:'inline-auto',...ids,select:false,url:'data:image/svg+xml,'+encodeURIComponent(svg)});dispatch({type:'FOLLOW_SVG_SAVE',taskId:'inline-auto',...ids});}})});}
 const {container}=render(React.createElement(Harness));const original=structuredClone(selectedVersion(latest));
 await screen.findByLabelText('SVG 直接编辑画布');
 assert.equal(screen.queryByRole('button',{name:'保存为新版本'}),null);
 assert.ok(container.querySelector('.tw-results .tw-canvas .svg-viewport'));
 const canvas=screen.getByLabelText('SVG 直接编辑画布');
 await recolor('#f00');click('撤销');click('重做');
 await waitFor(()=>assert.equal(selectedVersion(latest).number,2),{timeout:2500});
 assert.equal(screen.getByLabelText('SVG 直接编辑画布'),canvas,'automatic save must not remount the editor');
 assert.equal(screen.getByRole('button',{name:'撤销',exact:true}).disabled,false);
 assert.equal(saved.length,1);assert.equal(parseSvg(saved[0]).root.querySelector('#box').getAttribute('fill'),'#f00');assert.ok(parseSvg(saved[0]).root.querySelector('linearGradient'));
 assert.equal(screen.getByLabelText('修改要求').value,'保留下一次要求');
 const versions=currentTask(latest).branches.svg.groups[0].candidates[0].versions;
 assert.equal(versions.length,2);assert.equal(versions[0].url,original.url);assert.equal(versions[1].parentId,'v1');assert.equal(versions[1].review,'修改后未复审');
 click('图像创作');click('矢量绘图');await screen.findByLabelText('SVG 直接编辑画布');
 await waitFor(()=>assert.equal(document.querySelector('.svg-document-host')?.shadowRoot.querySelector('#box')?.getAttribute('fill'),'#f00'));
 await waitFor(async()=>assert.equal(await readSvgDraft(svgDraftKey('https://inline.test','owner','inline-auto','v1')),null));
 await (await import('@testing-library/react')).act(async()=>send({type:'VIEW',path:'svg',versionId:'v1'}));
 await waitFor(()=>assert.equal(document.querySelector('.svg-document-host')?.shadowRoot.querySelector('#box')?.getAttribute('fill'),'url(#g)'));
 assert.equal(latest.tasks.length,1);
});
test('failed auto-save keeps the draft and retries the same version identity',async()=>{
 const calls=[];
 render(React.createElement(WorkspaceSvgEditor,{version:{id:'retry',url:'data:image/svg+xml,'+encodeURIComponent(source),candidateLabel:'A',number:1},taskId:'retry-task',base:'https://inline.test',userId:'owner',dataProtected:false,onSave:async(svg,ids)=>{calls.push(ids);if(calls.length===1)throw Error('本机保存失败');}}));
 await screen.findByLabelText('SVG 直接编辑画布');await recolor('#00f');
 await screen.findByText('本机保存失败',{}, {timeout:2500});
 assert.ok(await readSvgDraft(svgDraftKey('https://inline.test','owner','retry-task','retry')));
 click('重试自动保存');await waitFor(()=>assert.equal(calls.length,2));await waitFor(()=>assert.equal(screen.queryByText('本机保存失败'),null));assert.deepEqual(calls[0],calls[1]);
});
test('source load failure can be retried without leaving the result pane',async()=>{
 let calls=0;globalThis.fetch=async()=>++calls===1?new Response('',{status:503}):new Response(source);
 render(React.createElement(WorkspaceSvgEditor,{version:{id:'load',url:'https://inline.test/result.svg',candidateLabel:'B',number:2},taskId:'load-task',base:'https://inline.test',userId:'owner',onClose(){},onSave(){assert.fail('must not save on load');}}));
 await screen.findByText('SVG 版本读取失败');assert.equal(screen.queryByRole('dialog'),null);click('重试载入');await screen.findByLabelText('SVG 直接编辑画布');assert.equal(calls,2);
});

test('renewed URLs for the same version do not reload or erase an unsaved edit',async()=>{
 let fetches=0;globalThis.fetch=async()=>{fetches++;return new Response(source);};
 const props={version:{id:'renew',url:'https://inline.test/old.svg',candidateLabel:'A',number:1},taskId:'renew-task',base:'https://inline.test',userId:'owner',dataProtected:false,onSave(){}};
 const rendered=render(React.createElement(WorkspaceSvgEditor,props));await screen.findByLabelText('SVG 直接编辑画布');await recolor('#0f0');
 rendered.rerender(React.createElement(WorkspaceSvgEditor,{...props,version:{...props.version,url:'https://inline.test/renewed.svg'}}));
 assert.equal(fetches,1);assert.equal(document.querySelector('.svg-document-host')?.shadowRoot.querySelector('#box').getAttribute('fill'),'#0f0');
});
test('a fresh vector task shows a blank editor without saving an empty version; first saves are idempotent',async()=>{
 let state=workspaceReducer(newWorkspace('blank-task'),{type:'SET_PATH',path:'svg'}),saved=0;
 render(React.createElement(TaskWorkspace,{state,dispatch(){},renderSvgEditor:version=>React.createElement(WorkspaceSvgEditor,{version,taskId:'blank-task',base:'https://inline.test',userId:'owner',dataProtected:false,onSave(){saved++;}})}));
 await screen.findByLabelText('SVG 直接编辑画布');assert.equal(screen.queryByRole('button',{name:'保存为新版本'}),null);assert.equal(currentTask(state).runs.length,0);assert.equal(saved,0);
 const first={type:'SAVE_SVG',taskId:'blank-task',versionId:'manual-first',runId:'manual-run',url:'data:image/svg+xml,'+encodeURIComponent(source),select:false};
 state=workspaceReducer(state,first);assert.equal(selectedVersion(state),null);assert.equal(currentTask(state).runs.length,1);
 state=workspaceReducer(state,first);assert.equal(currentTask(state).runs.length,1);
 state=workspaceReducer(state,{type:'VIEW',path:'svg',versionId:'manual-first'});assert.equal(selectedVersion(state).parentId,null);assert.equal(selectedVersion(state).number,1);
});

test('shape menu glyphs match their tool and properties live beside the canvas',async()=>{
 render(React.createElement(WorkspaceSvgEditor,{version:{id:'inspector',url:'data:image/svg+xml,'+encodeURIComponent(source),candidateLabel:'A',number:1},taskId:'inspector-task',base:'https://inline.test',userId:'owner',dataProtected:false,onSave(){}}));
 await screen.findByLabelText('SVG 直接编辑画布');
 for(const [label,kind] of [['矩形','rect'],['圆角矩形','roundrect'],['椭圆','ellipse'],['圆形','circle'],['直线','line'],['箭头','arrow'],['贝塞尔曲线','curve'],['椭圆弧','arc']]){
  const button=screen.getByRole('button',{name:label,exact:true,hidden:true});assert.equal(button.querySelector('svg')?.getAttribute('data-shape'),kind);
 }
 click('图层 / 对象');click('对象：矩形 · box');
 const panel=screen.getByRole('toolbar',{name:'选中对象属性'});assert.ok(panel.closest('.svg-editing-area'));assert.ok(panel.classList.contains('is-side'));
 fireEvent.keyDown(screen.getByLabelText('SVG 直接编辑画布'),{key:'Escape'});
});

test('retiring a committed draft never deletes a newer concurrent tab draft or journal',async()=>{
 const key=svgDraftKey('https://inline.test','owner','cas','v1');
 const committed={key,writer:'old',revision:1,baseRevision:0,svg:source};
 await saveSvgDraft(committed);
 const newer={...committed,writer:'new',baseRevision:1,revision:2,svg:source.replace('原始图示','new work')};
 await saveSvgDraft(newer);journalDraft({...newer,revision:3});
 await retireSvgDraft(key,committed);assert.equal((await readSvgDraft(key)).revision,3);
});

test('reopening the original task resumes a pending automatic edit, while old manual backups require explicit recovery',async()=>{
 const taskId='resume-original',base='https://inline.test',key=svgDraftKey(base,'owner',taskId,'v1');
 const pending=source.replace('原始图示','未同步的最后修改');
 await saveSvgDraft({key,writer:'previous-page',revision:1,baseRevision:0,taskId,candidateId:'v1',svg:pending,autoSave:true,baseVersionId:'v1',resumeVersionId:'not-yet-committed',updatedAt:Date.now()});
 const props={version:{id:'v1',url:'data:image/svg+xml,'+encodeURIComponent(source)},versionIds:['v1'],taskId,base,userId:'owner',dataProtected:false,onSave:async()=>{throw Error('offline fixture');}};
 const view=render(React.createElement(WorkspaceSvgEditor,props));await screen.findByLabelText('SVG 直接编辑画布');
 assert.match(document.querySelector('.svg-document-host').shadowRoot.textContent,/未同步的最后修改/);
 assert.equal(screen.queryByRole('button',{name:'恢复编辑内容'}),null);view.unmount();
 const legacyTask='legacy-original',legacyKey=svgDraftKey(base,'owner',legacyTask,'v1');
 await saveSvgDraft({key:legacyKey,writer:'legacy',revision:1,baseRevision:0,taskId:legacyTask,candidateId:'v1',svg:pending,updatedAt:Date.now()});
 render(React.createElement(WorkspaceSvgEditor,{...props,taskId:legacyTask,onSave:async()=>{}}));await screen.findByLabelText('SVG 直接编辑画布');
 assert.match(document.querySelector('.svg-document-host').shadowRoot.textContent,/原始图示/);
 click('恢复编辑内容');assert.match(document.querySelector('.svg-document-host').shadowRoot.textContent,/未同步的最后修改/);
});
test('a backup from a save interrupted after task commit resumes at its committed version without replacing historic views',async()=>{
 const base='https://inline.test',taskId='interrupted-commit',key=svgDraftKey(base,'owner',taskId,'v1');
 await saveSvgDraft({key,writer:'interrupted',revision:1,baseRevision:0,taskId,candidateId:'v1',svg:source.replace('原始图示','编辑仍在进行'),autoSave:true,baseVersionId:'v1',resumeVersionId:'v2',updatedAt:Date.now()});
 render(React.createElement(WorkspaceSvgEditor,{version:{id:'v2',url:'data:image/svg+xml,'+encodeURIComponent(source.replace('原始图示','已保存修改'))},versionIds:['v1','v2'],taskId,base,userId:'owner',onSave:async()=>{}}));
 await screen.findByLabelText('SVG 直接编辑画布');assert.match(document.querySelector('.svg-document-host').shadowRoot.textContent,/编辑仍在进行/);
});
test('cloud failures are shown as unsynced rather than claiming an account save',async()=>{
 render(React.createElement(WorkspaceSvgEditor,{version:{id:'offline-label',url:'data:image/svg+xml,'+encodeURIComponent(source)},taskId:'offline-label',base:'https://inline.test',userId:'owner',syncStatus:'error',syncError:'合成账号离线',onRetrySync(){},onSave:async()=>{}}));
 await screen.findByLabelText('SVG 直接编辑画布');assert.ok(screen.getByText('已保存在本机，账号同步未完成'));assert.ok(screen.getByText('合成账号离线'));assert.equal(screen.queryByText('已自动保存并同步账号'),null);
});
test('starting a different edit preserves an un-restored legacy backup',async()=>{
 const base='https://inline.test',taskId='keep-legacy',key=svgDraftKey(base,'owner',taskId,'v1');
 const legacy=source.replace('原始图示','保留旧备份');
 await saveSvgDraft({key,writer:'legacy',revision:1,baseRevision:0,taskId,candidateId:'v1',svg:legacy,updatedAt:Date.now()});
 let saves=0;
 render(React.createElement(WorkspaceSvgEditor,{version:{id:'v1',url:'data:image/svg+xml,'+encodeURIComponent(source)},taskId,base,userId:'owner',dataProtected:false,onSave:async()=>{saves++;}}));
 await screen.findByLabelText('SVG 直接编辑画布');await recolor('#009900');await waitFor(()=>assert.equal(saves,1),{timeout:2500});
 assert.equal((await readSvgDraft(key)).svg,legacy);
});
test('legacy job-index backups are offered only inside the exact source task and retained after recovery',async()=>{
 const base='https://inline.test',jobId='confirmed-server-job',key=svgDraftKey(base,'owner',jobId,0),legacy=source.replace('原始图示','旧工作台编辑');
 await saveSvgDraft({key,writer:'old-editor',revision:1,baseRevision:0,taskId:jobId,candidateId:0,svg:legacy,updatedAt:Date.now()});
 let calls=[];
 render(React.createElement(WorkspaceSvgEditor,{version:{id:'imported-v1',url:'data:image/svg+xml,'+encodeURIComponent(source),history:{source:'core',jobId,index:0}},taskId:'original-imported-task',base,userId:'owner',onSave:async(svg,ids)=>calls.push({svg,ids})}));
 await screen.findByLabelText('SVG 直接编辑画布');assert.match(document.querySelector('.svg-document-host').shadowRoot.textContent,/原始图示/);click('恢复编辑内容');
 await waitFor(()=>assert.equal(calls.length,1),{timeout:2500});assert.equal(calls[0].ids.parentId,'imported-v1');assert.match(calls[0].svg,/旧工作台编辑/);assert.equal((await readSvgDraft(key)).svg,legacy);
});
