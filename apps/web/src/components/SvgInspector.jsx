import {useLayoutEffect,useRef,useState} from 'react';
import {inspectorPosition} from '../lib/svgInspector.js';
export default function SvgInspector({viewport,avoid,selectionKey,interacting,children}){
  const panel=useRef(null),dockedKey=useRef(null),lastWidth=useRef(0),[position,setPosition]=useState(null);
  useLayoutEffect(()=>{
    const measure=()=>{const p=panel.current,v=viewport.current;if(!p||!v)return;
      if(lastWidth.current!==v.clientWidth){lastWidth.current=v.clientWidth;dockedKey.current=null;}
      const next=dockedKey.current===selectionKey?null:inspectorPosition(v.clientWidth,v.clientHeight,{width:p.offsetWidth,height:p.offsetHeight},avoid);
      if(!next)dockedKey.current=selectionKey;
      const value=next?{left:v.offsetLeft+next.left,top:v.offsetTop+next.top}:null;
      setPosition(old=>JSON.stringify(old)===JSON.stringify(value)?old:value);
    };measure();const observer=new ResizeObserver(measure);if(panel.current)observer.observe(panel.current);if(viewport.current)observer.observe(viewport.current);return()=>observer.disconnect();
  },[avoid?.left,avoid?.top,avoid?.right,avoid?.bottom,selectionKey]);
  return <div ref={panel} className={`svg-object-tools ${position?'is-floating':'is-docked'}${interacting?' is-interacting':''}`} style={position||undefined} role="toolbar" aria-label="选中对象属性">{children}</div>;
}
