import type { MetadataRoute } from 'next'

const SITE = 'https://nextendo.network'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  }
}
