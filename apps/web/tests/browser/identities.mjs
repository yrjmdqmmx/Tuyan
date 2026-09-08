import { startIdentityFixture } from '../../../auth-gateway/tests/integration/identity-fixture.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const out = process.env.IDENTITY_BROWSER_OUTPUT_DIR || '/tmp/tuyan-identity-browser'; fs.mkdirSync(out, { recursive: true });
const container = `tuyan-identity-browser-${randomUUID().slice(0, 8)}`, webBase = 'http://127.0.0.1:5196';
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let fixture, vite, browser, page;
const errors = [], checks = [];
const pass = (name) => { checks.push(name); console.log(`PASS ${name}`); };
try {
  docker('run', '--detach', '--name', container, '--publish', '127.0.0.1::27017', 'mongo:8.0.16-noble', 'mongod', '--replSet', 'rs0', '--bind_ip_all');
  for (let i = 0; i < 30; i++) { try { docker('exec', container, 'mongosh', '--quiet', '--eval', 'quit(db.adminCommand({ping:1}).ok ? 0 : 1)'); break; } catch {} await pause(500); }
  docker('exec', container, 'mongosh', '--quiet', '--eval', 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})');
  for (let i = 0; i < 30; i++) { try { docker('exec', container, 'mongosh', '--quiet', '--eval', 'quit(db.hello().isWritablePrimary ? 0 : 1)'); break; } catch {} await pause(500); }
  const port = docker('port', container, '27017/tcp').split(':').at(-1);
  fixture = await startIdentityFixture(`mongodb://127.0.0.1:${port}/?directConnection=true`, webBase);
  const log = fs.openSync(path.join(out, 'vite.log'), 'w');
  vite = spawn(process.execPath, [root + '/apps/web/node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5196', '--strictPort'], { cwd: root + '/apps/web', env: { ...process.env, VITE_API_BASE: fixture.apiBase, VITE_AUTH_BASE: fixture.apiBase, VITE_ALLOW_CUSTOM_API_BASE: 'true', VITE_AUTH_ENABLED: 'true', VITE_AUTH_REQUIRED: 'false', VITE_BACKEND_MODE: 'gateway', VITE_BENCH_ENABLED: 'false' }, stdio: ['ignore', log, log] });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(webBase)).ok) break; } catch {} await pause(500); }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, locale: 'zh-CN' });
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    // Exercise the actual confirmation page against the disposable Gateway.
    if (url.origin === 'https://api.paperbanana.asia' && ['/api/auth/verify-email', '/api/auth/reset-password'].includes(url.pathname)) {
      const response = await context.request.fetch(fixture.apiBase + url.pathname, { method: 'POST', headers: { origin: webBase, 'content-type': 'application/json' }, data: route.request().postData() });
      return route.fulfill({ response });
    }
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
  page = await context.newPage(); page.on('pageerror', (e) => errors.push(e.message));
  async function approve() { await page.getByRole('link', { name: '同意授权', exact: true }).click(); await page.waitForURL((url) => url.origin === webBase); }
  async function openAccount() { await page.getByRole('button', { name: '账号', exact: true }).click(); await page.getByRole('heading', { name: '登录方式', exact: true }).waitFor(); }
  async function manage() { await page.getByRole('button', { name: '用 GitHub 验证以管理', exact: true }).click(); await approve(); await page.getByText('管理身份验证有效。', { exact: true }).waitFor(); }
  await page.goto(webBase + '/?auth=sign-in'); await page.getByRole('button', { name: 'GitHub 登录', exact: true }).waitFor();
  await page.locator('.auth-panel').screenshot({ path: out + '/01-login-desktop.png' });
  await page.getByRole('button', { name: 'GitHub 登录', exact: true }).click(); await approve(); await openAccount();
  await page.getByText('尚未绑定邮箱', { exact: true }).waitFor(); assert.equal(await page.locator('body').getByText(/accounts\.tuyan\.invalid/).count(), 0);
  const original = await fixture.db.collection('account').findOne({ providerId: 'github' }); const originalId = String(original.userId);
  pass('desktop GitHub first sign-in needs no email verification and hides internal addresses');
  await page.locator('.account-dialog').screenshot({ path: out + '/02-oauth-account-desktop.png' });
  await manage(); await page.getByRole('button', { name: '解绑GitHub', exact: true }).click(); await page.getByRole('button', { name: '确认解绑', exact: true }).click(); await page.getByRole('alert').getByText(/至少需要保留一种/).waitFor();
  pass('last method cannot be removed and error is actionable');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: '绑定 Google', exact: true }).click(); await approve(); await page.getByText('科研用户 Google · 已授权', { exact: true }).waitFor();
  assert.equal(String((await fixture.db.collection('account').findOne({ providerId: 'google' })).userId), originalId);
  pass('Google binding preserves the existing internal ID');
  await manage(); await page.getByLabel('待绑定邮箱', { exact: true }).fill('browser-bind@example.test'); await page.getByRole('button', { name: '发送邮箱验证码', exact: true }).click();
  await page.getByLabel('邮箱验证码', { exact: true }).waitFor(); assert.match(await page.locator('.identity-email-form').innerText(), /秒后可重发/);
  await page.getByLabel('邮箱验证码', { exact: true }).fill('000000'); await page.getByLabel('设置邮箱登录密码', { exact: true }).fill('browser-password-123'); await page.getByRole('button', { name: '确认绑定邮箱', exact: true }).click(); await page.getByRole('alert').getByText(/验证码不正确/).waitFor();
  await page.getByLabel('邮箱验证码', { exact: true }).fill(fixture.mails.at(-1).code); await page.getByRole('button', { name: '确认绑定邮箱', exact: true }).click(); await page.getByText('browser-bind@example.test · 邮箱已验证', { exact: true }).waitFor();
  pass('email binding verifies a code, shows resend countdown and preserves ID');
  await page.setViewportSize({ width: 390, height: 844 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.locator('.account-dialog').screenshot({ path: out + '/03-linked-account-mobile.png' });
  await page.getByLabel('身份验证密码', { exact: true }).fill('browser-password-123'); await page.getByRole('button', { name: '验证以管理登录方式', exact: true }).click(); await page.getByText('管理身份验证有效。', { exact: true }).waitFor();
  await page.getByRole('button', { name: '解绑Google', exact: true }).click(); await page.getByRole('button', { name: '确认解绑', exact: true }).click(); await page.getByRole('status').getByText('已解绑。', { exact: true }).waitFor();
  pass('390px account management supports password reauthentication and unlink without page overflow');
  await page.getByRole('button', { name: '关闭账号设置', exact: true }).click(); await page.getByRole('button', { name: '退出', exact: true }).click();
  await page.goto(webBase + '/?auth=sign-in'); await page.getByLabel('邮箱', { exact: true }).fill('browser-bind@example.test'); await page.getByLabel('密码', { exact: true }).fill('browser-password-123'); await page.locator('.auth-form').getByRole('button', { name: '登录', exact: true }).click(); await openAccount();
  assert.equal(String((await fixture.db.collection('user').findOne({ email: 'browser-bind@example.test' }))._id), originalId);
  pass('bound email password logs in to the same account');
  await page.getByRole('button', { name: '关闭账号设置', exact: true }).click(); await page.getByRole('button', { name: '退出', exact: true }).click();
  await page.goto(webBase + '/?auth=sign-in'); await page.getByRole('button', { name: 'Google 登录', exact: true }).click(); await page.getByRole('link', { name: '取消授权', exact: true }).click(); await page.getByText(/已取消授权，可以重试/).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); await page.locator('.auth-panel').screenshot({ path: out + '/04-cancelled-mobile.png' });
  pass('cancelled authorization returns to usable mobile email login');
  await page.getByRole('button', { name: '没有账号，去注册', exact: true }).click(); await page.getByLabel('昵称', { exact: true }).fill('邮箱回归用户'); await page.getByLabel('邮箱', { exact: true }).fill('browser-email@example.test'); await page.getByLabel('密码', { exact: true }).fill('browser-email-password'); await page.getByRole('button', { name: '注册并验证邮箱', exact: true }).click(); await page.getByRole('heading', { name: '等待验证', exact: true }).waitFor();
  const emailRow = await fixture.db.collection('user').findOne({ email: 'browser-email@example.test' }); assert.equal(emailRow.emailVerified, false);
  const token = await fixture.verifier.issue({ id: String(emailRow._id) }); const confirm = await context.newPage();
  await confirm.goto(webBase + '/account/email-verify.html#token=' + token); await confirm.getByRole('button', { name: '确认验证邮箱', exact: true }).waitFor(); assert.equal((await fixture.db.collection('user').findOne({ _id: emailRow._id })).emailVerified, false);
  await confirm.getByRole('button', { name: '确认验证邮箱', exact: true }).click(); await confirm.waitForURL('**/account/email-verified.html');
  await page.getByRole('button', { name: /立即登录|已完成验证？直接登录/ }).click(); await page.getByLabel('密码', { exact: true }).fill('browser-email-password'); await page.locator('.auth-form').getByRole('button', { name: '登录', exact: true }).click(); await openAccount(); await confirm.close();
  pass('email registration, safe preview, explicit verification and password sign-in regressions');
  await page.getByRole('button', { name: '关闭账号设置', exact: true }).click(); await page.getByRole('button', { name: '退出', exact: true }).click();
  fixture.profiles.google = { subject: 'conflicting-browser', name: '同邮箱用户', email: 'browser-email@example.test', emailVerified: true };
  await page.goto(webBase + '/?auth=sign-in'); await page.getByRole('button', { name: 'Google 登录', exact: true }).click(); await approve(); await page.getByText(/此邮箱已关联其他账号/).waitFor();
  await page.getByRole('button', { name: '忘记密码', exact: true }).click(); await page.getByLabel('邮箱', { exact: true }).fill('browser-email@example.test'); await page.getByRole('button', { name: '发送重置链接', exact: true }).click(); await page.getByRole('heading', { name: '检查你的邮箱', exact: true }).waitFor();
  pass('same-email OAuth conflict guides original login; existing recovery request remains available');
  const resetRow = await fixture.db.collection('verification').findOne({ identifier: /^reset-password:/, value: String(emailRow._id) });
  assert.ok(resetRow);
  await page.goto(webBase + '/account/reset-password.html?token=' + resetRow.identifier.slice('reset-password:'.length));
  await page.getByLabel('新密码', { exact: true }).fill('browser-reset-password'); await page.getByLabel('再次输入', { exact: true }).fill('browser-reset-password');
  await page.getByRole('button', { name: '重置密码', exact: true }).click(); await page.getByRole('heading', { name: '密码重置成功', exact: true }).waitFor();
  await page.goto(webBase + '/?auth=sign-in'); await page.getByLabel('邮箱', { exact: true }).fill('browser-email@example.test'); await page.getByLabel('密码', { exact: true }).fill('browser-reset-password');
  await page.locator('.auth-form').getByRole('button', { name: '登录', exact: true }).click(); await openAccount();
  await page.getByRole('button', { name: '关闭账号设置', exact: true }).click(); await page.getByRole('button', { name: '退出', exact: true }).click();
  pass('mobile password reset page completes and the new password logs into the original account');
  // A new Google-only identity can reauthorize and delete itself without a password.
  fixture.profiles.google = { subject: 'new-browser-google', name: 'Google 独立用户', email: 'new-browser-google@example.test', emailVerified: true };
  await page.goto(webBase + '/?auth=sign-in'); await page.getByRole('button', { name: 'Google 登录', exact: true }).click(); await approve(); await openAccount();
  const deletedId = String((await fixture.db.collection('account').findOne({ providerId: 'google', accountId: 'new-browser-google' })).userId);
  await page.getByRole('button', { name: '验证以注销账号', exact: true }).click(); await approve(); await page.getByText('注销身份已验证，请输入下方确认文字。', { exact: true }).waitFor();
  await page.getByLabel('输入“删除账号”确认', { exact: true }).fill('删除账号'); await page.getByRole('button', { name: '永久删除账号', exact: true }).click(); await page.getByRole('button', { name: '账号', exact: true }).waitFor({ state: 'hidden' });
  await page.goto(webBase + '/?auth=sign-in'); await page.getByRole('button', { name: 'Google 登录', exact: true }).click(); await approve(); await openAccount();
  assert.notEqual(String((await fixture.db.collection('account').findOne({ providerId: 'google', accountId: 'new-browser-google' })).userId), deletedId);
  pass('Google-only mobile deletion and fresh registration isolate the previous identity');
  assert.deepEqual(errors, []);
  fs.writeFileSync(out + '/acceptance.json', JSON.stringify({ checks, pageErrors: errors, externalProviderCalls: 0, productionWrites: 0, fixture: 'Real Better Auth/Gateway/Mongo, local HTTP OAuth with signed Google JWT and PKCE, Core deletion source' }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, output: out }));
} catch (error) { if (page) { fs.writeFileSync(out + '/failure-state.txt', await page.locator('body').innerText().catch(() => '')); await page.screenshot({ path: out + '/failure.png', fullPage: true }).catch(() => {}); } throw error; }
finally { await browser?.close(); vite?.kill(); await fixture?.cleanup(); try { docker('rm', '-f', '-v', container); } catch {} }
