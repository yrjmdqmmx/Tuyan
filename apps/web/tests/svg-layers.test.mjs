import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {render,screen,cleanup,fireEvent,act} from '@testing-library/react';
import {indexedDB} from 'fake-indexeddb';
import {parseSvg,changeSvg,findSvgNode,svgHistory,historyChange,historyStep,ungroupSvg} from '../src/lib/svgDocument.js';
import {assertSvgEditable,assertSvgResourceEditable,setSvgHidden,setSvgLocked,sortSvgObject,svgLayerState,reorderSvgLayers} from '../src/lib/svgLayers.js';
import {readSvgDraft,saveSvgDraft,svgDraftKey} from '../src/lib/svgDrafts.js';
import SvgEditorCanvas from '../src/components/SvgEditorCanvas.jsx';
const wrap=body=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">${body}</svg>`;
const id=(root,selector)=>root.querySelector(selector).getAttribute('data-tuyan-id');
afterEach(()=>{cleanup();window.localStorage.clear();window.indexedDB=indexedDB;});
test('hide/show restores exact authored styles, and hidden parents cover explicit visible descendants',()=>{
 for(const style of ['', ' style=""', ' style="fill:red;display:inline !important;opacity:0.7"']){
  const original=parseSvg(wrap(`<g id="parent"${style}><text visibility="visible">中文 μ ± σ</text></g>`)),key=id(original.root,'g');
  const hidden=parseSvg(changeSvg(original.svg,root=>setSvgHidden(root,key,true)));
  assert.equal(hidden.root.querySelector('g').style.getPropertyValue('display'),'none');assert.equal(hidden.root.querySelector('g').style.getPropertyPriority('display'),'important');
  assert.equal(svgLayerState(hidden.root.querySelector('text')).inheritedHidden,true);assert.throws(()=>assertSvgEditable(hidden.root,[key]),/隐藏/);
  assert.equal(changeSvg(hidden.svg,root=>setSvgHidden(root,key,false)),original.svg);
 }
});
test('locks guard children and ancestor edits without flattening or discarding independent child locks',()=>{
 const p=parseSvg(wrap('<g><text>中文 α ≤ β</text><rect width="40" height="20"/></g>')),parent=id(p.root,'g'),text=id(p.root,'text');
 const childLocked=changeSvg(p.svg,root=>setSvgLocked(root,text,true));
 assert.throws(()=>assertSvgEditable(parseSvg(childLocked).root,[parent]),/包含锁定/);
 const groupLocked=changeSvg(childLocked,root=>setSvgLocked(root,parent,true)),r=parseSvg(groupLocked).root;
 assert.equal(svgLayerState(r.querySelector('rect')).inheritedLocked,true);assert.throws(()=>setSvgLocked(r,text,false),/父组/);
 const unlocked=parseSvg(changeSvg(groupLocked,root=>setSvgLocked(root,parent,false))).root;
 assert.equal(svgLayerState(unlocked.querySelector('text')).ownLocked,true);assert.equal(svgLayerState(unlocked.querySelector('rect')).locked,false);
 assert.throws(()=>assertSvgResourceEditable(unlocked),/共享渐变/);
});
test('layer order and flags survive draft reopen and share exact document undo/redo history',async()=>{
 window.indexedDB=indexedDB;
 const p=parseSvg(wrap('<rect id="back" width="40" height="20"/><text id="front">Δx / x₀</text>')),a=id(p.root,'rect'),b=id(p.root,'text');let h=svgHistory(p.svg);
 for(const edit of [r=>sortSvgObject(r,a,b,'before'),r=>setSvgLocked(r,a,true),r=>setSvgHidden(r,b,true)])h=historyChange(h,changeSvg(h.present,edit));
 const final=h.present;
 for(let i=0;i<3;i++)h=historyStep(h,'undo');assert.equal(h.present,p.svg);
 for(let i=0;i<3;i++)h=historyStep(h,'redo');assert.equal(h.present,final);
 const key=svgDraftKey('/layer-qa','user','flags',1);
 await saveSvgDraft({key,writer:'qa',revision:1,baseRevision:0,svg:final,updatedAt:1});const restored=parseSvg((await readSvgDraft(key)).svg);
 assert.equal(restored.svg,final);assert.equal(restored.root.lastElementChild.id,'back');assert.equal(svgLayerState(findSvgNode(restored.root,a)).locked,true);assert.equal(svgLayerState(findSvgNode(restored.root,b)).hidden,true);
 assert.equal(restored.root.querySelector('text').textContent,'Δx / x₀');
});
test('sorting preserves transparent transform wrappers and rejects reparenting, formula reflow and unsafe CSS',()=>{
 const p=parseSvg(wrap('<g transform="translate(30 20)" fill="#567"><rect id="a" width="20" height="20"/><text id="b">a²</text></g>'));
 const ungrouped=changeSvg(p.svg,root=>ungroupSvg(root,[id(root,'g')]));const original=parseSvg(ungrouped),a=id(original.root,'rect'),b=id(original.root,'text');
 const reordered=parseSvg(changeSvg(ungrouped,r=>sortSvgObject(r,a,b,'before')));
 assert.equal(reordered.root.lastElementChild.querySelector('rect').id,'a');assert.equal(reordered.root.lastElementChild.getAttribute('transform'),'translate(30 20)');assert.equal(reordered.root.lastElementChild.getAttribute('fill'),'#567');
 assert.equal(changeSvg(reordered.svg,r=>sortSvgObject(r,a,b,'after')),ungrouped);
 const mixed=parseSvg(wrap('<g><rect/></g><g><text>x<tspan>2</tspan><tspan>3</tspan></text></g>'));
 assert.throws(()=>sortSvgObject(mixed.root,id(mixed.root,'rect'),id(mixed.root,'text'),'before'),/同一父组/);
 const spans=[...mixed.root.querySelectorAll('tspan')].map(n=>n.getAttribute('data-tuyan-id'));assert.throws(()=>sortSvgObject(mixed.root,...spans,'before'),/公式/);
 for(const markup of ['<style>rect:nth-child(2){fill:red}</style><rect/><text>x</text>','<g><style>.x{fill:red}</style><rect/></g><text>x</text>']){
  const root=parseSvg(wrap(markup)).root;assert.throws(()=>reorderSvgLayers(root,[id(root,root.querySelector('g')?'g':'rect')],'front'),/排序/);
 }
});
test('tree controls lock editing, restore visibility, respect read-only and support keyboard sorting with history',async()=>{
 let latest=parseSvg(wrap('<rect id="shape" width="40" height="20"/><text x="40" y="30">中文 μ</text>')).svg;const errors=[];
 function Harness({readOnly=false}){const [history,setHistory]=React.useState(svgHistory(latest));return React.createElement(SvgEditorCanvas,{svg:history.present,readOnly,onChange:next=>{latest=next;setHistory(h=>historyChange(h,next));},onUndo:()=>setHistory(h=>{const next=historyStep(h,'undo');latest=next.present;return next;}),onRedo:()=>setHistory(h=>{const next=historyStep(h,'redo');latest=next.present;return next;}),canUndo:history.past.length>0,canRedo:history.future.length>0,onError:m=>{if(m!=='node.getBBox is not a function')errors.push(m);}});}
 const view=render(React.createElement(Harness));await act(async()=>fireEvent.click(screen.getByRole('button',{name:'图层 / 对象',exact:true})));
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'对象：文字 · 中文 μ',exact:true})));
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'锁定：文字 · 中文 μ',exact:true})));
 assert.equal(screen.queryByRole('button',{name:'删除',exact:true}),null);assert.equal(screen.queryByRole('button',{name:'改字',exact:true}),null);assert.equal(screen.getByRole('button',{name:'拖动排序：文字 · 中文 μ'}).disabled,true);
 const locked=latest;await act(async()=>fireEvent.keyDown(screen.getByLabelText('SVG 直接编辑画布'),{key:'Delete'}));assert.equal(latest,locked);assert.match(errors.pop(),/锁定/);
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'隐藏：文字 · 中文 μ',exact:true})));assert.equal(parseSvg(latest).root.querySelector('text').style.display,'none');
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'撤销',exact:true})));assert.equal(latest,locked);
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'重做',exact:true})));assert.equal(parseSvg(latest).root.querySelector('text').style.display,'none');
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'显示：文字 · 中文 μ',exact:true})));
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'解锁：文字 · 中文 μ',exact:true})));
 await act(async()=>fireEvent.keyDown(screen.getByRole('button',{name:'拖动排序：矩形 · shape'}),{key:'ArrowUp',altKey:true}));assert.equal(parseSvg(latest).root.lastElementChild.id,'shape');
 view.rerender(React.createElement(Harness,{readOnly:true}));assert.equal(screen.getByRole('button',{name:'锁定：文字 · 中文 μ'}).disabled,true);assert.equal(screen.getByRole('button',{name:'隐藏：文字 · 中文 μ'}).disabled,true);assert.equal(screen.getByRole('button',{name:'拖动排序：矩形 · shape'}).disabled,true);
 assert.deepEqual(errors,[]);await act(async()=>{});
});
