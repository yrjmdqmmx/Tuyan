import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { APP_LANGUAGE_KEY, BENCHMARK_LANGUAGE_KEY, benchmarkText, normalizeBenchmarkLocale, readBenchmarkLocale } from './benchmarkLocale.js'

const defaultLocale = { locale: 'zh-CN', t: (key, values) => benchmarkText('zh-CN', key, values), setLocale: () => {} }
const BenchmarkLocaleContext = createContext(defaultLocale)
export const useBenchmarkLocale = () => useContext(BenchmarkLocaleContext)
export const useAppLocale = useBenchmarkLocale

export function BenchmarkLocaleProvider({ children, title }) {
  const parent = useContext(BenchmarkLocaleContext)
  // Legacy page wrappers share the app provider instead of creating a second preference.
  return parent !== defaultLocale ? children : <LocaleState title={title}>{children}</LocaleState>
}

export const AppLocaleProvider = BenchmarkLocaleProvider

function LocaleState({ children, title }) {
  const [locale, updateLocale] = useState(readBenchmarkLocale)
  function setLocale(next) {
    const value = normalizeBenchmarkLocale(next)
    updateLocale(value)
    try {
      window.localStorage.setItem(APP_LANGUAGE_KEY, value)
      window.localStorage.setItem(BENCHMARK_LANGUAGE_KEY, value)
    } catch { /* Storage may be disabled; keep the in-page preference. */ }
  }
  useEffect(() => {
    document.documentElement.lang = locale
    if (title) document.title = benchmarkText(locale, title)
  }, [locale, title])
  useEffect(() => {
    const sync = event => {
      if ([APP_LANGUAGE_KEY, BENCHMARK_LANGUAGE_KEY, null].includes(event.key)) updateLocale(readBenchmarkLocale())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
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
