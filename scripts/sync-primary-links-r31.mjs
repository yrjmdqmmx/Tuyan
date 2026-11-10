// Offline compilation; raw review and page bodies are never bundled into clients.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import review from '../config/channel-audit/review-r31-20261110.json' with {type:'json'}
import {validatedPrimaryPages} from './lib/primary-links-r31.mjs'
const pages=validatedPrimaryPages(review), file=new URL('../packages/api/src/card-data/primary-pages-r31.json',import.meta.url)
const content=JSON.stringify(pages)+'\n'
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8'),content)
else fs.writeFileSync(file,content)
console.log('R31 validated primary pages:',Object.keys(pages).length)
