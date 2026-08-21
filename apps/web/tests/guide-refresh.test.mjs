import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GuidePanel from '../src/components/GuidePanel.jsx'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})
test('quick guide exposes the approved anchored directory and working top CTAs', async () => {
  let starts = 0
  const user = userEvent.setup()
  render(React.createElement(GuidePanel, {
    onStart: () => { starts += 1 },
    registryVersion: 'registry-live-42',
    routeSummary: { main: '主模型 Live', image: '图像模型 Live', vision: '识图模型 Live' },
    providerLabels: ['OpenRouter', '阿里百炼'],
  }))
  assert.ok(screen.getByRole('heading', { name: '60 秒快速开始' }))
  const anchors = ['从模板开始', '模板与参考图库', '生成设置参数详解', '主 / 图 / 识模型与 BYOK', '比例、提示词与输出', '生成、记录与精修', '错误、隐私与开源']
  for (const label of anchors) {
    const link = screen.getByRole('link', { name: label })
    assert.match(link.getAttribute('href'), /^#guide-/u)
    assert.ok(document.querySelector(link.getAttribute('href')))
  }
  await user.click(screen.getByRole('button', { name: '开始生成' }))
  assert.equal(starts, 1)
  assert.equal(screen.getByRole('link', { name: '了解模型与 BYOK' }).getAttribute('href'), '#guide-models')
})

test('guide derives registry and current routes from props and includes current product truths', () => {
  render(React.createElement(GuidePanel, {
    onStart() {},
    registryVersion: 'registry-live-42',
    routeSummary: { main: '主模型 Live', image: '图像模型 Live', vision: '识图模型 Live' },
    providerLabels: ['OpenRouter', '阿里百炼'],
  }))
  assert.match(document.body.textContent, /registry-live-42/u)
  assert.match(document.body.textContent, /主模型 Live/u)
  assert.match(document.body.textContent, /图像模型 Live/u)
  assert.match(document.body.textContent, /识图模型 Live/u)
  assert.match(document.body.textContent, /OpenRouter.*阿里百炼/u)
  assert.match(document.body.textContent, /306/u)
  assert.match(document.body.textContent, /PNG.*统一/u)
  assert.match(document.body.textContent, /不会持久化/u)
  assert.match(document.body.textContent, /禁用原因/u)
  assert.match(document.body.textContent, /1:1.*3:2.*2:3.*4:3.*3:4.*16:9.*9:16.*21:9.*1:4.*4:1/u)
  assert.doesNotMatch(document.body.textContent, /顶部模型接口/u)
})

test('generation settings guide explains every control with selection and cost guidance', () => {
  render(React.createElement(GuidePanel, {
    onStart() {},
    registryVersion: 'registry-live-42',
    routeSummary: { main: '主模型 Live', image: '图像模型 Live', vision: '识图模型 Live' },
    providerLabels: ['OpenRouter', '阿里百炼'],
  }))

  assert.ok(screen.getByRole('heading', { name: '生成设置参数详解' }))
  for (const parameter of [
    '使用模式', 'API 接入渠道与密钥', '主模型', '图像生成模型', '参考图识别模型',
    '导出格式', '输出清晰度', '画面比例', '生成流程', '检索设置', '候选图数量', '评审轮数',
  ]) {
    assert.ok(screen.getByRole('heading', { name: parameter }))
  }

  const copy = document.body.textContent
  assert.match(copy, /基础生成.*规划器 \+ 评审器.*完整流程/u)
  assert.match(copy, /不使用检索.*自动检索.*随机参考.*手动参考/u)
  assert.match(copy, /1K.*快速草稿.*2K.*论文.*4K.*最终导出/u)
  assert.match(copy, /候选图.*1.*3.*费用/u)
  assert.match(copy, /评审轮数.*0.*2.*费用/u)
  assert.match(copy, /快速草稿.*论文正式图.*复杂机制图/u)
  assert.match(copy, /上传参考图.*检索.*关闭/u)
})
