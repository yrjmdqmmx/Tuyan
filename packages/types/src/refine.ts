export type RefineControls = {
  version: 1; maxImages: number; minImages?: number; maskRequired?: boolean; sourceCounts: true; mask: boolean; maskWithReferences: boolean;
  structured: 'bria-fibo' | null; singleImageInheritsSize?: boolean; autoAspectRatio?: '1:1'; checkedAt: string; source: string;
}
export type RefineInputs = {
  version: 1;
  references?: { objectKey: string; purpose: 'content' | 'layout' | 'color' | 'style'; note?: string }[];
  mask?: { objectKey: string };
  structured?: { object: string; attributes: string; relationship: string; preserve: string };
}

/** All money fields keep public quotes, estimates, provider reports and invoices separate. */
export type ProviderMoney = {amount:number; currency:string; source?:string}
export type ProviderPublicPrice = {source:string; checkedAt:string; amount:number|null; perMillionTokens?:{currency:string; market:string; input:number; output:number; cachedInput?:number}; accountTariffConfirmed?:boolean}
export interface AuditedProviderCallRecord {
  provider:'runware'|'tokenhub'|'xiaomi'|'fal'|'replicate'|'sensenova'|'stepfun'|'qianfan'|'iflytek'|'longcat'|'xai'; model:string; requestId:string|null;
  operation?:'text'|'vision'; resolvedModel?:string|null; usage?:Record<string,unknown>|null;
  publicPrice:ProviderPublicPrice; estimatedCost:ProviderMoney|null; reportedCost:ProviderMoney|null; invoiceCost:ProviderMoney|null;
  structuredInstruction?:unknown; version?:string; metrics?:Record<string,unknown>|null;
}
export type RefineInputMetadata = {
  version:1; sourceCounts:true; source:{width:number;height:number;bytes:number}; referenceCount:number;
  mask:{width:number;height:number;semantics:'white-edit-black-preserve'}|null;
  processing:'orientation-and-lossless-png-no-resize';
}
