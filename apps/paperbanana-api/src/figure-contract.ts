import {readFile,access} from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {TAXONOMY_VERSION,getFigureType,validateFigureRequest} from '../../../packages/figure-taxonomy/src/index.js'
import {validateDeterministicOptions} from '../../../packages/figure-taxonomy/src/plot.js'
import {selectFigureReferences} from '../../../packages/figure-taxonomy/src/library.js'
export const FIGURE_FIELDS=['figureTypeId','figureSpecVersion','figureVariantIds','figureAnalysis','figureData','figurePanels','generationPath','sourceMaterials','materialFiles'] as const
export function figureRequestFields(body:Record<string,any>) {
 return Object.fromEntries(FIGURE_FIELDS.filter(key=>body[key]!==undefined).map(key=>[key,body[key]]))
}
export function validateFigureExecution(body:Record<string,any>) {
 const fail=(message:string,code='FIGURE_INPUT_INVALID')=>{throw Object.assign(new Error(message),{businessCode:code})}
 if(!body.figureTypeId)return
 if(body.figureSpecVersion&&body.figureSpecVersion!==TAXONOMY_VERSION)fail('图型规范版本已变更，请刷新设置再提交。','FIGURE_SPEC_VERSION_MISMATCH')
 if(body.generationPath==='model-v1'){
  if(!getFigureType(body.figureTypeId))fail('请选择有效图型。');
  if(Buffer.byteLength(JSON.stringify(figureRequestFields(body)))>512_000)fail('材料与图型上下文超过 512 KB 上限。');
  return
 }
 validateFigureRequest(body)
 validateDeterministicOptions(body)
 if(getFigureType(body.figureTypeId)?.kind==='composite')for(const panel of body.figurePanels || [])validateDeterministicOptions({...body,...figureRequestFields(panel),figurePanels:undefined,taskName:getFigureType(panel.figureTypeId)?.kind==='data'?'plot':'diagram',outputFormat:'svg'})
 if(Buffer.byteLength(JSON.stringify(figureRequestFields(body)))>1_000_000)fail('图型与数据输入超过本版1 MB上下文上限，请使用有明确依据的聚合数据。')
}
/** Only a server-owned, licensed catalogue ID determines the asset path. */
export async function curatedFigureBytes(id:string):Promise<Buffer> {
 const row=selectFigureReferences([id])[0],asset=row.assets.large
 const filename=path.basename(asset.path)
 const candidates=[path.resolve(process.cwd(),'assets/reference-library',filename),path.resolve(process.cwd(),'apps/paperbanana-api/assets/reference-library',filename)]
 if(import.meta.url?.startsWith('file:'))candidates.push(fileURLToPath(new URL('../assets/reference-library/'+filename,import.meta.url)))
 for(const candidate of candidates) {
  try {await access(candidate)}catch{continue}
  const bytes=await readFile(candidate)
  if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw new Error('REFERENCE_ASSET_HASH_MISMATCH: '+id)
  return bytes
 }
 throw new Error('REFERENCE_ASSET_MISSING: '+id)
}
