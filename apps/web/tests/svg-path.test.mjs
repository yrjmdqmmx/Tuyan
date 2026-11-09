import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEditablePath as parse,serializeEditablePath as serialize,pathPointAt,pathHandles,movePathPoint,splitPathSegment,deletePathNode} from '../src/lib/svgPath.js';
import {parseSvg,changeSvg,findSvgNode,svgHistory,historyChange,historyStep} from '../src/lib/svgDocument.js';
import {addSvgObject} from '../src/lib/svgObjects.js';
import React from 'react';
import {render,screen,cleanup,fireEvent,act} from '@testing-library/react';
import SvgEditorCanvas from '../src/components/SvgEditorCanvas.jsx';
const near=(a,b)=>{assert.ok(Math.abs(a.x-b.x)<1e-9,`${a.x} != ${b.x}`);assert.ok(Math.abs(a.y-b.y)<1e-9,`${a.y} != ${b.y}`);};

test('relative, repeated, smooth and scientific commands expand to native cubic/quadratic geometry',()=>{
 const m=parse('m1e1 20 10 0 h10 v10 c10 -20 20 -20 30 0 s20 20 30 0 q10 -20 20 0 t20 0 l5 5 t10 10');
 const p=m.subpaths[0];assert.equal(p.nodes.length,10);assert.deepEqual(p.nodes[0],{x:10,y:20});
 assert.deepEqual(p.segments[4].c1,{x:70,y:50});assert.deepEqual(p.segments[6].q,{x:120,y:50});
 assert.deepEqual(p.segments[8].q,{x:135,y:35});
 const again=parse(serialize(m));assert.deepEqual(again,m);
 const reset=parse('M0 0 C1 1 2 2 3 3 L4 4 S6 6 7 7 M9 9 T10 10');
 assert.deepEqual(reset.subpaths[0].segments[2].c1,{x:4,y:4});assert.deepEqual(reset.subpaths[1].segments[0].q,{x:9,y:9});
});
test('closed and multiple subpaths retain closing geometry and independent holes',()=>{
 for(const d of ['M0 0 L30 0 L30 30 Z M5 5 L5 10 L10 10Z','M0 0 C0 10 10 10 0 0Z','M0 0L20 0L20 20L0 0Z']){
  const m=parse(d);assert.deepEqual(parse(serialize(m)),m);
  for(const p of m.subpaths)assert.equal(p.nodes.length,p.segments.length);
 }
});
test('malformed arc flags, malformed data and excessive paths fail before any source rewrite',()=>{
 for(const d of ['M0 0 A5 5 0 2 1 10 10','M0 0 A5 5 0 0 2 10 10','M0 0 C1 2 3','M0 0 L','L0 0','M0 0 R1 1','M0 0 LNaN 3','M0 0 L1e999 0','M0 0 L1e8 0','M0 0Z L2 2','M,0 0 L1 1','M0,,0L1 1','M0 0L1 1,','M0 0 '+Array(501).fill('L1 1').join(' ')])assert.throws(()=>parse(d));
 const d='m0,0 c 1,2 3,4 5,6';parse(d);assert.equal(d,'m0,0 c 1,2 3,4 5,6');
});
test('De Casteljau insertion preserves every sampled point, including the closing segment',()=>{
 for(const d of ['M0 0 C10 -50 90 80 100 0','M0 0 Q45 70 100 0','M0 0L100 50','M0 0 L30 0 L30 30Z','M0 0 C0 10 10 10 0 0Z']){
  const m=parse(d),part=m.subpaths[0],index=part.segments.length-1,t=.37,next=splitPathSegment(m,0,index,t),p=next.subpaths[0];
  assert.equal(p.nodes.length,part.nodes.length+1);assert.equal(serialize(parse(serialize(next))),serialize(next));
  for(let i=0;i<=100;i++){const u=i/100;near(pathPointAt(part,index,u),u<=t?pathPointAt(p,index,u/t):pathPointAt(p,index+1,(u-t)/(1-t)));}
 }
});
test('anchor movement carries only its adjacent controls; a control moves independently',()=>{
 const m=parse('M0 0 C10 0 20 20 30 30 S50 0 60 0 M80 0 Q90 30 100 0'),original=serialize(m);
 const next=movePathPoint(m,{subpath:0,index:1},{x:35,y:37});
 assert.deepEqual(pathHandles(next,0,1).map(h=>h.point),[{x:25,y:27},{x:45,y:47}]);
 assert.deepEqual(next.subpaths[0].segments[0].c1,m.subpaths[0].segments[0].c1);assert.deepEqual(next.subpaths[1],m.subpaths[1]);
 const control=movePathPoint(m,{subpath:0,index:1,segment:0,control:'c2'},{x:22,y:25});
 assert.deepEqual(control.subpaths[0].nodes,m.subpaths[0].nodes);assert.deepEqual(control.subpaths[0].segments[1],m.subpaths[0].segments[1]);assert.equal(serialize(m),original);
 const q=movePathPoint(m,{subpath:1,index:0},{x:85,y:5});assert.deepEqual(q.subpaths[1].segments[0].q,{x:95,y:35});
 const browserPoint=Object.create({get x(){return 22;},get y(){return 25;}});
 assert.deepEqual(movePathPoint(m,{subpath:0,index:1},browserPoint).subpaths[0].nodes[1],{x:22,y:25});
 assert.deepEqual(movePathPoint(m,{subpath:0,index:1,segment:0,control:'c2'},browserPoint).subpaths[0].segments[0].c2,{x:22,y:25});
});
test('deleting nodes handles open ends, interior tangents and closed start without touching other subpaths',()=>{
 const m=parse('M0 0 C5 10 10 10 20 0 C25 -10 30 -10 40 0 L60 0 M100 100L110 100L110 110L100 110Z');
 const middle=deletePathNode(m,0,1);assert.deepEqual(middle.subpaths[0].segments[0],{type:'C',c1:{x:5,y:10},c2:{x:30,y:-10}});assert.deepEqual(middle.subpaths[1],m.subpaths[1]);
 for(const index of [0,1,2,3]){const next=deletePathNode(m,1,index);assert.equal(next.subpaths[1].nodes.length,3);assert.deepEqual(parse(serialize(next)),next);assert.deepEqual(next.subpaths[0],m.subpaths[0]);assert.throws(()=>deletePathNode(next,1,0),/至少保留/);}
 const first=deletePathNode(m,0,0);assert.deepEqual(first.subpaths[0].nodes[0],{x:20,y:0});
 const last=deletePathNode(m,0,3);assert.equal(last.subpaths[0].segments.length,2);assert.equal(last.subpaths[0].nodes.length,3);
 assert.throws(()=>deletePathNode(parse('M0 0L1 1'),0,0),/至少保留/);
});
test('new curves are independent SVG paths; edits preserve Unicode, markers, transforms and exact undo/redo',()=>{
 let svg=parseSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><text>中文 α ∑ ± ≤</text><g transform="rotate(15)"><path id="source" d="M0 0C10 0 20 30 40 40" stroke="red" fill="none"/></g></svg>').svg,id;
 svg=changeSvg(svg,r=>{id=addSvgObject(r,'curve');});const root=parseSvg(svg).root;assert.equal(root.querySelectorAll('path').length,2);assert.equal(root.querySelector('image'),null);assert.equal(parse(findSvgNode(root,id).getAttribute('d')).subpaths[0].nodes.length,3);
 const edit=changeSvg(svg,r=>{const n=findSvgNode(r,id);n.setAttribute('d',serialize(splitPathSegment(parse(n.getAttribute('d')),0,0)));});
 const changed=parseSvg(edit).root;assert.equal(changed.querySelector('g').outerHTML,root.querySelector('g').outerHTML);assert.equal(changed.querySelector('text').textContent,'中文 α ∑ ± ≤');
 const history=historyChange(svgHistory(svg),edit);assert.equal(historyStep(history,'undo').present,svg);assert.equal(historyStep(historyStep(history,'undo'),'redo').present,edit);
});

