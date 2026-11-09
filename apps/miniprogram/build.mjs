// Compile outside the source package, compact, then preflight the complete size.
// Never write an oversized intermediate tsc output into the native package.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
const root=fileURLToPath(new URL('./',import.meta.url)), source=path.join(root,'miniprogram')
const stage=fs.mkdtempSync(path.join(os.tmpdir(),'tuyan-mini-build-'))
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)])
try {
  execFileSync(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'--outDir',stage],{cwd:root,stdio:'inherit'})
  execFileSync(process.execPath,['../../scripts/sync-card-display.mjs','--mini-picker','--mini-output',stage],{cwd:root,stdio:'inherit'})
  const outputs=new Map(files(stage).map(file=>[path.join(source,path.relative(stage,file)),fs.readFileSync(file)]))
  const all=new Set([...files(source),...outputs.keys()])
  const bytes=[...all].reduce((n,file)=>n+(outputs.get(file)?.length??fs.statSync(file).size),0)
  if(bytes>1572864) throw Error(`Mini source projection ${bytes} exceeds 1572864 bytes; no build output written`)
  // Shrinking outputs first keeps every intermediate state within the ceiling.
  for(const [file,data] of [...outputs].sort(([a,x],[b,y])=>(x.length-(fs.existsSync(a)?fs.statSync(a).size:0))-(y.length-(fs.existsSync(b)?fs.statSync(b).size:0)))) fs.writeFileSync(file,data)
  console.log(`Mini source: ${bytes} / 1572864 bytes`)
} finally {fs.rmSync(stage,{recursive:true,force:true})}
