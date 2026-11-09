// Public subscription contract. These are product presets, not a validated tariff.
export const PLUS_PRODUCT = Object.freeze({ id:'tuyan-plus', name:'Plus', priceFen:3900, currency:'CNY', credits:2000, creditCostMicros:10000, period:'calendar_month', rollover:false, autoRenew:false });
export const PLUS_PRESET_VERSION = 'bailian-plus-20261031-v1';
const svgStages = (material,plan,code,observation,review) => ({material,plan,code,observation,review});
export const PLUS_PRESETS = Object.freeze({
  fast: {label:'快速',mainModel:'qwen3.8-flash',pngThinkingBudget:1024,svgThinkingBudgets:svgStages(512,1024,1024,512,512)},
  balanced: {label:'均衡',mainModel:'qwen3.8-max-0902',pngThinkingBudget:1024,svgThinkingBudgets:svgStages(1024,2048,4096,512,1024)},
  extreme: {label:'极致',mainModel:'qwen3.8-max-0902',pngThinkingBudget:4096,svgThinkingBudgets:svgStages(1024,4096,8192,1024,2048)},
});
export const PLUS_IMAGE_MODEL = 'qwen-image-3.0-pro';
export const PLUS_CONTRACT_VERSION = 1;
export function plusTaskSpec(input={}) {
  const {path='png',mode='fast',kind='generate',candidates=1,reviews=1,imageSize='2K',aspectRatio='landscape'}=input;
  if(!['png','svg'].includes(path)||!Object.hasOwn(PLUS_PRESETS,mode)||!['generate','edit'].includes(kind))throw Error('PLUS_INVALID_TASK');
  if(!Number.isSafeInteger(candidates)||candidates<1||candidates>6||!Number.isSafeInteger(reviews)||reviews<1||reviews>5)throw Error('PLUS_INVALID_COUNTS');
  if(kind==='edit'&&candidates!==1)throw Error('PLUS_EDIT_SINGLE_CANDIDATE');
  if(!['1K','2K','4K'].includes(imageSize)||typeof aspectRatio!=='string'||aspectRatio.length>32)throw Error('PLUS_INVALID_DIMENSIONS');
  if(path==='png'&&imageSize==='4K')throw Error('PLUS_UNSUPPORTED_MODEL_DIMENSIONS');
  return {path,mode,kind,candidates,reviews,imageSize,aspectRatio};
}
// Fixture-only values exercise reservation/settlement. Never publish these as
// actual charges, infer provider cost, or enable paid dispatch from this table.
export function plusSimulationQuote(input) {
  const spec=plusTaskSpec(input), base={png:{fast:80,balanced:150,extreme:210},svg:{fast:60,balanced:120,extreme:180}};
  return {...spec,credits:base[spec.path][spec.mode]*spec.candidates*spec.reviews,pricingVersion:'simulation-only-v1',simulation:true};
}
