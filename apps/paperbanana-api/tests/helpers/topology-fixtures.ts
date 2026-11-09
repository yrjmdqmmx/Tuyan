import type {DiagramTopology} from '../../src/diagram-topology.js'
import {topologyHash} from '../../src/diagram-topology.js'
/** Deliberate model mocks; no scientific inference claim. */
export function mockTopology(original:string):DiagramTopology {
 return {schemaVersion:1,nodes:[{id:'input',label:'Input',shape:'process',role:'normal'},{id:'output',label:'Output',shape:'process',role:'normal'}],edges:[{id:'e1',source:'input',target:'output',label:'',sourceQuote:original}],uncertainties:[],layout:{direction:'RIGHT'}}
}
export function mockTopologyAudit(topology:DiagramTopology){return {topologyHash:topologyHash(topology),originalRequiredNodes:topology.nodes.map(n=>({nodeId:n.id,label:n.label,sourceQuote:n.label||n.initialEvidence!.sourceQuote})),originalRequiredRelations:topology.edges.map(({source,target,label,sourceQuote})=>({source,target,label,sourceQuote})),observedRelations:topology.edges.map(({id:edgeId,source,target,label})=>({edgeId,source,target,label})),missingRelations:[],extraRelations:[],wrongRelations:[],nodeIssues:[]}}
export function semanticFixture(kind:'workflow'|'state_transition',original:string):DiagramTopology {
 const names=kind==='workflow'?['Start','Receive sample','Quality check','Normalize','Output','End','Reject sample']:['','Idle','Running','Paused','Completed']
 const edges=kind==='workflow'?[[0,1,''],[1,2,''],[2,3,'yes'],[3,4,''],[4,5,''],[2,6,'no'],[6,5,'']]:[[0,1,''],[1,2,'start'],[2,3,'pause'],[3,2,'resume'],[2,4,'finish'],[3,1,'cancel'],[4,1,'reset']]
 return {schemaVersion:1,nodes:names.map((label,i)=>({id:'n'+i,label,shape:kind==='workflow'?(i===2?'decision':i===0||i===5?'terminal':'process'):(i===0?'initial':'process'),role:i===0?'initial':kind==='workflow'&&i===5?'terminal':'normal',...(kind==='state_transition'&&i===0?{initialEvidence:{sourceQuote:'Initial dot enters Idle',markerQuote:'Initial dot',interpretation:'explicit_unnamed_initial' as const}}:{})})),edges:edges.map(([s,t,l],i)=>({id:'e'+i,source:'n'+s,target:'n'+t,label:String(l),sourceQuote:original})),uncertainties:[],layout:{direction:'DOWN'}}
}
