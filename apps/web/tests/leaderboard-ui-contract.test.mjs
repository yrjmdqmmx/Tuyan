import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const readSource = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

test('main routes leaderboard and canonicalizes legacy bench before render', () => {
  const source = readSource('../src/main.jsx')
  assert.match(source, /canonicalizeLeaderboardLocation/u)
  assert.match(source, /PaperBanana 生图模型排行榜/u)
  assert.doesNotMatch(source, /PaperBanana 模型横评/u)
})

test('workspace header exposes leaderboard and mini-program without retired client links', () => {
  const source = readSource('../src/App.jsx')
  assert.match(source, /BENCH_ENABLED\s*\?\s*<a href=\{appPath\('\/leaderboard'\)\}[^>]*>[\s\S]*?排行榜/u)
  assert.match(source, /微信小程序/u)
  assert.match(source, />\s*论文/u)
  assert.match(source, />\s*GitHub/u)
  assert.doesNotMatch(source, /Android 版|Windows 版|Mac 版|MonitorDown|\bApple\b/u)
  assert.doesNotMatch(source, /className="brand-tags"|>多智能体<|>学术图示生成</u)
})

test('rendered leaderboard search keeps a visible two-pixel keyboard focus outline', () => {
  const style = document.createElement('style')
  style.textContent = readSource('../src/components/benchmark.css')
  const search = document.createElement('label')
  search.className = 'bench-search'
  search.innerHTML = '<span><input type="search" aria-label="测试排行榜搜索"></span>'
  document.head.append(style)
  document.body.append(search)
  try {
    const input = search.querySelector('input')
    input.focus()
    assert.equal(document.activeElement, input)
    assert.match(style.textContent, /\.bench-search input:focus-visible\s*\{[^}]*outline:\s*2px solid [^;}]+;?[^}]*outline-offset:\s*3px/u)
    assert.doesNotMatch(style.textContent, /\.bench-search input\s*\{[^}]*outline:\s*(?:0|none)/u)
  } finally {
    search.remove()
    style.remove()
  }
})

test('leaderboard CSS keeps the page bounded and matrix scrollable with a sticky model column at 390 and 430 widths', () => {
  const styles = readSource('../src/components/benchmark.css')
  assert.match(styles, /\.bench-matrix thead th\[aria-sort="descending"\] button\s*\{/u)
  assert.doesNotMatch(styles, /\.bench-matrix thead button\[aria-pressed/u)
  assert.match(styles, /\.bench-shell\s*\{[\s\S]*?overflow-x:\s*clip/u)
  assert.match(styles, /\.bench-matrix-scroll\s*\{[\s\S]*?overflow-x:\s*auto/u)
  assert.match(styles, /\.bench-model-column\s*\{[\s\S]*?position:\s*sticky/u)
  assert.match(styles, /@media\s*\(max-width:\s*640px\)[\s\S]*?\.bench-dimension-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr/u)
  assert.match(styles, /@media\s*\(min-width:\s*900px\)[\s\S]*?\.bench-dimension-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,/u)
  assert.match(styles, /@media\s*\(max-width:\s*430px\)/u)
  assert.match(styles, /@media\s*\(max-width:\s*430px\)[\s\S]*?\.bench-dimension-table\s*\{[\s\S]*?min-width:\s*0/u)
  assert.match(styles, /@media\s*\(max-width:\s*390px\)/u)
  assert.match(styles, /\.bench-method-page\s*\{[\s\S]*?overflow-x:\s*clip/u)
  assert.match(styles, /\.bench-method-prompt[^{]*\{[^}]*overflow-wrap:\s*anywhere/u)
  assert.match(styles, /\.bench-method-hash[^{]*\{[^}]*overflow-wrap:\s*anywhere/u)
  assert.match(styles, /\.bench-method-case\s*\{[^}]*min-width:\s*0[^}]*display:\s*grid/u)
  assert.match(styles, /\.bench-method-case\s*>\s*\*\s*\{[^}]*min-width:\s*0/u)
  assert.match(styles, /\.bench-method-prompts\s*\{[^}]*grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/u)
  assert.match(styles, /\.bench-method-prompt\s*\{(?=[^}]*white-space:\s*pre-wrap)(?=[^}]*max-width:\s*100%)[^}]*\}/u)
  assert.match(styles, /\.bench-method-rubric-wrap\s*\{[^}]*max-width:\s*100%[^}]*overflow-x:\s*auto/u)
  assert.match(styles, /\.bench-method-copy-status\s*\{[^}]*overflow-wrap:\s*anywhere/u)
  assert.match(styles, /\.bench-method-prompt-block button:focus-visible\s*\{[^}]*outline:\s*2px solid/u)
  assert.match(styles, /@media\s*\(max-width:\s*430px\)[\s\S]*?\.bench-method-case\s*\{[\s\S]*?grid-template-columns:\s*1fr/u)
  assert.match(styles, /@media\s*\(max-width:\s*430px\)[\s\S]*?\.bench-method-prompts\s*\{[\s\S]*?grid-template-columns:\s*1fr/u)
  assert.match(styles, /@media\s*\(max-width:\s*430px\)[\s\S]*?\.bench-method-score-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr/u)
  assert.match(styles, /@media\s*\(max-width:\s*390px\)[\s\S]*?\.bench-method-rubric-wrap\s*\{[\s\S]*?overflow-x:\s*auto/u)
  assert.doesNotMatch(styles, /gradient\(/u)
})

test('scientific evidence scores explicitly collapse at 760 and 390 pixels', () => {
  const styles = readSource('../src/components/benchmark.css')
  assert.match(styles, /@media\s*\(max-width:\s*760px\)\{(?:(?!@media)[\s\S])*?\.bench-scientific-evidence-card \.bench-evidence-scores\s*\{\s*grid-template-columns:\s*repeat\(4,minmax\(0,1fr\)\)/u)
  assert.match(styles, /@media\s*\(max-width:\s*390px\)\{(?:(?!@media)[\s\S])*?\.bench-scientific-evidence-card \.bench-evidence-scores\s*\{\s*grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/u)
})
