import {topSelection} from './svgDocument.js';
import {svgEditBlockReason,svgLayerState} from './svgLayers.js';
import {resizeFromHandle} from './svgViewport.js';

export function rectangleBetween(a,b){return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y)};}
export function containsBox(outer,inner){return inner.x>=outer.x-.001&&inner.y>=outer.y-.001&&inner.x+inner.width<=outer.x+outer.width+.001&&inner.y+inner.height<=outer.y+outer.height+.001;}
export function visibleSvgObject(node,root,style=n=>getComputedStyle(n)){
  if(svgLayerState(node).hidden)return false;
  if(['hidden','collapse'].includes(style(node).visibility))return false;
  for(let n=node;n&&n!==root.parentElement;n=n.parentElement)if(style(n).display==='none')return false;
  return true;
}
export function selectedDragTarget(root,target,ids){
  for(let n=target;n&&n!==root;n=n.parentElement)if(ids.includes(n.getAttribute('data-tuyan-id')))return n;
  return null;
}
export function marqueeSelection(root,box,getBounds,visible=n=>visibleSvgObject(n,root)){
  const nodes=[...root.querySelectorAll('[data-tuyan-id]')].filter(n=>n.localName!=='tspan'&&!n.closest('defs,clipPath,mask,marker,pattern,symbol')&&visible(n)&&!svgEditBlockReason(n)&&containsBox(box,getBounds(n)));
  return topSelection(root,nodes.map(n=>n.getAttribute('data-tuyan-id'))).map(n=>n.getAttribute('data-tuyan-id'));
}
export function snapReferences(root,ids,getBounds,visible=n=>visibleSvgObject(n,root)){
  const moving=topSelection(root,ids);
  return [...root.querySelectorAll('[data-tuyan-id]')].filter(n=>n.localName!=='tspan'&&!n.closest('defs,clipPath,mask,marker,pattern,symbol')&&visible(n)&&!moving.some(m=>m.contains(n)||n.contains(m))).map(n=>getBounds(n));
}
const anchors=(box,axis)=>{const size=axis==='x'?'width':'height';return [box[axis],box[axis]+box[size]/2,box[axis]+box[size]];};
const snapTargets=(axis,references,guides)=>[...guides.filter(g=>g.axis===axis).map(g=>({value:g.position,kind:'guide'})),...references.flatMap(b=>anchors(b,axis).map(value=>({value,kind:'object'})))];
const preferSnap=(candidate,best)=>!best||(best.kind!=='guide'&&candidate.kind==='guide')||(best.kind===candidate.kind&&candidate.score<best.score-1e-8);
// Thresholds are SVG units converted from a fixed screen-pixel distance by the caller.
export function snapTranslation(box,delta,references,guides,threshold){
  const result={...delta,lines:[]};
  for(const axis of ['x','y']){
    const targets=snapTargets(axis,references,guides);
    let best=null;
    for(const target of targets)for(const anchor of anchors(box,axis)){
      const distance=target.value-anchor-delta[axis];
      if(Math.abs(distance)<=threshold[axis]&&(!best||(best.kind!=='guide'&&target.kind==='guide')||(best.kind===target.kind&&Math.abs(distance)<Math.abs(best.distance)-1e-8)))best={...target,distance};
    }
    if(best){result[axis]+=best.distance;result.lines.push({axis,position:best.value,kind:best.kind});}
  }
  return result;
}

// Endpoints are snapped in root SVG coordinates, before converting to the line's local space.
export function snapPoint(point,references,guides,threshold){
  const result={x:point.x,y:point.y,lines:[]};
  for(const axis of ['x','y']){
    let best=null;
    for(const target of snapTargets(axis,references,guides)){
      const score=Math.abs(target.value-point[axis]);
      if(score<=threshold[axis]&&preferSnap({...target,score},best))best={...target,score};
    }
    if(best){result[axis]=best.value;result.lines.push({axis,position:best.value,kind:best.kind});}
  }
  return result;
}

export function snapResize(box,handle,point,uniform,references,guides,threshold){
  const result={...resizeFromHandle(box,handle,point,uniform),lines:[]};
  const active={x:/[we]/.test(handle),y:/[ns]/.test(handle)};
  const extent={x:handle.includes('w')?-box.width:box.width,y:handle.includes('n')?-box.height:box.height};
  const reach={x:Math.max(Math.abs(box.x-result.x),Math.abs(box.x+box.width-result.x)),y:Math.max(Math.abs(box.y-result.y),Math.abs(box.y+box.height-result.y))};
  let uniformBest=null;
  for(const axis of ['x','y']){
    if(!active[axis]||!extent[axis])continue;
    const key=axis==='x'?'sx':'sy',position=result[axis]+extent[axis]*result[key];let best=null;
    for(const target of snapTargets(axis,references,guides)){
      const scale=(target.value-result[axis])/extent[axis];
      if(!Number.isFinite(scale)||scale<.02||Math.abs(target.value-position)>threshold[axis])continue;
      // One degree of freedom under uniform scaling. Bound movement of every edge,
      // so a small correction on a thin axis cannot jump a distant corner.
      const score=uniform?Math.max(...['x','y'].map(a=>Math.abs(scale-result[key])*reach[a]/threshold[a])):Math.abs(target.value-position)/threshold[axis];
      const candidate={...target,scale,score};
      if(score<=1+1e-8&&preferSnap(candidate,best))best=candidate;
    }
    if(best){if(uniform){if(preferSnap(best,uniformBest))uniformBest=best;}else result[key]=best.scale;}
  }
  if(uniformBest)result.sx=result.sy=uniformBest.scale;
  // Only display constraints the resulting geometry actually satisfies.
  for(const axis of ['x','y'])if(active[axis]){
    const position=result[axis]+extent[axis]*result[axis==='x'?'sx':'sy'];
    const target=snapTargets(axis,references,guides).find(t=>Math.abs(t.value-position)<1e-6);
    if(target)result.lines.push({axis,position:target.value,kind:target.kind});
  }
  return result;
}

// Editor metadata, never painted geometry. It shares source history and local-draft persistence.
const GUIDE_ATTR='data-tuyan-guides';
export function readSvgGuides(root){
  try{const value=JSON.parse(root?.getAttribute(GUIDE_ATTR)||'[]'),ids=new Set();if(!Array.isArray(value))return [];
    return value.slice(0,100).filter(g=>g&&typeof g.id==='string'&&/^[a-zA-Z0-9_-]{1,60}$/.test(g.id)&&!ids.has(g.id)&&ids.add(g.id)&&['x','y'].includes(g.axis)&&Number.isFinite(g.position)&&Math.abs(g.position)<=1e7).map(({id,axis,position})=>({id,axis,position}));
  }catch{return [];}
}
export function writeSvgGuides(root,guides){
  if(guides.length>100||guides.some(g=>!Number.isFinite(g.position)||Math.abs(g.position)>1e7))throw new Error('辅助线最多 100 条，位置必须为有效画布坐标。');
  if(guides.length)root.setAttribute(GUIDE_ATTR,JSON.stringify(guides));else root.removeAttribute(GUIDE_ATTR);
}
export function addSvgGuide(root,axis,position){
  const guides=readSvgGuides(root);let index=1;while(guides.some(g=>g.id===`guide-${index}`))index++;
  const guide={id:`guide-${index}`,axis,position};writeSvgGuides(root,[...guides,guide]);return guide.id;
}
