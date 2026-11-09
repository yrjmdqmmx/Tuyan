import MenuSelect from './MenuSelect.jsx';
import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {arrowPoints,changeSvg,findSvgNode,groupSvg,parseSvg,selectionOwner,setArrowDirection,setArrowPoints,setSvgAttribute,topSelection,ungroupSvg} from '../lib/svgDocument.js';
import {inspectSvgFonts,SVG_CANVAS_STYLE} from '../lib/svgTypography.js';
import {addSvgObject,deleteSvgObjects,duplicateSvgObjects} from '../lib/svgObjects.js';
import {assertSvgEditable,assertSvgResourceEditable,reorderSvgLayers,setSvgHidden,setSvgLocked,sortSvgObject,svgEditBlockReason,svgLayerState} from '../lib/svgLayers.js';
import {rectangleBetween,selectedDragTarget,marqueeSelection,snapReferences,snapTranslation,snapPoint,snapResize,readSvgGuides,writeSvgGuides,addSvgGuide} from '../lib/svgSelection.js';
import SvgObjectTree from './SvgObjectTree.jsx';
import {MousePointer2,Hand,Type,Shapes,Layers,Copy,Trash2,Undo2,Redo2,ZoomIn,ZoomOut,Scan,Focus,RotateCw,Palette,Move,AlignHorizontalJustifyCenter,ArrowUpRight,BoxSelect,Magnet,Ruler,Spline,CircleHelp} from 'lucide-react';
import {resizeHandles,resizeFromHandle,rotationDelta,zoomAroundPoint} from '../lib/svgViewport.js';
import {parseEditablePath,serializeEditablePath,movePathPoint,splitPathSegment,deletePathNode,pathHandles,updatePathArc,pathNodeDeleteReason} from '../lib/svgPath.js';
import {arcGeometry,arcEditFrame,arcParameterHandles,dragArcParameter} from '../lib/svgArc.js';
import SvgInspector from './SvgInspector.jsx';
import SvgToolMenu from './SvgToolMenu.jsx';
import SvgShapeIcon from './SvgShapeIcon.jsx';
import SvgPathNodes from './SvgPathNodes.jsx';
const objectNames={text:'文字',tspan:'文字片段',g:'分组',line:'连线',path:'路径',rect:'矩形',circle:'圆形',ellipse:'椭圆',image:'图片',use:'引用'};
function ToolButton({icon:Icon,children,label,...props}){return <button type="button" aria-label={label} title={props.title||label} {...props}>{Icon&&<Icon size={16} aria-hidden="true"/>}{children&&<span>{children}</span>}</button>;}


const domMatrix = m => new DOMMatrix([m.a,m.b,m.c,m.d,m.e,m.f]);
// Absolute overlays start at the padding edge, while client coordinates include the border.
function overlayOrigin(view){const r=view.getBoundingClientRect();return {left:r.left+view.clientLeft,top:r.top+view.clientTop};}
function elementMatrix(node,root) { return domMatrix(root.getScreenCTM()).inverse().multiply(domMatrix(node.getScreenCTM())); }
function bounds(node,root) {
  const b=node.getBBox(),m=elementMatrix(node,root);
  const points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m));
  const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));
  return {x,y,width:Math.max(...points.map(p=>p.x))-x,height:Math.max(...points.map(p=>p.y))-y};
}
function union(boxes) {
  const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
  return {x,y,width:Math.max(...boxes.map(b=>b.x+b.width))-x,height:Math.max(...boxes.map(b=>b.y+b.height))-y};
}
const matrixString = m => `matrix(${[m.a,m.b,m.c,m.d,m.e,m.f].map(n=>Number(n.toFixed(6))).join(' ')})`;
function Field({label,value,onApply,type='text',...props}) {
  const [draft,setDraft]=useState(String(value??''));
  const cancelled=useRef(false);
  useEffect(()=>setDraft(String(value??'')),[value]);
  return <label>{label}<input aria-label={label} type={type} value={draft} {...props} onChange={e=>{cancelled.current=false;setDraft(e.target.value);}} onBlur={()=>{if(!cancelled.current&&draft!==String(value??''))onApply(type==='number'?Number(draft):draft);cancelled.current=false;setDraft(String(value??''));}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){cancelled.current=true;setDraft(String(value??''));e.currentTarget.blur();}}}/></label>;
}

