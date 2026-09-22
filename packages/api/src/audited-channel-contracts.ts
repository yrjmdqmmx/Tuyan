import { AUDITED_CHANNEL_CONTRACTS } from './audited-channel-data.js'
/** Only the documented JSON Schema vocabulary used in our fixed snapshot.
 * No coercion/default insertion/removal: a rejected input is never sent. */
export function channelSchemaAccepts(schema:any, value:any):boolean {
  if (schema === false) return false
  if (!schema || schema === true) return true
  const has=(key:string)=>value!==null&&typeof value==='object'&&Object.prototype.hasOwnProperty.call(value,key)
  if (schema.const !== undefined && JSON.stringify(value)!==JSON.stringify(schema.const)) return false
  if (schema.enum && !schema.enum.some((v:any)=>JSON.stringify(v)===JSON.stringify(value))) return false
  if (schema.type) {
    const matches=(type:string)=>type==='array'?Array.isArray(value):type==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):type==='integer'?Number.isInteger(value):type==='null'?value===null:typeof value===type
    if (!(Array.isArray(schema.type)?schema.type:[schema.type]).some(matches)) return false
  }
  if (typeof value==='number') {
    if (!Number.isFinite(value)||value<(schema.minimum??-Infinity)||value>(schema.maximum??Infinity)||value<=(schema.exclusiveMinimum??-Infinity)||value>=(schema.exclusiveMaximum??Infinity))return false
    if(schema.multipleOf&&Math.abs(value/schema.multipleOf-Math.round(value/schema.multipleOf))>1e-8)return false
  }
  if(typeof value==='string') {
    const length=[...value].length
    if(length<(schema.minLength??0)||length>(schema.maxLength??Infinity))return false
    if(schema.pattern&&!new RegExp(schema.pattern).test(value))return false
    if(schema.format==='uuid'&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))return false
    if(schema.format==='uri'){try{new URL(value)}catch{return false}}
  }
  if(Array.isArray(value)) {
    if(value.length<(schema.minItems??0)||value.length>(schema.maxItems??Infinity))return false
    if(schema.items&&!value.every(v=>channelSchemaAccepts(schema.items,v)))return false
    if(schema.contains){const n=value.filter(v=>channelSchemaAccepts(schema.contains,v)).length;if(n<(schema.minContains??1)||n>(schema.maxContains??Infinity))return false}
  }
  if(value!==null&&typeof value==='object'&&!Array.isArray(value)) {
    if(schema.required?.some((key:string)=>!has(key)))return false
    for(const [key,v]of Object.entries(value)) {
      if(schema.properties?.[key]){if(!channelSchemaAccepts(schema.properties[key],v))return false}
      else if(schema.additionalProperties===false)return false
    }
    for(const[key,dependencies]of Object.entries(schema.dependentRequired||{}))if(has(key)&&(dependencies as string[]).some(k=>!has(k)))return false
  }
  if(schema.allOf&&!schema.allOf.every((s:any)=>channelSchemaAccepts(s,value)))return false
  if(schema.anyOf&&!schema.anyOf.some((s:any)=>channelSchemaAccepts(s,value)))return false
  if(schema.oneOf&&schema.oneOf.filter((s:any)=>channelSchemaAccepts(s,value)).length!==1)return false
  if(schema.not&&channelSchemaAccepts(schema.not,value))return false
  if(schema.if&&!channelSchemaAccepts(channelSchemaAccepts(schema.if,value)?schema.then:schema.else,value))return false
  for(const c of schema['x-constraints']||[]) {
    if(JSON.stringify(c.parameters)!=='["width","height"]'||!value?.width||!value?.height)continue
    const n=c.operation==='area'?value.width*value.height:c.operation==='ratio'?value.width/value.height:NaN
    if(Number.isNaN(n)||n<(c.minimum??-Infinity)||n>(c.maximum??Infinity))return false
  }
  return true
}
export function auditedChannelContract(provider:string,model:string) {return AUDITED_CHANNEL_CONTRACTS[provider+'/'+model]}
export function assertChannelRequest(contract:any,body:any) {
  if(contract?.expiresAt&&Date.now()>=Date.parse(contract.expiresAt))throw Object.assign(new Error('所选型号已下线；配置已保留，请手动选择其他型号。'),{localInputFailure:true,requestState:'not_sent'})
  if(contract?.schema&&!channelSchemaAccepts(contract.schema,body))throw Object.assign(new Error('输入不符合所选型号的官方字段、尺寸或图片组合限制，未发送。'),{localInputFailure:true,requestState:'not_sent'})
}
/** Inputs are already frozen as lossless PNG by the Core upload contract. */
export function assertChannelSourceConstraints(contract:any,images:{base64:string;mimeType:string}[]) {
  for(const image of images) {
    const bytes=Buffer.from(image.base64,'base64')
    const png=bytes.length>=24&&bytes.readUInt32BE(0)===0x89504e47
    const width=png?bytes.readUInt32BE(16):0,height=png?bytes.readUInt32BE(20):0
    for(const c of contract?.schema?.['x-constraints']||[]) {
      if(c.scope!=='each'||c.when)continue
      const n=c.operation==='fileSize'?bytes.length:c.operation==='width'?width:c.operation==='height'?height:c.operation==='ratio'?width/height:NaN
      if(!Number.isFinite(n)||n<(c.minimum??-Infinity)||n>(c.maximum??Infinity))throw Object.assign(new Error('原图或辅助图不符合所选型号的像素、比例或大小限制；未压缩或裁切，未发送。'),{localInputFailure:true,requestState:'not_sent'})
    }
    if(contract?.taskType==='vidu'&&(!width||!height||Math.min(width,height)<128||width/height<.25||width/height>4))throw Object.assign(new Error('Vidu 图片两边均须至少128像素，比例在1:4至4:1之间；未发送。'),{localInputFailure:true,requestState:'not_sent'})
  }
}
