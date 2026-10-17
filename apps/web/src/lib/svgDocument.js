// Native SVG is the source of truth. Never reconstruct it through a canvas object model.
export const SVG_NS = 'http://www.w3.org/2000/svg';
export const MAX_SVG_BYTES = 2 * 1024 * 1024;
export const DRAWABLE = new Set(['g','text','tspan','rect','circle','ellipse','line','path','polygon','polyline','image','use']);
const TAGS = new Set(['svg','g','defs','title','desc','metadata','text','tspan','textPath','rect','circle','ellipse','line','path','polygon','polyline','image','use','marker','linearGradient','radialGradient','stop','clipPath','mask','pattern','style']);
const CSS_PROPERTIES = new Set(('fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit opacity color stop-color stop-opacity font font-family font-size font-style font-weight font-variant letter-spacing word-spacing text-anchor dominant-baseline alignment-baseline baseline-shift paint-order clip-path clip-rule mask marker marker-start marker-mid marker-end visibility display vector-effect').split(' '));
const fail = message => { throw new Error(message); };
const localReferences = value => [...value.matchAll(/url\(\s*['"]?#([^\s)'";]+)['"]?\s*\)/gi)].map(m => m[1]);
function checkCssValue(value) {
  if (/[\\@]|\/\*|expression\s*\(|javascript:|https?:|file:|data:/i.test(value)) fail('包含不受支持的 CSS 或外部资源，保留原件但不执行。');
  if (/url\s*\(/i.test(value.replace(/url\(\s*['"]?#[^\s)'";]+['"]?\s*\)/gi,''))) fail('仅允许 SVG 内部的样式引用。');
}
function checkDeclarations(text) {
  for (const declaration of text.split(';').filter(s => s.trim())) {
    const colon = declaration.indexOf(':');
    const name = declaration.slice(0,colon).trim().toLowerCase();
    if (colon < 1 || !CSS_PROPERTIES.has(name)) fail(`暂不支持样式属性 ${name || declaration}，原件已保留。`);
    checkCssValue(declaration.slice(colon+1));
  }
}
export function parseSvg(source, { assignIds = true } = {}) {
  if (typeof source !== 'string' || new TextEncoder().encode(source).length > MAX_SVG_BYTES) fail('SVG 为空或超过 2 MB 的编辑上限。');
  if (/<!DOCTYPE|<!ENTITY|<\?/i.test(source.replace(/^\s*<\?xml[^?]*\?>/,''))) fail('SVG 含不支持的实体或处理指令。');
  const doc = new window.DOMParser().parseFromString(source,'image/svg+xml');
  const root = doc.documentElement;
  if (doc.querySelector('parsererror') || root.localName !== 'svg' || root.namespaceURI !== SVG_NS) fail('SVG 尚不完整或不是有效 SVG，继续保留上一可显示版本。');
  const nodes = [root,...root.querySelectorAll('*')];
  if (nodes.length > 12000) fail('SVG 元素过多，保留原件；暂不开放直接编辑。');
  const ids = new Set(), editorIds = new Set(), refs = [];
  const warnings = [];
  for (const node of nodes) {
    // Metadata is inert, but active elements and event attributes remain forbidden there too.
    const metadata = !!node.closest('metadata');
    if (metadata && node.namespaceURI === 'http://www.w3.org/1999/xhtml') fail('SVG 元数据包含 HTML，保留原件但不载入编辑画布。');
    if (!metadata && (node.namespaceURI !== SVG_NS || !TAGS.has(node.localName))) fail(`暂不支持 <${node.localName}>，原件保留，未做有损转换。`);
    if (['script','foreignObject','iframe','object','embed','animate','set','animateTransform'].includes(node.localName)) fail('SVG 含可执行或动态内容，已阻止载入。');
    for (const attr of [...node.attributes]) {
      const name=attr.localName.toLowerCase(), value=attr.value.trim();
      if (name.startsWith('on') || name === 'base' || name === 'src') fail('SVG 含事件或外部加载属性，已阻止载入。');
      if (name === 'href') {
        if (value.startsWith('#')) refs.push(value.slice(1));
        else if (node.localName === 'image' && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=\s]+$/i.test(value)) { /* inert raster */ }
        else fail('不加载外部链接或外部图片；请使用内嵌 PNG/JPEG/WebP。');
      }
      if (name === 'style') checkDeclarations(value);
      if (/url\s*\(/i.test(value)) { checkCssValue(value); refs.push(...localReferences(value)); }
    }
    if (node.id) { if(ids.has(node.id)) fail(`重复元素标识 ${node.id}，无法可靠编辑引用。`); ids.add(node.id); }
    if (node.localName === 'style') {
      const css=node.textContent;
      checkCssValue(css);
      const rules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
      if (css.replace(/([^{}]+)\{([^{}]*)\}/g,'').trim() || /:host|::|[<>]/i.test(css)) fail('暂不支持此 SVG 样式表，保留原件。');
      rules.forEach(([,selector,body])=>{ if (!selector.trim()) fail('无效样式选择器。'); checkDeclarations(body); refs.push(...localReferences(body)); });
    }
    if (assignIds && DRAWABLE.has(node.localName) && !node.hasAttribute('data-tuyan-wrapper') && !node.closest('defs,clipPath,mask,marker,pattern')) {
      let id=node.getAttribute('data-tuyan-id');
      if (!id || editorIds.has(id)) { let n=editorIds.size+1; do { id=`ty-${n++}`; } while(editorIds.has(id) || root.querySelector(`[data-tuyan-id="${id}"]`)); node.setAttribute('data-tuyan-id',id); }
      editorIds.add(id);
    }
  }
  for (const id of refs) if (!ids.has(id)) fail(`引用 #${id} 尚未完整，继续显示上一版本。`);
  // use cycles can hang browser renderers. Bound the reference graph before rendering.
  function visit(id, stack) {
    if(stack.includes(id) || stack.length>24) fail('SVG 引用循环或嵌套过深。');
    const node=nodes.find(n=>n.id===id); if(!node)return;
    for(const use of [node,...node.querySelectorAll('use')].filter(n=>n.localName==='use')) {
      const href=use.getAttribute('href') || use.getAttributeNS('http://www.w3.org/1999/xlink','href');
      if(href?.startsWith('#'))visit(href.slice(1),[...stack,id]);
    }
  }
  for(const use of root.querySelectorAll('use')) { const href=use.getAttribute('href') || use.getAttributeNS('http://www.w3.org/1999/xlink','href'); if(href?.startsWith('#'))visit(href.slice(1),[]); }
  if(root.querySelector('image')) warnings.push('包含内嵌位图：可移动和缩放，位图内部元素不可编辑。图片宽高比与裁剪在不同查看器中可能显示不同，导出后请核对；未改写原图片结构。');
  if(root.querySelector('clipPath,mask,pattern,use,textPath')) warnings.push('裁剪、蒙版、图案、引用与路径文字保留原有结构；本版不提供其内部参数编辑。');
  if(root.querySelector('text')) warnings.push('文字保持为文字；显示依赖本机字体，导出不附带字体。');
  else if(root.querySelector('path'))warnings.push('此 SVG 没有独立文字元素；若字形已转成路径，本版保留原路径，不能直接改字。');
  let box=(root.getAttribute('viewBox') || '').trim().split(/[ ,]+/).map(Number);
  if(box.length!==4 || box.some(v=>!Number.isFinite(v)) || box[2]<=0 || box[3]<=0) {
    const width=Number(root.getAttribute('width')),height=Number(root.getAttribute('height'));
    if(!(width>0 && height>0)) fail('SVG 缺少有效 viewBox 或数字宽高，无法确定画布比例。');
    box=[0,0,width,height]; root.setAttribute('viewBox',box.join(' '));
  }
  if(box.some(v=>Math.abs(v)>1000000))fail('SVG 坐标超出编辑范围。');
  return { doc, root, box, svg:serializeSvg(root), warnings };
}
export const serializeSvg = root => new window.XMLSerializer().serializeToString(root);
export const findSvgNode = (root,id) => [...root.querySelectorAll('[data-tuyan-id]')].find(n=>n.getAttribute('data-tuyan-id')===id);
export function selectionOwner(root,target,deep=false) {
  while(target && target!==root && !target.hasAttribute('data-tuyan-id'))target=target.parentElement;
  if(!target || target===root)return null;
  if(deep)return target;
  let owner=target,parent=target.parentElement;
  while(parent && parent!==root) {
    if(parent.hasAttribute('data-tuyan-wrapper')){parent=parent.parentElement;continue;}
    if(!parent.hasAttribute('data-tuyan-id'))break;
    owner=parent;parent=parent.parentElement;
  }
  return owner;
}
export function changeSvg(source, change) {
  const {root}=parseSvg(source); change(root); return parseSvg(serializeSvg(root)).svg;
}
export function setSvgAttribute(node,name,value) {
  // Presentation properties in style override attributes. Edit both representations consistently.
  if(node.style && CSS_PROPERTIES.has(name)) node.style.setProperty(name,String(value),'important');
  node.setAttribute(name,String(value));
}
export function topSelection(root, ids) {
  const selected=ids.map(id=>findSvgNode(root,id)).filter(Boolean);
  return selected.filter(n=>!selected.some(other=>other!==n && other.contains(n)));
}
// Evaluate structural edits on a detached copy first. Simple scoped styles can
// remain intact; new matches, removed matches or dynamic selectors are unsafe.
function withStableGroupingStyles(root,edit) {
  const styles=[...root.querySelectorAll('style')];
  if(!styles.length){edit(root);return;}
  const selectors=styles.flatMap(style=>[...style.textContent.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap(m=>m[1].split(',').map(s=>s.trim())));
  if(selectors.some(s=>/[:+~\[\]]/.test(s)))fail('此样式表使用动态、位置或属性选择器，改变分组可能改变外观；原分组保留。');
  const trial=root.cloneNode(true);let before;
  try{before=selectors.map(selector=>new Set(trial.querySelectorAll(selector)));}catch{fail('此样式表选择器暂不能核对，原分组保留。');}
  edit(trial);
  const stable=selectors.every((selector,i)=>{const after=[...trial.querySelectorAll(selector)];return after.length===before[i].size&&after.every(node=>before[i].has(node));});
  if(!stable)fail('此样式表的匹配对象会随分组变化，可能改变外观；原分组保留。');
  edit(root);
}
export function groupSvg(root,ids){return withStableGroupingStyles(root,trial=>applyGroupSvg(trial,ids));}
export function ungroupSvg(root,ids){return withStableGroupingStyles(root,trial=>applyUngroupSvg(trial,ids));}
function applyGroupSvg(root,ids) {
  // Ungroup keeps single-child wrappers to preserve inherited style/transforms.
  // Regroup those wrappers as atomic units instead of moving their children out.
  const nodes=[...new Set(topSelection(root,ids).map(node=>{
    while(node.parentElement?.hasAttribute('data-tuyan-wrapper') && node.parentElement.children.length===1)node=node.parentElement;
    return node;
  }))];
  if(nodes.length<2 || nodes.some(n=>n.parentNode!==nodes[0].parentNode)) fail('分组需选择同一父组中的两个以上对象；避免改变裁剪和继承样式。');
  const parent=nodes[0].parentNode, ordered=[...parent.children].filter(n=>nodes.includes(n));
  const between=[...parent.children].slice([...parent.children].indexOf(ordered[0]),[...parent.children].indexOf(ordered.at(-1))+1);
  if(between.some(n=>!nodes.includes(n)))fail('请先调整层级，使待分组对象相邻，避免分组改变遮挡顺序。');
  const group=root.ownerDocument.createElementNS(SVG_NS,'g');
  parent.insertBefore(group,ordered[0]); ordered.forEach(n=>group.append(n));
}
function applyUngroupSvg(root,ids) {
  for(const node of topSelection(root,ids)) {
    if(node.localName!=='g')continue;
    if(['opacity','clip-path','mask','filter'].some(name=>node.hasAttribute(name)||node.style.getPropertyValue(name)))fail('此分组有整体透明度、裁剪或蒙版，取消分组可能改变外观；原组保持不变。');
    // A transformed/styled/clipped group is a semantic boundary. Retain wrappers per child.
    for(const child of [...node.childNodes]) {
      if(child.nodeType!==1){node.parentNode.insertBefore(child,node);continue;}
      const attrs=[...node.attributes].filter(a=>!['id','data-tuyan-id'].includes(a.name));
      if(!attrs.length){node.parentNode.insertBefore(child,node);continue;}
      const wrapper=node.cloneNode(false);wrapper.removeAttribute('id');wrapper.removeAttribute('data-tuyan-id');wrapper.setAttribute('data-tuyan-wrapper','true');
      wrapper.append(child);node.parentNode.insertBefore(wrapper,node);
    }
    // Keep referenced IDs as empty anchors rather than silently breaking URL references.
    const id=node.id;
    if(id && [...root.querySelectorAll('*')].some(n=>[...n.attributes].some(a=>a.value===`#${id}` || a.value.includes(`url(#${id})`)))) fail('此分组被其他对象引用，暂不支持取消分组。');
    node.remove();
  }
}
export function reorderSvg(root,ids,direction) {
  const nodes=topSelection(root,ids);
  if(direction==='front')nodes.forEach(n=>n.parentNode.append(n));
  if(direction==='back')[...nodes].reverse().forEach(n=>n.parentNode.insertBefore(n,n.parentNode.firstChild));
}
export function arrowPoints(node) {
  if(node.localName==='line')return ['x1','y1','x2','y2'].map(k=>Number(node.getAttribute(k)||0));
  if(['polyline','polygon'].includes(node.localName)) {
    const p=(node.getAttribute('points')||'').trim().split(/[ ,]+/).map(Number);
    return p.length>=4 && p.every(Number.isFinite)?[...p.slice(0,2),...p.slice(-2)]:null;
  }
  if(node.localName==='path') {
    const d=node.getAttribute('d')||'';
    const simple=d.match(/^\s*M\s*([-+\d.e]+)[ ,]+([-+\d.e]+)\s*L\s*([-+\d.e]+)[ ,]+([-+\d.e]+)\s*$/i);
    if(simple && !/[ml]/.test(d))return simple.slice(1).map(Number);
  }
  return null;
}
export function setArrowPoints(node,p) {
  if(!p.every(Number.isFinite))fail('端点必须是有效坐标。');
  if(node.localName==='line') ['x1','y1','x2','y2'].forEach((k,i)=>node.setAttribute(k,p[i]));
  else if(['polyline','polygon'].includes(node.localName)) {
    const values=(node.getAttribute('points')||'').trim().split(/[ ,]+/).map(Number);
    values.splice(0,2,...p.slice(0,2));values.splice(-2,2,...p.slice(2));node.setAttribute('points',values.join(' '));
  } else if(node.localName==='path' && arrowPoints(node)) node.setAttribute('d',`M ${p[0]} ${p[1]} L ${p[2]} ${p[3]}`);
  else fail('曲线端点编辑尚未支持；可以移动、缩放和调整描边，原曲线保留。');
}
export function setArrowDirection(root,node,direction) {
  let defs=root.querySelector('defs'); if(!defs){defs=root.ownerDocument.createElementNS(SVG_NS,'defs');root.prepend(defs);}
  let marker=[...defs.querySelectorAll('marker')].find(n=>n.getAttribute('data-tuyan-arrow')==='true');
  if(!marker){
    marker=root.ownerDocument.createElementNS(SVG_NS,'marker');let n=1;while(root.querySelector(`[id="ty-arrow-${n}"]`))n++;
    Object.entries({id:`ty-arrow-${n}`,viewBox:'0 0 10 10',refX:'9',refY:'5',markerWidth:'6',markerHeight:'6',orient:'auto-start-reverse','data-tuyan-arrow':'true'}).forEach(([k,v])=>marker.setAttribute(k,v));
    const path=root.ownerDocument.createElementNS(SVG_NS,'path');path.setAttribute('d','M 0 0 L 10 5 L 0 10 Z');path.setAttribute('fill','context-stroke');marker.append(path);defs.append(marker);
  }
  for(const end of ['start','end'])setSvgAttribute(node,`marker-${end}`,direction==='both'||direction===end?`url(#${marker.id})`:'none');
}
export function svgHistory(svg) { return {past:[],present:svg,future:[]}; }
export function historyChange(history,svg) {
  if(svg===history.present)return history;
  const past=[...history.past,history.present].slice(-40);
  while(past.length>1 && past.reduce((sum,s)=>sum+s.length*2,0)>16*1024*1024)past.shift();
  return {past,present:svg,future:[]};
}
export function historyStep(history, direction) {
  if(direction==='undo' && history.past.length)return {past:history.past.slice(0,-1),present:history.past.at(-1),future:[history.present,...history.future]};
  if(direction==='redo' && history.future.length)return {past:[...history.past,history.present],present:history.future[0],future:history.future.slice(1)};
  return history;
}
