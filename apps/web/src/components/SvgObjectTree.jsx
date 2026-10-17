import {useEffect,useRef,useState} from 'react';
import {Eye,EyeOff,Lock,LockOpen,GripVertical} from 'lucide-react';
import {svgObjectTree} from '../lib/svgObjects.js';

export default function SvgObjectTree({root,selected,onSelect,onClose,readOnly,onLock,onHide,onSort,onHover}) {
  const [expanded,setExpanded]=useState(new Set()),[drop,setDrop]=useState(null),[announcement,setAnnouncement]=useState('');
  const drag=useRef(null),panel=useRef(null);
  const items=root?svgObjectTree(root):[];
  useEffect(()=>{
    const ancestors=[];
    function visit(items,path=[]){for(const item of items){if(selected.includes(item.id))ancestors.push(...path);visit(item.children,[...path,item.key]);}}
    visit(items);setExpanded(previous=>new Set([...previous,...ancestors]));
  },[root,selected]);
  useEffect(()=>{drag.current=null;setDrop(null);},[root,readOnly]);
  const toggle=key=>setExpanded(previous=>{const next=new Set(previous);next.has(key)?next.delete(key):next.add(key);return next;});
  function move(event){
    const start=drag.current;if(!start)return;
    if(Math.hypot(event.clientX-start.x,event.clientY-start.y)<4&&!start.moved)return;
    start.moved=true;
    const row=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-svg-layer-row]');
    if(!row||!panel.current.contains(row)||!row.dataset.svgLayerRow){start.drop=null;setDrop(null);return;}
    const rect=row.getBoundingClientRect(),next={target:row.dataset.svgLayerRow,position:event.clientY<rect.top+rect.height/2?'before':'after'};
    start.drop=next;setDrop(next);
    const bounds=panel.current.getBoundingClientRect();if(event.clientY<bounds.top+35)panel.current.scrollTop-=12;else if(event.clientY>bounds.bottom-25)panel.current.scrollTop+=12;
  }
  function finish(event){
    const start=drag.current;drag.current=null;setDrop(null);
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    if(start?.moved&&start.drop&&start.id!==start.drop.target&&onSort(start.id,start.drop.target,start.drop.position))setAnnouncement('已调整对象顺序');
  }
  function rows(items,depth=0){return items.map((item,index)=>{
    const label=item.label,LockIcon=item.locked?Lock:LockOpen,EyeIcon=item.hidden?EyeOff:Eye;
    return <li key={item.key}>
      <div onPointerEnter={()=>onHover?.(item.id)} onPointerLeave={()=>onHover?.(null)} data-svg-layer-row={item.id||''} className={`svg-tree-row${item.hidden?' is-hidden':''}${drop?.target===item.id?` drop-${drop.position}`:''}`} style={{paddingLeft:Math.min(depth,4)*10}}>
        {item.children.length?<button type="button" className="svg-tree-toggle" aria-label={`${expanded.has(item.key)?'折叠':'展开'} ${label}`} aria-expanded={expanded.has(item.key)} onClick={()=>toggle(item.key)}>{expanded.has(item.key)?'▾':'▸'}</button>:<span className="svg-tree-spacer"/>}
        <button type="button" className="svg-tree-object" title={`${label}${item.locked?' · 已锁定':''}${item.hidden?' · 已隐藏':''}`} aria-label={`对象：${label}`} aria-pressed={selected.includes(item.id)} onClick={event=>item.id?onSelect(item.id,event.shiftKey):toggle(item.key)}>{label}</button>
        {item.id&&<>
          <button type="button" className="svg-layer-action" disabled={readOnly||item.inheritedHidden} aria-label={`${item.ownHidden?'显示':'隐藏'}：${label}`} aria-pressed={item.hidden} title={item.inheritedHidden?'父组已隐藏':item.ownHidden?'显示（恢复原有样式）':'隐藏（同时影响导出）'} onClick={()=>onHide(item.id,!item.ownHidden)}><EyeIcon size={14}/></button>
          <button type="button" className="svg-layer-action" disabled={readOnly||item.inheritedLocked} aria-label={`${item.ownLocked?'解锁':'锁定'}：${label}`} aria-pressed={item.locked} title={item.inheritedLocked?'锁定来自父组':item.ownLocked?'解锁':'锁定，防止修改对象'} onClick={()=>onLock(item.id,!item.ownLocked)}><LockIcon size={14}/></button>
          <button type="button" className="svg-layer-action svg-layer-grip" disabled={readOnly||item.editBlocked} aria-label={`拖动排序：${label}`} title="同组内拖动排序；也可按 Alt + ↑ / ↓" onPointerDown={event=>{if(event.button!==0)return;event.stopPropagation();event.currentTarget.focus({preventScroll:true});drag.current={id:item.id,x:event.clientX,y:event.clientY};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={move} onPointerUp={finish} onPointerCancel={()=>{drag.current=null;setDrop(null);}} onKeyDown={event=>{if(event.key==='Escape'){drag.current=null;setDrop(null);}if(event.altKey&&['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();event.stopPropagation();const target=items[index+(event.key==='ArrowUp'?-1:1)];if(target?.id&&onSort(item.id,target.id,event.key==='ArrowUp'?'before':'after'))setAnnouncement('已调整对象顺序');}}}><GripVertical size={14}/></button>
        </>}
      </div>
      {!!item.children.length&&expanded.has(item.key)&&<ul>{rows(item.children,depth+1)}</ul>}
    </li>;
  });}
  return <aside ref={panel} className="svg-object-tree" aria-label="图层与对象列表"><header><strong>图层 / 对象</strong><button type="button" onClick={onClose} aria-label="关闭对象列表">×</button></header><p className="svg-small">上方为前景 · Shift 多选<br/>眼睛隐藏 · 锁防误改 · 拖柄同组排序</p><ul>{rows(items)}</ul>{!items.length&&<p className="svg-small">生成后在此查看对象与分组</p>}<span className="svg-layer-announcement" role="status">{announcement}</span></aside>;
}
