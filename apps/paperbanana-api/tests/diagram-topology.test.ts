import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {compileDiagramTopology,parseDiagramTopology,inspectTopologySvg,validateTopologyAudit,topologyExtractionPrompt} from '../src/diagram-topology.js'
import {allocateVectorPanels,composeVectorPanels} from '../src/figure-composition.js'
import {inspectPanelReadability} from '../src/panel-layout.js'
import {renderSvgForReview} from '../src/svg-review.js'
import {renderProgrammaticSvg} from '../src/programmatic-svg.js'
import {semanticFixture,mockTopology,mockTopologyAudit} from './helpers/topology-fixtures.js'
import {validateRendererAudit,rendererReviewPrompt} from '../src/renderer-contract.js'
const old='../../docs/infographic-v400/completion/evidence/live-bailian',out='../../.superpowers/sdd/2026-10-10-svg-topology-repair/unit-render'
const input=async(name:string)=>JSON.parse(await readFile(`${old}/${name}/input.json`,'utf8'))
const hash=(s:string)=>createHash('sha256').update(s).digest('hex')

test('original state transitions and mixed shared End compile to actual readable 1K/2K renders',async()=>{
 await mkdir(out,{recursive:true})
 for(const type of ['workflow','state_transition'] as const){const body=await input(type==='workflow'?'mixed-workflow-bar-svg':'state-diagram-svg'),g=parseDiagramTopology(JSON.stringify(semanticFixture(type,body.methodContent)),body.methodContent)
  assert.equal(g.nodes.filter(n=>n.label==='End').length,type==='workflow'?1:0)
  for(const tier of ['1K','2K']){const viewport=type==='workflow'?allocateVectorPanels(2,{imageSize:tier,aspectRatio:'16:9'}).panels[0]:{width:tier==='1K'?1024:2048,height:tier==='1K'?576:1152,minFontPx:tier==='1K'?14:28},r=await compileDiagramTopology(g,viewport)
   assert.equal(r.geometry.passed,true);assert.equal(r.geometry.observedRelations.length,g.edges.length);for(const e of r.geometry.observedRelations)for(let i=1;i<e.points.length;i++)assert.ok(Math.abs(e.points[i].x-e.points[i-1].x)<.01||Math.abs(e.points[i].y-e.points[i-1].y)<.01,'actual shafts must remain orthogonal');assert.equal(r.svgHash,hash(r.svg));assert.ok(r.layout.fontPx>=viewport.minFontPx)
   const meta=await sharp(r.png).metadata();assert.equal(meta.width,Math.round(viewport.width));assert.equal(meta.height,Math.round(viewport.height));assert.equal(inspectPanelReadability(r.svg,viewport).passed,true)
   await writeFile(`${out}/${type}-${tier}.svg`,r.svg);await writeFile(`${out}/${type}-${tier}.png`,r.png)
  }
 }
})

test('actual endpoint, reverse direction, missing edge and branch label tampering cannot pass',async()=>{
 const body=await input('state-diagram-svg'),g=semanticFixture('state_transition',body.methodContent),r=await compileDiagramTopology(g,{width:1024,height:576,minFontPx:14})
 const wrong=r.geometry.nodes.n4,badEnd={x:wrong.x,y:wrong.y+wrong.height/2}
 const bad=r.svg.replace(/(<path id="edge_e5" d=")([^"]+)/,(_,p,d)=>p+d.replace(/L[^L]+$/,`L${badEnd.x} ${badEnd.y}`))
 assert.ok(inspectTopologySvg(bad,g).issues.includes('wrong_endpoint:e5'));assert.equal(inspectTopologySvg(bad,g).passed,false)
 const reversed=r.svg.replace(/(<path id="edge_e2" d=")([^"]+)/,(_,p,d)=>p+d.match(/[ML][^ML]+/g).reverse().map((s:string,i:number)=>(i?'L':'M')+s.slice(1)).join(' '))
 assert.equal(inspectTopologySvg(reversed,g).passed,false)
 assert.equal(inspectTopologySvg(r.svg.replace(/<path id="edge_e2"[^>]+\/>/,''),g).passed,false)
 assert.equal(inspectTopologySvg(r.svg.replace('stroke-width="','opacity="0" stroke-width="'),g).passed,false)
 assert.equal(inspectTopologySvg(r.svg.replace('</svg>','<rect x="0" y="0" width="1024" height="576" fill="white"/></svg>'),g).passed,false)
 const wb=await input('mixed-workflow-bar-svg'),wg=semanticFixture('workflow',wb.methodContent),wr=await compileDiagramTopology(wg,allocateVectorPanels(2).panels[0])
 assert.equal(inspectTopologySvg(wr.svg.replace('>yes</text>','>temporary</text>').replace('>no</text>','>yes</text>').replace('>temporary</text>','>no</text>'),wg).passed,false)
})

