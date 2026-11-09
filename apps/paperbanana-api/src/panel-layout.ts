import {SaxesParser} from 'saxes'
import {textAdvance} from './diagram-topology.js'
type Matrix=[number,number,number,number,number,number]
const identity:Matrix=[1,0,0,1,0,0]
const mul=(a:Matrix,b:Matrix):Matrix=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]]
const transform=(raw:string)=>{let out=identity;for(const m of raw.matchAll(/(translate|scale|rotate|matrix)\s*\(([^)]*)\)/g)){const n=m[2].trim().split(/[\s,]+/).map(Number);let v:Matrix=identity;if(m[1]==='translate')v=[1,0,0,1,n[0],n[1]||0];if(m[1]==='scale')v=[n[0],0,0,n[1]??n[0],0,0];if(m[1]==='matrix')v=n as Matrix;if(m[1]==='rotate'){const c=Math.cos(n[0]*Math.PI/180),s=Math.sin(n[0]*Math.PI/180);v=mul(mul([1,0,0,1,n[1]||0,n[2]||0],[c,s,-s,c,0,0]),[1,0,0,1,-(n[1]||0),-(n[2]||0)])}out=mul(out,v)}return out}
/** Source text + inherited transforms, measured in final panel pixels. Does not
 * move glyphs/marks or mutate validated numeric SVG. Unknown CSS is a non-pass. */
export function inspectPanelReadability(svg:string,viewport:{width:number;height:number;minFontPx:number}) {
 const issues:string[]=[],texts:any[]=[],stack:any[]=[];let viewBox:number[]=[],css=''
 const p=new SaxesParser({xmlns:true});p.on('error',e=>{throw e});p.on('opentag',t=>{
  const a=Object.fromEntries(Object.values(t.attributes).map(v=>[v.local,v.value])),parent=stack.at(-1)||{m:identity,font:16,anchor:'start'},style=a.style||'',short=style.match(/(?:^|;)\s*font\s*:[^;]*?([\d.]+)px(?:\s|\/)/),explicit=style.match(/font-size\s*:\s*([\d.]+)(px|pt)?/),font=+(a['font-size']||explicit?.[1]||short?.[1]||parent.font),m=mul(parent.m,transform(a.transform||''))
  if(stack.length&&t.local==='svg')issues.push('unsupported_nested_viewport')
  if(t.local==='tspan')issues.push('unsupported_tspan_positioning')
  if(!stack.length)viewBox=(a.viewBox||`0 0 ${parseFloat(a.width)} ${parseFloat(a.height)}`).trim().split(/[\s,]+/).map(Number)
  if(a.transform?.replace(/(?:translate|scale|rotate|matrix)\s*\([^)]*\)/g,'').trim())issues.push('unsupported_text_transform')
  stack.push({tag:t.local,a,m,font,anchor:a['text-anchor']||style.match(/text-anchor\s*:\s*(\w+)/)?.[1]||parent.anchor,text:''})
 });p.on('text',text=>{if(stack.length)stack.at(-1).text+=text});p.on('closetag',()=>{const e=stack.pop();if(e.tag==='style')css+=e.text;if(e.tag==='text'&&e.text.trim())texts.push(e)});p.write(svg).close()
 if(viewBox.length!==4||!viewBox.every(Number.isFinite)||viewBox[2]<=0||viewBox[3]<=0)return {passed:false,issues:['invalid_viewbox'],minTextPx:0,textCount:texts.length,textBounds:[]}
 // Arbitrary selector font sizing cannot safely be inferred here.
 if(/font(?:-size)?\s*:/.test(css))issues.push('unsupported_css_font_size')
 const scale=Math.min(viewport.width/viewBox[2],viewport.height/viewBox[3]),bounds:any[]=[],minimum:number[]=[]
 for(const t of texts){const [a,b,c,d,e,f]=t.m,x=parseFloat(t.a.x||'0'),y=parseFloat(t.a.y||'0'),w=textAdvance(t.text,t.font),left=t.anchor==='middle'?-w/2:t.anchor==='end'?-w:0,points=[[x+left,y-t.font],[x+left+w,y-t.font],[x+left,y+t.font*.25],[x+left+w,y+t.font*.25]].map(([x,y])=>({x:a*x+c*y+e,y:b*x+d*y+f})),minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y)),trace=a*a+b*b+c*c+d*d,det=a*d-b*c,minScale=Math.sqrt(Math.max(0,(trace-Math.sqrt(Math.max(0,trace*trace-4*det*det)))/2)),fontPx=t.font*minScale*scale
  minimum.push(fontPx);if(!Number.isFinite(fontPx)||fontPx<viewport.minFontPx-.1)issues.push('text_below_minimum:'+t.text)
  if(minX<viewBox[0]-.1||minY<viewBox[1]-.1||maxX>viewBox[0]+viewBox[2]+.1||maxY>viewBox[1]+viewBox[3]+.1)issues.push('text_outside_source:'+t.text)
  bounds.push({text:t.text,x:minX,y:minY,width:maxX-minX,height:maxY-minY,fontPx})
 }
 for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++){const a=bounds[i],b=bounds[j];if(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>1)issues.push('possible_text_overlap:'+a.text+' / '+b.text)}
 if(!texts.length)issues.push('no_measurable_editable_text')
 return {passed:issues.length===0,issues:[...new Set(issues)],minTextPx:Math.min(...minimum),textCount:texts.length,sourceViewBox:viewBox,uniformScale:scale,textBounds:bounds}
}
