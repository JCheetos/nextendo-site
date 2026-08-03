import { routing } from '@/i18n/routing'
import createNextIntlMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'

// next-intl must not touch these paths. We enforce the exclusion INSIDE the
// proxy function (not just via matcher) because Node's RegExp backtracks the
// negative lookahead past the leading '/', which means a matcher like
// '/((?!api).*)' still matches '/api/health'. Checking the pathname here is
// bulletproof.
const isPassthrough = (pathname: string) =>
  pathname.startsWith('/api') ||
  pathname.startsWith('/_next') ||
  pathname === '/sitemap.xml' ||
  pathname === '/robots.txt' ||
  pathname === '/favicon.svg' ||
  pathname.startsWith('/assets/')

const handler = createNextIntlMiddleware(routing)

export default function proxy(request: Request) {
  const url = new URL(request.url)
  if (isPassthrough(url.pathname)) {
    return NextResponse.next()
  }
  return handler(request as never)
}

export const proxyConfig = {
  // Match everything. The actual API/static passthrough is enforced inside
  // the proxy function above (see isPassthrough). This matcher pattern is
  // the most permissive Next.js allows without backtracking past exclusions.
  matcher: ['/((?!_next|.*\\..*).*)'],
}
// Reference `routing` so the import isn't dropped — useful for
// future per-route config without re-importing later.
void routing
