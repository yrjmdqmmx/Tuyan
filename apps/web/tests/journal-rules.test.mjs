import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React,{useState} from 'react';
import {cleanup,render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import JournalRulePicker from '../src/components/JournalRulePicker.jsx';
import JournalExportPanel from '../src/components/JournalExportPanel.jsx';
import {defaultJournalSelection,journalSnapshot,loadJournalSelection,saveJournalSelection,JOURNAL_SETTINGS_KEY,JOURNAL_VERSION} from '../../../packages/api/src/journal-rules.js';
import {createJobRequest,refineImageRequest,getJobRequest} from '../../../packages/api/src/jobs.js';
afterEach(()=>{cleanup();window.localStorage.clear();});
function openShelf(){fireEvent.click(document.querySelector('.journal-entry'));}
function browse(name){const back=screen.queryAllByRole('button',{name:'返回书架'})[0];if(back)fireEvent.click(back);fireEvent.click(within(screen.getByRole('navigation',{name:'期刊列表'})).getByRole('button',{name:new RegExp(name)}));}
function updateRules(){fireEvent.click(screen.getByRole('button',{name:`采用当前规则 ${JOURNAL_VERSION}`}));}
function tapJournal(name){if(!screen.queryByRole('dialog')){openShelf();return;}const back=screen.queryAllByRole('button',{name:'返回书架'})[0];if(back)fireEvent.click(back);fireEvent.click(within(screen.getByRole('navigation',{name:'期刊列表'})).getByRole('button',{name}));}
function Picker(){const [value,setValue]=useState(null);return React.createElement(JournalRulePicker,{value,onChange:setValue,figureTypeId:'workflow'});}
test('new journal reuses the existing chart category; special content is explicit and cancellation is isolated',()=>{
 let saved=null;const view=render(React.createElement(JournalRulePicker,{value:null,onChange:v=>{saved=v},figureTypeId:'bar'}));
 tapJournal(/不指定期刊/);tapJournal(/PLOS ONE/);
 assert.ok(screen.getByText(/沿用信息图类别：柱形图/));assert.ok(screen.queryByLabelText('内容类型')===null,'Expected no matching DOM element');
 fireEvent.click(screen.getByRole('button',{name:'选择此期刊'}));
 assert.equal(saved.contentType,'data');assert.equal(saved.contentSource,'figure-type');assert.equal(saved.figureTypeId,'bar');
 view.rerender(React.createElement(JournalRulePicker,{value:saved,onChange:v=>{saved=v},figureTypeId:'bar'}));
 tapJournal(/PLOS ONE/);browse('PLOS ONE');
 fireEvent.change(screen.getByLabelText('图像性质'),{target:{value:'primary'}});
 assert.ok(screen.getByText(/当前生成\/精修会改写图像/));
 tapJournal(/Frontiers in Artificial Intelligence/);
 assert.equal(screen.getByLabelText('图像性质').value,'primary','Journal switching must preserve the declaration');
 fireEvent.click(screen.getByRole('button',{name:'取消'}));assert.equal(saved.contentType,'data');
 tapJournal(/PLOS ONE/);browse('PLOS ONE');fireEvent.change(screen.getByLabelText('图像性质'),{target:{value:'primary'}});fireEvent.click(screen.getByRole('button',{name:'选择此期刊'}));
 assert.equal(saved.contentType,'primary');assert.equal(saved.contentSource,undefined);
});
test('picker search, cancel, confirm and Escape preserve selection transactionally',async()=>{
 render(React.createElement(Picker));tapJournal(/不指定期刊/);
 fireEvent.change(screen.getByRole('searchbox',{name:'搜索期刊'}),{target:{value:'PLOS'}});
 assert.ok(within(screen.getByRole('navigation',{name:'期刊列表'})).queryByRole('button',{name:/ACS Omega/})===null,'Expected no matching DOM element');
 tapJournal(/PLOS ONE/);fireEvent.click(screen.getByRole('button',{name:'取消'}));
 assert.ok(screen.getByRole('button',{name:/不指定期刊/}));
 tapJournal(/不指定期刊/);tapJournal(/PLOS ONE/);browse('PLOS ONE');
 fireEvent.change(screen.getByLabelText('投稿阶段'),{target:{value:'production'}});fireEvent.click(screen.getByRole('button',{name:'选择此期刊'}));
 assert.ok(screen.getByRole('button',{name:/PLOS ONE.*录用后/}));
 tapJournal(/PLOS ONE/);tapJournal(/Frontiers in/);fireEvent.keyDown(window,{key:'Escape'});
 assert.ok(screen.queryByRole('dialog')===null,'Expected no matching DOM element');assert.ok(screen.getByRole('button',{name:/PLOS ONE/}));
});
test('pending scopes, unknown versions, invalid width and no journal remain explicit',()=>{
 render(React.createElement(JournalRulePicker,{value:{...defaultJournalSelection('plos-one'),version:'unknown'},onChange:()=>{}}));
 tapJournal(/PLOS ONE/);assert.match(screen.getByRole('alert').textContent,/保留原选择/);assert.ok(screen.queryByRole('button',{name:'选择此期刊'})===null,'Expected no matching DOM element');
 tapJournal(/Cell Reports/);assert.match(screen.getAllByRole('status').find(e=>e.textContent.includes('说明图生成式精修')).textContent,/有条件.*忠实改绘.*适用解释/);
 tapJournal(/ACS Omega/);fireEvent.change(screen.getByLabelText('图件用途'),{target:{value:'toc'}});assert.ok(screen.getAllByRole('status').some(e=>e.textContent.includes('AI 生成图不应用于 TOC')));
 fireEvent.change(screen.getByLabelText('最终排版宽度（mm）'),{target:{value:''}});assert.ok(screen.getByRole('button',{name:'选择此期刊'}).disabled);
 fireEvent.change(screen.getByLabelText('最终排版宽度（mm）'),{target:{value:'83'}});assert.equal(screen.getByRole('button',{name:'选择此期刊'}).disabled,false);
 tapJournal(/不指定期刊/);assert.ok(screen.queryByRole('dialog')===null,'Expected no matching DOM element');
});
test('browser settings preserve unknown historical versions instead of upgrading them',()=>{
 const old={...defaultJournalSelection('plos-one'),version:'historical-v0'};
 assert.equal(saveJournalSelection(window.localStorage,old),true);assert.deepEqual(loadJournalSelection(window.localStorage),old);
 assert.equal(saveJournalSelection({setItem(){throw Error('quota');}},old),false);
 window.localStorage.setItem(JOURNAL_SETTINGS_KEY,'corrupt');assert.equal(loadJournalSelection(window.localStorage),null);
});
test('create/refine request and normalized history preserve rules and checked files',async()=>{
 const before=globalThis.fetch,requests=[],selection=defaultJournalSelection('frontiers-ai');
 globalThis.fetch=async(_,init)=>{requests.push(JSON.parse(init.body));return Response.json({code:0,jobId:'journal-job',status:'queued'});};
 try{await createJobRequest('https://fixture.invalid',{backendMode:'gateway'},{journalSelection:selection});await refineImageRequest('https://fixture.invalid',{backendMode:'gateway'},{journalSelection:selection,sourceTaskId:'owned-task',sourceContentType:'schematic'});}finally{globalThis.fetch=before;}
 assert.deepEqual(requests.map(r=>r.journalSelection),[selection,selection]);
 assert.equal(requests[1].sourceTaskId,'owned-task');assert.equal(requests[1].sourceContentType,'schematic');
 const snapshot=journalSnapshot(selection);
 let job;globalThis.fetch=async()=>Response.json({code:0,job:{_id:'job',journalSelection:selection,journalProfile:snapshot,resultImages:[{candidateId:0,journalCheck:{checks:[],sourceSha256:'abc'}}]}});
 try{job=await getJobRequest('https://fixture.invalid',{backendMode:'gateway'},'job');}finally{globalThis.fetch=before;}
 assert.deepEqual(job.journalProfile,snapshot);assert.deepEqual(job.journalSelection,selection);assert.equal(job.result_images[0].journalCheck.sourceSha256,'abc');
 globalThis.fetch=async()=>Response.json({code:0,job:{id:'refine',journalSelection:null,journalProfile:null,generationContext:{journalSelection:selection,journalProfile:snapshot,sourceContentType:'data'},sourceTaskId:'owned-task'}});
 try{job=await getJobRequest('https://fixture.invalid',{backendMode:'gateway'},'refine');}finally{globalThis.fetch=before;}
 assert.equal(job.journalSelection,null);assert.equal(job.journalProfile,null);assert.equal(job.sourceContentType,'data');assert.equal(job.sourceTaskId,'owned-task');
});
test('export errors never offer an uninspected fallback download',async()=>{
 const before=globalThis.fetch;globalThis.fetch=async()=>Response.json({code:400,error:'File unavailable'},{status:400});
 try {render(React.createElement(JournalExportPanel,{jobId:'j',snapshot:journalSnapshot(defaultJournalSelection('frontiers-ai')),candidateId:0,apiBase:'https://fixture.invalid'}));fireEvent.click(screen.getByRole('button',{name:'检查并导出候选图 1'}));await waitFor(()=>assert.ok(screen.getByRole('alert')));assert.ok(screen.queryByRole('button',{name:/下载已检查文件/})===null,'Expected no matching DOM element');}finally{globalThis.fetch=before;}
});

test('v1 task reopens with its original rules; selecting current journal and cancelling leaves the task intact',()=>{
 const original={...defaultJournalSelection('scientific-reports'),version:'2026-10-13.v1'};
 let saved=original;
 render(React.createElement(JournalRulePicker,{value:original,onChange:v=>{saved=v},figureTypeId:'workflow'}));
 tapJournal(/Scientific Reports/);browse('Scientific Reports');
 assert.ok(within(screen.getByRole('dialog')).getByText(/部分技术规则已核验/));
 if(!screen.queryByRole('region',{name:'Scientific Reports 详情'}))browse('Scientific Reports');updateRules();
 assert.ok(screen.getByText(/正文图与补充图的 AI 生成、生成式精修按可核验来源等具体条件判断/));
 fireEvent.change(screen.getByLabelText('图件用途'),{target:{value:'graphical_abstract'}});
 assert.ok(screen.getAllByRole('status').some(e=>e.textContent.includes('不接受图形摘要')));
 fireEvent.click(screen.getByRole('button',{name:'取消'}));assert.deepEqual(saved,original);
 tapJournal(/Scientific Reports/);
 if(!screen.queryByRole('region',{name:'Scientific Reports 详情'}))browse('Scientific Reports');updateRules();
 fireEvent.click(screen.getByRole('button',{name:'选择此期刊'}));assert.equal(saved.version,JOURNAL_VERSION);assert.equal(saved.purpose,'main');
});

test('unknown and conditional operation policies show evidence without claiming a task is compliant',()=>{
 render(React.createElement(Picker));tapJournal(/不指定期刊/);
 for(const name of ['IEEE Access','Cell Reports','Scientific Reports']){
  browse(name);
  const notices=screen.getAllByRole('status').map(e=>e.textContent);
  assert.ok(notices.some(t=>t.includes(name==='Scientific Reports'?'AI 生成正文/补充图':name==='Cell Reports'?'说明性示意图可使用生成式 AI':'AI 生成新图')));
  assert.ok(notices.some(t=>t.includes('生成式精修')));
  assert.ok(notices.every(t=>!t.includes('当前不可执行')));
  assert.equal(screen.getByRole('button',{name:'选择此期刊'}).disabled,false);
 }
 assert.ok(screen.getByText(/不是官方发布的取代声明/));
 assert.ok(screen.getAllByRole('status').some(e=>e.textContent.includes('工作台不能自动证明这些条件已满足')));
 fireEvent.change(screen.getByLabelText('图件用途'),{target:{value:'graphical_abstract'}});
 assert.ok(screen.getAllByRole('status').some(e=>e.textContent.includes('当前不可执行：Scientific Reports 明确不接受图形摘要')));
});

test('source publication, revision and verification dates stay distinct for historical Cell Reports guidance',()=>{
 render(React.createElement(JournalRulePicker,{value:{...defaultJournalSelection('cell-reports'),version:'2026-10-14.v7'},onChange:()=>{},figureTypeId:'workflow'}));
 tapJournal(/Cell Reports/);browse('Cell Reports');
 fireEvent.change(screen.getByLabelText('投稿阶段'),{target:{value:'production'}});
 fireEvent.change(screen.getByLabelText('图件用途'),{target:{value:'graphical_abstract'}});
 const dialog=within(screen.getByRole('dialog'));
 assert.ok(dialog.getByText(/发布 2018-04-04 · 来源更新 2018-09-10 · 核验 2026-10-13/));
 assert.ok(dialog.getByText(/1200 × 1200 px/));
 fireEvent.change(screen.getByLabelText('图件用途'),{target:{value:'main'}});
 assert.ok(dialog.queryByText(/1200 × 1200 px/)===null,'Expected no matching DOM element');
});

test('humanities search and new Chinese journals preserve confirmation, settings and historical selection',()=>{
 const original={...defaultJournalSelection('cell-reports'),version:'2026-10-13.v4'};
 let saved=original;
 const view=render(React.createElement(JournalRulePicker,{value:original,onChange:v=>{saved=v},figureTypeId:'bar'}));
 tapJournal(/Cell Reports/);
 fireEvent.change(screen.getByRole('searchbox',{name:'搜索期刊'}),{target:{value:'人文社科'}});
 const list=within(screen.getByRole('navigation',{name:'期刊列表'}));
 for(const name of ['经济学家','财经论丛','山西财经大学学报','中国社会科学'])assert.ok(list.getByRole('button',{name:new RegExp(name)}));
 assert.ok(Boolean(list.queryByRole('button',{name:/PLOS ONE/})),'Cross-disciplinary PLOS ONE also matches its humanities tag');
 fireEvent.change(screen.getByRole('combobox',{name:'学科筛选'}),{target:{value:'经济与管理'}});
 assert.ok(list.queryByRole('button',{name:/PLOS ONE/})===null,'Primary category filtering excludes journals from other shelves');
 fireEvent.click(list.getByRole('button',{name:/山西财经大学学报/}));
 assert.ok(screen.getByText(/正文图表采用黑白格式/));
 assert.ok(screen.getAllByRole('status').some(e=>e.textContent.includes('未查到不等于禁止')));
 fireEvent.click(screen.getByRole('button',{name:'取消'}));assert.deepEqual(saved,original);
 tapJournal(/Cell Reports/);
 fireEvent.change(screen.getByRole('searchbox',{name:'搜索期刊'}),{target:{value:'财经论丛'}});
 tapJournal(/财经论丛/);
 fireEvent.click(screen.getByRole('button',{name:'选择此期刊'}));
 assert.equal(saved.journalId,'caijing-luncong');assert.equal(saved.version,JOURNAL_VERSION);
 assert.equal(saveJournalSelection(window.localStorage,saved),true);assert.deepEqual(loadJournalSelection(window.localStorage),saved);
 view.rerender(React.createElement(JournalRulePicker,{value:saved,onChange:v=>{saved=v},figureTypeId:'bar'}));
 assert.ok(screen.getByRole('button',{name:/财经论丛/}));
});

test('Sage Open and HSSC expose scoped rules and preserve line-art settings across confirmation and cancellation',()=>{
 let saved={...defaultJournalSelection('cell-reports'),version:'2026-10-13.v5'};
 const original=structuredClone(saved);
 const props=()=>({value:saved,onChange:v=>{saved=v;saveJournalSelection(window.localStorage,v)},figureTypeId:'workflow'});
 const view=render(React.createElement(JournalRulePicker,props()));
 tapJournal(/Cell Reports/);
 fireEvent.change(screen.getByRole('searchbox',{name:'搜索期刊'}),{target:{value:'人文社科'}});
 const list=within(screen.getByRole('navigation',{name:'期刊列表'}));
 assert.ok(list.getByRole('button',{name:/Sage Open/}));
 assert.ok(list.getByRole('button',{name:/Humanities and Social Sciences Communications/}));
 fireEvent.click(list.getByRole('button',{name:/Sage Open/}));
 fireEvent.change(screen.getByLabelText('图像构成'),{target:{value:'lineart'}});
 assert.ok(screen.getAllByText(/800 dpi/).length);
 assert.ok(screen.getAllByRole('status').some(e=>e.textContent.includes('未逐项授予局部重绘')));
 fireEvent.click(screen.getByRole('button',{name:'取消'}));
 assert.deepEqual(saved,original);
 tapJournal(/Cell Reports/);
 tapJournal(/Sage Open/);
 fireEvent.change(screen.getByLabelText('图像构成'),{target:{value:'lineart'}});
 fireEvent.click(screen.getByRole('button',{name:'选择此期刊'}));
 assert.equal(saved.journalId,'sage-open');assert.equal(saved.rasterKind,'lineart');assert.equal(saved.version,JOURNAL_VERSION);
 assert.deepEqual(loadJournalSelection(window.localStorage),saved);
 view.rerender(React.createElement(JournalRulePicker,props()));
 tapJournal(/Sage Open/);browse('Sage Open');
 assert.equal(screen.getByLabelText('图像构成').value,'lineart');
 fireEvent.change(screen.getByLabelText('图件用途'),{target:{value:'supplementary'}});
 assert.ok(screen.queryByLabelText('图像构成')===null,'Do not solicit an inapplicable line-art classification');
 tapJournal(/Humanities and Social Sciences Communications/);
 assert.ok(screen.queryByLabelText('图像构成')===null,'Expected no matching DOM element');
 assert.ok(screen.getByText(/审稿图件接收 PNG/));
 assert.ok(screen.getAllByRole('status').some(e=>e.textContent.includes('普通提示词或已有原图不自动满足例外')));
 fireEvent.change(screen.getByLabelText('投稿阶段'),{target:{value:'production'}});
 assert.ok(screen.getAllByText(/照片\/位图按专节 88\/180 mm/).length);
 assert.equal(screen.getByLabelText('最终排版宽度（mm）').value,'180');
 fireEvent.click(screen.getByRole('button',{name:'选择此期刊'}));
 assert.equal(saved.journalId,'hssc');assert.equal(saved.stage,'production');
 assert.deepEqual(loadJournalSelection(window.localStorage),saved);
});

test('new journals preserve selected scope and frozen evidence in generation, refinement and returned history',async()=>{
 const before=globalThis.fetch;
 try{
  for(const id of ['sage-open','hssc','population-research','acta-psychologica-sinica','advances-psychological-science','library-information-service']){
   const selection={...defaultJournalSelection(id),stage:'production',rasterKind:'lineart'};
   const snapshot=journalSnapshot(selection),requests=[];
   globalThis.fetch=async(_,init)=>{requests.push(JSON.parse(init.body));return Response.json({code:0,jobId:'new-journal-job',status:'queued'});};
   await createJobRequest('https://fixture.invalid',{backendMode:'gateway'},{journalSelection:selection});
   await refineImageRequest('https://fixture.invalid',{backendMode:'gateway'},{journalSelection:selection,sourceTaskId:'owned-source',sourceContentType:'schematic'});
   assert.deepEqual(requests.map(r=>r.journalSelection),[selection,selection]);
   globalThis.fetch=async()=>Response.json({code:0,job:{_id:'new-journal-job',journalSelection:selection,journalProfile:snapshot,resultImages:[{candidateId:0,journalCheck:{checks:[{id:'policy',status:'uncheckable'}],sourceSha256:'actual-file-hash'}}]}});
   const job=await getJobRequest('https://fixture.invalid',{backendMode:'gateway'},'new-journal-job');
   assert.deepEqual(job.journalProfile,snapshot);assert.deepEqual(job.journalSelection,selection);
   assert.equal(job.result_images[0].journalCheck.checks[0].status,'uncheckable');
   assert.equal(job.result_images[0].journalCheck.sourceSha256,'actual-file-hash');
  }
 }finally{globalThis.fetch=before;}
});

test('domestic journals are searchable and selectable with distinct rules, explicit uncertainty and cancel-safe persistence',()=>{
 let saved={...defaultJournalSelection('hssc'),version:'2026-10-14.v8'};
 const original=structuredClone(saved);
 const props=()=>({value:saved,onChange:v=>{saved=v;saveJournalSelection(window.localStorage,v);},figureTypeId:'workflow'});
 const view=render(React.createElement(JournalRulePicker,props()));
 tapJournal(/Humanities and Social Sciences Communications/);
 fireEvent.change(screen.getByRole('searchbox',{name:'搜索期刊'}),{target:{value:'人文社科'}});
 const list=within(screen.getByRole('navigation',{name:'期刊列表'}));
 for(const name of ['人口研究','心理学报','心理科学进展','图书情报工作'])assert.ok(list.getByRole('button',{name:new RegExp(name)}));
 fireEvent.click(list.getByRole('button',{name:/人口研究/}));
 assert.ok(screen.getByText(/均置于上方居中/));
 assert.ok(screen.getAllByRole('status').some(e=>e.textContent.includes('不能据未写明判断允许或禁止')));
 fireEvent.click(screen.getByRole('button',{name:'取消'}));assert.deepEqual(saved,original);assert.equal(loadJournalSelection(window.localStorage),null);
 tapJournal(/Humanities and Social Sciences Communications/);
 fireEvent.change(screen.getByRole('searchbox',{name:'搜索期刊'}),{target:{value:'数字人文'}});
 tapJournal(/图书情报工作/);browse('图书情报工作');
 assert.ok(screen.getByText(/没有给出 dpi\/ppi/));assert.ok(screen.getByText(/小六号（7 磅）/));
 assert.ok(screen.getByText(/披露条款不是所有生成或精修的许可/));
 assert.ok(screen.queryByLabelText('内容类型')===null,'Expected no matching DOM element');
 fireEvent.click(screen.getByRole('button',{name:'选择此期刊'}));
 assert.equal(saved.journalId,'library-information-service');assert.equal(saved.version,JOURNAL_VERSION);
 assert.deepEqual(loadJournalSelection(window.localStorage),saved);
 view.rerender(React.createElement(JournalRulePicker,props()));
 tapJournal(/图书情报工作/);browse('图书情报工作');
 assert.ok(screen.getByText(new RegExp(`规则版本 ${JOURNAL_VERSION}`)));
 fireEvent.click(screen.getByRole('button',{name:'取消'}));
});

test('HSSC width uncertainty is scoped to the chosen value and cancelling retains the historical version',()=>{
 let saved={...defaultJournalSelection('hssc'),version:'2026-10-14.v6',stage:'production'};
 const original=structuredClone(saved);
 const view=render(React.createElement(JournalRulePicker,{value:saved,onChange:v=>{saved=v},figureTypeId:'workflow'}));
 tapJournal(/Humanities and Social Sciences Communications/);browse('Humanities and Social Sciences Communications');
 assert.ok(screen.getByText(/规则版本 2026-10-14.v6/));
 updateRules();
 assert.ok(screen.getByText(new RegExp(`规则版本 ${JOURNAL_VERSION}`)));
 fireEvent.change(screen.getByLabelText('投稿阶段'),{target:{value:'production'}});
 fireEvent.change(screen.getByLabelText('最终排版宽度（mm）'),{target:{value:'87'}});
 assert.ok(screen.getAllByRole('status').some(e=>e.textContent.includes('当前排版宽度 87 mm 的适用条件待确认')));
 fireEvent.change(screen.getByLabelText('最终排版宽度（mm）'),{target:{value:'180'}});
 assert.ok(!screen.getAllByRole('status').some(e=>e.textContent.includes('当前排版宽度')));
 fireEvent.click(screen.getByRole('button',{name:'取消'}));assert.deepEqual(saved,original);
 view.rerender(React.createElement(JournalRulePicker,{value:saved,onChange:v=>{saved=v},figureTypeId:'workflow'}));
 tapJournal(/Humanities and Social Sciences Communications/);browse('Humanities and Social Sciences Communications');
 assert.ok(screen.getByText(/规则版本 2026-10-14.v6/));
});

test('Cell current evidence is selected explicitly while cancelled history and task-specific refinement stay intact',()=>{
 let saved={...defaultJournalSelection('cell-reports'),version:'2026-10-14.v7'};
 const original=structuredClone(saved);
 const props=()=>({value:saved,onChange:v=>{saved=v;saveJournalSelection(window.localStorage,v)},figureTypeId:'bar'});
 const view=render(React.createElement(JournalRulePicker,props()));
 tapJournal(/Cell Reports/);browse('Cell Reports');
 assert.ok(screen.getByText(/规则版本 2026-10-14.v7/));
 if(!screen.queryByRole('region',{name:'Cell Reports 详情'}))browse('Cell Reports');updateRules();
 assert.ok(screen.getByText(/现行正文\/GA 格式已核实/));
 fireEvent.click(screen.getByRole('button',{name:'取消'}));assert.deepEqual(saved,original);
 tapJournal(/Cell Reports/);
 if(!screen.queryByRole('region',{name:'Cell Reports 详情'}))browse('Cell Reports');updateRules();
 fireEvent.change(screen.getByLabelText('投稿阶段'),{target:{value:'production'}});
 fireEvent.click(screen.getByRole('button',{name:'选择此期刊'}));
 assert.equal(saved.version,JOURNAL_VERSION);assert.deepEqual(loadJournalSelection(window.localStorage),saved);
 // A confirmed original keeps its data classification; generation and refinement have distinct gates.
 saved={...saved,contentType:'data'};
 view.rerender(React.createElement(JournalRulePicker,{...props(),refineContext:{hasSource:true,contentType:'data',jobId:'recorded-task'}}));
 tapJournal(/Cell Reports/);browse('Cell Reports');
 assert.ok(screen.getByText(/沿用原任务：数据图/));
 assert.ok(screen.getAllByRole('status').some(e=>e.textContent.includes('当前不可执行：本刊不允许')));
 assert.ok(screen.queryByLabelText('精修原图性质')===null,'Expected no matching DOM element');
 fireEvent.click(screen.getByRole('button',{name:'取消'}));
 view.rerender(React.createElement(JournalRulePicker,props()));
 tapJournal(/Cell Reports/);browse('Cell Reports');
 assert.ok(!screen.getAllByRole('status').some(e=>e.textContent.includes('当前不可执行')));
 fireEvent.change(screen.getByLabelText('图件用途'),{target:{value:'graphical_abstract'}});
 assert.ok(screen.getByText(/现行图形摘要使用 Arial 8–12 pt/));
 assert.ok(screen.getAllByRole('status').some(e=>e.textContent.includes('当前不可执行：本刊及现行 GA 指南')));
 assert.equal(screen.getAllByRole('status').filter(e=>e.textContent.includes('本刊及现行 GA 指南')).length,1,'Identical generation/refinement explanations are shown once');
});
