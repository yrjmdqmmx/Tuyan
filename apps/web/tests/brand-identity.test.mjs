import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (relative) => readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8')

test('Web workspace exposes the 图研Tuyan工作台 brand on its primary entry points', () => {
  assert.match(read('index.html'), /<title>图研Tuyan工作台<\/title>/u)
  const app = read('src/App.jsx')
  assert.match(app, /<h1>图研Tuyan工作台<\/h1>/u)
  assert.match(app, /alt="图研Tuyan 标志"/u)
  assert.doesNotMatch(app, /Android 版|className="brand-tags"/u)
  const styles = read('src/styles.css')
  assert.match(styles, /\.brand\s*\{[\s\S]*?flex:\s*0 0 auto;[\s\S]*?min-width:\s*max-content;/u)
  assert.match(styles, /\.brand h1\s*\{[\s\S]*?white-space:\s*nowrap;/u)
  assert.match(read('404.html'), /返回图研Tuyan工作台/u)
})
