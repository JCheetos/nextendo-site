import { defineRouting } from 'next-intl/routing'
import { defaultLocale, locales } from './config'

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'never',
  localeCookie: {
    name: 'nx_lang',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/',
  },
})

export type Routing = typeof routing
