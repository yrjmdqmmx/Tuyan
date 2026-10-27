import { changeControl } from './menu-helpers.mjs';
import assert from 'node:assert/strict';
import {afterEach,test} from 'node:test';
import React from 'react';
import {act,cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountProfileEditor from '../src/workspace/AccountProfileEditor.jsx';
import DrawingActivity from '../src/workspace/DrawingActivity.jsx';
import {summarizeDrawingDays} from '../../../packages/api/src/drawing-activity.mjs';
afterEach(cleanup);

test('avatar validation blocks unsupported inputs and reset refreshes account identity',async()=>{
 let refresh=0;const calls=[];const account={user:{id:'A',name:'测试',email:'a@example.test',image:'data:image/webp;base64,AA=='},refreshAccount:async()=>refresh++};
 render(React.createElement(AccountProfileEditor,{account,request:async(...args)=>{calls.push(args);return {ok:true};},saveNickname:async()=>{}}));
 fireEvent.change(screen.getByLabelText('上传头像'),{target:{files:[new File(['<svg/>'],'avatar.svg',{type:'image/svg+xml'})]}});
 assert.match(screen.getByRole('alert').textContent,/PNG/);assert.equal(calls.length,0);
 await userEvent.click(screen.getByRole('button',{name:'恢复默认'}));await waitFor(()=>assert.equal(refresh,1));assert.deepEqual(calls,[['/avatar',{base64:null}]]);
});

test('email requires both codes, keeps old email until confirmation and saves drafts before revoking sessions',async()=>{
 const order=[],requests=[];const request=async(path,body)=>{requests.push([path,body]);if(path.endsWith('start'))return {requestId:'challenge'};order.push('confirm');return {ok:true};};
 render(React.createElement(AccountProfileEditor,{account:{user:{id:'A',name:'名字',email:'old@example.test'},refreshAccount:async()=>{},beforeEmailChange:async()=>order.push('save'),onEmailChanged:async()=>order.push('login')},request,saveNickname:async()=>{}}));
 const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'更换登录邮箱'}));await user.type(screen.getByLabelText('新邮箱',{exact:true}),'new@example.test');await user.click(screen.getByRole('button',{name:'发送两个邮箱的验证码'}));
 await screen.findByLabelText('当前邮箱验证码');assert.ok(screen.getByText('old@example.test'));assert.equal(screen.getByRole('button',{name:'确认更换并重新登录'}).disabled,true);
 await user.type(screen.getByLabelText('当前邮箱验证码'),'123456');await user.type(screen.getByLabelText('新邮箱验证码'),'654321');await user.click(screen.getByRole('button',{name:'确认更换并重新登录'}));
 await waitFor(()=>assert.deepEqual(order,['save','confirm','login']));assert.deepEqual(requests.at(-1),['/email/confirm',{requestId:'challenge',oldCode:'123456',newCode:'654321'}]);
});

test('draft save failure prevents changing email; server failure remains visible and does not signal completion',async()=>{
 let confirmations=0,completed=0;const account={user:{id:'A',name:'A',email:'old@example.test'},beforeEmailChange:async()=>{throw Error('草稿保存失败');},onEmailChanged:async()=>completed++};
 render(React.createElement(AccountProfileEditor,{account,request:async path=>{if(path.endsWith('start'))return {requestId:'challenge'};confirmations++;},saveNickname:async()=>{}}));
 const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'更换登录邮箱'}));fireEvent.change(screen.getByLabelText('新邮箱',{exact:true}),{target:{value:'new@example.test'}});await user.click(screen.getByRole('button',{name:'发送两个邮箱的验证码'}));await screen.findByLabelText('当前邮箱验证码');
 fireEvent.change(screen.getByLabelText('当前邮箱验证码'),{target:{value:'123456'}});fireEvent.change(screen.getByLabelText('新邮箱验证码'),{target:{value:'654321'}});await user.click(screen.getByRole('button',{name:'确认更换并重新登录'}));assert.equal((await screen.findByRole('alert')).textContent,'草稿保存失败');assert.equal(confirmations,0);assert.equal(completed,0);
});

test('activity renders verified stats, date cells, keyboard navigation and all three views',async()=>{
 const data=summarizeDrawingDays({'2026-10-17':2,'2026-10-18':1,'2026-10-19':3},new Date('2026-10-19T12:00:00Z'));
 render(React.createElement(DrawingActivity,{userId:'A',request:async()=>data}));
 const cell=await screen.findByRole('button',{name:'2026 年 10 月 19 日，绘制 3 张'});assert.equal(screen.getByText('累计绘制数量').previousSibling.textContent,'6 张');assert.equal(screen.getByText('最长连续天数').previousSibling.textContent,'3 天');
 act(()=>cell.focus());fireEvent.keyDown(cell,{key:'ArrowUp'});assert.equal(document.activeElement.getAttribute('data-date'),'2026-10-18');
 const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'每周',exact:true}));assert.ok(screen.getByRole('group',{name:'每周绘制数量'}));await user.click(screen.getByRole('button',{name:'累计总量',exact:true}));assert.ok(screen.getByRole('group',{name:'累计绘制数量随周次变化'}));
 await user.click(screen.getByRole('button',{name:'每天',exact:true}));assert.ok(screen.getByRole('group',{name:/每日绘制数量/}));
});

