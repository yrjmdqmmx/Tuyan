import assert from 'node:assert/strict';
import {test,afterEach} from 'node:test';
import React from 'react';
import {render,screen,cleanup,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkspaceAccount from '../src/workspace/WorkspaceAccount.jsx';
import {AppLocaleProvider} from '../src/components/BenchmarkLocale.jsx';
const nativeFetch=globalThis.fetch;
window.matchMedia = query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} });
afterEach(()=>{cleanup();globalThis.fetch=nativeFetch;});
function mount(client,onMount=()=>{}) {
 globalThis.fetch=async()=>Response.json({available:false});
 return render(React.createElement(AppLocaleProvider,null,React.createElement(WorkspaceAccount,{client,enabled:true,requireLogin:true,apiBase:'http://fixture.invalid'},account=>{onMount();return React.createElement('button',{onClick:account.onSignOut},'已登录工作区')})));
}
test('mandatory login mounts no anonymous workspace and returns to gate immediately after logout',async()=>{
 let session=null,mounts=0;
 const client={getSession:async()=>({data:session}),signIn:{email:async()=>{session={user:{id:'verified-user',email:'owner@example.test'}};return{data:session}}},signOut:async()=>{session=null;return{data:{success:true}}}};
 const user=userEvent.setup();mount(client,()=>mounts++);
 await screen.findByRole('heading',{name:'登录账号'});assert.equal(mounts,0);assert.equal(screen.queryByText('已登录工作区'),null);assert.equal(screen.queryByText('取消'),null);
 await user.type(screen.getByLabelText('邮箱'),'owner@example.test');await user.type(screen.getByLabelText('密码'),'fixture-password');await user.click(screen.getByRole('button',{name:'登录',exact:true}));
 await user.click(await screen.findByText('已登录工作区'));
 await screen.findByRole('heading',{name:'登录账号'});assert.equal(screen.queryByText('已登录工作区'),null);
});
test('unavailable account service never opens the workspace or erases browser drafts',async()=>{
 window.localStorage.setItem('retained-draft','existing-content');let mounts=0;
 mount({getSession:async()=>{throw Error('offline')}},()=>mounts++);
 await screen.findByRole('heading',{name:'登录账号'});await waitFor(()=>assert.ok(screen.getByRole('alert')));
 assert.equal(mounts,0);assert.equal(window.localStorage.getItem('retained-draft'),'existing-content');window.localStorage.removeItem('retained-draft');
});
test('mandatory login shows an inert empty workspace and cannot be dismissed or open background search',async()=>{
 const user=userEvent.setup();const {container}=mount({getSession:async()=>({data:null})});
 await screen.findByRole('heading',{name:'登录账号'});
 const background=container.querySelector('.tw-login-background');
 assert.ok(background.hasAttribute('inert'));assert.equal(background.getAttribute('aria-hidden'),'true');
 assert.ok(background.querySelector('.tw-shell'));assert.equal(background.querySelectorAll('[data-task-id]').length,0);
 assert.equal(screen.getByLabelText('密码').hasAttribute('placeholder'),false);
 await user.keyboard('{Escape}{Control>}k{/Control}');
 assert.equal(screen.getAllByRole('dialog').length,1);assert.ok(screen.getByRole('dialog',{name:'登录图研'}));
 assert.equal(screen.queryByRole('dialog',{name:'搜索'}),null);
 await user.click(screen.getByRole('button',{name:'忘记密码'}));
 assert.ok(screen.getByRole('heading',{name:'忘记密码'}));
 await user.click(screen.getByRole('button',{name:'返回登录'}));
 assert.ok(screen.getByLabelText('密码'));
});
