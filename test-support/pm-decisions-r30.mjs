import fs from 'node:fs'
import assert from 'node:assert/strict'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
const bytes=fs.readFileSync(new URL('./fixtures/pm-decisions-r30.json.gz',import.meta.url))
assert.equal(createHash('sha256').update(bytes).digest('hex'),'b1903381ce6bac23756ed5c281be498579d3bd8e7d16e02ef27eca80346115c1')
export const pmReview=JSON.parse(gunzipSync(bytes))
assert.equal(pmReview.head,'588f1d67')
export const forbiddenBody=/\d{4}-\d{2}-\d{2}|核实日期|未核实|渠道公布|原厂公布|图研既有核实|图研输入要求/
const get=(row,path)=>path.split('/').reduce((r,k)=>r?.[k],row)
function reverse(row,patches){const copy=structuredClone(row);for(const patch of patches||[]){assert.deepEqual(get(copy,patch.path),patch.after,patch.path+' R30 reviewed presentation drift');const keys=patch.path.split('/'),last=keys.pop(),parent=keys.reduce((r,k)=>r[k],copy);if(Object.hasOwn(patch,'before'))parent[last]=structuredClone(patch.before);else delete parent[last]}return copy}
// Historical comparisons restore only exact reviewed presentation deltas. Every
// current value is checked first; capability/value/state/name changes are forbidden.
export function restoreI12(rows){return Object.fromEntries(Object.entries(rows).map(([key,row])=>[key,reverse(row,pmReview.rows[key])]))}
export function restoreI12Sources(rows,key,client){const patch=pmReview.rows[key]?.find(p=>p.path===(client==='web'?'web/sources':'mini/card/specSources'));if(!patch)return rows;assert.deepEqual(rows,patch.after,key+' '+client+' sources');return structuredClone(patch.before)}
export function currentI12Sources(rows,key,client){const patch=pmReview.rows[key]?.find(p=>p.path===(client==='web'?'web/sources':'mini/card/specSources'));if(!patch)return rows;assert.deepEqual(rows,patch.before,key+' '+client+' baseline');return structuredClone(patch.after)}
export function restoreI12Review(review){return Object.fromEntries(Object.entries(review).map(([client,rows])=>[client,rows.map(row=>reverse(row,pmReview.sources[client+'/'+row.card]))]))}
export function assertPMDecisions(rows){
 assert.equal(Object.keys(rows).length,1064)
 const counts={web:0,mini:0,unsupported:0,notApplicable:0},conditional=[]
 for(const [key,row]of Object.entries(rows)){
  const {data}=row.web,limits=[data.context,data.maxOutput],mini=row.mini.card
  assert.equal(row.web.sources[0]?.url,mini.specSources[0]?.url,key)
  assert.doesNotMatch(mini.auditMessage,forbiddenBody,key)
  for(const source of [...row.web.sources,...mini.specSources])assert.doesNotMatch(source.label,forbiddenBody,key)
  for(const [i,field]of ['totalContextTokens','maxOutputTokens'].entries()){
   const fact=data.fields[field],value=limits[i],native=mini.specRows[i+2].value
   if(fact.state==='known'){assert.ok(value.includes('tokens'));continue}
   const expected=fact.state==='unsupported'?'不支持':value==='不适用'?'不适用':'未公布'
   assert.equal(value,expected,key);assert.equal(native,expected,key)
   if(expected==='未公布'){counts.web++;counts.mini++;assert.match(mini.auditMessage,new RegExp(['上下文窗口','最大输出'][i]+'：未公布'))}
   if(fact.state==='unsupported')counts.unsupported++
   if(expected==='不适用')counts.notApplicable++
  }
  for(const icon of [...row.web.inputIcons,...row.web.outputIcons])if(icon.state==='conditional')conditional.push({key,sentence:icon.tooltip})
 }
 assert.deepEqual(counts,{web:584,mini:584,unsupported:0,notApplicable:816})
 assert.deepEqual(conditional,[{key:'together/Prism-ML/Ternary-Bonsai-27B',sentence:'支持图像输入（需启用视觉组件）'}])
 restoreI12(rows)
 return counts
}
export function currentPrimary(key,fallback){return pmReview.rows[key]?.find(p=>p.path==='web/sources')?.after?.[0]?.url || fallback}
export function currentPrimaryRow(key,fallback){return pmReview.rows[key]?.find(p=>p.path==='web/sources')?.after?.[0] || {...fallback,label:fallback.label?.replace(/(\d{4})-(\d{2})-(\d{2})/g,'$1年$2月$3日')}}
