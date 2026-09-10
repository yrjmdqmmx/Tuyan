(() => {
  const status = new URLSearchParams(location.search).get('watcha');
  history.replaceState({}, '', location.pathname);
  if (['complete', 'pending', 'error'].includes(status)) {
    document.getElementById('message').textContent = status === 'error' ? '观猹授权未完成，请返回原来的图研页面重试。' : status === 'pending' ? '观猹授权已完成，请返回图研创建或绑定账号。' : '登录已完成，请返回原来的图研页面。';
    // Only a notification. The original page verifies the actual server state.
    window.opener?.postMessage({ type: 'tuyan-watcha-complete', status }, location.origin);
  }
  document.getElementById('close').addEventListener('click', () => window.close());
})();
