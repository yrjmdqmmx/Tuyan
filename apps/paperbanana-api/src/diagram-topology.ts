import ELK from 'elkjs/lib/elk.bundled.js'
import {SaxesParser} from 'saxes'
import {createHash} from 'node:crypto'
import {renderProgrammaticSvg} from './programmatic-svg.js'
import {strictSourceJson,assertSourceHeader,sourceEntry,sourceReferencePrompt,sourceProtocolError,sourceValueType,type SourceCatalog,type SourceDiagnostic} from './source-provenance.js'

export type DiagramNode = {id:string;label:string;shape:'process'|'decision'|'terminal'|'initial';role:'normal'|'initial'|'terminal';initialEvidence?:{sourceQuote:string;markerQuote:string;interpretation:'explicit_unnamed_initial'}}
export type DiagramEdge = {id:string;source:string;target:string;label:string;sourceQuote:string}
export type DiagramTopology = {schemaVersion:1;nodes:DiagramNode[];edges:DiagramEdge[];uncertainties:string[];layout:{direction:'RIGHT'|'DOWN'}}
export type DiagramViewport = {width:number;height:number;minFontPx:number}
type Point={x:number;y:number}
type Box=Point & {width:number;height:number}
export const topologyHash=(value:DiagramTopology)=>createHash('sha256').update(JSON.stringify({schemaVersion:1,nodes:value.nodes,edges:value.edges})).digest('hex')
const hash=(value:string)=>createHash('sha256').update(value).digest('hex')
const esc=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const number=(v:number)=>Math.round(v*1000)/1000
const fail=(reason:string):never=>{throw new Error('DIAGRAM_TOPOLOGY_INVALID: '+reason)}
const id=(v:unknown)=>typeof v==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,47}$/.test(v)
export const isTopologyDiagram=(type:unknown)=>type==='workflow'||type==='state_transition'
/** Explicit v2 wire compilation, never a repair of an invalid legacy graph. */
export function resolveTopologySourceRefs(raw:string,catalog:SourceCatalog){
 const data=strictSourceJson(raw)
 if(data?.schemaVersion!==2){if(data?.sourceProtocolVersion!==undefined||data?.sourceCatalogHash!==undefined)throw new Error('SOURCE_PROTOCOL_INVALID: topology schemaVersion 2 required');return {resolvedRaw:raw,mode:'legacy_quote' as const,trace:[]}}
 assertSourceHeader(data,catalog)
 const reject=(detail:string,diagnostic?:SourceDiagnostic):never=>{throw sourceProtocolError(detail,diagnostic)}
 const object=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v)
 const keys=(v:any,allowed:string[])=>object(v)&&Object.keys(v).every(k=>allowed.includes(k))
 if(!keys(data,['schemaVersion','sourceProtocolVersion','sourceCatalogHash','namedNodes','anonymousInitials','edges','uncertainties','layout'])||!object(data.namedNodes)||!object(data.anonymousInitials)||!Array.isArray(data.edges)||!Array.isArray(data.uncertainties))reject('invalid topology v2 envelope')
 const nodes:DiagramNode[]=[],names=new Map<string,string>(),initials=new Map<string,string>(),trace:any[]=[]
 const reference=(ref:unknown,path:string)=>{const e=sourceEntry(catalog,ref,['methodology','visualIntent']);trace.push({path,sourceRef:e.id,sourceField:e.sourceField,start:e.start,end:e.end,sha256:e.sha256});return e.text}
 const stable=(kind:string,key:string)=>'n_'+hash(catalog.scope+'\0'+kind+'\0'+key).slice(0,16)
 for(const [name,value] of Object.entries(data.namedNodes) as Array<[string,any]>){
  if(!keys(value,['shape','role','sourceRef'])||!name.trim())reject('invalid named node fields; distinct same-name instances require explicit disambiguated source names')
  const quote=reference(value.sourceRef,`namedNodes[${JSON.stringify(name)}]`)
  if(!quote.includes(name))reject('node reference does not contain exact label')
  const nodeId=stable('named',name);names.set(name,nodeId);nodes.push({id:nodeId,label:name,shape:value.shape,role:value.role})
 }
 for(const [key,value] of Object.entries(data.anonymousInitials) as Array<[string,any]>){
  if(!id(key)||!keys(value,['sourceRef','markerQuote','interpretation']))reject('invalid anonymous initial fields',{path:`$.anonymousInitials[${JSON.stringify(key).slice(0,160)}]`,expected:'anonymousInitials is a map: {"marker_a":{"sourceRef":"catalog ID","markerQuote":"exact original marker phrase","interpretation":"explicit_unnamed_initial"}}; each value is an evidence object and an edge references its key with {"initial":"marker_a"}',actualType:sourceValueType(value)})
  const sourceQuote=reference(value.sourceRef,`anonymousInitials[${JSON.stringify(key)}]`),nodeId=stable('initial',key);initials.set(key,nodeId);nodes.push({id:nodeId,label:'',shape:'initial',role:'initial',initialEvidence:{sourceQuote,markerQuote:value.markerQuote,interpretation:value.interpretation}})
 }
 const endpoint=(v:any)=>{if(keys(v,['name'])&&typeof v.name==='string'&&names.has(v.name))return names.get(v.name)!;if(keys(v,['initial'])&&typeof v.initial==='string'&&initials.has(v.initial))return initials.get(v.initial)!;return reject('unknown or invalid named endpoint')}
 const edges=data.edges.map((e:any,i:number)=>{if(!keys(e,['source','target','label','sourceRef']))reject('invalid edge provenance fields');return {id:'edge_'+i,source:endpoint(e.source),target:endpoint(e.target),label:e.label,sourceQuote:reference(e.sourceRef,`edges[${i}]`)}})
 return {resolvedRaw:JSON.stringify({schemaVersion:1,nodes,edges,uncertainties:data.uncertainties,layout:data.layout}),mode:'source_ref' as const,trace}
}
export const topologyRendererContract=()=>({id:'elkjs-0.12.0-topology-v1',kind:'topology',fixed:{background:'white',nodeFill:'#e5efeb',decisionFill:'#f5ead6',strokeAndArrow:'#355c53',text:'#203d37',font:'Noto Sans regular, normal style',shapes:'named process/state: rounded rectangle; named start/end: more rounded rectangle; decision: diamond; explicitly unnamed initial: dot',connections:'orthogonal polylines with filled triangle arrows'},layout:{direction:'RIGHT or DOWN is an adaptable hint; compiler selects readable fit and actualLayout is authoritative',nodePositions:'computed by ELK; cycles do not guarantee initial node leftmost/topmost',branchPositions:'no universal yes/no left/right/down rule; preserve original endpoints and labels'},unsupported:['arbitrary palettes/fonts/font weights','curved arrows','fixed node coordinates/order','unrequested anonymous substitution for a named node'],text:'uniform scale; physical minimum 14px at 1K and 28px at 2K; allocated panel size governs layout'})
export function parseDiagramTopology(raw:string,original:string):DiagramTopology {
 let data:any
 try{data=JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g,''))}catch{fail('expected topology JSON; no freehand SVG fallback')}
 if(data?.schemaVersion!==1||!Array.isArray(data.nodes)||!Array.isArray(data.edges)||!Array.isArray(data.uncertainties))fail('schemaVersion, nodes, edges and uncertainties required')
 if(data.uncertainties.length)fail('ambiguous original input: '+JSON.stringify(data.uncertainties).slice(0,500))
 if(data.nodes.length<2||data.nodes.length>24||data.edges.length<1||data.edges.length>48)fail('supported bounds are 2–24 nodes and 1–48 edges')
 const nodes:DiagramNode[]=data.nodes.map((n:any)=>{
  if(!id(n.id)||typeof n.label!=='string'||n.label.length>100||(!n.label.trim()&&n.shape!=='initial')||!['process','decision','terminal','initial'].includes(n.shape)||!['normal','initial','terminal'].includes(n.role))fail('invalid node')
  if(n.label&&!original.includes(n.label))fail('node label absent from original input: '+n.label)
  if((n.shape==='terminal'&&n.role==='normal')||(n.role==='terminal'&&n.shape!=='terminal'))fail('terminal shape and role must agree')
  if(n.shape==='initial'&&(n.role!=='initial'||n.label.trim()))fail('initial pseudostate must have initial role and empty label')
  if(n.shape==='initial'){
   const ev=n.initialEvidence
   if(!ev||ev.interpretation!=='explicit_unnamed_initial'||typeof ev.sourceQuote!=='string'||!ev.sourceQuote.trim()||!original.includes(ev.sourceQuote)||typeof ev.markerQuote!=='string'||!ev.markerQuote.trim()||!ev.sourceQuote.includes(ev.markerQuote))fail('anonymous initial marker needs explicit original source and marker evidence; preserve named starts')
   return {id:n.id,label:n.label,shape:n.shape,role:n.role,initialEvidence:Object.freeze({sourceQuote:ev.sourceQuote,markerQuote:ev.markerQuote,interpretation:'explicit_unnamed_initial' as const})}
  }
  if(n.initialEvidence!==undefined)fail('initialEvidence applies only to explicitly unnamed initial marker')
  return {id:n.id,label:n.label,shape:n.shape,role:n.role}
 })
 if(new Set(nodes.map(n=>n.id)).size!==nodes.length)fail('duplicate node IDs')
 if(new Set(nodes.filter(n=>n.label.trim()).map(n=>n.label.trim().toLowerCase())).size!==nodes.filter(n=>n.label.trim()).length)fail('duplicate named nodes require explicit disambiguation in original input')
 const edges:DiagramEdge[]=data.edges.map((e:any)=>{
  if(!id(e.id)||!nodes.some(n=>n.id===e.source)||!nodes.some(n=>n.id===e.target)||typeof e.label!=='string'||e.label.length>80||typeof e.sourceQuote!=='string'||!e.sourceQuote.trim()||!original.includes(e.sourceQuote))fail('invalid edge or sourceQuote absent from original input')
  return {id:e.id,source:e.source,target:e.target,label:e.label,sourceQuote:e.sourceQuote}
 })
 if(new Set(edges.map(e=>e.id)).size!==edges.length)fail('duplicate edge IDs')
 if(new Set(edges.map(e=>JSON.stringify([e.source,e.target,e.label]))).size!==edges.length)fail('duplicate identical relations')
 for(const n of nodes){
  if(!edges.some(e=>e.source===n.id||e.target===n.id))fail('unconnected node '+n.id)
  if(n.role==='terminal'&&edges.some(e=>e.source===n.id))fail('terminal node has outgoing relation '+n.id)
  if(n.shape==='initial'&&(edges.filter(e=>e.source===n.id).length!==1||edges.some(e=>e.target===n.id)))fail('initial pseudostate requires exactly one outgoing and no incoming relation')
 }
 const result:DiagramTopology={schemaVersion:1,nodes,edges,uncertainties:[],layout:{direction:data.layout?.direction==='RIGHT'?'RIGHT':'DOWN'}}
 for(const n of nodes)Object.freeze(n);for(const e of edges)Object.freeze(e);Object.freeze(nodes);Object.freeze(edges);Object.freeze(result.layout);Object.freeze(result.uncertainties);return Object.freeze(result)
}
export function topologyExtractionPrompt() {return `You are the Diagram Topology Agent. Return ONLY the explicit v2 JSON wire below, derived from ORIGINAL methodology/caption. Read sourceCatalog and full originals; advisory plans and reference pictures cannot invent facts.
<topology_v2_template>
{"schemaVersion":2,"sourceProtocolVersion":2,"sourceCatalogHash":"copy current catalogHash","namedNodes":{"EXACT ORIGINAL NAME":{"shape":"process","role":"normal","sourceRef":"choose original source ID containing this exact name"},"ANOTHER EXACT ORIGINAL NAME":{"shape":"process","role":"normal","sourceRef":"choose original source ID containing this exact name"}},"anonymousInitials":{},"edges":[{"source":{"name":"EXACT ORIGINAL NAME"},"target":{"name":"ANOTHER EXACT ORIGINAL NAME"},"label":"event/condition or empty string","sourceRef":"choose original relation source ID"}],"uncertainties":[],"layout":{"direction":"RIGHT"}}
</topology_v2_template>
NAMES ARE IDENTITIES within this panel. namedNodes is an object keyed by the exact non-empty original display name; each key occurs exactly once. Repeated references to the SAME supplied name, including endpoints reached by different branches, must use that same namedNodes key. Do not create IDs, branch suffixes, synonyms, duplicated keys or duplicate display-name fields. A branch name or different incoming predecessor is NOT evidence of a distinct instance. If the original explicitly distinguishes separate same-name instances that cannot be expressed using distinct verbatim supplied names, report that unsupported identity requirement in uncertainties; never silently merge them. Different panels are independent namespaces. Your own duplicate extraction is not ambiguity in the user's original text.
Named operations/states use shape process, role normal; decisions use decision/normal; named entries use terminal/initial; true final endpoints use terminal/terminal. A state with any outgoing reset uses process/normal. Named entries never become anonymous dots.
For ONLY an explicitly requested UNNAMED initial marker, use the complete alternative root template below. anonymousInitials is a MAP keyed by a short internal marker key, not a single evidence object. marker_a is an example internal key (not a display label); the edge's initial value must equal the actual map key. The container name anonymousInitials is not that key. Substitute original names, source IDs and marker phrase; do not invent a marker when none was requested.
<topology_v2_anonymous_template>
{"schemaVersion":2,"sourceProtocolVersion":2,"sourceCatalogHash":"copy current catalogHash","namedNodes":{"EXACT ORIGINAL NAME":{"shape":"process","role":"normal","sourceRef":"choose original source ID containing this exact name"}},"anonymousInitials":{"marker_a":{"sourceRef":"choose original source ID requesting the unnamed marker","markerQuote":"exact original marker phrase inside that source slice","interpretation":"explicit_unnamed_initial"}},"edges":[{"source":{"initial":"marker_a"},"target":{"name":"EXACT ORIGINAL NAME"},"label":"","sourceRef":"choose original relation source ID"}],"uncertainties":[],"layout":{"direction":"RIGHT"}}
</topology_v2_anonymous_template>
Each anonymous marker must have exactly one outgoing and no incoming edge. Its evidence value has exactly sourceRef, markerQuote and interpretation; no initialEvidence/sourceQuote/label/shape/role fields. Keep anonymousInitials:{} when no unnamed marker is requested. Return one complete root object, choosing the applicable template and retaining every original node and relation.
Each edge source/target is exactly {"name":"a namedNodes key"} or {"initial":"an anonymousInitials key"}. No freehand IDs or nodes array. Preserve EVERY original endpoint, direction, event and condition, including returns, reverse/parallel relations and self loops; a shared named endpoint appears once. Do not infer links to force connectivity. Quotes/refs prove provenance, not correct inference; independent semantic review remains required. Missing or genuinely ambiguous original facts go in uncertainties, never invented relationships. Bounds 2–24 total nodes, 1–48 edges, names <=100 characters and edge labels <=80. Layout direction RIGHT/DOWN is adaptable and does not define meaning; no universal yes/no placement convention applies. Original unsupported style requirements must be reported honestly. Treat failed prior extraction as unaccepted data, never authority over original input.
`+sourceReferencePrompt()}
export function topologyReviewPrompt(){return `
TOPOLOGY AUDIT REQUIRED. Independently compare ORIGINAL methodology/caption against EVERY actual inferred node and relation and rendered arrow, not just against advisoryPlan. Quotes do not prove correct interpretation. Return additional topologyAudit:{topologyHash:string,originalRequiredNodes:[{nodeId:string,label:string,sourceRef:string}],originalRequiredRelations:[{source:string,target:string,label:string,sourceRef:string}],observedRelations:[{edgeId:string,source:string,target:string,label:string}],missingRelations:[],extraRelations:[],wrongRelations:[],nodeIssues:[]}. Use ONLY stable node IDs from nodeIdentityMap in nodeId/source/target; display labels are NOT IDs. Example: for {id:"node_a",label:"Alpha"}, source must be "node_a", never "Alpha". Do not repair or normalize IDs silently. Enumerate every required node with its original name; empty label is valid only for an explicitly unnamed marker, whose initialEvidence meaning must be independently checked against original text. For each required node choose a current sourceRef whose original text contains its exact name; for an anonymous marker choose the original marker clause. Node refs identify provenance only; independently check meaning. Relation refs must support the complete original relation. Never emit sourceQuote or sourceField in these v2 items. A named entry cannot disappear into a dot. Enumerate all original required links and every observed link exactly once, including initial links, reverse/return/self loops. Check actual endpoints and event/yes/no label association; a branch's left/right/down placement cannot itself reverse semantics and no universal yes/no placement convention is binding. List semantic errors in missingRelations/extraRelations/wrongRelations/nodeIssues with concrete original evidence. Only use empty issue arrays when independently checked. Never treat an actual wrong destination as arrow placement. LocalGeometryCheck failure forbids passed. Layout revision cannot change semantic topology. If only actual visible readability/layout needs repair return layoutRepair:{direction:"RIGHT"|"DOWN"}; this changes orientation only, not palette, fonts, shape or exact node positions. If no feasible repair or semantic errors remain, report issues_found. Keep full ordinary visual/code review, exact current version and SVG hash. Never certify a future version.`+sourceReferencePrompt()}
export function validateTopologyAudit(raw:string,topology:DiagramTopology,original:string) {
 const data=JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g,'')),audit=data.topologyAudit
 if(!audit||audit.topologyHash!==topologyHash(topology))throw new Error('DIAGRAM_REVIEW_INVALID: missing or mismatched topology audit')
 for(const key of ['originalRequiredNodes','originalRequiredRelations','observedRelations','missingRelations','extraRelations','wrongRelations','nodeIssues'])if(!Array.isArray(audit[key]))throw new Error('DIAGRAM_REVIEW_INVALID: '+key+' must be enumerated')
 const ids=new Set(topology.nodes.map(n=>n.id))
 for(const n of audit.originalRequiredNodes)if(!ids.has(n.nodeId)||typeof n.label!=='string'||typeof n.sourceQuote!=='string'||!n.sourceQuote.trim()||!original.includes(n.sourceQuote))throw new Error('DIAGRAM_REVIEW_INVALID: required node lacks stable ID or original evidence')
 for(const r of [...audit.originalRequiredRelations,...audit.observedRelations])if(!ids.has(r.source)||!ids.has(r.target))throw new Error('DIAGRAM_REVIEW_INVALID: source/target must be stable node IDs, not display labels')
 const observed=audit.observedRelations
 if(observed.length!==topology.edges.length||new Set(observed.map((r:any)=>r.edgeId)).size!==observed.length||topology.edges.some(e=>!observed.some((r:any)=>r.edgeId===e.id&&r.source===e.source&&r.target===e.target&&r.label===e.label)))throw new Error('DIAGRAM_REVIEW_INVALID: observed relations do not match exact delivered graph')
 for(const r of audit.originalRequiredRelations)if(typeof r.sourceQuote!=='string'||!r.sourceQuote.trim()||!original.includes(r.sourceQuote)||typeof r.source!=='string'||typeof r.target!=='string'||typeof r.label!=='string')throw new Error('DIAGRAM_REVIEW_INVALID: required relation lacks original evidence')
 const key=(r:any)=>JSON.stringify([r.source,r.target,r.label]),required=audit.originalRequiredRelations.map(key),actual=topology.edges.map(key)
 const nodesExact=audit.originalRequiredNodes.length===topology.nodes.length&&new Set(audit.originalRequiredNodes.map((n:any)=>n.nodeId)).size===topology.nodes.length&&topology.nodes.every(n=>audit.originalRequiredNodes.some((r:any)=>r.nodeId===n.id&&r.label===n.label))
 const exact=nodesExact&&required.length===actual.length&&new Set(required).size===required.length&&actual.every(k=>required.includes(k))
 return {passed:exact&&['missingRelations','extraRelations','wrongRelations','nodeIssues'].every(k=>audit[k].length===0),audit,layoutRepair:['RIGHT','DOWN'].includes(data.layoutRepair?.direction)?data.layoutRepair.direction as 'RIGHT'|'DOWN':undefined}
}
// Conservative advance estimates deliberately overestimate common Noto glyphs.
export const textAdvance=(text:string,size:number)=>[...text].reduce((sum,c)=>sum+(c===' '?0.36:/[il.,:;'!|]/.test(c)?0.36:/[MW@%]/.test(c)?1:/[\x00-\x7f]/.test(c)?0.72:1.08)*size,0)
function lines(label:string,size:number,maxWidth=150){
 const out:string[]=[];let current=''
 for(const word of label.split(/\s+/)){
  if(textAdvance(word,size)>maxWidth){for(const c of word){if(textAdvance(current+c,size)>maxWidth&&current){out.push(current);current=''}current+=c}continue}
  if(current&&textAdvance(current+' '+word,size)>maxWidth){out.push(current);current=word}else current+=(current?' ':'')+word
 }
 if(current)out.push(current)
 return out.length?out:['']
}
// All render-affecting sizes come from this fixed design and one uniform scale.
// The inspector verifies these relationships; arbitrary SVG styling is unsupported.
function nodeDesign(n:DiagramNode){
 const text=lines(n.label,18),width=n.shape==='initial'?16:Math.max(68,...text.map(t=>textAdvance(t,18)))+28,height=n.shape==='initial'?16:text.length*22.5+22
 return {text,width:n.shape==='decision'?width*1.8:width,height:n.shape==='decision'?height*1.8:height}
}
function overlap(a:Box,b:Box,pad=0){return a.x<b.x+b.width-pad&&a.x+a.width>b.x+pad&&a.y<b.y+b.height-pad&&a.y+a.height>b.y+pad}
function boundary(node:Box&{shape:string},p:Point):Point {
 const cx=node.x+node.width/2,cy=node.y+node.height/2,dx=p.x-cx,dy=p.y-cy
 const t=node.shape==='decision'?1/(Math.abs(dx)/(node.width/2)+Math.abs(dy)/(node.height/2)):node.shape==='initial'?1/Math.sqrt((dx/(node.width/2))**2+(dy/(node.height/2))**2):Math.min(Math.abs((node.width/2)/(dx||1e-12)),Math.abs((node.height/2)/(dy||1e-12)))
 return {x:cx+dx*t,y:cy+dy*t}
}
function portBoundary(node:Box&{shape:string},port:Point,neighbor:Point):Point {
 if(node.shape!=='decision'&&node.shape!=='initial')return port
 const cx=node.x+node.width/2,cy=node.y+node.height/2,rx=node.width/2,ry=node.height/2
 const vertical=Math.abs(port.x-neighbor.x)<.1
 if(vertical){const ratio=Math.min(1,Math.abs(port.x-cx)/rx),extent=ry*(node.shape==='decision'?1-ratio:Math.sqrt(1-ratio*ratio));return {x:port.x,y:cy+(port.y<cy?-extent:extent)}}
 const ratio=Math.min(1,Math.abs(port.y-cy)/ry),extent=rx*(node.shape==='decision'?1-ratio:Math.sqrt(1-ratio*ratio));return {x:cx+(port.x<cx?-extent:extent),y:port.y}
}
function onBoundary(node:Box&{shape:string;radius?:number},p:Point){
 if(node.shape==='process'||node.shape==='terminal'){
  // ELK rectangular ports must lie on the actual straight portion of a rounded
  // rectangle. Ports in the cut-off corners are unsupported, not projected.
  const r=node.radius||0,tolerance=.01
  return ((Math.abs(p.x-node.x)<tolerance||Math.abs(p.x-node.x-node.width)<tolerance)&&p.y>=node.y+r-tolerance&&p.y<=node.y+node.height-r+tolerance)||((Math.abs(p.y-node.y)<tolerance||Math.abs(p.y-node.y-node.height)<tolerance)&&p.x>=node.x+r-tolerance&&p.x<=node.x+node.width-r+tolerance)
 }
 const b=boundary(node,p);return Math.hypot(b.x-p.x,b.y-p.y)<.01
}
function segmentHits(a:Point,b:Point,r:Box){
 // Liang–Barsky interior clipping, independent of path metadata.
 let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y,p=[-dx,dx,-dy,dy],q=[a.x-r.x,r.x+r.width-a.x,a.y-r.y,r.y+r.height-a.y]
 for(let i=0;i<4;i++){if(Math.abs(p[i])<1e-9){if(q[i]<=0)return false}else {const t=q[i]/p[i];if(p[i]<0)lo=Math.max(lo,t);else hi=Math.min(hi,t)}}return lo<hi&&hi>0&&lo<1
}

/** Inspect actual source primitives. Semantic metadata, SVG IDs and a model's
 * passed opinion cannot substitute for endpoint, direction and label checks. */
export function inspectTopologySvg(svg:string,topology:DiagramTopology,minFontPx=14){
 const elements=new Map<string,{tag:string;a:Record<string,string>;text:string}>(),issues:string[]=[],stack:any[]=[],sequence:Array<{tag:string;id?:string;a:Record<string,string>}>=[]
 const expected:Array<{tag:string;id?:string;attrs:string[]}>=[]
 const expect=(tag:string,id:string|undefined,attrs:string[])=>expected.push({tag,id,attrs})
 expect('svg',undefined,['xmlns','width','height','viewBox','font-family']);expect('title',undefined,[]);expect('rect',undefined,['width','height','fill'])
 for(const e of topology.edges){expect('path','edge_'+e.id,['id','d','fill','stroke','stroke-width']);expect('polygon','arrow_'+e.id,['id','points','fill']);if(e.label)expect('text','edgeLabel_'+e.id,['id','x','y','font-size','text-anchor','fill'])}
 for(const n of topology.nodes){
  expect(n.shape==='initial'?'circle':n.shape==='decision'?'polygon':'rect','node_'+n.id,n.shape==='initial'?['id','cx','cy','r','fill']:n.shape==='decision'?['id','points','fill','stroke','stroke-width']:['id','x','y','width','height','rx','fill','stroke','stroke-width'])
  if(n.label)lines(n.label,18).forEach((_,i)=>expect('text','nodeLabel_'+n.id+'_'+i,['id','x','y','font-size','text-anchor','fill']))
 }
 const parser=new SaxesParser({xmlns:true});let root:Record<string,string>={}
 parser.on('error',e=>{throw e});parser.on('doctype',()=>issues.push('unsupported_doctype'));parser.on('processinginstruction',()=>issues.push('unsupported_processing_instruction'));parser.on('cdata',()=>issues.push('unsupported_cdata'))
 parser.on('opentag',t=>{
  const a=Object.fromEntries(Object.values(t.attributes).map(v=>[v.name,v.value])),element={tag:t.local,a,text:''},slot=expected[sequence.length]
  if(!stack.length)root=a
  if(t.uri!=='http://www.w3.org/2000/svg'||t.prefix||stack.length>1)issues.push('unsupported_element_nesting_or_namespace')
  if(!slot||slot.tag!==t.local||slot.id!==a.id)issues.push('unexpected_element_or_order:'+String(a.id||t.local))
  else if(Object.keys(a).length!==slot.attrs.length||Object.keys(a).some(k=>!slot.attrs.includes(k)))issues.push('unexpected_attribute:'+String(a.id||t.local))
  for(const key of ['width','height','x','y','cx','cy','r','rx','font-size','stroke-width'])if(a[key]!==undefined&&(!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(a[key])||!Number.isFinite(+a[key])))issues.push('invalid_numeric_attribute:'+String(a.id||t.local)+':'+key)
  sequence.push({tag:t.local,id:a.id,a})
  if(a.id){if(elements.has(a.id))issues.push('duplicate_element:'+a.id);elements.set(a.id,element)}
  stack.push(element)
 });parser.on('text',text=>{if(stack.length){if(!['text','title'].includes(stack.at(-1).tag)&&text.trim())issues.push('untracked_text');stack.at(-1).text+=text}});parser.on('closetag',()=>{stack.pop()});parser.write(svg).close()
 if(sequence.length!==expected.length)issues.push('element_count_mismatch')
 if(root['font-family']!=='Noto Sans')issues.push('unsupported_font_family')
 const background=sequence[2]?.a
 if(!background||background.fill!=='white'||background.width!==root.width||background.height!==root.height)issues.push('invalid_background')
 const scalar='-?(?:0|[1-9]\\d*)(?:\\.\\d{1,3})?',pointGrammar=new RegExp(`^${scalar},${scalar}(?: ${scalar},${scalar})+$`),pathGrammar=new RegExp(`^M${scalar} ${scalar}(?: L${scalar} ${scalar})+$`)
 const nums=(s='')=>s.trim().split(/[ ,]+/).map(Number),nodes=new Map<string,Box&{shape:string;radius:number;strokeWidth:number}>(),labels:Box[]=[],edgeLabels=new Map<string,Box&{font:number}>(),observed:any[]=[]
 const box=root.viewBox?.split(/\s+/).map(Number)||[]
 if(root.viewBox!==`0 0 ${root.width} ${root.height}`||box.length!==4||box.some(n=>!Number.isFinite(n))||box[0]!==0||box[1]!==0||+root.width!==box[2]||+root.height!==box[3]||box[2]<100||box[3]<100||box[2]>4096||box[3]>4096)issues.push('invalid_viewbox')
 const fontSize=+[...elements.values()].find(e=>e.tag==='text')?.a['font-size']!,scale=fontSize/18
 if(!Number.isFinite(minFontPx)||minFontPx<14||!Number.isFinite(fontSize)||fontSize<minFontPx-.001||fontSize>Math.max(18,minFontPx*1.4)+.001)issues.push('unsupported_uniform_scale')
 // Account for the compiler's 0.001 px rounding of both font and dimensions.
 const scaled=(actual:number,design:number)=>Number.isFinite(actual)&&Math.abs(actual-design*scale)<=.0011+Math.abs(design)*.00051/18
 for(const [eid,e] of elements){
  if(e.tag==='text'&&+e.a['font-size']!==fontSize)issues.push('inconsistent_font_size:'+eid)
  if(e.a['stroke-width']!==undefined&&!scaled(+e.a['stroke-width'],1.6))issues.push('unsupported_stroke_width:'+eid)
  if(e.tag==='polygon'&&!pointGrammar.test(e.a.points||''))issues.push('unsupported_polygon_syntax:'+eid)
 }
 for(const n of topology.nodes){
  const e=elements.get('node_'+n.id);if(!e){issues.push('missing_node:'+n.id);continue}
  let b:Box
  if(n.shape==='decision'&&e.tag==='polygon'){const p=nums(e.a.points);if(p.length!==8||p.some(n=>!Number.isFinite(n)))issues.push('invalid_diamond:'+n.id);b={x:Math.min(...p.filter((_,i)=>i%2===0)),y:Math.min(...p.filter((_,i)=>i%2===1)),width:Math.max(...p.filter((_,i)=>i%2===0))-Math.min(...p.filter((_,i)=>i%2===0)),height:Math.max(...p.filter((_,i)=>i%2===1))-Math.min(...p.filter((_,i)=>i%2===1))}}
  else if(n.shape==='initial'&&e.tag==='circle')b={x:+e.a.cx- +e.a.r,y:+e.a.cy- +e.a.r,width:2*+e.a.r,height:2*+e.a.r}
  else if(['process','terminal'].includes(n.shape)&&e.tag==='rect')b={x:+e.a.x,y:+e.a.y,width:+e.a.width,height:+e.a.height}
  else {issues.push('wrong_shape:'+n.id);continue}
  if(Object.values(b).some(v=>!Number.isFinite(v))||b.width<=0||b.height<=0)issues.push('invalid_node_geometry:'+n.id)
  const design=nodeDesign(n),radius=+(e.a.rx||0),strokeWidth=+(e.a['stroke-width']||0)
  if(!scaled(b.width,design.width)||!scaled(b.height,design.height))issues.push('unsupported_node_size:'+n.id)
  if((n.shape==='process'||n.shape==='terminal')&&!scaled(radius,n.shape==='terminal'?12:5))issues.push('unsupported_corner_radius:'+n.id)
  if(n.shape==='decision'){const pts=nums(e.a.points),cx=b.x+b.width/2,cy=b.y+b.height/2,diamond=[cx,b.y,b.x+b.width,cy,cx,b.y+b.height,b.x,cy];if(pts.some((v,i)=>Math.abs(v-diamond[i])>.02))issues.push('unsupported_diamond_shape:'+n.id)}
  if((n.shape==='initial'&&e.a.fill!=='#355c53')||(n.shape!=='initial'&&(e.a.stroke!=='#355c53'||!(+e.a['stroke-width']>0)||e.a.fill!==(n.shape==='decision'?'#f5ead6':'#e5efeb'))))issues.push('invisible_node:'+n.id)
  if(b.x-strokeWidth/2<0||b.y-strokeWidth/2<0||b.x+b.width+strokeWidth/2>box[2]||b.y+b.height+strokeWidth/2>box[3])issues.push('node_outside_canvas:'+n.id)
  nodes.set(n.id,{...b,shape:n.shape,radius,strokeWidth})
  const texts=[...elements].filter(([k])=>k.startsWith('nodeLabel_'+n.id+'_')).sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true})).map(([,v])=>v)
  if(texts.map(t=>t.text).join(' ').replace(/\s/g,'')!==n.label.replace(/\s/g,''))issues.push('wrong_node_label:'+n.id)
  for(const [i,t] of texts.entries())if(t.text!==design.text[i]||Math.abs(+t.a.x-b.x-b.width/2)>.002||!scaled(+t.a.y-b.y-b.height/2-fontSize*.32,(i-(texts.length-1)/2)*22.5))issues.push('unsupported_node_label_layout:'+n.id)
  for(const t of texts){const size=+t.a['font-size'],w=textAdvance(t.text,size),lb={x:+t.a.x-w/2,y:+t.a.y-size,width:w,height:size*1.25};labels.push(lb);if(size<minFontPx-.05)issues.push('small_text:'+n.id);if(!overlap(b,lb)||lb.x<b.x||lb.x+lb.width>b.x+b.width||lb.y<b.y||lb.y+lb.height>b.y+b.height)issues.push('node_label_outside:'+n.id);if(n.shape==='decision'&&[lb.x,lb.x+lb.width].some(x=>[lb.y,lb.y+lb.height].some(y=>Math.abs(x-b.x-b.width/2)/(b.width/2)+Math.abs(y-b.y-b.height/2)/(b.height/2)>1.02)))issues.push('decision_label_outside:'+n.id)}
 }
 const allNodes=[...nodes];for(let i=0;i<allNodes.length;i++)for(let j=i+1;j<allNodes.length;j++)if(overlap(allNodes[i][1],allNodes[j][1]))issues.push('node_overlap:'+allNodes[i][0]+':'+allNodes[j][0])
 for(const e of topology.edges){
  const path=elements.get('edge_'+e.id),arrow=elements.get('arrow_'+e.id)
  if(!path||!arrow){issues.push('missing_edge:'+e.id);continue}
  if(path.a.stroke!=='#355c53'||!(+path.a['stroke-width']>0)||path.a.fill!=='none'||arrow.a.fill!=='#355c53')issues.push('invisible_edge:'+e.id)
  if(!pathGrammar.test(path.a.d||'')){issues.push('unsupported_path:'+e.id);continue}
  const coords=nums(path.a.d.replace(/[ML]/g,' ')),points:Point[]=[];for(let i=0;i<coords.length;i+=2)points.push({x:coords[i],y:coords[i+1]})
  const halfStroke=+path.a['stroke-width']/2
  for(let i=0;i<points.length;i++){const p=points[i];if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x-halfStroke<0||p.y-halfStroke<0||p.x+halfStroke>box[2]||p.y+halfStroke>box[3])issues.push('invalid_path_point:'+e.id);if(i&&!(Math.abs(p.x-points[i-1].x)<.01||Math.abs(p.y-points[i-1].y)<.01))issues.push('unsupported_nonorthogonal_path:'+e.id);if(i&&Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y)<.01)issues.push('degenerate_path_segment:'+e.id)}
  const source=nodes.get(e.source),target=nodes.get(e.target),start=points[0],end=points.at(-1)!,before=points.at(-2)!
  if(!source||!target||!onBoundary(source,start)||!onBoundary(target,end))issues.push('wrong_endpoint:'+e.id)
  const outward=(node:Box,p:Point,next:Point)=>(p.x-node.x-node.width/2)*(next.x-p.x)+(p.y-node.y-node.height/2)*(next.y-p.y)>0
  if(source&&target&&(!outward(source,start,points[1])||!outward(target,end,before)))issues.push('inward_endpoint_segment:'+e.id)
  const tip=nums(arrow.a.points),ax=before.x-end.x,ay=before.y-end.y,cx=(tip[2]+tip[4])/2-end.x,cy=(tip[3]+tip[5])/2-end.y
  const arrowScale=+path.a['stroke-width']/1.6,segmentLength=Math.hypot(ax,ay),ux=-ax/segmentLength,uy=-ay/segmentLength,expected=[end.x,end.y,end.x-ux*8*arrowScale+uy*3.5*arrowScale,end.y-uy*8*arrowScale-ux*3.5*arrowScale,end.x-ux*8*arrowScale-uy*3.5*arrowScale,end.y-uy*8*arrowScale+ux*3.5*arrowScale]
  if(segmentLength<8*scale-.002)issues.push('short_arrow_segment:'+e.id)
  if(arrow.tag!=='polygon'||tip.length!==6||tip.some((v,i)=>!Number.isFinite(v)||Math.abs(v-expected[i])>.03||v<0||v>box[i%2+2])||ax*cx+ay*cy<=0)issues.push('wrong_arrow_direction:'+e.id)
  for(let i=1;i<points.length;i++)for(const [nodeId,b] of nodes){if((nodeId===e.source&&i===1)||(nodeId===e.target&&i===points.length-1))continue;if(segmentHits(points[i-1],points[i],{x:b.x+1,y:b.y+1,width:b.width-2,height:b.height-2}))issues.push('edge_crosses_node:'+e.id+':'+nodeId)}
  const t=elements.get('edgeLabel_'+e.id)
  if((t?.text||'')!==e.label)issues.push('wrong_edge_label:'+e.id)
  if(t){const size=+t.a['font-size'],w=textAdvance(t.text,size),b={x:+t.a.x-w/2,y:+t.a.y-size,width:w,height:size*1.25};if(size<minFontPx-.05)issues.push('small_edge_label:'+e.id);for(const [nid,nb]of nodes)if(overlap(b,nb))issues.push('edge_label_node_overlap:'+e.id+':'+nid);labels.push(b);edgeLabels.set(e.id,{...b,font:size})}
  observed.push({edgeId:e.id,source:e.source,target:e.target,label:t?.text||'',start,end,points})
 }
 // Attribute IDs establish inventory, not visible association. A condition/event
 // must be nearest to its own actual orthogonal shaft, with a strict separation
 // from every competing edge (including reverse, parallel and unlabeled edges).
 const routeDistance=(b:Box,points:Point[])=>{let result=Infinity;for(let i=1;i<points.length;i++){const a=points[i-1],p=points[i],minX=Math.min(a.x,p.x),maxX=Math.max(a.x,p.x),minY=Math.min(a.y,p.y),maxY=Math.max(a.y,p.y);result=Math.min(result,Math.hypot(Math.max(b.x-maxX,0,minX-b.x-b.width),Math.max(b.y-maxY,0,minY-b.y-b.height)))}return result}
 const labelAssociations:any[]=[]
 for(const [edgeId,b] of edgeLabels){const distances=observed.map(e=>({edgeId:e.edgeId,distance:routeDistance(b,e.points)})),own=distances.find(e=>e.edgeId===edgeId)?.distance??Infinity,other=Math.min(...distances.filter(e=>e.edgeId!==edgeId).map(e=>e.distance)),clearance=Math.max(1,b.font/18)
  if(own<=clearance||own>b.font*1.5||other-own<clearance)issues.push('ambiguous_or_wrong_edge_label_position:'+edgeId)
  labelAssociations.push({edgeId,bounds:b,ownRouteDistance:own,nearestCompetingRouteDistance:other})
 }
 for(let i=0;i<labels.length;i++){const b=labels[i];if(b.x<0||b.y<0||b.x+b.width>box[2]||b.y+b.height>box[3])issues.push('label_outside_canvas');for(let j=i+1;j<labels.length;j++)if(overlap(b,labels[j],1))issues.push('label_overlap')}
 for(const [eid,element] of elements){if(!/^(node_|nodeLabel_|edge_|edgeLabel_|arrow_)/.test(eid))issues.push('untracked_element:'+eid);if(element.tag==='text'&&(element.a['text-anchor']!=='middle'||element.a.fill!=='#203d37'))issues.push('unsupported_text_style:'+eid);if(eid.startsWith('node_')&&!topology.nodes.some(n=>'node_'+n.id===eid))issues.push('extra_node:'+eid);if(eid.startsWith('edge_')&&!topology.edges.some(e=>'edge_'+e.id===eid))issues.push('extra_edge:'+eid)}
 return {schemaVersion:1,svgHash:hash(svg),topologyHash:topologyHash(topology),passed:issues.length===0,issues:[...new Set(issues)],nodes:Object.fromEntries(nodes),observedRelations:observed,labelAssociations,minFontPx,limitations:['Source geometry checks do not certify prose-to-graph semantic inference.','Text widths are conservative Noto Sans bounds; actual raster must still be inspected.','Edge crossings can remain and require visual review.']}
}

