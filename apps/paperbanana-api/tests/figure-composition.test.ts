import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {composeVectorPanels} from '../src/figure-composition.js'
import {renderProgrammaticSvg} from '../src/programmatic-svg.js'
const source='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z"/></marker></defs><rect width="400" height="250" fill="white"/><rect x="25" y="75" width="100" height="70" fill="#dbe9e3"/><text x="40" y="115" font-size="20">Input</text><path d="M130 110 H250" stroke="#335d51" marker-end="url(#arrow)"/><text x="260" y="115" font-size="20">Output</text></svg>'
const root=process.env.TUYAN_QA_EVIDENCE_DIR || '../../docs/infographic-v400/completion/evidence'
test('compose true vector panels, isolate IDs, export real raster and editable source',async()=>{
 const bar=await readFile('../../docs/infographic-v400/completion/evidence/dual-smoke/bar.svg','utf8')
 const result=await composeVectorPanels([{label:'A',typeId:'workflow',svg:source},{label:'B',typeId:'bar',svg:bar},{label:'C',typeId:'workflow',svg:source}],{imageSize:'2K',aspectRatio:'16:9',title:'Synthetic composition QA'})
 assert.ok(result.svg.includes('panel0_arrow'));assert.ok(result.svg.includes('panel2_arrow'));assert.ok(!result.svg.includes('<image'))
 assert.equal(result.width,2048);assert.equal(result.composition.panels.length,3);assert.equal(result.composition.panels[1].typeId,'bar')
 await mkdir(`${root}/composition`,{recursive:true});await writeFile(`${root}/composition/mixed.svg`,result.svg);await writeFile(`${root}/composition/mixed.png`,result.png)
})
test('reject raster panels, foreign content, references and resource abuse',async()=>{
 const compose=(svg:string)=>composeVectorPanels([{label:'A',typeId:'bar',svg},{label:'B',typeId:'workflow',svg:source}])
 await assert.rejects(compose(source.replace('<defs>','<image href="data:image/png;base64,AAAA"/><defs>')),/NON_VECTOR/)
 await assert.rejects(compose(source.replace('url(#arrow)','url(https://example.com/a)')),/local fragment|EXTERNAL/)
 await assert.rejects(compose('<!DOCTYPE svg>'+source),/INVALID_SOURCE/)
 await assert.rejects(renderProgrammaticSvg(source.replace('<defs>','<script>alert(1)</script><defs>')),/unsupported SVG element/)
 await assert.rejects(renderProgrammaticSvg(source.replace('0 0 400 250','0 0 100000 250')),/PIXELS/)
})
