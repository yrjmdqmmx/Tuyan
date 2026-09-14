import { createHash } from 'node:crypto'

// Intern repeated JSON values at build time. Array tags distinguish objects (0)
// from arrays (1); every child is a node index, including primitive values.
export function packModelCatalog(value) {
  const nodes = []
  const indices = new Map()
  function visit(value) {
    const key = JSON.stringify(value)
    if (indices.has(key)) return indices.get(key)
    const node = Array.isArray(value)
      ? [1, ...value.map(visit)]
      : value !== null && typeof value === 'object'
        ? [0, ...Object.entries(value).flatMap(([key, value]) => [visit(key), visit(value)])]
        : value
    const index = nodes.length
    nodes.push(node)
    indices.set(key, index)
    return index
  }
  const root = visit(value)
  return { sourceDigest: createHash('sha256').update(JSON.stringify(value)).digest('hex'), root, nodes }
}
