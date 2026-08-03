// Lightweight fetcher for the GitHub releases API. Used by the /telecharger
// page to find the latest signed asset for each platform. The repo is public
// so this works anonymously; the module is server-only (no API key shipped).

const REPO = 'NextendoNetwork/Ryujinx-Nextendo'
const RELEASES_URL = `https://github.com/${REPO}/releases/latest`
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`

export const PLATFORM_MATCHERS = {
  win: /win_x64\.zip$/i,
  linux: /linux_x64\.tar\.gz$/i,
  mac: /macos.*\.tar\.gz$/i,
} as const

export type Platform = keyof typeof PLATFORM_MATCHERS

export type Asset = {
  name: string
  size: number
  url: string
}

export type Release = {
  tag: string
  assets: { win: Asset | null; linux: Asset | null; mac: Asset | null }
  anyFound: boolean
}

function isSafe(url: string): boolean {
  return typeof url === 'string' && url.startsWith(`https://github.com/${REPO}/releases/download/`)
}

export async function fetchLatestRelease(): Promise<Release> {
  const fallback: Release = {
    tag: '',
    assets: { win: null, linux: null, mac: null },
    anyFound: false,
  }

  // 5s timeout — the page must not block on GitHub.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
      // Revalidate every 10 minutes — release cadence is hours, not seconds.
      next: { revalidate: 600 },
    })
    if (!res.ok) return fallback
    const rel = (await res.json()) as {
      tag_name?: string
      assets?: Array<{ name: string; size: number; browser_download_url: string }>
    }

    const assets = rel.assets ?? []
    const out: Release = {
      tag: rel.tag_name ?? '',
      assets: { win: null, linux: null, mac: null },
      anyFound: false,
    }

    for (const plat of Object.keys(PLATFORM_MATCHERS) as Platform[]) {
      const matcher = PLATFORM_MATCHERS[plat]
      const found = assets.find((a) => matcher.test(String(a.name)))
      if (found && isSafe(found.browser_download_url)) {
        out.assets[plat] = {
          name: found.name,
          size: found.size,
          url: found.browser_download_url,
        }
        out.anyFound = true
      }
    }

    return out
  } catch {
    return fallback
  } finally {
    clearTimeout(timeout)
  }
}

export function formatSize(bytes: number): string {
  return bytes ? `${Math.round(bytes / 1_048_576)} MB` : ''
}

export const releasesUrl = RELEASES_URL
