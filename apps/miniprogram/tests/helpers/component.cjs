const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

function applyData(data, patch) {
  for (const [key, value] of Object.entries(patch)) {
    const indexed = key.match(/^(\w+)\[(\d+)\]$/)
    if (indexed) data[indexed[1]][Number(indexed[2])] = value
    else data[key] = value
  }
}
function loadComponent(relative, mocks = {}, globals = {}) {
  const filename = path.resolve(__dirname, '../../miniprogram', relative)
  let definition
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    Component(value) { definition = value }, exports: {},
    require(name) { return Object.hasOwn(mocks, name) ? mocks[name] : require(require.resolve(name, { paths: [path.dirname(filename)] })) },
    wx: {}, setTimeout, clearTimeout, setInterval, clearInterval, console, ...globals,
  }, { filename })
  const patches = []; const events = []
  const instance = {
    ...definition.methods,
    data: structuredClone(definition.data || {}),
    properties: Object.fromEntries(Object.entries(definition.properties || {}).map(([k, v]) => [k, structuredClone(v.value)])),
    setData(patch) { patches.push(structuredClone(patch)); applyData(this.data, structuredClone(patch)) },
    triggerEvent(name, detail) { events.push({ name, detail }) },
  }
  return { definition, instance, patches, events }
}
module.exports = { loadComponent, applyData }
