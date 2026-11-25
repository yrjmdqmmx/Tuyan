import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
const html = fs.readFileSync(new URL('../public/account/reset-password.html', import.meta.url), 'utf8');
const script = fs.readFileSync(new URL('../public/account/reset-password.js', import.meta.url), 'utf8');

test('reset form uses the new same-origin endpoint for links from either site', async () => {
  for (const origin of ['https://tuyansci.cn', 'https://www.paperbanana.asia']) {
    const dom = new JSDOM(html, { url: `${origin}/account/reset-password.html?token=fixture-only`, runScripts: 'outside-only' });
    const calls = [];
    try {
      dom.window.fetch = async (url, init) => { calls.push({ url, init }); return Response.json({ ok: true }); };
      let redirected;
      const location = { origin, search: dom.window.location.search, hash: '', replace: url => { redirected = url; } };
      dom.window.Function('location', 'document', 'fetch', script)(location, dom.window.document, dom.window.fetch);
      if (origin !== 'https://tuyansci.cn') {
        assert.equal(redirected, 'https://tuyansci.cn/account/reset-password.html?token=fixture-only');
        assert.equal(calls.length, 0);
        continue;
      }
      const doc = dom.window.document;
      doc.getElementById('password').value = 'local-fixture-only';
      doc.getElementById('confirmation').value = 'local-fixture-only';
      doc.getElementById('reset-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, 'https://tuyansci.cn/api/auth/reset-password');
      assert.equal(calls[0].init.credentials, 'include');
      assert.equal(doc.getElementById('success-state').classList.contains('hidden'), false);
    } finally { dom.window.close(); }
  }
});
