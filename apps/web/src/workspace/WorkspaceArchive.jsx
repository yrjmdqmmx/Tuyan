import {useState} from 'react';
import {API_BASE_DEFAULT} from '../config.js';
import {workspaceVersionDataUrl} from './workspaceResultAsset.js';
export default function WorkspaceArchive({task,userId}){
 const [busy,setBusy]=useState(false),[status,setStatus]=useState('');
 const versions=Object.values(task.branches).flatMap(branch=>branch.groups.flatMap(group=>group.candidates.flatMap(candidate=>candidate.versions)));
 async function download(){
  if(busy)return;setBusy(true);setStatus('');
  try{const {default:Zip}=await import('jszip'),zip=new Zip();let bytes=0;const failed=[];
   for(const [index,version]of versions.entries()){
    try{const data=await workspaceVersionDataUrl(version,API_BASE_DEFAULT,userId),response=await fetch(data,{credentials:'omit'});if(!response.ok)throw Error('原件读取失败');const buffer=await response.arrayBuffer();bytes+=buffer.byteLength;if(bytes>100_000_000)throw Error('归档超过 100 MB，请按版本分别下载');zip.file(`results/${index+1}-${version.id}.${version.format}`,buffer);}
    catch(error){if(bytes>100_000_000)throw error;failed.push(`${version.id}: ${error.message}`);}
   }
   // The task schema contains only metadata, settings and requirements; never
   // package browser originals, connection secrets or expiring result URLs.
   zip.file('task.json',JSON.stringify(task,(key,value)=>key==='url'?undefined:value,2));
   zip.file('README.txt','所有已保存版本保持各自的 PNG / SVG 格式。task.json 保留版本关系和提交设置；原材料与连接密钥不在归档内。'+(failed.length?'\n部分文件未能读取，详见 download-errors.txt。':''));
   if(failed.length)zip.file('download-errors.txt',failed.join('\n'));
   const url=URL.createObjectURL(await zip.generateAsync({type:'blob'})),a=document.createElement('a');a.href=url;a.download=`Tuyan-${task.id}-versions.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus(`已打包 ${versions.length-failed.length} 个版本${failed.length?`，${failed.length} 个文件读取失败，请查看归档说明`:''}。`);
  }catch(error){setStatus(error.message);}finally{setBusy(false);}
 }
 return versions.length>0&&<div className="tw-archive-download"><button type="button" onClick={download} disabled={busy}>{busy?'正在打包…':'下载此任务全部版本'}</button>{status&&<p role="status">{status}</p>}</div>;
}
