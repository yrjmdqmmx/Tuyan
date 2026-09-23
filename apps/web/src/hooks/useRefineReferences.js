import { useEffect, useRef, useState } from 'react';
import { abortReferenceUploadRequest, finalizeReferenceUploadRequest, prepareReferenceUploadRequest } from '@paperbanana/api';
import { readImageDimensions, validateRefineDimensions } from '../lib/refineUpload';
import { referenceUploadSelectionError } from '../lib/referenceUploadPolicy';
import { uploadReferenceFiles } from '../lib/referenceUpload';

// Same original-byte upload pipeline as generation. Model changes never clear files.
export default function useRefineReferences({ apiBase, health, ownerId, policy }) {
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lifetime = useRef({ sequence:0, images:[], uploads:[], locked:false });
  lifetime.current.images = images;
  useEffect(() => {
    setImages([]); setError(''); setBusy(false);
    return () => {
      lifetime.current.sequence++;
      lifetime.current.locked = false;
      lifetime.current.images.forEach(image => URL.revokeObjectURL(image.previewUrl));
      if (lifetime.current.uploads.length) void abortReferenceUploadRequest(apiBase, health, lifetime.current.uploads).catch(() => {});
      lifetime.current.uploads = [];
    };
  }, [apiBase, ownerId]);
  async function add(files) {
    if (!files.length || lifetime.current.locked) return;
    const sequence = lifetime.current.sequence;
    const accepted = [];
    lifetime.current.locked = true; setBusy(true); setError('');
    try {
      if (images.length + files.length > policy.maxCount) throw new Error(`当前型号最多 ${policy.maxCount} 张辅助参考图（原图另占 1 个名额）；本次未添加，已有输入保留。`);
      for (const file of files) {
        const mimeType = file.type || (/\.svg$/i.test(file.name) ? 'image/svg+xml' : /\.png$/i.test(file.name) ? 'image/png' : /\.webp$/i.test(file.name) ? 'image/webp' : /\.jpe?g$/i.test(file.name) ? 'image/jpeg' : '');
        if (!policy.platform.mimeTypes.includes(mimeType)) throw new Error('辅助参考图支持 PNG、JPG、WebP 或 SVG。');
        const previewUrl = URL.createObjectURL(file);
        const image = {id:crypto.randomUUID(),file,filename:file.name,mimeType,size:file.size,previewUrl,purpose:'style',note:''};
        accepted.push(image);
        Object.assign(image, await readImageDimensions(previewUrl));
        validateRefineDimensions(image,policy.platform);
      }
      const issue = referenceUploadSelectionError([...images,...accepted],policy);
      if (issue) throw new Error(issue);
      if (sequence !== lifetime.current.sequence) throw new Error('上传已取消。');
      setImages(current => [...current,...accepted]);
    } catch (error) {
      accepted.forEach(image => URL.revokeObjectURL(image.previewUrl));
      if (sequence === lifetime.current.sequence) setError(error.message);
    } finally { if (sequence === lifetime.current.sequence) { lifetime.current.locked=false; setBusy(false); } }
  }
  function remove(id) {
    const item = images.find(image => image.id === id);
    if (item) URL.revokeObjectURL(item.previewUrl);
    setImages(current => current.filter(image => image.id !== id)); setError('');
  }
  async function prepare(maskFile) {
    const sequence = lifetime.current.sequence;
    const items = [...images.map(image => ({...image,clientId:image.id})), ...(maskFile ? [{clientId:'refine-mask',file:maskFile,filename:maskFile.name,mimeType:'image/png',size:maskFile.size}] : [])];
    if (!items.length) return {references:[]};
    if (lifetime.current.locked) throw new Error('请等待参考图检查完成。');
    lifetime.current.locked=true; setBusy(true); setError('');
    let uploads=[];
    try {
      const prepared = await prepareReferenceUploadRequest(apiBase,health,items.map(({clientId,filename,mimeType,size})=>({clientId,filename,mimeType,size,role:'original'})));
      uploads = prepared.uploads || [];
      const map = new Map(uploads.map(upload => [upload.clientId,upload]));
      await uploadReferenceFiles(items,map,policy.platform.uploadConcurrency);
      if (sequence !== lifetime.current.sequence) throw new Error('上传已取消。');
      const lifecycle = uploads.map(({objectKey,uploadToken,mimeType,size,filename})=>({objectKey,uploadToken,mimeType,size,filename}));
      await finalizeReferenceUploadRequest(apiBase,health,lifecycle);
      if (sequence !== lifetime.current.sequence) throw new Error('上传已取消。');
      lifetime.current.uploads.push(...lifecycle);
      return {references:images.map(image=>({objectKey:map.get(image.id).objectKey,purpose:image.purpose,note:image.note})), ...(maskFile ? {mask:{objectKey:map.get('refine-mask').objectKey}} : {})};
    } catch (error) {
      if (uploads.length) await abortReferenceUploadRequest(apiBase,health,uploads).catch(()=>{});
      if (sequence === lifetime.current.sequence) setError(error.message);
      throw error;
    } finally { if (sequence === lifetime.current.sequence) { lifetime.current.locked=false; setBusy(false); } }
  }
  return {images,error,busy,add,remove,prepare,update:(id,patch)=>setImages(current=>current.map(image=>image.id===id?{...image,...patch}:image))};
}