export async function compileDiagramTopology(topology:DiagramTopology,viewport:DiagramViewport,direction?:'RIGHT'|'DOWN') {
 if(![viewport.width,viewport.height,viewport.minFontPx].every(Number.isFinite)||viewport.width<100||viewport.height<100||viewport.width>4096||viewport.height>4096||viewport.minFontPx<14)throw new Error('DIAGRAM_LAYOUT_INVALID: unsupported viewport')
 const font=18,spacing=font*1.25,prepared=topology.nodes.map(n=>({...n,...nodeDesign(n)}))
 const ElkConstructor=ELK as unknown as {new():{layout:(graph:any)=>Promise<any>}}
 const elk=new ElkConstructor(),directions=direction?[direction]:[topology.layout.direction,topology.layout.direction==='RIGHT'?'DOWN':'RIGHT'] as const
 const candidates:any[]=[]
 for(const dir of directions){
  const graph=await elk.layout({id:'root',layoutOptions:{'elk.algorithm':'layered','elk.direction':dir,'elk.edgeRouting':'ORTHOGONAL','elk.spacing.nodeNode':'28','elk.layered.spacing.nodeNodeBetweenLayers':'30','elk.spacing.edgeNode':'16','elk.spacing.edgeEdge':'14','elk.padding':'[top=20,left=20,bottom=20,right=20]','elk.randomSeed':'1','elk.layered.mergeEdges':'false'},children:prepared.map(n=>({id:n.id,width:n.width,height:n.height})),edges:topology.edges.map(e=>({id:e.id,sources:[e.source],targets:[e.target],labels:e.label?[{text:e.label,width:textAdvance(e.label,font)+12,height:spacing+8}]:[]}))})
  candidates.push({graph,dir,scale:Math.min((viewport.width-12)/(graph.width||1),(viewport.height-12)/(graph.height||1))})
 }
 candidates.sort((a,b)=>b.scale-a.scale)
 const failures:any[]=[]
 let last:any
 for(const {graph,dir,scale:fit} of candidates){
  const scale=Math.min(fit,Math.max(1,viewport.minFontPx/font*1.4)),offset={x:(viewport.width-graph.width*scale)/2,y:(viewport.height-graph.height*scale)/2},p=(pt:Point)=>({x:number(pt.x*scale+offset.x),y:number(pt.y*scale+offset.y)}),f=number(font*scale)
  if(f<viewport.minFontPx){last={issues:[`readability: ${f}px < ${viewport.minFontPx}px; enlarge output or reduce panel density`]};failures.push({direction:dir,...last});continue}
  const boxes=new Map<string,Box&{shape:string}>(),nodeParts:string[]=[],edgeParts:string[]=[]
  for(const n of prepared){const child=graph.children.find((v:any)=>v.id===n.id),at=p(child),b={...at,width:number(n.width*scale),height:number(n.height*scale),shape:n.shape};boxes.set(n.id,b);const cx=number(b.x+b.width/2),cy=number(b.y+b.height/2),paint=`fill="${n.shape==='decision'?'#f5ead6':'#e5efeb'}" stroke="#355c53" stroke-width="${number(1.6*scale)}"`
   nodeParts.push(n.shape==='initial'?`<circle id="node_${n.id}" cx="${cx}" cy="${cy}" r="${number(b.width/2)}" fill="#355c53"/>`:n.shape==='decision'?`<polygon id="node_${n.id}" points="${cx},${b.y} ${number(b.x+b.width)},${cy} ${cx},${number(b.y+b.height)} ${b.x},${cy}" ${paint}/>`:`<rect id="node_${n.id}" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="${number((n.shape==='terminal'?12:5)*scale)}" ${paint}/>`)
   if(n.label)n.text.forEach((t,i)=>nodeParts.push(`<text id="nodeLabel_${n.id}_${i}" x="${cx}" y="${number(cy+(i-(n.text.length-1)/2)*spacing*scale+f*.32)}" font-size="${f}" text-anchor="middle" fill="#203d37">${esc(t)}</text>`))
  }
  for(const e of topology.edges){const routed=graph.edges.find((v:any)=>v.id===e.id),section=routed.sections?.[0];if(!section||routed.sections.length!==1)throw new Error('DIAGRAM_LAYOUT_UNSUPPORTED: edge section '+e.id)
   const points:Point[]=[section.startPoint,...(section.bendPoints||[]),section.endPoint].map(p),a=boxes.get(e.source)!,b=boxes.get(e.target)!
   points[0]=portBoundary(a,points[0],points[1]);points[points.length-1]=portBoundary(b,points.at(-1)!,points.at(-2)!)
   const tip=points.at(-1)!,prev=points.at(-2)!,length=Math.hypot(tip.x-prev.x,tip.y-prev.y),ux=(tip.x-prev.x)/length,uy=(tip.y-prev.y)/length,arrow=8*scale,half=3.5*scale
   const coords=[tip,{x:tip.x-ux*arrow+uy*half,y:tip.y-uy*arrow-ux*half},{x:tip.x-ux*arrow-uy*half,y:tip.y-uy*arrow+ux*half}]
   edgeParts.push(`<path id="edge_${e.id}" d="${points.map((v,i)=>(i?'L':'M')+number(v.x)+' '+number(v.y)).join(' ')}" fill="none" stroke="#355c53" stroke-width="${number(1.6*scale)}"/><polygon id="arrow_${e.id}" points="${coords.map(v=>number(v.x)+','+number(v.y)).join(' ')}" fill="#355c53"/>`)
   if(e.label){const l=routed.labels?.[0];if(!Number.isFinite(l?.x)||!Number.isFinite(l?.y))throw new Error('DIAGRAM_LAYOUT_UNSUPPORTED: edge label '+e.id);const at=p(l);edgeParts.push(`<text id="edgeLabel_${e.id}" x="${number(at.x+l.width*scale/2)}" y="${number(at.y+f+2*scale)}" font-size="${f}" text-anchor="middle" fill="#203d37">${esc(e.label)}</text>`)}
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${viewport.width}" height="${viewport.height}" viewBox="0 0 ${viewport.width} ${viewport.height}" font-family="Noto Sans"><title>Deterministic relational diagram</title><rect width="${viewport.width}" height="${viewport.height}" fill="white"/>${edgeParts.join('')}${nodeParts.join('')}</svg>`
  const validation=inspectTopologySvg(svg,topology,viewport.minFontPx);last=validation;failures.push({direction:dir,issues:validation.issues})
  if(validation.passed){const rendered=await renderProgrammaticSvg(svg);return {...rendered,topology,geometry:validation,layout:{direction:dir,viewport,fontPx:f,compiler:'elkjs-0.12.0-topology-v1'},topologyHash:topologyHash(topology)}}
 }
 throw new Error('DIAGRAM_LAYOUT_UNSUPPORTED: '+JSON.stringify(failures.length?failures:last?.issues||['no feasible readable layout']))
}
