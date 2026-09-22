import { validateDocument, connectorEndpoints } from './document.js';

const mmPerPoint = 25.4 / 72;
const escape = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const number = (value) => String(Number(value.toFixed(6)));
const attr = (name, value) => ` ${name}="${escape(value)}"`;
const geometry = (value) => Object.entries(value).map(([name, val]) => attr(name, number(val))).join('');

// A deterministic conservative wrap. The original text remains unchanged in the document.
function wrap(text, width, fontMm) {
  const result = [];
  for (const explicitLine of text.split(/\r\n|\r|\n/)) {
    if (!explicitLine.length) { result.push(''); continue; }
    let line = ''; let advance = 0;
    for (const char of explicitLine) {
      const charWidth = /[\u0000-\u007f]/u.test(char) ? (/[ilI.,' ]/.test(char) ? 0.3 : 0.6) * fontMm : fontMm;
      if (line && advance + charWidth > width) { result.push(line); line = ''; advance = 0; }
      line += char; advance += charWidth;
    }
    result.push(line);
  }
  return result;
}

/** Safe standalone SVG: no user markup, external resources, scripts, effects or outlined text. */
export function renderSvg(input) { return render(input, false); }

/** Print-conversion page clips keep Cairo labels in separate text blocks. */
export function renderPrintSvg(input) { return render(input, true); }
export const renderPdfSvg = renderPrintSvg;

function render(input, printTextBoundaries) {
  const doc = validateDocument(input);
  const children = new Map();
  for (const item of doc.elements) {
    const parent = item.parentId ?? null;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(item);
  }
  function render(item) {
    const wrapper = `<g${attr('id', `object-${item.id}`)}${attr('data-element-id', item.id)}${attr('data-type', item.type)}>`;
    let shape = '';
    if (item.type === 'text') {
      const fontMm = item.fontSize * mmPerPoint;
      const lines = wrap(item.text, item.width, fontMm);
      shape = `<text${attr('x', number(item.x))}${attr('y', number(item.y + fontMm))}${attr('fill', item.color)}${attr('font-family', item.fontFamily)}${attr('font-size', number(fontMm))}${attr('font-weight', item.fontWeight)} xml:space="preserve">${lines.map((line, index) => `<tspan${attr('x', number(item.x))}${attr('y', number(item.y + fontMm + index * fontMm * 1.25))}>${escape(line)}</tspan>`).join('')}</text>`;
    } else if (item.type === 'image') {
      // SVG 1.1 xlink is kept for Illustrator/Inkscape compatibility; every URI was validated.
      shape = `<image${geometry({ x: item.x, y: item.y, width: item.width, height: item.height })}${attr('xlink:href', doc.assets[item.assetId].dataUrl)} preserveAspectRatio="xMidYMid meet"/>`;
    } else if (item.type === 'line' || item.type === 'arrow') {
      const points = connectorEndpoints(item, doc.elements);
      shape = `<line${geometry(points)}${attr('stroke', item.stroke)}${attr('stroke-width', number(item.strokeWidth))} fill="none"/>`;
      if (item.type === 'arrow' && item.stroke !== 'none' && item.strokeWidth > 0) {
        const dx = points.x2 - points.x1; const dy = points.y2 - points.y1; const length = Math.hypot(dx, dy);
        if (length > 0.001) {
          const head = Math.min(Math.max(item.strokeWidth * 4, 1.5), length * 0.35);
          const ux = dx / length; const uy = dy / length;
          const bx = points.x2 - head * ux; const by = points.y2 - head * uy;
          const polygon = `${number(points.x2)},${number(points.y2)} ${number(bx - head * 0.4 * uy)},${number(by + head * 0.4 * ux)} ${number(bx + head * 0.4 * uy)},${number(by - head * 0.4 * ux)}`;
          shape += `<polygon${attr('points', polygon)}${attr('fill', item.stroke)}/>`;
        }
      }
    } else {
      const style = `${attr('fill', item.fill)}${attr('stroke', item.stroke)}${attr('stroke-width', number(item.strokeWidth))}`;
      shape = item.type === 'ellipse'
        ? `<ellipse${geometry({ cx: item.x + item.width / 2, cy: item.y + item.height / 2, rx: item.width / 2, ry: item.height / 2 })}${style}/>`
        : `<rect${geometry({ x: item.x, y: item.y, width: item.width, height: item.height })}${style}/>`;
    }
    const content = `${wrapper}${shape}${(children.get(item.id) ?? []).map(render).join('')}</g>`;
    // The clip is outside the object wrapper: page coordinates remain fixed if
    // an object later gains its own transform. Current documents reject transforms.
    return printTextBoundaries && item.type === 'text'
      ? `<g clip-path="url(#tuyan-pdf-page-boundary)">${content}</g>` : content;
  }
  const page = `x="0" y="0" width="${number(doc.canvas.widthMm)}" height="${number(doc.canvas.heightMm)}"`;
  const clips = printTextBoundaries ? `<defs><clipPath id="tuyan-pdf-page-boundary" clipPathUnits="userSpaceOnUse"><rect ${page}/></clipPath></defs>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${number(doc.canvas.widthMm)}mm" height="${number(doc.canvas.heightMm)}mm" viewBox="0 0 ${number(doc.canvas.widthMm)} ${number(doc.canvas.heightMm)}">${clips}<title>${escape(doc.title)}</title><rect ${page} fill="${escape(doc.canvas.background)}"/>${(children.get(null) ?? []).map(render).join('')}</svg>`;
}
