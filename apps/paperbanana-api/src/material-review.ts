import {createHash} from 'node:crypto'

/** Re-deliver previously selected originals to the final critic, not only a summary. */
export async function materialReviewImages({files,records,capacity,offset,read,normalize}: {
 files:any[];records:any[];capacity:number;offset:number;
 read:(id:string,operation:any)=>Promise<any>;normalize:(image:any)=>Promise<any>;
}) {
 const pages:any[]=[],seen=new Set<string>()
 // Round-robin across files preserves representation when a channel has a small window.
 const byFile=files.map(file=>{
  const selected:any[]=[]
  for(const record of records)if(record.materialId===file.id && ['read','render'].includes(record.operation?.op))for(const image of record.images||[]){
   const key=file.id+':'+image.page
   if(!seen.has(key)){seen.add(key);selected.push({file,record,image})}
  }
  return selected
 })
 for(let i=0;byFile.some(p=>i<p.length);i++)for(const p of byFile)if(p[i])pages.push(p[i])
 const images:any[]=[],sourcePages:any[]=[],cache=new Map<string,any>()
 const selected=pages.slice(0,Math.max(0,Math.min(12,capacity)))
 for(const {file,record,image} of selected){
  const key=file.id+':'+record.recordId
  if(!cache.has(key))cache.set(key,await read(file.id,record.operation))
  const result=cache.get(key),current=result.images?.find((p:any)=>p.page===image.page)
  if(!current || current.sha256!==image.sha256 || result.sourceHash!==file.sha256)throw Object.assign(new Error('原材料评审页图与此前读取的原件哈希不一致；未使用旧图继续评审。'),{name:'MaterialError',statusCode:422,localInputFailure:true,requestState:'not_sent'})
  const normalized=await normalize(current)
  const submittedImageHash=createHash('sha256').update(Buffer.from(normalized.url.split(',')[1],'base64')).digest('hex')
  images.push(normalized)
  sourcePages.push({inputIndex:offset+images.length,materialId:file.id,filename:file.filename,page:current.page,sourceHash:file.sha256,recordId:result.recordId,originalImageHash:current.sha256,submittedImageHash})
 }
 return {images,evidence:{sourcePages,omittedPages:pages.slice(selected.length).map(p=>({filename:p.file.filename,page:p.image.page})),delivery:images.length?'original-page-pixels-with-candidate':'separate-material-reading-only',instruction:'The first image is the CURRENT generated candidate to review; subsequent images identified by sourcePages are ORIGINAL research pages, not candidate versions or gallery references. Compare source style and structure directly against these pixels. Do not replace actual source evidence with assumptions about typical slides or a nonexistent auxiliary report. Raw numbers and notes come from content records, not visual estimates. If a needed source page is omitted due to channel capacity, explicitly report uncertainty rather than certify the missing visual comparison.'}}
}
