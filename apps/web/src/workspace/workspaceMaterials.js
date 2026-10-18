import { browserFile, putBrowserRecord } from '../lib/browserMaterials.js';
import { checkOriginalMaterial } from '../lib/materials.js';
import { ORIGINAL_SCOPE } from './workspaceSync.js';

export async function restoreWorkspaceOriginal(ref, file) {
  const info=checkOriginalMaterial(file), bytes=await file.arrayBuffer();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==ref.sha256 || file.size!==ref.size)throw Error('这份文件与任务记录中的原件不一致。请重新选择原文件，或移除旧引用后作为新材料添加。');
  await putBrowserRecord({scope:ORIGINAL_SCOPE,id:ref.clientFileId||ref.id,kind:'file',...info,filename:ref.filename,mimeType:file.type,bytes,sha256:hash,createdAt:Date.now()});
  await browserFile(ORIGINAL_SCOPE,ref);
}
