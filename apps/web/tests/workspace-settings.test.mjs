import { menuOptions, chooseMenuOption } from './menu-helpers.mjs';
import test,{afterEach} from 'node:test';import assert from 'node:assert/strict';import React from 'react';
import {render,screen,fireEvent,cleanup}from'@testing-library/react';
import WorkspaceDialog from '../src/workspace/WorkspaceDialog.jsx';
import WorkspaceDrawingSettings from '../src/workspace/WorkspaceDrawingSettings.jsx';
import RatioCanvas from '../src/workspace/RatioCanvas.jsx';
import {newDraft}from'../src/workspace/workspaceState.js';
afterEach(cleanup);
test('journal bookshelf opens above drawing settings; Escape keeps the parent open',async()=>{
 let closed=0;render(React.createElement(WorkspaceDialog,{title:'绘图设置',onClose:()=>closed++},React.createElement(WorkspaceDrawingSettings,{draft:newDraft(),path:'png',models:{},onChange(){}})));
 fireEvent.click(screen.getByRole('button',{name:/不指定期刊/}));const journal=screen.getByRole('dialog',{name:'期刊规则'});assert.ok(journal.parentElement.classList.contains('tw-nested-backdrop'));
 fireEvent.keyDown(window,{key:'Escape'});assert.equal(closed,0);assert.ok(screen.getByRole('dialog',{name:'绘图设置'}));
});
test('ratio background represents landscape, square and portrait selections',()=>{
 const {container,rerender}=render(React.createElement(RatioCanvas,{ratio:'16:9'}));assert.equal(parseFloat(container.querySelector('.tw-ratio-paper').style.aspectRatio),16/9);
 rerender(React.createElement(RatioCanvas,{ratio:'1:1'}));assert.equal(parseFloat(container.querySelector('.tw-ratio-paper').style.aspectRatio),1);
 rerender(React.createElement(RatioCanvas,{ratio:'3:4'}));assert.equal(parseFloat(container.querySelector('.tw-ratio-paper').style.aspectRatio),0.75);
});

test('ordinary default resolution keeps supported aspect ratios selectable',()=>{
 const draft=newDraft();draft.settings.simple.models={image:{accessProvider:'tokendance',modelId:'seedream-fixture'}};
 const models={registry:{providers:{tokendance:{models:[{id:'seedream-fixture',capabilities:{resolutions:['2K','4K'],aspectRatiosByResolution:{'2K':['1:1','16:9'],'4K':['1:1']}}}]}}}};
 let changed;render(React.createElement(WorkspaceDrawingSettings,{draft,path:'png',models,onChange:value=>{changed=value;}}));
 const ratio=screen.getByRole('combobox',{name:'比例'}),options=menuOptions(ratio);
 assert.equal(options.find(option=>option.textContent==='16:9').disabled,false);assert.equal(options.find(option=>option.textContent==='自动').disabled,false);
 chooseMenuOption(ratio,'16:9');assert.equal(changed.ratio,'16:9');
});

test('professional starts with one candidate; saved choices survive PNG/SVG mode switches',async()=>{
 const {newWorkspace,workspaceReducer,currentDraft}=await import('../src/workspace/workspaceState.js');
 for(const path of ['png','svg']){
  let state=newWorkspace('defaults');state=workspaceReducer(state,{type:'SET_PATH',path});
  state=workspaceReducer(state,{type:'EDIT_DRAFT',patch:{mode:'advanced'}});
  assert.equal(currentDraft(state).settings.advanced.candidates,1);
  const settings=structuredClone(currentDraft(state).settings);settings.advanced.candidates=4;
  state=workspaceReducer(state,{type:'EDIT_DRAFT',patch:{settings}});
  state=workspaceReducer(state,{type:'EDIT_DRAFT',patch:{mode:'simple'}});
  state=workspaceReducer(state,{type:'EDIT_DRAFT',patch:{mode:'advanced'}});
  assert.equal(currentDraft(state).settings.advanced.candidates,4);
 }
 const draft=newDraft();draft.mode='advanced';
 render(React.createElement(WorkspaceDrawingSettings,{draft,path:'png',models:{},onChange(){}}));
 assert.equal(screen.getByRole('combobox',{name:'候选数量'}).value,'1');
});
