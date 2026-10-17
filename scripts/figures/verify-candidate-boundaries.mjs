import fs from 'node:fs'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {SPECIALIST_SCHEMAS} from '../../packages/figure-taxonomy/src/specialist-schemas.js'
import {buildDeterministicPlotCode} from '../../packages/figure-taxonomy/src/plot.js'
const out=path.resolve(import.meta.dirname,'../../docs/infographic-v400/completion/evidence/candidates/boundaries')
fs.mkdirSync(out,{recursive:true})
const python=process.env.TUYAN_QA_PYTHON||'/Users/a1-6/.cache/tuyan-figure-qa-20261010/bin/python'
const cases=[]
const add=(name,id,mutate,assertion)=>{const b=structuredClone(SPECIALIST_SCHEMAS[id].example);mutate(b.figureData.options,b.figureData.rows,b);cases.push({name,b,assertion})}
for(const [name,members,topology] of [['equal',['a','b','c'],'equal'],['disjoint',['x'],'disjoint'],['overlap',['c','d'],'overlap']])add('euler-'+name,'euler',(o,r)=>r[1].members=members,`assert v['computations']['topology']==${JSON.stringify(topology)}`)
add('qq-unequal-sample','qq',(o,r,b)=>{b.figureData.options={reference:'sample',referenceValues:[0,10,20],referenceUnit:'dimensionless',plottingPosition:'hazen'}},"assert np.allclose(v['computations']['referenceQuantiles'],[2,6,10,14,18])")
add('cif-all-censored','cumulative_incidence',(o,r)=>r.forEach(a=>{a.event=0;a.cause=null}),"assert v['computations']['groups']['Data']['cif']['A']==[0,0,0,0]\nassert v['computations']['groups']['Data']['eventFreeSurvival']==[1,1,1,1]")
add('cif-time-zero-ties','cumulative_incidence',(o,r)=>r.forEach(a=>a.time=0),"assert v['computations']['groups']['Data']['cif']['A'][-1]==.5\nassert v['computations']['groups']['Data']['cif']['B'][-1]==.25")
add('network-unweighted','network',(o,r)=>r.forEach(a=>delete a.value),"assert v['computations']['degree']['Isolate']==0")
for(const id of ['treemap','circle_packing'])add(id+'-single-leaf',id,(o,r,b)=>b.figureData.rows=[{id:'only',label:'Only leaf',parent:null,value:4}],"assert v['computations']['rootTotal']==4\nassert v['computations']['leafTotal']==4")
add('protein-single-residue','protein_domain',(o,r)=>{r[0].end=r[0].start},"assert v['computations']['domains'][0]['residues']==1")
add('logo-frequency','motif_logo',o=>o.mode='frequency',"assert np.allclose(np.sum(v['computations']['letterHeights'],axis=1),[1,1,1])")
add('logo-conserved','motif_logo',(o,r)=>r.forEach(a=>a.value=a.symbol==='A'?10:0),"assert v['computations']['informationBits']==[2,2,2]\nassert v['computations']['letterHeights'][0]==[2,0,0,0]")
add('cluster-supplied-linkage','dendrogram',(o,r,b)=>{b.figureData.units.distance='dimensionless';b.figureData.options={input:'linkage',method:'average',metric:'euclidean',preprocessing:'none',linkage:[[0,1,1,2],[2,3,1,2],[4,5,6,4]]}},"assert v['computations']['linkage']==[[0,1,1,2],[2,3,1,2],[4,5,6,4]]")
add('cluster-duplicate-observations','dendrogram',(o,r)=>{r[1].x=r[0].x;r[1].y=r[0].y},"assert v['computations']['linkage'][0][2]==0")
add('choropleth-highest-boundary','choropleth',(o,r)=>r[0].value=30,"assert v['computations']['suppliedValues']['A']==30")
add('zero-overlap-enrichment','enrichment',(o,r)=>{r[0].count=0;r[0].p=1},"assert v['computations']['geneRatio'][0]==0\nassert v['computations']['bubbleAreaPointsSquared'][0]==0")
const results=[]
for(const {name,b,assertion} of cases){
 const code=buildDeterministicPlotCode(b)+`\nfrom pathlib import Path\nv=fig._tuyan_validation\n${assertion}\noutput=Path(${JSON.stringify(out)})\nfig.savefig(output / '${name}.png',dpi=80)\nfig.savefig(output / '${name}.svg',format='svg')\nassert '<image' not in (output / '${name}.svg').read_text()\n(output / '${name}.validation.json').write_text(json.dumps(v,indent=2,allow_nan=False))\n`
 fs.writeFileSync(path.join(out,name+'.input.json'),JSON.stringify(b,null,2)+'\n')
 const p=spawnSync(python,['-c',code],{encoding:'utf8',timeout:30000});const result={name,passed:p.status===0,stderr:p.stderr.slice(-1500)};results.push(result);console.log(name,result.passed?'PASS':'FAIL');if(!result.passed)console.log(result.stderr)
}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({total:results.length,passed:results.filter(r=>r.passed).length,results},null,2)+'\n')
if(results.some(r=>!r.passed))process.exitCode=1
