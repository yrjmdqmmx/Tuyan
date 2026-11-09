import {arcGeometry,arcPointAt} from './svgArc.js';
// Native path data only; selection never rewrites the original d attribute.
// SVG command semantics: https://www.w3.org/TR/SVG/paths.html
const arity={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7};
const copy=value=>structuredClone(value);
const point=(x,y)=>({x,y});
const same=(a,b)=>a.x===b.x&&a.y===b.y;
const mix=(a,b,t)=>point(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);
const reflect=(a,centre)=>point(2*centre.x-a.x,2*centre.y-a.y);
const valid=p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.max(Math.abs(p.x),Math.abs(p.y))<=1e7;
const fail=message=>{throw new Error(message);};
export const MAX_PATH_NODES=500;

export function parseEditablePath(d){
  if(typeof d!=='string'||!d.trim())fail('此路径没有可编辑节点。');
  const tokens=[];let end=0;
  for(const m of d.matchAll(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)){
    const gap=d.slice(end,m.index);
    if(gap.replace(/[\s,]/g,'')||(gap.includes(',')&&((gap.match(/,/g)||[]).length>1||!tokens.length||/^[a-zA-Z]$/.test(tokens.at(-1))||/^[a-zA-Z]$/.test(m[0]))))fail('路径命令不完整，原路径保留。');
    tokens.push(m[0]);end=m.index+m[0].length;
    if(tokens.length>MAX_PATH_NODES*8)fail(`节点过多，暂只编辑 ${MAX_PATH_NODES} 个以内的路径。`);
  }
  if(d.slice(end).trim())fail('路径命令不完整，原路径保留。');
  const model={subpaths:[]};let current=point(0,0),part=null,command=null,previous='',lastControl=null,i=0,count=0;
  const isCommand=t=>/^[a-zA-Z]$/.test(t||'');
  while(i<tokens.length){
    if(isCommand(tokens[i]))command=tokens[i++];
    if(!command)fail('路径缺少命令，原路径保留。');
    const op=command.toUpperCase(),relative=command!==op;
    if(op==='Z'){
      if(!part||part.closed)fail('闭合路径命令不完整，原路径保留。');
      if(part.nodes.length>1&&same(current,part.nodes[0]))part.nodes.pop();
      else if(part.nodes.length>1)part.segments.push({type:'L',implicitClose:true});
      part.closed=true;current={...part.nodes[0]};previous='Z';lastControl=null;command=null;continue;
    }
    const size=arity[op];if(!size)fail(`暂不支持路径命令 ${command}，原路径保留。`);
    const values=[];
    for(let parameter=0;parameter<size;parameter++){
      const token=tokens[i];if(token===undefined||isCommand(token))fail('路径参数不完整，原路径保留。');
      if(op==='A'&&(parameter===3||parameter===4)){
        // Flags may be adjacent to one another or the following coordinate.
        if(!/^[01]/.test(token))fail('圆弧方向与大小标志必须为 0 或 1。');
        values.push(Number(token[0]));if(token.length===1)i++;else tokens[i]=token.slice(1);
      }else{values.push(Number(token));i++;}
    }
    if(values.some(v=>!Number.isFinite(v)||Math.abs(v)>1e7))fail('路径坐标超出编辑范围。');
    const pair=(offset)=>point(values[offset]+(relative?current.x:0),values[offset+1]+(relative?current.y:0));
    if(op==='M'){
      current=pair(0);part={nodes:[current],segments:[],closed:false};model.subpaths.push(part);command=relative?'l':'L';lastControl=null;
    }else{
      if(!part||part.closed)fail('每个子路径须以 M 开始；原路径保留。');
      let segment={type:'L'},next;
      if(op==='H')next=point(values[0]+(relative?current.x:0),current.y);
      else if(op==='V')next=point(current.x,values[0]+(relative?current.y:0));
      else if(op==='L')next=pair(0);
      else if(op==='C'||op==='S'){
        segment={type:'C',c1:op==='C'?pair(0):/[CS]/.test(previous)?reflect(lastControl,current):{...current},c2:pair(op==='C'?2:0)};
        next=pair(op==='C'?4:2);lastControl=segment.c2;
      }else if(op==='A'){segment={type:'A',rx:Math.abs(values[0]),ry:Math.abs(values[1]),rotation:values[2],largeArc:values[3],sweep:values[4]};next=pair(5);lastControl=null;
      }else{
        segment={type:'Q',q:op==='Q'?pair(0):/[QT]/.test(previous)?reflect(lastControl,current):{...current}};
        next=pair(op==='Q'?2:0);lastControl=segment.q;
      }
      if(['L','H','V'].includes(op))lastControl=null;
      part.segments.push(segment);part.nodes.push(next);current=next;
    }
    previous=op;if(++count>MAX_PATH_NODES)fail(`节点过多，暂只编辑 ${MAX_PATH_NODES} 个以内的路径。`);
  }
  if(!model.subpaths.length||!model.subpaths.some(p=>p.segments.length))fail('此路径没有可编辑线段。');
  return model;
}

