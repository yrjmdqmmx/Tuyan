import assert from 'node:assert/strict';
import {afterEach,test} from 'node:test';
import React from 'react';
import {cleanup,render,renderHook,screen,fireEvent,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlusPanel,{PlusSimulationTasks} from '../src/components/PlusPanel.jsx';
import {usePlusAvailability} from '../src/plus/usePlusAvailability.js';
afterEach(cleanup);
test('a payment query timeout removes the purchase link and keeps a query action',async()=>{
 let checks=0;const request=async path=>path==='/catalog'?{enabled:true,paymentConfigured:true,executionMode:'disabled'}:path==='/account'?{membership:{status:'inactive'}}:++checks===1?{membership:{status:'inactive'},purchaseUrl:'https://pay.watcha.cn/test-purchase'}:Promise.reject(Error('查询超时'));
 render(React.createElement(PlusPanel,{userId:'payment-unknown',enabled:true,request}));await userEvent.click(await screen.findByRole('button',{name:'查看沙箱购买入口'}));
 await screen.findByRole('link',{name:'模拟购买 ¥39'});await userEvent.click(screen.getByRole('button',{name:'查询购买结果'}));await screen.findByText('查询超时');
 assert.ok(screen.queryByRole('link',{name:'模拟购买 ¥39'})===null);assert.ok(screen.getByRole('button',{name:'查询购买结果'}));
});
test('refund shows the unused-credit amount and never claims money was returned',async()=>{
 let requested=false;const request=async path=>path==='/catalog'?{enabled:true,paymentConfigured:true,executionMode:'disabled'}:path==='/refund/request'?(requested=true,{moneyRefunded:false}):{membership:{status:requested?'refund_requested':'active',available:requested?0:1000,held:0,spent:1000,refundFen:1950}};
 render(React.createElement(PlusPanel,{userId:'refund-preview',enabled:true,request}));await userEvent.click(await screen.findByText('按剩余积分申请退款'));
 assert.match(screen.getByText(/预计可退/).textContent,/19.50/);await userEvent.click(screen.getByRole('button',{name:'确认提交退款申请'}));await screen.findByText(/尚未退款，本期暂停新任务/);assert.equal(requested,true);
});
test('refund waits for unresolved tasks from previous cycles even when current held balance is zero',async()=>{
 let refunds=0;
 const request=async path=>path==='/catalog'?{enabled:true,paymentConfigured:true,executionMode:'simulation',newTasksEnabled:true}:path==='/refund/request'?(refunds++,{}):{membership:{status:'active',available:2000,held:0,spent:0},pending:[{key:'old-cycle-task',status:'unknown'}]};
 render(React.createElement(PlusPanel,{userId:'new-cycle',enabled:true,request}));await userEvent.click(await screen.findByText('按剩余积分申请退款'));
 const button=screen.getByRole('button',{name:'确认提交退款申请'});assert.equal(button.disabled,true);await userEvent.click(button);assert.equal(refunds,0);
 await userEvent.click(screen.getByText('积分流程演练'));assert.ok(screen.getByRole('button',{name:'查询原任务并结算'}));
});
const catalog={enabled:true,paymentConfigured:true,executionMode:'disabled'},inactive={membership:{status:'inactive',available:0,held:0,spent:0},ledger:[]};
test('account refresh after reserving keeps one task panel and allows the original task to settle',async()=>{
 let operation=null,submits=0,polls=0;
 const request=async(path,body)=>{
  if(path==='/catalog')return {...catalog,executionMode:'simulation',newTasksEnabled:true};
  if(path==='/quote')return {token:'quote',credits:60};
  if(path==='/jobs'){submits++;return operation={key:body.key,status:'running'};}
  if(path.startsWith('/jobs/')){polls++;operation={...operation,status:'settled'};return {operation};}
  return {membership:{status:'active',available:operation?1940:2000,held:operation?.status==='running'?60:0,spent:operation?.status==='settled'?60:0},pending:operation?.status==='running'?[operation]:[],ledger:[]};
 };
 render(React.createElement(PlusPanel,{userId:'refresh-task',enabled:true,request}));
 await userEvent.click(await screen.findByText('积分流程演练'));
 await userEvent.click(screen.getByRole('button',{name:'查看本次预留积分'}));
 await userEvent.click(await screen.findByRole('button',{name:'确认并开始演练'}));
 await waitFor(()=>assert.equal(screen.getByRole('button',{name:'查询原任务并结算'}).disabled,false));
 assert.equal(screen.getAllByText('积分流程演练').length,1);
 assert.equal(screen.getAllByText('积分记录').length,1);
 await userEvent.click(screen.getByRole('button',{name:'查询原任务并结算'}));
 await screen.findByText('任务已结算');
 assert.equal(screen.getAllByText('积分流程演练').length,1);
 assert.equal(submits,1);assert.equal(polls,1);
});
test('reload retains pending payment and blocked rights never show a new purchase link',async()=>{
 const request=async path=>path==='/catalog'?catalog:path==='/account'?{...inactive,checkoutPending:true}:{membership:{status:'suspended'},purchaseBlocked:true};
 render(React.createElement(PlusPanel,{userId:'pending',enabled:true,request}));
 await userEvent.click(await screen.findByRole('button',{name:'查询购买结果'}));await screen.findByText('上期权益仍需核对，暂不提供再次购买入口。');assert.equal(screen.queryByRole('link',{name:'模拟购买 ¥39'}),null);
});
test('credit history loads subsequent pages and resets after switching accounts',async()=>{
 const request=async path=>path==='/catalog'?catalog:path.startsWith('/ledger?')?{entries:[{entryId:'older',kind:'settle',charged:17,at:1}],nextCursor:null}:{...inactive,ledger:[{entryId:'recent',kind:'grant',availableDelta:2000,at:2}],ledgerNextCursor:'next-page'};
 const {rerender}=render(React.createElement(PlusPanel,{userId:'history',enabled:true,request}));await userEvent.click(await screen.findByText('积分记录'));await userEvent.click(screen.getByRole('button',{name:'加载更多记录'}));await screen.findByText('消耗 17');assert.equal(screen.queryByRole('button',{name:'加载更多记录'}),null);
 rerender(React.createElement(PlusPanel,{userId:'other',enabled:true,request:async p=>p==='/catalog'?catalog:inactive}));await screen.findByText('暂无记录');assert.equal(screen.queryByText('消耗 17'),null);
});
test('Plus is invisible and makes no requests while disabled',()=>{
 let calls=0;render(React.createElement(PlusPanel,{userId:'u',enabled:false,request:async()=>{calls++;}}));assert.equal(calls,0);assert.equal(screen.queryByRole('region',{name:'Plus 套餐'}),null);
});
test('return URL cannot grant rights; only server confirmation shows membership',async()=>{
 window.history.replaceState({},'','/?paid=1');let paid=false;
 const request=async path=>path==='/catalog'?catalog:path==='/account'?paid?{membership:{status:'active',available:2000,held:0,spent:0,expiresAt:2000000000},ledger:[]}:inactive:{membership:inactive.membership,purchaseUrl:'https://pay.watcha.cn/test-purchase'};
 const {rerender}=render(React.createElement(PlusPanel,{userId:'u',enabled:true,request}));await screen.findByText('尚未开通');assert.equal(screen.queryByText('会员生效中'),null);
 await userEvent.click(screen.getByRole('button',{name:'查看沙箱购买入口'}));assert.equal((await screen.findByRole('link',{name:'模拟购买 ¥39'})).href,'https://pay.watcha.cn/test-purchase');assert.equal(screen.queryByText('会员生效中'),null);
 paid=true;const confirmed=async path=>path==='/membership/check'?{membership:{status:'active',available:2000}}:request(path);
 rerender(React.createElement(PlusPanel,{userId:'u',enabled:true,request:confirmed}));await screen.findByText('会员生效中');
});
test('a stale response after switching accounts cannot expose previous account rights',async()=>{
 let resolveOld;const old=async path=>path==='/catalog'?catalog:new Promise(r=>{resolveOld=r;});
 const {rerender}=render(React.createElement(PlusPanel,{userId:'old',enabled:true,request:old}));await waitFor(()=>assert.ok(resolveOld));
 const fresh=async path=>path==='/catalog'?catalog:inactive;rerender(React.createElement(PlusPanel,{userId:'new',enabled:true,request:fresh}));await screen.findByText('尚未开通');
 resolveOld({membership:{status:'active',available:1999},ledger:[]});await new Promise(r=>setTimeout(r,0));assert.equal(screen.queryByText('1999'),null);
});
test('task requires quote confirmation; uncertainty queries original key without resubmission',async()=>{
 const calls=[],request=async(path,body)=>{calls.push({path,body});if(path==='/quote')return {token:'signed-quote',credits:80};if(path==='/jobs')throw Object.assign(Error('结果待确认'),{status:503});return {operation:{key:calls.find(x=>x.path==='/jobs').body.key,status:'settled'}};};
 render(React.createElement(PlusSimulationTasks,{request,member:{status:'active'},onChange:async()=>{}}));fireEvent.click(screen.getByText('积分流程演练'));
 await userEvent.click(screen.getByRole('button',{name:'查看本次预留积分'}));await screen.findByText('本次预留 80 积分（模拟）');assert.equal(calls.filter(c=>c.path==='/jobs').length,0);
 await userEvent.click(screen.getByRole('button',{name:'确认并开始演练'}));await screen.findByText('结果待核对；不会重复提交');assert.equal(screen.queryByRole('button',{name:'确认并开始演练'}),null);
 await userEvent.click(screen.getByRole('button',{name:'查询原任务并结算'}));await screen.findByText('任务已结算');assert.equal(calls.filter(c=>c.path==='/jobs').length,1);assert.equal(calls.at(-1).path,'/jobs/'+calls.find(c=>c.path==='/jobs').body.key);
});
test('reload restores a pending operation from the backend and expired membership blocks new quotes',async()=>{
 const calls=[];render(React.createElement(PlusSimulationTasks,{request:async path=>{calls.push(path);return {operation:{key:'existing',status:'unknown'}};},member:{status:'expired'},pending:{key:'existing',status:'unknown',spec:{path:'svg',mode:'extreme',candidates:2,reviews:3,imageSize:'1K'}},onChange:async()=>{}}));
 fireEvent.click(screen.getByText('积分流程演练'));await screen.findByText('结果待核对；不会重复提交');assert.equal(screen.getByLabelText('格式').value,'svg');assert.equal(screen.getByLabelText('模式').value,'extreme');await userEvent.click(screen.getByRole('button',{name:'查询原任务并结算'}));assert.deepEqual(calls,['/jobs/existing']);assert.equal(screen.queryByRole('button',{name:'查看本次预留积分'}),null);
});

test('Plus is hidden and makes no request unless explicitly enabled',()=>{
 let calls=0;render(React.createElement(PlusPanel,{userId:'ordinary',request:async()=>{calls++;}}));
 assert.equal(calls,0);assert.equal(screen.queryByRole('region',{name:'Plus 套餐'}),null);
});
test('live admin purchase text distinguishes actual payment from sandbox simulation',async()=>{
 const request=async p=>p==='/catalog'?{environment:'live',enabled:true,paymentConfigured:true,newPurchasesEnabled:true,executionMode:'disabled'}:p==='/account'?{membership:{status:'inactive'}}:{membership:{status:'inactive'},purchaseUrl:'https://pay.watcha.cn/live-purchase'};
 render(React.createElement(PlusPanel,{userId:'admin',enabled:true,request}));
 await userEvent.click(await screen.findByRole('button',{name:'购买 Plus'}));
 assert.ok(await screen.findByRole('link',{name:'支付 ¥39'}));
 assert.equal(screen.queryByText('沙箱预览'),null);assert.ok(screen.getByText(/本次支付 ¥39/));
});
test('Plus mode availability requires an admin and a current server response',async()=>{
 const original=globalThis.fetch;let resolve,calls=0;
 globalThis.fetch=()=>{calls++;return new Promise(r=>{resolve=r})};
 try{
  const {result,rerender}=renderHook(({id,admin,base})=>usePlusAvailability(id,admin,base),{initialProps:{id:'ordinary',admin:false,base:'https://api.invalid'}});
  assert.equal(result.current,false);assert.equal(calls,0);
  rerender({id:'admin',admin:true,base:'https://api.invalid'});await waitFor(()=>assert.equal(calls,1));
  resolve(Response.json({newTasksEnabled:true}));await waitFor(()=>assert.equal(result.current,true));
  rerender({id:'admin',admin:true,base:'https://other.invalid'});assert.equal(result.current,false);
  rerender({id:'ordinary',admin:false,base:'https://other.invalid'});resolve(Response.json({newTasksEnabled:true}));
  await waitFor(()=>assert.equal(result.current,false));assert.equal(calls,2);
 }finally{globalThis.fetch=original;}
});
