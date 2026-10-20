import {readFile,writeFile,realpath} from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {planImageLibraryMigration,inspectLegacyWorkspaceImage} from '../src/image-library-migration.js'
import {imageContentId} from '../src/image-library.js'

// Offline, read-only inventory of an explicitly exported snapshot and object
// directory. No environment credentials, network, uploads or deletion support.
const [snapshotPath,objectDirectory,reportPath]=process.argv.slice(2)
if(!snapshotPath||!objectDirectory||!reportPath)throw Error('Usage: tsx scripts/inventory-image-library.ts snapshot.json object-directory new-report.json')
const snapshot=JSON.parse(await readFile(snapshotPath,'utf8'))
const root=await realpath(objectDirectory)
const rows=snapshot.workspaceResults||[]
const jobs=snapshot.jobs||[]
const report=await planImageLibraryMigration({jobs,results:rows,inspect:async(source:any)=>{
  if(source.kind==='workspace')return inspectLegacyWorkspaceImage(rows.find((r:any)=>r.userId===source.userId&&r.resultId===source.resultId))
  if(typeof source.objectKey!=='string'||!source.objectKey||path.isAbsolute(source.objectKey))throw Error('UNSAFE_OBJECT_PATH')
  const sourceJob=jobs.find((j:any)=>String(j._id)===source.objectKey.split('/')[0])
  if(!sourceJob||(sourceJob.userId||sourceJob.user_id)!==source.userId)throw Error('UNVERIFIED_OBJECT_OWNER')
  const file=await realpath(path.resolve(root,source.objectKey))
  if(!file.startsWith(root+path.sep))throw Error('OBJECT_OUTSIDE_INVENTORY')
  const bytes=await readFile(file)
  return {size:bytes.length,id:imageContentId(source.format,bytes),sha256:createHash('sha256').update(bytes).digest('hex')}
}})
await writeFile(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600})
console.log(JSON.stringify({readOnly:true,readyFiles:report.ready.length,reviewRecords:report.review.length,overCapacityAccounts:report.overCapacity.length,canApply:report.canApply}))
