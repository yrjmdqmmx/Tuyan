import { useEffect, useRef, useState } from 'react';

function paint(context, mask, preview = false) {
  context.clearRect(0,0,context.canvas.width,context.canvas.height);
  if (!preview) { context.fillStyle='#000'; context.fillRect(0,0,mask.width,mask.height); }
  context.lineCap='round'; context.lineJoin='round';
  for (const stroke of mask.strokes) {
    context.globalCompositeOperation = preview && stroke.erase ? 'destination-out' : 'source-over';
    context.strokeStyle = context.fillStyle = preview ? 'rgba(215,93,42,.7)' : stroke.erase ? '#000' : '#fff';
    context.lineWidth = stroke.size;
    context.beginPath(); context.arc(stroke.points[0][0],stroke.points[0][1],stroke.size/2,0,Math.PI*2); context.fill();
    context.beginPath(); context.moveTo(...stroke.points[0]);
    for (const point of stroke.points.slice(1)) context.lineTo(...point);
    context.stroke();
  }
  context.globalCompositeOperation='source-over';
}
export async function refineMaskFile(mask) {
  if (!mask?.strokes?.length) return undefined;
  const canvas=document.createElement('canvas'); canvas.width=mask.width; canvas.height=mask.height;
  const context=canvas.getContext('2d'); paint(context,mask);
  const pixels=context.getImageData(0,0,mask.width,mask.height);
  let selected=false;
  for (let i=0;i<pixels.data.length;i+=4) { const value=pixels.data[i]>127?255:0; pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value; pixels.data[i+3]=255; selected ||= value===255; }
  if (!selected) throw new Error('遮罩为空，请标记修改区域或清除遮罩。');
  context.putImageData(pixels,0,0);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if (!blob) throw new Error('遮罩导出失败，请重试。');
  return new File([blob],'refine-mask.png',{type:'image/png'});
}
export default function RefineMaskEditor({source, value, onChange, disabled}) {
  const canvas=useRef(null), drawing=useRef(null);
  const [dimensions,setDimensions]=useState(null), [size,setSize]=useState(4), [erase,setErase]=useState(false);
  useEffect(()=>{setDimensions(null);drawing.current=null;},[source.url]);
  useEffect(()=>{
    if (!canvas.current || !dimensions) return;
    const ctx=canvas.current.getContext('2d');
    ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.scale(ctx.canvas.width/dimensions.width,ctx.canvas.height/dimensions.height);
    if (value?.sourceId===source.url) paint(ctx,value,true);
  },[value,dimensions,source.url]);
  const point=event=>{const rect=canvas.current.getBoundingClientRect();return [Math.max(0,Math.min(dimensions.width,(event.clientX-rect.left)*dimensions.width/rect.width)),Math.max(0,Math.min(dimensions.height,(event.clientY-rect.top)*dimensions.height/rect.height))];};
  function start(event) {
    if (disabled || !dimensions || event.button!==0) return;
    canvas.current.setPointerCapture(event.pointerId);
    const stroke={size:Math.max(2,Math.min(dimensions.width,dimensions.height)*size/100),erase,points:[point(event)]};
    const next={sourceId:source.url,...dimensions,strokes:[...(value?.sourceId===source.url?value.strokes:[]),stroke]};
    drawing.current=next; onChange(next);
  }
  return <section className="refine-mask-editor" aria-label="修改区域">
    <div className="refine-control-head"><strong>标记修改区域</strong><button type="button" disabled={disabled || !value} onClick={()=>{drawing.current=null;onChange(null);}}>清除遮罩</button></div>
    <p>橙色区域允许修改；提交时转换为白色修改、黑色保留的遮罩，尺寸与原图一致。模型仍可能影响边界附近像素。</p>
    <div className="refine-mask-tools"><label>笔刷大小<input aria-label="笔刷大小" type="range" min="1" max="20" value={size} disabled={disabled} onChange={e=>setSize(Number(e.target.value))}/></label><button type="button" aria-pressed={erase} disabled={disabled} onClick={()=>setErase(v=>!v)}>{erase?'正在擦除':'切换橡皮擦'}</button><button type="button" disabled={disabled || !value?.strokes.length} onClick={()=>onChange({...value,strokes:value.strokes.slice(0,-1)})}>撤销一笔</button></div>
    <div className="refine-mask-canvas"><img src={source.url} alt="遮罩底图" onLoad={event=>setDimensions({width:event.target.naturalWidth,height:event.target.naturalHeight})}/>{dimensions && <canvas ref={canvas} aria-label="在原图上涂抹修改区域" width={Math.min(960,dimensions.width)} height={Math.round(dimensions.height*Math.min(960,dimensions.width)/dimensions.width)} onPointerDown={start} onPointerMove={event=>{if (!drawing.current || disabled) return;const strokes=drawing.current.strokes;const last=strokes.at(-1);if(last.points.length>=10000)return;const next={...drawing.current,strokes:[...strokes.slice(0,-1),{...last,points:[...last.points,point(event)]}]};drawing.current=next;onChange(next);}} onPointerUp={()=>{drawing.current=null;}} onPointerCancel={()=>{drawing.current=null;}}/>}</div>
  </section>;
}