test('curve tools appear on selection, add/delete through history and respect geometry/read-only gates',async()=>{
 let latest=parseSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><text>中文 ∑</text></svg>').svg;const errors=[];
 function Harness({readOnly=false,dataProtected=false}){const [history,setHistory]=React.useState(svgHistory(latest));return React.createElement(SvgEditorCanvas,{svg:history.present,readOnly,dataProtected,geometryAllowed:false,onChange:next=>{latest=next;setHistory(h=>historyChange(h,next));},onUndo:()=>setHistory(h=>{const n=historyStep(h,'undo');latest=n.present;return n;}),onRedo:()=>setHistory(h=>{const n=historyStep(h,'redo');latest=n.present;return n;}),canUndo:!!history.past.length,canRedo:!!history.future.length,onError:e=>{if(e!=='node.getBBox is not a function')errors.push(e);}});}
 const view=render(React.createElement(Harness)),click=async name=>act(async()=>fireEvent.click(screen.getByRole('button',{name,exact:true}))),count=()=>parse(parseSvg(latest).root.querySelector('path').getAttribute('d')).subpaths[0].nodes.length;
 try{
  fireEvent.click(screen.getByLabelText('线条'));await click('贝塞尔曲线');assert.equal(count(),3);assert.equal(screen.getByRole('button',{name:'节点',exact:true}).getAttribute('aria-pressed'),'true');
  const original=latest;await click('＋ 节点');assert.equal(count(),4);const split=latest;await click('撤销');assert.equal(latest,original);await click('重做');assert.equal(latest,split);
  await click('删除节点');assert.equal(count(),3);await click('删除节点');assert.equal(count(),2);assert.equal(screen.getByRole('button',{name:'删除节点'}).disabled,true);await click('撤销');assert.equal(count(),3);
  view.rerender(React.createElement(Harness,{dataProtected:true}));assert.equal(screen.getByRole('button',{name:'＋ 节点'}).disabled,true);const before=latest;fireEvent.keyDown(document.querySelector('.svg-editor'),{key:'Delete'});assert.equal(latest,before);assert.match(errors.pop(),/几何/);
  view.rerender(React.createElement(Harness,{readOnly:true}));assert.equal(screen.getByLabelText('线条').getAttribute('aria-disabled'),'true');assert.deepEqual(errors,[]);
 }finally{cleanup();}
});

test('arc selection exposes native arc parameters without rewriting authored commands',async()=>{
 const d='M0 0L100 0A30 30 0 0 1 100 60L0 60Z',svg=parseSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><path id="arc" d="${d}"/></svg>`).svg;
 render(React.createElement(SvgEditorCanvas,{svg,onChange:()=>assert.fail('selection must not change SVG'),onError:e=>assert.equal(e,'node.getBBox is not a function')}));
 try{fireEvent.click(screen.getByRole('button',{name:'图层 / 对象'}));fireEvent.click(screen.getByRole('button',{name:'对象：路径 · arc',exact:true}));await act(async()=>{});assert.equal(screen.getByLabelText('半径 X').value,'30');assert.ok(screen.getByRole('button',{name:'＋ 节点'}));assert.equal(document.querySelector('.svg-document-host').shadowRoot.querySelector('path').getAttribute('d'),d);}finally{cleanup();}
});
