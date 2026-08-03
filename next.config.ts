import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  typedRoutes: true,
  // Aplazamos cacheComponents a Fase 2 cuando /status lo necesite.
  // cacheComponents: true,
}

export default withNextIntl(nextConfig)
