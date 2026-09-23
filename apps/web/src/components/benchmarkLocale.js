import messages from './benchmarkMessages.json'
import priceMessages from './benchmarkPriceMessages.json'
import workbenchMessages from '../i18n/workbench.en.json'
import changelogMessages from '../i18n/changelog.en.json'

export const BENCHMARK_LANGUAGE_KEY = 'tuyan.benchmark.language.v1'
export const APP_LANGUAGE_KEY = 'tuyan.language.v1'
export const normalizeBenchmarkLocale = value => value === 'en' ? 'en' : 'zh-CN'
export function benchmarkText(locale, key, values = {}) {
  // Only UI text is translated. React nodes, numbers and missing optional labels keep their identity.
  if (typeof key !== 'string') return key
  const entry = messages[key] ?? priceMessages[key] ?? workbenchMessages[key] ?? changelogMessages[key]
  const text = typeof entry === 'string' ? (locale === 'en' ? entry : key)
    : entry?.[locale] || key
  return String(text).replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match)
}
export function readBenchmarkLocale() {
  try {
    const storage = globalThis.window?.localStorage
    return normalizeBenchmarkLocale(storage?.getItem(APP_LANGUAGE_KEY) ?? storage?.getItem(BENCHMARK_LANGUAGE_KEY))
  } catch { return 'zh-CN' }
}
