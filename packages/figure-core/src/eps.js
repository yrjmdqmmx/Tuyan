const MAX_EPS_LENGTH = 64 * 1024 * 1024;
const PS_NAME = '[A-Za-z0-9_.+\\-]{1,127}';
const NAME_LINE = new RegExp(`^/FontName /(${PS_NAME}) def$`);
const GLYPH_LINE = new RegExp(`^/(${PS_NAME}) (\\d+) def$`);
const ENCODING_LINE = new RegExp(`^Encoding (\\d+) /(${PS_NAME}) put$`);
const RESOURCE_LINE = new RegExp(`^%%BeginResource: font (${PS_NAME})$`);
const NUMBER = '-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
const BBOX_LINE = new RegExp(`^/FontBBox \\[ ${NUMBER} ${NUMBER} ${NUMBER} ${NUMBER} \\] def$`);

function reject(detail) {
  const error = new Error(`EPS 字体子集无法安全处理：${detail}`);
  error.code = 'FIGURE_EPS_FONT_SUBSET_INVALID';
  throw error;
}

const familyName = name => name.replace(/^(?:[A-Z]{6}\+)+/, '');

function parseFontResource(block, offset) {
  const lines = block.replace(/\r\n/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  let cursor = 0;
  const take = expected => {
    const line = lines[cursor++];
    if (typeof expected === 'string' ? line !== expected : !expected.test(line ?? '')) reject('字体资源结构不受支持');
    return line;
  };
  const label = take(RESOURCE_LINE).match(RESOURCE_LINE)[1];
  take('11 dict begin');
  take('/FontType 42 def');
  const nameLine = take(NAME_LINE);
  const oldName = nameLine.match(NAME_LINE)[1];
  if (!familyName(oldName) || familyName(label) !== familyName(oldName)) reject('字体资源名称与字体字典不一致');
  take('/PaintType 0 def');
  take('/FontMatrix [ 1 0 0 1 0 0 ] def');
  take(BBOX_LINE);
  take('/Encoding 256 array def');
  take('0 1 255 { Encoding exch /.notdef put } for');
  const encoding = new Map();
  while (ENCODING_LINE.test(lines[cursor] ?? '')) {
    const [, codeText, glyph] = lines[cursor++].match(ENCODING_LINE);
    const code = Number(codeText);
    if (code > 255 || encoding.has(code)) reject('字体编码重复或越界');
    encoding.set(code, glyph);
  }
  const glyphCount = Number(take(/^\/CharStrings \d+ dict dup begin$/).match(/\d+/)[0]);
  if (glyphCount < 1 || glyphCount > 256) reject('字体字形数量不受支持');
  const glyphs = new Set();
  for (let i = 0; i < glyphCount; i++) {
    const [, glyph, index] = take(GLYPH_LINE).match(GLYPH_LINE);
    if (glyphs.has(glyph) || Number(index) > 65535 || (i === 0 && (glyph !== '.notdef' || index !== '0'))) reject('字体字形定义无效');
    glyphs.add(glyph);
  }
  for (const glyph of encoding.values()) if (!glyphs.has(glyph)) reject('字体编码引用缺失字形');
  take('end readonly def');
  take('/sfnts [');
  let hex = '';
  while (cursor < lines.length && lines[cursor] !== '] def') {
    const line = lines[cursor++];
    if (!/^[\da-fA-F<>\t ]+$/.test(line)) reject('字体数据必须是十六进制 sfnts');
    hex += line.replace(/[\t ]/g, '');
  }
  if (!/^(?:<[\da-fA-F]+>)+$/.test(hex)) reject('字体数据缺失或未闭合');
  for (const match of hex.matchAll(/<([\da-fA-F]+)>/g)) if (match[1].length % 2) reject('字体十六进制数据长度无效');
  take('] def');
  const resourceName = take(/^\/f-\d+-\d+ currentdict end definefont pop$/).split(' ')[0].slice(1);
  take('%%EndResource');
  if (cursor !== lines.length) reject('字体资源含额外指令');
  const nameOffset = offset + block.indexOf(nameLine) + '/FontName /'.length;
  return { resourceName, oldName, nameOffset };
}

function subsetPrefix(index) {
  let value = index, prefix = '';
  for (let i = 0; i < 6; i++) { prefix = String.fromCharCode(65 + value % 26) + prefix; value = Math.floor(value / 26); }
  if (value) reject('字体子集名称空间已耗尽');
  return prefix;
}

/**
 * Repair duplicate Type42 FontName identities in internally generated Cairo EPS.
 * This is a narrow producer compatibility repair, NOT a validator/sanitizer for
 * uploaded PostScript. Call only after our trusted SVG-to-EPS conversion.
 * Supports Cairo's hex-sfnts Type42 resource grammar; other font types fail closed.
 * Only FontName tokens change. EPS without fonts and already unique names are
 * returned byte-for-byte unchanged. renamedFonts uses the /f-N-N resource key.
 */
export function normalizeEpsFontSubsetNames(eps) {
  if (typeof eps !== 'string' || eps.length > MAX_EPS_LENGTH || !/^%!PS-Adobe-3\.0 EPSF-3\.0\r?\n/.test(eps)) reject('需要受控转换器生成的 EPS');
  if (!/^%%Creator: cairo \d+\.\d+\.\d+(?:[^\r\n]*)$/m.test(eps) || !/^%%EOF\r?\n?$/.test(eps.slice(eps.lastIndexOf('%%EOF')))) reject('缺少 Cairo 标识或 EPS 结束标记');
  const fonts = [], ids = new Set();
  let current = null;
  for (const match of eps.matchAll(/^(.*?)(\r?\n|$)/gm)) {
    const line = match[1];
    if (line.startsWith('%%BeginResource')) {
      if (current || !RESOURCE_LINE.test(line)) reject('资源嵌套、资源类型不受支持或开始标记无效');
      current = { offset: match.index };
    } else if (line.startsWith('%%EndResource')) {
      if (!current || line !== '%%EndResource') reject('字体资源结束标记无效');
      const font = parseFontResource(eps.slice(current.offset, match.index + match[0].length), current.offset);
      if (ids.has(font.resourceName) || fonts.length >= 2048) reject('字体资源 ID 重复或资源数量超限');
      ids.add(font.resourceName); fonts.push(font);
      current = null;
    } else if (!current && /^\/(?:FontName|FontType)\b/.test(line)) reject('字体定义不在资源边界内');
  }
  if (current) reject('字体资源未闭合');
  const counts = new Map(), occupied = new Set(fonts.map(font => font.oldName));
  for (const font of fonts) counts.set(font.oldName, (counts.get(font.oldName) ?? 0) + 1);
  const renamedFonts = [], replacements = [];
  let nextPrefix = 0;
  for (const font of fonts) {
    if (counts.get(font.oldName) === 1) continue;
    const family = familyName(font.oldName);
    if (family.length > 120) reject('字体名称过长，无法添加安全子集前缀');
    let newName;
    do { newName = `${subsetPrefix(nextPrefix++)}+${family}`; } while (occupied.has(newName));
    occupied.add(newName);
    renamedFonts.push({ resourceName: font.resourceName, oldName: font.oldName, newName });
    replacements.push({ ...font, newName });
  }
  if (!replacements.length) return { eps, renamedFonts };
  const parts = [];
  let offset = 0;
  for (const replacement of replacements) {
    parts.push(eps.slice(offset, replacement.nameOffset), replacement.newName);
    offset = replacement.nameOffset + replacement.oldName.length;
  }
  parts.push(eps.slice(offset));
  return { eps: parts.join(''), renamedFonts };
}

/** Preserve Cairo label blocks through EPS-to-PDF import. Trusted producer only;
 * not a parser or sanitizer for uploaded PostScript. Standard pdfmark is a no-op
 * on ordinary PostScript interpreters, and never adds painted content. */
export function preserveEpsTextBoundaries(eps) {
  const fail = detail => { throw Object.assign(new Error(`EPS 文字边界无法安全处理：${detail}`), { code: 'FIGURE_EPS_TEXT_BOUNDARY_INVALID' }); };
  if (typeof eps !== 'string' || eps.length > MAX_EPS_LENGTH || !/^%!PS-Adobe-3\.0 EPSF-3\.0\r?\n/.test(eps)
    || !/^%%Creator: cairo \d+\.\d+\.\d+(?:[^\r\n]*)$/m.test(eps)) fail('需要受控 Cairo EPS');
  const lines = eps.split(/(?<=\n)/);
  const text = line => line.replace(/\r?\n$/, '');
  const positions = expression => lines.flatMap((line, index) => expression.test(text(line)) ? [index] : []);
  const single = expression => { const found = positions(expression); if (found.length !== 1) fail('文档边界缺失或重复'); return found[0]; };
  const begin = single(/^%%BeginProlog$/), end = single(/^%%EndProlog$/), page = single(/^%%Page: 1 1$/), trailer = single(/^%%Trailer$/), eof = single(/^%%EOF$/);
  if (!(begin < end && end < page && page < trailer && trailer < eof) || lines.slice(eof + 1).some(line => line.trim())) fail('文档边界顺序无效');
  if (positions(/^%%Page:/).length !== 1 || positions(/^(?:\/pdfmark\b|\[ \/(?:TuyanLabel \/BMC|EMC) pdfmark)/).length) fail('页数或已有标记不受支持');
  const prolog = lines.slice(begin + 1, end).map(text);
  if (prolog.filter(line => line === '/BT { } bind def').length !== 1 || prolog.filter(line => line === '/ET { } bind def').length !== 1) fail('文字操作定义不受支持');
  let active = false, ended = false, imageData = false, textBlocks = 0;
  const replacements = new Map();
  for (let index = page + 1; index < trailer; index++) {
    const token = text(lines[index]).trim();
    const newline = lines[index].endsWith('\r\n') ? '\r\n' : '\n';
    if (imageData) {
      if (/^[!-uz\s]*~>$/.test(token)) imageData = false;
      else if (!/^[!-uz\s]*$/.test(token)) fail('图片 ASCII85 数据无效或未闭合');
      continue;
    }
    if (token === 'cairo_image' || token === 'cairo_imagemask') {
      if (active || ended) fail('图片位于文字块或页面结束之后');
      imageData = true;
      continue;
    }
    if (/^(?:BT|ET)(?:\s|$)/.test(token) && token !== 'BT' && token !== 'ET') fail('文字操作必须独占一行');
    if (/^\/(?:BT|ET)\b/.test(token)) fail('页面不可重定义文字操作');
    if (token === 'BT') {
      if (active || ended) fail('文字块嵌套或位于页面结束之后');
      active = true; textBlocks++;
      replacements.set(index, `[ /TuyanLabel /BMC pdfmark${newline}${lines[index]}`);
    } else if (token === 'ET') {
      if (!active || ended) fail('文字块结束标记不匹配');
      active = false;
      replacements.set(index, `${lines[index]}[ /EMC pdfmark${newline}`);
    } else if (token === 'showpage') {
      if (active || ended) fail('文字块未闭合或页面重复结束');
      ended = true;
    }
  }
  if (active || imageData || !ended) fail('文字块、图片或页面未闭合');
  if (!textBlocks) return { eps, textBlocks: 0 };
  const newline = lines[end].endsWith('\r\n') ? '\r\n' : '\n';
  replacements.set(end, `/pdfmark where {pop} { /pdfmark {cleartomark} bind def } ifelse${newline}${lines[end]}`);
  return { eps: lines.map((line, index) => replacements.get(index) ?? line).join(''), textBlocks };
}
