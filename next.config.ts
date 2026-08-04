import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  typedRoutes: true,
  // Dev/test only: when NEXTENDO_ACCOUNT_BASE_URL is set, proxy /api/*
  // requests to that upstream so the front-end can talk to the local
  // mock-account-server (started as a Playwright webServer). In
  // production this is intentionally skipped — the reverse proxy in
  // front of Next.js (nginx / Caddy / cloud LB) handles /api/* and the
  // Go backend lives on the same origin as the front-end.
  rewrites: () => {
    if (process.env.NODE_ENV === 'production') return []
    const upstream = process.env.NEXTENDO_ACCOUNT_BASE_URL
    if (!upstream) return []
    return [{ source: '/api/:path*', destination: `${upstream}/api/:path*` }]
  },
}

export default withNextIntl(nextConfig)