test('activity unavailable is not zero; account switch aborts and discards old response',async()=>{
 let resolveOld;const first=(_path,_body,signal)=>new Promise(resolve=>{resolveOld=()=>{assert.equal(signal.aborted,true);resolve(summarizeDrawingDays({'2026-10-19':99},new Date('2026-10-19')));};});
 const {rerender}=render(React.createElement(DrawingActivity,{userId:'A',request:first}));
 rerender(React.createElement(DrawingActivity,{userId:'B',request:async()=>{throw Error('服务不可用');}}));
 await screen.findByRole('alert');resolveOld();await waitFor(()=>assert.equal(screen.getByText('累计绘制数量').previousSibling.textContent,'— 张'));assert.equal(screen.queryByText(/99/),null);
});


test('daily activity shows a floating date and count on hover or focus, and dismisses cleanly',async()=>{
 const data=summarizeDrawingDays({'2026-10-19':3},new Date('2026-10-19T12:00:00Z'));
 const {container}=render(React.createElement(DrawingActivity,{userId:'A',request:async()=>data}));
 const cell=await screen.findByRole('button',{name:'2026 年 10 月 19 日，绘制 3 张'});
 assert.equal(screen.queryByRole('tooltip'),null);assert.equal(cell.hasAttribute('title'),false);
 fireEvent.mouseEnter(cell);
 assert.equal(screen.getByRole('tooltip').textContent,'10月19日3 张图');
 assert.equal(cell.getAttribute('aria-describedby'),screen.getByRole('tooltip').id);
 fireEvent.mouseLeave(cell);assert.equal(screen.queryByRole('tooltip'),null);
 act(()=>cell.focus());assert.ok(screen.getByRole('tooltip'));
 fireEvent.keyDown(cell,{key:'Escape'});assert.equal(screen.queryByRole('tooltip'),null);
 fireEvent.keyDown(cell,{key:'ArrowUp'});assert.equal(screen.getByRole('tooltip').textContent,'10月18日0 张图');
 fireEvent.scroll(window);assert.equal(screen.queryByRole('tooltip'),null);
 assert.equal(container.querySelector('.tw-activity-caption'),null);
 assert.equal(container.querySelector('.tw-activity-legend'),null);
 assert.equal(screen.queryByText(/按北京时间统计|基于账号可用/),null);
});

test('weekly and cumulative columns expose exact totals and preserve earlier history when filtering a year',async()=>{
 const data=summarizeDrawingDays({'2025-01-01':10,'2026-10-17':2,'2026-10-18':1,'2026-10-19':3},new Date('2026-10-19T12:00:00Z'));
 render(React.createElement(DrawingActivity,{userId:'A',request:async()=>data}));
 await screen.findByRole('button',{name:'2026 年 10 月 19 日，绘制 3 张'});
 changeControl(screen.getByLabelText('活动时间范围'),{target:{value:'2026'}});
 fireEvent.click(screen.getByRole('button',{name:'每周',exact:true}));
 const last=screen.getByRole('button',{name:'2026年10月18日 起的一周，绘制 4 张'});
 fireEvent.mouseEnter(last);assert.equal(screen.getByRole('tooltip').textContent,'2026年10月18日 起的一周4 张图');
 act(()=>last.focus());fireEvent.keyDown(last,{key:'ArrowLeft'});
 assert.equal(screen.getByRole('tooltip').textContent,'2026年10月11日 起的一周2 张图');
 fireEvent.click(screen.getByRole('button',{name:'累计总量',exact:true}));assert.equal(screen.queryByRole('tooltip'),null);
 fireEvent.mouseEnter(screen.getByRole('button',{name:'累计至 2026年10月18日 起的一周，累计 16 张'}));
 assert.equal(screen.getByRole('tooltip').textContent,'累计至 2026年10月18日 起的一周16 张图');
 fireEvent.click(screen.getByRole('button',{name:'累计至 2025年12月28日 起的一周，累计 10 张'}));
 assert.equal(screen.getByRole('tooltip').textContent,'累计至 2025年12月28日 起的一周10 张图');
 changeControl(screen.getByLabelText('活动时间范围'),{target:{value:'2025'}});assert.equal(screen.queryByRole('tooltip'),null);
 fireEvent.click(screen.getByRole('button',{name:'累计至 2025年12月28日 起的一周，累计 10 张'}));
 assert.equal(screen.getByRole('tooltip').textContent,'累计至 2025年12月28日 起的一周10 张图');
 fireEvent.pointerDown(document.body);assert.equal(screen.queryByRole('tooltip'),null);
});

test('remote nickname refresh updates clean input but preserves an unsaved local nickname',()=>{
 const props={request:async()=>({}),saveNickname:async()=>{}};const account=name=>({user:{id:'A',name,email:'a@example.test'}});
 const {rerender}=render(React.createElement(AccountProfileEditor,{...props,account:account('original')}));
 rerender(React.createElement(AccountProfileEditor,{...props,account:account('remote')}));assert.equal(screen.getByLabelText('账号昵称').value,'remote');
 fireEvent.change(screen.getByLabelText('账号昵称'),{target:{value:'unsaved local'}});rerender(React.createElement(AccountProfileEditor,{...props,account:account('remote again')}));assert.equal(screen.getByLabelText('账号昵称').value,'unsaved local');
});
