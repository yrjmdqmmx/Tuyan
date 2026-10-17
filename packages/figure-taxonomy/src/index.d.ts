export type FigureType = {id:string;label:string;en:string;group:string;kind:string;[key:string]:any}
export const TAXONOMY_VERSION:string
export const FIGURE_EXECUTION_VERSION:number
export const FIGURE_TYPES:FigureType[]
export const FIGURE_GROUPS:any[]
export const LEGACY_CATEGORIES:Record<string,string|null>
export const ANALYSIS_METHODS:any[]
export const COMPATIBLE_REFERENCES:Record<string,string[]>
export function getFigureType(value:any):FigureType|null
export function figureTypePath(value:any):string
export function searchFigureTypes(query?:string,group?:string):FigureType[]
export function figureContract(body?:Record<string,any>):any
export function figureStagePrompt(body:Record<string,any>,stage:string):string
export function validateFigureRequest(body:Record<string,any>):any
export function referenceIsUsable(row:any):boolean
export function rankFigureReferences(rows:any[],body:Record<string,any>):any[]

export type SpecialistSchema={version:number;fields:string[];options:string[];help:string;example:Record<string,any>}
export const SPECIALIST_SCHEMAS:Record<string,SpecialistSchema>
export const SPECIALIST_PLOT_TYPES:readonly string[]
export function getSpecialistSchema(id:string):SpecialistSchema|null
export function validateSpecialistData(body:Record<string,any>):any
