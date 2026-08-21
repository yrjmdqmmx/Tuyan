const assert = require('node:assert/strict')
const path = require('node:path')

const projectConfig = require(path.join('..', 'project.config.json'))
const tsconfig = require(path.join('..', 'tsconfig.json'))

assert.equal(tsconfig.compilerOptions.target, 'ES2019')
assert.equal(
  projectConfig.setting.es6,
  true,
  'ES2019 产物必须启用开发者工具 ES6 上传编译，否则预览压缩器无法解析对象展开语法',
)

console.log('project-config.test.cjs passed')
