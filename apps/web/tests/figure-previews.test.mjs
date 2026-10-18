import test, {afterEach} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import React from 'react'
import {render,screen,fireEvent,cleanup,within} from '@testing-library/react'
import FigureTypePicker from '../src/components/FigureTypePicker.jsx'
import FigurePreviewImage from '../src/components/FigurePreviewImage.jsx'
import {FIGURE_TYPE_PREVIEWS} from '../src/data/figure-type-previews.js'
import {FIGURE_TYPES,TAXONOMY_VERSION,referenceIsUsable} from '../../../packages/figure-taxonomy/src/index.js'
import {JOURNAL_REFERENCES} from '../../../packages/figure-taxonomy/src/references.js'

afterEach(cleanup)
const asset = src => new URL(`../public${src}`,import.meta.url)

test('every selectable type has a decodable, bounded thumbnail with accurate provenance',async()=>{
 assert.deepEqual(Object.keys(FIGURE_TYPE_PREVIEWS).sort(),FIGURE_TYPES.map(t=>t.id).sort())
 for(const type of FIGURE_TYPES){
  const p=FIGURE_TYPE_PREVIEWS[type.id]
  assert.equal(p.typeId,type.id);assert.equal(p.taxonomyVersion,TAXONOMY_VERSION)
  assert.ok(p.alt.includes(type.label));assert.ok(p.focus.length>8)
  const file=fs.readFileSync(asset(p.src));const image=await sharp(file).metadata()
  assert.ok(image.width<=960&&image.height<=600,`${type.id}: thumbnail dimensions`)
  assert.ok(file.length<250000,`${type.id}: thumbnail size`)
  await sharp(file).raw().toBuffer()
  if(p.source==='journal'){
   const ref=JOURNAL_REFERENCES.find(r=>r.id===p.referenceId)
   assert.ok(referenceIsUsable(ref),`${type.id}: usable license`)
   assert.ok(ref.figureTypeId===type.id||ref.panelTypes.some(panel=>panel.typeId===type.id),`${type.id}: exact type`)
   assert.deepEqual(p.paper,ref.paper);assert.equal(p.originalCaption,ref.originalCaption)
   assert.equal(p.license.status,'verified');assert.equal(p.license.attribution,ref.license.attribution)
   assert.equal(p.originalSrc,ref.localPreviewUrl)
   assert.equal(createHash('sha256').update(fs.readFileSync(asset(p.originalSrc))).digest('hex'),p.sourceSha256)
   assert.ok(fs.existsSync(new URL(`../../../${p.license.evidenceFile}`,import.meta.url)))
   const [x,y,w,h]=p.crop;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=100&&y+h<=100)
   assert.ok(p.modifications.length);assert.equal(file.length,p.thumbnail.bytes)
  }else{
   assert.equal(p.evidence,'illustrative-only');assert.ok(p.fallbackReason)
   assert.match(file.toString(),/仅用于教学，不代表真实研究结果/)
   assert.equal(p.paper,undefined)
  }
 }
})

test('enlarging a paper panel does not select it; full context and source remain accessible',()=>{
 const chosen=[];render(React.createElement(FigureTypePicker,{value:'workflow',onChange:id=>chosen.push(id)}))
 fireEvent.click(screen.getByLabelText('信息图类别'))
 fireEvent.change(screen.getByRole('searchbox',{name:'搜索图类'}),{target:{value:'柱形图'}})
 fireEvent.click(screen.getByRole('button',{name:'查看柱形图预览'}))
 assert.deepEqual(chosen,[]);assert.equal(screen.getAllByRole('dialog').length,2)
 const preview=screen.getByRole('dialog',{name:/柱形图.*Bar chart/})
 assert.equal(within(preview).getByRole('img').getAttribute('src'),FIGURE_TYPE_PREVIEWS.bar.src)
 assert.ok(within(preview).getAllByRole('link',{name:FIGURE_TYPE_PREVIEWS.bar.paper.title})[0])
 fireEvent.click(within(preview).getByRole('button',{name:'查看完整论文原图'}))
 assert.equal(within(preview).getByRole('img').getAttribute('src'),FIGURE_TYPE_PREVIEWS.bar.originalSrc)
 fireEvent.keyDown(window,{key:'Escape'})
 assert.equal(screen.getAllByRole('dialog').length,1);assert.deepEqual(chosen,[])
 fireEvent.click(screen.getByRole('button',{name:/柱形图 Bar chart.*AI 绘图/}))
 assert.deepEqual(chosen,['bar']);assert.equal(screen.queryByRole('dialog'),null)
})

test('teaching preview labels simulated data without claiming a generation guarantee',()=>{
 const candidate=FIGURE_TYPES.find(t=>t.id==='streamgraph')
 render(React.createElement(FigureTypePicker,{value:'workflow',onChange:()=>assert.fail('preview must not select')}))
 fireEvent.click(screen.getByLabelText('信息图类别'))
 fireEvent.change(screen.getByRole('searchbox',{name:'搜索图类'}),{target:{value:candidate.en}})
 fireEvent.click(screen.getByRole('button',{name:`查看${candidate.label}预览`}))
 const preview=screen.getAllByRole('dialog').at(-1)
 assert.ok(within(preview).getByText(/模拟数据/))
 assert.ok(within(preview).getByText(/不代表生成效果保证/))
})

test('real paper previews keep base render support separate from unverified variants and model quality',()=>{
 const candidate=FIGURE_TYPES.find(t=>t.id==='qq')
 render(React.createElement(FigureTypePicker,{value:'workflow',onChange:()=>assert.fail('preview must not select')}))
 fireEvent.click(screen.getByLabelText('信息图类别'))
 fireEvent.change(screen.getByRole('searchbox',{name:'搜索图类'}),{target:{value:candidate.en}})
 fireEvent.click(screen.getByRole('button',{name:`查看${candidate.label}预览`}))
 const preview=screen.getAllByRole('dialog').at(-1)
 assert.equal(FIGURE_TYPE_PREVIEWS.qq.source,'journal')
 assert.equal(candidate.support.pipeline,'deterministic_base');assert.ok(candidate.variants.every(v=>v.id))
 assert.ok(within(preview).getByText(/不代表生成效果保证/))
 assert.equal(within(preview).queryByText(/模拟数据/),null)
})

test('missing and failed images show an explicit state, without unrelated replacements',()=>{
 const {rerender}=render(React.createElement(FigurePreviewImage,{preview:FIGURE_TYPE_PREVIEWS.workflow}))
 fireEvent.error(screen.getByRole('img'))
 assert.equal(screen.queryByRole('img'),null);assert.match(screen.getByRole('status').textContent,/暂不可用/)
 rerender(React.createElement(FigurePreviewImage,{preview:undefined}))
 assert.equal(screen.queryByRole('img'),null);assert.ok(screen.getByRole('status'))
})
