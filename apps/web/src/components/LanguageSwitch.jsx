import { Languages } from 'lucide-react'
import { useAppLocale } from './BenchmarkLocale.jsx'

/** The same persistent language preference on every page and screen size. */
export default function LanguageSwitch({ compact = false }) {
  const { locale, setLocale } = useAppLocale()
  const english = locale === 'en'
  return <button type="button" className="site-language-switch" data-site-language
    lang={english ? 'zh-CN' : 'en'} aria-label={english ? '切换到中文' : 'Switch to English'}
    title={english ? 'Current language: English · 切换到中文' : '当前语言：中文 · Switch to English'}
    onClick={() => setLocale(english ? 'zh-CN' : 'en')}>
    <Languages size={16} aria-hidden="true" />
    <span>{english ? '中文' : compact ? 'EN' : 'English'}</span>
  </button>
}
