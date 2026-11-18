import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash}from'node:crypto'
import {gunzipSync}from'node:zlib'
import {titleIssues,scanTitles}from'../test-support/source-titles-r24.mjs'
import {titleSourceRows,isMachineDocument}from'../packages/api/src/card-presentation.mjs'
const row=label=>({url:'https://docs.example.test/guide',label:'官方文档 · Example · Page'+label})
test('R24 I3 scanner rejects counter and format labels while preserving documented versions and languages',()=>{
 for(const suffix of ['（文档）','（文档 2）','（Markdown）','（HTML）','（PDF 2）','（JSON）','（页面 3）','（来源 12）','（2）','（Document 4）','(Markdown)','(文档 2)','（参考资料 2）','（API 文档 2）','（Markdown 格式）','（HTML 页面）'])assert.ok(titleIssues(row(suffix)).includes('meaningless counter or format qualifier'),suffix)
 for(const suffix of ['（中文版）','（英文版）','（V1 接口，图像生成）','（控制台）','（模型库）'])assert.deepEqual(titleIssues(row(suffix)),[],suffix)
 assert.ok(titleIssues(row('（1234）')).length)
 assert.deepEqual(titleIssues(row('（0613）'),'Page · 0613'),[])
 assert.deepEqual(titleIssues(row('（Nano Banana 2）'),'Gemini 3.1 Flash Image · Nano Banana 2'),[])
})
test('R24 I3 frozen I2 source review retains all 1064 identities and exposes the missed suffixes',()=>{
 const bytes=fs.readFileSync(new URL('../test-support/fixtures/source-review-9a7128d6.json.gz',import.meta.url))
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'b6ab1064098c5d9baf8b743bbd3896f386caafeb4357466a63194c53ab8a8aa0')
 const b=JSON.parse(gunzipSync(bytes))
 for(const c of ['web','mini']){assert.equal(b[c].length,1064);assert.ok(scanTitles(b[c]).length>0)}
})
test('R24 I3 source collisions use namespaces, preserve source roles and drop machine formats',()=>{
 assert.deepEqual(titleSourceRows([
  {url:'https://cloud.baidu.com/doc/WENXINWORKSHOP/s/klqx7b1i5',label:'官方文档'},
  {url:'https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j',label:'官方文档'}
 ]).map(r=>r.label),['渠道资料 · 百度千帆 · 千帆 ModelBuilder 旧版入口（平台首页）','渠道资料 · 百度千帆 · 模型列表'])
 assert.deepEqual(titleSourceRows([
  {url:'https://docs.example.test/guide/generation/models',label:'原厂规格'},
  {url:'https://docs.example.test/guide/editing/models',label:'原厂规格'}
 ]).map(r=>r.label),['原厂规格 · Example · 模型列表（Guide，Generation）','原厂规格 · Example · 模型列表（Guide，Editing）'])
 assert.deepEqual(titleSourceRows([
  {url:'https://developers.openai.com/api/docs/models/gpt-6-luna.md',label:'原厂规格'},
  {url:'https://developers.openai.com/api/docs/models/gpt-6-luna',label:'原厂规格'},
  {url:'https://docs.example.test/llms.txt',label:'官方文档'},
  {url:'https://docs.example.test/llms-full.txt',label:'官方文档'},
  {url:'https://docs.example.test/page.mdx',label:'官方文档'}
 ],{id:'gpt-6-luna',label:'GPT-6 Luna'}),[{url:'https://developers.openai.com/api/docs/models/gpt-6-luna',label:'官方文档 · OpenAI · GPT-6 Luna'}])
 assert.equal(isMachineDocument('https://github.com/zai-org/GLM-4/blob/main/README.md'),false)
 for(const url of ['https://docs.example.test/llms-full.txt','https://docs.example.test/page.md','https://docs.example.test/page.mdx'])assert.ok(titleIssues({url,label:'官方文档 · Example · Guide'}).includes('machine document link'))
})
