export const locales = ['fr', 'en', 'es', 'pt', 'de', 'it', 'ru', 'zh', 'ja', 'ar'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'fr'

export const rtlLocales: ReadonlySet<Locale> = new Set(['ar'])

export const localeLabels: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  pt: 'Português',
  de: 'Deutsch',
  it: 'Italiano',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
  ar: 'العربية',
}

export const localeCodes: Record<Locale, string> = {
  fr: 'FR',
  en: 'EN',
  es: 'ES',
  pt: 'PT',
  de: 'DE',
  it: 'IT',
  ru: 'RU',
  zh: 'ZH',
  ja: 'JA',
  ar: 'AR',
}

export function isLocale(value: string | undefined | null): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value)
}

export function getDir(locale: Locale): 'ltr' | 'rtl' {
  return rtlLocales.has(locale) ? 'rtl' : 'ltr'
}
