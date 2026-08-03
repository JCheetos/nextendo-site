import { describe, expect, it } from 'vitest'
import { defaultLocale, getDir, isLocale, locales, rtlLocales } from './config'

describe('i18n config', () => {
  it('exports 10 locales with French as default', () => {
    expect(locales).toHaveLength(10)
    expect(defaultLocale).toBe('fr')
  })

  it('flags Arabic as RTL', () => {
    expect(rtlLocales.has('ar')).toBe(true)
    expect(rtlLocales.has('fr')).toBe(false)
  })

  it('isLocale narrows correctly', () => {
    expect(isLocale('fr')).toBe(true)
    expect(isLocale('ar')).toBe(true)
    expect(isLocale('xx')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })

  it('getDir returns rtl for Arabic, ltr for everyone else', () => {
    expect(getDir('ar')).toBe('rtl')
    expect(getDir('fr')).toBe('ltr')
    expect(getDir('en')).toBe('ltr')
    expect(getDir('ja')).toBe('ltr')
  })
})
