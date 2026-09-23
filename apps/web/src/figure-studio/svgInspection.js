// Inspect the bytes offered for download, not only the source document. This
// deliberately supports our standalone SVG dialect, not arbitrary SVG imports.
export function inspectExportedSvg(source, expected) {
  const check = (id, status, message, actual) => ({ id, status, scope: 'exported-file', message, ...(actual ? { actual } : {}) });
  const unavailable = (message) => [check('svg-structure', 'unverified', message)];
  const Parser = globalThis.DOMParser || globalThis.window?.DOMParser;
  if (!Parser) return unavailable('此环境没有 XML 解析能力，未核验实际 SVG 的尺寸、文字或对象。');
  if (typeof source !== 'string' || source.length > 8 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(source)) return unavailable('SVG 超过检查边界或含不支持的 XML 声明。');
  const xml = new Parser().parseFromString(source, 'image/svg+xml');
  const root = xml.documentElement;
  if (xml.querySelector('parsererror') || root.localName !== 'svg' || root.namespaceURI !== 'http://www.w3.org/2000/svg') return [check('svg-structure', 'problem', '实际文件不是完整有效的 SVG XML。')];
  // CSS, transforms, nested viewports and external resources would require a
  // renderer to determine actual dimensions. Do not pretend to inspect them.
  if (root.querySelector('style, script, foreignObject, use, svg') || root.querySelector('[style], [transform]') || root.hasAttribute('style') || root.hasAttribute('transform')) return unavailable('实际 SVG 使用了未支持的样式、变换或嵌套内容，需在目标软件检查。');
  const mm = (value) => /^\d+(?:\.\d+)?mm$/.test(value || '') ? Number(value.slice(0, -2)) : NaN;
  const widthMm = mm(root.getAttribute('width')), heightMm = mm(root.getAttribute('height'));
  const viewBox = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  const unitScale = viewBox.length === 4 && viewBox[0] === 0 && viewBox[1] === 0 && viewBox[2] === widthMm && viewBox[3] === heightMm;
  const sameSize = Math.abs(widthMm - expected.canvas.widthMm) < 0.00001 && Math.abs(heightMm - expected.canvas.heightMm) < 0.00001;
  const checks = [check('file-page-size', Number.isFinite(widthMm + heightMm) && unitScale ? sameSize ? 'passed' : 'problem' : 'unverified',
    unitScale ? `实际 SVG 页面 ${widthMm} × ${heightMm} mm，${sameSize ? '与源稿一致' : '与源稿不同'}；视口缩放没有写入文件。` : '未识别为毫米坐标与页面尺寸一致的 SVG，未确认物理尺寸。', { widthMm, heightMm, viewBox })];
  const groups = [...root.querySelectorAll('g[data-element-id]')];
  const ids = groups.map(group => group.getAttribute('data-element-id'));
  const shapeNames = { text: 'text', image: 'image', rect: 'rect', ellipse: 'ellipse', panel: 'rect', arrow: 'line', line: 'line' };
  const independent = new Set(ids).size === ids.length && groups.length === expected.elements.length && expected.elements.every(element => {
    const group = groups.find(node => node.getAttribute('data-element-id') === element.id);
    return group?.getAttribute('data-type') === element.type && [...group.children].some(child => child.localName === shapeNames[element.type]);
  });
  checks.push(check('svg-independent-objects', independent ? 'passed' : 'problem', independent ? `实际 XML 保留 ${groups.length} 个唯一对象分组及其文字/矢量/图片节点；目标软件选择行为仍需人工确认。` : '实际 SVG 的对象标识、类型或独立节点与源稿不一致。', { objectGroups: groups.length, uniqueIds: new Set(ids).size }));
  const actualText = [...root.querySelectorAll('text')];
  const expectedText = expected.elements.filter(element => element.type === 'text');
  const fonts = actualText.map(node => ({ id: node.parentElement?.getAttribute('data-element-id'), family: node.getAttribute('font-family'), sizePt: Number(node.getAttribute('font-size')) * 72 / 25.4 }));
  const fontMatch = actualText.length === expectedText.length && fonts.every(font => {
    const element = expectedText.find(item => item.id === font.id);
    return element && font.family === element.fontFamily && Math.abs(font.sizePt - element.fontSize) < 0.00001;
  });
  checks.push(check('file-text-properties', unitScale ? fontMatch ? 'passed' : 'problem' : 'unverified', unitScale ? `${actualText.length} 个实际 text 节点；${fontMatch ? '声明字体与换算后的 pt 字号和源稿一致，未转轮廓' : '字体、字号或文字节点数与源稿不一致'}。未核验字体实际安装、替换或字形外观。` : 'SVG 坐标缩放未确认，不能把 font-size 数值直接视为最终 pt 字号。', { textNodes: actualText.length, fonts }));
  return checks;
}
