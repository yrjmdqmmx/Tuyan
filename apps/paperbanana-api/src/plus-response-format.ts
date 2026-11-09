// Managed Plus only. Schema constrains shape, never replaces scientific validation.
// Bailian documents strict text JSON Schema support for Qwen3.8; multimodal
// requests only guarantee JSON Object. https://help.aliyun.com/zh/model-studio/qwen-structured-output
const string={type:'string'}
const array=(items:any)=>({type:'array',items})
const object=(properties:Record<string,any>,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false})
const finding=object({issue:string,location:string,evidence:string,suggestion:string})
const section=object({status:{type:'string',enum:['passed','issues_found']},findings:array(finding)})
const status={type:'string',enum:['passed','issues_found','uncertain']}
const scale=object(Object.fromEntries(['coordinate0','coordinate1','value0','value1','markCoordinate','sourceValue','pixelsPerUnit'].map(k=>[k,{type:'number'}])))
const check=object({label:string,source:string,expected:string,observed:string,method:string,status,linearScale:scale},['label','source','expected','observed','method','status'])
const numeric=object({applicable:{type:'boolean'},reason:string,checks:array(check)})
const adjudications=array(object({id:string,decision:{type:'string',enum:['accept','reject','unresolved']},reason:string,evidence:string}))
export function plusResponseFormat(request:any){
 const messages=Array.isArray(request.messages)?request.messages:[]
 const system=messages.filter((m:any)=>m.role==='system').map((m:any)=>typeof m.content==='string'?m.content:Array.isArray(m.content)?m.content.filter((p:any)=>p.type==='text').map((p:any)=>p.text).join('\n'):'').join('\n')
 let schema:any,name=''
 if(system.includes('material-aware scientific figure planner')||(system.includes('Lead Visual Designer')&&system.includes('Return ONLY strict JSON {"status"'))){
  name='tuyan_plan';schema=object({status:{type:'string',enum:['ready','needs_input']},missingInputs:array(string),plan:string})
 }else if(system.includes('PNG visual review AFTER generation')||system.includes('SVG visual AND code review')){
  const svg=system.includes('SVG visual AND code review');name=svg?'tuyan_svg_review':'tuyan_png_review'
  const fields:any={version:{type:'integer'},[svg?'svgHash':'pngHash']:string,visual:section,...(svg?{code:section}:{}),numericReview:numeric,visualAdjudications:adjudications,uncertainties:array(string),revised_description:string}
  if(system.includes('editChecks:'))fields.editChecks=array(object({id:string,status,evidence:string}))
  schema=object(fields)
 }else if(system.includes('visual observer assisting 图研')){
  name='tuyan_observation';schema=object({content:string,actual_text:array(string),layout:string,connections:array(string),problems:array(finding),suggestions:array(string),uncertainties:array(string)})
 }
 if(!schema)return undefined // Raw SVG code and free-form stages stay raw.
 const multimodal=messages.some((m:any)=>Array.isArray(m.content)&&m.content.some((p:any)=>p.type!=='text'))
 return multimodal?{type:'json_object'}:{type:'json_schema',json_schema:{name,strict:true,schema}}
}
