"""Read-only SVG geometry audit for the two visually inspected integration outputs."""
import sys,json,hashlib,xml.etree.ElementTree as E
from pathlib import Path
p=Path(sys.argv[1]);results=[];ns={'s':'http://www.w3.org/2000/svg'}
for name in ['restored-svg-1','edit-svg-1']:
 f=p/(name+'-candidate-0.svg');svg=E.fromstring(f.read_bytes());rects=svg.findall('.//s:rect',ns)
 bars=sorted([r for r in rects if 'rx' not in r.attrib and r.get('fill','').lower() not in ['white','#fff','#ffffff','none',''] and float(r.get('width','0'))<float(svg.get('viewBox').split()[2])],key=lambda r:float(r.get('x','0')))
 nodes=sorted([r for r in rects if float(r.get('rx','0'))>0],key=lambda r:(float(r.get('y','0')),float(r.get('x','0'))))
 assert len(bars)==2 and len(nodes)==3
 heights=[float(r.get('height')) for r in bars];baselines=[float(r.get('y','0'))+float(r.get('height')) for r in bars]
 arrows=[dict(r.attrib) for r in svg.findall('.//s:line',ns) if r.get('marker-end')]
 results.append({'file':f.name,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'barRects':[dict(r.attrib) for r in bars],'heightRatio':heights[0]/heights[1],'expectedRatio':35/12,'relativeRatioError':abs(heights[0]/heights[1]/(35/12)-1),'barBaselinesWithinCommonGroup':baselines,'nodeRects':[dict(r.attrib) for r in nodes],'arrows':arrows,'gradientCount':len(svg.findall('.//s:linearGradient',ns)),'method':'Source geometry checked after viewing the corresponding actual renderer PNG. Ratios computed from emitted rect attributes; this is verification, not programmatic drawing or code replacement.'})
(p/'independent-svg-geometry.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print(json.dumps(results,ensure_ascii=False,indent=2))
