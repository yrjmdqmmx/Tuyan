export type PlusMode='fast'|'balanced'|'extreme';
export const PLUS_PRESET_VERSION:string;
export const PLUS_IMAGE_MODEL:string;
export const PLUS_PRESETS:Record<PlusMode,{label:string;mainModel:string;pngThinkingBudget:number;svgThinkingBudgets:Record<'material'|'plan'|'code'|'observation'|'review',number>}>;
export const PLUS_PRODUCT:{id:string;name:string;priceFen:number;currency:string;credits:number;creditCostMicros:number;period:string;rollover:boolean;autoRenew:boolean};
export const PLUS_CONTRACT_VERSION:number;
export function plusTaskSpec(input?:unknown):{path:'png'|'svg';mode:PlusMode;kind:'generate'|'edit';candidates:number;reviews:number;imageSize:string;aspectRatio:string};
export function plusSimulationQuote(input?:unknown):ReturnType<typeof plusTaskSpec>&{credits:number;pricingVersion:string;simulation:boolean};
