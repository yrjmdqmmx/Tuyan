import test from 'node:test';
import assert from 'node:assert/strict';
import {memoryDb} from '../../../test-support/memory-db.mjs';
import {createWorkspaceJobDeletion} from '../src/workspace-task-deletion.js';
const fixture=()=>{
 const db=memoryDb({paperbanana_jobs:[{_id:'remove',userId:'A',status:'succeeded',prompt:'SECRET',keys:['remove/image.png']},{_id:'keep',userId:'A',status:'succeeded',keys:['remove/shared.png']},{_id:'foreign',userId:'B',status:'succeeded'}],paperbanana_provider_steps:[{_id:'remove:step',userId:'A',jobId:'remove',chunks:1}],paperbanana_provider_step_chunks:[{_id:'remove:step:0',userId:'A',data:'SECRET'}],paperbanana_provider_executions:[{_id:'remove',userId:'A',secret:'SECRET'}]});
 let fail=true;const removed:string[]=[];
 const erase=createWorkspaceJobDeletion({db,bucket:()=>({deleteFile:async(key:string)=>{if(fail){fail=false;throw Error('OSS outage');}removed.push(key);}}),listKeys:async(prefix:string)=>prefix==='remove/'?['remove/image.png','remove/shared.png']:[],objectKeys:(j:any)=>j.keys||[],deleteMaterials:async()=>{}});
 return {db,erase,removed};
};
test('failed object cleanup is resumable, preserves shared assets and removes prompts and encrypted recovery bytes',async()=>{
 const {db,erase,removed}=fixture();await assert.rejects(erase('A',['remove']),/OSS outage/);assert.ok(await db.collection('paperbanana_jobs').findOne({_id:'remove'}));
 assert.deepEqual(await erase('A',['remove']),{deleted:true});assert.deepEqual(removed,['remove/image.png']);assert.equal(await db.collection('paperbanana_jobs').findOne({_id:'remove'}),null);
 for(const name of ['paperbanana_provider_steps','paperbanana_provider_step_chunks','paperbanana_provider_executions'])assert.equal(db.collection(name).rows.length,0);
 assert.doesNotMatch(JSON.stringify(db.collection('paperbanana_task_deletions').rows),/SECRET|image.png/);
 await erase('A',['remove']);assert.equal(removed.length,1);
 await erase('A',['keep']);assert.deepEqual(removed,['remove/image.png','remove/shared.png']);
});
test('owner checks and active jobs reject the whole batch before deleting anything',async()=>{
 const {db,erase,removed}=fixture();await assert.rejects(erase('',[]),{status:401});await assert.rejects(erase('A',['remove','foreign']),{status:403});
 await db.collection('paperbanana_jobs').updateOne({_id:'keep'},{$set:{status:'running'}});await assert.rejects(erase('A',['remove','keep']),{status:409});assert.equal(removed.length,0);assert.equal(db.collection('paperbanana_task_deletions').rows.length,0);
});

test('per-job original cleanup erases extracted text and bytes but keeps only upload-settlement identifiers',async()=>{
 const {createMaterialFiles}=await import('../src/material-files.js');
 const file={_id:'material',userId:'A',accountGeneration:'',jobId:'remove',status:'uploaded',objectKey:'original',uploadObjectKey:'upload',putExpiresAt:new Date(),filename:'SECRET.csv',overview:{text:'SECRET ORIGINAL'}};
 const db=memoryDb({paperbanana_material_files:[file],paperbanana_material_reads:[{_id:'read',materialId:'material',objectKey:'reading',text:'SECRET TEXT'}]}),deleted:string[]=[];
 const materials=createMaterialFiles({db,bucket:()=>({deleteFile:async(k:string)=>deleted.push(k)}),ownerPrefix:o=>o.userId,assertOwner:async()=>{}});
 await materials.deleteJob({_id:'remove',userId:'A',materialSourceSnapshotKey:'snapshot'});
 assert.deepEqual(deleted.sort(),['original','reading','snapshot','upload']);assert.doesNotMatch(JSON.stringify(db.collection('paperbanana_material_files').rows),/SECRET/);assert.equal(db.collection('paperbanana_material_reads').rows.length,0);assert.equal(db.collection('paperbanana_material_files').rows[0].cleanupComplete,true);
});
