import fs from 'node:fs'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {buildDeterministicPlotCode} from '../../packages/figure-taxonomy/src/plot.js'
const results=[]
for(const id of ['upset','phylogenetic']){
 const input=JSON.parse(fs.readFileSync(`docs/infographic-v400/evidence/plots/${id}.json`,'utf8'))
 const code=buildDeterministicPlotCode(input)+`\nimport io,hashlib\nplt.rcParams['svg.hashsalt']='tuyan-determinism-qa'\nfig.canvas.draw()\nfig.set_layout_engine(None)\npng=io.BytesIO();svg=io.BytesIO()\nfig.savefig(png,format='png')\nfig.savefig(svg,format='svg',metadata={'Date':None})\nprint(json.dumps({'pngHash':hashlib.sha256(png.getvalue()).hexdigest(),'svgHash':hashlib.sha256(svg.getvalue()).hexdigest()}))\n`
 const samples=[]
 for(let seed=1;seed<=8;seed++){
  const r=spawnSync(process.env.TUYAN_QA_PYTHON||'/Users/a1-6/.cache/tuyan-figure-qa-20261010/bin/python',['-c',code],{encoding:'utf8',timeout:30000,env:{PATH:process.env.PATH,HOME:process.env.HOME,MPLBACKEND:'Agg',PYTHONHASHSEED:String(seed)}})
  assert.equal(r.status,0,r.stderr);samples.push({seed,...JSON.parse(r.stdout)})
 }
 for(const format of ['pngHash','svgHash'])assert.equal(new Set(samples.map(s=>s[format])).size,1,id+' '+format)
 results.push({typeId:id,samples,passed:true});console.log(id,'8 hash seeds: PNG and SVG stable')
}
fs.writeFileSync('docs/infographic-v400/completion/evidence/render-determinism.json',JSON.stringify(results,null,2)+'\n')
