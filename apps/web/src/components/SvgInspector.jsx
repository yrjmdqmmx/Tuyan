import {useLayoutEffect,useRef,useState} from 'react';
import {inspectorPosition} from '../lib/svgInspector.js';
export default function SvgInspector({viewport,avoid,selectionKey,interacting,children,layout='floating'}){
  const panel=useRef(null),dockedKey=useRef(null),lastWidth=useRef(0),[position,setPosition]=useState(null);
  useLayoutEffect(()=>{
    if(layout==='side')return;
    const measure=()=>{const p=panel.current,v=viewport.current;if(!p||!v)return;
      if(lastWidth.current!==v.clientWidth){lastWidth.current=v.clientWidth;dockedKey.current=null;}
      const next=dockedKey.current===selectionKey?null:inspectorPosition(v.clientWidth,v.clientHeight,{width:p.offsetWidth,height:p.offsetHeight},avoid);
      if(!next)dockedKey.current=selectionKey;
      const value=next?{left:v.getBoundingClientRect().left-p.offsetParent.getBoundingClientRect().left+next.left,top:v.getBoundingClientRect().top-p.offsetParent.getBoundingClientRect().top+next.top}:null;
      setPosition(old=>JSON.stringify(old)===JSON.stringify(value)?old:value);
    };measure();const observer=new ResizeObserver(measure);if(panel.current)observer.observe(panel.current);if(viewport.current)observer.observe(viewport.current);return()=>observer.disconnect();
  },[avoid?.left,avoid?.top,avoid?.right,avoid?.bottom,selectionKey,layout]);
  return <div ref={panel} className={`svg-object-tools ${layout==='side'?'is-side':position?'is-floating':'is-docked'}${interacting?' is-interacting':''}`} style={position||undefined} role="toolbar" aria-label="选中对象属性">{children}</div>;
}
