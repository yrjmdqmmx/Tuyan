import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import StageTimeline from '../src/components/StageTimeline.jsx';
import {elapsedLabel,workspaceProgress} from '../src/workspace/workspaceProgress.js';
import {workspaceImageResolution} from '../src/workspace/workspaceImageSize.js';
afterEach(cleanup);
test('stage records are folded, with readable structured review and raw evidence available',()=>{
 const job={stages:[{title:'成图评审',type:'critic',candidateId:0,round:1,durationMs:65000,text:JSON.stringify({decision:{visual:{status:'issues_found',findings:[{issue:'Missing arrow',location:'right',evidence:'No connector',suggestion:'Add arrow'}]},revised_description:'A complete plan.'},originalRequest:'Raw fixture'})}]};
 const {container}=render(React.createElement(StageTimeline,{job,apiBase:'https://example.test'}));
 const row=container.querySelector('.stage-item');assert.equal(row.open,false);assert.match(row.querySelector('summary').textContent,/1 分 5 秒/);
 fireEvent.click(row.querySelector('summary'));assert.equal(row.open,true);assert.ok(screen.getByText('发现问题'));assert.ok(screen.getByText('Missing arrow'));
 assert.equal(container.querySelector('.stage-raw').open,false);assert.match(container.querySelector('pre').textContent,/Raw fixture/);
});
test('progress reports latest known stage without inventing the current step',()=>{
 assert.equal(elapsedLabel(457000),'7 分 37 秒');
 assert.match(workspaceProgress({stages:[{title:'规划完成'}]}),/最近进展：规划完成/);
 assert.match(workspaceProgress({status:'awaiting_provider'}),/渠道/);
});
test('default resolution uses a model-supported tier without treating omission as native auto',()=>{
 assert.equal(workspaceImageResolution({resolutions:['2K','3K','4K']},''),'2K');
 assert.equal(workspaceImageResolution({resolutions:['2K','1K']},''),'1K');
 assert.equal(workspaceImageResolution({refineResolutions:['1K','2K']},'',true),'2K');
 assert.equal(workspaceImageResolution({resolutions:['auto','2K']},'auto'),'auto');
});
