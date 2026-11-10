import { createHash } from 'node:crypto'

// Length-delimited blob bytes, not diff formatting or abbreviated object IDs.
export function changedTestHash(before, after) {
  const hash = createHash('sha256')
  for (const content of [before, after]) {
    const bytes = Buffer.from(content)
    hash.update(String(bytes.length) + ':').update(bytes)
  }
  return hash.digest('hex')
}
