import fs from 'node:fs'
import assert from 'node:assert/strict'
import {DETERMINISTIC_PLOT_TYPES} from '../../packages/figure-taxonomy/src/plot.js'
import {getFigureType} from '../../packages/figure-taxonomy/src/index.js'
import {validateFigureExecution} from '../../apps/paperbanana-api/src/figure-contract.ts'
const records=[]
for(const id of DETERMINISTIC_PLOT_TYPES){
 const original=JSON.parse(fs.readFileSync(`docs/infographic-v400/evidence/plots/${id}.json`,'utf8'))
 assert.doesNotThrow(()=>validateFigureExecution(original))
 const mutations=[['empty_rows',b=>b.figureData.rows=[]],['row_limit_10001',b=>b.figureData.rows=Array.from({length:10001},()=>b.figureData.rows[0])],['missing_source',b=>delete b.figureData.source],['unimplemented_variant',b=>b.figureVariantIds=[id+'.v1']]]
 const numeric=getFigureType(id).numericFields[0]
 if(numeric)mutations.push(['nonfinite_numeric',b=>b.figureData.rows[0][numeric]=Infinity],['missing_numeric_unit',b=>delete b.figureData.units[numeric]])
 for(const [name,mutate] of mutations){const b=structuredClone(original);mutate(b);assert.throws(()=>validateFigureExecution(b),e=>['FIGURE_INPUT_INVALID','FIGURE_RENDERER_UNAVAILABLE'].includes(e.businessCode),id+' '+name)}
 records.push({typeId:id,valid:true,boundaries:mutations.map(([name])=>({name,result:'rejected_before_models_and_render'}))})
}
fs.writeFileSync('docs/infographic-v400/completion/evidence/input-boundaries.json',JSON.stringify(records,null,2)+'\n')
console.log(`${records.length} base types; ${records.reduce((s,r)=>s+r.boundaries.length,0)} invalid/boundary requests rejected`)
