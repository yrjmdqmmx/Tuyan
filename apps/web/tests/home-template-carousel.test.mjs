import assert from 'node:assert/strict';
import {afterEach,test} from 'node:test';
import React,{useReducer} from 'react';
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import HomeTemplateCarousel from '../src/workspace/HomeTemplateCarousel.jsx';
import TaskWorkspace from '../src/workspace/TaskWorkspace.jsx';
import {newWorkspace,workspaceReducer,currentTask} from '../src/workspace/workspaceState.js';
import {RESOURCE_ENTRIES,SEARCH_ENTRIES} from '../src/workspace/workspaceSearch.js';
const media = query => ({matches:false,media:query,addEventListener(){},removeEventListener(){}});
window.matchMedia=media;
afterEach(()=>{cleanup();window.matchMedia=media;});
const active=()=>screen.getByRole('region',{name:'绘图模板轮播'}).getAttribute('data-template-index');
test('fan advances at four seconds, exposes three cards and stops for reduced motion or typing', t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const {rerender}=render(React.createElement(HomeTemplateCarousel,{onApply(){}}));
 assert.equal(active(),'0');assert.equal(screen.getAllByRole('button').length,3);
 act(()=>t.mock.timers.tick(3999));assert.equal(active(),'0');
 act(()=>t.mock.timers.tick(1));assert.equal(active(),'1');
 act(()=>t.mock.timers.tick(4000));assert.equal(active(),'2');
 rerender(React.createElement(HomeTemplateCarousel,{onApply(){},stopped:true}));
 act(()=>t.mock.timers.tick(12000));assert.equal(active(),'2');
 cleanup();window.matchMedia=q=>({...media(q),matches:q.includes('reduced-motion')});
 render(React.createElement(HomeTemplateCarousel,{onApply(){}}));
 act(()=>t.mock.timers.tick(12000));assert.equal(active(),'0');
});
test('template application preserves the original draft and does not generate; deleted page is absent from resources and search',async()=>{
 let latest,submissions=0;
 function Harness(){const[state,dispatch]=useReducer(workspaceReducer,null,()=>{const s=newWorkspace('original');s.tasks[0].branches.png.draft.text='我的原始要求';return s;});latest=state;
  return React.createElement(TaskWorkspace,{state,dispatch,onFiles(){},onSubmit(){submissions++;}});}
 const originalFetch=globalThis.fetch;globalThis.fetch=async()=>Response.json({code:0,references:[]});
 try{
  render(React.createElement(Harness));fireEvent.click(screen.getByRole('button',{name:'预览多智能体方法框架'}));
  await act(async()=>{});assert.equal(screen.getByRole('dialog').closest('.tw-empty-body'),null);fireEvent.click(screen.getByRole('button',{name:'使用模板新建任务'}));
  assert.equal(latest.tasks.length,2);assert.equal(latest.tasks.find(t=>t.id==='original').branches.png.draft.text,'我的原始要求');
  assert.match(currentTask(latest).branches.png.draft.text,/教学示意任务/);assert.equal(submissions,0);
  fireEvent.click(screen.getByRole('button',{name:'资源与帮助'}));
  assert.equal(within(screen.getByRole('navigation',{name:'资源与帮助'})).queryByRole('button',{name:'绘图模板'}),null);
  assert.ok(![...RESOURCE_ENTRIES,...SEARCH_ENTRIES].some(e=>e.target?.page==='绘图模板'));
 }finally{globalThis.fetch=originalFetch;}
});
test('clearing typed text does not restart the fan for the same task', t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 function Harness(){const[state,dispatch]=useReducer(workspaceReducer,null,()=>newWorkspace('a'));return React.createElement(TaskWorkspace,{state,dispatch,onFiles(){},onSubmit(){}});}
 render(React.createElement(Harness));
 fireEvent.input(screen.getByRole('textbox',{name:'绘图要求'}),{target:{value:'正在输入'}});
 fireEvent.input(screen.getByRole('textbox',{name:'绘图要求'}),{target:{value:''}});
 act(()=>t.mock.timers.tick(12000));assert.equal(active(),'0');
});

test('repeated keyboard navigation keeps focus on the front card',()=>{
 render(React.createElement(HomeTemplateCarousel,{onApply(){},stopped:true}));
 for(let n=1;n<=8;n++){
  const front=screen.getByRole('button',{name:/^预览/});
  fireEvent.keyDown(front,{key:'ArrowRight'});
  assert.equal(active(),String(n%6));
  assert.equal(document.activeElement,screen.getByRole('button',{name:/^预览/}));
  assert.equal(document.activeElement.getAttribute('aria-hidden'),'false');
 }
});
