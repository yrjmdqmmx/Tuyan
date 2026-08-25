import { lstat, readFile } from 'node:fs/promises'

export async function loadBuildProvenance(path = '/app/build-provenance.json') {
  try {
    const stat = await lstat(path)
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('unsafe provenance file')
    const value = JSON.parse(await readFile(path, 'utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value) || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(['codeSha']) || !/^[a-f0-9]{40}$/i.test(value.codeSha)) throw new Error('invalid provenance content')
    return Object.freeze({ codeSha: String(value.codeSha).toLowerCase() })
  } catch {
    throw new Error('PAPERBANANA_BUILD_PROVENANCE_INVALID')
  }
}
