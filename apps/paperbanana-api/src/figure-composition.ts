import {SaxesParser} from 'saxes'
import {createHash} from 'node:crypto'
import {renderProgrammaticSvg} from './programmatic-svg.js'
import {inspectPanelReadability} from './panel-layout.js'

const escape=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const sharedFont='Noto Sans'
// Normalize the actual declarations. A later stylesheet alone is insufficient
// for inline/shorthand declarations in the static SVG renderer.
const normalizedFonts=(css:string)=>css
 .replace(/font-family\s*:\s*[^;}]+/gi,'font-family:'+sharedFont)
 .replace(/(^|[;{])\s*font\s*:\s*([^;}]+)/gi,(_all,start,value)=>{
  const size=String(value).match(/^(.*?\b(?:\d*\.)?\d+(?:px|pt|em|rem|%)(?:\s*\/\s*[\d.]+(?:px|pt|em|rem|%)?)?)\s+.+$/i)
  if(!size)throw new Error('COMPOSITION_FONT_SHORTHAND: use explicit font-size and font-family')
  return start+'font:'+size[1]+' '+sharedFont
 })
export interface VectorPanel {label:string;typeId:string;svg:string;dataHash?:string;review?:unknown}
/** Parse, namespace and serialize every ID/reference; never concatenate unparsed
 * source documents or accept raster panels. The renderer checks the final tree. */
