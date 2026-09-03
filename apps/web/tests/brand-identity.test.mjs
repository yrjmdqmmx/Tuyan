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
  const featured = read('src/components/FeaturedTemplateStudio.jsx')
  assert.match(featured, /图研Tuyan 是开源的学术图示工作台/u)
  assert.doesNotMatch(featured, /PaperBanana 是开源的学术图示工作台/u)
  const referenceLibrary = read('src/components/ReferenceLibraryPanel.jsx')
  assert.match(referenceLibrary, /图研Tuyan 参考库/u)
  assert.doesNotMatch(referenceLibrary, /PaperBananaBench/u)
  const guide = read('src/components/GuidePanel.jsx')
  assert.match(guide, /图研Tuyan 客户端以开源方式维护/u)
  assert.doesNotMatch(guide, /PaperBanana 客户端以开源方式维护/u)
  const leaderboardRoot = read('src/components/LeaderboardRoot.jsx')
  assert.match(leaderboardRoot, /alt="图研Tuyan 标志"/u)
  assert.match(leaderboardRoot, /<strong>图研Tuyan<\/strong>/u)
  assert.doesNotMatch(leaderboardRoot, /PaperBanana 标志|<strong>PaperBanana<\/strong>|多智能体|学术图示生成/u)
  for (const legal of ['public/privacy-policy.html', 'public/terms-of-service.html']) {
    const source = read(legal)
    assert.doesNotMatch(source, /PaperBanana/u)
    assert.match(source, /图研Tuyan|Tuyan/u)
  }
  const styles = read('src/styles.css')
  assert.match(styles, /\.brand\s*\{[\s\S]*?flex:\s*0 0 auto;[\s\S]*?min-width:\s*max-content;/u)
  assert.match(styles, /\.brand h1\s*\{[\s\S]*?white-space:\s*nowrap;/u)
  assert.match(read('404.html'), /返回图研Tuyan工作台/u)
})
