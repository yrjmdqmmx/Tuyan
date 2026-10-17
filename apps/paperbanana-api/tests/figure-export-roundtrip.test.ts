import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {DETERMINISTIC_PLOT_TYPES} from '../../../packages/figure-taxonomy/src/plot.js'
import {renderProgrammaticSvg} from '../src/programmatic-svg.js'
import {composeVectorPanels} from '../src/figure-composition.js'
const root=process.env.TUYAN_QA_EVIDENCE_DIR || '../../docs/infographic-v400/completion/evidence'
test('all 63 actual SVG files reopen through independent renderer and compose with another vector panel',async()=>{
 const results:any[]=[];await mkdir(root+'/svg-roundtrip',{recursive:true})
 const schematic='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250"><rect width="400" height="250" fill="white"/><text x="20" y="80" font-size="22">Synthetic workflow</text><text x="20" y="140" font-size="18">Input → process → output</text></svg>'
 try{
  for(const typeId of DETERMINISTIC_PLOT_TYPES){
   const svg=await readFile('../../docs/infographic-v400/completion/evidence/data-core/'+typeId+'.svg','utf8')
   const reopened=await renderProgrammaticSvg(svg)
   assert.ok(reopened.png.length>1000);assert.ok(reopened.svg.includes('<text'))
   await writeFile(root+'/svg-roundtrip/'+typeId+'.png',reopened.png)
   const assembled=await composeVectorPanels([{label:'A',typeId:'workflow',svg:schematic},{label:'B',typeId,svg}],{aspectRatio:'16:9',imageSize:'2K'})
   assert.ok(!assembled.svg.includes('<image'))
   results.push({typeId,reopened:true,composed:true,width:reopened.width,height:reopened.height,svgHash:reopened.svgHash,pngHash:reopened.pngHash,fontInfo:reopened.fontInfo,codeIssues:reopened.codeIssues})
  }
 }finally{await writeFile(root+'/svg-roundtrip.json',JSON.stringify(results,null,2))}
})
