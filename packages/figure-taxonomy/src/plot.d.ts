export const DETERMINISTIC_PLOT_TYPES:string[]
export function buildDeterministicPlotCode(body:Record<string,any>,plan?:string,viewport?:{width:number;height:number;minFontPx:number}):string|null
export function deterministicPlotStyle(body:Record<string,any>,plan?:string,viewport?:{width:number;height:number;minFontPx:number}):Record<string,number>
export function deterministicPlotRendererContract(body:Record<string,any>,viewport?:{width:number;height:number;minFontPx:number}):Record<string,any>|null
export function validateDeterministicOptions(body:Record<string,any>):void
