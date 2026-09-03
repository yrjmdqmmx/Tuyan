import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (relative) => readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8')

test('Web workspace exposes the 图研Tuyan工作台 brand on its primary entry points', () => {
  assert.match(read('index.html'), /<title>图研Tuyan工作台<\/title>/u)
  assert.match(read('src/App.jsx'), /<h1>图研Tuyan工作台<\/h1>/u)
  assert.match(read('src/App.jsx'), /alt="图研Tuyan 标志"/u)
  assert.match(read('404.html'), /返回图研Tuyan工作台/u)
})
