import {createPortal} from 'react-dom';
import {useId,useState} from 'react';
import {journalFigureExportRequest} from '@paperbanana/api';
import AccessibleDialog from './AccessibleDialog.jsx';
import {JOURNAL_STAGES,JOURNAL_PURPOSES,JOURNAL_LEVELS} from '../../../../packages/api/src/journal-rules.js';
export function downloadJournalFile(file) {
  const bytes=Uint8Array.from(atob(file.base64),c=>c.charCodeAt(0));
  const url=URL.createObjectURL(new Blob([bytes],{type:file.mimeType}));
  const a=document.createElement('a');a.href=url;a.download=file.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function JournalExportPanel({jobId,snapshot,candidateId,apiBase,svg=false}) {
  const [open,setOpen]=useState(false),[report,setReport]=useState(null),[file,setFile]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const title=useId();
  async function inspect(format='original') {
    setOpen(true);setBusy(true);setError('');setReport(null);setFile(null);
    try {const result=await journalFigureExportRequest(apiBase,{jobId,candidateId,format,flattenWhite:format==='tiff',download:true});setReport(result.report);setFile(result.file);}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <>
    <button type="button" onClick={()=>inspect()} aria-label={`检查并导出候选图 ${Number(candidateId)+1}`}>检查并导出</button>
    {createPortal(<AccessibleDialog open={open} onClose={()=>!busy&&setOpen(false)} labelledBy={title} className="journal-export-dialog">
      <header className="journal-header"><h2 id={title}>期刊图件检查与导出</h2><button type="button" disabled={busy} onClick={()=>setOpen(false)}>关闭</button></header>
      <div className="journal-export-body"><p><strong>{snapshot.name}</strong> · {JOURNAL_STAGES[snapshot.selection.stage]} · {JOURNAL_PURPOSES[snapshot.selection.purpose]} · {snapshot.version}</p>
        <p className="journal-muted">检查任务保存的原始文件和当时规则。白底 TIFF 转换保留像素数，不补造图像细节；科学真实性、字体和 AI 披露仍需人工检查。</p>
        <div className="journal-export-actions"><button type="button" disabled={busy} onClick={()=>inspect()}>检查原始文件</button>{!svg&&<button type="button" disabled={busy} onClick={()=>inspect('tiff')}>转换并检查白底 TIFF</button>}</div>
        {busy&&<p role="status">正在读取并检查实际文件…</p>}{error&&<p role="alert">{error} 未提供未经检查的下载替代。</p>}
        {report&&<>
          <p>{report.facts.format.toUpperCase()} · {report.facts.width} × {report.facts.height} {report.facts.format==='svg'?'坐标单位':'px'} · {(report.facts.size/1024).toFixed(1)} KiB · 排版 {report.facts.widthMm} × {report.facts.heightMm?.toFixed(1)||'未知'} mm{report.facts.effectiveDpi?` · ${report.facts.effectiveDpi.toFixed(1)} ppi`:''}</p>
          {report.conversions.map(text=><p key={text}>{text}</p>)}
          {report.policy.map(i=><p key={i.code} className="journal-notice">AI/能力：{i.text}</p>)}
          {Object.entries({unmet:'未满足',pending:'待确认',uncheckable:'无法自动检查',checked:'已检查'}).map(([status,label])=><details key={status} open={status==='unmet'||status==='pending'}><summary>{label}（{report.checks.filter(c=>c.status===status).length}）</summary><ul className="journal-rules">{report.checks.filter(c=>c.status===status).map(c=><li key={c.id}><span className="journal-level">{JOURNAL_LEVELS[c.requirement]}</span><span>{c.text}</span></li>)}</ul></details>)}
          <details><summary>文件指纹与规则来源</summary><p>检查时间：{report.checkedAt}</p><p className="journal-hash">原文件 SHA-256：{report.sourceSha256}<br/>导出文件 SHA-256：{report.exportSha256}</p>{report.sources.map(src=><p key={src.id}><a href={src.url} target="_blank" rel="noreferrer">{src.title}</a> · {src.verifiedOn}</p>)}</details>
          <p className="journal-notice">{report.notice}</p>
          <div className="journal-export-actions"><button type="button" className="primary-button" onClick={()=>downloadJournalFile(file)}>下载已检查文件（保留上述问题）</button><button type="button" onClick={()=>downloadJournalFile({filename:'journal-check.json',mimeType:'application/json',base64:btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(report,null,2))))})}>下载检查报告</button></div>
        </>}
      </div>
    </AccessibleDialog>,document.body)}
  </>;
}
export function JournalTaskSummary({job}) {
  const snapshot=job?.journalProfile;
  if(!snapshot)return null;
  return <p className="journal-task-summary"><strong>{snapshot.name}</strong> · {JOURNAL_STAGES[snapshot.selection.stage]} · {JOURNAL_PURPOSES[snapshot.selection.purpose]} · {snapshot.version}<br/><small>使用任务保存的规则。成图质量评审与期刊检查分别进行；请逐图“检查并导出”。</small></p>;
}