const number=n=>String(Number(n.toPrecision(15)));
const xy=p=>{if(!valid(p))fail('节点必须是编辑范围内的有效坐标。');return `${number(p.x)} ${number(p.y)}`;};
export function serializeEditablePath(model){
  return model.subpaths.map(p=>{
    const commands=[`M ${xy(p.nodes[0])}`];
    p.segments.forEach((s,i)=>{
      if(s.implicitClose)return;
      const end=p.nodes[(i+1)%p.nodes.length];
      if(s.type==='A')validateArc(s);
      commands.push(s.type==='A'?`A ${number(s.rx)} ${number(s.ry)} ${number(s.rotation)} ${s.largeArc} ${s.sweep} ${xy(end)}`:s.type==='C'?`C ${xy(s.c1)} ${xy(s.c2)} ${xy(end)}`:s.type==='Q'?`Q ${xy(s.q)} ${xy(end)}`:`L ${xy(end)}`);
    });
    if(p.closed)commands.push('Z');return commands.join(' ');
  }).join(' ');
}

export function pathHandles(model,subpath,index){
  const p=model.subpaths[subpath];if(!p?.nodes[index])return [];
  const handles=[],previous=index?index-1:p.closed?p.segments.length-1:-1;
  for(const [segment,key] of [[previous,'in'],[index,'out']]){
    const s=p.segments[segment];if(!s)continue;
    if(s.type==='C'){const control=key==='in'?'c2':'c1';handles.push({segment,control,point:s[control],anchor:p.nodes[index]});}
    if(s.type==='Q'&&!handles.some(h=>h.segment===segment))handles.push({segment,control:'q',point:s.q,anchor:p.nodes[index],other:p.nodes[(segment+(key==='in'?0:1))%p.nodes.length]});
  }
  return handles;
}

export function movePathPoint(model,selection,to){
  if(!valid(to))fail('节点必须是编辑范围内的有效坐标。');
  const next=copy(model),p=next.subpaths[selection.subpath];if(!p?.nodes[selection.index])fail('节点已变化，请重新选择。');
  if(selection.control){
    const s=p.segments[selection.segment];if(!s?.[selection.control])fail('控制柄已变化，请重新选择。');s[selection.control]=point(to.x,to.y);
  }else{
    const from=p.nodes[selection.index],dx=to.x-from.x,dy=to.y-from.y;
    for(const h of pathHandles(next,selection.subpath,selection.index))p.segments[h.segment][h.control]=point(h.point.x+dx,h.point.y+dy);
    // DOMPoint coordinates are prototype accessors, so object spread loses x/y.
    p.nodes[selection.index]=point(to.x,to.y);
  }
  return next;
}

export function pathPointAt(part,index,t){
  const s=part.segments[index],a=part.nodes[index],b=part.nodes[(index+1)%part.nodes.length];
  if(s.type==='A')return arcPointAt(a,b,s,t);
  if(s.type==='L')return mix(a,b,t);
  if(s.type==='Q')return mix(mix(a,s.q,t),mix(s.q,b,t),t);
  return mix(mix(mix(a,s.c1,t),mix(s.c1,s.c2,t),t),mix(mix(s.c1,s.c2,t),mix(s.c2,b,t),t),t);
}

