import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {SaxesParser} from 'saxes';
import {activeJournalRules,journalPolicyIssues,journalWidthStatus} from '../../../packages/api/src/journal-rules.js';

type Check = {id:string;field:string;status:'checked'|'unmet'|'uncheckable'|'pending';text:string;requirement:string;sourceIds:string[]};
const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
const MAX_BYTES=40*1024*1024;
function issue(message:string):never {const error:any=new Error(message);error.name='JournalRuleError';error.statusCode=400;throw error;}
function svgFacts(bytes:Buffer) {
  let root:any=null,embeddedRaster=false,external=false,elements=0,simpleVector=true;
  // Conservative eligibility for a non-bitmap width rule, not an editability certificate.
  // Unknown elements, stylesheets, filters and resource links retain the unresolved scope.
  const vectorNodes=new Set(['svg','g','defs','path','rect','circle','ellipse','line','polyline','polygon','text','tspan','title','desc','linearGradient','radialGradient','stop','clipPath','mask','marker','symbol','use']);
  const parser=new SaxesParser({xmlns:false});
  parser.on('doctype',()=>issue('SVG 含 DTD，无法安全检查。'));
  parser.on('processinginstruction',()=>{simpleVector=false;});
  parser.on('opentag',node=>{elements++;if(elements>100000)issue('SVG 结构过大。');if(!root){if(node.name!=='svg')issue('不是 SVG 图件。');root=node.attributes;}
    if(!vectorNodes.has(node.name))simpleVector=false;
    if(node.name==='image')embeddedRaster=true;
    for(const [key,value] of Object.entries(node.attributes)){
      if((key==='href'||key==='xlink:href')&&!String(value).startsWith('#')){simpleVector=false;if(!String(value).startsWith('data:'))external=true;}
      // Inline styles/paint URLs can import raster resources, including escaped CSS URLs.
      if(key==='style'||key==='xml:base'||/^on/i.test(key)||key==='xmlns'&&value!=='http://www.w3.org/2000/svg'||/url\s*\(/i.test(String(value))||String(value).includes('\\'))simpleVector=false;
    }
  });
  parser.on('error',()=>issue('SVG XML 无法解析。'));
  parser.write(bytes.toString('utf8')).close();
  if(!root)issue('SVG 没有根元素。');
  const box=String(root.viewBox||'').trim().split(/[\s,]+/).map(Number);
  const numeric=(value:any)=>{const m=String(value||'').match(/^(\d+(?:\.\d+)?)(px|mm|cm|in|pt|pc)?$/);return m?Number(m[1])*({px:1,mm:96/25.4,cm:96/2.54,in:96,pt:96/72,pc:16}[m[2]||'px']||1):0;};
  const declaredWidth=numeric(root.width),declaredHeight=numeric(root.height);
  const viewBoxOnly=!root.width&&!root.height&&box.length===4&&box.every(Number.isFinite);
  const width=declaredWidth&&declaredHeight?declaredWidth:viewBoxOnly?box[2]:0,height=declaredWidth&&declaredHeight?declaredHeight:viewBoxOnly?box[3]:0;

  return {format:'svg',width,height,embeddedRaster,external,simpleVector,space:'unknown',depth:'unknown',hasAlpha:true};
}
// Inspect only the TIFF we just encoded; arbitrary TIFF uploads are deliberately not enabled.
function generatedTiffFacts(bytes:Buffer) {
  const le=bytes.subarray(0,2).toString()==='II';
  const u16=(o:number)=>le?bytes.readUInt16LE(o):bytes.readUInt16BE(o),u32=(o:number)=>le?bytes.readUInt32LE(o):bytes.readUInt32BE(o);
  if(u16(2)!==42)issue('TIFF 编码格式无法检查。');
  const ifd=u32(4),tags:Record<number,number[]>={};
  for(let n=0;n<u16(ifd);n++){const p=ifd+2+n*12,tag=u16(p),type=u16(p+2),count=u32(p+4),size=type===3?2:4;
    if((type===3||type===4)&&count<16){const base=count*size<=4?p+8:u32(p+8);tags[tag]=Array.from({length:count},(_,i)=>type===3?u16(base+i*size):u32(base+i*size));}}
  return {format:'tiff',width:tags[256]?.[0]||0,height:tags[257]?.[0]||0,space:tags[262]?.[0]===2?'srgb':tags[262]?.[0]===1?'b-w':'unknown',depth:tags[258]?.every(v=>v===8)?'uchar':'unknown',hasAlpha:Boolean(tags[338]),compression:tags[259]?.[0],pages:u32(ifd+2+u16(ifd)*12)===0?1:2};
}
export async function inspectJournalFile(sourceBytes:Buffer,snapshot:any,options:{format?:string;flattenWhite?:boolean}={}) {
  if(!snapshot?.selection||!Array.isArray(snapshot.rules))issue('任务没有保存期刊规则快照。');
  if(!sourceBytes.length||sourceBytes.length>MAX_BYTES)issue('文件为空或超过 40 MiB 检查上限。');
  if(!['original','tiff',undefined].includes(options.format))issue('仅支持原始文件检查或 PNG 转 TIFF。');
  const isPng=sourceBytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const isSvg=/^\s*(?:<\?xml[^>]*>\s*)?<svg(?:\s|>)/.test(sourceBytes.toString('utf8',0,1024));
  if(!isPng&&!isSvg)issue('当前只检查任务实际产生的 PNG/SVG 文件。');
  let facts:any;
  if(isPng){const decoder=sharp(sourceBytes,{limitInputPixels:40000000,failOn:'warning'});facts=await decoder.metadata();if((facts.pages||1)>1)issue('多帧 PNG 不支持本次检查/转换，请先确认所需静态帧。');await decoder.stats();}
  else facts=svgFacts(sourceBytes);
  let bytes=sourceBytes;
  const conversions:string[]=[];
  if(options.format==='tiff') {
    if(!isPng)issue('只支持 PNG 原像素转 TIFF；不提供 SVG 栅格化或 EPS/PDF 转换。');
    if(options.flattenWhite!==true)issue('TIFF 导出会将透明区域合成为白底，请明确选择白底转换。');
    const density=facts.width/snapshot.selection.widthMm*25.4;
    // No resize operation. Density labels the intended placement only, never a resolution certificate.
    bytes=await sharp(sourceBytes,{limitInputPixels:40000000}).flatten({background:'#ffffff'}).toColourspace('srgb').withMetadata({density:Math.max(1,Math.min(100000,density))}).tiff({compression:'lzw'}).toBuffer();
    if(bytes.length>MAX_BYTES)issue('导出文件超过 40 MiB 检查上限。');
    const encoded=generatedTiffFacts(bytes);
    if(encoded.width!==facts.width||encoded.height!==facts.height)issue('转换后的像素尺寸不一致，导出已停止。');
    facts=encoded;
    conversions.push('PNG → 单页 RGB 8-bit 白底 TIFF（LZW）；像素数不变；DPI 元数据仅记录指定排版尺寸。');
  }
  const s=snapshot.selection,widthMm=Number(s.widthMm),heightMm=facts.width>0&&facts.height>0?widthMm*facts.height/facts.width:null;
  const effectiveDpi=facts.format==='svg'||!facts.width?null:facts.width/widthMm*25.4;
  const checks:Check[]=[],rules=activeJournalRules(snapshot,facts.format);
  // An RGB container can contain a black-and-white figure. Check actual decoded pixels,
  // including profile conversion; a fully transparent pixel does not contribute visible colour.
  let achromatic:boolean|undefined;
  const canDecodeColour=facts.format!=='svg'&&(facts.format!=='tiff'||sharp.format.tiff.input.buffer);
  if(canDecodeColour&&rules.some((r:any)=>r.field==='color'&&r.value?.achromatic)){
    try {
      const rgba=await sharp(bytes,{limitInputPixels:40000000,failOn:'warning'}).toColourspace('srgb').ensureAlpha().raw().toBuffer();
      achromatic=true;
      for(let p=0;p<rgba.length;p+=4)if(rgba[p+3]!==0&&(rgba[p]!==rgba[p+1]||rgba[p+1]!==rgba[p+2])){achromatic=false;break;}
    } catch(error) {
      // Core restricts TIFF loaders even when libvips reports the format as installed.
      // Do not weaken its allowlist or infer exported pixel content from the source PNG.
      if(facts.format!=='tiff')throw error;
    }
  }
  const add=(rule:any,status:Check['status'],text=rule.text)=>checks.push({id:rule.id,field:rule.field,status,text,requirement:rule.requirement,sourceIds:rule.sourceIds||[]});
  for(const rule of rules) {
    const v=rule.value;
    if(rule.field==='fileSize'&&(v?.boundaryMB||v?.boundaryKB)){
      const lower=v.boundaryMB?v.boundaryMB*1e6:v.boundaryKB*1000,upper=v.boundaryMB?v.boundaryMB*1024*1024:v.boundaryKB*1024;
      add(rule,bytes.length<lower?'checked':bytes.length>upper?'unmet':'pending',`${rule.text} 实际 ${bytes.length} bytes${bytes.length<lower?'，低于两种单位解释下的上限':bytes.length>upper?'，超过两种单位解释下的上限':'，处在有争议边界区间，待人工确认'}。`);continue;
    }
    if(['pending','conflict','unspecified'].includes(rule.requirement)){add(rule,'pending',`${rule.text}${rule.field==='dpi'&&effectiveDpi?` 本文件按指定宽度约 ${effectiveDpi.toFixed(1)} ppi。`:''}`);continue;}
    if(rule.requirement==='manual'||!v){add(rule,'uncheckable');continue;}
    let met:boolean|undefined;
    if(rule.field==='availability'&&v.unsupportedPurpose)met=false;
    if(rule.field==='format'){if(!v.includes(facts.format)&&(rule.openFormatList||rule.pendingFormats?.includes(facts.format))){add(rule,'pending',rule.text);continue;}met=v.includes('*')||v.includes(facts.format);}
    if(rule.field==='width'){
      const status=journalWidthStatus(v,widthMm,facts.format==='svg'?(facts.simpleVector?'simple-vector':'unknown'):['png','tiff'].includes(facts.format)?'raster':'unknown');
      if(status==='pending'){add(rule,'pending',`${rule.text} 本文件指定排版宽度 ${widthMm} mm，适用条件待确认。`);continue;}
      met=status==='checked';
    }
    if(rule.field==='height'&&heightMm)met=!v.max||heightMm<=v.max;
    if(rule.field==='dpi'&&effectiveDpi!==null){const min=v.byKind?v.byKind[s.rasterKind]:v.min??0;if(min===undefined){add(rule,'pending',`${rule.text} 当前选择的图像构成没有已核实阈值。`);continue;}met=(v.exclusiveMin?effectiveDpi>min:effectiveDpi>=min)&&(!v.max||effectiveDpi<=v.max);}
    if(rule.field==='color'&&facts.format!=='svg')met=(!(v.spacesByKind?.[s.rasterKind]||v.spaces)||(v.spacesByKind?.[s.rasterKind]||v.spaces).includes(facts.space))&&(!v.depth||v.depth===facts.depth)&&(!v.opaque||!facts.hasAlpha)&&(!v.lzw||facts.format!=='tiff'||facts.compression===5&&facts.pages===1);
    if(rule.field==='color'&&v.achromatic){
      if(achromatic===undefined){add(rule,'uncheckable',`${rule.text} 当前检查器无法解码此 ${facts.format.toUpperCase()} 文件的实际像素；未根据来源图或容器信息推定黑白通过。`);continue;}
      met=met&&achromatic;
    }
    if(rule.field==='pixelDimensions'&&facts.format!=='svg')met=facts.width===v.width&&facts.height===v.height;
    if(rule.field==='dimensions'&&heightMm)met=v.pairs.some(([w,h]:number[],i:number)=>Math.abs(widthMm-w)<0.05&&Math.abs(heightMm-h)<0.1&&(facts.format==='svg'||facts.width>=v.pixelWidths[i]));
    add(rule,met===undefined?'uncheckable':met?'checked':'unmet',`${rule.text}${met!==undefined?` 检查${met?'符合':'未满足'}${rule.field==='dpi'?`（${effectiveDpi?.toFixed(1)} ppi，仅像素密度）`:''}。`:''}`);
  }
  for(const field of ['format','width','height','dpi','fileSize','color','font','stroke','panels'])if(!rules.some((r:any)=>r.field===field))add({id:`scope-${field}`,field,requirement:rules.some((r:any)=>r.value?.formatExempt)?'manual':'pending'},rules.some((r:any)=>r.value?.formatExempt)?'uncheckable':'pending',rules.some((r:any)=>r.value?.formatExempt)?'当前阶段正文图豁免制作格式要求；未按录用后阈值检查。':`${({format:'格式',width:'宽度',height:'高度',dpi:'分辨率',fileSize:'文件大小',color:'色彩',font:'字体/字号',stroke:'线宽',panels:'多面板标号'} as any)[field]}：此阶段/用途没有已核实规则，不代表期刊未规定。`);
  if(rules.some((r:any)=>r.field==='dpi'&&r.value?.byKind))add({id:'image-content-classification',field:'contentType',requirement:'manual'},'uncheckable','分辨率阈值按作者选择的彩色/灰度/线稿计算；文件通道数不能证明整图及每个面板的内容类别，混合图须人工确认更严格的适用要求。');
  add({id:'native-detail',field:'quality',requirement:'manual'},'uncheckable','无法从文件确认原生细节、是否曾放大、内嵌素材的有效分辨率或科学真实性。像素密度达标不等于图像质量达标。');
  if(facts.format==='svg')add({id:'svg-editability',field:'vector',requirement:'manual'},'uncheckable',facts.embeddedRaster?'实际 SVG 含 image 位图/外部图像节点，不能宣称纯矢量或完整可编辑。':`SVG XML 已解析，但未认证每个对象可编辑、字体正确或所有内容为矢量${facts.external?'；发现外部引用':''}。`);
  return {bytes,report:{schema:1,checkedAt:new Date().toISOString(),journal:snapshot.name,ruleVersion:snapshot.version,selection:s,sourceSha256:hash(sourceBytes),exportSha256:hash(bytes),facts:{...facts,size:bytes.length,widthMm,heightMm,effectiveDpi},conversions,checks,policy:journalPolicyIssues(snapshot),sources:snapshot.sources,notice:'文件检查不是投稿合规证明；AI 许可、图像质量和科学真实性分别核对，最终由作者与期刊判断。'}};
}
