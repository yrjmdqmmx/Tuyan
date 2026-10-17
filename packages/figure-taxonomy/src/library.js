import {JOURNAL_REFERENCES} from './references.js'
import {FIGURE_TYPES,getFigureType,figureTypePath,referenceIsUsable,rankFigureReferences} from './index.js'
export const CURATED_REFERENCES = JOURNAL_REFERENCES.filter(referenceIsUsable).map(row=>({
 ...row,attribution:row.license.attribution,taskName:getFigureType(row.figureTypeId)?.kind==='data'?'plot':'diagram',
 visualCategory:row.figureTypeId,visualCategoryLabel:figureTypePath(row.figureTypeId),
 researchDomain:row.researchDomain,
 keywords:[getFigureType(row.figureTypeId)?.label,...row.tags],
}))
const typesIn=row=>[row.figureTypeId,...row.panelTypes.map(p=>p.typeId)]
export function browseFigureReferences({page=1,pageSize=12,query='',figureTypeId='',visualCategory='',figureGroup='',researchDomain='',taskName}={}) {
 const target=figureTypeId||getFigureType(visualCategory)?.id||visualCategory
 const terms=String(query).toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
 const searched=CURATED_REFERENCES.filter(row=>(!taskName||row.taskName===taskName)&&terms.every(term=>[
  row.title,row.shortIntroZh,row.summary,row.paper.doi,...row.tags,...typesIn(row).flatMap(id=>{const t=getFigureType(id);return t?[t.label,t.en,...t.aliases]:[]}),
 ].join(' ').toLocaleLowerCase().includes(term)))
 const filtered=searched.filter(row=>(!target||typesIn(row).includes(target))&&(!figureGroup||typesIn(row).some(id=>getFigureType(id)?.group===figureGroup))&&(!researchDomain||row.researchDomain===researchDomain))
 const totalItems=filtered.length,totalPages=Math.max(1,Math.ceil(totalItems/pageSize)),currentPage=Math.max(1,Math.min(page,totalPages))
 const domains=[...new Set(searched.map(r=>r.researchDomain))].map(value=>({value,count:searched.filter(r=>r.researchDomain===value).length}))
 return {references:filtered.slice((currentPage-1)*pageSize,currentPage*pageSize),page:currentPage,pageSize,totalItems,totalPages,
  facets:{visualCategories:FIGURE_TYPES.map(type=>({value:type.id,label:type.label,count:searched.filter(row=>typesIn(row).includes(type.id)).length})),researchDomains:domains},
  corpusVersion:'journal-2026-10-10.v2',licensePolicy:'Only individually verified storage/display/model-input/adaptation permissions.',
  coverage:{verifiedCases:CURATED_REFERENCES.length,pendingOrExcluded:JOURNAL_REFERENCES.length-CURATED_REFERENCES.length},
 }
}
export function selectFigureReferences(ids) {
 const byId=new Map(CURATED_REFERENCES.map(row=>[row.id,row]))
 if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!byId.has(id))){const e=new Error('部分参考图尚未完成逐图许可核验或已下架，不能提交模型；历史任务记录仍保留。');e.businessCode='REFERENCE_LICENSE_UNVERIFIED';throw e}
 return ids.map(id=>byId.get(id))
}
export function retrieveFigureCandidates(body){return rankFigureReferences(CURATED_REFERENCES,body)}
