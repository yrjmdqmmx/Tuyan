import {PLUS_PRESETS,PLUS_IMAGE_MODEL,plusTaskSpec} from '../../../packages/api/src/plus.mjs';
const integer=n=>Number.isSafeInteger(n)&&n>0;
export function validatePlusPricing(value){
  const fail=()=>{throw Error('PLUS_PRICING_NOT_VALIDATED');};
  if(!value?.version||value.tariff?.validated!==true||!value.tariff.version||!integer(value.creditCostMicros)||!value.transportLimits?.validated)fail();
  for(const k of ['maxInputBytes','maxImages','maxImageInputTokens','maxOutputTokens'])if(!integer(value.transportLimits[k]))fail();
  if(value.transportLimits.maxOutputTokens<=8192)fail();
  for(const [model,units]of [[PLUS_IMAGE_MODEL,['qima_input_1k','qima_input_2k','qima_output_1k','qima_output_2k']],...[...new Set(Object.values(PLUS_PRESETS).map(p=>p.mainModel))].map(m=>[m,['input_non_cached','input_cached','output_total']])])for(const unit of units){const rate=value.tariff.rates?.[model]?.[unit];if(!rate||!Number.isSafeInteger(rate.priceMicros)||rate.priceMicros<0||!integer(rate.perUnits)||!/^https:\/\//.test(rate.source||'')||!/^\d{4}-\d{2}-\d{2}$/.test(rate.checkedAt||''))fail();}
  for(const path of ['png','svg'])for(const mode of ['fast','balanced','extreme'])for(const kind of ['generate','edit'])if(!integer(value.taskCaps?.[path]?.[mode]?.[kind])||BigInt(value.taskCaps[path][mode][kind])*30n*BigInt(value.creditCostMicros)>BigInt(Number.MAX_SAFE_INTEGER))fail();
  const noHigher=(a,b)=>BigInt(a.priceMicros)*BigInt(b.perUnits)<=BigInt(b.priceMicros)*BigInt(a.perUnits);
  for(const rates of Object.values(value.tariff.rates)){if(rates.input_cached&&!noHigher(rates.input_cached,rates.input_non_cached))fail();if(rates.qima_input_1k&&(!noHigher(rates.qima_input_1k,rates.qima_input_2k)||!noHigher(rates.qima_output_1k,rates.qima_output_2k)))fail();}
  return structuredClone(value);
}
export function plusPreparedQuote(input,pricing){const spec=plusTaskSpec(input);validatePlusPricing(pricing);return {...spec,credits:pricing.taskCaps[spec.path][spec.mode][spec.kind]*spec.candidates*spec.reviews,pricingVersion:pricing.version,simulation:false};}
