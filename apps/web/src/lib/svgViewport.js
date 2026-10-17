export const resizeHandles=[
  ['nw',0,0,'左上'],['n',.5,0,'上'],['ne',1,0,'右上'],['e',1,.5,'右'],
  ['se',1,1,'右下'],['s',.5,1,'下'],['sw',0,1,'左下'],['w',0,.5,'左'],
];
export const clampZoom=value=>Math.min(8,Math.max(.25,value));
// Coordinates are relative to the viewport centre, independent of SVG units.
export function zoomAroundPoint(zoom,pan,next,point={x:0,y:0}) {
  const value=clampZoom(next),ratio=value/zoom;
  return {zoom:value,pan:{x:point.x-(point.x-pan.x)*ratio,y:point.y-(point.y-pan.y)*ratio}};
}
export function resizeFromHandle(box,handle,point,uniform=false) {
  const left=handle.includes('w'),right=handle.includes('e'),top=handle.includes('n'),bottom=handle.includes('s');
  const x=left?box.x+box.width:right?box.x:box.x+box.width/2;
  const y=top?box.y+box.height:bottom?box.y:box.y+box.height/2;
  let sx=left||right?Math.max(.02,(point.x-x)/((left?-1:1)*Math.max(.01,box.width))):1;
  let sy=top||bottom?Math.max(.02,(point.y-y)/((top?-1:1)*Math.max(.01,box.height))):1;
  if(uniform){const scale=left||right?top||bottom?(Math.abs(sx-1)>Math.abs(sy-1)?sx:sy):sx:sy;sx=scale;sy=scale;}
  return {x,y,sx,sy};
}
export function rotationDelta(start,point,centre,snap=false) {
  const angle=(Math.atan2(point.y-centre.y,point.x-centre.x)-Math.atan2(start.y-centre.y,start.x-centre.x))*180/Math.PI;
  const normal=((angle+540)%360)-180;
  return snap?Math.round(normal/15)*15:normal;
}
