export const RESULT_MIME = { svg: 'image/svg+xml', png: 'image/png', html: 'text/html' };
export async function renderEcosystem({ base = '', userId, payload, signal, fetcher = fetch }) {
  if (!userId) throw Error('请先登录，再使用科研工具。');
  const response = await fetcher(`${base.replace(/\/$/, '')}/api/ecosystem/render`, {
    method: 'POST', credentials: 'include', signal,
    headers: { 'Content-Type': 'application/json', 'X-Workspace-Account': userId }, body: JSON.stringify(payload),
  });
  let result;
  try { result = await response.json(); } catch { throw Error('科研工具未返回有效结果，请稍后重试。'); }
  if (!response.ok) throw Error(typeof result?.error === 'string' ? result.error : '科研工具暂时不可用。');
  if (result.tool !== payload.tool || !RESULT_MIME[result.format] || typeof result.base64 !== 'string' || !result.base64 || result.base64.length > 32 * 1024 * 1024) throw Error('工具返回的结果格式不正确。');
  return result;
}

export function resultBytes(result) {
  return Uint8Array.from(atob(result.base64), char => char.charCodeAt(0));
}

export function isolatedHtml(result) {
  const html = new TextDecoder().decode(resultBytes(result));
  // Opaque-origin iframe + no network: generated interactive output cannot
  // reach the user's account, application storage, or external endpoints.
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'">`;
  return /<head(?:\s[^>]*)?>/i.test(html) ? html.replace(/<head(?:\s[^>]*)?>/i, match => match + policy) : policy + html;
}

export function downloadResult(result) {
  const url = URL.createObjectURL(new Blob([resultBytes(result)], { type: RESULT_MIME[result.format] }));
  const a = document.createElement('a');
  a.href = url; a.download = `Tuyan-${result.tool}.${result.format}`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
