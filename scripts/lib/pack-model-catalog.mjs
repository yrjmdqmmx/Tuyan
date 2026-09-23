import { createHash } from 'node:crypto'

// Intern equal JSON values, then give frequently referenced nodes the shortest
// indices. Decoders expand every reference independently, preserving ownership.
export function packModelCatalog(value) {
  const strings = new Set()
  function collect(value) {
    if (typeof value === 'string') strings.add(value)
    else if (value && typeof value === 'object') Object.values(value).forEach(collect)
  }
  collect(value)

  // Adjacent sorted strings expose every branching prefix without storing a
  // character trie. Include model names and repeated prose as well as URLs.
  const sorted = [...strings].sort()
  const candidates = new Set()
  for (let i = 1; i < sorted.length; i++) {
    const before = sorted[i - 1], after = sorted[i]
    let end = 0
    while (end < Math.min(before.length, after.length) && before[end] === after[end]) end++
    if (end >= 6) candidates.add(before.slice(0, end))
  }
  const prefixes = [...candidates].filter(prefix => {
    let references = 0
    for (const text of strings) if (text.length > prefix.length && text.startsWith(prefix)) references++
    // Count UTF-8 bytes: Chinese prose has a different tradeoff from ASCII IDs.
    const bytes = Buffer.byteLength(prefix)
    return (bytes - 8) * references > bytes + 12
  }).sort((a, b) => b.length - a.length)

  const nodes = [], indices = new Map()
  function visit(value) {
    const key = JSON.stringify(value)
    if (indices.has(key)) return indices.get(key)
    const prefix = typeof value === 'string'
      ? prefixes.find(prefix => value.length > prefix.length && value.startsWith(prefix))
      : undefined
    const node = prefix ? [3, visit(prefix), value.slice(prefix.length)]
      : Array.isArray(value) ? [1, ...value.map(visit)]
        : value !== null && typeof value === 'object'
          ? [2, visit(Object.keys(value)), ...Object.values(value).map(visit)]
          : value
    const index = nodes.length
    nodes.push(node)
    indices.set(key, index)
    return index
  }
  const root = visit(value)

  const references = new Array(nodes.length).fill(0)
  references[root]++
  for (const node of nodes) if (Array.isArray(node)) {
    if (node[0] === 3) references[node[1]]++
    else for (const index of node.slice(1)) references[index]++
  }
  const order = nodes.map((_, index) => index).sort((a, b) => references[b] - references[a] || a - b)
  const remap = new Map(order.map((oldIndex, newIndex) => [oldIndex, newIndex]))
  const packed = order.map(index => {
    let node = nodes[index]
    if (!Array.isArray(node)) return node
    node = node[0] === 3 ? [3, remap.get(node[1]), node[2]] : [node[0], ...node.slice(1).map(index => remap.get(index))]
    if (node.every(value => typeof value === 'number')) {
      const compact = [4, node.map(value => value.toString(36)).join('.')]
      if (JSON.stringify(compact).length < JSON.stringify(node).length) node = compact
    }
    return node
  })
  return { sourceDigest: createHash('sha256').update(JSON.stringify(value)).digest('hex'), root: remap.get(root), nodes: packed }
}
