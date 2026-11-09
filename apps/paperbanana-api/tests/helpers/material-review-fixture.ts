/** Protocol fixture only: this reply does not measure the rendered mock image. */
export function syntheticNumericReview(labels=['Alpha','Beta']) {
 return {applicable:true,reason:'Synthetic quantitative review for the material-transport regression; not real model or geometry acceptance',checks:labels.map((label,index)=>({
  label,source:'Uploaded synthetic original data; fixture values 35 and 12',expected:`${index===0?35:12} samples with common zero baseline and scale`,
  observed:'Mock review outcome for labels, baseline and quantitative marks; not an actual image measurement',method:'Offline deterministic protocol response; real pixel/coordinate correctness is tested separately',status:'passed',
 }))}
}
