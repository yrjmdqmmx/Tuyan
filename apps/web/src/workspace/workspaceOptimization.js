import { materialFileRequest, uploadMaterialFileRequest } from '@paperbanana/api';
import { browserFile } from '../lib/browserMaterials.js';
import { ORIGINAL_SCOPE } from './workspaceSync.js';

export async function withOptimizationMaterials({ base, attachments, simulation, isCurrent, onProgress }, submit, io = {}) {
  const read = io.read || (attachment => browserFile(ORIGINAL_SCOPE, attachment));
  const upload = io.upload || (file => uploadMaterialFileRequest(base, { backendMode: 'gateway' }, file));
  const remove = io.remove || (id => materialFileRequest(base, { backendMode: 'gateway' }, 'deleteMaterial', { materialId: id }));
  const uploaded = []; let sent = false, settled = false;
  try {
    // Read every local original before uploading any file or invoking a model.
    const files = [];
    for (const a of attachments) files.push(await read(a));
    if (!isCurrent()) throw Error('任务或输入已切换，未开始优化。');
    if (!simulation) for (const file of files) {
      onProgress(`正在读取附件 ${uploaded.length + 1}/${files.length}…`);
      uploaded.push(await upload(file));
      if (!isCurrent()) throw Error('任务或输入已切换，未开始优化。');
    }
    onProgress('正在优化…');
    sent = true;
    const result = await submit(uploaded.map(({ id }) => ({ id })));
    settled = true;
    return result;
  } finally {
    // On a lost response the server may still be reading. Let temporary files
    // expire instead of deleting its inputs or automatically resubmitting.
    if (!sent || settled) await Promise.allSettled(uploaded.map(file => remove(file.id)));
  }
}
