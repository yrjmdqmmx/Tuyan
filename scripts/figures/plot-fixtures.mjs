import {SPECIALIST_SCHEMAS} from '../../packages/figure-taxonomy/src/specialist-schemas.js'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {DETERMINISTIC_PLOT_TYPES,buildDeterministicPlotCode} from '../../packages/figure-taxonomy/src/plot.js'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const out=path.join(root,'docs/infographic-v400/evidence/plots')
fs.mkdirSync(out,{recursive:true})
export function fixture(type){
 if(SPECIALIST_SCHEMAS[type])return structuredClone(SPECIALIST_SCHEMAS[type].example)
 let rows=[{label:'Alpha',value:2},{label:'Beta',value:5},{label:'Gamma',value:3}]
 if(['dumbbell','gantt','gene_track','protein_domain'].includes(type))rows=[{label:'A',start:1,end:3},{label:'B',start:2,end:6}]
 if(type==='forest')rows=[{label:'A',value:2,low:1,high:3},{label:'B',value:1,low:.5,high:1.8}]
 if(['histogram','boxplot','violin','ecdf','density','raincloud','ridgeline','stripplot'].includes(type))rows=[1,2,2,4,5,2,3,4,4,6].map((value,i)=>({group:i<5?'A':'B',value}))
 if(['line','area','scatter','bubble','ordination'].includes(type))rows=[{x:1,y:2,size:2},{x:2,y:5,size:4},{x:3,y:3,size:3}]
 if(['heatmap','adjacency_matrix','bubble_matrix','correlation_matrix','confusion_matrix'].includes(type))rows=[{row:'A',column:'A',value:1},{row:'A',column:'B',value:.3},{row:'B',column:'A',value:.3},{row:'B',column:'B',value:1}]
 if(type==='binary_matrix')rows=[{row:'A',column:'A',value:1},{row:'A',column:'B',value:0},{row:'B',column:'A',value:0},{row:'B',column:'B',value:1}]
 if(type==='volcano')rows=[{effect:-2,p:.01},{effect:0,p:.5},{effect:2,p:.03}]
 if(type==='ma_plot')rows=[{mean:1,effect:-2},{mean:3,effect:1},{mean:4,effect:2}]
 if(type==='roc')rows=[{fpr:0,tpr:0},{fpr:.2,tpr:.8},{fpr:1,tpr:1}]
 if(type==='pr_curve')rows=[{recall:0,precision:1},{recall:.5,precision:.8},{recall:1,precision:.6}]
 if(type==='calibration')rows=[{predicted:.1,observed:.15,count:20},{predicted:.5,observed:.45,count:20},{predicted:.9,observed:.85,count:20}]
 if(type==='bland_altman')rows=[{a:2,b:3},{a:4,b:3},{a:5,b:4},{a:6,b:8}]
 if(type==='funnel_meta')rows=[{effect:2,se:.1},{effect:1,se:.2},{effect:3,se:.3}]
 if(type==='vector_field')rows=[{x:0,y:0,u:1,v:2},{x:1,y:1,u:2,v:1}]
 if(type==='contour')rows=[{x:0,y:0,value:0},{x:0,y:1,value:1},{x:1,y:0,value:1},{x:1,y:1,value:2}]
 if(type==='kaplan_meier')rows=[{time:1,event:1},{time:2,event:0},{time:3,event:1},{time:4,event:0}]
 if(['venn','upset'].includes(type))rows=[{set:'A',members:['x','y','z']},{set:'B',members:['y','z','q']}]
 if(['histogram','ecdf'].includes(type))rows=rows.map(({value})=>({value}))
 if(type==='confusion_matrix')rows=rows.map(row=>({...row,value:Math.round(row.value*10)}))
 return {figureTypeId:type,taskName:'plot',figureData:{source:'Synthetic QA fixture only; no research claims.',rows,units:Object.fromEntries(['value','x','y','size','low','high','start','end','effect','p','mean','fpr','tpr','recall','precision','predicted','observed','count','a','b','se','u','v','time','event'].map(f=>[f,'dimensionless'])),options:{bandwidth:.5,bins:5,nullValue:0,initialValue:0,levels:[.5,1,1.5]}},figureAnalysis:{method:'pca',description:'Synthetic precomputed QA values; not a statistical analysis of research data.',pKind:'p'}}
}
const index=[]
for(const type of DETERMINISTIC_PLOT_TYPES){const body=fixture(type);fs.writeFileSync(path.join(out,type+'.py'),buildDeterministicPlotCode(body));fs.writeFileSync(path.join(out,type+'.json'),JSON.stringify(body,null,2));index.push(type)}
fs.writeFileSync(path.join(out,'index.json'),JSON.stringify(index,null,2))
console.log(JSON.stringify({fixtures:index.length}))
