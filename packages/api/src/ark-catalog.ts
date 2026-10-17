import { createHash, createHmac } from 'node:crypto'
// Canonical request follows Volcengine's official signing implementation:
// https://github.com/volcengine/volc-sdk-golang/blob/main/base/sign.go
const hash=(value:string)=>createHash('sha256').update(value).digest('hex')
const hmac=(key:string|Buffer,value:string)=>createHmac('sha256',key).update(value).digest()
export type CatalogCredentials = { accessKeyId?:string; secretAccessKey?:string; sessionToken?:string; token?:string }
export const ARK_CATALOG_ACTIONS=['ListFoundationModels','ListFoundationModelVersions','ListEndpoints'] as const
export function signedArkCatalogRequest(action:string, payload:any, credentials:CatalogCredentials, date=new Date()) {
  if(!ARK_CATALOG_ACTIONS.includes(action as any))throw new Error('Only read-only Ark catalog actions are allowed')
  const url=`https://ark.cn-beijing.volcengineapi.com/?Action=${action}&Version=2024-01-01`
  const body=JSON.stringify(payload)
  const timestamp=date.toISOString().replace(/[-:]|\.\d{3}/g,'')
  const day=timestamp.slice(0,8),scope=`${day}/cn-beijing/ark/request`
  const headers:Record<string,string>={'content-type':'application/json',host:'ark.cn-beijing.volcengineapi.com','x-content-sha256':hash(body),'x-date':timestamp}
  if(credentials.sessionToken)headers['x-security-token']=credentials.sessionToken
  const names=Object.keys(headers).sort(),signed=names.join(';')
  const canonical=['POST','/',`Action=${action}&Version=2024-01-01`,names.map(n=>`${n}:${headers[n].trim()}\n`).join(''),signed,hash(body)].join('\n')
  const signing=hmac(hmac(hmac(hmac(credentials.secretAccessKey || '',day),'cn-beijing'),'ark'),'request')
  const signature=hmac(signing,['HMAC-SHA256',timestamp,scope,hash(canonical)].join('\n')).toString('hex')
  headers.authorization=`HMAC-SHA256 Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${signed}, Signature=${signature}`
  return {url,init:{method:'POST',headers,body,redirect:'error' as const}}
}

export type ArkCatalogProgress = { phase:'families'|'versions'|'endpoints'|'done'; page:number; count:number; familyIndex:number; families:{Name:string;DisplayName?:string;VendorName?:string}[] }
export function arkCatalogProgress(value?:any):ArkCatalogProgress {
  if(!value)return {phase:'families',page:1,count:0,familyIndex:0,families:[]}
  if(!['families','versions','endpoints','done'].includes(value.phase) || !Number.isSafeInteger(value.page) || value.page<1 || !Number.isSafeInteger(value.count) || value.count<0 || !Number.isSafeInteger(value.familyIndex) || value.familyIndex<0 || !Array.isArray(value.families) || value.families.length>1000 || value.families.some((f:any)=>typeof f.Name!=='string' || f.Name.length>256))throw new Error('无效的 Ark 目录分页位置')
  return structuredClone(value)
}
export async function enumerateArkCatalog(credentials:CatalogCredentials, read:(url:string,init:RequestInit)=>Promise<any>, onRow:(row:any,source:string)=>void, progress=arkCatalogProgress(), onPage=()=>{}) {
  let pages=0
  while(progress.phase!=='done' && pages<50){
    if(progress.phase==='versions' && progress.familyIndex>=progress.families.length){progress.phase='endpoints';progress.page=1;progress.count=0}
    const family=progress.families[progress.familyIndex]
    const action=progress.phase==='families'?'ListFoundationModels':progress.phase==='versions'?'ListFoundationModelVersions':'ListEndpoints'
    const request=signedArkCatalogRequest(action,{...(action==='ListFoundationModelVersions'?{FoundationModelName:family.Name}:{}),PageNumber:progress.page,PageSize:100},credentials)
    const data=await read(request.url,request.init)
    if(data.ResponseMetadata?.Error)throw new Error('Ark 目录权限不足或管理请求失败')
    if(!Array.isArray(data.Result?.Items) || !Number.isSafeInteger(data.Result?.TotalCount))throw new Error('Ark 目录返回格式不符')
    const rows=data.Result.Items,total=data.Result.TotalCount
    for(const row of rows){
      if(progress.phase==='families'){
        if(typeof row.Name!=='string')throw new Error('Ark 基础型号缺少名称')
        progress.families.push({Name:row.Name,DisplayName:row.DisplayName,VendorName:row.VendorName})
        onRow({id:row.Name,display_name:row.DisplayName,owned_by:row.VendorName},'https://docs.volcengine.com/docs/ark/list-foundation-models-api?lang=zh')
      }else if(progress.phase==='versions'){
        if(typeof row.FoundationModelName!=='string' || typeof row.ModelVersion!=='string')throw new Error('Ark 版本缺少标识')
        onRow({id:`${row.FoundationModelName}-${row.ModelVersion}`,display_name:`${family.DisplayName || row.FoundationModelName} (${row.ModelVersion})`,owned_by:family.VendorName},'https://docs.volcengine.com/docs/ark/list-foundation-model-versions-api?lang=zh')
      }else{
        if(typeof row.Id!=='string')throw new Error('Ark 接入点缺少标识')
        onRow({id:row.Id,display_name:row.Name || row.Id},'https://api.volcengine.com/api-docs/view?action=ListEndpoints&serviceCode=ark&version=2024-01-01')
      }
    }
    if(!rows.length && progress.count<total)throw new Error('Ark 目录分页提前结束')
    pages++;onPage();progress.count+=rows.length;progress.page++
    if(progress.count>=total){
      progress.count=0;progress.page=1
      if(progress.phase==='families')progress.phase='versions'
      else if(progress.phase==='versions')progress.familyIndex++
      else progress.phase='done'
    }
  }
  return pages
}
