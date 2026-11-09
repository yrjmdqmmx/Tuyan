import test from 'node:test';
import assert from 'node:assert/strict';
import {arcGeometry,arcPointAt,arcEditFrame,arcParameterHandles,dragArcParameter} from '../src/lib/svgArc.js';
import {parseEditablePath as parse,serializeEditablePath as serialize,pathPointAt,splitPathSegment,movePathPoint,updatePathArc,deletePathNode} from '../src/lib/svgPath.js';
import {inspectorPosition} from '../src/lib/svgInspector.js';
const near=(a,b,tolerance=1e-7)=>assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<tolerance,`${JSON.stringify(a)} != ${JSON.stringify(b)}`);
test('SVG arc endpoint semantics: radius correction, zero radius, coincident ends and all flags',()=>{
 const a={x:0,y:0},b={x:100,y:0};
 for(const largeArc of [0,1])for(const sweep of [0,1]){
  const s={rx:80,ry:50,rotation:30,largeArc,sweep},g=arcGeometry(a,b,s);
  assert.equal(g.kind,'arc');assert.equal(Math.sign(g.delta),sweep?1:-1);assert.equal(Math.abs(g.delta)>Math.PI,!!largeArc);
  near(arcPointAt(a,b,s,0),a);near(arcPointAt(a,b,s,1),b);
  const p=arcPointAt(a,b,s,.5),xp=g.cos*(p.x-g.cx)+g.sin*(p.y-g.cy),yp=-g.sin*(p.x-g.cx)+g.cos*(p.y-g.cy);
  assert.ok(Math.abs((xp/g.rx)**2+(yp/g.ry)**2-1)<1e-12);
 }
 const small={rx:10,ry:5,rotation:0,largeArc:0,sweep:1},corrected=arcGeometry(a,b,small);assert.equal(corrected.rx,50);assert.equal(corrected.ry,25);assert.equal(corrected.corrected,true);
 assert.equal(arcGeometry(a,b,{...small,rx:0}).kind,'line');assert.equal(arcGeometry(a,a,small).kind,'empty');near(arcPointAt(a,b,{...small,rx:0},.5),{x:50,y:0});
});
test('relative/repeated A, compact flags and mixed closed subpaths round trip as A',()=>{
 const m=parse('m10 20 a30 15 25 0110 20 30 20 -40 10-10-20z M0 0 A40 30 0 1 1 80 0');
 assert.deepEqual(m.subpaths[0].nodes[1],{x:20,y:40});assert.deepEqual(parse(serialize(m)),m);assert.ok(!/[CQ]/.test(serialize(m)));
 const moved=movePathPoint(m,{subpath:0,index:1},{x:26,y:48});assert.deepEqual(moved.subpaths[0].segments,m.subpaths[0].segments);
 const changed=updatePathArc(m,0,0,{rx:60,ry:25,rotation:90,largeArc:1,sweep:0});assert.deepEqual(changed.subpaths[1],m.subpaths[1]);assert.match(serialize(changed),/A 60 25 90 1 0/);
 assert.throws(()=>updatePathArc(m,0,0,{rx:-1}));assert.throws(()=>updatePathArc(m,0,0,{sweep:2}));
});
test('arc insertion retains exact ellipse for all flags, rotated axes, corrected radii and closing arcs',()=>{
 for(const large of [0,1])for(const sweep of [0,1])for(const radii of ['80 50','10 5']){
  const m=parse(`M0 0 A${radii} 37 ${large} ${sweep} 100 30 L0 60 A70 40 20 ${large} ${sweep} 0 0Z`);
  for(const index of [0,2]){const part=m.subpaths[0],t=.37,n=splitPathSegment(m,0,index,t),p=n.subpaths[0];assert.equal(p.segments[index].type,'A');assert.equal(p.segments[index+1].type,'A');
   for(let i=0;i<=100;i++){const u=i/100;near(pathPointAt(part,index,u),u<=t?pathPointAt(p,index,u/t):pathPointAt(p,index+1,(u-t)/(1-t)),3e-6);}
   assert.ok(!/[CQ]/.test(serialize(n)));
  }
 }
 assert.throws(()=>splitPathSegment(parse('M0 0 A10 10 0 0 1 0 0'),0,0),/重合/);
 const line=splitPathSegment(parse('M0 0 A0 20 0 0 1 100 0'),0,0);assert.match(serialize(line),/A 0 20/);
});
test('deletion never silently approximates adjacent arcs',()=>{
 const m=parse('M0 0 A40 30 0 0 1 80 0 A40 30 0 0 1 160 0 L200 0');
 assert.throws(()=>deletePathNode(m,0,1),/有损合并/);assert.throws(()=>deletePathNode(m,0,2),/有损合并/);assert.equal(deletePathNode(m,0,0).subpaths[0].segments[0].type,'A');
});
test('inspector chooses an unobstructed corner or docks outside the viewport',()=>{
 const pos=inspectorPosition(900,600,{width:300,height:200},{left:550,top:20,right:850,bottom:240});assert.deepEqual(pos,{left:590,top:390});
 assert.equal(inspectorPosition(320,400,{width:280,height:200},{left:0,top:0,right:320,bottom:400}),null);
 assert.equal(inspectorPosition(240,400,{width:280,height:200},null),null);
});

