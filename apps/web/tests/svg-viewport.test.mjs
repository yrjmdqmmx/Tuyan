import test from 'node:test';
import assert from 'node:assert/strict';
import {resizeFromHandle,rotationDelta,zoomAroundPoint} from '../src/lib/svgViewport.js';
test('zoom keeps the document point under the pointer fixed, including zoom limits',()=>{
 const before={zoom:2,pan:{x:41,y:-70}},point={x:90,y:110};
 for(const z of [.1,.5,4,16]){const after=zoomAroundPoint(before.zoom,before.pan,z,point);assert.equal((point.x-after.pan.x)/after.zoom,(point.x-before.pan.x)/before.zoom);assert.equal((point.y-after.pan.y)/after.zoom,(point.y-before.pan.y)/before.zoom);assert.ok(after.zoom>=.25&&after.zoom<=8);}
});
test('resize anchors the opposite corner or edge and never flips through zero',()=>{
 const box={x:10,y:20,width:200,height:100};
 assert.deepEqual(resizeFromHandle(box,'nw',{x:-190,y:-80}),{x:210,y:120,sx:2,sy:2});
 assert.deepEqual(resizeFromHandle(box,'e',{x:410,y:999}),{x:10,y:70,sx:2,sy:1});
 assert.deepEqual(resizeFromHandle(box,'n',{x:999,y:-80},true),{x:110,y:120,sx:2,sy:2});
 assert.deepEqual(resizeFromHandle(box,'se',{x:0,y:0}),{x:10,y:20,sx:.02,sy:.02});
});
test('rotation wraps at 180 degrees and supports deliberate 15-degree snapping',()=>{
 assert.equal(rotationDelta({x:0,y:-10},{x:10,y:0},{x:0,y:0}),90);
 assert.equal(rotationDelta({x:-10,y:.01},{x:-10,y:-.01},{x:0,y:0})<1,true);
 const r=rotationDelta({x:0,y:-10},{x:3,y:-10},{x:0,y:0},true);assert.equal(r,15);
});
