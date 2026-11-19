const test=require('node:test'),assert=require('node:assert/strict'),{createRequire}=require('node:module')
const {JSDOM}=createRequire(require.resolve('../../web/package.json'))('jsdom')
test('R24 I3 Mini copy button and hint retain accent with global WXSS in either order',async()=>{
 const {cssRules,winner}=await import('../../../test-support/css-cascade-r24.mjs')
 const global=cssRules(require.resolve('../miniprogram/app.wxss')),local=cssRules(require.resolve('../miniprogram/components/model-picker/model-picker.wxss'))
 const dom=new JSDOM('<view class="model-panel"><button class="model-copy model-source-link">Source<text class="source-copy-hint"> · 复制链接</text></button></view>')
 const button=dom.window.document.querySelector('button'),hint=dom.window.document.querySelector('text')
 for(const rules of [[...global,...local],[...local,...global]]) {
  assert.equal(winner(rules,button,'color').value,'#28634f')
  const hintColor=winner(rules,hint,'color')?.value
  assert.ok(!hintColor||['inherit','currentColor','#28634f'].includes(hintColor),hintColor)
  assert.equal(winner(rules,button,'white-space').value,'normal')
 }
 dom.window.close()
})
