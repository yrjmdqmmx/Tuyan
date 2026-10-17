// Read-only local UI server. The model catalogue uses the current Core and live
// public provider APIs and credential-scoped metadata reads. No inference or jobs.
import http from 'node:http'
import fs from 'node:fs/promises'
import {createLiveModelRegistry} from '../lib/live-model-registry.mjs'
import {browseFigureReferences,selectFigureReferences} from '../../packages/figure-taxonomy/src/library.js'
const checkpointFile=process.env.TUYAN_PUBLIC_CATALOG_CHECKPOINT
let publicCheckpoint
if(checkpointFile){try{publicCheckpoint=JSON.parse(await fs.readFile(checkpointFile,'utf8'))}catch{}}
const readModelRegistry = await createLiveModelRegistry({publicCheckpoint})
let save=Promise.resolve()
http.createServer(async(req,res)=>{
 const origin=req.headers.origin
 if(origin && !['http://127.0.0.1:5196','http://localhost:5196'].includes(origin)){res.writeHead(403);res.end();return}
 if(origin)res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Content-Type','application/json')
 if(req.method==='OPTIONS'){res.end();return}
 let data='';for await(const part of req){data+=part;if(data.length>65536){res.writeHead(413);res.end();return}}
 let body={};try{body=JSON.parse(data||'{}')}catch{res.statusCode=400;res.end('{}');return}
 let result={code:0,runtime:'gateway',status:'ok',modelRoutingContractVersion:1,workflowContractVersion:2,figureTaxonomyVersion:'2026-10-10.v1'}
 if(body.action==='modelRegistry') {
  try {
   result={...await readModelRegistry(body.provider,{refresh:body.refreshCatalog===true}),referenceLibraryContractVersion:2}
   if(checkpointFile)save=save.then(async()=>{await fs.writeFile(checkpointFile+'.tmp',JSON.stringify(await readModelRegistry.checkpoint()));await fs.rename(checkpointFile+'.tmp',checkpointFile)}).catch(()=>{})
  }
  catch { result={code:503,error:'模型目录读取失败，请稍后重试。'} }
 }
 else if(body.action==='providerAccountCatalog' && body.mode==='catalog'){try{result=await readModelRegistry.account(body)}catch{result={code:503,error:'目录读取失败'}}}
 else if(body.action==='referenceLibrary') {try{result={code:0,...(body.referenceIds?{references:selectFigureReferences(body.referenceIds)}:browseFigureReferences(body))}}catch(e){result={code:422,error:e.message}}}
 else if(body.action)result={code:400,error:'Read-only local UI fixture: no jobs, model calls or account operations.'}
 res.end(JSON.stringify(result))
}).listen(Number(process.env.TUYAN_CATALOG_PORT || 8793),'127.0.0.1',()=>console.log('Tuyan live model catalogue ready (read only)'))
