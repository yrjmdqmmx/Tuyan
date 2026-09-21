type CatalogNode = null | boolean | number | string | number[]

// Decode only the generated local catalog. Never memoize decoded containers:
// each model must own its arrays/objects, as it did in the original JSON data.
export function unpackModelCatalog(data: { root: number; nodes: CatalogNode[] }): any {
  function expand(index: number): any {
    const node = data.nodes[index]
    if (!Array.isArray(node)) return node
    if (node[0] === 1) return node.slice(1).map(expand)
    const result: Record<string, any> = {}
    if (node[0] === 2) {
      const keys = expand(node[1]) as string[]
      keys.forEach((key, i) => { result[key] = expand(node[i + 2]) })
      return result
    }
    for (let i = 1; i < node.length; i += 2) result[expand(node[i])] = expand(node[i + 1])
    return result
  }
  return expand(data.root)
}
