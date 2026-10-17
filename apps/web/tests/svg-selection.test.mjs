import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSvg,changeSvg,findSvgNode,svgHistory,historyChange,historyStep} from '../src/lib/svgDocument.js';
import {rectangleBetween,containsBox,selectedDragTarget,marqueeSelection,snapReferences,snapTranslation,snapPoint,snapResize,readSvgGuides,writeSvgGuides,addSvgGuide} from '../src/lib/svgSelection.js';
import {resizeHandles,resizeFromHandle} from '../src/lib/svgViewport.js';
const fixture='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><defs><rect id="ref" width="5" height="5"/></defs><g data-tuyan-id="group"><rect data-tuyan-id="a"/><text data-tuyan-id="text">中文 μ<tspan>± σ</tspan></text></g><rect data-tuyan-id="locked" data-tuyan-locked="true"/><rect data-tuyan-id="hidden" data-tuyan-hidden="true"/><line data-tuyan-id="line"/></svg>';
const boxes={group:{x:10,y:10,width:100,height:100},a:{x:20,y:20,width:10,height:10},text:{x:70,y:20,width:30,height:20},locked:{x:20,y:20,width:10,height:10},hidden:{x:20,y:20,width:10,height:10},line:{x:40,y:20,width:0,height:10}};
const getBounds=n=>boxes[n.getAttribute('data-tuyan-id')];
test('marquee handles reverse direction and full containment including zero-width lines',()=>{
 assert.deepEqual(rectangleBetween({x:90,y:80},{x:-10,y:20}),{x:-10,y:20,width:100,height:60});
 assert.equal(containsBox({x:0,y:0,width:10,height:10},{x:9,y:9,width:3,height:0}),false);
 const {root}=parseSvg(fixture);assert.deepEqual(marqueeSelection(root,{x:0,y:0,width:50,height:50},getBounds,()=>true),['a','line']);
 assert.deepEqual(marqueeSelection(root,{x:0,y:0,width:120,height:120},getBounds,()=>true),['group','line']);
 findSvgNode(root,'a').setAttribute('data-tuyan-locked','true');assert.deepEqual(marqueeSelection(root,{x:0,y:0,width:120,height:120},getBounds,()=>true),['text','line']);
});
test('snap references exclude moving ancestors and descendants, retain locked visible references',()=>{
 const {root}=parseSvg(fixture);const refs=snapReferences(root,['a'],getBounds,n=>n.getAttribute('data-tuyan-id')!=='hidden');
 assert.deepEqual(refs,[boxes.text,boxes.locked,boxes.line]);
});
test('snapping preserves group relative geometry and uses axis-specific zoom thresholds',()=>{
 const box={x:10,y:20,width:40,height:30},refs=[{x:100,y:100,width:20,height:20}];
 assert.deepEqual(snapTranslation(box,{x:48,y:46},refs,[],{x:3,y:3}),{x:50,y:46,lines:[{axis:'x',position:100,kind:'object'}]});
 assert.deepEqual(snapTranslation(box,{x:48,y:46},refs,[],{x:1,y:1}),{x:48,y:46,lines:[]});
 const snapped=snapTranslation(box,{x:48,y:46},refs,[{axis:'x',position:98}],{x:3,y:3});assert.equal(snapped.x,48);assert.equal(snapped.lines[0].kind,'guide');
 assert.equal(snapTranslation(box,{x:50,y:46},refs,[{axis:'x',position:102}],{x:3,y:3}).x,52,'explicit guides take priority over nearby object anchors');
 const negative=snapTranslation(box,{x:-31,y:-42},[],[{axis:'x',position:-20},{axis:'y',position:-20}],{x:2,y:3});assert.equal(negative.x,-30);assert.equal(negative.y,-40);
});
test('guides persist as inert metadata through source serialization, undo and redo',()=>{
 const original=parseSvg(fixture).svg;
 const next=changeSvg(original,root=>{addSvgGuide(root,'x',72.5);addSvgGuide(root,'y',-20);});
 const {root}=parseSvg(next);assert.deepEqual(readSvgGuides(root),[{id:'guide-1',axis:'x',position:72.5},{id:'guide-2',axis:'y',position:-20}]);
 assert.equal(root.querySelectorAll('line').length,1);assert.equal(root.querySelector('text').textContent,'中文 μ± σ');
 let history=historyChange(svgHistory(original),next);history=historyStep(history,'undo');assert.deepEqual(readSvgGuides(parseSvg(history.present).root),[]);history=historyStep(history,'redo');assert.equal(readSvgGuides(parseSvg(history.present).root).length,2);
 assert.throws(()=>writeSvgGuides(root,[{id:'bad',axis:'x',position:NaN}]),/有效画布坐标/);
 root.setAttribute('data-tuyan-guides','not json');assert.deepEqual(readSvgGuides(root),[]);
 root.setAttribute('data-tuyan-guides','[{"id":"a","axis":"x","position":20},{"id":"a","axis":"x","position":30},{"id":"b","axis":"z","position":20}]');assert.deepEqual(readSvgGuides(root),[{id:'a',axis:'x',position:20}]);
});