export function splitPathSegment(model,subpath,index,t=.5){
  if(!(t>0&&t<1))fail('新增节点须位于线段内部。');
  if(model.subpaths.reduce((n,p)=>n+p.nodes.length,0)>=MAX_PATH_NODES)fail('节点数量已达编辑上限。');
  const next=copy(model),p=next.subpaths[subpath],s=p?.segments[index];if(!s)fail('请选中有后续线段的节点。');
  const a=p.nodes[index],b=p.nodes[(index+1)%p.nodes.length];let middle,left,right;
  if(s.type==='A'){
    const g=arcGeometry(a,b,s);if(g.kind==='empty')fail('重合端点的圆弧不可见，无法在其内部新增节点。');
    middle=arcPointAt(a,b,s,t);left={...s,rx:g.rx,ry:g.ry,largeArc:g.kind==='arc'&&Math.abs(g.delta*t)>Math.PI?1:0};right={...left,largeArc:g.kind==='arc'&&Math.abs(g.delta*(1-t))>Math.PI?1:0};
  }else if(s.type==='C'){
    const ab=mix(a,s.c1,t),bc=mix(s.c1,s.c2,t),cd=mix(s.c2,b,t),abc=mix(ab,bc,t),bcd=mix(bc,cd,t);middle=mix(abc,bcd,t);
    left={type:'C',c1:ab,c2:abc};right={type:'C',c1:bcd,c2:cd};
  }else if(s.type==='Q'){
    const ab=mix(a,s.q,t),bc=mix(s.q,b,t);middle=mix(ab,bc,t);left={type:'Q',q:ab};right={type:'Q',q:bc};
  }else{middle=mix(a,b,t);left={type:'L'};right={...s};}
  p.nodes.splice(index+1,0,middle);p.segments.splice(index,1,left,right);return next;
}

export function deletePathNode(model,subpath,index){
  const next=copy(model),p=next.subpaths[subpath];if(!p?.nodes[index])fail('节点已变化，请重新选择。');
  if(p.nodes.length<=(p.closed?3:2))fail(p.closed?'闭合路径至少保留 3 个节点。':'开放路径至少保留 2 个节点。');
  const reason=pathNodeDeleteReason(model,subpath,index);if(reason)fail(reason);
  const last=p.nodes.length-1;
  if(!p.closed&&(index===0||index===last)){p.nodes.splice(index,1);p.segments.splice(index===0?0:index-1,1);return next;}
  const before=(index+last)%(last+1),after=(index+1)%(last+1),incoming=p.segments[before],outgoing=p.segments[index];
  let merged={type:'L',...(outgoing.implicitClose?{implicitClose:true}:{})};
  if(incoming.type!=='L'||outgoing.type!=='L'){
    const a=p.nodes[before],b=p.nodes[after],removed=p.nodes[index];
    merged={type:'C',c1:incoming.type==='C'?incoming.c1:incoming.type==='Q'?mix(a,incoming.q,2/3):mix(a,removed,1/3),c2:outgoing.type==='C'?outgoing.c2:outgoing.type==='Q'?mix(b,outgoing.q,2/3):mix(removed,b,2/3)};
  }
  p.nodes.splice(index,1);
  if(index===0){p.segments.shift();p.segments[p.segments.length-1]=merged;}
  else p.segments.splice(index-1,2,merged);
  return next;
}

function validateArc(s){
  if(['rx','ry','rotation'].some(k=>!Number.isFinite(s[k])||Math.abs(s[k])>1e7)||s.rx<0||s.ry<0||![0,1].includes(s.largeArc)||![0,1].includes(s.sweep))fail('圆弧参数须为有效数值；半径不能为负。');
}
export function updatePathArc(model,subpath,index,changes){
  const next=copy(model),s=next.subpaths[subpath]?.segments[index];if(s?.type!=='A')fail('请先选择一个圆弧段。');
  for(const key of ['rx','ry','rotation','largeArc','sweep'])if(key in changes)s[key]=changes[key];
  validateArc(s);return next;
}
export function pathNodeDeleteReason(model,subpath,index){
  const p=model.subpaths[subpath];if(!p?.nodes[index])return '节点已变化，请重新选择。';
  if(p.nodes.length<=(p.closed?3:2))return p.closed?'闭合路径至少保留 3 个节点。':'开放路径至少保留 2 个节点。';
  if(!p.closed&&(index===0||index===p.nodes.length-1))return '';
  if([p.segments[(index+p.nodes.length-1)%p.nodes.length],p.segments[index]].some(s=>s?.type==='A'))return '暂不删除连接圆弧的内部节点，以免将不同圆弧有损合并。可移动端点或调整半径。';
  return '';
}
