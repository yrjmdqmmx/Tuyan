import { evaluateRules } from '@paperbanana/figure-core';
import { inspectExportedSvg } from './svgInspection.js';

export async function sha256(bytes) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function svgVerification(document, svg) {
  const bytes = new TextEncoder().encode(svg);
  const fileSha256 = await sha256(bytes);
  return {
    documentId: document.id, documentRevision: document.revision,
    documentSha256: await sha256(new TextEncoder().encode(JSON.stringify(document))),
    sourceSvgSha256: fileSha256, fileSha256, byteLength: bytes.byteLength,
    format: 'svg', checkedAt: new Date().toISOString(),
    checks: [
      { id: 'file-identity', status: fileSha256 ? 'passed' : 'unverified', message: fileSha256 ? '已从本次实际下载的 SVG 字节计算大小与 SHA-256，未进行外部软件兼容性核验。' : '浏览器没有可用的 SHA-256 能力，未核验导出文件身份。' },
      ...inspectExportedSvg(svg, document),
      { id: 'external-editor-compatibility', status: 'manual', message: '需在目标编辑器核对独立对象、可编辑文字、字体和保存后重开。' },
      { id: 'exported-file-journal-rules', status: 'manual', message: '下方是源稿规则结果；最终文件的外观与期刊政策仍需人工检查。' },
      { id: 'font-portability', status: 'unverified', message: '未核验接收方字体安装与替换情况。' },
    ],
    documentRules: evaluateRules(document),
  };
}

export async function validateReturnedReport(document, bytes, report) {
  if (!report || report.documentId !== document.id || report.documentRevision !== document.revision || report.byteLength !== bytes.byteLength) throw new Error('导出报告与请求图稿或文件大小不一致，未提供该文件。');
  if (!['pdf', 'eps'].includes(report.format) || !Array.isArray(report.checks) || report.checks.some((check) => !['passed', 'manual', 'unverified', 'problem'].includes(check?.status) || typeof check.message !== 'string')) throw new Error('导出报告结构无效，未提供该文件。');
  const [digest, documentDigest] = await Promise.all([sha256(bytes), sha256(new TextEncoder().encode(JSON.stringify(document)))]);
  if (!digest || !documentDigest) throw new Error('当前浏览器无法核验导出文件与图稿的 SHA-256，未提供该文件。可继续保存源稿或本机 SVG。');
  if (digest !== report.fileSha256) throw new Error('导出文件与报告中的 SHA-256 不一致，未提供该文件。');
  if (documentDigest !== report.documentSha256) throw new Error('导出报告与请求图稿的完整内容 SHA-256 不一致，未提供该文件。');
  return report;
}
