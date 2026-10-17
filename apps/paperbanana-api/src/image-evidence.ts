/** Plan all batches before calling a model; never discard an oversized image. */
export function imageEvidenceBatches<T>(items:T[],assertBudget:(items:T[])=>void):T[][] {
 const batches:T[][]=[];let current:T[]=[]
 for(const item of items){
  assertBudget([item])
  try{assertBudget([...current,item])}
  catch(error){if(!current.length)throw error;batches.push(current);current=[]}
  current.push(item)
 }
 if(current.length)batches.push(current)
 return batches
}
