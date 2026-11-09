import {useEffect,useRef} from 'react';
import {ChevronDown} from 'lucide-react';
export default function SvgToolMenu({label,icon:Icon,disabled=false,children,className=''}){
  const ref=useRef(null);
  useEffect(()=>{const close=e=>{if(!ref.current?.contains(e.target))ref.current?.removeAttribute('open');};const escape=e=>{if(e.key==='Escape'&&ref.current?.open){ref.current.removeAttribute('open');ref.current.querySelector('summary').focus();}};document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);};},[]);
  return <details ref={ref} className={`svg-tool-menu ${className}`} onClick={e=>{if(e.target.closest('button')&&!e.target.closest('button').disabled)ref.current.removeAttribute('open');}}><summary aria-label={label} aria-disabled={disabled} title={label} onClick={e=>{if(disabled)e.preventDefault();}}>{Icon&&<Icon size={17} aria-hidden="true"/>}<span>{label}</span><ChevronDown size={12} aria-hidden="true"/></summary><div className="svg-menu-content">{children}</div></details>;
}
