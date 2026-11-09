import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath}from'node:url'
import {cssRules,specificity,winner}from'../../../test-support/css-cascade-r24.mjs'
const src=fileURLToPath(new URL('../src/',import.meta.url))
// Global styles load from main; the lazy WorkspaceRoot imports workspace.css
// later. Expand styles.css imports in place, then follow WorkspaceRoot's CSS
// imports in their actual order (including workspace.css's anchor reset).
const base=cssRules(path.join(src,'styles.css'))
const workspace=fs.readFileSync(path.join(src,'workspace/WorkspaceRoot.jsx'),'utf8')
const later=[...workspace.matchAll(/import\s+['"]([^'"]+\.css)['"]/g)].flatMap(([,file])=>cssRules(path.resolve(src,'workspace',file)))
const host=document.createElement('div')
host.innerHTML='<div class="tw-shell"><div class="model-card-specifications"><div class="model-spec-sources"><a href="#">Source</a></div></div></div><div class="tw-dialog model-evidence-dialog"><a class="model-evidence-source" href="#">Source</a></div>'
const [footer,dialog]=host.querySelectorAll('a')
test('R24 I3 selector oracle resolves equal specificity by source order',()=>{
 assert.deepEqual(specificity('.tw-shell a'),[0,1,1])
 assert.deepEqual(specificity('.tw-dialog.model-evidence-dialog a.model-evidence-source:focus-visible'),[0,4,1])
 const reset=later.filter(r=>r.selector==='.tw-dialog a')
 assert.equal(reset.length,1)
 const weak={...reset[0],selector:'.model-evidence-dialog a',decls:[{prop:'color',value:'var(--accent, #267f68)'}]}
 assert.equal(winner([weak,...reset],dialog,'color').value,'inherit')
 assert.equal(winner([...reset,weak],dialog,'color').value,'var(--accent, #267f68)')
})
test('R24 I3 actual shipped CSS keeps dialog and card links accented regardless of workspace load order',()=>{
 assert.ok(base.some(r=>r.file.endsWith('/components/ModelSpecifications.css')))
 assert.ok(later.some(r=>r.file.endsWith('/workspace/workspace.css')&&r.selector==='.tw-shell a'))
 for(const rules of [[...base,...later],[...later,...base]])for(const state of ['','hover','focus-visible']) {
  for(const anchor of [footer,dialog]) {
   const color=winner(rules,anchor,'color',state)
   assert.equal(color.value,'var(--accent, #267f68)');assert.equal(color.important,false)
   assert.ok(color.specificity[1]>1)
   if(state==='focus-visible')assert.equal(winner(rules,anchor,'outline',state).value,'2px solid var(--accent, #267f68)')
  }
  assert.equal(winner(rules,dialog,'text-decoration',state).value,'underline')
  if(state==='hover')assert.equal(winner(rules,footer,'text-decoration',state).value,'underline')
  assert.equal(winner(rules,dialog,'overflow-wrap',state).value,'anywhere')
 }
})
