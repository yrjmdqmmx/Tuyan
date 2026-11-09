// Local, bounded extraction. Original files never execute code or external links.
export const MATERIAL_ACCEPT='.png,.jpg,.jpeg,.webp,.svg,.txt,.md,.csv,.tsv,.json,.xlsx,.docx,.pdf,.pptx';
export const MATERIAL_FORMATS='PNG、JPG、WebP、SVG；TXT、MD、CSV、TSV、JSON、XLSX、DOCX、PDF、PPTX';
export const isImageMaterial=file=>/\.(png|jpe?g|webp|svg)$/i.test(file.name)||/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type);
export function validateMaterialSet(materials) {
 if(materials.length>10)throw Error('最多上传 10 份文件，图片与文档合并计数。');
 if(materials.some(m=>['error','missing'].includes(m.status)))throw Error('有原文件上传或读取失败，请查看详情，移除或替换后再生成。');
 if(materials.some(m=>m.status==='uploaded'&&(!m.id||!/^[a-f0-9]{64}$/.test(m.sha256))))throw Error('原文件尚未确认保存。');
 if(materials.reduce((n,m)=>n+(m.text?.length||0),0)>100000)throw Error('材料合计超过 10 万字符，请精简文件；不会截断内容。');
 if(new TextEncoder().encode(JSON.stringify(materials.map(({id,filename,format,size,text,status,warnings,sha256})=>({id,filename,format,size,text,status,warnings,sha256})))).length>450000)throw Error('材料上下文超过 450 KB，请精简文件。');
 return materials.map(({id,filename,format,size,text,status,warnings,sha256,expiresAt})=>({id,filename,format,size,text,status,warnings,sha256,expiresAt}));
}
const nodes=(root,name)=>Array.from(root.getElementsByTagNameNS('*',name));
function xml(text){if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('文件含不支持的 XML 实体声明。');const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw Error('文件 XML 损坏。');return doc;}
async function officeZip(bytes) {
 const {default:JSZip}=await import('jszip');const zip=await JSZip.loadAsync(bytes);let expanded=0;
 for(const f of Object.values(zip.files)){expanded+=f._data?.uncompressedSize||0;if(expanded>20*1024*1024)throw Error('文档解压内容超过 20 MiB，请精简文件。');}
 return zip;
}
async function readXml(zip,path){const file=zip.file(path);if(!file)throw Error(`文件结构缺失：${path}`);const s=await file.async('string');if(s.length>5000000)throw Error('文档 XML 超过读取上限。');return xml(s);}
export async function parseMaterial(file,{pdfLoader}={}) {
 const format=file.name.split('.').pop().toLowerCase();
 if(!['txt','md','csv','tsv','json','xlsx','docx','pdf'].includes(format))throw Error('不支持该格式。请使用列出的文件格式，旧版 DOC / XLS 请另存为 DOCX / XLSX。');
 if(!file.size||file.size>10_000_000)throw Error('文档须大于 0 且不超过 10 MB。');
 const bytes=await file.arrayBuffer();let text='',warnings=[];
 if(['txt','md','csv','tsv','json'].includes(format)){
  try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');}catch{throw Error('文字文件不是有效 UTF-8，请另存为 UTF-8 编码。');}
  if(format==='json')try{JSON.parse(text)}catch{throw Error('JSON 语法无效，请检查后重新上传。');}
  if(format==='csv'||format==='tsv'){let quoted=false;for(let i=0;i<text.length;i++){if(text[i]!==String.fromCharCode(34))continue;if(quoted&&text[i+1]===String.fromCharCode(34)){i++;continue}quoted=!quoted}if(quoted)throw Error('表格引号未闭合，请检查 CSV / TSV 文件。');}
  if(/[\u0000]/.test(text))throw Error('文件包含二进制内容，无法按文字读取。');
 } else if(format==='docx'){
  const zip=await officeZip(bytes);const doc=await readXml(zip,'word/document.xml');
  text=nodes(doc,'p').map(p=>nodes(p,'t').map(t=>t.textContent).join('')).join('\n');
  if(nodes(doc,'tbl').length){text+='\n\n[文档表格，按行/列保留]\n'+nodes(doc,'tbl').map((table,i)=>`表 ${i+1}\n`+nodes(table,'tr').map(row=>nodes(row,'tc').map(cell=>nodes(cell,'t').map(t=>t.textContent).join('')).join('\t')).join('\n')).join('\n');}
  warnings.push('仅提取正文和表格；页眉页脚、批注、修订、公式对象及嵌入图片未读取。需要这些内容时请另行提供文字或图片。');
 } else if(format==='xlsx') {
  const zip=await officeZip(bytes),book=await readXml(zip,'xl/workbook.xml'),rels=await readXml(zip,'xl/_rels/workbook.xml.rels');
  const shared=zip.file('xl/sharedStrings.xml')?nodes(await readXml(zip,'xl/sharedStrings.xml'),'si').map(si=>nodes(si,'t').map(t=>t.textContent).join('')):[];
  const sheets=nodes(book,'sheet');if(sheets.length>12)throw Error('工作簿超过 12 张工作表，请拆分文件。');let cellCount=0,formula=false;
  const blocks=[];
  for(const sheet of sheets){const rid=sheet.getAttribute('r:id'),rel=nodes(rels,'Relationship').find(r=>r.getAttribute('Id')===rid);if(!rel||rel.getAttribute('TargetMode')==='External')throw Error('工作表引用无法读取。');const target=rel.getAttribute('Target');const path=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');if(path.includes('..'))throw Error('工作表路径不受支持。');const data=await readXml(zip,path);
   const cells=nodes(data,'c').map(c=>{if(++cellCount>20000)throw Error('工作簿超过 2 万个单元格，请精简文件。');const f=nodes(c,'f')[0];formula ||= !!f;const raw=nodes(c,'v')[0]?.textContent;const value=c.getAttribute('t')==='s'?shared[Number(raw)]:c.getAttribute('t')==='inlineStr'?nodes(c,'t').map(t=>t.textContent).join(''):raw;if(f&&raw===undefined)throw Error(`单元格 ${c.getAttribute('r')} 的公式没有缓存结果，请在 Excel 中计算并保存后重传。`);return `${c.getAttribute('r')}: ${JSON.stringify(value??'')}${f?' [formula='+f.textContent+']':''}`;});blocks.push(`[工作表：${sheet.getAttribute('name')}]\n${cells.join('\n')}`);
  }text=blocks.join('\n\n');warnings.push('读取单元格原始值和地址；日期可能是 Excel 序列值。未读取图表、图片、格式、合并布局或外部链接。');if(formula)warnings.push('公式使用文件中保存的缓存结果，未重新计算；请确认保存时已完成计算。');
 } else {
  const load=pdfLoader|| (async()=>{const pdf=await import('pdfjs-dist');const {default:worker}=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');pdf.GlobalWorkerOptions.workerSrc=worker;return pdf;});
  const pdf=await load();const task=pdf.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,stopAtErrors:true,useSystemFonts:true});let doc;
  try{doc=await task.promise;if(doc.numPages>30)throw Error('PDF 超过 30 页，请截取相关页后上传。');const pages=[];for(let n=1;n<=doc.numPages;n++){const content=await(await doc.getPage(n)).getTextContent();const page=content.items.map(item=>('str' in item?item.str+(item.hasEOL?'\n':' '):'')).join('');if(!page.trim())throw Error(`PDF 第 ${n} 页没有可读取的文字，可能是扫描页；请转为图片上传或先执行 OCR。`);pages.push(`[第 ${n} 页]\n${page}`);if(pages.join('').length>60000)throw Error('PDF 文字超过 6 万字符，请精简相关页。');}text=pages.join('\n\n');warnings.push('仅提取 PDF 文字层；插图、扫描内容和表格布局未读取。需要这些内容时请另行上传图片或原始表格。');}finally{await task.destroy();}
 }
 if(!text.trim())throw Error('未读取到有效文字或数据，请检查文件内容。');
 if(text.length>60000)throw Error('单文件解析内容超过 6 万字符，请精简文件；未截断内容。');
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return {id:crypto.randomUUID(),filename:file.name,format,size:file.size,text,status:warnings.length?'partial':'ready',warnings,sha256:Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')};
}

export function checkOriginalMaterial(file){
 const format=file.name.split('.').pop().toLowerCase();
 if(format==='ppt')throw Error('暂不支持旧版 PPT，请另存为 PPTX 后上传。');
 if(!['png','jpg','jpeg','webp','svg','txt','md','csv','tsv','json','xlsx','docx','pdf','pptx'].includes(format))throw Error('不支持该格式，请使用列出的格式。');
 if(!file.size||file.size>10_000_000)throw Error('文件须大于 0 且不超过 10 MB。');
 return {filename:file.name,format,size:file.size};
}
export function splitMaterialPayload(materials){const checked=validateMaterialSet(materials);return {sourceMaterials:checked.filter(m=>!['local','uploaded'].includes(m.status)),materialFiles:checked.filter(m=>m.status==='uploaded').map(m=>({id:m.id}))};}
