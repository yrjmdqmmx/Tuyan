type CatalogNode = null | boolean | number | string | Array<number | string>

// Decode only the generated local catalog. Never memoize decoded containers:
// each model must own its arrays/objects, as it did in the original JSON data.
export function unpackModelCatalog(data: { root: number; nodes: CatalogNode[] }): any {
  function expand(index: number): any {
    let node = data.nodes[index]
    if (!Array.isArray(node)) return node
    if (node[0] === 4) node = String(node[1]).split('.').map(n => parseInt(n,36))
    if (node[0] === 3) return expand(node[1] as number) + node[2]
    if (node[0] === 1) return (node.slice(1) as number[]).map(expand)
    const result: Record<string, any> = {}
    if (node[0] === 2) {
      const keys = expand(node[1] as number) as string[]
      keys.forEach((key, i) => { result[key] = expand(node[i + 2] as number) })
      return result
    }
    for (let i = 1; i < node.length; i += 2) result[expand(node[i] as number)] = expand(node[i + 1] as number)
    return result
  }
  return expand(data.root)
}
