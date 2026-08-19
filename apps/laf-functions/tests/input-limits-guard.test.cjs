const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(path.resolve(__dirname, '../paperbanana-api.ts'), 'utf8')

assert.match(source, /methodContent\.trim\(\)\.length > 12000/)
assert.match(source, /methodContent exceeds 12000 characters/)
assert.match(source, /caption\.trim\(\)\.length > 1000/)
assert.match(source, /caption exceeds 1000 characters/)

console.log('create-job input limits policy ok')