export default function SvgEditorCanvas({svg,readOnly,onChange,onError,onUndo,onRedo,canUndo,canRedo,dataProtected,geometryAllowed,onAllowGeometry,ratio='16:9',inspectorLayout='floating'}) {
  const host=useRef(null),viewport=useRef(null),rendered=useRef(null),gesture=useRef(null),current=useRef({});
  const [selected,setSelected]=useState([]),[zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0}),[panMode,setPanMode]=useState(false),[overlay,setOverlay]=useState(null),[textEdit,setTextEdit]=useState(null),[measure,setMeasure]=useState(0);
  const [fontReport,setFontReport]=useState([]),[objectsOpen,setObjectsOpen]=useState(false),[hover,setHover]=useState(null),[spacePan,setSpacePan]=useState(false),[inspector,setInspector]=useState('style'),[keepRatio,setKeepRatio]=useState(true),[gestureHint,setGestureHint]=useState('');
  const [marqueeMode,setMarqueeMode]=useState(false),[marquee,setMarquee]=useState(null),[snapEnabled,setSnapEnabled]=useState(true),[snapLines,setSnapLines]=useState([]),[guidesOpen,setGuidesOpen]=useState(false),[guidePreview,setGuidePreview]=useState(null),[guideMap,setGuideMap]=useState(null);
  const [pathSelection,setPathSelection]=useState({subpath:0,index:0}),[pathPreview,setPathPreview]=useState(null);
  const usingPan=panMode||spacePan;
  const parsed=useRef(null);const blocked=readOnly || (dataProtected&&!geometryAllowed);
  const safe=fn=>{try{return fn();}catch(error){onError(error.message);return undefined;}};
  const mutate=(fn,geometry=false,ids=selected)=>{if(readOnly)return;if(geometry && blocked){onError('此图包含数据编码几何；请先确认几何修改对数值表达的影响。');return;}return safe(()=>{const next=changeSvg(svg,root=>{assertSvgEditable(root,ids);fn(root);});onChange(next);return next;});};
  function transformNodes(ids, worldMatrix, source=svg) {
    const live=rendered.current;
    return changeSvg(source,root=>{
      assertSvgEditable(root,ids);
      for(const node of topSelection(root,ids)) {
        const original=findSvgNode(live,node.getAttribute('data-tuyan-id'));
        const parent=elementMatrix(original.parentElement,live),local=elementMatrix(original,live);
        node.setAttribute('transform',matrixString(parent.inverse().multiply(worldMatrix).multiply(local)));
      }
    });
  }
  const transform=(matrix)=>{if(blocked){onError('请先确认数据几何修改的影响。');return;}safe(()=>onChange(transformNodes(selected,matrix)));};
  function refreshOverlay(){
    const root=rendered.current,view=viewport.current;
    if(!root||!view||!selected.length){setOverlay(null);return;}
    safe(()=>{
      const nodes=selected.map(id=>findSvgNode(root,id)).filter(n=>n&&!svgLayerState(n).hidden);if(!nodes.length){setOverlay(null);return;}
      const b=union(nodes.map(n=>bounds(n,root))),m=root.getScreenCTM(),r=overlayOrigin(view);
      const tl=new DOMPoint(b.x,b.y).matrixTransform(m),br=new DOMPoint(b.x+b.width,b.y+b.height).matrixTransform(m);
      const points=nodes.length===1?arrowPoints(nodes[0]):null;
      const endpoints=points?[0,2].map(i=>{const p=new DOMPoint(points[i],points[i+1]).matrixTransform(nodes[0].getScreenCTM());return {x:p.x-r.left,y:p.y-r.top};}):[];
      setOverlay({left:tl.x-r.left,top:tl.y-r.top,width:br.x-tl.x,height:br.y-tl.y,box:b,endpoints});
    });
  }
  function zoomTo(next,point){const changed=zoomAroundPoint(current.current.zoom,current.current.pan,next,point);setZoom(changed.zoom);setPan(changed.pan);setHover(null);}
  function previewObject(id){
    if(!id||current.current.panMode||gesture.current){setHover(null);return;}
    const n=findSvgNode(rendered.current,id);if(!n||svgLayerState(n).hidden||current.current.selected.includes(id)){setHover(null);return;}
    const r=n.getBoundingClientRect(),v=overlayOrigin(viewport.current);
    setHover(previous=>previous?.id===id&&previous.left===r.left-v.left&&previous.top===r.top-v.top&&previous.width===r.width&&previous.height===r.height?previous:{id,left:r.left-v.left,top:r.top-v.top,width:r.width,height:r.height,label:objectNames[n.localName]||n.localName});
  }
  function focusSelection(){
    if(!overlay)return;const v=viewport.current;
    let left=overlay.left,top=overlay.top,right=left+overlay.width,bottom=top+overlay.height;
    for(const h of arcHandles){left=Math.min(left,h.screen.x-18);top=Math.min(top,h.screen.y-18);right=Math.max(right,h.screen.x+18);bottom=Math.max(bottom,h.screen.y+18);}
    const ratio=Math.min((v.clientWidth-96)/Math.max(32,right-left),(v.clientHeight-96)/Math.max(32,bottom-top));
    const next=Math.min(8,Math.max(.25,zoom*ratio)),scale=next/zoom;
    setPan({x:(pan.x+v.clientWidth/2-(left+right)/2)*scale,y:(pan.y+v.clientHeight/2-(top+bottom)/2)*scale});setZoom(next);setHover(null);
  }
  function cancelGesture(){
    const g=gesture.current;gesture.current=null;setGestureHint('');setMarquee(null);setSnapLines([]);setGuidePreview(null);setPathPreview(null);if(g?.type==='marquee')setSelected(g.previous);
    if(g?.draft&&svg){const original=parseSvg(svg).root;for(const to of rendered.current?.querySelectorAll('[data-tuyan-id]')||[]){const from=findSvgNode(original,to.getAttribute('data-tuyan-id'));if(from)for(const name of ['transform','x1','y1','x2','y2','points','d']){if(from.hasAttribute(name))to.setAttribute(name,from.getAttribute(name));else to.removeAttribute(name);}}}setMeasure(n=>n+1);
  }
  function beginTextEdit(node){
    if(current.current.readOnly||!node)return;
    const reason=svgEditBlockReason(node);if(reason){setObjectsOpen(true);onError(reason);return;}
    const leaf=node.children.length?node.querySelector('tspan:not(:has(tspan))'):node;
    if(!leaf||leaf.children.length){onError('此文字包含复杂路径或混排，请选择一个独立文字片段。');return;}
    const id=leaf.getAttribute('data-tuyan-id');if(!id)return;
    gesture.current=null;setSelected([id]);setTextEdit({id,value:leaf.textContent});
  }
  current.current={svg,readOnly,blocked,selected,marqueeMode,snapEnabled,panMode:usingPan,pan,zoom,mutate,transformNodes,onChange,onError};
  useEffect(()=>{
    const view=viewport.current;
    const wheel=event=>{event.preventDefault();if(gesture.current)return;const state=current.current;if(event.ctrlKey||event.metaKey){const r=view.getBoundingClientRect();zoomTo(state.zoom*Math.exp(-event.deltaY*.01),{x:event.clientX-r.left-r.width/2,y:event.clientY-r.top-r.height/2});}else setPan(p=>({x:p.x-event.deltaX,y:p.y-event.deltaY}));};
    const release=event=>{if(event.type==='blur'||event.code==='Space')setSpacePan(false);};
    view.addEventListener('wheel',wheel,{passive:false});window.addEventListener('keyup',release);window.addEventListener('blur',release);
    return()=>{view.removeEventListener('wheel',wheel);window.removeEventListener('keyup',release);window.removeEventListener('blur',release);};
  },[]);
  useLayoutEffect(()=>{
    if(!host.current)return;
    const shadow=host.current.shadowRoot||host.current.attachShadow({mode:'open'});
    shadow.replaceChildren();rendered.current=null;gesture.current=null;setHover(null);setGestureHint('');setMarquee(null);setSnapLines([]);setGuidePreview(null);setPathPreview(null);
    if(!svg){parsed.current=null;return;}
    try {
      parsed.current=parseSvg(svg);
      const displayRoot=parsed.current.root.cloneNode(true);
      // Keep metadata in the source/export, but never instantiate foreign metadata as live HTML.
      displayRoot.querySelectorAll('metadata').forEach(node=>node.remove());
      const root=document.importNode(displayRoot,true);
      // Shadow DOM contains document CSS; no SVG CSS can style the application.
      const style=document.createElement('style');style.textContent=SVG_CANVAS_STYLE;
      shadow.append(style,root);rendered.current=root;
      setSelected(previous=>{const ids=previous.filter(id=>findSvgNode(root,id));return ids.length===previous.length?previous:ids;});
      const choose=(event)=>{
        let target=event.target;
        if(!(target instanceof window.Element))return null;
        if(event.type==='dblclick')return target.closest('tspan,text');
        // A marquee may select children inside a group; dragging one keeps that selection.
        if(event.type==='pointerdown'&&!event.altKey&&!event.shiftKey){const selectedNode=selectedDragTarget(root,target,current.current.selected);if(selectedNode)return selectedNode;}
        return selectionOwner(root,target,event.altKey);
      };
      root.addEventListener('pointermove',event=>{const n=choose(event);previewObject(n?.getAttribute('data-tuyan-id'));});
      root.addEventListener('pointerleave',()=>setHover(null));
      root.addEventListener('pointerdown',event=>{setHover(null);
        const state=current.current;if(state.marqueeMode||state.panMode||event.button===1||event.button===2)return;
        const node=choose(event),id=node?.getAttribute('data-tuyan-id');
        if(!id){setSelected([]);return;}
        const ids=event.shiftKey?(state.selected.includes(id)?state.selected.filter(x=>x!==id):[...state.selected,id]):state.selected.includes(id)?state.selected:[id];
        setSelected(ids);event.stopPropagation();viewport.current.focus({preventScroll:true});
        const editable=ids.every(id=>!svgEditBlockReason(findSvgNode(root,id)));
        if(!editable)setObjectsOpen(true);
        if(!state.readOnly&&!state.blocked&&editable&&!event.shiftKey && ids.length){
          gesture.current={type:'move',ids,start:{x:event.clientX,y:event.clientY},source:state.svg,inverse:root.getScreenCTM().inverse(),moved:false};
        }
      });
      root.addEventListener('dblclick',event=>{
        if(current.current.marqueeMode||current.current.panMode)return;
        beginTextEdit(choose(event));
      });
      setMeasure(n=>n+1);
    }catch(error){onError(error.message);}
  },[svg,readOnly]);
  useEffect(()=>{
    let active=true;
    if(!rendered.current){setFontReport([]);return;}
    inspectSvgFonts(rendered.current).then(report=>{if(active)setFontReport(report);});
    return()=>{active=false;};
  },[svg,readOnly]);
  useLayoutEffect(refreshOverlay,[selected,svg,zoom,pan,measure]);
  // Measure after CSS pan/zoom has been applied, including when nothing is selected.
  useLayoutEffect(()=>{const m=rendered.current?.getScreenCTM?.(),r=viewport.current&&overlayOrigin(viewport.current);setGuideMap(m&&r?{m,...r}:null);},[svg,zoom,pan,measure]);
  useEffect(()=>{const observer=new ResizeObserver(()=>setMeasure(n=>n+1));if(viewport.current)observer.observe(viewport.current);return()=>observer.disconnect();},[]);
  useEffect(()=>{if(readOnly){cancelGesture();setTextEdit(null);}},[readOnly]);
  useEffect(()=>{
    const recoverTyping=event=>{
      if(!textEdit||readOnly)return;
      const existing=findSvgNode(rendered.current,textEdit.id);
      if(existing?.textContent===textEdit.value)return;
      // onChange journals synchronously before IndexedDB, including interrupted inline typing.
      mutate(root=>{findSvgNode(root,textEdit.id).textContent=textEdit.value;});event.preventDefault();event.returnValue='';
    };
    window.addEventListener('beforeunload',recoverTyping);return()=>window.removeEventListener('beforeunload',recoverTyping);
  },[textEdit,svg,readOnly]);
  const live=rendered.current;
  const guides=readSvgGuides(live),guidesVisible=live?.getAttribute('data-tuyan-guides-hidden')!=='true';
  const displayGuides=guidesVisible?guides.map(g=>guidePreview?.id===g.id?guidePreview:g):[];
  function guideStyle(g){if(!guideMap)return {};const {m,...r}=guideMap,p=new DOMPoint(g.axis==='x'?g.position:0,g.axis==='y'?g.position:0).matrixTransform(m);return g.axis==='x'?{left:p.x-r.left}:{top:p.y-r.top};}
  function updateGuide(id,position){mutate(root=>writeSvgGuides(root,readSvgGuides(root).map(g=>g.id===id?{...g,position}:g)),false,[]);}
  function addGuide(axis){const box=parsed.current?.box;if(box)mutate(root=>{addSvgGuide(root,axis,box[axis==='x'?0:1]+box[axis==='x'?2:3]/2);root.removeAttribute('data-tuyan-guides-hidden');},false,[]);}
  function beginMarquee(event){
    if(event.button!==0||usingPan||textEdit||!live)return;
    const path=event.nativeEvent.composedPath(),isBlank=event.target===viewport.current||(!path.some(n=>n?.getAttribute?.('data-tuyan-id'))&&path.includes(host.current));
    if(!marqueeMode&&!isBlank)return;
    if(!path.includes(host.current)&&event.target!==viewport.current&&!(event.target instanceof window.SVGElement))return;
    event.preventDefault();event.stopPropagation();setHover(null);viewport.current.focus({preventScroll:true});viewport.current.setPointerCapture(event.pointerId);
    const inverse=live.getScreenCTM().inverse();gesture.current={type:'marquee',start:{x:event.clientX,y:event.clientY},inverse,base:event.shiftKey?selected:[],previous:selected};
    const r=overlayOrigin(viewport.current);setMarquee({x:event.clientX-r.left,y:event.clientY-r.top,width:0,height:0});
  }
  const selectionIssue=live?selected.map(id=>svgEditBlockReason(findSvgNode(live,id))).find(Boolean)||'':'';
  const node=selected.length===1&&live?findSvgNode(live,selected[0]):null;
  const textNodes=live?selected.map(id=>findSvgNode(live,id)).filter(n=>n&&['text','tspan'].includes(n.localName)):[];
  const textSelection=textNodes.length>0&&textNodes.length===selected.length;
  const textAttr=name=>{const values=textNodes.map(n=>window.getComputedStyle(n).getPropertyValue(name));return new Set(values).size===1?values[0]:'';};
  const type=node?.localName;
  const attr=name=>node?.style?.getPropertyValue(name)||node?.getAttribute(name)||(node&&window.getComputedStyle(node).getPropertyValue(name))||'';
  const applyAttr=(name,value)=>mutate(root=>(textSelection&&/^(font-|letter-spacing$|word-spacing$|text-anchor$)/.test(name)?selected.map(id=>findSvgNode(root,id)):topSelection(root,selected)).forEach(n=>{
    if(n.localName==='g'&&['fill','stroke','stroke-width','font-family','font-size'].includes(name)){
      for(const child of n.querySelectorAll('[data-tuyan-id]'))if(child.localName!=='g')setSvgAttribute(child,name,value);
    }else setSvgAttribute(n,name,value);
  }));
  const points=node?arrowPoints(node):null;
  const pathInfo=useMemo(()=>{
    if(type!=='path'||!svg)return {};
    try{return {model:parseEditablePath(findSvgNode(parseSvg(svg).root,selected[0]).getAttribute('d'))};}catch(error){return {error:error.message};}
  },[svg,selected[0],type]);
  const pathModel=pathPreview||pathInfo.model,pathMode=type==='path'&&inspector==='nodes'&&!!pathModel;
  const pathPart=Math.min(pathSelection.subpath,(pathModel?.subpaths.length||1)-1),pathIndex=Math.min(pathSelection.index,(pathModel?.subpaths[pathPart]?.nodes.length||1)-1);
  const pathPoint={...pathSelection,subpath:pathPart,index:pathIndex};
  const arcSegments=pathModel?.subpaths.flatMap((part,subpath)=>part.segments.flatMap((segment,index)=>segment.type==='A'?[{subpath,index,segment}]:[]))||[];
  const activeArc=arcSegments.find(a=>a.subpath===pathPart&&a.index===pathIndex)||arcSegments.find(a=>a.subpath===pathPart&&((a.index+1)%pathModel.subpaths[pathPart].nodes.length)===pathIndex)||arcSegments[0];
  const arcPart=activeArc&&pathModel.subpaths[activeArc.subpath];
  const arcShape=activeArc&&arcGeometry(arcPart.nodes[activeArc.index],arcPart.nodes[(activeArc.index+1)%arcPart.nodes.length],activeArc.segment);
  const arcFrame=activeArc&&arcEditFrame(arcPart.nodes[activeArc.index],arcPart.nodes[(activeArc.index+1)%arcPart.nodes.length],activeArc.segment);
  const arcHandles=pathMode&&guideMap?arcParameterHandles(arcFrame,node?.getScreenCTM(),guideMap):[];
  function applyArc(changes){if(!geometry())return;safe(()=>{const next=updatePathArc(pathInfo.model,activeArc.subpath,activeArc.index,changes);mutate(root=>findSvgNode(root,selected[0]).setAttribute('d',serializeEditablePath(next)),true);});}
  let inspectorAvoid=overlay?{left:overlay.left-24,top:overlay.top-44,right:overlay.left+overlay.width+24,bottom:overlay.top+overlay.height+24}:null;
  if(inspectorAvoid&&pathMode&&guideMap&&node){for(const h of pathHandles(pathModel,pathPart,pathIndex)){const p=new DOMPoint(h.point.x,h.point.y).matrixTransform(node.getScreenCTM());inspectorAvoid.left=Math.min(inspectorAvoid.left,p.x-guideMap.left-20);inspectorAvoid.top=Math.min(inspectorAvoid.top,p.y-guideMap.top-20);inspectorAvoid.right=Math.max(inspectorAvoid.right,p.x-guideMap.left+20);inspectorAvoid.bottom=Math.max(inspectorAvoid.bottom,p.y-guideMap.top+20);}}
  if(inspectorAvoid){for(const h of arcHandles){inspectorAvoid.left=Math.min(inspectorAvoid.left,h.screen.x-25);inspectorAvoid.top=Math.min(inspectorAvoid.top,h.screen.y-25);inspectorAvoid.right=Math.max(inspectorAvoid.right,h.screen.x+25);inspectorAvoid.bottom=Math.max(inspectorAvoid.bottom,h.screen.y+25);}}

  useEffect(()=>{setInspector(textSelection?'text':type==='path'?'nodes':points?'arrow':'style');setPathSelection({subpath:0,index:0});setPathPreview(null);},[selected.join('|'),type]);
  const geometry=()=>{if(selectionIssue){onError(selectionIssue);return false;}if(blocked){onError('请先确认数据几何修改的影响。');return false;}return true;};
  function snapContext(ids){
    const root=rendered.current,m=root.getScreenCTM(),[x,y,width,height]=parsed.current.box;
    return {references:[...snapReferences(root,ids,n=>bounds(n,root)),{x,y,width,height}],guides:root.getAttribute('data-tuyan-guides-hidden')==='true'?[]:readSvgGuides(root),threshold:{x:6/Math.hypot(m.a,m.b),y:6/Math.hypot(m.c,m.d)}};
  }
  function beginScale(event,handle,x,y){
    event.stopPropagation();event.preventDefault();setHover(null);
    safe(()=>{const inverse=live.getScreenCTM().inverse();gesture.current={type:'scale',ids:selected,handle,uniform:keepRatio,clientStart:{x:event.clientX,y:event.clientY},start:new DOMPoint(event.clientX,event.clientY).matrixTransform(inverse),origin:{x:overlay.box.x+overlay.box.width*x,y:overlay.box.y+overlay.box.height*y},source:svg,box:overlay.box,inverse,...snapContext(selected),transforms:topSelection(live,selected).map(n=>({id:n.getAttribute('data-tuyan-id'),parent:elementMatrix(n.parentElement,live),local:elementMatrix(n,live)}))};viewport.current.setPointerCapture(event.pointerId);});
  }
  function beginEndpoint(event,index){
    event.stopPropagation();event.preventDefault();setHover(null);
    safe(()=>{const inverse=live.getScreenCTM().inverse(),localToWorld=elementMatrix(node,live),points=arrowPoints(node);gesture.current={type:'endpoint',source:svg,id:selected[0],index,points,inverse,worldToLocal:localToWorld.inverse(),clientStart:{x:event.clientX,y:event.clientY},start:new DOMPoint(event.clientX,event.clientY).matrixTransform(inverse),origin:new DOMPoint(points[index*2],points[index*2+1]).matrixTransform(localToWorld),...snapContext(selected)};viewport.current.setPointerCapture(event.pointerId);});
  }
  function beginPathPoint(event,selection){
    event.stopPropagation();event.preventDefault();if(!geometry()||readOnly)return;
    setPathSelection(selection);setHover(null);viewport.current.focus({preventScroll:true});
    safe(()=>{const inverse=live.getScreenCTM().inverse(),localToWorld=elementMatrix(node,live),p=selection.control?pathModel.subpaths[selection.subpath].segments[selection.segment][selection.control]:pathModel.subpaths[selection.subpath].nodes[selection.index];gesture.current={type:'path-point',source:svg,id:selected[0],model:pathModel,selection,inverse,worldToLocal:localToWorld.inverse(),clientStart:{x:event.clientX,y:event.clientY},start:new DOMPoint(event.clientX,event.clientY).matrixTransform(inverse),origin:new DOMPoint(p.x,p.y).matrixTransform(localToWorld),...snapContext(selected)};viewport.current.setPointerCapture(event.pointerId);});
  }
  function beginArcParameter(event,kind){
    event.stopPropagation();event.preventDefault();if(event.button!==0||!geometry()||readOnly||!activeArc)return;
    setHover(null);viewport.current.focus({preventScroll:true});
    safe(()=>{const inverse=node.getScreenCTM().inverse();gesture.current={type:'arc-parameter',source:svg,id:selected[0],model:pathModel,subpath:activeArc.subpath,index:activeArc.index,kind,inverse,start:new DOMPoint(event.clientX,event.clientY).matrixTransform(inverse),clientStart:{x:event.clientX,y:event.clientY}};viewport.current.setPointerCapture(event.pointerId);});
  }
  function updatePath(operation){
    if(!geometry()||!pathInfo.model)return;
    safe(()=>{
      const index=pathIndex,part=pathPart,next=operation==='add'?splitPathSegment(pathInfo.model,part,index):deletePathNode(pathInfo.model,part,index);
      if(mutate(root=>findSvgNode(root,selected[0]).setAttribute('d',serializeEditablePath(next)),true))setPathSelection({subpath:part,index:operation==='add'?index+1:Math.min(index,next.subpaths[part].nodes.length-1)});
    });
  }
  function finishGesture(event){
    const g=gesture.current;gesture.current=null;setGestureHint('');setMarquee(null);setSnapLines([]);setGuidePreview(null);setPathPreview(null);
    if(viewport.current?.hasPointerCapture(event.pointerId))viewport.current.releasePointerCapture(event.pointerId);
    if(g?.type==='marquee'){if(!g.moved)setSelected(g.base);return;}
    if(g?.draft && !current.current.readOnly&&g.source===current.current.svg){safe(()=>{assertSvgEditable(rendered.current,g.type==='guide'?[]:g.ids||(g.id?[g.id]:selected));current.current.onChange(g.draft);});}
    else if(g?.moved)setMeasure(n=>n+1);
  }
  function moveGesture(event){
    const g=gesture.current;if(!g)return;
    if(g.type==='pan'){setPan({x:g.pan.x+event.clientX-g.start.x,y:g.pan.y+event.clientY-g.start.y});return;}
    const state=current.current;
    if(g.type==='marquee'){
      if(Math.hypot(event.clientX-g.start.x,event.clientY-g.start.y)<3&&!g.moved)return;
      g.moved=true;const r=overlayOrigin(viewport.current);setMarquee(rectangleBetween({x:g.start.x-r.left,y:g.start.y-r.top},{x:event.clientX-r.left,y:event.clientY-r.top}));
      const box=rectangleBetween(new DOMPoint(g.start.x,g.start.y).matrixTransform(g.inverse),new DOMPoint(event.clientX,event.clientY).matrixTransform(g.inverse));
      safe(()=>setSelected([...new Set([...g.base,...marqueeSelection(rendered.current,box,n=>bounds(n,rendered.current))]) ]));return;
    }
    if(g.type==='guide'){
      if(state.readOnly)return;const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(g.inverse),position=Number((g.guide.position+p[g.guide.axis]-g.start[g.guide.axis]).toFixed(3));
      g.moved=true;setGuidePreview({...g.guide,position});g.draft=changeSvg(g.source,root=>writeSvgGuides(root,readSvgGuides(root).map(item=>item.id===g.guide.id?{...item,position}:item)));return;
    }
    if(state.readOnly||state.blocked)return;
    if(['scale','endpoint','path-point','arc-parameter'].includes(g.type)&&!g.moved&&Math.hypot(event.clientX-g.clientStart.x,event.clientY-g.clientStart.y)<3)return;
    safe(()=>{
      if(g.type==='move'){
        const start=new DOMPoint(g.start.x,g.start.y).matrixTransform(g.inverse),end=new DOMPoint(event.clientX,event.clientY).matrixTransform(g.inverse);
        if(Math.hypot(event.clientX-g.start.x,event.clientY-g.start.y)<3&&!g.moved)return;
        if(!g.moved)viewport.current.setPointerCapture(event.pointerId);
        g.moved=true;
        // Calculate against original matrices, not last frame's temporary render.
        if(!g.transforms){const root=rendered.current,nodes=topSelection(root,g.ids);g.transforms=nodes.map(n=>({id:n.getAttribute('data-tuyan-id'),parent:elementMatrix(n.parentElement,root),local:elementMatrix(n,root)}));g.box=union(nodes.map(n=>bounds(n,root)));Object.assign(g,snapContext(g.ids));}
        let delta={x:end.x-start.x,y:end.y-start.y};
        if(state.snapEnabled&&!event.altKey){delta=snapTranslation(g.box,delta,g.references,g.guides,g.threshold);setSnapLines(delta.lines);}else setSnapLines([]);
        g.draft=changeSvg(g.source,root=>g.transforms.forEach(({id,parent,local})=>findSvgNode(root,id).setAttribute('transform',matrixString(parent.inverse().multiply(new DOMMatrix().translate(delta.x,delta.y)).multiply(local)))));
      } else if(g.type==='path-point'){
        const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(g.inverse);let point={x:g.origin.x+p.x-g.start.x,y:g.origin.y+p.y-g.start.y};
        // Control handles stay free; only anchors use the existing alignment toggle.
        if(!g.selection.control&&state.snapEnabled&&!event.altKey){point=snapPoint(point,g.references,g.guides,g.threshold);setSnapLines(point.lines);}else setSnapLines([]);
        const local=new DOMPoint(point.x,point.y).matrixTransform(g.worldToLocal),next=movePathPoint(g.model,g.selection,local);
        g.draft=changeSvg(g.source,root=>findSvgNode(root,g.id).setAttribute('d',serializeEditablePath(next)));setPathPreview(next);g.moved=true;setGestureHint(g.selection.control?'控制柄':'节点');
      } else if(g.type==='arc-parameter'){
        const part=g.model.subpaths[g.subpath],point=new DOMPoint(event.clientX,event.clientY).matrixTransform(g.inverse);
        const changes=dragArcParameter(part.nodes[g.index],part.nodes[(g.index+1)%part.nodes.length],part.segments[g.index],g.kind,g.start,point,event.shiftKey);
        const next=updatePathArc(g.model,g.subpath,g.index,changes);
        g.draft=changeSvg(g.source,root=>findSvgNode(root,g.id).setAttribute('d',serializeEditablePath(next)));setPathPreview(next);g.moved=true;
        setGestureHint(g.kind==='rotation'?`${changes.rotation.toFixed(1)}°${changes.limited?' · 半径随固定端点修正':''}`:`${g.kind==='rx'?'半径 X':'半径 Y'} ${(g.kind==='rx'?changes.rx:changes.ry).toFixed(2)}${changes.limited?' · 已达固定端点下限':''}`);
      } else if(g.type==='endpoint'){
        const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(g.inverse);let point={x:g.origin.x+p.x-g.start.x,y:g.origin.y+p.y-g.start.y};
        if(state.snapEnabled&&!event.altKey){point=snapPoint(point,g.references,g.guides,g.threshold);setSnapLines(point.lines);}else setSnapLines([]);
        const local=new DOMPoint(point.x,point.y).matrixTransform(g.worldToLocal),values=[...g.points];values[g.index*2]=local.x;values[g.index*2+1]=local.y;
        g.draft=changeSvg(g.source,root=>setArrowPoints(findSvgNode(root,g.id),values));g.moved=true;
      } else if(g.type==='scale'){
        const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(g.inverse),point={x:p.x-g.start.x+g.origin.x,y:p.y-g.start.y+g.origin.y},uniform=event.shiftKey||g.uniform;
        const r=state.snapEnabled&&!event.altKey?snapResize(g.box,g.handle,point,uniform,g.references,g.guides,g.threshold):resizeFromHandle(g.box,g.handle,point,uniform);setSnapLines(r.lines||[]);
        g.draft=changeSvg(g.source,root=>g.transforms.forEach(({id,parent,local})=>findSvgNode(root,id).setAttribute('transform',matrixString(parent.inverse().multiply(new DOMMatrix().translate(r.x,r.y).scale(r.sx,r.sy).translate(-r.x,-r.y)).multiply(local)))));g.moved=true;setGestureHint(`${Math.round(g.box.width*r.sx)} × ${Math.round(g.box.height*r.sy)}`);
      } else if(g.type==='rotate'){
        const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(g.inverse),angle=rotationDelta(g.start,p,g.centre,event.shiftKey);
        g.draft=changeSvg(g.source,root=>g.transforms.forEach(({id,parent,local})=>findSvgNode(root,id).setAttribute('transform',matrixString(parent.inverse().multiply(new DOMMatrix().translate(g.centre.x,g.centre.y).rotate(angle).translate(-g.centre.x,-g.centre.y)).multiply(local)))));g.moved=true;setGestureHint(`${Math.round(angle)}°`);
      }
      if(g.draft){const {root}=parseSvg(g.draft);for(const id of current.current.selected){const from=findSvgNode(root,id),to=findSvgNode(rendered.current,id);if(from&&to){for(const key of ['transform','x1','y1','x2','y2','points','d'])if(from.hasAttribute(key))to.setAttribute(key,from.getAttribute(key));}}refreshOverlay();}
    });
  }
  function align(axis,mode){
    if(!geometry())return;
    safe(()=>{
      const nodes=topSelection(live,selected),boxes=nodes.map(n=>bounds(n,live)),all=union(boxes);
      const size=axis==='x'?'width':'height';
      const shifts=boxes.map(b=>all[axis]-b[axis]+(mode==='center'?(all[size]-b[size])/2:mode==='end'?all[size]-b[size]:0));
      onChange(changeSvg(svg,root=>nodes.forEach((n,i)=>{const parent=elementMatrix(n.parentElement,live),local=elementMatrix(n,live);findSvgNode(root,n.getAttribute('data-tuyan-id')).setAttribute('transform',matrixString(parent.inverse().multiply(new DOMMatrix().translate(axis==='x'?shifts[i]:0,axis==='y'?shifts[i]:0)).multiply(local)));})));
    });
  }
  function distribute(axis){
    if(!geometry())return;
    safe(()=>{
      const size=axis==='x'?'width':'height',items=topSelection(live,selected).map(n=>({n,b:bounds(n,live)})).sort((a,b)=>a.b[axis]-b.b[axis]);if(items.length<3)return;
      const total=items.at(-1).b[axis]+items.at(-1).b[size]-items[0].b[axis],gap=(total-items.reduce((s,i)=>s+i.b[size],0))/(items.length-1);let cursor=items[0].b[axis];
      onChange(changeSvg(svg,root=>items.forEach(({n,b})=>{const delta=cursor-b[axis];cursor+=b[size]+gap;const parent=elementMatrix(n.parentElement,live);findSvgNode(root,n.getAttribute('data-tuyan-id')).setAttribute('transform',matrixString(parent.inverse().multiply(new DOMMatrix().translate(axis==='x'?delta:0,axis==='y'?delta:0)).multiply(elementMatrix(n,live))));})));
    });
  }
  function addObject(kind){
    let id;
    const reference=textNodes[0]||live?.querySelector('text');
    const fontFamily=reference?window.getComputedStyle(reference).fontFamily:'sans-serif';
    if(mutate(root=>{id=addSvgObject(root,kind,{fontFamily});},true,[])){
      setSelected([id]);setPanMode(false);setMarqueeMode(false);
      if(kind==='text')setTextEdit({id,value:'双击修改文字'});
    }
  }
  function duplicateObjects(){
    let ids=[];
    if(mutate(root=>{ids=duplicateSvgObjects(root,selected);},true))setSelected(ids);
  }
  function deleteObjects(){
    if(mutate(root=>deleteSvgObjects(root,selected),true)){setSelected([]);setTextEdit(null);}
  }
  const gradients=live?[...live.querySelectorAll('linearGradient,radialGradient')]:[];
  const fillId=attr('fill').match(/url\(["']?#([^)'" ]+)/)?.[1];
  const gradient=gradients.find(g=>g.id===fillId);
  return <div className={`svg-editor${inspectorLayout==='side'?' has-side-inspector':''}`} onKeyDown={event=>{
    if(event.target.matches('input,textarea,select')||event.target.isContentEditable)return;
    if(event.code==='Space'&&event.target===viewport.current){event.preventDefault();setSpacePan(true);return;}
    if(readOnly)return;
    if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?onRedo():onUndo();}
    if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='d'&&selected.length){event.preventDefault();duplicateObjects();}
    if(['Delete','Backspace'].includes(event.key)&&selected.length){event.preventDefault();if(pathMode)updatePath('delete');else deleteObjects();}
    if(event.key==='Escape'){const previous=gesture.current?.type==='marquee'?gesture.current.previous:[];cancelGesture();setSelected(previous);setTextEdit(null);setHover(null);}
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)&&selected.length){event.preventDefault();const step=event.shiftKey?10:1,dx=event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,dy=event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0;if(pathMode){if(!geometry())return;safe(()=>{const selection=pathSelection.control&&pathInfo.model.subpaths[pathPart].segments[pathSelection.segment]?.[pathSelection.control]?pathPoint:{subpath:pathPart,index:pathIndex},p=selection.control?pathInfo.model.subpaths[pathPart].segments[selection.segment][selection.control]:pathInfo.model.subpaths[pathPart].nodes[pathIndex],m=elementMatrix(node,live),world=new DOMPoint(p.x,p.y).matrixTransform(m),local=new DOMPoint(world.x+dx,world.y+dy).matrixTransform(m.inverse()),next=movePathPoint(pathInfo.model,selection,local);mutate(root=>findSvgNode(root,selected[0]).setAttribute('d',serializeEditablePath(next)),true);});}else transform(new DOMMatrix().translate(dx,dy));}
  }}>
    {guidesOpen&&<div className="svg-guides-panel" role="region" aria-label="辅助线设置">
      <div className="svg-tool-row"><strong>辅助线</strong><button type="button" disabled={readOnly||!live||guides.length>=100} onClick={()=>addGuide('x')}>＋ 垂直</button><button type="button" disabled={readOnly||!live||guides.length>=100} onClick={()=>addGuide('y')}>＋ 水平</button><button type="button" disabled={readOnly||!guides.length} aria-pressed={guidesVisible} onClick={()=>mutate(root=>{if(guidesVisible)root.setAttribute('data-tuyan-guides-hidden','true');else root.removeAttribute('data-tuyan-guides-hidden');},false,[])}>{guidesVisible?'隐藏辅助线':'显示辅助线'}</button><button type="button" disabled={readOnly||!guides.length} onClick={()=>mutate(root=>writeSvgGuides(root,[]),false,[])}>清空辅助线</button><button type="button" aria-label="收起辅助线设置" onClick={()=>setGuidesOpen(false)}>收起</button></div>
      {guides.length>0&&<div className="svg-guide-list">{guides.map((g,i)=><div key={g.id}><Field label={`${g.axis==='x'?'垂直':'水平'}辅助线 ${i+1}`} type="number" value={g.position} disabled={readOnly} onApply={position=>updateGuide(g.id,position)}/><button type="button" disabled={readOnly} aria-label={`删除辅助线 ${i+1}`} onClick={()=>mutate(root=>writeSvgGuides(root,readSvgGuides(root).filter(item=>item.id!==g.id)),false,[])}>×</button></div>)}</div>}
      <span className="svg-small">拖动线上的坐标标签可调整位置。随草稿保存，不画入导出图；隐藏后不参与吸附。</span>
    </div>}
    <div className={`svg-editing-area${objectsOpen?' with-objects':''}`}>
      <div className="svg-tool-rail" role="toolbar" aria-label="画布常用工具">
        <ToolButton icon={MousePointer2} label="选择对象" aria-pressed={!panMode&&!marqueeMode} onClick={()=>{setPanMode(false);setMarqueeMode(false);}}>选择</ToolButton>
        <ToolButton icon={BoxSelect} label="框选多个对象" aria-pressed={marqueeMode&&!panMode} onClick={()=>{setMarqueeMode(!marqueeMode);setPanMode(false);}} title="拖框完整圈住对象 · Shift 追加">框选</ToolButton>
        <ToolButton icon={Hand} label="平移" aria-pressed={panMode} onClick={()=>{setPanMode(!panMode);setMarqueeMode(false);}} title="拖动画布 · 空格临时平移">平移</ToolButton>
        <span className="svg-rail-divider"/>
        <ToolButton icon={Type} label="＋ 文字" disabled={readOnly} onClick={()=>addObject('text')}>文字</ToolButton>
        <SvgToolMenu label="形状" icon={Shapes} disabled={readOnly} className="svg-rail-menu">{[['rect','矩形'],['roundrect','圆角矩形'],['ellipse','椭圆'],['circle','圆形']].map(([kind,label])=><button type="button" key={kind} disabled={readOnly} onClick={()=>addObject(kind)}><SvgShapeIcon kind={kind}/><span>{label}</span></button>)}</SvgToolMenu>
        <SvgToolMenu label="线条" icon={Spline} disabled={readOnly} className="svg-rail-menu">{[['line','直线'],['arrow','箭头'],['curve','贝塞尔曲线'],['arc','椭圆弧']].map(([kind,label])=><button type="button" key={kind} disabled={readOnly} onClick={()=>addObject(kind)}><SvgShapeIcon kind={kind}/><span>{label}</span></button>)}</SvgToolMenu>
        <span className="svg-rail-divider"/>
        <ToolButton icon={Layers} label="图层 / 对象" aria-expanded={objectsOpen} aria-pressed={objectsOpen} onClick={()=>setObjectsOpen(!objectsOpen)}>图层</ToolButton>
      </div>

    {objectsOpen&&<SvgObjectTree root={live} selected={selected} readOnly={readOnly} onLock={(id,locked)=>mutate(root=>setSvgLocked(root,id,locked),false,[])} onHide={(id,hidden)=>mutate(root=>setSvgHidden(root,id,hidden),true,[])} onSort={(id,target,position)=>mutate(root=>sortSvgObject(root,id,target,position),true,[id])} onHover={previewObject} onClose={()=>setObjectsOpen(false)} onSelect={(id,multi)=>{setSelected(previous=>multi?(previous.includes(id)?previous.filter(value=>value!==id):[...previous,id]):[id]);setPanMode(false);setMarqueeMode(false);}}/>}
    <div ref={viewport} className={`svg-viewport${usingPan?' is-panning':marqueeMode?' is-marquee':''}`} onPointerDownCapture={beginMarquee} tabIndex={0} aria-label="SVG 直接编辑画布" onPointerDown={event=>{
      event.currentTarget.focus({preventScroll:true});if(usingPan||event.button===1){event.preventDefault();gesture.current={type:'pan',pan,start:{x:event.clientX,y:event.clientY}};event.currentTarget.setPointerCapture(event.pointerId);}
      else if(event.target===event.currentTarget)setSelected([]);
    }} onPointerMove={moveGesture} onPointerUp={finishGesture} onPointerCancel={cancelGesture} onLostPointerCapture={event=>{if(event.target===event.currentTarget&&gesture.current)cancelGesture();}} onContextMenu={e=>e.preventDefault()}>
      <div className="svg-paper" style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`,aspectRatio:parsed.current?`${parsed.current.box[2]} / ${parsed.current.box[3]}`:ratio==='auto'?'16 / 9':ratio.replace(':',' / ')}}><div ref={host} className="svg-document-host" data-testid="svg-document-host"/>{!svg&&<span className="svg-empty-label">SVG 画布</span>}</div>
      {displayGuides.map((g,i)=><div key={g.id} className={`svg-guide-line axis-${g.axis}`} style={guideStyle(g)}><button type="button" style={g.axis==='x'&&overlay&&overlay.top+overlay.height/2>(viewport.current?.clientHeight||0)/2?{top:'auto',bottom:4}:undefined} aria-label={`拖动${g.axis==='x'?'垂直':'水平'}辅助线 ${i+1}`} disabled={readOnly||usingPan} title="拖动调整辅助线位置" onPointerDown={event=>{event.preventDefault();event.stopPropagation();setHover(null);const inverse=live.getScreenCTM().inverse();gesture.current={type:'guide',source:svg,guide:g,inverse,start:new DOMPoint(event.clientX,event.clientY).matrixTransform(inverse)};viewport.current.setPointerCapture(event.pointerId);}}>{g.axis==='x'?'X':'Y'} {Math.round(g.position*10)/10}</button></div>)}
      {snapLines.map(g=><div key={g.axis} className={`svg-snap-line axis-${g.axis}`} style={guideStyle(g)}/>)}
      {marquee&&<div className="svg-marquee" style={{left:marquee.x,top:marquee.y,width:marquee.width,height:marquee.height}}/>}
      {overlay&&!marquee&&<div className={`svg-selection${selectionIssue?' is-protected':''}`} style={{left:overlay.left,top:overlay.top,width:Math.max(1,overlay.width),height:Math.max(1,overlay.height)}}>
        <span className="svg-selection-label">{gestureHint||`${selected.length>1?selected.length+' 个对象':objectNames[type]||type}${selectionIssue?' · 已保护':''}`}</span>
        {!blocked&&!selectionIssue&&!pathMode&&!usingPan&&!marqueeMode&&<>
          {!points&&overlay.box.width>0&&overlay.box.height>0&&resizeHandles.map(([handle,x,y,label])=><button type="button" key={handle} className={`svg-scale-handle handle-${handle}`} style={{left:`${x*100}%`,top:`${y*100}%`,transform:`translate(${x===0?'-100%':x===1?'0':'-50%'},${y===0?'-100%':y===1?'0':'-50%'})`}} aria-label={`缩放：${label}`} title="拖动缩放并吸附 · Shift 保持比例 · Alt 临时关闭吸附" onPointerDown={event=>beginScale(event,handle,x,y)}/>)}
          <button type="button" className="svg-rotate-handle" aria-label="拖动旋转选中对象" title="拖动旋转 · Shift 按 15° 吸附" onPointerDown={event=>{event.stopPropagation();setHover(null);const inverse=live.getScreenCTM().inverse();gesture.current={type:'rotate',source:svg,inverse,start:new DOMPoint(event.clientX,event.clientY).matrixTransform(inverse),centre:{x:overlay.box.x+overlay.box.width/2,y:overlay.box.y+overlay.box.height/2},transforms:topSelection(live,selected).map(n=>({id:n.getAttribute('data-tuyan-id'),parent:elementMatrix(n.parentElement,live),local:elementMatrix(n,live)}))};viewport.current.setPointerCapture(event.pointerId);}}><RotateCw size={14}/></button>
        </>}
      </div>}
      {hover&&<div className="svg-hover-outline" style={{left:hover.left,top:hover.top,width:Math.max(1,hover.width),height:Math.max(1,hover.height)}}><span>{hover.label}</span></div>}
      {!blocked&&!selectionIssue&&!pathMode&&!usingPan&&!marqueeMode&&overlay?.endpoints.map((p,index)=><button type="button" key={index} className={`svg-endpoint endpoint-${index}`} style={{left:p.x,top:p.y}} aria-label={`箭头${index?'终':'起'}点`} title={`拖动${index?'终':'起'}点并吸附 · Alt 临时关闭吸附`} onPointerDown={event=>beginEndpoint(event,index)}><span>{index?'终':'起'}</span></button>)}
      {pathMode&&!blocked&&!selectionIssue&&!usingPan&&!marqueeMode&&guideMap&&<SvgPathNodes model={pathModel} selection={pathPoint} matrix={node?.getScreenCTM()} origin={guideMap} onPointDown={beginPathPoint} arcHandles={arcHandles} onArcDown={beginArcParameter}/>}
      {textEdit&&!readOnly&&<div className="svg-inline-text" style={{left:Math.max(4,Math.min(overlay?.left||20,(viewport.current?.clientWidth||400)-240)),top:Math.max(8,(overlay?.top||40)-8)}}><textarea autoFocus aria-label="直接修改文字" value={textEdit.value} onBlur={event=>{if(event.relatedTarget?.hasAttribute('data-svg-cancel'))return;mutate(root=>{findSvgNode(root,textEdit.id).textContent=textEdit.value;});setTextEdit(null);}} onChange={e=>setTextEdit({...textEdit,value:e.target.value})} onKeyDown={e=>{if(e.key==='Escape')setTextEdit(null);if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){mutate(root=>{findSvgNode(root,textEdit.id).textContent=textEdit.value;});setTextEdit(null);}}}/><button type="button" onClick={()=>{mutate(root=>{findSvgNode(root,textEdit.id).textContent=textEdit.value;});setTextEdit(null);}}>确定文字</button><button type="button" data-svg-cancel onClick={()=>setTextEdit(null)}>取消</button></div>}
    </div>
    <div className="svg-inspector-slot">
    {inspectorLayout==='side'&&(!selected.length||readOnly||selectionIssue)&&<div className="svg-inspector-empty"><Palette size={22} aria-hidden="true"/><strong>对象属性</strong><span>{readOnly?'执行期间暂不可编辑':selectionIssue||'选择画布中的对象，调整外观、位置与尺寸。'}</span></div>}
    {selected.length>0&&!readOnly&&!selectionIssue&&!marquee&&<SvgInspector layout={inspectorLayout} viewport={viewport} avoid={inspectorAvoid} selectionKey={`${selected.join('|')}:${inspector}`} interacting={!!gesture.current?.moved||!!textEdit}>
      <div className="svg-inspector-heading"><strong>{selected.length>1?`${selected.length} 个对象`:objectNames[type]||type}</strong><ToolButton icon={Copy} label="复制" disabled={readOnly||!!selectionIssue} onClick={duplicateObjects} title="复制选中对象（Ctrl / ⌘ D）"/><ToolButton icon={Trash2} label="删除" disabled={readOnly||!!selectionIssue} onClick={deleteObjects} title="删除选中对象（Delete / Backspace）"/></div>
      <div className="svg-property-tabs" role="group" aria-label="对象属性分组">{[['style',Palette,'外观'],...(textSelection?[['text',Type,'文字']]:[]),['transform',Move,'位置与尺寸'],...(type==='path'?[['nodes',Spline,'节点']]:[]),...(points?[['arrow',ArrowUpRight,'箭头与端点']]:[]),['arrange',AlignHorizontalJustifyCenter,'排列与分组'],...(gradient?[['gradient',Palette,'渐变色标']]:[])].map(([key,Icon,label])=><ToolButton key={key} icon={Icon} label={label} title={`${label} · 再次点击收起`} aria-pressed={inspector===key} onClick={()=>setInspector(inspector===key?'':key)}>{label}</ToolButton>)}</div>
      <div className="svg-property-section" hidden={inspector!=='style'}><Field label="填充" value={attr('fill')} onApply={v=>applyAttr('fill',v||'none')}/><Field label="描边" value={attr('stroke')} onApply={v=>applyAttr('stroke',v||'none')}/><Field label="线宽" type="number" min="0" max="100" value={attr('stroke-width')||1} onApply={v=>Number.isFinite(v)&&v>=0&&applyAttr('stroke-width',v)}/><Field label="透明度" type="number" min="0" max="1" step="0.1" value={attr('opacity')||1} onApply={v=>v>=0&&v<=1&&applyAttr('opacity',v)}/></div>
      {textSelection&&<div className="svg-property-section" hidden={inspector!=='text'}><Field label="字体" value={textAttr('font-family')} placeholder="混合字体" onApply={v=>v.trim()&&mutate(root=>selected.forEach(id=>setSvgAttribute(findSvgNode(root,id),'font-family',v)))}/><Field label="字号" type="number" min="1" max="500" value={parseFloat(textAttr('font-size'))||''} onApply={v=>v>0&&v<=500&&applyAttr('font-size',v)}/><label>文字对齐<MenuSelect aria-label="文字对齐" value={textAttr('text-anchor')} onChange={e=>applyAttr('text-anchor',e.target.value)}><option value="" disabled>混合</option><option value="start">左</option><option value="middle">中</option><option value="end">右</option></MenuSelect></label>{node&&<button type="button" disabled={node.children.length>0} onClick={()=>setTextEdit({id:selected[0],value:node.textContent})}>改字</button>}<details><summary>字重与间距</summary><div className="svg-tool-row"><Field label="字重" value={textAttr('font-weight')} placeholder="如 400 / 700" onApply={v=>/^(normal|bold|[1-9]\d{0,2}|1000)$/.test(v)&&applyAttr('font-weight',v)}/><label>字形<MenuSelect aria-label="字形" value={textAttr('font-style')} onChange={e=>applyAttr('font-style',e.target.value)}><option value="" disabled>混合</option><option value="normal">正体</option><option value="italic">斜体</option><option value="oblique">倾斜</option></MenuSelect></label>{[['letter-spacing','字距'],['word-spacing','词距']].map(([name,label])=><Field key={name} label={label} value={textAttr(name)} placeholder="如 0.5px / normal" onApply={v=>{if(/^(normal|[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:px|em|pt)?)$/.test(v))applyAttr(name,v==='normal'||/[a-z]$/.test(v)?v:`${v}px`);else onError('间距请填写 normal 或 px、em、pt 数值。');}}/>)}</div><p className="svg-small">间距会影响文字占用宽度；已有 tspan 的位置与上下标保持不变。</p></details><ToolButton icon={Type} label="选择全部文字" onClick={()=>setSelected([...live.querySelectorAll('text,tspan')].filter(n=>n.hasAttribute('data-tuyan-id')&&!svgEditBlockReason(n)).map(n=>n.getAttribute('data-tuyan-id')))}>选择全部文字</ToolButton></div>}
      <div className="svg-property-section" hidden={inspector!=='transform'}>{overlay&&<>{[['x','位置 X'],['y','位置 Y'],['width','宽度'],['height','高度']].map(([key,label])=><Field key={key} label={label} type="number" value={Number(overlay.box[key].toFixed(2))} disabled={blocked||((key==='width'||key==='height')&&overlay.box[key]<=0)} onApply={value=>{if(!Number.isFinite(value))return;const b=overlay.box;if(key==='x'||key==='y')transform(new DOMMatrix().translate(key==='x'?value-b.x:0,key==='y'?value-b.y:0));else if(value>0){const scale=value/b[key];transform(new DOMMatrix().translate(b.x,b.y).scale(key==='width'||keepRatio?scale:1,key==='height'||keepRatio?scale:1).translate(-b.x,-b.y));}}}/>)}<label className="svg-ratio-toggle"><input type="checkbox" checked={keepRatio} onChange={e=>setKeepRatio(e.target.checked)}/>等比缩放</label></>}<Field label="旋转增量°" type="number" value="0" onApply={v=>{if(Number.isFinite(v)&&overlay){const b=overlay.box;transform(new DOMMatrix().translate(b.x+b.width/2,b.y+b.height/2).rotate(v).translate(-b.x-b.width/2,-b.y-b.height/2));}}}/><span className="svg-small">位置与尺寸为画布坐标中的外接框。等比缩放优先保留比例，冲突的目标不会同时吸附。</span></div>
      {points&&<div className="svg-property-section" hidden={inspector!=='arrow'}><div className="svg-tool-row">{['起点 X','起点 Y','终点 X','终点 Y'].map((label,i)=><Field key={label} label={label} type="number" value={Number(points[i].toFixed(2))} onApply={v=>mutate(root=>{const n=findSvgNode(root,selected[0]),p=arrowPoints(n);p[i]=v;setArrowPoints(n,p);},true)}/>)}<label>箭头方向<MenuSelect aria-label="箭头方向" defaultValue="" onChange={e=>mutate(root=>setArrowDirection(root,findSvgNode(root,selected[0]),e.target.value),true)}><option value="" disabled>保留原样</option><option value="end">正向</option><option value="start">反向</option><option value="both">双向</option><option value="none">无箭头</option></MenuSelect></label><label>线条样式<MenuSelect aria-label="线条样式" value={attr('stroke-dasharray')==='none'||!attr('stroke-dasharray')?'none':'dash'} onChange={e=>applyAttr('stroke-dasharray',e.target.value==='dash'?'8 5':'none')}><option value="none">实线</option><option value="dash">虚线</option></MenuSelect></label></div></div>}
      {type==='path'&&<div className="svg-property-section" hidden={inspector!=='nodes'}>{pathInfo.error?<span className="svg-small" role="status">{pathInfo.error}</span>:pathModel&&<><label>选中节点<MenuSelect aria-label="选中路径节点" value={`${pathPart}:${pathIndex}`} onChange={e=>{const [subpath,index]=e.target.value.split(':').map(Number);setPathSelection({subpath,index});}}>{pathModel.subpaths.flatMap((part,s)=>part.nodes.map((p,n)=><option key={`${s}:${n}`} value={`${s}:${n}`}>路径 {s+1} · 节点 {n+1}</option>))}</MenuSelect></label><button type="button" disabled={blocked||!pathModel.subpaths[pathPart].segments[pathIndex]} title="在选中节点后的线段中点新增，保持原曲线形状" onClick={()=>updatePath('add')}>＋ 节点</button><button type="button" disabled={blocked||!!pathNodeDeleteReason(pathModel,pathPart,pathIndex)} title={pathNodeDeleteReason(pathModel,pathPart,pathIndex)||'重新连接相邻线段，会改变曲线形状'} onClick={()=>updatePath('delete')}>删除节点</button><span className="svg-small">拖动方形端点或圆形控制柄。新增保持曲线形状；删除会改变曲线。{attr('marker-mid')&&attr('marker-mid')!=='none'?' 中间箭头标记会随节点数变化。':''}</span>
      {activeArc&&<div className="svg-arc-properties"><label>圆弧段<MenuSelect aria-label="圆弧段" value={`${activeArc.subpath}:${activeArc.index}`} onChange={e=>{const [subpath,index]=e.target.value.split(':').map(Number);setPathSelection({subpath,index});}}>{arcSegments.map(a=><option key={`${a.subpath}:${a.index}`} value={`${a.subpath}:${a.index}`}>路径 {a.subpath+1} · 弧 {a.index+1}</option>)}</MenuSelect></label>
      {[['rx','半径 X'],['ry','半径 Y'],['rotation','轴旋转°']].map(([key,label])=><Field key={key} label={label} type="number" min={key==='rotation'?undefined:0} value={activeArc.segment[key]} disabled={blocked} onApply={v=>applyArc({[key]:v})}/>)}
      <label>圆弧方向<MenuSelect aria-label="圆弧方向" disabled={blocked} value={activeArc.segment.sweep} onChange={e=>applyArc({sweep:Number(e.target.value)})}><option value="1">正向（sweep 1）</option><option value="0">反向（sweep 0）</option></MenuSelect></label>
      <label>弧线大小<MenuSelect aria-label="弧线大小" disabled={blocked} value={activeArc.segment.largeArc} onChange={e=>applyArc({largeArc:Number(e.target.value)})}><option value="0">小弧</option><option value="1">大弧</option></MenuSelect></label>
      <details><summary>圆弧端点坐标</summary><div className="svg-tool-row">{[0,1].flatMap(offset=>['x','y'].map(axis=>{const index=(activeArc.index+offset)%arcPart.nodes.length;return <Field key={`${offset}${axis}`} label={`圆弧${offset?'终':'起'}点 ${axis.toUpperCase()}`} type="number" value={arcPart.nodes[index][axis]} disabled={blocked} onApply={v=>safe(()=>{if(!geometry())return;const next=movePathPoint(pathInfo.model,{subpath:activeArc.subpath,index},{...arcPart.nodes[index],[axis]:v});mutate(root=>findSvgNode(root,selected[0]).setAttribute('d',serializeEditablePath(next)),true);})}/>;}))}</div></details>
      <p className="svg-small">拖动 X / Y 柄调有效半径，↻ 柄调角度（Shift 按 15°）。端点固定，虚线从两端中点量起。{arcFrame?.restoring?'退化为直线：拖柄恢复椭圆。':''}原生 A · 半径、端点及方向按局部坐标；镜像变换会反转视觉方向。{arcShape.kind==='empty'?'端点重合，圆弧不可见。':arcShape.kind==='line'?'零半径按直线显示，仍保留 A。':arcShape.corrected?`半径不足，SVG 有效半径为 ${arcShape.rx.toFixed(2)} × ${arcShape.ry.toFixed(2)}；输入值保留。`:''}</p>
      {pathNodeDeleteReason(pathModel,pathPart,pathIndex).includes('圆弧')&&<p className="svg-small">{pathNodeDeleteReason(pathModel,pathPart,pathIndex)}</p>}</div>}
      </>}</div>}
      {gradient&&<div className="svg-property-section" hidden={inspector!=='gradient'}><p className="svg-small">修改会同步影响使用此渐变的对象。</p>{[...gradient.querySelectorAll('stop')].map((stop,i)=><div className="svg-tool-row" key={i}><Field label={`色标 ${i+1} 颜色`} value={stop.style.getPropertyValue('stop-color')||stop.getAttribute('stop-color')} onApply={v=>mutate(root=>{assertSvgResourceEditable(root);const g=[...root.querySelectorAll('linearGradient,radialGradient')].find(g=>g.id===fillId);setSvgAttribute(g.querySelectorAll('stop')[i],'stop-color',v);})}/><Field label={`色标 ${i+1} 位置`} value={stop.getAttribute('offset')} onApply={v=>mutate(root=>{assertSvgResourceEditable(root);const g=[...root.querySelectorAll('linearGradient,radialGradient')].find(g=>g.id===fillId);g.querySelectorAll('stop')[i].setAttribute('offset',v);})}/></div>)}</div>}
      <div className="svg-property-section" hidden={inspector!=='arrange'}><div className="svg-tool-row"><button type="button" disabled={selected.length<2} onClick={()=>mutate(root=>groupSvg(root,selected),true)}>分组</button><button type="button" disabled={type!=='g'} onClick={()=>mutate(root=>ungroupSvg(root,selected),true)}>取消分组</button><button type="button" onClick={()=>mutate(root=>reorderSvgLayers(root,selected,'front'),true)}>置顶</button><button type="button" onClick={()=>mutate(root=>reorderSvgLayers(root,selected,'back'),true)}>置底</button>{[['x','start','左对齐'],['x','center','水平居中'],['x','end','右对齐'],['y','start','顶对齐'],['y','center','垂直居中'],['y','end','底对齐']].map(([axis,mode,label])=><button type="button" key={label} disabled={selected.length<2||blocked} onClick={()=>align(axis,mode)}>{label}</button>)}<button type="button" disabled={selected.length<3||blocked} onClick={()=>distribute('x')}>水平分布</button><button type="button" disabled={selected.length<3||blocked} onClick={()=>distribute('y')}>垂直分布</button></div></div>
    </SvgInspector>}
    </div>
    </div>
    <div className="svg-view-bar">      <div className="svg-tool-group" role="toolbar" aria-label="画布查看与历史">
        <ToolButton icon={Undo2} label="撤销" disabled={readOnly||!canUndo} onClick={onUndo}/><ToolButton icon={Redo2} label="重做" disabled={readOnly||!canRedo} onClick={onRedo}/>
      </div>
      <div className="svg-tool-group svg-alignment-tools" role="toolbar" aria-label="吸附与辅助线">
        <ToolButton icon={Magnet} label="对齐吸附" aria-pressed={snapEnabled} onClick={()=>setSnapEnabled(!snapEnabled)} title="移动、缩放和箭头端点对齐边缘、中心与辅助线 · Alt 临时关闭">吸附</ToolButton>
        <ToolButton icon={Ruler} label="辅助线" aria-expanded={guidesOpen} aria-pressed={guidesOpen} onClick={()=>setGuidesOpen(!guidesOpen)}>辅助线</ToolButton>
      </div>
      <div className="svg-tool-group svg-zoom-tools" role="toolbar" aria-label="画布缩放">
        <ToolButton icon={ZoomOut} label="缩小画布" onClick={()=>zoomTo(zoom/1.25)}/>
        <MenuSelect aria-label="画布缩放比例" value={zoom} onChange={e=>zoomTo(Number(e.target.value))}>{![.25,.5,.75,1,1.5,2,4,8].includes(zoom)&&<option value={zoom}>{Math.round(zoom*100)}%</option>}{[.25,.5,.75,1,1.5,2,4,8].map(z=><option key={z} value={z}>{z*100}%</option>)}</MenuSelect>
        <ToolButton icon={ZoomIn} label="放大画布" onClick={()=>zoomTo(zoom*1.25)}/>
        <ToolButton icon={Scan} label="适合画布" onClick={()=>{setZoom(1);setPan({x:0,y:0});setHover(null);}} title="显示整张画布（100% 为适配视口）"/>
        <ToolButton icon={Focus} label="聚焦所选" disabled={!overlay} onClick={focusSelection}/>
      </div>
    <SvgToolMenu label="帮助" icon={CircleHelp} className="svg-editor-help">
    {objectsOpen&&<p className="svg-small">隐藏会影响导出，内容仍保留在 SVG 中；显示恢复原样式。锁定仅在图研编辑器中生效。状态与顺序随草稿保存，可撤销重做。</p>}
    {fontReport.length>0&&<details className="svg-compatibility"><summary>字体与外部查看</summary><p>{fontReport.map(f=>`${f.family}（${({available:'本机可定位',generic:'通用字体族',unresolved:'未定位',unknown:'未能检测'})[f.status]}）`).join('；')}</p><p>仅探测当前浏览器的本地字体名，不保证字形覆盖或 Inkscape 能找到同一字体。导出保留可编辑文字，不嵌入字体；外部查看需使用相同字体文件，缩放、抗锯齿与色彩管理仍可能产生显示差异。</p></details>}
    <p className="svg-small">框选完整圈住对象（部分圈住组时选择组内对象）· Shift 追加框选 / 点选 · 移动、缩放和箭头端点吸附边缘、中心与辅助线，Alt 临时关闭 · Alt 单击组内对象 · 方向键微移 · 双击文字 · Ctrl/⌘ Z 撤销 · Ctrl/⌘ D 复制 · Delete 删除 · 平移工具或滚轮查看{readOnly?' · 当前仅查看':''}</p>

    </SvgToolMenu></div>
    {selected.length>0&&!readOnly&&selectionIssue&&<p className="svg-notice" role="status">{selectionIssue}<button type="button" onClick={()=>setObjectsOpen(true)}>打开对象列表</button></p>}

    {!dataProtected&&svg&&<p className="svg-small svg-data-reminder">若图中含数据编码，修改柱高、位置、连线或数值标签会影响数值表达；手工编辑不会同步修改源数据。</p>}
    {dataProtected&&!readOnly&&<label className="svg-data-guard"><input type="checkbox" checked={geometryAllowed} onChange={e=>onAllowGeometry(e.target.checked)}/>允许修改数据图几何：新增、隐藏、复制、删除、移动、缩放、连线、排序可能改变数值表达；原始数据不会同步改变。</label>}
    {fontReport.some(f=>f.status==='unresolved')&&<p className="svg-notice svg-warning" role="status">浏览器未能定位字体名：{fontReport.filter(f=>f.status==='unresolved').map(f=>f.family).join('、')}。可能正在使用替代字体，字形和字距会变化；可选择文字后指定两端都安装的字体。原字体声明未被自动替换。</p>}

  </div>;
}
