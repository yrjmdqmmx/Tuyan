// Persist actual bytes before a remote/signed result URL expires. No redirects
// with credentials, and no generated result can become an original attachment.
export async function workspaceVersionDataUrl(version,base,userId){
 if(version.history?.source!=='production')return workspaceResultDataUrl(version.url,version.format,base);
 const {jobId,index}=version.history;
 const res=await fetch(base.replace(/\/$/,'')+'/api/workspace/history/'+encodeURIComponent(jobId)+'/results/'+index,{credentials:'include',cache:'no-store',headers:{'X-Workspace-Account':userId},signal:AbortSignal.timeout(45000)});
 const data=await res.json();if(!res.ok)throw Error(data.error||'历史结果读取失败');
 if(data.format!==version.format || typeof data.base64!=='string')throw Error('历史结果格式与版本不一致');
 return `data:image/${data.format==='svg'?'svg+xml':'png'};base64,${data.base64}`;
}
export async function workspaceResultDataUrl(url,format,base){
 if(url.startsWith('data:'))return url;
 const target=new URL(url,base);if(!['http:','https:'].includes(target.protocol))throw Error('返回的结果地址格式无效');
 const res=await fetch(target.href,{credentials:target.origin===new URL(base).origin?'include':'omit',redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw Error('结果读取失败，执行记录已保留，可重新读取。');
 if(Number(res.headers.get('content-length'))>10_000_000)throw Error('结果超过当前 10 MB 保存上限');
 const reader=res.body.getReader(),chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>10_000_000){await reader.cancel();throw Error('结果超过当前 10 MB 保存上限');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 if(format==='png'&&!([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)))throw Error('返回的图片不是 PNG，未错误标记格式或覆盖已有版本。');
 if(format==='svg'&&!/<svg[\s/>]/i.test(new TextDecoder().decode(bytes)))throw Error('返回的文件不是 SVG');
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return `data:image/${format==='svg'?'svg+xml':'png'};base64,${btoa(binary)}`;
}
