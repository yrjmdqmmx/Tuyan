import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
import { startAdminFixture } from '../../../paperbanana-api/tests/integration/admin-fixture.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
const out=process.env.ADMIN_BROWSER_OUTPUT_DIR || fs.mkdtempSync(path.join(os.tmpdir(),'tuyan-admin-browser-'));fs.mkdirSync(out,{recursive:true});
const container='tuyan-admin-browser-'+randomUUID().slice(0,8), webPort=String(Number(process.env.ADMIN_WEB_PORT)||5194), webBase=`http://127.0.0.1:${webPort}`;
const pause=ms=>new Promise(r=>setTimeout(r,ms)), docker=(...args)=>execFileSync(process.env.DOCKER_BIN || 'docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
let fixture,vite,browser,desktop;
const errors=[], checks=[];
try {
 docker('run','--detach','--name',container,'--publish','127.0.0.1::27017','mongo:8.0.16-noble','mongod','--replSet','rs0','--bind_ip_all');
 for(let i=0;i<30;i++){try{docker('exec',container,'mongosh','--quiet','--eval','quit(db.adminCommand({ping:1}).ok ? 0 : 1)');break}catch{}await pause(500)}
 docker('exec',container,'mongosh','--quiet','--eval','rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})');
 for(let i=0;i<30;i++){try{docker('exec',container,'mongosh','--quiet','--eval','quit(db.hello().isWritablePrimary ? 0 : 1)');break}catch{}await pause(500)}
 const port=docker('port',container,'27017/tcp').split(':').at(-1);
 fixture=await startAdminFixture(`mongodb://127.0.0.1:${port}/?directConnection=true`,webBase);
 const viteLog=fs.openSync(out+'/vite.log','w');
 vite=spawn(process.execPath,[root+'/apps/web/node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',webPort,'--strictPort'],{cwd:root+'/apps/web',env:{...process.env,VITE_AUTH_BASE:fixture.apiBase,VITE_API_BASE:fixture.apiBase,VITE_ALLOW_CUSTOM_API_BASE:'true',VITE_AUTH_ENABLED:'true',VITE_AUTH_REQUIRED:'false',VITE_BACKEND_MODE:'gateway',VITE_BENCH_ENABLED:'false'},stdio:['ignore',viteLog,viteLog]});
 for(let i=0;i<60;i++){try{if((await fetch(webBase)).ok)break}catch{}await pause(500)}
 browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1080},locale:'zh-CN',timezoneId:'Asia/Shanghai'});
 await context.route('**/*',route=>{const url=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(url.hostname)?route.continue():route.abort()});
 const login=await context.request.post(fixture.apiBase+'/api/auth/sign-in/email',{headers:{origin:webBase},data:{email:'admin@example.test',password:'fixture-admin-password'}});assert.equal(login.status(),200);
 desktop=await context.newPage();desktop.on('pageerror',e=>errors.push(e.message));
 await desktop.goto(webBase+'/?admin=overview');await desktop.getByRole('heading',{name:'站长运营后台',exact:true}).waitFor();
 await desktop.locator('.ops-metric').first().locator('strong').getByText('47',{exact:true}).waitFor();
 assert.match(await desktop.title(),/图研|Tuyan/);assert.equal(await desktop.locator('vite-error-overlay').count(),0);checks.push('real authenticated overview and complete counts');
 await desktop.locator('.ops-workspace').screenshot({path:out+'/01-overview-desktop.png'});
 await desktop.getByRole('button',{name:/近期任务.*统计范围/}).click();await desktop.getByRole('heading',{name:'近期任务',exact:true}).waitFor();
 assert.match(desktop.url(),/a_fromDate=/);checks.push('overview metric deep link retains time scope');
 await desktop.getByRole('button',{name:'清除筛选',exact:true}).first().click();await desktop.getByText(/共.*67.*条/).waitFor();
 await desktop.getByRole('button',{name:'下一页',exact:true}).click();await desktop.getByText('第 2 / 4 页',{exact:false}).waitFor();
 await desktop.locator('.ops-table-wrap tbody tr').first().locator('td button').first().click();await desktop.getByRole('heading',{name:'任务详情',exact:true}).waitFor();
 await desktop.getByRole('button',{name:'← 返回列表',exact:true}).click();await desktop.getByText('第 2 / 4 页',{exact:false}).waitFor();checks.push('server pagination and detail return retain page');
 await desktop.getByRole('button',{name:'账号与用户',exact:true}).click();await desktop.locator('.ops-table-wrap tbody tr').first().waitFor();
 await desktop.getByLabel('搜索范围',{exact:true}).selectOption('contact');await desktop.getByLabel('搜索',{exact:true}).fill('research-lab-0086');await desktop.getByRole('button',{name:'应用筛选',exact:true}).click();await desktop.getByText(/共.*1.*条/).waitFor();
 await desktop.getByRole('button',{name:'研究用户 00',exact:true}).click();await desktop.getByRole('heading',{name:'用户详情',exact:true}).waitFor();
 await desktop.getByRole('button',{name:'查看完整邮箱与反馈联系方式',exact:true}).click();await desktop.getByText('researcher0@example.test',{exact:true}).waitFor();await desktop.getByText(/wechat:research-lab-0086/).waitFor();
 await desktop.locator('.ops-workspace').screenshot({path:out+'/02-user-detail-desktop.png'});checks.push('cross database contact search, explicit reveal and user activity');
 await desktop.getByRole('button',{name:'肿瘤微环境机制图',exact:true}).click();await desktop.getByRole('heading',{name:'任务详情',exact:true}).waitFor();await desktop.getByAltText('生成结果 1',{exact:true}).scrollIntoViewIfNeeded();await desktop.waitForFunction(()=>{const img=document.querySelector('img[alt="生成结果 1"]');return img?.complete&&img.naturalWidth>0});
 await desktop.getByLabel('跟进状态',{exact:true}).selectOption('resolved');await desktop.getByLabel('处理说明',{exact:true}).fill('已检查生成结果和输入，用户问题已处理。');await desktop.getByRole('button',{name:'保存跟进记录',exact:true}).click();await desktop.getByRole('button',{name:'确认保存',exact:true}).click();await desktop.locator('.ops-history').getByText('已检查生成结果和输入，用户问题已处理。',{exact:true}).waitFor();
 assert.equal((await fixture.db.collection('paperbanana_jobs').findOne({_id:'task-000'})).status,'succeeded');checks.push('task result rendering and audited followup preserves execution status');
 await desktop.locator('.ops-workspace').screenshot({path:out+'/03-task-detail-desktop.png'});
 await desktop.getByRole('button',{name:'社区评估题',exact:true}).click();await desktop.locator('.ops-table-wrap tbody tr').first().waitFor();await desktop.getByLabel('审核状态',{exact:true}).selectOption('pending');await desktop.getByLabel('能力分类',{exact:true}).fill('机制通路');await desktop.getByRole('button',{name:'应用筛选',exact:true}).click();await desktop.getByText(/共.*9.*条/).waitFor();await desktop.getByRole('button',{name:/绘制 CRISPR/}).click();
 await desktop.getByRole('heading',{name:'社区评估题详情',exact:true}).waitFor();await desktop.getByLabel('题目内容',{exact:true}).fill('绘制 CRISPR 基因编辑实验流程，明确实验组、对照组与检测节点。');await desktop.getByLabel('处理说明',{exact:true}).fill('补充对照组要求，保留原始提交。');await desktop.getByRole('button',{name:'保存编辑',exact:true}).click();await desktop.getByRole('button',{name:'确认保存',exact:true}).click();await desktop.locator('.ops-history').getByText('补充对照组要求，保留原始提交。',{exact:true}).waitFor();
 await desktop.getByLabel('处理说明',{exact:true}).fill('内容明确，进入下一期题集候选。');await desktop.getByRole('button',{name:'通过为下期候选',exact:true}).click();await desktop.getByRole('button',{name:'确认保存',exact:true}).click();await desktop.getByText('该提交已完成审核，保留原稿与审核记录。当前正式题集和评估结果不受此操作影响。',{exact:true}).waitFor();
 const submission=await fixture.benchmarkDb.collection('paperbanana_benchmark_prompt_submissions').findOne({submissionId:'submission-0'});assert.equal(submission.status,'approved_for_next_suite');assert.equal(submission.adminHistory.length,2);checks.push('community filtering, editable draft, explicit review confirmation and audit');
 await desktop.locator('.ops-workspace').screenshot({path:out+'/04-community-reviewed-desktop.png'});
 await desktop.getByRole('button',{name:'← 返回列表',exact:true}).click();await desktop.getByText(/共.*8.*条/).waitFor();assert.equal(await desktop.getByLabel('审核状态',{exact:true}).inputValue(),'pending');checks.push('reviewed row leaves pending list and filter persists');
 await desktop.getByLabel('搜索',{exact:true}).fill('不存在的科研题目-zzzz');await desktop.getByRole('button',{name:'应用筛选',exact:true}).click();await desktop.getByRole('heading',{name:'没有符合条件的记录',exact:true}).waitFor();checks.push('honest empty state');
 const mobile=await context.newPage();mobile.on('pageerror',e=>errors.push(e.message));await mobile.setViewportSize({width:390,height:844});await mobile.goto(webBase+'/?admin=jobs');await mobile.locator('.ops-table-wrap tbody tr').first().waitFor();assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await mobile.locator('.ops-workspace').screenshot({path:out+'/05-jobs-mobile.png'});checks.push('390px mobile layout no page overflow; table scrolls within container');
 await mobile.locator('.ops-table-wrap tbody tr').first().locator('td button').first().click();await mobile.getByRole('heading',{name:'任务详情',exact:true}).waitFor();await mobile.getByAltText('生成结果 1',{exact:true}).waitFor();assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await mobile.locator('.ops-workspace').screenshot({path:out+'/06-task-detail-mobile.png'});checks.push('mobile detail and result');
 // A database write by a second operator must not be overwritten by an old browser detail.
 await mobile.getByLabel('处理说明',{exact:true}).fill('浏览器中尚未保存的草稿');await fixture.db.collection('paperbanana_jobs').updateOne({_id:'task-000'},{$inc:{adminVersion:1}});await mobile.getByRole('button',{name:'保存跟进记录',exact:true}).click();await mobile.getByRole('button',{name:'确认保存',exact:true}).click();await mobile.getByText(/记录已被其他操作更新|任务已更新/).waitFor();assert.equal(await mobile.getByLabel('处理说明',{exact:true}).inputValue(),'浏览器中尚未保存的草稿');await mobile.getByRole('button',{name:'刷新记录后核对草稿',exact:true}).click();await mobile.waitForFunction(()=>!document.body.innerText.includes('正在刷新数据…'));assert.equal(await mobile.getByLabel('处理说明',{exact:true}).inputValue(),'浏览器中尚未保存的草稿');checks.push('concurrency conflict and refresh preserve unsaved draft');
 // Simulate a temporary transport failure without replacing any successful data API.
 let failOnce=true;
 await context.route(fixture.apiBase+'/paperbanana-api',async route=>{const body=route.request().postDataJSON();if(body?.action==='adminTaskList'&&failOnce){failOnce=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:503,error:'后台数据暂不可用，请稍后重试'})});}else await route.fallback()});
 await desktop.goto(webBase+'/?admin=jobs');await desktop.getByText('后台数据暂不可用，请稍后重试',{exact:true}).waitFor();await desktop.getByRole('button',{name:'重新加载',exact:true}).click();await desktop.locator('.ops-table-wrap tbody tr').first().waitFor();checks.push('temporary service failure and retry use real data again');
 await desktop.locator('.ops-table-wrap tbody tr').nth(12).locator('td button').first().scrollIntoViewIfNeeded();const savedScroll=await desktop.evaluate(()=>scrollY);await desktop.locator('.ops-table-wrap tbody tr').nth(12).locator('td button').first().click();await desktop.getByRole('heading',{name:'任务详情',exact:true}).waitFor();await desktop.getByRole('button',{name:'← 返回列表',exact:true}).click();await desktop.locator('.ops-table-wrap tbody tr').nth(12).waitFor();await desktop.waitForFunction(y=>Math.abs(scrollY-y)<8,savedScroll);checks.push('return to list restores scroll position');
 const unauthorized=await browser.newContext();await unauthorized.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());await unauthorized.request.post(fixture.apiBase+'/api/auth/sign-up/email',{headers:{origin:webBase},data:{email:'reader@example.test',password:'fixture-reader-password',name:'普通用户'}});await unauthorized.request.post(fixture.apiBase+'/api/auth/sign-in/email',{headers:{origin:webBase},data:{email:'reader@example.test',password:'fixture-reader-password'}});const regularPage=await unauthorized.newPage();await regularPage.goto(webBase+'/?admin=users');await regularPage.getByText('需要已登录的站长账号才能访问，后台接口会再次校验权限。',{exact:true}).waitFor();assert.equal(await regularPage.locator('.ops-table-wrap').count(),0);checks.push('signed-in non-admin cannot view the workspace');
 const anonymous=await browser.newContext({viewport:{width:390,height:844}});await anonymous.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());const noAccess=await anonymous.newPage();await noAccess.goto(webBase+'/?admin=users');await noAccess.getByText('需要已登录的站长账号才能访问，后台接口会再次校验权限。',{exact:true}).waitFor();assert.equal(await noAccess.locator('.ops-table-wrap').count(),0);checks.push('unauthenticated deep link has no admin rows');
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/acceptance.json',JSON.stringify({checks,consoleErrors:errors,fixture:'Real Better Auth + Gateway + Core + Mongo; local seeded data and image fixture',productionWrites:0,providerCalls:0},null,2));console.log(JSON.stringify({passed:checks.length,screenshots:out,consoleErrors:errors}));
} catch(error) { if(desktop){fs.writeFileSync(out+'/failure-state.txt',await desktop.locator('body').innerText().catch(()=>''));await desktop.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});} console.error(JSON.stringify({error:String(error),browserErrors:errors})); throw error; }
finally{await browser?.close();vite?.kill();await fixture?.cleanup();try{docker('rm','-f','-v',container)}catch{}}
