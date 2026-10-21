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

function pointer(node, type, x, y, time, pointerId=1) {
 const event=new window.MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y});
 Object.defineProperties(event,{pointerId:{value:pointerId},isPrimary:{value:pointerId===1},timeStamp:{value:time}});
 fireEvent(node,event);
}
function finishAnimation(t) {
 const frames=new Map();let id=0;
 t.mock.method(globalThis,'requestAnimationFrame',callback=>{frames.set(++id,callback);return id;});
 t.mock.method(globalThis,'cancelAnimationFrame',key=>frames.delete(key));
 return ()=>act(()=>{for(const [key,callback] of frames){frames.delete(key);callback(performance.now()+1000);}});
}
test('mouse drag follows fan poses, snaps, and cannot open preview on release',async t=>{
 const finish=finishAnimation(t);
 const originalFetch=globalThis.fetch;globalThis.fetch=async()=>Response.json({code:0,references:[]});
 try{
  const {container}=render(React.createElement(HomeTemplateCarousel,{onApply(){},stopped:true}));
  const front=screen.getByRole('button',{name:/^预览/}), initial=front.style.transform;
  pointer(front,'pointerdown',300,100,0);pointer(front,'pointermove',240,100,400);
  assert.notEqual(front.style.transform,initial);assert.ok(Math.abs(parseFloat(front.style.transform.slice(12))+60)<.01);assert.equal(active(),'0');
  pointer(front,'pointerup',240,100,600);assert.equal(active(),'1');finish();
  fireEvent.click(front);assert.equal(screen.queryByRole('dialog'),null);assert.equal(container.querySelector('.is-dragging'),null);
  const next=screen.getByRole('button',{name:/^预览/});assert.match(next.style.transform,/translate3d\(0px,0px,0px\)/);
  pointer(next,'pointerdown',300,100,1000);pointer(next,'pointerup',300,100,1100);fireEvent.click(next);
  assert.ok(screen.getByRole('dialog'));await act(async()=>{});
 }finally{globalThis.fetch=originalFetch;}
});
test('slow short drag returns; fast short flick advances; holding removes momentum',t=>{
 const finish=finishAnimation(t);render(React.createElement(HomeTemplateCarousel,{onApply(){},stopped:true}));
 let front=screen.getByRole('button',{name:/^预览/});
 pointer(front,'pointerdown',300,100,0);pointer(front,'pointermove',280,100,300);pointer(front,'pointerup',280,100,500);
 assert.equal(active(),'0');finish();assert.match(front.style.transform,/translate3d\(0px,0px,0px\)/);
 pointer(front,'pointerdown',300,100,1000);pointer(front,'pointermove',280,100,1020);pointer(front,'pointerup',280,100,1030);
 assert.equal(active(),'1');finish();front=screen.getByRole('button',{name:/^预览/});
 pointer(front,'pointerdown',300,100,2000);pointer(front,'pointermove',280,100,2020);pointer(front,'pointerup',280,100,2500);
 assert.equal(active(),'1');finish();
});
test('mobile deck wraps both ways; cancellation and vertical scroll do not change cards',t=>{
 const finish=finishAnimation(t);const {container}=render(React.createElement(HomeTemplateCarousel,{onApply(){},stopped:true,mobile:true}));
 let front=screen.getByRole('button',{name:/^预览/});
 pointer(front,'pointerdown',150,100,0);pointer(front,'pointermove',190,100,300);pointer(front,'pointerup',190,100,500);
 assert.equal(active(),'5');finish();front=screen.getByRole('button',{name:/^预览/});
 pointer(front,'pointerdown',150,100,1000);pointer(front,'pointermove',110,100,1300);pointer(front,'pointercancel',110,100,1400);
 assert.equal(active(),'5');finish();assert.equal(container.querySelector('.is-dragging'),null);
 pointer(front,'pointerdown',150,100,2000);pointer(front,'pointermove',154,140,2300);pointer(front,'pointerup',154,160,2400);
 assert.equal(active(),'5');finish();
 pointer(front,'pointerdown',150,100,3000);pointer(front,'pointermove',110,100,3300);pointer(front,'pointerup',110,100,3500);
 assert.equal(active(),'0');finish();
});
test('reduced motion keeps direct dragging but settles immediately; blur cancels a grab',t=>{
 window.matchMedia=q=>({...media(q),matches:q.includes('reduced-motion')});
 const finish=finishAnimation(t);const {container}=render(React.createElement(HomeTemplateCarousel,{onApply(){},stopped:true}));
 const front=screen.getByRole('button',{name:/^预览/});
 pointer(front,'pointerdown',300,100,0);pointer(front,'pointermove',240,100,300);pointer(front,'pointerup',240,100,500);
 assert.equal(active(),'1');assert.match(screen.getByRole('button',{name:/^预览/}).style.transform,/translate3d\(0px,0px,0px\)/);
 pointer(front,'pointerdown',300,100,1000);pointer(front,'pointermove',200,100,1200);fireEvent.blur(window);
 assert.equal(active(),'1');assert.equal(container.querySelector('.is-dragging'),null);finish();
});

test('long drag keeps focus on the new visible card and ignores unrelated pointers',t=>{
 const finish=finishAnimation(t);render(React.createElement(HomeTemplateCarousel,{onApply(){},stopped:true}));
 const front=screen.getByRole('button',{name:/^预览/});act(()=>front.focus());
 pointer(front,'pointerdown',500,100,0);const initial=front.style.transform;
 pointer(front,'pointermove',100,100,100,2);pointer(front,'pointerup',100,100,200,2);
 assert.equal(front.style.transform,initial);
 pointer(front,'pointermove',200,100,400);pointer(front,'pointerup',200,100,600);finish();
 assert.equal(active(),'2');assert.equal(document.activeElement,screen.getByRole('button',{name:/^预览/}));
 assert.equal(document.activeElement.getAttribute('aria-hidden'),'false');
});
