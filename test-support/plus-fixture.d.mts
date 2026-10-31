interface SyntheticRate {priceMicros:number;perUnits:number;source:string;checkedAt:string}
export const fixturePlusPricing:{
  version:string;creditCostMicros:number;
  tariff:{version:string;validated:boolean;rates:Record<string,Record<string,SyntheticRate>>};
  transportLimits:{validated:boolean;maxInputBytes:number;maxImages:number;maxImageInputTokens:number;maxOutputTokens:number};
  taskCaps:Record<string,Record<string,{generate:number;edit:number}>>;
};
export function fixturePlusWorkspace(path?:string,kind?:string):{taskId:string;runId:string;request:Record<string,unknown>};
