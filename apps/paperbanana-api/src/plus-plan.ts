import {PLUS_PRESETS,PLUS_PRESET_VERSION,PLUS_IMAGE_MODEL,type PlusMode} from '../../../packages/api/src/plus.mjs'
import {compileThinkingSelection} from '../../../packages/api/src/thinking.js'
import type {ThinkingSnapshotRole} from '../../../packages/types/src/thinking.js'
export type PlusPresetRequest={version:string;mode:PlusMode}
export type PlusPhase='material'|'plan'|'code'|'observation'|'review'
function invalid():never {throw Object.assign(new Error('Plus 模型或预算快照不一致，未发送模型请求。'),{name:'ThinkingConfigValidationError',localInputFailure:true,requestState:'not_sent',statusCode:400})}
export function plusPhase(stage:string):PlusPhase{return stage==='rendering'||stage==='refining'?'code':stage==='review'?'review':stage==='reference_analysis'?'observation':'plan'}
// This marker only constrains a workflow; it never grants membership or keys.
export function plusThinking(body:any,snapshot:ThinkingSnapshotRole|undefined,role:'main'|'vision'|'image'|undefined,phase:PlusPhase='plan') {
  if(!body.plusPreset||!role)return snapshot
  const {version,mode}=body.plusPreset
  // Refinement has an implicit PNG output; its execution allow-list intentionally
  // does not carry the createJob-only outputFormat field.
  const outputFormat=body.action==='refineImage'?'png':body.outputFormat
  if(version!==PLUS_PRESET_VERSION||!Object.hasOwn(PLUS_PRESETS,mode)||!['png','svg'].includes(outputFormat))invalid()
  const preset=PLUS_PRESETS[mode as PlusMode]
  if(!snapshot||snapshot.provider!=='bailian'||snapshot.modelId!==(role==='image'?PLUS_IMAGE_MODEL:preset.mainModel))invalid()
  if(role==='image')return snapshot
  const stage=role==='vision'&&phase!=='material'?'observation':phase
  const budget=outputFormat==='png'?preset.pngThinkingBudget:preset.svgThinkingBudgets[stage]
  return compileThinkingSelection({...snapshot,options:{mode:true,budget}},role)
}
