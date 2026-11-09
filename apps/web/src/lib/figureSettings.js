import {getFigureType} from '../../../../packages/figure-taxonomy/src/index.js'
import {figureDraftFromPayload} from './figureInput.js'
const key='tuyan.figure-settings.v1'
const defaults=()=>({figureTypeId:'method_framework',figureVariantIds:[],figureAnalysis:{},figureDrafts:{},outputFormat:'png'})
const privateKeys=/^(?:apiKeys?|credentials?|password|token|authorization|secret|universalKeys)$/i
function clean(value) {
 if(Array.isArray(value))return value.map(clean)
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!privateKeys.test(k)&&!['__proto__','prototype','constructor'].includes(k)).map(([k,v])=>[k,clean(v)]))
 return value
}
export function loadFigureSettings(storage) {
 try {storage??=globalThis.localStorage;const saved=JSON.parse(storage?.getItem(key)||'null');if(!getFigureType(saved?.figureTypeId))return defaults();const figureTypeId=getFigureType(saved.figureTypeId).id;return {...defaults(),...persistedFields(saved),figureTypeId,figureDrafts:saved.figureDrafts?clean(saved.figureDrafts):{[figureTypeId]:{variants:saved.figureVariantIds||[],analysis:saved.figureAnalysis||{}}}}}catch{return defaults()}
}
function persistedFields(settings) {
 const fields=['retrievalSetting','figureTypeId','figureVariantIds','figureAnalysis','figureDrafts','methodContent','caption','negativePrompt','imageSize','aspectRatio']
 return {...Object.fromEntries(fields.filter(k=>Object.hasOwn(settings,k)).map(k=>[k,clean(settings[k])])),outputFormat:settings.outputFormat==='svg'?'svg':'png'}
}
export function saveFigureSettings(settings,storage) {
 try {storage??=globalThis.localStorage;if(!getFigureType(settings.figureTypeId))return false;storage.setItem(key,JSON.stringify({...persistedFields(settings),version:2}));return true}catch{return false}
}
export function restoreFigureTask(job) {
 const body={...job,...job.generationContext}
 const type=getFigureType(body.figureTypeId)
 if(!type)throw new Error('该历史任务未保存具体图型，不能推定它的数据结构。')
 return {figureTypeId:type.id,draft:figureDraftFromPayload(body),outputFormat:body.outputFormat||body.output_format||'png',methodContent:body.methodContent??body.method_content??'',caption:body.caption||'',negativePrompt:body.negativePrompt??body.negative_prompt??'',imageSize:body.imageSize||body.image_size,aspectRatio:body.aspectRatio||body.aspect_ratio}
}
