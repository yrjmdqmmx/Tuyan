import {useEffect,useState} from 'react';
import {listSvgDrafts,readSvgDraft,downloadSvg} from '../lib/svgDrafts.js';
import {svgRecoveryTask} from './workspaceSvgRecovery.js';
import {API_BASE_DEFAULT} from '../config.js';

export default function WorkspaceLocalDrafts({userId,onRestore,onClose,base=API_BASE_DEFAULT}) {
  const [rows,setRows]=useState([]),[status,setStatus]=useState('正在读取当前账号的浏览器手工稿…'),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{let live=true;listSvgDrafts(base,userId).then(items=>{if(live){setRows(items);setStatus(items.length?'':'此账号在当前浏览器没有 SVG 手工稿。');}}).catch(error=>{if(live)setStatus(error.message);});return()=>{live=false;};},[base,userId,retry]);
  async function restore(row,exportOnly=false){setBusy(true);setStatus('');try{const draft=await readSvgDraft(row.key);if(!draft?.svg)throw Error('手工稿暂不可读，原条目仍保留。');const task=await svgRecoveryTask(draft,base,userId);if(exportOnly){downloadSvg(draft.svg,'Tuyan-browser-draft.svg');setStatus('已导出原手工稿，未修改任务。');}else{await onRestore(task);onClose();}}catch(error){setStatus(error.message);}finally{setBusy(false);}}
  return <div className="tw-local-drafts"><div className="tw-page-intro"><div><h2>浏览器 SVG 手工稿</h2><p>包含旧工作台和新编辑器在此浏览器保存的修改，仅列出当前账号与服务的手工稿。其他设备的浏览器原稿不会自动同步。</p></div><button disabled={busy} onClick={()=>setRetry(n=>n+1)}>刷新手工稿</button></div><p>“恢复到最近任务”将手工稿保存为独立任务；同一内容重复恢复会打开已有副本，原稿不被删除或覆盖。保存的副本随后随账号同步，继续编辑会增加版本。</p>{status&&<p role="status">{status}</p>}<div className="tw-version-list">{rows.map(row=><article className="tw-management-section" key={row.key}><h3>{row.taskId}</h3><p>{Number.isInteger(row.candidateId)?`候选 ${row.candidateId+1}`:'版本手工稿'} · {new Date(row.updatedAt).toLocaleString()}</p><div className="tw-action-row"><button disabled={busy} onClick={()=>restore(row)}>恢复到最近任务</button><button disabled={busy} onClick={()=>restore(row,true)}>导出原手工稿</button></div></article>)}</div></div>;
}
