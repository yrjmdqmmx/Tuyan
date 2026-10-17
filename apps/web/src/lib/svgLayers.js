import {findSvgNode,topSelection} from './svgDocument.js';

const LOCK='data-tuyan-locked',HIDE='data-tuyan-hidden';
const active=(node,attr)=>node?.getAttribute(attr)==='true';
export function svgLayerState(node) {
  let parent=node?.parentElement,inheritedLocked=false,inheritedHidden=false;
  while(parent){inheritedLocked ||= active(parent,LOCK);inheritedHidden ||= active(parent,HIDE);parent=parent.parentElement;}
  const ownLocked=active(node,LOCK),ownHidden=active(node,HIDE);
  return {ownLocked,ownHidden,inheritedLocked,inheritedHidden,locked:ownLocked||inheritedLocked,hidden:ownHidden||inheritedHidden};
}
export function svgEditBlockReason(node) {
  if(!node)return '对象已不在当前版本中。';
  const state=svgLayerState(node);
  if(state.locked)return '对象或父组已锁定，请在图层 / 对象中解锁后编辑。';
  if(state.hidden)return '对象或父组已隐藏，请在图层 / 对象中显示后编辑。';
  if(node.querySelector(`[${LOCK}="true"],[${HIDE}="true"]`))return '此分组包含锁定或隐藏的对象，请先解锁或显示，再修改整个分组。';
  return '';
}
export function assertSvgEditable(root,ids) {
  for(const id of ids){const reason=svgEditBlockReason(findSvgNode(root,id));if(reason)throw new Error(reason);}
}
export function setSvgLocked(root,id,locked) {
  const node=findSvgNode(root,id);if(!node)throw new Error('对象已不在当前版本中。');
  if(svgLayerState(node).inheritedLocked)throw new Error('锁定来自父组，请先解锁父组。');
  if(locked)node.setAttribute(LOCK,'true');else node.removeAttribute(LOCK);
}
export function setSvgHidden(root,id,hidden) {
  const node=findSvgNode(root,id);if(!node)throw new Error('对象已不在当前版本中。');
  if(svgLayerState(node).inheritedHidden)throw new Error('隐藏来自父组，请先显示父组。');
  if(active(node,HIDE)===hidden)return;
  if(hidden){
    // Keep the exact authored style, including absence, for lossless show/undo.
    // display:none removes the entire subtree, even children with visibility:visible.
    node.setAttribute('data-tuyan-hidden-style',node.getAttribute('style')||'');
    node.setAttribute('data-tuyan-hidden-had-style',String(node.hasAttribute('style')));
    node.setAttribute(HIDE,'true');node.style.setProperty('display','none','important');
  }else{
    if(node.getAttribute('data-tuyan-hidden-had-style')==='true')node.setAttribute('style',node.getAttribute('data-tuyan-hidden-style')||'');
    else node.removeAttribute('style');
    for(const attr of [HIDE,'data-tuyan-hidden-style','data-tuyan-hidden-had-style'])node.removeAttribute(attr);
  }
}
function orderUnit(node) {
  while(node.parentElement?.hasAttribute('data-tuyan-wrapper')&&node.parentElement.children.length===1)node=node.parentElement;
  return node;
}
function checkOrder(root,units) {
  for(const style of root.querySelectorAll('style'))for(const [,selector] of style.textContent.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if(/[:+~\[\]]/.test(selector))throw new Error('此 SVG 使用位置、状态或属性选择器，排序可能改变其他对象外观，暂不执行。');
  }
  if(units.some(n=>n.matches('tspan,textPath')||n.parentElement?.matches('text,tspan,textPath')))throw new Error('文字片段排序会改变文字或公式含义；请调整完整文字对象的层级。');
  if(units.some(n=>n.querySelector('style')))throw new Error('此分组包含全局样式表，排序可能改变整张图的样式优先级，暂不执行。');
}
// Tree order is front to back; SVG document order is back to front.
export function sortSvgObject(root,id,targetId,position) {
  if(!['before','after'].includes(position))throw new Error('无效排序位置。');
  if(id===targetId)return;
  assertSvgEditable(root,[id]);
  const node=findSvgNode(root,id),target=findSvgNode(root,targetId);
  if(!target)throw new Error('排序目标已不在当前版本中。');
  const from=orderUnit(node),to=orderUnit(target);
  if(from===to||from.parentElement!==to.parentElement)throw new Error('仅支持同一父组内排序；跨组会改变坐标、裁剪或继承样式。');
  checkOrder(root,[from,to]);
  if(position==='before')to.after(from);else to.before(from);
}
export function reorderSvgLayers(root,ids,direction) {
  assertSvgEditable(root,ids);
  const units=[...new Set(topSelection(root,ids).map(orderUnit))];checkOrder(root,units);
  // Keep their original paint order even if multi-selection was made in reverse.
  const documentOrder=[...root.querySelectorAll('*')];units.sort((a,b)=>documentOrder.indexOf(a)-documentOrder.indexOf(b));
  if(direction==='front')units.forEach(n=>n.parentElement.append(n));
  else if(direction==='back')[...units].reverse().forEach(n=>n.parentElement.prepend(n));
}
export function assertSvgResourceEditable(root) {
  if(root.querySelector(`[${LOCK}="true"],[${HIDE}="true"]`))throw new Error('共享渐变可能影响锁定或隐藏的对象，请先解锁并显示对象，再修改共享色标。');
}
