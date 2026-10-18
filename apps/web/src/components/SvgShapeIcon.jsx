// Each glyph matches the geometry inserted by its tool.
export default function SvgShapeIcon({kind}) {
  return <svg className="svg-shape-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-shape={kind}>
    {kind==='rect'&&<rect x="3" y="5" width="18" height="14"/>}
    {kind==='roundrect'&&<rect x="3" y="5" width="18" height="14" rx="4"/>}
    {kind==='ellipse'&&<ellipse cx="12" cy="12" rx="10" ry="6"/>}
    {kind==='circle'&&<circle cx="12" cy="12" r="8"/>}
    {kind==='line'&&<path d="M4 20 20 4"/>}
    {kind==='arrow'&&<path d="M4 20 20 4M11 4h9v9"/>}
    {kind==='curve'&&<><path d="M3 18C4 2 20 22 21 6"/><circle cx="3" cy="18" r="1.5"/><circle cx="21" cy="6" r="1.5"/></>}
    {kind==='arc'&&<path d="M3 18A10 12 0 0 1 21 6"/>}
  </svg>;
}
