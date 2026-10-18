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
