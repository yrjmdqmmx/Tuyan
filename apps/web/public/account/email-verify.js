// Loading this page must never consume a verification token. Mail clients can
// load HTML and execute JavaScript while previewing or checking a link.
export function mountEmailConfirmation({ document, location, history, fetch, timeout = () => AbortSignal.timeout(15000) }) {
  let token = new URLSearchParams(location.hash.slice(1)).get('token');
  history.replaceState(null, '', location.pathname);
  const valid = typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
  document.getElementById('confirm-state').classList.toggle('hidden', !valid);
  document.getElementById('invalid-state').classList.toggle('hidden', valid);
  const form = document.getElementById('verify-form');
  const button = form.querySelector('button');
  const message = document.getElementById('message');
  let pending = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!valid || !token || pending) return;
    pending = true;
    button.disabled = true;
    button.textContent = '正在验证…';
    message.textContent = '';
    try {
      const response = await fetch('https://api.paperbanana.asia/api/auth/verify-email', {
        method: 'POST', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), signal: timeout(),
      });
      const body = await response.json().catch(() => ({}));
      const completed = response.ok && body.ok === true && ['EMAIL_VERIFIED', 'TOKEN_USED'].includes(body.code);
      const invalid = response.status === 400 && ['INVALID_TOKEN', 'TOKEN_EXPIRED'].includes(body.code);
      if (!completed && !invalid) throw new Error('verification unavailable');
      token = null;
      const target = new URL('./email-verified.html', location.href);
      if (body.code !== 'EMAIL_VERIFIED') target.searchParams.set('error', body.code);
      location.replace(target.toString());
    } catch {
      message.textContent = '暂时无法确认验证结果，请点击按钮重试。如果已完成验证，也可直接返回图研登录。';
      message.className = 'status error';
    } finally {
      pending = false;
      button.disabled = false;
      button.textContent = '确认验证邮箱';
    }
  });
}

if (typeof document !== 'undefined' && document.getElementById('verify-form')) {
  mountEmailConfirmation({ document, location, history, fetch: (...args) => fetch(...args) });
}
