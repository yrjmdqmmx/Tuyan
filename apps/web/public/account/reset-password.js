const params = new URLSearchParams(location.search);
const token = params.get('token');
const initialError = params.get('error');
const formState = document.getElementById('form-state');
const invalidState = document.getElementById('invalid-state');
const successState = document.getElementById('success-state');
const message = document.getElementById('message');

if (!token || initialError) showInvalid(initialError || 'INVALID_TOKEN');

document.getElementById('reset-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = document.getElementById('password').value;
  const confirmation = document.getElementById('confirmation').value;
  if (password.length < 8) return showMessage('密码至少 8 位。');
  if (password.length > 128) return showMessage('密码过长，请使用更短的密码。');
  if (password !== confirmation) return showMessage('两次输入的密码不一致。');
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  try {
    const response = await fetch('https://api.paperbanana.asia/api/auth/reset-password', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: password }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = body.code || body.error || '';
      if (/TOKEN_EXPIRED|INVALID_TOKEN|TOKEN_USED/i.test(code)) return showInvalid(code);
      throw new Error(response.status === 429 ? '请求过于频繁，请稍后再试。' : '重置失败，请稍后重试。');
    }
    formState.classList.add('hidden');
    successState.classList.remove('hidden');
  } catch (error) {
    showMessage(error.message || '重置失败，请稍后重试。');
  } finally {
    button.disabled = false;
  }
});

function showInvalid() { formState.classList.add('hidden'); invalidState.classList.remove('hidden'); }
function showMessage(text) { message.textContent = text; message.className = 'status error'; }
