import assert from 'node:assert/strict';
import {test,afterEach} from 'node:test';
import React from 'react';
import {render,screen,cleanup,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthPanel from '../src/components/AuthPanel.jsx';
import PhoneCodeForm from '../src/components/PhoneCodeForm.jsx';
import PhoneBindingPanel from '../src/components/PhoneBindingPanel.jsx';
import {AppLocaleProvider} from '../src/components/BenchmarkLocale.jsx';
import {phoneRequest} from '../src/hooks/usePhoneAuth.js';
const nativeFetch=globalThis.fetch;
afterEach(()=>{cleanup();globalThis.fetch=nativeFetch;});
const fakeImage='data:image/png;base64,iVBORw0KGgo=';
function mount(element){return render(React.createElement(AppLocaleProvider,null,element));}
test('phone is default when available; existing email and registration remain switchable',async()=>{
 globalThis.fetch=async()=>Response.json({available:true});
 mount(React.createElement(AuthPanel,{onAuthenticated:async()=>{},apiBase:'http://fixture.invalid'}));
 const user=userEvent.setup();await screen.findByLabelText('手机号');assert.ok(screen.getByText('未注册手机号验证后将自动注册'));assert.equal(screen.queryByLabelText('密码'),null);
 await user.click(screen.getByRole('button',{name:'邮箱密码'}));assert.ok(screen.getByLabelText('邮箱'));assert.ok(screen.getByLabelText('密码'));
 await user.click(screen.getByRole('button',{name:'没有账号，去注册'}));assert.ok(screen.getByRole('button',{name:'注册并验证邮箱'}));
 await user.click(screen.getByRole('button',{name:'返回登录'}));await user.click(screen.getByRole('button',{name:'手机验证码'}));assert.ok(screen.getByLabelText('手机号'));
});
test('disabled SMS preserves email sign-in',async()=>{
 globalThis.fetch=async()=>Response.json({available:false});mount(React.createElement(AuthPanel,{onAuthenticated:async()=>{},apiBase:'http://fixture.invalid'}));
 assert.ok(await screen.findByLabelText('邮箱'));assert.equal(screen.queryByText('手机验证码'),null);
});
test('phone input reports invalid numbers and accepts a pasted +86 number',async()=>{
 const calls=[];
 mount(React.createElement(PhoneCodeForm,{controller:{request:async(path,body)=>{calls.push({path,body});return {challengeId:'id',image:fakeImage};}},onVerified:async()=>{}}));
 const user=userEvent.setup();const input=screen.getByLabelText('手机号');
 await user.type(input,'12345678901');await user.tab();
 assert.match(screen.getByRole('alert').textContent,/中国大陆 11 位手机号/);
 assert.equal(screen.getByRole('button',{name:'获取验证码'}).disabled,true);
 await user.clear(input);await user.click(input);await user.paste('+86 138-0000-1234');
 await user.click(screen.getByRole('button',{name:'获取验证码'}));
 assert.equal(calls[0].body.phone,'13800001234');
});
test('server error codes have distinct safe messages and Retry-After is honored',async()=>{
 for(const [code,text,status] of [['PHONE_INVALID_NUMBER','中国大陆',400],['PHONE_INVALID_CODE','不正确',400],['PHONE_CODE_EXPIRED','已过期',400],['PHONE_TOO_MANY_ATTEMPTS','次数过多',429],['PHONE_DISABLED','暂未启用',404],['PHONE_RATE_LIMIT','频繁',429]]){
  globalThis.fetch=async()=>Response.json({code,message:'private provider details'},{status,headers:{'retry-after':'17'}});
  await assert.rejects(()=>phoneRequest('http://fixture.invalid','verify',{}),error=>error.code===code&&error.message.includes(text)&&!error.message.includes('private')&&error.retryAfter===17);
 }
});
test('server lockout clears old proof and requires a new SMS',async()=>{
 const controller={request:async(path)=>{
  if(path==='challenge')return {challengeId:'id',image:fakeImage};
  if(path==='send-code')return {requestId:'r',retryAfter:60};
  throw Object.assign(Error('尝试次数过多，请重新获取'),{code:'PHONE_TOO_MANY_ATTEMPTS'});
 }};
 mount(React.createElement(PhoneCodeForm,{controller,onVerified:async()=>{throw Error('must not authenticate')}}));const user=userEvent.setup();
 await user.type(screen.getByLabelText('手机号'),'13800001234');await user.click(screen.getByRole('button',{name:'获取验证码'}));await user.type(await screen.findByLabelText('图形验证码'),'7B3GX');await user.click(screen.getByRole('button',{name:'发送验证码'}));
 await user.type(screen.getByLabelText('短信验证码'),'123456');await user.click(screen.getByRole('button',{name:'登录 / 注册'}));
 assert.ok(await screen.findByRole('alert'));assert.equal(screen.getByLabelText('短信验证码').value,'');assert.equal(screen.getByRole('button',{name:'登录 / 注册'}).disabled,true);
});
test('countdown follows server cooldown and unlocks after elapsed wall time',async()=>{
 const realNow=Date.now;let now=realNow();Date.now=()=>now;
 try{
  const controller={request:async()=>{throw Object.assign(Error('发送过于频繁'),{retryAfter:17});}};
  mount(React.createElement(PhoneCodeForm,{controller,onVerified:async()=>{}}));const user=userEvent.setup();
  await user.type(screen.getByLabelText('手机号'),'13800001234');await user.click(screen.getByRole('button',{name:'获取验证码'}));
  assert.equal(screen.getByRole('button',{name:'17 秒后重发'}).disabled,true);
  now+=17000;await waitFor(()=>assert.equal(screen.getByRole('button',{name:'获取验证码'}).disabled,false));
 }finally{Date.now=realNow;}
});
test('SMS send needs a CAPTCHA, displays resend countdown and verifies before authenticating',async()=>{
 const calls=[];let completed=0;
 const controller={request:async(path,body)=>{calls.push({path,body});if(path==='challenge')return {challengeId:'captcha-id',image:fakeImage};if(path==='send-code')return {requestId:'sms-id',retryAfter:60};if(body.code==='123456')return {ok:true};throw Error('验证码无效');}};
 mount(React.createElement(PhoneCodeForm,{controller,onVerified:async()=>completed++}));const user=userEvent.setup();
 await user.type(screen.getByLabelText('手机号'),'13800001234');await user.click(screen.getByRole('button',{name:'获取验证码'}));assert.equal(calls.length,1);
 await user.type(await screen.findByLabelText('图形验证码'),'7B3GX');await user.click(screen.getByRole('button',{name:'发送验证码'}));
 const resend=await screen.findByRole('button',{name:/秒后重发/});assert.equal(resend.disabled,true);assert.equal(completed,0);
 await user.type(screen.getByLabelText('短信验证码'),'111111');await user.click(screen.getByRole('button',{name:'登录 / 注册'}));assert.equal(completed,0);assert.ok(await screen.findByRole('alert'));
 await user.clear(screen.getByLabelText('短信验证码'));await user.type(screen.getByLabelText('短信验证码'),'123456');await user.click(screen.getByRole('button',{name:'登录 / 注册'}));await waitFor(()=>assert.equal(completed,1));
 assert.deepEqual(calls.at(-1).body,{phone:'13800001234',purpose:'login',requestId:'sms-id',code:'123456'});
});
test('changing phone cannot submit a stale code or request',async()=>{
 const controller={request:async(path)=>path==='challenge'?{challengeId:'id',image:fakeImage}:{requestId:'r',retryAfter:60}};
 mount(React.createElement(PhoneCodeForm,{controller,onVerified:async()=>{throw Error('must not authenticate')}}));const user=userEvent.setup();
 await user.type(screen.getByLabelText('手机号'),'13800001234');await user.click(screen.getByRole('button',{name:'获取验证码'}));await user.type(await screen.findByLabelText('图形验证码'),'7B3GX');await user.click(screen.getByRole('button',{name:'发送验证码'}));
 await user.type(screen.getByLabelText('短信验证码'),'123456');await user.clear(screen.getByLabelText('手机号'));await user.type(screen.getByLabelText('手机号'),'13800005678');assert.equal(screen.getByRole('button',{name:'登录 / 注册'}).disabled,true);
});
test('binding uses immutable account header and does not offer auto-registration',async()=>{
 let request;globalThis.fetch=async(url,init)=>{if(url.endsWith('/status'))return Response.json({available:true,linked:false});request={url,init};return Response.json({challengeId:'id',image:fakeImage});};
 mount(React.createElement(PhoneBindingPanel,{apiBase:'http://fixture.invalid',userId:'existing-id'}));const user=userEvent.setup();await user.click(await screen.findByRole('button',{name:'绑定手机号'}));
 assert.equal(screen.queryByText('未注册手机号验证后将自动注册'),null);await user.type(screen.getByLabelText('手机号'),'13800001234');await user.click(screen.getByRole('button',{name:'获取验证码'}));
 assert.equal(request.init.headers['X-Workspace-Account'],'existing-id');assert.equal(JSON.parse(request.init.body).purpose,'link');
});

test('switching login methods retains the phone code and cooldown; Watcha stays directly accessible',async()=>{
 globalThis.fetch=async()=>Response.json({available:true});
 const calls=[],starts=[];
 const phoneController={status:{available:true},request:async(path)=>{calls.push(path);return path==='challenge'?{challengeId:'id',image:fakeImage}:{requestId:'request',retryAfter:60};}};
 mount(React.createElement(AuthPanel,{apiBase:'http://fixture.invalid',phoneController,onAuthenticated:async()=>{},watcha:{status:{available:true},start:purpose=>starts.push(purpose)}}));
 const user=userEvent.setup();
 await user.click(screen.getByRole('button',{name:'观猹登录'}));assert.deepEqual(starts,['login']);
 await user.type(screen.getByLabelText('手机号'),'13800001234');await user.click(screen.getByRole('button',{name:'获取验证码'}));await user.type(await screen.findByLabelText('图形验证码'),'7B3GX');await user.click(screen.getByRole('button',{name:'发送验证码'}));await user.type(screen.getByLabelText('短信验证码'),'123456');
 await user.click(screen.getByRole('button',{name:'邮箱密码'}));assert.ok(screen.getByLabelText('密码'));assert.ok(screen.getByRole('button',{name:'观猹登录'}));
 await user.click(screen.getByRole('button',{name:'手机验证码'}));assert.equal(screen.getByLabelText('手机号').value,'13800001234');assert.equal(screen.getByLabelText('短信验证码').value,'123456');assert.equal(screen.getByRole('button',{name:/秒后重发/}).disabled,true);assert.deepEqual(calls,['challenge','send-code']);
});
