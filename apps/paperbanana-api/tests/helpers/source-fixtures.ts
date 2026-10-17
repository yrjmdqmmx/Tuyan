import {type SourceCatalog} from '../../src/source-provenance.js'
import {type DiagramTopology} from '../../src/diagram-topology.js'
export const refFor=(c:SourceCatalog,text:string)=>{const entry=c.entries.filter(e=>e.text.includes(text)).sort((a,b)=>a.text.length-b.text.length)[0];if(!entry)throw Error('fixture quote not original: '+text);return entry.id}
export function topologyWire(g:DiagramTopology,c:SourceCatalog){
 const namedNodes=Object.fromEntries(g.nodes.filter(n=>n.label).map(n=>[n.label,{shape:n.shape,role:n.role,sourceRef:refFor(c,n.label)}])),anonymousInitials=Object.fromEntries(g.nodes.filter(n=>!n.label).map(n=>[n.id,{sourceRef:refFor(c,n.initialEvidence!.sourceQuote),markerQuote:n.initialEvidence!.markerQuote,interpretation:n.initialEvidence!.interpretation}]))
 const endpoint=(id:string)=>{const n=g.nodes.find(n=>n.id===id)!;return n.label?{name:n.label}:{initial:n.id}}
 return {schemaVersion:2,sourceProtocolVersion:2,sourceCatalogHash:c.catalogHash,namedNodes,anonymousInitials,edges:g.edges.map(e=>({source:endpoint(e.source),target:endpoint(e.target),label:e.label,sourceRef:refFor(c,e.sourceQuote)})),uncertainties:g.uncertainties,layout:g.layout}
}
export function reviewWire(raw:any,c:SourceCatalog){
 const d=structuredClone(raw);d.sourceProtocolVersion=2;d.sourceCatalogHash=c.catalogHash
 for(const kind of ['originalRequiredNodes','originalRequiredRelations'])if(d.topologyAudit?.[kind])d.topologyAudit[kind]=d.topologyAudit[kind].map(({sourceQuote,...rest}:any)=>({...rest,sourceRef:refFor(c,sourceQuote)}))
 if(d.rendererAudit?.originalRequirements)d.rendererAudit.originalRequirements=d.rendererAudit.originalRequirements.map(({sourceField,sourceQuote,...rest}:any)=>({...rest,sourceRef:refFor(c,sourceQuote)}))
 return d
}
