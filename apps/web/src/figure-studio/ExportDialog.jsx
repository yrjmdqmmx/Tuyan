import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { evaluateRules, renderSvg } from '@paperbanana/figure-core';
import AccessibleDialog from '../components/AccessibleDialog.jsx';
import { requestExport } from './api.js';
import { downloadBlob, filename } from './state.js';
import { svgVerification, validateReturnedReport } from './exportReport.js';
import { figureAuthAccess } from './authAccess.js';

const STATUS_LABELS = { passed: '通过', manual: '待人工确认', unverified: '未核验', problem: '发现问题' };
const CHECK_LABELS = { 'file-identity': '实际文件身份与格式', 'external-editor-compatibility': '外部编辑软件兼容性', 'exported-file-journal-rules': '最终文件期刊要求', 'font-portability': '字体可移植性' };

export default function ExportDialog({ open, onClose, document, capabilities, saveSource, auth, currentUser, onSignIn }) {
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);
  const [reportName, setReportName] = useState('');
  const [reportSnapshot, setReportSnapshot] = useState('');
  const active = useRef(true);
  const request = useRef(null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; request.current?.abort(); };
  }, []);
  const documentSnapshot = useMemo(() => JSON.stringify(document), [document]);
  const authAccess = figureAuthAccess(auth, currentUser);
  const results = evaluateRules(document);
  const baselineWarnings = results.baseline.filter((rule) => ['problem', 'fail', 'failed', 'warning', 'warn'].includes(rule.status)).length;
  function unavailableReason(format) {
    if (authAccess.state !== 'authenticated') return authAccess.notice;
    return capabilities?.formatReasons?.[format] || '当前服务端未确认转换能力。SVG 与源稿可直接下载。';
  }
  function serverExportDisabled(format) {
    return !!busy || authAccess.state === 'pending'
      || (authAccess.state === 'authenticated' ? capabilities?.formats?.[format] !== true : !onSignIn);
  }
  async function exportFile(format) {
    if (busy) return;
    if (format !== 'svg') {
      // An explicit protected action opens the same site login; it never queues
      // an export to replay after authentication.
      if (authAccess.state === 'pending') return;
      if (authAccess.state !== 'authenticated') { onClose(); onSignIn?.(); return; }
      if (capabilities?.formats?.[format] !== true) { setError(unavailableReason(format)); return; }
    }
    setBusy(format); setMessage(''); setError(''); setReport(null); setReportSnapshot('');
    try {
      if (format === 'svg') {
        const svg = renderSvg(document);
        const verification = await svgVerification(document, svg);
        if (!active.current) return;
        const name = filename(document.title, 'svg');
        downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), name);
        setReport(verification); setReportSnapshot(documentSnapshot); setReportName(`${name}.verification.json`);
        setMessage('SVG 已下载，保留源稿中的文字与对象。尚未在你的目标软件验证编辑与保存后重开。');
      } else {
        request.current = new AbortController();
        const result = await requestExport({ document, format }, { signal: request.current.signal });
        if (!active.current) return;
        const bytes = Uint8Array.from(atob(result.file.base64), (value) => value.charCodeAt(0));
        const verification = await validateReturnedReport(document, bytes, result.verification);
        if (!active.current) return;
        downloadBlob(new Blob([bytes], { type: result.file.mimeType }), result.file.name || filename(document.title, format));
        setReport(verification); setReportSnapshot(documentSnapshot); setReportName(`${result.file.name || filename(document.title, format)}.verification.json`);
        setMessage(`${format.toUpperCase()} 已转换并下载。转换成功不代表对象可编辑或满足投稿要求；请在目标软件中检查。`);
      }
    } catch (error) { if (active.current) setError(error.message || '导出失败，当前图稿已保留。'); } finally { if (active.current) setBusy(''); }
  }
  return <AccessibleDialog open={open} onClose={onClose} labelledBy="fs-export-title" className="fs-export-dialog" backdropClassName="fs-dialog-backdrop"><header><div><h2 id="fs-export-title">导出图稿</h2><p>版本 {document.revision} · {document.canvas.widthMm} × {document.canvas.heightMm} mm</p></div><button aria-label="关闭导出" onClick={onClose}><X size={18} /></button></header>
    <div className="fs-export-body"><div className="fs-note">{baselineWarnings ? `官方基线有 ${baselineWarnings} 项需留意。` : '自动检查未发现需调整的技术项。'}科学内容、AI 使用政策与外部软件兼容性仍需人工核验。</div>
      <div className="fs-export-row"><div><strong>图研源稿</strong><p>完整对象、图片与工作规则，可重新打开继续编辑。</p></div><button onClick={saveSource}><Download size={15} />源稿</button></div>
      <div className="fs-export-row"><div><strong>SVG</strong><p>本机导出矢量对象与文本，嵌入的图片仍为位图。</p></div><button disabled={!!busy} onClick={() => exportFile('svg')}><Download size={15} />SVG</button></div>
      {['pdf', 'eps'].map((format) => <div className="fs-export-row" key={format}><div><strong>{format.toUpperCase()} · 兼容性受限</strong><p>{authAccess.state === 'authenticated' && capabilities?.formats?.[format] === true ? (capabilities.formatReasons?.[format] || '服务端转换；目标软件的编辑保真仍需核验。') : unavailableReason(format)}</p><p>{format === 'pdf' ? 'Inkscape 验收样本中，导入后文字会合并，修改时出现层次遮挡。继续编辑请优先使用源稿或 SVG。' : '已有验收样本出现科学符号编码变化、文字合并和分组丢失。继续编辑请优先使用源稿或 SVG。'}</p></div><button disabled={serverExportDisabled(format)} onClick={() => exportFile(format)}>{busy === format ? <Loader2 size={15} className="fs-spin" /> : <Download size={15} />}{format.toUpperCase()}</button></div>)}
      <p className="fs-micro">PDF / EPS 请求含嵌入图片，上限 768 KiB。下载源稿与 SVG 在本机完成。字体是否可用由打开文件的软件决定。</p>
      <p className="fs-micro">SVG 优先用于继续编辑；PDF/EPS 在外部软件中可能合并文字或分组，EPS 的科学符号还需逐项检查。</p>
      {message && <p role="status" className="fs-success">{message}</p>}{error && <p role="alert" className="fs-error">{error}</p>}
      {report && <section className="fs-export-report" aria-label="导出文件检查报告"><div className="fs-section-heading"><h3>实际文件检查报告</h3><button onClick={() => downloadBlob(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), reportName)}><Download size={14} />报告 JSON</button></div>
        <p>{report.format.toUpperCase()} · 图稿版本 {report.documentRevision} · {report.byteLength.toLocaleString()} 字节</p>
        {reportSnapshot !== documentSnapshot && <p className="fs-error">当前图稿内容已改变。即使文档编号与版本号相同，此报告也仅适用于先前导出的图稿。</p>}
        <label>文件 SHA-256<code>{report.fileSha256 || '未核验'}</code></label>
        <label>完整图稿 SHA-256<code>{report.documentSha256 || '未核验'}</code></label>
        <div>{report.checks.map((check) => <div className={`fs-export-check fs-check-${check.status}`} key={check.id}><div><strong>{CHECK_LABELS[check.id] || check.id}</strong><span>{STATUS_LABELS[check.status] || '未核验'}</span></div><p>{check.message}</p></div>)}</div>
        {report.documentRules && <details><summary>此版本源稿的基线与工作规则</summary>{[['baseline', '官方基线'], ['working', '工作规则']].map(([scope, title]) => <div key={scope}><h4>{title}</h4>{report.documentRules[scope]?.map((check) => <div className={`fs-export-check fs-check-${check.status}`} key={check.id}><div><strong>{check.label}</strong><span>{STATUS_LABELS[check.status] || '未核验'}</span></div><p>{check.message}</p></div>)}</div>)}</details>}
      </section>}
    </div>
  </AccessibleDialog>;
}
