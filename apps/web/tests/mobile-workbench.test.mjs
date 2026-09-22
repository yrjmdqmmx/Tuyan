import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkbenchHeader from '../src/components/WorkbenchHeader.jsx';
import GenerationSummaryDetails from '../src/components/GenerationSummaryDetails.jsx';
import GenerationWorkspace, { GenerationInputPanel } from '../src/components/GenerationWorkspace.jsx';
import useVisualViewport from '../src/hooks/useVisualViewport.js';

function compactMedia(initial = true) {
  const original = window.matchMedia;
  const listeners = new Set();
  const media = { matches: initial, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  window.matchMedia = () => media;
  return { resize(matches) { act(() => { media.matches = matches; listeners.forEach(fn => fn()); }); }, restore() { window.matchMedia = original; } };
}

test('mobile More keeps all secondary actions, closes on selection, restores focus and responds to desktop resize', async () => {
  const media = compactMedia(), actions = [];
  const props = Object.fromEntries(['onContact','onFeedback','onMiniProgram','onAgentConnection','onSignOut','onSignIn','onAccount','onGuide'].map(name => [name, () => actions.push(name)]));
  try {
    render(React.createElement(WorkbenchHeader, props));
    const more = screen.getByRole('button', {name:'更多',exact:true});
    assert.equal(screen.queryByRole('navigation', {name:'网站导航'}), null);
    await userEvent.click(more);
    const dialog = within(screen.getByRole('dialog', {name:'更多功能'}));
    const primary = dialog.getByRole('navigation', {name:'网站导航'});
    assert.deepEqual([...primary.querySelectorAll('.header-primary-link')].map(link => link.textContent.trim()), ['工作台','排行榜']);
    assert.equal(within(primary).getByRole('link', {name:'工作台'}).getAttribute('aria-current'), 'page');
    assert.equal(within(primary).getByRole('link', {name:'排行榜'}).getAttribute('href'), '/leaderboard');
    for (const name of ['联系作者','意见反馈','微信小程序','智能体接入','登录 / 注册']) assert.ok(dialog.getByRole('button', {name,exact:true}));
    for (const name of ['OpenAcad','GitHub','去观猹点评图研 Tuyan']) assert.ok(dialog.getByRole('link', {name,exact:true}));
    await userEvent.click(dialog.getByRole('button', {name:'智能体接入',exact:true}));
    assert.deepEqual(actions,['onAgentConnection']);
    assert.equal(screen.queryByRole('dialog'),null);
    await waitFor(() => assert.equal(document.activeElement, more));
    await userEvent.click(more);
    await userEvent.click(screen.getByRole('button', {name:'使用教程',exact:true}));
    assert.equal(actions.at(-1),'onGuide');
    assert.equal(screen.queryByRole('dialog'),null);
    await userEvent.click(more);
    await userEvent.keyboard('{Escape}');
    assert.equal(screen.queryByRole('dialog'),null);
    await userEvent.click(more);
    media.resize(false);
    assert.equal(screen.queryByRole('dialog'),null);
    assert.equal(screen.queryByRole('button',{name:'更多',exact:true}),null);
    assert.ok(screen.getByRole('navigation',{name:'网站导航'}));
    assert.equal(document.body.style.overflow,'');
  } finally { cleanup(); media.restore(); }
});

test('phone workflow reads content before submit and results; only a newly accepted job scrolls to results', () => {
  let submitted=0, scrolled=0;
  const original=window.HTMLElement.prototype.scrollIntoView;
  window.HTMLElement.prototype.scrollIntoView=function(){ scrolled++; };
  const props={compact:true,jobId:'existing-job',template:React.createElement('button',null,'浏览模板'),input:React.createElement('textarea',{'aria-label':'研究内容'}),controls:React.createElement('form',{onSubmit:event=>{event.preventDefault();submitted++;}},React.createElement('button',{type:'submit'},'生成')),results:React.createElement('p',null,'生成结果')};
  try {
    const view=render(React.createElement(GenerationWorkspace,props));
    const input=screen.getByRole('textbox'), submit=screen.getByRole('button',{name:'生成',exact:true}),result=screen.getByText('生成结果');
    assert.ok(input.compareDocumentPosition(submit)&window.Node.DOCUMENT_POSITION_FOLLOWING);
    assert.ok(submit.compareDocumentPosition(result)&window.Node.DOCUMENT_POSITION_FOLLOWING);
    fireEvent.click(submit);assert.equal(submitted,1);assert.equal(scrolled,0);
    view.rerender(React.createElement(GenerationWorkspace,{...props,jobId:'new-job'}));assert.equal(scrolled,1);
    view.rerender(React.createElement(GenerationWorkspace,{...props,jobId:'new-job'}));assert.equal(scrolled,1);
    view.rerender(React.createElement(GenerationWorkspace,{...props,compact:false,jobId:'desktop-job'}));assert.equal(scrolled,1);
  } finally { cleanup();window.HTMLElement.prototype.scrollIntoView=original; }
});

test('optional phone inputs retain edits when folded and become visible on validation errors', () => {
  const props={compact:true,reference:React.createElement('p',null,'参考图'),fields:React.createElement('textarea',{'aria-label':'正文',defaultValue:'研究内容'}),extras:React.createElement('textarea',{'aria-label':'补充要求',defaultValue:'原值'})};
  try {
    const view=render(React.createElement(GenerationInputPanel,props));
    const details=document.querySelector('details');assert.equal(details.open,false);
    fireEvent.click(details.querySelector('summary'));
    const extras=screen.getByRole('textbox',{name:'补充要求'});fireEvent.change(extras,{target:{value:'保留细节'}});
    fireEvent.click(details.querySelector('summary'));assert.equal(details.open,false);
    view.rerender(React.createElement(GenerationInputPanel,{...props,supplementError:true}));
    assert.equal(details.open,true);assert.equal(screen.getByRole('textbox',{name:'补充要求'}),extras);assert.equal(extras.value,'保留细节');
  } finally { cleanup(); }
});

test('mobile model disclosure keeps its contents mounted and desktop always exposes the same values', async () => {
  const media=compactMedia();
  try {
    render(React.createElement(GenerationSummaryDetails,{outputLabel:'1K · PNG · 16:9'},React.createElement('input',{'aria-label':'保留的配置',defaultValue:'original'})));
    const input=document.querySelector('input'), details=document.querySelector('details');
    assert.equal(details.open,false);
    fireEvent.click(document.querySelector('summary'));
    assert.equal(details.open,true);
    fireEvent.change(input,{target:{value:'keep me'}});
    fireEvent.click(document.querySelector('summary'));
    media.resize(false);
    assert.equal(details.open,true);
    assert.equal(document.querySelector('input'),input);
    assert.equal(input.value,'keep me');
    media.resize(true);
    assert.equal(details.open,false);
  } finally { cleanup(); media.restore(); }
});

test('keyboard viewport changes update overlay bounds without affecting pinch zoom and clean up on unmount', () => {
  const original=window.visualViewport;
  const viewport=new window.EventTarget();
  Object.assign(viewport,{height:844,offsetTop:0,scale:1});
  Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
  function Probe() { useVisualViewport(); return null; }
  try {
    const view=render(React.createElement(Probe));
    viewport.height=360;viewport.offsetTop=90;viewport.dispatchEvent(new window.Event('resize'));
    assert.equal(document.documentElement.style.getPropertyValue('--workbench-viewport-height'),'360px');
    assert.equal(document.documentElement.style.getPropertyValue('--workbench-viewport-top'),'90px');
    viewport.scale=2;viewport.height=150;viewport.dispatchEvent(new window.Event('resize'));
    assert.equal(document.documentElement.style.getPropertyValue('--workbench-viewport-height'),'360px');
    view.unmount();
    viewport.scale=1;viewport.dispatchEvent(new window.Event('scroll'));
    assert.equal(document.documentElement.style.getPropertyValue('--workbench-viewport-height'),'');
  } finally { cleanup();Object.defineProperty(window,'visualViewport',{configurable:true,value:original}); }
});
