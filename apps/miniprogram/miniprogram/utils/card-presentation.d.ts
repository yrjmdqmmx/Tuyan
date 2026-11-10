export function readableEventDates(t:string):string
export function numericStatus(s:string):string
export function evidenceStatusLines(i:{tooltip:string}[],f:Record<string,{state:string;"value":unknown}>,l:string[]):string
export const conflictNote:string
export function fieldSourceLines(f:Record<string,{state:string;provenance:string|null;verifiedAt?:string|null}>,d?:string|null,t?:(s:string)=>string):string[]
export function cardLifecycle<T extends{sourceUrl?:string|null}>(l:T|null|undefined,a?:{lifecycleSourceUrl?:string|null;excludedSources?:string[]}):(T&{sourceUrl:string})|null
export function displayModalities(v:string[]):string[]
export function displayModalityText(v:string):string
export function historicalChannelIds(pages:Record<string,{verified:boolean}>):Set<string>
export function sourceTitle(v:string,m?:{id?:string;label?:string;displayName?:string}):string
export function humanSourceUrl(v:string):string
export function isMachineDocument(v:string):boolean
export function titleSourceRows<T extends{url:string;label:string}>(r:T[],m?:{id?:string;label?:string;displayName?:string}):T[]
export interface ModalityIcon{id:string;label:string;state:string;detail:string;accessibleLabel:string;tooltip:string}
export function modalityIconStates(v:string,f?:object,p?:string,i?:string,direction?:string):ModalityIcon[]
