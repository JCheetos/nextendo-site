import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { __resetEnvForTests, getEnv } from './env'

// Snapshot of the keys we touch, so tests can mutate them without leaking
// across the suite.
const TRACKED_KEYS = [
  'NEXTENDO_ACCOUNT_BASE_URL',
  'TURNSTILE_SECRET',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SENTRY_DSN',
  'NEXT_PUBLIC_TURNSTILE_SITEKEY',
] as const

describe('env', () => {
  let snapshot: Record<string, string | undefined>

  beforeEach(() => {
    snapshot = {}
    for (const key of TRACKED_KEYS) {
      snapshot[key] = process.env[key]
      delete process.env[key]
    }
    __resetEnvForTests()
  })

  afterEach(() => {
    for (const key of TRACKED_KEYS) {
      const v = snapshot[key]
      if (v === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = v
      }
    }
    __resetEnvForTests()
  })

  it('parses an empty process.env to defaults', () => {
    const env = getEnv()
    expect(env.NEXTENDO_ACCOUNT_BASE_URL).toBe('')
    expect(env.TURNSTILE_SECRET).toBe('')
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('https://nextendo.network')
    expect(env.NODE_ENV).toBe('test')
  })

  it('uses NEXT_PUBLIC_SITE_URL when provided', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://staging.nextendo.network'
    expect(getEnv().NEXT_PUBLIC_SITE_URL).toBe('https://staging.nextendo.network')
  })

  it('rejects NEXT_PUBLIC_SITE_URL without a scheme', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'nextendo.network'
    expect(() => getEnv()).toThrow(/Invalid environment/)
  })

  it('caches the parsed value between calls', () => {
    process.env.NEXTENDO_ACCOUNT_BASE_URL = 'https://a'
    const a = getEnv()
    process.env.NEXTENDO_ACCOUNT_BASE_URL = 'https://b'
    const b = getEnv()
    expect(a).toBe(b)
  })

  it('resetEnvForTests clears the cache', () => {
    process.env.NEXTENDO_ACCOUNT_BASE_URL = 'https://a'
    getEnv()
    process.env.NEXTENDO_ACCOUNT_BASE_URL = 'https://b'
    __resetEnvForTests()
    expect(getEnv().NEXTENDO_ACCOUNT_BASE_URL).toBe('https://b')
  })

  it('reads Turnstile + Sentry config when provided', () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY = '0x4AAAAA'
    process.env.TURNSTILE_SECRET = '0x4SECRET'
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://k@o.ingest.sentry.io/1'
    const env = getEnv()
    expect(env.NEXT_PUBLIC_TURNSTILE_SITEKEY).toBe('0x4AAAAA')
    expect(env.TURNSTILE_SECRET).toBe('0x4SECRET')
    expect(env.NEXT_PUBLIC_SENTRY_DSN).toBe('https://k@o.ingest.sentry.io/1')
  })
})
