import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'
import { defaultLocale, isLocale, locales } from './config'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = isLocale(requested) ? requested : defaultLocale

  // Static import map keeps type-safety without dynamic `import()` per request.
  const messages = (await import(`../../messages/${locale}.json`)).default

  return {
    locale,
    messages,
    timeZone: 'Europe/Paris',
  }
})

// Re-export for ergonomic `import { locales } from '@/i18n/request'` if needed.
export { locales, hasLocale }
