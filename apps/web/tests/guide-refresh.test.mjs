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
  const anchors = ['从模板开始', '模板与参考图库', '普通 / 专业设置', '主 / 图 / 识模型与 BYOK', '比例、提示词与输出', '生成、记录与精修', '错误、隐私与开源']
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
