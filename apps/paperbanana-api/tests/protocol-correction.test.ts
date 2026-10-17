import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {topologyProtocolCorrection,reviewProtocolCorrection} from '../src/protocol-correction.js'
import {parseDiagramTopology,validateTopologyAudit} from '../src/diagram-topology.js'
import {publicExecutionFailure} from '../../../packages/api/src/execution-errors.js'
import {mockTopology,mockTopologyAudit} from './helpers/topology-fixtures.js'
const original='Input then Output. Explicit synthetic topology test with no other relationships.'
const topology=mockTopology(original),quoteError=Error('DIAGRAM_REVIEW_INVALID: required node lacks stable ID or original evidence')
const candidate=()=>({visual:{status:'passed',findings:[]},code:{status:'passed',findings:[]},uncertainties:[],revised_description:'No changes needed.',topologyAudit:mockTopologyAudit(topology),rendererAudit:{originalRequirements:[]}})
const extractionError=(raw:string,source=original)=>{try{parseDiagramTopology(raw,source);assert.fail('fixture must fail strict parser')}catch(error){return error}}

test('complete failed extraction is eligible only for explicit structural errors; uncertainty, bounds, semantic/layout conflicts never qualify',()=>{
 for(const mutate of [(g:any)=>g.nodes.push({...g.nodes[1],id:'duplicate'}),(g:any)=>g.nodes[0].shape='invalid',(g:any)=>g.edges[0].sourceQuote='fictional source']){
  const g=structuredClone(topology);mutate(g);const raw=JSON.stringify(g);assert.ok(topologyProtocolCorrection(raw,extractionError(raw)));assert.throws(()=>parseDiagramTopology(raw,original))
 }
 assert.ok(topologyProtocolCorrection('{',extractionError('{')))
 for(const mutate of [(g:any)=>g.uncertainties=['Missing destination'],(g:any)=>g.nodes=Array.from({length:25},()=>g.nodes[0]),(g:any)=>g.nodes[0].label='Invented', (g:any)=>{g.nodes[0].role='terminal';g.nodes[0].shape='terminal'}]){
  const g=structuredClone(topology);mutate(g);const raw=JSON.stringify(g);assert.equal(topologyProtocolCorrection(raw,extractionError(raw)),undefined)
 }
 for(const message of ['fetch failed','DIAGRAM_TOPOLOGY_INVALID: no readable layout fits viewport','DIAGRAM_TOPOLOGY_INVALID: initial pseudostate requires exactly one outgoing and no incoming relation'])assert.equal(topologyProtocolCorrection('{}',Error(message)),undefined)
})

test('same-version schema retry blocks any declared substantive issue, including malformed issue containers and incomplete/duplicate graph coverage',()=>{
 assert.ok(reviewProtocolCorrection(JSON.stringify(candidate()),quoteError,topology))
 const mutations:Array<(r:any)=>void>=[
  r=>r.uncertainties=['uncertain'],r=>r.problems={issue:'observer clipping'},r=>r.visual.status='issues_found',r=>r.code.findings='wrong route',r=>r.visual.findings={issue:'crowding'},
  ...['missingRelations','extraRelations','wrongRelations','nodeIssues'].map(k=>(r:any)=>r.topologyAudit[k]=[{issue:'substantive'}]),
  r=>r.topologyAudit.originalRequiredNodes.pop(),r=>r.topologyAudit.originalRequiredNodes[1]=r.topologyAudit.originalRequiredNodes[0],r=>r.topologyAudit.originalRequiredNodes[0].label='wrong',
  r=>r.topologyAudit.originalRequiredRelations=[],r=>r.topologyAudit.observedRelations=[],r=>r.topologyAudit.observedRelations[0].target='wrong',
  ...['unmet','unsupported','uncertain'].map(verdict=>(r:any)=>r.rendererAudit.originalRequirements=[{verdict,sourceQuote:'bad'}]),
  r=>{r.critic_suggestions='Change orientation';delete r.revised_description},r=>{r.critic_suggestions='Change orientation';r.revised_description='New layout'},
 ]
 for(const mutate of mutations){const r=candidate();mutate(r);assert.equal(reviewProtocolCorrection(JSON.stringify(r),quoteError,topology),undefined,JSON.stringify(r))}
 const two=structuredClone(topology);two.edges.push({...two.edges[0],id:'reverse',source:two.edges[0].target,target:two.edges[0].source})
 for(const field of ['originalRequiredRelations','observedRelations'] as const){const r=candidate();r.topologyAudit=mockTopologyAudit(two);r.topologyAudit[field][1]=r.topologyAudit[field][0];assert.equal(reviewProtocolCorrection(JSON.stringify(r),quoteError,two),undefined)}
 for(const error of ['SVG 评审对应的版本或源码摘要不匹配；未认定为通过。','DIAGRAM_REVIEW_INVALID: observed relations do not match exact delivered graph','SVG 通过结论与修改方案矛盾；未认定为通过。'])assert.equal(reviewProtocolCorrection(JSON.stringify(candidate()),Error(error),topology),undefined)
})

test('captured round-3 protocol failures stay rejected and qualify without accepting fabricated provenance or duplicate endpoints',async()=>{
 const root='../../docs/infographic-v400/svg-repair-20261010/evidence/round-3',load=async(p:string)=>JSON.parse(await readFile(`${root}/${p}`,'utf8'))
 const state=await load('state-diagram-svg/call-3-review.json'),stateInput=await load('state-diagram-svg/input.json'),stateTopology=await load('state-diagram-svg/call-2-topology.json')
 const raw=(call:any)=>call.responseText
 const graph=parseDiagramTopology(raw(stateTopology),stateInput.methodContent+'\n'+stateInput.caption)
 assert.throws(()=>validateTopologyAudit(raw(state),graph,stateInput.methodContent+'\n'+stateInput.caption),/required node lacks/)
 assert.ok(reviewProtocolCorrection(raw(state),quoteError,graph))
 const mixed=await load('mixed-workflow-bar-svg/call-5-topology.json'),input=await load('mixed-workflow-bar-svg/input.json'),source=input.figurePanels[0].methodContent+'\n'+input.figurePanels[0].caption,error=extractionError(raw(mixed),source)
 assert.match(String(error),/duplicate named nodes/);assert.equal(topologyProtocolCorrection(raw(mixed),error)?.code,'duplicate_named_nodes')
})

test('public topology failures distinguish structure, uncertainty and layout while retaining prior-call billing',()=>{
 for(const [kind,expected] of [['model_structure',/模型结构化输出/],['ambiguous',/不确定项/],['layout',/本地布局/]] as const){
  const failure=publicExecutionFailure({name:'DiagramTopologyValidationError',failureStage:'rendering',requestState:'not_sent',topologyFailureKind:kind,topologyCorrectionUsed:true},3)
  assert.match(failure.reason,expected);assert.match(failure.suggestion,/已使用一次额外主模型/);assert.equal(failure.billingStatus,'prior_calls');assert.doesNotMatch(failure.suggestion,/未追加模型调用|缩短文字/)
 }
})