test('semantically wrong cancel destination cannot pass independent required-relation audit even when its drawing is internally consistent',async()=>{
 const body=await input('state-diagram-svg'),correct=semanticFixture('state_transition',body.methodContent),wrong=structuredClone(correct);wrong.edges.find(e=>e.label==='cancel')!.target='n4'
 const parsed=parseDiagramTopology(JSON.stringify(wrong),body.methodContent),rendered=await compileDiagramTopology(parsed,{width:1024,height:576,minFontPx:14})
 assert.equal(rendered.geometry.passed,true,'compiler proves graph geometry only')
 const audit=mockTopologyAudit(wrong);audit.originalRequiredRelations=mockTopologyAudit(correct).originalRequiredRelations
 assert.equal(validateTopologyAudit(JSON.stringify({topologyAudit:audit}),wrong,body.methodContent).passed,false)
 assert.throws(()=>validateTopologyAudit(JSON.stringify({topologyAudit:{...audit,topologyHash:'0'.repeat(64)}}),wrong,body.methodContent),/mismatched/)
})

test('ambiguous input, invented nodes, duplicate named End, wrong terminal semantics and unknown source provenance fail explicitly',()=>{
 const original='Input then Output',g=mockTopology(original)
 for(const change of [(x:any)=>x.uncertainties.push('unknown branch destination'),(x:any)=>x.nodes.push({...x.nodes[1],id:'extra'}),(x:any)=>x.nodes[0].label='Invented',(x:any)=>x.edges[0].sourceQuote='nonexistent',(x:any)=>{x.nodes[0].shape='terminal';x.nodes[0].role='terminal'}]){const bad=structuredClone(g);change(bad);assert.throws(()=>parseDiagramTopology(JSON.stringify(bad),original),/DIAGRAM_TOPOLOGY_INVALID/)}
})

test('generic distinct labels, reverse, parallel events and self loop use topology rather than reproduction labels',async()=>{
 const original='Alpha to Beta: open or force. Beta to Alpha: return. Beta to Beta: retry.',g=mockTopology(original)
 g.nodes[0].label='Alpha';g.nodes[1].label='Beta';g.edges=[{id:'open',source:'input',target:'output',label:'open',sourceQuote:original},{id:'force',source:'input',target:'output',label:'force',sourceQuote:original},{id:'return',source:'output',target:'input',label:'return',sourceQuote:original},{id:'retry',source:'output',target:'output',label:'retry',sourceQuote:original}]
 const r=await compileDiagramTopology(parseDiagramTopology(JSON.stringify(g),original),{width:1024,height:768,minFontPx:14});assert.equal(r.geometry.passed,true);assert.equal(r.geometry.observedRelations.length,4)
 await writeFile(out+'/generic-loops.png',r.png)
})

