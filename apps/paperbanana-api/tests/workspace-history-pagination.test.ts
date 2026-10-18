import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import { stripTypeScriptTypes } from 'node:module'
import { memoryDb } from '../../../test-support/memory-db.mjs'

const source = fs.readFileSync(new URL('../runtime/handler.ts', import.meta.url), 'utf8')
function extract(name: string) {
  const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, 'm'))
  assert.ok(start >= 0)
  const rest = source.slice(start)
  const end = rest.slice(1).search(/\n(?:export )?(?:async )?function |\n(?:export )?(?:const|let|type) /)
  return rest.slice(0, end < 0 ? undefined : end + 1)
}
function fixture() {
  const own = Array.from({length:253}, (_,i)=>({_id:`job-${String(i).padStart(3,'0')}`,createdAt:Math.floor(i/3),...(i%2 ? {user_id:'alice'} : {userId:'alice'})}))
  const rows = [...own,{_id:'other-account',userId:'bob',user_id:'alice',createdAt:10000},{_id:'same-email',userId:'bob',userEmail:'alice@example.test',createdAt:10001}]
  const jobs = memoryDb({ jobs: rows }).collection('jobs')
  const context = vm.createContext({jobs,clamp:(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n)),publicJob:async(row:any)=>({id:row._id}),ok:(body:any)=>({code:0,...body}),fail:(error:string,code:number)=>({error,code})})
  vm.runInContext(stripTypeScriptTypes([extract('userJobs'),extract('accountIdQuery')].join('\n')),context)
  return {run:(body:any)=>context.userJobs(body),own}
}

test('account history paginates past 200 with stable ties and no foreign-account records',async()=>{
  const {run,own}=fixture(),ids:string[]=[]
  let offset:number|null=0
  while(offset!==null){const page=await run({userId:'alice',limit:25,offset});assert.equal(page.code,0);assert.ok(page.jobs.length<=25);ids.push(...page.jobs.map((j:any)=>j.id));offset=page.nextOffset}
  assert.equal(ids.length,253);assert.equal(new Set(ids).size,253)
  assert.deepEqual(new Set(ids),new Set(own.map(j=>j._id)))
  assert.equal(ids[0],'job-252')
})
test('legacy callers keep the default first page and the maximum page limit',async()=>{
  const {run}=fixture();const first=await run({userId:'alice'});assert.equal(first.jobs.length,50);assert.equal(first.nextOffset,50)
  const large=await run({userId:'alice',limit:500});assert.equal(large.jobs.length,200);assert.equal(large.nextOffset,200)
})
test('invalid offsets fail rather than silently skipping or repeating account history',async()=>{
  const {run}=fixture();for(const offset of [-1,1.5,100001,'bad'])assert.equal((await run({userId:'alice',offset})).code,400)
  assert.equal((await run({userId:''})).code,400)
})
