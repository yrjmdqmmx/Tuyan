import fs from 'node:fs'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {SPECIALIST_SCHEMAS,validateFigureRequest} from '../../packages/figure-taxonomy/src/index.js'
import {buildDeterministicPlotCode} from '../../packages/figure-taxonomy/src/plot.js'
const root=path.resolve(import.meta.dirname,'../..')
const out=path.join(root,'docs/infographic-v400/completion/evidence/candidates')
fs.mkdirSync(out,{recursive:true})
const python=process.env.TUYAN_QA_PYTHON||'/Users/a1-6/.cache/tuyan-figure-qa-20261010/bin/python'
const results=[]
for(const [id,schema] of Object.entries(SPECIALIST_SCHEMAS)){
 const body=structuredClone(schema.example);validateFigureRequest(body)
 fs.writeFileSync(path.join(out,id+'.input.json'),JSON.stringify(body,null,2)+'\n')
 const code=buildDeterministicPlotCode(body,JSON.stringify({plotStyle:{width:9,height:6,fontSize:11}}))
 fs.writeFileSync(path.join(out,id+'.py'),code)
 const probe=code+`\nfrom pathlib import Path\noutput=Path(${JSON.stringify(out)})\nfig.savefig(output / '${id}.png',dpi=100)\nfig.savefig(output / '${id}.svg',format='svg')\nassert len(plt.get_fignums())==1\nassert '<image' not in (output / '${id}.svg').read_text()\n(output / '${id}.validation.json').write_text(json.dumps(fig._tuyan_validation,ensure_ascii=False,indent=2,allow_nan=False))\n`
 const start=Date.now(),p=spawnSync(python,['-c',probe],{encoding:'utf8',timeout:60000,maxBuffer:1024*1024})
 const result={typeId:id,passed:p.status===0,elapsedMs:Date.now()-start,exitCode:p.status,error:p.error?.message||null,stderr:p.stderr.slice(-2500),png:id+'.png',svg:id+'.svg',validation:id+'.validation.json'}
 results.push(result);console.log(id,result.passed?'PASS':'FAIL',result.elapsedMs+'ms');if(!result.passed)console.error(result.stderr)
}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({python,total:results.length,passed:results.filter(r=>r.passed).length,results},null,2)+'\n')
if(results.some(r=>!r.passed))process.exitCode=1
