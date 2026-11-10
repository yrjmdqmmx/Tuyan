import fs from 'node:fs'
import assert from 'node:assert/strict'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
const bytes=fs.readFileSync(new URL('./fixtures/pm-decisions-r31.json.gz',import.meta.url))
assert.equal(createHash('sha256').update(bytes).digest('hex'),'d1a03a2d597a7b4dfcb215b2823b2e18b6cda063f8634d24517c69652067a765')
export const r31Patches=JSON.parse(gunzipSync(bytes))
assert.equal(r31Patches.head,'702175ea')
const get=(row,path)=>path.split('/').reduce((r,k)=>r?.[k],row)
function reverse(row,patches){const copy=structuredClone(row);for(const patch of patches||[]){assert.deepEqual(get(copy,patch.path),patch.after,patch.path+' R31 reviewed presentation drift');const keys=patch.path.split('/'),last=keys.pop(),parent=keys.reduce((r,k)=>r[k],copy);if(Object.hasOwn(patch,'before'))parent[last]=structuredClone(patch.before);else delete parent[last]}return copy}
export function restoreI13(rows){return Object.fromEntries(Object.entries(rows).map(([key,row])=>[key,reverse(row,r31Patches.rows[key])]))}
const sourcePatch=(key,client)=>r31Patches.rows[key]?.find(p=>p.path===(client==='web'?'web/sources':'mini/card/specSources'))
export function restoreI13Sources(rows,key,client){const patch=sourcePatch(key,client);if(!patch)return rows;assert.deepEqual(rows,patch.after,key+' '+client+' R31 source drift');return structuredClone(patch.before)}
export function currentI13Sources(rows,key,client){const patch=sourcePatch(key,client);if(!patch)return rows;assert.deepEqual(rows,patch.before,key+' '+client+' R31 source baseline');return structuredClone(patch.after)}
export function restoreI13Review(review){return Object.fromEntries(Object.entries(review).map(([client,rows])=>[client,rows.map(row=>reverse(row,r31Patches.sources[client+'/'+row.card]))]))}
export const primaryI13=key=>sourcePatch(key,'web')?.after?.[0]
