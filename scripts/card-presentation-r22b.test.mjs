import { execFileSync } from 'node:child_process'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { packModelCatalog } from './lib/pack-model-catalog.mjs'
import { sourceIdentity, uniqueSources, sourceTitle } from '../packages/api/src/card-presentation.mjs'
const {unpackModelCatalog}=createRequire(import.meta.url)('../apps/miniprogram/miniprogram/utils/unpack-model-catalog.js')
test('R22B source identity removes tracking, fragments and trailing slashes without merging meaningful queries',()=>{
 assert.deepEqual(uniqueSources(['https://example.com/m/','https://example.com/m#i','https://example.com/m?utm_source=docs','https://example.com/m?model=a']),['https://example.com/m/','https://example.com/m?model=a'])
 assert.equal(sourceIdentity('https://example.com/m?b=2&a=1'),sourceIdentity('https://example.com/m?a=1&b=2'))
 assert.equal(sourceTitle('https://api-docs.deepseek.com/news/news250325/'),'V3-0324 Release | DeepSeek API Docs')
})
test('R22B compact delta tags roundtrip literal prefixes and independently owned nested records',()=>{
 const value=Array.from({length:40},(_,i)=>({names:['^literal','~literal','^'],values:[1,2,3,4,5,6,7,8,i]}))
 const packed=packModelCatalog(value), decoded=unpackModelCatalog(packed)
 assert.ok(packed.nodes.some(node=>typeof node==='string'&&node.startsWith('^')))
 assert.deepEqual(decoded,value)
 const legacy={root:0,nodes:[[5,'1:0:3'],[1,2],'old','new']}
 assert.deepEqual(unpackModelCatalog(legacy),['new'])
 decoded[0].names.push('change');assert.equal(decoded[1].names.length,3)
})

test('R22B generated package data and compiled Mini helper match hashed rendered evidence',()=>{
 for(const script of ['capture-tokendance-pages','sync-card-display']) execFileSync(process.execPath,['scripts/'+script+'.mjs','--check'],{cwd:new URL('../',import.meta.url),stdio:'pipe'})
})
