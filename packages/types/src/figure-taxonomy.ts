/** Optional on legacy requests. New clients always use the shared taxonomy version. */
export interface FigureRequest {
 generationPath?:'model-v1'
 materialFiles?:Array<{id:string;filename:string;format:string;size:number;sha256:string;status:'uploaded';expiresAt:string;clientFileId?:string}>
 sourceMaterials?:Array<{id:string;filename:string;format:string;size:number;text:string;status:'ready'|'partial';warnings:string[];sha256:string}>
 figureTypeId?:string
 figureSpecVersion?:string
 figureVariantIds?:string[]
 figureAnalysis?:{method?:string;description?:string;[key:string]:unknown}
 figureData?:{source:string;rows:Record<string,unknown>[];units:Record<string,string>;options?:Record<string,unknown>}
 figurePanels?:Array<FigureRequest & {label:string;methodContent?:string;caption?:string}>
}
