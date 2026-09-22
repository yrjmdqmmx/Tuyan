import { createHash } from 'node:crypto'

// Intern repeated JSON values at build time. Array tags distinguish objects (0)
// from arrays (1) and shared-key objects (2); children are node indices.
export function packModelCatalog(value) {
  const nodes = []
  const indices = new Map()
  const prefixes=new Set()
  function collect(v) {
    if(typeof v==='string'&&v.startsWith('https://')){const end=v.lastIndexOf('/');if(end>24&&end<v.length-1)prefixes.add(v.slice(0,end+1))}
    else if(v&&typeof v==='object')Object.values(v).forEach(collect)
  }
  collect(value)
  const ordered=[...prefixes].sort((a,b)=>b.length-a.length)
  function visit(value) {
    const key = JSON.stringify(value)
    if (indices.has(key)) return indices.get(key)
    const prefix=typeof value==='string'?ordered.find(p=>value.length>p.length&&value.startsWith(p)):undefined
    let node = prefix ? [3,visit(prefix),value.slice(prefix.length)] : Array.isArray(value)
      ? [1, ...value.map(visit)]
      : value !== null && typeof value === 'object'
        ? [2, visit(Object.keys(value)), ...Object.values(value).map(visit)]
        : value
    if(Array.isArray(node)&&node.every(n=>typeof n==='number')) {
      const compact=[4,node.map(n=>n.toString(36)).join('.')];if(JSON.stringify(compact).length<JSON.stringify(node).length)node=compact
    }
    const index = nodes.length
    nodes.push(node)
    indices.set(key, index)
    return index
  }
  const root = visit(value)
  return { sourceDigest: createHash('sha256').update(JSON.stringify(value)).digest('hex'), root, nodes }
}
