import test,{afterEach} from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {render,screen,cleanup,fireEvent} from '@testing-library/react'
import JobTable from '../src/components/JobTable.jsx'
import GuidePanel from '../src/components/GuidePanel.jsx'
import WorkflowOptions,{workflowExplanation} from '../src/components/WorkflowOptions.jsx'
import {loadGenerationPipeline,saveWorkflowSettings} from '../src/lib/workflowSettings.js'

afterEach(()=>{cleanup();window.localStorage.clear()})
test('failed history retains output, download and recovery while preserving failure and review status',()=>{
 let opened=''
 render(React.createElement(JobTable,{apiBase:'https://fixture.test',onOpenTask:id=>opened=id,
  renderRecovery:()=>React.createElement('button',null,'恢复原任务'),jobs:[{id:'partial',status:'failed',error:'Second candidate failed',output_format:'svg',
  result_images:[{filename:'result.svg',url:'https://fixture.test/result.svg',mime_type:'image/svg+xml',candidate_id:0,review:{status:'issues_found',mode:'visual_code',roundsUsed:1,limit:3,note:'本地检查未通过'}}]}]}))
 assert.ok(screen.getByText('失败',{exact:true}))
 assert.ok(screen.getByText(/已完成的候选图仍可查看或下载/))
 assert.ok(screen.getByText(/已检查，仍有问题/));assert.ok(screen.getByText(/本地检查未通过/))
 assert.ok(screen.getByRole('button',{name:'下载结果图 1'}));assert.ok(screen.getByRole('button',{name:'下载全部'}))
 assert.ok(screen.getByRole('button',{name:'恢复原任务'}))
 fireEvent.click(screen.getByRole('button',{name:'查看任务详情'}));assert.equal(opened,'partial')
 cleanup()
 render(React.createElement(JobTable,{jobs:[{id:'empty',status:'failed',error:'No completed candidates',result_images:[]}]}))
 assert.equal(screen.queryByRole('button',{name:'下载全部'}),null)
 assert.equal(screen.queryByText(/已完成的候选图仍可查看或下载/),null)
})
test('new generation offers two reachable modes with bounded review rounds and independent material retrieval',()=>{
 let mode=''
 render(React.createElement(WorkflowOptions,{value:'planner_critic',onChange:value=>mode=value,body:{generationPath:'model-v1',outputFormat:'svg',maxCriticRounds:3,visionMode:'none'}}))
 assert.equal(screen.getAllByRole('radio').length,2)
 fireEvent.click(screen.getByRole('radio',{name:/完整生成/}));assert.equal(mode,'full')
 const help=workflowExplanation('full',{generationPath:'model-v1',outputFormat:'svg',maxCriticRounds:3,visionMode:'none'}).join(' ')
 assert.match(help,/风格/);assert.match(help,/最多评审 3 次/);assert.match(help,/每轮必要时修改一次/);assert.match(help,/不追加最终复审/);assert.match(help,/本地/)
 cleanup();render(React.createElement(GuidePanel))
 assert.ok(screen.getByRole('heading',{name:'两种生成流程'}))
 assert.ok(screen.getByText(/上传文件与图库检索独立/))
 assert.ok(screen.getByText(/最多评审 R 次/))
 assert.ok(screen.getByText(/精修评审会逐项核对遮罩/));assert.ok(screen.getByText(/分批观察，可能增加调用/));assert.ok(screen.getByText(/会在绘图前停止/))
 assert.equal(screen.queryByRole('heading',{name:'基础生成'}),null)
 assert.equal(screen.queryByText(/移除这次任务的读图步骤|上传后会自动关闭/),null)
})
test('workflow persistence normalizes legacy aliases without storing credentials or disabling review',()=>{
 const storage=window.localStorage
 assert.equal(loadGenerationPipeline(storage),'full')
 storage.setItem('tuyan.workflow-settings.v1',JSON.stringify({version:1,pipelineMode:'demo_full'}))
 assert.equal(loadGenerationPipeline(storage),'full')
 saveWorkflowSettings({numCandidates:2,maxCriticRounds:3,visionMode:'none',apiKey:'never-store'},storage)
 assert.equal(loadGenerationPipeline(storage),'full');assert.doesNotMatch(storage.getItem('tuyan.workflow-settings.v1'),/never-store/)
 saveWorkflowSettings({numCandidates:1,maxCriticRounds:1,pipelineMode:'vanilla'},storage)
 assert.equal(loadGenerationPipeline(storage),'full')
})
