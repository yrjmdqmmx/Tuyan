// Decimal bytes, shared by the server and all consumers. Never infer usage from
// task counts, browser caches, requested dimensions or base64 string length.
export const IMAGE_LIBRARY_MAX_BYTES = 100_000_000;
export const IMAGE_LIBRARY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const IMAGE_LIBRARY_NOTICE = '图片最多保留 30 天。空间不足时，将自动清理最早保存的图片。请及时下载需要长期保留的图片。';
export const imageRemovalMessage = reason => ({
  'historical-missing': '历史图片文件缺失，暂不可预览或下载',
  expired: '图片已过期',
  capacity: '因存储空间不足已清理',
  deleted: '图片已删除',
  oversized: '单张图片超过 100 MB，未保存到云端图片库',
}[reason] || '图片暂不可用');
export const imageBytesLabel = bytes => bytes > 0 && bytes < 10_000 ? '< 0.01 MB' : `${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(bytes / 1_000_000)} MB`;

export const imageFileSizeLabel = bytes => bytes < 1000 ? `${bytes} B` : bytes < 1_000_000 ? `${new Intl.NumberFormat('zh-CN', {maximumFractionDigits: 1}).format(bytes / 1000)} KB` : imageBytesLabel(bytes);
