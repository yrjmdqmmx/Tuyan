import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

export const pngFixtureHash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
export const pngFixtureFinding = {issue:'Label B overlaps its arrow',location:'module B',evidence:'The B label and arrow occupy the same region',suggestion:'Move label B above the arrow'}

export function pngFixtureContext(wire: any) {
  const messages = [...(Array.isArray(wire.input) ? wire.input : []), ...(wire.messages || [])]
  const texts = typeof wire.input?.prompt === 'string' ? [wire.input.prompt]
    : typeof wire.input === 'string' ? [wire.input]
    : messages.filter((message: any) => message.role === 'user').flatMap((message: any) => typeof message.content === 'string' ? [message.content] : message.content.filter((part: any) => part.type === 'text' || part.type === 'input_text').map((part: any) => part.text))
  // Journal rules may precede originalRequest; JSON property order is not a contract.
  const context = texts.flatMap((text: string) => {
    return [...text.matchAll(/\{/g)].flatMap(match => {
      try { return [JSON.parse(text.slice(match.index))] } catch { return [] }
    })
  }).find((value: any) => typeof value.originalRequest === 'string' && typeof value.pngHash === 'string')
  assert.ok(context, 'PNG review request contains its complete workflow context')
  assert.ok(Number.isInteger(context.version) && context.version > 0)
  assert.match(context.pngHash, /^[a-f0-9]{64}$/)
  return context
}

export function pngFixtureObservation(content = 'Observed modules A and B.', revise = false) {
  return JSON.stringify({content,actual_text:['A','B'],layout:'Modules A and B connected from left to right.',connections:['A → B'],problems:revise?[pngFixtureFinding]:[],suggestions:revise?['Move label B above its arrow.']:[],uncertainties:[]})
}

export function pngFixtureDecision(wire: any, revisedPlan?: string) {
  const context = pngFixtureContext(wire)
  return JSON.stringify({visualAdjudications:(context.auxiliaryVisualIssues||[]).map((issue:any)=>({id:issue.id,decision:revisedPlan?'accept':'reject',reason:revisedPlan?'The fixture confirms this current defect.':'The fixture supplies counter-evidence.',evidence:'Synthetic current-frame label and connector positions for protocol testing.'})),version:context.version,pngHash:context.pngHash,visual:{status:revisedPlan?'issues_found':'passed',findings:revisedPlan?[pngFixtureFinding]:[]},uncertainties:[],revised_description:revisedPlan || 'No changes needed.'})
}
