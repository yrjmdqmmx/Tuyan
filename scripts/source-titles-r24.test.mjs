import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {titleIssues,dialogIssues,reviewBaseline,scanTitles} from '../test-support/source-titles-r24.mjs'
import {sourceTitle} from '../packages/api/src/card-presentation.mjs'

test('R24 I2 baseline is the frozen starting HEAD for all 1064 cards per client',()=>{
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../test-support/fixtures/source-review-cd72eace.json.gz',import.meta.url))).digest('hex'),'40cd35c47a9f8d8c30423b8620c969471c44667a927f807fa72b1625c915d721')
 assert.equal(reviewBaseline.head,'cd72eace3d35088a7509d9bf55bc444a50c00396')
 for(const client of ['web','mini'])assert.equal(reviewBaseline[client].length,1064)
})
test('R24 I2 strict scanner rejects each previously missed title class',()=>{
 for(const label of ['官方文档 · 百度千帆 · Klqx7b1i5','官方文档 · 百度千帆 · Jm8r1826a','官方文档 · Example · A1b2c3d','官方文档 · 模型列表 - 百度千帆·大模型服务及Agent开发平台','官方文档 · DeepSeek · V3-0324 Release | DeepSeek API Docs','官方文档 · DeepSeek · Release – DeepSeek','官方文档 · DeepSeek · News260424','官方文档 · Example · #models','官方文档 · Example · model_name','官方文档 · Example · chat-latest','官方文档 · Example · model','官方文档 · Example · help.aliyun.com','官方文档 · Example · docs.example.xyz/api/models','官方文档 · Example · MiniMax API By MiniMax','官方文档 · Example · Unisound U2 By Unisound','官方文档 · Example · Page ·','官方文档 · Example','官方文档 · Example · Qwen3-8'])assert.ok(titleIssues({url:'https://example.test/doc',label}).length,label)
 for(const label of ['官方文档 · Novita · Ming Image Txt2img','官方文档 · DeepSeek · 更新日志 2026-04-24','原厂规格 · 百炼 · Qwen3.8 Max','下线公告 · 百炼 · 模型下线公告','官方文档 · Hugging Face · DeepSeek-R1-0528'])assert.deepEqual(titleIssues({url:'https://example.test/doc',label},label.split(' · ')[2]),[],label)
 assert.ok(scanTitles(reviewBaseline.web).length>400);assert.ok(scanTitles(reviewBaseline.mini).length>300)
})
test('R24 I2 title examples preserve roles, versions and readable captured/fallback pages',()=>{
 for(const [url,expected]of [
  ['https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5','百度千帆 · 模型列表'],
  ['https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j','百度千帆 · 模型列表'],
  ['https://api-docs.deepseek.com/news/news250325','DeepSeek · V3-0324 Release'],
  ['https://api-docs.deepseek.com/news/news260424','DeepSeek · 更新日志 2026-04-24']
 ])assert.equal(sourceTitle(url),expected)
})
test('R24 I2 copy checks reject contradictions, jargon and duplicates without conflating fields',()=>{
 assert.deepEqual(dialogIssues('输入：文本：支持；图像：未知\n原厂资料 · DeepSeek · 模型列表\n暂无官方资料'),['source plus no-source contradiction'])
 assert.deepEqual(dialogIssues('上下文窗口：图研既有核实\n上下文窗口：图研既有核实'),['duplicate line'])
 for(const token of ['审计','回退','未核实值','provenance','catalog','channel','vendor','sourceUrls','inputModalities'])assert.ok(dialogIssues(token).includes('internal jargon'))
 assert.deepEqual(dialogIssues('输入：文本：支持\n原厂资料 · DeepSeek · 模型列表\n输出：文本：未知\n暂无官方资料'),[])
})
test('R24 I2 complete report is reproducible offline',()=>{
 execFileSync(process.execPath,['scripts/report-source-titles-r24.mjs','--check'],{cwd:new URL('../',import.meta.url),stdio:'pipe'})
})
