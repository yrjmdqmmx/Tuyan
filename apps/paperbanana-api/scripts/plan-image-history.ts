import {readFile,writeFile} from 'node:fs/promises'
import {planHistoricalImages} from '../src/image-library-history.js'
const [directory,output]=process.argv.slice(2)
if(!directory||!output)throw Error('Usage: tsx scripts/plan-image-history.ts snapshot-directory new-plan.json')
const read=async(name:string)=>JSON.parse(await readFile(`${directory}/${name}`,'utf8'))
const plan=planHistoricalImages({core:await read('core-snapshot.json'),auth:await read('auth-snapshot-complete.json'),legacy:await read('legacy-documents.json')})
await writeFile(output,JSON.stringify(plan),{flag:'wx',mode:0o600})
console.log(JSON.stringify({...plan.summary,reviewReasons:plan.review.reduce((out:any,r:any)=>(out[r.reason]=(out[r.reason]||0)+1,out),{}),fingerprint:plan.fingerprint}))
