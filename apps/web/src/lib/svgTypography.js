// A shadow tree scopes selectors, but inherited page styles still cross its host.
// Reset the host, not the SVG: authored SVG presentation attributes must keep winning.
export const SVG_CANVAS_STYLE = ':host{all:initial;direction:ltr;unicode-bidi:normal;display:block;width:100%;height:100%}:host>svg{display:block;width:100%!important;height:100%!important;overflow:hidden;user-select:none}';

const GENERIC = new Set(['serif','sans-serif','monospace','cursive','fantasy','system-ui','ui-serif','ui-sans-serif','ui-monospace','ui-rounded','math','emoji','fangsong']);
export function primaryFont(family) {
  return (String(family).match(/"[^"]*"|'[^']*'|[^,]+/g)?.[0]||'').trim().replace(/^['"]|['"]$/g,'');
}
const probes=new Map();
// local() never downloads a font. This tests a local face name, not glyph coverage
// or the font configuration of another application; report those limits in the UI.
export function probeLocalFont(family) {
  if(!family||GENERIC.has(family.toLowerCase()))return Promise.resolve('generic');
  if(typeof FontFace==='undefined')return Promise.resolve('unknown');
  if(!probes.has(family))probes.set(family,(async()=>{
    try { await new FontFace('tuyan-local-probe',`local(${JSON.stringify(family)})`).load();return 'available'; }
    catch { return 'unresolved'; }
  })());
  return probes.get(family);
}

export async function inspectSvgFonts(root) {
  const families=[...new Set([...root.querySelectorAll('text,tspan')].map(n=>primaryFont(getComputedStyle(n).fontFamily)))].filter(Boolean);
  return Promise.all(families.map(async family=>({family,status:await probeLocalFont(family)})));
}
