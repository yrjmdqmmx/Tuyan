import {expectedR28} from './founder-fixes-r28.mjs'
import i6 from './fixtures/source-evidence-i6-r26.json' with {type:'json'}
import i7 from './fixtures/source-evidence-i7-r27.json' with {type:'json'}
// Independent literal URL oracle captured from I2's documentation pairs. Do not
// call the implementation to derive expected links in render/parity tests.
import pairs from './fixtures/source-links-i3-r24.json' with {type:'json'}
export const expectedHumanUrl=url=>Object.hasOwn(pairs,url)?pairs[url]:url
import evidence from './fixtures/source-evidence-i4-r24.json' with {type:'json'}
import followup from './fixtures/source-evidence-i5-r25.json' with {type:'json'}
export const expectedHumanRows=(rows,card,client='web',includeR28=true)=>{
 if(includeR28 && client==='mini' && card.startsWith('fal/'))return expectedR28[card].mini.card.specSources
 const correction=i7[client]?.find(row=>row.card===card) || i6[client]?.find(row=>row.card===card) || followup[client]?.find(row=>row.card===card) || evidence[client]?.find(row=>row.card===card)
 if(correction)return correction.after
 const result=[]
 for(const row of rows) {
  const url=expectedHumanUrl(row.url)
  if(url&&!result.some(r=>r.url===url))result.push({...row,url})
 }
 return result
}
