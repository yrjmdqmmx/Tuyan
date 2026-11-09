type CatalogNode = null | boolean | number | string | Array<number | string>

// Decode only the generated local catalog. Never memoize decoded containers:
// each model must own its arrays/objects, as it did in the original JSON data.
export function unpackModelCatalog(data: { root: number; nodes: CatalogNode[] }): any {
  function expand(index: number): any {
    let node = data.nodes[index]
    if (typeof node === 'string' && node.startsWith('~')) node = node.slice(1).split('.').map(n => parseInt(n,36))
    if (!Array.isArray(node)) return node
    if (node[0] === 6) return node[1]
    if (node[0] === 4) node = String(node[1]).split('.').map(n => parseInt(n,36))
    if (node[0] === 5) {
      const [base, positions, values] = String(node[1]).split(':')
      const result = expand(parseInt(base, 36))
      const keys = Object.keys(result)
      const references = values ? values.split('.') : []
      if (positions) positions.split('.').forEach((position, i) => {
        result[keys[parseInt(position, 36)]] = expand(parseInt(references[i], 36))
      })
      return result
    }
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
