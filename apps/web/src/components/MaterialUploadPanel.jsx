import {Upload, FileText, X} from 'lucide-react';
import {MATERIAL_ACCEPT} from '../lib/materials.js';
const readLabel=m=>{const r=m.lastReading||m.details?.readings?.[0];return !r?'待读取':r.status==='failed'||r.type==='read_failed'?'最近读取失败':r.status==='partial'?'部分读取':r.status==='unread'?'待读取':'已读取选定内容'};
export default function MaterialUploadPanel({images,materials,onAddFiles,onRemoveImage,onRemoveMaterial,onReplaceMaterial,disabled,error,isInspecting,isUploading}){
 return <section className="material-upload-panel" aria-label="文件材料">
  <div className="material-upload-header"><div><strong>上传文件</strong><p>提供原始材料，模型会按绘图需要读取文字、数据和页面。</p></div><label className="secondary material-upload-button"><Upload size={16}/>选择文件<input aria-label="上传文件" type="file" multiple accept={MATERIAL_ACCEPT} disabled={disabled} onChange={e=>{onAddFiles(Array.from(e.target.files||[]));e.target.value='';}}/></label></div>
  <small>最多 10 份文件，每份最大 10 MB，文件先保存在此浏览器，确认成功后仅在提交任务时上传；服务器在任务结束后清理临时材料。</small>
  {isInspecting||isUploading?<p role="status">{isInspecting?'正在保存到浏览器并校验…':'正在上传图片…'}</p>:null}
  {error?<p className="notice warning" role="alert">{error}</p>:null}
  <div className="material-file-list">{images.map(m=><article key={m.id}><img src={m.previewUrl} alt="用户上传材料"/><div><strong>{m.filename}</strong><small>图片 · 由模型读取</small></div><button type="button" aria-label={`移除 ${m.filename}`} disabled={disabled} onClick={()=>onRemoveImage(m.id)}><X size={16}/></button></article>)}
   {materials.map(m=><article key={m.id}><FileText size={22}/><div><strong>{m.filename}</strong><small>{m.status==='error'?'保存失败':m.status==='local'?`已保存到浏览器 · ${m.uploadError?'临时上传失败':readLabel(m)}`:m.status==='uploaded'?`已保存 · ${readLabel(m)}`:m.status==='partial'?'历史材料 · 部分文字':'历史材料 · 已提取文字'}{m.text?` · ${m.text.length.toLocaleString()} 字符`:''}</small>{m.error||m.uploadError?<p role="alert">{m.error||m.uploadError}</p>:null}
    <label className="material-replace">替换文件<input aria-label={`替换 ${m.filename}`} type="file" accept={MATERIAL_ACCEPT} disabled={disabled} onChange={e=>{onReplaceMaterial(m.id,e.target.files?.[0]);e.target.value='';}}/></label>
   </div><button type="button" aria-label={`移除 ${m.filename}`} disabled={disabled} onClick={()=>onRemoveMaterial(m.id)}><X size={16}/></button></article>)}
  </div>
 </section>
}
