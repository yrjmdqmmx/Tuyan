import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'

test('R24 staged Mini build refuses oversized compiler output before replacing any source file',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'tuyan-budget-test-'))
 try {
  const app=path.join(root,'apps/miniprogram'),source=path.join(app,'miniprogram')
  fs.mkdirSync(source,{recursive:true});fs.mkdirSync(path.join(app,'node_modules/typescript/bin'),{recursive:true});fs.mkdirSync(path.join(root,'scripts'))
  fs.copyFileSync(new URL('../apps/miniprogram/build.mjs',import.meta.url),path.join(app,'build.mjs'))
  fs.writeFileSync(path.join(source,'original.js'),'original')
  // A controlled compiler emits only into the real build script's temporary stage.
  fs.writeFileSync(path.join(app,'node_modules/typescript/bin/tsc'),`const fs=require('node:fs'),path=require('node:path');const out=process.argv[process.argv.indexOf('--outDir')+1];fs.writeFileSync(path.join(out,'original.js'),'replacement');fs.writeFileSync(path.join(out,'large.js'),'x'.repeat(1572864));`)
  fs.writeFileSync(path.join(root,'scripts/sync-card-display.mjs'),'// Fixture compiler output needs no compaction.\n')
  const result=spawnSync(process.execPath,['build.mjs'],{cwd:app,encoding:'utf8'})
  assert.equal(result.status,1)
  assert.match(result.stderr,/Mini source projection 1572875 exceeds 1572864 bytes; no build output written/)
  assert.deepEqual(fs.readdirSync(source),['original.js'])
  assert.equal(fs.readFileSync(path.join(source,'original.js'),'utf8'),'original')
 }finally{fs.rmSync(root,{recursive:true,force:true})}
})
