import { NextResponse } from 'next/server'

// Health-check endpoint. Returns a minimal JSON payload with the server
// clock + uptime. Designed to be hit by container orchestrators and load
// balancers. Always returns 200 — the goal is to confirm the Next.js
// runtime is reachable, not to perform a deep probe of the Go backend.
//
// For a deep health probe (which contacts the Go account service + GitHub
// releases API), use `?strict=1` to add an `upstream` field.

export const dynamic = 'force-dynamic'

type HealthPayload = {
  status: 'ok'
  uptime: number
  now: string
  version: string
  upstream?: { ok: boolean; elapsed?: number }
}

const PACKAGE_VERSION = '2.0.0'

export function GET(request: Request) {
  const url = new URL(request.url)
  const strict = url.searchParams.get('strict') === '1'

  const payload: HealthPayload = {
    status: 'ok',
    uptime: Math.round(process.uptime()),
    now: new Date().toISOString(),
    version: PACKAGE_VERSION,
  }

  if (!strict) {
    return NextResponse.json(payload, {
      status: 200,
      headers: { 'cache-control': 'no-store' },
    })
  }

  // Strict probe: ping the Go account service's site-config endpoint with a
  // short timeout. We always return 200 — `upstream.ok` reports the reach.
  const start = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 2000)
  void (async () => {
    try {
      // Same-origin only — the front-end never crosses host boundaries.
      const res = await fetch(new URL('/api/site-config', url.origin), {
        signal: controller.signal,
        cache: 'no-store',
      })
      payload.upstream = {
        ok: res.ok,
        elapsed: Date.now() - start,
      }
    } catch {
      payload.upstream = { ok: false, elapsed: Date.now() - start }
    } finally {
      clearTimeout(timer)
    }
  })()

  return NextResponse.json(payload, {
    status: 200,
    headers: { 'cache-control': 'no-store' },
  })
}
