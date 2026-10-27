import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MenuSelect from '../src/components/MenuSelect.jsx';
import TaskActionMenu from '../src/workspace/TaskActionMenu.jsx';
import AccessibleDialog from '../src/components/AccessibleDialog.jsx';
import { chooseMenuOption } from './menu-helpers.mjs';
afterEach(cleanup);
const h=React.createElement;
const options=[h('option',{key:'a',value:'a'},'Alpha'),h('optgroup',{key:'g',label:'研究模型'},h('option',{value:'b',disabled:true},'Beta'),h('option',{value:'c'},'Charlie')),h('optgroup',{key:'x',label:'暂不可用',disabled:true},h('option',{value:'d'},'Delta')),h('option',{key:'e',value:'e'},'Echo')];
function Selector({capture=()=>{}, ...props}){const [value,setValue]=useState('a');return h(React.Fragment,null,h('label',null,'测试选择',h(MenuSelect,{value,onChange:e=>{capture(e.target);setValue(e.target.value)},...props},options)),h('button',null,'下一个'));}
test('shared selector preserves labels, groups, disabled items and exact submitted values',()=>{
 let saved;render(h(Selector,{name:'model',capture:v=>saved=v}));const trigger=screen.getByRole('combobox',{name:'测试选择'});
 fireEvent.click(trigger);assert.equal(within(screen.getByRole('group',{name:'研究模型'})).getAllByRole('option').length,2);
 fireEvent.click(screen.getByRole('option',{name:'Beta'}));assert.equal(trigger.value,'a');assert.equal(saved,undefined);
 fireEvent.click(screen.getByRole('option',{name:'Delta'}));assert.equal(trigger.value,'a');
 fireEvent.click(screen.getByRole('option',{name:'Charlie'}));assert.deepEqual(saved,{value:'c',name:'model'});assert.equal(document.querySelector('input[name=model]').value,'c');assert.equal(screen.queryByRole('listbox'),null);
});
test('keyboard navigation skips disabled options, cancels on Escape and commits before Tab',async()=>{
 render(h(Selector));const user=userEvent.setup(),trigger=screen.getByRole('combobox');await user.tab();assert.equal(document.activeElement,trigger);
 await user.keyboard('{ArrowDown}{ArrowDown}');assert.equal(trigger.value,'a');assert.equal(trigger.getAttribute('aria-activedescendant'),screen.getByRole('option',{name:'Charlie'}).id);
 await user.keyboard('{Escape}');assert.equal(trigger.value,'a');assert.equal(screen.queryByRole('listbox'),null);
 await user.keyboard('{End}{Enter}');assert.equal(trigger.value,'e');
 await user.keyboard('{Home}{ArrowDown}{Tab}');assert.equal(trigger.value,'c');assert.equal(document.activeElement,screen.getByRole('button',{name:'下一个'}));
});
test('typeahead selects a matching enabled option; outside click dismisses without commit',async()=>{
 render(h(Selector));const user=userEvent.setup();await user.tab();await user.keyboard('ec');await user.keyboard('{Enter}');assert.equal(screen.getByRole('combobox').value,'e');
 await user.click(screen.getByRole('combobox'));await user.keyboard('{Home}');await user.click(screen.getByRole('button',{name:'下一个'}));assert.equal(screen.getByRole('combobox').value,'e');assert.equal(screen.queryByRole('listbox'),null);
});
test('dropdown remains in modal accessibility scope and Escape closes it before the modal',async()=>{
 let closed=0;render(h(AccessibleDialog,{open:true,onClose:()=>closed++,labelledBy:'title'},h('h2',{id:'title'},'设置'),h(Selector)));
 const user=userEvent.setup(),trigger=screen.getByRole('combobox');await user.click(trigger);assert.ok(within(screen.getByRole('dialog')).getByRole('listbox'));
 await user.keyboard('{Escape}');assert.equal(closed,0);assert.equal(screen.queryByRole('listbox'),null);await user.keyboard('{Escape}');assert.equal(closed,1);
});
test('numeric option labels, fragments and disabled selectors retain expected behavior',()=>{
 const view=render(h(MenuSelect,{'aria-label':'数量',defaultValue:2},h(React.Fragment,null,h('option',null,1),h('option',null,2))));const trigger=screen.getByRole('combobox');assert.equal(trigger.textContent,'2');chooseMenuOption(trigger,1);assert.equal(trigger.value,'1');
 view.rerender(h(MenuSelect,{'aria-label':'数量',disabled:true},h('option',null,1)));fireEvent.click(trigger);assert.equal(screen.queryByRole('listbox'),null);
});
test('task actions have arrow navigation, dismissal and exact task identity',async()=>{
 const calls=[];render(h(React.Fragment,null,h(TaskActionMenu,{task:{id:'a',title:'任务 A'},dispatch:v=>calls.push(v),onRename:task=>calls.push(task),onDelete:(task,trigger)=>calls.push({task,trigger})}),h('button',null,'后一个')));
 const user=userEvent.setup(),trigger=screen.getByRole('button',{name:'任务 A 的操作'});await user.click(trigger);assert.equal(document.activeElement,screen.getByRole('menuitem',{name:'重命名'}));
 await user.keyboard('{ArrowDown}{Enter}');assert.deepEqual(calls,[{type:'PIN',taskId:'a'}]);assert.equal(document.activeElement,trigger);
 await user.click(trigger);await user.keyboard('{Escape}');assert.equal(screen.queryByRole('menu'),null);assert.equal(document.activeElement,trigger);
 await user.keyboard('{ArrowUp}');assert.equal(document.activeElement,screen.getByRole('menuitem',{name:'删除'}));await user.keyboard('{Tab}');assert.equal(document.activeElement,screen.getByRole('button',{name:'后一个'}));assert.equal(screen.queryByRole('menu'),null);
 await user.click(trigger);await user.click(screen.getByRole('button',{name:'后一个'}));assert.equal(screen.queryByRole('menu'),null);
 await user.click(trigger);await user.click(screen.getByRole('menuitem',{name:'删除'}));assert.deepEqual(calls[1],{task:{id:'a',title:'任务 A'},trigger});assert.equal(screen.queryByRole('menu'),null);
});

test('running task cannot be deleted and keyboard navigation skips the disabled action',async()=>{
 let deleted=false;render(h(TaskActionMenu,{task:{id:'run',title:'运行中',activeRunId:'job'},dispatch:()=>{},onRename:()=>{},onDelete:()=>{deleted=true;}}));
 const user=userEvent.setup();await user.tab();await user.keyboard('{ArrowUp}');assert.equal(document.activeElement,screen.getByRole('menuitem',{name:'置顶'}));
 const remove=screen.getByRole('menuitem',{name:'删除'});assert.equal(remove.disabled,true);fireEvent.click(remove);assert.equal(deleted,false);
});
