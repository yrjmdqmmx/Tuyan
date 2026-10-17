// A panel may float only when it leaves the object and its handles clear.
export function inspectorPosition(width,height,panel,avoid){
  const pad=10,w=panel.width,h=panel.height;
  if(w>width-2*pad||h>height-2*pad)return null;
  const candidates=[[width-w-pad,pad],[width-w-pad,height-h-pad],[pad,pad],[pad,height-h-pad]];
  for(const [left,top] of candidates){if(!avoid||left+w<avoid.left||left>avoid.right||top+h<avoid.top||top>avoid.bottom)return {left,top};}
  return null;
}
