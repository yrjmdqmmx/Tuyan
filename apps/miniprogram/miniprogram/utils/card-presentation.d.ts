export function displayModalities(v:string[]):string[]
export function displayModalityText(v:string):string
export function historicalChannelIds(pages:Record<string,{verified:boolean}>):Set<string>
export function sourceTitle(v:string,m?:{id?:string;label?:string;displayName?:string}):string
export function titleSourceRows<T extends{url:string;label:string}>(r:T[],m?:{id?:string;label?:string;displayName?:string}):T[]
export interface ModalityIcon{id:string;label:string;state:string;detail:string;accessibleLabel:string;tooltip:string}
export function modalityIconStates(v:string,f?:object,p?:string,i?:string):ModalityIcon[]
