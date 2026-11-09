// Independent literal URL oracle captured from I2's documentation pairs. Do not
// call the implementation to derive expected links in render/parity tests.
import pairs from './fixtures/source-links-i3-r24.json' with {type:'json'}
export const expectedHumanUrl=url=>Object.hasOwn(pairs,url)?pairs[url]:url
export const expectedHumanRows=rows=>{
 const result=[]
 for(const row of rows) {
  const url=expectedHumanUrl(row.url)
  if(url&&!result.some(r=>r.url===url))result.push({...row,url})
 }
 return result
}
