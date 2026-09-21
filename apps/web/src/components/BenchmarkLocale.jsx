import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { BENCHMARK_LANGUAGE_KEY, benchmarkText, normalizeBenchmarkLocale, readBenchmarkLocale } from './benchmarkLocale.js'

const defaultLocale = { locale: 'zh-CN', t: (key, values) => benchmarkText('zh-CN', key, values), setLocale: () => {} }
const BenchmarkLocaleContext = createContext(defaultLocale)
export const useBenchmarkLocale = () => useContext(BenchmarkLocaleContext)

export function BenchmarkLocaleProvider({ children }) {
  const [locale, updateLocale] = useState(readBenchmarkLocale)
  function setLocale(next) {
    const value = normalizeBenchmarkLocale(next)
    updateLocale(value)
    try { window.localStorage.setItem(BENCHMARK_LANGUAGE_KEY, value) } catch { /* Storage may be disabled; keep the in-page preference. */ }
  }
  useEffect(() => {
    const previous = document.documentElement.lang
    const previousTitle = document.title
    document.documentElement.lang = locale
    document.title = locale === 'en' ? 'Tuyan Leaderboard' : '图研排行榜'
    return () => { document.documentElement.lang = previous; document.title = previousTitle }
  }, [locale])
  const value = useMemo(() => ({ locale, setLocale, t: (key, values) => benchmarkText(locale, key, values) }), [locale])
  return <BenchmarkLocaleContext.Provider value={value}>{children}</BenchmarkLocaleContext.Provider>
}

export function BenchmarkLanguageSwitch() {
  const { locale, setLocale } = useBenchmarkLocale()
  return <div data-benchmark-language className="bench-language-switch" role="group" aria-label="中文 / English">
    <button type="button" lang="zh-CN" aria-pressed={locale === 'zh-CN'} onClick={() => setLocale('zh-CN')}>中文</button>
    <button type="button" lang="en" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>English</button>
  </div>
}
