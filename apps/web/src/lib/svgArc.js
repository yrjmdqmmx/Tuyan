// SVG endpoint-to-centre conversion, including the mandatory radius correction.
// https://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
export function arcGeometry(a,b,arc){
  let rx=Math.abs(arc.rx),ry=Math.abs(arc.ry);
  const phi=arc.rotation*Math.PI/180,cos=Math.cos(phi),sin=Math.sin(phi);
  if(a.x===b.x&&a.y===b.y)return {kind:'empty',rx,ry};
  if(!rx||!ry)return {kind:'line',rx,ry};
  const xp=cos*(a.x-b.x)/2+sin*(a.y-b.y)/2,yp=-sin*(a.x-b.x)/2+cos*(a.y-b.y)/2;
  const scale=Math.max(1,Math.hypot(xp/rx,yp/ry));rx*=scale;ry*=scale;
  const u=xp/rx,v=yp/ry,lambda=u*u+v*v;
  const f=(arc.largeArc===arc.sweep?-1:1)*Math.sqrt(Math.max(0,(1-lambda)/lambda));
  const cxp=f*rx*v,cyp=-f*ry*u,cx=cos*cxp-sin*cyp+(a.x+b.x)/2,cy=sin*cxp+cos*cyp+(a.y+b.y)/2;
  const ux=(xp-cxp)/rx,uy=(yp-cyp)/ry,vx=(-xp-cxp)/rx,vy=(-yp-cyp)/ry;
  const start=Math.atan2(uy,ux);let delta=Math.atan2(ux*vy-uy*vx,ux*vx+uy*vy);
  if(arc.sweep&&delta<0)delta+=2*Math.PI;if(!arc.sweep&&delta>0)delta-=2*Math.PI;
  return {kind:'arc',rx,ry,cx,cy,cos,sin,start,delta,corrected:scale>1+1e-10};
}
export function arcPointAt(a,b,arc,t){
  if(t===0)return {x:a.x,y:a.y};if(t===1)return {x:b.x,y:b.y};
  const g=arcGeometry(a,b,arc);if(g.kind!=='arc')return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  const theta=g.start+g.delta*t,x=g.rx*Math.cos(theta),y=g.ry*Math.sin(theta);
  return {x:g.cx+g.cos*x-g.sin*y,y:g.cy+g.sin*x+g.cos*y};
}

// Endpoints stay fixed. Parameter handles use the chord midpoint, so changes in
// the SVG-computed ellipse centre cannot feed back into the pointer gesture.
export function arcEditFrame(a,b,arc){
  const original=arcGeometry(a,b,arc);if(original.kind==='empty')return null;
  const length=Math.hypot(b.x-a.x,b.y-a.y);
  const g=original.kind==='arc'?original:arcGeometry(a,b,{...arc,rx:arc.rx||length/2,ry:arc.ry||length/2});
  return {...g,pivot:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},rotation:arc.rotation,restoring:original.kind==='line'};
}
export function arcParameterHandles(frame,matrix,origin){
  if(!frame||!matrix)return [];
  const {pivot,cos,sin,rx,ry}=frame;
  return [['rx',cos,sin,rx,24],['ry',-sin,cos,ry,24],['rotation',cos,sin,rx,60]].map(([kind,ux,uy,radius,pad])=>{
    const scale=Math.hypot(matrix.a*ux+matrix.c*uy,matrix.b*ux+matrix.d*uy);
    if(scale<1e-12)return null;
    const distance=radius+pad/scale,point={x:pivot.x+ux*distance,y:pivot.y+uy*distance};
    const screen=p=>({x:matrix.a*p.x+matrix.c*p.y+matrix.e-origin.left,y:matrix.b*p.x+matrix.d*p.y+matrix.f-origin.top});
    return {kind,point,screen:screen(point),pivot:screen(pivot)};
  }).filter(Boolean);
}
export function dragArcParameter(a,b,arc,kind,start,point,snapAngle=false){
  const f=arcEditFrame(a,b,arc);if(!f)throw new Error('端点重合，请先移动一个端点再调整圆弧。');
  let rx=f.rx,ry=f.ry,rotation=f.rotation,limited=false;
  if(kind==='rotation'){
    const u={x:start.x-f.pivot.x,y:start.y-f.pivot.y},v={x:point.x-f.pivot.x,y:point.y-f.pivot.y};
    if(Math.hypot(v.x,v.y)<1e-8)return {rx,ry,rotation,limited};
    rotation+=Math.atan2(u.x*v.y-u.y*v.x,u.x*v.x+u.y*v.y)*180/Math.PI;
    if(snapAngle)rotation=Math.round(rotation/15)*15;
    const effective=arcGeometry(a,b,{...arc,rx,ry,rotation});rx=effective.rx;ry=effective.ry;limited=!!effective.corrected;
  }else if(kind==='rx'||kind==='ry'){
    const x=(a.x-b.x)/2,y=(a.y-b.y)/2,xp=f.cos*x+f.sin*y,yp=-f.sin*x+f.cos*y;
    const axis=kind==='rx'?{x:f.cos,y:f.sin}:{x:-f.sin,y:f.cos};
    const fixed=kind==='rx'?ry:rx,component=kind==='rx'?Math.abs(xp):Math.abs(yp),other=kind==='rx'?yp:xp;
    const denominator=Math.max(0,1-(other/fixed)**2);
    // The effective starting ellipse already satisfies the endpoint constraint.
    const minimum=component<1e-10?1e-6:denominator>1e-14?component/Math.sqrt(denominator):(kind==='rx'?rx:ry);
    const requested=(kind==='rx'?rx:ry)+(point.x-start.x)*axis.x+(point.y-start.y)*axis.y;
    const value=Math.max(1e-6,minimum,requested);limited=requested<minimum;
    if(kind==='rx')rx=value;else ry=value;
  }else throw new Error('未知圆弧控制柄。');
  return {rx,ry,rotation,limited};
}
