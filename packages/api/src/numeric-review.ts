import {getFigureType} from '../../figure-taxonomy/src/index.js'

/** Derived from the task, never from the intermediate plan or reviewer reply. */
export function numericReviewContract(body:Record<string,any>) {
 const quantitative=(input:any):boolean=>getFigureType(input.figureTypeId || input.infographicCategory)?.kind==='data'
  || input.taskName==='plot' || Boolean(input.figureData) || Boolean(input.figurePanels?.some(quantitative))
 const applicableRequired=quantitative(body) || Boolean(body.generationContext && quantitative(body.generationContext))
 return {applicableRequired,reason:applicableRequired?'The requested data figure or data panel requires quantitative verification. A missing quantitative encoding is a defect, not grounds to waive review.':'Determine applicability from the actual requested encoding; step numbers and identifiers alone are not quantitative geometry.'}
}

/** A review must account for quantitative geometry, not only printed numbers. */
export const NUMERIC_REVIEW_REQUIREMENTS = 'When numericReviewRequired is true, include numericReview:{applicable:boolean,reason:"why quantitative geometry is or is not present",checks:[{label:"series or mark",source:"authoritative material sourceId/file/page",expected:"original value, unit and implied scale/ratio",observed:"actual label AND measured/estimated geometry",method:"SVG coordinates/baseline/scale or PNG pixel estimate with uncertainty",status:"passed|issues_found|uncertain"}]}. If the image encodes quantitative values (bars, axes, areas, lengths), applicable must be true and check each series, common zero/baseline, tick spacing and ratios. Correct printed numbers alone do not establish correct geometry. For SVG calculate the rendered geometry from fullSvgCode and compare to the pixels. For PNG report the actual visual estimate and its uncertainty; never pretend it is raw data or an exact certificate. A numeric issue or uncertainty blocks a pass and needs a complete correction plan.'
export function validateNumericReview(value:any,required=false,contract?:{applicableRequired:boolean}) {
 if(!required&&!contract?.applicableRequired&&value===undefined)return true
 if(!value||typeof value.applicable!=='boolean'||typeof value.reason!=='string'||!value.reason.trim()||!Array.isArray(value.checks))throw Error('成图评审缺少数值与几何核对记录；未认定为通过。')
 if(value.applicable!==Boolean(value.checks.length))throw Error('成图数值核对适用性与记录矛盾；未认定为通过。')
 if(contract?.applicableRequired && !value.applicable)throw Error('当前任务包含定量图或数据面板，不能免除数值与几何核对；未认定为通过。')
 for(const check of value.checks)if(!check||!['label','source','expected','observed','method'].every(k=>typeof check[k]==='string'&&check[k].trim())||!['passed','issues_found','uncertain'].includes(check.status))throw Error('成图数值核对缺少来源、实际几何或核对方法；未认定为通过。')
 return value.checks.every((check:any)=>check.status==='passed' && (check.linearScale===undefined || checkLinearScale(check.linearScale).consistent))
}

/** Checks arithmetic consistency only; coordinates and source truth still require evidence. */
export function checkLinearScale(value:any) {
 const keys=['coordinate0','coordinate1','value0','value1','markCoordinate','sourceValue','pixelsPerUnit']
 if(!value || keys.some(k=>typeof value[k]!=='number'||!Number.isFinite(value[k])) || value.value0===value.value1 || value.coordinate0===value.coordinate1)
  throw Error('线性尺度核对缺少有限坐标、原始数值或非零尺度；未认定为通过。')
 const signedScale=(value.coordinate1-value.coordinate0)/(value.value1-value.value0)
 const pixelsPerUnit=Math.abs(signedScale)
 const expectedCoordinate=value.coordinate0+(value.sourceValue-value.value0)*signedScale
 return {pixelsPerUnit,expectedCoordinate,consistent:Math.abs(value.pixelsPerUnit-pixelsPerUnit)<=Math.max(1e-9,pixelsPerUnit*1e-6) && Math.abs(value.markCoordinate-expectedCoordinate)<=Math.max(1e-6,Math.abs(value.coordinate1-value.coordinate0)*1e-6)}
}
