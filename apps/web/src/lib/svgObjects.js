import {SVG_NS,setArrowDirection,setSvgAttribute,topSelection} from './svgDocument.js';

import {svgLayerState,svgEditBlockReason} from './svgLayers.js';

const labels={g:'分组',text:'文字',tspan:'文字片段',rect:'矩形',circle:'圆形',ellipse:'椭圆',line:'连线',path:'路径',polygon:'多边形',polyline:'折线',image:'图片',use:'引用',svg:'嵌套画布'};
const excluded='defs,metadata,clipPath,mask,marker,pattern';
export function svgObjectTree(root) {
  function children(parent) {
    return [...parent.children].reverse().flatMap(node=>{
      if(node.matches(excluded))return [];
      const id=node.getAttribute('data-tuyan-id'),nested=children(node);
      if(!id&&node.localName!=='svg')return nested;
      const text=['text','tspan'].includes(node.localName)?node.textContent.trim().replace(/\s+/g,' ').slice(0,48):'';
      return [{id,...svgLayerState(node),editBlocked:!!svgEditBlockReason(node),key:id||`viewport-${[...root.querySelectorAll('svg')].indexOf(node)}`,label:`${labels[node.localName]||node.localName}${text?` · ${text}`:node.id?` · ${node.id}`:''}`,children:nested}];
    });
  }
  return children(root);
}
function unique(root,attribute,prefix,reserved=new Set()) {
  const used=new Set([...root.querySelectorAll(`[${attribute}]`),root].map(n=>n.getAttribute(attribute)));
  if(attribute==='id')for(const style of root.querySelectorAll('style'))for(const [,id] of style.textContent.matchAll(/#([-\w\u0080-\uFFFF]+)/g))used.add(id);
  let i=1;while(used.has(`${prefix}-${i}`)||reserved.has(`${prefix}-${i}`))i++;
  const id=`${prefix}-${i}`;reserved.add(id);return id;
}
function structuralEditAllowed(root) {
  // Inserting/removing siblings can restyle unrelated objects under positional CSS.
  for(const style of root.querySelectorAll('style'))for(const [,selector] of style.textContent.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if(/[:+~\[\]]/.test(selector))throw new Error('此 SVG 使用位置、状态或属性选择器，新增、复制和删除可能改变其他对象外观；请保留原件，暂不执行此操作。');
  }
}
const nodesWithin=node=>[node,...node.querySelectorAll('*')];
const rewriteUrls=(value,map)=>value.replace(/url\(\s*(['"]?)#([^\s)'";]+)\1\s*\)/gi,(match,quote,id)=>map.has(id)?`url(#${map.get(id)})`:match);
export function duplicateSvgObjects(root,ids,{offset=12}={}) {
  structuralEditAllowed(root);
  const nodes=topSelection(root,ids);
  if(nodes.some(n=>['tspan'].includes(n.localName)))throw new Error('请在对象列表中选择完整文字后复制；单独复制文字片段会改变相邻文字的排版。');
  const pairs=nodes.map(node=>[node,node.cloneNode(true)]),map=new Map(),reserved=new Set(),editorReserved=new Set();
  // SVG stylesheets are document-wide. Originals keep them; duplicating the sheet
  // could change the cascade for every object, so copies use the existing sheet.
  for(const [,clone] of pairs)clone.querySelectorAll('style').forEach(style=>style.remove());
  for(const [,clone] of pairs)for(const node of nodesWithin(clone)) {
    if(node.id){const previous=node.id;node.id=unique(root,'id','ty-copy',reserved);map.set(previous,node.id);}
    if(node.hasAttribute('data-tuyan-id'))node.setAttribute('data-tuyan-id',unique(root,'data-tuyan-id','ty-object',editorReserved));
  }
  for(const [original,clone] of pairs) {
    for(const node of nodesWithin(clone))for(const attr of [...node.attributes]) {
      const value=attr.localName==='href'&&attr.value.startsWith('#')&&map.has(attr.value.slice(1))?`#${map.get(attr.value.slice(1))}`:rewriteUrls(attr.value,map);
      if(value!==attr.value)node.setAttributeNS(attr.namespaceURI,attr.name,value);
    }
    clone.setAttribute('transform',`translate(${offset} ${offset}) ${clone.getAttribute('transform')||''}`.trim());
    original.after(clone);
  }
  // Keep id-targeted styles on copies; do not rename original IDs or break shared defs.
  for(const style of root.querySelectorAll('style')) {
    const additions=[];
    for(const [,selectors,body] of style.textContent.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const copied=selectors.split(',').map(selector=>selector.replace(/#([-\w\u0080-\uFFFF]+)/g,(match,id)=>map.has(id)?`#${map.get(id)}`:match)).filter((selector,i)=>selector!==selectors.split(',')[i]);
      if(copied.length)additions.push(`${copied.join(',')}{${rewriteUrls(body,map)}}`);
    }
    if(additions.length)style.textContent+=`\n${additions.join('\n')}`;
  }
  return pairs.map(([,clone])=>clone.getAttribute('data-tuyan-id'));
}
export function deleteSvgObjects(root,ids) {
  structuralEditAllowed(root);
  const nodes=topSelection(root,ids),removed=new Set(nodes.flatMap(nodesWithin));
  const removedIds=new Set([...removed].map(n=>n.id).filter(Boolean));
  for(const node of [root,...root.querySelectorAll('*')]) {
    if(removed.has(node))continue;
    const values=[...node.attributes].map(a=>a.value);
    for(const attr of node.attributes)if(attr.localName==='href'&&removedIds.has(attr.value.slice(1))&&attr.value.startsWith('#'))throw new Error(`对象 #${attr.value.slice(1)} 仍被其他对象引用；请同时选择引用它的对象，或先解除引用。`);
    if(node.localName==='style')values.push(node.textContent);
    for(const value of values)for(const [,id] of value.matchAll(/url\(\s*['"]?#([^\s)'";]+)['"]?\s*\)/gi))if(removedIds.has(id))throw new Error(`对象 #${id} 仍被样式、箭头或裁剪引用，未删除。`);
  }
  if(nodes.some(n=>n.querySelector('style')))throw new Error('此对象包含全局样式表，暂不删除，以免改变其他对象外观。');
  nodes.forEach(n=>n.remove());
}
export function addSvgObject(root,kind,{fontFamily='sans-serif'}={}) {
  structuralEditAllowed(root);
  if(!['text','rect','roundrect','ellipse','circle','line','arrow','curve','arc'].includes(kind))throw new Error('不支持的新增对象。');
  const [x,y,w,h]=root.getAttribute('viewBox').split(/[ ,]+/).map(Number),unit=Math.min(w,h),cx=x+w/2,cy=y+h/2;
  const node=root.ownerDocument.createElementNS(SVG_NS,kind==='roundrect'?'rect':kind==='arrow'?'line':['curve','arc'].includes(kind)?'path':kind);
  const id=unique(root,'data-tuyan-id','ty-object');node.setAttribute('data-tuyan-id',id);
  const attrs=['curve','arc'].includes(kind)?{}:kind==='text'?{x:cx,y:cy}:['line','arrow'].includes(kind)?{x1:cx-unit*.12,y1:cy,x2:cx+unit*.12,y2:cy}:kind==='circle'?{cx,cy,r:unit*.08}:kind==='ellipse'?{cx,cy,rx:unit*.12,ry:unit*.07}:{x:cx-unit*.12,y:cy-unit*.07,width:unit*.24,height:unit*.14,...(kind==='roundrect'?{rx:unit*.02}:{})};
  Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(Number(value.toFixed(3)))));
  for(const [key,value] of Object.entries({fill:kind==='text'?'#243047':['line','arrow','curve','arc'].includes(kind)?'none':'#e8f1f5',stroke:kind==='text'?'none':'#35647d','stroke-width':Math.max(1,unit*.003),opacity:1,'fill-opacity':1,'stroke-opacity':1,'stroke-dasharray':'none',visibility:'visible',display:'inline','clip-path':'none',mask:'none','marker-start':'none','marker-mid':'none','marker-end':'none'}))setSvgAttribute(node,key,value);
  if(kind==='arc')node.setAttribute('d',`M ${cx-unit*.15} ${cy} A ${unit*.15} ${unit*.1} 0 0 1 ${cx+unit*.15} ${cy}`);
  if(kind==='curve')node.setAttribute('d',`M ${cx-unit*.18} ${cy} C ${cx-unit*.12} ${cy-unit*.12} ${cx-unit*.06} ${cy-unit*.12} ${cx} ${cy} S ${cx+unit*.12} ${cy+unit*.12} ${cx+unit*.18} ${cy}`);
  if(kind==='text'){
    node.textContent='双击修改文字';
    for(const [key,value] of Object.entries({'font-family':fontFamily,'font-size':Math.max(12,unit*.035),'font-weight':'400','font-style':'normal','text-anchor':'middle','letter-spacing':'normal','word-spacing':'normal'}))setSvgAttribute(node,key,value);
  }
  root.append(node);
  if(kind==='arrow')setArrowDirection(root,node,'end');
  return id;
}
