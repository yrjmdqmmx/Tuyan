import assert from 'node:assert/strict'
import test from 'node:test'
import { drawingActivityFromJobs, summarizeDrawingDays } from '../../../packages/api/src/drawing-activity.mjs'
import { readDrawingActivity } from '../src/drawing-activity.js'
const image=(candidateId:number,format='png')=>({candidateId,mimeType:format==='svg'?'image/svg+xml':'image/png',filename:`image-${candidateId}.${format}`})
test('counts final candidates once, refinement separately, ignores internal steps, failed candidates and duplicate jobs',async()=>{
 const jobs=[
  {_id:'one',status:'succeeded',completedAt:'2026-10-18T16:02:00Z',resultImages:[image(0),image(1),image(1),image(2,'svg')],stages:[{image:image(8)}]},
  {_id:'refine',jobType:'refine',status:'succeeded',completedAt:'2026-10-19T05:00:00Z',resultImages:[image(0)]},
  {_id:'failed',status:'failed',completedAt:'2026-10-19T05:00:00Z',resultImages:[image(0)]},
  {_id:'partial',status:'failed',completedAt:'2026-10-18T02:00:00Z',resultImages:[image(0),image(1)],candidateProgress:[{candidateId:0,status:'succeeded'},{candidateId:1,status:'failed'}]},
 ];
 const result=await drawingActivityFromJobs([...jobs,jobs[0]],new Date('2026-10-19T12:00:00Z'));
 assert.deepEqual(result.days,[{date:'2026-10-18',count:1},{date:'2026-10-19',count:4}]);assert.equal(result.total,5);assert.equal(result.peak,4);assert.equal(result.longestStreak,2);assert.equal(result.currentStreak,2);
});
test('streaks handle Beijing midnight, gaps, leap day, year boundary and yesterday grace',()=>{
 const days={'2024-02-28':1,'2024-02-29':2,'2024-03-01':1,'2024-12-31':4,'2025-01-01':3};
 const yesterday=summarizeDrawingDays(days,new Date('2025-01-01T16:00:00Z'));assert.equal(yesterday.today,'2025-01-02');assert.equal(yesterday.longestStreak,3);assert.equal(yesterday.currentStreak,2);assert.equal(yesterday.peak,4);
 assert.equal(summarizeDrawingDays(days,new Date('2025-01-02T16:00:00Z')).currentStreak,0);
 assert.equal(summarizeDrawingDays({},new Date('2026-10-19')).total,0);
});
test('missing completion timestamps are disclosed; invalid or future dates are excluded',async()=>{
 const result=await drawingActivityFromJobs([{_id:'legacy',status:'completed',created_at:'2026-10-18T10:00:00Z',result_images:[image(0)]},{_id:'unknown',status:'succeeded',resultImages:[image(0)]},{_id:'future',status:'succeeded',completedAt:'2099-01-01',resultImages:[image(0)]}],new Date('2026-10-19'));
 assert.equal(result.total,1);assert.equal(result.estimatedDateImages,1);assert.equal(result.undatedImages,2);
});
test('repository selects only requested owner, excludes heavy/sensitive fields and closes cursor',async()=>{
 let query:any,options:any,closed=false;
 const collection={find(q:any,o:any){query=q;options=o;return {batchSize(){return this},async close(){closed=true},async *[Symbol.asyncIterator](){yield {_id:'a',status:'succeeded',completedAt:'2026-10-19T02:00:00Z',resultImages:[image(0)]}}}}};
 const result=await readDrawingActivity(collection as any,'A',new Date('2026-10-19T10:00:00Z'));assert.equal(result.total,1);assert.equal(closed,true);
 assert.deepEqual(query,{$or:[{userId:'A'},{userId:{$in:[null,'']},user_id:'A'}]});assert.equal(options.projection['resultImages.url'],undefined);assert.equal(options.projection.stages,undefined);assert.equal(options.maxTimeMS,10000);
});
