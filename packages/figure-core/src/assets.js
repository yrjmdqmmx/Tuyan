const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const fail = () => { throw new Error('位图资产无效：仅接受完整的 PNG、JPEG 或 WebP 内嵌图片，且像素尺寸必须一致。'); };

function dimensions(bytes, mime) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (start, length) => String.fromCharCode(...bytes.subarray(start, start + length));
  if (mime === 'image/png') {
    if (bytes.length < 45 || bytes[0] !== 137 || ascii(1, 7) !== 'PNG\r\n\x1a\n') fail();
    let offset = 8; let size; let hasData = false; let ended = false;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset); const type = ascii(offset + 4, 4);
      if (length > bytes.length - offset - 12) fail();
      if (!size && (type !== 'IHDR' || length !== 13)) fail();
      if (type === 'IHDR') {
        if (size || length !== 13) fail();
        size = [view.getUint32(offset + 8), view.getUint32(offset + 12)];
      }
      // Check every chunk CRC, including ancillary chunks, before embedding it.
      let crc = 0xffffffff;
      for (let i = offset + 4; i < offset + 8 + length; i += 1) {
        crc ^= bytes[i];
        for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
      if (((crc ^ 0xffffffff) >>> 0) !== view.getUint32(offset + 8 + length)) fail();
      if (type === 'IDAT') hasData = true;
      offset += 12 + length;
      if (type === 'IEND') { if (length !== 0 || offset !== bytes.length) fail(); ended = true; break; }
    }
    if (!hasData || !ended) fail();
    return size;
  }
  if (mime === 'image/jpeg') {
    if (bytes.length < 12 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) fail();
    let offset = 2; let size;
    while (offset < bytes.length - 2) {
      if (bytes[offset++] !== 0xff) fail();
      while (bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset++];
      if (marker === 0xda) { if (!size || offset + 2 > bytes.length) fail(); return size; }
      if (marker === 0xd9 || marker === 0xd8 || marker === 0x00) fail();
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) fail();
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length - 2) fail();
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (length < 8) fail();
        size = [view.getUint16(offset + 5), view.getUint16(offset + 3)];
      }
      offset += length;
    }
    fail();
  }
  if (mime === 'image/webp') {
    if (bytes.length < 26 || ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WEBP' || view.getUint32(4, true) + 8 !== bytes.length) fail();
    let offset = 12; let size; let imageSize;
    const u24 = (i) => bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16);
    while (offset + 8 <= bytes.length) {
      const type = ascii(offset, 4); const length = view.getUint32(offset + 4, true); const data = offset + 8;
      if (data + length > bytes.length) fail();
      if (type === 'VP8X') {
        if (length !== 10 || (bytes[data] & 2)) fail(); // Animation is deliberately unsupported.
        size = [1 + u24(data + 4), 1 + u24(data + 7)];
      } else if (type === 'VP8 ') {
        if (length < 10 || ascii(data + 3, 3) !== '\x9d\x01\x2a') fail();
        imageSize = [view.getUint16(data + 6, true) & 0x3fff, view.getUint16(data + 8, true) & 0x3fff];
      } else if (type === 'VP8L') {
        if (length < 5 || bytes[data] !== 0x2f) fail();
        const packed = view.getUint32(data + 1, true);
        imageSize = [(packed & 0x3fff) + 1, ((packed >>> 14) & 0x3fff) + 1];
      }
      offset = data + length + (length % 2);
    }
    if (offset !== bytes.length || !imageSize || (size && size.some((n, i) => n !== imageSize[i]))) fail();
    return imageSize;
  }
  fail();
}

/** Validate MIME, encoding, headers, dimensions and bounded bytes even for imported sources. */
export function validateRasterAsset(asset) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(asset.mimeType)) fail();
  if (typeof asset.dataUrl !== 'string' || asset.dataUrl.length > Math.ceil(MAX_ASSET_BYTES / 3) * 4 + 32) fail();
  const prefix = `data:${asset.mimeType};base64,`;
  if (!asset.dataUrl.startsWith(prefix)) fail();
  const encoded = asset.dataUrl.slice(prefix.length);
  if (!encoded.length || encoded.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) fail();
  let binary;
  try { binary = atob(encoded); } catch { fail(); }
  if (binary.length > MAX_ASSET_BYTES || btoa(binary) !== encoded) fail();
  const size = dimensions(Uint8Array.from(binary, (char) => char.charCodeAt(0)), asset.mimeType);
  if (!size || size.some((n) => !Number.isInteger(n) || n < 1 || n > 16000) || size[0] * size[1] > 40000000) fail();
  if (asset.pixelWidth !== size[0] || asset.pixelHeight !== size[1]) fail();
  return asset;
}
