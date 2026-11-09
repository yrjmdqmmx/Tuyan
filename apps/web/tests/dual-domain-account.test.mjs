import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
const html = fs.readFileSync(new URL('../public/account/reset-password.html', import.meta.url), 'utf8');
const script = fs.readFileSync(new URL('../public/account/reset-password.js', import.meta.url), 'utf8');

test('reset form uses the new same-origin endpoint and retains the old endpoint for the old site', async () => {
  for (const origin of ['https://tuyansci.cn', 'https://www.paperbanana.asia']) {
    const dom = new JSDOM(html, { url: `${origin}/account/reset-password.html?token=fixture-only`, runScripts: 'outside-only' });
    const calls = [];
    try {
      dom.window.fetch = async (url, init) => { calls.push({ url, init }); return Response.json({ ok: true }); };
      dom.window.eval(script);
      const doc = dom.window.document;
      doc.getElementById('password').value = 'local-fixture-only';
      doc.getElementById('confirmation').value = 'local-fixture-only';
      doc.getElementById('reset-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, `${origin === 'https://tuyansci.cn' ? origin : 'https://api.paperbanana.asia'}/api/auth/reset-password`);
      assert.equal(calls[0].init.credentials, 'include');
      assert.equal(doc.getElementById('success-state').classList.contains('hidden'), false);
    } finally { dom.window.close(); }
  }
});
