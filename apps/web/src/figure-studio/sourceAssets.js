const MAX_TOTAL_PIXELS = 32_000_000;

export async function decodeLocalRaster(asset) {
  if (typeof globalThis.createImageBitmap === 'function') {
    const encoded = asset.dataUrl.slice(asset.dataUrl.indexOf(',') + 1);
    const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: asset.mimeType }));
    return { width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }
  const image = new globalThis.Image();
  if (typeof image.decode === 'function') {
    image.src = asset.dataUrl;
    await image.decode();
  } else {
    await new Promise((resolve, reject) => {
      image.onload = resolve; image.onerror = () => reject(new Error('图片像素无法解码。'));
      image.src = asset.dataUrl;
    });
  }
  return { width: image.naturalWidth, height: image.naturalHeight, close: () => { image.src = ''; } };
}

/** Decode sequentially, so an imported source never allocates all bitmaps at once. */
export async function validateSourceAssets(document, decodeAsset = decodeLocalRaster) {
  const entries = Object.entries(document.assets || {});
  const totalPixels = entries.reduce((sum, [, asset]) => sum + asset.pixelWidth * asset.pixelHeight, 0);
  if (!Number.isSafeInteger(totalPixels) || totalPixels > MAX_TOTAL_PIXELS) throw new Error('源稿中的图片合计超过 3200 万像素，请缩小图片后再导入。');
  for (const [id, asset] of entries) {
    let decoded;
    try {
      decoded = await decodeAsset(asset);
      if (decoded.width !== asset.pixelWidth || decoded.height !== asset.pixelHeight || decoded.width < 1 || decoded.height < 1) throw new Error('实际图片尺寸与源稿记录不一致。');
    } catch { throw new Error(`图片资产 ${id} 无法完整解码或尺寸不一致，未打开此源稿。`); }
    finally { decoded?.close?.(); }
  }
}
