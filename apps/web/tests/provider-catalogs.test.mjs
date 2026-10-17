import test,{afterEach} from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {renderHook,act,cleanup} from '@testing-library/react'
import useProviderCatalogs from '../src/hooks/useProviderCatalogs.js'
import {modelCardSpecifications} from '../src/lib/modelCardSpecifications.js'
afterEach(cleanup)
const registry={providers:{openai:{models:[]}},catalogProviders:{openai:{access:'key'}}}
const health={runtime:'gateway'}
const base={apiBase:'http://localhost',health,registry,apiKeys:{openai:'a'},providerRegions:{},identity:'one'}
const response=(id,catalog={state:'ready'})=>({catalog,providerRegistry:{models:[{id,label:id,roles:[],selectable:false,catalogDiscovered:true}]}})
test('late account result never crosses changed key or identity',async()=>{
 let complete;const readAccount=()=>new Promise(resolve=>{complete=resolve})
 const {result,rerender}=renderHook(props=>useProviderCatalogs({...props,readAccount}),{initialProps:base})
 let pending;act(()=>{pending=result.current.load('openai')})
 rerender({...base,apiKeys:{openai:'b'},identity:'two'})
 await act(async()=>{complete(response('private-old'));await pending})
 assert.deepEqual(result.current.registry.providers.openai.models,[]);assert.equal(result.current.states.openai,undefined)
})
test('resuming an account directory retains previously discovered rows',async()=>{
 const calls=[];const readAccount=async(_a,_h,payload)=>{calls.push(payload);return calls.length===1?response('first',{state:'partial',continuation:{cursor:'next'},pages:1}):response('second',{state:'ready',pages:1})}
 const {result}=renderHook(()=>useProviderCatalogs({...base,readAccount}))
 await act(()=>result.current.load('openai'));await act(()=>result.current.load('openai'))
 assert.equal(calls[1].continuation.cursor,'next');assert.deepEqual(new Set(result.current.registry.providers.openai.models.map(m=>m.id)),new Set(['first','second']))
 assert.equal(result.current.states.openai.catalog.pages,2)
 act(()=>result.current.invalidate('openai'));assert.deepEqual(result.current.registry.providers.openai.models,[])
})
test('specific page facts override unresolved overview and do not substitute prompt character counts',()=>{
 const m={id:'qwen3.8-max',specificModelSpecifications:{officialInputModalities:['text','image','video'],officialOutputModalities:['text'],contextWindowTokens:1000000,sourceUrls:['https://help.aliyun.com/zh/model-studio/qwen3-8-max']}}
 const card=modelCardSpecifications('tokendance',m);assert.equal(card.context,'1,000,000 tokens');assert.equal(card.input,'文本、图像、视频');assert.ok(card.sources[0].endsWith('qwen3-8-max'))
 const image=modelCardSpecifications('openai',{id:'image',specificModelSpecifications:{officialInputModalities:['text','image'],officialOutputModalities:['image'],contextWindowStatus:'not-published',sourceUrls:['https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst']}})
 assert.equal(image.context,'官方未公布')
})


test('account pagination does not replace earlier live specifications with the static base',async()=>{
 let count=0
 const readAccount=async()=>++count===1 ? {catalog:{state:'partial',continuation:{cursor:'two'}},providerRegistry:{models:[{id:'existing',catalogAliases:['existing'],specifications:{contextWindowTokens:42}}]}} : {catalog:{state:'ready'},providerRegistry:{models:[{id:'existing',specifications:{}},{id:'new',catalogAliases:['new']}]}}
 const {result}=renderHook(()=>useProviderCatalogs({...base,readAccount}))
 await act(()=>result.current.load('openai'));await act(()=>result.current.load('openai'))
 assert.equal(result.current.registry.providers.openai.models.find(m=>m.id==='existing').specifications.contextWindowTokens,42)
})

test('unknown model facts still retain the exact directory source',()=>{
 const card=modelCardSpecifications('fal',{id:'new-endpoint',specifications:{version:1,sourceUrls:['https://fal.ai/models/new-endpoint/api']}})
 assert.equal(card.context,'待确认');assert.deepEqual(card.sources,['https://fal.ai/models/new-endpoint/api'])
})

test('supplemental private catalogs retain public rows and disappear when the selected key changes',async()=>{
 const publicRows=[{id:'public-live',catalogAliases:['public-live'],roles:[],catalogDiscovered:true,specifications:{contextWindowTokens:42}}]
 const props={...base,registry:{providers:{novita:{models:publicRows}},catalogProviders:{novita:{access:'public'}}},apiKeys:{novita:'a'}}
 const readAccount=async()=>response('private-image')
 const {result,rerender}=renderHook(value=>useProviderCatalogs({...value,readAccount}),{initialProps:props})
 await act(()=>result.current.load('novita',{privateModels:true}))
 assert.deepEqual(new Set(result.current.registry.providers.novita.models.map(row=>row.id)),new Set(['public-live','private-image']))
 rerender({...props,apiKeys:{novita:'b'}})
 assert.deepEqual(result.current.registry.providers.novita.models.map(row=>row.id),['public-live'])
})
