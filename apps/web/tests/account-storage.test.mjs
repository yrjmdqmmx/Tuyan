import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {render,screen,cleanup,waitFor,fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {registerHooks} from 'node:module';
const hooks=registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default {}',shortCircuit:true}:next(url,context);}});
const {default:WorkspaceAccountPage}=await import('../src/workspace/WorkspaceAccountPage.jsx');
hooks.deregister();
import WorkspaceStoragePage from '../src/workspace/WorkspaceStoragePage.jsx';
import {projectImageAvailability} from '../src/workspace/useImageAvailability.js';
import {newWorkspace} from '../../../packages/api/src/workspace-defaults.mjs';
import {workspaceReducer} from '../src/workspace/workspaceState.js';
const originalFetch=globalThis.fetch;
afterEach(()=>{cleanup();globalThis.fetch=originalFetch;});
const activity={today:'2026-10-20',total:7,peak:4,longestStreak:2,currentStreak:1,days:[{date:'2026-10-20',count:3},{date:'2026-10-19',count:4}]};
const user={id:'fixture-A',name:'合成验收账号',email:'fixture@example.test',image:'data:image/webp;base64,AA=='};
const props={account:{user,refreshAccount:async()=>{},onSignIn(){},onAccountSettings(){},onSignOut(){}},state:newWorkspace('fixture-task'),sync:{saveStatus:'已同步',retry(){}},models:{tokenDance:{connection:{connected:false},userId:null}},onExport(){},apiBase:'http://127.0.0.1:9999'};
test('three settings pages reuse activity and avatar workflow, preserve switching state and show server storage errors',async()=>{
  const calls=[];globalThis.fetch=async(url,options)=>{calls.push([url,options]);return new Response(JSON.stringify(url.endsWith('/activity')?activity:{error:'真实存储读取失败'}),{status:url.endsWith('/activity')?200:503});};
  render(React.createElement(WorkspaceAccountPage,props));
  assert.equal(screen.getByRole('button',{name:'个人资料',exact:true}).getAttribute('aria-current'),'page');
  await waitFor(()=>assert.ok(document.querySelector('.tw-drawing-activity')));
  assert.ok(screen.getAllByRole('button',{name:'更换头像',exact:true}).length);
  await userEvent.click(screen.getByRole('button',{name:'账户',exact:true}));
  assert.ok(screen.getByRole('button',{name:'编辑昵称'}));assert.ok(screen.getByRole('button',{name:'更换登录邮箱'}));
  await userEvent.click(screen.getByRole('button',{name:'编辑昵称'}));
  fireEvent.change(screen.getByLabelText('账号昵称'),{target:{value:'未保存的昵称'}});
  await userEvent.click(screen.getByRole('button',{name:'个人资料',exact:true}));
  await userEvent.click(screen.getByRole('button',{name:'账户',exact:true}));
  assert.equal(screen.getByLabelText('账号昵称').value,'未保存的昵称');
  assert.equal(calls.filter(([url])=>url.endsWith('/activity')).length,1);
  await userEvent.click(screen.getByRole('button',{name:'存储',exact:true}));
  await screen.findByRole('alert');assert.match(screen.getByRole('alert').textContent,/真实存储读取失败/);
  assert.match(screen.getByText(/已用/).textContent,/—/);assert.doesNotMatch(screen.getByText(/已用/).textContent,/已用 0/);
});
test('storage uses server byte totals, independent files remain previewable and missing task links stay absent',async()=>{
  const id='a'.repeat(64);let returned='';
  const image={id,format:'svg',size:62,savedAt:'2026-10-19T01:00:00Z',expiresAt:'2026-11-18T01:00:00Z',taskIds:[]};
  globalThis.fetch=async url=>new Response(JSON.stringify(url.endsWith(id)?{...image,base64:btoa('<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\"/>')}:{images:[image],usedBytes:68_000_000,maxBytes:100_000_000,pendingBytes:1_000_000}));
  render(React.createElement(WorkspaceStoragePage,{userId:'fixture-A',apiBase:'http://localhost',onOpenTask:id=>returned=id}));
  await screen.findByText('已用 68 MB / 100 MB');
  assert.ok(screen.getByText(/1 MB 等待服务器清理/));assert.equal(screen.queryByRole('button',{name:'返回任务'}),null);
  await userEvent.click(screen.getByRole('button',{name:/预览 SVG 图片/}));
  await screen.findByRole('dialog',{name:'图片预览'});assert.ok(screen.getByRole('img',{name:'已保存图片预览'}));assert.equal(returned,'');
  await userEvent.click(screen.getByRole('button',{name:'关闭图片预览'}));
  assert.equal(screen.queryByRole('dialog'),null);
});
test('server tombstones clear every duplicate reference without editing task content or statistics',()=>{
  let state=newWorkspace('fixture-task');
  state=workspaceReducer(state,{type:'SET_PATH',path:'svg'});
  state=workspaceReducer(state,{type:'SAVE_SVG',runId:'manual-run',versionId:'version-a',url:'data:image/svg+xml,<svg/>'});
  const version=state.tasks[0].branches.svg.groups[0].candidates[0].versions[0];version.resultId='a'.repeat(64);
  const before=structuredClone(state),result=projectImageAvailability(state,[{id:version.resultId,status:'removed',reason:'capacity'}]);
  assert.deepEqual(state,before);const projected=result.tasks[0].branches.svg.groups[0].candidates[0].versions[0];
  assert.equal(projected.url,'');assert.equal(projected.loadError,'因存储空间不足已清理');
  assert.equal(result.tasks[0].runs,state.tasks[0].runs);
  delete version.resultId;version.history={jobId:'job-with-skipped-candidate',index:0};
  const history=projectImageAvailability(state,[{id:'b'.repeat(64),status:'removed',reason:'expired',sources:[{jobId:version.history.jobId,candidateId:2,resultIndex:0}]}]);
  assert.equal(history.tasks[0].branches.svg.groups[0].candidates[0].versions[0].loadError,'图片已过期');
});

test('download validates saved account results again even when a cached data URL exists',async()=>{
 const {workspaceVersionDataUrl}=await import('../src/workspace/workspaceResultAsset.js');let requested;
 globalThis.fetch=async(url,options)=>{requested={url,options};return new Response(JSON.stringify({error:'图片已过期'}),{status:410});};
 await assert.rejects(workspaceVersionDataUrl({resultId:'b'.repeat(64),format:'png',url:'data:image/png;base64,AA=='},'http://localhost','A'),/图片已过期/);
 assert.equal(requested.options.headers['X-Workspace-Account'],'A');assert.match(requested.url,/api\/workspace\/results/);
});

test('unknown historical dates remain readable and are never presented as 1970 or an expiry',async()=>{
  globalThis.fetch=async()=>new Response(JSON.stringify({maxBytes:100000000,usedBytes:1024,protectedBytes:1024,unavailableHistoryCount:2,images:[{id:'a'.repeat(64),format:'png',size:1024,savedAt:null,expiresAt:null,retentionHold:true,taskIds:[]}]}));
  render(React.createElement(WorkspaceStoragePage,{userId:'fixture-A',apiBase:'http://127.0.0.1:9999'}));
  await screen.findByText('历史图片暂予保留');
  assert.ok(screen.getByText(/保存于 时间待核对/));assert.ok(screen.getByText(/暂不自动清理/));
  assert.ok(screen.getByText(/2 个历史结果引用的文件已缺失/));
  assert.doesNotMatch(document.body.textContent,/1970|Invalid Date/);
});