test('panel readability reports tiny or overlapping actual text; strict unrelated SVG policy is untouched',async()=>{
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><text x="500" y="500" font-size="10">Tiny</text><text x="500" y="500" font-size="10">Overlapping</text></svg>'
 const r=await composeVectorPanels([{label:'A',typeId:'bar',svg},{label:'B',typeId:'bar',svg}],{imageSize:'1K'})
 assert.equal(r.composition.layout.passed,false);assert.equal(r.composition.layout.svgHash,r.svgHash);assert.equal(r.composition.panels[0].svgHash,hash(svg))
 assert.ok(r.composition.layout.panels[0].issues.some(i=>i.startsWith('text_below_minimum')));assert.ok(r.composition.layout.panels[0].issues.some(i=>i.startsWith('possible_text_overlap')))
 await assert.rejects(renderSvgForReview('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><script>alert(1)</script></svg>'))
})


test('review regressions: coordinate-only yes/no swap, hidden shaft, dx displacement and rendered white overlay never pass',async()=>{
 const body=await input('mixed-workflow-bar-svg'),g=semanticFixture('workflow',body.methodContent),r=await compileDiagramTopology(g,allocateVectorPanels(2).panels[0])
 const yes=r.svg.match(/<text id="edgeLabel_e2"[^>]*>yes<\/text>/)![0],no=r.svg.match(/<text id="edgeLabel_e5"[^>]*>no<\/text>/)![0]
 const pos=(tag:string)=>Object.fromEntries([...tag.matchAll(/\b(x|y)="([^"]+)"/g)].map(m=>[m[1],m[2]])),move=(tag:string,p:Record<string,string>)=>tag.replace(/\b(x|y)="[^"]+"/g,(_,key)=>`${key}="${p[key]}"`)
 const swapped=r.svg.replace(yes,move(yes,pos(no))).replace(no,move(no,pos(yes)))
 const swappedCheck=inspectTopologySvg(swapped,g);assert.equal(swappedCheck.passed,false);assert.ok(swappedCheck.issues.includes('ambiguous_or_wrong_edge_label_position:e2'));assert.ok(swappedCheck.issues.includes('ambiguous_or_wrong_edge_label_position:e5'))
 const hidden=r.svg.replace('<path id="edge_e2"','<path id="edge_e2" stroke-dasharray="0 10000"'),shifted=r.svg.replace('<text id="edgeLabel_e2"','<text id="edgeLabel_e2" dx="-300"')
 assert.ok(inspectTopologySvg(hidden,g).issues.includes('unexpected_attribute:edge_e2'));assert.ok(inspectTopologySvg(shifted,g).issues.includes('unexpected_attribute:edgeLabel_e2'))
 const covered=r.svg.replace('</svg>','<rect id="arrow_fake" width="1024" height="1024" fill="white"/></svg>'),coveredCheck=inspectTopologySvg(covered,g)
 assert.equal(coveredCheck.passed,false);assert.ok(coveredCheck.issues.some(i=>i.includes('unexpected_element_or_order')))
 const raster=await renderProgrammaticSvg(covered),stats=await sharp(raster.png).flatten({background:'white'}).stats();assert.ok(stats.channels.every(c=>c.min===255&&c.max===255),'counterexample truly renders entirely white; checker must refuse it')
 const background=r.svg.match(/<rect width="[^"]+" height="[^"]+" fill="white"\/>/)![0],movedBackground=r.svg.replace(background,'').replace('</svg>',background+'</svg>')
 assert.equal(inspectTopologySvg(movedBackground,g).passed,false,'known background cannot be reordered above geometry')
 for(const changed of [r.svg.replace('id="arrow_e2"','id="arrow_missing"'),r.svg.replace('font-family="Noto Sans"','font-family="Noto Sans" preserveAspectRatio="none"'),r.svg.replace('id="node_n0" x="','id="node_n0" x="NaN'),r.svg.replace('id="edge_e2" d="M','id="edge_e2" d="MNaN ')])assert.equal(inspectTopologySvg(changed,g).passed,false)
 await writeFile(out+'/rejected-overlay.png',raster.png);await writeFile(out+'/rejected-label-position-swap.svg',swapped)
})

test('render-affecting scalar values are closed over the compiler design, including actually blank viewport and oversized stroke',async()=>{
 const body=await input('mixed-workflow-bar-svg'),g=semanticFixture('workflow',body.methodContent),r=await compileDiagramTopology(g,allocateVectorPanels(2).panels[0])
 const change=(id:string,key:string,value:string)=>r.svg.replace(new RegExp(`<[^>]+ id="${id}"[^>]+>`),tag=>tag.replace(new RegExp(`${key}="[^"]*"`),`${key}="${value}"`))
 const cropped=r.svg.replace('viewBox="0 0 ','viewBox="10000 10000 '),wide=change('node_n0','stroke-width','10000')
 assert.ok(inspectTopologySvg(cropped,g).issues.includes('invalid_viewbox'));assert.ok(inspectTopologySvg(wide,g).issues.includes('unsupported_stroke_width:node_n0'))
 const blankRaster=await renderProgrammaticSvg(cropped),blankStats=await sharp(blankRaster.png).ensureAlpha().stats();assert.ok(blankStats.channels.every(c=>c.min===0&&c.max===0),'shifted viewBox actually clips every visible primitive')
 const wideRaster=await renderProgrammaticSvg(wide);assert.notEqual(wideRaster.pngHash,r.pngHash,'oversized stroke actually changes the render')
 for(const [id,key,value] of [
  ['node_n0','rx','10000'],['node_n0','rx','0'],['node_n0','stroke-width','0.000001'],['edge_e0','stroke-width','10000'],['node_n1','width','10000'],['node_n1','height','1'],
  ['node_n0','fill','white'],['node_n0','stroke','transparent'],['edge_e0','stroke','white'],['arrow_e0','fill','transparent'],['edgeLabel_e2','fill','white'],['edgeLabel_e2','font-size','0'],['nodeLabel_n0_0','font-size','10000'],
 ])assert.equal(inspectTopologySvg(change(id,key,value),g).passed,false,`${id} ${key}=${value} must be rejected`)
 for(const changed of [r.svg.replace('font-family="Noto Sans"','font-family="serif"'),r.svg.replace('font-family="Noto Sans"','font-family="Noto Sans" font-weight="900"'),r.svg.replace('viewBox="0 0 ','viewBox="0x0 0 '),r.svg.replace(/font-size="[^"]+"/g,'font-size="10000"'),r.svg.replace('>yes</text>','>yes<![CDATA[hidden extra text]]></text>'),r.svg.replace('id="node_n0"','id="node_n0" ry="10000"'),r.svg.replace('id="arrow_e0" points="','id="arrow_e0" points="0x10,0 ')])assert.equal(inspectTopologySvg(changed,g).passed,false)
 const sb=await input('state-diagram-svg'),sg=semanticFixture('state_transition',sb.methodContent),sr=await compileDiagramTopology(sg,{width:1024,height:576,minFontPx:14})
 assert.equal(inspectTopologySvg(sr.svg.replace(/(<circle[^>]+ r=")[^"]+/,(_,prefix)=>prefix+'10000'),sg).passed,false)
 await writeFile(out+'/rejected-shifted-viewbox.png',blankRaster.png);await writeFile(out+'/rejected-oversized-stroke.png',wideRaster.png)
})

test('rounded rectangles only accept endpoint ports on their actual straight boundary',async()=>{
 const body=await input('mixed-workflow-bar-svg'),g=semanticFixture('workflow',body.methodContent),r=await compileDiagramTopology(g,allocateVectorPanels(2).panels[0]),node=r.geometry.nodes.n0,end=r.geometry.observedRelations.find(e=>e.edgeId==='e0')!.end
 const round=(x:number)=>Math.round(x*1000)/1000,x=round(node.x+node.radius/4),y=round(node.y+node.height),bendY=round((y+end.y)/2)
 const cutCorner=r.svg.replace(/(<path id="edge_e0" d=")[^"]+/,(_,prefix)=>prefix+`M${x} ${y} L${x} ${bendY} L${end.x} ${bendY} L${end.x} ${end.y}`)
 assert.ok(inspectTopologySvg(cutCorner,g).issues.includes('wrong_endpoint:e0'),'bounding-box corner is empty outside the rounded rectangle')
 assert.equal(inspectTopologySvg(r.svg,g).passed,true)
})

test('named entries in any language cannot silently become anonymous; initial provenance and strict node IDs are required',()=>{
 const original='入口甲 → 处理乙。Named Entry → Output.',g=mockTopology(original);g.nodes[0].label='入口甲';g.nodes[1].label='处理乙'
 assert.equal(parseDiagramTopology(JSON.stringify(g),original).nodes[0].label,'入口甲')
 const bad=structuredClone(g);bad.nodes[0]={id:'input',label:'',shape:'initial',role:'initial'};assert.throws(()=>parseDiagramTopology(JSON.stringify(bad),original),/explicit original source and marker evidence/)
 bad.nodes[0].initialEvidence={sourceQuote:'not in original',markerQuote:'dot',interpretation:'explicit_unnamed_initial'};assert.throws(()=>parseDiagramTopology(JSON.stringify(bad),original),/marker evidence/)
 // Even a fabricated interpretation of a real quote is not semantic proof;
 // the independent required-node audit must retain the original name.
 bad.nodes[0].initialEvidence={sourceQuote:'入口甲 → 处理乙',markerQuote:'入口甲',interpretation:'explicit_unnamed_initial'}
 const audit=mockTopologyAudit(bad);audit.originalRequiredNodes=mockTopologyAudit(g).originalRequiredNodes
 assert.equal(validateTopologyAudit(JSON.stringify({topologyAudit:audit}),bad,original).passed,false)
 const ids=mockTopologyAudit(g);ids.originalRequiredRelations[0].source='入口甲';assert.throws(()=>validateTopologyAudit(JSON.stringify({topologyAudit:ids}),g,original),/stable node IDs/)
 const markerOriginal='匿名初始点进入入口甲。',marker=mockTopology(markerOriginal);marker.nodes=[{id:'dot',label:'',shape:'initial',role:'initial',initialEvidence:{sourceQuote:markerOriginal,markerQuote:'匿名初始点',interpretation:'explicit_unnamed_initial'}},{id:'entry',label:'入口甲',shape:'process',role:'normal'}];marker.edges=[{id:'first',source:'dot',target:'entry',label:'',sourceQuote:markerOriginal}]
 assert.equal(parseDiagramTopology(JSON.stringify(marker),markerOriginal).nodes[0].initialEvidence!.markerQuote,'匿名初始点')
})

test('renderer requirement audit rejects missing/invented provenance and cannot turn unresolved original styling into pass',()=>{
 const body={methodContent:'Use black and white.',caption:'Original',negativePrompt:'No grid.'},entry={sourceField:'methodology',sourceQuote:'Use black and white.',requirement:'Monochrome',verdict:'unsupported',evidence:'Fixed green fills are shown.'}
 assert.equal(validateRendererAudit(JSON.stringify({rendererAudit:{originalRequirements:[entry]}}),body).passed,false)
 assert.throws(()=>validateRendererAudit('{}',body),/must be enumerated/)
 for(const change of [{sourceField:'advisoryPlan'},{sourceQuote:'Use red.'},{verdict:'probably_ok'},{evidence:''}])assert.throws(()=>validateRendererAudit(JSON.stringify({rendererAudit:{originalRequirements:[{...entry,...change}]}}),body),/provenance/)
 assert.equal(validateRendererAudit(JSON.stringify({rendererAudit:{originalRequirements:[{...entry,sourceField:'avoid',sourceQuote:'No grid.',requirement:'No grid',verdict:'satisfied',evidence:'Actual source/raster contains no grid.'}]}}),body).passed,true)
})

test('round-2 captured invalid topology and review responses remain rejected without normalizing their protocols',async()=>{
 const evidence='../../docs/infographic-v400/svg-repair-20261010/evidence/round-2',load=async(path:string)=>JSON.parse(await readFile(`${evidence}/${path}`,'utf8'))
 const state=await load('state-diagram-svg/input.json'),extraction=await load('state-diagram-svg/call-2-topology.json'),raw=JSON.parse(extraction.responseText.trim().replace(/^```(?:json)?\s*|\s*```$/g,''))
 assert.deepEqual(raw.nodes[0],{id:'initial_dot',label:'',shape:'terminal',role:'initial'});assert.equal(raw.edges.length,7)
 assert.throws(()=>parseDiagramTopology(extraction.responseText,state.methodContent+'\n'+state.caption),/DIAGRAM_TOPOLOGY_INVALID: invalid node/)
 const mixed=await load('mixed-workflow-bar-svg/input.json'),illegalSources=new Set<string>()
 for(const [number,panelIndex] of [[5,0],[7,1],[8,-1]]){
  const call=await load(`mixed-workflow-bar-svg/call-${number}-review.json`),body=panelIndex<0?mixed:{...mixed,...mixed.figurePanels[panelIndex]},response=JSON.parse(call.responseText.trim().replace(/^```(?:json)?\s*|\s*```$/g,''))
  assert.throws(()=>validateRendererAudit(call.responseText,body),/RENDERER_REVIEW_INVALID/)
  for(const item of response.rendererAudit.originalRequirements.filter((r:any)=>!['methodology','visualIntent','avoid'].includes(r.sourceField))){illegalSources.add(item.sourceField);assert.throws(()=>validateRendererAudit(JSON.stringify({rendererAudit:{originalRequirements:[item]}}),body),/RENDERER_REVIEW_INVALID/)}
 }
 assert.deepEqual([...illegalSources].sort(),['figureContract.elements','figureContract.encodingRules','referenceRequirements','rendererContract','svgRenderingConstraints'])
})

test('actual v2 extraction and renderer template pass the unchanged strict validators after explicit source resolution',async()=>{
 const {buildSourceCatalog,resolveReviewSourceRefs}=await import('../src/source-provenance.js'),{resolveTopologySourceRefs}=await import('../src/diagram-topology.js')
 const tagged=(prompt:string,tag:string)=>{const match=prompt.match(new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`));assert.ok(match,`missing ${tag} protocol example`);return match[1]}
 const body={methodContent:'Start enters End.',caption:'Use English labels.'},catalog=buildSourceCatalog(body,'job:template'),ref=catalog.entries.find(e=>e.sourceField==='methodology')!.id
 const template=tagged(topologyExtractionPrompt(),'topology_v2_template').replaceAll('ANOTHER EXACT ORIGINAL NAME','End').replaceAll('EXACT ORIGINAL NAME','Start').replaceAll('copy current catalogHash',catalog.catalogHash).replaceAll('choose original source ID containing this exact name',ref).replaceAll('choose original relation source ID',ref)
 const wire=JSON.parse(template);wire.edges[0].label='';const resolved=resolveTopologySourceRefs(JSON.stringify(wire),catalog),graph=parseDiagramTopology(resolved.resolvedRaw,body.methodContent)
 assert.deepEqual(graph.nodes.map(n=>n.label),['Start','End']);assert.equal(graph.nodes.length,2)
 const audit=JSON.parse(tagged(rendererReviewPrompt(),'renderer_audit_v2_template').replaceAll('CURRENT_CATALOG_HASH',catalog.catalogHash).replaceAll('CURRENT_ORIGINAL_REF',catalog.entries.find(e=>e.sourceField==='visualIntent')!.id))
 for(const verdict of ['satisfied','unmet','unsupported','uncertain']){audit.rendererAudit.originalRequirements[0].verdict=verdict;const resolvedAudit=resolveReviewSourceRefs(JSON.stringify(audit),catalog);assert.equal(validateRendererAudit(resolvedAudit.resolvedRaw,body).passed,verdict==='satisfied')}
})
