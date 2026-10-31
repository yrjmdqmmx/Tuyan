(() => {
  const status=new URLSearchParams(location.search).get('wechat');
  history.replaceState({},'',location.pathname);
  if(['pending','error'].includes(status)){
    document.getElementById('message').textContent=status==='error'?'微信授权未完成，请返回图研重试。':'微信授权已完成，请返回原来的图研页面继续。';
    window.opener?.postMessage({type:'tuyan-wechat-complete',status},location.origin);
  }
  document.getElementById('close').addEventListener('click',()=>window.close());
})();
