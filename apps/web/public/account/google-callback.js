(() => {
  const status=new URLSearchParams(location.search).get('google');
  history.replaceState({},'',location.pathname);
  if(['pending','error'].includes(status)){
    document.getElementById('message').textContent=status==='error'?'Google 授权未完成，请返回图研重试。':'Google 授权已完成，请返回原来的图研页面继续。';
    window.opener?.postMessage({type:'tuyan-google-complete',status},location.origin);
  }
  document.getElementById('close').addEventListener('click',()=>window.close());
})();
