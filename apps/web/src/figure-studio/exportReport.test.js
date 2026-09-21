import test from 'node:test';
import assert from 'node:assert/strict';
import { createExampleDocument, renderSvg } from '@paperbanana/figure-core';
import { sha256, svgVerification, validateReturnedReport } from './exportReport.js';

test('SVG report binds its real bytes and source revision without asserting external editability', async () => {
  const document = createExampleDocument();
  const svg = renderSvg(document);
  const report = await svgVerification(document, svg);
  assert.equal(report.documentId, document.id);
  assert.equal(report.documentRevision, document.revision);
  assert.equal(report.byteLength, new TextEncoder().encode(svg).byteLength);
  assert.equal(report.fileSha256, await sha256(new TextEncoder().encode(svg)));
  assert.equal(report.documentSha256, await sha256(new TextEncoder().encode(JSON.stringify(document))));
  assert.equal(report.checks.find((check) => check.id === 'external-editor-compatibility').status, 'manual');
  assert.equal(report.documentRules.profileId, document.profileId);
});

test('converted download is rejected when report identity or actual file hash differs', async () => {
  const document = createExampleDocument();
  const bytes = new TextEncoder().encode('%PDF-export-bytes');
  const report = { documentId: document.id, documentRevision: document.revision, documentSha256: await sha256(new TextEncoder().encode(JSON.stringify(document))), byteLength: bytes.length, format: 'pdf', checks: [], fileSha256: await sha256(bytes) };
  assert.equal(await validateReturnedReport(document, bytes, report), report);
  await assert.rejects(validateReturnedReport(document, bytes, { ...report, documentRevision: document.revision + 1 }), /不一致/);
  await assert.rejects(validateReturnedReport(document, bytes, { ...report, fileSha256: 'wrong' }), /SHA-256/);
  const sameRevisionDifferentContent = { ...document, title: 'same ID and revision, different source' };
  await assert.rejects(validateReturnedReport(sameRevisionDifferentContent, bytes, report), /完整内容 SHA-256 不一致/);
  await assert.rejects(validateReturnedReport(document, bytes, { ...report, documentSha256: undefined }), /完整内容 SHA-256 不一致/);
});
