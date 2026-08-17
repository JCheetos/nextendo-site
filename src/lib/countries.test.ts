import { COUNTRY_CODES, countryFlag, countryName, isCountryCode } from '@/lib/countries'
import { describe, expect, it } from 'vitest'

describe('country catalog', () => {
  it('contains the ISO alpha-2 countries used by the selector', () => {
    expect(COUNTRY_CODES).toContain('FR')
    expect(COUNTRY_CODES).toContain('US')
    expect(isCountryCode('fr')).toBe(true)
    expect(isCountryCode('XXX')).toBe(false)
  })

  it('formats a country flag and localized display name', () => {
    expect(countryFlag('FR')).toBe('🇫🇷')
    expect(countryName('FR', 'fr')).toBe('France')
    expect(countryName('ZZ', 'en')).toBeNull()
  })
})
