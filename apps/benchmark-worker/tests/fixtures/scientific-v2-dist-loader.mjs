const mongodbUrl = new URL('./scientific-v2-dist-mongodb.mjs', import.meta.url).href
const ossUrl = new URL('./scientific-v2-dist-oss.mjs', import.meta.url).href

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'mongodb') return { url: mongodbUrl, shortCircuit: true }
  if (specifier === 'ali-oss') return { url: ossUrl, shortCircuit: true }
  return nextResolve(specifier, context)
}
