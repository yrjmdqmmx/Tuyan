const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(path.resolve(__dirname, '../paperbanana-api.ts'), 'utf8')

assert.match(source, /titleZh:\s*string/)
assert.match(source, /introZh:\s*string/)
assert.match(source, /titleZh:\s*limitText\(item\.titleZh \|\| item\.title_zh/)
assert.match(source, /introZh:\s*limitText\(item\.introZh \|\| item\.intro_zh/)
assert.match(source, /id:\s*String\(item\.id \|\| item\._id \|\| ''\)/)
assert.match(source, /\[item\.title, item\.summary, item\.titleZh, item\.introZh, item\.id\]/)
assert.match(source, /clamp\(Number\(body\.limit \|\| 24\), 1, 295\)/)
assert.match(source, /clamp\(Number\(options\.limit \|\| 24\), 1, 295\)/)

console.log('reference localization backend policy ok')
