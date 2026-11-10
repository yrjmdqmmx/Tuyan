import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {fileURLToPath} from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
export const conditionalLabel = /有条件支持|conditionally\s+supported|conditional(?:ly)?[-_\s]*support(?:ed)?|support(?:ed)?[-_\s]*conditional(?:ly)?/i
const files = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory() ? files(path.join(dir,e.name)) : [path.join(dir,e.name)])
export function assertNoConditionalLabels() {
  const all = ['apps/web/src','apps/miniprogram/miniprogram','packages/api/src'].flatMap(dir => files(path.join(root,dir)))
    .filter(file => /\.(?:json|[cm]?[jt]sx?|wxml|wxss)$/.test(file) && !/\.test\./.test(file))
  const locales = all.filter(file => /\/(?:i18n|locales?|translations?)\//i.test(file) || /(?:locale|i18n|translations?)\.[^.]+$/.test(file))
  assert.ok(locales.length, 'Locale discovery must not silently scan zero files')
  for (const file of all) assert.doesNotMatch(fs.readFileSync(file,'utf8'), conditionalLabel, path.relative(root,file))
  return {localeFiles:locales.map(file=>path.relative(root,file)),uiAndSharedFiles:all.length}
}
