import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {renderSvgForReview,applyLocalSvgQuality} from '../src/svg-review.js'
import {checkLinearScale,validateNumericReview} from '../../../packages/api/src/numeric-review.js'
const wrap=(content:string,marker='')=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 160"><defs><marker id="a" markerWidth="10" markerHeight="10" refX="0" refY="5" orient="auto" ${marker}><path d="M0 0L10 5L0 10Z" fill="black"/></marker></defs><rect width="300" height="160" fill="white"/>${content}</svg>`
const line='<line x1="20" y1="80" x2="160" y2="80" stroke="black" stroke-width="2" marker-end="url(#a)"/>'
const check=(svg:string)=>renderSvgForReview(svg,{localQualityChecks:true})
test('linear scale uses data units rather than tick count and rejects inconsistent quantitative claims',()=>{
 const geometry={coordinate0:800,coordinate1:550,value0:0,value1:40,markCoordinate:581.25,sourceValue:35,pixelsPerUnit:6.25}
 assert.deepEqual(checkLinearScale(geometry),{pixelsPerUnit:6.25,expectedCoordinate:581.25,consistent:true})
 assert.equal(checkLinearScale({...geometry,pixelsPerUnit:62.5}).consistent,false)
 const review={applicable:true,reason:'bar length',checks:[{label:'A',source:'fixture',expected:'35',observed:'218.75 px',method:'linear SVG axis',status:'passed',linearScale:{...geometry,pixelsPerUnit:62.5}}]}
 assert.equal(validateNumericReview(review,true),false)
 assert.throws(()=>checkLinearScale({...geometry,value1:0}),/非零尺度/)
})
test('real pixels distinguish a visible, occluded and partly visible marker without changing delivered bytes',async()=>{
 const visible=await check(wrap(line))
 assert.equal(visible.localQuality?.status,'clear')
 assert.ok(visible.localQuality!.checks[0].changedPixels>0)
 const hiddenSource=wrap(line+'<rect x="150" y="60" width="60" height="40" rx="8" fill="blue"/>')
 const hidden=await check(hiddenSource), original=await renderSvgForReview(hiddenSource)
 assert.equal(hidden.localQuality?.status,'issues_found')
 assert.equal(hidden.localQuality?.checks[0].changedPixels,0)
 assert.equal(hidden.svg,hiddenSource);assert.deepEqual(hidden.png,original.png)
 assert.equal((await check(wrap(line+'<rect x="170" y="60" width="40" height="40" fill="blue"/>'))).localQuality?.status,'clear')
 assert.equal((await check(wrap(line+'<rect x="150" y="60" width="60" height="40" fill="blue" fill-opacity=".5"/>'))).localQuality?.status,'clear')
})
test('actual renderer handles marker units, reference point, inherited style, transforms and Unicode offsets',async()=>{
 const svg=wrap('<title>中文</title><g transform="translate(20 0) rotate(10 80 80)" style="marker-end:url(#a);stroke:black;stroke-width:2"><path d="M20 80L120 80"/></g>','markerUnits="userSpaceOnUse" viewBox="0 0 10 10"')
 const rendered=await check(svg)
 assert.equal(rendered.localQuality?.status,'clear');assert.equal(rendered.localQuality?.declared,1)
 const atTip=wrap(line).replace('refX="0"','refX="10"')
 assert.equal((await check(atTip)).localQuality?.status,'clear')
})
test('uncovered CSS, use instances and bounded budgets cannot certify marker coverage',async()=>{
 const css=await check(wrap('<style>line {marker-end:url(#a)}</style><line x1="10" y1="80" x2="160" y2="80" stroke="black"/>'))
 assert.equal(css.localQuality?.status,'uncertain')
 const cdata=await check(wrap('<style><![CDATA[line {MARKER-END:url(#a)}]]></style><line x1="10" y1="80" x2="160" y2="80" stroke="black"/>'))
 assert.equal(cdata.localQuality?.status,'uncertain')
 const verdict=applyLocalSvgQuality({passed:true,plan:'',assessment:'{"visualCheck":{"status":"passed"}}'},cdata)
 assert.equal(verdict.passed,false);assert.equal(verdict.stopAfterModelPass,true)
 const mixed=await check(wrap(line.replace('marker-end="url(#a)"','style="marker-end:url(#a);marker:none"')))
 assert.notEqual(mixed.localQuality?.status,'clear')
 const use=await check(wrap('<defs><path id="p" d="M20 80L160 80" stroke="black" marker-end="url(#a)"/></defs><use href="#p"/>'))
 assert.equal(use.localQuality?.status,'uncertain')
 const many=await check(wrap(Array.from({length:13},(_,i)=>line.replaceAll('y1="80"',`y1="${10+i*10}"`).replaceAll('y2="80"',`y2="${10+i*10}"`)).join('')))
 assert.equal(many.localQuality?.checked,12);assert.equal(many.localQuality?.status,'uncertain')
 const hidden=await check(wrap('<g opacity="0.0">'+line+'</g>'))
 assert.equal(hidden.localQuality?.status,'not_applicable')
})
for(const name of ['restored-svg-1','edit-svg-1'])test('recorded r7 false pass is vetoed offline: '+name,async()=>{
 const source=await readFile(new URL('./fixtures/svg-quality/'+name+'.svg',import.meta.url),'utf8')
 const current=await check(source)
 assert.equal(current.localQuality?.checks.length,2)
 assert.ok(current.localQuality!.checks.every(c=>c.changedPixels===0))
 const model={version:1,svgHash:current.svgHash,visual:{status:'passed',findings:[]},code:{status:'passed',findings:[]}}
 const accepted=applyLocalSvgQuality({passed:true,plan:'No changes needed.',assessment:JSON.stringify(model)},current)
 assert.equal(accepted.passed,false);assert.equal(accepted.stopAfterModelPass,true)
 const assessment=JSON.parse(accepted.assessment)
 assert.equal(assessment.visual.status,'passed');assert.equal(assessment.localAccepted,false)
 assert.equal(assessment.pngHash,current.pngHash)
})
