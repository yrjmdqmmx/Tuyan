// Integer metering contract for a future server-side Core adapter. It contains
// NO production prices. A tariff must be reviewed independently of model IDs.
// 1 CNY = 1,000,000 micro-CNY. Reasoning tokens are part of output_total when
// reported that way by the provider, never an extra line added on top.
const units=new Set(['input_non_cached','input_cached','output_total','charged_images','qima_input_1k','qima_input_2k','qima_output_1k','qima_output_2k']);
const validInt=n=>Number.isSafeInteger(n)&&n>=0;
const gcd=(a,b)=>b?gcd(b,a%b):a;
export function meterPlusUsage({calls,tariff,creditCostMicros,maxCredits}){
  if(!tariff?.version||tariff.validated!==true||!validInt(creditCostMicros)||creditCostMicros<1||!validInt(maxCredits)||!Array.isArray(calls))throw Error('PLUS_TARIFF_NOT_VALIDATED');
  if(calls.some(c=>c.state!=='confirmed'))return {billing:'unknown',actualCredits:null};
  let numerator=0n,denominator=1n;const receipts=new Set();
  for(const call of calls){
    if(typeof call.receiptId!=='string'||!call.receiptId||receipts.has(call.receiptId)||!['provider_usage','provider_bill'].includes(call.evidence)||!Array.isArray(call.items)||!call.items.length)throw Error('PLUS_INVALID_USAGE_EVIDENCE');
    receipts.add(call.receiptId);
    const seen=new Set();
    for(const item of call.items){
      if(!units.has(item.unit)||seen.has(item.unit)||!validInt(item.quantity))throw Error('PLUS_INVALID_USAGE_UNITS');
      seen.add(item.unit);
      const rate=tariff.rates?.[call.modelId]?.[item.unit];
      if(!rate||!validInt(rate.priceMicros)||!validInt(rate.perUnits)||!rate.perUnits||!rate.source||!rate.checkedAt)throw Error('PLUS_MISSING_VERIFIED_RATE');
      const n=BigInt(item.quantity)*BigInt(rate.priceMicros),d=BigInt(rate.perUnits);
      numerator=numerator*d+n*denominator;denominator*=d;
      const common=gcd(numerator,denominator);numerator/=common;denominator/=common;
    }
  }
  const microCost=(numerator+denominator-1n)/denominator;
  const divisor=denominator*BigInt(creditCostMicros),credits=(numerator+divisor-1n)/divisor;
  if(microCost>BigInt(Number.MAX_SAFE_INTEGER)||credits>BigInt(maxCredits))return {billing:'over_reservation_review',actualCredits:null};
  return {billing:'confirmed_usage',actualCredits:Number(credits),modelCostMicros:Number(microCost),tariffVersion:tariff.version,receiptCount:receipts.size};
}
export function plusRefundFen(unusedCredits,totalCredits=2000,paidFen=3900){
  if(!validInt(unusedCredits)||!validInt(totalCredits)||totalCredits<1||unusedCredits>totalCredits||!validInt(paidFen))throw Error('PLUS_INVALID_REFUND_BASIS');
  return Number((BigInt(paidFen)*BigInt(unusedCredits)*2n+BigInt(totalCredits))/(2n*BigInt(totalCredits)));
}