function panelBody(svg:string,prefix:string) {
 if(Buffer.byteLength(svg)>5*1024*1024 || /<!\s*(DOCTYPE|ENTITY)\b/i.test(svg))throw new Error('COMPOSITION_INVALID_SOURCE')
 const parser=new SaxesParser({xmlns:true}),parts:string[]=[]
 let depth=0,count=0,viewBox='',skip=0,styleDepth=0,styleText='',sourceRoot=prefix+'sourceRoot'
 const refs=(value:string)=>value.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g,(_,q,id)=>`url(#${prefix}${id})`)
 const scopedCss=(value:string)=>normalizedFonts(refs(value)).replace(/(^|})\s*([^{}]+)\{/g,(_,boundary,selectors)=>boundary+selectors.split(',').map((selector:string)=>`#${prefix}scope `+selector.trim().replace(/:root\b/g,'#'+sourceRoot.slice(prefix.length)).replace(/#([A-Za-z_][\w:.-]*)/g,(_s,id)=>'#'+prefix+id)).join(',')+'{')
 parser.on('error',e=>{throw e})
 parser.on('processinginstruction',()=>{throw new Error('COMPOSITION_ACTIVE_CONTENT')})
 parser.on('opentag',tag=>{
  if(++count>20000||++depth>64)throw new Error('COMPOSITION_COMPLEXITY')
  if(skip){skip++;return}
  if(tag.local==='metadata'){skip=1;return}
  if(tag.uri!=='http://www.w3.org/2000/svg'||['image','script','foreignObject'].includes(tag.local))throw new Error('COMPOSITION_NON_VECTOR')
  if(depth===1){
   sourceRoot=prefix+String(tag.attributes.id?.value || 'sourceRoot')
   viewBox=String(tag.attributes.viewBox?.value || '')
   if(!viewBox){const width=parseFloat(String(tag.attributes.width?.value)),height=parseFloat(String(tag.attributes.height?.value));viewBox=`0 0 ${width} ${height}`}
   const b=viewBox.trim().split(/[\s,]+/).map(Number)
   if(b.length!==4||!b.every(Number.isFinite)||b[2]<=0||b[3]<=0)throw new Error('COMPOSITION_VIEWBOX')
  }
  const attrs=Object.values(tag.attributes).filter(a=>!a.name.startsWith('xmlns')&&!(depth===1&&['viewBox','width','height','x','y','preserveAspectRatio'].includes(a.local))).map(a=>{
   if(/^on/i.test(a.local)||['src','base'].includes(a.local))throw new Error('COMPOSITION_ACTIVE_CONTENT')
   let value=a.value
   if(a.local==='font-family')value=sharedFont
   if(a.local==='style')value=normalizedFonts(value)
   if(a.local==='id')value=prefix+value
   if(a.local==='href'){if(!value.startsWith('#'))throw new Error('COMPOSITION_EXTERNAL_REFERENCE');value='#'+prefix+value.slice(1)}
   value=refs(value)
   return ` ${a.name}="${escape(value)}"`
  }).join('')
  parts.push(`<${tag.local}${attrs}${depth===1?` width="100%" height="100%" viewBox="${viewBox}"${tag.attributes.id?'':` id="${sourceRoot}"`}`:''}>`)
  if(tag.local==='style'){styleDepth=depth;styleText=''}
 })
 const text=(value:string)=>{if(!skip&&depth>1){if(styleDepth)styleText+=value;else parts.push(escape(value))}}
 parser.on('text',text)
 parser.on('cdata',text)
 parser.on('closetag',tag=>{if(skip)skip--;else{if(depth===styleDepth){parts.push(escape(scopedCss(styleText)));styleDepth=0}parts.push(`</${tag.local}>`)}depth--})
 parser.write(svg).close()
 return {body:parts.join(''),viewBox}
}

export type CompositionOptions={aspectRatio?:string;imageSize?:string;title?:string;independentScales?:boolean}
export function figureOutputViewport(options:CompositionOptions={}) {
 const ratio=(options.aspectRatio||'16:9').split(':').map(Number),aspect=ratio.length===2&&ratio.every(n=>n>0)?ratio[0]/ratio[1]:16/9
 const edge=options.imageSize==='4K'?4096:options.imageSize==='2K'?2048:options.imageSize==='3K'?3072:options.imageSize==='1.5K'?1536:1024
 let width=Math.round(aspect>=1?edge:edge*aspect),height=Math.round(aspect>=1?edge/aspect:edge)
 if(width*height>8_000_000){const scale=Math.sqrt(8_000_000/(width*height));width=Math.floor(width*scale);height=Math.floor(height*scale)}
 return {width,height,minFontPx:Math.max(14,edge/1024*14)}
}
/** Allocated before child planning; every child renderer receives its real final viewport. */
export function allocateVectorPanels(count:number,options:CompositionOptions={}) {
 if(count<2||count>12)throw new Error('COMPOSITION_PANELS: 2–12 panels required')
 const {width,height,minFontPx}=figureOutputViewport(options),aspect=width/height
 const columns=Math.min(count,Math.max(1,Math.round(Math.sqrt(count*aspect))))
 const rows=Math.ceil(count/columns),gap=width*.018,margin=width*.025,labelHeight=Math.max(22,width*.025)
 const cellW=(width-2*margin-gap*(columns-1))/columns,cellH=(height-2*margin-gap*(rows-1))/rows
 if(cellW<110||cellH-labelHeight<100)throw new Error('COMPOSITION_DENSITY: 面板过多或画幅过窄，请增大清晰度或调整比例。')
 return {width,height,columns,rows,cellW,cellH,gap,margin,labelHeight,minFontPx,panels:Array.from({length:count},(_,i)=>({x:margin+(i%columns)*(cellW+gap),y:margin+Math.floor(i/columns)*(cellH+gap)+labelHeight,width:cellW,height:cellH-labelHeight,minFontPx}))}
}
export async function composeVectorPanels(panels:VectorPanel[],options:CompositionOptions={}) {
 if(panels.length<2||panels.length>12||new Set(panels.map(p=>p.label)).size!==panels.length)throw new Error('COMPOSITION_PANELS: 2–12 uniquely labelled panels required')
 const allocation=allocateVectorPanels(panels.length,options)
 const {width,height,columns,rows,cellW,cellH,gap,margin,labelHeight}=allocation
 const layoutChecks=panels.map((p,i)=>({label:p.label,svgHash:createHash('sha256').update(p.svg).digest('hex'),...inspectPanelReadability(p.svg,allocation.panels[i])}))
 const bodies=panels.map((p,i)=>{
  const parsed=panelBody(p.svg,`panel${i}_`),x=margin+(i%columns)*(cellW+gap),y=margin+Math.floor(i/columns)*(cellH+gap)
  return `<g data-panel="${escape(p.label)}" data-figure-type="${escape(p.typeId)}"><text x="${x}" y="${y+labelHeight*.75}" font-size="${labelHeight*.7}" font-family="Noto Sans">${escape(p.label)}${options.independentScales?' · Independent scale':''}</text><svg id="panel${i}_scope" x="${x}" y="${y+labelHeight}" width="${cellW}" height="${cellH-labelHeight}" viewBox="${parsed.viewBox}" preserveAspectRatio="xMidYMid meet">${parsed.body}</svg></g>`
 })
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>${escape(options.title||'Scientific multi-panel figure')}</title><rect width="100%" height="100%" fill="white"/>${bodies.join('')}<style>text,tspan{font-family:Noto Sans !important;}</style></svg>`
 const rendered=await renderProgrammaticSvg(svg)
 return {...rendered,composition:{renderer:'independent-vector-panels-v2',layout:{svgHash:rendered.svgHash,passed:layoutChecks.every(p=>p.passed),allocation,panels:layoutChecks,limitations:['Conservative source text bounds; final raster still requires visual review.','Uniform panel scaling preserves numeric geometry; no post-validation glyph or mark relocation.']},columns,rows,sharedFont:'Noto Sans',legendPolicy:'per-panel; never merge different units or encodings',panels:panels.map(p=>({label:p.label,typeId:p.typeId,dataHash:p.dataHash,svgHash:createHash('sha256').update(p.svg).digest('hex'),review:p.review}))}}
}