test('radius gestures use effective radii, keep endpoints and clamp without changing the other radius',()=>{
 const a={x:10,y:20},b={x:130,y:70},s={rx:10,ry:5,rotation:25,largeArc:1,sweep:0};
 const f=arcEditFrame(a,b,s),start={x:f.pivot.x+f.rx*f.cos,y:f.pivot.y+f.rx*f.sin};
 const changes=dragArcParameter(a,b,s,'rx',start,{x:start.x+30*f.cos,y:start.y+30*f.sin});
 assert.ok(Math.abs(changes.rx-f.rx-30)<1e-9);assert.equal(changes.ry,f.ry);assert.equal(changes.rotation,25);assert.equal(arcGeometry(a,b,{...s,...changes}).corrected,false);
 const limited=dragArcParameter(a,b,s,'rx',start,{x:start.x-1000*f.cos,y:start.y-1000*f.sin});assert.equal(limited.limited,true);assert.equal(limited.ry,f.ry);assert.ok(Math.abs(arcGeometry(a,b,{...s,...limited}).rx-limited.rx)<1e-6);
 const m=parse('M10 20 A10 5 25 1 0 130 70 L160 50'),n=updatePathArc(m,0,0,changes);assert.deepEqual(n.subpaths[0].nodes,m.subpaths[0].nodes);assert.equal(n.subpaths[0].segments[0].largeArc,1);assert.equal(n.subpaths[0].segments[0].sweep,0);assert.deepEqual(n.subpaths[0].segments[1],m.subpaths[0].segments[1]);assert.match(serialize(n),/A /);assert.ok(!/[CQ]/.test(serialize(n)));
});
test('rotation uses a fixed chord pivot, 15 degree snapping and actual corrected radii',()=>{
 const a={x:0,y:0},b={x:100,y:0},s={rx:70,ry:15,rotation:0,largeArc:0,sweep:1},f=arcEditFrame(a,b,s),start={x:f.pivot.x+100,y:0};
 const p=angle=>({x:f.pivot.x+100*Math.cos(angle*Math.PI/180),y:100*Math.sin(angle*Math.PI/180)});
 const rotated=dragArcParameter(a,b,s,'rotation',start,p(89));assert.ok(Math.abs(rotated.rotation-89)<1e-10);assert.equal(rotated.limited,true);assert.ok(rotated.rx>70&&rotated.ry>15);assert.equal(arcGeometry(a,b,{...s,...rotated}).corrected,false);
 assert.equal(dragArcParameter(a,b,s,'rotation',start,p(37),true).rotation,30);
 assert.deepEqual(dragArcParameter(a,b,s,'rotation',start,start),{rx:70,ry:15,rotation:0,limited:false});
 assert.equal(arcEditFrame(a,a,s),null);assert.throws(()=>dragArcParameter(a,a,s,'rx',start,p(0)),/重合/);
 const line={...s,rx:0};assert.equal(arcEditFrame(a,b,line).restoring,true);assert.equal(arcGeometry(a,b,{...line,...dragArcParameter(a,b,line,'ry',{x:0,y:0},{x:0,y:20})}).kind,'arc');
});
test('arc controls use transformed local axes and screen sized spacing under mirror and skew',()=>{
 const a={x:0,y:0},b={x:100,y:0},s={rx:90,ry:50,rotation:35,largeArc:1,sweep:0},f=arcEditFrame(a,b,s);
 for(const matrix of [{a:1,b:0,c:0,d:1,e:0,f:0},{a:-2,b:.6,c:.4,d:1.2,e:230,f:70}]){
  const controls=arcParameterHandles(f,matrix,{left:10,top:20});assert.equal(controls.length,3);
  const [x,y,angle]=controls;assert.ok(Math.abs(Math.hypot(x.screen.x-angle.screen.x,x.screen.y-angle.screen.y)-36)<1e-8);
  for(const h of [x,y]){const u=h.kind==='rx'?{x:f.cos,y:f.sin}:{x:-f.sin,y:f.cos};const scale=Math.hypot(matrix.a*u.x+matrix.c*u.y,matrix.b*u.x+matrix.d*u.y),radius=h.kind==='rx'?f.rx:f.ry;assert.ok(Math.abs(Math.hypot(h.screen.x-h.pivot.x,h.screen.y-h.pivot.y)-(radius*scale+24))<1e-8);}
 }
});
