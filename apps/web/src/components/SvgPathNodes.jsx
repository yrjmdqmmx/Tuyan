import {pathHandles} from '../lib/svgPath.js';

export default function SvgPathNodes({model,selection,matrix,origin,onPointDown,arcHandles=[],onArcDown}){
  if(!matrix)return null;
  const screen=p=>({x:matrix.a*p.x+matrix.c*p.y+matrix.e-origin.left,y:matrix.b*p.x+matrix.d*p.y+matrix.f-origin.top});
  const handles=pathHandles(model,selection.subpath,selection.index);
  return <div className="svg-path-nodes" aria-label="路径节点与控制柄">
    <svg className="svg-path-handle-lines" aria-hidden="true">{arcHandles.filter(h=>h.kind!=='rotation').map(h=><line key={`arc-${h.kind}`} className="svg-arc-axis" x1={h.pivot.x} y1={h.pivot.y} x2={h.screen.x} y2={h.screen.y}/>)}{handles.flatMap(h=>[h.anchor,...(h.other?[h.other]:[])].map((anchor,i)=>{const a=screen(anchor),b=screen(h.point);return <line key={`${h.segment}-${h.control}-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>;}))}</svg>
    {handles.map(h=>{const p=screen(h.point),label=`控制柄 ${selection.subpath+1}.${h.segment+1} ${h.control==='c1'?'起侧':h.control==='c2'?'终侧':'二次'}`;return <button type="button" className="svg-path-control" key={`${h.segment}-${h.control}`} aria-label={label} aria-pressed={selection.segment===h.segment&&selection.control===h.control} title={`${label} · 拖动独立调整，方向键微调`} style={{left:p.x,top:p.y}} onPointerDown={e=>onPointDown(e,{subpath:selection.subpath,index:selection.index,segment:h.segment,control:h.control})}/>;})}
    {arcHandles.map(h=>{const label=h.kind==='rotation'?'圆弧旋转角':h.kind==='rx'?'圆弧半径 X':'圆弧半径 Y';return <button type="button" key={h.kind} className={`svg-arc-handle arc-${h.kind}`} data-arc-control={h.kind} aria-label={`拖动${label}`} title={`${label} · 端点固定${h.kind==='rotation'?' · Shift 按 15° 吸附':''}`} style={{left:h.screen.x,top:h.screen.y}} onPointerDown={e=>onArcDown(e,h.kind)}>{h.kind==='rotation'?'↻':h.kind==='rx'?'X':'Y'}</button>;})}
    {model.subpaths.flatMap((part,subpath)=>part.nodes.map((n,index)=>{const p=screen(n),active=subpath===selection.subpath&&index===selection.index;return <button type="button" className="svg-path-node" data-path-node={`${subpath}:${index}`} key={`${subpath}-${index}`} style={{left:p.x,top:p.y}} aria-label={`节点 ${subpath+1}.${index+1}`} aria-pressed={active} title={`节点 ${subpath+1}.${index+1} · 拖动移动；相邻控制柄一同移动`} onPointerDown={e=>onPointDown(e,{subpath,index})}>{active&&<span>{index+1}</span>}</button>;}))}
  </div>;
}