test('dragging a marquee-selected child retains the partial group selection',()=>{
 const {root}=parseSvg(fixture);assert.equal(selectedDragTarget(root,findSvgNode(root,'text').querySelector('tspan'),['text','a']),findSvgNode(root,'text'));
 assert.equal(selectedDragTarget(root,findSvgNode(root,'a'),['group']),findSvgNode(root,'group'));
 assert.equal(selectedDragTarget(root,findSvgNode(root,'line'),['group']),null);
});

test('endpoint snaps independently to object edges, centres and explicit guides',()=>{
 const refs=[{x:100,y:200,width:80,height:40}];
 assert.deepEqual(snapPoint({x:138,y:237},refs,[],{x:3,y:4}),{x:140,y:240,lines:[{axis:'x',position:140,kind:'object'},{axis:'y',position:240,kind:'object'}]});
 assert.deepEqual(snapPoint({x:138,y:237},refs,[],{x:1,y:2}),{x:138,y:237,lines:[]});
 const r=snapPoint({x:140,y:221},refs,[{axis:'x',position:145}],{x:6,y:6});assert.equal(r.x,145);assert.equal(r.y,220);assert.equal(r.lines[0].kind,'guide');
});

test('every resize handle keeps its opposite anchor and snaps only active axes',()=>{
 const box={x:-20,y:30,width:200,height:100},threshold={x:6,y:6};
 for(const [handle,hx,hy] of resizeHandles){
  const initial=resizeFromHandle(box,handle,{x:box.x+box.width*hx,y:box.y+box.height*hy});
  const target={x:initial.x+(hx===0?-1:1)*box.width*1.5,y:initial.y+(hy===0?-1:1)*box.height*1.3};
  const r=snapResize(box,handle,{x:target.x-2,y:target.y+2},false,[],[{axis:'x',position:target.x},{axis:'y',position:target.y}],threshold);
  assert.equal(r.x,initial.x,handle);assert.equal(r.y,initial.y,handle);
  assert.equal(r.sx,hx===.5?1:1.5,handle);assert.equal(r.sy,hy===.5?1:1.3,handle);
  assert.deepEqual(r.lines.map(l=>l.axis),['x','y'].filter(a=>a==='x'?hx!==.5:hy!==.5),handle);
 }
});

test('nonuniform resizing aligns to reference edges and centres without moving its anchor',()=>{
 const r=snapResize({x:10,y:20,width:100,height:50},'se',{x:157,y:117},false,[{x:140,y:100,width:40,height:40}],[],{x:4,y:4});
 assert.deepEqual(r,{x:10,y:20,sx:1.5,sy:2,lines:[{axis:'x',position:160,kind:'object'},{axis:'y',position:120,kind:'object'}]});
});

test('uniform resize chooses one compatible scale and never reports a conflicting snap',()=>{
 const box={x:0,y:0,width:100,height:50},point={x:119,y:59.5},refs=[{x:120,y:62,width:0,height:0}],threshold={x:6,y:6};
 const r=snapResize(box,'se',point,true,refs,[],threshold);
 assert.equal(r.sx,1.2);assert.equal(r.sy,1.2);assert.deepEqual(r.lines,[{axis:'x',position:120,kind:'object'}]);
 const guided=snapResize(box,'se',point,true,refs,[{axis:'y',position:62}],threshold);
 assert.equal(guided.sx,1.24);assert.equal(guided.sy,1.24);assert.deepEqual(guided.lines,[{axis:'y',position:62,kind:'guide'}]);
 const compatible=snapResize(box,'se',point,true,[],[{axis:'x',position:120},{axis:'y',position:60}],threshold);assert.equal(compatible.lines.length,2);
});

test('uniform side handles preserve their opposite midpoint and ignore inactive pointer axes',()=>{
 const r=snapResize({x:10,y:20,width:100,height:50},'e',{x:128,y:999},true,[],[{axis:'x',position:130},{axis:'y',position:45}],{x:6,y:6});
 assert.deepEqual(r,{x:10,y:45,sx:1.2,sy:1.2,lines:[{axis:'x',position:130,kind:'guide'}]});
});

test('uniform snapping cannot magnify a tiny correction into a distant corner jump',()=>{
 const box={x:0,y:0,width:10,height:1000},point={x:11,y:1100};
 const r=snapResize(box,'se',point,true,[],[{axis:'x',position:12}],{x:6,y:6});
 assert.equal(r.sx,1.1);assert.equal(r.sy,1.1);assert.deepEqual(r.lines,[]);
});

test('resize rejects targets through zero or below minimum size without false snap lines',()=>{
 const r=snapResize({x:10,y:20,width:100,height:100},'se',{x:9,y:19},false,[],[{axis:'x',position:10},{axis:'y',position:21}],{x:6,y:6});
 assert.equal(r.sx,.02);assert.equal(r.sy,.02);assert.deepEqual(r.lines,[]);
});
