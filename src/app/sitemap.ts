import { locales } from '@/i18n/config'
import type { MetadataRoute } from 'next'

const SITE = 'https://nextendo.network'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const routes = ['', '/telecharger', '/status']
  // The browser URL stays clean (no /<locale>/ prefix); the middleware
  // rewrites internally. For each public route we emit a single entry with
  // hreflang alternates pointing at every locale's canonical URL.
  return routes.flatMap((path) => {
    const priority = path === '' ? 1 : 0.7
    const changeFrequency = path === '' ? 'weekly' : 'daily'
    const languages: Record<string, string> = {}
    for (const l of locales) {
      languages[l] = `${SITE}${path}`
    }
    languages['x-default'] = `${SITE}${path}`
    return {
      url: `${SITE}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
      alternates: { languages },
    }
  })
}
