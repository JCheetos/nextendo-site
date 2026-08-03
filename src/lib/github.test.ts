import { describe, expect, it } from 'vitest'
import { PLATFORM_MATCHERS, fetchLatestRelease, formatSize } from './github'

describe('PLATFORM_MATCHERS', () => {
  it('matches the legacy asset names', () => {
    expect('Ryujinx-Nextendo-1.0.0-win_x64.zip').toMatch(PLATFORM_MATCHERS.win)
    expect('Ryujinx-Nextendo-1.0.0-linux_x64.tar.gz').toMatch(PLATFORM_MATCHERS.linux)
    expect('Ryujinx-Nextendo-1.0.0-macos-universal.tar.gz').toMatch(PLATFORM_MATCHERS.mac)
    expect('Ryujinx-Nextendo-1.0.0-linux_x64.zip').not.toMatch(PLATFORM_MATCHERS.linux)
  })
})

describe('formatSize', () => {
  it('renders megabytes', () => {
    expect(formatSize(5 * 1024 * 1024)).toBe('5 MB')
    expect(formatSize(5 * 1024 * 1024 + 512 * 1024)).toBe('6 MB')
  })

  it('returns empty string for falsy input', () => {
    expect(formatSize(0)).toBe('')
    expect(formatSize(undefined as unknown as number)).toBe('')
  })
})

describe('fetchLatestRelease', () => {
  it('returns the fallback when the network call fails', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (() => Promise.reject(new Error('net'))) as typeof fetch
    try {
      const release = await fetchLatestRelease()
      expect(release.anyFound).toBe(false)
      expect(release.tag).toBe('')
      expect(release.assets).toEqual({ win: null, linux: null, mac: null })
    } finally {
      globalThis.fetch = original
    }
  })

  it('returns the fallback when the response is not ok', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (() =>
      Promise.resolve(new Response('nope', { status: 500 }))) as typeof fetch
    try {
      const release = await fetchLatestRelease()
      expect(release.anyFound).toBe(false)
    } finally {
      globalThis.fetch = original
    }
  })

  it('parses a release payload and matches assets per platform', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            tag_name: 'v1.2.3',
            assets: [
              {
                name: 'Ryujinx-Nextendo-1.2.3-win_x64.zip',
                size: 5_242_880,
                browser_download_url:
                  'https://github.com/NextendoNetwork/Ryujinx-Nextendo/releases/download/v1.2.3/Ryujinx-Nextendo-1.2.3-win_x64.zip',
              },
              {
                name: 'Ryujinx-Nextendo-1.2.3-linux_x64.tar.gz',
                size: 10_485_760,
                browser_download_url:
                  'https://github.com/NextendoNetwork/Ryujinx-Nextendo/releases/download/v1.2.3/Ryujinx-Nextendo-1.2.3-linux_x64.tar.gz',
              },
              {
                name: 'Ryujinx-Nextendo-1.2.3-macos-universal.tar.gz',
                size: 15_728_640,
                browser_download_url:
                  'https://github.com/NextendoNetwork/Ryujinx-Nextendo/releases/download/v1.2.3/Ryujinx-Nextendo-1.2.3-macos-universal.tar.gz',
              },
            ],
          }),
          { status: 200 },
        ),
      )) as typeof fetch
    try {
      const release = await fetchLatestRelease()
      expect(release.tag).toBe('v1.2.3')
      expect(release.anyFound).toBe(true)
      expect(release.assets.win?.size).toBe(5_242_880)
      expect(release.assets.linux?.size).toBe(10_485_760)
      expect(release.assets.mac?.size).toBe(15_728_640)
    } finally {
      globalThis.fetch = original
    }
  })

  it('rejects assets that point outside the project repo', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            tag_name: 'v1.0.0',
            assets: [
              {
                name: 'malware.exe',
                size: 1,
                browser_download_url: 'https://evil.com/malware.exe',
              },
            ],
          }),
          { status: 200 },
        ),
      )) as typeof fetch
    try {
      const release = await fetchLatestRelease()
      expect(release.anyFound).toBe(false)
    } finally {
      globalThis.fetch = original
    }
  })
})
