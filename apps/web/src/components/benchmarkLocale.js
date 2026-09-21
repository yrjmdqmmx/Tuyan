import messages from './benchmarkMessages.json'
import priceMessages from './benchmarkPriceMessages.json'

export const BENCHMARK_LANGUAGE_KEY = 'tuyan.benchmark.language.v1'
export const normalizeBenchmarkLocale = value => value === 'en' ? 'en' : 'zh-CN'
export function benchmarkText(locale, key, values = {}) {
  const entry = messages[key] ?? priceMessages[key]
  const text = typeof entry === 'string' ? (locale === 'en' ? entry : key)
    : entry?.[locale] || key
  return String(text).replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match)
}
export function readBenchmarkLocale() {
  try { return normalizeBenchmarkLocale(globalThis.window?.localStorage?.getItem(BENCHMARK_LANGUAGE_KEY)) } catch { return 'zh-CN' }
}
