import assert from 'node:assert/strict';
import {test,afterEach} from 'node:test';
import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {useAuthSession} from '../src/hooks/useAuthSession.js';
afterEach(cleanup);
function Harness({client}){const a=useAuthSession({client,enabled:true});return React.createElement('div',null,React.createElement('span',{'data-testid':'name'},a.session?.user?.name||'none'),React.createElement('span',{'data-testid':'pending'},String(a.isPending)));}
test('foreground catchup refreshes account identity quietly and coalesces duplicate events',async()=>{
 let calls=0,next;const client={getSession:async()=>{calls++;if(calls===1)return {data:{user:{id:'A',name:'original'}}};return new Promise(resolve=>next=resolve);}};
 render(React.createElement(Harness,{client}));await waitFor(()=>assert.equal(screen.getByTestId('name').textContent,'original'));fireEvent.focus(window);fireEvent.online(window);await waitFor(()=>assert.equal(calls,2));assert.equal(screen.getByTestId('pending').textContent,'false');next({data:{user:{id:'A',name:'updated'}}});await waitFor(()=>assert.equal(screen.getByTestId('name').textContent,'updated'));assert.equal(calls,2);
});
