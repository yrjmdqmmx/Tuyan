import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GuidePanel from '../src/components/GuidePanel.jsx'
import { readFileSync } from 'node:fs'

afterEach(cleanup)
const props={onStart(){},registryVersion:'registry-live-42',routeSummary:{main:'主模型 Live',image:'图像模型 Live',vision:'无'},providerLabels:['OpenRouter','阿里云百炼']}
test('documentation guide has reachable sections and a working generation entry', async () => {
  let starts=0
  const user=userEvent.setup()
  render(React.createElement(GuidePanel,{...props,onStart:()=>starts++}))
  assert.ok(screen.getByRole('heading',{name:'从研究内容到可核对的图示'}))
  const links=within(screen.getByRole('navigation',{name:'教程目录'})).getAllByRole('link')
  assert.equal(links.length,10)
  for(const link of links) {
    assert.match(link.getAttribute('href'),/^#guide-/)
    assert.ok(document.querySelector(link.getAttribute('href')))
  }
  await user.click(screen.getByRole('button',{name:'开始生成'}))
  assert.equal(starts,1)
})
test('guide derives live route data and explains the exact role and output boundaries', () => {
  render(React.createElement(GuidePanel,props))
  const copy=document.body.textContent
  for(const expected of ['registry-live-42','主模型 Live','图像模型 Live','OpenRouter / 阿里云百炼','视觉模型默认“无”','能力未知不等于支持','主模型规划','主模型风格整理','旧记录的文本评审','不会自动标为已通过','主模型编写 SVG 源码','不自动追加最终复审','定量图不能免除数值与几何核对','漏项或未解决项不会被认定为通过']) assert.ok(copy.includes(expected),expected)
  assert.match(copy,/普通模式固定 1 张候选图、1 轮评审/);assert.match(copy,/专业模式可设 1–6 张、1–5 轮/)
  assert.match(copy,/候选数量不是并发数量/)
  assert.match(copy,/所有精修先理解原图/)
  assert.match(copy,/已完成图片仍可查看、下载或继续精修/)
  assert.match(copy,/1K.*2K.*4K/)
  assert.doesNotMatch(copy,/1–3 张|0–2 轮/)
})
test('guide styles are scoped and provide desktop navigation and narrow layouts', () => {
  const styles=readFileSync(new URL('../src/components/guidePanel.css',import.meta.url),'utf8')
  assert.match(styles,/\.tuyan-guide-toc\{\s*position:sticky/)
  assert.match(styles,/@media\(max-width:760px\)/)
  assert.match(styles,/\.tuyan-guide-layout\{\s*grid-template-columns:minmax\(0,1fr\)/)
  assert.doesNotMatch(styles,/(?:^|\})\s*(?:body|button|header|h2|p)\s*\{/)
})
