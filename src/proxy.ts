import { routing } from '@/i18n/routing'
import createNextIntlMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'

// Routes that next-intl must not touch. Sitemap and robots are metadata
// endpoints, not localized pages.
const PASSTHROUGH_PATHS = new Set(['/sitemap.xml', '/robots.txt'])

const handler = createNextIntlMiddleware(routing)

export default function proxy(request: Request) {
  const url = new URL(request.url)
  if (PASSTHROUGH_PATHS.has(url.pathname)) {
    return NextResponse.next()
  }
  return handler(request as never)
}

export const proxyConfig = {
  // Run on all paths except Next internals, API, and static assets. The
  // sitemap/robots passthrough is enforced inside the handler above because
  // the matcher can't easily express "pathname === X".
  matcher: ['/((?!_next|api|favicon\\.svg|assets|.*\\..*).*)'],
}
// Reference `routing` so the import isn't dropped — useful for
// future per-route config without re-importing later.
void routing
