export function createPlusClient(base,userId){return async(path,body,signal)=>{
  const response=await fetch(base+'/api/plus'+path,{method:body===undefined?'GET':'POST',credentials:'include',headers:{'Content-Type':'application/json','X-Workspace-Account':userId},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:signal||AbortSignal.timeout(20000)});
  let data;try{data=await response.json();}catch{throw Error('服务响应暂时无法确认，请稍后查询');}
  if(!response.ok)throw Object.assign(Error(data.error||'暂时无法完成'),{code:data.code,status:response.status});return data;
};}
